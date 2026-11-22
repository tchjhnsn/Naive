// Running Naive's Effects from code that is not Effect yet, and from a CLI (EE-125).
//   - runSync / runPromise give the old plain-value and Promise shapes, providing NodeFs, so a
//     module moved to Effect keeps its existing exports and callers do not change in the same PR;
//   - exitCode maps a failure to Naive's CLI convention: 2 when a check cannot run, else 1;
//   - runMain runs a CLI's Effect, prints a failure in one line and sets process.exitCode.
import { Cause, Effect, Exit } from "effect";
import type { NaiveError } from "./errors.ts";
import { NodeFs } from "./fs.ts";

/** Throws the tagged error itself (not a wrapper), so old try/catch callers see `_tag` and the message. */
const unwrap = <A, E>(exit: Exit.Exit<A, E>): A => {
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  throw failure._tag === "Some" ? failure.value : Cause.squash(exit.cause);
};

export const runSync = <A, E>(effect: Effect.Effect<A, E, "naive/VentureFs">): A => unwrap(Effect.runSyncExit(Effect.provide(effect, NodeFs)));

export const runPromise = async <A, E>(effect: Effect.Effect<A, E, "naive/VentureFs">): Promise<A> => unwrap(await Effect.runPromiseExit(Effect.provide(effect, NodeFs)));

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

export const runMain = async <A>(effect: Effect.Effect<A, NaiveError, "naive/VentureFs">): Promise<A | undefined> => {
  const exit = await Effect.runPromiseExit(Effect.provide(effect, NodeFs));
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  if (failure._tag === "Some") { console.error(describe(failure.value)); process.exitCode = exitCode(failure.value); }
  else { console.error(Cause.pretty(exit.cause)); process.exitCode = 2; }
  return undefined;
};
