// The router's write steps as Effects (EE-161, phase 8). A record write checks its schema through RecordValidator
// (records/record-validator.ts), asks the gate through Gate (engine/gate-service.ts, from gate-hooks.ts) and logs
// through Provenance (core/effect/provenance.ts), so a host or a test that provides another service changes what
// every router write does. router.ts keeps its exported shapes: it runs these with runSync at each step.
import { Effect } from "effect";
import { recordProvenance } from "../core/effect/provenance.ts";
import { runSync } from "../core/effect/run.ts";
import type { Entry, RecordInput } from "../core/provenance.ts";
import { RecordValidator } from "../records/record-validator.ts";

/**
 * Checks a record against a schema file through the RecordValidator in scope: null when it passes, else the text a
 * router answer shows (the validator's lines for a failed check, the reason for a checker that could not run).
 */
export const schemaFailureEffect = (schema: string, value: unknown): Effect.Effect<string | null> => Effect.gen(function* () {
  const v = yield* RecordValidator;
  return yield* v.validate(schema, value).pipe(
    Effect.as(null),
    Effect.catchTag("SchemaInvalid", (e) => Effect.succeed(e.errors.join("\n"))),
    Effect.catchTag("CannotRun", (e) => Effect.succeed(e.message)),
  );
});
export const schemaFailure = (schema: string, value: unknown): string | null => runSync(schemaFailureEffect(schema, value));

/** Logs one write through the Provenance service of the process's runtime. */
export const logWrite = (dir: string, input: RecordInput): Entry => runSync(recordProvenance(dir, input));
