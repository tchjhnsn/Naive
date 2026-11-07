// The signal engine, the front door of the private render beside it (signal library design, build item 5;
// everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md, "Where listeners come from", "Derivation,
// deterministic and replayable" and "Freshness and retraction"). It reads and decides; it writes nothing. The pull
// that commits what it decides runs at router level (packages/naive/src/router/orchestration/signals.ts), because
// only router code may act as the signal projector.
//
//   libraries(dir)                       the libraries a venture reads: its local raw/signals/, each source with
//                                        carries signals (one that is not a folder needs confirmed_by first), and
//                                        Naive's packages as the implicit library naive (types only)
//   typesIn(lib), mergeTypes(sets)       the signal types each library holds, merged
//   listenersOf(dir)                     listeners merged from packages, frames (listens) and naive.config.json,
//                                        less listeners_off
//   heardTypes(listeners, types)         the type ids a pull reads: what the listeners hear and every composite of it
//   newLines(lib, types, seen)           the log lines a library published after the cursor
//   signalsOf(lib, types, subjects)      the signals of those types about those subjects, each checked
//   touched(...)                         the subjects a pull renders again, from new signals and the provenance log
//   buildSignal(type, input)             a signal a person emits, with its address computed
//   explain(signal, ...)                 salient or noise at every listener, and why
//
// Nothing here calls a model, the network beyond a library's own connector, or a clock: `now` is an argument.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { canonicalJson, idHolds, signalId } from "../core/signal-id.ts";
import { ventureFile } from "../core/venture-paths.mjs";
import { globRegExp } from "../records/index.mjs";
import { routes } from "../records/routes/routes.mjs";
import { Validator, registryOf, validateValue } from "../records/validate.mjs";
import { address, safePath } from "../store/connectors/contract.mjs";
import { LOCAL, connect, sourcesOf } from "../store/connectors/index.mjs";
import { frames } from "./frames.mjs";
import { namedPerson, packageDefs, readConfig } from "./naive-config.mjs";
import { hears, isEdge, receive, resolveType, satisfies, splitRange, typeOfView, viewsOf, withdraw } from "./signals/render.ts";
import type { Facts, Received, Reception, View } from "./signals/render.ts";
import type { Listener, ListenerPredicate, Signal, SignalType } from "../records/types/records.d.ts";

export { diff, fill, render, withdraw } from "./signals/render.ts";
export type { Change, Facts, Mark, Proposal, Received, Reception, RenderInput, RenderResult, Rendered, View } from "./signals/render.ts";

const repo = new URL("../../../../", import.meta.url).pathname;

/** The local library's id: a signal from it may withdraw any other (a person in the venture's own library). */
export const LOCAL_LIBRARY = "local";
/** Where the local library sits in a venture. */
export const LOCAL_ROOT = "raw/signals";
/** Naive's packages, as a library of open types. */
export const NAIVE_LIBRARY = "naive";
/** The pull's cursor: per library, the lines of each log file it has read, and the provenance line it has seen. */
export const CURSOR = ".naive/signals.json";
/** The signal projector's agent, as provenance and freshness name it. */
export const PROJECTOR_AGENT = Object.freeze({ kind: "agent", id: "projector", via: "router" });

// ---- Libraries ----

type Item = { path: string };
type Store = { list(_prefix?: string): Promise<Item[]>; read(_path: string): Promise<{ content: string } | null> };
type Source = { id: string; connector: string; carries?: string; root?: string; confirmed_by?: { person?: string; at?: string }; [k: string]: unknown };

export type Library = {
  readonly id: string;
  readonly kind: "local" | "source" | "naive";
  /** Its store, or null when it is not read (its problem says why). Naive's library is read from the repository. */
  readonly store: Store | null;
  /** The library root inside the store: raw/signals/ for the local library, empty for a source. */
  readonly prefix: string;
  /** The source id an address names: venture for the local library. */
  readonly sourceId: string;
  readonly problem?: string;
};

/** A signal as a pull holds it: where it came from, and its address for derived_from. */
export type Pulled = Received & { readonly address: string; readonly path: string };

/**
 * The libraries a venture reads, in order: the local library (raw/signals/), each source in knowledge/sources.json
 * with carries signals, and Naive's packages (types only). A source whose connector is not the filesystem is read
 * only once a person confirmed it by name (confirmed_by), because reading it tells its publisher which signal types
 * the venture hears; until then it is listed with its problem and never connected.
 */
export async function libraries(dir: string): Promise<Library[]> {
  const map = sourcesOf(dir) as { sources: Source[] };
  const venture = map.sources.find((s) => s.id === LOCAL) as Source;
  const out: Library[] = [{ id: LOCAL_LIBRARY, kind: "local", store: await connect(venture, dir) as Store, prefix: `${LOCAL_ROOT}/`, sourceId: LOCAL }];
  for (const s of map.sources.filter((x) => x.carries === "signals")) {
    if (s.connector !== "filesystem" && !namedPerson(s.confirmed_by)) {
      out.push({ id: s.id, kind: "source", store: null, prefix: "", sourceId: s.id,
        problem: `${s.id} is not read: reading a ${s.connector} library tells its publisher which signal types this venture hears, so a person confirms it by name first (confirmed_by: { person, at } on the source in knowledge/sources.json)` });
      continue;
    }
    try { out.push({ id: s.id, kind: "source", store: await connect(s, dir) as Store, prefix: "", sourceId: s.id }); }
    catch (e) { out.push({ id: s.id, kind: "source", store: null, prefix: "", sourceId: s.id, problem: `${s.id} is not read: ${e instanceof Error ? e.message : String(e)}` }); }
  }
  out.push({ id: NAIVE_LIBRARY, kind: "naive", store: null, prefix: "", sourceId: NAIVE_LIBRARY });
  return out;
}

/** A signal's address in a library, for derived_from: venture://raw/signals/signals/... for the local library. */
export const addressOf = (lib: Library, path: string) => address(lib.sourceId, `${lib.prefix}${path}`);

async function listIn(lib: Library, sub: string): Promise<string[]> {
  if (!lib.store) return [];
  const items = await lib.store.list(`${lib.prefix}${sub}`.replace(/\/$/, ""));
  return items.map((x) => x.path.slice(lib.prefix.length)).filter((p) => p.startsWith(sub)).sort();
}
async function readIn(lib: Library, path: string): Promise<string | null> {
  if (!lib.store) return null;
  return (await lib.store.read(`${lib.prefix}${path}`))?.content ?? null;
}
const parseJson = (text: string): unknown => JSON.parse(text);

// ---- Types ----

export type Typed = SignalType & { readonly library: string };
const TYPE_FILE = /^types\/([a-z][a-z0-9-]*)\/(\d+\.\d+\.\d+)\.signal\.json$/;

/** The signal types a library holds, each checked against its file name and its schema. Naive's library is every
 *  package's signals/types/; the local library holds signals only. */
export async function typesIn(lib: Library): Promise<{ types: Typed[]; problems: string[] }> {
  const types: Typed[] = [];
  const problems: string[] = [];
  const take = (file: string, text: string) => {
    const m = TYPE_FILE.exec(file.replace(/^.*?(types\/)/, "$1"));
    let t: unknown;
    try { t = parseJson(text); } catch { problems.push(`${lib.id}: ${file} is not JSON`); return; }
    const v = validateValue("signal-type.schema.json", t);
    if (v.status !== 0) { problems.push(`${lib.id}: ${file} does not match signal-type.schema.json: ${v.stdout.trim().split("\n")[0]}`); return; }
    const st = t as SignalType;
    if (!m || m[1] !== st.id || m[2] !== st.version) { problems.push(`${lib.id}: ${file} holds ${st.id}@${st.version}; a type sits at types/<id>/<version>.signal.json`); return; }
    types.push({ ...st, library: lib.id });
  };
  if (lib.kind === "naive") {
    const root = join(repo, "packages/naive/library/packages");
    for (const pkg of existsSync(root) ? readdirSync(root).sort() : []) {
      const dir = join(root, pkg, "signals/types");
      if (!existsSync(dir)) continue;
      for (const id of readdirSync(dir).sort()) {
        if (!statSync(join(dir, id)).isDirectory()) continue;
        for (const f of readdirSync(join(dir, id)).filter((x) => x.endsWith(".signal.json")).sort()) take(`packages/naive/library/packages/${pkg}/signals/types/${id}/${f}`, readFileSync(join(dir, id, f), "utf8"));
      }
    }
  } else if (lib.kind === "source") {
    for (const f of (await listIn(lib, "types/")).filter((x) => x.endsWith(".signal.json"))) take(f, (await readIn(lib, f)) ?? "");
  }
  return { types, problems };
}

/** Types from several libraries, first one wins for an id and version; a second that differs is a problem. */
export function mergeTypes(sets: readonly (readonly Typed[])[]): { types: Typed[]; problems: string[] } {
  const seen = new Map<string, Typed>();
  const problems: string[] = [];
  for (const t of sets.flat()) {
    const key = `${t.id}@${t.version}`;
    const had = seen.get(key);
    if (!had) { seen.set(key, t); continue; }
    const strip = (x: Typed) => Object.fromEntries(Object.entries(x).filter(([k]) => k !== "library"));
    if (canonicalJson(strip(had)) !== canonicalJson(strip(t))) problems.push(`${key} differs between the libraries ${had.library} and ${t.library}; ${had.library}'s is used`);
  }
  return { types: [...seen.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : a.version < b.version ? -1 : 1)), problems };
}

/** The newest type with this id in a range (or any range), as emit picks one. */
export function newest(types: readonly SignalType[], id: string, range?: string): SignalType | undefined {
  const ok = types.filter((t) => t.id === id && (!range || satisfies(t.version, range)));
  const n = (v: string) => v.split(".").map(Number);
  return ok.sort((a, b) => { const x = n(a.version), y = n(b.version); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; }).at(-1);
}

// ---- Listeners ----

export type Merged = Listener & { readonly from: string };
type WithListeners = { name?: string; folder?: string; listeners?: Listener[] };
type FrameWithListens = { id: string; listens?: Listener[] };

/**
 * The venture's listeners, merged like triggers: each installed package's listeners, then each frame's listens (the
 * frame is the consumer), then naive.config.json listeners, where a same id replaces any other. listeners_off turns
 * one off. Kits' listeners are build item 13 (not built).
 */
export function listenersOf(dir: string): { listeners: Merged[]; problems: string[] } {
  const cfg = readConfig(dir) as { listeners?: Listener[]; listeners_off?: string[] };
  const problems: string[] = [];
  const byId = new Map<string, Merged>();
  const add = (l: Listener, from: string, replace = false) => {
    const had = byId.get(l.id);
    if (had && !replace) { problems.push(`listener ${l.id} comes from ${had.from} and ${from}; ${had.from}'s is used`); return; }
    byId.set(l.id, { ...l, from });
  };
  for (const p of packageDefs() as WithListeners[]) for (const l of p.listeners ?? []) add(l, `package ${p.name ?? p.folder}`);
  for (const f of frames() as FrameWithListens[]) for (const l of f.listens ?? []) add({ ...l, consumer: { frame: f.id } }, `frame ${f.id}`);
  for (const l of cfg.listeners ?? []) add(l, "naive.config.json", true);
  const off = new Set(cfg.listeners_off ?? []);
  for (const id of off) if (!byId.has(id)) problems.push(`listeners_off names ${id}, which no package, frame or naive.config.json defines`);
  return { listeners: [...byId.values()].filter((l) => !off.has(l.id)).sort((a, b) => (a.id < b.id ? -1 : 1)), problems };
}

/** The type ids a pull reads: every id a listener hears, and every type that composes one of them, transitively. */
export function heardTypes(listeners: readonly Listener[], types: readonly SignalType[]): string[] {
  const ids = new Set(listeners.map((l) => splitRange(l.hears)[0]));
  for (let grew = true; grew;) {
    grew = false;
    for (const t of types) if (!ids.has(t.id) && (t.composes ?? []).some((c) => ids.has(splitRange(c.type)[0]))) { ids.add(t.id); grew = true; }
  }
  return [...ids].sort();
}

const operands = (listeners: readonly Listener[]) => listeners.flatMap((l) => (l.criterion?.predicates ?? []) as ListenerPredicate[]).map((p) => p.value);
/** The facts the listeners read: file#field references. */
export const factRefs = (listeners: readonly Listener[]) => [...new Set(operands(listeners).flatMap((o) => (o && typeof o === "object" && !Array.isArray(o) && "read" in o ? [o.read] : [])))].sort();
/** The collections whose ids the listeners read. */
export const collectionsOf = (listeners: readonly Listener[]) => [...new Set(operands(listeners).flatMap((o) => (o && typeof o === "object" && !Array.isArray(o) && "ids" in o ? [o.ids] : [])))].sort();
/** The file a fact reference reads: foundation/icp.json#currencies reads foundation/icp.json. */
export const factFile = (ref: string) => ref.split("#")[0];
/** One field of a record, by a dotted path; the whole record when the path is empty. */
export function fieldOf(record: unknown, path: string): unknown {
  let x: unknown = record;
  for (const k of path ? path.split(".") : []) x = x !== null && typeof x === "object" && !Array.isArray(x) ? (x as Record<string, unknown>)[k] : undefined;
  return x;
}

// ---- Logs and signals ----

export type LogLine = { readonly id: string; readonly subject: string; readonly path: string; readonly published: string; readonly file: string };

/** The log lines a library published after the lines `seen` counts, for the given types, and the new counts. A
 *  signal reaches a pull through its library's log. */
export async function newLines(lib: Library, typeIds: readonly string[], seen: Readonly<Record<string, number>>): Promise<{ lines: LogLine[]; counts: Record<string, number>; problems: string[] }> {
  const lines: LogLine[] = [];
  const counts: Record<string, number> = { ...seen };
  const problems: string[] = [];
  if (!lib.store) return { lines, counts, problems };
  for (const t of typeIds) {
    for (const file of (await listIn(lib, `log/${t}/`)).filter((f) => f.endsWith(".jsonl"))) {
      const all = ((await readIn(lib, file)) ?? "").split("\n").filter((l) => l.trim());
      for (const [i, text] of all.entries()) {
        if (i < (seen[file] ?? 0)) continue;
        let line: unknown;
        try { line = parseJson(text); } catch { problems.push(`${lib.id}: ${file} line ${i + 1} is not JSON`); continue; }
        const v = validateValue("signal-log.schema.json", line);
        if (v.status !== 0) { problems.push(`${lib.id}: ${file} line ${i + 1} does not match signal-log.schema.json`); continue; }
        lines.push({ ...(line as Omit<LogLine, "file">), file });
      }
      counts[file] = all.length;
    }
  }
  return { lines, counts, problems };
}

const SIGNAL_FILE = /^signals\/([a-z][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)\/(\d{4}-\d{2}-\d{2})-([0-9a-f]{24})\.json$/;
/** The subject a signal address names: venture://raw/signals/signals/<type>/<subject>/<day>-<id>.json names subject. */
export const subjectOfAddress = (addr: string) => /signals\/[a-z][a-z0-9-]*\/([a-z0-9][a-z0-9-]*)\/\d{4}-\d{2}-\d{2}-[0-9a-f]{24}\.json$/.exec(addr)?.[1] ?? null;

/** One signal file read and checked: JSON, the signal schema, its address holds, it sits where its content says,
 *  and its props match its type's (a retraction carries none to check). */
export async function readSignal(lib: Library, path: string, types: readonly SignalType[]): Promise<{ signal?: Pulled; problem?: string }> {
  const text = await readIn(lib, path);
  if (text === null) return { problem: `${lib.id}: ${path} is missing` };
  let s: unknown;
  try { s = parseJson(text); } catch { return { problem: `${lib.id}: ${path} is not JSON` }; }
  const v = validateValue("signal.schema.json", s);
  if (v.status !== 0) return { problem: `${lib.id}: ${path} does not match signal.schema.json: ${v.stdout.trim().split("\n")[0]}` };
  const sig = s as Signal;
  if (!idHolds(sig)) return { problem: `${lib.id}: ${path} does not hash to its id ${sig.id}; a signal is never edited` };
  const m = SIGNAL_FILE.exec(path);
  const [typeId, version] = sig.type.split("@");
  if (!m || m[1] !== typeId || m[2] !== sig.subject || m[3] !== sig.time.slice(0, 10) || m[4] !== sig.id) return { problem: `${lib.id}: ${path} does not sit at signals/${typeId}/${sig.subject}/${sig.time.slice(0, 10)}-${sig.id}.json` };
  if (!sig.retracts) {
    const type = resolveType(types, typeId, version);
    if (type) { const bad = propsProblem(type, sig.props); if (bad) return { problem: `${lib.id}: ${path}: ${bad}` }; }
  }
  return { signal: { signal: sig, library: lib.id, address: addressOf(lib, path), path } };
}

/** The signals of these types in a library, about these subjects (every subject when null). */
export async function signalsOf(lib: Library, typeIds: readonly string[], subjects: ReadonlySet<string> | null, types: readonly SignalType[]): Promise<{ signals: Pulled[]; problems: string[] }> {
  const signals: Pulled[] = [];
  const problems: string[] = [];
  if (!lib.store) return { signals, problems };
  for (const t of typeIds) {
    const files = subjects ? (await Promise.all([...subjects].sort().map((s) => listIn(lib, `signals/${t}/${s}/`)))).flat() : await listIn(lib, `signals/${t}/`);
    for (const f of files.filter((x) => x.endsWith(".json"))) {
      const r = await readSignal(lib, f, types);
      if (r.signal) signals.push(r.signal); else if (r.problem) problems.push(r.problem);
    }
  }
  return { signals, problems };
}

/** Signals from several libraries, one per address id: the first library's copy wins. */
export function dedupeSignals(sets: readonly (readonly Pulled[])[]): Pulled[] {
  const seen = new Map<string, Pulled>();
  for (const s of sets.flat()) if (!seen.has(s.signal.id)) seen.set(s.signal.id, s);
  return [...seen.values()];
}

/** A signal found by id in any library that has a store. */
export async function findSignal(libs: readonly Library[], id: string, types: readonly SignalType[]): Promise<{ signal?: Pulled; problem?: string }> {
  for (const lib of libs.filter((l) => l.store)) {
    const path = (await listIn(lib, "signals/")).find((p) => p.endsWith(`-${id}.json`));
    if (path) return readSignal(lib, path, types);
  }
  return { problem: `no library this venture reads holds a signal ${id}` };
}

// ---- Touched records ----

export type ProvLine = { readonly entity: string; readonly route?: string; readonly activity: string; readonly agent?: { readonly kind?: string; readonly id?: string }; readonly derived_from?: readonly string[]; readonly hash: string };
const byProjector = (e: ProvLine) => e.agent?.kind === "agent" && e.agent.id === PROJECTOR_AGENT.id;

/**
 * The subjects a pull renders again, and why: a new signal names one; a new signal withdraws one the projector cited;
 * after the cursor, a person or another agent wrote a record in a collection a listener reads the ids of (it may admit
 * signals that were noise), or a fact file a projected record cites. The provenance log answers all of it, so there
 * is no second index. The projector's own lines never touch anything, so a pull after a pull renders nothing.
 */
export function touched({ fresh, log, since, collections, facts }: { fresh: readonly Pulled[]; log: readonly ProvLine[]; since: string | null; collections: readonly string[]; facts: readonly string[] }): Map<string, string[]> {
  const why = new Map<string, string[]>();
  const touch = (subject: string | null, reason: string) => { if (subject) why.set(subject, [...(why.get(subject) ?? []), reason]); };
  const projected = log.filter(byProjector);
  for (const s of fresh) {
    touch(s.signal.subject, `new signal ${s.signal.id}`);
    const target = s.signal.retracts ?? s.signal.supersedes;
    if (!target) continue;
    for (const e of projected) for (const a of e.derived_from ?? []) if (a.endsWith(`-${target}.json`)) touch(subjectOfAddress(a), `${s.signal.id} withdraws ${target}`);
  }
  const at = since ? log.findIndex((e) => e.hash === since) : -1;
  const after = log.slice(at + 1).filter((e) => !byProjector(e));
  for (const e of after) {
    for (const c of collections) {
      const m = new RegExp(`^${c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/([a-z0-9][a-z0-9-]*)(?:\\.json$|/)`).exec(e.entity);
      if (m) touch(m[1], `${e.entity} was written`);
    }
    if (facts.includes(e.entity)) for (const p of projected) if ((p.derived_from ?? []).includes(e.entity)) for (const a of p.derived_from ?? []) touch(subjectOfAddress(a), `the fact ${e.entity} changed`);
  }
  for (const [k, v] of why) why.set(k, [...new Set(v)]);
  return new Map([...why].sort(([a], [b]) => (a < b ? -1 : 1)));
}

/** The subjects the projector's writes cite, from the provenance log: what replay renders again. */
export const projectedSubjects = (log: readonly ProvLine[]) => [...new Set(log.filter(byProjector).flatMap((e) => (e.derived_from ?? []).map(subjectOfAddress)).filter((x): x is string => !!x))].sort();

// ---- Records and routes ----

/** The venture file a rendered route names: competitors/acme-robotics/signals is competitors/acme-robotics/signals.json. */
export const recordFile = (route: string) => `${route}.json`;

type RouteRow = { kind: string; route: string; files?: string[]; collection?: string; actions: string[] };
/**
 * The router route that reads and writes a venture file, from the data model's paths: competitors/acme-robotics/
 * signals.json is purpose/competitor-signals/acme-robotics. Null when no record type lives there.
 */
export function routerRoute(file: string): string | null {
  for (const r of (routes() as RouteRow[]).filter((x) => x.kind === "record" && x.collection !== "list" && x.actions.includes("write"))) {
    for (const g of r.files ?? []) {
      const m = globRegExp(g.replace("*", "\u0001")).source.replace("\u0001", "([a-z0-9][a-z0-9-]*)");
      const hit = new RegExp(m).exec(file);
      if (hit) return r.collection === "item" ? r.route.replace("[id]", hit[1]) : r.route;
    }
  }
  return null;
}

/** The ids a collection holds in a venture: competitors/<id>.json and competitors/<id>/... both count. */
export async function idsIn(dir: string, collection: string): Promise<string[]> {
  const venture = (sourcesOf(dir) as { sources: Source[] }).sources.find((s) => s.id === LOCAL) as Source;
  const store = await connect(venture, dir) as Store;
  const ids = (await store.list(safePath(collection))).map((x) => new RegExp(`^${collection}/([a-z0-9][a-z0-9-]*)(?:\\.json$|/)`).exec(x.path)?.[1]).filter((x): x is string => !!x);
  return [...new Set(ids)].sort();
}

// ---- The cursor ----

export type Cursor = { libraries: Record<string, Record<string, number>>; provenance: string | null; pulled_at?: string };
export function readCursor(dir: string): Cursor {
  const f = ventureFile(dir, CURSOR);
  try { const c = parseJson(readFileSync(f, "utf8")) as Cursor; if (c && typeof c.libraries === "object") return c; } catch {}
  return { libraries: {}, provenance: null };
}

// ---- Emitting ----

/** Why props do not match a type's props schema, or null. */
export function propsProblem(type: SignalType, props: unknown): string | null {
  const reg = registryOf() as Map<string, unknown>;
  const key = `${type.id}@${type.version}#props`;
  type Validate = InstanceType<typeof Validator>["validate"];
  const v = new Validator(new Map([...reg, [key, type.props]]) as ConstructorParameters<typeof Validator>[0]);
  const errs = v.validate(JSON.parse(JSON.stringify(props ?? null)) as Parameters<Validate>[0], type.props as Parameters<Validate>[1], key);
  return errs.length ? `props do not match ${type.id}@${type.version}: ${errs.map((e) => `${e.path || "props"} ${e.message}`).join("; ")}` : null;
}

export const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** The subject a signal is about when none is given: a slug of props.name, or of the name in a composed part. */
export function subjectOf(type: SignalType, props: Record<string, unknown>): string | null {
  const names = [props.name, ...(type.composes ?? []).map((c) => fieldOf(props, `${c.at}.name`))];
  const n = names.find((x) => typeof x === "string" && slug(x));
  return typeof n === "string" ? slug(n) : null;
}

export type EmitInput = {
  readonly props: Record<string, unknown>;
  readonly subject?: string;
  readonly time: string;
  readonly observed: string;
  readonly producer: string;
  readonly rating: { reliability: "A" | "B" | "C" | "D" | "E" | "F"; credibility: number };
  readonly cites?: Signal["cites"];
  readonly retracts?: string;
  readonly supersedes?: string;
};

/** A signal from its parts, its address computed, and the file it sits at in a library. A retraction carries the
 *  props given (none by default) unchecked; every other signal's props must match its type. */
export function buildSignal(type: SignalType, input: EmitInput): { ok: true; signal: Signal; path: string } | { ok: false; error: string } {
  if (input.retracts && input.supersedes) return { ok: false, error: "a signal retracts or supersedes one other signal, not both" };
  if (!input.retracts) { const bad = propsProblem(type, input.props); if (bad) return { ok: false, error: bad }; }
  const subject = input.subject ?? subjectOf(type, input.props);
  if (!subject) return { ok: false, error: `name the subject with --subject: ${type.id}'s props hold no name to make one from` };
  const [major, minor] = type.version.split(".");
  const body: Record<string, unknown> = { type: `${type.id}@${major}.${minor}`, producer: input.producer, subject, time: input.time, observed: input.observed, props: input.props, rating: input.rating, cites: input.cites ?? [],
    ...(input.retracts ? { retracts: input.retracts } : {}), ...(input.supersedes ? { supersedes: input.supersedes } : {}) };
  const signal = { id: signalId(body), ...body } as Signal;
  const v = validateValue("signal.schema.json", signal);
  if (v.status !== 0) return { ok: false, error: `does not match signal.schema.json: ${v.stdout.trim()}` };
  return { ok: true, signal, path: `signals/${type.id}/${subject}/${input.time.slice(0, 10)}-${signal.id}.json` };
}

// ---- Explaining ----

export type Explained = {
  readonly listener: string;
  readonly from: string;
  readonly then: Listener["then"];
  readonly consumer: Listener["consumer"] | null;
  readonly view: string;
  readonly kind: "salient" | "noise";
  readonly facts?: string[];
  readonly failed?: { predicate: string; why: string }[];
};

/**
 * What one signal is at every listener: one line per listener and view it hears, salient (with the facts it read)
 * or noise (with every failed predicate), plus the listeners that hear none of its views, and whether a retraction
 * or a supersession withdraws it. Level listeners never read `now`; edge listeners judge age against it.
 */
export function explain(target: Pulled, all: readonly Pulled[], types: readonly SignalType[], listeners: readonly Merged[], facts: Facts, now: string) {
  const views = viewsOf(target.signal, types);
  const withdrawn = withdraw(all).withdrawn.get(target.signal.id) ?? null;
  const lines: Explained[] = [];
  const deaf: string[] = [];
  const name = (v: View) => (v.part ? `${v.part} (${v.type}@${v.version})` : `${v.type}@${v.version}`);
  for (const l of listeners) {
    const heard = views.filter((v) => hears(l, v));
    if (!heard.length) { deaf.push(l.id); continue; }
    for (const v of heard) {
      const r: Reception = receive(v, l, facts, isEdge(l) ? now : undefined, typeOfView(types, v));
      lines.push({ listener: l.id, from: l.from, then: l.then, consumer: l.consumer ?? null, view: name(v), kind: r.kind, ...(r.kind === "salient" ? { facts: r.facts } : { failed: r.failed }) });
    }
  }
  return { signal: target.signal.id, address: target.address, library: target.library, withdrawn_by: withdrawn, lines, deaf };
}
