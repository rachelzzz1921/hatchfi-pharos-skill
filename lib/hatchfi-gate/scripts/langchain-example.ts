// Minimal runnable example — wrap the diligence skills as LangChain StructuredTools.
// Run: `npm run example:langchain`
//
// Uses a tiny local stand-in for DynamicStructuredTool so this runs with no extra
// dependencies. In a real app you would instead:
//   import { DynamicStructuredTool } from "@langchain/core/tools";
//   const tools = toLangChainTools(skills, { DynamicStructuredTool });
import { DiligenceGate, InMemoryAttestationRegistry, createDiligenceSkills } from "../src";
import { toLangChainTools } from "../src/skills/langchain";

class DynamicStructuredTool {
  name: string;
  description: string;
  schema: unknown;
  private func: (input: unknown) => Promise<string>;
  constructor(o: { name: string; description: string; schema: unknown; func: (i: unknown) => Promise<string> }) {
    this.name = o.name;
    this.description = o.description;
    this.schema = o.schema;
    this.func = o.func;
  }
  invoke(input: unknown): Promise<string> {
    return this.func(input);
  }
}

const gate = new DiligenceGate(new InMemoryAttestationRegistry());
const skills = createDiligenceSkills(gate);
const tools = toLangChainTools(skills, { DynamicStructuredTool }) as DynamicStructuredTool[];

console.log("LangChain tools:", tools.map((t) => t.name).join(", "));

async function main() {
  const screen = tools.find((t) => t.name === "diligence_screen")!;
  const redOut = await screen.invoke({
    subject: "0x7F367cC41522cE07553e823bf3be79A889DEbe1B",
    assetFingerprint: "0xabc",
    evidenceHash: "0xhash",
    flags: {
      sanctionsHit: true,
      duplicateTokenization: false,
      liquidityExitMissing: false,
      rightsUnclear: false,
      docsIncomplete: false,
      kycExpiredOrMissing: false,
      onchainAnomaly: false,
    },
  });
  console.log("diligence_screen(sanctionsHit=true) ->", redOut);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
