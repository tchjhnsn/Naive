# library

Up: [naive](../README.md)

## What this is

The venture package library (EE-070, EE-071, step 6). A venture package is a folder of records a venture adopts by function, such as foundation, people or money; `catalog.json` lists them.

## Where things are

| Path | Holds |
|---|---|
| [`packages/`](./packages) | One folder per venture package, each with its `package.json`. |

A package may carry `gate_rules`, which the venture's gate imports (unless `naive.config.json` `gate.packages` leaves the package out). The evidence package's `recipe-keeps-held` holds every agent write to `recipes/**` that is kept as a draft, so an agent's kept recipe becomes the tip without going live (autoresearch build plan item 6); only a person's `mentura accept recipes/<pattern>`, with its holdout check, writes it live (item 8).

Data packages hold master data a venture keeps without end, such as customers, investors and money. The competitors package ([`packages/naive/library/packages/competitors/`](./packages/competitors/README.md)) is one: it owns the competitor record types and ships open signal types and listeners in `signals/types/<id>/<version>.signal.json` and its manifest's `listeners` (signal library build item 6).

The it package ([`packages/naive/library/packages/it/`](./packages/it/package.json)) is a data package the it function owns (lead agents build plan item 7): it owns the `connection` record type (`it/connections/<id>.json`, route `it/connections/[id]`) and the capability cluster catalog, and gives the it function its first write routes.

The foundation package lists `packages/naive/src/records/validate.mjs` among its checks: records are validated in JavaScript, with no Python.
