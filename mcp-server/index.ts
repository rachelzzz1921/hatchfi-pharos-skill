#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import {
  DiligenceGate,
  InMemoryAttestationRegistry,
  createDiligenceSkills,
  toMcpTools,
  callMcpTool,
} from "../lib/hatchfi-gate/src";

const registry = new InMemoryAttestationRegistry();
const gate = new DiligenceGate(registry);
const skills = createDiligenceSkills(gate);
const tools = toMcpTools(skills);

const server = new Server(
  { name: "hatchfi-diligence-gate", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

function json(data: unknown) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const name = request.params.name;
  const args = request.params.arguments ?? {};
  try {
    const result = await callMcpTool(skills, name, args);
    return json(result);
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
