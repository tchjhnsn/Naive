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
//   schemaNameOf(stored)  a stored path to the name packages/naive/src/records/validate.ts --schema takes
//   venturePaths(record)  a venture-level record type's paths relative to a venture folder (VENTURE_PREFIX)
//   globRegExp(pattern)   a data-model glob (`*` within a folder, `**/` across folders) as a RegExp
//   pathKind(path, model) the kind of a file at a logical path in a venture: record, log or derived (KINDS), or null
//   recordsIn(root)       the same functions for another copy of the repository, such as a test's temp copy
//                         (the EE_ROOT pattern of packages/naive/src/checks/check-data-model.ts)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DataModel, DataModelKind } from "./types/records.d.ts";

/** What an app's naive.data-model.json may add to the data model. */
export type AppDataModel = { records?: DataModel["records"]; ignore?: DataModel["ignore"]; files?: NonNullable<DataModel["files"]>; note?: string };
/** The part of the data model pathKind reads. */
export type KindModel = Pick<DataModel, "records" | "files">;

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
 * The data model with an app's additions appended. Only records and ignore entries may be added. `file` is where
 * the additions came from, for the error.
 */
export function mergeAppDataModel(model: DataModel, app: AppDataModel, file: string): DataModel {
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

/** A record type's paths relative to a venture folder, in the order data-model.json lists them. */
export function venturePaths(record: { paths?: string[] } | null | undefined): string[] {
  return (record?.paths ?? []).filter((p) => p.startsWith(VENTURE_PREFIX)).map((p) => p.slice(VENTURE_PREFIX.length));
}

// A data-model glob as a RegExp over a whole path: `*` matches within one folder, `**/` matches any folders.
export function globRegExp(pattern: string): RegExp {
  return new RegExp("^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*") + "$");
}

/** What a host does with a file when it commits a venture's working copy (hosted working copy design, section 2).
 *  record: written whole through the store. log: append-only, so a commit may only add lines at the end.
 *  derived: a cache Naive rebuilds, which a host may keep or drop. A record type with no kind is a record. */
export const KINDS: readonly DataModelKind[] = Object.freeze(["record", "log", "derived"]);

const kindPatterns = new WeakMap<object, { re: RegExp; kind: DataModelKind; from: string }[]>();

// The kind of the file at a logical path in a venture (`provenance.jsonl`, `foundation/problem.json`,
// `.naive/decision-index.json`): the kind of each venture-level record type and each data-model `files` entry
// whose pattern matches it, or null when nothing names the file. A nested venture's files match too, as
// `instance/**/` always has. Throws when the matches disagree, which is a defect in the data model. Pass the
// model a host already holds to skip reading it again; its patterns are compiled once per model object.
export function pathKind(logicalPath: string, model: KindModel = readDataModel()): DataModelKind | null {
  const p = String(logicalPath).replace(/\\/g, "/").replace(/^\.\//, "");
  if (!p || isAbsolute(p) || p.split("/").includes("..")) throw new Error(`${logicalPath}: a logical path is relative to the venture folder, with no ..`);
  let patterns = kindPatterns.get(model);
  if (!patterns) {
    patterns = [
      ...model.records.flatMap((r) => venturePaths(r).map((v) => ({ re: globRegExp(VENTURE_PREFIX + v), kind: r.kind ?? "record", from: `record type ${r.id}` }))),
      ...(model.files ?? []).map((f) => ({ re: globRegExp(f.path), kind: f.kind, from: `files entry ${f.path}` })),
    ];
    kindPatterns.set(model, patterns);
  }
  const hits = patterns.filter((x) => x.re.test(`instance/${p}`));
  const kinds = [...new Set(hits.map((x) => x.kind))];
  if (kinds.length > 1) throw new Error(`${p}: the data model gives it more than one kind (${hits.map((x) => `${x.kind} from ${x.from}`).join(", ")})`);
  return kinds[0] ?? null;
}

export type DataCategory = NonNullable<DataModel["records"][number]["data"]>;
export const DATA_CATEGORIES: readonly DataCategory[] = Object.freeze(["master", "reference", "transactional", "derived"]);

/** What a record type's records are to the business: master, reference, transactional or derived, or null when the type names none or is unknown. */
export function dataOf(recordType: string, model: Pick<DataModel, "records"> = readDataModel()): DataCategory | null {
  return model.records.find((r) => r.id === recordType)?.data ?? null;
}

/** The repository root this module sits in: packages/naive/src/records/ is two folders below it. */
export const ROOT = fileURLToPath(new URL("../../../..", import.meta.url));

/** "venture" or "venture.schema.json" to "venture.schema.json". A path is refused: use recordPath. */
export function schemaName(name: string): string {
  if (typeof name !== "string" || !name) throw new Error("a schema name is a non-empty string, such as venture or venture.schema.json");
  if (name.includes("/") || name.includes("\\")) throw new Error(`${name}: a schema name has no folder; use recordPath for a stored path`);
  return name.endsWith(SUFFIX) ? name : `${name}${SUFFIX}`;
}

/** The stored path with a record-types prefix taken off ("packages/naive/src/records/venture.schema.json" to "venture.schema.json"),
 *  or null when it names another folder. */
export function recordRelative(stored: string): string | null {
  const p = String(stored).replace(/^\.\//, "");
  const prefix = PREFIXES.find((x) => p.startsWith(x));
  return prefix ? p.slice(prefix.length) : null;
}

/** The name packages/naive/src/records/validate.ts's --schema takes for a stored path: the path with the record-types prefix taken
 *  off ("packages/naive/src/records/venture.schema.json" to "venture.schema.json"), or the path unchanged when it names another folder. */
export function schemaNameOf(stored: string): string {
  return recordRelative(stored) ?? String(stored);
}

/** The resolver for one copy of the repository: the functions this module exports, bound to that copy. */
export type Records = {
  ROOT: string;
  RECORDS: string;
  schemaFile: (name: string) => string;
  dataModelFile: () => string;
  /** The parsed schema, a JSON Schema document; unknown until the caller narrows it. */
  readSchema: (name: string) => unknown;
  readDataModel: () => DataModel;
  recordPath: (stored: string) => string;
  listSchemas: () => string[];
  pathKind: (logicalPath: string, model?: KindModel) => DataModelKind | null;
};

/** The resolver for the repository at `root`. */
export function recordsIn(root: string): Records {
  const base = resolve(root);
  const RECORDS = join(base, FOLDER);
  const schemaFile = (name: string) => join(RECORDS, schemaName(name));
  const dataModelFile = () => join(RECORDS, DATA_MODEL);
  const readSchema = (name: string): unknown => JSON.parse(readFileSync(schemaFile(name), "utf8"));
  const readDataModel = (): DataModel => {
    const model: DataModel = JSON.parse(readFileSync(dataModelFile(), "utf8"));
    const app = join(base, APP_DATA_MODEL);
    return existsSync(app) ? mergeAppDataModel(model, JSON.parse(readFileSync(app, "utf8")), APP_DATA_MODEL) : model;
  };
  const recordPath = (stored: string) => {
    if (isAbsolute(stored)) return stored;
    const inside = recordRelative(stored);
    return inside === null ? join(base, stored) : join(RECORDS, inside);
  };
  const listSchemas = () => readdirSync(RECORDS).filter((f) => f.endsWith(SUFFIX)).sort();
  const kindOf = (logicalPath: string, model: KindModel = readDataModel()) => pathKind(logicalPath, model);
  return { ROOT: base, RECORDS, schemaFile, dataModelFile, readSchema, readDataModel, recordPath, listSchemas, pathKind: kindOf };
}

const here = recordsIn(ROOT);
export const RECORDS = here.RECORDS;
export const { schemaFile, dataModelFile, readSchema, readDataModel, recordPath, listSchemas } = here;
