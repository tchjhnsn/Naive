#!/usr/bin/env node
// naive port: moves an existing folder into a venture, as it is (EE-076, revised by Torian on
// 2026-10-29: port moves, it no longer copies files into packages). The folder is moved whole, with a
// rename, so not one file in it is opened or changed; the venture names it in sources.json as a source
// of truth (a read-only filesystem source) and logs the move in provenance.jsonl with the path it came
// from. Migrate (rewriting a project into the Naive convention) is the other way in.
//
//   node schema/port-venture.mjs <folder> --venture <dir> [--to <path>] [--links <dir> ...]
//        adds the move to the plan at <venture>/.release/port-plan.json and prints it; moves nothing.
//        The folder goes to <venture>/codebase/<its name> unless --to says where (relative to the venture
//        or absolute). Run once per folder: each run adds or replaces that folder's item.
//   node schema/port-venture.mjs --venture <dir> --apply --confirm port [--even-if-busy]
//        carries out every planned move the founder left as move; any item can be set to leave first
//
// The plan says what a move would break: worktrees of a git repository (they point at its old path
// until `git worktree repair` runs from the new one), symbolic links that point into the folder, and
// processes working inside it, which refuse the apply unless --even-if-busy. A port never overwrites,
// never copies (a move across disks is refused, not copied), and refuses an item whose folder changed
// identity since the plan. Every run writes a trace to .release/port-trace.json, in the shape
// platform/integrations/langsmith.mjs uploads.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, readlinkSync, realpathSync, renameSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { agentFromEnv, record } from "../packages/core/provenance.mjs";
import { CODEBASE, ventureFile } from "../packages/core/venture-paths.mjs";

export const PLAN = ".release/port-plan.json";
export const TRACE = ".release/port-trace.json";
const MAP = "knowledge/sources.json";
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^[^a-z]+|-$/g, "") || "folder";
const inside = (a, b) => a === b || a.startsWith(b + sep);
const real = (p) => { try { return realpathSync(p); } catch { return resolve(p); } };

// Files and bytes under a folder, without following links, to show the size of what moves, and a
// manifest hash (each path with its size, never its contents) for the provenance entry.
function measure(root) {
  let files = 0, bytes = 0;
  const lines = [];
  const stack = [root];
  while (stack.length) {
    const d = stack.pop();
    let list = [];
    try { list = readdirSync(d, { withFileTypes: true }); } catch { continue; }
    for (const e of list) {
      const p = join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else { files++; let n = 0; try { n = lstatSync(p).size; } catch {} bytes += n; lines.push(`${relative(root, p)} ${n}`); }
    }
  }
  return { files, bytes, manifest: createHash("sha256").update(lines.sort().join("\n")).digest("hex") };
}

// Symbolic links under `roots` (to `depth` levels, skipping node_modules) whose target is inside `src`.
// A link inside `src` that points inside it with a relative path keeps working, so only absolute ones count.
export function linksInto(src, roots, depth = 4) {
  const out = [];
  const seen = new Set();
  const visit = (d, n) => {
    if (n > depth || seen.has(d)) return;
    seen.add(d);
    let list = [];
    try { list = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of list) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const p = join(d, e.name);
      if (e.isSymbolicLink()) {
        const t = readlinkSync(p);
        const target = resolve(dirname(p), t);
        if (inside(target, src) && !(inside(p, src) && !isAbsolute(t))) out.push({ link: p, target: t });
      } else if (e.isDirectory()) visit(p, n + 1);
    }
  };
  for (const r of roots) visit(resolve(r), 0);
  return out;
}

// The git facts a move touches: whether the folder is a repository, its other worktrees, and how
// many changes are uncommitted (the move keeps them; it is only said).
function git(src) {
  const g = join(src, ".git");
  if (!existsSync(g)) return null;
  if (statSync(g).isFile()) return { linked: true, worktrees: [], uncommitted: null };
  const run = (...a) => spawnSync("git", ["-C", src, ...a], { encoding: "utf8" });
  const wt = (run("worktree", "list", "--porcelain").stdout ?? "").split("\n").filter((l) => l.startsWith("worktree ")).map((l) => l.slice(9)).filter((p) => real(p) !== real(src));
  // --no-optional-locks: status must not rewrite .git/index. The plan reads the folder and writes nothing (EE-076).
  const st = run("--no-optional-locks", "status", "--porcelain");
  return { linked: false, worktrees: wt, uncommitted: st.status === 0 ? st.stdout.split("\n").filter(Boolean).length : null };
}

// Processes whose working directory is inside the folder (macOS and Linux lsof).
export function busy(src) {
  const r = spawnSync("lsof", ["-d", "cwd", "-Fpcn"], { encoding: "utf8" });
  if (r.error || !r.stdout) return [];
  const out = [];
  let p = null, c = null;
  for (const l of r.stdout.split("\n")) {
    if (l[0] === "p") p = l.slice(1);
    else if (l[0] === "c") c = l.slice(1);
    else if (l[0] === "n" && inside(l.slice(1), real(src)) && p !== String(process.pid)) out.push({ pid: Number(p), command: c, cwd: l.slice(1) });
  }
  return out;
}

const readPlan = (dir) => existsSync(ventureFile(dir, PLAN)) ? JSON.parse(readFileSync(ventureFile(dir, PLAN), "utf8")) : null;
const readMap = (dir) => existsSync(ventureFile(dir, MAP)) ? JSON.parse(readFileSync(ventureFile(dir, MAP), "utf8")) : { sources: [], records: {} };

/**
 * The planned move of `folder` into the venture at `dir`. Reads both, writes neither.
 * @param {string} folder
 * @param {string} dir
 * @param {{ to?: string, links?: string[] }} [opts]
 */
export function planOne(folder, dir, { to, links = [] } = {}) {
  if (!existsSync(folder) || !lstatSync(folder).isDirectory()) throw new Error(`${folder} is not a directory`);
  if (!existsSync(join(dir, "venture.json"))) throw new Error(`${dir} is not a venture: create one first with naive init`);
  const src = real(folder);
  const v = real(dir);
  if (inside(v, src)) throw new Error("the venture cannot sit inside the folder it ports");
  const dest = resolve(v, to ?? join(CODEBASE, basename(src)));
  const s = statSync(src);
  const item = /** @type {ReturnType<typeof measure> & { action: string, from: string, to: string, source: string, identity: { dev: number, ino: number }, reason?: string,
    git?: ReturnType<typeof git>, links?: ReturnType<typeof linksInto>, busy?: ReturnType<typeof busy>, warnings?: string[] }} */ ({ action: "move", from: src, to: dest, source: slug(basename(src)), identity: { dev: s.dev, ino: s.ino }, ...measure(src) });
  const warnings = [];
  const leave = (why) => Object.assign(item, { action: "leave", reason: why });
  if (existsSync(dest)) leave(`${dest} already exists; a port never overwrites`);
  else if (inside(dest, src)) leave("the destination is inside the folder itself");
  else if (!inside(dest, v)) warnings.push("the destination is outside the venture folder; sources.json will name it by absolute path");
  // A rename only works on one disk: the nearest existing parent of the destination must share it.
  let up = dirname(dest);
  while (!existsSync(up)) up = dirname(up);
  if (item.action === "move" && statSync(up).dev !== s.dev) leave("the destination is on another disk; a port moves, it never copies");
  if (item.action === "move" && readMap(dir).sources.some((x) => x.id === item.source)) leave(`sources.json already has a source ${item.source}`);
  const g = git(src);
  item.git = g;
  if (g?.linked) warnings.push("this folder is a linked git worktree; its main repository will point at the old path until `git worktree repair` runs there");
  if (g?.worktrees.length) warnings.push(`${g.worktrees.length} worktree${g.worktrees.length === 1 ? "" : "s"} of this repository point at its old path until \`git -C ${dest} worktree repair\` runs: ${g.worktrees.join(", ")}`);
  if (g?.uncommitted) warnings.push(`${g.uncommitted} uncommitted change${g.uncommitted === 1 ? "" : "s"} move with it, unchanged`);
  item.links = linksInto(src, [dirname(src), src, ...links]);
  if (item.links.length) warnings.push(`${item.links.length} symbolic link${item.links.length === 1 ? "" : "s"} point into it and will break: ${item.links.map((x) => x.link).join(", ")}`);
  item.busy = busy(src);
  if (item.busy.length) warnings.push(`${item.busy.length} process${item.busy.length === 1 ? " is" : "es are"} working inside it (${[...new Set(item.busy.map((x) => x.command))].join(", ")}); apply refuses unless --even-if-busy`);
  item.warnings = warnings;
  return item;
}

/** Adds (or replaces) one folder's item in the venture's plan and writes it. */
export function plan(folder, dir, opts = {}) {
  const item = planOne(folder, dir, opts);
  const p = readPlan(dir) ?? { venture: JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).id, items: [] };
  const others = p.items.filter((i) => i.from !== item.from && i.action === "move" && !i.done);
  if (others.some((i) => i.source === item.source)) Object.assign(item, { action: "leave", reason: `another planned move already uses the source id ${item.source}` });
  if (others.some((i) => i.to === item.to)) Object.assign(item, { action: "leave", reason: `another planned move already goes to ${item.to}` });
  p.items = [...p.items.filter((i) => i.from !== item.from || i.done), item];
  p.at = new Date().toISOString();
  mkdirSync(dirname(ventureFile(dir, PLAN)), { recursive: true });
  writeFileSync(ventureFile(dir, PLAN), JSON.stringify(p, null, 2) + "\n");
  return { plan: p, item };
}

/** Carries out the plan as the founder left it. Checks every item before moving any. */
export function apply(dir, p, { agent = agentFromEnv("person", "cli"), evenIfBusy = false } = {}) {
  const moves = p.items.filter((i) => i.action === "move" && !i.done);
  const ids = new Set(readMap(dir).sources.map((s) => s.id));
  for (const i of moves) {
    if (!existsSync(i.from)) throw new Error(`${i.from} is gone; write the plan again`);
    const s = statSync(i.from);
    if (s.dev !== i.identity.dev || s.ino !== i.identity.ino) throw new Error(`${i.from} is not the folder the plan was written for; write the plan again`);
    if (existsSync(i.to)) throw new Error(`${i.to} already exists; a port never overwrites`);
    if (ids.has(i.source)) throw new Error(`sources.json already has a source ${i.source}`);
    const b = busy(i.from);
    if (b.length && !evenIfBusy) throw new Error(`${b.length} process${b.length === 1 ? " is" : "es are"} working inside ${i.from} (${b.map((x) => `${x.command} ${x.pid}`).join(", ")}); stop them or add --even-if-busy`);
  }
  const done = [];
  for (const i of moves) {
    mkdirSync(dirname(i.to), { recursive: true });
    renameSync(i.from, i.to);
    const map = readMap(dir);
    const root = inside(i.to, real(dir)) ? relative(real(dir), i.to) : i.to;
    map.sources.push({ id: i.source, connector: "filesystem", writes: "none", root, note: `source of truth, moved here unchanged from ${i.from} by naive port` });
    mkdirSync(dirname(ventureFile(dir, MAP)), { recursive: true });
    writeFileSync(ventureFile(dir, MAP), JSON.stringify(map, null, 2) + "\n");
    record(dir, /** @type {Parameters<typeof record>[1]} */ ({ entity: root, activity: "port", agent, derived_from: [`file://${i.from}`], sha256: measure(i.to).manifest, note: `moved unchanged (${i.files} files); named in sources.json as source ${i.source}` }));
    i.done = new Date().toISOString();
    done.push(i);
    writeFileSync(ventureFile(dir, PLAN), JSON.stringify(p, null, 2) + "\n");
  }
  return done;
}

// One run as a trace for platform/integrations/langsmith.mjs: the run, and a child per item.
function trace(dir, name, inputs, start, items, error) {
  const end = new Date().toISOString();
  const t = { name, run_type: "chain", start, end, inputs, outputs: { items: items.map(({ from, to, action, done }) => ({ from, to, action, done })) }, ...(error ? { error } : {}),
    tags: ["naive", "port"], children: items.map((i) => ({ name: `${i.action} ${basename(i.from)}`, run_type: "tool", start, end, inputs: { from: i.from, to: i.to },
      outputs: { action: i.action, reason: i.reason, files: i.files, bytes: i.bytes, warnings: i.warnings, done: i.done } })) };
  try { mkdirSync(dirname(ventureFile(dir, TRACE)), { recursive: true }); writeFileSync(ventureFile(dir, TRACE), JSON.stringify(t, null, 2) + "\n"); } catch { return; }
  // The harness's way (interface/harness/run.mjs): with a key set, the platform exporter ships the trace.
  if (process.env.LANGSMITH_API_KEY) {
    const p = spawnSync("node", [join(dirname(new URL(import.meta.url).pathname), "../platform/integrations/langsmith.mjs"), ventureFile(dir, TRACE), "--project", process.env.LANGSMITH_PROJECT ?? "naive-port"], { encoding: "utf8" });
    console.log(p.status === 0 ? `LangSmith: ${p.stdout.trim()}` : `LangSmith upload failed: ${(p.stderr || p.stdout).trim()}`);
  }
}

const mb = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(`--${k}`); return i < 0 ? undefined : args[i + 1]; };
  const all = (k) => args.flatMap((a, i) => a === `--${k}` ? [args[i + 1]] : []);
  const VALUED = new Set(["--venture", "--to", "--links", "--confirm", "--from"]);
  const folder = opt("from") ?? args.find((a, i) => !a.startsWith("--") && !VALUED.has(args[i - 1]));
  const dir = opt("venture");
  if (!dir) { console.error("usage: node schema/port-venture.mjs <folder> --venture <dir> [--to <path>] | --venture <dir> --apply --confirm port"); process.exit(2); }
  const start = new Date().toISOString();
  if (args.includes("--apply")) {
    if (opt("confirm") !== "port") { console.error("type --confirm port to carry out the plan"); process.exit(1); }
    const p = readPlan(dir);
    if (!p) { console.error(`no plan at ${ventureFile(dir, PLAN)}: run naive port <folder> first`); process.exit(1); }
    try {
      const d = apply(dir, p, { evenIfBusy: args.includes("--even-if-busy") });
      trace(dir, "naive port apply", { venture: dir }, start, d);
      for (const i of d) console.log(`moved  ${i.from}  ->  ${i.to}   (${i.files} files, unchanged; source ${i.source})`);
      for (const i of d.filter((x) => x.git?.worktrees.length)) console.log(`\nrepair its worktrees: git -C ${i.to} worktree repair`);
      console.log(`\nmoved ${d.length} folder${d.length === 1 ? "" : "s"}. Trace: ${relative(process.cwd(), ventureFile(dir, TRACE))}`);
    } catch (e) { trace(dir, "naive port apply", { venture: dir }, start, p.items, e.message); console.error(e.message); process.exit(1); }
  } else {
    if (!folder) { console.error("name the folder to port: naive port <folder>"); process.exit(2); }
    try {
      const { plan: p, item } = plan(folder, dir, { to: opt("to"), links: all("links") });
      trace(dir, "naive port plan", { folder, venture: dir, to: opt("to") }, start, [item]);
      for (const i of p.items) {
        console.log(`${(i.done ? "moved" : i.action).padEnd(5)}  ${i.from}  ->  ${i.to}   (${i.files} files, ${mb(i.bytes)}${i.reason ? `; ${i.reason}` : ""})`);
        if (!i.done) for (const w of i.warnings ?? []) console.log(`       ! ${w}`);
      }
      const n = p.items.filter((i) => i.action === "move" && !i.done).length;
      console.log(`\n${n} folder${n === 1 ? "" : "s"} to move, unchanged. Nothing has moved yet.`);
      console.log(`Read ${relative(process.cwd(), ventureFile(dir, PLAN))}, set any item's action to leave, then run with --apply --confirm port.`);
    } catch (e) { trace(dir, "naive port plan", { folder, venture: dir }, start, [], e.message); console.error(e.message); process.exit(1); }
  }
}
