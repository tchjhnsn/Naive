// NaiveTracer (EE-161, phase 5). An Effect Tracer that writes every span an Effect run opens (Effect.withSpan,
// Effect.fn with a name) to the venture's EE-121 trace files through core/instrumentation.ts, so a span from
// Effect is one more hash-chained line beside the router's and the agent harness's, and check-traces.ts checks it
// like any other. Nothing is written while the venture has traces off: the span still exists in memory for Effect.
//
//   - kind: the span's `naive.kind` attribute when it is one of SPAN_KINDS, else `call`;
//   - session: the root span's `naive.session` attribute, else the session of the span it runs inside
//     (instrumentation's withSpan, or MENTURA_SESSION), else the trace id. A whole Effect trace keeps one session;
//   - parent: the Effect parent span, else the instrumentation span the run started inside, so an Effect run
//     called from withSpan nests under it;
//   - status: error, with the first line of the failure, when the span's exit is a failure; an interruption is error too.
//
// A provenance line written inside an Effect span names it (traceContextOf, read by core/provenance.ts), when the
// span is this tracer's for the same venture and that venture writes traces.
import { resolve } from "node:path";
import { Cause, Exit, Option, Tracer } from "effect";
import { currentSpan, SPAN_KINDS, span as writeSpan, type SpanKind, tracing } from "../instrumentation.ts";

const KIND = "naive.kind";
const SESSION = "naive.session";
const isKind = (k: unknown): k is SpanKind => SPAN_KINDS.some((x) => x === k);
const iso = (ns: bigint): string => new Date(Number(ns / 1_000_000n)).toISOString();

type SpanOptions = Parameters<Tracer.Tracer["span"]>[0];

/** A NativeSpan that appends itself to the venture's trace file when it ends. */
class NaiveSpan extends Tracer.NativeSpan {
  readonly dir: string;
  readonly inherited: () => string | undefined;
  constructor(dir: string, options: SpanOptions, inherited: () => string | undefined) {
    super(options);
    this.dir = dir;
    this.inherited = inherited;
  }
  /** Its own naive.session attribute, else its parent's session, else the trace id. Read at end, after attributes are set. */
  get session(): string {
    const own = this.attributes.get(SESSION);
    return typeof own === "string" && own ? own : this.inherited() ?? this.traceId;
  }
  override end(endTime: bigint, exit: Exit.Exit<unknown, unknown>): void {
    if (this.status._tag === "Ended") return;
    const start = this.status.startTime;
    super.end(endTime, exit);
    const attributes = Object.fromEntries([...this.attributes].filter(([k]) => k !== KIND && k !== SESSION));
    const kind = this.attributes.get(KIND);
    const error = Exit.isFailure(exit) ? Cause.pretty(exit.cause).split("\n")[0] || "failed" : undefined;
    const parent = Option.getOrUndefined(this.parent);
    try {
      writeSpan(this.dir, {
        name: this.name, kind: isKind(kind) ? kind : "call", trace_id: this.traceId, span_id: this.spanId,
        parent_span_id: parent?.spanId ?? null, session: this.session, start: iso(start), end: iso(endTime),
        status: error === undefined ? "ok" : "error", error, attributes,
      });
    } catch {}
  }
}

/** The tracer for one venture: every Effect span it makes is written to `dir`'s trace files when it ends. */
export const naiveTracer = (dir: string): Tracer.Tracer => Tracer.make({
  span(options) {
    const outer = Option.isNone(options.parent) && !options.root ? currentSpan() : null;
    const opts: SpanOptions = outer ? { ...options, parent: Option.some(Tracer.externalSpan({ spanId: outer.span_id, traceId: outer.trace_id })) } : options;
    const parent = Option.getOrUndefined(options.parent);
    const env = process.env.MENTURA_SESSION;
    return new NaiveSpan(dir, opts, () => parent instanceof NaiveSpan ? parent.session : outer?.session ?? env);
  },
});

/** Sets the session of a root span opened with these options: `Effect.withSpan(name, { attributes: { ...inSession(id) } })`. */
export const inSession = (session: string): Record<string, string> => ({ [SESSION]: session });

/** Sets the trace kind of a span: `Effect.withSpan(name, { attributes: { ...asKind("tool") } })`. */
export const asKind = (kind: SpanKind): Record<string, string> => ({ [KIND]: kind });

/**
 * The trace span a provenance line should name, for an Effect span: its ids and session when it is a NaiveTracer
 * span for `dir` and that venture writes traces, so the line never names a span no trace file will hold. Else null.
 */
export const traceContextOf = (s: Tracer.AnySpan, dir: string): { trace_id: string; span_id: string; session: string } | null =>
  s instanceof NaiveSpan && resolve(s.dir) === resolve(dir) && tracing(dir).on ? { trace_id: s.traceId, span_id: s.spanId, session: s.session } : null;
