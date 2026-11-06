# records

Up: [repository](../../../../AGENTS.md)

## What this is

The resolver for the record types: the framework's JSON Schema files (`<name>.schema.json`) and the data model (`data-model.json`). Every piece of code that reads one of them asks this module where it is, instead of building the path from the folder name `schema`. Today the files still sit in [`schema/`](../engine/README.md). The monorepo rebuild (step 5a; its design, `MONOREPO_RECORDS_PACKAGE_2026-11-05.md`, is in pull request #243) moves them here in a later pull request, and because every loader goes through this module, that move changes the folder here instead of every loader. It imports nothing in the repository, and `node scripts/dependency-rules.ts` fails if it does.

## Where things are

| Path | Holds |
|---|---|
| [`index.mjs`](./index.mjs) | `RECORDS` (the absolute folder that holds the record types, computed from the module's own place), `schemaFile(name)`, `dataModelFile()`, `readSchema(name)`, `readDataModel()`, `recordPath(stored)`, `listSchemas()`, `schemaNameOf(stored)`, `venturePaths(record)`, `recordsIn(root)`, and `APP_DATA_MODEL` with `mergeAppDataModel`. |
| [`layers/`](./layers/) | Each layer's manifest (`layers/<layer>/layer.json`), its tooling list (`tooling/integrations.json`) and its references (`references/references.json`). They moved here from the layer folders at the repository root in EE-118 step 7, when the skills and templates went to the function modules in [`../functions/`](../functions/README.md). `layer.json` beside this README is the system layer's manifest. |

- `venture.schema.json` names three layouts: flat, structured (EE-086) and src (EE-118 step 8, package folders under `src/<function>/` beside `public/`). `types/records.d.ts` is generated from the schemas.
- `schemaFile` and `readSchema` take a name, `venture` or `venture.schema.json`, never a path.
- `recordPath` maps a stored repository path, as the data model and the package manifests name a schema (`packages/naive/src/records/venture.schema.json`), to the absolute file. A stored path under another folder, such as an app's `app/schemas/claim.schema.json`, resolves from the repository root. The prefixes it reads are listed in `PREFIXES`, so the move can accept `packages/naive/src/records/` and keep `schema/` for one release.
- `venturePaths(record)` gives a venture-level record type's paths relative to a venture folder. In `data-model.json` those paths carry the prefix `VENTURE_PREFIX` (`instance/**/`), the name the data model has always used for a workspace. It names no folder Naive reads, so code asks `venturePaths` instead of slicing the prefix.
- `readDataModel` appends an app's own record types. An app that uses Naive, such as Mentura, keeps its record types out of Naive's data model and lists them in `naive.data-model.json` at the root of the repository being checked: `{ "records": [...], "ignore": [...] }`, each entry shaped as in `data-model.json`. Anything else in that file is refused. Every check that reads the data model then checks the app's records like Naive's. Naive itself has no such file.
- `schemaNameOf` turns a stored path into the name `python3 packages/naive/src/records/validate.py --schema` takes.
- `recordsIn(root)` gives the same functions for another copy of the repository, such as a test's temp copy (the `EE_ROOT` pattern of `packages/naive/src/checks/check-data-model.mjs`).

It is `.mjs`, like [`packages/naive/src/core`](../core/README.md), because most of its callers are `.mjs` and the published package runs on Node 20, which has no type stripping. Its test is TypeScript.

`packages/naive/src/records/validate.py` holds the same mapping in Python (`RECORDS_FOLDER`, `RECORD_PREFIXES`, `record_path`), and the check below fails when the two disagree.

## Run and test

- `node packages/naive/src/checks/check-record-paths.ts` fails when code outside this module builds a schema or data-model path from the folder name (`join(root, "schema", name)`, a path literal such as `"packages/naive/src/records/data-model.json"`, a concatenation, a stored path read by its prefix, or a Python `root / "schema"`), or when `packages/naive/src/records/validate.py` disagrees with it. Its allowlist names each exception with a reason.
- `node packages/naive/src/checks/check-record-paths-test.ts` checks that every schema resolves by name and by stored path and that every schema the data model names exists, and breaks the check on copies.
- `node test.mjs` runs both.

## How it connects

- Called by: the checkers and modules in [`schema/`](../engine/README.md) that read the data model or a schema, [`packages/naive/src/router/router.mjs`](../router/router.mjs), [`packages/naive/src/router/boundaries.mjs`](../router/boundaries.mjs), [`packages/naive/src/router/context.mjs`](../router/context.mjs), the CLI, [`packages/naive/src/router/orchestration/`](../router/orchestration/README.md), [`packages/naive/src/records/routes`](routes/README.md), the idea map, the console bridge (through the framework it is pointed at), create-venture and the ontology scripts in `scripts/`.
- Calls: only Node built-ins.

## Not built

- The record types have not moved here yet; that is step 5a-2 in the design.
- This folder is not an npm workspace package yet, like `packages/naive/src/core`.
