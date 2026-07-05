import type { z } from "zod";
import type { SkillDefinition } from "./definitions";

type DynamicStructuredToolCtor = new (options: {
  name: string;
  description: string;
  schema: z.ZodTypeAny;
  func: (input: unknown) => Promise<string>;
}) => unknown;

export function toLangChainTools(
  skills: SkillDefinition[],
  deps: { DynamicStructuredTool: DynamicStructuredToolCtor }
): unknown[] {
  const { DynamicStructuredTool } = deps;
  return skills.map(
    (skill) =>
      new DynamicStructuredTool({
        name: skill.name,
        description: skill.description,
        schema: skill.schema,
        func: async (input: unknown) => JSON.stringify(await skill.execute(input)),
      })
  );
}
