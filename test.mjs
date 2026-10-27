// Runs every test and check in the repository and reports each one (EE-017).
//
//   node test.mjs
//
// Needs Node 20 or later and python3 with the jsonschema package. Exit code 1 if any fails.
// Generated files are checked for staleness by regenerating them into memory and comparing.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL(".", import.meta.url).pathname;
const ventures = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => !e.isDirectory() ? []
  : existsSync(join(dir, e.name, "venture.json")) ? [join(dir, e.name), ...ventures(join(dir, e.name))] : ventures(join(dir, e.name)));

const steps = [
  ["schema records are valid", "python3", ["-I", "schema/validate.py"]],
  ["checker tests (with cases that must fail)", "node", ["schema/test.mjs"]],
  ["ventures: instance", "node", ["schema/check-ventures.mjs", "instance"]],
  ["ventures: examples", "node", ["schema/check-ventures.mjs", "schema/examples/workspace"]],
  ["nouns", "node", ["schema/check-nouns.mjs"]],
  ["integrations and interfaces", "node", ["schema/check-integrations.mjs"]],
  ["data model and kits", "node", ["schema/check-data-model.mjs"]],
  ["governance: instance", "node", ["schema/check-governance.mjs", "instance"]],
  ["governance: examples", "node", ["schema/check-governance.mjs", "schema/examples/workspace"]],
  ["telos: instance", "node", ["schema/check-telos.mjs", "instance"]],
  ["telos: examples", "node", ["schema/check-telos.mjs", "schema/examples/workspace"]],
  ...ventures(join(root, "instance")).filter((v) => existsSync(join(v, "execution"))).map((v) =>
    [`execution: ${v.slice(root.length)}`, "node", ["schema/check-execution.mjs", v]]),
  ["Product Anatomy runner", "node", ["purpose/frameworks/product-anatomy/test.mjs"]],
  ["MAD catalog and register", "node", ["operations/skills/methodology-selection/ee.mjs", "validate"]],
  ["MAD tests", "node", ["operations/skills/methodology-selection/test.mjs"]],
  ["MAD publisher tests", "node", ["operations/skills/methodology-selection/test-publish.mjs"]],
];

// Generated files: the committed copy must equal a fresh render.
const glossary = () => {
  const md = spawnSync("node", ["schema/check-nouns.mjs", "--md"], { cwd: root, encoding: "utf8" }).stdout;
  const doc = readFileSync(join(root, "docs/ontology.md"), "utf8");
  return doc.slice(doc.indexOf("\n### System")).trim() === md.trim();
};

const layerGraph = () => {
  const md = spawnSync("node", ["schema/check-data-model.mjs", "--md"], { cwd: root, encoding: "utf8" }).stdout;
  const doc = readFileSync(join(root, "docs/design/LAYERS_AND_KITS_2026-10-27.md"), "utf8");
  return doc.slice(doc.indexOf("### Layer relationships")).trim() === md.trim();
};

let failed = 0;
for (const [name, cmd, args] of steps) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: "utf8" });
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
  if (!ok) console.log((r.stdout + r.stderr).trim().split("\n").filter((l) => /FAIL|✗|error|Error|not /.test(l)).slice(0, 8).map((l) => `      ${l}`).join("\n"));
}
const fresh = glossary();
if (!fresh) failed++;
console.log(`${fresh ? "pass" : "FAIL"}  docs/ontology.md matches docs/ontology.json (regenerate with node schema/check-nouns.mjs --md)`);
const graph = layerGraph();
if (!graph) failed++;
console.log(`${graph ? "pass" : "FAIL"}  layer relationships in docs/design/LAYERS_AND_KITS_2026-10-27.md match the kits (regenerate with node schema/check-data-model.mjs --md)`);
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
