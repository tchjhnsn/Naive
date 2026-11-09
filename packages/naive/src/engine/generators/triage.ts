// Record generator for a triage run (EE-099; raw capture and triage design, docs/design/RAW_TRIAGE_2026-11-09.md,
// "Deciding"). The caller gives the raw entry, the model, the line and the labels with their probabilities, and the
// generator marks each label sure or not against the line (sure at or above it, or at or below one minus it; a
// Score is never a filing decision, so it is always sure), lists the held keys and sets the status. The deciding
// itself is packages/naive/src/engine/triage.ts; this only shapes and checks the record.
import { cli, drop, questions, schemaOf, validate } from "./generate.mjs";
import type { Triage } from "../../records/types/records.d.ts";

export const record = "triage";
const DERIVED = ["labels", "held", "status"];
export const describe = () => ({ record, ask: [...questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  { field: "labels", required: true, type: "array", says: "Each question's key, kind (noul or score) and p" }],
  derived: { "labels[].sure": "p at or above the line, or at or below one minus it; always true for a score", held: "the keys not sure", status: "held when any key is held, else filed" } });

type Label = Triage["labels"][number];
export const sure = (l: Pick<Label, "kind" | "p">, line: number): boolean => l.kind === "score" || (typeof l.p === "number" && (l.p >= line || l.p <= 1 - line));

export function draft(a: Partial<Omit<Triage, "labels">> & { labels?: Omit<Label, "sure">[] }) {
  if (!a.id || !a.entry || typeof a.line !== "number" || !a.labels?.length) return { ok: false, record, errors: ["a triage run needs its id, the raw entry, the line and at least one label"] };
  const line = a.line;
  const labels: Label[] = a.labels.map((l) => ({ ...l, sure: sure(l, line) }));
  const held = labels.filter((l) => !l.sure).map((l) => l.key);
  const rec = drop({ id: a.id, entry: a.entry, at: a.at, model: a.model ?? null, line, labels, filed: a.filed ?? [], held, to_person: a.to_person ?? false,
    status: a.status ?? (held.length ? "held" : "filed"), note: a.note }) as Triage;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `raw/triage/${a.id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
