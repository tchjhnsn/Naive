# signals

Up: [engine](../README.md)

## What this is

The pure signal render: build plan item 3 of the signal library design (SIGNAL_LIBRARY_2026-11-06 in the design folder of the everything-ecosystem repository, "Noise belongs to the pair, not the signal" and "Derivation, deterministic and replayable"). It turns signals into records with no model, no I/O and no clock: every input is an argument, `now` included, and only edge listeners read `now`. The nouns are proposed, not admitted.

This folder is private. Only its own files and its front door, the signal engine [`engine/signals.ts`](../signals.ts) beside it (build item 5), may import it. `scripts/dependency-rules.ts` fails on any other import, so pull, explain and replay all go through one module.

## Where things are

| Path | Holds |
|---|---|
| [`render.ts`](./render.ts) | The render. `viewsOf(signal, types)` gives the whole view of a signal and one view per composed part (with the part type's id, version and props), so a listener for a part type hears every composite that has that part; a retraction has no view. `receive(view, listener, facts, now, type)` checks the rating bounds, the producer prefixes, the age (edge listeners only: the listener's `max_age`, else the type's `freshness.max_age`) and then every predicate, and gives `salient` (with the facts it read, for `derived_from`) or `noise` (with every failure). Operands are literals, `{ "read": "file#field" }` from `facts.read`, or `{ "ids": "competitors" }` from `facts.ids`; a fact not given fails its predicate. `withdraw(signals)` takes out signals that a retraction or a supersession from the same producer, or from a person in the local library (library `local`), withdraws; any other is refused, and withdrawing a correction restores what it corrected. `fold(reducer, contributions)` folds one field in (time, id) order: set, first, max, min and union over standing signals; append one entry per `unique_by` key over every signal, naming its signal and whether it is `supported` or `withdrawn`. `render(input)` evaluates level listeners, folds their salient views into records (with the projection's `subject_field`), feeds the rendered ids back into the next round until the routes stop changing, and raises after five rounds; then evaluates edge listeners once over standing views for proposals (`<decision>-<subject>`) and stale marks. Signals are sorted first, so the order they arrive in never matters. `diff(rendered, current, proposals, existing)` says new, changed, unchanged (verify, do not rewrite) or kept (a record a projection writes once and a person now owns), and drops proposals whose id exists. `renderCase(type, types, case)` renders a type's worked case through the type's own projections. |
| [`render-test.ts`](./render-test.ts) | The tests. |

## Run and test

- `node packages/naive/src/engine/signals/render-test.ts` renders every worked case of the example signal types in `packages/naive/src/records/examples/signals/library/types/` to its expected records, and tests views, receive (salient at one listener and noise at another for the same signal), withdrawal, each reducer, the fixpoint (three rounds when a master record admits its signals), the raise after five rounds for a criterion that is not monotone, proposals and marks, determinism, the diff (a diff after its own commit writes nothing), and that `render.ts` reads no file, clock or randomness. `node test.mjs` runs it.
- `node scripts/dependency-rules-test.ts` shows that an import of this folder from anywhere else fails.

## How it connects

- Called by: the signal engine [`engine/signals.ts`](../signals.ts), which re-exports `render`, `diff`, `fill` and `withdraw` and uses `receive`, `viewsOf` and `hears` for explain. Pull, explain and replay in [`router/orchestration/signals.ts`](../../router/orchestration/signals.ts) reach it only through that front door.
- Calls: [`core/signal-id.ts`](../../core/signal-id.ts) for canonical JSON and the signal address, and the record types in [`records/types/records.d.ts`](../../records/types/records.d.ts).
- Records: none. It reads and writes nothing; the caller passes signals, types, listeners, facts and current records, and commits what the diff says.

## Not built

- The `competitors` package (item 6), `check-signals` (item 7) and kits' listeners (item 13). Pull, routes and the CLI (item 5) and the projector-only rule (item 4) are built.
