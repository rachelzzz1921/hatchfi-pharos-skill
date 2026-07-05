import { createPublicClient, http } from "viem";
import type { AttestationRecord, Rating } from "./types";

function resolveDebugRunId(): string {
  const globalRunId = (globalThis as { __DEBUG_RUN_ID__?: string }).__DEBUG_RUN_ID__;
  const envRunId = typeof process !== "undefined" ? process.env?.DEBUG_RUN_ID : undefined;
  return globalRunId || envRunId || "self-run-1";
}

export interface AttestationRegistry {
  getAttestation(evidenceHash: string): Promise<AttestationRecord | null>;
  listBySubject(subject: string): Promise<AttestationRecord[]>;
  putAttestation(record: AttestationRecord): Promise<void>;
}

export class InMemoryAttestationRegistry implements AttestationRegistry {
  private readonly byHash = new Map<string, AttestationRecord>();
  private readonly bySubject = new Map<string, AttestationRecord[]>();

  async getAttestation(evidenceHash: string): Promise<AttestationRecord | null> {
    const record = this.byHash.get(evidenceHash) ?? null;
    // #region agent log
    fetch('http://127.0.0.1:7779/ingest/38568ce7-58ee-4c7f-a00e-e2b0c820d2e6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8bafd4'},body:JSON.stringify({sessionId:'8bafd4',runId:resolveDebugRunId(),hypothesisId:'H26',location:'lib/hatchfi-gate/src/registry.ts:getAttestation',message:'In-memory attestation read',data:{marker:'registry-instr-v2',evidenceHash,found:Boolean(record),cacheSize:this.byHash.size},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return record;
  }

  async listBySubject(subject: string): Promise<AttestationRecord[]> {
    return this.bySubject.get(subject.toLowerCase()) ?? [];
  }

  async putAttestation(record: AttestationRecord): Promise<void> {
    this.byHash.set(record.evidenceHash, record);
    const key = record.subject.toLowerCase();
    const current = this.bySubject.get(key) ?? [];
    this.bySubject.set(key, [record, ...current]);
    // #region agent log
    fetch('http://127.0.0.1:7779/ingest/38568ce7-58ee-4c7f-a00e-e2b0c820d2e6',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8bafd4'},body:JSON.stringify({sessionId:'8bafd4',runId:resolveDebugRunId(),hypothesisId:'H27',location:'lib/hatchfi-gate/src/registry.ts:putAttestation',message:'In-memory attestation stored',data:{marker:'registry-instr-v2',evidenceHash:record.evidenceHash,subject:record.subject,cacheSize:this.byHash.size},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }
}

function mapRating(raw: number): Rating {
  if (raw <= 0) return "RED";
  if (raw === 1) return "YELLOW";
  return "GREEN";
}

const ATTESTATION_ABI = [
  {
    name: "attestationByHash",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "evidenceHash", type: "bytes32" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "evidenceHash", type: "bytes32" },
          { name: "target", type: "address" },
          { name: "rating", type: "uint8" },
          { name: "assetFingerprint", type: "bytes32" },
          { name: "timestamp", type: "uint64" },
          { name: "registrar", type: "address" },
        ],
      },
    ],
  },
  {
    name: "latestAttestation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "evidenceHash", type: "bytes32" },
          { name: "target", type: "address" },
          { name: "rating", type: "uint8" },
          { name: "assetFingerprint", type: "bytes32" },
          { name: "timestamp", type: "uint64" },
          { name: "registrar", type: "address" },
        ],
      },
    ],
  },
] as const;

type OnChainRegistryOptions = {
  rpcUrl: string;
  contractAddress: `0x${string}`;
};

export class OnChainAttestationRegistry implements AttestationRegistry {
  private readonly client;
  private readonly contractAddress: `0x${string}`;

  constructor(options: OnChainRegistryOptions) {
    this.client = createPublicClient({
      transport: http(options.rpcUrl),
    });
    this.contractAddress = options.contractAddress;
  }

  async getAttestation(evidenceHash: string): Promise<AttestationRecord | null> {
    const result = await this.client.readContract({
      abi: ATTESTATION_ABI,
      address: this.contractAddress,
      functionName: "attestationByHash",
      args: [evidenceHash as `0x${string}`],
    });

    if (result.evidenceHash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return null;
    }

    return {
      evidenceHash: result.evidenceHash,
      subject: result.target,
      rating: mapRating(Number(result.rating)),
      assetFingerprint: result.assetFingerprint,
      timestamp: Number(result.timestamp),
      registrar: result.registrar,
    };
  }

  async listBySubject(subject: string): Promise<AttestationRecord[]> {
    const result = await this.client.readContract({
      abi: ATTESTATION_ABI,
      address: this.contractAddress,
      functionName: "latestAttestation",
      args: [subject as `0x${string}`],
    });

    if (result.evidenceHash === "0x0000000000000000000000000000000000000000000000000000000000000000") {
      return [];
    }

    return [
      {
        evidenceHash: result.evidenceHash,
        subject: result.target,
        rating: mapRating(Number(result.rating)),
        assetFingerprint: result.assetFingerprint,
        timestamp: Number(result.timestamp),
        registrar: result.registrar,
      },
    ];
  }

  async putAttestation(): Promise<void> {
    throw new Error("OnChainAttestationRegistry is read-only; write with cast/send");
  }
}
