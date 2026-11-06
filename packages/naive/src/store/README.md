# store

Up: [src](../README.md)

## What this is

Where a venture's records are read and written: the connector contract, the filesystem connector Naive ships, the source-of-truth matrix and the catalog (EE-037, EE-042). An app adds its own connectors, such as Mentura's GitHub and Postgres connectors, with `registerConnector`.

## Where things are

| Path | Holds |
|---|---|
| [`connectors/`](./connectors/README.md) | The contract, the filesystem connector, the registry, the resolver and the evals. |
