# router

Up: [src](../README.md)

## What this is

The routes' actions, shared by the CLI, the MCP server and the HTTP API (EE-030). Routes follow the Next.js App Router (EE-032). The route table itself is generated in [`packages/naive/src/records/routes`](../records/routes/README.md); renamed routes keep resolving through `route-aliases.json`.

## Where things are

| Path | Holds |
|---|---|
| [`agent-files.ts`](./agent-files.ts) | The agent filesystem (EE-122): `ls`, `read`, `write`, `edit`, `glob` and `grep` over the router, for deep agents. A path is a route with a leading slash, a file is a record as JSON, and every write meets the schema, the gate and provenance, so a gated agent write comes back as a draft. Each operation is a tool span when traces are on. No LangChain import; an app wraps it as a deepagents backend. With `reads_as_of` in the context, every operation reads as of that time ([`reads-as-of.mjs`](./reads-as-of.mjs)); a researcher role must give one. |
| [`acting.mjs`](./acting.mjs) | Who is acting (M-18, like cookies in a Server Action) and access on every read (F-5). It holds the signal projector's identity: `asProjector(args)` makes a call as the agent `projector` and adds a symbol no JSON can carry, so no CLI flag, MCP tool, HTTP body or `MENTURA_ACTOR_ID` can claim it, and the role id `projector` is refused on any call without it. Only router code may call `asProjector` (the signal pull will; not built). |
| [`boundaries.mjs`](./boundaries.mjs) | Error boundaries (Next.js translation P-15, E-5, E-6, E-8). Hosted without a git working copy, a broken `venture.json`'s recovery says restoring it from git is refused. |
| [`brand.mjs`](./brand.mjs) | The brand and asset verbs of the CLI (mentura brand ..., mentura assets ...). |
| [`context.mjs`](./context.mjs) | Context. |
| Blobs | Every write the router records passes its content to provenance, which keeps the bytes under `.naive/blobs/` before appending the line, so `readAsOf` in [`../store/as-of.mjs`](../store/as-of.mjs) can return a record as it was at a time. Writes to other sources and attribute writes pass the content they wrote. |
| [`appends.mjs`](./appends.mjs) | The router's `append` action: one hash-chained line added to a log route (today only `governance/detector-trial/<id>`). The router chains the line onto the log's last line, checks it against the schema, applies the gate, and appends with the version it read, so a line another writer added in between is never skipped; with the caller's `base` it refuses a stale one and returns the current version. Every line is a provenance entry. |
| [`detection-ledger.mjs`](./detection-ledger.mjs) | The detection ledger through the router (signal detection, build item 4): `appendTrial`, `resolveTrial` (refused for an unknown trial, one already resolved, or an outcome its call cannot have, checked and appended as one step), `read`, `verify` (the chain and the shape) and `unresolvedNoCall`. Never resolves on a timeout. Tested by [`detection-ledger-test.ts`](./detection-ledger-test.ts), with parallel writers in separate processes. |
| [`gate-hooks.mjs`](./gate-hooks.mjs) | The router's hooks into the gate group (X-1 to X-6, P-2, P-7, U-4), and `ledgerHook`: with `governance/detectors/gate-confidence.json` in the venture, the gate's confidence call on an agent's write is a trial, accepting its held draft resolves a false alarm, and a person's revert (provenance activity `rollback`) of a passed write resolves a miss. Without the file it does nothing. `ownerOfWrite` applies one writer per file on every write and append, local or remote, before the schema: a record type with `writer: "projection"` in the data model (`competitors/<id>/signals.json`) is written only by the projector, everyone else is refused with the hint to emit a superseding signal, and the projector writes no record a person owns once it exists. The projector's write to a projection record is never held as a draft. |
| [`kit-boundary.mjs`](./kit-boundary.mjs) | The boundary around a kit's agent workflow (S-15). |
| [`orchestration/`](./orchestration/README.md) | The modules that compose routes. |
| [`package-routes.mjs`](./package-routes.mjs) | Package routes, route groups and slot defaults (Next.js translation L-6, P-17, P-36, P-37, and the venture route for P-3). |
| [`reads.mjs`](./reads.mjs) | What a read answers besides the record (Next.js translation L-9, L-10, O-1, O-2, O-3, P-28). |
| [`reads-as-of.mjs`](./reads-as-of.mjs) | The researcher's read clamp (autoresearch build item 7). A `<function>-researcher` role reads only as of its cut, `reads_as_of` on the call (or `MENTURA_READS_AS_OF`); a researcher read with no cut is refused, never served live. Any caller may pass `reads_as_of`. As of a cut, records come from the blob store (`readAsOf`) and lists from `pathsAsOf`, never the live files; a signal observed after the cut is left out; the answer carries `as_of` and nothing computed from the live venture (no metadata, freshness, drafts or stale marks); and only read, view, write, append and template are allowed, because every other action reads the venture live. Writes are not clamped. No agent reads or writes anything under `_eval/`, with or without a cut. The cut is passed by the caller for now: computing the earliest `read_cut` among the researcher's eval plans is a later build item, not built. A log written by append stores no blob, so as of a cut it has no version; the signal library's day index is such a log, and the pull applies the cut when it reads it (not built). |
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

The router and `boundaries.mjs` validate each record before a write in process, with `validateFile` from [`packages/naive/src/records/validate.mjs`](../records/README.md). No write starts a Python process.
