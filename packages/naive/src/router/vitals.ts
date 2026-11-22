#!/usr/bin/env node
// Agent vitals (N-6): Naive's Core Web Vitals. Where Next.js measures time to first byte and time to
// interactive, Naive measures what it costs an agent to get work done through the router:
//
//   calls_per_task      router calls an agent makes in one session (a task)
//   tokens_per_call     tokens of context each call sends back
//   time_to_useful_ms   time from a session's first call to its first useful answer
//   decision_hours      time from a decision opening to a person deciding it (open ones count their age)
//
// Like Web Vitals, each is assessed at the 75th percentile and checked against a threshold (C-15),
// so vitals are checked, not only measured. Calls and judgments come from the events log that
// instrumentation writes (packages/naive/src/core/instrumentation.ts); decisions come from provenance.jsonl, so
// decision latency is measured even with instrumentation off. Thresholds are the defaults below,
// overridden by "vitals" in the venture's naive.config.json.
//
//   node packages/naive/src/router/vitals.ts <venture dir> [--json] [--check]     --check exits 1 when a vital fails
//   node packages/naive/src/router/vitals.ts <venture dir> --trace [--session <id>] the events as a trace, for
//                                                                   an exporter in the app that hosts Naive

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { events } from "../core/instrumentation.ts";
import type { InstrumentEvent } from "../core/instrumentation.ts";
import { entries } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";

/** One instrumentation event (packages/naive/src/core/instrumentation.ts): a call or a judgment. */
type Ev = InstrumentEvent;
type Vital = { p75: number | null; threshold: number; n: number; passed: boolean | null; status: string; never_useful?: number };
type Run = { name: string; run_type: string; start: string; end: string; inputs: Record<string, unknown>; outputs: Record<string, unknown>; error?: string; metadata: Record<string, unknown>; children?: Run[] };

export const THRESHOLDS: Record<string, number> = { calls_per_task: 25, tokens_per_call: 6000, time_to_useful_ms: 10000, decision_hours: 72 };
const DECISION = /(^|\/)decisions\/[^/]+\.decision\.json$/;

/** The 75th percentile, nearest rank. */
export const p75 = (xs: number[]): number | null => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[Math.ceil(0.75 * s.length) - 1]; };
const startOf = (e: Ev) => Date.parse(e.at) - (e.ms ?? 0);
const config = (dir: string) => { const f = join(ventureFile(dir, "naive.config.json")); try { return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {}; } catch { return {}; } };

/** Top-level calls grouped by session: one task per session. */
export function tasks(dir: string) {
  const calls: Ev[] = events(dir).filter((e: Ev) => e.kind === "call" && !e.parent);
  const judgments: Ev[] = events(dir).filter((e: Ev) => e.kind === "judgment");
  const by = new Map<string, Ev[]>();
  for (const e of calls) { const k = e.session ?? "(no session)"; by.set(k, [...(by.get(k) ?? []), e]); }
  return [...by.entries()].map(([session, es]) => {
    const t0 = Math.min(...es.map(startOf));
    const useful = es.filter((e) => e.useful).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];
    return { session, calls: es.length, tokens_per_call: Math.round(es.reduce((n, e) => n + (e.tokens ?? 0), 0) / es.length), max_tokens: Math.max(...es.map((e) => e.tokens ?? 0)),
      time_to_useful_ms: useful ? Date.parse(useful.at) - t0 : null, judgments: judgments.filter((j) => (j.session ?? "(no session)") === session).length };
  });
}

/** Each decision the provenance log saw open: when it opened, when a person decided it, and the hours between. */
export function decisionLatency(dir: string, now = Date.now()) {
  type Seen = { file: string; opened: string | null; decided: string | null };
  const by = new Map<string, Seen>();
  for (const e of entries(dir).filter((x: { entity?: string }) => DECISION.test(x.entity ?? "")) as { entity: string; at: string; activity: string }[]) {
    const d = by.get(e.entity) ?? { file: e.entity, opened: null, decided: null };
    if (!d.opened) d.opened = e.at;
    if (e.activity === "accept" && !d.decided) d.decided = e.at;
    by.set(e.entity, d);
  }
  return [...by.values()].map((d) => {
    let id = String(d.file.split("/").at(-1)).replace(/\.decision\.json$/, "");
    try { id = JSON.parse(readFileSync(ventureFile(dir, d.file), "utf8")).id ?? id; } catch {}
    const end = d.decided ? Date.parse(d.decided) : now;
    return { id, ...d, open: !d.decided, hours: Math.round(((end - Date.parse(String(d.opened))) / 36e5) * 100) / 100 };
  });
}

/** The venture's vitals, each at p75 against its threshold. */
export function vitals(dir: string, now = Date.now()) {
  const limits: Record<string, number> = { ...THRESHOLDS, ...(config(dir).vitals ?? {}) };
  const ts = tasks(dir), ds = decisionLatency(dir, now);
  const measure = (name: string, xs: number[], never = 0): Vital => {
    const v = p75(xs);
    const n = xs.length + never;
    const passed = n === 0 ? null : never > 0 && never / n > 0.25 ? false : v === null ? false : v <= limits[name];
    return { p75: v, threshold: limits[name], n, passed, status: passed === null ? "no data" : passed ? "good" : "needs work", ...(never ? { never_useful: never } : {}) };
  };
  const out = {
    calls_per_task: measure("calls_per_task", ts.map((t) => t.calls)),
    tokens_per_call: measure("tokens_per_call", ts.map((t) => t.tokens_per_call)),
    time_to_useful_ms: measure("time_to_useful_ms", ts.flatMap((t) => t.time_to_useful_ms !== null ? [t.time_to_useful_ms] : []), ts.filter((t) => t.time_to_useful_ms === null).length),
    decision_hours: measure("decision_hours", ds.map((d) => d.hours)),
  };
  const failing = Object.entries(out).filter(([, v]) => v.passed === false).map(([k]) => k);
  return { events: events(dir).length, tasks: ts, decisions: ds, vitals: out, passed: failing.length === 0, failing,
    note: events(dir).length ? "p75 of each vital against its threshold (naive.config.json vitals overrides the defaults)" : "no events yet: turn instrumentation on in naive.config.json ({\"instrumentation\": {\"events\": true}}) to measure calls, tokens and time to a useful answer" };
}

/** The events as one trace (root run per session, a child per call, nested calls under their parent), with the vitals as feedback. */
export function trace(dir: string, session?: string) {
  const es: Ev[] = events(dir).filter((e: Ev) => !session || (e.session ?? "(no session)") === session);
  const calls = es.filter((e) => e.kind === "call");
  const node = (e: Ev): Run => ({ name: `${e.action} ${e.route}`, run_type: e.action === "run" ? "tool" : "retriever", start: new Date(startOf(e)).toISOString(), end: e.at,
    inputs: { venture: e.venture, route: e.route, action: e.action }, outputs: { ok: e.ok, useful: e.useful, tokens: e.tokens, ms: e.ms }, ...(e.ok ? {} : { error: "call failed" }),
    metadata: { via: e.via, actor: e.actor }, children: calls.filter((c) => c.parent === e.id).map(node) });
  const judged = es.filter((e) => e.kind === "judgment").map((e): Run => ({ name: `judgment ${e.question ?? e.route ?? ""}`.trim(), run_type: "llm", start: new Date(Date.parse(e.at) - (e.ms ?? 0)).toISOString(), end: e.at,
    inputs: { question: e.question, route: e.route }, outputs: { score: e.score, threshold: e.threshold, outcome: e.outcome }, metadata: { model: e.model, owner: e.owner } }));
  const v = vitals(dir);
  const start = es.length ? new Date(Math.min(...es.map((e) => Date.parse(e.at) - (e.ms ?? 0)))).toISOString() : new Date().toISOString();
  const end = es.at(-1)?.at ?? start;
  return { name: `naive ${JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).id}${session ? ` ${session}` : ""}`, run_type: "chain", start, end,
    inputs: { session: session ?? null }, outputs: { calls: calls.filter((c) => !c.parent).length, judgments: judged.length },
    children: [...calls.filter((c) => !c.parent).map(node), ...judged].sort((a, b) => a.start.localeCompare(b.start)),
    feedback: Object.entries(v.vitals).filter(([, x]) => x.passed !== null).map(([key, x]) => ({ key, score: x.passed ? 1 : 0, comment: `p75 ${x.p75} against ${x.threshold}` })) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/router/vitals.ts <venture dir> [--json] [--check] [--trace [--session <id>]]"); process.exit(2); }
  const arg = (n: string): string | undefined => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
  if (process.argv.includes("--trace")) { console.log(JSON.stringify(trace(dir, arg("session")), null, 2)); process.exit(0); }
  const r = vitals(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.events} events, ${r.tasks.length} tasks, ${r.decisions.length} decisions. ${r.note}`);
    for (const [k, x] of Object.entries(r.vitals)) console.log(`  ${k.padEnd(18)} ${x.status.padEnd(10)} p75 ${x.p75 ?? "-"} (threshold ${x.threshold}, n ${x.n})`);
  }
  if (process.argv.includes("--check") && !r.passed) { console.error(`vitals failing: ${r.failing.join(", ")}`); process.exit(1); }
}
