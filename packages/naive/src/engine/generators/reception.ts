// Record generator for a record's receptions (EE-099; autoresearch design, everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "Noise stored beside the record"). Only the projector writes
// <record>.reception.json, so its caller is the projector: it gives the record's path, the recipe's sha, the render's
// as-of time, the receptions the recipe returned and the signals it heard. The generator joins each reception to its
// signal's valid and transaction times, sets withdrawn_at (null unless given) and computes the two factors that need
// only those times, lag and age; the producer shares and uptake stay null until the engine computes them from
// history (build plan item 9, not built).
import { cli, validate } from "./generate.mjs";
import type { Reception } from "../../records/types/records.d.ts";

export const record = "reception";
export const describe = () => ({ record, ask: [
  { field: "record", required: true, type: "string", says: "The record's logical path: competitors/acme/signals.json" },
  { field: "recipe", required: true, type: "string", says: "sha256 of the recipe source that rendered it" },
  { field: "as_of", required: true, type: "string", says: "The render's transaction time" },
  { field: "receptions", required: true, type: "array", says: "What the recipe returned: { kind, signal, fields } or { kind, signal, why }" },
  { field: "signals", required: true, type: "array", says: "The signals heard, each with id, time and observed, and withdrawn_at when known" },
], derived: { file: "<record>.reception.json", factors: "lag and age from the times; producer shares and uptake null until computed" } });

/** The file a record's receptions sit at: beside it, with .reception.json for .json. */
export const receptionPath = (recordPath: string): string => recordPath.replace(/\.json$/, ".reception.json");

type Returned = { kind: "salient" | "noise"; signal: string; fields?: string[]; why?: string; predicate?: string };
type Heard = { id: string; time: string; observed: string; withdrawn_at?: string | null };

export function draft(a: { record?: string; recipe?: string; as_of?: string; receptions?: Returned[]; signals?: Heard[] }) {
  if (!a.record || !a.recipe || !a.as_of || !a.receptions || !a.signals) return { ok: false, record, errors: ["receptions need the record, the recipe's sha, the as-of time, what the recipe returned and the signals heard"] };
  const heard = new Map(a.signals.map((s) => [s.id, s]));
  const missing = a.receptions.filter((r) => !heard.has(r.signal)).map((r) => r.signal);
  if (missing.length) return { ok: false, record, errors: [`no heard signal for ${missing.join(", ")}`] };
  const asOf = Date.parse(a.as_of);
  const rec: Reception = { record: a.record, recipe: a.recipe, as_of: a.as_of, receptions: a.receptions.map((r) => {
    const s = heard.get(r.signal) as Heard;
    const observed = Date.parse(s.observed);
    return {
      signal: r.signal, kind: r.kind,
      ...(r.kind === "salient" ? (r.fields ? { fields: r.fields } : {}) : { failed: [{ ...(r.predicate ? { predicate: r.predicate } : {}), why: r.why ?? "noise" }] }),
      time: s.time, observed: s.observed, withdrawn_at: s.withdrawn_at ?? null,
      factors: { lag: (observed - Date.parse(s.time)) / 1000, age: Math.max(0, (asOf - observed) / 1000), producer_confirmed: null, producer_withdrawn: null, uptake: null },
    };
  }) };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: receptionPath(a.record), draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
