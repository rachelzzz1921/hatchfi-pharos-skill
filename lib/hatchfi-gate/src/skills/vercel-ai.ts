import type { z } from "zod";
import type { SkillDefinition } from "./definitions";

export type VercelAiTool = {
  description: string;
  parameters: z.ZodTypeAny;
  execute: (args: unknown) => Promise<unknown>;
};

export function toVercelAiTools(skills: SkillDefinition[]): Record<string, VercelAiTool> {
  const tools: Record<string, VercelAiTool> = {};
  for (const skill of skills) {
    tools[skill.name] = {
      description: skill.description,
      parameters: skill.schema,
      execute: (args: unknown) => skill.execute(args),
    };
  }
  return tools;
}
