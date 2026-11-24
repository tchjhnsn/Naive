// RecordValidator and record views (EE-161, phase 6). JSON Schema stays canonical for records; Effect code checks
// a record through one service and decodes it through an Effect Schema whose check is Naive's own validator
// (validate.ts) and whose type is the generated type in types/records.d.ts, so there is one source of truth.
// Effect's own JSON Schema import is not used: it rejects the cross-file $ref, if, dependentRequired and contains
// that Naive's schemas use.
//
//   - RecordValidator: a Context.Reference, so an Effect that asks for it needs no layer. Its default checks
//     against Naive's schemas through validateValue, honoring useValidator; RecordValidatorOver(validator) is a
//     layer over another registry, for a host with schemas of its own or a test. validate fails with
//     SchemaInvalid (the validator's lines) or CannotRun (the checker itself failed, so a caller must not
//     record it as a reject);
//   - decodeRecord<T>(schema, value): the value typed as T once it passes;
//   - recordView<T>(schema): an Effect Schema for one record type, built with Schema.declareConstructor, for
//     code that composes schemas. Its issue's message is the validator's lines.
import { Context, Effect, Layer, Schema, SchemaIssue } from "effect";
import { CannotRun, SchemaInvalid } from "../core/effect/errors.ts";
import { type CheckResult, type Json, validateValue, type Validator } from "./validate.ts";

export type RecordValidatorShape = {
  /** Checks `value` against the schema file `schema`, such as "venture.schema.json". */
  readonly validate: (schema: string, value: unknown) => Effect.Effect<void, SchemaInvalid | CannotRun>;
};

const lines = (text: string) => text.split("\n").filter((l) => l.trim());

/** A CheckResult as an Effect: 0 passes, 1 is SchemaInvalid, 2 (or anything else) is CannotRun. */
export const fromCheck = (schema: string, r: CheckResult): Effect.Effect<void, SchemaInvalid | CannotRun> =>
  r.status === 0 ? Effect.void
    : r.status === 1 ? Effect.fail(new SchemaInvalid({ schema, errors: lines(r.stdout) }))
    : Effect.fail(new CannotRun({ message: `cannot validate against ${schema}: ${r.stderr.trim() || "the validator failed"}` }));

const live: RecordValidatorShape = { validate: (schema, value) => Effect.suspend(() => fromCheck(schema, validateValue(schema, value))) };

/** Checks one value with a given Validator, in validateValue's result shape. */
const checkWith = (v: Validator, schema: string, value: unknown): CheckResult => {
  try {
    const s = v.reg.get(schema);
    if (s === undefined) return { status: 2, stdout: "", stderr: `no schema ${schema}\n` };
    const one: Json = JSON.parse(JSON.stringify(value));
    const errs = v.validate(one, s, schema);
    return errs.length ? { status: 1, stdout: `${errs.map((e) => `${e.path}: ${e.message}`).join("\n")}\n`, stderr: "" } : { status: 0, stdout: "valid\n", stderr: "" };
  } catch (e) {
    return { status: 2, stdout: "", stderr: `${e instanceof Error ? e.message : String(e)}\n` };
  }
};

/** The record validator. Its default checks against Naive's schemas, so it needs no layer. */
export const RecordValidator: Context.Reference<RecordValidatorShape> = Context.Reference<RecordValidatorShape>("naive/RecordValidator", { defaultValue: () => live });

/** A record validator over another Validator (another registry of schemas). */
export const RecordValidatorOver = (v: Validator): Layer.Layer<never> =>
  Layer.succeed(RecordValidator, { validate: (schema, value) => Effect.suspend(() => fromCheck(schema, checkWith(v, schema, value))) });

/** Checks `value` against `schema` through the RecordValidator in scope and gives it back typed as T. */
export const decodeRecord = <T>(schema: string, value: unknown): Effect.Effect<T, SchemaInvalid | CannotRun> =>
  Effect.gen(function* () {
    yield* (yield* RecordValidator).validate(schema, value);
    // The validator has just checked value against the JSON Schema that T is generated from.
    return value as T;
  });

/**
 * An Effect Schema for one record type: decoding checks the value with Naive's validator (validateValue, so
 * useValidator applies) and types it as T, the generated type of that schema. A failed check is an InvalidValue
 * issue whose message is the validator's lines; a checker that cannot run is one too, saying so.
 */
export const recordView = <T>(schema: string): Schema.declare<T> =>
  Schema.declareConstructor<T>()([], () => (input) => {
    const r = validateValue(schema, input);
    if (r.status === 0) return Effect.succeed(input as T); // checked just now against the schema T is generated from
    const message = r.status === 1 ? `${schema}: ${lines(r.stdout).join("; ")}` : `cannot validate against ${schema}: ${r.stderr.trim()}`;
    return Effect.fail(new SchemaIssue.InvalidValue({ message }));
  }, { identifier: schema.replace(/\.schema\.json$/, "") });
