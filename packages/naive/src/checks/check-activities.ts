// Checks the activity catalog, packages/naive/src/functions/activities.json (EE-164).
//
//   node packages/naive/src/checks/check-activities.ts [--json]
//
// An activity is a unit of work (APQC level 4) in O*NET task statement form, filed under an APQC level 2 process
// group from the tool catalog and optionally scored on the catalog's scales. It fails when:
//   - the catalog does not match activity-catalog.schema.json (this covers ratings with no rated);
//   - a scale or activity id is listed twice, or two activities in one process group and scope share a statement;
//   - a scale's range does not run from a lower to a higher number;
//   - an activity names a process group that is not in packages/naive/src/functions/tools.json, or a process whose id
//     does not start with its process group's;
//   - a statement is over 30 words, is more than one sentence, or starts with an article or pronoun instead of a verb;
//   - a rating names a scale the catalog does not list, or its value is outside that scale's range;
//   - a scale's source or an activity's source.ref is not an id in any
//     packages/naive/src/records/layers/<layer>/references/references.json.
// --json prints the number of activities per function and process group.
//
// It reads files through VentureFs (EE-125). Findings exit 1; a catalog, tool catalog or references file that cannot
// be read exits 2.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { validateValue } from "../records/validate.ts";
import type { ActivityCatalog } from "../records/types/records.d.ts";

// EE_ROOT points the check at another copy of the repository (used by check-activities-test.ts).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
export const CATALOG = "packages/naive/src/functions/activities.json";
const TOOLS = "packages/naive/src/functions/tools.json";
const LAYERS = "packages/naive/src/records/layers";
const MAX_WORDS = 30;
// A statement starts with its verb, so a first word from this list means the verb is missing.
const NOT_VERBS = new Set(["A", "An", "The", "This", "That", "These", "Those", "It", "We", "They", "Our", "Their", "Each", "Every"]);

type Activity = ActivityCatalog["activities"][number];
/** What the catalog is checked against: each process group's function (from the tool catalog) and every reference id. */
export type Known = { groups: Map<string, string>; references: Set<string> };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown, key: string): Record<string, unknown>[] => (isObject(v) && Array.isArray(v[key]) ? v[key].filter(isObject) : []);
const schemaErrors = (value: unknown): string[] => {
  const v = validateValue("activity-catalog.schema.json", value);
  return v.status === 0 ? [] : (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l));
};
const scopeKey = (a: Activity) => (a.scope.kind === "industry" ? `naics ${a.scope.naics}` : "cross-industry");

/** Every finding for a catalog that already matches its schema. Pure, so the test can call it on copies. */
export function catalogErrors(cat: ActivityCatalog, known: Known): string[] {
  const out: string[] = [];
  const twice = (what: string, xs: string[]) => {
    const seen = new Set<string>();
    for (const x of xs) { if (seen.has(x)) out.push(`${what} ${x} is listed twice`); seen.add(x); }
  };
  twice("scale", cat.scales.map((s) => s.id));
  twice("activity", cat.activities.map((a) => a.id));

  const range = new Map<string, [number, number]>();
  for (const s of cat.scales) {
    const [min, max] = s.range;
    range.set(s.id, [min, max]);
    if (!(min < max)) out.push(`scale ${s.id} has range [${min}, ${max}], whose lowest value is not below its highest`);
    if (!known.references.has(s.source)) out.push(`scale ${s.id} cites ${s.source}, which is not a reference id in ${LAYERS}/<layer>/references/references.json`);
  }

  const statements = new Set<string>();
  for (const a of cat.activities) {
    const at = `activity ${a.id}`;
    if (!known.groups.has(a.process_group)) out.push(`${at} names process group ${a.process_group}, which is not in ${TOOLS}`);
    if (a.process !== undefined && !a.process.startsWith(`${a.process_group}.`)) out.push(`${at} names process ${a.process}, which is not under its process group ${a.process_group}`);

    const words = a.statement.split(/\s+/).filter(Boolean);
    if (words.length > MAX_WORDS) out.push(`${at} statement has ${words.length} words; a task statement has at most ${MAX_WORDS}`);
    if (/[.!?]\s+\S/.test(a.statement)) out.push(`${at} statement is more than one sentence`);
    if (NOT_VERBS.has(words[0])) out.push(`${at} statement starts with "${words[0]}"; a task statement starts with its verb`);
    const key = `${a.process_group} ${scopeKey(a)} ${words.join(" ").toLowerCase()}`;
    if (statements.has(key)) out.push(`${at} repeats a statement already in process group ${a.process_group} (${scopeKey(a)})`);
    statements.add(key);

    if (a.source && !known.references.has(a.source.ref)) out.push(`${at} cites ${a.source.ref}, which is not a reference id in ${LAYERS}/<layer>/references/references.json`);
    for (const [scale, value] of Object.entries(a.ratings ?? {})) {
      const r = range.get(scale);
      if (!r) out.push(`${at} rates ${scale}, which is not a scale in the catalog`);
      else if (value < r[0] || value > r[1]) out.push(`${at} rates ${scale} ${value}, outside the scale's range [${r[0]}, ${r[1]}]`);
    }
  }
  return out;
}

/** The number of activities in each function and each of its process groups, in the tool catalog's order. */
export const coverage = (cat: ActivityCatalog, groups: Map<string, string>) => {
  const count = (g: string) => cat.activities.filter((a) => a.process_group === g).length;
  const fns = [...new Set(groups.values())];
  return fns.map((f) => {
    const gs = [...groups].filter(([, fn]) => fn === f).map(([id]) => ({ id, activities: count(id) }));
    return { function: f, activities: gs.reduce((n, g) => n + g.activities, 0), process_groups: gs };
  });
};

const read = (file: string) => readJson(join(root, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

/** Every reference id in the layers' references files. */
const referenceIds = Effect.gen(function* () {
  const fs = yield* VentureFs;
  const layers = yield* fs.list(join(root, LAYERS)).pipe(Effect.mapError((e) => new CannotRun({ message: `${LAYERS}: ${describe(e)}`, cause: e })));
  const ids = new Set<string>();
  for (const layer of layers.sort()) {
    const file = `${LAYERS}/${layer}/references/references.json`;
    if (!(yield* fs.exists(join(root, file)))) continue;
    for (const r of list(yield* read(file), "references")) if (typeof r.id === "string") ids.add(r.id);
  }
  return ids;
});

/** Reads the catalog and what it refers to, and checks it. */
export const checkActivities = Effect.gen(function* () {
  const raw = yield* read(CATALOG);
  const groups = new Map<string, string>();
  for (const g of list(yield* read(TOOLS), "process_groups")) if (typeof g.id === "string" && typeof g.function === "string") groups.set(g.id, g.function);
  const references = yield* referenceIds;
  const bad = schemaErrors(raw);
  if (bad.length) return { errors: bad.map((e) => `${CATALOG}: ${e}`), catalog: null, groups };
  const catalog = raw as ActivityCatalog;
  return { errors: catalogErrors(catalog, { groups, references }).map((e) => `${CATALOG}: ${e}`), catalog, groups };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const json = process.argv.includes("--json");
  await runMain(Effect.map(checkActivities, ({ errors, catalog, groups }) => {
    if (json && catalog) console.log(JSON.stringify({ ok: !errors.length, errors, coverage: coverage(catalog, groups) }, null, 2));
    if (errors.length) { if (!json) for (const e of errors) console.error(`FAIL  ${e}`); process.exitCode = 1; return; }
    if (json || !catalog) return;
    const used = new Set(catalog.activities.map((a) => a.process_group));
    const rated = catalog.activities.filter((a) => a.ratings).length;
    console.log(`${catalog.activities.length} activities (${rated} rated) in ${used.size} process groups of ${new Set([...used].map((g) => groups.get(g))).size} functions, on ${catalog.scales.length} scales.`);
  }));
}
