// The record types' resolver (monorepo rebuild step 5a-1; design docs/design/MONOREPO_RECORDS_PACKAGE_2026-11-05.md in PR #243).
// Every loader of a framework schema file (`<name>.schema.json`) or of the data model (`data-model.json`)
// asks this module where the file is, so the files can move to packages/naive/src/records in one later change by
// editing FOLDER here and nothing else. It imports nothing in the repository.
//
//   RECORDS               the absolute folder that holds the record types (today <repo>/schema)
//   schemaFile(name)      "venture" or "venture.schema.json" to the absolute file
//   dataModelFile()       the absolute data-model.json
//   readSchema(name)      the parsed schema, read fresh on each call
//   readDataModel()       the parsed data model, read fresh on each call, with the app's additions merged in
//                         (APP_DATA_MODEL below)
//   recordPath(stored)    a stored repository path ("packages/naive/src/records/venture.schema.json", as data-model.json and the
//                         manifests name a schema) to the absolute file; a path under another folder
//                         ("app/schemas/claim.schema.json") resolves from the repository root
//   listSchemas()         every schema file name in RECORDS, sorted
//   schemaNameOf(stored)  a stored path to the name packages/naive/src/records/validate.mjs --schema takes
//   venturePaths(record)  a venture-level record type's paths relative to a venture folder (VENTURE_PREFIX)
//   globRegExp(pattern)   a data-model glob (`*` within a folder, `**/` across folders) as a RegExp
//   pathKind(path, model) the kind of a file at a logical path in a venture: record, log or derived (KINDS), or null
//   recordsIn(root)       the same functions for another copy of the repository, such as a test's temp copy
//                         (the EE_ROOT pattern of packages/naive/src/checks/check-data-model.mjs)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The folder, relative to a repository root, that holds the record types. Step 5a-2 makes it packages/naive/src/records. */
export const FOLDER = "packages/naive/src/records";
/** Stored path prefixes that name the record types' folder. Step 5a-2 adds "packages/naive/src/records/" and keeps
 *  "schema/" for one release, so a venture or a branch that still names schema/x.schema.json resolves. */
export const PREFIXES = Object.freeze(["packages/naive/src/records/", "schema/"]);
export const SUFFIX = ".schema.json";
export const DATA_MODEL = "data-model.json";
/** An app that uses Naive (such as Mentura) adds its own record types here, at the root of the repository being
 *  checked: { "records": [...], "ignore": [...] }, each entry shaped as in data-model.json. readDataModel appends
 *  them, so the app's records are checked like Naive's without Naive's data model naming them. It may add "files"
 *  entries too, each a venture file no record type covers with its kind. */
export const APP_DATA_MODEL = "naive.data-model.json";

/**
 * The data model with an app's additions appended. Only records and ignore entries may be added.
 * @param {any} model
 * @param {any} app
 * @param {string} file where the additions came from, for the error
 */
export function mergeAppDataModel(model, app, file) {
  const extra = Object.keys(app ?? {}).filter((k) => !["records", "ignore", "files", "note"].includes(k));
  if (extra.length || !Array.isArray(app.records ?? []) || !Array.isArray(app.ignore ?? []) || !Array.isArray(app.files ?? [])) {
    throw new Error(`${file}: an app adds only "records", "ignore" and "files" arrays to the data model`);
  }
  return {
    ...model,
    records: [...model.records, ...(app.records ?? [])],
    ignore: [...model.ignore, ...(app.ignore ?? [])],
    files: [...(model.files ?? []), ...(app.files ?? [])],
  };
}

// The prefix a venture-level record's stored paths carry in data-model.json: "instance/**/products/*.json"
// means products/*.json inside any venture folder. The prefix is the name the data model has always used for a
// workspace; it names no folder Naive reads, and code asks venturePaths for the venture-relative paths instead
// of slicing the prefix itself.
export const VENTURE_PREFIX = "instance/**/";

/** A record type's paths relative to a venture folder, in the order data-model.json lists them.
 *  @param {{ paths?: string[] } | null | undefined} record @returns {string[]} */
export function venturePaths(record) {
  return (record?.paths ?? []).filter((p) => p.startsWith(VENTURE_PREFIX)).map((p) => p.slice(VENTURE_PREFIX.length));
}

// A data-model glob as a RegExp over a whole path: `*` matches within one folder, `**/` matches any folders.
/** @param {string} pattern @returns {RegExp} */
export function globRegExp(pattern) {
  return new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*") + "$");
}

/** What a host does with a file when it commits a venture's working copy (hosted working copy design, section 2).
 *  record: written whole through the store. log: append-only, so a commit may only add lines at the end.
 *  derived: a cache Naive rebuilds, which a host may keep or drop. A record type with no kind is a record. */
export const KINDS = Object.freeze(["record", "log", "derived"]);

/** @type {WeakMap<object, { re: RegExp, kind: string, from: string }[]>} */
const kindPatterns = new WeakMap();

// The kind of the file at a logical path in a venture (`provenance.jsonl`, `foundation/problem.json`,
// `.naive/decision-index.json`): the kind of each venture-level record type and each data-model `files` entry
// whose pattern matches it, or null when nothing names the file. A nested venture's files match too, as
// `instance/**/` always has. Throws when the matches disagree, which is a defect in the data model. Pass the
// model a host already holds to skip reading it again; its patterns are compiled once per model object.
/**
 * @param {string} logicalPath
 * @param {any} [model]
 * @returns {"record" | "log" | "derived" | null}
 */
export function pathKind(logicalPath, model = readDataModel()) {
  const p = String(logicalPath).replace(/\\/g, "/").replace(/^\.\//, "");
  if (!p || isAbsolute(p) || p.split("/").includes("..")) throw new Error(`${logicalPath}: a logical path is relative to the venture folder, with no ..`);
  let patterns = kindPatterns.get(model);
  if (!patterns) {
    patterns = [
      ...model.records.flatMap((/** @type {any} */ r) => venturePaths(r).map((v) => ({ re: globRegExp(VENTURE_PREFIX + v), kind: r.kind ?? "record", from: `record type ${r.id}` }))),
      ...(model.files ?? []).map((/** @type {any} */ f) => ({ re: globRegExp(f.path), kind: f.kind, from: `files entry ${f.path}` })),
    ];
    kindPatterns.set(model, patterns);
  }
  const hits = patterns.filter((x) => x.re.test(`instance/${p}`));
  const kinds = [...new Set(hits.map((x) => x.kind))];
  if (kinds.length > 1) throw new Error(`${p}: the data model gives it more than one kind (${hits.map((x) => `${x.kind} from ${x.from}`).join(", ")})`);
  return /** @type {"record" | "log" | "derived" | null} */ (kinds[0] ?? null);
}

/** The repository root this module sits in: packages/naive/src/records/ is two folders below it. */
export const ROOT = fileURLToPath(new URL("../../../..", import.meta.url));

/** "venture" or "venture.schema.json" to "venture.schema.json". A path is refused: use recordPath. */
export function schemaName(name) {
  if (typeof name !== "string" || !name) throw new Error("a schema name is a non-empty string, such as venture or venture.schema.json");
  if (name.includes("/") || name.includes("\\")) throw new Error(`${name}: a schema name has no folder; use recordPath for a stored path`);
  return name.endsWith(SUFFIX) ? name : `${name}${SUFFIX}`;
}

/** The stored path with a record-types prefix taken off ("packages/naive/src/records/venture.schema.json" to "venture.schema.json"),
 *  or null when it names another folder. */
export function recordRelative(stored) {
  const p = String(stored).replace(/^\.\//, "");
  const prefix = PREFIXES.find((x) => p.startsWith(x));
  return prefix ? p.slice(prefix.length) : null;
}

/** The name packages/naive/src/records/validate.mjs's --schema takes for a stored path: the path with the record-types prefix taken
 *  off ("packages/naive/src/records/venture.schema.json" to "venture.schema.json"), or the path unchanged when it names another folder. */
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
  const readDataModel = () => {
    const model = JSON.parse(readFileSync(dataModelFile(), "utf8"));
    const app = join(base, APP_DATA_MODEL);
    return existsSync(app) ? mergeAppDataModel(model, JSON.parse(readFileSync(app, "utf8")), APP_DATA_MODEL) : model;
  };
  /** @param {string} stored */
  const recordPath = (stored) => {
    if (isAbsolute(stored)) return stored;
    const inside = recordRelative(stored);
    return inside === null ? join(base, stored) : join(RECORDS, inside);
  };
  const listSchemas = () => readdirSync(RECORDS).filter((f) => f.endsWith(SUFFIX)).sort();
  /** @param {string} logicalPath @param {any} [model] */
  const kindOf = (logicalPath, model = readDataModel()) => pathKind(logicalPath, model);
  return { ROOT: base, RECORDS, schemaFile, dataModelFile, readSchema, readDataModel, recordPath, listSchemas, pathKind: kindOf };
}

const here = recordsIn(ROOT);
export const RECORDS = here.RECORDS;
export const { schemaFile, dataModelFile, readSchema, readDataModel, recordPath, listSchemas } = here;
