#!/usr/bin/env node
// Cases for packages/naive/src/checks/check-docs-claims.mjs: claims the code has pass, claims it lacks fail, and the docs pass.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("../../../..", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "docs-claims-"));
const run = (text, ext = ".md") => { const f = join(dir, `${Math.random().toString(36).slice(2)}${ext}`); writeFileSync(f, text); return spawnSync("node", ["packages/naive/src/checks/check-docs-claims.mjs", f], { cwd: repo, encoding: "utf8" }); };
let failed = 0;
const expect = (name, text, ok, pattern, ext) => {
  const r = run(text, ext);
  const good = (r.status === 0) === ok && (!pattern || pattern.test(r.stdout));
  if (!good) failed++;
  console.log(`${good ? "pass" : "FAIL"}  ${name}${good ? "" : `\n${r.stdout}${r.stderr}`}`);
};
expect("a built command, flag, file and route pass", "Run `naive phase --meet x --evidence y`, see `packages/naive/src/checks/check-docs-claims.mjs`, read `foundation/problem`, keep `k-base/raw/` and `artifacts/<id>.json`.\n", true);
expect("an unknown naive command fails", "Run `naive teleport`.\n", false, /naive teleport: packages\/naive\/src\/interfaces\/cli\/naive.mjs has no such command/);
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
expect("malformed percent-encoding is a normal failure with file and line", "line one\n[a](./50%.md)\n", false, /\.md:2: \.\/50%\.md: the link has malformed percent-encoding/);
expect("malformed percent-encoding does not hide other findings", "[a](./x%zz.md)\n`naive teleport`\n", false, /malformed percent-encoding[\s\S]*naive teleport/);
writeFileSync(join(dir, "c#.md"), "");
writeFileSync(join(dir, "foo(1).md"), "");
expect("percent-encoded, query and parenthesised links resolve", "[a](./c%23.md) [b](./README.md?plain=1) [c](./foo(1).md)\n", true);
expect("a titled link is checked", '[a](./missing.md "T")\n', false, /the link points at nothing/);
expect("an angle-bracket link is checked", "[a](<./no such file.md>)\n", false, /the link points at nothing/);
expect("a broken reference-style link is checked", "See [a][r].\n\n[r]: ./missing.md\n", false, /:3: \.\/missing\.md: the link points at nothing/);
expect("a good reference-style link passes", '[a][r]\n\n[r]: ./README.md "T"\n', true);
expect("a footnote is not a link", "[^1]: ./missing.md\n", true);
expect("any URL scheme is not checked", "[a](HTTPS://example.com) [b](git+ssh://x)\n[r]: mailto:a@example.com\n", true);
writeFileSync(join(dir, "onlymdx.mdx"), "");
mkdirSync(join(dir, "section"));
writeFileSync(join(dir, "section", "index.mdx"), "");
expect("a README link does not fall back to .mdx", "[a](./onlymdx)\n", false, /the link points at nothing/);
expect("an .mdx doc falls back to .mdx and index.mdx", "[a](./onlymdx) [b](./section)\n", true, null, ".mdx");
const scanned = spawnSync("node", ["packages/naive/src/checks/check-docs-claims.mjs", "--scanned"], { cwd: repo, encoding: "utf8", input: "docs/design/x.md\ndocs/master/naive-docs.md\nsite/content/docs/index.mdx\nsite/content/docs/meta.json\nknowledge/skills/x/SKILL.md\n.agents/x/SKILL.md\nnode_modules/x/SKILL.md\npackages/naive/src/engine/x.mjs\npackages/naive/src/engine/README.md\nREADME.md\npackages/naive/library/packages/finance/playbooks/bessemer-saas-metrics.md\npackages/naive/library/packages/finance/playbooks/x/deep.md\npackages/naive/test/verification/lint-finance/README.md\n" }).stdout.trim().split("\n");
const scannedOk = scanned.join() === "docs/master/naive-docs.md,knowledge/skills/x/SKILL.md,packages/naive/src/engine/README.md,README.md,packages/naive/library/packages/finance/playbooks/bessemer-saas-metrics.md,packages/naive/test/verification/lint-finance/README.md";
if (!scannedOk) failed++;
console.log(`${scannedOk ? "pass" : "FAIL"}  docs-required counts only the docs this linter scans${scannedOk ? "" : `\n${scanned.join("\n")}`}`);
const tree = join(dir, "tree");
for (const d of ["packages/naive/src/engine", "packages/naive/src/checks", "packages/naive/src/records", "purpose/deep", "interface"]) mkdirSync(join(tree, d), { recursive: true });
for (const r of ["packages/naive/src/engine/README.md", "packages/naive/src/checks/README.md", "packages/naive/src/records/README.md", "purpose/README.md", "purpose/deep/README.md"]) writeFileSync(join(tree, r), "");
mkdirSync(join(tree, "purpose/deep/playbooks"), { recursive: true });
const owedOf = (input) => spawnSync("node", ["packages/naive/src/checks/check-docs-claims.mjs", "--readmes", "--root", tree], { cwd: repo, encoding: "utf8", input }).stdout.trim();
const owed = [
  ["code next to a README owes that README", "packages/naive/src/engine/x.mjs\n", "packages/naive/src/engine/README.md"],
  ["a lint owes the checks README", "packages/naive/src/checks/lint-finance.mjs\n", "packages/naive/src/checks/README.md"],
  ["a playbook with no README in its package owes none", "packages/naive/library/packages/finance/playbooks/bessemer-saas-metrics.md\n", ""],
  ["a playbook JSON next to a README owes none", "purpose/deep/playbooks/first.json\n", ""],
  ["a playbook schema is code and owes its README", "packages/naive/src/records/playbook.schema.json\n", "packages/naive/src/records/README.md"],
  ["changing the README pays it", "packages/naive/src/engine/x.mjs\npackages/naive/src/engine/README.md\n", ""],
  ["the nearest README is the one owed", "purpose/deep/x.mjs\n", "purpose/deep/README.md"],
  ["code with no README in its top folder owes none", "interface/x.mjs\n", ""],
  ["a doc is not code", "packages/naive/src/engine/notes.md\n", ""],
];
for (const [name, input, want] of owed) {
  const got = owedOf(input);
  if (got !== want) failed++;
  console.log(`${got === want ? "pass" : "FAIL"}  ${name}${got === want ? "" : `\n  want ${want || "(none)"}, got ${got || "(none)"}`}`);
}
const workflow = readFileSync(join(repo, ".github/workflows/docs-required.yml"), "utf8");
const wired = workflow.includes('echo "$changed" | node packages/naive/src/checks/check-docs-claims.mjs --scanned') && workflow.includes('echo "$changed" | node packages/naive/src/checks/check-docs-claims.mjs --readmes') && workflow.includes('echo "$changed" | node packages/naive/src/checks/check-docs-claims.mjs --code');
if (!wired) failed++;
console.log(`${wired ? "pass" : "FAIL"}  the docs-required workflow asks this linter which changes are docs`);
const check = (name, good, detail) => { if (!good) failed++; console.log(`${good ? "pass" : "FAIL"}  ${name}${good ? "" : `\n  ${detail}`}`); };
const escapePattern = workflow.match(/grep -qE '([^']+)'/)?.[1] ?? "";
const escapes = (body) => spawnSync("grep", ["-qE", escapePattern], { input: body }).status === 0;
const message = workflow.split("\n").find((l) => l.includes("or start a line")) ?? "";
const example = message.match(/for example: (.+?)\.?"$/)?.[1] ?? "";
for (const [name, body, ok] of [
  ["a real reason", "Summary\nNo docs change: only comments changed\n", true],
  ["an indented real reason", "  No docs change: only comments changed\n", true],
  ["the placeholder", "No docs change: <why>\n", false],
  ["the rule quoted in prose", "PRs say No docs change: why in the body\n", false],
  ["the rule in backticks", "`No docs change: why`\n", false],
  ["an HTML comment", "<!-- No docs change: hint -->\n", false],
  ["a blank reason", "No docs change: \n", false],
  ["a blank reason before CR", "No docs change: \r\n", false],
  ["a blank reason after a tab", "No docs change:\t\n", false],
  ["the failure message's own example", example, true],
]) check(`the escape line ${ok ? "takes" : "rejects"} ${name}`, escapes(body) === ok, `pattern ${escapePattern}`);
check("the failure message never offers the placeholder", message !== "" && !workflow.includes("'No docs change: <"), message);
const codeLine = workflow.split("\n").find((l) => l.trim().startsWith("code="))?.trim() ?? "";
const codeOf = (changed) => spawnSync("bash", ["-c", `${codeLine}\nprintf %s "$code"`], { cwd: repo, encoding: "utf8", env: { ...process.env, changed } }).stdout.trim();
check("the workflow's code is any non-Markdown file", codeOf("schema/notes.md\npurpose/x.mdx\ndocs/a.mjs") === "" && codeOf("schema/data.json\nschema/notes.md") === "schema/data.json", codeLine);
check("the workflow's code skips playbooks but keeps playbook schemas", codeOf("purpose/playbooks/torians-playbook.json\npackages/naive/library/packages/finance/playbooks/x.json") === "" && codeOf("packages/naive/src/records/playbook.schema.json") === "packages/naive/src/records/playbook.schema.json", codeLine);
const all = spawnSync("node", ["packages/naive/src/checks/check-docs-claims.mjs"], { cwd: repo, encoding: "utf8" });
if (all.status !== 0) failed++;
console.log(`${all.status === 0 ? "pass" : "FAIL"}  the docs, master docs, playbooks, skills and READMEs claim only what is built${all.status === 0 ? "" : `\n${all.stdout}${all.stderr}`}`);
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
