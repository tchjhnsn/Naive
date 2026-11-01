#!/usr/bin/env node
// Freshness: revalidating records (the Next.js chapter Revalidating, V-1 to V-8). Next.js keeps
// cached data fresh two ways: by time (cacheLife) and on demand (revalidateTag, revalidatePath).
// A venture has to keep its knowledge fresh the same two ways, so this module applies both to
// records:
//
//   by time       each record type has a freshness profile (knowledge/freshness.json, overridden
//                 under freshness in the venture's naive.config.json): stale after revalidate, expired
//                 after expire, and, a profile Next.js has no need for, per_phase: stale once the
//                 venture changes phase after the record was last checked (V-2)
//   on demand     a record is stale when something it depends on changed after it was last checked:
//                 a record it was derived from (the provenance log's derived_from), the parent of a
//                 where-used fact it repeats (drift), or the decision above it (EE-057); and when
//                 someone marks it, by tag (one record and what depends on it, V-5), by path (a whole
//                 folder, V-7) or by package (a pivot revalidates the validation package)
//   live holes    records with a live profile (pipeline, money, streams) are never frozen into a
//                 release; they stay holes, read from their system of record each time (V-3)
//
// A stale record is still readable: the router adds a freshness flag to its read until it is
// redone or checked (stale-while-revalidate). An expired one is not frozen into a release. Writing
// a record again, or `mentura verify`, makes it fresh; the founder's next read after their own
// write shows it fresh at once (V-6). Tags are preferred over paths (V-8): a plain target that is
// a folder is refused with the exact records to revalidate instead, unless it says path:.
//
// "Now" is an input (C-9): --now <iso> or --now +<duration> (from the clock), else NAIVE_NOW, else the clock.
//
//   node schema/freshness.mjs <venture dir> [--json] [--now <iso>]       what is fresh, stale, expired or a hole
//   node schema/freshness.mjs <venture dir> --revalidate <target> [--reason <text>] [--json]
//          target: tag:<route or file>, path:<folder>, package:<name>, pivot, or a plain route or file
//   node schema/freshness.mjs <venture dir> --freeze <out dir> [--json]  freeze the fresh records into a
//          static shell at <out dir>, leaving live records as holes; exit 1 if any record has expired

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve as resolvePath } from "node:path";
import { agentFromEnv, entries as provEntries, record as prov } from "../interface/provenance.mjs";
import { files as ventureFiles, glob, resolve as resolveRoute, routes } from "../interface/router.mjs";
import { connect, LOCAL, sourcesOf } from "../knowledge/connectors/index.mjs";
import { decisions as decisionMatrix, PHASES } from "./decisions.mjs";
import { ventureFile } from "./venture-paths.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (f) => JSON.parse(readFileSync(f, "utf8"));
export const LOG = "knowledge/freshness.jsonl";
export const DEFAULTS = "knowledge/freshness.json";
const UNITS = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
// Activities that change a record's content, and those that only say a person looked at it.
const CONTENT = new Set(["write", "accept", "baseline", "move", "port", "create"]);
const CHECKED = new Set(["confirm"]);
const EXACT = new Set(["tag", "changed", "drift", "decision", "depends"]);
const ORDER = ["tag", "changed", "drift", "decision", "depends", "path", "package", "phase", "age", "expired"];
// Times keep milliseconds, so a mark and a write in the same second stay in order.
const iso = (ms) => new Date(ms).toISOString();
const count = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
const isUrl = (s) => /^[a-z][a-z0-9+.-]*:\/\//.test(s);
/** @typedef {{ path: string, record: string, route: string, package: string | null, layer: string }} RecordFile */
/** @typedef {{ kind: string, since: string, note: string, dependency?: string, pivot?: boolean }} Reason */
/** @typedef {RecordFile & { checked_at: number, basis: string, changed_at: number, depends_on: string[], profile: string, reasons: Reason[], hole: boolean, revalidate_at: string | null, expire_at: string | null, reuse_for: number | null, state: "fresh" | "stale" | "expired", precise: boolean, fix: string | null }} Item */
/** @template R @typedef {{ ok: boolean, error?: string, suggest?: string[], or?: string, blocked?: string[], result?: R }} Outcome */

/** The time freshness is judged at: an explicit input, else NAIVE_NOW, else the clock (C-9). */
export function nowOf(now) {
  const v = now ?? process.env.NAIVE_NOW;
  if (v === undefined || v === null || v === "") return Date.now();
  // +100d: that long from the clock, so a founder can ask what will be stale in 100 days.
  if (typeof v === "string" && v.startsWith("+")) return Date.now() + seconds(v.slice(1)) * 1000;
  const t = typeof v === "number" ? v : Date.parse(v);
  if (Number.isNaN(t)) throw new Error(`not a time: ${v}`);
  return t;
}

/** A duration in seconds: a whole number of seconds, or a number with s, m, h, d or w. null when absent. */
export function seconds(d) {
  if (d === undefined || d === null) return null;
  if (typeof d === "number" && Number.isInteger(d) && d >= 0) return d;
  const m = String(d).match(/^(\d+)(s|m|h|d|w)$/);
  if (!m) throw new Error(`not a duration: ${JSON.stringify(d)} (seconds, or a number with s, m, h, d or w)`);
  return Number(m[1]) * UNITS[m[2]];
}
const human = (s) => s % 604800 === 0 && s ? `${s / 604800}w` : s % 86400 === 0 && s ? `${s / 86400}d` : s % 3600 === 0 && s ? `${s / 3600}h` : `${s}s`;

/**
 * The freshness profiles for a venture: the framework's defaults, with the venture's own profiles
 * and assignments from naive.config.json (freshness) laid over them. Throws on an unknown profile
 * or a bad duration, so a typo never silently means "never stale".
 */
export function profiles(dir) {
  const base = load(join(repo, DEFAULTS));
  const cfg = dir && existsSync(join(ventureFile(dir, "naive.config.json"))) ? load(join(ventureFile(dir, "naive.config.json"))).freshness ?? {} : {};
  const out = { default: cfg.default ?? base.default, profiles: { ...base.profiles, ...(cfg.profiles ?? {}) }, records: { ...base.records, ...(cfg.records ?? {}) }, overridden: Object.keys(cfg).length > 0 };
  const where = (k) => (cfg.profiles?.[k] || cfg.records?.[k] || k === "default") && out.overridden ? "naive.config.json freshness" : DEFAULTS;
  for (const [name, p] of Object.entries(out.profiles)) {
    for (const k of Object.keys(p)) if (!["stale", "revalidate", "expire", "per_phase", "live", "note"].includes(k)) throw new Error(`${where(name)}: profile ${name} has an unknown field ${k}`);
    for (const k of ["stale", "revalidate", "expire"]) try { seconds(p[k]); } catch (e) { throw new Error(`${where(name)}: profile ${name}.${k}: ${e.message}`); }
    if (p.expire !== undefined && p.revalidate !== undefined && seconds(p.expire) < seconds(p.revalidate)) throw new Error(`${where(name)}: profile ${name} expires before it is due to be revalidated`);
  }
  for (const [k, name] of [["default", out.default], ...Object.entries(out.records)]) if (!out.profiles[name]) throw new Error(`${where(k)}: ${k} names profile ${name}, which is not defined (${Object.keys(out.profiles).join(", ")})`);
  return out;
}

/** The profile name for one record: a route prefix assignment beats the record type; the longest prefix wins. */
export function profileFor(P, record, route) {
  const types = new Set(routes().filter((r) => r.kind === "record").map((r) => r.record));
  const prefixes = Object.keys(P.records).filter((k) => !types.has(k) && (route === k || route.startsWith(`${k}/`))).sort((a, b) => b.length - a.length);
  return prefixes.length ? P.records[prefixes[0]] : P.records[record] ?? P.default;
}

/** Every record file in a venture, with its record type, concrete route, package and route entry. @returns {RecordFile[]} */
export function recordFiles(dir) {
  const table = routes().filter((r) => r.kind === "record" && r.collection !== "list");
  const out = [];
  for (const f of ventureFiles(dir)) {
    for (const r of table) {
      const g = r.files.find((x) => glob(x).test(f));
      if (!g) continue;
      let route = r.route;
      if (r.collection === "item") {
        const m = f.match(new RegExp("^" + g.split("*").map((s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$"));
        route = r.route.replace("[id]", m?.[1] ?? f);
      }
      out.push({ path: f, record: r.record, route, package: r.package ?? null, layer: r.layer });
      break;
    }
  }
  return out;
}

/** The freshness log: revalidate, verify and phase events, oldest first. */
export function events(dir) {
  const f = ventureFile(dir, LOG);
  return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
}

// When the venture last changed phase. A phase changed by hand in venture.json, after the last
// recorded change, counts from venture.json's file time, with a warning.
function phaseChange(dir, venture, evs, warnings) {
  const changes = evs.filter((e) => e.event === "phase");
  const last = changes.at(-1);
  if (last && last.to === venture.phase) return { at: Date.parse(last.at), from: last.from, to: last.to, basis: "freshness log" };
  if (last) {
    warnings.push(`venture.json says ${venture.phase} but the last recorded phase change was to ${last.to}: record it with mentura phase ${venture.phase}`);
    return { at: statSync(join(dir, "venture.json")).mtimeMs, from: last.to, to: venture.phase, basis: "venture.json file time" };
  }
  return null;
}

function covers(target, item, dir) {
  const v = target.value.replace(/\/$/, "");
  if (target.kind === "tag") return item.path === v;
  if (target.kind === "path") return item.path === v || item.path.startsWith(`${v}/`) || item.route === v || item.route.startsWith(`${v}/`);
  if (target.kind === "package") return item.package === v;
  return false;
}

// A dependency named in derived_from: a venture file, a route (to its file), or a draft (to what
// the draft was derived from). URLs and decision ids are not files and are left out.
function normalizeDeps(list, byRoute, entries, seen = new Set()) {
  const out = [];
  for (const d of list ?? []) {
    if (isUrl(d) || /^[A-Z]+-\d+$/.test(d)) continue;
    if (d.startsWith("_drafts/")) {
      if (seen.has(d)) continue;
      seen.add(d);
      out.push(...normalizeDeps(entries.filter((e) => e.entity === d && e.derived_from).at(-1)?.derived_from, byRoute, entries, seen));
      continue;
    }
    out.push(byRoute.get(d) ?? byRoute.get(resolveRoute(d).r ? (resolveRoute(d).r.collection === "item" ? resolveRoute(d).r.route.replace("[id]", resolveRoute(d).params.id) : resolveRoute(d).r.route) : "") ?? d);
  }
  return [...new Set(out)];
}

const at = (obj, pointer) => pointer.split("/").slice(1).map((k) => k.replace(/~1/g, "/").replace(/~0/g, "~")).reduce((o, k) => o == null ? undefined : o[k], obj);

// Where-used facts (EE-042) as dependencies: each live child in the venture folder depends on its
// parent record; a child that does not show the parent's value has drifted. Children elsewhere
// are read through their connector when it is a file system, else left to the platform.
async function whereUsed(dir, byRoute, byPath, unchecked) {
  const f = join(ventureFile(dir, "knowledge/where-used.json"));
  if (!existsSync(f)) return [];
  const ids = new Map(sourcesOf(dir).sources.map((s) => [s.id, s]));
  const out = [];
  for (const fact of load(f).facts ?? []) {
    const { r, params } = resolveRoute(fact.parent.route);
    const route = r ? (r.collection === "item" ? r.route.replace("[id]", params.id) : r.route) : fact.parent.route;
    const parent = byRoute.get(route);
    if (!parent || !parent.endsWith(".json")) { unchecked.push(`${fact.id}: parent ${fact.parent.route} is not a JSON record in the venture folder`); continue; }
    const value = at(load(ventureFile(dir, parent)), fact.parent.pointer);
    for (const child of fact.children) {
      if (child.status === "frozen") continue;
      const s = ids.get(child.source);
      if (!s || s.connector !== "filesystem") { unchecked.push(`${fact.id} -> ${child.source}://${child.path}: needs the platform to check`); continue; }
      let content;
      if (s.id === LOCAL) content = existsSync(ventureFile(dir, child.path)) ? readFileSync(ventureFile(dir, child.path), "utf8") : null;
      else content = (await (await connect(s, dir)).read(child.path))?.content ?? null;
      const shows = content === null ? false : child.match.kind === "json"
        ? (() => { try { return JSON.stringify(at(JSON.parse(content), child.match.pointer)) === JSON.stringify(value); } catch { return false; } })()
        : content.includes(child.match.template.replaceAll("{value}", String(value)));
      out.push({ fact: fact.id, parent, child: s.id === LOCAL ? child.path : `${s.id}://${child.path}`, local: s.id === LOCAL, record: s.id === LOCAL && byPath.has(child.path), missing: content === null, drift: !shows, deliver: child.deliver });
    }
  }
  return out;
}

/**
 * The freshness of every record in a venture at a time. Each item: path, route, record, profile,
 * state (fresh, stale or expired), hole (a live record, never frozen), when it was last checked
 * and on what basis, when it is due, and the reasons it is stale, exact dependencies first (V-8).
 * options: now; light (skip the decision matrix, for the router's read flag).
 * @param {string} dir
 * @param {{ now?: string | number, light?: boolean }} [opts]
 */
export async function freshness(dir, { now, light = false } = {}) {
  const t = nowOf(now);
  const venture = load(join(dir, "venture.json"));
  const P = profiles(dir);
  const warnings = [], unchecked = [];
  const items = /** @type {Item[]} */ (recordFiles(dir));
  const byPath = new Map(items.map((i) => [i.path, i]));
  const byRoute = new Map(items.map((i) => [i.route, i.path]));
  const log = provEntries(dir).filter((e) => !e.source);
  const evs = events(dir);
  const change = phaseChange(dir, venture, evs, warnings);
  const lastOf = (path, kinds) => { const e = log.filter((x) => x.entity === path && kinds.has(x.activity)).at(-1); return e ? Date.parse(e.at) : null; };
  // The last time a file's content changed: its last logged write, else its file time.
  const changedAt = (path) => lastOf(path, CONTENT) ?? (existsSync(ventureFile(dir, path)) ? statSync(ventureFile(dir, path)).mtimeMs : null);

  for (const i of items) {
    const write = lastOf(i.path, CONTENT), confirmed = lastOf(i.path, CHECKED);
    const verified = evs.filter((e) => e.event === "verify" && e.target && covers(e.target, i, dir)).map((e) => Date.parse(e.at)).at(-1) ?? null;
    const known = /** @type {[number, string][]} */ ([[write, "provenance log: written"], [confirmed, "provenance log: confirmed"], [verified, "freshness log: verified"]]).filter(([x]) => x !== null).sort((a, b) => b[0] - a[0]);
    i.checked_at = known.length ? known[0][0] : statSync(ventureFile(dir, i.path)).mtimeMs;
    i.basis = known.length ? known[0][1] : "file time (not in the provenance log)";
    i.changed_at = write ?? statSync(ventureFile(dir, i.path)).mtimeMs;
    const latest = log.filter((x) => x.entity === i.path && x.derived_from?.length && CONTENT.has(x.activity)).at(-1);
    i.depends_on = normalizeDeps(latest?.derived_from, byRoute, log).filter((d) => d !== i.path && (byPath.has(d) || existsSync(ventureFile(dir, d))));
    i.profile = profileFor(P, i.record, i.route);
    i.reasons = [];
  }

  // Where-used: a live child repeats its parent's value and depends on it.
  const uses = await whereUsed(dir, byRoute, byPath, unchecked);
  const copies = [];
  for (const u of uses) {
    if (u.record) {
      const c = byPath.get(u.child);
      if (!c.depends_on.includes(u.parent)) c.depends_on.push(u.parent);
      if (u.drift) c.reasons.push({ kind: "drift", dependency: u.parent, since: iso(changedAt(u.parent)), note: `does not show ${u.parent}'s value for ${u.fact}; deliver by ${u.deliver}` });
    } else copies.push({ fact: u.fact, path: u.child, parent: u.parent, state: u.missing ? "missing" : u.drift ? "stale" : "fresh", deliver: u.deliver,
      ...(u.drift ? { note: u.missing ? `${u.child} does not exist` : `does not show ${u.parent}'s value for ${u.fact}; deliver by ${u.deliver}` } : {}) });
  }

  // Decisions made before their parent last changed are stale (EE-057).
  if (!light) {
    try {
      const ds = decisionMatrix(dir, t).decisions;
      for (const d of ds.filter((x) => x.render === "stale" && x.file)) {
        const i = byPath.get(d.file);
        const up = ds.find((x) => x.id === d.parent);
        const since = up?.provenance?.approved_at ?? up?.decided_at;
        if (i) i.reasons.push({ kind: "decision", dependency: d.parent, since: since ? iso(Date.parse(since)) : iso(t), note: `decision ${d.parent} above it changed after it was made` });
      }
    } catch (e) { warnings.push(`decision matrix: ${String(e.message ?? e).split("\n")[0]}`); }
  }

  for (const i of items) {
    const p = P.profiles[i.profile];
    const rev = seconds(p.revalidate), exp = seconds(p.expire), age = (t - i.checked_at) / 1000;
    i.hole = !!p.live;
    if (p.per_phase && change && change.at > i.checked_at) i.reasons.push({ kind: "phase", since: iso(change.at), note: `the venture moved from ${change.from} to ${change.to} after it was last checked; records with the ${i.profile} profile are tested again each phase` });
    if (rev !== null && age >= rev) i.reasons.push({ kind: "age", since: iso(i.checked_at + rev * 1000), note: `last checked ${human(Math.floor(age / 86400) * 86400) || "0d"} ago; ${i.profile} records are stale after ${human(rev)}` });
    if (exp !== null && age >= exp) i.reasons.push({ kind: "expired", since: iso(i.checked_at + exp * 1000), note: `${i.profile} records expire after ${human(exp)}; check or redo it before relying on it` });
    for (const e of evs.filter((x) => x.event === "revalidate" && x.target && Date.parse(x.at) > i.checked_at && covers(x.target, i, dir)))
      i.reasons.push({ kind: e.target.kind, since: e.at, ...(e.pivot ? { pivot: true } : {}), note: `${e.target.kind}:${e.target.value} was revalidated${e.reason ? `: ${e.reason}` : ""}` });
    for (const d of i.depends_on) {
      const c = changedAt(d);
      if (c !== null && c > i.checked_at && !i.reasons.some((r) => r.kind === "drift" && r.dependency === d)) i.reasons.push({ kind: "changed", dependency: d, since: iso(c), note: `${d}, which it was derived from, changed after it was last checked` });
    }
    i.revalidate_at = rev === null ? null : iso(i.checked_at + rev * 1000);
    i.expire_at = exp === null ? null : iso(i.checked_at + exp * 1000);
    i.reuse_for = seconds(p.stale);
  }

  // On-demand staleness flows to what depends on it, transitively; age and phase do not, since a
  // record built on aged evidence is not itself wrong until the evidence is redone.
  const onDemand = (i) => i.reasons.filter((r) => !["age", "expired", "phase"].includes(r.kind));
  for (let pass = 0, moved = true; moved && pass <= items.length; pass++) {
    moved = false;
    for (const i of items) for (const d of i.depends_on) {
      const up = byPath.get(d);
      if (!up) continue;
      const since = onDemand(up).map((r) => Date.parse(r.since)).filter((x) => x > i.checked_at).sort((a, b) => a - b)[0];
      if (since !== undefined && !i.reasons.some((r) => r.kind === "depends" && r.dependency === d)) {
        i.reasons.push({ kind: "depends", dependency: d, since: iso(since), note: `${d}, which it depends on, is stale` });
        moved = true;
      }
    }
  }

  for (const i of items) {
    i.reasons.sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
    i.state = i.reasons.some((r) => r.kind === "expired") ? "expired" : i.reasons.length ? "stale" : "fresh";
    i.precise = i.reasons.some((r) => EXACT.has(r.kind));
    i.fix = i.state === "fresh" ? null : `redo it (a write), or check it is still right: mentura verify ${i.route} --venture ${venture.id}`;
  }
  const holes = items.filter((i) => i.hole);
  return {
    venture: venture.id, phase: venture.phase, now: iso(t),
    phase_changed: change ? { from: change.from, to: change.to, at: iso(change.at), basis: change.basis } : null,
    summary: { records: items.length, fresh: items.filter((i) => i.state === "fresh").length, stale: items.filter((i) => i.state === "stale").length, expired: items.filter((i) => i.state === "expired").length, holes: holes.length,
      stale_by_dependency: items.filter((i) => i.state !== "fresh" && i.precise).length, stale_by_folder_only: items.filter((i) => i.state !== "fresh" && !i.precise && i.reasons.some((r) => r.kind === "path" || r.kind === "package")).length },
    shell: { frozen: items.filter((i) => !i.hole && i.state !== "expired").map((i) => i.path), holes: holes.map((i) => i.path), blocked: items.filter((i) => !i.hole && i.state === "expired").map((i) => i.path) },
    items: items.map(({ layer, ...i }) => ({ ...i, checked_at: iso(i.checked_at), changed_at: iso(i.changed_at) })),
    copies, unchecked, warnings,
  };
}

/** For the router's read (V-5): the freshness flag of the files a read returned, when any is stale, expired or a live hole. */
export async function readFlag(dir, paths, list = false) {
  if (!dir || !paths?.length) return {};
  let f;
  try { f = await freshness(dir, { light: true }); } catch (e) { return { freshness: { error: String(e.message ?? e) } }; }
  const flag = (i) => ({ state: i.state, hole: i.hole, profile: i.profile, checked_at: i.checked_at, revalidate_at: i.revalidate_at, expire_at: i.expire_at, reasons: i.reasons, ...(i.fix ? { fix: i.fix } : {}) });
  const hits = f.items.filter((i) => paths.includes(i.path) && (i.state !== "fresh" || i.hole));
  if (!hits.length) return {};
  return !list && paths.length === 1 ? { freshness: flag(hits[0]) } : { freshness: Object.fromEntries(hits.map((i) => [i.path, flag(i)])) };
}

// A plain target: a record file or route is a tag; a folder is refused in favour of tags (V-8).
function parseTarget(dir, target, items) {
  const m = String(target).match(/^(tag|path|package):(.+)$/);
  const kind = m?.[1], value = (m?.[2] ?? String(target)).replace(/^\.\//, "").replace(/\/$/, "");
  if (/^\/|(^|\/)\.\.(\/|$)/.test(value)) return { error: `${value} is outside the venture` };
  const byRoute = new Map(items.map((i) => [i.route, i.path]));
  const asRecord = () => {
    if (items.some((i) => i.path === value)) return value;
    if (byRoute.has(value)) return byRoute.get(value);
    const { r, params } = resolveRoute(value);
    if (r && r.kind === "record") { const route = r.collection === "item" ? r.route.replace("[id]", params.id) : r.route; return byRoute.get(route) ?? null; }
    return null;
  };
  if (kind === "package") {
    const pkgs = new Set(routes().map((r) => r.package).filter(Boolean));
    if (!pkgs.has(value)) return { error: `no package ${value} owns record types (${[...pkgs].sort().join(", ")})` };
    return { kind, value };
  }
  if (kind === "path") return { kind, value };
  const file = asRecord();
  if (file) return { kind: "tag", value: file };
  if (kind === "tag") return { error: `${value} is not a record in this venture (a record route, such as validation/pricing, or its file)` };
  const under = items.filter((i) => covers({ kind: "path", value }, i));
  if (under.length) return { error: `${value} is a folder of ${count(under.length, "record")}. Prefer tags, which are exact: revalidate the record that changed, and what depends on it follows`, suggest: under.map((i) => `tag:${i.route}`), or: `path:${value}` };
  return { error: `${value} is not a record, folder or package in this venture${resolveRoute(value).r ? " (no record at that route yet)" : ""}` };
}

function append(dir, event, by) {
  const line = { at: event.at, event: event.event, ...(event.target ? { target: event.target } : {}), ...(event.from ? { from: event.from, to: event.to } : {}), ...(event.reason ? { reason: event.reason } : {}), ...(event.pivot ? { pivot: true } : {}), by };
  const scratch = mkdtempSync(join(tmpdir(), "freshness-"));
  writeFileSync(join(scratch, "line.json"), JSON.stringify(line));
  const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "freshness-log.schema.json", "--file", join(scratch, "line.json")], { encoding: "utf8" });
  rmSync(scratch, { recursive: true, force: true });
  if (v.status !== 0) throw new Error(`does not match schema/freshness-log.schema.json:\n${(v.stdout + v.stderr).trim()}`);
  mkdirSync(dirname(ventureFile(dir, LOG)), { recursive: true });
  appendFileSync(ventureFile(dir, LOG), JSON.stringify(line) + "\n");
  const what = event.target ? `${event.target.kind}:${event.target.value}` : `${event.from} -> ${event.to}`;
  const entry = prov(dir, /** @type {Parameters<typeof prov>[1]} */ ({ entity: LOG, route: "knowledge/freshness-log", activity: "write", agent: by, note: `${event.event} ${what}${event.reason ? `: ${event.reason}` : ""}` }));
  return { line, provenance: entry.hash };
}

const byDefault = (by) => by ?? agentFromEnv(process.env.MENTURA_ACTOR === "person" ? "person" : "agent", "router");

/**
 * Marks records stale on demand (revalidateTag, revalidatePath). target: tag:<route or file> (the
 * record and what depends on it), path:<folder>, package:<name>, pivot (the validation package), or
 * a plain route or file (a tag). A plain folder is refused with the exact tags to use instead.
 * Returns { ok, result: { target, records, dependents, provenance } } or { ok: false, error, suggest }.
 * @param {string} dir
 * @param {string} target
 * @param {{ reason?: string, by?: object, now?: string | number }} [opts]
 * @returns {Promise<Outcome<{ target: string, at: string, pivot?: boolean, records: string[], dependents: string[], provenance: string, note: string }>>}
 */
export async function revalidate(dir, target, { reason, by, now } = {}) {
  const pivot = target === "pivot";
  const items = recordFiles(dir);
  const t = pivot ? { kind: "package", value: "validation" } : parseTarget(dir, target, items);
  if (t.error) return { ok: false, error: t.error, ...(t.suggest ? { suggest: t.suggest, or: t.or } : {}) };
  const direct = items.filter((i) => covers(t, i));
  if (!direct.length) return { ok: false, error: `${t.kind}:${t.value} covers no record in this venture, so nothing would be marked` };
  const stamp = iso(Math.max(nowOf(now), ...events(dir).map((e) => Date.parse(e.at) + 1)));
  const w = append(dir, { at: stamp, event: "revalidate", target: t, reason: reason ?? (pivot ? "the venture pivoted: every assumption is tested again" : undefined), pivot }, byDefault(by));
  const f = await freshness(dir, { now: Math.max(Date.parse(stamp), nowOf(now)) });
  const records = direct.map((i) => i.path);
  const dependents = f.items.filter((i) => !records.includes(i.path) && i.reasons.some((r) => r.kind === "depends" && Date.parse(r.since) >= Date.parse(stamp))).map((i) => i.path);
  return { ok: true, result: { target: `${t.kind}:${t.value}`, at: stamp, ...(pivot ? { pivot: true } : {}), records, dependents, provenance: w.provenance,
    note: t.kind === "tag" ? (dependents.length ? `${records[0]} and ${count(dependents.length, "record")} that depend on it are stale` : `${records[0]} is stale; nothing recorded depends on it (pass --derived-from on writes so a tag finds what uses it)`) : `${count(records.length, "record")} under ${t.kind}:${t.value} ${records.length === 1 ? "is" : "are"} stale${dependents.length ? `, and ${count(dependents.length, "record")} that depend on ${records.length === 1 ? "it" : "them"}` : ""}` } };
}

/**
 * Records that a person or agent checked a record (or a folder of them) is still right, unchanged: its age starts again.
 * @param {string} dir
 * @param {string} target
 * @param {{ reason?: string, by?: object, now?: string | number }} [opts]
 */
export function verify(dir, target, { reason, by, now } = {}) {
  const items = recordFiles(dir);
  const t = parseTarget(dir, target, items);
  if (t.error && !t.or) return { ok: false, error: t.error };
  const tt = t.error ? { kind: "path", value: t.or.slice(5) } : t;
  const covered = items.filter((i) => covers(tt, i));
  if (!covered.length) return { ok: false, error: `${tt.kind}:${tt.value} covers no record in this venture` };
  const stamp = iso(Math.max(nowOf(now), ...events(dir).map((e) => Date.parse(e.at) + 1)));
  const w = append(dir, { at: stamp, event: "verify", target: tt, reason }, byDefault(by));
  return { ok: true, result: { verified: `${tt.kind}:${tt.value}`, at: stamp, records: covered.map((i) => i.path), provenance: w.provenance, note: `${covered.length === 1 ? covered[0].path : count(covered.length, "record")} checked and still right; fresh again from ${stamp}` } };
}

/**
 * Moves the venture to another phase and records when, so per-phase records go stale (V-2).
 * @param {string} dir
 * @param {string} to
 * @param {{ reason?: string, by?: object, now?: string | number }} [opts]
 */
export function phase(dir, to, { reason, by, now } = {}) {
  if (!PHASES.includes(to)) return { ok: false, error: `${to} is not a phase (${PHASES.join(", ")})` };
  const file = join(dir, "venture.json");
  const v = load(file);
  if (v.phase === to) return { ok: false, error: `${v.id} is already in ${to}` };
  const from = v.phase;
  // Leaving Discovery needs the core product, as schema/init-venture.mjs scaffolds it for a later phase.
  const next = { ...v, phase: to, ...(to !== "discovery" && !v.core ? { core: { promise: "", promised_to: "", must_not: "", competence: "" } } : {}) };
  const scratch = mkdtempSync(join(tmpdir(), "freshness-"));
  writeFileSync(join(scratch, "venture.json"), JSON.stringify(next));
  const ok = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "venture.schema.json", "--file", join(scratch, "venture.json")], { encoding: "utf8" });
  rmSync(scratch, { recursive: true, force: true });
  if (ok.status !== 0) return { ok: false, error: `venture.json would not match its schema:\n${(ok.stdout + ok.stderr).trim()}` };
  const agent = by ?? agentFromEnv("person", "router");
  // The log goes first: it can refuse, and a refused move must leave the phase where it was.
  const stamp = iso(Math.max(nowOf(now), ...events(dir).map((e) => Date.parse(e.at) + 1)));
  const w = append(dir, { at: stamp, event: "phase", from, to, reason }, agent);
  writeFileSync(file, JSON.stringify(next, null, 2) + "\n");
  prov(dir, /** @type {Parameters<typeof prov>[1]} */ ({ entity: "venture.json", activity: "write", agent, note: `phase ${from} -> ${to}${reason ? `: ${reason}` : ""}` }));
  const P = profiles(dir);
  const due = recordFiles(dir).filter((i) => P.profiles[profileFor(P, i.record, i.route)].per_phase).map((i) => i.path);
  return { ok: true, result: { venture: v.id, from, to, at: stamp, stale: due, provenance: w.provenance, note: `${count(due.length, "record")} with a per-phase profile ${due.length === 1 ? "is" : "are"} stale until checked or redone in ${to}${next.core && !v.core ? "; fill in the core product in venture.json" : ""}` } };
}

/**
 * Freezes the venture into a static shell at out (V-3, with C-11): every record that is not a live
 * hole and has not expired is copied in; live records stay holes, named in shell.json with the
 * route that reads them. Refuses when a record has expired (it must be checked first) or when out
 * is a routed folder inside the venture.
 * @param {string} dir
 * @param {string} out
 * @param {{ now?: string | number }} [opts]
 * @returns {Promise<Outcome<{ out: string, frozen: number, stale: number, holes: string[], note: string }>>}
 */
export async function freeze(dir, out, { now } = {}) {
  const f = await freshness(dir, { now });
  if (f.shell.blocked.length) return { ok: false, error: `cannot freeze: ${count(f.shell.blocked.length, "record")} ${f.shell.blocked.length === 1 ? "has" : "have"} expired (${f.shell.blocked.join(", ")}); check or redo them first`, blocked: f.shell.blocked };
  const target = resolvePath(out);
  const rel = relative(dir, target);
  if (!rel.startsWith("..") && !isAbsolute(rel) && !rel.split("/")[0].startsWith(".")) return { ok: false, error: `${out} is inside the venture: freeze into a folder outside it, or under a dot folder such as .release/` };
  const byPath = new Map(f.items.map((i) => [i.path, i]));
  mkdirSync(target, { recursive: true });
  for (const p of f.shell.frozen) { mkdirSync(dirname(join(target, p)), { recursive: true }); copyFileSync(ventureFile(dir, p), join(target, p)); }
  const manifest = {
    venture: f.venture, phase: f.phase, frozen_at: f.now,
    frozen: f.shell.frozen.map((p) => { const i = byPath.get(p); return { path: p, route: i.route, record: i.record, state: i.state, sha256: createHash("sha256").update(readFileSync(ventureFile(dir, p))).digest("hex"), ...(i.state === "stale" ? { reasons: i.reasons.map((r) => r.note) } : {}) }; }),
    holes: f.shell.holes.map((p) => { const i = byPath.get(p); return { path: p, route: i.route, record: i.record, profile: i.profile, read: `mentura ${i.route} read --venture ${f.venture}` }; }),
  };
  writeFileSync(join(target, "shell.json"), JSON.stringify(manifest, null, 2) + "\n");
  return { ok: true, result: { out: target, frozen: manifest.frozen.length, stale: manifest.frozen.filter((x) => x.state === "stale").length, holes: manifest.holes.map((h) => h.path), note: `froze ${count(manifest.frozen.length, "record")} into ${target}/shell.json${manifest.holes.length ? `; ${count(manifest.holes.length, "live hole")} ${manifest.holes.length === 1 ? "stays" : "stay"} read from their source: ${manifest.holes.map((h) => h.route).join(", ")}` : ""}` } };
}

function text(f) {
  const lines = [`${f.venture} (${f.phase}) at ${f.now}: ${f.summary.fresh} fresh, ${f.summary.stale} stale, ${f.summary.expired} expired, ${count(f.summary.holes, "live hole")}, of ${count(f.summary.records, "record")}.`];
  for (const i of f.items.filter((x) => x.state !== "fresh")) lines.push(`  ${i.state.padEnd(7)} ${i.route} (${i.profile})${i.hole ? " [hole]" : ""}: ${i.reasons.map((r) => r.note).join("; ")}`);
  for (const c of f.copies.filter((x) => x.state !== "fresh")) lines.push(`  ${c.state.padEnd(7)} ${c.path} (copy of ${c.parent}): ${c.note}`);
  for (const w of f.warnings) lines.push(`warning: ${w}`);
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const json = argv.includes("--json");
  const dir = argv[0] && !argv[0].startsWith("--") ? resolvePath(argv[0]) : null;
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node schema/freshness.mjs <venture dir> [--json] [--now <iso>] | --revalidate <target> [--reason <text>] | --freeze <out dir>"); process.exit(2); }
  try {
    const now = opt("now");
    let r;
    if (opt("revalidate") !== undefined) r = await revalidate(dir, opt("revalidate"), { reason: opt("reason"), now });
    else if (opt("freeze") !== undefined) r = await freeze(dir, opt("freeze"), { now });
    else { const f = await freshness(dir, { now }); console.log(json ? JSON.stringify(f, null, 2) : text(f)); process.exit(0); }
    if (!r.ok) { console.error(r.error + (r.suggest ? `\n  ${r.suggest.join("\n  ")}\n  or, for the whole folder: ${r.or}` : "")); process.exit(1); }
    console.log(json ? JSON.stringify(r.result, null, 2) : r.result.note ?? JSON.stringify(r.result, null, 2));
  } catch (e) { console.error(String(e.message ?? e)); process.exit(1); }
}
