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
| [`brand-test.mjs`](./brand-test.mjs) | Brand tokens, voice, glossary, sitemap and assets. |
| `lint-*-test.mjs` | The function lint suites (customers, finance, foundation, investors, legal, product, validation) run through their routes. |
| `decision-index-test.mjs`, `decision-reasons-test.mjs` | The live decision index and frozen decision reasons. |
| [`validation-study-test.mjs`](./validation-study-test.mjs) | Interviews, feedback, bugs, telemetry, the beta gate. |
| [`connectors-router-test.mjs`](./connectors-router-test.mjs) | The filesystem connector through the router: a mapped source, the catalog, the source-of-truth matrix and attributes. It moved here from [`knowledge/connectors/eval.mjs`](../../knowledge/connectors/eval.mjs) in step 4. |
| [`delegation-test.mjs`](./delegation-test.mjs) | Delegation grants and the builder-is-not-verifier rule. It moved here in step 3 because it imports [`interface/orchestration/setup.mjs`](../orchestration/setup.mjs). |
| `canonical-core-test.mjs`, `design-additions-test.mjs`, `structure-checks-test.mjs`, `visibility-test.mjs` | The canonical core, design additions, structure checks and field visibility. |

## Run and test

- `node interface/tests/<name>-test.mjs` runs one test. Each prints its checks and exits 1 on a failure.
- `node test.mjs` runs all of them.

## How it connects

- Calls: [`interface/router.mjs`](../router.mjs), the MCP server and the HTTP API, and the `schema/` modules under test. A test that reads the data model or a schema reads it through [`packages/records`](../../packages/records/README.md), as `freshness-test.mjs` does.
- A test in `schema/` that does not import the router, the MCP server, the HTTP API or a module in [`interface/orchestration/`](../orchestration/README.md) stays next to its module, even when it starts the CLI as a child process.
