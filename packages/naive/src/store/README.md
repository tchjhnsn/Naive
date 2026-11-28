# store

Up: [src](../README.md)

## What this is

Where a venture's records are read and written: the connector contract, the filesystem connector Naive ships, the source-of-truth matrix and the catalog (EE-037, EE-042). An app adds its own connectors, such as Mentura's GitHub and Postgres connectors, with `registerConnector`.

## Where things are

| Path | Holds |
|---|---|
| [`connectors/`](./connectors/README.md) | The contract, the filesystem connector, the registry, the resolver and the evals. |
| [`record-write.ts`](./record-write.ts) | The one way code outside the router writes a venture's record. `writeRecord(dir, path, value, { agent, activity, note })` checks the value against the schema of the record type its path belongs to and writes nothing when it fails, writes the file where the venture's layout puts it, and appends the provenance line with the bytes, so an as-of read can return that version. It does not run the gate, the one-writer rule or agent reach: those are the router's. `../checks/check-direct-writes.ts` fails on any other write. |
| [`record-write-test.ts`](./record-write-test.ts) | Tests the writer: a valid record is written and logged, an invalid one is refused with nothing written or logged, a text file is logged without a schema, and each version reads back as of its time. |
| [`as-of.ts`](./as-of.ts) | As-of reads (the autoresearch design in everything-ecosystem, AUTORESEARCH_RECORDS_2026-11-06, build plan item 2). `readAsOf(dir, routeOrPath, t)` returns `{ entity, at, activity, sha256, content }` for a record as it was at transaction time `t` (a Date, an ISO 8601 string or milliseconds): the last provenance line for that path at or before `t`, read from the blob store ([`../core/blobs.ts`](../core/blobs.ts)). It never reads the record's current file, so nothing written after `t` reaches it. `routeOrPath` is a logical path, an address in another source (`<source>://<path>`) or a concrete route the record was written through. Draft lines are skipped, and a move line ends the old path. `pathsAsOf(dir, t)` lists every path `readAsOf` answers for at `t`. |

## As-of reads and older lines

`readAsOf` answers null when the last line at or before `t` has no blob. That is every line written before the blob store existed: nothing backfills them, so a record's versions before then read null (a `baseline` or any new write stores the current version from then on). It is also every line whose caller stored no blob: a log route's append and a publish. Reading a log as of a time by its lines' own times is not built.
