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
// a venture has (schema/upgrades.mjs), so the skill copies follow the installed packages. adapt() and
// refresh() are in schema/adapters.mjs, because they write files and run no route; this module re-exports
// them, and keeps verify(), which runs routes, and the command line.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ventureFile } from "../packages/core/venture-paths.mjs";
import { adapt, adapters, byName, refresh, skillsFor } from "../schema/adapters.mjs";

export { adapt, adapters, refresh, skillsFor, STATE } from "../schema/adapters.mjs";

const repo = new URL("..", import.meta.url).pathname;
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
