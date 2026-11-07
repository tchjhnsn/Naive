// Record generator for a detection ledger line (EE-099; docs/design/SIGNAL_DETECTION_2026-11-07.md). For a trial
// the agent gives the detector, the score and the criterion in force; the generator makes the call from them (at
// or above yes is yes, at or below no is no, between is unsure). Under route person the agent gives the person's call. For a resolution it gives the trial, the outcome
// and who settled it. The generator fills an id, the time (now when absent) and chains the line as the first of a
// file, so the draft passes the schema. Whoever appends it to governance/detectors/<detector>.trials.jsonl re-chains
// it onto the ledger's last line. Appending through the router is not built yet.
import { randomUUID } from "node:crypto";
import { cli, drop, questions, schemaOf, validate } from "./generate.mjs";
import { lineHash } from "../../core/provenance.mjs";
import type { DetectorTrial } from "../../records/types/records.d.ts";

export const record = "detector-trial";
const DERIVED = ["id", "call", "prev", "hash"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "a new id unless given", at: "now unless given", call: "trial: from the score and the criterion", prev: "genesis", hash: "sha256 of prev and the line" } });

/** The call a criterion makes on a score: yes at or above the yes line, no at or below the no line, unsure between.
 * Under route person no line is drawn, so the call is unsure until the person's own call is given. */
export function call(score: number, criterion: NonNullable<DetectorTrial["criterion"]>): "yes" | "no" | "unsure" {
  if (criterion.yes === undefined) return "unsure";
  if (score >= criterion.yes) return "yes";
  if (criterion.no === undefined || score <= criterion.no) return "no";
  return "unsure";
}

export function draft(a: Partial<DetectorTrial>) {
  const kind = a.kind ?? (a.trial ? "resolution" : "trial");
  if (!a.detector) return { ok: false, record, errors: ["a ledger line needs a detector"] };
  if (kind === "trial" && (typeof a.score !== "number" || !a.criterion)) return { ok: false, record, errors: ["a trial needs a score and the criterion in force"] };
  if (kind === "resolution" && (!a.trial || !a.outcome || !a.by)) return { ok: false, record, errors: ["a resolution needs the trial, the outcome and who settled it"] };
  const base = { kind, id: a.id ?? randomUUID(), detector: a.detector, at: a.at ?? new Date().toISOString() };
  const line = kind === "trial" && typeof a.score === "number" && a.criterion
    ? drop({ ...base, score: a.score, criterion: a.criterion, call: a.call ?? call(a.score, a.criterion), provenance: a.provenance, note: a.note })
    : drop({ ...base, trial: a.trial, outcome: a.outcome, signal: a.signal, by: a.by, note: a.note });
  const chained = { ...line, prev: "genesis" };
  const rec = { ...chained, hash: lineHash("genesis", chained) } as DetectorTrial;
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `governance/detectors/${a.detector}.trials.jsonl`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
