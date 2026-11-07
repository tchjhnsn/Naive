# tests

Up: [repository](../../../../../AGENTS.md)

## What this is

Tests that run a module in `packages/naive/src/engine/` through the router: its route via `call`, the MCP server or the HTTP API. They moved here from the old `schema` folder in the monorepo rebuild (router inversion, step 2), because a test that runs a route tests the router and the module together, so it sits above both. That way the engine does not import the router for its tests. The design is [`docs/design/MONOREPO_ROUTER_INVERSION_2026-11-05.md`](../../../../../docs/design/MONOREPO_ROUTER_INVERSION_2026-11-05.md).

## Where things are

| Path | Holds |
|---|---|
| [`as-of-test.ts`](./as-of-test.ts) | The blob store and as-of reads ([`packages/naive/src/store/as-of.mjs`](../../store/as-of.mjs)): a record written through the router at known times read as of each, before the first, after a move and with a blob missing or damaged. It sits here and not in `store/` because it writes through the router, and store comes before router. |
| [`reads-as-of-test.ts`](./reads-as-of-test.ts) | The researcher's read clamp ([`packages/naive/src/router/reads-as-of.mjs`](../../router/reads-as-of.mjs)) through the router and the agent filesystem: no read, list, view, ls or glob as of a cut answers with anything written after it, a signal observed after the cut is left out, a researcher read with no cut is refused, live actions are refused as of a cut, writes are not clamped and nothing under `_eval/` is listed. |
| [`agent-files-test.ts`](./agent-files-test.ts) | The agent filesystem over the router: ls, read, glob, grep, write, edit, a draft for an agent that decides a decision, and tool spans. |
| [`projector-test.ts`](./projector-test.ts) | One writer per file (signal library build item 4): a person's, an agent's, the MCP server's, the agent filesystem's and the CLI's write to `competitors/<id>/signals.json` refused with the emit hint; the id `projector` unclaimable without the symbol; the projector's write never held; reads unaffected; `competitors/<id>.json` the person's, created by the projector only when missing. |
| [`hosted-runtime-test.ts`](./hosted-runtime-test.ts) | Hosted mode ([`packages/naive/src/core/runtime.mjs`](../../core/runtime.mjs)): each feature that reaches outside the tenant refuses with a message naming it and why, the host's hooks stand in, and without `NAIVE_RUNTIME` the laptop path still runs. |
| [`gate-test.mjs`](./gate-test.mjs) | The write gate: `naive.config.json`, one gate per venture, who is acting. |
| [`caching-test.mjs`](./caching-test.mjs) | Record and judgment caches, lifetimes, the per-action memo. |
| [`freshness-test.mjs`](./freshness-test.mjs) | Revalidating records by time and on demand. |
| [`model-steps-test.mjs`](./model-steps-test.mjs) | Model steps, judgments, kit boundaries, uncertain routing. |
| [`setup-test.mjs`](./setup-test.mjs) | Setup in the model's harness over MCP. |
| [`brand-test.mjs`](./brand-test.mjs) | Brand tokens, voice, glossary, sitemap and assets. A remote image is recorded through `addAsset` and `addRemote` in [`packages/naive/src/router/brand.mjs`](../../router/brand.mjs), the calls an app's fetcher makes; fetching is not Naive's. |
| `lint-*-test.mjs` | The function lint suites (customers, finance, foundation, investors, legal, product, validation) run through their routes. The clean ventures they expect silence from are the examples in `packages/naive/src/records/examples/workspace` and `packages/naive/src/records/examples/software`. |
| `decision-index-test.mjs`, `decision-reasons-test.mjs` | The live decision index and frozen decision reasons. |
| [`validation-study-test.mjs`](./validation-study-test.mjs) | Interviews, feedback, bugs, telemetry, the beta gate. |
| [`connectors-router-test.mjs`](./connectors-router-test.mjs) | The filesystem connector through the router: a mapped source, the catalog, the source-of-truth matrix and attributes, and that a write to another source keeps its blob under `.naive/blobs/`. It moved here from [`packages/naive/src/store/connectors/eval.mjs`](../../store/connectors/eval.mjs) in step 4. |
| [`delegation-test.mjs`](./delegation-test.mjs) | Delegation grants and the builder-is-not-verifier rule. It moved here in step 3 because it imports [`packages/naive/src/router/orchestration/setup.mjs`](../../router/orchestration/setup.mjs). It reads the role templates from [`packages/naive/template/governance/`](../../../template/README.md) and checks that a record naming the template's path before step 8 still resolves. |
| `canonical-core-test.mjs`, `design-additions-test.mjs`, `structure-checks-test.mjs`, `visibility-test.mjs` | The canonical core, design additions, structure checks and field visibility. |

## Run and test

- `node packages/naive/src/interfaces/tests/<name>-test.mjs` runs one test. Each prints its checks and exits 1 on a failure.
- `node test.mjs` runs all of them.

## How it connects

- Calls: [`packages/naive/src/router/router.mjs`](../../router/router.mjs), the MCP server and the HTTP API, and the `schema/` modules under test. A test that reads the data model or a schema reads it through [`packages/naive/src/records`](../../records/README.md), as `freshness-test.mjs` does.
- `setup-test.mjs` points finance at rho with `NAIVE_SYNC_RHO` naming the stand-in `packages/naive/src/records/examples/money-sync/sync.ts`.
- `setup-test.mjs` and `delegation-test.mjs` run create-venture from [`packages/create-venture/`](../../../../create-venture/index.mjs), where it moved from the interface folder in step 2 of the Naive layout (EE-118).
- A test in `schema/` that does not import the router, the MCP server, the HTTP API or a module in [`packages/naive/src/router/orchestration/`](../../router/orchestration/README.md) stays next to its module, even when it starts the CLI as a child process.

Tests that check a record against its schema run `node packages/naive/src/records/validate.mjs`, not Python.
