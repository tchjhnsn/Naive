// Instrumentation (Naive's instrumentation.ts, P-4; logging fetches in development, F-4). One hook
// where every router call, every judgment and every provenance entry (write, draft, accept,
// confirm, decision) emits an event. Listeners registered in-process get every event. When a venture
// turns instrumentation on, events are also appended to <venture>/.naive/events.jsonl, which agent
// vitals read (packages/naive/src/router/vitals.mjs, N-6). Provenance stays the record of what changed; events are
// what it cost. An exporter in the app that hosts Naive (such as a LangSmith one) can ship a trace made from
// the events; the framework names no vendor.
//
// Turn it on in the venture's naive.config.json, like adding instrumentation.ts to a Next.js app:
//
//   { "instrumentation": { "events": true } }
//
// NAIVE_INSTRUMENT=1 turns it on for every venture in this process, and NAIVE_INSTRUMENT=0 off.
// No dependencies and no network. An event holds routes, sizes and times, never record content.
//
// Traces (EE-121): when a venture turns traces on ({ "traces": true }, or NAIVE_TRACES=1), every step of
// an agent run is also a span in <venture>/traces/<session>.jsonl, after the OpenTelemetry GenAI semantic
// conventions: an agent or subagent run, a model call, a tool call, a router call, a judgment or a trigger.
// Each line is hash-chained like the provenance log, and a provenance line written inside a span names it,
// so what changed points to the step that changed it, offline. Router calls and judgments become spans
// here; an agent framework adds its own (agent, model, tool) with span() or withSpan(), or any harness pipes
// span lines to `naive trace append`. Inputs and outputs stay out unless traces.content is on, and even then
// they are redacted. Shipping a trace anywhere (LangSmith takes OpenTelemetry) is the host app's job.

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "./venture-paths.ts";
import type { NaiveConfig, TraceSpan } from "../records/types/records.d.ts";

export const EVENTS = ".naive/events.jsonl";
export const TRACES = "traces";
export const SPAN_KINDS = ["agent", "model", "tool", "call", "judgment", "trigger"] as const;
export type SpanKind = TraceSpan["kind"];

/**
 * One instrumentation event: a router call (kind call), a judgment, a provenance entry, or what a listener's caller
 * emits. It holds routes, sizes and times, never record content. The named fields are the ones Naive's own events carry.
 */
export type InstrumentEvent = {
  at: string; id: string; session: string | null; kind: string;
  parent?: string | null; venture?: string | null; route?: string; action?: string; ok?: boolean; useful?: boolean; ms?: number; tokens?: number;
  actor?: string; via?: string; activity?: string; entity?: string; decision?: string; by?: string; question?: string; score?: number; threshold?: number; outcome?: string; owner?: string; model?: string;
  [key: string]: unknown;
};
/** What a caller emits: the event's kind and fields; at, id and session are filled in unless given. */
export type EventInput = Partial<Omit<InstrumentEvent, "kind">> & { kind: string };
/** A span attribute value, as a trace line keeps it. */
export type SpanAttribute = NonNullable<TraceSpan["attributes"]>[string];
export type Listener = (e: InstrumentEvent, dir: string | null | undefined) => void;
/** The span code runs inside. */
export type SpanContext = { trace_id: string; span_id: string; session: string };
/** A span to write. kind must be one of SPAN_KINDS; span refuses any other. An attribute that is not JSON (undefined) is dropped. */
export type SpanInput = {
  name: string; kind: string; start?: string; end?: string; status?: string; error?: string; attributes?: Record<string, unknown>;
  trace_id?: string; span_id?: string; parent_span_id?: string | null; session?: string;
};
/** A span line as span() writes it: TraceSpan, with the status the caller gave (ok or error when it gave none). */
export type SpanLine = Omit<TraceSpan, "status"> & { status: string };
/** The arguments of one router call, as far as instrumentation reads them. */
export type CallArgs = { venture?: string | null; workspace?: string; route?: string; action?: string; session?: string; input?: unknown; actor?: string; via?: string };
/** The answer of one router call, as far as instrumentation reads it. */
export type CallAnswer = { ok?: boolean; result?: unknown; error?: unknown; needs_input?: unknown };

const listeners = new Set<Listener>();
const scope = new AsyncLocalStorage<string>();
const spanScope = new AsyncLocalStorage<SpanContext>();
const isSpanKind = (k: string): k is SpanKind => SPAN_KINDS.some((x) => x === k);
const isAttribute = (v: unknown): v is SpanAttribute => v === null || typeof v === "string" || typeof v === "number" || typeof v === "boolean" || typeof v === "object";

/** Tokens a payload costs an agent, estimated as characters / 4 (the common rule of thumb). */
export const tokens = (x: unknown): number => Math.ceil((x === undefined ? 0 : typeof x === "string" ? x.length : (JSON.stringify(x) ?? "").length) / 4);

/** Registers a listener for every event, like register() in instrumentation.ts. Returns the unregister. */
export function register(fn: Listener): () => boolean { listeners.add(fn); return () => listeners.delete(fn); }

/** naive.config.json as instrumentation reads it. `instrumentation` is a key the config schema does not list yet. */
type InstrumentConfig = Partial<NaiveConfig> & { instrumentation?: boolean | { events?: boolean } };
const configOf = (dir: string | null | undefined): InstrumentConfig => {
  const f = dir && join(ventureFile(dir, "naive.config.json"));
  if (!f || !existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, "utf8")); } catch { return {}; }
};

/** Whether a venture writes traces, and whether they keep inputs and outputs. */
export function tracing(dir: string | null | undefined): { on: boolean; content: boolean } {
  if (!dir || process.env.NAIVE_TRACES === "0") return { on: false, content: false };
  const t = configOf(dir).traces;
  const on = process.env.NAIVE_TRACES === "1" || t === true || (typeof t === "object" && t.spans === true);
  return { on, content: on && typeof t === "object" && t.content === true };
}

/** Whether a venture writes its events log. */
export function enabled(dir: string | null | undefined): boolean {
  if (process.env.NAIVE_INSTRUMENT === "0") return false;
  if (process.env.NAIVE_INSTRUMENT === "1") return !!dir;
  const i = configOf(dir).instrumentation;
  return i === true || (typeof i === "object" && i.events === true);
}

/** Emits one event: to every listener, and to the venture's events log when it is on. */
export function emit(dir: string | null | undefined, event: EventInput): InstrumentEvent {
  const e: InstrumentEvent = { at: new Date().toISOString(), id: randomUUID(), session: process.env.MENTURA_SESSION ?? null, ...event };
  for (const [k, v] of Object.entries(e)) if (v === undefined) Reflect.deleteProperty(e, k);
  for (const fn of listeners) { try { fn(e, dir); } catch {} }
  try { traceHook(e, dir); } catch {}
  if (dir && enabled(dir)) {
    try { mkdirSync(join(dir, ".naive"), { recursive: true }); appendFileSync(ventureFile(dir, EVENTS), JSON.stringify(e) + "\n"); } catch {}
  }
  return e;
}

/** The venture's events, oldest first. */
export function events(dir: string): InstrumentEvent[] {
  const f = ventureFile(dir, EVENTS);
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).flatMap((l): InstrumentEvent[] => { try { return [JSON.parse(l)]; } catch { return []; } });
}

/**
 * Wraps one router call: times it, measures what it sends back, and emits a call event. A call made
 * inside another (a view reads its record, the overview runs its slots) carries its parent's id, so
 * vitals count only what the agent asked for. dirOf resolves the venture folder. The answer passes through unchanged.
 */
export async function instrumented<A extends CallArgs, T extends CallAnswer | null | undefined>(
  args: A, fn: (a: A) => T | Promise<T>, dirOf: (venture: string, workspace?: string) => string | null,
): Promise<T> {
  const parent = scope.getStore() ?? null;
  const id = randomUUID();
  const t0 = performance.now();
  const r = await scope.run(id, () => fn(args));
  if (process.env.NAIVE_INSTRUMENT === "0" && !listeners.size) return r;
  let dir: string | null = null;
  try { dir = args.venture ? dirOf(args.venture, args.workspace) : null; } catch {}
  if (!dir && !listeners.size) return r;
  const useful = !!r?.ok && r?.result !== null && r?.result !== undefined && !r?.needs_input;
  const inputSession = typeof args.input === "object" && args.input !== null && "session" in args.input ? args.input.session : undefined;
  emit(dir, { kind: "call", id, parent, session: args.session ?? inputSession ?? process.env.MENTURA_SESSION ?? null, venture: args.venture ?? null, route: args.route, action: args.action,
    ok: !!r?.ok, useful, ms: Math.round(performance.now() - t0), tokens: tokens(r?.result ?? r?.error), actor: args.actor ?? "agent", via: args.via ?? "router" });
  return r;
}

/**
 * Records one judgment (a System 1 call or a scored check): what was asked, the score and the outcome.
 */
export function judgment(dir: string | null | undefined, { question, score, threshold, outcome, owner, model, route, ms }: {
  question?: string; score?: number; threshold?: number; outcome: string; owner?: string; model?: string; route?: string; ms?: number;
}): InstrumentEvent {
  return emit(dir, { kind: "judgment", question, score, threshold, outcome, owner, model, route, ms });
}

// ---- Traces (EE-121) ----

const sha = (x: string) => createHash("sha256").update(x).digest("hex");
const sorted = (x: unknown): unknown => Array.isArray(x) ? x.map(sorted) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, sorted(v)])) : x;
/** A span line's hash: sha256 of prev and the line's other fields, keys sorted (the provenance log's rule). */
export const spanHash = (prev: string, line: Record<string, unknown>): string => { const { hash: _hash, ...rest } = line; return sha(prev + JSON.stringify(sorted(rest))); };
const CONTENT = /^(gen_ai\.(input|output)\.messages|gen_ai\.system_instructions|gen_ai\.tool\.call\.(arguments|result)|naive\.(input|output))$/;
const safeSession = (s: string) => String(s).replace(/[^\w.-]/g, "_").slice(0, 120) || "session";

/** The trace file of one session. */
export const traceFile = (dir: string, session: string): string => ventureFile(dir, `${TRACES}/${safeSession(session)}.jsonl`);

/** The span the code is running inside: withSpan's, else one a parent process handed down in MENTURA_TRACE_ID and MENTURA_SPAN_ID. */
export function currentSpan(): SpanContext | null {
  const s = spanScope.getStore();
  if (s) return s;
  const e = process.env;
  return e.MENTURA_TRACE_ID && e.MENTURA_SPAN_ID ? { trace_id: e.MENTURA_TRACE_ID, span_id: e.MENTURA_SPAN_ID, session: e.MENTURA_SESSION ?? e.MENTURA_TRACE_ID } : null;
}

/** A span's lines in one session file, oldest first. */
export function spans(dir: string, session: string): TraceSpan[] {
  const f = traceFile(dir, session);
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).flatMap((l): TraceSpan[] => { try { return [JSON.parse(l)]; } catch { return []; } });
}

/** The venture's trace sessions, by file name without .jsonl. */
export function sessions(dir: string): string[] {
  const d = ventureFile(dir, TRACES);
  return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".jsonl")).map((f) => f.slice(0, -6)).sort() : [];
}

/**
 * Appends one finished span to the session's trace file, chained to the line before. Content attributes
 * are dropped unless traces.content is on. Returns the line written, or null when traces are off.
 */
export function span(dir: string, s: SpanInput, { force = false }: { force?: boolean } = {}): SpanLine | null {
  const t = tracing(dir);
  if (!t.on && !force) return null;
  const kind = s.kind;
  if (!isSpanKind(kind)) throw new Error(`a span's kind is one of ${SPAN_KINDS.join(", ")}, not ${s.kind}`);
  if (!s.name) throw new Error("a span needs a name");
  const parent = s.parent_span_id === undefined ? currentSpan() : null;
  const trace_id = s.trace_id ?? parent?.trace_id ?? randomUUID();
  const session = s.session ?? parent?.session ?? process.env.MENTURA_SESSION ?? trace_id;
  const attributes = Object.fromEntries(Object.entries(s.attributes ?? {}).filter((e): e is [string, SpanAttribute] => isAttribute(e[1]) && (t.content || !CONTENT.test(e[0]))));
  const now = new Date().toISOString();
  const f = traceFile(dir, session);
  const prior = spans(dir, session);
  const prev = prior.at(-1)?.hash ?? "genesis";
  const fields: Omit<SpanLine, "hash"> = { trace_id, span_id: s.span_id ?? randomUUID(), parent_span_id: s.parent_span_id ?? parent?.span_id ?? undefined,
    name: s.name, kind, start: s.start ?? now, end: s.end ?? now, status: s.status ?? (s.error ? "error" : "ok"), error: s.error,
    attributes: Object.keys(attributes).length ? attributes : undefined, prev };
  for (const [k, v] of Object.entries(fields)) if (v === undefined || v === null) Reflect.deleteProperty(fields, k);
  const line: SpanLine = { ...fields, hash: spanHash(prev, fields) };
  mkdirSync(ventureFile(dir, TRACES), { recursive: true });
  appendFileSync(f, JSON.stringify(line) + "\n");
  return line;
}

/**
 * Runs fn inside a new span: writes inside it (provenance) and spans opened inside it name it as their
 * parent, and the span is written when fn ends, with status error if it throws. Works with traces off too:
 * fn runs and nothing is written.
 */
export async function withSpan<T>(dir: string, s: Pick<SpanInput, "name" | "kind" | "attributes" | "session">, fn: (ctx: SpanContext) => T | Promise<T>): Promise<T> {
  const parent = currentSpan();
  const trace_id = parent?.trace_id ?? randomUUID();
  const ctx: SpanContext = { trace_id, span_id: randomUUID(), session: s.session ?? parent?.session ?? process.env.MENTURA_SESSION ?? trace_id };
  const start = new Date().toISOString();
  const write = (extra: Partial<SpanInput>) => { try { span(dir, { ...s, ...ctx, parent_span_id: parent?.span_id ?? null, start, ...extra }); } catch {} };
  // With traces off nothing is written, so nothing runs inside the span either: a provenance line must not name it.
  if (!tracing(dir).on) return await fn(ctx);
  try {
    const out = await spanScope.run(ctx, () => fn(ctx));
    write({});
    return out;
  } catch (e) {
    write({ status: "error", error: String((typeof e === "object" && e !== null && "message" in e ? e.message : undefined) ?? e) });
    throw e;
  }
}

// Router calls and judgments are spans too when traces are on (called by emit, not a listener, so
// instrumented() still skips its work when nothing listens and no venture is resolved).
function traceHook(e: InstrumentEvent, dir: string | null | undefined) {
  if (!dir || (e.kind !== "call" && e.kind !== "judgment")) return;
  if (!tracing(dir).on) return;
  const end = e.at, start = typeof e.ms === "number" && e.ms ? new Date(Date.parse(e.at) - e.ms).toISOString() : e.at;
  if (e.kind === "call") span(dir, { name: `naive ${String(e.action)} ${String(e.route)}`, kind: "call", start, end, status: e.ok ? "ok" : "error",
    attributes: { "naive.route": e.route, "naive.action": e.action, "naive.venture": e.venture ?? undefined, "naive.ok": e.ok, "naive.useful": e.useful, "naive.tokens": e.tokens, "naive.actor": e.actor, "naive.via": e.via } });
  else span(dir, { name: `judgment ${String(e.question ?? e.route ?? "")}`.trim(), kind: "judgment", start, end,
    attributes: { "naive.question": e.question, "naive.score": e.score, "naive.threshold": e.threshold, "naive.outcome": e.outcome, "naive.owner": e.owner, "gen_ai.request.model": e.model, "naive.route": e.route } });
}
