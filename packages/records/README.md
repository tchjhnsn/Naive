# records

Up: [repository](../../AGENTS.md)

## What this is

The resolver for the record types: the framework's JSON Schema files (`<name>.schema.json`) and the data model (`data-model.json`). Every piece of code that reads one of them asks this module where it is, instead of building the path from the folder name `schema`. Today the files still sit in [`schema/`](../../schema/README.md). The monorepo rebuild (step 5a; its design, `MONOREPO_RECORDS_PACKAGE_2026-11-05.md`, is in pull request #243) moves them here in a later pull request, and because every loader goes through this module, that move changes the folder here instead of every loader. It imports nothing in the repository, and `node scripts/dependency-rules.ts` fails if it does.

## Where things are

| Path | Holds |
|---|---|
| [`index.mjs`](./index.mjs) | `RECORDS` (the absolute folder that holds the record types, computed from the module's own place), `schemaFile(name)`, `dataModelFile()`, `readSchema(name)`, `readDataModel()`, `recordPath(stored)`, `listSchemas()`, `schemaNameOf(stored)`, `recordsIn(root)`, and `APP_DATA_MODEL` with `mergeAppDataModel`. |

- `schemaFile` and `readSchema` take a name, `venture` or `venture.schema.json`, never a path.
- `recordPath` maps a stored repository path, as the data model and the package manifests name a schema (`schema/venture.schema.json`), to the absolute file. A stored path under another folder, such as an app's `app/schemas/claim.schema.json`, resolves from the repository root. The prefixes it reads are listed in `PREFIXES`, so the move can accept `packages/records/` and keep `schema/` for one release.
- `readDataModel` appends an app's own record types. An app that uses Naive, such as Mentura, keeps its record types out of Naive's data model and lists them in `naive.data-model.json` at the root of the repository being checked: `{ "records": [...], "ignore": [...] }`, each entry shaped as in `data-model.json`. Anything else in that file is refused. Every check that reads the data model then checks the app's records like Naive's. Naive itself has no such file.
- `schemaNameOf` turns a stored path into the name `python3 schema/validate.py --schema` takes.
- `recordsIn(root)` gives the same functions for another copy of the repository, such as a test's temp copy (the `EE_ROOT` pattern of `schema/check-data-model.mjs`).

It is `.mjs`, like [`packages/core`](../core/README.md), because most of its callers are `.mjs` and the published package runs on Node 20, which has no type stripping. Its test is TypeScript.

`schema/validate.py` holds the same mapping in Python (`RECORDS_FOLDER`, `RECORD_PREFIXES`, `record_path`), and the check below fails when the two disagree.

## Run and test

- `node schema/check-record-paths.ts` fails when code outside this module builds a schema or data-model path from the folder name (`join(root, "schema", name)`, a path literal such as `"schema/data-model.json"`, a concatenation, a stored path read by its prefix, or a Python `root / "schema"`), or when `schema/validate.py` disagrees with it. Its allowlist names each exception with a reason.
- `node schema/check-record-paths-test.ts` checks that every schema resolves by name and by stored path and that every schema the data model names exists, and breaks the check on copies.
- `node test.mjs` runs both.

## How it connects

- Called by: the checkers and modules in [`schema/`](../../schema/README.md) that read the data model or a schema, [`interface/router.mjs`](../../interface/router.mjs), [`interface/boundaries.mjs`](../../interface/boundaries.mjs), [`interface/context.mjs`](../../interface/context.mjs), the CLI, [`interface/orchestration/`](../../interface/orchestration/README.md), [`packages/routes`](../routes/README.md), the idea map, the console bridge (through the framework it is pointed at), create-venture and the ontology scripts in `scripts/`.
- Calls: only Node built-ins.

## Not built

- The record types have not moved here yet; that is step 5a-2 in the design.
- This folder is not an npm workspace package yet, like `packages/core`.
