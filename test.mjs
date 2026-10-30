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
  ["data packages and raw", "node", ["schema/check-data-packages.mjs", "instance"]],
  ["data packages and raw: examples", "node", ["schema/check-data-packages.mjs", "schema/examples/workspace"]],
  ["data packages and raw (sensitive streams, originals, idea citations)", "node", ["schema/data-packages-test.mjs"]],
  ["private records stay off the model", "node", ["schema/check-private.mjs", "instance"]],
  ["design additions (use model, gate, uncertain)", "node", ["schema/design-additions-test.mjs"]],
  ["naive port (a project in, files as they are, read-only)", "node", ["schema/port-test.mjs"]],
  ["naive migrate (a project rewritten as records, decided by a person; stand-in agent)", "node", ["schema/migrate-test.mjs"]],
  ["releases: naive build and naive start (frozen records, live holes, cover card, export)", "node", ["schema/releases-test.mjs"]],
  ["caching: record and judgment caches, lifetimes, per-action memo", "node", ["schema/caching-test.mjs"]],
  ["freshness: revalidate records by time and on demand", "node", ["schema/freshness-test.mjs"]],
  ["the venture development lifecycle: phases, gates, exit criteria met by a person", "node", ["schema/lifecycle-test.mjs"]],
  ["artifacts: views name their records, stale when one changes", "node", ["schema/artifacts-test.mjs"]],
  ["context: header first, session layouts, prefetch, context budget, agent vitals", "node", ["interface/context-test.mjs"]],
  ["model steps: use model, judgments, kit boundaries, uncertain routing", "node", ["schema/model-steps-test.mjs"]],
  ["the gate: naive.config.json, one gate per venture, who is acting", "node", ["schema/gate-test.mjs"]],
  ["the setup page (people, sources of truth, the docket, a discovery goal)", "node", ["interface/dev/test.mjs"]],
  ["create-venture and the naive commands (Chapter 1: generator, dev, check, info, upgrade)", "node", ["interface/create-venture/test.mjs"]],
  ["setup in the model's harness (state and artifact over MCP, relayed answers the founder confirms)", "node", ["schema/setup-test.mjs"]],
  ["writes, reads and boundaries: the call wrapper, containment, private folders", "node", ["interface/writes-test.mjs"]],
  ["brand: tokens, voice, glossary, sitemap and assets", "node", ["schema/brand-test.mjs"]],
  ["upgrades: migrations, pins, early adoption, canary, staged agent upgrades", "node", ["schema/upgrades-test.mjs"]],
  ["kits", "node", ["platform/kits/test.mjs"]],
  ["webhooks", "node", ["platform/webhooks/test.mjs"]],
  ["the decision library (frames name no answer, premises judged, decisions proposed open)", "node", ["schema/frames-test.mjs"]],
  ["frames: instance", "node", ["schema/frames.mjs", "check"]],
  ["the Next.js translation status (every concept has a status, its evidence exists, the page is current)", "node", ["schema/check-nextjs-status.mjs"]],
  ["the Get Started commands (every sh block runs as written)", "node", ["schema/docs-commands-test.mjs"]],
  ["governance: instance", "node", ["schema/check-governance.mjs", "instance"]],
  ["governance: examples", "node", ["schema/check-governance.mjs", "schema/examples/workspace"]],
  ["telos: instance", "node", ["schema/check-telos.mjs", "instance"]],
  ["telos: examples", "node", ["schema/check-telos.mjs", "schema/examples/workspace"]],
  ["publishing gate: field visibility, leak canaries, internal terms", "node", ["schema/leaks-test.mjs"]],
  ["public site carries no internal text", "node", ["schema/check-leaks.mjs", "site/content/marketing"]],
  ["publication: instance", "node", ["schema/check-publication.mjs", "instance"]],
  ["publication: examples", "node", ["schema/check-publication.mjs", "schema/examples/workspace"]],
  ["team: instance", "node", ["schema/check-team.mjs", "instance"]],
  ["venture types and people: instance", "node", ["schema/check-people.mjs", "instance"]],
  ["venture types and people: examples", "node", ["schema/check-people.mjs", "schema/examples/workspace"]],
  ["provenance: instance", "node", ["schema/check-provenance.mjs", "instance"]],
  ["provenance: examples", "node", ["schema/check-provenance.mjs", "schema/examples/workspace"]],
  ["sources: instance", "node", ["schema/check-sources.mjs", "instance"]],
  ["sources: examples", "node", ["schema/check-sources.mjs", "schema/examples/workspace"]],
  ["where-used: instance", "node", ["schema/check-where-used.mjs", "instance"]],
  ["where-used: examples", "node", ["schema/check-where-used.mjs", "schema/examples/workspace"]],
  ["departments: instance", "node", ["schema/check-departments.mjs", "instance"]],
  ["departments: examples", "node", ["schema/check-departments.mjs", "schema/examples/workspace"]],
  ["framework/platform boundary", "node", ["schema/check-boundary.mjs"]],
  ["knowledge connectors: contract, router and catalog evals", "node", ["knowledge/connectors/eval.mjs"]],
  ["platform connectors: GitHub contract, router and catalog evals", "node", ["platform/connectors/eval.mjs"]],
  ["validation: instance", "node", ["schema/check-validation.mjs", "instance"]],
  ["validation: examples", "node", ["schema/check-validation.mjs", "schema/examples/workspace", "--score"]],
  ["problem assessment behaviors (Gherkin scenarios)", "node", ["schema/bdd.mjs", "purpose/kits/validation/features/problem-assessment.feature"]],
  ["strategic foundation: instance", "node", ["schema/foundation.mjs", "instance"]],
  ["strategic foundation: examples", "node", ["schema/foundation.mjs", "schema/examples/workspace"]],
  ["foundation statement behaviors (Gherkin scenarios)", "node", ["schema/bdd.mjs", "purpose/features/strategic-foundation.feature"]],
  ["decisions: instance", "node", ["schema/decisions.mjs", "instance"]],
  ["decisions: examples", "node", ["schema/decisions.mjs", "schema/examples/workspace"]],
  ["decision behaviors (Gherkin scenarios)", "node", ["schema/bdd.mjs", "governance/features/decisions.feature"]],
  ["decision harness demo (an agent over MCP, paused until the founder decides)", "node", ["interface/demo/decision-harness.mjs", "--auto"]],
  ...ventures(join(root, "instance")).filter((v) => existsSync(join(v, "operations/handoffs"))).map((v) =>
    [`handoffs: ${v.slice(root.length)}`, "node", ["schema/check-execution.mjs", v]]),
  ["Product Anatomy runner", "node", ["purpose/frameworks/product-anatomy/test.mjs"]],
  ["idea map (ideas verbatim, tags within the conventions)", "node", ["purpose/frameworks/idea-map/test.mjs"]],
  ["site presence (weights, prominence, score)", "node", ["operations/marketing/site/test.mjs"]],
  ["venture packages (fit by phase, question matrix, completeness)", "node", ["schema/packages-test.mjs"]],
  ["decision analytics (by function and type, wording, outcomes)", "node", ["schema/decision-analytics-test.mjs"]],
  ["decision docket across functions (value, attention, dominance, replay)", "node", ["schema/docket-test.mjs"]],
  ["decision docket against the scenario evidence set (reports agreement; does not gate on it)", "node", ["schema/docket-eval.mjs"]],
  ["site reader (links and text, offline)", "node", ["platform/integrations/site-test.mjs"]],
  ["Rho money source (package, append-only, read-only client, offline)", "node", ["platform/integrations/rho-test.mjs"]],
  ["workspace: settings, cross-venture reads, naive capture and the inbox", "node", ["schema/workspace-test.mjs"]],
  ["router, CLI, MCP server and API", "node", ["interface/test.mjs"]],
  // The site's pages compile as MDX; needs the site's packages (cd site && npm ci), which CI's site job installs.
  ...(existsSync(join(root, "site/node_modules")) ? [["site content contract", "npm", ["--prefix", "site", "run", "check:content"]]] : []),
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

const routeTable = () => {
  const md = spawnSync("node", ["interface/router.mjs", "--md"], { cwd: root, encoding: "utf8" }).stdout;
  const doc = readFileSync(join(root, "docs/reference/ROUTES.md"), "utf8");
  return doc.slice(doc.indexOf("## Routes")).trim() === md.trim();
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
const table = routeTable();
if (!table) failed++;
console.log(`${table ? "pass" : "FAIL"}  docs/reference/ROUTES.md matches the kits (regenerate with node interface/router.mjs --md)`);
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
