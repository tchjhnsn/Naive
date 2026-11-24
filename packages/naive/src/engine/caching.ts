#!/usr/bin/env node
// Caching (the Next.js Caching chapter, translated; ledger rows C-1 to C-8, S-8, F-2, F-12, O-5 and
// H-3). Naive stores two kinds of work so it is not redone:
//
//   record level    a derived record, such as a command route's result (need-now, the decision
//                   list, the foundation report). Keyed by the venture's files, the framework's
//                   code, the arguments and anything the declaration says it varies on.
//   judgment level  one System 1 answer (a Choice, Noul or Score question). Keyed by the exact state
//                   it was given, the question, the model and the package versions. Change any of
//                   them and it is asked again; otherwise the stored answer is reused (S-8, C-5).
//
// Every cached value has a life (C-4), named like Next.js cacheLife profiles. Caching is on in the
// recommended defaults (C-2); naive.config.json { "cache": { "enabled": false } } or NAIVE_CACHE=off
// turns it off. A route is cached only when a declaration names it (C-3, H-3): a package's
// use_cache in packages/naive/library/packages/<name>/package.json, the framework's own list below, or the venture's
// naive.config.json cache.routes. Reads (run, and view over run) may use the cache; writes never do.
// A result that depends on who is acting is private: stored per person, never returned to anyone
// else, and not stored at all when the actor is unnamed (C-7).
//
// Separately, within one action (one router call and every call it makes), each record read and
// each computed value (the route table, the decision list, a command's output) is computed once and
// shared, like React.cache and fetch memoization (F-2, F-12, O-5). A write in the action forgets
// what was memoized for that venture.
//
// The store is <venture>/.naive/cache/ (C-17), which git ignores and the router never routes.
// No model and no network here: a judgment is asked by NAIVE_JUDGE_CMD (a command the app that hosts
// Naive names, such as its Jev client), which reads a request on stdin and prints its answers.
//
//   node packages/naive/src/engine/caching.ts stats <venture dir> [--json]
//   node packages/naive/src/engine/caching.ts list <venture dir> [--level record|judgment]
//   node packages/naive/src/engine/caching.ts prune <venture dir>       remove expired entries
//   node packages/naive/src/engine/caching.ts clear <venture dir> [--level record|judgment]
//   node packages/naive/src/engine/caching.ts judge <venture dir> --request <file|-> [--life <profile>] [--private --as <person>]

import { createHash } from "node:crypto";
import type { BinaryLike, Hash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { entries as provEntries, type Entry as ProvEntry } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";
import type { CommandResult } from "../core/runtime.ts";
import { askJudge, commandArgv } from "../core/effect/host.ts";
import { runPromise } from "../core/effect/run.ts";

/** A life by profile name, or { revalidate, expire } in seconds (stale is how long a stale value may be served). */
export type LifeInput = string | { stale?: number; revalidate?: number; expire?: number | null } | null | undefined;
export type Life = { name: string; stale: number; revalidate: number; expire: number | null };
type Profile = { stale: number; revalidate: number; expire: number | null };

// The cache section of naive.config.json and a package's use_cache. Neither has a JSON Schema yet, so
// their shapes are written here.
/** One use_cache declaration: the route, its level, its life and what it varies on. */
export type UseCache = { route: string; level: string; life?: LifeInput; vary?: string[]; private?: boolean };
/** A declaration and who made it: framework, a package, or naive.config.json. */
export type Declaration = UseCache & { by: string };
/** naive.config.json cache.routes: a life, a declaration's fields, or false to turn the route off. */
export type RouteSetting = false | string | Partial<UseCache>;
type CacheConfig = { enabled?: boolean; life?: LifeInput; judgment_life?: LifeInput; routes?: Record<string, RouteSetting> };
export type Settings = { enabled: boolean; life: LifeInput; judgment_life: LifeInput; routes: Record<string, RouteSetting> };

/** What a caller asks the store for: a level, a name, the key's parts, a life and whether it is private. */
export type CacheSpec = { level: string; name: string; key?: unknown; life?: LifeInput; private?: boolean; identity?: string | null };
/** A spec checked and hashed. */
export type Spec = { level: string; name: string; key: unknown; priv: boolean; identity: string | null; life: Life; hash: string };
/** One stored entry, as it sits in <venture>/.naive/cache/. */
export type Entry = { level: string; name: string; key: string; parts: unknown; private: boolean; stored_at: string; life: Life; expires_at: string | null; value: unknown };
export type ListedEntry = Entry & { file: string; bytes: number };
type LookupBase = { spec: Spec; age?: number; why?: string };
export type Lookup = (LookupBase & { status: "hit" | "stale"; entry: Entry; age: number })
  | (LookupBase & { status: "skip" | "miss" | "expired" | "revalidate"; entry?: undefined });
/** What a cached call reports about the cache. */
export type CacheInfo = { status: string; level: string; name: string; key?: string; life?: string; private?: boolean; stored_at?: string; expires_at?: string | null; age_s?: number; why?: string; by?: string };

const repo = new URL("../../../..", import.meta.url).pathname;
const load = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));
const sha = (s: BinaryLike) => createHash("sha256").update(s).digest("hex");
function canon(x: unknown): unknown {
  if (Array.isArray(x)) return x.map(canon);
  if (!x || typeof x !== "object") return x;
  const o = x as Record<string, unknown>;
  return Object.fromEntries(Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => [k, canon(o[k])]));
}
/** The hash of a key: canonical JSON (keys sorted), so the same parts always give the same key. */
export const keyOf = (parts: unknown) => sha(JSON.stringify(canon(parts)));

// ---------------------------------------------------------------------------------------------
// Per-action memoization (F-2, F-12, O-5)

export { actionScope, actionStats, forget, inAction, memo } from "../core/action-scope.ts";
import { memo } from "../core/action-scope.ts";

// ---------------------------------------------------------------------------------------------
// Lifetimes (C-4): Next.js cacheLife profiles, in seconds. Fresh while younger than revalidate;
// between revalidate and expire it is stale and computed again unless the caller accepts stale;
// past expire it is gone. expire null is never.

export const LIFE = {
  seconds: { stale: 30, revalidate: 1, expire: 60 },
  minutes: { stale: 300, revalidate: 60, expire: 3600 },
  hours: { stale: 300, revalidate: 3600, expire: 86400 },
  days: { stale: 300, revalidate: 86400, expire: 604800 },
  weeks: { stale: 300, revalidate: 604800, expire: 2592000 },
  max: { stale: 300, revalidate: 2592000, expire: 31536000 },
  default: { stale: 300, revalidate: 900, expire: null },
};

/** A life by profile name, or { revalidate, expire } in seconds. A cache without one is refused (C-4). */
export function lifeOf(life: LifeInput): Life {
  if (life === undefined || life === null || life === "") throw new Error(`every cached value needs a life: one of ${Object.keys(LIFE).join(", ")}, or { revalidate, expire } in seconds`);
  if (typeof life === "string") {
    const profile = (LIFE as Record<string, Profile | undefined>)[life];
    if (!profile) throw new Error(`unknown cache life ${life}: one of ${Object.keys(LIFE).join(", ")}`);
    return { name: life, ...profile };
  }
  const n = (x: number | null | undefined) => x === null || (typeof x === "number" && x >= 0);
  if (typeof life === "object" && n(life.expire ?? null) && (life.revalidate === undefined || n(life.revalidate))) {
    const expire = life.expire ?? null;
    return { name: "custom", stale: life.stale ?? 300, revalidate: life.revalidate ?? expire ?? LIFE.default.revalidate, expire };
  }
  throw new Error(`a cache life is a profile name or { revalidate, expire } in seconds, not ${JSON.stringify(life)}`);
}

// ---------------------------------------------------------------------------------------------
// Configuration (C-2) and declarations (C-3)

export const CACHE_DIR = ".naive/cache";
export const DEFAULTS: Settings = { enabled: true, life: "default", judgment_life: "max", routes: {} };

/** The venture's cache settings: the recommended defaults, then naive.config.json's cache, then NAIVE_CACHE. */
export function configOf(dir: string): Settings {
  const f = dir && join(ventureFile(dir, "naive.config.json"));
  const own: CacheConfig = f && existsSync(f) ? (load(f) as { cache?: CacheConfig }).cache ?? {} : {};
  const off = /^(0|off|false|no)$/i.test(process.env.NAIVE_CACHE ?? "");
  return { ...DEFAULTS, ...own, routes: { ...(own.routes ?? {}) }, enabled: !off && own.enabled !== false };
}

// The framework's own derived records, which no package owns. Each is a pure function of the
// venture's files and the framework's code; vary names any other input it reads (C-9: the hour or
// the day, an environment variable, who is acting).
export const FRAMEWORK_USE_CACHE: UseCache[] = [
  { route: "system/need-now", level: "record", life: "hours" },
  { route: "system/time-to-ready", level: "record", life: "hours" },
  { route: "system/package", level: "record", life: "hours", vary: ["day"] },
];

/** Every use_cache declaration: the framework's, then each package's (packages/naive/library/packages/<name>/package.json). */
export function declarations(): Declaration[] {
  const out: Declaration[] = FRAMEWORK_USE_CACHE.map((d) => ({ ...d, by: "framework" }));
  const pk = join(repo, "packages/naive/library", "packages");
  if (existsSync(pk)) for (const name of readdirSync(pk).sort()) {
    const f = join(pk, name, "package.json");
    if (!existsSync(f)) continue;
    const pkg = load(f) as { use_cache?: (Omit<UseCache, "level"> & { level?: string })[] };
    for (const d of pkg.use_cache ?? []) out.push({ level: "record", ...d, by: `packages/naive/library/packages/${name}` });
  }
  return out;
}

/** The declaration that caches one route for a venture, or null. naive.config.json cache.routes wins: a life, an object, or false. */
export function declarationFor(dir: string, route: string): Declaration | null {
  const own = configOf(dir).routes[route];
  if (own === false) return null;
  const base = declarations().find((d) => d.route === route && d.level === "record") ?? null;
  if (own === undefined) return base;
  return typeof own === "string" ? { ...(base ?? { route, level: "record" }), life: own, by: "naive.config.json" } : { ...(base ?? { route, level: "record" }), ...own, by: "naive.config.json" };
}

// ---------------------------------------------------------------------------------------------
// Keys (C-5)

const SKIP = new Set([".naive", ".git", "node_modules"]);
function hashTree(root: string, sub = "", h: Hash = createHash("sha256")): Hash {
  const here = join(root, sub);
  if (!existsSync(here)) return h;
  for (const e of readdirSync(here, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (SKIP.has(e.name)) continue;
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) hashTree(root, rel, h);
    else if (e.isFile()) h.update(`${rel}\u0000${sha(readFileSync(join(root, rel)))}\n`);
  }
  return h;
}

/** The state of a venture: one hash over every file in it except the cache. Once per action. */
export function stateOf(dir: string): string {
  return memo("state", () => hashTree(dir).digest("hex"), { dir });
}

let code: string | undefined;
const CODE_DIRS = ["schema", "interface", "knowledge", "purpose", "governance", "operations", "evidence", "library", "packages", "platform"];
/** The framework's code and definitions, hashed: a change to any of them starts record-level caches fresh (C-17). */
export function codeVersion() {
  if (code) return code;
  const h = createHash("sha256");
  for (const d of CODE_DIRS) hashTree(repo, d, h);
  return (code = h.digest("hex"));
}

/** Naive's version and each package definition's hash: the versions a judgment's key holds (C-5). */
export function versionsOf(packages?: string[]): { naive: string; packages: Record<string, string | null> } {
  const naive = readFileSync(join(repo, "packages/naive/src/records/VERSION"), "utf8").trim();
  const pk = join(repo, "packages/naive/library", "packages");
  const names = packages?.length ? packages : existsSync(pk) ? readdirSync(pk).filter((n) => existsSync(join(pk, n, "package.json"))).sort() : [];
  return { naive, packages: Object.fromEntries(names.map((n) => {
    const f = join(pk, n, "package.json");
    return [n, existsSync(f) ? sha(readFileSync(f)).slice(0, 16) : null];
  })) };
}

/** Who a private result belongs to: the person (MENTURA_PERSON, else the actor id) or the agent's role id. */
export function identityOf({ actor, actor_id }: { actor?: string; actor_id?: string } = {}): string | null {
  const id = actor === "person" ? process.env.MENTURA_PERSON ?? actor_id : actor_id;
  return id ? String(id) : null;
}

/** The values a declaration varies on (C-9: "now" is an input, read on purpose). */
export function varyValues(vary: string[] = [], { now = Date.now(), identity = null }: { now?: number; identity?: string | null } = {}): Record<string, string | null> {
  const iso = new Date(now).toISOString();
  return Object.fromEntries(vary.map((v) => [v, v === "day" ? iso.slice(0, 10) : v === "hour" ? iso.slice(0, 13) : v === "actor" ? identity
    : v.startsWith("env:") ? process.env[v.slice(4)] ?? null : (() => { throw new Error(`unknown vary ${v}: day, hour, actor or env:<NAME>`); })()]));
}

// ---------------------------------------------------------------------------------------------
// The store (C-1, C-7, C-17)

const scopeOf = (priv: boolean, identity: string | null) => priv ? `private/${sha(`naive-person:${identity}`).slice(0, 16)}` : "shared";
const slug = (s: unknown) => String(s).replace(/[^A-Za-z0-9._-]+/g, "_");
const fileOf = (dir: string, { level, name, hash, priv, identity }: Spec) => join(dir, CACHE_DIR, scopeOf(priv, identity), level, slug(name), `${hash}.json`);

function spec(s: CacheSpec): Spec {
  if (!["record", "judgment"].includes(s.level)) throw new Error(`a cache level is record or judgment, not ${s.level}`);
  if (!s.name) throw new Error("a cached value needs a name (its route or question)");
  const priv = !!s.private;
  const identity = priv ? s.identity ?? null : null;
  const life = lifeOf(s.life);
  return { level: s.level, name: s.name, key: s.key ?? {}, priv, identity, life, hash: keyOf({ level: s.level, name: s.name, key: s.key ?? {}, ...(priv ? { identity } : {}) }) };
}

/**
 * Looks a value up. status: hit (fresh), stale (served because allowStale), revalidate (stale, to be
 * computed again), expired, miss, or skip (private with no named actor: never stored or shared).
 */
export function lookup(dir: string, s: CacheSpec, { now = Date.now(), allowStale = false }: { now?: number; allowStale?: boolean } = {}): Lookup {
  const p = spec(s);
  if (p.priv && !p.identity) return { status: "skip", why: "a private result with no named actor is never cached", spec: p };
  const f = fileOf(dir, p);
  if (!existsSync(f)) return { status: "miss", spec: p };
  let e: Entry;
  try { e = load(f) as Entry; } catch { return { status: "miss", spec: p }; }
  const age = (now - Date.parse(e.stored_at)) / 1000;
  const life = e.life ?? p.life;
  if (life.expire !== null && age >= life.expire) return { status: "expired", spec: p, age };
  if (age < life.revalidate) return { status: "hit", spec: p, entry: e, age };
  return allowStale ? { status: "stale", spec: p, entry: e, age } : { status: "revalidate", spec: p, age };
}

/** Stores a value for the looked-up spec. Written whole (temp file, then rename), so a reader never sees half of it. */
export function store(dir: string, p: Spec, value: unknown, { now = Date.now() }: { now?: number } = {}): Entry | null {
  if (p.priv && !p.identity) return null;
  const f = fileOf(dir, p);
  mkdirSync(dirname(f), { recursive: true });
  const stored_at = new Date(now).toISOString();
  const entry: Entry = { level: p.level, name: p.name, key: p.hash, parts: p.key, private: p.priv, stored_at, life: p.life,
    expires_at: p.life.expire === null ? null : new Date(now + p.life.expire * 1000).toISOString(), value };
  const tmp = `${f}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(entry, null, 2) + "\n");
  renameSync(tmp, f);
  return entry;
}

const info = (l: Lookup, entry: Entry | null | undefined): CacheInfo => ({ status: l.status, level: l.spec.level, name: l.spec.name, key: l.spec.hash.slice(0, 16), life: l.spec.life.name,
  ...(l.spec.priv ? { private: true } : {}), ...(entry ? { stored_at: entry.stored_at, expires_at: entry.expires_at } : {}), ...(l.age !== undefined ? { age_s: Math.round(l.age) } : {}), ...(l.why ? { why: l.why } : {}) });

/**
 * The cached value, or compute() stored with its life. compute returning undefined is not stored
 * (a failure is never cached). Returns { value, cache }, cache saying hit, stale, miss, revalidate,
 * expired, skip or off.
 */
export async function cached<T>(dir: string, s: CacheSpec, compute: () => T | Promise<T>, { now = Date.now(), allowStale = false, enabled = configOf(dir).enabled }: { now?: number; allowStale?: boolean; enabled?: boolean } = {}): Promise<{ value: T; cache: CacheInfo }> {
  const p = spec(s);
  if (!enabled) return { value: await compute(), cache: { status: "off", level: p.level, name: p.name } };
  const l = lookup(dir, s, { now, allowStale });
  // A stored value is what compute returned when it was stored.
  if (l.status === "hit" || l.status === "stale") return { value: l.entry.value as T, cache: info(l, l.entry) };
  const value = await compute();
  const entry = value === undefined ? null : store(dir, l.spec, value, { now });
  return { value, cache: info(l, entry) };
}

// ---------------------------------------------------------------------------------------------
// Record level: command routes (C-3, H-3, C-7)

export type CommandRequest = { dir: string; route: string; script: string; args?: string[]; input?: { cache?: string }; actor?: string; actor_id?: string; now?: number };

/**
 * Runs a command route through the record-level cache when a declaration names it. run() is the
 * spawn; its { status, stdout, stderr } comes back, from the store on a hit, plus cache. A failing
 * run is returned as it is and never stored. Only the run action uses this; a write never does.
 */
export async function command({ dir, route, script, args = [], input, actor, actor_id, now = Date.now() }: CommandRequest, run: () => CommandResult): Promise<CommandResult & { cache?: CacheInfo }> {
  const d = declarationFor(dir, route);
  if (!d) return run();
  const cfg = configOf(dir);
  if (!cfg.enabled) return { ...run(), cache: { status: "off", level: "record", name: route } };
  if (input?.cache === "no-store") return { ...run(), cache: { status: "bypass", level: "record", name: route } };
  const identity = identityOf({ actor, actor_id });
  const priv = !!d.private || (d.vary ?? []).includes("actor");
  const key = { route, script, args: args.map((a) => (a === dir ? "<venture>" : a)), state: stateOf(dir), code: codeVersion(), vary: varyValues(d.vary, { now, identity }) };
  let failed: CommandResult | null = null as CommandResult | null;
  const r = await cached(dir, { level: "record", name: route, key, life: d.life ?? cfg.life, private: priv, identity }, (): { stdout: string } | undefined => {
    const p = run();
    if (p.status !== 0) { failed = p; return undefined; }
    return { stdout: p.stdout };
  }, { now, enabled: true });
  if (failed) return failed;
  // compute returns undefined only for a failed run, which returned above.
  if (r.value === undefined) throw new Error(`${route}: the cache gave no value`);
  return { status: 0, stdout: r.value.stdout, stderr: "", cache: { ...r.cache, by: d.by } };
}

// ---------------------------------------------------------------------------------------------
// Judgment level (S-8, C-5)

/** A typed request, the shape a Jev client reads. judge checks that questions is there. */
export type JudgeRequest = { state?: unknown; model?: string; questions: Record<string, unknown>; packages?: string[] };
export type JudgeOptions = { cmd?: string | string[]; life?: LifeInput; actor?: string; actor_id?: string; private?: boolean; packages?: string[]; now?: number; allowStale?: boolean };

/** A command from an environment variable or an option: a string split on spaces, a JSON array, or an array. */
export const judgeCommand = commandArgv;

/**
 * Answers a typed request ({ state, model, questions }, the shape a Jev client reads) with every
 * answer it can reuse, and asks the judge only the rest, in one request. Each question is its own entry, keyed by the request's state, the question, the model and the package
 * versions. Returns { model, answers, cache: { reused, asked, unanswered } }.
 */
export async function judge(dir: string, request: Partial<JudgeRequest>, { cmd, life, actor, actor_id, private: priv = false, packages, now = Date.now(), allowStale = false }: JudgeOptions = {}) {
  if (!request || typeof request !== "object" || !request.questions || typeof request.questions !== "object") throw new Error("a judgment request has questions: { state, model, questions }");
  const questions = request.questions;
  const cfg = configOf(dir);
  const identity = identityOf({ actor, actor_id });
  const versions = versionsOf(request.packages ?? packages);
  const specOf = (q: unknown): CacheSpec => ({ level: "judgment", name: request.model ?? "model", key: { state: request.state ?? null, question: q, model: request.model ?? null, versions }, life: life ?? cfg.judgment_life, private: priv, identity });
  const answers: Record<string, unknown> = {}, reused: string[] = [], ask: string[] = [], looked: Record<string, Lookup> = {};
  for (const [k, q] of Object.entries(questions)) {
    if (!cfg.enabled) { ask.push(k); continue; }
    const l = lookup(dir, specOf(q), { now, allowStale });
    looked[k] = l;
    if (l.status === "hit" || l.status === "stale") { answers[k] = l.entry.value; reused.push(k); } else ask.push(k);
  }
  let model: string | null = request.model ?? null;
  const unanswered: string[] = [];
  if (ask.length) {
    // The Judge service (core/effect/host.ts): hosted, the host's judge hook answers, or the judgment is refused;
    // on a laptop, the command runs. Naive spawns no command when hosted.
    const sub = { ...request, questions: Object.fromEntries(ask.map((k) => [k, questions[k]])) };
    const answered = await runPromise(askJudge({ feature: `judging ${ask.length} uncached question(s)`, input: JSON.stringify(sub), cmd }));
    if (!answered) throw new Error(`${ask.length} question(s) are not cached and there is no judge: set NAIVE_JUDGE_CMD to a command that answers the Jev protocol`);
    const { result: p, by } = answered;
    if (p.error) throw new Error(`could not run the judge (${by}): ${p.error.message}`);
    if (p.status !== 0) throw new Error(`the judge stopped with status ${p.status}: ${(p.stderr || p.stdout).trim().slice(0, 500)}`);
    let out: { model?: string; answers?: Record<string, unknown> };
    try { out = JSON.parse(p.stdout); } catch { throw new Error(`the judge did not answer with JSON: ${p.stdout.trim().slice(0, 300)}`); }
    model = out.model ?? model;
    for (const k of ask) {
      const a = out.answers?.[k];
      if (a === undefined) { unanswered.push(k); continue; }
      answers[k] = a;
      if (cfg.enabled) store(dir, (looked[k] ?? lookup(dir, specOf(questions[k]))).spec, a, { now });
    }
  }
  return { model, answers, cache: { status: cfg.enabled ? (ask.length ? (reused.length ? "partial" : "miss") : "hit") : "off", reused, asked: ask.filter((k) => !unanswered.includes(k)), unanswered, ...(priv ? { private: true } : {}) } };
}

// ---------------------------------------------------------------------------------------------
// Looking after the store

function walkEntries(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walkEntries(join(root, e.name)) : e.name.endsWith(".json") ? [join(root, e.name)] : []);
}

/** The entries one actor may see: the shared ones and their own private ones, never another person's (C-7). */
export function entries(dir: string, { identity = null, level }: { identity?: string | null; level?: string } = {}): ListedEntry[] {
  const base = ventureFile(dir, CACHE_DIR);
  const roots = [join(base, "shared"), ...(identity ? [join(base, scopeOf(true, identity))] : [])];
  return roots.flatMap(walkEntries).flatMap((f) => { try { const e = load(f) as Entry; return [{ file: f.slice(dir.length + 1), bytes: statSync(f).size, ...e }]; } catch { return []; } })
    .filter((e) => !level || e.level === level);
}

/** Counts by level and scope, what has expired, and the size. */
export function stats(dir: string, { identity = null, now = Date.now() }: { identity?: string | null; now?: number } = {}) {
  const es = entries(dir, { identity });
  const expired = (e: ListedEntry) => e.expires_at && Date.parse(e.expires_at) <= now;
  const by = (k: (e: ListedEntry) => string) => es.reduce<Record<string, number>>((m, e) => ({ ...m, [k(e)]: (m[k(e)] ?? 0) + 1 }), {});
  const cfg = configOf(dir);
  return { store: CACHE_DIR, enabled: cfg.enabled, entries: es.length, by_level: by((e) => e.level), private: es.filter((e) => e.private).length,
    expired: es.filter(expired).length, bytes: es.reduce((n, e) => n + e.bytes, 0),
    routes: Object.fromEntries(declarations().map((d): [string, LifeInput] => [d.route, declarationFor(dir, d.route)?.life ?? "off"]).concat(Object.keys(cfg.routes).map((r): [string, LifeInput] => [r, declarationFor(dir, r)?.life ?? "off"]))) };
}

/** Removes expired entries in every scope. Returns how many. */
export function prune(dir: string, { now = Date.now() }: { now?: number } = {}) {
  let n = 0;
  for (const f of walkEntries(ventureFile(dir, CACHE_DIR))) {
    try { const e = load(f) as Entry; if (e.expires_at && Date.parse(e.expires_at) <= now) { rmSync(f); n++; } } catch { rmSync(f, { force: true }); n++; }
  }
  return n;
}

/** Removes entries, all or one level, in every scope. Returns how many. */
export function clear(dir: string, { level }: { level?: string } = {}) {
  let n = 0;
  for (const f of walkEntries(ventureFile(dir, CACHE_DIR))) {
    let e: Entry | null = null;
    try { e = load(f) as Entry; } catch {}
    if (!level || e?.level === level) { rmSync(f, { force: true }); n++; }
  }
  return n;
}

// ---------------------------------------------------------------------------------------------
// The router's routes (system/cache, system/judge, system/answer) and their handlers

// The cache's command routes are data in packages/naive/src/records/routes/commands.ts.
export { cacheRoutes } from "../records/routes/commands.ts";

/** The input system/cache, system/judge and system/answer take. */
export type InternalInput = Partial<JudgeRequest> & {
  value?: unknown; level?: string; routes?: string[]; life?: LifeInput; private?: boolean;
  judge?: JudgeRequest & { private?: boolean };
};
export type InternalContext = { dir: string; venture: string; workspace?: string; input?: InternalInput; actor?: string; actor_id?: string; via?: string; provenance?: unknown };
type CallResult = { ok: boolean; error?: string; result?: unknown; cache?: CacheInfo; not_found?: { note?: string | null }; pending_draft?: unknown; source?: unknown };
/** The router's call, resolve and draftOf, passed in so this module never imports the router. */
export type InternalHelpers = {
  call: (req: { venture: string; route: string; action: string; workspace?: string; actor?: string; actor_id?: string; via?: string; provenance?: unknown }) => Promise<CallResult>;
  resolve: (route: string) => { r?: { kind: string; internal?: string; collection?: string } | null };
  draftOf: (route: string, venture: string, workspace?: string) => { file: string } | null | undefined;
};
type AnswerPart = { route: string; kind: string; [k: string]: unknown };

// Whether a record is confirmed: the last provenance entry for its file was a person's (a write, an
// accept or a confirm), or an agent wrote it and nobody has confirmed it since.
function confirmation(dir: string, file: string) {
  const all: ProvEntry[] = provEntries(dir);
  const es = all.filter((e) => e.entity === file);
  const last = es.at(-1);
  if (!last) return { kind: "unlogged", note: "written outside the router; its history is in git" };
  if (last.agent?.kind === "person" || ["accept", "confirm"].includes(last.activity)) return { kind: "confirmed", by: last.agent?.id ?? last.agent?.kind, at: last.at };
  return { kind: "agent", by: last.agent?.id ?? "agent", at: last.at };
}

/**
 * Handles system/cache, system/judge and system/answer for the router. helpers carries the
 * router's call, resolve and draftOf, so this module never imports the router.
 */
export async function internal(kind: string, { dir, venture, workspace, input, actor, actor_id, via, provenance }: InternalContext, { call, resolve, draftOf }: InternalHelpers) {
  const identity = identityOf({ actor, actor_id });
  try {
    if (kind === "cache") {
      const v = input?.value;
      if (v === "list") return { ok: true, result: entries(dir, { identity }).map((e) => ({ level: e.level, name: e.name, key: e.key.slice(0, 16), private: e.private, stored_at: e.stored_at, expires_at: e.expires_at, life: e.life?.name })) };
      if (v === "prune") return { ok: true, result: { pruned: prune(dir) } };
      if (v === "clear") return { ok: true, result: { cleared: clear(dir, { level: input?.level }) } };
      if (v !== undefined) return { ok: false, error: `system/cache takes value list, prune or clear, not ${v}` };
      return { ok: true, result: stats(dir, { identity }) };
    }
    if (kind === "judge") {
      const { life, private: priv, packages, ...request } = input ?? {};
      return { ok: true, result: await judge(dir, request, { life, private: !!priv, packages, actor, actor_id }) };
    }
    if (kind === "answer") {
      const list = Array.isArray(input?.routes) ? input.routes : typeof input?.value === "string" ? input.value.split(",").map((s) => s.trim()).filter(Boolean) : [];
      if (!list.length && !input?.judge) return { ok: false, error: "system/answer needs routes (input routes [...], or value a,b) or a judge request" };
      const parts: AnswerPart[] = await Promise.all(list.map(async (route) => {
        const { r } = resolve(route);
        if (!r) return { route, kind: "error", error: `no route ${route}` };
        if (r.kind === "command") {
          if (["answer"].includes(r.internal ?? "")) return { route, kind: "error", error: "system/answer cannot hold itself" };
          const res = await call({ venture, route, action: "run", workspace, actor, actor_id, via, provenance });
          if (!res.ok) return { route, kind: "error", error: res.error };
          const hit = res.cache && ["hit", "stale"].includes(res.cache.status);
          return { route, kind: hit ? "cached" : "fresh", ...(res.cache ? { cache: res.cache } : {}), data: res.result };
        }
        const res = await call({ venture, route, action: "read", workspace, actor, actor_id, via, provenance });
        if (!res.ok) return { route, kind: "error", error: res.error };
        if (res.result === null) return { route, kind: "missing", note: res.not_found?.note ?? null, ...(res.pending_draft ? { pending_draft: res.pending_draft } : {}) };
        const d = draftOf(route, venture, workspace);
        const c = d && r.collection !== "list" ? confirmation(dir, d.file) : { kind: "records" };
        return { route, ...c, ...(res.pending_draft ? { pending_draft: res.pending_draft } : {}), ...(res.source ? { source: res.source } : {}), data: res.result };
      }));
      if (input?.judge) {
        const j = await judge(dir, input.judge, { actor, actor_id, private: !!input.judge.private });
        parts.push({ route: "system/judge", kind: j.cache.status === "hit" ? "cached" : j.cache.status === "partial" ? "partly cached" : "fresh", level: "judgment", cache: j.cache, data: j.answers });
      }
      const mix = parts.reduce<Record<string, number>>((m, p) => ({ ...m, [p.kind]: (m[p.kind] ?? 0) + 1 }), {});
      return { ok: true, result: { venture, mix, parts } };
    }
  } catch (e) { return { ok: false, error: String((e as Error).message ?? e) }; }
  return { ok: false, error: `unknown cache route ${kind}` };
}

// ---------------------------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const [cmd, dir] = argv;
  const usage: () => never = () => { console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   node packages/naive/src/engine/caching.ts")).map((l) => l.slice(5)).join("\n")); process.exit(2); };
  if (!cmd || !dir || !existsSync(join(dir, "venture.json"))) usage();
  const identity = opt("as") ?? null;
  const out = (x: unknown) => console.log(typeof x === "string" ? x : JSON.stringify(x, null, 2));
  if (cmd === "stats") out(stats(dir, { identity }));
  else if (cmd === "list") out(entries(dir, { identity, level: opt("level") }).map(({ value, parts, ...e }) => e));
  else if (cmd === "prune") out({ pruned: prune(dir) });
  else if (cmd === "clear") out({ cleared: clear(dir, { level: opt("level") }) });
  else if (cmd === "judge") {
    const src = opt("request");
    if (!src) usage();
    const req: Partial<JudgeRequest> = JSON.parse(src === "-" ? readFileSync(0, "utf8") : readFileSync(src, "utf8"));
    try { out(await judge(dir, req, { life: opt("life"), private: argv.includes("--private"), actor: identity ? "agent" : undefined, actor_id: identity ?? undefined })); }
    catch (e) { console.error(String((e as Error).message ?? e)); process.exit(1); }
  } else usage();
}
