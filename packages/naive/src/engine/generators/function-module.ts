// Record generator for a function module's manifest (EE-099), packages/naive/src/functions/<id>/function.json. The
// manifest is framework data, so a draft is a change to the framework (a pull request), not a venture route. What it
// does not hold (records owned, lead, write reach) is derived; packages/naive/src/checks/check-functions.ts checks it.
import { cli, describeFrom, validate } from "./function-common.ts";

export const record = "function-module";
export const describe = () => describeFrom(record, { file: "packages/naive/src/functions/<id>/function.json" });

export function draft(a: { id?: string, purpose?: string, intake?: string, measures?: string[], clusters?: string[] }) {
  if (!a.id || !a.purpose || !a.intake) return { ok: false, record, errors: ["a function manifest needs the function id, its purpose and its intake workflow"] };
  const rec = { id: a.id, purpose: a.purpose, intake: a.intake, measures: a.measures ?? [], clusters: a.clusters ?? [] };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `packages/naive/src/functions/${a.id}/function.json`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
