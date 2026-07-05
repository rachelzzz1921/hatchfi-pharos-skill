import { DiligenceGate, InMemoryAttestationRegistry } from "../src";

function divider(title: string) {
  console.log(`\n=== ${title} ===`);
}

function printStep(label: string, payload: unknown) {
  console.log(`\n[${label}]`);
  console.log(JSON.stringify(payload, null, 2));
}

async function main() {
  divider("HatchFi Diligence Gate CLI");
  console.log("Purpose: deterministic diligence -> attestation -> mint gate narrative");

  const registry = new InMemoryAttestationRegistry();
  const gate = new DiligenceGate(registry);

  const redScenario = {
    name: "Scenario A - OFAC hit (must block)",
    subject: "0x7F367cC41522cE07553e823bf3be79A889DEbe1B",
    assetFingerprint: "0xmpf-demo",
    evidenceHash: "0xscenario-red",
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

  const greenScenario = {
    name: "Scenario B - clean issuer (allow with attestation)",
    subject: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
    assetFingerprint: "0xmpf-demo",
    evidenceHash: "0xscenario-green",
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

  divider(redScenario.name);
  const redDecision = await gate.screen(redScenario);
  printStep("diligence_screen(red)", redDecision);

  divider(greenScenario.name);
  const greenDecision = await gate.screen(greenScenario);
  printStep("diligence_screen(green)", greenDecision);

  const attestation = await gate.attest(greenScenario);
  printStep("diligence_attest(green)", attestation);

  const mintAllowed = await gate.gateMint({
    to: greenScenario.subject,
    amount: "1000000000000000000",
    evidenceHash: greenScenario.evidenceHash,
    flags: greenScenario.flags,
  });
  printStep("diligence_gate_mint(green)", mintAllowed);

  const revokedByPolicy = await gate.gateMint({
    to: greenScenario.subject,
    amount: "1000000000000000000",
    evidenceHash: greenScenario.evidenceHash,
    flags: {
      ...greenScenario.flags,
      sanctionsHit: true,
    },
  });
  printStep("diligence_gate_mint(post-attest, sanctions=true)", revokedByPolicy);

  const envelope = {
    success: true,
    skill: "hatchfi-diligence-gate",
    version: "1.1.0",
    data: {
      redScenario: redDecision,
      greenScenario: greenDecision,
      attestation,
      mintAllowed,
      revokedByPolicy,
    },
  };

  divider("Final envelope");
  console.log(JSON.stringify(envelope, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
