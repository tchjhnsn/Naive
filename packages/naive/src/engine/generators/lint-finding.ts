// Record generator for a lint finding (EE-099, EE-231): one line of <venture>/.naive/lint-findings.jsonl. The lint gives
// the rule, the severity and the message, and for an artifact its family, path and kind; the generator fills the time
// (now when absent), so the draft passes the schema. The lints append their own lines through
// packages/naive/src/engine/lint-findings.ts; this drafts one by hand.
import { cli, drop, questions, schemaOf, validate } from "./generate.ts";
import { LOG } from "../lint-findings.ts";
import type { LintFinding } from "../../records/types/records.d.ts";

export const record = "lint-finding";
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => q.field !== "at"), derived: { at: "now unless given" } });

export function draft(a: Partial<LintFinding>) {
  if (!a.rule || !a.severity || !a.message) return { ok: false, record, errors: ["a finding needs a rule, a severity and a message"] };
  const rec = drop({ ...a, at: a.at ?? new Date().toISOString() }) as LintFinding;
  const v = validate(record, rec);
  return { ok: v.ok, record, file: LOG, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
