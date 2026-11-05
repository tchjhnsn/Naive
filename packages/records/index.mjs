// The record types' resolver (monorepo rebuild step 5a-1; design docs/design/MONOREPO_RECORDS_PACKAGE_2026-11-05.md in PR #243).
// Every loader of a framework schema file (`<name>.schema.json`) or of the data model (`data-model.json`)
// asks this module where the file is, so the files can move to packages/records in one later change by
// editing FOLDER here and nothing else. It imports nothing in the repository.
//
//   RECORDS               the absolute folder that holds the record types (today <repo>/schema)
//   schemaFile(name)      "venture" or "venture.schema.json" to the absolute file
//   dataModelFile()       the absolute data-model.json
//   readSchema(name)      the parsed schema, read fresh on each call
//   readDataModel()       the parsed data model, read fresh on each call
//   recordPath(stored)    a stored repository path ("schema/venture.schema.json", as data-model.json and the
//                         manifests name a schema) to the absolute file; a path under another folder
//                         ("platform/research/schemas/claim.schema.json") resolves from the repository root
//   listSchemas()         every schema file name in RECORDS, sorted
//   schemaNameOf(stored)  a stored path to the name schema/validate.py --schema takes
//   recordsIn(root)       the same functions for another copy of the repository, such as a test's temp copy
//                         (the EE_ROOT pattern of schema/check-data-model.mjs)

import { readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The folder, relative to a repository root, that holds the record types. Step 5a-2 makes it packages/records. */
export const FOLDER = "schema";
/** Stored path prefixes that name the record types' folder. Step 5a-2 adds "packages/records/" and keeps
 *  "schema/" for one release, so a venture or a branch that still names schema/x.schema.json resolves. */
export const PREFIXES = Object.freeze(["schema/"]);
export const SUFFIX = ".schema.json";
export const DATA_MODEL = "data-model.json";

/** The repository root this module sits in: packages/records/ is two folders below it. */
export const ROOT = fileURLToPath(new URL("../..", import.meta.url));

/** "venture" or "venture.schema.json" to "venture.schema.json". A path is refused: use recordPath. */
export function schemaName(name) {
  if (typeof name !== "string" || !name) throw new Error("a schema name is a non-empty string, such as venture or venture.schema.json");
  if (name.includes("/") || name.includes("\\")) throw new Error(`${name}: a schema name has no folder; use recordPath for a stored path`);
  return name.endsWith(SUFFIX) ? name : `${name}${SUFFIX}`;
}

/** The stored path with a record-types prefix taken off ("schema/venture.schema.json" to "venture.schema.json"),
 *  or null when it names another folder. */
export function recordRelative(stored) {
  const p = String(stored).replace(/^\.\//, "");
  const prefix = PREFIXES.find((x) => p.startsWith(x));
  return prefix ? p.slice(prefix.length) : null;
}

/** The name schema/validate.py's --schema takes for a stored path: the path with the record-types prefix taken
 *  off ("schema/venture.schema.json" to "venture.schema.json"), or the path unchanged when it names another folder. */
export function schemaNameOf(stored) {
  return recordRelative(stored) ?? String(stored);
}

/**
 * The resolver for the repository at `root`.
 * @param {string} root
 */
export function recordsIn(root) {
  const base = resolve(root);
  const RECORDS = join(base, FOLDER);
  /** @param {string} name */
  const schemaFile = (name) => join(RECORDS, schemaName(name));
  const dataModelFile = () => join(RECORDS, DATA_MODEL);
  /** @param {string} name @returns {any} */
  const readSchema = (name) => JSON.parse(readFileSync(schemaFile(name), "utf8"));
  /** @returns {any} */
  const readDataModel = () => JSON.parse(readFileSync(dataModelFile(), "utf8"));
  /** @param {string} stored */
  const recordPath = (stored) => {
    if (isAbsolute(stored)) return stored;
    const inside = recordRelative(stored);
    return inside === null ? join(base, stored) : join(RECORDS, inside);
  };
  const listSchemas = () => readdirSync(RECORDS).filter((f) => f.endsWith(SUFFIX)).sort();
  return { ROOT: base, RECORDS, schemaFile, dataModelFile, readSchema, readDataModel, recordPath, listSchemas };
}

const here = recordsIn(ROOT);
export const RECORDS = here.RECORDS;
export const { schemaFile, dataModelFile, readSchema, readDataModel, recordPath, listSchemas } = here;
