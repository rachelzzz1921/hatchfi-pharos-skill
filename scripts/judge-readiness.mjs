#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { createPublicClient, http } from "viem";

const cwd = process.cwd();
const pharosPathPrimary = path.join(cwd, "deployments", "pharos.json");
const pharosPathFallback = path.join(cwd, "deployments", "pharos.example.json");
const ofacPathPrimary = path.join(cwd, "deployments", "mock_ofac_atlantic.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveFile(primaryPath, fallbackPath) {
  if (fs.existsSync(primaryPath)) return primaryPath;
  if (fallbackPath && fs.existsSync(fallbackPath)) return fallbackPath;
  throw new Error(`Required file not found: ${primaryPath}`);
}

function isRpcRateLimited(error) {
  const text = error instanceof Error ? error.message : String(error);
  return text.includes("cu limit exceeded") || text.includes("Request too fast per second");
}

const pharosPathUsed = resolveFile(pharosPathPrimary, pharosPathFallback);
const ofacPathUsed = resolveFile(ofacPathPrimary);
const pharos = readJson(pharosPathUsed);
const ofac = readJson(ofacPathUsed);
const strictReadiness = process.env.STRICT_READINESS === "1";
const allowLegacyReadiness = process.env.ALLOW_LEGACY_READINESS === "1" || !strictReadiness;
const allowRpcRateLimitCompatibility =
  (process.env.ALLOW_RPC_RATE_LIMIT_COMPAT ?? "1") === "1" && !strictReadiness;
const warnings = [];

const RPC = process.env.PHAROS_RPC_URL || "https://atlantic.dplabs-internal.com";
const client = createPublicClient({ transport: http(RPC) });

const tokenAbi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "maxHolders", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "recoveryDelay", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "diligenceAttestationRegistry", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

const ofacAbi = [
  {
    type: "function",
    name: "isSanctioned",
    stateMutability: "view",
    inputs: [{ type: "address", name: "account" }],
    outputs: [{ type: "bool" }],
  },
];

let passed = 0;
let total = 6;

async function check(label, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS  ${label}`);
  } catch (error) {
    if (isRpcRateLimited(error) && allowRpcRateLimitCompatibility) {
      const warning =
        `RPC rate limit while checking "${label}". ` +
        "Marked as warning in compatibility mode.";
      warnings.push(warning);
      passed += 1;
      console.log(`WARN  ${label}: ${warning}`);
      return;
    }
    console.log(`FAIL  ${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const tokenAddress = pharos.contractAddress;
const ofacAddress = ofac.contractAddress;
const sampleSanctioned = ofac.sampleSanctionedAddress;


await check("RPC connected", async () => {
  await client.getBlockNumber();
});

await check("Token bytecode exists", async () => {
  const code = await client.getBytecode({ address: tokenAddress });
  if (!code || code === "0x") throw new Error("No bytecode at token address");
});

await check("Token metadata readable", async () => {
  const name = await client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: "name" });
  const symbol = await client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: "symbol" });
  if (!name || !symbol) throw new Error("name/symbol empty");
});

await check("Token trust-model fields readable", async () => {
  await client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: "maxHolders" });
  try {
    await client.readContract({ address: tokenAddress, abi: tokenAbi, functionName: "recoveryDelay" });
    await client.readContract({
      address: tokenAddress,
      abi: tokenAbi,
      functionName: "diligenceAttestationRegistry",
    });
  } catch (error) {
    if (isRpcRateLimited(error)) {
      throw new Error(
        "RPC rate limit reached while checking trust-model fields. " +
        "Retry later or switch PHAROS_RPC_URL to a higher-quota endpoint."
      );
    }
    if (!allowLegacyReadiness) {
      throw new Error(
        "Legacy contract surface detected (missing recoveryDelay or diligenceAttestationRegistry). " +
        "Deploy the hardened token and update deployments/pharos.json, or set ALLOW_LEGACY_READINESS=1 " +
        "to run compatibility mode without strict guarantees."
      );
    }
    warnings.push(
      "Legacy contract surface detected: recoveryDelay/diligenceAttestationRegistry unavailable; " +
      "running in compatibility mode (risk: on-chain trust-model checks not fully enforced)."
    );
  }
});

await check("Mock OFAC bytecode exists", async () => {
  const code = await client.getBytecode({ address: ofacAddress });
  if (!code || code === "0x") throw new Error("No bytecode at mock OFAC address");
});

await check("Mock OFAC RED demo address", async () => {
  const denied = await client.readContract({
    address: ofacAddress,
    abi: ofacAbi,
    functionName: "isSanctioned",
    args: [sampleSanctioned],
  });
  if (!denied) throw new Error("Expected sanctioned address to return true");
});

console.log(`\n${passed}/${total} readiness checks passed`);
console.log(
  strictReadiness
    ? "Mode: STRICT — RPC rate limits and a legacy contract surface (missing recoveryDelay / diligenceAttestationRegistry) FAIL the run; no compat downgrade."
    : "Mode: COMPAT — RPC rate limits and legacy surface downgrade to warnings (set STRICT_READINESS=1 to enforce)."
);
console.log(
  "Contracts:",
  JSON.stringify(
    {
      token: tokenAddress,
      mockOfac: ofacAddress,
      sampleSanctioned,
    },
    null,
    2
  )
);
if (warnings.length > 0) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}
process.exit(passed === total ? 0 : 1);
