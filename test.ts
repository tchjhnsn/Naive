// Runs every test and check in the repository and reports each one (EE-017).
//
//   node test.ts
//
// Needs Node 22.19 or later (EE-158), npm install (typescript), and python3 with the jsonschema package. Exit code 1 if any fails.
// Generated files are checked for staleness by regenerating them into memory and comparing.
//
// Steps run in parallel, one worker per core (TEST_WORKERS overrides), and report in the order listed here.
// The cheap checks run first; under CI a failure there stops the run. Steps in `exclusive` run alone, last.

import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { availableParallelism } from "node:os";
import { join } from "node:path";

const root = new URL(".", import.meta.url).pathname;

/** A step: its name, the command and its arguments, and, for a generated file, whether the output matches the committed copy. */
type Step = [name: string, cmd: string, args: string[], matches?: (stdout: string) => boolean];
type Result = { ok: boolean, output: string };

const steps: Step[] = [
  ["schema records are valid (validate.ts)", "node", ["packages/naive/src/records/validate.ts"]],
  ["validate.ts agrees with Python's jsonschema: same verdicts and failing paths on every record and its mutants", "node", ["packages/naive/src/records/validate-test.ts"]],
  ["checker tests (with cases that must fail)", "node", ["packages/naive/src/checks/test.ts"]],
  ["ventures: examples", "node", ["packages/naive/src/checks/check-ventures.ts", "packages/naive/src/records/examples/workspace"]],
  ["nouns", "node", ["packages/naive/src/checks/check-nouns.ts"]],
  ["ontology membership gate", "node", ["packages/naive/src/terms/ontology-gate-test.ts"]],
  ["ontology metamodel: packages/naive/src/terms/ontology.json validates, change lines with an unknown key or a wrong kind are rejected, SKOS and OWL mappings", "node", ["packages/naive/src/terms/ontology-metamodel-test.ts"]],
  ["operating rules: default module, invalid module, venture override", "node", ["packages/naive/src/terms/operating-rules-test.ts"]],
  ["integrations and interfaces", "node", ["packages/naive/src/checks/check-integrations.ts"]],
  ["data model and kits", "node", ["packages/naive/src/checks/check-data-model.ts"]],
  ["data packages and raw: examples", "node", ["packages/naive/src/checks/check-data-packages.ts", "packages/naive/src/records/examples/workspace"]],
  ["data packages and raw (sensitive streams, originals, idea citations)", "node", ["packages/naive/src/engine/data-packages-test.ts"]],
  ["design additions (use model, gate, uncertain)", "node", ["packages/naive/src/interfaces/tests/design-additions-test.ts"]],
  ["naive port (a project in, files as they are, read-only)", "node", ["packages/naive/src/engine/port-test.ts"]],
  ["naive migrate (a project rewritten as records, decided by a person; stand-in agent)", "node", ["packages/naive/src/engine/migrate-test.ts"]],
  ["releases: naive build and naive start (frozen records, live holes, cover card, export)", "node", ["packages/naive/src/engine/releases-test.ts"]],
  ["caching: record and judgment caches, lifetimes, per-action memo", "node", ["packages/naive/src/interfaces/tests/caching-test.ts"]],
  ["freshness: revalidate records by time and on demand", "node", ["packages/naive/src/interfaces/tests/freshness-test.ts"]],
  ["the venture development lifecycle: phases, gates, exit criteria met by a person", "node", ["packages/naive/src/engine/lifecycle-test.ts"]],
  ["artifacts: views name their records, stale when one changes", "node", ["packages/naive/src/engine/artifacts-test.ts"]],
  ["context: header first, session layouts, prefetch, context budget, agent vitals", "node", ["packages/naive/src/interfaces/context-test.ts"]],
  ["model steps: use model, judgments, kit boundaries, uncertain routing", "node", ["packages/naive/src/interfaces/tests/model-steps-test.ts"]],
  ["the gate: naive.config.json, one gate per venture, who is acting", "node", ["packages/naive/src/interfaces/tests/gate-test.ts"]],
  ["the setup page (people, sources of truth, the docket, a discovery goal)", "node", ["packages/naive/src/interfaces/dev/test.ts"]],
  ["naive workspace init and rename, the clock and the calendar (derived events, .ics)", "node", ["packages/naive/src/engine/workspace-init-test.ts"]],
  ["the Claude Code plugin (manifest, skills, MCP server outside a venture, marketplaces)", "node", ["packages/naive/src/interfaces/plugin-test.ts"]],
  ["the compiled package's build: what is compiled, .ts paths renamed to .js, a relative import that names no file refused (EE-159)", "node", ["scripts/build-test.ts"]],
  ["create-venture and the naive commands (Chapter 1: generator, dev, check, info, upgrade)", "node", ["packages/create-venture/test.ts"]],
  ["setup in the model's harness (state and artifact over MCP, relayed answers the founder confirms)", "node", ["packages/naive/src/interfaces/tests/setup-test.ts"]],
  ["writes, reads and boundaries: the call wrapper, containment, private folders", "node", ["packages/naive/src/router/writes-test.ts"]],
  ["blob store and as-of reads: each write's blob, the content at t and nothing later, null before the first write, one blob for the same content", "node", ["packages/naive/src/interfaces/tests/as-of-test.ts"]],
  ["researcher read clamp: reads, lists, views and agent files as of the cut and nothing later, no late signal, no read without a cut, no live action, writes not clamped, nothing under _eval/", "node", ["packages/naive/src/interfaces/tests/reads-as-of-test.ts"]],
  ["spend register: finance/spend/[id] is written only by finance-agent or a person (any other role is refused, one the team plan widens included), the template's access matrix masters each field once and check-sources refuses a tie on a register field, and founder-to-finance-agent holds the register's classes", "node", ["packages/naive/src/interfaces/tests/spend-register-test.ts"]],
  ["research programs: programs/<function>.md is a person's (an agent's write is refused, a researcher's included, through the router and the agent filesystem; a person's lands live with provenance), a researcher reads its own program live, and init and naive upgrade copy each listed function's starter only when it is missing", "node", ["packages/naive/src/interfaces/tests/research-programs-test.ts"]],
  ["detection ledger through the router: an accepted held draft is a false alarm, a reverted write a miss, the chain holds under parallel appends", "node", ["packages/naive/src/router/detection-ledger-test.ts"]],
  ["agent tools over MCP: mentura_agent_brief gives a function agent's agent.md, workflows, decision matrix and MENTURA_ACTOR_ID with repo-relative paths, a lead's spec, and an error naming the roles for an unknown one; mentura_route_task sends finance and risk and compliance to finance-lead", "node", ["packages/naive/src/interfaces/tests/mcp-agent-brief-test.ts"]],
  ["handoff claim through the router: claims race and one wins, a claim on a non-ready or wrong-role handoff is refused, only the claimant writes progress and evidence and only the requester verifies and accepts", "node", ["packages/naive/src/interfaces/tests/handoff-claim-test.ts"]],
  ["brand: tokens, voice, glossary, sitemap and assets", "node", ["packages/naive/src/interfaces/tests/brand-test.ts"]],
  ["investors lint: raise, terms, unconfirmed update numbers", "node", ["packages/naive/src/interfaces/tests/lint-investors-test.ts"]],
  ["product lint: ICP, feature jobs and pricing", "node", ["packages/naive/src/interfaces/tests/lint-product-test.ts"]],
  ["money lint: transfer approver and account owner", "node", ["packages/naive/src/checks/lint-money-test.ts"]],
  ["customers lint: ICP match and promises the product keeps", "node", ["packages/naive/src/interfaces/tests/lint-customers-test.ts"]],
  ["finance lint: spend, price below cost, metric targets", "node", ["packages/naive/src/interfaces/tests/lint-finance-test.ts"]],
  ["legal lint: a public claim with no source, an agreement with no counterparty", "node", ["packages/naive/src/interfaces/tests/lint-legal-test.ts"]],
  ["foundation lint: mission, ICP jobs, alignment checks, problem forms", "node", ["packages/naive/src/interfaces/tests/lint-foundation-test.ts"]],
  ["upgrades: migrations, pins, early adoption, canary, staged agent upgrades", "node", ["packages/naive/src/engine/upgrades-test.ts"]],
  ["src layout: naive upgrade --layout src and init-venture --layout src (EE-118 step 8)", "node", ["packages/naive/src/engine/src-layout-test.ts"]],
  ["relation names in kebab-case: rename-relations renames old idea relation names and nothing else", "node", ["packages/naive/src/engine/rename-relations-test.ts"]],
  ["traces: spans in traces/, chained and linked from provenance, naive trace, check-traces (EE-121)", "node", ["packages/naive/src/checks/traces-test.ts"]],
  ["function agent reach: <function>-agent writes only decisions/* and its function's record routes (finance-agent writing a customer is refused before the schema and nothing lands; its decision and a person's customer are not refused)", "node", ["packages/naive/src/interfaces/tests/agent-reach-test.ts"]],
  ["agent files: ls, read, write, edit, glob and grep over the router, drafts for gated writes, tool spans (EE-122)", "node", ["packages/naive/src/interfaces/tests/agent-files-test.ts"]],
  ["hosted mode: each feature that reaches outside the tenant refuses and says why, host hooks stand in, the laptop path is unchanged", "node", ["packages/naive/src/interfaces/tests/hosted-runtime-test.ts"]],
  ["naive upgrade --layout structured: a flat venture moves onto k-base/ and meta/", "node", ["packages/naive/src/engine/structured-layout-test.ts"]],
  ["structure checks read where files sit: a migrated telos, departments in k-base/, what stays at the top", "node", ["packages/naive/src/interfaces/tests/structure-checks-test.ts"]],
  ["the decision library (frames name no answer, premises judged, decisions proposed open)", "node", ["packages/naive/src/engine/frames-test.ts"]],
  ["premise-attack linter (questions by formula, rules off|warn|error, findings proposed open)", "node", ["packages/naive/src/checks/premise-lint-test.ts"]],
  ["effect base: tagged errors, VentureFs on memory and on disk, and the runners (EE-125)", "node", ["packages/naive/src/core/effect/effect-test.ts"]],
  ["agent specs: one function agent per function with its module's files and a reach that covers its workflows, four leads covering the 13 functions, and routing", "node", ["packages/naive/src/engine/agents/agents-test.ts"]],
  ["provenance and blobs as Effects: the lock resource, the gate chain and the blob store on memory (EE-125)", "node", ["packages/naive/src/core/provenance-effect-test.ts"]],
  ["function modules check: each of the 13 functions as a folder with a manifest, an agent, workflows, a decision matrix and skills that agree with decision rights, the data model and the route table", "node", ["packages/naive/src/checks/check-functions-test.ts"]],
  ["phase modules check: each of the five phases as a folder with its stage gate, exit evidence from a record type, active workflows that exist and function weights that sum to 1, and the only place a gate is defined (EE-126)", "node", ["packages/naive/src/checks/check-phases-test.ts"]],
  ["connections check: the capability cluster catalog names no vendor and only known functions and gap kinds; a send, payment or signature names public-commitment, spend-money or legal-or-terms; a connection never claims a field the source map gives another source", "node", ["packages/naive/src/checks/check-connections-test.ts"]],
  ["seam detectors: tools against spend fires on a drifted copy and stays quiet on a clean one, opens a decision for the finance lead carrying its trial, files the same drift once, and a decision acted on resolves a hit and one dismissed a false alarm", "node", ["packages/naive/src/interfaces/tests/seams-test.ts"]],
  ["detectors check: fails only on structure, never on a number; a criterion change is proposed once, with 30 resolved trials and an interval that excludes zero, never for a one way door", "node", ["packages/naive/src/checks/check-detectors-test.ts"]],
  ["frames: instance", "node", ["packages/naive/src/engine/frames.ts", "check"]],
  ["decision roadmaps and lifecycle playbooks (no cycles, known frames, a decider per step, one-way doors the founder's; installs propose open; gate evidence from the playbook)", "node", ["packages/naive/src/engine/roadmap-test.ts"]],
  ["roadmaps: instance", "node", ["packages/naive/src/engine/check-roadmap.ts"]],
  ["the Next.js translation status (every concept has a status, its evidence exists, the page is current)", "node", ["packages/naive/src/checks/check-nextjs-status.ts"]],
  ["delegation: template (grants within the grantor's, chains reach the founder, no self-verification)", "node", ["packages/naive/src/checks/check-delegation.ts"]],
  ["delegation and the verification substrate (cases that must fail)", "node", ["packages/naive/src/interfaces/tests/delegation-test.ts"]],
  ["docs claim only what is built (commands, flags, files and routes in the docs, master docs and skills)", "node", ["packages/naive/src/checks/docs-claims-test.ts"]],
  ["governance: examples", "node", ["packages/naive/src/checks/check-governance.ts", "packages/naive/src/records/examples/workspace"]],
  ["the canonical core and frameworks for thinking (telos-to-goals, canonical exit criteria, fallback)", "node", ["packages/naive/src/interfaces/tests/canonical-core-test.ts"]],
  ["frameworks map onto canonical records only", "node", ["packages/naive/src/engine/check-frameworks.ts"]],
  ["a founder's own frameworks and playbooks (list, new, check, publish --dry-run)", "node", ["packages/naive/src/engine/user-frameworks-test.ts"]],
  ["transcript diagnosis (human words only, redacted first, one raw draft per run)", "node", ["scripts/diagnose-transcripts-test.ts"]],
  ["dependency rules (no new cycle between units, one version per shared dependency)", "node", ["scripts/dependency-rules.ts"]],
  ["dependency rules break on copies that violate them", "node", ["scripts/dependency-rules-test.ts"]],
  ["vendored repositories match their pins (repos/effect is the installed effect version)", "node", ["scripts/vendored.ts"]],
  ["vendored check breaks on copies", "node", ["scripts/vendored-test.ts"]],
  ["to-ts: references to a converted module are rewritten, others left", "node", ["scripts/to-ts-test.ts"]],
  ["activity (active minutes, days in the venture's zone, streak)", "node", ["packages/naive/src/engine/activity-test.ts"]],
  ["telos: examples", "node", ["packages/naive/src/checks/check-telos.ts", "packages/naive/src/records/examples/workspace"]],
  ["publishing gate: field visibility, leak canaries, internal terms", "node", ["packages/naive/src/functions/marketing-and-sales/marketing/leaks-test.ts"]],
  ["field visibility: only a person sets public, the public reader, the publish check", "node", ["packages/naive/src/interfaces/tests/visibility-test.ts"]],
  ["internal terms: the founder-edited dictionary, its schema, warn and fail terms", "node", ["packages/naive/src/engine/internal-terms-test.ts"]],
  ["publish lint: copy distance, leaks, brand, claims, marks, personal data, secrets, and the findings loop", "node", ["packages/naive/src/engine/publish-lint-test.ts"]],
  ["leak canaries: every internal record seeded, facts and both artifacts built through the publish build, only known leaks", "node", ["packages/naive/src/functions/marketing-and-sales/marketing/canaries-test.ts"]],
  ["publish lint: copy distance, leaks, brand, claims, marks, personal data, secrets, and the findings loop", "node", ["packages/naive/src/engine/publish-lint-test.ts"]],
  ["publish build: every public word compiled through the gate; canaries reach no channel", "node", ["packages/naive/src/functions/marketing-and-sales/marketing/publish-build-test.ts"]],
  ["publishing: build, the one-way/two-way door gate, the manifest, rollback, embargo, republish on change", "node", ["packages/naive/src/engine/publish-test.ts"]],
  ["publications: examples", "node", ["packages/naive/src/engine/check-publications.ts", "packages/naive/src/records/examples/workspace"]],
  ["decision versions: propose, approve, merge, rollback", "node", ["packages/naive/src/engine/decision-versions-test.ts"]],
  ["decision index: open-decision impact, phase weight and requirements, updates equal to a rebuild, rank history", "node", ["packages/naive/src/interfaces/tests/decision-index-test.ts"]],
  ["decision queue: owning function, per-function index, cross-function score by phase weight and bound measures, themes, the queue in the index (EE-127)", "node", ["packages/naive/src/engine/decision-queue-test.ts"]],
  ["lean canvas: the shared kernel, owners from the data model, the gate-first roadmap, unlocks, each box at its own route (EE-155)", "node", ["packages/naive/src/engine/lean-canvas-test.ts"]],
  ["venture anatomy: every cell unknown at init, a router write raises confidence, as-of and valid-at time travel, S-K coverage, views, routes (EE-157)", "node", ["packages/naive/src/engine/venture-anatomy-test.ts"]],
  ["gate strength: evidence ladders per gate item, policies and presets, enforcement in the lifecycle, the CLI and the route (EE-156)", "node", ["packages/naive/src/engine/phase-gate-test.ts"]],
  ["gate calibration: interview counts, item minimums and boundaries, staleness, override policy and problem confirmation from the venture's market and industry, unknown cells as assumptions, the proposed decision, the CLI and the route (EE-157)", "node", ["packages/naive/src/engine/gate-calibration-test.ts"]],
  ["decision impact: a merge maps what depends on it across functions, marks it stale, proposes follow-ups", "node", ["packages/naive/src/engine/decision-impact-test.ts"]],
  ["decision reasons: cited reasons frozen at approval; a changed citation makes the decision stale", "node", ["packages/naive/src/interfaces/tests/decision-reasons-test.ts"]],
  ["publication: examples", "node", ["packages/naive/src/checks/check-publication.ts", "packages/naive/src/records/examples/workspace"]],
  ["venture types and people: examples", "node", ["packages/naive/src/checks/check-people.ts", "packages/naive/src/records/examples/workspace"]],
  ["people lint: role, hire, decision", "node", ["packages/naive/src/checks/lint-people-test.ts"]],
  ["provenance: examples", "node", ["packages/naive/src/checks/check-provenance.ts", "packages/naive/src/records/examples/workspace"]],
  ["traces: examples", "node", ["packages/naive/src/checks/check-traces.ts", "packages/naive/src/records/examples/workspace"]],
  ["recipes: the example venture's recipe, plan, experiment log and receptions agree (check-recipes)", "node", ["packages/naive/src/checks/check-recipes.ts"]],
  ["sources: examples", "node", ["packages/naive/src/checks/check-sources.ts", "packages/naive/src/records/examples/workspace"]],
  ["where-used: examples", "node", ["packages/naive/src/checks/check-where-used.ts", "packages/naive/src/records/examples/workspace"]],
  ["departments: examples", "node", ["packages/naive/src/checks/check-departments.ts", "packages/naive/src/records/examples/workspace"]],
  ["framework/platform boundary", "node", ["packages/naive/src/checks/check-boundary.ts"]],
  ["sdlc catalog: decision classes, roles, clauses and task references", "node", ["packages/naive/src/checks/check-sdlc-catalog.ts"]],
  ["the type gate fails on what it must catch", "node", ["packages/naive/src/checks/check-types-test.ts"]],
  ["recipe sandbox: the example recipe renders; clock, random, import, eval, loop, state, fs and env each fail closed; 1,000 calls of 40 signals in one child", "node", ["packages/naive/src/engine/recipes/sandbox-test.ts"]],
  ["recipe scoring: losses, Brier, the seeded bootstrap and verdict; only people and producers settle a claim", "node", ["packages/naive/src/engine/recipes/scoring-test.ts"]],
  ["recipe eval sets: windows purged, an agent's write resolves nothing, the verdict identical over two runs; plan is a person's, check reports noise disagreements", "node", ["packages/naive/src/engine/recipes/eval-set-test.ts"]],
  ["recipe routes: an agent's keep lands as a held draft, a discard is refused, a retry spends nothing; stale base, budget and gate refuse before scoring; no recipe file is written around the route", "node", ["packages/naive/src/interfaces/tests/recipe-routes-test.ts"]],
  ["recipe accept and monitor: the holdout check passes, fails and is overridden; a retry spends nothing; a regression on forward points proposes one rollback decision", "node", ["packages/naive/src/interfaces/tests/recipe-accept-test.ts"]],
  ["check-recipes breaks on copies: lint, exports, heard types, facts, projected pattern, plan sha and windows, the log's chain, bases, holdout of the tip, budgets, the live recipe, renders again and noise by ablation", "node", ["packages/naive/src/checks/check-recipes-test.ts"]],
  ["recipe knobs: read from the source, one value rewritten with every other byte unchanged, steps for numbers, booleans and rating floors", "node", ["packages/naive/src/engine/recipes/knobs-test.ts"]],
  ["recipe probes: a deterministic share of noise per consumer, the probe mark and its schema, propensities and the inverse propensity estimate", "node", ["packages/naive/src/engine/recipes/probes-test.ts"]],
  ["recipe search: a fixture venture improves with no model; every knob step an agent's experiment write, held as a draft, none scored twice; stops at the budget", "node", ["packages/naive/src/interfaces/tests/recipe-search-test.ts"]],
  ["one writer per file: only the signal projector writes a projection record; a person is refused with the emit hint; the person's master record stays theirs", "node", ["packages/naive/src/interfaces/tests/projector-test.ts"]],
  ["the signal pull end to end: two ventures, one shared library, local corrections; a second pull writes nothing", "node", ["packages/naive/src/interfaces/tests/signals-pull-test.ts"]],
  ["rendering through recipes end to end: two ventures, naive recipes init and the example recipe, receptions beside each record, hindsight past the horizon; a second pull writes nothing", "node", ["packages/naive/src/interfaces/tests/recipe-render-test.ts"]],
  ["check-signals: Naive's packages and the example library (types, worked cases, signals, the day log, listeners)", "node", ["packages/naive/src/checks/check-signals.ts"]],
  ["check-signals breaks on copies: each rule of signal libraries, types and listeners", "node", ["packages/naive/src/checks/check-signals-test.ts"]],
  ["competitors package: its open signal types and listeners hold together, its projections write records it owns, and every worked case matches its type and its records", "node", ["packages/naive/src/checks/competitors-package-test.ts"]],
  ["raw triage: the Jev request, sure labels file, unsure ones are held, a possible one-way door goes to a person", "node", ["packages/naive/src/engine/triage-test.ts"]],
  ["routing a classified task (lead agents rules 1 to 5): a one-way door or never-redelegated class to a person, one function to its agent, one portfolio to its lead, across portfolios to the lead accountable for the measure or else a person", "node", ["packages/naive/src/engine/route-task-test.ts"]],
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
  ["knowledge connectors: contract evals", "node", ["packages/naive/src/store/connectors/eval.ts"]],
  ["knowledge connectors in Effect: the Effect versions on an in-memory VentureFs (EE-125)", "node", ["packages/naive/src/store/connectors/effects-test.ts"]],
  ["knowledge connectors through the router: router, catalog, matrix and attribute evals", "node", ["packages/naive/src/interfaces/tests/connectors-router-test.ts"]],
  ["validation lint: claims, shelf life, agent grades, Discovery-grade decisions", "node", ["packages/naive/src/interfaces/tests/lint-validation-test.ts"]],
  ["validation: examples", "node", ["packages/naive/src/checks/check-validation.ts", "packages/naive/src/records/examples/workspace", "--score"]],
  ["problem assessment behaviors (Gherkin scenarios)", "node", ["packages/naive/src/engine/bdd.ts", "packages/naive/src/functions/strategy/kits/validation/features/problem-assessment.feature"]],
  ["strategic foundation: examples", "node", ["packages/naive/src/engine/foundation.ts", "packages/naive/src/records/examples/workspace"]],
  ["foundation statement behaviors (Gherkin scenarios)", "node", ["packages/naive/src/engine/bdd.ts", "packages/naive/src/functions/strategy/features/strategic-foundation.feature"]],
  ["decision affects grammar: malformed entries rejected, well-formed accepted", "node", ["packages/naive/src/engine/decision-affects-test.ts"]],
  ["record generators (EE-099): glossary, reference, bug, trace span, detector and detector trial describe and draft records that pass their schemas", "node", ["packages/naive/src/engine/generators/generators-test.ts"]],
  ["signal render: every worked case, the competitors package's included, renders to its expected records; receive, withdraw, the fold, the fixpoint, edge listeners and the diff", "node", ["packages/naive/src/engine/signals/render-test.ts"]],
  ["autoresearch record types: recipe, eval plan, experiment log, receptions and settles; the examples validate and agree, the schemas refuse what the design forbids, and the generators draft records that pass", "node", ["packages/naive/src/engine/generators/recipes-test.ts"]],
  ["signal library record types: the examples validate, a signal's id is the address of its content, the schemas refuse what the design forbids, and the generators draft records that pass", "node", ["packages/naive/src/engine/generators/signals-test.ts"]],
  ["decisions: examples", "node", ["packages/naive/src/engine/decisions.ts", "packages/naive/src/records/examples/workspace"]],
  ["decision behaviors (Gherkin scenarios)", "node", ["packages/naive/src/engine/bdd.ts", "packages/naive/src/functions/strategy/features/decisions.feature"]],
  ["decision harness demo (an agent over MCP, paused until the founder decides)", "node", ["packages/naive/src/interfaces/demo/decision-harness.ts", "--auto"]],
  ["Product Anatomy runner", "node", ["packages/naive/src/functions/products/frameworks/product-anatomy/test.ts"]],
  ["idea map (ideas verbatim, tags within the conventions)", "node", ["packages/naive/src/functions/strategy/frameworks/idea-map/test.ts"]],
  ["site presence (weights, prominence, score)", "node", ["packages/naive/src/functions/marketing-and-sales/marketing/site/test.ts"]],
  ["venture packages (fit by phase, question matrix, completeness)", "node", ["packages/naive/src/engine/packages-test.ts"]],
  ["decision analytics (by function and type, wording, outcomes)", "node", ["packages/naive/src/engine/decision-analytics-test.ts"]],
  ["decision docket across functions (value, attention, dominance, replay)", "node", ["packages/naive/src/engine/docket-test.ts"]],
  ["decision docket against the scenario evidence set (reports agreement; does not gate on it)", "node", ["packages/naive/src/engine/docket-eval.ts"]],
  ["workspace: settings, cross-venture reads, naive capture and the inbox", "node", ["packages/naive/src/engine/workspace-test.ts"]],
  ["validation study: interviews, feedback, bugs, telemetry, the beta gate and feedback routing", "node", ["packages/naive/src/interfaces/tests/validation-study-test.ts"]],
  ["router, CLI, MCP server and API", "node", ["packages/naive/src/interfaces/test.ts"]],
  ["write scope: router, engine and interfaces tests write only inside the venture, the temp dir and named exceptions", "node", ["packages/naive/src/checks/check-write-scope.ts"]],
  ["write scope: a write outside the venture in a broken copy fails the check", "node", ["packages/naive/src/checks/check-write-scope-test.ts"]],
];

// Generated files: the committed copy must equal a fresh render.
const rendered = (path: string, marker: string) => (md: string) => {
  const doc = readFileSync(join(root, path), "utf8");
  return doc.slice(doc.indexOf(marker)).trim() === md.trim();
};

const cheap: Step[] = [
  // ESLint is not skipped when missing: that hid real lint errors while the suite said "all passing" (02d5581).
  ["eslint (npm run lint)", "npm", ["run", "lint", "--silent"]],
  ["types (tsc checkJs, every file)", "node", ["packages/naive/src/checks/check-types.ts"]],
  // The packed install tests run npm pack, whose prepare builds dist/; building it here first lets them find it current.
  ["the compiled package: dist/ builds (npm run build, EE-159)", "node", ["scripts/build.ts"]],
  ["packages/naive/src/terms/ontology.md matches packages/naive/src/terms/ontology.json (regenerate with node packages/naive/src/checks/check-nouns.ts --md)", "node", ["packages/naive/src/checks/check-nouns.ts", "--md"], rendered("packages/naive/src/terms/ontology.md", "\n### System")],
  ["layer relationships in docs/design/LAYERS_AND_KITS_2026-10-27.md match the kits (regenerate with node packages/naive/src/checks/check-data-model.ts --md)", "node", ["packages/naive/src/checks/check-data-model.ts", "--md"], rendered("docs/design/LAYERS_AND_KITS_2026-10-27.md", "### Layer relationships")],
  ["docs/reference/ROUTES.md matches the kits (regenerate with node packages/naive/src/router/router.ts --md)", "node", ["packages/naive/src/router/router.ts", "--md"], rendered("docs/reference/ROUTES.md", "## Routes")],
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

const run = ([, cmd, args, matches]: Step) => new Promise<Result>((resolve) => {
  const child = spawn(cmd, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" } });
  let stdout = "", stderr = "";
  child.stdout.setEncoding("utf8").on("data", (d) => { stdout += d; });
  child.stderr.setEncoding("utf8").on("data", (d) => { stderr += d; });
  child.on("error", (e) => resolve({ ok: false, output: e.message }));
  child.on("close", (code) => resolve({ ok: matches ? matches(stdout) : code === 0, output: stdout + stderr }));
});

const report = ([name]: Step, { ok, output }: Result) => {
  if (!ok) failed++;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
  if (!ok) console.log(output.trim().split("\n").filter((l) => /FAIL|✗|error|Error|not /.test(l)).slice(0, 8).map((l) => `      ${l}`).join("\n"));
};

const runAll = async (list: Step[], size: number) => {
  const results: Result[] = [];
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
