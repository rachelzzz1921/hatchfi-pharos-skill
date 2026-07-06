import { evaluateDiligence } from "./engine";
import type { AttestationRegistry } from "./registry";
import { screenAddress } from "./screening";
import type {
  AttestationRecord,
  DiligenceFlags,
  DiligenceInput,
  GateDecision,
  MintGateInput,
  Rating,
  ScreeningResult,
} from "./types";

export class DiligenceGate {
  constructor(private readonly registry: AttestationRegistry) {}

  /**
   * Perform diligence for a subject. Sanctions are RESOLVED against the shipped
   * OFAC snapshot (a real set-membership check on the address) and OR'd with any
   * caller-supplied flag — so a sanctioned address is caught even if the caller
   * claims it is clean. Off-chain flags (KYC, docs, rights…) stay caller-supplied.
   */
  private decide(subject: string, flags: DiligenceFlags): { decision: GateDecision; screening: ScreeningResult } {
    const screening = screenAddress(subject);
    const effective: DiligenceFlags = { ...flags, sanctionsHit: flags.sanctionsHit || screening.sanctioned };
    const decision = evaluateDiligence(effective);
    return { decision: { ...decision, screening }, screening };
  }

  async screen(input: DiligenceInput): Promise<GateDecision> {
    return this.decide(input.subject, input.flags).decision;
  }

  async rate(input: DiligenceInput): Promise<{ rating: Rating; decision: GateDecision }> {
    const { decision } = this.decide(input.subject, input.flags);
    return { rating: decision.rating, decision };
  }

  async attest(input: DiligenceInput): Promise<AttestationRecord> {
    const { decision } = this.decide(input.subject, input.flags);
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
    const { decision } = this.decide(input.to, input.flags);
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
