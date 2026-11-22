// A router answer as a test reads it. The router's answer keeps result unknown, because each route returns its
// own shape; a test knows which routes it calls, so it names the shape it reads once and casts here, at the
// boundary, instead of on every line.
//
//   const { call: routerCall } = await import("../../router/router.ts");
//   const call = typed<{ written: string }>(routerCall);

import type { CallArgs } from "../../router/router.ts";

/** An answer with its result in the shape R, and whatever else the action adds in the shape X. error reads as a
 * string because tests match it against a pattern, where a missing one is "undefined" and fails the match. */
export type Read<R, X = object> = { ok: boolean; error: string; result: R; [k: string]: unknown } & X;

/** Reads one answer as the shape a test expects. */
export const read = <R, X = object>(answer: unknown): Read<R, X> => answer as Read<R, X>;

/** Wraps a call so that every answer reads as the shape a test expects. */
export const typed = <R, X = object>(call: (args: CallArgs) => Promise<unknown>) => async (args: CallArgs): Promise<Read<R, X>> => read<R, X>(await call(args));
