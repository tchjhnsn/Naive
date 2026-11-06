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
| [`check-data-model.mjs`](./check-data-model.mjs) | Checks the data model (packages/naive/src/records/data-model.json), the layer manifests and the venture packages against the repository (EE-018, EE-071). |
| [`check-data-packages.mjs`](./check-data-packages.mjs) | Data packages and raw (EE-070). |
| [`check-delegation.mjs`](./check-delegation.mjs) | Checks delegation. |
| [`check-departments.mjs`](./check-departments.mjs) | Checks each venture's departments (EE-047). |
| [`check-docs-claims.mjs`](./check-docs-claims.mjs) | Checks that the docs describe only what is built. |
| [`check-execution.mjs`](./check-execution.mjs) | Checks a venture's handoffs (operations, EE-038) and evidence records against its decision rights (EE-017). |
| [`check-governance.mjs`](./check-governance.mjs) | Checks each venture's ownership-and-control records (EE-022). |
| [`check-integrations.mjs`](./check-integrations.mjs) | Checks every layer's tooling/integrations.json for the rules one entry's schema cannot state. |
| [`check-nextjs-status.mjs`](./check-nextjs-status.mjs) | Checks docs/design/naive-nextjs-status.json against the Next.js translation ledger and the code. |
| [`check-nouns.mjs`](./check-nouns.mjs) | Checks the system's nouns (EE-014). |
| [`check-people.mjs`](./check-people.mjs) | Checks venture types and people (EE-082) in a workspace. |
| [`check-private.mjs`](./check-private.mjs) | Private records, fields, and sensitive streams never reach a model (EE-073). |
| [`check-provenance.mjs`](./check-provenance.mjs) | Checks each venture's provenance log (<venture>/provenance.jsonl, EE-031). |
| [`check-traces.ts`](./check-traces.ts) | Checks each venture's traces (<venture>/traces/<session>.jsonl, EE-121): the hash chain, the fields, inputs and outputs kept only when traces.content is on, and every span a provenance line names. |
| [`traces-test.ts`](./traces-test.ts) | Tests traces: spans nest, chain and link from provenance, content stays out unless turned on, `check-traces.ts` catches an edited line and a dangling link, a write inside `withSpan` with traces off names no span, and `naive trace` works from the command line. |
| [`check-publication.mjs`](./check-publication.mjs) | Checks each venture's publication policy (governance/publication-policy.json, EE-025) and the handoffs that publish. |
| [`check-ready.mjs`](./check-ready.mjs) | Checks that a handoff is ready to execute before anyone starts on it (EE-019). |
| [`check-reasons.mjs`](./check-reasons.mjs) | The check for reasons with citations (packages/naive/src/engine/reasons.mjs). |
| [`check-record-paths-test.ts`](./check-record-paths-test.ts) | Tests the record types' resolver (packages/naive/src/records/index.mjs) and the check that every record path goes through it (packages/naive/src/checks/check-record-paths.ts). |
| [`check-record-paths.ts`](./check-record-paths.ts) | The record types' paths go through one resolver (monorepo rebuild step 5a-1, design docs/design/MONOREPO_RECORDS_PACKAGE_2026-11-05.md in PR #243). |
| [`check-sdlc-catalog.ts`](./check-sdlc-catalog.ts) | Checks the SDLC catalog (packages/naive/src/functions/products/sdlc/catalog.json, R-26) for what its schema cannot state. |
| [`check-sources.mjs`](./check-sources.mjs) | Checks each venture's source map (<venture>/knowledge/sources.json, EE-037) for what its schema cannot state. |
| [`check-team.mjs`](./check-team.mjs) | Checks each venture's team plan (operations/team-plan.json) against the agent capability register (packages/naive/src/functions/human-capital/capabilities/agent-capabilities.json) and decision rights (EE-029). |
| [`check-telos.mjs`](./check-telos.mjs) | Checks each venture's telos (EE-023). |
| [`check-types-test.ts`](./check-types-test.ts) | Proves the type gate fails on what it must catch, in a throwaway copy of the gate. |
| [`check-types.ts`](./check-types.ts) | Type-checks the code with tsc (EE-087). |
| [`check-validation-study.mjs`](./check-validation-study.mjs) | Checks the validation study's records across files. |
| [`check-validation.mjs`](./check-validation.mjs) | Grades each venture's validation records (purpose/validation/*.json, EE-026) from their cited evidence, adapting GRADE (the GRADE Working Group's method for rating certainty of evidence). |
| [`check-ventures.mjs`](./check-ventures.mjs) | Checks the rules across a workspace's ventures that one venture.json alone cannot (EE-011, EE-012). |
| [`check-visibility.mjs`](./check-visibility.mjs) | The publish check for field visibility. |
| [`check-where-used.mjs`](./check-where-used.mjs) | Checks each venture's where-used list (EE-042). |
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
