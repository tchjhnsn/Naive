// Reports which elements of APQC's Process Classification Framework (packages/naive/src/functions/pcf.json) the 13
// function modules cover, and which they do not, so the gap is visible (EE-226).
//
//   node packages/naive/src/checks/check-pcf-coverage.ts [--json] [--gaps] [--complete] [--function <id>]
//
// An element is covered by the module of the function whose APQC category holds it (departments.json `apqc.id`):
//   - a category (level 1) when the module has an agent.md and at least one workflow;
//   - a process group (level 2) when a skill in the module (skills/<id>/SKILL.md) names it as `process_group` in its
//     frontmatter;
//   - a process (level 3) when a workflow in the module names it as `process`;
//   - an activity (level 4) when a step of a workflow in the module names it as `activity`.
// A task (level 5) is never a step of its own: it is reported as under a covered activity when its activity is
// covered, and is not counted as covered by itself.
//
// It fails (exit 1) on structure, whatever the coverage: a workflow whose `process` is not a level 3 element of
// its function's category, a skill whose `process_group` is not a level 2 element of its function's category, a
// step in a workflow with a `process` whose activity sits under another process, and two workflows of one module
// naming the same process. With --complete it also fails on every category, process group, process or activity no
// module covers. Without it, a gap is reported and never fails.
// --gaps lists each uncovered element by hierarchy id and APQC name; --json prints the counts per level and per
// category, the gaps and the errors; --function narrows the report (not the errors) to one function.
//
// It reads files through VentureFs (EE-125). pcf.json or departments.json that cannot be read exits 2.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import type { Pcf } from "../records/types/records.d.ts";

// EE_ROOT points the check at another copy of the repository (used by check-pcf-coverage-test.ts).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
const FUNCTIONS = "packages/naive/src/functions";
const PCF = `${FUNCTIONS}/pcf.json`;
const DEPARTMENTS = `${FUNCTIONS}/departments.json`;
export const LEVELS = ["categories", "process groups", "processes", "activities", "tasks"] as const;

type Element = Pcf["elements"][number];
type Step = { id?: unknown; activity?: unknown };
type Workflow = { id?: unknown; process?: unknown; steps?: Step[] };
/** One function's module as coverage reads it. */
export type Module = { fn: string; category: string; agent: boolean; workflows: { file: string; flow: Workflow }[]; skills: { id: string; processGroup: string | null }[] };
export type Coverage = {
  errors: string[];
  levels: Record<(typeof LEVELS)[number], { total: number; covered: number }>;
  tasksUnderCoveredActivity: number;
  categories: { id: string; name: string; function: string | null; levels: Record<(typeof LEVELS)[number], { total: number; covered: number }> }[];
  gaps: { id: string; level: number; name: string; function: string | null }[];
};

const categoryOf = (id: string): string => `${id.split(".")[0]}.0`;
const isUnder = (id: string, parent: string): boolean => (/\.0$/.test(parent) ? categoryOf(id) === parent : id.startsWith(`${parent}.`));
/** The level 3 process an activity or task sits under. */
const processOf = (id: string): string => id.split(".").slice(0, 3).join(".");
const empty = () => Object.fromEntries(LEVELS.map((l) => [l, { total: 0, covered: 0 }])) as Coverage["levels"];

/** The `process_group` a SKILL.md's frontmatter names, or null. */
export const processGroupOf = (text: string): string | null => {
  const front = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  const m = /^process_group:\s*["']?([0-9.]+)["']?\s*$/m.exec(front);
  return m ? m[1] : null;
};

/** Coverage of the PCF by the modules. Pure. */
export function coverage(pcf: Pcf, modules: Module[]): Coverage {
  const errors: string[] = [];
  const byId = new Map<string, Element>(pcf.elements.map((e) => [e.id, e]));
  const moduleOf = new Map(modules.map((m) => [m.category, m]));
  const covered = new Set<string>();
  for (const m of modules) {
    const rel = (f: string) => `${FUNCTIONS}/${m.fn}/${f}`;
    if (m.agent && m.workflows.length) covered.add(m.category);
    for (const s of m.skills) {
      if (s.processGroup === null) continue;
      const e = byId.get(s.processGroup);
      if (!e || e.level !== 2 || !isUnder(s.processGroup, m.category)) errors.push(`${rel(`skills/${s.id}/SKILL.md`)}: process_group ${s.processGroup} is not a level 2 element of ${m.category} in pcf.json`);
      else covered.add(s.processGroup);
    }
    const seen = new Map<string, string>();
    for (const { file, flow } of m.workflows) {
      const process = typeof flow.process === "string" ? flow.process : null;
      if (process !== null) {
        const e = byId.get(process);
        if (!e || e.level !== 3 || !isUnder(process, m.category)) errors.push(`${rel(file)}: process ${process} is not a level 3 element of ${m.category} in pcf.json`);
        else {
          covered.add(process);
          const other = seen.get(process);
          if (other) errors.push(`${rel(file)}: process ${process} is also the process of ${rel(other)}, and one process has one workflow per module`);
          seen.set(process, file);
        }
      }
      for (const s of flow.steps ?? []) {
        if (typeof s.activity !== "string") continue;
        const e = byId.get(s.activity);
        if (!e) continue; // a catalog activity (activities.json), which check-functions checks
        if (e.level === 4 && isUnder(s.activity, m.category)) covered.add(s.activity);
        if (process !== null && byId.get(process)?.level === 3 && processOf(s.activity) !== process) errors.push(`${rel(file)}: step ${String(s.id)} performs activity ${s.activity}, which is not under the workflow's process ${process}`);
      }
    }
  }
  const levels = empty();
  const categories = pcf.elements.filter((e) => e.level === 1).map((c) => ({ id: c.id, name: c.name, function: moduleOf.get(c.id)?.fn ?? null, levels: empty() }));
  const catIndex = new Map(categories.map((c) => [c.id, c]));
  const gaps: Coverage["gaps"] = [];
  let tasksUnderCoveredActivity = 0;
  for (const e of pcf.elements) {
    const level = LEVELS[e.level - 1];
    const cat = catIndex.get(categoryOf(e.id));
    levels[level].total++;
    if (cat) cat.levels[level].total++;
    if (e.level === 5) {
      if (covered.has(e.id.split(".").slice(0, 4).join("."))) tasksUnderCoveredActivity++;
      continue;
    }
    if (covered.has(e.id)) { levels[level].covered++; if (cat) cat.levels[level].covered++; } else gaps.push({ id: e.id, level: e.level, name: e.name, function: moduleOf.get(categoryOf(e.id))?.fn ?? null });
  }
  return { errors, levels, tasksUnderCoveredActivity, categories, gaps };
}

const read = (file: string) => readJson(join(root, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

/** Reads pcf.json, departments.json and each function module's agent, workflows and skills. */
export const readModules = Effect.gen(function* () {
  const fs = yield* VentureFs;
  const pcf = (yield* read(PCF)) as Pcf;
  const departments = ((yield* read(DEPARTMENTS)) as { departments: { id: string; apqc: { id: string } }[] }).departments;
  const modules: Module[] = [];
  for (const d of departments) {
    const dir = join(root, FUNCTIONS, d.id);
    const agent = yield* fs.exists(join(dir, "agent.md"));
    const workflows: Module["workflows"] = [];
    if (yield* fs.isDirectory(join(dir, "workflows"))) {
      for (const f of (yield* Effect.orElseSucceed(fs.list(join(dir, "workflows")), () => [] as string[])).filter((x) => x.endsWith(".json")).sort()) {
        const flow = yield* Effect.orElseSucceed(readJson(join(dir, "workflows", f)), () => ({}));
        workflows.push({ file: `workflows/${f}`, flow: flow as Workflow });
      }
    }
    const skills: Module["skills"] = [];
    if (yield* fs.isDirectory(join(dir, "skills"))) {
      for (const s of (yield* Effect.orElseSucceed(fs.list(join(dir, "skills")), () => [] as string[])).sort()) {
        const text = yield* Effect.orElseSucceed(fs.readText(join(dir, "skills", s, "SKILL.md")), () => "");
        if (text) skills.push({ id: s, processGroup: processGroupOf(text) });
      }
    }
    modules.push({ fn: d.id, category: d.apqc.id, agent, workflows, skills });
  }
  return { pcf, modules };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const complete = args.includes("--complete");
  const listGaps = args.includes("--gaps");
  const only = args.includes("--function") ? args[args.indexOf("--function") + 1] : null;
  await runMain(Effect.map(readModules, ({ pcf, modules }) => {
    const c = coverage(pcf, modules);
    const gaps = c.gaps.filter((g) => !only || g.function === only);
    const failing = [...c.errors, ...(complete ? gaps.map((g) => `${g.id} ${g.name} (level ${g.level}${g.function ? `, ${g.function}` : ""}) has no ${["", "function module", "skill", "workflow", "step"][g.level]}`) : [])];
    if (json) console.log(JSON.stringify({ ok: !failing.length, errors: c.errors, levels: c.levels, tasks_under_covered_activity: c.tasksUnderCoveredActivity, categories: c.categories.filter((x) => !only || x.function === only), gaps }, null, 2));
    else {
      const line = (lv: Coverage["levels"]) => LEVELS.slice(0, 4).map((l) => `${lv[l].covered}/${lv[l].total} ${l}`).join(", ");
      console.log(`PCF coverage: ${line(c.levels)}; ${c.tasksUnderCoveredActivity}/${c.levels.tasks.total} tasks under a covered activity.`);
      for (const cat of c.categories.filter((x) => !only || x.function === only)) console.log(`  ${cat.id} ${cat.function ?? "(no function)"}: ${line(cat.levels)}`);
      if (listGaps) for (const g of gaps) console.log(`  gap  ${g.id}  ${g.name}`);
      else if (gaps.length) console.log(`${gaps.length} element${gaps.length === 1 ? "" : "s"} have no coverage; --gaps lists them.`);
      for (const e of failing) console.error(`FAIL  ${e}`);
    }
    if (failing.length) process.exitCode = 1;
  }));
}
