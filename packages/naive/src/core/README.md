# core

Up: [repository](../../../../AGENTS.md)

## What this is

The first code package of the monorepo rebuild. It holds the modules every layer needs and that import nothing else in the repository: where a venture's logical files sit, the venture's hash-chained provenance log, the instrumentation of calls, and one action's memo scope. They moved here from the old `schema` and `interface` folders, and now sit in `packages/naive/src/core/` (EE-118 step 5), so that the layers stop importing each other through them. Venture packages, which are records and not code, live in [`packages/naive/library/packages/`](../../library/packages/) (EE-116).

## Where things are

| Path | Holds |
|---|---|
| [`venture-paths.mjs`](./venture-paths.mjs) | Where each logical file of a venture sits in its layout (`ventureFile`, `physical`). Imports nothing in the repository. |
| [`instrumentation.mjs`](./instrumentation.mjs) | Timing and measuring of each call and judgment, for agent vitals. Imports `venture-paths.mjs`. |
| [`provenance.mjs`](./provenance.mjs) | The venture's append-only provenance log, `provenance.jsonl`, with its hash chain (EE-031). Imports the two above. |
| [`sync.mjs`](./sync.mjs) | Syncing a system of record into a venture (EE-083): `sync(system, dir)` runs the command the app names in `NAIVE_SYNC_<SYSTEM>` (such as `NAIVE_SYNC_RHO`) with `--venture <dir>`, and `syncCommand` and `syncVariable` say which. Naive ships no sync command, so a system with none stays pointed. create-venture and setup use it. Imports nothing in the repository. |
| [`scripts.mjs`](./scripts.mjs) | `naiveScript(name)` finds a script by its file name across the units of `packages/naive/src/`, for code that runs another script as a child process. Imports nothing in the repository. |
| [`action-scope.mjs`](./action-scope.mjs) | One action's scope: `actionScope`, `memo`, `forget`, `inAction` and `actionStats`, values computed once per router call and shared. Imports nothing in the repository. `packages/naive/src/engine/caching.mjs` re-exports it. |

The old path `schema/venture-paths.mjs` re-exports `venture-paths.mjs` for one release, for an installed create-venture that imports it by path.

## Run and test

- `node packages/naive/src/checks/check-provenance.mjs <dir>` checks a venture's provenance chain.
- `node packages/naive/src/interfaces/test.mjs` and `node packages/naive/src/interfaces/context-test.mjs` cover these modules through the router. `node test.mjs` runs both.

## How it connects

- Called by: [`packages/naive/src/router/router.mjs`](../router/router.mjs), the CLI, the checkers in [`schema/`](../engine/README.md), the console bridge and the store kernel.
- Calls: only Node built-ins, and `provenance.mjs` starts `packages/naive/src/router/orchestration/triggers.mjs` as a child process after a write.

## Not built

- This folder is not an npm workspace package yet. It becomes one, with a scoped name, once the workspaces pull request lands and the scope is chosen (open in the rebuild plan).
- The route table moved to [`packages/naive/src/records/routes`](../records/routes/README.md). The modules that ran routes through the router's `call` moved to [`packages/naive/src/router/orchestration/`](../router/orchestration/README.md), so the engine no longer imports the router. No import cycle between units remains (`node scripts/dependency-rules.ts`).
