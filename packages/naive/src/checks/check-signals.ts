// Checks signal libraries, signal types and listeners (signal library design, build item 7; everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md, "Components, the React mapping", "Library layout", "Where listeners come
// from" and "Freshness and retraction"). It runs the render only through the signal engine's front door
// (packages/naive/src/engine/signals.ts) and calls no model.
//
//   node packages/naive/src/checks/check-signals.ts                       Naive's packages and the example library
//   node packages/naive/src/checks/check-signals.ts <dir>... [--json]     a library (library.json), a venture
//                                                                         (venture.json) or a package (signals/types/)
//
// Errors:
//   types     a file that is not JSON, does not match signal-type.schema.json, or does not sit at
//             types/<id>/<version>.signal.json; an id and version twice; a part range no type resolves; a part key
//             twice, or one the props do not declare; parts that compose each other in a cycle; two projections of
//             one type to one route; a projection to a route no record type in the data model lives at; a fold that
//             reads a prop the type does not declare; a field a type
//             claims at a route that one of its parts claims there (a shared part owns the shared field); one field
//             of one route folded by two reducers, or one route written once by one type and folded by another; a
//             worked case that does not render to its expected records.
//   signals   a file that is not JSON, does not match signal.schema.json, does not hash to its id or does not sit
//             where its content says; a type no library resolves; props, or a composed part's props, that do not
//             match their type; a retraction or supersession from another producer (only the same producer, or a
//             person in a venture's local library, may withdraw a signal).
//   log       a line that is not JSON or does not match signal-log.schema.json; a line in a file that is not
//             log/<type>/<yyyy-mm-dd>.jsonl, or published on another day, or naming a file that is not there, or
//             another id, subject or type than that file's; an id listed twice; a signal no line lists, which never
//             reaches a pull.
//   library   a library with types or signals and no library.json, or one that does not match
//             signal-library.schema.json.
//   listeners a range no type resolves; a project listener whose type has no projection to its route; a listener id
//             from two places (packages, frames); listeners_off naming a listener nobody defines.
// The schema already refuses a type with no worked case, unique_by on a reducer other than append and a fold path that
// is not an envelope field or props.
// Warnings: a retraction whose target is in no library checked; types/ in a venture's
// local library, which holds signals only; a signal library a pull will not read until a person confirms it by name;
// a listener that names a venture file no record type lives at (a revalidate route, a fact file, a collection of
// ids), which the pull reports as a problem and skips: a listener is the venture's own setting and may name a record
// its app's data model adds.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { canonicalJson } from "../core/signal-id.ts";
import { ventureFile } from "../core/venture-paths.mjs";
import { routes } from "../records/routes/routes.mjs";
import { validateValue } from "../records/validate.mjs";
import { namedPerson, packageDefs } from "../engine/naive-config.mjs";
import { LOCAL_LIBRARY, LOCAL_ROOT, NAIVE_LIBRARY, fill, listenersOf, propsProblem, readSignal, recordFile, renderCase, resolveType, routerRoute, satisfies, splitRange, viewsOf, withdraw } from "../engine/signals.ts";
import type { Library, Pulled } from "../engine/signals.ts";
import type { Listener, ListenerPredicate, SignalType } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
export const PACKAGES = "packages/naive/library/packages";
export const EXAMPLE_LIBRARY = "packages/naive/src/records/examples/signals/library";

export type Report = { errors: string[]; warnings: string[]; types: number; signals: number; listeners: number; cases: number };
const empty = (): Report => ({ errors: [], warnings: [], types: 0, signals: 0, listeners: 0, cases: 0 });
const add = (a: Report, b: Report): Report => ({ errors: [...a.errors, ...b.errors], warnings: [...a.warnings, ...b.warnings], types: a.types + b.types, signals: a.signals + b.signals, listeners: a.listeners + b.listeners, cases: a.cases + b.cases });

// ---- Files ----

/** Every file under a folder, as paths relative to it, sorted. */
function files(root: string, sub = ""): string[] {
  const d = join(root, sub);
  if (!existsSync(d) || !statSync(d).isDirectory()) return [];
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.name.startsWith(".") ? [] : e.isDirectory() ? files(root, sub ? `${sub}/${e.name}` : e.name) : e.isFile() ? [sub ? `${sub}/${e.name}` : e.name] : [])).sort();
}
/** A library folder as the signal engine reads one. */
function folder(id: string, root: string, kind: Library["kind"] = "source"): Library {
  return { id, kind, prefix: "", sourceId: id, store: {
    async list(prefix = "") { return files(root).filter((p) => !prefix || p === prefix || p.startsWith(`${prefix}/`)).map((path) => ({ path })); },
    async read(p: string) { const f = join(root, p); return existsSync(f) && statSync(f).isFile() ? { content: readFileSync(f, "utf8") } : null; },
  } };
}
const parse = (text: string): { ok: true; value: unknown } | { ok: false } => { try { return { ok: true, value: JSON.parse(text) }; } catch { return { ok: false }; } };
const firstLine = (s: string) => s.trim().split("\n")[0];

// ---- Types ----

export type TypeFile = { readonly file: string; readonly type: SignalType };

/** Signal type files under a folder of types/<id>/<version>.signal.json, each parsed and checked against its schema
 *  and its file name. `label` prefixes every message. */
export function loadTypes(root: string, label: string): { types: TypeFile[]; errors: string[] } {
  const out: TypeFile[] = [];
  const errors: string[] = [];
  for (const f of files(root).filter((x) => x.endsWith(".json"))) {
    const where = `${label}/${f}`;
    const p = parse(readFileSync(join(root, f), "utf8"));
    if (!p.ok) { errors.push(`${where}: not JSON`); continue; }
    const v = validateValue("signal-type.schema.json", p.value);
    if (v.status !== 0) { errors.push(`${where}: does not match signal-type.schema.json: ${firstLine(v.stdout + v.stderr)}`); continue; }
    const t = p.value as SignalType;
    if (f !== `${t.id}/${t.version}.signal.json`) { errors.push(`${where}: holds ${t.id}@${t.version}, so it belongs at types/${t.id}/${t.version}.signal.json`); continue; }
    out.push({ file: where, type: t });
  }
  return { types: out, errors };
}

/** The props a type declares, or null when it declares none (then any path inside props may be read). */
const declared = (t: SignalType): Set<string> | null => {
  const p = (t.props as { properties?: Record<string, unknown> }).properties;
  return p && typeof p === "object" ? new Set(Object.keys(p)) : null;
};
/** Why a view path cannot be read from a type's views, or null. The schema already holds a path to the envelope
 *  fields and props; this checks the first prop is one the type declares. */
function badPath(t: SignalType, path: string): string | null {
  const [head, next] = path.split(".");
  if (head === "props" && next) { const d = declared(t); if (d && !d.has(next)) return `${path}: ${t.id} declares no prop ${next}`; }
  return null;
}

/** An expected entry that leaves signal out matches a rendered entry with any signal, as the worked cases say. */
export function strip(expected: unknown, actual: unknown): unknown {
  if (Array.isArray(expected) && Array.isArray(actual)) return actual.map((a, i) => strip(expected[i], a));
  if (expected && actual && typeof expected === "object" && typeof actual === "object" && !Array.isArray(expected) && !Array.isArray(actual)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(actual)) if (k !== "signal" || "signal" in expected) out[k] = strip((expected as Record<string, unknown>)[k], v);
    return out;
  }
  return actual;
}

/**
 * One set of types, with `also` as further types its parts may resolve to (Naive's packages, for a library that
 * composes open types). Every type of the set is checked, its worked cases rendered through the real render.
 */
export function checkTypes(set: readonly TypeFile[], also: readonly SignalType[] = []): Report {
  const r = empty();
  r.types = set.length;
  const types = set.map((x) => x.type);
  const all = [...types, ...also.filter((a) => !types.some((t) => t.id === a.id && t.version === a.version))];
  const key = (t: SignalType) => `${t.id}@${t.version}`;
  const where = new Map(set.map((x) => [key(x.type), x.file]));
  const seen = new Map<string, string>();
  for (const x of set) {
    const k = key(x.type);
    if (seen.has(k)) r.errors.push(`${x.file}: ${k} is also at ${seen.get(k)}`);
    seen.set(k, x.file);
  }
  const part = (range: string) => { const [id, rg] = splitRange(range); return resolveType(all, id, rg); };
  for (const { file, type: t } of set) {
    // Parts.
    const ats = new Set<string>();
    const d = declared(t);
    for (const c of t.composes ?? []) {
      if (ats.has(c.at)) r.errors.push(`${file}: two parts sit at ${c.at}`);
      ats.add(c.at);
      if (d && !d.has(c.at)) r.errors.push(`${file}: the part at ${c.at} is not a prop ${t.id} declares`);
      if (!part(c.type)) r.errors.push(`${file}: no type resolves the part ${c.type} at ${c.at}`);
    }
    // Projections.
    const routesSeen = new Set<string>();
    for (const p of t.projects) {
      if (routesSeen.has(p.route)) r.errors.push(`${file}: two projections write ${p.route}; one type projects to a route once`);
      routesSeen.add(p.route);
      const sample = recordFile(fill(p.route, "example"));
      if (!routerRoute(sample)) r.errors.push(`${file}: projects to ${p.route}, but no record type in the data model lives at ${sample.replace("example", "[id]")}`);
      for (const [field, f] of Object.entries(p.fields)) {
        for (const path of [f.value, ...(f.unique_by ?? [])]) { const bad = badPath(t, path); if (bad) r.errors.push(`${file}: ${p.route}.${field} reads ${bad}`); }
      }
    }
  }
  // Parts that compose each other in a cycle.
  const parts = (t: SignalType) => (t.composes ?? []).map((c) => part(c.type)).filter((x): x is SignalType => !!x);
  for (const { file, type: t } of set) {
    const stack: { p: SignalType; trail: string[] }[] = parts(t).map((p) => ({ p, trail: [t.id, p.id] }));
    const visited = new Set<string>();
    while (stack.length) {
      const { p, trail } = stack.pop() as { p: SignalType; trail: string[] };
      if (p.id === t.id) { r.errors.push(`${file}: its parts compose it again (${trail.join(" > ")})`); break; }
      if (visited.has(key(p))) continue;
      visited.add(key(p));
      for (const q of parts(p)) stack.push({ p: q, trail: [...trail, q.id] });
    }
  }
  // Shared fields. Every part a type has, at any depth (cycles stop at the first repeat).
  const partsOf = (t: SignalType): SignalType[] => {
    const out = new Map<string, SignalType>();
    const walk = (x: SignalType) => { for (const p of parts(x)) if (!out.has(key(p)) && p.id !== t.id) { out.set(key(p), p); walk(p); } };
    walk(t);
    return [...out.values()];
  };
  const claims = (t: SignalType) => t.projects.flatMap((p) => Object.entries(p.fields).map(([field, f]) => ({ route: p.route, field, reducer: f.reducer, once: Boolean(p.once) })));
  for (const { file, type: t } of set) {
    for (const p of partsOf(t)) for (const c of claims(t)) {
      if (claims(p).some((x) => x.route === c.route && x.field === c.field)) r.errors.push(`${file}: claims ${c.route}.${c.field}, which its part ${key(p)} owns; a shared part owns the shared field, so leave it to the part`);
    }
  }
  // One field of one route takes one reducer, and a route is written once or folded, not both. Versions of one id
  // replace each other, so only different ids are compared.
  const byField = new Map<string, { t: SignalType; reducer: string }[]>();
  const byRoute = new Map<string, { t: SignalType; once: boolean }[]>();
  for (const t of all) for (const c of claims(t)) {
    byField.set(`${c.route}.${c.field}`, [...(byField.get(`${c.route}.${c.field}`) ?? []), { t, reducer: c.reducer }]);
    if (!(byRoute.get(c.route) ?? []).some((x) => x.t === t)) byRoute.set(c.route, [...(byRoute.get(c.route) ?? []), { t, once: c.once }]);
  }
  const ours = (t: SignalType) => where.has(key(t));
  for (const [at, xs] of byField) for (const a of xs) for (const b of xs) {
    if (a.t.id < b.t.id && a.reducer !== b.reducer && (ours(a.t) || ours(b.t))) r.errors.push(`${where.get(key(ours(a.t) ? a.t : b.t))}: ${at} is folded by ${a.reducer} in ${key(a.t)} and by ${b.reducer} in ${key(b.t)}; one field takes one reducer`);
  }
  for (const [route, xs] of byRoute) for (const a of xs) for (const b of xs) {
    if (a.t.id < b.t.id && a.once !== b.once && (ours(a.t) || ours(b.t))) r.errors.push(`${where.get(key(ours(a.t) ? a.t : b.t))}: ${route} is written once by ${key(a.once ? a.t : b.t)} and folded by ${key(a.once ? b.t : a.t)}`);
  }
  // Worked cases, through the real render.
  for (const { file, type: t } of set) for (const c of t.cases) {
    r.cases++;
    let got: unknown;
    try {
      const { result } = renderCase(t, all, c);
      got = result.status === "rendered" ? Object.fromEntries(result.records.map((x) => [x.route, x.record])) : { raised: result.why };
    } catch (e) { got = { threw: e instanceof Error ? e.message : String(e) }; }
    if (canonicalJson(strip(c.expect, got)) !== canonicalJson(c.expect)) r.errors.push(`${file}: worked case ${c.id} renders ${JSON.stringify(got).slice(0, 300)}, not what it expects`);
  }
  return r;
}

// ---- Signals and the log ----

const LOG_FILE = /^log\/([a-z][a-z0-9-]*)\/(\d{4}-\d{2}-\d{2})\.jsonl$/;

/** The signals and the day log of one library folder, against the types it may use. `local` is a venture's local
 *  library, whose signals a person may use to withdraw any other. Retraction targets in `elsewhere` count as found. */
export async function checkSignals(root: string, label: string, types: readonly SignalType[], { local = false, elsewhere = new Set<string>() }: { local?: boolean; elsewhere?: ReadonlySet<string> } = {}): Promise<Report & { ids: Set<string> }> {
  const r = empty();
  const lib = folder(local ? LOCAL_LIBRARY : label, root, local ? "local" : "source");
  const read: Pulled[] = [];
  const byPath = new Map<string, Pulled>();
  for (const f of files(root, "signals").filter((x) => x.endsWith(".json"))) {
    const got = await readSignal(lib, f, types);
    if (!got.signal) { r.errors.push(`${label}/${got.problem?.replace(/^[^:]+: /, "") ?? f}`); continue; }
    const s = got.signal.signal;
    const [id, version] = splitRange(s.type);
    if (!resolveType(types, id, version)) { r.errors.push(`${label}/${f}: no library checked holds the type ${s.type}`); continue; }
    if (!s.retracts) for (const v of viewsOf(s, types).filter((x) => x.part)) {
      const pt = resolveType(types, v.type, v.version);
      const bad = pt ? propsProblem(pt, v.props) : null;
      if (bad) r.errors.push(`${label}/${f}: the part at ${v.part}: ${bad}`);
    }
    read.push(got.signal);
    byPath.set(f, got.signal);
  }
  r.signals = read.length;
  const ids = new Set(read.map((x) => x.signal.id));
  const w = withdraw(read);
  for (const x of w.refused) r.errors.push(`${label}: ${x.signal} may not withdraw ${x.target}: ${x.why}`);
  for (const x of read) {
    const target = x.signal.retracts ?? x.signal.supersedes;
    if (target && !ids.has(target) && !elsewhere.has(target)) r.warnings.push(`${label}/${x.path}: withdraws ${target}, which is in no library checked`);
  }
  // The day log: every signal reaches a pull through exactly one line.
  const listed = new Map<string, string>();
  for (const f of files(root, "log")) {
    const m = LOG_FILE.exec(f);
    if (!m) { r.errors.push(`${label}/${f}: a log file is log/<type>/<yyyy-mm-dd>.jsonl`); continue; }
    readFileSync(join(root, f), "utf8").split("\n").forEach((text, i) => {
      if (!text.trim()) return;
      const at = `${label}/${f}:${i + 1}`;
      const p = parse(text);
      if (!p.ok) { r.errors.push(`${at}: not JSON`); return; }
      const v = validateValue("signal-log.schema.json", p.value);
      if (v.status !== 0) { r.errors.push(`${at}: does not match signal-log.schema.json: ${firstLine(v.stdout + v.stderr)}`); return; }
      const line = p.value as { id: string; subject: string; path: string; published: string };
      if (line.published.slice(0, 10) !== m[2]) r.errors.push(`${at}: published ${line.published}, not on ${m[2]}`);
      if (listed.has(line.id)) r.errors.push(`${at}: ${line.id} is listed again (first at ${listed.get(line.id)})`);
      listed.set(line.id, at);
      const s = byPath.get(line.path);
      if (!s) { r.errors.push(`${at}: names ${line.path}, which is not a signal here${existsSync(join(root, line.path)) ? " that checks" : ""}`); return; }
      if (s.signal.id !== line.id) r.errors.push(`${at}: says ${line.id}, but ${line.path} is ${s.signal.id}`);
      if (s.signal.subject !== line.subject) r.errors.push(`${at}: says subject ${line.subject}, but ${line.path} is about ${s.signal.subject}`);
      if (splitRange(s.signal.type)[0] !== m[1]) r.errors.push(`${at}: sits in log/${m[1]}/, but ${line.path} is a ${s.signal.type}`);
    });
  }
  for (const x of read) if (!listed.has(x.signal.id)) r.errors.push(`${label}/${x.path}: no log line lists it, so it never reaches a pull`);
  return { ...r, ids };
}

// ---- Listeners ----

/** The collections a record type in the data model lives in (the first folder of each of its files). */
const collections = () => new Set((routes() as { kind: string; files?: string[] }[]).filter((x) => x.kind === "record").flatMap((x) => (x.files ?? []).map((f) => f.split("/")[0])));

/** Listeners against the types they may hear. `label` names where they come from. */
export function checkListeners(listeners: readonly (Listener & { from?: string })[], types: readonly SignalType[], label: string): Report {
  const r = empty();
  r.listeners = listeners.length;
  const held = collections();
  for (const l of listeners) {
    const at = `${label}: listener ${l.id}${l.from ? ` (${l.from})` : ""}`;
    const [id, range] = splitRange(l.hears);
    const heard = types.filter((t) => t.id === id && satisfies(t.version, range));
    if (!heard.length) r.errors.push(`${at}: hears ${l.hears}, which no type checked resolves`);
    const route = l.consumer && "route" in l.consumer ? l.consumer.route : null;
    if (l.then === "project" && route && heard.length && !heard.some((t) => t.projects.some((p) => p.route === route))) r.errors.push(`${at}: projects to ${route}, but ${l.hears} has no projection there`);
    if (l.then === "revalidate" && route) { const f = recordFile(fill(route, "example")); if (!routerRoute(f)) r.warnings.push(`${at}: revalidates ${route}, where no record type in the data model lives, so a pull cannot mark it`); }
    for (const p of (l.criterion?.predicates ?? []) as ListenerPredicate[]) {
      const o = p.value;
      if (!o || typeof o !== "object" || Array.isArray(o)) continue;
      if ("read" in o) { const file = o.read.split("#")[0]; if (!routerRoute(file) && !(routes() as { kind: string; files?: string[] }[]).some((x) => x.kind === "record" && (x.files ?? []).includes(file))) r.warnings.push(`${at}: predicate ${p.id} reads ${o.read}, but no record type lives at ${file}, so a pull cannot read it and the predicate fails`); }
      if ("ids" in o && !held.has(o.ids)) r.warnings.push(`${at}: predicate ${p.id} reads the ids of ${o.ids}, where no record type lives`);
    }
  }
  return r;
}

// ---- What a run checks ----

/** Naive's packages: every package's signal types (the implicit library naive) and its listeners. */
export function checkPackages(root = join(repo, PACKAGES)): Report & { types_loaded: SignalType[] } {
  let r = empty();
  const loaded: TypeFile[] = [];
  for (const pkg of existsSync(root) ? readdirSync(root).sort() : []) {
    const dir = join(root, pkg, "signals/types");
    if (!existsSync(dir)) continue;
    const t = loadTypes(dir, `${relative(repo, dir) || dir}`);
    r.errors.push(...t.errors);
    loaded.push(...t.types);
  }
  r = add(r, checkTypes(loaded));
  const types = loaded.map((x) => x.type);
  const seen = new Map<string, string>();
  for (const p of packageDefs() as { name?: string; folder?: string; listeners?: Listener[] }[]) {
    const name = p.name ?? p.folder ?? "?";
    for (const l of p.listeners ?? []) { if (seen.has(l.id)) r.errors.push(`package ${name}: listener ${l.id} is also defined by package ${seen.get(l.id)}`); seen.set(l.id, name); }
    if (root === join(repo, PACKAGES)) r = add(r, checkListeners(p.listeners ?? [], types, `package ${name}`));
  }
  return { ...r, types_loaded: types };
}

/** A library folder: library.json, types/, signals/ and log/. Its parts may resolve to Naive's open types. */
export async function checkLibrary(root: string, label = root, naive: readonly SignalType[] = []): Promise<Report & { ids: Set<string>; types_loaded: SignalType[] }> {
  let r = empty();
  const lj = join(root, "library.json");
  if (existsSync(lj)) {
    const p = parse(readFileSync(lj, "utf8"));
    const v = p.ok ? validateValue("signal-library.schema.json", p.value) : null;
    if (!p.ok) r.errors.push(`${label}/library.json: not JSON`);
    else if (v && v.status !== 0) r.errors.push(`${label}/library.json: does not match signal-library.schema.json: ${firstLine(v.stdout + v.stderr)}`);
  } else if (files(root, "types").length || files(root, "signals").length) r.errors.push(`${label}: holds types or signals but no library.json`);
  const t = loadTypes(join(root, "types"), `${label}/types`);
  r.errors.push(...t.errors);
  r = add(r, checkTypes(t.types, naive));
  const types = [...t.types.map((x) => x.type), ...naive.filter((n) => !t.types.some((x) => x.type.id === n.id && x.type.version === n.version))];
  const s = await checkSignals(root, label, types);
  return { ...add(r, s), ids: s.ids, types_loaded: t.types.map((x) => x.type) };
}

/**
 * A venture: its local library (raw/signals/, signals and log only), each filesystem signal library its source map
 * lists, and its listeners merged from packages, frames and naive.config.json against every type it reads.
 */
export async function checkVenture(dir: string, label = dir, naive: readonly SignalType[] = checkPackages().types_loaded): Promise<Report> {
  let r = empty();
  type Source = { id: string; connector: string; carries?: string; root?: string; confirmed_by?: { person?: string } };
  const map = existsSync(ventureFile(dir, "knowledge/sources.json")) ? JSON.parse(readFileSync(ventureFile(dir, "knowledge/sources.json"), "utf8")) as { sources?: Source[] } : {};
  const types: SignalType[] = [...naive];
  const ids = new Set<string>();
  for (const s of (map.sources ?? []).filter((x) => x.carries === "signals")) {
    if (s.connector !== "filesystem") {
      if (!namedPerson(s.confirmed_by)) r.warnings.push(`${label}: the ${s.connector} library ${s.id} is not read until a person confirms it by name (confirmed_by)`);
      else r.warnings.push(`${label}: the ${s.connector} library ${s.id} is not checked here; only folders are`);
      continue;
    }
    const root = s.root && s.root.startsWith("/") ? s.root : join(dir, s.root ?? ".");
    const lib = await checkLibrary(root, `${label} source ${s.id}`, naive);
    r = add(r, lib);
    for (const t of lib.types_loaded) if (!types.some((x) => x.id === t.id && x.version === t.version)) types.push(t);
    for (const i of lib.ids) ids.add(i);
  }
  const localRoot = ventureFile(dir, LOCAL_ROOT);
  if (files(localRoot, "types").length) r.warnings.push(`${label}/${LOCAL_ROOT}/types: a venture's local library holds signals only; its types are not read`);
  r = add(r, await checkSignals(localRoot, `${label}/${LOCAL_ROOT}`, types, { local: true, elsewhere: ids }));
  // Listeners, merged as the pull merges them.
  const { listeners, problems } = listenersOf(dir);
  r.errors.push(...problems.map((p) => `${label}: ${p}`));
  r = add(r, checkListeners(listeners, types, label));
  return r;
}

/** The example library and the listeners of the example venture beside it. */
async function checkExamples(): Promise<Report> {
  const lib = await checkLibrary(join(repo, EXAMPLE_LIBRARY), EXAMPLE_LIBRARY);
  const cfg = JSON.parse(readFileSync(join(repo, "packages/naive/src/records/examples/signals/naive.config.json"), "utf8")) as { listeners?: Listener[] };
  return add(lib, checkListeners(cfg.listeners ?? [], lib.types_loaded, "packages/naive/src/records/examples/signals/naive.config.json"));
}

/** What one folder is, and its check. */
export async function checkDir(dir: string, naive: readonly SignalType[]): Promise<Report> {
  if (existsSync(join(dir, "venture.json"))) return checkVenture(dir, dir, naive);
  if (existsSync(join(dir, "signals/types")) && !existsSync(join(dir, "library.json"))) {
    const t = loadTypes(join(dir, "signals/types"), `${dir}/signals/types`);
    const r = checkTypes(t.types, naive);
    return { ...r, errors: [...t.errors, ...r.errors] };
  }
  return checkLibrary(dir, dir, naive);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const dirs = args.filter((a) => a !== "--json");
  const pkgs = checkPackages();
  let r: Report = dirs.length ? empty() : add(pkgs, await checkExamples());
  for (const d of dirs) {
    if (!existsSync(d)) { console.error(`no folder ${d}`); process.exit(2); }
    r = add(r, await checkDir(d, pkgs.types_loaded));
  }
  if (json) console.log(JSON.stringify({ ok: !r.errors.length, ...r }, null, 2));
  else {
    for (const w of r.warnings) console.warn(`warning: ${w}`);
    if (r.errors.length) console.error(r.errors.map((e) => `error: ${e}`).join("\n"));
    else console.log(`pass  signals: ${r.types} types (${r.cases} worked cases render), ${r.signals} signals, ${r.listeners} listeners${dirs.length ? "" : ` in ${NAIVE_LIBRARY} and the example library`}`);
  }
  process.exit(r.errors.length ? 1 : 0);
}
