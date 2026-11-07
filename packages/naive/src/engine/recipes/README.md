# recipes

Up: [engine](../README.md)

## What this is

The recipe sandbox: where a venture's recipes run. A recipe is one pure TypeScript module per projected route pattern that makes the record at that pattern from the signals it hears and the facts it names, as of a time. It exports `hears` (the signal type ranges and named fact references it reads), `knobs` (a JSON object of numbers and short lists) and one synchronous default function `(input, knobs) => { record, receptions }`, with exactly one reception per heard signal. This folder is build plan item 4 of the autoresearch design (AUTORESEARCH_RECORDS_2026-11-06 in the design folder of the everything-ecosystem repository, "The recipe" and "The sandbox (Naive)"), an extension of the signal library design (SIGNAL_LIBRARY_2026-11-06 there). The nouns are proposed, not admitted.

Node's docs say `vm` is not a security boundary. This sandbox is layered defence, and no one layer is meant to hold alone:

1. Lint before a run: a size bound (64 KiB by default), types stripped with Node's `module.stripTypeScriptTypes`, no import of any kind (a type-only import is erased with the types), no name that starts with `__naive`, no backslash outside a literal, only the export forms `export const|let|var|function|class|async function`, `export default function`, `export default <expression>` and `export { a, b }`, and no string, template or regular expression literal that holds a subject id or signal address the caller passes. Comments and names are not literals. The lint does not see a literal built at run time (`"ac" + "me"`).
2. One child process per batch: `node --permission` with no file system, child process, worker or addon grant, fetch and WebSocket off, string code generation off, an environment of only `TZ=UTC`, a heap cap, a wall-time kill (SIGKILL) and an output cap. The child's code arrives with `-e`, so it needs no read grant, not even for itself. JSON crosses on stdin and stdout.
3. A fresh `vm` realm per call: an ordinary global object (`vm.constants.DONT_CONTEXTIFY`, so no host object sits behind the global), string and wasm code generation off, microtasks drained inside the call's timeout. A prelude, run as its own script so the recipe cannot shadow what it captured, makes `Date()`, `new Date()`, `Date.now()` and `Math.random()` throw and removes `Intl`, the locale methods, `WeakRef`, `FinalizationRegistry`, `SharedArrayBuffer`, `Atomics`, `WebAssembly`, `console` and `eval`. A date built from a given time still works. Values cross only as strings, and the realm hands back one string, so module state, globals and prototypes cannot carry from one call to the next.
4. The output check: JSON with exactly `record` (an object or null) and `receptions`, each reception an object with a string `signal` and a `kind` of `salient` or `noise`, one per signal in `input.signals` and none for a signal not heard. Schema validation of the record is the caller's job, through the `validateRecord` hook.

The hardening path is QuickJS compiled to wasm behind the same interface (not built).

## Where things are

| Path | Holds |
|---|---|
| [`sandbox.ts`](./sandbox.ts) | The host. `runRecipe(source, input, knobs, opts)` runs one call (`knobs` null runs the recipe's own), `runRecipes(source, calls, opts)` runs a batch in one child, `recipeExports(source, opts)` reads `hears` and `knobs`, `lintRecipe(source, opts)` lists every lint problem, `checkReceptions(input, receptions)` checks coverage. Each answers `{ ok: true, output }` or `{ ok: false, reason }`. Options: `subjects` and `signals` for the lint, `maxSourceBytes`, `callMs` (default 1000), `wallMs` (default 60000), `memoryMb` (default 128), `maxOutputBytes` and `validateRecord`. |
| [`sandbox-child.ts`](./sandbox-child.ts) | The child: reads one job, compiles the prelude and the recipe once, runs each call in a fresh realm, writes one reply. The host strips its types and starts it with `-e`; nothing imports it. |
| [`sandbox-test.ts`](./sandbox-test.ts) | The tests. |
| [`fixtures/signals.recipe.ts`](./fixtures/signals.recipe.ts) | The design's example recipe, `competitors/[id]/signals`, with knobs. |

## Run and test

- `node packages/naive/src/engine/recipes/sandbox-test.ts` renders the example recipe; shows the clock, randomness, `new Function` and `eval`, static and dynamic imports, an endless loop (killed at the wall time, and by the per-call limit, also in a microtask), state between calls, the heap cap, the file system (`require`, `process`) and the environment (`process.env`, `Intl`) each fail closed; checks the lint and the reception coverage; and times 1,000 calls with 40 signals each in one child (about 1.5 to 3 seconds on Node 22.23). `node test.mjs` runs it.

## How it connects

- Called by: nothing yet. The eval sets and scoring (item 5), the router's `onWrite` for recipe routes (item 6) and the signal pull rendering through recipes (item 9) will call it (not built).
- Calls: Node's `node:child_process`, `node:vm` and `node:module` only. It imports nothing in the repository and spawns only `process.execPath`, never a command an environment variable names.
- Records: none. It reads no venture file and writes nothing.

## Not built

- `naive recipes init`, `plan`, `check` and `search`, the eval plans, experiment log and reception files are not built: autoresearch build plan items 5 to 11.
- Record and reception types generated from JSON Schema through `naive typegen` (item 3 adds the schemas); the fixture declares its own types.
- Type stripping needs Node 22.13 or later. On an older Node every recipe fails closed with that reason.
- QuickJS compiled to wasm as a second realm behind the same interface.
