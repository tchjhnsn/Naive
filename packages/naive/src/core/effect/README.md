# core/effect

Up: [core](../README.md)

## What this is

Naive's base for code written with [Effect](https://effect.website) (EE-125). It holds the tagged errors every Effect in Naive fails with, the file system as a service, the venture runtime that builds a venture's services once (EE-161), and the runners that let code that is not Effect yet call code that is. Effect is pinned to one exact version in the root `package.json`. The files are strict TypeScript; the package ships them compiled to `.mjs` (EE-159, EE-160), so an app that imports the old `.mjs` names keeps working.

```mermaid
flowchart LR
  OLD["existing .mjs callers"] -->|runSync / runPromise| PROC["the process's runtime:<br/>ventureRuntime('.')"]
  CLI["a CLI"] -->|runMain: exit 1, or 2 for CannotRun| PROC
  HOST["a test or a host"] -->|"ventureRuntime(dir, { fs })"| RT["a venture's runtime"]
  PROC --> EFF["a module written as Effects"]
  RT --> EFF
  EFF -->|yield* VentureFs| FS{{VentureFs}}
  FS -->|NodeFs, the default| DISK[(node:fs)]
  FS -->|MemoryFs, in tests| MEM[(a Map)]
  EFF -->|fails with| ERR["IoError, ParseError, NotFound,<br/>SchemaInvalid, Refused, CannotRun,<br/>VersionConflict"]
```

The venture runtime is a `ManagedRuntime` over `VentureLayer`. It builds the layer on its first run, keeps the services for every run after, and releases them on `dispose()`. A run after that dies with the defect `ManagedRuntime disposed`.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Unbuilt: ventureRuntime(dir, overrides)
  Unbuilt --> Built: first run builds VentureLayer(dir, overrides)
  Built --> Built: runSync, runPromise, runFork share the services
  Unbuilt --> Disposed: dispose()
  Built --> Disposed: dispose() releases the layer's resources
  Disposed --> Disposed: a run dies, a second dispose() does nothing
```

## Where things are

| Path | Holds |
|---|---|
| [`errors.ts`](./errors.ts) | The tagged errors, each with a readable `message`: `IoError`, `ParseError`, `NotFound`, `SchemaInvalid`, `Refused` (the gate, access or a writer rule), `CannotRun` (exit code 2) and `VersionConflict` (a compare-on-write whose base is stale, built with the connector contract's `(path, base, current)`), and their union `NaiveError`. Catch one with `Effect.catchTag`. |
| [`fs.ts`](./fs.ts) | `VentureFs`, the file system as a service (`exists`, `readText`, `readBytes`, `writeText` of text or bytes, `append`, `createExclusive` for a lock file, `stat`, `link`, `list`, `isDirectory`, `rename`, `remove`); `NodeFs`, its layer over `node:fs`; `MemoryFs` and `memoryFs`, an in-memory one for tests; `readJson` and `writeJson`, which write JSON the way every record is written. |
| [`runtime.ts`](./runtime.ts) | `VentureLayer(dir, overrides?)`, the layer of a venture's services, and `ventureRuntime(dir, overrides?)`, a `ManagedRuntime` built from it (EE-161). `VentureFs` is its only service so far: `NodeFs` unless `overrides.fs` gives another layer, such as `MemoryFs` in a test. `VentureServices` names what a venture's Effects may ask for. Each runtime builds its own layer, so two ventures given their own layers share no service, and disposing one leaves the other running. `dir` names the venture; no service reads under it yet. |
| [`run.ts`](./run.ts) | `runSync` and `runPromise` run through one venture runtime for the process (`ventureRuntime(".")`, never disposed) and throw the tagged error itself, so a module moved to Effect keeps its exports; `runMain` runs a CLI's Effect through it, prints a failure in one line (`describe`) and sets the exit code (`exitCode`). |

## How to write Naive code with Effect

- Use Effect for code that reads or writes files, can fail, runs work at once, or needs a service. Keep pure functions plain: scoring arithmetic, the term engine and signal ids gain nothing from it.
- Fail with a tagged error from `errors.ts`, never a thrown `Error`. Add a new tag there when none fits.
- Ask for `VentureFs` instead of importing `node:fs`, so a test can run on `MemoryFs`.
- When moving an existing module, keep its exported names and shapes (wrap with `runSync` or `runPromise`) and leave its tests unchanged, one unit per pull request.
- Code that serves one venture for a while (a CLI run, a server, a test) builds `ventureRuntime(dir)` once, runs its Effects through it and calls `dispose()` when done. A test passes `{ fs: MemoryFs(...) }` instead of providing a layer to each run.
- Export the Effect behind each moved function too, named after it with the suffix `Effect` (`record` and `recordEffect`, `writeBlob` and `writeBlobEffect`), so code moved later composes the Effects and not the runners.
- Hold a lock, a temporary file or any other resource with `Effect.acquireRelease` inside `Effect.scoped`, so it is released however the work ends. `lockFile` in [`../provenance.ts`](../provenance.ts) is the pattern.

## Run and test

- `node packages/naive/src/core/effect/effect-test.ts` tests the errors, both file systems, the runners and the venture runtime: a runtime on `MemoryFs` reads and writes without touching the disk, a disposed runtime has released its layer and refuses to run, and two ventures' runtimes stay separate. `node test.mjs` runs it.
- `node packages/naive/src/core/provenance-effect-test.ts` tests the provenance and blob Effects on `MemoryFs`.

## How it connects

- Called by: the modules moved to Effect: the checks `check-functions.ts`, `check-connections.ts`, `check-seams.ts` and `check-detectors.ts` in [`checks/`](../../checks/README.md), the store connectors in [`store/connectors/`](../../store/connectors/README.md), and [`../provenance.ts`](../provenance.ts) and [`../blobs.ts`](../blobs.ts).
- Calls: `effect` and Node built-ins only.

## Not built

- The router, the engine and the rest of the checks are not written in Effect yet; each unit moves in its own pull request.
- The venture layer holds `VentureFs` only. The other services in [the design](../../../../../docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md) (`NaiveConfig`, `HostRuntime`, `Judge`, `NaiveTracer`, `RecordValidator`, `Connectors`, `Provenance`, `Gate`, `Clock`, `WorkflowEngine`) are not built, and the CLIs, the MCP server and the local API do not boot a venture runtime of their own yet (the code among them written as Effects runs through the process's runtime in `run.ts`).
