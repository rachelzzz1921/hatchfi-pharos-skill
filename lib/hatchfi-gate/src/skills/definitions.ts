import { z } from "zod";
import type { DiligenceGate } from "../gate";
import { DiligenceInputSchema, MintGateInputSchema } from "../types";
import { envelope } from "./envelope";

export interface SkillDefinition<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  schema: z.ZodType<TInput>;
  execute: (input: TInput) => Promise<TOutput>;
}

export function createDiligenceSkills(gate: DiligenceGate): SkillDefinition[] {
  const diligenceScreen: SkillDefinition = {
    name: "diligence_screen",
    description:
      "Run deterministic diligence checks and return RED/YELLOW/GREEN with check-level reasons.",
    schema: DiligenceInputSchema,
    execute: async (input) => envelope(await gate.screen(input as z.infer<typeof DiligenceInputSchema>)),
  };

  const diligenceRate: SkillDefinition = {
    name: "diligence_rate",
    description:
      "Compute deterministic diligence rating from supplied flags (no side effects, reproducible).",
    schema: DiligenceInputSchema,
    execute: async (input) => envelope(await gate.rate(input as z.infer<typeof DiligenceInputSchema>)),
  };

  const diligenceAttest: SkillDefinition = {
    name: "diligence_attest",
    description:
      "Persist a deterministic diligence attestation record for a given evidence hash and subject.",
    schema: DiligenceInputSchema,
    execute: async (input) => envelope(await gate.attest(input as z.infer<typeof DiligenceInputSchema>)),
  };

  const diligenceGateMint: SkillDefinition = {
    name: "diligence_gate_mint",
    description:
      "Gate mint decision by combining deterministic rating and attestation existence/pass status.",
    schema: MintGateInputSchema,
    execute: async (input) => envelope(await gate.gateMint(input as z.infer<typeof MintGateInputSchema>)),
  };

  const diligenceGetAttestation: SkillDefinition = {
    name: "diligence_get_attestation",
    description: "Fetch attestation details by evidence hash.",
    schema: z.object({
      evidenceHash: z.string().min(1),
    }),
    execute: async (input) =>
      envelope(await gate.getAttestation((input as { evidenceHash: string }).evidenceHash)),
  };

  return [diligenceScreen, diligenceRate, diligenceAttest, diligenceGateMint, diligenceGetAttestation];
}
