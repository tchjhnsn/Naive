// The pure signal render (signal library design, build item 3; everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md, "Noise belongs to the pair, not the signal" and "Derivation"). No I/O
// and no clock: every input is an argument, `now` included, and only edge listeners read it.
//
//   viewsOf(signal, types)                 the whole view of a signal and one view per composed part
//   receive(view, listener, facts, now)    salient or noise for one view at one listener, every failure reported
//   withdraw(signals)                      which signals a retraction or a supersession withdraws, and which it may not
//   fold(reducer, contributions)           one field from its contributions in (time, id) order
//   render(input)                          level listeners to a fixpoint (at most five rounds, else raised), then
//                                          edge listeners once
//   diff(rendered, current, proposals)     each rendered record as new, changed, unchanged (verify) or kept
//   renderCase(type, types, c)             a signal type's worked case, rendered by the type's own projections
//
// This folder is private: only its own modules and the signal engine beside it (engine/signals.ts, build item 5,
// not built) may import it. scripts/dependency-rules.ts enforces that.
import { canonicalJson, signalId } from "../../core/signal-id.ts";
import type { Listener, ListenerPredicate, Signal, SignalRating, SignalType, SignalTypeCase, SignalTypeFold, SignalTypeProjection } from "../../records/types/records.d.ts";

/** A signal as a pull receives it: the library it came from (`local` is the venture's own raw/signals/). */
export type Received = { readonly signal: Signal; readonly library: string };

/** What a listener and a projection read: the envelope with props, for the whole signal or for one part. */
export type View = {
  readonly id: string;
  /** The type of this view: the signal's type, or the part's type. */
  readonly type: string;
  /** major.minor of that type. */
  readonly version: string;
  /** The props key of the part, or null for the whole signal. */
  readonly part: string | null;
  readonly producer: string;
  readonly subject: string;
  readonly time: string;
  readonly observed: string;
  readonly rating: SignalRating;
  readonly props: Readonly<Record<string, unknown>>;
};

/** Facts a predicate may read: one field of one venture file by `file#field`, and the ids of records per collection. */
export type Facts = { readonly read?: Readonly<Record<string, unknown>>; readonly ids?: Readonly<Record<string, readonly string[]>> };

export type Failure = { readonly predicate: string; readonly why: string };
export type Reception =
  | { readonly kind: "salient"; readonly listener: string; readonly view: View; readonly facts: string[] }
  | { readonly kind: "noise"; readonly listener: string; readonly view: View; readonly failed: Failure[] };

const RELIABILITY = ["A", "B", "C", "D", "E", "F"];

// ---- Versions and views ----

const parse = (v: string) => v.split(".").map(Number);
const majorMinor = (v: string) => parse(v).slice(0, 2).join(".");

/** Whether a version (major.minor or major.minor.patch) is in a range: ^1, ^1.2, ~1.2 or an exact 1.2.0. Under ^ a
 *  major of 0 holds the minor fixed, as npm does. An exact range ignores a patch the version does not have. */
export function satisfies(version: string, range: string): boolean {
  const [ma, mi = 0, pa] = parse(version);
  const op = range[0] === "^" || range[0] === "~" ? range[0] : "";
  const [rma, rmi, rpa] = parse(op ? range.slice(1) : range);
  if (ma !== rma) return false;
  if (op === "^") return rma > 0 ? rmi === undefined || mi >= rmi : rmi === undefined || mi === rmi;
  if (op === "~") return rmi === undefined || mi === rmi;
  return mi === (rmi ?? 0) && (pa === undefined || rpa === undefined || pa === rpa);
}

/** `id@range` split in two. */
export const splitRange = (r: string): [string, string] => { const at = r.indexOf("@"); return [r.slice(0, at), r.slice(at + 1)]; };

/** The highest version of a type in the catalog whose version is in the range. */
export function resolveType(types: readonly SignalType[], id: string, range: string): SignalType | undefined {
  return types.filter((t) => t.id === id && satisfies(t.version, range))
    .sort((a, b) => { const [x, y] = [parse(a.version), parse(b.version)]; return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; }).at(-1);
}

/** The type definition a view was written against: the same major.minor, the highest patch. */
export const typeOfView = (types: readonly SignalType[], view: View) => resolveType(types, view.type, view.version);

/** The whole view of a signal, then one view per composed part (and their parts, four levels at most). A part's view
 *  has the part type's id and version and the part's props; the envelope is the signal's. A part whose props are not
 *  an object, or whose type is not in the catalog, has no view. A retraction has no view: it only withdraws. */
export function viewsOf(signal: Signal, types: readonly SignalType[]): View[] {
  if (signal.retracts) return [];
  const [id, version] = splitRange(signal.type);
  const base = { id: signal.id, producer: signal.producer, subject: signal.subject, time: signal.time, observed: signal.observed, rating: signal.rating };
  const out: View[] = [{ ...base, type: id, version, part: null, props: signal.props }];
  const walk = (type: SignalType | undefined, props: Readonly<Record<string, unknown>>, prefix: string, depth: number) => {
    if (!type || depth > 4) return;
    for (const c of type.composes ?? []) {
      const sub = props[c.at];
      if (sub === null || typeof sub !== "object" || Array.isArray(sub)) continue;
      const [pid, prange] = splitRange(c.type);
      const pt = resolveType(types, pid, prange);
      if (!pt) continue;
      const at = prefix ? `${prefix}.${c.at}` : c.at;
      out.push({ ...base, type: pid, version: majorMinor(pt.version), part: at, props: sub as Record<string, unknown> });
      walk(pt, sub as Record<string, unknown>, at, depth + 1);
    }
  };
  walk(resolveType(types, id, version), signal.props, "", 1);
  return out;
}

/** One field of a view by its path: an envelope field, rating.reliability, or props and a dotted path inside them. */
export function read(view: View, path: string): unknown {
  let node: unknown = view;
  for (const key of path.split(".")) {
    if (node === null || typeof node !== "object" || Array.isArray(node)) return undefined;
    node = (node as Record<string, unknown>)[key];
  }
  return node;
}

// ---- Receive: salient or noise for one view at one listener ----

/** Whether a listener is an edge listener: it proposes or revalidates, and may judge age against now. */
export const isEdge = (l: Listener) => l.then !== "project";
/** Whether a listener hears a view: the view's type is the listener's type and its version is in the range. */
export const hears = (l: Listener, v: View) => { const [id, range] = splitRange(l.hears); return v.type === id && satisfies(v.version, range); };

/** A duration in milliseconds: seconds as a number, or a number and s, m, h, d or w. */
export function durationMs(d: number | string): number {
  if (typeof d === "number") return d * 1000;
  const m = /^(\d+)(s|m|h|d|w)$/.exec(d);
  if (!m) throw new Error(`not a duration: ${d}`);
  return Number(m[1]) * { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7, w: 6.048e8 }[m[2] as "s" | "m" | "h" | "d" | "w"];
}

const timeMs = (t: string) => Date.parse(t.length === 10 ? `${t}T00:00:00Z` : t);
const same = (a: unknown, b: unknown) => canonicalJson(a) === canonicalJson(b);
const show = (x: unknown) => (x === undefined ? "missing" : JSON.stringify(x));

/** An operand's value and the fact it read, if any. */
function operand(p: ListenerPredicate, facts: Facts): { value?: unknown; fact?: string; missing?: string } {
  const o = p.value;
  if (o !== null && typeof o === "object" && !Array.isArray(o)) {
    if ("read" in o) {
      const ref = o.read;
      return facts.read && ref in facts.read ? { value: facts.read[ref], fact: ref } : { fact: ref, missing: `the fact ${ref} was not given` };
    }
    return { value: facts.ids?.[o.ids] ?? [], fact: `ids:${o.ids}` };
  }
  return { value: o };
}

/** Why a predicate fails on a view, or null when it holds. */
function failing(p: ListenerPredicate, v: View, value: unknown): string | null {
  const field = read(v, p.field);
  if (p.op === "exists") return field === undefined || field === null ? `${p.field} is missing` : null;
  if (field === undefined) return `${p.field} is missing`;
  switch (p.op) {
    case "eq": return same(field, value) ? null : `${p.field} is ${show(field)}, not ${show(value)}`;
    case "ne": return same(field, value) ? `${p.field} is ${show(value)}` : null;
    case "lt": case "lte": case "gt": case "gte": {
      const comparable = (typeof field === "number" && typeof value === "number") || (typeof field === "string" && typeof value === "string");
      if (!comparable) return `${p.field} (${show(field)}) cannot be compared with ${show(value)}`;
      const f = field as number | string, x = value as number | string;
      const ok = p.op === "lt" ? f < x : p.op === "lte" ? f <= x : p.op === "gt" ? f > x : f >= x;
      return ok ? null : `${p.field} is ${show(field)}, not ${p.op} ${show(value)}`;
    }
    case "in": case "not-in": {
      if (!Array.isArray(value)) return `${show(value)} is not a list`;
      const found = value.some((x) => same(x, field));
      return found === (p.op === "in") ? null : `${p.field} (${show(field)}) is ${p.op === "in" ? "not in" : "in"} ${show(value)}`;
    }
    case "contains": {
      const ok = Array.isArray(field) ? field.some((x) => same(x, value)) : typeof field === "string" && typeof value === "string" && field.includes(value);
      return ok ? null : `${p.field} (${show(field)}) does not contain ${show(value)}`;
    }
  }
  return `unknown op ${String(p.op)}`;
}

/**
 * One view at one listener: salient when it passes every part of the criterion, else noise with every failure.
 * Checked in order: the rating bounds, the producer prefixes, the age (edge listeners only, against `now`, with the
 * listener's max_age or else the type's freshness.max_age), then every predicate. A level listener never reads `now`.
 * Every fact a predicate read is listed on a salient reception, for the write's derived_from.
 */
export function receive(view: View, listener: Listener, facts: Facts, now?: string, type?: SignalType): Reception {
  const failed: Failure[] = [];
  const read: string[] = [];
  const c = listener.criterion ?? {};
  if (c.rating) {
    const r = view.rating;
    if (RELIABILITY.indexOf(r.reliability) > RELIABILITY.indexOf(c.rating.reliability)) failed.push({ predicate: "rating", why: `reliability ${r.reliability} is past ${c.rating.reliability}` });
    if (r.credibility > c.rating.credibility) failed.push({ predicate: "rating", why: `credibility ${r.credibility} is past ${c.rating.credibility}` });
  }
  if (c.producers && !c.producers.some((p) => view.producer.startsWith(p))) failed.push({ predicate: "producers", why: `${view.producer} is not from ${c.producers.join(", ")}` });
  if (isEdge(listener)) {
    const max = listener.max_age ?? type?.freshness?.max_age;
    if (max !== undefined) {
      if (now === undefined) throw new Error(`edge listener ${listener.id} needs now to judge age`);
      const age = Date.parse(now) - timeMs(view.time);
      if (age > durationMs(max)) failed.push({ predicate: "max_age", why: `${view.time} is older than ${String(max)} at ${now}` });
    }
  }
  for (const p of c.predicates ?? []) {
    const o = operand(p, facts);
    if (o.fact) read.push(o.fact);
    const why = o.missing ?? failing(p, view, o.value);
    if (why) failed.push({ predicate: p.id, why });
  }
  return failed.length ? { kind: "noise", listener: listener.id, view, failed } : { kind: "salient", listener: listener.id, view, facts: [...new Set(read)].sort() };
}

// ---- Withdrawal ----

export type Withdrawal = { readonly withdrawn: Map<string, string>; readonly refused: { readonly signal: string; readonly target: string; readonly why: string }[] };

/**
 * Which signals stand. A signal that retracts or supersedes another withdraws it when it comes from the same producer,
 * or from a person in the venture's local library (library `local`); any other is refused and withdraws nothing. A
 * withdrawing signal that is itself withdrawn withdraws nothing, so retracting a retraction restores the signal.
 * Returns each withdrawn address with the address that withdrew it.
 */
export function withdraw(signals: readonly Received[]): Withdrawal {
  const byId = new Map(signals.map((r) => [r.signal.id, r]));
  const refused: Withdrawal["refused"] = [];
  const valid = new Map<string, string[]>(); // target -> withdrawers allowed to withdraw it
  for (const r of signals) {
    const target = r.signal.retracts ?? r.signal.supersedes;
    if (!target) continue;
    const t = byId.get(target);
    if (t && t.signal.producer !== r.signal.producer && r.library !== "local") {
      refused.push({ signal: r.signal.id, target, why: `${r.signal.producer} may not withdraw a signal of ${t.signal.producer}; only the same producer or a person in the local library may` });
      continue;
    }
    valid.set(target, [...(valid.get(target) ?? []), r.signal.id]);
  }
  const memo = new Map<string, string | null>();
  const visiting = new Set<string>();
  const by = (id: string): string | null => {
    if (memo.has(id)) return memo.get(id) ?? null;
    if (visiting.has(id)) return null;
    visiting.add(id);
    const w = (valid.get(id) ?? []).sort().find((x) => by(x) === null) ?? null;
    visiting.delete(id);
    memo.set(id, w);
    return w;
  };
  const withdrawn = new Map<string, string>();
  for (const r of signals) { const w = by(r.signal.id); if (w) withdrawn.set(r.signal.id, w); }
  return { withdrawn, refused };
}

// ---- The fold ----

/** One view's part in one field: the value it folds, the fold, and whether its signal still stands. */
export type Contribution = { readonly view: View; readonly fold: SignalTypeFold; readonly standing: boolean };

/** (time, id) order, of signals or views. */
export const timeThenId = (a: { time: string; id: string }, b: { time: string; id: string }) => (a.time < b.time ? -1 : a.time > b.time ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const byTimeThenId = (a: { view: View }, b: { view: View }) => timeThenId(a.view, b.view);
const compare = (a: unknown, b: unknown) => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === typeof b && typeof a === "string") return (a as string) < (b as string) ? -1 : (a as string) > (b as string) ? 1 : 0;
  const [x, y] = [canonicalJson(a), canonicalJson(b)];
  return typeof a === "number" ? -1 : typeof b === "number" ? 1 : x < y ? -1 : x > y ? 1 : 0;
};

/**
 * One field from its contributions, in (time, id) order. set, first, max, min and union read standing signals only.
 * append lists one entry per unique_by key over every signal, so an entry whose signals are all withdrawn stays,
 * marked withdrawn: its value comes from the earliest standing signal with that key (else the earliest), it names
 * that signal, and support says supported or withdrawn. An object value is spread into the entry; any other value
 * sits at value. Returns undefined when nothing folds.
 */
export function fold(reducer: SignalTypeFold["reducer"], contributions: readonly Contribution[]): unknown {
  const all = [...contributions].sort(byTimeThenId).map((c) => ({ ...c, value: read(c.view, c.fold.value) })).filter((c) => c.value !== undefined);
  const standing = all.filter((c) => c.standing);
  switch (reducer) {
    case "set": return standing.at(-1)?.value;
    case "first": return standing[0]?.value;
    case "max": return standing.length ? standing.map((c) => c.value).reduce((a, b) => (compare(b, a) > 0 ? b : a)) : undefined;
    case "min": return standing.length ? standing.map((c) => c.value).reduce((a, b) => (compare(b, a) < 0 ? b : a)) : undefined;
    case "union": {
      if (!standing.length) return undefined;
      const seen = new Map<string, unknown>();
      for (const c of standing) for (const v of Array.isArray(c.value) ? c.value : [c.value]) seen.set(canonicalJson(v), v);
      return [...seen.values()].sort(compare);
    }
    case "append": {
      if (!all.length) return undefined;
      const groups = new Map<string, typeof all>();
      for (const c of all) {
        const key = canonicalJson((c.fold.unique_by ?? []).map((p) => read(c.view, p)));
        groups.set(key, [...(groups.get(key) ?? []), c]);
      }
      const entries = [...groups.values()].map((g) => {
        const chosen = g.find((c) => c.standing) ?? g[0];
        return { chosen, support: g.some((c) => c.standing) ? "supported" : "withdrawn" };
      }).sort((a, b) => byTimeThenId(a.chosen, b.chosen));
      return entries.map(({ chosen, support }) => {
        const v = chosen.value;
        const body = v !== null && typeof v === "object" && !Array.isArray(v) ? { ...(v as Record<string, unknown>) } : { value: v };
        return { ...body, signal: chosen.view.id, support };
      });
    }
  }
}

// ---- Render ----

export type Rendered = {
  /** The record route with [id] filled: competitors/acme-robotics/signals. */
  readonly route: string;
  readonly record: Record<string, unknown>;
  /** Created once when missing and never written again. */
  readonly once: boolean;
  /** Every signal address folded into it, sorted: the write's derived_from. */
  readonly cites: string[];
  /** Every fact the salient receptions read, sorted: also derived_from. */
  readonly facts: string[];
};
export type Proposal = { readonly id: string; readonly listener: string; readonly consumer: { decision: string } | { frame: string } | { route: string }; readonly view: View; readonly facts: string[] };
export type Mark = { readonly route: string; readonly listener: string; readonly view: View; readonly facts: string[] };
export type RenderInput = {
  readonly signals: readonly Received[];
  readonly types: readonly SignalType[];
  readonly listeners: readonly Listener[];
  readonly facts?: Facts;
  /** Read only by edge listeners. */
  readonly now?: string;
  readonly maxRounds?: number;
};
export type RenderResult =
  | { readonly status: "rendered"; readonly rounds: number; readonly records: Rendered[]; readonly receptions: Reception[]; readonly proposals: Proposal[]; readonly marks: Mark[]; readonly withdrawal: Withdrawal; readonly problems: string[] }
  | { readonly status: "raised"; readonly rounds: number; readonly why: string; readonly receptions: Reception[]; readonly withdrawal: Withdrawal; readonly problems: string[] };

/** A route pattern with [id] filled by a subject. */
export const fill = (route: string, subject: string) => route.replaceAll("[id]", subject);

/** The collection and id a route names: competitors/acme-robotics/signals is in competitors, id acme-robotics. */
const idOf = (route: string): [string, string] | null => { const [c, id] = route.split("/"); return c && id ? [c, id] : null; };

/** Every route's records from the salient views of the level listeners, given the ids each collection holds. */
function renderRound(views: readonly { view: View; standing: boolean }[], input: RenderInput, ids: Record<string, string[]>) {
  const facts: Facts = { read: input.facts?.read, ids };
  const receptions: Reception[] = [];
  const problems: string[] = [];
  type Slot = { projection: SignalTypeProjection; subject: string; fields: Map<string, Contribution[]>; cites: Set<string>; facts: Set<string> };
  const slots = new Map<string, Slot>();
  for (const l of input.listeners.filter((x) => !isEdge(x))) {
    const route = l.consumer && "route" in l.consumer ? l.consumer.route : undefined;
    for (const { view, standing } of views.filter((x) => hears(l, x.view))) {
      const type = typeOfView(input.types, view);
      const rec = receive(view, l, facts, undefined, type);
      receptions.push(rec);
      if (rec.kind !== "salient") continue;
      const projection = type?.projects.find((p) => p.route === route);
      if (!route || !projection) { problems.push(`listener ${l.id}: ${view.type}@${view.version} has no projection to ${route ?? "(no route)"}`); continue; }
      const at = fill(route, view.subject);
      const slot = slots.get(at) ?? { projection, subject: view.subject, fields: new Map<string, Contribution[]>(), cites: new Set<string>(), facts: new Set<string>() };
      if (slot.projection !== projection && Boolean(slot.projection.once) !== Boolean(projection.once)) problems.push(`${at}: one projection writes it once and another folds into it`);
      for (const [field, f] of Object.entries(projection.fields)) slot.fields.set(field, [...(slot.fields.get(field) ?? []), { view, fold: f, standing }]);
      slot.cites.add(view.id);
      for (const x of rec.facts) slot.facts.add(x);
      slots.set(at, slot);
    }
  }
  const records: Rendered[] = [];
  for (const [route, s] of [...slots].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const record: Record<string, unknown> = s.projection.subject_field ? { [s.projection.subject_field]: s.subject } : {};
    for (const [field, cs] of s.fields) {
      const reducers = new Set(cs.map((c) => c.fold.reducer));
      if (reducers.size > 1) { problems.push(`${route}.${field}: folded by ${[...reducers].join(" and ")}; one field takes one reducer`); continue; }
      const v = fold(cs[0].fold.reducer, cs);
      if (v !== undefined) record[field] = v;
    }
    records.push({ route, record, once: Boolean(s.projection.once), cites: [...s.cites].sort(), facts: [...s.facts].sort() });
  }
  return { records, receptions, problems };
}

/**
 * Renders records from signals, deterministically. Withdrawn signals are taken out (append keeps their entries as
 * withdrawn). Level listeners are evaluated and their salient views folded into records; the ids each collection
 * holds (the given ids plus every rendered route) feed the next round, until the rendered routes stop changing. A
 * level predicate on projected ids is monotone, so this converges; if the routes still change after maxRounds (five)
 * rounds the render is raised, for a person to decide. Then each edge listener is evaluated once over the standing
 * views: propose gives a proposal (the decision id, a hyphen and the subject; a frame's id likewise), revalidate a
 * stale mark on the consumer route.
 */
export function render(given: RenderInput): RenderResult {
  // Signals in (time, id) order, so the result never depends on the order they arrived in.
  const input = { ...given, signals: [...given.signals].sort((a, b) => timeThenId(a.signal, b.signal)) };
  const withdrawal = withdraw(input.signals);
  const views = input.signals.flatMap((r) => viewsOf(r.signal, input.types).map((view) => ({ view, standing: !withdrawal.withdrawn.has(r.signal.id) })));
  const ids = input.facts?.ids ?? {};
  const max = input.maxRounds ?? 5;
  let previous: string | null = null;
  let round = renderRound(views, input, idsWith(ids, []));
  for (let n = 1; ; n++) {
    const routes = canonicalJson(round.records.map((r) => r.route));
    if (routes === previous) {
      const facts: Facts = { read: input.facts?.read, ids: idsWith(ids, round.records) };
      const edge: Reception[] = [];
      const proposals: Proposal[] = [];
      const marks: Mark[] = [];
      for (const l of input.listeners.filter(isEdge)) {
        for (const { view } of views.filter((x) => x.standing && hears(l, x.view))) {
          const rec = receive(view, l, facts, input.now, typeOfView(input.types, view));
          edge.push(rec);
          if (rec.kind !== "salient" || !l.consumer) continue;
          if (l.then === "propose") {
            const name = "decision" in l.consumer ? l.consumer.decision : "frame" in l.consumer ? l.consumer.frame : fill(l.consumer.route, view.subject).replaceAll("/", "-");
            proposals.push({ id: `${name}-${view.subject}`, listener: l.id, consumer: l.consumer, view, facts: rec.facts });
          } else if ("route" in l.consumer) marks.push({ route: fill(l.consumer.route, view.subject), listener: l.id, view, facts: rec.facts });
          else if ("frame" in l.consumer) marks.push({ route: `frames/${l.consumer.frame}`, listener: l.id, view, facts: rec.facts });
        }
      }
      return { status: "rendered", rounds: n, records: round.records, receptions: [...round.receptions, ...edge], proposals: dedupe(proposals, (p) => p.id), marks: dedupe(marks, (m) => `${m.route} ${m.listener}`), withdrawal, problems: [...new Set(round.problems)] };
    }
    if (n >= max) return { status: "raised", rounds: n, why: `the rendered records still changed after ${max} rounds; a criterion on projected ids is not monotone`, receptions: round.receptions, withdrawal, problems: [...new Set(round.problems)] };
    previous = routes;
    round = renderRound(views, input, idsWith(ids, round.records));
  }
}

const idsWith = (given: Readonly<Record<string, readonly string[]>>, records: readonly Rendered[]) => {
  const out: Record<string, string[]> = Object.fromEntries(Object.entries(given).map(([k, v]) => [k, [...v]]));
  for (const r of records) { const at = idOf(r.route); if (at) out[at[0]] = [...new Set([...(out[at[0]] ?? []), at[1]])].sort(); }
  return out;
};
/** The first of each key in (time, id) order, so a decision two signals raise is proposed once. */
function dedupe<T extends { view: View }>(xs: T[], key: (_item: T) => string): T[] {
  const seen = new Map<string, T>();
  for (const x of [...xs].sort(byTimeThenId)) if (!seen.has(key(x))) seen.set(key(x), x);
  return [...seen.values()];
}

// ---- Diff ----

export type Change = { readonly route: string; readonly kind: "new" | "changed" | "unchanged" | "kept"; readonly record: Record<string, unknown>; readonly before?: unknown; readonly cites: string[]; readonly facts: string[] };

/**
 * Each rendered record against the venture's current one. new: there is none. changed: it differs (canonical JSON).
 * unchanged: the same, so it is verified, not rewritten. kept: a record a projection writes once already exists and is
 * a person's, so it is never written again whatever it holds. Proposals whose id already exists are left out. A
 * diff taken after its own commit is all unchanged and kept.
 */
export function diff(rendered: readonly Rendered[], current: Readonly<Record<string, unknown>>, proposals: readonly Proposal[] = [], existing: ReadonlySet<string> = new Set()) {
  const changes: Change[] = rendered.map((r) => {
    const before = current[r.route];
    const base = { route: r.route, record: r.record, cites: r.cites, facts: r.facts };
    if (before === undefined) return { ...base, kind: "new" as const };
    if (r.once) return { ...base, kind: "kept" as const, before };
    return { ...base, kind: same(before, r.record) ? "unchanged" as const : "changed" as const, before };
  });
  return { changes, proposals: proposals.filter((p) => !existing.has(p.id)) };
}

// ---- Worked cases ----

/** The envelope a case leaves out, filled the same way every time, so a case's signals have fixed addresses. */
export function caseSignal(type: SignalType, given: SignalTypeCase["given"][number]): Signal {
  const [major, minor] = parse(type.version);
  const g = given as Record<string, unknown> & { subject: string; time: string; props: Record<string, unknown> };
  const body: Record<string, unknown> = {
    type: `${type.id}@${major}.${minor}`, producer: "case/producer", observed: g.time.length === 10 ? `${g.time}T00:00:00Z` : g.time,
    rating: { reliability: "A", credibility: 1 }, cites: [], ...g,
  };
  delete body.id;
  return { ...body, id: signalId(body) } as Signal;
}

/** A worked case, rendered by the type's own projections: one project listener per projection, hearing the type's
 *  major with no criterion. */
export function renderCase(type: SignalType, types: readonly SignalType[], c: SignalTypeCase): { signals: Signal[]; result: RenderResult } {
  const signals = c.given.map((g) => caseSignal(type, g));
  const major = parse(type.version)[0];
  const listeners: Listener[] = type.projects.map((p, i) => ({ id: `case-${i}`, hears: `${type.id}@^${major}`, consumer: { route: p.route }, then: "project" }));
  const all = types.some((t) => t.id === type.id && t.version === type.version) ? types : [...types, type];
  return { signals, result: render({ signals: signals.map((signal) => ({ signal, library: "case" })), types: all, listeners }) };
}
