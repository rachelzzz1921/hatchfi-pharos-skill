import { z } from "zod";

export const EvmAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Expected 0x-prefixed 20-byte EVM address");

export const RatingSchema = z.enum(["RED", "YELLOW", "GREEN"]);
export type Rating = z.infer<typeof RatingSchema>;

export const DiligenceFlagsSchema = z.object({
  sanctionsHit: z.boolean().default(false),
  duplicateTokenization: z.boolean().default(false),
  liquidityExitMissing: z.boolean().default(false),
  rightsUnclear: z.boolean().default(false),
  docsIncomplete: z.boolean().default(false),
  kycExpiredOrMissing: z.boolean().default(false),
  onchainAnomaly: z.boolean().default(false),
});
export type DiligenceFlags = z.infer<typeof DiligenceFlagsSchema>;

export const DiligenceInputSchema = z.object({
  subject: EvmAddressSchema,
  assetFingerprint: z.string().min(1),
  evidenceHash: z.string().optional(),
  flags: DiligenceFlagsSchema,
});
export type DiligenceInput = z.infer<typeof DiligenceInputSchema>;

export const GateCheckSchema = z.object({
  key: z.string(),
  passed: z.boolean(),
  reason: z.string(),
});
export type GateCheck = z.infer<typeof GateCheckSchema>;

export const ScreeningResultSchema = z.object({
  subject: z.string(),
  sanctioned: z.boolean(),
  source: z.string(),
  matched: z.boolean(),
  listSize: z.number().int().nonnegative(),
  checkedAt: z.number().int().nonnegative(),
});

export const GateDecisionSchema = z.object({
  rating: RatingSchema,
  allowed: z.boolean(),
  reasons: z.array(z.string()),
  checks: z.array(GateCheckSchema),
  // Evidence of the sanctions check actually performed (set-membership against
  // the shipped OFAC snapshot / live oracle) — present when screening ran.
  screening: ScreeningResultSchema.optional(),
});
export type GateDecision = z.infer<typeof GateDecisionSchema>;

export const AttestationRecordSchema = z.object({
  evidenceHash: z.string(),
  subject: EvmAddressSchema,
  rating: RatingSchema,
  assetFingerprint: z.string(),
  timestamp: z.number().int().nonnegative(),
  registrar: EvmAddressSchema.optional(),
});
export type AttestationRecord = z.infer<typeof AttestationRecordSchema>;

export const MintGateInputSchema = z.object({
  to: EvmAddressSchema,
  amount: z.string().min(1),
  evidenceHash: z.string().min(1),
  flags: DiligenceFlagsSchema,
});
export type MintGateInput = z.infer<typeof MintGateInputSchema>;
