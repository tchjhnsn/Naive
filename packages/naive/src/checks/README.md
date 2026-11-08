# checks

Up: [src](../README.md)

## What this is

The checkers and lints. A checker reads a workspace, a venture or the repository, prints what holds and what does not, and exits 1 on a failure; it never edits a record. Lints answer through routes such as `money/lint` and `people/lint`. A symbolic check reaches the EE-095 term engine, `admit` or a Lean theorem (`packages/naive/src/terms/bypass-guard-test.ts`).

## Where things are

| Path | Holds |
|---|---|
| [`check-assets.mjs`](./check-assets.mjs) | Checks each venture's public/ assets (packages/naive/src/engine/assets.mjs). |
| [`check-boundary.mjs`](./check-boundary.mjs) | The boundary between Naive and the apps that use it (EE-041, EE-118). |
| [`check-brand.mjs`](./check-brand.mjs) | Checks each venture's brand (packages/naive/src/engine/brand.mjs). |
| [`check-config.mjs`](./check-config.mjs) | Checks a venture's naive.config.json (P-2) and explains its gate. |
| [`check-data-model.mjs`](./check-data-model.mjs) | Checks the data model (packages/naive/src/records/data-model.json), the layer manifests and the venture packages against the repository (EE-018, EE-071). Every file in an example venture must have a kind, and a record type is a log exactly when its form is `json-lines`. A record type without a generator fails with a hint to add one as `packages/naive/src/engine/generators/<id>.ts`. Each listener in a package manifest's `listeners` must pass `packages/naive/src/records/listener.schema.json`, name its consumer and have an id no other listener of that package has. A record type of form `typescript` (a recipe) has only `.ts` paths, and a `settles` block sits only on a type with `writer: projection` and names only top-level properties of its schema, each scored once, a forecast field being a number. Every record type names its owning `function`: an id in `packages/naive/src/functions/departments.json`, or null when several functions share it. The check fails on an unknown id, when the schema's list of ids drifts from the catalog, when a venture record type kept in a package folder a function owns (`PACKAGE_FUNCTION` in `packages/naive/src/core/venture-paths.mjs`) names another function, when a method record type under `packages/naive/src/functions/<function>/` names another, and when a record type names a function other than its owning package's. A record type with `writer: function` must name a function, since only `<function>-agent` or a person writes it. |
| [`check-data-packages.mjs`](./check-data-packages.mjs) | Data packages and raw (EE-070). |
| [`check-delegation.mjs`](./check-delegation.mjs) | Checks delegation. A role template's `function` must be an id in `packages/naive/src/functions/departments.json`, or `all` for the chief delegator alone. |
| [`check-departments.mjs`](./check-departments.mjs) | Checks each venture's departments (EE-047). |
| [`check-detectors.ts`](./check-detectors.ts) | Checks a venture's detectors (governance/detectors/<id>.json) and their detection ledgers, and reports for each one, Naive's shipped defaults included: hit and false alarm rates with Wilson intervals, d' and c, ROC area, the base rate, and the expected cost at the current line and the best observed line. It fails only on structure, never on a number. `--propose` files a criterion change as an open decision once, only with at least 30 resolved trials, a Wilson interval on the cost difference that excludes zero, and a tier that is not one_way_door. It never edits a detector. |
| [`check-detectors-test.ts`](./check-detectors-test.ts) | Breaks each structural rule of check-detectors.ts on copies, shows numbers never fail it, and shows `--propose` files once and leaves a decided proposal alone. |
| [`check-signals.ts`](./check-signals.ts) | Checks signal libraries, signal types and listeners (signal library build item 7). With no folder it checks Naive's packages (the implicit library `naive`: every package's `signals/types/` and listeners) and the example library; with folders it checks each one as a library (`library.json`), a venture (`venture.json`: its local library `raw/signals/`, each filesystem signal library its source map lists, and its listeners merged as the pull merges them) or a package (`signals/types/`). Errors: a type file not at `types/<id>/<version>.signal.json` or not valid; a part no type resolves, at a key the props do not declare, twice, or in a cycle; two projections of one type to one route; a projection to a route no record type lives at; a fold reading an undeclared prop; a field a composite claims that its shared part owns; one field folded by two reducers, or one route written once and folded; a worked case that does not render, run through the signal engine; a signal that does not hash to its id, sits elsewhere, has no type, or whose props or parts' props do not match; a withdrawal from another producer outside a local library; a log line that is invalid, on another day, in another type's log, names a missing file or another id or subject, or repeats an id; a signal no log line lists; types or signals with no `library.json`; a listener range no type resolves, a project listener whose type has no projection to its route, a listener id from two places, `listeners_off` naming nobody. Warnings: a retraction target in no library checked, `types/` in a local library, an unconfirmed paid library, and a listener naming a venture file no record type lives at. |
| [`check-signals-test.ts`](./check-signals-test.ts) | Breaks each rule of check-signals.ts on copies of the example library, the competitors package's types and small ventures, and shows the clean copies and the repository pass. |
| [`check-docs-claims.mjs`](./check-docs-claims.mjs) | Checks that the docs describe only what is built. |
| [`check-execution.mjs`](./check-execution.mjs) | Checks a venture's handoffs (operations, EE-038) and evidence records against its decision rights (EE-017). A handoff that names `requested_by` has every review judged by that requester, and only the requester verifies it. |
| [`check-governance.mjs`](./check-governance.mjs) | Checks each venture's ownership-and-control records (EE-022). |
| [`check-integrations.mjs`](./check-integrations.mjs) | Checks every layer's tooling/integrations.json for the rules one entry's schema cannot state. |
| [`check-nextjs-status.mjs`](./check-nextjs-status.mjs) | Checks docs/design/naive-nextjs-status.json against the Next.js translation ledger and the code. |
| [`check-nouns.mjs`](./check-nouns.mjs) | Checks the system's nouns (EE-014). With `--md` it writes the glossary in one write and exits only once it is flushed, because stdout to a pipe is asynchronous and an early exit cut the render that `test.mjs` compares with `ontology.md`. |
| [`check-people.mjs`](./check-people.mjs) | Checks venture types and people (EE-082) in a workspace. |
| [`check-private.mjs`](./check-private.mjs) | Private records, fields, and sensitive streams never reach a model (EE-073). |
| [`check-provenance.mjs`](./check-provenance.mjs) | Checks each venture's provenance log (<venture>/provenance.jsonl, EE-031). |
| [`check-traces.ts`](./check-traces.ts) | Checks each venture's traces (<venture>/traces/<session>.jsonl, EE-121): the hash chain, the fields, inputs and outputs kept only when traces.content is on, and every span a provenance line names. |
| [`check-recipes.ts`](./check-recipes.ts) | Checks a venture's recipes across files (autoresearch build plan item 11): each `<pattern>.recipe.ts` lints in the sandbox, its exports pass `recipe.schema.json`, its pattern is a projected record type, every type it hears is in a library the venture reads and every fact it names is a record type's file; its plan passes its schema, names the pattern, is addressed by its sha and has ordered, purged windows; its experiment log keeps its chain, names the plan, holds no stale base (its first experiment may start from nothing, or from a recipe that was live before the log and is in the blob store), checks only the tip on holdout and stays within the plan's budgets (holdout checks count distinct tips checked, so accepting over a logged failure spends no second check), and the live recipe is the last that went live; each reception names its record, a known recipe and signals the libraries hold, and the live recipe renders the record again exactly, with each noise signal leaving it unchanged when dropped. It renders with the input the signal pull and the scorer give a recipe (`recipeInput` in `packages/naive/src/engine/recipes/outcomes.ts`), so a reception file names exactly the signals that render heard. A plan or log with no recipe fails. It scores nothing (items 5 and 8). With no folder it checks `packages/naive/src/records/examples/signals/`. |
| [`check-recipes-test.ts`](./check-recipes-test.ts) | Breaks `check-recipes.ts` on copies of the example venture, one rule at a time, and checks the clean copy, real noise and the command line. |
| [`traces-test.ts`](./traces-test.ts) | Tests traces: spans nest, chain and link from provenance, content stays out unless turned on, `check-traces.ts` catches an edited line and a dangling link, a write inside `withSpan` with traces off names no span, and `naive trace` works from the command line. |
| [`check-publication.mjs`](./check-publication.mjs) | Checks each venture's publication policy (governance/publication-policy.json, EE-025) and the handoffs that publish. |
| [`check-ready.mjs`](./check-ready.mjs) | Checks that a handoff is ready to execute before anyone starts on it (EE-019). A handoff that names `requested_by` is not ready while a review names another reviewer. |
| [`check-reasons.mjs`](./check-reasons.mjs) | The check for reasons with citations (packages/naive/src/engine/reasons.mjs). |
| [`md-render-flush-test.ts`](./md-render-flush-test.ts) | Runs `check-nouns.mjs --md` and `check-data-model.mjs --md` eight at a time, some with the reader paused for a moment, and checks every output equals the committed render. |
| [`check-record-paths-test.ts`](./check-record-paths-test.ts) | Tests the record types' resolver (packages/naive/src/records/index.mjs) and the check that every record path goes through it (packages/naive/src/checks/check-record-paths.ts). |
| [`check-record-paths.ts`](./check-record-paths.ts) | The record types' paths go through one resolver (monorepo rebuild step 5a-1, design docs/design/MONOREPO_RECORDS_PACKAGE_2026-11-05.md in PR #243). It no longer compares the resolver with a Python copy of the mapping, because `validate.py` is gone. |
| [`check-sdlc-catalog.ts`](./check-sdlc-catalog.ts) | Checks the SDLC catalog (packages/naive/src/functions/products/sdlc/catalog.json, R-26) for what its schema cannot state. |
| [`check-sources.mjs`](./check-sources.mjs) | Checks each venture's source map (<venture>/knowledge/sources.json, EE-037) for what its schema cannot state. Two rules that can hold at once never tie; the spend register's access matrix in [`packages/naive/template/knowledge/sources.json`](../../template/knowledge/sources.json) is the template's case (`node packages/naive/src/interfaces/tests/spend-register-test.ts` breaks it on copies). |
| [`check-team.mjs`](./check-team.mjs) | Checks each venture's team plan (operations/team-plan.json) against the agent capability register (packages/naive/src/functions/human-capital/capabilities/agent-capabilities.json) and decision rights (EE-029). |
| [`check-telos.mjs`](./check-telos.mjs) | Checks each venture's telos (EE-023). |
| [`check-write-scope.ts`](./check-write-scope.ts) | Naive writes only inside the venture (docs/design/HOSTED_WORKING_COPY_2026-11-07.md, point 1). Runs the router's writes test, the interfaces tests (router, CLI, MCP and API, agent files, the gate, freshness, the decision index, connectors through the router), the engine's lifecycle, decision versions and upgrades tests, the traces test, the as-of read test, the researcher read clamp test, the research programs test and the recipe render test, with the preload in every Node process they start. Fails on a failing test or a write outside the venture under test and the OS temp dir, unless the check names the path as an exception with its reason. It names none today. Writes from programs that are not Node, such as git and python, are not seen. The hosted mode, not built, will turn the exceptions off. |
| [`check-write-scope-test.ts`](./check-write-scope-test.ts) | Proves the write-scope check passes a clean copy and fails a copy whose provenance code writes beside the repository, a write through node:fs/promises in a child process, and a failing test. |
| [`write-scope-preload.ts`](./write-scope-preload.ts) | The preload for check-write-scope.ts: wraps the node:fs calls that write, move or remove a file, open with write flags and createWriteStream, in their sync, callback and promise forms, and logs each path outside the allowed roots. |
| [`check-types-test.ts`](./check-types-test.ts) | Proves the type gate fails on what it must catch, in a throwaway copy of the gate. |
| [`check-types.ts`](./check-types.ts) | Type-checks the code with tsc (EE-087). |
| [`check-validation-study.mjs`](./check-validation-study.mjs) | Checks the validation study's records across files. |
| [`check-validation.mjs`](./check-validation.mjs) | Grades each venture's validation records (purpose/validation/*.json, EE-026) from their cited evidence, adapting GRADE (the GRADE Working Group's method for rating certainty of evidence). `--score` compares the score with the venture's `validation-recommend` detector line, else Naive's shipped default (`packages/naive/src/engine/detectors.mjs`). |
| [`check-ventures.mjs`](./check-ventures.mjs) | Checks the rules across a workspace's ventures that one venture.json alone cannot (EE-011, EE-012). |
| [`check-visibility.mjs`](./check-visibility.mjs) | The publish check for field visibility. |
| [`check-where-used.mjs`](./check-where-used.mjs) | Checks each venture's where-used list (EE-042). |
| [`competitors-package-test.ts`](./competitors-package-test.ts) | Tests the competitors package ([`packages/naive/library/packages/competitors/`](../../library/packages/competitors/README.md)): each listener hears a type it ships, each projection writes a record type it owns with fields that record's schema has and names its subject field, the person's master record is the only projection written once, and each worked case's signals and expected records are valid. |
| [`docs-claims-test.mjs`](./docs-claims-test.mjs) | Cases for packages/naive/src/checks/check-docs-claims.mjs. |
| [`lint-customers.mjs`](./lint-customers.mjs) | Customers lint. |
| [`lint-finance.mjs`](./lint-finance.mjs) | Finance lint. |
| [`lint-foundation.mjs`](./lint-foundation.mjs) | Foundation lint. |
| [`lint-investors.mjs`](./lint-investors.mjs) | Investors lint. |
| [`lint-legal.mjs`](./lint-legal.mjs) | Legal lint. |
| [`lint-money-test.mjs`](./lint-money-test.mjs) | Money lint (packages/naive/src/checks/lint-money.mjs, route money/lint) on made-up ventures in a temp folder. |
| [`lint-money.mjs`](./lint-money.mjs) | Money lint. |
| [`lint-people-test.mjs`](./lint-people-test.mjs) | People lint (people/lint). |
| [`lint-people.mjs`](./lint-people.mjs) | People alignment lint. |
| [`lint-product.mjs`](./lint-product.mjs) | Product alignment lint. |
| [`lint-validation.mjs`](./lint-validation.mjs) | Validation alignment lint. |
| [`premise-lint-test.mjs`](./premise-lint-test.mjs) | Tests the premise-attack linter. |
| [`premise-lint.mjs`](./premise-lint.mjs) | Premise-attack linter (Torian, 2026-10-30). |
| [`test.mjs`](./test.mjs) | Tests for the schema's checkers. |
| [`verify.mjs`](./verify.mjs) | The verification substrate. |

## Run and test

- `node packages/naive/src/checks/test.mjs` breaks copies of the examples and the repository and checks each checker fails on them.
- `node test.mjs` runs each checker on the examples.

## How it connects

- Called by: `test.mjs`, the router's check actions and CI.
- Calls: [`engine`](../engine/README.md), [`records`](../records/README.md), [`terms`](../terms/), [`core`](../core/README.md).

`check-config.mjs` checks `naive.config.json` against its schema in process with `validateFile` from [`packages/naive/src/records/validate.mjs`](../records/README.md), so no checker here needs Python. `premise-lint-test.mjs` proves a failed proposal is reported by preloading a validator that cannot run (`useValidator`).
