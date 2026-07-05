import { DiligenceGate, InMemoryAttestationRegistry } from "../src";

async function main() {
  const registry = new InMemoryAttestationRegistry();
  const gate = new DiligenceGate(registry);

  const redCase = {
    subject: "0x7F367cC41522cE07553e823bf3be79A889DEbe1B",
    assetFingerprint: "0xred-demo",
    evidenceHash: "0xred-demo-hash",
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

  const greenCase = {
    subject: "0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4",
    assetFingerprint: "0xgreen-demo",
    evidenceHash: "0xgreen-demo-hash",
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

  const redDecision = await gate.screen(redCase);
  const greenDecision = await gate.screen(greenCase);
  await gate.attest(greenCase);
  const mintDecision = await gate.gateMint({
    to: greenCase.subject,
    amount: "1000000000000000000",
    evidenceHash: greenCase.evidenceHash,
    flags: greenCase.flags,
  });

  const envelope = {
    success: true,
    skill: "hatchfi-diligence-gate",
    version: "1.0.0",
    data: {
      redCase: redDecision,
      greenCase: greenDecision,
      mintGate: mintDecision,
    },
  };

  console.log(JSON.stringify(envelope, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
