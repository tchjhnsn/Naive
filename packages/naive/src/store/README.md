# store

Up: [src](../README.md)

## What this is

Where a venture's records are read and written: the connector contract, the filesystem connector Naive ships, the source-of-truth matrix and the catalog (EE-037, EE-042). An app adds its own connectors, such as Mentura's GitHub and Postgres connectors, with `registerConnector`.

## Where things are

| Path | Holds |
|---|---|
| [`connectors/`](./connectors/README.md) | The contract, the filesystem connector, the registry, the resolver and the evals. |
| [`as-of.mjs`](./as-of.mjs) | As-of reads (the autoresearch design in everything-ecosystem, AUTORESEARCH_RECORDS_2026-11-06, build plan item 2). `readAsOf(dir, routeOrPath, t)` returns `{ entity, at, activity, sha256, content }` for a record as it was at transaction time `t` (a Date, an ISO 8601 string or milliseconds): the last provenance line for that path at or before `t`, read from the blob store ([`../core/blobs.mjs`](../core/blobs.mjs)). It never reads the record's current file, so nothing written after `t` reaches it. `routeOrPath` is a logical path, an address in another source (`<source>://<path>`) or a concrete route the record was written through. Draft lines are skipped, and a move line ends the old path. `pathsAsOf(dir, t)` lists every path `readAsOf` answers for at `t`. |
| [`as-of-test.ts`](./as-of-test.ts) | Writes a record through the router at known times and reads it as of each, before the first, after a move and with a blob missing or damaged. |

## As-of reads and older lines

`readAsOf` answers null when the last line at or before `t` has no blob. That is every line written before the blob store existed: nothing backfills them, so a record's versions before then read null (a `baseline` or any new write stores the current version from then on). It is also every line whose caller stored no blob: a log route's append and a publish. Reading a log as of a time by its lines' own times is not built.
