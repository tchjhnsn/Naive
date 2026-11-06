# tests

Up: [repository](../../AGENTS.md)

## What this is

Tests that run a module in `schema/` through the router: its route via `call`, the MCP server or the HTTP API. They moved here from `schema/` in the monorepo rebuild (router inversion, step 2), because a test that runs a route tests the router and the module together, so it sits above both. That way `schema/` does not import `interface/` for its tests. The design is [`docs/design/MONOREPO_ROUTER_INVERSION_2026-11-05.md`](../../docs/design/MONOREPO_ROUTER_INVERSION_2026-11-05.md).

## Where things are

| Path | Holds |
|---|---|
| [`gate-test.mjs`](./gate-test.mjs) | The write gate: `naive.config.json`, one gate per venture, who is acting. |
| [`caching-test.mjs`](./caching-test.mjs) | Record and judgment caches, lifetimes, the per-action memo. |
| [`freshness-test.mjs`](./freshness-test.mjs) | Revalidating records by time and on demand. |
| [`model-steps-test.mjs`](./model-steps-test.mjs) | Model steps, judgments, kit boundaries, uncertain routing. |
| [`setup-test.mjs`](./setup-test.mjs) | Setup in the model's harness over MCP. |
| [`brand-test.mjs`](./brand-test.mjs) | Brand tokens, voice, glossary, sitemap and assets. A remote image is recorded through `addAsset` and `addRemote` in [`packages/naive/src/router/brand.mjs`](../brand.mjs), the calls an app's fetcher makes; fetching is not Naive's. |
| `lint-*-test.mjs` | The function lint suites (customers, finance, foundation, investors, legal, product, validation) run through their routes. The clean ventures they expect silence from are the examples in `packages/naive/src/records/examples/workspace` and `packages/naive/src/records/examples/software`. |
| `decision-index-test.mjs`, `decision-reasons-test.mjs` | The live decision index and frozen decision reasons. |
| [`validation-study-test.mjs`](./validation-study-test.mjs) | Interviews, feedback, bugs, telemetry, the beta gate. |
| [`connectors-router-test.mjs`](./connectors-router-test.mjs) | The filesystem connector through the router: a mapped source, the catalog, the source-of-truth matrix and attributes. It moved here from [`packages/naive/src/store/connectors/eval.mjs`](../../knowledge/connectors/eval.mjs) in step 4. |
| [`delegation-test.mjs`](./delegation-test.mjs) | Delegation grants and the builder-is-not-verifier rule. It moved here in step 3 because it imports [`packages/naive/src/router/orchestration/setup.mjs`](../orchestration/setup.mjs). |
| `canonical-core-test.mjs`, `design-additions-test.mjs`, `structure-checks-test.mjs`, `visibility-test.mjs` | The canonical core, design additions, structure checks and field visibility. |

## Run and test

- `node packages/naive/src/interfaces/tests/<name>-test.mjs` runs one test. Each prints its checks and exits 1 on a failure.
- `node test.mjs` runs all of them.

## How it connects

- Calls: [`packages/naive/src/router/router.mjs`](../router.mjs), the MCP server and the HTTP API, and the `schema/` modules under test. A test that reads the data model or a schema reads it through [`packages/naive/src/records`](../../packages/records/README.md), as `freshness-test.mjs` does.
- `setup-test.mjs` points finance at rho with `NAIVE_SYNC_RHO` naming the stand-in `packages/naive/src/records/examples/money-sync/sync.ts`.
- `setup-test.mjs` and `delegation-test.mjs` run create-venture from [`packages/create-venture/`](../../packages/create-venture/index.mjs), where it moved from the interface folder in step 2 of the Naive layout (EE-118).
- A test in `schema/` that does not import the router, the MCP server, the HTTP API or a module in [`packages/naive/src/router/orchestration/`](../orchestration/README.md) stays next to its module, even when it starts the CLI as a child process.
