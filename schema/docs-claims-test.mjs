#!/usr/bin/env node
// Cases for schema/check-docs-claims.mjs: claims the code has pass, claims it lacks fail, and the docs pass.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
expect("a string literal in the source is not a flag", "```sh\nnaive check --node\n```\n", false, /naive check --node/);
expect("a missing repo file fails", "See `schema/does-not-exist.mjs`.\n", false, /no such file/);
expect("an unknown route fails", "Read `foundation/nothing-here`.\n", false, /not a route/);
expect("an unknown mentura command fails", "`mentura frobnicate --venture x`\n", false, /mentura frobnicate/);
expect("a line that says not built passes", "`naive teleport` is not built yet.\n", true);
expect("an allow comment passes", "`naive teleport` <!-- claim-ok: planned -->\n", true);
writeFileSync(join(dir, "README.md"), "");
expect("a relative link to a real file passes", "See [the folder's README](./README.md#top).\n", true);
expect("a broken relative link fails", "See [nothing](./no-such-readme.md).\n", false, /the link points at nothing/);
expect("web, anchor and site links are not checked", "[a](https://example.com) [b](#top) [c](/docs/reference)\n", true);
const scanned = spawnSync("node", ["schema/check-docs-claims.mjs", "--scanned"], { cwd: repo, encoding: "utf8", input: "docs/design/x.md\ndocs/master/naive-docs.md\nsite/content/docs/index.mdx\nsite/content/docs/meta.json\nknowledge/skills/x/SKILL.md\n.agents/x/SKILL.md\nnode_modules/x/SKILL.md\nschema/x.mjs\nschema/README.md\nREADME.md\n" }).stdout.trim().split("\n");
const scannedOk = scanned.join() === "docs/master/naive-docs.md,site/content/docs/index.mdx,knowledge/skills/x/SKILL.md,schema/README.md,README.md";
if (!scannedOk) failed++;
console.log(`${scannedOk ? "pass" : "FAIL"}  docs-required counts only the docs this linter scans${scannedOk ? "" : `\n${scanned.join("\n")}`}`);
const owedOf = (input) => spawnSync("node", ["schema/check-docs-claims.mjs", "--readmes"], { cwd: repo, encoding: "utf8", input }).stdout.trim();
const owed = [
  ["code next to a README owes that README", "schema/check-nouns.mjs\n", "schema/README.md"],
  ["changing the README pays it", "schema/check-nouns.mjs\nschema/README.md\n", ""],
  ["the nearest README is the one owed", "purpose/frameworks/idea-map/x.mjs\n", "purpose/frameworks/idea-map/README.md"],
  ["code with no README in its top folder owes none", "interface/cli/naive.mjs\n", ""],
  ["a doc is not code", "schema/notes.md\n", ""],
];
for (const [name, input, want] of owed) {
  const got = owedOf(input);
  if (got !== want) failed++;
  console.log(`${got === want ? "pass" : "FAIL"}  ${name}${got === want ? "" : `\n  want ${want || "(none)"}, got ${got || "(none)"}`}`);
}
const workflow = readFileSync(join(repo, ".github/workflows/docs-required.yml"), "utf8");
const wired = workflow.includes('echo "$changed" | node schema/check-docs-claims.mjs --scanned') && workflow.includes('echo "$changed" | node schema/check-docs-claims.mjs --readmes');
if (!wired) failed++;
console.log(`${wired ? "pass" : "FAIL"}  the docs-required workflow asks this linter which changes are docs`);
const all = spawnSync("node", ["schema/check-docs-claims.mjs"], { cwd: repo, encoding: "utf8" });
if (all.status !== 0) failed++;
console.log(`${all.status === 0 ? "pass" : "FAIL"}  the docs, master docs, skills and READMEs claim only what is built${all.status === 0 ? "" : `\n${all.stdout}`}`);
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
