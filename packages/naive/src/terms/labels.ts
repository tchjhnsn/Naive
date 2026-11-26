// Which data label a record's facts pass (EE-191). The terms live in terms.ts.
// The declared label is not a fact, and this judge does not read it.

import { run, type Result } from "./engine.ts";
import type { LabelFacts } from "./levels.ts";
import { estimatedRecord, goldRecord, sourcedRecord, syntheticRecord } from "./terms.ts";

const LABELS = [
  ["sourced", sourcedRecord],
  ["estimated", estimatedRecord],
  ["synthetic", syntheticRecord],
  ["gold", goldRecord],
] as const;

export type LabelName = (typeof LABELS)[number][0];

export type LabelJudgment =
  | { verdict: "none" }
  | { verdict: LabelName; result: Result }
  | { verdict: "illegal"; passed: LabelName[] };

/** The one label whose term passes, none when no term passes, or illegal when more than one does. */
export function judgeLabel(facts: LabelFacts): LabelJudgment {
  const passed = LABELS.flatMap(([name, term]) => {
    const result = run(term, facts);
    return result.pass ? [{ name, result }] : [];
  });
  if (passed.length > 1) return { verdict: "illegal", passed: passed.map((p) => p.name) };
  if (passed.length === 0) return { verdict: "none" };
  return { verdict: passed[0].name, result: passed[0].result };
}
