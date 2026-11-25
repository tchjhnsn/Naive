// Record generator for the activity catalog (EE-164). The catalog is packages/naive/src/functions/activities.json in
// the framework, so the generator adds one activity to what the file holds now, with an id unique in the file. It is a
// change to the framework (a pull request), not a venture route. packages/naive/src/checks/check-activities.ts checks
// the result across files (process groups, statement form, ratings against the scales, references).
import { join } from "node:path";
import { cli, drop, questions, readJson, repo, schemaOf, slug, validate } from "./generate.ts";
import type { ActivityCatalog } from "../../records/types/records.d.ts";

export const record = "activity-catalog";
export const FILE = "packages/naive/src/functions/activities.json";
type Activity = ActivityCatalog["activities"][number];
export const describe = () => ({ record, ask: questions(schemaOf(record).properties.activities.items, "activities[]."),
  derived: { id: "a slug of the statement unless given; an activity already in the file is refused", scope: "cross-industry unless given" } });

export function draft(a: Partial<Activity>, { root = repo }: { root?: string } = {}) {
  if (!a.statement || !a.process_group) return { ok: false, record, errors: ["an activity needs a statement and the APQC process group it is filed under"] };
  const now = readJson(join(root, FILE)) as ActivityCatalog | null;
  if (!now) return { ok: false, record, errors: [`${FILE} is missing`] };
  const id = slug(a.id ?? a.statement);
  if (now.activities.some((x) => x.id === id)) return { ok: false, record, errors: [`the catalog already has an activity ${id}`] };
  const activity = drop({ id, process_group: a.process_group, process: a.process, statement: a.statement, scope: a.scope ?? { kind: "cross-industry" },
    source: a.source, ratings: a.ratings, rated: a.rated }) as Activity;
  const rec = { ...now, activities: [...now.activities, activity] };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, added: id, errors: v.errors };
}

/** The catalog as the file holds it: the header and scales as written, then one activity per line, so the same activities always give the same bytes. */
export function format(rec: ActivityCatalog): string {
  const { scales, activities, ...header } = rec;
  const head = JSON.stringify(header, null, 2).slice(0, -2);
  const flat = (v: unknown): string =>
    Array.isArray(v) ? `[${v.map(flat).join(", ")}]`
      : typeof v === "object" && v !== null ? `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${flat(x)}`).join(", ")}}`
        : JSON.stringify(v);
  const lines = (xs: unknown[]) => (xs.length ? `[\n${xs.map((x) => `    ${flat(x)}`).join(",\n")}\n  ]` : "[]");
  return `${head},\n  "scales": ${lines(scales)},\n  "activities": ${lines(activities)}\n}\n`;
}

/** Replaces the activities `replaces` picks with `activities`, keeps the rest in place before them, and validates the result. */
export function replaceActivities(activities: Activity[], replaces: (_a: Activity) => boolean, { root = repo }: { root?: string } = {}) {
  const now = readJson(join(root, FILE)) as ActivityCatalog | null;
  if (!now) return { ok: false, record, errors: [`${FILE} is missing`] };
  const kept = now.activities.filter((a) => !replaces(a));
  const rec = { ...now, activities: [...kept, ...activities] };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
