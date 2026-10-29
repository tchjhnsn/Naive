#!/usr/bin/env node
// Context: what the router sends an agent, in what order, and what it costs. Naive's translation of
// Next.js Linking and Navigating, layouts that keep their state, prefetching, streaming and bundle
// size, for a client that is a model instead of a browser. Code decides everything here; no model
// is called.
//
//   navigate      read a route the AI-native way: header first, then the layout (once per session),
//                 the template (fresh every time), the record, and prefetched refs. Reached as the
//                 router actions navigate and head, the CLI and the MCP tool mentura_read.
//   header first  (O-4) a record's header (what it is, its state, its owner, its size) comes before
//                 its body; head stops there, so an agent can decide not to read on
//   layout        (L-2, N-7) the stable context, split into parts (the layer and package stack, each
//                 AGENTS.md, the merged instructions, the record's schema and gate). In a session each
//                 part is sent once and only again when it changes; a sibling route keeps the shared
//                 parts and swaps only the record's own
//   template      (P-12, F-6) what is recomputed on every action: the need-now ranking and the open
//                 decisions. It is never in the layout, and it runs with a time limit, so a slow
//                 computation never blocks the read
//   prefetch      (N-3, L-12) short summaries of the routes the agent is likely to need next: the
//                 record's refs and links, the records it reads first and the ones that wait on it
//                 (the after links in packages/catalog.json), and the need-now next step. Confirmed
//                 records come in full when small, changing ones send only their state (N-4); large
//                 collections send a count unless the task names them (N-12); every entry costs
//                 tokens from the prefetch budget (C-16)
//   budget        (N-13) each route has a context budget in tokens, measured like bundle size; every
//                 answer reports what it used, and budget() reports every route of a venture with its
//                 largest part and where to move it (S-14: give context as low in the tree as it is
//                 needed; F-6: keep computed values out of layouts)
//   streaming     (N-5, N-9) parts are handed to onPart as they are ready; a computed (command) route
//                 answers at once with its state and the last result, then the new one. runStreaming
//                 and batch report progress, which the MCP server sends as progress notifications
//
// Settings come from "context" in the venture's naive.config.json:
//   { "context": { "budget": 6000, "routes": { "purpose/**": 4000 }, "prefetch_budget": 1500,
//                  "large_collection": 20, "full_max": 800, "template_ms": 3000 } }
// A scoped instruction applies only under its routes: a line "[purpose/validation/**] key: value" in
// any AGENTS.md (the router's plain layout ignores it, so other routes do not pay for it).
//
//   node interface/context.mjs <venture dir> budget [--check] [--json]

import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { call, draftOf, gateOf, glob, layout as routerLayout, resolve, routes, ventureDir } from "./router.mjs";
import { entries as provEntries } from "./provenance.mjs";
import { tokens } from "./instrumentation.mjs";

const here = dirname(new URL(import.meta.url).pathname);
const repoRoot = join(here, "..");
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const sha = (x) => createHash("sha256").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex").slice(0, 16);

export const DEFAULTS = { budget: 6000, prefetch_budget: 1500, large_collection: 20, full_max: 800, template_ms: 3000 };
// Keys that hold computed values: they belong in the template, never in a layout (F-6).
export const COMPUTED = ["need_now", "need-now", "next", "ranking", "rank", "open_decisions", "decisions", "status", "todo", "due"];

/** The venture's context settings: the defaults, overridden by naive.config.json context. */
export function settings(dir) {
  const f = dir && join(dir, "naive.config.json");
  let c = {};
  try { if (f && existsSync(f)) c = load(f).context ?? {}; } catch {}
  return { ...DEFAULTS, ...c };
}

/** A route's context budget in tokens: the first matching glob in context.routes, else the default. */
export function budgetFor(set, route) {
  const hit = Object.entries(set.routes ?? {}).find(([g]) => glob(g).test(route));
  return hit ? hit[1] : set.budget;
}

// ---------------------------------------------------------------------------------------------
// Header first (O-4)

/** The state of one venture file: missing, draft waiting, agent-written, confirmed, baseline or unlogged. */
export function stateOf(dir, file, draft) {
  if (draft && existsSync(join(dir, draft))) return { state: "draft waiting", draft };
  if (!file || !existsSync(join(dir, file))) return { state: "missing" };
  let state = "unlogged", last = null;
  for (const e of provEntries(dir).filter((x) => x.entity === file)) {
    last = e;
    if (e.activity === "baseline") state = "baseline";
    else if (e.activity === "accept" || e.activity === "confirm" || e.agent?.kind === "person") state = "confirmed";
    else if (e.agent?.kind === "agent") state = "agent-written";
  }
  return { state, ...(last ? { updated: last.at, by: `${last.agent?.kind ?? "unknown"}${last.agent?.id ? ` ${last.agent.id}` : ""}` } : {}) };
}

const TITLE = ["name", "title", "statement", "claim", "end", "question", "promise", "summary", "description", "id"];
/** A one-line summary of a record: its first naming field, cut to 140 characters. */
export function titleOf(rec) {
  if (rec === null || rec === undefined) return null;
  if (typeof rec === "string") return rec.split("\n").find((l) => l.trim())?.replace(/^#+\s*/, "").slice(0, 140) ?? null;
  if (typeof rec !== "object" || Array.isArray(rec)) return null;
  for (const k of TITLE) if (typeof rec[k] === "string" && rec[k].trim()) return rec[k].slice(0, 140);
  for (const v of Object.values(rec)) if (v && typeof v === "object" && !Array.isArray(v)) { const t = titleOf(v); if (t) return t; }
  const s = Object.values(rec).find((v) => typeof v === "string" && v.trim());
  return s ? s.slice(0, 140) : null;
}

function ownerOf(r, dir, route) {
  const g = r.kind === "record" ? gateOf(r, dir) : null;
  if (g?.owner) return g.owner;
  const plan = [join(dir, "people/team-plan.json"), join(dir, "operations/team-plan.json")].find((p) => existsSync(p));
  if (!plan) return null;
  try { return load(plan).roles.find((x) => (x.routes?.write ?? []).some((gl) => glob(gl).test(route)))?.id ?? null; } catch { return null; }
}

function fileOfRead(res) {
  const a = res?.source?.address;
  return a ? a.replace(/^[a-z0-9-]+:\/\//, "") : null;
}

/** The header of a read: what it is, its state, its owner and what reading it costs, without its body. */
export function headerOf({ r, route, dir, venture, workspace, res }) {
  const h = { route, record: r.record ?? null, kind: r.kind, ...(r.collection ? { collection: r.collection } : {}) };
  if (r.kind === "command") return { ...h, state: "computed", note: r.note };
  if (r.collection === "list") {
    const n = res?.result ? Object.keys(res.result).length : 0;
    return { ...h, state: n ? "collection" : "missing", count: n, owner: ownerOf(r, dir, route), tokens: tokens(res?.result) };
  }
  const d = draftOf(route, venture, workspace);
  const file = (res?.result !== null && res?.result !== undefined && (fileOfRead(res) ?? d?.file)) || d?.file;
  const st = stateOf(dir, res?.result === null ? null : file, d?.draft);
  if (st.state === "missing" && res?.result !== null && res?.result !== undefined) st.state = "present";
  return { ...h, ...st, ...(st.state === "draft waiting" && res?.result ? { has_record: true } : {}), owner: ownerOf(r, dir, route), title: titleOf(res?.result), tokens: tokens(res?.result),
    ...(res?.source ? { source: res.source.source, version: res.source.version } : {}) };
}

// ---------------------------------------------------------------------------------------------
// Layout parts, sessions and scoped instructions (L-2, N-7, S-14)

/** Every AGENTS.md from the venture root down the route's segments, nearest last. */
export function chainOf(dir, route) {
  const out = [];
  const add = (rel) => { const f = join(dir, rel); if (existsSync(f)) out.push({ path: rel, text: readFileSync(f, "utf8") }); };
  add("AGENTS.md");
  let acc = "";
  for (const p of route.split("/").filter(Boolean)) { acc = acc ? `${acc}/${p}` : p; add(`${acc}/AGENTS.md`); }
  return out;
}

const PLAIN = /^([a-z][a-z0-9_-]*)\s*:\s*(.+)$/;
const SCOPED = /^\[([^\]]+)\]\s*([a-z][a-z0-9_-]*)\s*:\s*(.+)$/;
/** The merged key: value instructions for a route; a scoped line applies only where its glob matches. Nearest wins. */
export function instructionsFor(chain, route) {
  const out = {};
  for (const f of chain) for (const line of f.text.split("\n")) {
    const s = line.match(SCOPED);
    if (s) { if (s[1].split(",").map((x) => x.trim()).some((g) => glob(g).test(route))) out[s[2]] = s[3].trim(); continue; }
    const m = line.match(PLAIN);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

/** The stable layout of a route, as named parts. Nothing computed is in it (F-6). */
export function layoutParts(r, dir) {
  const base = routerLayout(r, null); // no venture: no need-now spawn, no chain; both come from here instead
  const chain = chainOf(dir, r.route.replace(/\/\[id\]$/, ""));
  // One part per layer or package in the stack, so routes in the same layer share theirs.
  const parts = Object.fromEntries(base.stack.map((k) => [`stack:${k.path}`, k]));
  for (const f of chain) parts[`chain:${f.path}`] = f.text;
  parts.instructions = instructionsFor(chain, r.route);
  parts[`record:${r.route}`] = r.kind === "record"
    ? { schema: r.schema, template: r.template, checks: r.checks, gate: gateOf(r, dir), package: base.package, groups: r.groups, note: r.note }
    : { note: r.note, script: r.script ?? null };
  return parts;
}

const sessionDir = () => process.env.NAIVE_SESSION_DIR ?? join(tmpdir(), "naive-sessions");
const sessionFile = (dir, session) => join(sessionDir(), `${sha(`${dir}\0${session}`)}.json`);
/** What a session has been sent: part key to hash, and the routes it visited. */
export function sessionOf(dir, session) {
  try { return load(sessionFile(dir, session)); } catch { return { session, sent: {}, routes: [] }; }
}
function saveSession(dir, s) { mkdirSync(sessionDir(), { recursive: true }); writeFileSync(sessionFile(dir, s.session), JSON.stringify(s)); }

/**
 * The layout to send: every part without a session; with one, only the parts this session has not
 * seen or that changed since (L-2). A sibling route keeps the shared parts and swaps the record's (N-7).
 */
export function layoutFor(r, dir, session) {
  const parts = layoutParts(r, dir);
  if (!session) return { parts };
  const s = sessionOf(dir, session);
  const send = {}, kept = [], changed = [];
  for (const [k, v] of Object.entries(parts)) {
    const h = sha(v);
    if (s.sent[k] === h) kept.push(k);
    else { send[k] = v; if (s.sent[k]) changed.push(k); s.sent[k] = h; }
  }
  const first = s.routes.length === 0;
  s.routes = [...s.routes.filter((x) => x !== r.route), r.route].slice(-50);
  saveSession(dir, s);
  return { session, first, parts: send, kept, ...(changed.length ? { changed } : {}) };
}

// ---------------------------------------------------------------------------------------------
// Template: recomputed on every action, with a time limit (P-12, F-6)

function runJson(script, args, ms) {
  return new Promise((done) => {
    const t0 = Date.now();
    execFile(process.execPath, [join(repoRoot, script), ...args], { timeout: ms, maxBuffer: 64 * 1024 * 1024 }, (err, stdout) => {
      if (err?.killed) return done({ ok: false, timed_out: true, ms: Date.now() - t0 });
      try { done({ ok: true, json: JSON.parse(stdout), ms: Date.now() - t0 }); } catch { done({ ok: false, error: String(err?.message ?? "no JSON").split("\n")[0], ms: Date.now() - t0 }); }
    });
  });
}

/** The template for a route: the need-now ranking and open decisions, computed now. Parts that run past template_ms come back pending. */
export async function templateFor(r, dir, set = settings(dir)) {
  const [nn, ds] = await Promise.all([runJson("schema/need-now.mjs", [dir, "--json"], set.template_ms), runJson("schema/decisions.mjs", [dir, "--json"], set.template_ms)]);
  const out = { computed_at: new Date().toISOString() };
  const pending = [];
  if (nn.ok) {
    const row = nn.json.rows.find((x) => x.type === r.record);
    out.need_now = { phase: nn.json.phase, ...(row ? { this: { status: row.status, now: row.now, why: row.why } } : {}),
      suggest_now: nn.json.rows.filter((x) => x.status === "suggest now").sort((a, b) => b.now - a.now).slice(0, 5).map((x) => x.type) };
  } else pending.push(`need_now (${nn.timed_out ? `over ${set.template_ms}ms` : nn.error})`);
  if (ds.ok) {
    const open = (ds.json.decisions ?? []).filter((d) => ["now", "overdue"].includes(d.render) && d.source !== "root");
    out.decisions = { open: open.length, overdue: open.filter((d) => d.render === "overdue").map((d) => d.id), now: open.slice(0, 5).map((d) => ({ id: d.id, question: d.question })) };
  } else pending.push(`decisions (${ds.timed_out ? `over ${set.template_ms}ms` : ds.error})`);
  if (pending.length) Object.assign(out, { pending, note: "still computing: run system/need-now or governance/decisions for the rest; the read did not wait" });
  return out;
}

// ---------------------------------------------------------------------------------------------
// Prefetch (N-3, N-4, N-12, L-12, C-16)

const MODEL = () => load(join(repoRoot, "schema/data-model.json"));
const AFTER = () => { try { return load(join(repoRoot, "packages/catalog.json")).records ?? {}; } catch { return {}; } };
const valuesAt = (o, path) => path.split(".").reduce((xs, k) => xs.flatMap((x) => (Array.isArray(x) ? x : [x]).flatMap((y) => (y && typeof y === "object" && y[k] !== undefined ? [y[k]] : []))), [o]).flat();
const ROUTEISH = /^[a-z][a-z0-9-]*(\/[a-z0-9.\-[\]]+)+$/;
function strings(o, out = [], depth = 0) {
  if (out.length > 300 || depth > 6) return out;
  if (typeof o === "string") out.push(o);
  else if (Array.isArray(o)) for (const x of o) strings(x, out, depth + 1);
  else if (o && typeof o === "object") for (const x of Object.values(o)) strings(x, out, depth + 1);
  return out;
}
/** The route a record type is read at: its list route for a collection, else its one route. */
export function routeOfType(type, id) {
  const rs = routes().filter((x) => x.kind === "record" && x.record === type);
  const item = rs.find((x) => x.collection === "item"), list = rs.find((x) => x.collection === "list"), one = rs.find((x) => !x.collection);
  if (item && typeof id === "string" && /^[a-z0-9][a-z0-9-]*$/.test(id)) return item.route.replace("[id]", id);
  return (list ?? one)?.route ?? null;
}

/** The routes an agent is likely to need after this one, most likely first, each with why. */
export function candidates(r, record, template, { hover = [] } = {}) {
  const out = [];
  const add = (route, why) => { if (route && route !== r.route && !out.some((x) => x.route === route)) out.push({ route, why }); };
  for (const h of hover) add(h, "asked");
  if (r.kind === "record" && record && typeof record === "object") {
    const def = MODEL().records.find((x) => x.id === r.record);
    for (const ref of def?.refs ?? []) {
      const vals = valuesAt(record, ref.field).filter((v) => typeof v === "string");
      for (const v of vals) add(routeOfType(ref.to, v), `ref ${ref.field}`);
    }
    // Links: a string in the record that is itself a route (foundation/icp), Naive's <Link>.
    for (const s of strings(record).filter((x) => ROUTEISH.test(x))) { const { r: hit } = resolve(s); if (hit?.kind === "record") add(s, "link"); }
  }
  const after = AFTER();
  for (const t of after[r.record]?.after ?? []) add(routeOfType(t), "reads first");
  const next = template?.need_now?.suggest_now?.find((t) => t !== r.record);
  if (next) add(routeOfType(next), "next step");
  for (const [t, v] of Object.entries(after)) if ((v.after ?? []).includes(r.record)) add(routeOfType(t), "waits on this");
  return out;
}

/** Prefetches the candidates within the prefetch budget: full, summary, state or count, by what each is and what is left. */
export async function prefetch({ r, record, template, venture, dir, workspace, actor_id, task = "", hover = [], set }) {
  const cands = candidates(r, record, template, { hover });
  const named = (route) => hover.includes(route) || (task && (task.includes(route) || task.includes(route.split("/").at(-1))));
  const entries = [], dropped = [];
  let spent = 0;
  for (const c of cands) {
    const { r: cr } = resolve(c.route);
    if (!cr) continue;
    const res = await safeCall({ venture, route: c.route, action: "read", workspace, actor_id, via: "prefetch" });
    let options; // most to least, each an entry the agent could receive
    if (!res.ok) options = [{ ...c, state: "unreadable" }];
    else if (cr.collection === "list") {
      const items = res.result ? Object.entries(res.result) : [];
      const counted = { ...c, state: items.length ? "collection" : "missing", count: items.length };
      if (items.length > set.large_collection && !named(c.route)) options = [counted];
      else options = [{ ...counted, items: items.map(([id, v]) => ({ id, title: titleOf(v) })) }, counted];
    } else {
      const h = headerOf({ r: cr, route: c.route, dir, venture, workspace, res });
      const st = { ...c, state: h.state };
      const summary = { ...st, title: h.title, tokens: h.tokens };
      const stable = h.state === "confirmed";
      if (h.state === "missing") options = [st];
      else if ((stable || named(c.route)) && h.tokens <= set.full_max) options = [{ ...summary, full: res.result }, summary, st];
      else if (stable || named(c.route)) options = [summary, st];
      else options = [st]; // changing (agent-written, a draft, unlogged): only its state (N-4)
    }
    const fit = options.find((o) => spent + tokens(o) <= set.prefetch_budget);
    if (!fit) { dropped.push(c.route); continue; }
    spent += tokens(fit);
    entries.push({ ...fit, cost: tokens(fit) });
  }
  return { entries, spent, budget: set.prefetch_budget, ...(dropped.length ? { dropped } : {}) };
}

// ---------------------------------------------------------------------------------------------
// Navigate: the whole answer, streamed part by part (N-5, N-9)

// A router call that answers a throw as an error, so one broken route never stops a navigation or a report.
const safeCall = async (args) => { try { return await call(args); } catch (e) { return { ok: false, error: String(e.message ?? e).split("\n")[0] }; } };

const runCacheFile = (dir, route) => join(sessionDir(), "runs", `${sha(`${dir}\0${route}`)}.json`);

/**
 * Reads a route the AI-native way. Options: session (layout once per session), task (what the agent
 * is doing; a route it names is prefetched in full), prefetch (false to turn it off, or a list of
 * routes to prefetch in full, like hover), header_only (stop after the header), onPart (called with
 * { part, data } as each part is ready). Returns { ok, result: { header, budget, layout, template,
 * result, prefetch } } in that order.
 */
export async function navigate({ venture, route, workspace, actor = "agent", actor_id, via = "router", session = process.env.MENTURA_SESSION, task, prefetch: pf = true, header_only = false, onPart, _template }) {
  const { r, params } = resolve(route);
  if (!r) return { ok: false, error: `no route ${route}` };
  const dir = ventureDir(venture, workspace);
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  const concrete = r.collection === "item" ? r.route.replace("[id]", params.id) : r.route;
  const set = settings(dir);
  const send = (part, data) => { try { onPart?.({ part, data: data === undefined ? data : JSON.parse(JSON.stringify(data)) }); } catch {} };
  const out = {};

  if (r.kind === "command") {
    // A computed route answers at once with its state and the last result, then streams the new one (N-9).
    let last = null;
    try { last = load(runCacheFile(dir, concrete)); } catch {}
    out.header = { ...headerOf({ r, route: concrete, dir, venture, workspace }), state: "computing", ...(last ? { last_at: last.at } : {}) };
    send("header", out.header);
    if (last) { out.stale_result = last.result; send("stale_result", { as_of: last.at, result: last.result }); }
    if (header_only) return { ok: true, result: out };
    out.layout = layoutFor(r, dir, session); send("layout", out.layout);
    const res = await safeCall({ venture, route: concrete, action: "run", workspace, actor, actor_id, via });
    if (!res.ok) return res;
    out.header.state = res.needs_input ? "needs input" : "computed";
    out.result = res.result ?? null;
    if (res.needs_input) out.needs_input = res.needs_input;
    else { mkdirSync(dirname(runCacheFile(dir, concrete)), { recursive: true }); writeFileSync(runCacheFile(dir, concrete), JSON.stringify({ at: new Date().toISOString(), result: res.result })); }
    send("result", out.result);
    out.budget = budgetOf(out, budgetFor(set, r.route));
    send("budget", out.budget);
    return { ok: true, result: order(out) };
  }

  // The template starts first, in other processes, so it runs while the record is read.
  const templating = header_only ? null : _template ? Promise.resolve(_template) : templateFor(r, dir, set);
  const res = await safeCall({ venture, route: concrete, action: "read", workspace, actor, actor_id, via });
  if (!res.ok) return res;
  out.header = headerOf({ r, route: concrete, dir, venture, workspace, res });
  send("header", out.header);
  if (header_only) { out.budget = budgetOf(out, budgetFor(set, r.route)); return { ok: true, result: order(out) }; }
  out.layout = layoutFor(r, dir, session);
  send("layout", out.layout);
  out.template = await templating;
  send("template", out.template);
  out.result = res.result;
  for (const k of ["not_found", "pending_draft", "pending_pull_requests", "source", "sources", "deprecated"]) if (res[k]) out[k] = res[k];
  send("result", out.result);
  if (pf !== false) {
    out.prefetch = await prefetch({ r, record: res.result, template: out.template, venture, dir, workspace, actor_id, task, hover: Array.isArray(pf) ? pf : [], set });
    // Over the route's budget: prefetch is the first thing given back (C-16).
    const limit = budgetFor(set, r.route);
    while (out.prefetch.entries.length && budgetOf(out, limit).over) out.prefetch.dropped = [...(out.prefetch.dropped ?? []), out.prefetch.entries.pop().route];
    out.prefetch.spent = out.prefetch.entries.reduce((n, e) => n + e.cost, 0);
    send("prefetch", out.prefetch);
  }
  out.budget = budgetOf(out, budgetFor(set, r.route));
  send("budget", out.budget);
  return { ok: true, result: order(out) };
}

const PARTS = ["header", "layout", "template", "stale_result", "result", "prefetch"];
function budgetOf(out, limit) {
  const parts = Object.fromEntries(PARTS.filter((k) => out[k] !== undefined).map((k) => [k, tokens(out[k])]));
  const used = Object.values(parts).reduce((a, b) => a + b, 0);
  return { limit, used, over: used > limit, parts };
}
// Header first, then the budget, then the rest in the order an agent needs it.
const order = (o) => Object.fromEntries(["header", "budget", "needs_input", "layout", "template", "stale_result", "result", "not_found", "pending_draft", "pending_pull_requests", "source", "sources", "deprecated", "prefetch"].filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));

/** Runs a command route in a child process and reports progress while it runs (N-5). Gates apply: it goes through the router. */
export function runStreaming({ venture, route, input, workspace, actor_id }, onProgress = () => {}, every = 250) {
  return new Promise((done) => {
    const args = [join(repoRoot, "interface/cli/mentura.mjs"), route, "run", "--venture", venture, "--json",
      ...(input?.value !== undefined ? ["--value", String(input.value)] : []), ...(input?.as_is ? ["--as-is"] : []), ...(workspace ? ["--workspace", workspace] : [])];
    const env = { ...process.env, ...(actor_id ? { MENTURA_ACTOR_ID: actor_id } : {}) };
    const p = spawn(process.execPath, args, { env });
    let stdout = "", stderr = "", n = 0;
    const t0 = Date.now();
    onProgress({ progress: 0, message: `started ${route}` });
    const timer = setInterval(() => onProgress({ progress: ++n, message: `running ${route}: ${((Date.now() - t0) / 1000).toFixed(1)}s` }), every);
    p.stdout.on("data", (d) => { stdout += d; });
    p.stderr.on("data", (d) => {
      stderr += d;
      for (const line of String(d).split("\n")) { const m = line.match(/^progress\s+(\d+)\/(\d+)\s*(.*)$/); if (m) onProgress({ progress: Number(m[1]), total: Number(m[2]), message: m[3] }); }
    });
    p.on("close", (code) => {
      clearInterval(timer);
      onProgress({ progress: ++n, message: `finished ${route} in ${((Date.now() - t0) / 1000).toFixed(1)}s` });
      if (code !== 0) return done({ ok: false, error: (stderr || stdout).trim() });
      try { const j = JSON.parse(stdout); done(j.ok !== undefined ? j : { ok: true, result: j }); } catch { done({ ok: true, result: stdout.trim() }); }
    });
  });
}

/** Runs calls one after another (a batch of reads, checks or runs) and reports each as it finishes (N-5). */
export async function batch({ venture, workspace, calls = [], actor_id, via = "router" }, onProgress = () => {}) {
  const results = [];
  for (const [i, c] of calls.entries()) {
    const r = await safeCall({ venture, workspace, actor_id, via, ...c });
    results.push({ route: c.route, action: c.action, ok: r.ok, ...(r.ok ? { result: r.result } : { error: r.error }) });
    onProgress({ progress: i + 1, total: calls.length, message: `${c.action} ${c.route}: ${r.ok ? "ok" : "failed"}` });
  }
  return { ok: results.every((x) => x.ok), result: results };
}

// ---------------------------------------------------------------------------------------------
// The context budget report (N-13, S-14, F-6)

const ADVICE = {
  layout: "move procedural instructions out of AGENTS.md into the router's code or a check, and scope the rest to the routes that need them (S-14)",
  template: "the template is computed every time: keep it to rankings and counts",
  result: "the record is large: read its header first (head) and split it if agents rarely need all of it",
  prefetch: "lower context.prefetch_budget for this route, or turn prefetch off where the refs are rarely followed",
  header: "the header should be small: check the record's title field",
};

/** Every route of a venture against its context budget, with its largest part, plus the layout rules it breaks. */
export async function budget(dir) {
  // The report's own reads are measurement, not an agent's work: they stay out of the events log and vitals.
  const was = process.env.NAIVE_INSTRUMENT;
  process.env.NAIVE_INSTRUMENT = "0";
  try { return await measureBudget(dir); } finally { if (was === undefined) delete process.env.NAIVE_INSTRUMENT; else process.env.NAIVE_INSTRUMENT = was; }
}

async function measureBudget(dir) {
  const v = load(join(dir, "venture.json"));
  const workspace = dirname(dir);
  const set = settings(dir);
  const rows = [];
  let tmpl = null;
  for (const r of routes().filter((x) => x.kind === "record" && x.collection !== "item")) {
    tmpl ??= await templateFor(r, dir, set);
    const t = { ...tmpl, need_now: tmpl.need_now ? { ...tmpl.need_now, this: undefined } : undefined };
    const n = await navigate({ venture: v.id, route: r.route, workspace, _template: t, via: "budget" });
    if (!n.ok) { rows.push({ route: r.route, error: n.error }); continue; }
    const b = n.result.budget;
    const largest = Object.entries(b.parts).sort((a, c) => c[1] - a[1])[0]?.[0];
    rows.push({ route: r.route, limit: b.limit, used: b.used, over: b.over, largest, ...(b.over ? { advice: ADVICE[largest] } : {}) });
  }
  // Layout rules, over every AGENTS.md in the venture.
  const rules = [];
  const agentsFiles = (d, rel = "") => readdirSync(join(d, rel), { withFileTypes: true }).flatMap((e) => e.name.startsWith(".") || e.name.startsWith("_") ? []
    : e.isDirectory() ? (existsSync(join(d, rel, e.name, "venture.json")) ? [] : agentsFiles(d, rel ? `${rel}/${e.name}` : e.name)) : e.name === "AGENTS.md" ? [rel ? `${rel}/AGENTS.md` : "AGENTS.md"] : []);
  for (const f of agentsFiles(dir)) {
    const folder = dirname(f) === "." ? "" : dirname(f);
    const text = readFileSync(join(dir, f), "utf8");
    for (const line of text.split("\n")) {
      const s = line.match(SCOPED), m = s ? [null, s[2], s[3]] : line.match(PLAIN);
      if (!m) continue;
      // F-6: a computed value in a layout blocks or goes stale; it belongs in the template.
      if (COMPUTED.includes(m[1])) rules.push({ rule: "F-6", file: f, key: m[1], fix: `${m[1]} is computed: leave it to the template (need-now and decisions), not ${f}` });
      // S-14: a scoped line whose routes all sit under one folder belongs in that folder's AGENTS.md.
      if (s) {
        const fixed = s[1].split(",").map((g) => g.trim().split("/").filter((x) => !x.includes("*")).join("/"));
        const common = fixed.reduce((a, b) => { const x = a.split("/"), y = b.split("/"); let i = 0; while (i < x.length && x[i] === y[i]) i++; return x.slice(0, i).join("/"); });
        if (common && common !== folder && common.startsWith(folder)) rules.push({ rule: "S-14", file: f, key: s[2], fix: `move "${line.trim()}" to ${common}/AGENTS.md, so routes outside ${common} do not pay ${tokens(line)} tokens for it` });
      }
    }
    const t = tokens(text);
    if (t > set.budget / 4) rules.push({ rule: "N-13", file: f, tokens: t, fix: `${f} is ${t} tokens, over a quarter of the ${set.budget}-token budget of every route under it: ${ADVICE.layout}` });
  }
  const over = rows.filter((x) => x.over);
  return { venture: v.id, budget: set.budget, prefetch_budget: set.prefetch_budget, routes: rows, over: over.map((x) => x.route), rules, passed: !over.length && !rules.length };
}

// ---------------------------------------------------------------------------------------------
// Command line: the router's command route system/context, and the CLI hook for navigate, head and batch.

/** mentura <route> navigate|head --venture <id> [--session s] [--task text] [--prefetch a,b | --no-prefetch] [--stream]; mentura batch --venture <id> --input calls.json [--stream]. */
export async function cli(argv, { workspace } = {}) {
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const flag = (n) => argv.includes(`--${n}`);
  const [route, action] = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["json", "stream", "no-prefetch", "header", "as-is"].includes(argv[i - 1].slice(2))));
  const venture = opt("venture");
  const stream = flag("stream");
  const line = (x) => process.stdout.write(JSON.stringify(x) + "\n");
  if (route === "batch") {
    const calls = JSON.parse(readFileSync(opt("input") === "-" ? 0 : opt("input"), "utf8"));
    const r = await batch({ venture, workspace, calls: calls.calls ?? calls, via: "cli" }, stream ? (p) => line({ progress: p }) : undefined);
    if (stream) line({ part: "result", data: r.result }); else console.log(JSON.stringify(r.result, null, 2));
    return r.ok ? 0 : 1;
  }
  // Through the router, so the navigation is one instrumented call with its reads under it.
  const r = await call({ venture, route, action, workspace, via: "cli", actor: opt("as") === "person" ? "person" : "agent", input: { session: opt("session") ?? process.env.MENTURA_SESSION, task: opt("task"),
    prefetch: flag("no-prefetch") ? false : opt("prefetch") ? opt("prefetch").split(",").filter(Boolean) : true, onPart: stream ? line : undefined } });
  if (!r.ok) { console.error(r.error); return 1; }
  if (!stream) console.log(JSON.stringify(r.result, null, 2));
  return 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, what] = process.argv.slice(2);
  if (!dir || !existsSync(join(dir, "venture.json")) || what !== "budget") { console.error("usage: node interface/context.mjs <venture dir> budget [--check] [--json]"); process.exit(2); }
  const r = await budget(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.venture}: ${r.routes.length} routes, budget ${r.budget} tokens (prefetch ${r.prefetch_budget})`);
    for (const x of r.routes) console.log(`  ${x.error ? "err " : x.over ? "OVER" : "ok  "}  ${x.route.padEnd(40)} ${x.error ? `could not read: ${x.error}` : `${String(x.used).padStart(6)} / ${x.limit}  largest ${x.largest}`}`);
    for (const x of r.rules) console.log(`  ${x.rule.padEnd(5)} ${x.file}: ${x.fix}`);
  }
  if (process.argv.includes("--check") && !r.passed) { console.error(`context budget failing: ${[...r.over, ...r.rules.map((x) => `${x.rule} ${x.file}`)].join(", ")}`); process.exit(1); }
}
