// Runs every test and check in the repository and reports each one (EE-017).
//
//   node test.mjs
//
// Needs Node 22.18 or later, npm install (typescript), and python3 with the jsonschema package. Exit code 1 if any fails.
// Generated files are checked for staleness by regenerating them into memory and comparing.
//
// Steps run in parallel, one worker per core (TEST_WORKERS overrides), and report in the order listed here.
// The cheap checks run first; under CI a failure there stops the run. Steps in `exclusive` run alone, last.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";

const root = new URL(".", import.meta.url).pathname;

/** @type {Array<[string, string, string[]]>} */
const steps = [
  ["schema records are valid (validate.mjs)", "node", ["packages/naive/src/records/validate.mjs"]],
  ["validate.mjs agrees with Python's jsonschema: same verdicts and failing paths on every record and its mutants", "node", ["packages/naive/src/records/validate-test.ts"]],
  ["checker tests (with cases that must fail)", "node", ["packages/naive/src/checks/test.mjs"]],
  ["ventures: examples", "node", ["packages/naive/src/checks/check-ventures.mjs", "packages/naive/src/records/examples/workspace"]],
  ["nouns", "node", ["packages/naive/src/checks/check-nouns.mjs"]],
  ["ontology membership gate", "node", ["packages/naive/src/terms/ontology-gate-test.ts"]],
  ["ontology metamodel: packages/naive/src/terms/ontology.json validates, change lines with an unknown key or a wrong kind are rejected, SKOS and OWL mappings", "node", ["packages/naive/src/terms/ontology-metamodel-test.ts"]],
  ["operating rules: default module, invalid module, venture override", "node", ["packages/naive/src/terms/operating-rules-test.ts"]],
  ["integrations and interfaces", "node", ["packages/naive/src/checks/check-integrations.mjs"]],
  ["data model and kits", "node", ["packages/naive/src/checks/check-data-model.mjs"]],
  ["data packages and raw: examples", "node", ["packages/naive/src/checks/check-data-packages.mjs", "packages/naive/src/records/examples/workspace"]],
  ["data packages and raw (sensitive streams, originals, idea citations)", "node", ["packages/naive/src/engine/data-packages-test.mjs"]],
  ["design additions (use model, gate, uncertain)", "node", ["packages/naive/src/interfaces/tests/design-additions-test.mjs"]],
  ["naive port (a project in, files as they are, read-only)", "node", ["packages/naive/src/engine/port-test.mjs"]],
  ["naive migrate (a project rewritten as records, decided by a person; stand-in agent)", "node", ["packages/naive/src/engine/migrate-test.mjs"]],
  ["releases: naive build and naive start (frozen records, live holes, cover card, export)", "node", ["packages/naive/src/engine/releases-test.mjs"]],
  ["caching: record and judgment caches, lifetimes, per-action memo", "node", ["packages/naive/src/interfaces/tests/caching-test.mjs"]],
  ["freshness: revalidate records by time and on demand", "node", ["packages/naive/src/interfaces/tests/freshness-test.mjs"]],
  ["the venture development lifecycle: phases, gates, exit criteria met by a person", "node", ["packages/naive/src/engine/lifecycle-test.mjs"]],
  ["artifacts: views name their records, stale when one changes", "node", ["packages/naive/src/engine/artifacts-test.mjs"]],
  ["context: header first, session layouts, prefetch, context budget, agent vitals", "node", ["packages/naive/src/interfaces/context-test.mjs"]],
  ["model steps: use model, judgments, kit boundaries, uncertain routing", "node", ["packages/naive/src/interfaces/tests/model-steps-test.mjs"]],
  ["the gate: naive.config.json, one gate per venture, who is acting", "node", ["packages/naive/src/interfaces/tests/gate-test.mjs"]],
  ["the setup page (people, sources of truth, the docket, a discovery goal)", "node", ["packages/naive/src/interfaces/dev/test.mjs"]],
  ["naive workspace init and rename, the clock and the calendar (derived events, .ics)", "node", ["packages/naive/src/engine/workspace-init-test.mjs"]],
  ["the Claude Code plugin (manifest, skills, MCP server outside a venture, marketplaces)", "node", ["packages/naive/src/interfaces/plugin-test.mjs"]],
  ["create-venture and the naive commands (Chapter 1: generator, dev, check, info, upgrade)", "node", ["packages/create-venture/test.mjs"]],
  ["setup in the model's harness (state and artifact over MCP, relayed answers the founder confirms)", "node", ["packages/naive/src/interfaces/tests/setup-test.mjs"]],
  ["writes, reads and boundaries: the call wrapper, containment, private folders", "node", ["packages/naive/src/router/writes-test.mjs"]],
  ["blob store and as-of reads: each write's blob, the content at t and nothing later, null before the first write, one blob for the same content", "node", ["packages/naive/src/interfaces/tests/as-of-test.ts"]],
  ["researcher read clamp: reads, lists, views and agent files as of the cut and nothing later, no late signal, no read without a cut, no live action, writes not clamped, nothing under _eval/", "node", ["packages/naive/src/interfaces/tests/reads-as-of-test.ts"]],
  ["research programs: programs/<function>.md is a person's (an agent's write is refused, a researcher's included, through the router and the agent filesystem; a person's lands live with provenance), a researcher reads its own program live, and init and naive upgrade copy each listed function's starter only when it is missing", "node", ["packages/naive/src/interfaces/tests/research-programs-test.ts"]],
  ["detection ledger through the router: an accepted held draft is a false alarm, a reverted write a miss, the chain holds under parallel appends", "node", ["packages/naive/src/router/detection-ledger-test.ts"]],
  ["brand: tokens, voice, glossary, sitemap and assets", "node", ["packages/naive/src/interfaces/tests/brand-test.mjs"]],
  ["investors lint: raise, terms, unconfirmed update numbers", "node", ["packages/naive/src/interfaces/tests/lint-investors-test.mjs"]],
  ["product lint: ICP, feature jobs and pricing", "node", ["packages/naive/src/interfaces/tests/lint-product-test.mjs"]],
  ["money lint: transfer approver and account owner", "node", ["packages/naive/src/checks/lint-money-test.mjs"]],
  ["customers lint: ICP match and promises the product keeps", "node", ["packages/naive/src/interfaces/tests/lint-customers-test.mjs"]],
  ["finance lint: spend, price below cost, metric targets", "node", ["packages/naive/src/interfaces/tests/lint-finance-test.mjs"]],
  ["legal lint: a public claim with no source, an agreement with no counterparty", "node", ["packages/naive/src/interfaces/tests/lint-legal-test.mjs"]],
  ["foundation lint: mission, ICP jobs, alignment checks, problem forms", "node", ["packages/naive/src/interfaces/tests/lint-foundation-test.mjs"]],
  ["upgrades: migrations, pins, early adoption, canary, staged agent upgrades", "node", ["packages/naive/src/engine/upgrades-test.mjs"]],
  ["src layout: naive upgrade --layout src and init-venture --layout src (EE-118 step 8)", "node", ["packages/naive/src/engine/src-layout-test.mjs"]],
  ["relation names in kebab-case: rename-relations renames old idea relation names and nothing else", "node", ["packages/naive/src/engine/rename-relations-test.ts"]],
  ["traces: spans in traces/, chained and linked from provenance, naive trace, check-traces (EE-121)", "node", ["packages/naive/src/checks/traces-test.ts"]],
  ["agent files: ls, read, write, edit, glob and grep over the router, drafts for gated writes, tool spans (EE-122)", "node", ["packages/naive/src/interfaces/tests/agent-files-test.ts"]],
  ["hosted mode: each feature that reaches outside the tenant refuses and says why, host hooks stand in, the laptop path is unchanged", "node", ["packages/naive/src/interfaces/tests/hosted-runtime-test.ts"]],
  ["naive upgrade --layout structured: a flat venture moves onto k-base/ and meta/", "node", ["packages/naive/src/engine/structured-layout-test.mjs"]],
  ["structure checks read where files sit: a migrated telos, departments in k-base/, what stays at the top", "node", ["packages/naive/src/interfaces/tests/structure-checks-test.mjs"]],
  ["the decision library (frames name no answer, premises judged, decisions proposed open)", "node", ["packages/naive/src/engine/frames-test.mjs"]],
  ["premise-attack linter (questions by formula, rules off|warn|error, findings proposed open)", "node", ["packages/naive/src/checks/premise-lint-test.mjs"]],
  ["detectors check: fails only on structure, never on a number; a criterion change is proposed once, with 30 resolved trials and an interval that excludes zero, never for a one way door", "node", ["packages/naive/src/checks/check-detectors-test.ts"]],
  ["frames: instance", "node", ["packages/naive/src/engine/frames.mjs", "check"]],
  ["decision roadmaps and lifecycle playbooks (no cycles, known frames, a decider per step, one-way doors the founder's; installs propose open; gate evidence from the playbook)", "node", ["packages/naive/src/engine/roadmap-test.mjs"]],
  ["roadmaps: instance", "node", ["packages/naive/src/engine/check-roadmap.mjs"]],
  ["the Next.js translation status (every concept has a status, its evidence exists, the page is current)", "node", ["packages/naive/src/checks/check-nextjs-status.mjs"]],
  ["delegation: template (grants within the grantor's, chains reach the founder, no self-verification)", "node", ["packages/naive/src/checks/check-delegation.mjs"]],
  ["delegation and the verification substrate (cases that must fail)", "node", ["packages/naive/src/interfaces/tests/delegation-test.mjs"]],
  ["docs claim only what is built (commands, flags, files and routes in the docs, master docs and skills)", "node", ["packages/naive/src/checks/docs-claims-test.mjs"]],
  ["governance: examples", "node", ["packages/naive/src/checks/check-governance.mjs", "packages/naive/src/records/examples/workspace"]],
  ["the canonical core and frameworks for thinking (telos-to-goals, canonical exit criteria, fallback)", "node", ["packages/naive/src/interfaces/tests/canonical-core-test.mjs"]],
  ["frameworks map onto canonical records only", "node", ["packages/naive/src/engine/check-frameworks.mjs"]],
  ["a founder's own frameworks and playbooks (list, new, check, publish --dry-run)", "node", ["packages/naive/src/engine/user-frameworks-test.mjs"]],
  ["transcript diagnosis (human words only, redacted first, one raw draft per run)", "node", ["scripts/diagnose-transcripts-test.mjs"]],
  ["dependency rules (no new cycle between units, one version per shared dependency)", "node", ["scripts/dependency-rules.ts"]],
  ["dependency rules break on copies that violate them", "node", ["scripts/dependency-rules-test.ts"]],
  ["activity (active minutes, days in the venture's zone, streak)", "node", ["packages/naive/src/engine/activity-test.mjs"]],
  ["telos: examples", "node", ["packages/naive/src/checks/check-telos.mjs", "packages/naive/src/records/examples/workspace"]],
  ["publishing gate: field visibility, leak canaries, internal terms", "node", ["packages/naive/src/functions/marketing-and-sales/marketing/leaks-test.mjs"]],
  ["field visibility: only a person sets public, the public reader, the publish check", "node", ["packages/naive/src/interfaces/tests/visibility-test.mjs"]],
  ["internal terms: the founder-edited dictionary, its schema, warn and fail terms", "node", ["packages/naive/src/engine/internal-terms-test.mjs"]],
  ["publish lint: copy distance, leaks, brand, claims, marks, personal data, secrets, and the findings loop", "node", ["packages/naive/src/engine/publish-lint-test.mjs"]],
  ["leak canaries: every internal record seeded, facts and both artifacts built through the publish build, only known leaks", "node", ["packages/naive/src/functions/marketing-and-sales/marketing/canaries-test.mjs"]],
  ["publish lint: copy distance, leaks, brand, claims, marks, personal data, secrets, and the findings loop", "node", ["packages/naive/src/engine/publish-lint-test.mjs"]],
  ["publish build: every public word compiled through the gate; canaries reach no channel", "node", ["packages/naive/src/functions/marketing-and-sales/marketing/publish-build-test.mjs"]],
  ["publishing: build, the one-way/two-way door gate, the manifest, rollback, embargo, republish on change", "node", ["packages/naive/src/engine/publish-test.mjs"]],
  ["publications: examples", "node", ["packages/naive/src/engine/check-publications.mjs", "packages/naive/src/records/examples/workspace"]],
  ["decision versions: propose, approve, merge, rollback", "node", ["packages/naive/src/engine/decision-versions-test.mjs"]],
  ["decision index: open-decision impact, phase weight and requirements, updates equal to a rebuild, rank history", "node", ["packages/naive/src/interfaces/tests/decision-index-test.mjs"]],
  ["decision impact: a merge maps what depends on it across functions, marks it stale, proposes follow-ups", "node", ["packages/naive/src/engine/decision-impact-test.mjs"]],
  ["decision reasons: cited reasons frozen at approval; a changed citation makes the decision stale", "node", ["packages/naive/src/interfaces/tests/decision-reasons-test.mjs"]],
  ["publication: examples", "node", ["packages/naive/src/checks/check-publication.mjs", "packages/naive/src/records/examples/workspace"]],
  ["venture types and people: examples", "node", ["packages/naive/src/checks/check-people.mjs", "packages/naive/src/records/examples/workspace"]],
  ["people lint: role, hire, decision", "node", ["packages/naive/src/checks/lint-people-test.mjs"]],
  ["provenance: examples", "node", ["packages/naive/src/checks/check-provenance.mjs", "packages/naive/src/records/examples/workspace"]],
  ["traces: examples", "node", ["packages/naive/src/checks/check-traces.ts", "packages/naive/src/records/examples/workspace"]],
  ["recipes: the example venture's recipe, plan, experiment log and receptions agree (check-recipes)", "node", ["packages/naive/src/checks/check-recipes.ts"]],
  ["sources: examples", "node", ["packages/naive/src/checks/check-sources.mjs", "packages/naive/src/records/examples/workspace"]],
  ["where-used: examples", "node", ["packages/naive/src/checks/check-where-used.mjs", "packages/naive/src/records/examples/workspace"]],
  ["departments: examples", "node", ["packages/naive/src/checks/check-departments.mjs", "packages/naive/src/records/examples/workspace"]],
  ["framework/platform boundary", "node", ["packages/naive/src/checks/check-boundary.mjs"]],
  ["sdlc catalog: decision classes, roles, clauses and task references", "node", ["packages/naive/src/checks/check-sdlc-catalog.ts"]],
  ["the type gate fails on what it must catch", "node", ["packages/naive/src/checks/check-types-test.ts"]],
  ["recipe sandbox: the example recipe renders; clock, random, import, eval, loop, state, fs and env each fail closed; 1,000 calls of 40 signals in one child", "node", ["packages/naive/src/engine/recipes/sandbox-test.ts"]],
  ["recipe scoring: losses, Brier, the seeded bootstrap and verdict; only people and producers settle a claim", "node", ["packages/naive/src/engine/recipes/scoring-test.ts"]],
  ["recipe eval sets: windows purged, an agent's write resolves nothing, the verdict identical over two runs; plan is a person's, check reports noise disagreements", "node", ["packages/naive/src/engine/recipes/eval-set-test.ts"]],
  ["recipe routes: an agent's keep lands as a held draft, a discard is refused, a retry spends nothing; stale base, budget and gate refuse before scoring; no recipe file is written around the route", "node", ["packages/naive/src/interfaces/tests/recipe-routes-test.ts"]],
  ["recipe accept and monitor: the holdout check passes, fails and is overridden; a retry spends nothing; a regression on forward points proposes one rollback decision", "node", ["packages/naive/src/interfaces/tests/recipe-accept-test.ts"]],
  ["check-recipes breaks on copies: lint, exports, heard types, facts, projected pattern, plan sha and windows, the log's chain, bases, holdout of the tip, budgets, the live recipe, renders again and noise by ablation", "node", ["packages/naive/src/checks/check-recipes-test.ts"]],
  ["one writer per file: only the signal projector writes a projection record; a person is refused with the emit hint; the person's master record stays theirs", "node", ["packages/naive/src/interfaces/tests/projector-test.ts"]],
  ["the signal pull end to end: two ventures, one shared library, local corrections; a second pull writes nothing", "node", ["packages/naive/src/interfaces/tests/signals-pull-test.ts"]],
  ["check-signals: Naive's packages and the example library (types, worked cases, signals, the day log, listeners)", "node", ["packages/naive/src/checks/check-signals.ts"]],
  ["check-signals breaks on copies: each rule of signal libraries, types and listeners", "node", ["packages/naive/src/checks/check-signals-test.ts"]],
  ["competitors package: its open signal types and listeners hold together, its projections write records it owns, and every worked case matches its type and its records", "node", ["packages/naive/src/checks/competitors-package-test.ts"]],
  ["detection arithmetic: Macmillan and Creelman worked examples, Wilson intervals, ROC area equals 2AFC, best criterion is an observed score", "node", ["packages/naive/src/engine/detection-test.ts"]],
  ["thresholds as detectors: shipped defaults hold today's constants, a venture's detector file moves the line, overrides keep precedence, yes_when below matches the gate", "node", ["packages/naive/src/engine/detectors-test.ts"]],
  ["founders before ventures: opaque ids, ideas, references, inspirations, _private/ secrets, only the founder confirms", "node", ["packages/naive/src/engine/founders-test.ts"]],
  ["founders: examples", "node", ["packages/naive/src/engine/founders.ts", "check", "packages/naive/src/records/examples/workspace"]],
  ["term engine: bad tests rejected, relations total, freezing notices change", "node", ["packages/naive/src/terms/engine-test.ts"]],
  ["every glossary term admitted: valid test, cross-run, Lean theorems named (regenerate with node packages/naive/src/terms/admit.ts)", "node", ["packages/naive/src/terms/admit.ts", "--check"]],
  ["no symbolic check bypasses EE-095: each check and gate is registered, and a symbolic one reaches the engine, admit or a Lean theorem", "node", ["packages/naive/src/terms/bypass-guard-test.ts"]],
  ["Lean agreement: every theorem an admitted term cites is declared in packages/naive/lean/Naive, and every Lean concept has an admitted term", "node", ["packages/naive/src/terms/lean-agreement-test.ts"]],
  ["Lean ontology concepts: a two-noun fixture regenerates both, --check catches an edited noun, name clashes stop the run", "node", ["packages/naive/src/terms/gen-concepts-test.ts"]],
  ["upper ontology: every noun reaches exactly one top category through broader (term top-category); an orphan, a noun with two top categories and a cycle are named", "node", ["packages/naive/src/terms/upper-test.ts"]],
  ["ontology catalog: one name@function scope per function, imports acyclic (term layer, L2), every term defined or imported; a cycle is printed and a missing term is an open item for its owning scope", "node", ["packages/naive/src/terms/catalog-test.ts"]],
  ["record types match the schemas (regenerate with node packages/naive/src/records/record-types.ts)", "node", ["packages/naive/src/records/record-types.ts", "--check"]],
  ["record types: the mapping, its refusals, the stale check and every record against its type", "node", ["packages/naive/src/records/record-types-test.ts"]],
  ["record paths: every schema and data-model path goes through packages/naive/src/records", "node", ["packages/naive/src/checks/check-record-paths.ts"]],
  ["record paths: the resolver resolves every schema, and the check breaks on copies that bypass it", "node", ["packages/naive/src/checks/check-record-paths-test.ts"]],
  ["Markdown renders reach a reader that waits, whole: check-nouns --md and check-data-model --md flush stdout before they exit", "node", ["packages/naive/src/checks/md-render-flush-test.ts"]],
  ["knowledge connectors: contract evals", "node", ["packages/naive/src/store/connectors/eval.mjs"]],
  ["knowledge connectors through the router: router, catalog, matrix and attribute evals", "node", ["packages/naive/src/interfaces/tests/connectors-router-test.mjs"]],
  ["validation lint: claims, shelf life, agent grades, Discovery-grade decisions", "node", ["packages/naive/src/interfaces/tests/lint-validation-test.mjs"]],
  ["validation: examples", "node", ["packages/naive/src/checks/check-validation.mjs", "packages/naive/src/records/examples/workspace", "--score"]],
  ["problem assessment behaviors (Gherkin scenarios)", "node", ["packages/naive/src/engine/bdd.mjs", "packages/naive/src/functions/strategy/kits/validation/features/problem-assessment.feature"]],
  ["strategic foundation: examples", "node", ["packages/naive/src/engine/foundation.mjs", "packages/naive/src/records/examples/workspace"]],
  ["foundation statement behaviors (Gherkin scenarios)", "node", ["packages/naive/src/engine/bdd.mjs", "packages/naive/src/functions/strategy/features/strategic-foundation.feature"]],
  ["decision affects grammar: malformed entries rejected, well-formed accepted", "node", ["packages/naive/src/engine/decision-affects-test.mjs"]],
  ["record generators (EE-099): glossary, reference, bug, trace span, detector and detector trial describe and draft records that pass their schemas", "node", ["packages/naive/src/engine/generators/generators-test.mjs"]],
  ["signal render: every worked case, the competitors package's included, renders to its expected records; receive, withdraw, the fold, the fixpoint, edge listeners and the diff", "node", ["packages/naive/src/engine/signals/render-test.ts"]],
  ["autoresearch record types: recipe, eval plan, experiment log, receptions and settles; the examples validate and agree, the schemas refuse what the design forbids, and the generators draft records that pass", "node", ["packages/naive/src/engine/generators/recipes-test.ts"]],
  ["signal library record types: the examples validate, a signal's id is the address of its content, the schemas refuse what the design forbids, and the generators draft records that pass", "node", ["packages/naive/src/engine/generators/signals-test.ts"]],
  ["decisions: examples", "node", ["packages/naive/src/engine/decisions.mjs", "packages/naive/src/records/examples/workspace"]],
  ["decision behaviors (Gherkin scenarios)", "node", ["packages/naive/src/engine/bdd.mjs", "packages/naive/src/functions/strategy/features/decisions.feature"]],
  ["decision harness demo (an agent over MCP, paused until the founder decides)", "node", ["packages/naive/src/interfaces/demo/decision-harness.mjs", "--auto"]],
  ["Product Anatomy runner", "node", ["packages/naive/src/functions/products/frameworks/product-anatomy/test.mjs"]],
  ["idea map (ideas verbatim, tags within the conventions)", "node", ["packages/naive/src/functions/strategy/frameworks/idea-map/test.mjs"]],
  ["site presence (weights, prominence, score)", "node", ["packages/naive/src/functions/marketing-and-sales/marketing/site/test.mjs"]],
  ["venture packages (fit by phase, question matrix, completeness)", "node", ["packages/naive/src/engine/packages-test.mjs"]],
  ["decision analytics (by function and type, wording, outcomes)", "node", ["packages/naive/src/engine/decision-analytics-test.mjs"]],
  ["decision docket across functions (value, attention, dominance, replay)", "node", ["packages/naive/src/engine/docket-test.mjs"]],
  ["decision docket against the scenario evidence set (reports agreement; does not gate on it)", "node", ["packages/naive/src/engine/docket-eval.mjs"]],
  ["workspace: settings, cross-venture reads, naive capture and the inbox", "node", ["packages/naive/src/engine/workspace-test.mjs"]],
  ["validation study: interviews, feedback, bugs, telemetry, the beta gate and feedback routing", "node", ["packages/naive/src/interfaces/tests/validation-study-test.mjs"]],
  ["router, CLI, MCP server and API", "node", ["packages/naive/src/interfaces/test.mjs"]],
  ["write scope: router, engine and interfaces tests write only inside the venture, the temp dir and named exceptions", "node", ["packages/naive/src/checks/check-write-scope.ts"]],
  ["write scope: a write outside the venture in a broken copy fails the check", "node", ["packages/naive/src/checks/check-write-scope-test.ts"]],
];

// Generated files: the committed copy must equal a fresh render.
const rendered = (path, marker) => (md) => {
  const doc = readFileSync(join(root, path), "utf8");
  return doc.slice(doc.indexOf(marker)).trim() === md.trim();
};

const cheap = [
  // ESLint is not skipped when missing: that hid real lint errors while the suite said "all passing" (02d5581).
  ["eslint (npm run lint)", "npm", ["run", "lint", "--silent"]],
  ["types (tsc checkJs, every file)", "node", ["packages/naive/src/checks/check-types.ts"]],
  ["packages/naive/src/terms/ontology.md matches packages/naive/src/terms/ontology.json (regenerate with node packages/naive/src/checks/check-nouns.mjs --md)", "node", ["packages/naive/src/checks/check-nouns.mjs", "--md"], rendered("packages/naive/src/terms/ontology.md", "\n### System")],
  ["layer relationships in docs/design/LAYERS_AND_KITS_2026-10-27.md match the kits (regenerate with node packages/naive/src/checks/check-data-model.mjs --md)", "node", ["packages/naive/src/checks/check-data-model.mjs", "--md"], rendered("docs/design/LAYERS_AND_KITS_2026-10-27.md", "### Layer relationships")],
  ["docs/reference/ROUTES.md matches the kits (regenerate with node packages/naive/src/router/router.mjs --md)", "node", ["packages/naive/src/router/router.mjs", "--md"], rendered("docs/reference/ROUTES.md", "## Routes")],
  ["packages/naive/lean/Naive/Generated/Ontology.lean matches packages/naive/src/terms/ontology.json (regenerate with node packages/naive/src/terms/gen-concepts.ts)", "node", ["packages/naive/src/terms/gen-concepts.ts", "--check"]],
];

// The first two write the same repo files (site/generated/venture-facts.json, site/artifact). The third touched .naive in the venture.
const exclusive = new Set([
  "publishing gate: field visibility, leak canaries, internal terms",
  "leak canaries: every internal record seeded, facts and both artifacts built through the publish build, only known leaks",
]);

for (const name of exclusive) if (!steps.some(([n]) => n === name)) throw new Error(`no step named: ${name}`);

const workers = Math.max(1, Math.floor(Number(process.env.TEST_WORKERS) || availableParallelism()));
let failed = 0;

const run = ([, cmd, args, matches]) => new Promise((resolve) => {
  const child = spawn(cmd, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
  let stdout = "", stderr = "";
  child.stdout.setEncoding("utf8").on("data", (d) => { stdout += d; });
  child.stderr.setEncoding("utf8").on("data", (d) => { stderr += d; });
  child.on("error", (e) => resolve({ ok: false, output: e.message }));
  child.on("close", (code) => resolve({ ok: matches ? matches(stdout) : code === 0, output: stdout + stderr }));
});

const report = ([name], { ok, output }) => {
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
  if (!ok) console.log(output.trim().split("\n").filter((l) => /FAIL|✗|error|Error|not /.test(l)).slice(0, 8).map((l) => `      ${l}`).join("\n"));
};

const runAll = async (list, size) => {
  const results = [];
  let next = 0, reported = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < list.length) {
      const i = next++;
      results[i] = await run(list[i]);
      for (; results[reported]; reported++) report(list[reported], results[reported]);
    }
  }));
};

console.log(`${workers} workers`);
await runAll(cheap, workers);
if (failed && process.env.CI) {
  console.log(`\n${failed} failing (cheap checks; the remaining steps did not run)`);
  process.exit(1);
}
await runAll(steps.filter(([name]) => !exclusive.has(name)), workers);
await runAll(steps.filter(([name]) => exclusive.has(name)), 1);
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
