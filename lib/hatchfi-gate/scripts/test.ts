import assert from "node:assert/strict";
import { DiligenceGate, InMemoryAttestationRegistry } from "../src";

async function main() {
  const registry = new InMemoryAttestationRegistry();
  const gate = new DiligenceGate(registry);

  const redInput = {
    subject: "0x7F367cC41522cE07553e823bf3be79A889DEbe1B",
    assetFingerprint: "0xasset",
    evidenceHash: "0xhash-red",
    flags: {
      sanctionsHit: true,
      duplicateTokenization: false,
      liquidityExitMissing: false,
      rightsUnclear: false,
      docsIncomplete: false,
      kycExpiredOrMissing: false,
      onchainAnomaly: false,
    },
  } as const;

  const greenInput = {
    subject: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
    assetFingerprint: "0xasset",
    evidenceHash: "0xhash-green",
    flags: {
      sanctionsHit: false,
      duplicateTokenization: false,
      liquidityExitMissing: false,
      rightsUnclear: false,
      docsIncomplete: false,
      kycExpiredOrMissing: false,
      onchainAnomaly: false,
    },
  } as const;

  const redDecision = await gate.screen(redInput);
  assert.equal(redDecision.rating, "RED");
  assert.equal(redDecision.allowed, false);

  const preGateGreen = await gate.gateMint({
    to: greenInput.subject,
    amount: "1",
    evidenceHash: greenInput.evidenceHash,
    flags: greenInput.flags,
  });
  assert.equal(preGateGreen.allowed, false);
  assert.equal(preGateGreen.attested, false);

  await gate.attest(greenInput);
  const postGateGreen = await gate.gateMint({
    to: greenInput.subject,
    amount: "1",
    evidenceHash: greenInput.evidenceHash,
    flags: greenInput.flags,
  });
  assert.equal(postGateGreen.allowed, true);
  assert.equal(postGateGreen.attested, true);

  // Real screening: a snapshot-sanctioned address is caught by set-membership
  // even when the caller declares it clean (sanctionsHit:false).
  const listSanctioned = await gate.screen({
    subject: "0x7F367cC41522cE07553e823bf3be79A889DEbe1B", // in the OFAC snapshot
    assetFingerprint: "0xasset",
    evidenceHash: "0xhash-list",
    flags: { ...greenInput.flags }, // all false — caller claims clean
  });
  assert.equal(listSanctioned.rating, "RED");
  assert.equal(listSanctioned.screening?.matched, true);
  assert.equal(listSanctioned.screening?.sanctioned, true);
  assert.equal(listSanctioned.checks.find((c) => c.key === "sanctions")?.passed, false);

  console.log("PASS: hatchfi-gate deterministic checks + mint gating + real OFAC screening");
}

main().catch((error) => {
  console.error("FAIL", error);
  process.exit(1);
});
