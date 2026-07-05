// Read-only on-chain MCP tools — let an agent inspect the LIVE deployed
// CompliantRWAToken (metadata, holder eligibility, transfer-compliance pre-check).
// No private key or funds required: these are `cast call` equivalents over viem.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createPublicClient, getAddress, http } from "viem";

const RPC = process.env.PHAROS_RPC_URL || "https://atlantic.dplabs-internal.com";

function resolveTokenAddress(): `0x${string}` {
  const envAddr = process.env.PHAROS_TOKEN_ADDRESS;
  if (envAddr) return getAddress(envAddr);
  for (const rel of ["deployments/pharos.json", "deployments/pharos.example.json"]) {
    const full = join(process.cwd(), rel);
    if (existsSync(full)) {
      const data = JSON.parse(readFileSync(full, "utf8"));
      if (data.contractAddress) return getAddress(data.contractAddress);
    }
  }
  throw new Error("No token address: set PHAROS_TOKEN_ADDRESS or provide deployments/pharos.json");
}

const TOKEN_ABI = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "holderCount", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "maxHolders", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "maxBalancePerInvestor", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "isVerified", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ type: "bool" }] },
  {
    type: "function",
    name: "canTransfer",
    stateMutability: "view",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }, { type: "string" }],
  },
] as const;

const client = createPublicClient({ transport: http(RPC) });

export const onChainTools = [
  {
    name: "rwa_token_metadata",
    description:
      "Read on-chain metadata of the deployed CompliantRWAToken (name, symbol, totalSupply, holderCount, holder/balance caps). Read-only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "rwa_is_verified",
    description:
      "Check whether an address is a verified (KYC-registered) holder on the RWA token. Read-only.",
    inputSchema: {
      type: "object",
      properties: { address: { type: "string", description: "0x-prefixed EVM address" } },
      required: ["address"],
    },
  },
  {
    name: "rwa_can_transfer",
    description:
      "ERC-3643 compliance pre-check: can `from` transfer `amount` to `to`? Returns allowed + reason. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        from: { type: "string", description: "0x sender address" },
        to: { type: "string", description: "0x recipient address" },
        amount: { type: "string", description: "amount in wei (as a decimal string)" },
      },
      required: ["from", "to", "amount"],
    },
  },
];

export function isOnChainTool(name: string): boolean {
  return onChainTools.some((t) => t.name === name);
}

export async function callOnChainTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  let address: `0x${string}`;
  try {
    address = resolveTokenAddress();
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }

  const read = (functionName: string, callArgs: readonly unknown[] = []) =>
    client.readContract({ address, abi: TOKEN_ABI, functionName: functionName as never, args: callArgs as never });

  try {
    if (name === "rwa_token_metadata") {
      const [nm, sym, supply, holders, maxH, maxB] = await Promise.all([
        read("name"),
        read("symbol"),
        read("totalSupply"),
        read("holderCount"),
        read("maxHolders"),
        read("maxBalancePerInvestor"),
      ]);
      return {
        address,
        name: nm,
        symbol: sym,
        totalSupply: String(supply),
        holderCount: String(holders),
        maxHolders: String(maxH),
        maxBalancePerInvestor: String(maxB),
        rpc: RPC,
      };
    }
    if (name === "rwa_is_verified") {
      const addr = getAddress(String(args.address));
      const verified = await read("isVerified", [addr]);
      return { address: addr, verified: Boolean(verified) };
    }
    if (name === "rwa_can_transfer") {
      const from = getAddress(String(args.from));
      const to = getAddress(String(args.to));
      const amount = BigInt(String(args.amount));
      const result = (await read("canTransfer", [from, to, amount])) as readonly [boolean, string];
      return { from, to, amount: String(amount), allowed: Boolean(result[0]), reason: result[1] };
    }
    throw new Error(`Unknown on-chain tool: ${name}`);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      error: msg,
      hint: "On-chain read failed (RPC rate limit or address not on this network). Retry or set PHAROS_RPC_URL / PHAROS_TOKEN_ADDRESS.",
      token: address,
    };
  }
}
