# core

Up: [repository](../../AGENTS.md)

## What this is

The first code package of the monorepo rebuild. It holds the modules every layer needs and that import nothing else in the repository: where a venture's logical files sit, the venture's hash-chained provenance log, the instrumentation of calls, and one action's memo scope. They moved here from `schema/` and `interface/` so that the layers stop importing each other through them. Venture packages, which are records and not code, live in [`library/packages/`](../../library/packages/) (EE-116).

## Where things are

| Path | Holds |
|---|---|
| [`venture-paths.mjs`](./venture-paths.mjs) | Where each logical file of a venture sits in its layout (`ventureFile`, `physical`). Imports nothing in the repository. |
| [`instrumentation.mjs`](./instrumentation.mjs) | Timing and measuring of each call and judgment, for agent vitals. Imports `venture-paths.mjs`. |
| [`provenance.mjs`](./provenance.mjs) | The venture's append-only provenance log, `provenance.jsonl`, with its hash chain (EE-031). Imports the two above. |
| [`action-scope.mjs`](./action-scope.mjs) | One action's scope: `actionScope`, `memo`, `forget`, `inAction` and `actionStats`, values computed once per router call and shared. Imports nothing in the repository. `schema/caching.mjs` re-exports it. |

The old paths `schema/venture-paths.mjs`, `interface/instrumentation.mjs` and `interface/provenance.mjs` re-export these modules, for code outside this repository that imports them by path, such as an installed create-venture.

## Run and test

- `node schema/check-provenance.mjs <dir>` checks a venture's provenance chain.
- `node interface/test.mjs` and `node interface/context-test.mjs` cover these modules through the router. `node test.mjs` runs both.

## How it connects

- Called by: [`interface/router.mjs`](../../interface/router.mjs), the CLI, the checkers in [`schema/`](../../schema/README.md), the console bridge and the store kernel.
- Calls: only Node built-ins, and `provenance.mjs` starts `interface/orchestration/triggers.mjs` as a child process after a write.

## Not built

- This folder is not an npm workspace package yet. It becomes one, with a scoped name, once the workspaces pull request lands and the scope is chosen (open in the rebuild plan).
- The route table moved to [`packages/routes`](../routes/README.md). The modules that ran routes through the router's `call` moved to [`interface/orchestration/`](../../interface/orchestration/README.md), so `schema/` no longer imports `interface/`. No import cycle between units remains (`node scripts/dependency-rules.ts`).
