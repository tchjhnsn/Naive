// Record generator for a function's decision matrix (EE-099), packages/naive/src/functions/<id>/decisions.json. A
// class that is a one-way door or never redelegated is drafted as escalate whatever level is asked for, since a
// function's matrix never loosens the venture's decision rights (packages/naive/src/checks/check-functions.ts).
import { cli, describeFrom, personOnly, validate } from "./function-common.ts";

export const record = "function-decisions";
export const describe = () => describeFrom(record, { file: "packages/naive/src/functions/<id>/decisions.json" });

type Row = { class: string, level: "decide" | "recommend" | "escalate", approver?: string, examples: string[] };
export function draft(a: { function?: string, rows?: Row[] }) {
  if (!a.function || !a.rows?.length) return { ok: false, record, errors: ["a decision matrix needs the function id and at least one row"] };
  const strict = personOnly();
  const rows = a.rows.map((r) => (strict.has(r.class) ? { class: r.class, level: "escalate" as const, examples: r.examples } : r));
  const rec = { function: a.function, rows };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: `packages/naive/src/functions/${a.function}/decisions.json`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
