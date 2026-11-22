// Naive's tagged errors (EE-125). Every Effect in Naive fails with one of these, so a caller can
// catch by tag (Effect.catchTag) and a CLI can map each to its exit code (see run.ts).
import { Data } from "effect";

const because = (cause: unknown): string => (cause instanceof Error && cause.message ? `: ${cause.message}` : "");

// Each error carries a readable `message`, so code that still catches and prints `e.message` shows the reason.

/** A file could not be read, written, listed or removed. */
export class IoError extends Data.TaggedError("IoError")<{ path: string; op: string; cause: unknown; message: string }> {
  constructor(fields: { path: string; op: string; cause: unknown }) { super({ ...fields, message: `cannot ${fields.op} ${fields.path}${because(fields.cause)}` }); }
}
/** A file was read but its text is not the JSON it should be. */
export class ParseError extends Data.TaggedError("ParseError")<{ path: string; cause: unknown; message: string }> {
  constructor(fields: { path: string; cause: unknown }) { super({ ...fields, message: `${fields.path} is not valid JSON${because(fields.cause)}` }); }
}
/** A record, route or file that should exist does not. */
export class NotFound extends Data.TaggedError("NotFound")<{ what: string; path?: string; message: string }> {
  constructor(fields: { what: string; path?: string }) { super({ ...fields, message: `${fields.what} not found${fields.path ? `: ${fields.path}` : ""}` }); }
}
/** A value failed its JSON Schema; `errors` are the validator's lines. */
export class SchemaInvalid extends Data.TaggedError("SchemaInvalid")<{ schema: string; errors: string[]; message: string }> {
  constructor(fields: { schema: string; errors: string[] }) { super({ ...fields, message: `${fields.schema}: ${fields.errors.join("; ")}` }); }
}
/** The gate, access or a writer rule refused a write. `rule` names it and `hint` says what to do instead. */
export class Refused extends Data.TaggedError("Refused")<{ rule: string; message: string; hint?: string }> {}
/** A check or command cannot run at all (a missing tool, a module that cannot be read). Exit code 2. */
export class CannotRun extends Data.TaggedError("CannotRun")<{ message: string; cause?: unknown }> {}

/**
 * A compare-on-write refused because the item moved since the writer's base (the connector contract,
 * EE-037). `current` is its version now, or null when it is missing; `code` is "version-conflict" for
 * callers that test it. The constructor keeps the contract's (path, base, current).
 */
export class VersionConflict extends Data.TaggedError("VersionConflict")<{ path: string; base: string | null; current: string | null; code: "version-conflict"; message: string }> {
  constructor(path: string, base: string | null, current: string | null) {
    super({ path, base, current, code: "version-conflict", message: `${path} changed since version ${base ?? "(none)"}: it is ${current ?? "missing"} now; read it again and retry` });
  }
}

export type NaiveError = IoError | ParseError | NotFound | SchemaInvalid | Refused | CannotRun | VersionConflict;
