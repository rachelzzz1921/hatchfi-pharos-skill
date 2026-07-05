// Minimal runnable example — expose the diligence skills as Vercel AI SDK tools.
// Run: `npm run example:vercel`
//
// toVercelAiTools returns a Record<string, { description, parameters, execute }>,
// which is exactly the shape `generateText({ tools })` expects from the Vercel AI SDK.
// This example calls a tool's execute() directly so it runs with no extra dependencies.
import { DiligenceGate, InMemoryAttestationRegistry, createDiligenceSkills } from "../src";
import { toVercelAiTools } from "../src/skills/vercel-ai";

const gate = new DiligenceGate(new InMemoryAttestationRegistry());
const tools = toVercelAiTools(createDiligenceSkills(gate));

console.log("Vercel AI tools:", Object.keys(tools).join(", "));

const greenFlags = {
  sanctionsHit: false,
  duplicateTokenization: false,
  liquidityExitMissing: false,
  rightsUnclear: false,
  docsIncomplete: false,
  kycExpiredOrMissing: false,
  onchainAnomaly: false,
};

async function main() {
  const rated = await tools["diligence_rate"].execute({
    subject: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
    assetFingerprint: "0xabc",
    evidenceHash: "0xhash",
    flags: greenFlags,
  });
  console.log("diligence_rate(clean) ->", JSON.stringify(rated));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
