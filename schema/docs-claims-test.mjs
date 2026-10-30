#!/usr/bin/env node
// Cases for schema/check-docs-claims.mjs: claims the code has pass, claims it lacks fail, and the docs pass.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "docs-claims-"));
const run = (text) => { const f = join(dir, `${Math.random().toString(36).slice(2)}.md`); writeFileSync(f, text); return spawnSync("node", ["schema/check-docs-claims.mjs", f], { cwd: repo, encoding: "utf8" }); };
let failed = 0;
const expect = (name, text, ok, pattern) => {
  const r = run(text);
  const good = (r.status === 0) === ok && (!pattern || pattern.test(r.stdout));
  if (!good) failed++;
  console.log(`${good ? "pass" : "FAIL"}  ${name}${good ? "" : `\n${r.stdout}`}`);
};
expect("a built command, flag, file and route pass", "Run `naive phase --meet x --evidence y`, see `schema/check-docs-claims.mjs`, read `foundation/problem`, keep `k-base/raw/` and `artifacts/<id>.json`.\n", true);
expect("an unknown naive command fails", "Run `naive teleport`.\n", false, /naive teleport: interface\/cli\/naive.mjs has no such command/);
expect("a flag the command never reads fails", "```sh\nnaive phase --warp 9\n```\n", false, /naive phase --warp/);
expect("a missing repo file fails", "See `schema/does-not-exist.mjs`.\n", false, /no such file/);
expect("an unknown route fails", "Read `foundation/nothing-here`.\n", false, /not a route/);
expect("an unknown mentura command fails", "`mentura frobnicate --venture x`\n", false, /mentura frobnicate/);
expect("a line that says not built passes", "`naive teleport` is not built yet.\n", true);
expect("an allow comment passes", "`naive teleport` <!-- claim-ok: planned -->\n", true);
const all = spawnSync("node", ["schema/check-docs-claims.mjs"], { cwd: repo, encoding: "utf8" });
if (all.status !== 0) failed++;
console.log(`${all.status === 0 ? "pass" : "FAIL"}  the docs, master docs and skills claim only what is built${all.status === 0 ? "" : `\n${all.stdout}`}`);
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
