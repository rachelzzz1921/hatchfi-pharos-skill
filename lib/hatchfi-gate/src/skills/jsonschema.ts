import { z } from "zod";

export function schemaToJsonSchema(schema: z.ZodTypeAny) {
  try {
    const generated = z.toJSONSchema(schema) as Record<string, unknown>;
    if (generated.type !== "object") {
      return {
        type: "object",
        additionalProperties: true,
        description: "Schema conversion fallback for non-object root",
      };
    }
    return generated;
  } catch {
    return {
      type: "object",
      additionalProperties: true,
      description: "Schema conversion fallback",
    };
  }
}
