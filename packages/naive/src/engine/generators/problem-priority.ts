// Record generator for the problem-priority definition (EE-099, EE-219),
// packages/naive/src/functions/strategy/problem-priority.json. The definition is framework data, so a draft is a
// change to the framework (a pull request), not a venture route: the weights it holds are unvalidated priors, and a
// venture overrides them under problems in naive.config.json instead of editing this file.
import { cli, describeFrom, validate } from "./function-common.ts";
import type { ProblemPriority } from "../../records/types/records.d.ts";

export const record = "problem-priority";
export const describe = () => describeFrom(record, { file: "packages/naive/src/functions/strategy/problem-priority.json" });

export function draft(a: Partial<ProblemPriority>) {
  if (!a.weights) return { ok: false, record, errors: ["a problem priority needs its weights: raised_unprompted, ranked_first and pays_for_workaround, each an unvalidated prior"] };
  const rec = {
    version: a.version ?? "0.1.0",
    ...(a.note ? { note: a.note } : {}),
    ...(a.standards ? { standards: a.standards } : {}),
    weights: a.weights,
    ...(a.weights_why ? { weights_why: a.weights_why } : {}),
    ranked_statuses: a.ranked_statuses ?? ["open", "target"],
    labels: a.labels ?? [{ from: 1, label: "primary" }, { from: 2, label: "secondary" }, { from: 3, label: "tertiary" }],
    ...(a.requires_target ? { requires_target: a.requires_target } : {}),
  };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: "packages/naive/src/functions/strategy/problem-priority.json", draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
