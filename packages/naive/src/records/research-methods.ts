// The research methods in the order they are worked (EE-233), read from research-method.schema.json so the
// schema stays their one source. A schema that needs a method refers to that file with $ref; code imports this.
import { readSchema } from "./index.ts";
import type { ResearchMethod } from "./types/records.d.ts";

export type { ResearchMethod };

function methodsOf(schema: unknown): ResearchMethod[] {
  const values: unknown = typeof schema === "object" && schema !== null && "enum" in schema ? schema.enum : undefined;
  const list: unknown[] = Array.isArray(values) ? values : [];
  if (!list.length || !list.every((v): v is ResearchMethod => typeof v === "string")) throw new Error("research-method.schema.json: expected an enum of strings");
  return list;
}

/** standards, scientific, organizational, practitioner, stakeholder: the order a researcher works them. */
export const RESEARCH_METHODS: readonly ResearchMethod[] = Object.freeze(methodsOf(readSchema("research-method")));
