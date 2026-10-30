// The workspace: one person's folder of ventures (naive-workspace.json, schema/workspace.schema.json).
// A teammate adds a venture they work for or with; the venture keeps its own settings, and the workspace's
// settings say what may cross between ventures. Offline, those settings are the whole configuration.
//
//   node schema/workspace.mjs check <workspace>                     the workspace file matches its schema
//   node schema/workspace.mjs capture <workspace> "<text>"          keep the text in raw/, route its chunks
//   node schema/workspace.mjs inbox <workspace> [list | assign <chunk> <venture>]
//   node schema/workspace.mjs read <workspace> <from venture> <to venture> <path>
//   node schema/workspace.mjs rename <workspace> "<new name>"
//
// ensureWorkspace makes a workspace (Torian, 2026-10-30): naive-workspace.json named "Naive workspace"
// until renamed, with its IANA timeZone (the clock, schema/clock.mjs), the calendar with its default
// "venture" calendar (schema/calendar.mjs), AGENTS.md and raw/, inbox/, meta/, founder/. A workspace
// always holds a venture: naive workspace init creates, ports or migrates one in the same step.
//
// Cross-venture reads (canRead): on by default; only published artifacts cross, never records or _private/.
// Each one is logged in the workspace's meta/provenance.jsonl.

import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { ventureFile } from "./venture-paths.mjs";
import { systemZone, validZone } from "./clock.mjs";
import { initCalendar } from "./calendar.mjs";
import { goals } from "./canonical.mjs";

export const WORKSPACE_FILE = "naive-workspace.json";
const DEFAULTS = { cross_venture_reads: true, route_threshold: 0.8 };
const repo = new URL("..", import.meta.url).pathname;
const now = () => new Date().toISOString();
const read = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

/** The nearest workspace folder at or above dir, or null. */
export function findWorkspace(dir) {
  let up = resolve(dir);
  while (!existsSync(join(up, WORKSPACE_FILE)) && !existsSync(join(up, "workspace.json")) && dirname(up) !== up) up = dirname(up);
  return existsSync(join(up, WORKSPACE_FILE)) || existsSync(join(up, "workspace.json")) ? up : null;
}

/** The workspace: its file, its settings with defaults filled, and its ventures by id. */
export function loadWorkspace(root) {
  const file = existsSync(join(root, WORKSPACE_FILE)) ? join(root, WORKSPACE_FILE) : join(root, "workspace.json");
  const ws = read(file) ?? { ventures: [] };
  const ventures = {};
  const walk = (d, depth) => {
    if (!existsSync(d) || depth > 4) return;
    if (existsSync(join(d, "venture.json"))) { const v = read(join(d, "venture.json")) ?? {}; ventures[v.id ?? basename(d)] = d; }
    for (const e of readdirSync(d, { withFileTypes: true })) if (e.isDirectory() && !/^(node_modules|\.|_private|raw|inbox|meta)/.test(e.name)) walk(join(d, e.name), depth + 1);
  };
  for (const v of ws.ventures ?? []) walk(join(root, v), 0);
  return { root, file, ws, settings: { ...DEFAULTS, ...(ws.settings ?? {}) }, ventures };
}

const log = (root, file, entry) => { mkdirSync(join(root, "meta"), { recursive: true }); appendFileSync(join(root, "meta", file), JSON.stringify({ at: now(), ...entry }) + "\n"); };

/** Whether a session in fromVenture may read path in toVenture: { ok, reason }. */
export function canRead(workspace, fromVenture, toVenture, path) {
  const p = String(path).replace(/^\.?\//, "");
  if (fromVenture === toVenture) return { ok: true, reason: "same venture" };
  if (!workspace.ventures[toVenture]) return { ok: false, reason: `${toVenture} is not in this workspace` };
  if (!workspace.settings.cross_venture_reads) return { ok: false, reason: "cross-venture reads are off in this workspace's settings" };
  if (p.split("/").some((s) => s === "_private" || s === "..")) return { ok: false, reason: "private folders never cross ventures" };
  const m = /(^|\/)artifacts\/[^/]+\.json$/.test(p);
  if (!m) return { ok: false, reason: "only published artifacts cross ventures; this is a record" };
  const a = read(ventureFile(workspace.ventures[toVenture], p));
  if (!a) return { ok: false, reason: `${p} does not exist in ${toVenture}` };
  if (a.published !== true) return { ok: false, reason: "this artifact is not published" };
  return { ok: true, reason: "published artifact, cross-venture reads on" };
}

/** Read across ventures: the artifact, or an error; logged either way. */
export function crossRead(workspace, fromVenture, toVenture, path) {
  const r = canRead(workspace, fromVenture, toVenture, path);
  if (fromVenture !== toVenture) log(workspace.root, "provenance.jsonl", { action: "cross-venture-read", from: fromVenture, to: toVenture, path, allowed: r.ok, reason: r.reason });
  return r.ok ? { ok: true, artifact: read(ventureFile(workspace.ventures[toVenture], path)) } : r;
}

// --- capture: split, score, route ---

const STOP = new Set("a an and are as at be but by for from has have i in is it its of on or our so that the their them they this to was we were what when which who will with you your not can do just about into more".split(" "));
const terms = (t) => new Set(String(t).toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g)?.filter((w) => !STOP.has(w)) ?? []);
const strings = (o) => typeof o === "string" ? [o] : Array.isArray(o) ? o.flatMap(strings) : o && typeof o === "object" ? Object.values(o).flatMap(strings) : [];

/** The words a venture is about: its name and its foundation (problem, ICP, telos). */
export function ventureTerms(dir) {
  const files = ["venture.json", "foundation/problem.json", "purpose/validation/problem.json", "foundation/icp.json", "purpose/icp.json"];
  const icp = ventureFile(dir, "foundation/icp");
  const all = [...files.map((f) => ventureFile(dir, f)), ...(existsSync(icp) ? readdirSync(icp).filter((f) => f.endsWith(".json")).map((f) => join(icp, f)) : [])];
  // The venture's goals come through the canonical core (schema/canonical.mjs), never from telos.json.
  return terms([...all.flatMap((f) => strings(read(f))), ...strings(goals(dir))].join(" "));
}

/** Chunks: paragraphs, with a paragraph of one sentence joined to the last when they share words. A model can replace it (opts.split). */
export function split(text, opts = {}) {
  if (opts.split) return opts.split(text);
  const paras = String(text).split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const out = [];
  for (const p of paras) {
    const last = out.at(-1);
    const shared = last && [...terms(p)].filter((w) => terms(last).has(w)).length;
    if (last && shared >= 2 && !/[.!?]\s+\S/.test(p)) out[out.length - 1] = `${last}\n\n${p}`;
    else out.push(p);
  }
  return out;
}

/** How well a chunk fits each venture, 0..1: the share of the chunk's words found in the venture's foundation. A model can replace it (opts.score). */
export function score(chunk, vocab, opts = {}) {
  if (opts.score) return opts.score(chunk, vocab);
  const c = [...terms(chunk)];
  return c.length ? c.filter((w) => vocab.has(w)).length / c.length : 0;
}

/** naive capture: keep the whole text in raw/, then file each chunk in a venture inbox or the workspace inbox. */
export function capture(workspace, text, opts = {}) {
  const at = now(), id = `${at.replace(/[-:.]/g, "").replace("T", "-").slice(0, 15)}-${Math.random().toString(36).slice(2, 6)}`;
  mkdirSync(join(workspace.root, "raw"), { recursive: true });
  const raw = `raw/${id}.md`;
  writeFileSync(join(workspace.root, raw), `---\nid: ${id}\ncaptured: ${at}\nsource: naive capture\n---\n\n${text}\n`, { flag: "wx" });
  log(workspace.root, "provenance.jsonl", { action: "capture", path: raw });
  const vocab = Object.fromEntries(Object.entries(workspace.ventures).map(([v, d]) => [v, ventureTerms(d)]));
  const routed = split(text, opts).map((chunk, i) => {
    const scores = Object.fromEntries(Object.entries(vocab).map(([v, t]) => [v, Math.round(score(chunk, t, opts) * 100) / 100]));
    const [best, conf] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
    const c = { id: `${id}-${i + 1}`, text: chunk, source: raw, scores, best, confidence: conf, at };
    if (best && conf >= workspace.settings.route_threshold) return { ...c, to: fileInVenture(workspace, c, best) };
    mkdirSync(join(workspace.root, "inbox"), { recursive: true });
    writeFileSync(join(workspace.root, "inbox", `${c.id}.json`), JSON.stringify(c, null, 2) + "\n");
    return { ...c, to: `inbox/${c.id}.json` };
  });
  return { raw, chunks: routed };
}

// A chunk as a draft in the venture's raw inbox (k-base/raw/inbox/ in a structured venture), citing the workspace source.
function fileInVenture(workspace, c, venture) {
  const f = ventureFile(workspace.ventures[venture], `raw/inbox/${c.id}.md`);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, `---\nstatus: draft\nsource: workspace:${c.source}\nchunk: ${c.id}\nconfidence: ${c.confidence}\n---\n\n${c.text}\n`);
  return `${venture}:${f.slice(workspace.ventures[venture].length + 1)}`;
}

/** The chunks waiting in the workspace inbox. */
export function inbox(workspace) {
  const d = join(workspace.root, "inbox");
  return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).sort().map((f) => read(join(d, f))) : [];
}

/** The founder's choice: the chunk moves to the venture's inbox, and the choice is kept as a training example. */
export function assign(workspace, chunkId, venture) {
  const f = join(workspace.root, "inbox", `${chunkId}.json`);
  const c = read(f);
  if (!c) throw new Error(`no chunk ${chunkId} in the inbox`);
  if (!workspace.ventures[venture]) throw new Error(`${venture} is not in this workspace`);
  const to = fileInVenture(workspace, c, venture);
  mkdirSync(join(workspace.root, "inbox", "assigned"), { recursive: true });
  renameSync(f, join(workspace.root, "inbox", "assigned", `${chunkId}.json`));
  log(workspace.root, "routing-log.jsonl", { chunk: chunkId, text: c.text, scores: c.scores, guess: c.best, chosen: venture, by: "founder" });
  return to;
}

export const DEFAULT_NAME = "Naive workspace";

/** Create the workspace at root, or fill in what an older one lacks (timeZone, the calendar). Returns { root, file, ws, created }. */
export function ensureWorkspace(root, { name, timeZone, owner } = {}) {
  root = resolve(root);
  mkdirSync(root, { recursive: true });
  const file = existsSync(join(root, "workspace.json")) && !existsSync(join(root, WORKSPACE_FILE)) ? join(root, "workspace.json") : join(root, WORKSPACE_FILE);
  const created = !existsSync(file);
  if (timeZone && !validZone(timeZone)) throw new Error(`${timeZone} is not an IANA time zone this machine knows (for example America/New_York)`);
  const ws = read(file) ?? { schema: "everything-ecosystem", schema_version: readFileSync(join(repo, "schema/VERSION"), "utf8").trim(), name: name ?? DEFAULT_NAME, ventures: [], settings: { ...DEFAULTS } };
  if (created && name) ws.name = name;
  ws.name ??= DEFAULT_NAME;
  // The clock starts with the workspace: its zone, the system's unless one is given.
  if (!ws.timeZone || (created && timeZone)) ws.timeZone = timeZone ?? systemZone();
  ws.calendar ??= "calendar/";
  writeFileSync(file, JSON.stringify(ws, null, 2) + "\n");
  if (!existsSync(join(root, "AGENTS.md"))) writeFileSync(join(root, "AGENTS.md"), `# ${ws.name}\n\nRules for agents across every venture in this workspace: who you are, how you work, what is off limits. A venture's own AGENTS.md adds to these, and the nearer file wins when two say the same thing.\n`);
  // raw/ keeps what the founder captures, inbox/ holds what waits for them, meta/ the logs, founder/ the founder record once.
  for (const d of ["raw", "inbox", "meta", "founder"]) { mkdirSync(join(root, d), { recursive: true }); if (!readdirSync(join(root, d)).length) writeFileSync(join(root, d, ".gitkeep"), ""); }
  initCalendar(root, { owner: owner ?? "founder" });
  if (created) log(root, "provenance.jsonl", { action: "workspace-init", name: ws.name, timeZone: ws.timeZone });
  return { root, file, ws, created };
}

/** List a venture folder in the workspace (relative to it), once. */
export function addVenture(root, ventureDir) {
  const { file, ws } = ensureWorkspace(root);
  const rel = relative(resolve(root), resolve(ventureDir));
  if (!ws.ventures.includes(rel)) ws.ventures.push(rel);
  writeFileSync(file, JSON.stringify(ws, null, 2) + "\n");
  return ws;
}

/** Rename the workspace; logged in meta/provenance.jsonl with the old and new names. */
export function renameWorkspace(root, name, { by } = {}) {
  name = String(name ?? "").trim();
  if (!name) throw new Error("a workspace name cannot be empty");
  const w = loadWorkspace(resolve(root));
  if (!existsSync(w.file)) throw new Error(`${root} is not a workspace (no ${WORKSPACE_FILE})`);
  const from = w.ws.name ?? DEFAULT_NAME;
  w.ws.name = name;
  writeFileSync(w.file, JSON.stringify(w.ws, null, 2) + "\n");
  log(w.root, "provenance.jsonl", { action: "workspace-rename", from, to: name, ...(by ? { by } : {}) });
  return { from, to: name };
}

/** The workspace file against its schema; null when it passes, else the error. */
export function checkWorkspace(root) {
  const w = loadWorkspace(root);
  const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "workspace.schema.json", "--file", w.file], { encoding: "utf8" });
  return v.status === 0 ? null : (v.stdout + v.stderr).trim();
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const [cmd, root, ...rest] = process.argv.slice(2);
  if (!cmd || !root) { console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   ")).map((l) => l.slice(5)).join("\n")); process.exit(2); }
  const w = loadWorkspace(resolve(root));
  if (cmd === "check") { const e = checkWorkspace(w.root); console.log(e ?? `${basename(w.file)} matches workspace.schema.json`); process.exit(e ? 1 : 0); }
  if (cmd === "capture") { const r = capture(w, rest.join(" ")); console.log(`kept ${r.raw}`); for (const c of r.chunks) console.log(`  ${c.id} -> ${c.to} (${c.best ?? "no venture"} ${c.confidence})`); }
  else if (cmd === "inbox" && rest[0] === "assign") console.log(`moved to ${assign(w, rest[1], rest[2])}`);
  else if (cmd === "inbox") { const l = inbox(w); console.log(l.length ? l.map((c) => `${c.id}  best guess ${c.best ?? "none"} ${c.confidence}  ${c.text.slice(0, 60).replace(/\n/g, " ")}`).join("\n") : "the inbox is empty"); }
  else if (cmd === "rename") { const r = renameWorkspace(w.root, rest.join(" ")); console.log(`renamed the workspace from ${r.from} to ${r.to}`); }
  else if (cmd === "read") { const r = crossRead(w, rest[0], rest[1], rest[2]); if (!r.ok) { console.error(r.reason); process.exit(1); } console.log(JSON.stringify(r.artifact, null, 2)); }
  else { console.error(`unknown command ${cmd}`); process.exit(2); }
}
