// Writes task statements from SciNet into packages/naive/src/functions/activities.json as activities (EE-167).
//
//   node scripts/import-scinet.ts <scinet data dir> --release <tag> --date <yyyy-mm-dd>
//     --process-group <id> [--process <id>]
//     [--subfield <name>]... [--category <name>]... [--task <statement>]... [--drop <statement>]... [--root <dir>]
//
// <scinet data dir> is the data folder of a checkout of https://github.com/lukasalthoff/scinet (CC BY 4.0). SciNet's
// files are not kept in this repository. The script reads tasks.csv, task_dimensions.csv and task_ratings.csv and
// takes:
//   - every task of a --subfield whose category is one of --category (every category when none is given);
//   - every --task, a statement of a universal task, word for word;
//   - less every --drop, a statement to leave out, word for word.
// Each becomes one cross-industry activity under --process-group (and --process), with SciNet's statement, a source
// that names SciNet and where the task sits in it, and SciNet's scores on the catalog's scales: regulatory
// restriction, physical deployment and cognitive complexity (task_dimensions.csv), verification (rl_verification) and,
// for a subfield's task, importance, share (pct_researchers) and frequency (task_ratings.csv). A statement with no
// period at its end gets one, and its source says changed. The scores are SciNet's, for the task as researchers
// perform it, and rated.basis says so.
//
// The run replaces the activities under --process-group whose source is SciNet and leaves every other activity as it
// is, so a rerun with the same arguments on the same release writes the same bytes. It refuses a subfield, category,
// task or drop that matches nothing, two statements with one id, and a result that fails
// activity-catalog.schema.json. packages/naive/src/checks/check-activities.ts checks the written file. --root writes
// into another copy of the repository (used by scripts/import-scinet-test.ts).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FILE, format, replaceActivities } from "../packages/naive/src/engine/generators/activity-catalog.ts";
import { slug } from "../packages/naive/src/engine/generators/generate.ts";
import type { ActivityCatalog } from "../packages/naive/src/records/types/records.d.ts";

type Activity = ActivityCatalog["activities"][number];
type Row = Record<string, string>;
const REF = "alamos-althoff-2026-scinet";

/** Parses RFC 4180 CSV with a header row: quoted fields may hold commas, line breaks and doubled quotes. */
function parseCsv(text: string): Row[] {
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  if (!head) return [];
  return body.map((r) => Object.fromEntries(head.map((k, i) => [k, r[i] ?? ""])));
}

const fail = (message: string): never => { console.error(`FAIL  ${message}`); process.exit(1); };
const args = process.argv.slice(2);
const FLAGS = ["--release", "--date", "--process-group", "--process", "--subfield", "--category", "--task", "--drop", "--root"];
const all = (flag: string) => args.flatMap((a, i) => (a === flag && args[i + 1] !== undefined ? [args[i + 1] as string] : []));
const one = (flag: string) => all(flag)[0];
const dir = args.find((a, i) => !a.startsWith("--") && !FLAGS.includes(args[i - 1] ?? ""));
const root = one("--root") ?? new URL("..", import.meta.url).pathname;
const release = one("--release"), date = one("--date"), group = one("--process-group"), proc = one("--process");
const subfields = all("--subfield"), categories = all("--category"), named = all("--task"), drops = all("--drop");
if (!dir || !release || !date || !group || (!subfields.length && !named.length)) {
  console.error("usage: node scripts/import-scinet.ts <scinet data dir> --release <tag> --date <yyyy-mm-dd> --process-group <id> [--process <id>] [--subfield <name>]... [--category <name>]... [--task <statement>]... [--drop <statement>]... [--root <dir>]");
  process.exit(2);
}

const read = (name: string) => parseCsv(readFileSync(join(dir, name), "utf8"));
const tasks = read("tasks.csv");
const key = (r: Row) => [r.task, r.level, r.domain, r.field, r.subfield].join("\u0000");
const dimensions = new Map(read("task_dimensions.csv").map((r) => [key(r), r]));
const ratings = new Map(read("task_ratings.csv").map((r) => [key(r), r]));

for (const s of subfields) if (!tasks.some((t) => t.subfield === s)) fail(`no task in SciNet has the subfield ${JSON.stringify(s)}`);
for (const c of categories) if (!tasks.some((t) => subfields.includes(t.subfield ?? "") && t.category === c)) fail(`no task in the chosen subfields has the category ${JSON.stringify(c)}`);
for (const n of named) if (!tasks.some((t) => t.level === "universal" && t.task === n)) fail(`no universal task in SciNet reads ${JSON.stringify(n)}`);
const picked = tasks.filter((t) =>
  (t.level === "universal" && named.includes(t.task ?? ""))
  || (subfields.includes(t.subfield ?? "") && (!categories.length || categories.includes(t.category ?? ""))));
for (const d of drops) if (!picked.some((t) => t.task === d)) fail(`--drop names a statement that was not picked: ${JSON.stringify(d)}`);
const chosen = picked.filter((t) => !drops.includes(t.task ?? ""));

const number = (v: string | undefined): number | undefined => (v === undefined || v.trim() === "" || Number.isNaN(Number(v)) ? undefined : Number(v));
const defined = <T extends object>(o: T): Partial<T> => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

/** A slug of the statement's first words, cut at a word so it is at most 60 characters. */
const idOf = (statement: string): string => {
  const whole = String(statement).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return whole.length <= 60 ? whole : slug(whole).replace(/-[^-]*$/, "");
};

const activities: Activity[] = chosen.map((t) => {
  const text = (t.task ?? "").trim();
  const statement = /[.]$/.test(text) ? text : `${text}.`;
  const d = dimensions.get(key(t)), r = ratings.get(key(t));
  const scores = defined({
    "regulatory-restriction": number(d?.regulatory_restriction),
    "physical-deployment": number(d?.physical_deployment),
    "cognitive-complexity": number(d?.cognitive_complexity),
    verification: number(d?.rl_verification),
    importance: number(r?.importance),
    share: number(r?.pct_researchers),
    frequency: number(r?.frequency),
  });
  const where = t.level === "universal" ? `universal task, category ${t.category}` : `${[t.domain, t.field, t.subfield].filter(Boolean).join(" > ")}, category ${t.category}`;
  const who = t.level === "universal" ? "researchers in every discipline" : `researchers in ${t.subfield}`;
  return {
    id: idOf(statement),
    process_group: group,
    ...(proc ? { process: proc } : {}),
    statement,
    scope: { kind: "cross-industry" as const },
    source: { ref: REF, locator: `SciNet ${release}, tasks.csv: ${where}`, ...(statement === text ? {} : { changed: true }) },
    ...(Object.keys(scores).length ? {
      ratings: scores,
      rated: { by: `SciNet ${release}`, on: date, basis: `SciNet's scores for the task as ${who} perform it (task_dimensions.csv${r ? ", task_ratings.csv" : ""}). Not rated for a business.` },
    } : {}),
  };
}).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const seen = new Set<string>();
for (const a of activities) { if (seen.has(a.id)) fail(`two statements give the id ${a.id}`); seen.add(a.id); }

const d = replaceActivities(activities, (a) => a.process_group === group && a.source?.ref === REF, { root });
if (!d.ok || !("draft" in d) || !d.draft) {
  for (const e of d.errors) console.error(`FAIL  ${e}`);
  process.exit(1);
}
writeFileSync(join(root, FILE), format(d.draft));
console.log(`wrote ${FILE}: ${activities.length} activities from SciNet ${release} under process group ${group}; the catalog holds ${d.draft.activities.length}`);
