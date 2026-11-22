// Naive's tagged errors (EE-125). Every Effect in Naive fails with one of these, so a caller can
// catch by tag (Effect.catchTag) and a CLI can map each to its exit code (see run.mjs).
// A .mjs file because router and store modules import it and Node does not strip types under node_modules.
import { Data } from "effect";

/**
 * @template {string} Tag
 * @template {object} Fields
 * @typedef {new (fields: Fields) => import("effect/Cause").YieldableError & { readonly _tag: Tag } & Readonly<Fields>} Tagged
 */

/** A file could not be read, written, listed or removed. */
export class IoError extends /** @type {Tagged<"IoError", { path: string, op: string, cause: unknown }>} */ (Data.TaggedError("IoError")) {}
/** A file was read but its text is not the JSON it should be. */
export class ParseError extends /** @type {Tagged<"ParseError", { path: string, cause: unknown }>} */ (Data.TaggedError("ParseError")) {}
/** A record, route or file that should exist does not. */
export class NotFound extends /** @type {Tagged<"NotFound", { what: string, path?: string }>} */ (Data.TaggedError("NotFound")) {}
/** A value failed its JSON Schema; `errors` are the validator's lines. */
export class SchemaInvalid extends /** @type {Tagged<"SchemaInvalid", { schema: string, errors: string[] }>} */ (Data.TaggedError("SchemaInvalid")) {}
/** The gate, access or a writer rule refused a write. `rule` names it and `hint` says what to do instead. */
export class Refused extends /** @type {Tagged<"Refused", { rule: string, message: string, hint?: string }>} */ (Data.TaggedError("Refused")) {}
/** A check or command cannot run at all (a missing tool, a module that cannot be read). Exit code 2. */
export class CannotRun extends /** @type {Tagged<"CannotRun", { message: string, cause?: unknown }>} */ (Data.TaggedError("CannotRun")) {}

/**
 * A compare-on-write refused because the item moved since the writer's base (the connector contract,
 * EE-037). `current` is its version now, or null when it is missing; `code` is "version-conflict" for
 * callers that test it. The constructor keeps the contract's (path, base, current).
 */
export class VersionConflict extends /** @type {Tagged<"VersionConflict", { path: string, base: string | null, current: string | null, code: "version-conflict", message: string }>} */ (Data.TaggedError("VersionConflict")) {
  /** @param {string} path @param {string | null} base @param {string | null} current */
  constructor(path, base, current) {
    super({ path, base, current, code: "version-conflict", message: `${path} changed since version ${base ?? "(none)"}: it is ${current ?? "missing"} now; read it again and retry` });
  }
}

/** @typedef {IoError | ParseError | NotFound | SchemaInvalid | Refused | CannotRun | VersionConflict} NaiveError */
