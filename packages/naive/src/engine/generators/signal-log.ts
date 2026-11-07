// Record generator for a line of a signal library's day index (EE-099; signal library design, everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md). Given a signal, it fills the id, the subject and the signal's path, and
// the publication time (now unless given). The line goes at the end of log/<type>/<yyyy-mm-dd>.jsonl for the day
// it was published.
import { cli, questions, schemaOf, validate } from "./generate.mjs";
import { signalPath } from "./signal.ts";
import type { Signal, SignalLog } from "../../records/types/records.d.ts";

export const record = "signal-log";
export const describe = () => ({ record, ask: [{ field: "signal", required: true, type: "object", says: "The signal published" }, ...questions(schemaOf(record)).filter((q: { field: string }) => q.field === "published")],
  derived: { id: "the signal's", subject: "the signal's", path: "signals/<type>/<subject>/<yyyy-mm-dd>-<id>.json", published: "now unless given" } });

export function draft(a: { signal?: Signal; published?: string }) {
  const s = a.signal;
  if (!s?.id || !s.type || !s.subject || !s.time) return { ok: false, record, errors: ["a log line needs the signal it indexes"] };
  const published = a.published ?? new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const rec: SignalLog = { id: s.id, subject: s.subject, path: signalPath(s), published };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `log/${s.type.split("@")[0]}/${published.slice(0, 10)}.jsonl`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
