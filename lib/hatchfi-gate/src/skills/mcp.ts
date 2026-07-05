import type { SkillDefinition } from "./definitions";
import { schemaToJsonSchema } from "./jsonschema";

export type McpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export function toMcpTools(skills: SkillDefinition[]): McpTool[] {
  return skills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    inputSchema: schemaToJsonSchema(skill.schema),
  }));
}

export async function callMcpTool(
  skills: SkillDefinition[],
  name: string,
  args: unknown
): Promise<unknown> {
  const skill = skills.find((s) => s.name === name);
  if (!skill) {
    throw new Error(`Unknown tool: ${name}`);
  }
  const parsed = skill.schema.parse(args);
  return skill.execute(parsed);
}
