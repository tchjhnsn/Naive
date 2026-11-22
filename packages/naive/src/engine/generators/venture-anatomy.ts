// Record generator for the Venture Anatomy Matrix definition (EE-099, EE-157), packages/naive/src/functions/strategy/venture-anatomy.json.
// The definition is framework data, so a draft is a change to the framework (a pull request), not a venture route. It
// keeps the shipped coverage items and standard unless given, and refuses a viewpoint that reads a sub-matrix the
// matrix lacks. packages/naive/src/engine/venture-anatomy.ts checks the record types, owners and coverage.
import { join } from "node:path";
import { cli, describeFrom, validate } from "./function-common.ts";
import { readJson, repo } from "./generate.ts";
import type { VentureAnatomy } from "../../records/types/records.d.ts";

export const record = "venture-anatomy";
const FILE = "packages/naive/src/functions/strategy/venture-anatomy.json";
export const describe = () => describeFrom(record, { file: FILE });

export function draft(a: Partial<VentureAnatomy>) {
  if (!a.submatrices?.length || !a.viewpoints?.length) return { ok: false, record, errors: ["a Venture Anatomy Matrix needs its sub-matrices and at least one viewpoint"] };
  const shipped = readJson(join(repo, FILE)) as VentureAnatomy | null;
  const rec = { version: a.version ?? shipped?.version ?? "0.1.0", ...(a.note ?? shipped?.note ? { note: a.note ?? shipped?.note } : {}),
    ...(a.standard ?? shipped?.standard ? { standard: a.standard ?? shipped?.standard } : {}),
    coverage: a.coverage ?? shipped?.coverage, submatrices: a.submatrices, viewpoints: a.viewpoints };
  const v = validate(record, rec);
  if (!v.ok) return { ok: false, record, file: FILE, draft: rec, errors: v.errors };
  const ids = new Set(a.submatrices.map((s) => s.id));
  const unread = a.viewpoints.flatMap((p) => p.reads.filter((r) => !ids.has(r)).map((r) => `viewpoint ${p.id} reads ${r}, which is not a sub-matrix`));
  return { ok: !unread.length, record, file: FILE, draft: rec, errors: unread };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
