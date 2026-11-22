// Record generator for the gate calibration rules (EE-099, EE-157), packages/naive/src/phases/gate-calibration.json.
// The rules are framework data, so a draft is a change to the framework (a pull request), not a venture route. A draft
// takes the rules, count levels, staleness, override policy and problem confirmation and checks them against the
// schema. packages/naive/src/engine/gate-calibration.ts reads the file and refuses a rule naming a cell no anatomy
// schema defines.
import { cli, describeFrom, validate } from "./function-common.ts";
import type { GateCalibration } from "../../records/types/records.d.ts";

export const record = "gate-calibration";
const file = "packages/naive/src/phases/gate-calibration.json";
export const describe = () => describeFrom(record, { file });

export function draft(a: Partial<Omit<GateCalibration, "version">>) {
  if (!a.rules?.length) return { ok: false, record, errors: ["gate calibration needs its rules, each with an id, the cells it reads and a reason"] };
  const rec = { version: "0.1.0", prior: "unvalidated", ...a };
  const v = validate(record, rec);
  return { ok: v.ok, record, file, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
