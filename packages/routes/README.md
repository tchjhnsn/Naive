# routes

Up: [repository](../../AGENTS.md)

## What this is

The route table and the pure helpers that read it. Every route a venture has is generated here from the data model (read through [`packages/records`](../records/README.md)), the layer and package manifests and `schema/need-now.json`, never written by hand (EE-030, EE-032). It moved here from `interface/router.mjs` in the monorepo rebuild so that `schema/` and `knowledge/` can read the route table without importing the router, which imports them. It imports only Node built-ins, [`packages/core`](../core/README.md) and [`packages/records`](../records/README.md).

## Where things are

| Path | Holds |
|---|---|
| [`routes.mjs`](./routes.mjs) | `routes()`, `resolve()`, `glob()`, `files()`, `kits()`, `groups()`, `ventureDir()`, `ventures()`, `gateOf()`, `allowed()`, `repo` and `PHASES`. |
| [`commands.mjs`](./commands.mjs) | The command routes the function modules add (brand, the lint suites, the cache), as data. Each module in `schema/` re-exports its own list. |

`interface/router.mjs` re-exports everything in `routes.mjs`, so code that imports the route table from the router keeps working. New code below `interface/` imports `packages/routes/routes.mjs`.

## Run and test

- `node interface/test.mjs` covers the route table through the router, and `node test.mjs` runs it.
- `node scripts/dependency-rules.ts --graph` shows that `packages` imports no other unit.

## How it connects

- Called by: [`interface/router.mjs`](../../interface/router.mjs), and in `schema/` the decision matrix, freshness, staleness, upgrades and the config, team, where-used and docs checks; [`knowledge/connectors/catalog.mjs`](../../knowledge/connectors/catalog.mjs); the site's data scripts.
- Calls: [`packages/core/action-scope.mjs`](../core/action-scope.mjs) to build the table once per action, [`packages/core/venture-paths.mjs`](../core/venture-paths.mjs), and [`packages/records/index.mjs`](../records/index.mjs) for the data model.

## Not built

- This folder is not an npm workspace package yet, like `packages/core`.
