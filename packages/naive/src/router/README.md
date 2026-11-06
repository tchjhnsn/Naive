# router

Up: [src](../README.md)

## What this is

The routes' actions, shared by the CLI, the MCP server and the HTTP API (EE-030). Routes follow the Next.js App Router (EE-032). The route table itself is generated in [`packages/naive/src/records/routes`](../records/routes/README.md); renamed routes keep resolving through `route-aliases.json`.

## Where things are

| Path | Holds |
|---|---|
| [`agent-files.ts`](./agent-files.ts) | The agent filesystem (EE-122): `ls`, `read`, `write`, `edit`, `glob` and `grep` over the router, for deep agents. A path is a route with a leading slash, a file is a record as JSON, and every write meets the schema, the gate and provenance, so a gated agent write comes back as a draft. Each operation is a tool span when traces are on. No LangChain import; an app wraps it as a deepagents backend. |
| [`acting.mjs`](./acting.mjs) | Who is acting (M-18, like cookies in a Server Action) and access on every read (F-5). |
| [`boundaries.mjs`](./boundaries.mjs) | Error boundaries (Next.js translation P-15, E-5, E-6, E-8). |
| [`brand.mjs`](./brand.mjs) | The brand and asset verbs of the CLI (mentura brand ..., mentura assets ...). |
| [`context.mjs`](./context.mjs) | Context. |
| [`gate-hooks.mjs`](./gate-hooks.mjs) | The router's hooks into the gate group (X-1 to X-6, P-2, P-7, U-4). |
| [`kit-boundary.mjs`](./kit-boundary.mjs) | The boundary around a kit's agent workflow (S-15). |
| [`orchestration/`](./orchestration/README.md) | The modules that compose routes. |
| [`package-routes.mjs`](./package-routes.mjs) | Package routes, route groups and slot defaults (Next.js translation L-6, P-17, P-36, P-37, and the venture route for P-3). |
| [`reads.mjs`](./reads.mjs) | What a read answers besides the record (Next.js translation L-9, L-10, O-1, O-2, O-3, P-28). |
| [`route-aliases.json`](./route-aliases.json) | Renamed routes and where they went, so old routes keep resolving. |
| [`router.mjs`](./router.mjs) | The routes' actions, shared by the CLI, the MCP server and the HTTP API (EE-030, EE-032). |
| [`vitals.mjs`](./vitals.mjs) | Agent vitals (N-6). |
| [`writes-test.mjs`](./writes-test.mjs) | Tests for the writes group of the Next.js translation (M-3, M-9, M-17, E-5, E-6, E-8, P-3, P-15, P-17, P-22, P-28, P-32, P-36, P-37, L-6, L-9, L-10, O-1, O-2, O-3) on a venture made in a temp folder. |
| [`writes.mjs`](./writes.mjs) | What a write answers, what a layout offers, and the wrapper the router puts around every call (Next.js translation M-3, M-9, M-17; it also wires in packages/naive/src/router/reads.mjs, packages/naive/src/router/boundarie |

## Run and test

- `node packages/naive/src/interfaces/test.mjs` tests the routes.
- `node packages/naive/src/router/writes-test.mjs` tests what a write answers.

## How it connects

- Called by: [`interfaces`](../interfaces/README.md).
- Calls: [`checks`](../checks/README.md), [`engine`](../engine/README.md), [`store`](../store/README.md), [`records`](../records/README.md).
