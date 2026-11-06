// The venture's traces from the command line (EE-121): any agent harness writes spans by piping them in,
// and anyone reads them back offline. A span line is an object with name and kind (agent, model, tool,
// call, judgment, trigger), and optionally trace_id, span_id, parent_span_id, start, end, status, error and
// attributes (OpenTelemetry GenAI names). Each one is chained into traces/<session>.jsonl; inputs and outputs
// are dropped unless the venture turns on traces.content.
//
//   node packages/naive/src/engine/trace-cli.ts <venture dir> append [--session <id>]   span lines on stdin
//   node packages/naive/src/engine/trace-cli.ts <venture dir> show [<session>] [--json]  the sessions, or one session as a tree
//
// append exits 3 when the venture has traces off ({ "traces": true } in naive.config.json turns them on).

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sessions, span, spans, tracing } from "../core/instrumentation.mjs";
import type { TraceSpan } from "../records/types/records.d.ts";

type Input = { name: string, kind: string, trace_id?: string, span_id?: string, parent_span_id?: string, start?: string, end?: string, status?: string, error?: string, attributes?: Record<string, unknown> };

/** Appends span lines (JSON per line) to a session's trace file and returns how many were written. */
export function append(dir: string, text: string, session?: string): number {
  if (!tracing(dir).on) throw Object.assign(new Error("traces are off for this venture: set \"traces\": true in naive.config.json"), { code: 3 });
  let n = 0;
  const run = process.env.MENTURA_TRACE_ID ?? randomUUID();
  for (const [i, l] of text.split("\n").entries()) {
    if (!l.trim()) continue;
    let s: Input;
    try { s = JSON.parse(l) as Input; } catch { throw new Error(`line ${i + 1}: not JSON`); }
    const trace_id = s.trace_id ?? run;
    const line = span(dir, { ...s, trace_id, session: session ?? process.env.MENTURA_SESSION ?? trace_id, parent_span_id: s.parent_span_id ?? null });
    if (line) n++;
  }
  return n;
}

const ms = (s: TraceSpan): number => Math.max(0, Date.parse(s.end) - Date.parse(s.start));

/** One session as indented lines: each span under its parent, with its kind, duration and status. */
export function tree(list: TraceSpan[]): string[] {
  const ids = new Set(list.map((s) => s.span_id));
  const kids = new Map<string, TraceSpan[]>();
  const roots: TraceSpan[] = [];
  for (const s of [...list].sort((a, b) => a.start.localeCompare(b.start))) {
    if (s.parent_span_id && ids.has(s.parent_span_id)) kids.set(s.parent_span_id, [...(kids.get(s.parent_span_id) ?? []), s]);
    else roots.push(s);
  }
  const out: string[] = [];
  const walk = (s: TraceSpan, depth: number) => {
    out.push(`${"  ".repeat(depth)}${s.kind.padEnd(8)} ${s.name}  ${ms(s)}ms${s.status === "error" ? `  ERROR ${s.error ?? ""}` : ""}`);
    for (const k of kids.get(s.span_id) ?? []) walk(k, depth + 1);
  };
  for (const r of roots) walk(r, 0);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [d, cmd = "show", ...rest] = process.argv.slice(2);
  if (!d) { console.error("usage: node packages/naive/src/engine/trace-cli.ts <venture dir> append [--session <id>] | show [<session>] [--json]"); process.exit(2); }
  const dir = resolve(d);
  const flag = (n: string) => { const i = rest.indexOf(`--${n}`); return i < 0 ? undefined : rest[i + 1]; };
  if (cmd === "append") {
    try { console.log(`appended ${append(dir, readFileSync(0, "utf8"), flag("session"))} spans`); }
    catch (e) { console.error((e as Error).message); process.exit((e as { code?: number }).code ?? 1); }
  } else if (cmd === "show") {
    const session = rest.find((a) => !a.startsWith("--"));
    const json = rest.includes("--json");
    if (!session) {
      const list = sessions(dir).map((s) => ({ session: s, spans: spans(dir, s).length }));
      if (json) console.log(JSON.stringify(list, null, 2));
      else if (!list.length) console.log(tracing(dir).on ? "no traces yet" : "no traces: traces are off (\"traces\": true in naive.config.json)");
      else for (const l of list) console.log(`${l.session}  ${l.spans} spans`);
    } else {
      const list = spans(dir, session) as TraceSpan[];
      if (json) console.log(JSON.stringify(list, null, 2));
      else console.log(tree(list).join("\n") || `no session ${session}`);
    }
  } else { console.error(`unknown command ${cmd}: append or show`); process.exit(2); }
}
