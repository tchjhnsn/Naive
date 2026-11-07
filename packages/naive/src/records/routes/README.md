# routes

Up: [repository](../../../../../AGENTS.md)

## What this is

The route table and the pure helpers that read it. Every route a venture has is generated here from the data model (read through [`packages/naive/src/records`](../README.md)), the layer and package manifests and `packages/naive/src/engine/need-now.json`, never written by hand (EE-030, EE-032). It moved here from `packages/naive/src/router/router.mjs` in the monorepo rebuild so that `schema/` and `knowledge/` can read the route table without importing the router, which imports them. It imports only Node built-ins, [`packages/naive/src/core`](../../core/README.md) and [`packages/naive/src/records`](../README.md).

## Where things are

| Path | Holds |
|---|---|
| [`routes.mjs`](./routes.mjs) | `routes()`, `resolve()`, `glob()`, `files()`, `kits()`, `groups()`, `ventureDir()`, `ventures()`, `gateOf()`, `allowed()`, `repo` and `PHASES`. It declares the command routes the router itself serves, such as `system/traces` (the venture's trace sessions, EE-121) and `system/signals`, `system/signals/replay` and `system/signals/explain` (the signal pull, replay and explain in [`packages/naive/src/router/orchestration/signals.ts`](../../router/orchestration/signals.ts)). A log item route in `APPENDS` (today only `governance/detector-trial/[id]`, the detection ledger) has an `append` action, served by [`packages/naive/src/router/appends.mjs`](../../router/appends.mjs). A record route whose type has `writer: "projection"` or `writer: "person"` in the data model carries `writer`, which the router's gate hooks read to let only the signal projector, or only a person, write it. A route is writable when its type is JSON with a schema, or prose a person owns (`writer: "person"`, form prose or markdown: `operations/research-program/[id]`), and it is a collection item or a concrete file. |
| [`commands.mjs`](./commands.mjs) | The command routes the function modules add (brand, the lint suites, the cache), as data. Each module in `schema/` re-exports its own list. |

A record's template is `<record>.md`, or one whose name starts `<record>-`, in its package's template dir or beside its manifest. A layer manifest keeps no templates beside it since EE-118 step 7, so its templates are looked up in the function modules' `templates/` folders, in the order `packages/naive/src/functions/departments.json` lists the functions.

`defaultWorkspace()` is `MENTURA_WORKSPACE`, else the current directory. The framework never defaults to a folder of its own. A venture's decision rights start from the template's, `packages/naive/template/governance/decision-rights.json`, tightened by the venture's own file. A record type's venture-relative paths come from `venturePaths` in [`packages/naive/src/records`](../README.md).

`packages/naive/src/router/router.mjs` re-exports everything in `routes.mjs`, so code that imports the route table from the router keeps working. New code below the router imports `packages/naive/src/records/routes/routes.mjs`.

## Run and test

- `node packages/naive/src/interfaces/test.mjs` covers the route table through the router, and `node test.mjs` runs it.
- `node scripts/dependency-rules.ts --graph` shows that `packages` imports no other unit.

## How it connects

- Called by: [`packages/naive/src/router/router.mjs`](../../router/router.mjs), and in `schema/` the decision matrix, freshness, staleness, upgrades and the config, team, where-used and docs checks; [`packages/naive/src/store/connectors/catalog.mjs`](../../store/connectors/catalog.mjs); the site's data scripts.
- Calls: [`packages/naive/src/core/action-scope.mjs`](../../core/action-scope.mjs) to build the table once per action, [`packages/naive/src/core/venture-paths.mjs`](../../core/venture-paths.mjs), and [`packages/naive/src/records/index.mjs`](../index.mjs) for the data model.

## Not built

- This folder is not an npm workspace package yet, like `packages/naive/src/core`.
