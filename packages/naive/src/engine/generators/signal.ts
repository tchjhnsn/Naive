// Record generator for a signal (EE-099; signal library design, everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md). The agent or person gives the type (id@major.minor), the subject, the
// valid time, the props, the rating and what it cites, and at most one of retracts or supersedes. The generator
// fills the producer (local/founder unless given), observed (now unless given) and the id, the address of every
// other field (packages/naive/src/core/signal-id.ts). The draft is for the venture's local library at
// raw/signals/signals/<type>/<subject>/<yyyy-mm-dd>-<id>.json. naive signals emit writes one (packages/naive/src/router/orchestration/signals.ts).
import { cli, drop, questions, schemaOf, validate } from "./generate.mjs";
import { signalId } from "../../core/signal-id.ts";
import type { Signal } from "../../records/types/records.d.ts";

export const record = "signal";
const DERIVED = ["id", "producer", "observed"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "the address: the first 24 hex characters of the sha256 of the canonical JSON of every other field", producer: "local/founder unless given", observed: "now unless given" } });

/** The file a signal sits at, relative to its library's root. */
export const signalPath = (s: Pick<Signal, "type" | "subject" | "time" | "id">) => `signals/${s.type.split("@")[0]}/${s.subject}/${s.time.slice(0, 10)}-${s.id}.json`;

export function draft(a: Partial<Signal>) {
  if (!a.type || !a.subject || !a.time || !a.props || !a.rating) return { ok: false, record, errors: ["a signal needs a type, a subject, a time, props and a rating"] };
  const body = drop({ type: a.type, producer: a.producer ?? "local/founder", subject: a.subject, time: a.time, observed: a.observed ?? new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    props: a.props, rating: a.rating, cites: a.cites ?? [], retracts: a.retracts, supersedes: a.supersedes });
  const rec = { id: signalId(body), ...body } as Signal;
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `raw/signals/${signalPath(rec)}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
