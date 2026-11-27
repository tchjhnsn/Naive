// The one clock (EE-228). Every module reads business time from `now()`: when a record was written, what is due,
// what is stale, what day it is. A simulation sets NAIVE_NOW to the simulated instant, and so does a test that pins
// time, so the whole of Naive agrees on what time it is (docs/design/SIMULATION_2026-11-26.md, step 2).
//
//   now()          the current instant as a Date: NAIVE_NOW when set, else the system clock
//   nowMs()        the same in epoch milliseconds
//   nowIso()       the same as an ISO 8601 string
//   wallClock()    the system clock in epoch milliseconds, never pinned: only for elapsed time, timeouts, lock
//                  staleness against file mtimes and unique names, which must follow real time even in a simulation
//   naiveClock     Effect's Clock service reading now(), so Effect code agrees with everything else
//   withNaiveClock provides naiveClock to an Effect
//
// An unparseable NAIVE_NOW throws instead of falling back to the system clock: a simulation that silently ran on
// the wall clock would write wrong times into its records. Hosted runs (NAIVE_RUNTIME=hosted) ignore NAIVE_NOW,
// because a tenant's real records must carry real times. `node packages/naive/src/checks/check-clock.ts` fails on a
// module that reads the system clock any other way. Imports `runtime.ts` and `effect`.

import { Clock, Effect } from "effect";
import { isHosted } from "./runtime.ts";

/** The system clock in epoch milliseconds. Only for elapsed time, timeouts, lock staleness and unique names. */
export const wallClock = (): number => Date.now();

/** The pinned instant from NAIVE_NOW, or null when time is not pinned. Throws when NAIVE_NOW does not parse. */
export function pinned(): number | null {
  const v = process.env.NAIVE_NOW;
  if (!v || isHosted()) return null;
  const ms = Date.parse(v);
  if (Number.isNaN(ms)) throw new Error(`NAIVE_NOW is not a date and time Naive can read: ${JSON.stringify(v)}. Use ISO 8601, such as 2027-03-01T09:00:00Z.`);
  return ms;
}

/** The current business time in epoch milliseconds. */
export const nowMs = (): number => pinned() ?? wallClock();

/** The current business time. */
export const now = (): Date => new Date(nowMs());

/** The current business time as an ISO 8601 string. */
export const nowIso = (): string => now().toISOString();

// The system's Clock, whose sleep the naive clock borrows, so sleeping still waits in real time.
const system: Clock.Clock = Clock.Clock.defaultValue();

/** Effect's Clock, reading business time. Sleeping still waits in real time. */
export const naiveClock: Clock.Clock = {
  currentTimeMillisUnsafe: () => nowMs(),
  currentTimeMillis: Effect.sync(() => nowMs()),
  currentTimeNanosUnsafe: () => BigInt(nowMs()) * 1_000_000n,
  currentTimeNanos: Effect.sync(() => BigInt(nowMs()) * 1_000_000n),
  monotonicTimeNanosUnsafe: () => process.hrtime.bigint(),
  monotonicTimeNanos: Effect.sync(() => process.hrtime.bigint()),
  sleep: (duration) => system.sleep(duration),
};

/** Runs an Effect with naiveClock as its Clock. */
export const withNaiveClock = <A, E, R>(effect: Effect.Effect<A, E, R>): Effect.Effect<A, E, R> => Effect.provideService(effect, Clock.Clock, naiveClock);
