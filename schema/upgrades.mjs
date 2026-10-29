// Upgrades (EE-076; the Next.js translation's chapter 18, rows U-1 to U-6): what `next upgrade`, its
// codemods, `--agent`, the canary channel and the version guides become in Naive.
//
//   U-1  naive upgrade moves a venture onto the installed framework and pins it and its packages in
//        naive.config.json; --framework first updates the installed framework (git pull --ff-only).
//   U-2  migrations (schema/migrations/*.mjs) rewrite records when the framework or a package's schema
//        changes, with route aliases for renamed folders. The kit-to-package rename is the first record
//        migration; the package layout move before it is the first layout one.
//   U-3  a staged upgrade runs on a copy under .naive/upgrade/, then the checks run on the copy; it lands
//        only when they pass and a person types the confirmation. The agent that works the copy is a
//        Mentura kit (platform/kits/agent-upgrade); this module is the part that decides.
//   U-5  channels: stable, or canary for experimental packages; a later phase's package can be adopted
//        early, by name.
//   U-6  each framework version has a guide bundled in docs/upgrades/, printed from the installed copy.
//
// Code decides here: no model is called. The registry is schema/upgrades.json (NAIVE_UPGRADES points
// at another one, for tests).

import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import { agentFromEnv, record } from "../interface/provenance.mjs";
import { routes, glob } from "../interface/router.mjs";
import { CONFIG, pins, readConfig, writeConfig } from "./naive-config.mjs";
import { packages as packageFit } from "./packages.mjs";

export const repo = new URL("..", import.meta.url).pathname;
export const STAGE = ".naive/upgrade";
export const STAGED = `${STAGE}/venture`;
export const DRAFT = `${STAGE}/draft.json`;
export const CONFIRM = "upgrade";
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const now = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const sha = (buf) => createHash("sha256").update(buf).digest("hex");

/** Compares two x.y.z versions. */
export const cmp = (a, b) => {
  const x = String(a).split(".").map(Number), y = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

/** The upgrade registry of an installed framework (default: this copy). */
export function registry(root = repo) {
  const f = root === repo && process.env.NAIVE_UPGRADES ? process.env.NAIVE_UPGRADES : join(root, "schema/upgrades.json");
  return load(f);
}

const abs = (p, root = repo) => (isAbsolute(p) ? p : join(root, p));

/** The framework version a venture is on: its pin, or 0.1.0 for a venture made before pins. */
export function versionOf(dir) {
  return readConfig(dir).naive?.version ?? "0.1.0";
}

const kindOf = (name) => { const f = join(repo, "packages", name, "package.json"); return existsSync(f) ? load(f).kind : null; };

/** The packages a venture should be pinned to: what it pins now, what fits its phase now, and its data folders. */
function wanted(dir, reg, cfg) {
  const names = new Set(Object.keys(pins(cfg)));
  try { const p = packageFit(dir); for (const x of [...p.core, ...p.handoff]) if (x.in === "now") names.add(x.id); } catch {}
  for (const n of Object.keys(reg.packages)) if (["data", "raw", "folder"].includes(kindOf(n))) names.add(n);
  return [...names].sort();
}

async function loadMigration(m) {
  const mod = await import(pathToFileURL(abs(m.module)).href);
  if (typeof mod.apply !== "function") throw new Error(`${m.module} exports no apply(dir, ctx)`);
  return { ...m, describe: mod.describe ?? m.id, apply: mod.apply };
}

/**
 * What an upgrade would do, without doing it: the framework versions it crosses, with their guides and
 * migrations, and each package's pin before and after with the package migrations it runs.
 */
export function plan(dir, { reg = registry() } = {}) {
  if (!existsSync(join(dir, "venture.json"))) throw new Error(`${dir} is not a venture (no venture.json)`);
  const cfg = readConfig(dir);
  const from = versionOf(dir), to = reg.framework;
  const byId = new Map(reg.migrations.map((m) => [m.id, m]));
  const steps = reg.versions.filter((v) => cmp(v.version, from) > 0 && cmp(v.version, to) <= 0).sort((a, b) => cmp(a.version, b.version))
    .map((v) => ({ version: v.version, summary: v.summary, guide: v.guide, migrations: v.migrations.map((id) => { const m = byId.get(id); if (!m) throw new Error(`version ${v.version} names migration ${id}, which is not in the registry`); return m; }) }));
  const current = pins(cfg);
  const pkgs = wanted(dir, reg, cfg).map((name) => {
    const info = reg.packages[name];
    const was = current[name]?.version ?? null;
    if (!info) return { name, from: was, to: was, missing: true, migrations: [] };
    const migrations = reg.migrations.filter((m) => m.package === name && cmp(m.to, info.version) <= 0 && (was === null || (cmp(was, m.from ?? "0.0.0") >= 0 && cmp(was, m.to) < 0)));
    return { name, from: was, to: info.version, channel: info.channel, early: !!current[name]?.early, migrations };
  });
  const pending = steps.length > 0 || pkgs.some((p) => !p.missing && (p.from === null || cmp(p.from, p.to) !== 0)) || cfg.naive?.version !== to;
  return { venture: load(join(dir, "venture.json")).id, from, to, channel: cfg.naive?.channel ?? "stable", steps, packages: pkgs, pending };
}

// The changes one migration makes, all through here, so a dry run reports them and a real run logs them.
function context(dir, { dry, git, cfg, at, onConfig }) {
  const moved = [], writes = [], escalated = [], notes = [], kept = [];
  const tracked = (p) => git && spawnSync("git", ["ls-files", "--error-unmatch", p], { cwd: dir, stdio: "pipe" }).status === 0;
  const removeEmpty = (p) => {
    if (!existsSync(p) || !statSync(p).isDirectory()) return;
    for (const e of readdirSync(p, { withFileTypes: true })) if (e.isDirectory()) removeEmpty(join(p, e.name));
    if (readdirSync(p).length === 0) rmSync(p, { recursive: true });
  };
  return {
    at, config: cfg, moved, writes, escalated, notes, kept,
    mv(a, b) {
      if (!existsSync(join(dir, a))) return;
      if (existsSync(join(dir, b)) && !moved.some(([, t]) => t === b)) throw new Error(`${b} already exists, so ${a} cannot move there; move one of them yourself and upgrade again`);
      if (!dry) {
        mkdirSync(dirname(join(dir, b)), { recursive: true });
        if (tracked(a)) execFileSync("git", ["mv", a, b], { cwd: dir, stdio: "pipe" });
        else renameSync(join(dir, a), join(dir, b));
      }
      moved.push([a, b]);
    },
    write(rel, text, { activity = "write", note, derived_from, log = true } = {}) {
      if (!dry) { mkdirSync(dirname(join(dir, rel)), { recursive: true }); writeFileSync(join(dir, rel), text); }
      writes.push({ path: rel, activity, note, derived_from, log });
    },
    escalate: (msg) => escalated.push(msg),
    note: (msg) => notes.push(msg),
    configChanged: () => onConfig(),
    removeEmpty: (rel) => { if (!dry) removeEmpty(join(dir, rel)); },
    keep(sub) {
      if (existsSync(join(dir, sub))) return;
      if (!dry) { mkdirSync(join(dir, sub), { recursive: true }); writeFileSync(join(dir, sub, ".gitkeep"), ""); }
      kept.push(sub);
    },
  };
}

/**
 * Upgrades a venture in place (U-1, U-2): runs each migration the plan names, pins the framework and
 * the packages in naive.config.json, writes .release/upgrade-<version>.json and logs every change in
 * provenance. dry: report only. Triggers do not fire on an upgrade's own writes.
 */
export async function upgrade(dir, { reg = registry(), dry = false, git = true } = {}) {
  const p = plan(dir, { reg });
  const cfg = readConfig(dir);
  const at = now();
  let configChanged = false;
  const ran = [];
  const held = process.env.NAIVE_TRIGGERS_ACTIVE;
  process.env.NAIVE_TRIGGERS_ACTIVE = "upgrade";
  const agent = agentFromEnv("agent", "cli", { id: process.env.MENTURA_ACTOR_ID ?? "naive-upgrade" });
  try {
    const order = [...p.steps.flatMap((s) => s.migrations.map((m) => ({ ...m, version: s.version }))), ...p.packages.flatMap((x) => x.migrations.map((m) => ({ ...m, version: `${x.name}@${m.to}` })))];
    // A dry run first, so a conflict stops the upgrade before anything moves.
    if (!dry) for (const m of order) { const mod = await loadMigration(m); mod.apply(dir, context(dir, { dry: true, git, cfg: structuredClone(cfg), at, onConfig() {} })); }
    for (const m of order) {
      const mod = await loadMigration(m);
      const ctx = context(dir, { dry, git, cfg, at, onConfig: () => { configChanged = true; } });
      mod.apply(dir, ctx);
      ran.push({ id: m.id, version: m.version, describe: mod.describe, decision: m.decision ?? null, moves: ctx.moved.map(([from, to]) => ({ from, to })),
        rewrote: ctx.writes.filter((w) => w.activity === "write").map((w) => w.path), escalated: ctx.escalated, notes: ctx.notes });
      if (dry) continue;
      for (const [from, to] of ctx.moved) record(dir, { entity: to, activity: "move", agent, derived_from: [from], note: `moved from ${from} (${m.decision ?? m.id})` });
      for (const w of ctx.writes.filter((x) => x.log)) record(dir, { entity: w.path, activity: w.activity, agent, derived_from: w.derived_from, note: `${m.id}: ${w.note ?? "rewritten"}`, decision: m.decision ?? undefined });
    }
    // Pins (U-1, U-4): the framework, the channel, and every package the venture uses.
    const before = JSON.stringify(cfg);
    cfg.naive = { ...(cfg.naive ?? {}), version: p.to, channel: cfg.naive?.channel ?? "stable" };
    const now_ = pins(cfg);
    const escalated = [];
    for (const x of p.packages) {
      if (x.missing) { escalated.push(`package ${x.name} is pinned but no longer in Naive ${p.to}; its pin is kept`); continue; }
      now_[x.name] = { ...(now_[x.name] ?? {}), version: x.to, ...(x.channel === "experimental" ? { channel: "experimental" } : {}) };
    }
    // A package a migration named (a kit that was a package) is pinned to the installed version too.
    for (const [n, v] of Object.entries(now_)) if (!v.version && reg.packages[n]) now_[n] = { ...v, version: reg.packages[n].version };
    cfg.packages = Object.fromEntries(Object.entries(now_).sort(([a], [b]) => a.localeCompare(b)));
    if (JSON.stringify(cfg) !== before) configChanged = true;
    const release = { version: p.to, from: p.from, at, venture: p.venture, channel: cfg.naive.channel, migrations: ran,
      packages: p.packages.filter((x) => !x.missing).map((x) => ({ name: x.name, from: x.from, to: x.to })), guides: p.steps.map((s) => s.guide).filter(Boolean), escalated: [...ran.flatMap((r) => r.escalated), ...escalated] };
    if (!dry && (p.pending || configChanged)) {
      if (configChanged) { writeConfig(dir, cfg); record(dir, { entity: CONFIG, activity: "write", agent, note: `pinned Naive ${p.to} and ${Object.keys(cfg.packages).length} packages (U-1)` }); }
      const rel = `.release/upgrade-${p.to}.json`;
      mkdirSync(join(dir, ".release"), { recursive: true });
      writeFileSync(join(dir, rel), JSON.stringify(release, null, 2) + "\n");
      record(dir, { entity: rel, activity: "release", agent, derived_from: [...new Set([...ran.flatMap((r) => [...r.moves.map((m) => m.to), ...r.rewrote]), ...(configChanged ? [CONFIG] : [])])], note: `upgraded from Naive ${p.from} to ${p.to}` });
      // Adapters installed in the venture (Z-4) are refreshed, so their copies of package skills follow the upgrade.
      release.adapters = await refreshAdapters(dir);
    }
    return { ...p, dry, release, changed: !dry && (p.pending || configChanged) };
  } finally {
    if (held === undefined) delete process.env.NAIVE_TRIGGERS_ACTIVE; else process.env.NAIVE_TRIGGERS_ACTIVE = held;
  }
}

/** The guide bundled for one framework version (U-6), or null. */
export function guide(version, { reg = registry() } = {}) {
  const v = reg.versions.find((x) => x.version === version);
  if (!v) throw new Error(`Naive has no version ${version}: ${reg.versions.map((x) => x.version).join(", ")}`);
  return v.guide && existsSync(abs(v.guide)) ? { version, path: v.guide, text: readFileSync(abs(v.guide), "utf8") } : null;
}

/** Switches the venture's channel (U-5): stable, or canary for experimental packages. */
export function setChannel(dir, channel, { reg = registry() } = {}) {
  if (!["stable", "canary"].includes(channel)) throw new Error(`channel ${channel}: stable or canary`);
  const cfg = readConfig(dir);
  if (cfg.naive?.channel === channel) return { changed: false, channel };
  const experimental = Object.entries(pins(cfg)).filter(([n]) => reg.packages[n]?.channel === "experimental").map(([n]) => n);
  if (channel === "stable" && experimental.length) throw new Error(`the venture uses experimental packages (${experimental.join(", ")}): drop them first (--drop <package>)`);
  cfg.naive = { version: versionOf(dir), ...(cfg.naive ?? {}), channel };
  writeConfig(dir, cfg);
  record(dir, { entity: CONFIG, activity: "write", agent: agentFromEnv(process.env.MENTURA_ACTOR === "agent" ? "agent" : "person", "cli"), note: `channel set to ${channel} (U-5)` });
  return { changed: true, channel };
}

/**
 * Adopts a package before its phase (U-5): it is pinned with early: true, and the venture package
 * opens it now. An experimental package needs the canary channel. The venture must be on the
 * installed framework first.
 */
export function adopt(dir, name, { reg = registry() } = {}) {
  const info = reg.packages[name];
  if (!info) throw new Error(`no package ${name} in Naive ${reg.framework}: ${Object.keys(reg.packages).join(", ")}`);
  if (cmp(versionOf(dir), reg.framework) !== 0) throw new Error(`the venture is on Naive ${versionOf(dir)}: upgrade it to ${reg.framework} before adopting packages`);
  const cfg = readConfig(dir);
  if (info.channel === "experimental" && cfg.naive?.channel !== "canary") throw new Error(`${name} is experimental (${info.note ?? "not modeled yet"}): switch to the canary channel first (--canary)`);
  const current = pins(cfg);
  if (current[name]?.early) return { changed: false, name, note: `${name} is already adopted early` };
  let fit = null;
  try { fit = [...packageFit(dir).core, ...packageFit(dir).handoff].find((x) => x.id === name) ?? null; } catch {}
  if (fit?.in === "now" && info.channel !== "experimental") return { changed: false, name, note: `${name} already fits this phase (fit ${fit.fit}); nothing to adopt` };
  current[name] = { version: info.version, early: true, ...(info.channel === "experimental" ? { channel: "experimental" } : {}) };
  cfg.packages = Object.fromEntries(Object.entries(current).sort(([a], [b]) => a.localeCompare(b)));
  writeConfig(dir, cfg);
  record(dir, { entity: CONFIG, activity: "write", agent: agentFromEnv(process.env.MENTURA_ACTOR === "agent" ? "agent" : "person", "cli"), note: `adopted the ${name} package early (U-5)` });
  return { changed: true, name, version: info.version, channel: info.channel, fit: fit?.fit ?? null };
}

/** Undoes an early adoption: the pin goes, and the package fits by its phase prior again. */
export function drop(dir, name) {
  const cfg = readConfig(dir);
  const current = pins(cfg);
  if (!current[name]?.early) throw new Error(`${name} was not adopted early, so there is nothing to drop`);
  delete current[name];
  cfg.packages = current;
  writeConfig(dir, cfg);
  record(dir, { entity: CONFIG, activity: "write", agent: agentFromEnv(process.env.MENTURA_ACTOR === "agent" ? "agent" : "person", "cli"), note: `dropped the early adoption of ${name} (U-5)` });
  return { changed: true, name };
}

/**
 * Updates the installed framework (U-1): a fast-forward pull of the git checkout Naive runs from. A
 * checkout with local changes, or one that cannot fast-forward, is left as it is.
 */
export function updateFramework(root = repo) {
  const git = (...a) => spawnSync("git", ["-C", root, ...a], { encoding: "utf8" });
  if (git("rev-parse", "--is-inside-work-tree").stdout.trim() !== "true") return { ok: false, error: `${root} is not a git checkout: install Naive again from its repository` };
  if (git("status", "--porcelain", "--untracked-files=no").stdout.trim()) return { ok: false, error: `${root} has local changes: commit or stash them, then update` };
  const from = registry(root).framework, head = git("rev-parse", "HEAD").stdout.trim();
  const pull = git("pull", "--ff-only");
  if (pull.status !== 0) return { ok: false, error: `could not fast-forward ${root}: ${(pull.stderr || pull.stdout).trim()}` };
  const after = git("rev-parse", "HEAD").stdout.trim();
  return { ok: true, from, to: registry(root).framework, commits: after === head ? 0 : Number(git("rev-list", "--count", `${head}..${after}`).stdout.trim()), head: after };
}

// Staged upgrades (U-3). The copy holds everything but .naive/, _private/ (never sent to an agent) and
// nested ventures, which upgrade on their own.
export function snapshot(dir, { skipPrivate = true } = {}) {
  const out = {};
  const walk = (rel) => {
    for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (!rel && (r === ".naive" || r === ".git" || (skipPrivate && r === "_private"))) continue;
      if (e.isDirectory()) { if (!existsSync(join(dir, r, "venture.json"))) walk(r); }
      else if (e.isFile()) out[r] = sha(readFileSync(join(dir, r)));
    }
  };
  walk("");
  return out;
}

const writeDraft = (dir, d) => { mkdirSync(join(dir, STAGE), { recursive: true }); writeFileSync(join(dir, DRAFT), JSON.stringify(d, null, 2) + "\n"); return d; };
/** Adds to the staged upgrade's draft record (what an agent did, say). */
export function annotate(dir, extra) {
  const d = draft(dir);
  if (!d) throw new Error("no upgrade is staged");
  return writeDraft(dir, { ...d, ...extra });
}
/** The staged upgrade's draft record, or null. */
export const draft = (dir) => (existsSync(join(dir, DRAFT)) ? load(join(dir, DRAFT)) : null);

/** Copies the venture to .naive/upgrade/venture and upgrades the copy. Nothing in the venture changes. */
export async function stage(dir, { reg = registry(), by = "naive" } = {}) {
  if (existsSync(join(dir, STAGE))) throw new Error(`an upgrade is already staged in ${STAGE}: accept it (--accept --confirm ${CONFIRM}) or reject it (--reject)`);
  const p = plan(dir, { reg });
  if (!p.pending) throw new Error(`${p.venture} is already on Naive ${p.to} with every package pinned: nothing to stage`);
  const base = snapshot(dir);
  const out = join(dir, STAGED);
  for (const f of Object.keys(base)) { mkdirSync(dirname(join(out, f)), { recursive: true }); copyFileSync(join(dir, f), join(out, f)); }
  const result = await upgrade(out, { reg, git: false });
  return writeDraft(dir, { status: "staged", from: p.from, to: p.to, staged_at: now(), by, base, migrations: result.release.migrations.map((m) => ({ id: m.id, moves: m.moves.length, rewrote: m.rewrote.length })), escalated: result.release.escalated, guides: result.release.guides });
}

// The checks a staged upgrade must pass before it lands: the venture-wide checkers, every routed JSON
// record against its schema, and nothing left to upgrade.
export const CHECKS = ["schema/check-ventures.mjs", "schema/check-provenance.mjs", "schema/decisions.mjs", "schema/check-data-packages.mjs", "schema/check-private.mjs", "schema/check-sources.mjs", "schema/check-where-used.mjs", "schema/check-governance.mjs"];

/** Runs the checks on any venture folder: [{ check, passed, output }]. */
export function runChecks(vdir, { reg = registry() } = {}) {
  const out = CHECKS.map((c) => { const r = spawnSync("node", [join(repo, c), vdir], { encoding: "utf8" }); return { check: c, passed: r.status === 0, output: (r.stdout + r.stderr).trim().slice(-1500) }; });
  const files = Object.keys(snapshot(vdir, { skipPrivate: true })).filter((f) => f.endsWith(".json"));
  const bad = [];
  let n = 0;
  for (const r of routes().filter((x) => x.kind === "record" && x.schema && (x.form ?? "json") === "json")) {
    for (const f of files.filter((f) => r.files.some((g) => glob(g).test(f)))) {
      n++;
      const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", r.schema.replace(/^schema\//, ""), "--file", join(vdir, f)], { encoding: "utf8" });
      if (v.status !== 0) bad.push(`${f} does not match ${r.schema}: ${(v.stdout + v.stderr).trim().split("\n")[0]}`);
    }
  }
  out.push({ check: "records match their schemas", passed: !bad.length, output: bad.length ? bad.join("\n") : `${n} records valid` });
  let left;
  try { left = plan(vdir, { reg }); } catch (e) { left = { pending: true, error: e.message }; }
  out.push({ check: "nothing left to upgrade", passed: !left.pending, output: left.pending ? (left.error ?? `still on ${left.from}, or a package is not pinned to ${left.to}`) : `on Naive ${left.to}` });
  return out;
}

/** What the staged copy changes: files added, changed and removed (the venture's _private/ is never removed). */
export function changes(dir) {
  const live = snapshot(dir), staged = snapshot(join(dir, STAGED), { skipPrivate: false });
  return {
    added: Object.keys(staged).filter((f) => !(f in live) && !existsSync(join(dir, f))).sort(),
    changed: Object.keys(staged).filter((f) => (f in live && live[f] !== staged[f]) || (!(f in live) && existsSync(join(dir, f)) && sha(readFileSync(join(dir, f))) !== staged[f])).sort(),
    removed: Object.keys(live).filter((f) => !(f in staged)).sort(),
  };
}

/** Runs the checks on the staged copy and records the result: ready, or checks-failed. */
export function check(dir, { reg = registry() } = {}) {
  const d = draft(dir);
  if (!d) throw new Error("no upgrade is staged: stage one with --stage or --agent");
  const checks = runChecks(join(dir, STAGED), { reg });
  const ok = checks.every((c) => c.passed);
  return writeDraft(dir, { ...d, status: ok ? "ready" : "checks-failed", checked_at: now(), checks, changes: changes(dir) });
}

/**
 * Lands a staged upgrade (U-3): only with the typed confirmation, only when the checks pass again now,
 * and only when the venture has not changed since the copy was made. Its provenance log continues the
 * venture's, so the chain holds; the person's acceptance is the last line.
 */
export async function accept(dir, { confirm, by, reg = registry() } = {}) {
  const d = draft(dir);
  if (!d) throw new Error("no upgrade is staged: stage one with --stage or --agent");
  if (confirm !== CONFIRM) throw new Error(`not accepted: type the confirmation (--confirm ${CONFIRM})`);
  const live = snapshot(dir);
  const drift = [...new Set([...Object.keys(live), ...Object.keys(d.base)])].filter((f) => live[f] !== d.base[f]);
  if (drift.length) throw new Error(`the venture changed since the upgrade was staged (${drift.slice(0, 5).join(", ")}): reject it and stage again`);
  const checked = check(dir, { reg });
  if (checked.status !== "ready") throw new Error(`not accepted: the checks fail on the staged copy:\n${checked.checks.filter((c) => !c.passed).map((c) => `  ${c.check}: ${c.output.split("\n").slice(-3).join(" / ")}`).join("\n")}`);
  const ch = checked.changes;
  const clash = ch.changed.filter((f) => f.startsWith("_private/"));
  if (clash.length) throw new Error(`not accepted: the upgrade would overwrite private files that differ (${clash.join(", ")}); move them aside, reject and stage again`);
  const src = join(dir, STAGED);
  for (const f of [...ch.added, ...ch.changed]) { mkdirSync(dirname(join(dir, f)), { recursive: true }); copyFileSync(join(src, f), join(dir, f)); }
  for (const f of ch.removed) rmSync(join(dir, f));
  // Folders the upgrade emptied go too, unless the copy still has them.
  const dirs = [...new Set(ch.removed.flatMap((f) => f.split("/").slice(0, -1).map((_, i, a) => a.slice(0, i + 1).join("/"))))].sort((a, b) => b.length - a.length);
  for (const x of dirs) if (existsSync(join(dir, x)) && !existsSync(join(src, x)) && readdirSync(join(dir, x)).length === 0) rmSync(join(dir, x), { recursive: true });
  rmSync(join(dir, STAGE), { recursive: true, force: true });
  return landed(dir, d, ch, by);
}

async function refreshAdapters(dir) {
  try { const { refresh } = await import("../interface/adapters.mjs"); return refresh(dir); } catch (e) { return { error: e.message }; }
}

async function landed(dir, d, ch, by) {
  const rel = `.release/upgrade-${d.to}.json`;
  const e = existsSync(join(dir, rel)) ? record(dir, { entity: rel, activity: "accept", agent: agentFromEnv("person", "cli", by ? { id: by } : {}), note: `accepted the staged upgrade to Naive ${d.to}${d.by && d.by !== "naive" ? ` (worked by ${d.by})` : ""}` }) : null;
  return { accepted: d.to, from: d.from, added: ch.added.length, changed: ch.changed.length, removed: ch.removed.length, provenance: e?.hash ?? null, adapters: await refreshAdapters(dir) };
}

/** Discards a staged upgrade. The venture never changed, so nothing is logged. */
export function reject(dir) {
  if (!existsSync(join(dir, STAGE))) throw new Error("no upgrade is staged");
  rmSync(join(dir, STAGE), { recursive: true, force: true });
  return { rejected: true };
}
