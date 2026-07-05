import { evaluateDiligence } from "./engine";
import type { AttestationRegistry } from "./registry";
import type { AttestationRecord, DiligenceInput, GateDecision, MintGateInput, Rating } from "./types";

export class DiligenceGate {
  constructor(private readonly registry: AttestationRegistry) {}

  async screen(input: DiligenceInput): Promise<GateDecision> {
    return evaluateDiligence(input.flags);
  }

  async rate(input: DiligenceInput): Promise<{ rating: Rating; decision: GateDecision }> {
    const decision = evaluateDiligence(input.flags);
    return { rating: decision.rating, decision };
  }

  async attest(input: DiligenceInput): Promise<AttestationRecord> {
    const decision = evaluateDiligence(input.flags);
    const record: AttestationRecord = {
      evidenceHash: input.evidenceHash ?? "",
      subject: input.subject,
      rating: decision.rating,
      assetFingerprint: input.assetFingerprint,
      timestamp: Math.floor(Date.now() / 1000),
    };
    await this.registry.putAttestation(record);
    return record;
  }

  async gateMint(input: MintGateInput): Promise<{
    allowed: boolean;
    rating: Rating;
    decision: GateDecision;
    attested: boolean;
  }> {
    const decision = evaluateDiligence(input.flags);
    const attestation = await this.registry.getAttestation(input.evidenceHash);
    const attested = attestation !== null && attestation.rating !== "RED";

    return {
      allowed: decision.allowed && attested,
      rating: decision.rating,
      decision,
      attested,
    };
  }

  async getAttestation(evidenceHash: string): Promise<AttestationRecord | null> {
    return this.registry.getAttestation(evidenceHash);
  }
}
