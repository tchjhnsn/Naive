// Releases (C-10 to C-18, H-4, N-10, P-25, P-31, O-7, Z-3, I-17): naive build. A release is the
// venture's static shell (C-11): every record a person confirmed, frozen in as it was confirmed,
// with named holes for what must stay live (open decisions, streams, money, attributes another
// system of record masters, and answers computed per call). It is written to <venture>/.release/
// and read without the router (schema/release-read.mjs, schema/start-release.mjs).
//
//   build(dir, { now })        check every open package can be released and write the release
//   add(dir, route, { now })   add one new item to the release without rebuilding the rest (C-18)
//   exportRelease(dir, out)    the release as plain files, with no holes and every number dated (Z-3)
//   cardOf(dir, manifest)      the release card's data, assembled from the release's records (O-7)
//
// The rules, in the order the ledger gives them:
//   C-10  Reading the venture's files is predictable, so it goes into a release with no step of
//         its own: build walks the venture and freezes what it finds. Nothing calls a model and
//         "now" is an input (--now), so the same venture gives the same release id.
//   C-11  Frozen: a record whose last change a person made or confirmed, unchanged since (its sha256
//         matches the provenance log). Holes: open decisions, _streams/, money accounts, attributes
//         mastered in another source, and command routes that read runtime data (H-4).
//   C-13  Every open package (schema/packages.mjs, "now") must be releasable: no record it requires
//         may be an agent's unconfirmed write, a waiting draft with nothing confirmed, or changed since
//         it was confirmed (an unconfirmed optional record is left out instead). Build names each blocker with the command that settles it and exits 1.
//         Missing records are gaps the release names; they do not block it.
//   C-14  Holes sit at the leaves: one decision, one stream, one money account, one field. The rest
//         of the record, item or package is still frozen, and each package reports its shell share.
//   C-17  Three stores: the release (in .release/, meant for git), the local cache in .naive/cache/
//         (never released), and the agent's session (the harness's own). The cache key holds the
//         framework version, every package definition and MENTURA_MODEL; change any and it starts fresh.
//   H-4   A command route whose code (followed through its imports) reads the clock, calls a model,
//         reaches the network or reads a stream is a live hole. Any other is run at build time
//         against the confirmed records alone, and its answer is frozen in.
//   N-10  Collection items known at build time are enumerated and frozen, one entry each.
//   P-31  Only confirmed records ship. Drafts, _private/, raw inputs and notes (files that are not
//         records) never enter a release; private records and private_fields are withheld.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve as resolvePath } from "node:path";
import { call, glob, routes } from "../interface/router.mjs";
import { agentFromEnv, entries as provEntries, record as prov } from "../interface/provenance.mjs";
import { attributeSources, connect } from "../knowledge/connectors/index.mjs";
import { FRAME, confirmedIn } from "./foundation.mjs";
import { HOME, packages } from "./packages.mjs";
import { CARD, MANIFEST, RECORDS, RELEASE_DIR, frozenText, readRelease } from "./release-read.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const sha = (s) => createHash("sha256").update(s).digest("hex");
const sorted = (x) => Array.isArray(x) ? x.map(sorted) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted(x[k])])) : x;
const stamp = (d) => new Date(d).toISOString().replace(/\.\d+Z$/, "Z");
const CLI = "node interface/cli/mentura.mjs";

export const CACHE = ".naive/cache/release.json";
/** Record types that stay live: never frozen, always a hole (C-11, V-3). */
export const LIVE = { "money-account": "money moves between builds; read the account live", "data-stream": "a stream is append-only activity; read it live" };
/** Record types that are inputs or generated views, never shipped (P-31). */
export const NOT_SHIPPED = { "idea-dump": "raw input: the founder's notes", "raw-source": "raw input", "raw-text": "raw input", "venture-package": "a generated view", provenance: "the log itself", release: "the release itself" };

// ---- the cache key (C-17) ----

/** What a release and its cache are keyed by: the framework version, the package definitions and the model. */
export function key() {
  const pk = readdirSync(join(repo, "packages")).filter((n) => existsSync(join(repo, "packages", n, "package.json"))).sort()
    .map((n) => readFileSync(join(repo, "packages", n, "package.json"), "utf8"));
  return { framework: readFileSync(join(repo, "schema/VERSION"), "utf8").trim(), packages: sha(readFileSync(join(repo, "packages/catalog.json"), "utf8") + pk.join("\n")).slice(0, 16), model: process.env.MENTURA_MODEL ?? null };
}

/** The local cache for a key: { entries, hits, misses, fresh, get(k, f), save() }. A different key starts it fresh. */
export function openCache(dir, k = key()) {
  const f = join(dir, CACHE);
  const kh = sha(JSON.stringify(k)).slice(0, 16);
  let old = null;
  try { old = existsSync(f) ? load(f) : null; } catch { old = null; }
  const fresh = !old || old.key_hash !== kh;
  const c = { key: k, key_hash: kh, fresh, previous_key: fresh && old ? old.key : null, entries: fresh ? {} : old.entries ?? {}, hits: 0, misses: 0 };
  c.get = (id, compute) => { if (id in c.entries) { c.hits++; return c.entries[id]; } c.misses++; const v = compute(); c.entries[id] = v; return v; };
  c.save = () => {
    mkdirSync(dirname(f), { recursive: true });
    if (!existsSync(join(dir, ".naive/.gitignore"))) writeFileSync(join(dir, ".naive/.gitignore"), "# Generated locally by Naive; never released or committed (C-17).\n*\n");
    writeFileSync(f, JSON.stringify({ key_hash: kh, key: k, entries: c.entries }) + "\n");
  };
  return c;
}

// ---- the venture's files (C-10) ----

/** Every file of a venture, relative: skips dot folders, nested ventures and _-folders other than _streams. */
export function ventureFiles(dir, sub = "") {
  return readdirSync(join(dir, sub), { withFileTypes: true }).flatMap((e) => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.name.startsWith(".") || e.name === "node_modules") return [];
    if (e.isDirectory()) return existsSync(join(dir, rel, "venture.json")) || (e.name.startsWith("_") && e.name !== "_streams") ? [] : ventureFiles(dir, rel);
    return [rel];
  });
}

// The record routes, each with a matcher from a venture-relative file to the concrete route.
function matchers() {
  return routes().filter((r) => r.kind === "record" && r.collection !== "list").flatMap((r) => r.files.map((g) => ({ r, re: glob(g), g })));
}
function routeOf(file, ms) {
  const hit = ms.find((m) => m.re.test(file));
  if (!hit) return null;
  if (hit.r.collection !== "item") return { route: hit.r.route, template: hit.r.route, record: hit.r.record, r: hit.r };
  const re = new RegExp("^" + hit.g.split("*").map((s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$");
  const id = file.match(re)?.[1];
  return { route: hit.r.route.replace("[id]", id), template: hit.r.route, record: hit.r.record, id, r: hit.r };
}

// ---- confirmation (C-11, P-31) ----

const who = (a) => a?.id ?? (a?.kind === "person" ? `a person (via ${a.via ?? "cli"})` : a?.kind ?? "unknown");

/**
 * Whether a person confirmed this file as it is now: { by, at } or null with why. A person's write or
 * accept, a person's baseline, or a confirm of every foundation statement in it, after the last
 * agent write, and the file unchanged since the last entry (its sha256 matches).
 */
export function confirmation(dir, file, type, log) {
  const es = log.filter((e) => e.entity === file);
  if (!es.length) return { ok: false, why: "no provenance entry: written outside the router", fix: "baseline" };
  const last = es.at(-1);
  const now = sha(readFileSync(join(dir, file)));
  if (last.sha256 && last.sha256 !== now) return { ok: false, why: "changed since its last provenance entry", fix: "rewrite" };
  const statements = FRAME.questions.flatMap((q) => q.statements).filter((s) => s.record === type && s.id);
  const ok = confirmedIn(dir, file, null) || (statements.length > 0 && statements.every((s) => confirmedIn(dir, file, s.id)));
  if (!ok) return { ok: false, why: "an agent wrote it and no person has confirmed it", fix: statements.length ? "confirm" : "rewrite", statements: statements.map((s) => s.id) };
  const by = [...es].reverse().find((e) => e.agent?.kind === "person" || e.activity === "accept");
  return { ok: true, by: who(by?.agent), at: by?.at ?? last.at };
}

function fixFor(c, { route, file, venture }) {
  if (c.fix === "baseline") return `${CLI} baseline --venture ${venture} --as person`;
  if (c.fix === "confirm") return c.statements.map((s) => `${CLI} confirm ${s} --venture ${venture} --confirm ${s}`).join(" && ");
  if (c.fix === "accept") return `${CLI} accept ${route} --venture ${venture}`;
  return `${CLI} ${route} write --venture ${venture} --input ${file} --as person`;
}

// ---- command routes (H-4) ----

/** Follows a script's relative imports and reports what runtime data its code reads. */
export function runtimeReads(script, seen = new Set()) {
  const f = resolvePath(repo, script);
  const reads = new Set();
  const walk = (p) => {
    if (seen.has(p) || !existsSync(p)) return;
    seen.add(p);
    const text = readFileSync(p, "utf8");
    const code = text.replace(/^\s*\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
    if (/Date\.now\(\)|new Date\(\)/.test(code)) reads.add("the clock");
    if (/MENTURA_AGENT_CMD|["']claude["']|jev-latest|use_model\s*\(/.test(code)) reads.add("a model");
    if (/\bfetch\(/.test(code)) reads.add("the network");
    if (/_streams/.test(code)) reads.add("a stream");
    for (const m of text.matchAll(/(?:from|import\()\s*["'](\.{1,2}\/[^"']+)["']/g)) walk(resolvePath(dirname(p), m[1]));
  };
  walk(f);
  return [...reads].sort();
}

/** How each command route enters a release: frozen when it reads no runtime data, else a hole. */
export function commandPlan() {
  return routes().filter((r) => r.kind === "command").map((r) => {
    if (r.internal === "overview") return { route: r.route, in: "hole", why: "composes the live slots and the recent provenance" };
    if (r.internal === "robots") return { route: r.route, in: "release", why: "reads only the team plan" };
    if (!r.actions.includes("run")) return { route: r.route, in: "hole", why: "no run action" };
    if (r.value_flag) return { route: r.route, in: "hole", why: "takes its input per call" };
    const reads = runtimeReads(r.script);
    return reads.length ? { route: r.route, in: "hole", why: `reads ${reads.join(", ")}`, reads } : { route: r.route, in: "release", why: "reads only the venture's records" };
  });
}

// ---- the survey: what is frozen, what is a hole, what is left out, what blocks ----

function stripPrivate(text, file) {
  if (!file.endsWith(".json")) return { text, withheld: [] };
  const o = JSON.parse(text);
  const fields = Array.isArray(o.private_fields) ? o.private_fields : [];
  if (!fields.length) return { text, withheld: [] };
  for (const f of fields) delete o[f];
  return { text: JSON.stringify(o, null, 2) + "\n", withheld: fields };
}

/** Everything a release would hold, read from the venture as it is. Writes nothing. */
export async function survey(dir, { cache } = {}) {
  const v = load(join(dir, "venture.json"));
  const log = provEntries(dir);
  const ms = matchers();
  const files = ventureFiles(dir);
  const frozen = [], holes = [], leftOut = [], blockers = [], privateCount = { records: 0, folder: 0 };
  const streams = new Map();
  for (const file of files) {
    if (["venture.json", "provenance.jsonl", "AGENTS.md"].includes(file) || file.endsWith(".gitkeep")) continue;
    const stream = file.match(/^(.*\/_streams\/[^/]+)\//);
    if (stream) { if (!streams.has(stream[1])) streams.set(stream[1], file); continue; }
    if (file.endsWith(".decision.json") && file.split("/").at(-2) === "decisions") {
      const d = load(join(dir, file));
      const ro = routeOf(file, ms);
      if (d.status === "decided") frozen.push({ file, record: "decision-record", route: ro?.route ?? `decisions/${d.id}`, route_template: ro?.template ?? "decisions/[id]", ...(ro?.id ? { id: ro.id } : {}),
        as_of: d.provenance?.approved_at ?? null, confirmed_by: d.provenance?.approved_by ?? d.decided_by ?? "a person" });
      else if (["open", "deferred"].includes(d.status)) holes.push({ kind: "decision", name: d.id, file, record: "decision-record", route: ro?.route ?? `decisions/${d.id}`, route_template: ro?.template ?? "decisions/[id]",
        decides: d.decides?.record ?? null, why: `open decision: ${d.question}`, live: `${CLI} governance/decisions run --venture ${v.id}`, to_freeze: `decide it: ${CLI} decide ${d.id} --venture ${v.id} --by <your name>` });
      else leftOut.push({ file, why: `decision ${d.status}` });
      continue;
    }
    const ro = routeOf(file, ms);
    const type = ro?.record ?? null;
    if (!type) { leftOut.push({ file, why: "not a record: notes and readmes never ship" }); continue; }
    if (NOT_SHIPPED[type]) { leftOut.push({ file, why: NOT_SHIPPED[type] }); continue; }
    if (LIVE[type]) { holes.push({ kind: type === "money-account" ? "money" : "stream", name: ro.id ?? file, file, record: type, route: ro.route, route_template: ro.template, why: LIVE[type], live: `${CLI} ${ro.route} read --venture ${v.id}`, to_freeze: "stays live by design: confirm a dated summary record to freeze a number" }); continue; }
    const text = readFileSync(join(dir, file), "utf8");
    let parsed = null;
    if (file.endsWith(".json")) { try { parsed = JSON.parse(text); } catch { blockers.push({ file, route: ro.route, record: type, why: "not valid JSON", fix: `fix ${file}` }); continue; } }
    if (parsed?.private === true) { privateCount.records++; continue; }
    const c = confirmation(dir, file, type, log);
    if (!c.ok) { blockers.push({ file, route: ro.route, record: type, why: c.why, fix: fixFor(c, { route: ro.route, file, venture: v.id }) }); continue; }
    // C-14: an attribute mastered in another source is a hole at the field; the rest of the record is frozen.
    let attrs = [];
    try { attrs = file.endsWith(".json") ? attributeSources(dir, type, ro.r.collection === "item" && (type === "product" || type === "account") ? { [type]: ro.id } : {}) : []; } catch { attrs = []; }
    if (ro.r.schema && file.endsWith(".json")) {
      // The schema is checked on the whole record, with each attribute as its system of record holds it, as a read sees it.
      let whole = parsed;
      for (const a of attrs) {
        try { const got = await (await connect(a.source, dir)).read(file); const val = got ? JSON.parse(got.content)[a.attribute] : undefined; if (val !== undefined) whole = { ...whole, [a.attribute]: val }; } catch {}
      }
      const wholeText = JSON.stringify(whole);
      const bad = (cache ?? { get: (_, f) => f() }).get(`schema:${ro.r.schema}:${sha(wholeText)}`, () => {
        const tmp = mkdtempSync(join(tmpdir(), "naive-release-check-"));
        try {
          writeFileSync(join(tmp, "record.json"), wholeText);
          const p = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", ro.r.schema.replace(/^schema\//, ""), "--file", join(tmp, "record.json")], { encoding: "utf8" });
          return p.status === 0 ? null : (p.stdout + p.stderr).trim().split("\n").slice(-3).join(" ");
        } finally { rmSync(tmp, { recursive: true, force: true }); }
      });
      if (bad) { blockers.push({ file, route: ro.route, record: type, why: `does not match ${ro.r.schema}: ${bad}`, fix: `${CLI} ${ro.route} check --venture ${v.id}` }); continue; }
    }
    const { text: shipped, withheld } = stripPrivate(text, file);
    let out = shipped;
    if (attrs.length) {
      const o = JSON.parse(out);
      for (const a of attrs) {
        delete o[a.attribute];
        holes.push({ kind: "attribute", name: `${ro.route}.${a.attribute}`, file, record: type, field: a.attribute, route: ro.route, route_template: ro.template, why: `${type}.${a.attribute} is mastered in ${a.source.id}`, live: `${CLI} ${ro.route} read --venture ${v.id}`, to_freeze: "stays live: its system of record is elsewhere" });
      }
      out = JSON.stringify(o, null, 2) + "\n";
    }
    frozen.push({ file, record: type, route: ro.route, route_template: ro.template, ...(ro.id ? { id: ro.id } : {}), as_of: c.at, confirmed_by: c.by, text: out, ...(withheld.length ? { withheld_fields: withheld } : {}) });
  }
  for (const [d, first] of streams) {
    const id = d.split("/").at(-1);
    holes.push({ kind: "stream", name: d, file: first, record: "data-stream", stream: id, route: d, route_template: null, why: "a stream is append-only activity; it is never frozen", live: `read ${d}/ in the venture`, to_freeze: "stays live by design" });
  }
  if (existsSync(join(dir, "_private"))) privateCount.folder = ventureFilesAll(join(dir, "_private")).length;
  // Drafts (P-31): never shipped. One with no confirmed record behind it blocks its package.
  const drafts = existsSync(join(dir, "_drafts")) ? readdirSync(join(dir, "_drafts")).filter((f) => f.endsWith(".draft")) : [];
  for (const d of drafts) {
    const file = d.replace(/\.draft$/, "").replace(/__/g, "/");
    const ro = routeOf(file, ms);
    if (frozen.some((x) => x.file === file)) { leftOut.push({ file: `_drafts/${d}`, why: "a draft waits; the confirmed version ships" }); continue; }
    if (blockers.some((x) => x.file === file)) continue;
    blockers.push({ file: `_drafts/${d}`, route: ro?.route ?? file, record: ro?.record ?? null, draft: true, why: "a draft waits for a person and nothing confirmed stands behind it", fix: fixFor({ fix: "accept" }, { route: ro?.route ?? file, venture: v.id }) });
  }
  return { venture: v, frozen, holes, left_out: leftOut, blockers, private: privateCount };
}
function ventureFilesAll(d) { return readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? ventureFilesAll(join(d, e.name)) : [e.name]); }

// ---- packages (C-13, C-14) ----

/** Each open package: frozen, holes, gaps and blockers, whether it can be released, and its shell share. */
export function packagePlan(dir, s) {
  const p = packages(dir);
  return p.core.filter((x) => x.in === "now").map((pk) => {
    const types = new Set(pk.records.filter((r) => r.role !== "reads").map((r) => r.record));
    const mine = (x) => types.has(x.record) || (x.kind === "decision" && types.has(x.decides));
    const frozen = s.frozen.filter(mine).map((x) => x.file);
    const holes = s.holes.filter(mine).map((h) => h.name);
    // Only a required record blocks: an unconfirmed optional one is left out of the release.
    const required = new Set(pk.records.filter((r) => r.role === "required").map((r) => r.record));
    const blockers = s.blockers.filter((b) => required.has(b.record));
    const present = new Set([...s.frozen, ...s.blockers].map((x) => x.record));
    const gaps = pk.records.filter((r) => r.role === "required" && !present.has(r.record) && !s.holes.some((h) => h.record === r.record)).map((r) => r.record);
    const total = frozen.length + holes.length;
    return { id: pk.id, title: pk.title, releasable: blockers.length === 0, frozen, holes, gaps, blockers: blockers.map((b) => b.file), shell: total ? Math.round((frozen.length / total) * 100) / 100 : null };
  });
}

// ---- running the frozen commands against the confirmed records alone (H-4, C-10) ----

async function frozenCommands(dir, v, frozen, plan, cache, log) {
  const ws = mkdtempSync(join(tmpdir(), "naive-release-"));
  const shadow = join(ws, v.id);
  try {
    mkdirSync(shadow, { recursive: true });
    writeFileSync(join(shadow, "venture.json"), JSON.stringify(v, null, 2) + "\n");
    for (const f of frozen) { mkdirSync(dirname(join(shadow, f.file)), { recursive: true }); writeFileSync(join(shadow, f.file), f.text ?? readFileSync(join(dir, f.file), "utf8")); }
    // The log, so confirmations hold in the copy; the release's own entries are left out of the key.
    const kept = log.filter((e) => !(e.activity === "release" && e.entity === MANIFEST));
    writeFileSync(join(shadow, "provenance.jsonl"), log.map((e) => JSON.stringify(e)).join("\n") + (log.length ? "\n" : ""));
    const inputs = sha(JSON.stringify([v, frozen.map((f) => [f.file, sha(f.text ?? "")]), kept.map((e) => e.hash)]));
    const out = {};
    for (const c of plan.filter((x) => x.in === "release")) {
      const got = await cacheAsync(cache, `command:${c.route}:${inputs}`, async () => {
        const r = await call({ venture: v.id, route: c.route, action: "run", workspace: ws, via: "release" });
        if (!r.ok || r.needs_input) return { empty: r.ok ? "needs input before it runs" : String(r.error).split("\n")[0].replaceAll(shadow, ".").replaceAll(ws, ".") };
        return { result: JSON.parse(JSON.stringify(r.result ?? null).replaceAll(shadow, ".").replaceAll(ws, ".")) };
      });
      out[c.route] = got;
    }
    return out;
  } finally { rmSync(ws, { recursive: true, force: true }); }
}
async function cacheAsync(cache, id, compute) {
  if (id in cache.entries) { cache.hits++; return cache.entries[id]; }
  cache.misses++;
  const v = await compute();
  cache.entries[id] = v;
  return v;
}

// ---- the manifest ----

function routeTable(s, plan, commands) {
  const has = new Set(s.frozen.map((f) => f.route_template));
  const holeTemplates = new Set(s.holes.filter((h) => h.kind !== "attribute").map((h) => h.route_template));
  return routes().map((r) => {
    if (r.kind === "command") {
      const c = plan.find((x) => x.route === r.route);
      if (c.in === "hole") return { route: r.route, kind: "command", in: "hole", why: c.why, live: `${CLI} ${r.route} run --venture ${s.venture.id}` };
      const got = commands[r.route];
      return { route: r.route, kind: "command", in: got?.empty ? "empty" : "release", why: got?.empty ?? c.why };
    }
    const base = { route: r.route, kind: "record", record: r.record, ...(r.collection ? { collection: r.collection } : {}) };
    if (NOT_SHIPPED[r.record]) return { ...base, in: "left out", why: NOT_SHIPPED[r.record] };
    if (LIVE[r.record]) return { ...base, in: "hole", why: LIVE[r.record], live: `${CLI} ${r.route.replace("/[id]", "")} read --venture ${s.venture.id}` };
    const item = r.collection === "list" ? `${r.route}/[id]` : r.route;
    if (has.has(item) || has.has(r.route) || holeTemplates.has(item)) return { ...base, in: "release" };
    return { ...base, in: "empty", why: "no confirmed record when the release was built" };
  });
}

const releaseId = (m) => sha(JSON.stringify(sorted({ venture: m.venture, phase: m.phase, key: m.key, records: m.records, holes: m.holes, routes: m.routes, commands: m.commands, packages: m.packages }))).slice(0, 16);

/** The release card's data (P-25, O-7): name, phase, the headline numbers with their dates, and who confirmed them. */
export function cardOf(dir, m) {
  const latest = (rs) => rs.map((r) => r.as_of).filter(Boolean).sort().at(-1) ?? null;
  const people = (rs) => [...new Set(rs.map((r) => r.confirmed_by).filter(Boolean))];
  const count = (label, type) => { const rs = m.records.filter((r) => r.record === type); return rs.length ? [{ label, value: rs.length, as_of: latest(rs), confirmed_by: people(rs) }] : []; };
  const headline = [{ label: "Confirmed records", value: m.records.length, as_of: latest(m.records), confirmed_by: people(m.records) },
    ...count("Products", "product"), ...count("Customers", "customer"), ...count("Evidence", "evidence"), ...count("Decisions made", "decision-record")];
  const pricing = m.records.find((r) => r.record === "validation-pricing");
  if (pricing) {
    const pt = (JSON.parse(frozenText(dir, pricing.file) ?? "{}").points ?? []).find((x) => typeof x.amount === "number");
    if (pt) headline.push({ label: "Price", value: pt.amount, unit: [pt.currency, pt.per ?? pt.period].filter(Boolean).join(" per ") || null, as_of: pricing.as_of, confirmed_by: [pricing.confirmed_by] });
  }
  headline.push({ label: "Live holes", value: m.holes.length, as_of: m.now, confirmed_by: [] });
  return { venture: m.venture, name: m.name, phase: m.phase, release: m.release, built_at: m.built_at, headline,
    confirmed_by: people(m.records), packages: m.packages.map((p) => ({ title: p.title, shell: p.shell, gaps: p.gaps.length })),
    note: "Assembled by code from the release's records. Drawing it is the interface's job (interface/release-card.mjs)." };
}

function checks(dir) {
  const fails = [];
  for (const c of ["schema/check-provenance.mjs", "schema/check-private.mjs"]) {
    const p = spawnSync("node", [join(repo, c), dir], { encoding: "utf8" });
    if (p.status !== 0) fails.push({ check: c, output: (p.stderr || p.stdout).trim().split("\n").slice(0, 5).join("\n") });
  }
  return fails;
}

function writeRelease(dir, m, frozen) {
  const stage = join(dir, RELEASE_DIR, `.stage-${process.pid}`);
  rmSync(stage, { recursive: true, force: true });
  for (const f of frozen) {
    const dest = join(stage, "records", f.file);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, f.text ?? readFileSync(join(dir, f.file), "utf8"));
  }
  mkdirSync(join(stage, "records"), { recursive: true });
  rmSync(join(dir, RECORDS), { recursive: true, force: true });
  renameSync(join(stage, "records"), join(dir, RECORDS));
  rmSync(stage, { recursive: true, force: true });
  writeFileSync(join(dir, MANIFEST), JSON.stringify(m, null, 2) + "\n");
  writeFileSync(join(dir, CARD), JSON.stringify(cardOf(dir, m), null, 2) + "\n");
}

const strip = ({ text, ...rest }) => ({ ...rest, sha256: sha(text ?? "") });

/**
 * naive build: survey the venture, check every open package can be released, and write the release.
 * Returns { ok, manifest } or { ok: false, blockers, failed_checks, packages }.
 */
export async function build(dir, { now = new Date().toISOString(), actor = "person", dryRun = false } = {}) {
  dir = resolvePath(dir);
  if (!existsSync(join(dir, "venture.json"))) return { ok: false, error: `${dir} is not a venture (no venture.json)` };
  const cache = openCache(dir);
  const s = await survey(dir, { cache });
  const pk = packagePlan(dir, s);
  const failed = checks(dir);
  const blocking = pk.filter((p) => !p.releasable);
  const blockers = s.blockers.filter((b) => blocking.some((p) => p.blockers.includes(b.file)));
  // An unconfirmed record outside every open package is left out, not a blocker.
  const leftOut = [...s.left_out, ...s.blockers.filter((b) => !blockers.includes(b)).map((b) => ({ file: b.file, why: `${b.why}; not required by an open package, so left out`, fix: b.fix }))];
  if (blockers.length || failed.length) { cache.save(); return { ok: false, blockers, failed_checks: failed, packages: pk }; }
  const plan = commandPlan();
  const log = provEntries(dir);
  const commands = await frozenCommands(dir, s.venture, s.frozen, plan, cache, log);
  const m = {
    release: null, venture: s.venture.id, name: s.venture.name, phase: s.venture.phase,
    built_at: stamp(Date.now()), now: stamp(now), key: cache.key,
    records: s.frozen.map(strip).sort((a, b) => a.file.localeCompare(b.file)),
    holes: s.holes.sort((a, b) => a.name.localeCompare(b.name)),
    left_out: leftOut.sort((a, b) => a.file.localeCompare(b.file)), withheld: { private_records: s.private.records, private_folder_files: s.private.folder },
    packages: pk, routes: routeTable(s, plan, commands),
    items: Object.fromEntries([...new Set(s.frozen.filter((f) => f.id).map((f) => f.route_template))].sort().map((t) => [t, s.frozen.filter((f) => f.route_template === t).map((f) => f.id).sort()])),
    commands: Object.fromEntries(Object.entries(commands).filter(([, v]) => !v.empty).map(([k, v]) => [k, { result: v.result }])),
    incremental: [],
    cache: { key_hash: cache.key_hash, fresh: cache.fresh, hits: cache.hits, misses: cache.misses, ...(cache.previous_key ? { previous_key: cache.previous_key } : {}) },
  };
  m.release = releaseId(m);
  for (const c of Object.values(m.commands)) c.built_from = m.release;
  cache.save();
  if (dryRun) return { ok: true, manifest: m, dry_run: true };
  writeRelease(dir, m, s.frozen);
  prov(dir, { entity: MANIFEST, route: "system/release", activity: "release", agent: agentFromEnv(actor === "agent" ? "agent" : "person", "cli"), note: `release ${m.release}: ${m.records.length} records frozen, ${m.holes.length} live holes` });
  return { ok: true, manifest: m };
}

/** C-18: adds one item (a new customer, a new product) to the release, leaving the rest as built. */
export async function add(dir, route, { now = new Date().toISOString(), actor = "person" } = {}) {
  dir = resolvePath(dir);
  const m = readRelease(dir);
  if (!m) return { ok: false, error: `no release in ${dir}: build one first` };
  const r = routes().find((x) => x.kind === "record" && x.collection === "item" && route.startsWith(x.route.slice(0, -4)) && !route.slice(x.route.length - 4).includes("/"));
  if (!r) return { ok: false, error: `${route} is not a collection item route (such as product/<id>)` };
  const id = route.slice(r.route.length - 4);
  if (m.records.some((x) => x.route === route)) return { ok: false, error: `${route} is already in release ${m.release}; a full build updates it` };
  const file = r.files.map((g) => g.replace("*", id)).find((f) => existsSync(join(dir, f)));
  if (!file) return { ok: false, error: `no ${r.record} ${id} in the venture` };
  const s = await survey(dir);
  const hit = s.frozen.find((f) => f.file === file);
  if (!hit) {
    const b = s.blockers.find((x) => x.file === file);
    return { ok: false, error: `${route} cannot be added: ${b?.why ?? "it is not a record that ships"}`, ...(b ? { fix: b.fix } : {}) };
  }
  const before = m.release;
  m.records = [...m.records, strip(hit)].sort((a, b) => a.file.localeCompare(b.file));
  m.holes = [...m.holes, ...s.holes.filter((h) => h.file === file && !m.holes.some((x) => x.name === h.name))].sort((a, b) => a.name.localeCompare(b.name));
  m.items[r.route] = [...new Set([...(m.items[r.route] ?? []), id])].sort();
  for (const t of [r.route, r.route.slice(0, -5)]) { const e = m.routes.find((x) => x.route === t); if (e && e.in === "empty") { e.in = "release"; delete e.why; } }
  for (const p of m.packages) if (HOME[r.record] === p.id) { p.frozen = [...p.frozen, file]; p.gaps = p.gaps.filter((g) => g !== r.record); const t = p.frozen.length + p.holes.length; p.shell = t ? Math.round((p.frozen.length / t) * 100) / 100 : null; }
  m.incremental = [...(m.incremental ?? []), { route, file, from: before, at: stamp(now) }];
  m.release = releaseId(m);
  mkdirSync(dirname(join(dir, RECORDS, file)), { recursive: true });
  writeFileSync(join(dir, RECORDS, file), hit.text);
  writeFileSync(join(dir, MANIFEST), JSON.stringify(m, null, 2) + "\n");
  writeFileSync(join(dir, CARD), JSON.stringify(cardOf(dir, m), null, 2) + "\n");
  prov(dir, { entity: MANIFEST, route: "system/release", activity: "release", agent: agentFromEnv(actor === "agent" ? "agent" : "person", "cli"), note: `release ${m.release}: added ${route} to ${before} without rebuilding the rest` });
  return { ok: true, manifest: m, added: { route, file, from: before } };
}

// ---- export (Z-3) ----

function mdOf(x, depth = 0) {
  const pad = "  ".repeat(depth);
  if (x === null || x === undefined || x === "") return "";
  if (typeof x !== "object") return String(x);
  if (Array.isArray(x)) return x.map((e) => typeof e === "object" && e ? `${pad}-\n${mdOf(e, depth + 1)}` : `${pad}- ${e}`).join("\n");
  return Object.entries(x).filter(([, v]) => v !== null && v !== "" && !(Array.isArray(v) && !v.length)).map(([k, v]) => typeof v === "object" ? `${pad}- **${k}**\n${mdOf(v, depth + 1)}` : `${pad}- **${k}**: ${v}`).join("\n");
}

/** Z-3: the release as plain files in out/: Markdown and JSON, no live holes, every number dated. */
export function exportRelease(dir, out) {
  dir = resolvePath(dir); out = resolvePath(out);
  const m = readRelease(dir);
  if (!m) return { ok: false, error: `no release in ${dir}: build one first` };
  if (existsSync(out) && readdirSync(out).length) return { ok: false, error: `${out} exists and is not empty: an export never writes over files` };
  mkdirSync(out, { recursive: true });
  const card = JSON.parse(readFileSync(join(dir, CARD), "utf8"));
  const lines = [`# ${m.name}`, "", `Phase: ${m.phase}. Release ${m.release}, built ${m.built_at} as of ${m.now}.`, "", "## Headline numbers", "", "| Number | Value | As of | Confirmed by |", "| --- | --- | --- | --- |",
    ...card.headline.filter((h) => h.label !== "Live holes").map((h) => `| ${h.label} | ${h.value}${h.unit ? ` ${h.unit}` : ""} | ${h.as_of ?? m.now} | ${h.confirmed_by.join(", ") || "none"} |`), "", "## Records", "", "| Record | As of | Confirmed by |", "| --- | --- | --- |"];
  for (const r of m.records) {
    const text = frozenText(dir, r.file);
    mkdirSync(dirname(join(out, "records", r.file)), { recursive: true });
    writeFileSync(join(out, "records", r.file), text);
    if (r.file.endsWith(".json")) writeFileSync(join(out, "records", r.file.replace(/\.json$/, ".md")), `# ${r.route}\n\nAs of ${r.as_of}, confirmed by ${r.confirmed_by}. Frozen in release ${m.release}.\n\n${mdOf(JSON.parse(text))}\n`);
    lines.push(`| [${r.route}](records/${r.file.endsWith(".json") ? r.file.replace(/\.json$/, ".md") : r.file}) | ${r.as_of} | ${r.confirmed_by} |`);
  }
  lines.push("", `Not in this export: ${m.holes.length} live items (open decisions, streams, money and fields mastered elsewhere), read in the venture itself.`, "");
  writeFileSync(join(out, "README.md"), lines.join("\n"));
  const { holes, routes: rs, commands, left_out, cache, ...rest } = m;
  const exported = { ...rest, routes: rs.filter((r) => r.in === "release").map((r) => r.route), export: { at: stamp(Date.now()), as_of: m.now, live_left_out: holes.length, holes: 0 } };
  writeFileSync(join(out, "release.json"), JSON.stringify(exported, null, 2) + "\n");
  writeFileSync(join(out, "card.json"), JSON.stringify({ ...card, headline: card.headline.filter((h) => h.label !== "Live holes") }, null, 2) + "\n");
  return { ok: true, out, records: m.records.length, left_out_live: holes.length };
}

