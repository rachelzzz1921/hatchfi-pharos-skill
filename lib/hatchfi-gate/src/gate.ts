import { evaluateDiligence } from "./engine";
import type { AttestationRegistry } from "./registry";
import type { AttestationRecord, DiligenceInput, GateDecision, MintGateInput, Rating } from "./types";

function resolveDebugRunId(): string {
  const globalRunId = (globalThis as { __DEBUG_RUN_ID__?: string }).__DEBUG_RUN_ID__;
  const envRunId = typeof process !== "undefined" ? process.env?.DEBUG_RUN_ID : undefined;
  return globalRunId || envRunId || "self-run-1";
}

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
    // #region agent log
    fetch('http://127.0.0.1:7779/ingest/38568ce7-58ee-4c7f-a00e-e2b0c820d2e6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8bafd4'},body:JSON.stringify({sessionId:'8bafd4',runId:resolveDebugRunId(),hypothesisId:'H24',location:'lib/hatchfi-gate/src/gate.ts:attest',message:'Attestation write requested',data:{marker:'gate-instr-v2',evidenceHash:record.evidenceHash,subject:record.subject,rating:record.rating},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
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
    const attested = Boolean(attestation) && attestation.rating !== "RED";
    // #region agent log
    fetch('http://127.0.0.1:7779/ingest/38568ce7-58ee-4c7f-a00e-e2b0c820d2e6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8bafd4'},body:JSON.stringify({sessionId:'8bafd4',runId:resolveDebugRunId(),hypothesisId:'H25',location:'lib/hatchfi-gate/src/gate.ts:gateMint',message:'Gate mint computed decision',data:{marker:'gate-instr-v2',evidenceHash:input.evidenceHash,decisionAllowed:decision.allowed,attested,attestationRating:attestation?.rating??null,finalAllowed:decision.allowed&&attested},timestamp:Date.now()})}).catch(()=>{});
    // #endregion

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
