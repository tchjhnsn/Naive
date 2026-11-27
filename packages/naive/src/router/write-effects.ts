// The router's write steps as Effects (EE-125, EE-161 phase 8). A record write checks its schema through RecordValidator
// (records/record-validator.ts), asks the gate through Gate (engine/gate-service.ts, from gate-hooks.ts), logs through
// Provenance (core/effect/provenance.ts) and reaches a source through its connector with readItem and writeItem, so a
// host or a test that provides another service changes what every router write does. router.ts runs its write path
// as one Effect built from these; schemaFailure and logWrite keep the plain shapes for callers that are not Effect yet.
import { Effect, Predicate } from "effect";
import { recordProvenance } from "../core/effect/provenance.ts";
import { runSync } from "../core/effect/run.ts";
import { type NaiveError, VersionConflict } from "../core/effect/errors.ts";
import type { Entry, RecordInput } from "../core/provenance.ts";
import { RecordValidator } from "../records/record-validator.ts";
import { asNaive } from "../store/connectors/index.ts";
import type { Item, ReadStore, Store } from "./router.ts";

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

/**
 * A connector's failure as a Naive error: a tagged error as it is (the contract's VersionConflict), any other value
 * that carries the contract's code "version-conflict" as a VersionConflict, and anything else as CannotRun with its
 * message (asNaive), so a router answer that quotes the message quotes the connector's words.
 */
const fromConnector = (path: string, base: string | null | undefined) => (e: unknown): NaiveError => {
  const n = asNaive(e);
  if (n._tag !== "CannotRun" || !Predicate.hasProperty(e, "code") || e.code !== "version-conflict") return n;
  return new VersionConflict(path, base ?? null, Predicate.hasProperty(e, "current") && typeof e.current === "string" ? e.current : null);
};

/** Reads one item through a store: the item, or null when it is missing. */
export const readItem = (store: ReadStore, file: string): Effect.Effect<Item | null, NaiveError> =>
  Effect.tryPromise({ try: () => store.read(file), catch: fromConnector(file, undefined) });

/** Writes one item through a store's connector, which decides how it lands (directly, as a pull request, or not at all). */
export const writeItem = (store: Store, file: string, content: string, opts?: Parameters<Store["write"]>[2]): Effect.Effect<Awaited<ReturnType<Store["write"]>>, NaiveError> =>
  Effect.tryPromise({ try: () => store.write(file, content, opts), catch: fromConnector(file, opts?.base) });
