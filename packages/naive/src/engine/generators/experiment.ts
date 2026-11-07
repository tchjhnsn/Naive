// Record generator for an experiment log line (EE-099; autoresearch design, everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "Keep and discard through the router"). Only the evaluator writes
// the log, so the evaluator is this generator's caller: for an experiment it gives the pattern, the plan's sha, the
// candidate's and base's sha, the verdict and the dev score; for a holdout check, the candidate, the result and the
// person. The generator fills an id, the time (now unless given) and chains the line as the first of a file;
// chainOnto chains it onto a log's last line. The line goes at the end of <pattern>.experiments.jsonl. Scoring and
// the router hook that append it are build plan items 5 and 6, not built.
import { randomUUID } from "node:crypto";
import { cli, drop, questions, schemaOf, validate } from "./generate.mjs";
import { lineHash } from "../../core/provenance.mjs";
import type { Experiment } from "../../records/types/records.d.ts";

export const record = "experiment";
const DERIVED = ["id", "at", "prev", "hash"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "a new id unless given", at: "now unless given", prev: "genesis", hash: "sha256 of prev and the line" } });

/** The line chained onto the hash of the log's last line (genesis for the first). */
export function chainOnto(prev: string, line: Omit<Experiment, "prev" | "hash"> & { prev?: string; hash?: string }): Experiment {
  const { prev: _p, hash: _h, ...rest } = line;
  const chained = { ...rest, prev };
  return { ...chained, hash: lineHash(prev, chained) } as Experiment;
}

export function draft(a: Partial<Experiment>) {
  const kind = a.kind ?? (a.result ? "holdout" : "experiment");
  if (!a.pattern || !a.plan || !a.candidate || !a.actor) return { ok: false, record, errors: ["a log line needs the pattern, the plan's sha, the candidate's sha and who acted"] };
  if (kind === "experiment" && (a.base === undefined || !a.verdict)) return { ok: false, record, errors: ["an experiment needs the base it was edited from (null for a first write) and a verdict"] };
  if (kind === "holdout" && (!a.result || a.over_holdout === undefined)) return { ok: false, record, errors: ["a holdout check needs its result and whether the person accepted over it"] };
  const line = drop({ kind, id: a.id ?? randomUUID(), at: a.at ?? new Date().toISOString(), pattern: a.pattern, plan: a.plan, candidate: a.candidate,
    base: a.base, verdict: a.verdict, kept_as: a.kept_as, dev: a.dev, training: a.training, result: a.result, over_holdout: a.over_holdout,
    reason: a.reason, actor: a.actor, span: a.span, provenance: a.provenance });
  const rec = chainOnto("genesis", line as Omit<Experiment, "prev" | "hash">);
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `${a.pattern}.experiments.jsonl`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
