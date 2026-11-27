// Tests check-pcf-coverage (EE-226): coverage is computed as the header says, a gap is reported and fails only with
// --complete, and each structural rule fails. The pure rules run on a small PCF and stand-in modules; the CLI runs on
// copies of the repository's files with one module changed.
//
//   node packages/naive/src/checks/check-pcf-coverage-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Pcf } from "../records/types/records.d.ts";
import { coverage, type Module, processGroupOf } from "./check-pcf-coverage.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-pcf-coverage.ts");
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const pcf = {
  version: "8.0", edition: "cross-industry", published: "2024", source: "apqc-pcf", attribution: "APQC", note: "test",
  elements: [
    { id: "1.0", name: "Cat", pcf: 1, level: 1 },
    { id: "1.1", name: "Group", pcf: 2, level: 2 },
    { id: "1.1.1", name: "Process A", pcf: 3, level: 3 },
    { id: "1.1.1.1", name: "Activity A1", pcf: 4, level: 4 },
    { id: "1.1.1.1.1", name: "Task A1a", pcf: 5, level: 5 },
    { id: "1.1.1.2", name: "Activity A2", pcf: 6, level: 4 },
    { id: "1.1.2", name: "Process B", pcf: 7, level: 3 },
    { id: "2.0", name: "Other", pcf: 8, level: 1 },
    { id: "2.1", name: "Other group", pcf: 9, level: 2 },
  ],
} as unknown as Pcf;
const mod = (over: Partial<Module> = {}): Module => ({ fn: "one", category: "1.0", agent: true, workflows: [], skills: [], ...over });

{
  const c = coverage(pcf, [mod()]);
  t("a module with an agent and no workflow does not cover its category", c.levels.categories.covered === 0, c.levels);
  t("everything is a gap when nothing covers it, and nothing fails", c.errors.length === 0 && c.gaps.length === 8, c);
}
{
  const c = coverage(pcf, [mod({
    skills: [{ id: "group", processGroup: "1.1" }],
    workflows: [{ file: "workflows/a.json", flow: { process: "1.1.1", steps: [{ id: "s", activity: "1.1.1.1" }] } }],
  })]);
  t("a workflow covers the category, its process and its step's activity; a skill its process group", c.levels.categories.covered === 1 && c.levels["process groups"].covered === 1 && c.levels.processes.covered === 1 && c.levels.activities.covered === 1, c.levels);
  t("a task is counted under a covered activity, never as covered itself", c.tasksUnderCoveredActivity === 1 && c.levels.tasks.covered === 0, c);
  t("the uncovered activity and process are gaps", c.gaps.some((g) => g.id === "1.1.1.2") && c.gaps.some((g) => g.id === "1.1.2"), c.gaps);
  t("the other category, with no module, is a gap with no function", c.gaps.some((g) => g.id === "2.0" && g.function === null), c.gaps);
}
{
  const c = coverage(pcf, [mod({ workflows: [{ file: "workflows/a.json", flow: { process: "1.1.1", steps: [{ id: "s", activity: "1.1.1.1" }] } }, { file: "workflows/b.json", flow: { process: "1.1.1", steps: [] } }] })]);
  t("two workflows naming one process fail", c.errors.some((e) => /also the process of/.test(e)), c.errors);
}
{
  const c = coverage(pcf, [mod({ workflows: [{ file: "workflows/a.json", flow: { process: "1.1.2", steps: [{ id: "s", activity: "1.1.1.1" }] } }] })]);
  t("a step whose activity is under another process fails", c.errors.some((e) => /not under the workflow's process 1.1.2/.test(e)), c.errors);
}
{
  const c = coverage(pcf, [mod({ workflows: [{ file: "workflows/a.json", flow: { process: "2.1.1", steps: [] } }], skills: [{ id: "x", processGroup: "1.1.1" }] })]);
  t("a process outside the function's category fails", c.errors.some((e) => /process 2.1.1 is not a level 3 element of 1.0/.test(e)), c.errors);
  t("a process group that is not a level 2 element fails", c.errors.some((e) => /process_group 1.1.1 is not a level 2 element/.test(e)), c.errors);
}
{
  const c = coverage(pcf, [mod({ workflows: [{ file: "workflows/a.json", flow: { steps: [{ id: "s", activity: "1.1.1.2" }, { id: "t", activity: "some-catalog-activity" }] } }] })]);
  t("a workflow with no process still covers its steps' activities and leaves catalog activities to check-functions", c.errors.length === 0 && c.levels.activities.covered === 1, c);
}
t("process_group is read from a SKILL.md's frontmatter", processGroupOf("---\nname: x\nprocess_group: \"9.1\"\n---\n# x\n") === "9.1" && processGroupOf("---\nname: x\n---\nprocess_group: 9.1\n") === null);

// The CLI on the repository and on a copy with one module broken.
const run = (args: string[], env: Record<string, string> = {}) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { status: r.status, out: r.stdout + r.stderr };
};
{
  const r = run(["--json"]);
  const j = JSON.parse(r.out) as { ok: boolean; levels: Record<string, { total: number }>; categories: unknown[] };
  t("the repository passes and counts the whole PCF", r.status === 0 && j.levels.processes.total === 363 && j.levels.activities.total === 1352 && j.categories.length === 13, r.out.slice(0, 400));
}
const tmp = mkdtempSync(join(tmpdir(), "check-pcf-coverage-test-"));
try {
  const root = join(tmp, "r");
  const F = "packages/naive/src/functions";
  cpSync(join(repo, F), join(root, F), { recursive: true });
  mkdirSync(join(root, F, "finance/workflows"), { recursive: true });
  writeFileSync(join(root, F, "finance/workflows/zz-broken.json"), JSON.stringify({ id: "zz-broken", process: "1.1.1", steps: [] }));
  const r = run([], { EE_ROOT: root });
  t("a module whose workflow names another category's process fails the CLI", r.status === 1 && /zz-broken.json: process 1.1.1 is not a level 3 element of 9.0/.test(r.out), r.out.slice(-600));
  rmSync(join(root, F, "finance/workflows/zz-broken.json"));
  const c = run(["--complete", "--function", "finance"], { EE_ROOT: root });
  const covered = run(["--json", "--function", "finance"], { EE_ROOT: root });
  const gaps = (JSON.parse(covered.out) as { gaps: unknown[] }).gaps.length;
  t("--complete fails exactly when the function has a gap", gaps ? c.status === 1 && /has no/.test(c.out) : c.status === 0, { gaps, out: c.out.slice(-400) });
} finally { rmSync(tmp, { recursive: true, force: true }); }

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("check-pcf-coverage: all passed");
