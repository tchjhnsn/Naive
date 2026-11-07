// Checks the system's nouns (EE-014). Fails when a retired noun from packages/naive/src/terms/ontology.json
// reappears in the checked files, when a noun cites a reference id that no layer's
// references/references.json holds, or when the ontology breaks the membership rules
// (a noun with no standard, a function that is not a department, a capability a function
// does not own). With --md, prints the glossary as Markdown instead. With --package,
// prints one membership verdict for that handoff.
//
//   node packages/naive/src/checks/check-nouns.mjs
//   node packages/naive/src/checks/check-nouns.mjs --md
//   node packages/naive/src/checks/check-nouns.mjs --package <file> --function <id> [--record]
//
// A line that names a retired noun on purpose (to say what replaced it) carries "(was"
// or "retired" and is skipped.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkOntology, decidePackage } from "../terms/ontology-gate.ts";

// EE_ROOT points the check at another copy of the repository (used by packages/naive/src/checks/test.mjs).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
const { check, nouns } = JSON.parse(readFileSync(join(root, "packages/naive/src/terms/ontology.json"), "utf8"));

if (process.argv.includes("--md")) {
  const caps = (n) => n.level === "function" && n.capabilities?.length ? ` Capabilities: ${n.capabilities.join(", ")}.` : "";
  const row = (n) => `| ${n.noun} | ${n.meaning}${caps(n)} | ${n.standard} | ${(n.references ?? []).join(", ")} | ${n.function ?? ""} | ${n.handoff_type ? "yes" : ""} |`;
  const lines = [];
  for (const level of [...new Set(nouns.filter((n) => n.status !== "retired").map((n) => n.level))]) {
    lines.push(`\n### ${level[0].toUpperCase() + level.slice(1)}\n\n| Noun | Meaning | Standard | References | Function | Handoff type |\n| --- | --- | --- | --- | --- | --- |`);
    nouns.filter((n) => n.level === level && n.status !== "retired").forEach((n) => lines.push(row(n)));
  }
  lines.push(`\n### Retired\n\n| Noun | Status |\n| --- | --- |`);
  nouns.filter((n) => n.status === "retired").forEach((n) => lines.push(`| ${n.noun} | retired; use ${n.replaced_by} |`));
  // Stdout to a pipe is asynchronous, so process.exit right after console.log drops what the reader has not taken
  // yet: test.mjs then compared a cut render with ontology.md and failed at random. Exit only once it is written.
  await new Promise((done) => process.stdout.write(`${lines.join("\n")}\n`, done));
  process.exit(0);
}

const packageAt = process.argv.indexOf("--package");
if (packageAt !== -1) {
  const file = process.argv[packageAt + 1];
  const functionAt = process.argv.indexOf("--function");
  const functionId = functionAt === -1 ? "" : process.argv[functionAt + 1];
  if (!file || !functionId) {
    console.error("usage: node packages/naive/src/checks/check-nouns.mjs --package <file> --function <id> [--record]");
    process.exit(2);
  }
  const problems = checkOntology(root);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  try {
    const verdict = decidePackage(resolve(file), functionId, { root, record: process.argv.includes("--record") });
    console.log(JSON.stringify(verdict, null, 2));
    process.exit(verdict.verdict === "admit" ? 0 : 1);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(2);
  }
}

const walk = (p) => statSync(p).isDirectory()
  ? readdirSync(p).flatMap((e) => walk(join(p, e)))
  : /\.(mdx?|json|mjs)$/.test(p) ? [p] : [];
const files = check.map((c) => join(root, c)).filter(existsSync).flatMap(walk)
  .filter((f) => !f.endsWith("packages/naive/src/terms/ontology.json") && !f.endsWith("check-nouns.mjs"));
const errors = [];
for (const n of nouns.filter((x) => x.retired_pattern)) {
  const re = new RegExp(n.retired_pattern, "i");
  for (const f of files) readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (re.test(line) && !/\(was|retired/i.test(line)) errors.push(`${f.slice(root.length)}:${i + 1}: retired noun "${n.noun}" (use ${n.replaced_by})`);
  });
}
// Layer references (packages/naive/src/records/layers/<layer>/references), and those of any kit inside a function module
// (packages/naive/src/functions/<function>/kits/<kit>/references).
const sub = (d) => existsSync(join(root, d)) ? readdirSync(join(root, d)) : [];
const LAYERS = "packages/naive/src/records/layers", FUNCTIONS = "packages/naive/src/functions";
const refFiles = [...sub(LAYERS).map((l) => join(LAYERS, l, "references/references.json")),
  ...sub(FUNCTIONS).flatMap((f) => sub(join(FUNCTIONS, f, "kits")).map((k) => join(FUNCTIONS, f, "kits", k, "references/references.json")))];
const known = new Set(refFiles.filter((f) => existsSync(join(root, f)))
  .flatMap((f) => JSON.parse(readFileSync(join(root, f), "utf8")).references.map((r) => r.id)));
for (const n of nouns) for (const r of n.references ?? []) if (!known.has(r)) errors.push(`packages/naive/src/terms/ontology.json: ${n.noun} cites unknown reference ${r}`);
errors.push(...checkOntology(root));

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${nouns.length} nouns (${nouns.filter((n) => n.status === "retired").length} retired), ${files.length} files checked: no retired noun in use, every reference resolves.`);
