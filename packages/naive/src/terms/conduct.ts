// Whether a venture record is modeled or run (EE-188). The terms live in terms.ts. Absence of mode is
// unknown and passes. Any other present value is illegal. This is not the loop mode and not people.json mode.

import { run, type Result } from "./engine.ts";
import { modeledVenture, runVenture } from "./terms.ts";

export type ConductJudgment =
  | { verdict: "unknown" }
  | { verdict: "modeled"; result: Result }
  | { verdict: "run"; result: Result }
  | { verdict: "illegal"; value: unknown };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Absence passes as unknown. modeled and run are the two terms. Any other present value is illegal. */
export function judgeConduct(record: unknown): ConductJudgment {
  if (!isRecord(record)) return { verdict: "illegal", value: record };
  if (!Object.hasOwn(record, "mode")) return { verdict: "unknown" };
  const mode = record.mode;
  if (mode === "modeled") return { verdict: "modeled", result: run(modeledVenture, { confirmed: true, modeled: true, run: false }) };
  if (mode === "run") return { verdict: "run", result: run(runVenture, { confirmed: true, modeled: false, run: true }) };
  return { verdict: "illegal", value: mode };
}
