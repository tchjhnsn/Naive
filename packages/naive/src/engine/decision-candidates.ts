// What a decision's candidates mean (EE-211). A candidate is one idea for the record a decision decides:
// the whole proposed record (body), the fields it proposes (patch), or neither, in which case it is an
// option with provenance and its label is the answer. Any number of candidates coexist while the decision
// is open, so an undecided record holds several ideas at once instead of one guess, which is what Discovery
// and Validation need.
//
// This module is pure: no I/O, no clock, no model. The doors that write candidates, choose one and reopen a
// decision are in packages/naive/src/engine/decisions.ts, beside approve, merge and withdraw.

import type { DecisionRecord } from "../records/types/records.d.ts";

/** One idea on the table, as decision-record.schema.json holds it. */
export type Candidate = NonNullable<DecisionRecord["candidates"]>[number];
/** What merging a chosen candidate writes. */
export type CandidateWrite =
  /** The whole record: one file, written as it stands. */
  | { kind: "body"; file: string; body: Record<string, unknown> }
  /** Fields of records: each set at its dotted path. */
  | { kind: "patch"; targets: { file: string; field: string; value: unknown }[] }
  /** Nothing of its own: the label is the answer, written wherever applies_to says. */
  | { kind: "label"; label: string };
/** One candidate as a read or the matrix lists it: enough to choose between ideas without opening the file. */
export type CandidateBrief = Pick<Candidate, "id" | "label" | "proposed_by"> & Partial<Pick<Candidate, "why" | "created" | "evidence">> & { proposes: string };

/** The candidates still on the table: every one no person has withdrawn. */
export const liveCandidates = (d: Pick<DecisionRecord, "candidates">): Candidate[] => (d.candidates ?? []).filter((c) => !c.withdrawn_at);

/** Every answer that chooses something: the options strings, then each live candidate's id. */
export const optionsOf = (d: Pick<DecisionRecord, "options" | "candidates">): string[] => [...(d.options ?? []), ...liveCandidates(d).map((c) => c.id)];

/** The live candidate an answer names, or null. A withdrawn one is never chosen. */
export function candidateFor(d: Pick<DecisionRecord, "candidates">, answer: string | null | undefined): Candidate | null {
  return answer == null ? null : liveCandidates(d).find((c) => c.id === answer) ?? null;
}

/** The withdrawn candidate an answer names, or null, so a door can refuse an idea a person took off the table. */
export function withdrawnCandidate(d: Pick<DecisionRecord, "candidates">, answer: string | null | undefined): Candidate | null {
  return answer == null ? null : (d.candidates ?? []).find((c) => !!c.withdrawn_at && c.id === answer) ?? null;
}

// The ok and error branches each name the other's field as undefined, as DoorResult does, so narrowing
// holds in the type check that runs without strictNullChecks (packages/naive/src/checks/check-types.ts).
/** A candidate's record file, or why it has none. */
type FileResult = { ok: true; file: string; error?: undefined } | { ok: false; error: string; file?: undefined };
/** What merging a candidate writes, or why it cannot be merged. */
export type WriteResult = { ok: true; write: CandidateWrite; error?: undefined } | { ok: false; error: string; write?: undefined };

/** The record file a candidate writes, by its own file, else the decision's. A folder is not a record. */
const fileOf = (own: string | undefined, decided: string | undefined): FileResult => {
  const f = own ?? decided;
  if (!f) return { ok: false, error: "names no record to write, and its decision decides no file: give the candidate a file" };
  if (!f.endsWith(".json")) return { ok: false, error: `writes ${f}, which is not a record file: give the candidate a file ending in .json` };
  return { ok: true, file: f };
};

/** What merging this candidate writes, or why it cannot be merged. decided is the decision's decides.path. */
export function writeOf(c: Candidate, decided?: string): WriteResult {
  if (c.body !== undefined) {
    const f = fileOf(c.file, decided);
    return f.ok ? { ok: true, write: { kind: "body", file: f.file, body: c.body } } : { ok: false, error: `candidate ${c.id} ${f.error}` };
  }
  if (c.patch !== undefined) {
    const targets: { file: string; field: string; value: unknown }[] = [];
    for (const t of c.patch) {
      const f = fileOf(t.file ?? c.file, decided);
      if (!f.ok) return { ok: false, error: `candidate ${c.id} ${f.error}` };
      targets.push({ file: f.file, field: t.field, value: t.value });
    }
    return { ok: true, write: { kind: "patch", targets } };
  }
  return { ok: true, write: { kind: "label", label: c.label } };
}

/** What a candidate proposes, in one plain phrase, so a reader sees the shape of each idea at a glance. */
export function proposesOf(c: Candidate, decided?: string): string {
  const w = writeOf(c, decided);
  if (!w.ok) return w.error;
  if (w.write.kind === "body") return `the whole of ${w.write.file}`;
  if (w.write.kind === "patch") return w.write.targets.map((t) => `${t.file} ${t.field}`).join("; ");
  return "its label as the answer";
}

/** One candidate for a listing: its words, who proposed it and what it proposes, without its body. */
export function brief(c: Candidate, decided?: string): CandidateBrief {
  return { id: c.id, label: c.label, ...(c.why ? { why: c.why } : {}), proposed_by: c.proposed_by, ...(c.created ? { created: c.created } : {}),
    ...(c.evidence?.length ? { evidence: c.evidence } : {}), proposes: proposesOf(c, decided) };
}
