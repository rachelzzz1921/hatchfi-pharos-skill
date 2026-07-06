// Unified response envelope — every skill-surface response (MCP, LangChain,
// Vercel AI, web playground, CLI demos) carries the same wrapper so agents can
// route on { success, skill, version } without knowing which surface answered.
export const SKILL_NAME = "hatchfi-diligence-gate";
export const SKILL_VERSION = "1.0.0";

export type Envelope<T> = {
  success: boolean;
  skill: typeof SKILL_NAME;
  version: typeof SKILL_VERSION;
  data: T;
};

export function envelope<T>(data: T, success = true): Envelope<T> {
  return { success, skill: SKILL_NAME, version: SKILL_VERSION, data };
}
