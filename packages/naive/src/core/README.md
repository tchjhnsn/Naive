# core

Up: [repository](../../../../AGENTS.md)

## What this is

The first code package of the monorepo rebuild. It holds the modules every layer needs and that import nothing else in the repository: where a venture's logical files sit, the venture's hash-chained provenance log, the instrumentation of calls, and one action's memo scope. They moved here from the old `schema` and `interface` folders, and now sit in `packages/naive/src/core/` (EE-118 step 5), so that the layers stop importing each other through them. Venture packages, which are records and not code, live in [`packages/naive/library/packages/`](../../library/packages/) (EE-116).

## Where things are

| Path | Holds |
|---|---|
| [`venture-paths.mjs`](./venture-paths.mjs) | Where each logical file of a venture sits in its layout (`ventureFile`, `physical`, `logical`). The layouts are flat, structured (EE-086) and src (EE-118 step 8): in the src layout a package folder sits under the function that owns it (`PACKAGE_FUNCTION`, `srcPath`), so `foundation/problem.json` is at `src/strategy/foundation/problem.json` while its logical path stays the same. It also maps the venture template's old path to `packages/naive/template/governance/` (`templatePath`). Imports nothing in the repository. |
| [`instrumentation.mjs`](./instrumentation.mjs) | Timing and measuring of each call and judgment, for agent vitals, and the venture's trace files (EE-121): `span`, `withSpan`, `currentSpan`, `spans`, `sessions` and `tracing` write and read `traces/<session>.jsonl`, one hash-chained span per line after the OpenTelemetry GenAI conventions, when the venture turns `traces` on in `naive.config.json`. Router calls and judgments become spans too. With traces off, `withSpan` runs its function outside any span, so no provenance line names a span that was never written. Imports `venture-paths.mjs`. |
| [`provenance.mjs`](./provenance.mjs) | The venture's append-only provenance log, `provenance.jsonl`, with its hash chain (EE-031). A line written inside a span names it in `span` (EE-121). A line is read, chained and appended inside a lock file beside the log (`.provenance.jsonl.lock`), so two processes writing at once cannot both chain onto one line. Imports the two above. |
| [`sync.mjs`](./sync.mjs) | Syncing a system of record into a venture (EE-083): `sync(system, dir)` runs the command the app names in `NAIVE_SYNC_<SYSTEM>` (such as `NAIVE_SYNC_RHO`) with `--venture <dir>`, and `syncCommand` and `syncVariable` say which. Naive ships no sync command, so a system with none stays pointed. Hosted, the variable is ignored and every system stays pointed. create-venture and setup use it. Imports `runtime.mjs`. |
| [`runtime.mjs`](./runtime.mjs) | Where Naive runs, and the one place that reads `NAIVE_RUNTIME`. Without it Naive runs as on a laptop and nothing here is consulted. With `NAIVE_RUNTIME=hosted` (`isHosted`), Naive reaches nothing outside the tenant: `envCommand` ignores `NAIVE_JUDGE_CMD` and the other command variables, and the host registers a function at start with `registerHook(name, fn)` for each thing it provides (`judge`, `site`, `trace`, `sandbox`, `git`; `hostHook` reads one). A feature that needs a hook the host did not register throws a `HostedRefusal`, whose message names the feature and why. `git(feature, args, opts)` is `spawnSync("git", ...)` on a laptop; hosted it goes to the host's git working copy, or with none answers the way a missing git does, with the refusal in `error`. Imports nothing in the repository. |
| [`scripts.mjs`](./scripts.mjs) | `naiveScript(name)` finds a script by its file name across the units of `packages/naive/src/`, for code that runs another script as a child process. Imports nothing in the repository. |
| [`action-scope.mjs`](./action-scope.mjs) | One action's scope: `actionScope`, `memo`, `forget`, `inAction` and `actionStats`, values computed once per router call and shared. Imports nothing in the repository. `packages/naive/src/engine/caching.mjs` re-exports it. |

The old path `schema/venture-paths.mjs` re-exports `venture-paths.mjs` for one release, for an installed create-venture that imports it by path.

## Run and test

- `node packages/naive/src/checks/check-provenance.mjs <dir>` checks a venture's provenance chain.
- `node packages/naive/src/checks/check-traces.ts <dir>` checks a venture's trace files and the spans its provenance names.
- `node packages/naive/src/interfaces/test.mjs` and `node packages/naive/src/interfaces/context-test.mjs` cover these modules through the router. `node test.mjs` runs both.

## How it connects

- Called by: [`packages/naive/src/router/router.mjs`](../router/router.mjs), the CLI, the checkers in [`schema/`](../engine/README.md), the console bridge and the store kernel.
- Calls: only Node built-ins, and `provenance.mjs` starts `packages/naive/src/router/orchestration/triggers.mjs` as a child process after a write.

## Not built

- This folder is not an npm workspace package yet. It becomes one, with a scoped name, once the workspaces pull request lands and the scope is chosen (open in the rebuild plan).
- The route table moved to [`packages/naive/src/records/routes`](../records/routes/README.md). The modules that ran routes through the router's `call` moved to [`packages/naive/src/router/orchestration/`](../router/orchestration/README.md), so the engine no longer imports the router. No import cycle between units remains (`node scripts/dependency-rules.ts`).
