// Running Naive's Effects from code that is not Effect yet, and from a CLI (EE-125).
//   - runSync / runPromise give the old plain-value and Promise shapes, providing NodeFs, so a
//     module moved to Effect keeps its existing exports and callers do not change in the same PR;
//   - exitCode maps a failure to Naive's CLI convention: 2 when a check cannot run, else 1;
//   - runMain runs a CLI's Effect, prints a failure in one line and sets process.exitCode.
// A .mjs file because router and store modules import it and Node does not strip types under node_modules.
import { Cause, Effect, Exit } from "effect";
import { NodeFs } from "./fs.mjs";

/** @typedef {import("./errors.mjs").NaiveError} NaiveError */

/**
 * Throws the tagged error itself (not a wrapper), so old try/catch callers see `_tag` and the message.
 * @template A, E
 * @param {Exit.Exit<A, E>} exit
 * @returns {A}
 */
const unwrap = (exit) => {
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  throw failure._tag === "Some" ? failure.value : Cause.squash(exit.cause);
};

/**
 * @template A, E
 * @param {Effect.Effect<A, E, "naive/VentureFs">} effect
 * @returns {A}
 */
export const runSync = (effect) => unwrap(Effect.runSyncExit(Effect.provide(effect, NodeFs)));

/**
 * @template A, E
 * @param {Effect.Effect<A, E, "naive/VentureFs">} effect
 * @returns {Promise<A>}
 */
export const runPromise = async (effect) => unwrap(await Effect.runPromiseExit(Effect.provide(effect, NodeFs)));

/** @param {NaiveError} error @returns {1 | 2} */
export const exitCode = (error) => (error._tag === "CannotRun" ? 2 : 1);

/** @param {NaiveError} error @returns {string} */
export const describe = (error) => {
  switch (error._tag) {
    case "IoError": return `cannot ${error.op} ${error.path}`;
    case "ParseError": return `${error.path} is not valid JSON`;
    case "NotFound": return `${error.what} not found${error.path ? `: ${error.path}` : ""}`;
    case "SchemaInvalid": return `${error.schema}: ${error.errors.join("; ")}`;
    case "Refused": return `refused (${error.rule}): ${error.message}${error.hint ? ` ${error.hint}` : ""}`;
    case "CannotRun": return `cannot run: ${error.message}`;
  }
};

/**
 * @template A
 * @param {Effect.Effect<A, NaiveError, "naive/VentureFs">} effect
 * @returns {Promise<A | undefined>}
 */
export const runMain = async (effect) => {
  const exit = await Effect.runPromiseExit(Effect.provide(effect, NodeFs));
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  if (failure._tag === "Some") { console.error(describe(failure.value)); process.exitCode = exitCode(failure.value); }
  else { console.error(Cause.pretty(exit.cause)); process.exitCode = 2; }
  return undefined;
};
