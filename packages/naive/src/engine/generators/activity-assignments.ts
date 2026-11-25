// Record generator for a venture's activity assignments (EE-172): operations/activity-assignments.json, who performs
// each activity of the activity catalog and whether a person approves it first. A person's decided answer to an
// activity proposal is merged into the file (packages/naive/src/engine/activity-proposals.ts); this drafts the same
// record from the fields given, for a person who writes it by hand. An activity the catalog lacks is refused.
import { join } from "node:path";
import { cli, questions, readJson, repo, schemaOf, validate } from "./generate.ts";
import type { ActivityAssignments, ActivityCatalog } from "../../records/types/records.d.ts";

export const record = "activity-assignments";
export const FILE = "operations/activity-assignments.json";
const CATALOG = "packages/naive/src/functions/activities.json";
export const describe = () => ({ record, ask: questions(schemaOf(record)),
  derived: { activities: "empty unless given; each key is an activity id in the activity catalog" } });

export function draft(a: Partial<ActivityAssignments>, { root = repo }: { root?: string } = {}) {
  const catalog = readJson(join(root, CATALOG)) as ActivityCatalog | null;
  if (!catalog) return { ok: false, record, errors: [`${CATALOG} is missing`] };
  const known = new Set(catalog.activities.map((x) => x.id));
  const rec: ActivityAssignments = { activities: a.activities ?? {} };
  const unknown = Object.keys(rec.activities).filter((id) => !known.has(id));
  if (unknown.length) return { ok: false, record, errors: unknown.map((id) => `the activity catalog has no activity ${id}`) };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
