#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "debug-client", version: "1.0.0" }, { capabilities: {} });
const transport = new StdioClientTransport({
  command: "npx",
  args: ["tsx", "mcp-server/index.ts"],
  cwd: process.cwd(),
  env: process.env,
});

await client.connect(transport);

const tools = await client.listTools();
const screen = await client.callTool({
  name: "diligence_screen",
  arguments: {
    subject: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
    assetFingerprint: "0xabc",
    evidenceHash: "0xhash",
    flags: {
      sanctionsHit: false,
      duplicateTokenization: false,
      liquidityExitMissing: false,
      rightsUnclear: false,
      docsIncomplete: false,
      kycExpiredOrMissing: false,
      onchainAnomaly: false,
    },
  },
});
const attested = await client.callTool({
  name: "diligence_attest",
  arguments: {
    subject: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
    assetFingerprint: "0xabc",
    evidenceHash: "0xprobe-hash",
    flags: {
      sanctionsHit: false,
      duplicateTokenization: false,
      liquidityExitMissing: false,
      rightsUnclear: false,
      docsIncomplete: false,
      kycExpiredOrMissing: false,
      onchainAnomaly: false,
    },
  },
});
const mint = await client.callTool({
  name: "diligence_gate_mint",
  arguments: {
    to: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
    amount: "1000000000000000000",
    evidenceHash: "0xprobe-hash",
    flags: {
      sanctionsHit: false,
      duplicateTokenization: false,
      liquidityExitMissing: false,
      rightsUnclear: false,
      docsIncomplete: false,
      kycExpiredOrMissing: false,
      onchainAnomaly: false,
    },
  },
});
const att = await client.callTool({
  name: "diligence_get_attestation",
  arguments: { evidenceHash: "0xprobe-hash" },
});
// Read-only on-chain tool — best-effort (may return an error object on RPC rate limit).
const onchain = await client.callTool({
  name: "rwa_token_metadata",
  arguments: {},
});

console.log("TOOLS", tools.tools.length);
console.log("SCREEN", JSON.stringify(screen));
console.log("ATTEST", JSON.stringify(attested));
console.log("MINT", JSON.stringify(mint));
console.log("ATT", JSON.stringify(att));
console.log("ONCHAIN", JSON.stringify(onchain));

await client.close();
