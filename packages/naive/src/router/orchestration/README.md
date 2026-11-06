# orchestration

Up: [repository](../../../../../AGENTS.md)

## What this is

The modules that compose routes. Each one runs records through the router's `call`, so it sits in the interface, above `schema/` and the router. They moved here from `schema/` in step 3 of the router inversion in the monorepo rebuild. Leaving them in `schema/` kept an import from `schema/` up to `packages/naive/src/router/router.mjs`, and that import was part of the cycle. The design is [`docs/design/MONOREPO_ROUTER_INVERSION_2026-11-05.md`](../../../../../docs/design/MONOREPO_ROUTER_INVERSION_2026-11-05.md). No shim stays at the old paths, because a shim would import the interface from `schema/` again.

## Where things are

| Path | Holds |
|---|---|
| [`triggers.mjs`](./triggers.mjs) | Triggers that run after each write (M-12, E-7). A failed run is raised as a decision. `mentura triggers` shows them. |
| [`setup.mjs`](./setup.mjs) | Setup in the model's harness (EE-083). It holds the questions, and each answer is a proposal the founder confirms. `naive setup` and the MCP setup tools use it. Pointing a function at a system runs the system's sync command when the app names one ([`packages/naive/src/core/sync.mjs`](../../core/sync.mjs)), and the state lists those systems under `syncs`. |
| [`migrate-venture.mjs`](./migrate-venture.mjs) | `naive migrate` (EE-076). An agent rewrites a project as records, and each record is written through the router once a person decides. |
| [`releases.mjs`](./releases.mjs) | The release rules (I-17, C-13): confirmed records frozen in, live holes named, the release card. |
| [`build-release.mjs`](./build-release.mjs) | `naive build`, the command line over `releases.mjs`. |
| [`venture-package.mjs`](./venture-package.mjs) | The venture package with the idea map's routing (EE-067, EE-061): `venturePackage(dir)` passes `route()` from the idea map into `packages()` in `packages/naive/src/engine/packages.mjs`, and it holds the command line for the `system/package` route. |
| [`model-steps.mjs`](./model-steps.mjs) | Model steps (use model, EE-073): the payload code computes, the judgments a model still owes, and how code accepts, overrules or routes each answer. The route is `system/steps`. |

## Run and test

- `node packages/naive/src/router/orchestration/triggers.mjs <venture dir> --fire` runs the triggers once.
- `node packages/naive/src/router/orchestration/build-release.mjs <venture dir> [--dry-run] [--json]` builds a release.
- `node packages/naive/src/router/orchestration/migrate-venture.mjs --from <project> --venture <dir>` writes a migration plan.
- `node packages/naive/src/router/orchestration/venture-package.mjs <venture> [--write] [--json]` prints or writes the venture package.
- These tests cover them: [`packages/naive/src/interfaces/tests/setup-test.mjs`](../../interfaces/tests/setup-test.mjs), [`packages/naive/src/interfaces/tests/model-steps-test.mjs`](../../interfaces/tests/model-steps-test.mjs), [`packages/naive/src/interfaces/tests/delegation-test.mjs`](../../interfaces/tests/delegation-test.mjs), [`packages/naive/src/engine/releases-test.mjs`](../../engine/releases-test.mjs), [`packages/naive/src/engine/upgrades-test.mjs`](../../engine/upgrades-test.mjs) (triggers) and [`packages/naive/src/engine/migrate-test.mjs`](../../engine/migrate-test.mjs). The tests in `schema/` start these modules as child processes and do not import them. `node test.mjs` runs all of them.

## How it connects

- Called by: [`packages/naive/src/interfaces/cli/mentura.mjs`](../../interfaces/cli/mentura.mjs), [`packages/naive/src/interfaces/cli/naive.mjs`](../../interfaces/cli/naive.mjs), [`packages/naive/src/interfaces/mcp/server.mjs`](../../interfaces/mcp/server.mjs), [`packages/naive/src/interfaces/dev/setup.mjs`](../../interfaces/dev/setup.mjs) and [`packages/naive/src/router/kit-boundary.mjs`](../kit-boundary.mjs). [`packages/naive/src/core/provenance.mjs`](../../core/provenance.mjs) starts `triggers.mjs` by its path after every write. [`packages/naive/src/engine/workspace-init.mjs`](../../engine/workspace-init.mjs) starts `migrate-venture.mjs` the same way.
- Calls: [`packages/naive/src/router/router.mjs`](../router.mjs), and modules in `schema/`, `packages/` and `knowledge/`. `migrate-venture.mjs` reads each record type's schema with `recordPath` and `releases.mjs` names it to the validator with `schemaNameOf`, both from [`packages/naive/src/records`](../../records/README.md), so neither depends on where the record types sit.
