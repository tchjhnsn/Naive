#!/usr/bin/env node
// Adapters (Z-4). Next.js adapters let a platform customize build and deploy, and a verified adapter
// passes the Next.js test suite. Naive's adapters run the framework on a platform or in an agent
// harness. Mentura is the first, as Vercel is for Next.js (platform/adapter.json). Claude Code, Codex and
// Cursor adapt the framework through the venture's AGENTS.md and skills (interface/adapters/*.json):
// adapt() writes the entry files a harness reads and copies the skills of the packages open now. An
// adapter is verified when it passes the framework's tests: verify() runs them.
//
//   node interface/adapters.mjs [--json]                        the adapters
//   node interface/adapters.mjs adapt <adapter> <venture dir>   write a harness's files into a venture
//   node interface/adapters.mjs verify [<adapter>] [--json]     run the framework's tests an adapter must pass
//
// adapt() records what it wrote in <venture>/.naive/adapters.json and never overwrites a file it did not
// write, or one a person changed since: it keeps theirs and says so. An upgrade refreshes the adapters
// a venture has (schema/upgrades.mjs), so the skill copies follow the installed packages.

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ventureFile } from "../schema/venture-paths.mjs";

const repo = new URL("..", import.meta.url).pathname;
export const STATE = ".naive/adapters.json";
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const sha = (s) => createHash("sha256").update(s).digest("hex");

/** Every adapter: the harness adapters in interface/adapters/, and the platform's if this copy has one. */
export function adapters() {
  const d = join(repo, "interface/adapters");
  const out = existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).sort().map((f) => ({ ...load(join(d, f)), path: `interface/adapters/${f}` })) : [];
  if (existsSync(join(repo, "platform/adapter.json"))) out.unshift({ ...load(join(repo, "platform/adapter.json")), path: "platform/adapter.json" });
  return out;
}
const byName = (name) => { const a = adapters().find((x) => x.name === name); if (!a) throw new Error(`no adapter ${name}: ${adapters().map((x) => x.name).join(", ")}`); return a; };

/** The skills of the packages open now in a venture: [{ id, path, package }]. */
export async function skillsFor(dir) {
  const { packages } = await import("../schema/packages.mjs");
  const p = packages(dir);
  return [...p.core, ...p.handoff].filter((x) => x.in === "now").flatMap((x) => {
    const f = join(repo, "packages", x.id, "package.json");
    const s = existsSync(f) ? load(f).skill : null;
    return s && existsSync(join(repo, s.path)) ? [{ id: s.id, path: s.path, package: x.id }] : [];
  });
}

const readState = (dir) => (existsSync(ventureFile(dir, STATE)) ? load(ventureFile(dir, STATE)) : { adapters: {} });

/**
 * Writes a harness adapter's files into a venture: its entry files, and a copy of each open package's
 * skill in its skills folder. Returns what it wrote, what was already current, and what it kept.
 */
export async function adapt(dir, name) {
  if (!existsSync(join(dir, "venture.json"))) throw new Error(`${dir} is not a venture`);
  const a = byName(name);
  if (a.kind !== "harness") throw new Error(`${name} is a ${a.kind} adapter: it runs the framework itself and writes nothing into a venture`);
  const state = readState(dir);
  const mine = state.adapters[name]?.files ?? {};
  const want = [...a.files.map((f) => ({ path: f.path, text: f.text }))];
  if (a.skills) for (const s of await skillsFor(dir)) want.push({ path: `${a.skills}/${s.id}/SKILL.md`, text: readFileSync(join(repo, s.path), "utf8"), skill: s.id, package: s.package });
  const written = [], current = [], kept = [], files = {};
  for (const w of want) {
    const f = ventureFile(dir, w.path);
    const now = existsSync(f) ? readFileSync(f, "utf8") : null;
    if (now === w.text) { current.push(w.path); files[w.path] = sha(w.text); continue; }
    // Never overwrite a file a person wrote, or one they changed after the adapter wrote it.
    if (now !== null && mine[w.path] !== sha(now)) { kept.push({ path: w.path, why: mine[w.path] ? "changed since the adapter wrote it" : "it was there before the adapter" }); if (mine[w.path]) files[w.path] = mine[w.path]; continue; }
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, w.text);
    written.push(w.path);
    files[w.path] = sha(w.text);
  }
  // A skill copy for a package that is no longer open goes, if the adapter wrote it and nobody changed it.
  const removed = [];
  for (const [p, h] of Object.entries(mine)) {
    if (want.some((w) => w.path === p) || !existsSync(ventureFile(dir, p))) continue;
    if (sha(readFileSync(ventureFile(dir, p), "utf8")) === h) { rmSync(ventureFile(dir, p)); removed.push(p); } else kept.push({ path: p, why: "no longer needed, but changed by a person, so kept" });
  }
  state.adapters[name] = { at: new Date().toISOString(), files };
  mkdirSync(join(dir, ".naive"), { recursive: true });
  writeFileSync(ventureFile(dir, STATE), JSON.stringify(state, null, 2) + "\n");
  return { adapter: name, written, current, kept, removed, skills: want.filter((w) => w.skill).map((w) => w.skill) };
}

/** Re-adapts every adapter the venture has, after an upgrade. @returns {Promise<{ adapter: string, written?: string[], error?: string }[]>} */
export async function refresh(dir) {
  const names = Object.keys(readState(dir).adapters);
  const out = [];
  for (const n of names) { try { out.push(await adapt(dir, n)); } catch (e) { out.push({ adapter: n, error: e.message }); } }
  return out;
}

// The framework's tests for a harness adapter, run on a new venture in a temporary folder.
async function harnessSuite(a) {
  const results = [];
  const t = (test, passed, detail = "") => results.push({ test, passed: !!passed, detail });
  const ws = mkdtempSync(join(tmpdir(), `naive-adapter-${a.name}-`));
  try {
    const dir = join(ws, "adapted");
    const init = spawnSync("node", [join(repo, "schema/init-venture.mjs"), dir, "adapted"], { encoding: "utf8" });
    const up = spawnSync("node", [join(repo, "schema/upgrade-venture.mjs"), dir], { encoding: "utf8" });
    t("a new venture is created and upgraded to the installed framework", init.status === 0 && up.status === 0, init.stderr + up.stderr);
    const first = await adapt(dir, a.name);
    t("every entry file is written with the adapter's text", a.files.every((f) => existsSync(ventureFile(dir, f.path)) && readFileSync(ventureFile(dir, f.path), "utf8") === f.text), JSON.stringify(first.written));
    t("the harness reaches the venture's AGENTS.md (it reads it, or an entry file imports or names it)", a.reads.includes("AGENTS.md") || a.files.some((f) => /(^|\s)@AGENTS\.md\b|AGENTS\.md/.test(f.text)));
    t("no entry file is private or outside the venture", a.files.every((f) => !f.path.startsWith("_private/") && !f.path.includes("..") && !f.path.startsWith("/")));
    const { call } = await import("./router.mjs");
    const lay = await call({ venture: "adapted", workspace: ws, route: "foundation/problem", action: "layout" });
    t("the layout an agent gets starts with the venture's AGENTS.md and its instructions", lay.ok && lay.result.chain[0]?.path === "AGENTS.md" && lay.result.instructions.private === "_private/", lay.error ?? "");
    if (a.skills) {
      const want = await skillsFor(dir);
      t("the venture has packages open now with skills to copy", want.length > 0, "no open package has a skill");
      t("each open package's skill is copied byte for byte where the harness loads skills", want.every((s) => existsSync(join(dir, a.skills, s.id, "SKILL.md")) && readFileSync(join(dir, a.skills, s.id, "SKILL.md"), "utf8") === readFileSync(join(repo, s.path), "utf8")), JSON.stringify(want.map((s) => s.id)));
      rmSync(join(dir, a.skills, want[0].id, "SKILL.md"));
      const back = await refresh(dir);
      t("a refresh (as after an upgrade) puts a missing skill copy back", back[0]?.written?.includes(`${a.skills}/${want[0].id}/SKILL.md`), JSON.stringify(back));
    }
    const again = await adapt(dir, a.name);
    t("adapting again changes nothing", again.written.length === 0 && again.kept.length === 0, JSON.stringify(again));
    if (a.files.length) {
      const f = join(dir, a.files[0].path);
      writeFileSync(f, readFileSync(f, "utf8") + "\nThe founder's own line.\n");
      const edited = readFileSync(f, "utf8");
      const kept = await adapt(dir, a.name);
      t("a file the founder changed is kept, never overwritten", kept.kept.some((k) => k.path === a.files[0].path) && readFileSync(f, "utf8") === edited, JSON.stringify(kept));
      const other = join(ws, "own");
      spawnSync("node", [join(repo, "schema/init-venture.mjs"), other, "own"], { encoding: "utf8" });
      mkdirSync(dirname(join(other, a.files[0].path)), { recursive: true });
      writeFileSync(join(other, a.files[0].path), "the founder's own file\n");
      const theirs = await adapt(other, a.name);
      t("a file that was there before the adapter is kept", theirs.kept.some((k) => k.path === a.files[0].path) && readFileSync(join(other, a.files[0].path), "utf8") === "the founder's own file\n", JSON.stringify(theirs));
    }
  } catch (e) { t("the suite ran to the end", false, String(e.stack ?? e)); }
  finally { rmSync(ws, { recursive: true, force: true }); }
  return results;
}

// A platform adapter runs the framework itself; it is verified by the test programs it names.
function platformSuite(a) {
  if (!a.verify?.length) return [{ test: "names the framework tests it must pass", passed: false, detail: "verify is empty" }];
  return a.verify.map((p) => {
    if (!existsSync(join(repo, p))) return { test: p, passed: false, detail: "not found" };
    const r = spawnSync("node", [join(repo, p)], { cwd: repo, encoding: "utf8", timeout: 600000 });
    const tail = (r.stdout + r.stderr).trim().split("\n").slice(-4).join(" / ");
    return { test: p, passed: r.status === 0, detail: tail };
  });
}

/** Runs the framework's tests for one adapter: { adapter, kind, verified, results }. */
export async function verify(name) {
  const a = byName(name);
  const results = a.kind === "harness" ? await harnessSuite(a) : platformSuite(a);
  return { adapter: a.name, kind: a.kind, verified: results.every((r) => r.passed), results };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...rest] = process.argv.slice(2).filter((x) => x !== "--json");
  const json = process.argv.includes("--json");
  try {
    if (!cmd) {
      const list = adapters().map((a) => ({ name: a.name, title: a.title, kind: a.kind, path: a.path, reads: a.reads }));
      console.log(json ? JSON.stringify(list, null, 2) : list.map((a) => `${a.name.padEnd(12)} ${a.kind.padEnd(9)} ${a.path}  reads ${a.reads.join(", ")}`).join("\n"));
    } else if (cmd === "adapt") {
      const [name, dir] = rest;
      if (!name || !dir) throw new Error("usage: node interface/adapters.mjs adapt <adapter> <venture dir>");
      const r = await adapt(dir, name);
      console.log(json ? JSON.stringify(r, null, 2) : [`adapted for ${r.adapter}: ${r.written.length} written, ${r.current.length} already current, ${r.kept.length} kept${r.skills.length ? `; skills: ${r.skills.join(", ")}` : ""}`,
        ...r.written.map((p) => `wrote     ${p}`), ...r.kept.map((k) => `kept      ${k.path} (${k.why})`), ...r.removed.map((p) => `removed   ${p}`)].join("\n"));
    } else if (cmd === "verify") {
      const names = rest.length ? rest : adapters().map((a) => a.name);
      const rs = [];
      for (const n of names) rs.push(await verify(n));
      if (json) console.log(JSON.stringify(rs, null, 2));
      else for (const r of rs) {
        console.log(`${r.verified ? "verified" : "NOT verified"}  ${r.adapter} (${r.kind})`);
        for (const x of r.results) console.log(`  ${x.passed ? "pass" : "FAIL"}  ${x.test}${x.passed ? "" : `  ${x.detail}`}`);
      }
      process.exit(rs.every((r) => r.verified) ? 0 : 1);
    } else throw new Error("usage: node interface/adapters.mjs [adapt <adapter> <venture dir> | verify [<adapter>]] [--json]");
  } catch (e) { console.error(e.message); process.exit(1); }
}
