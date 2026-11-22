// Running Naive's Effects from code that is not Effect yet, and from a CLI (EE-125).
//   - runSync / runPromise give the old plain-value and Promise shapes, so a module moved to Effect keeps its
//     existing exports and callers do not change in the same PR;
//   - exitCode maps a failure to Naive's CLI convention: 2 when a check cannot run, else 1;
//   - runMain runs a CLI's Effect, prints a failure in one line and sets process.exitCode.
// All three run through one venture runtime for the process (EE-161), with the default layer (NodeFs). Older
// callers pass absolute paths, so it serves the working directory (".") and is never disposed.
import { Cause, type Effect, Exit, Tracer } from "effect";
import type { NaiveError } from "./errors.ts";
import { ventureRuntime, type VentureServices } from "./runtime.ts";

// Effect's own in-memory tracer: these callers pass absolute paths, so "." is no venture to write spans to.
const runtime = ventureRuntime(".", { tracer: Tracer.nativeTracer });

/** Throws the tagged error itself (not a wrapper), so old try/catch callers see `_tag` and the message. */
const unwrap = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  throw failure._tag === "Some" ? failure.value : Cause.squash(exit.cause);
};

export const runSync = <A, E>(effect: Effect.Effect<A, E, VentureServices>): A => unwrap(runtime.runSyncExit(effect));

export const runPromise = async <A, E>(effect: Effect.Effect<A, E, VentureServices>): Promise<A> => unwrap(await runtime.runPromiseExit(effect));

export const exitCode = (error: NaiveError): 1 | 2 => (error._tag === "CannotRun" ? 2 : 1);

export const describe = (error: NaiveError): string => {
  switch (error._tag) {
    case "IoError": return `cannot ${error.op} ${error.path}`;
    case "ParseError": return `${error.path} is not valid JSON`;
    case "NotFound": return `${error.what} not found${error.path ? `: ${error.path}` : ""}`;
    case "SchemaInvalid": return `${error.schema}: ${error.errors.join("; ")}`;
    case "Refused": return `refused (${error.rule}): ${error.message}${error.hint ? ` ${error.hint}` : ""}`;
    case "CannotRun": return `cannot run: ${error.message}`;
    case "VersionConflict": return error.message;
  }
};

export const runMain = async <A>(effect: Effect.Effect<A, NaiveError, VentureServices>): Promise<A | undefined> => {
  const exit = await runtime.runPromiseExit(effect);
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  if (failure._tag === "Some") { console.error(describe(failure.value)); process.exitCode = exitCode(failure.value); }
  else { console.error(Cause.pretty(exit.cause)); process.exitCode = 2; }
  return undefined;
};
