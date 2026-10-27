// Checks the system's nouns (EE-014). Fails when a retired noun from docs/ontology.json
// reappears in the checked files, or when a noun cites a reference id that no layer's
// references/references.json holds. With --md, prints the glossary as Markdown instead.
//
//   node schema/check-nouns.mjs            check
//   node schema/check-nouns.mjs --md       print docs/ontology.md's glossary tables
//
// A line that names a retired noun on purpose (to say what replaced it) carries "(was"
// or "retired" and is skipped.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// EE_ROOT points the check at another copy of the repository (used by schema/test.mjs).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("..", import.meta.url).pathname;
const { check, nouns } = JSON.parse(readFileSync(join(root, "docs/ontology.json"), "utf8"));

if (process.argv.includes("--md")) {
  const row = (n) => `| ${n.noun} | ${n.meaning} | ${n.standard} | ${(n.references ?? []).join(", ")} |`;
  for (const level of [...new Set(nouns.filter((n) => n.status !== "retired").map((n) => n.level))]) {
    console.log(`\n### ${level[0].toUpperCase() + level.slice(1)}\n\n| Noun | Meaning | Standard | References |\n| --- | --- | --- | --- |`);
    nouns.filter((n) => n.level === level && n.status !== "retired").forEach((n) => console.log(row(n)));
  }
  console.log(`\n### Retired\n\n| Noun | Status |\n| --- | --- |`);
  nouns.filter((n) => n.status === "retired").forEach((n) => console.log(`| ${n.noun} | retired; use ${n.replaced_by} |`));
  process.exit(0);
}

const walk = (p) => statSync(p).isDirectory()
  ? readdirSync(p).flatMap((e) => walk(join(p, e)))
  : /\.(mdx?|json|mjs)$/.test(p) ? [p] : [];
const files = check.map((c) => join(root, c)).filter(existsSync).flatMap(walk)
  .filter((f) => !f.endsWith("docs/ontology.json") && !f.endsWith("check-nouns.mjs"));
const errors = [];
for (const n of nouns.filter((x) => x.retired_pattern)) {
  const re = new RegExp(n.retired_pattern, "i");
  for (const f of files) readFileSync(f, "utf8").split("\n").forEach((line, i) => {
    if (re.test(line) && !/\(was|retired/i.test(line)) errors.push(`${f.slice(root.length)}:${i + 1}: retired noun "${n.noun}" (use ${n.replaced_by})`);
  });
}
// Layer references, and those of any kit inside a layer (<layer>/kits/<kit>/references).
const refFiles = readdirSync(root).flatMap((d) => [join(d, "references/references.json"),
  ...(existsSync(join(root, d, "kits")) ? readdirSync(join(root, d, "kits")).map((k) => join(d, "kits", k, "references/references.json")) : [])]);
const known = new Set(refFiles.filter((f) => existsSync(join(root, f)))
  .flatMap((f) => JSON.parse(readFileSync(join(root, f), "utf8")).references.map((r) => r.id)));
for (const n of nouns) for (const r of n.references ?? []) if (!known.has(r)) errors.push(`docs/ontology.json: ${n.noun} cites unknown reference ${r}`);

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${nouns.length} nouns (${nouns.filter((n) => n.status === "retired").length} retired), ${files.length} files checked: no retired noun in use, every reference resolves.`);
