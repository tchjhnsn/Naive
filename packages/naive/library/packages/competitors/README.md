# competitors

Up: [library](../../README.md)

## What this is

The competitors package, a data package (signal library build item 6). It keeps master data for competitors: `competitors/<id>.json`, the person's own record, and `competitors/<id>/signals.json` beside it, what signals say about that competitor, which only the signal projector writes. Torian decided on 2026-11-07 that it is its own package and works without a paid library: its signal types and listeners are open and ship here, and a library such as Mentura's only feeds it more signals of the same types.

The package owns the `competitor` and `competitor-signals` record types. They moved here from the purpose layer's manifest, which the data model allows because the package's `layer` is purpose, and `check-data-model.mjs` holds each type to one owner.

## Where things are

| Path | Holds |
|---|---|
| [`package.json`](./package.json) | The manifest: kind `data`, the two record types and their schemas, the freshness gate and the default `listeners`. |
| [`signals/types/organization/1.0.0.signal.json`](./signals/types/organization/1.0.0.signal.json) | `organization@1`: a name and a domain. Creates the person's master record once, when it is missing, with the first name and domain reported. Fresh for 365 days. |
| [`signals/types/funding-event/1.0.0.signal.json`](./signals/types/funding-event/1.0.0.signal.json) | `funding-event@1`: a round's series, amount and currency. It projects nothing alone and is a part of `competitor-funding`. Fresh for 30 days. |
| [`signals/types/competitor-funding/1.0.0.signal.json`](./signals/types/competitor-funding/1.0.0.signal.json) | `competitor-funding@1`: composes `organization@^1` at `org` and `funding-event@^1` at `round`. Appends one `funding` entry per series and folds `first_seen` (min of time) and `last_seen` (max of time). Fresh for 90 days. |
| [`signals/types/product-launch/1.0.0.signal.json`](./signals/types/product-launch/1.0.0.signal.json) | `product-launch@1`: composes `organization@^1` at `org` and holds a product's name, market and url. Appends one `launches` entry per product name and folds `first_seen` and `last_seen`. Fresh for 60 days. |

Each projection names its `subject_field`: `id` in the master record and `competitor` in the signals record. Each type carries worked `cases`: given signals and the record each projection should hold afterwards, subject included, by the design's fold semantics (append keeps one entry per `unique_by` key in time order, with its value from the earliest standing signal and a `support` of supported or withdrawn; min and max read standing signals only).

The default listeners:

| Listener | Hears | Then |
|---|---|---|
| `name-competitors` | `organization@^1`, rated B2 or better | projects into `competitors/[id]`, creating a master record once |
| `track-competitors` | `competitor-funding@^1` about a known competitor | projects into `competitors/[id]/signals` |
| `track-launches` | `product-launch@^1` about a known competitor | projects into `competitors/[id]/signals` |
| `rival-raised` | `competitor-funding@^1`, rated B2 or better, about a known competitor | proposes the decision `rival-raised`, for 14 days |
| `launch-revalidates-stance` | `product-launch@^1` about a known competitor | revalidates the person's `competitors/[id]` |

A known competitor is a subject in the `competitors` collection. A venture turns a listener off by id with `listeners_off` in `naive.config.json`.

## Run and test

- `node packages/naive/src/checks/competitors-package-test.ts` checks the package holds together: each listener hears a type the package ships, each project listener routes to a projection of that type, each case's signals match the type and its parts, each projection writes a record type the package owns with fields that record's schema has and names its subject field, only the person's master record is written once, and each expected record holds its subject and is valid once each entry names its signal. `node test.mjs` runs it.
- `node packages/naive/src/engine/signals/render-test.ts` renders every case here through the real render (`renderCase` in [`render.ts`](../../../src/engine/signals/render.ts)) to its expected records. The test sits in that folder because only its own files and its front door may import the render.
- `node packages/naive/src/checks/check-data-model.mjs` checks the manifest, its ownership of the two record types and its listeners; `node packages/naive/src/records/validate.mjs` validates the signal types.

## How it connects

- Record types: [`competitor.schema.json`](../../../src/records/competitor.schema.json) and [`competitor-signals.schema.json`](../../../src/records/competitor-signals.schema.json), routes `purpose/competitor` and `purpose/competitor-signals`.
- The upgrade registry, [`packages/naive/src/engine/upgrades.json`](../../../src/engine/upgrades.json), lists the package at 0.1.0 on the stable channel, so `naive upgrade` pins it in every venture as it does the other data packages. The catalog's record graph and order cover core and handoff packages only, so the package is not in [`catalog.json`](../catalog.json), like customers, investors and money.
- The router lets only the signal projector write `competitors/<id>/signals.json` (`writerRule` in [`gate.mjs`](../../../src/engine/gate.mjs)).

## Not built

- Kits' listeners are not built. The signal engine (`engine/signals.ts`), the pull from a library and `naive signals emit` (build item 5) and `check-signals` (item 7) are built: `node packages/naive/src/checks/check-signals.ts` checks these types, their worked cases and listeners.
