# orchestration

Up: [repository](../../AGENTS.md)

## What this is

The modules that compose routes. Each one runs records through the router's `call`, so it sits in the interface, above `schema/` and the router. They moved here from `schema/` in step 3 of the router inversion in the monorepo rebuild. Leaving them in `schema/` kept an import from `schema/` up to `interface/router.mjs`, and that import was part of the cycle. The design is [`docs/design/MONOREPO_ROUTER_INVERSION_2026-11-05.md`](../../docs/design/MONOREPO_ROUTER_INVERSION_2026-11-05.md). No shim stays at the old paths, because a shim would import the interface from `schema/` again.

## Where things are

| Path | Holds |
|---|---|
| [`triggers.mjs`](./triggers.mjs) | Triggers that run after each write (M-12, E-7). A failed run is raised as a decision. `mentura triggers` shows them. |
| [`setup.mjs`](./setup.mjs) | Setup in the model's harness (EE-083). It holds the questions, and each answer is a proposal the founder confirms. `naive setup` and the MCP setup tools use it. |
| [`migrate-venture.mjs`](./migrate-venture.mjs) | `naive migrate` (EE-076). An agent rewrites a project as records, and each record is written through the router once a person decides. |
| [`releases.mjs`](./releases.mjs) | The release rules (I-17, C-13): confirmed records frozen in, live holes named, the release card. |
| [`build-release.mjs`](./build-release.mjs) | `naive build`, the command line over `releases.mjs`. |
| [`model-steps.mjs`](./model-steps.mjs) | Model steps (use model, EE-073): the payload code computes, the judgments a model still owes, and how code accepts, overrules or routes each answer. The route is `system/steps`. |

## Run and test

- `node interface/orchestration/triggers.mjs <venture dir> --fire` runs the triggers once.
- `node interface/orchestration/build-release.mjs <venture dir> [--dry-run] [--json]` builds a release.
- `node interface/orchestration/migrate-venture.mjs --from <project> --venture <dir>` writes a migration plan.
- These tests cover them: [`interface/tests/setup-test.mjs`](../tests/setup-test.mjs), [`interface/tests/model-steps-test.mjs`](../tests/model-steps-test.mjs), [`interface/tests/delegation-test.mjs`](../tests/delegation-test.mjs), [`schema/releases-test.mjs`](../../schema/releases-test.mjs), [`schema/upgrades-test.mjs`](../../schema/upgrades-test.mjs) (triggers) and [`schema/migrate-test.mjs`](../../schema/migrate-test.mjs). The tests in `schema/` start these modules as child processes and do not import them. `node test.mjs` runs all of them.

## How it connects

- Called by: [`interface/cli/mentura.mjs`](../cli/mentura.mjs), [`interface/cli/naive.mjs`](../cli/naive.mjs), [`interface/mcp/server.mjs`](../mcp/server.mjs), [`interface/kit-boundary.mjs`](../kit-boundary.mjs) and [`interface/release-card.mjs`](../release-card.mjs). [`packages/core/provenance.mjs`](../../packages/core/provenance.mjs) starts `triggers.mjs` by its path after every write. [`schema/workspace-init.mjs`](../../schema/workspace-init.mjs) starts `migrate-venture.mjs` the same way.
- Calls: [`interface/router.mjs`](../router.mjs), and modules in `schema/`, `packages/` and `knowledge/`.
