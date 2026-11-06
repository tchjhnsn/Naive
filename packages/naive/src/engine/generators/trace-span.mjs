// Record generator for a trace span (EE-099, EE-121). The agent or harness gives a name and a kind, and may give
// the run's trace id, its parent span, start, end, status and attributes; the generator fills a span id, the times
// (now when absent) and status ok, and chains it as the first line of a file so the draft passes the schema. The
// draft goes to: naive trace append --venture <dir> (which re-chains it onto the session's file and drops inputs
// and outputs unless traces.content is on).
import { randomUUID } from "node:crypto";
import { cli, drop, questions, schemaOf, validate } from "./generate.mjs";
import { spanHash } from "../../core/instrumentation.mjs";

export const record = "trace-span";
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q) => !["span_id", "prev", "hash"].includes(q.field)),
  derived: { span_id: "a new id unless given", trace_id: "MENTURA_TRACE_ID or a new id", start: "now unless given", end: "start unless given", status: "ok unless given", prev: "genesis", hash: "sha256 of prev and the span" } });

/** @param {any} a */
export function draft(a) {
  if (!a.name || !a.kind) return { ok: false, record, errors: ["a span needs a name and a kind"] };
  const start = a.start ?? new Date().toISOString();
  const line = drop({ trace_id: a.trace_id ?? process.env.MENTURA_TRACE_ID ?? randomUUID(), span_id: a.span_id ?? randomUUID(), parent_span_id: a.parent_span_id,
    name: a.name, kind: a.kind, start, end: a.end ?? start, status: a.status ?? "ok", error: a.error, attributes: a.attributes });
  const chained = { ...line, prev: "genesis" };
  const rec = { ...chained, hash: spanHash("genesis", chained) };
  const v = validate(record, rec);
  return { ok: v.ok, record, route: "system/traces", draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
