#!/usr/bin/env node
// Breaks check-goals on venture folders made here (EE-210). A venture with no goals passes, a sound ledger passes,
// and each broken link fails with the rule named. The pure rules are run directly on records, and the whole checker
// on folders, so the exit codes and the output are tested too.
//
//   node packages/naive/src/checks/check-goals-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { goalOfRef, goalProblems, type LedgerInputs } from "./check-goals.ts";
import { GOALS, REQUIREMENTS, type GoalRecord } from "../engine/goals.ts";
import type { Goal, Requirement } from "../records/types/records.d.ts";

const CHECK = new URL("./check-goals.ts", import.meta.url).pathname;
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-goals-test-"));
let n = 0;

const goal = (over: Partial<Goal> & { id: string }): Goal => ({ statement: `the goal ${over.id}`, kind: "venture", ...over });
const rec = (g: Goal, draft = false): GoalRecord => ({ goal: g, file: `${GOALS}/${g.id}.json`, draft });
const need = (over: Partial<Requirement> & { id: string, derives_from: string[] }): { rec: Requirement, file: string } =>
  ({ rec: { statement: `requirement ${over.id}`, ...over }, file: `${REQUIREMENTS}/${over.id}.json` });
const problems = (goals: GoalRecord[], requirements: LedgerInputs["requirements"] = []) => goalProblems({ venture: "v", goals, requirements });
const adopted = (id: string, over: Partial<Goal> = {}) => goal({ id, status: "active", status_by: "Torian", owner: "Torian", measures: [{ id: `${id}-count`, statement: "How many" }], ...over });

/** A venture with these goals and requirements, run through the checker. */
function venture(goals: Goal[], requirements: Requirement[] = [], args: string[] = [], drafts: Goal[] = []) {
  const dir = join(tmp, `v-${++n}`);
  mkdirSync(join(dir, GOALS), { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t", name: "T", phase: "discovery" }));
  for (const g of goals) writeFileSync(join(dir, GOALS, `${g.id}.json`), JSON.stringify(g, null, 2));
  if (requirements.length) mkdirSync(join(dir, REQUIREMENTS), { recursive: true });
  for (const r of requirements) writeFileSync(join(dir, REQUIREMENTS, `${r.id}.json`), JSON.stringify(r, null, 2));
  if (drafts.length) mkdirSync(join(dir, "_drafts"), { recursive: true });
  for (const g of drafts) writeFileSync(join(dir, "_drafts", `foundation__goals__${g.id}.json.draft`), JSON.stringify(g, null, 2));
  const r = spawnSync(process.execPath, [CHECK, dir, ...args], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr };
}

try {
  // The rules, on records alone.
  t("a goal nobody has settled is fine as it is", problems([rec(goal({ id: "end" }))]).errors.length === 0);
  t("a sound ledger has nothing to report", problems([rec(adopted("end")), rec(adopted("price", { kind: "function", parent: "end" }))]).errors.length === 0,
    problems([rec(adopted("end")), rec(adopted("price", { kind: "function", parent: "end" }))]));
  t("a parent that is no goal here fails", /parent end is no goal/.test(problems([rec(goal({ id: "price", parent: "end" }))]).errors.join("\n")));
  t("a goal that is its own parent fails", /its own parent/.test(problems([rec(goal({ id: "end", parent: "end" }))]).errors.join("\n")));
  const cycle = problems([rec(goal({ id: "a", parent: "b" })), rec(goal({ id: "b", parent: "a" }))]).errors.join("\n");
  t("a parent chain that cycles fails, naming the chain", /parent chain of a cycles/.test(cycle) && /a -> b/.test(cycle), cycle);
  t("a parent that is still a draft warns", /still a held draft/.test(problems([rec(goal({ id: "price", parent: "end" })), rec(goal({ id: "end" }), true)]).warnings.join("\n")));

  const noSuccessor = problems([rec(goal({ id: "end", status: "superseded", superseded_by: "end-2" }))]).errors.join("\n");
  t("a superseded goal whose successor is not here fails", /superseded_by names end-2, which is no goal/.test(noSuccessor), noSuccessor);
  t("a successor that does not list what it replaced warns",
    /does not list end in supersedes/.test(problems([rec(goal({ id: "end", status: "superseded", superseded_by: "end-2" })), rec(goal({ id: "end-2" }))]).warnings.join("\n")));
  t("a successor that lists it passes",
    problems([rec(goal({ id: "end", status: "superseded", superseded_by: "end-2", status_by: "T" })), rec(goal({ id: "end-2", supersedes: ["end"] }))]).warnings.length === 0);

  const empty = problems([rec(goal({ id: "end", status: "met", status_by: "T", result: { measures: [] } }))]).errors.join("\n");
  t("a met goal with nothing to show for it fails", /nothing to show for it/.test(empty), empty);
  const strange = problems([rec(goal({ id: "end", status: "missed", status_by: "T", measures: [{ id: "paying", statement: "Paying" }], result: { measures: [{ id: "signups", value: 2 }] } }))]).errors.join("\n");
  t("a result measure the goal does not have fails", /is not a measure of end/.test(strange), strange);
  t("a met goal with a note passes", problems([rec(goal({ id: "end", status: "met", status_by: "T", result: { note: "done" } }))]).errors.length === 0);

  t("an active goal with no owner fails", /active with no owner/.test(problems([rec(goal({ id: "end", status: "active", status_by: "T", measures: [{ id: "m", statement: "m" }] }))]).errors.join("\n")));
  t("an active goal with no measure fails", /active with no measure/.test(problems([rec(goal({ id: "end", status: "active", status_by: "T", owner: "T" }))]).errors.join("\n")));
  t("a goal past proposed that names nobody who set it fails",
    /names nobody who set it/.test(problems([rec(goal({ id: "end", status: "dropped" }))]).errors.join("\n")));
  t("a held draft is not asked who settled it", problems([rec(goal({ id: "end", status: "active", owner: "T", measures: [{ id: "m", statement: "m" }] }), true)]).errors.length === 0);

  // Requirements that derive from goals.
  const live = rec(adopted("end"));
  t("a requirement on a live goal passes", problems([live], [need({ id: "r1", derives_from: ["end"] })]).errors.length === 0);
  t("a requirement reached by measure id passes", problems([live], [need({ id: "r1", derives_from: ["end-count"] })]).errors.length === 0);
  t("a requirement reached by goal/measure passes", problems([live], [need({ id: "r1", derives_from: ["end/end-count"] })]).errors.length === 0);
  t("goalOfRef finds the goal by id, by goal/measure and by bare measure id",
    goalOfRef("end", [live])?.goal.id === "end" && goalOfRef("end/end-count", [live])?.goal.id === "end" && goalOfRef("end-count", [live])?.goal.id === "end" && goalOfRef("nope", [live]) === null);
  const orphanDropped = problems([rec(goal({ id: "end", status: "dropped", status_by: "T" }))], [need({ id: "r1", derives_from: ["end"] })]).errors.join("\n");
  t("a requirement that derives from a dropped goal fails", /derives from end, which was dropped/.test(orphanDropped), orphanDropped);
  const orphanSuperseded = problems([rec(goal({ id: "end", status: "superseded", status_by: "T", superseded_by: "end-2" })), rec(goal({ id: "end-2", supersedes: ["end"] }))], [need({ id: "r1", derives_from: ["end"] })]).errors.join("\n");
  t("a requirement that derives from a superseded goal fails, naming the successor", /derives from end, which was superseded by end-2: point it at end-2/.test(orphanSuperseded), orphanSuperseded);
  t("a requirement that derives from a goal still waiting as a draft warns",
    /still a held draft/.test(problems([rec(goal({ id: "end" }), true)], [need({ id: "r1", derives_from: ["end"] })]).warnings.join("\n")));
  t("a requirement that derives from nothing here warns",
    /is no goal and no goal measure/.test(problems([live], [need({ id: "r1", derives_from: ["gone"] })]).warnings.join("\n")));

  // The checker on folders.
  const none = venture([]);
  t("a venture with no goals passes", none.status === 0 && /ok {2}0 goals/.test(none.out), none);
  const sound = venture([adopted("end"), adopted("price", { kind: "function", parent: "end" })]);
  t("a sound ledger passes", sound.status === 0 && /ok {2}2 goals in 1 venture \(0 settled\)/.test(sound.out), sound);
  const broken = venture([goal({ id: "price", parent: "end" })]);
  t("a broken link exits 1 and names the file", broken.status === 1 && /foundation\/goals\/price\.json: parent end is no goal/.test(broken.out), broken);
  const json = venture([goal({ id: "end", status: "met", status_by: "T", result: { note: "done" } })], [], ["--json"]);
  const parsed = JSON.parse(json.out) as { ok: boolean, goals: number, settled: number, errors: string[] };
  t("--json gives ok, the counts and the errors", json.status === 0 && parsed.ok && parsed.goals === 1 && parsed.settled === 1 && parsed.errors.length === 0, json.out.slice(0, 300));
  const withDraft = venture([adopted("end")], [], [], [goal({ id: "growth", kind: "function" })]);
  t("a goal waiting as a draft is counted", withDraft.status === 0 && /ok {2}2 goals/.test(withDraft.out), withDraft);
  const missing = spawnSync(process.execPath, [CHECK, join(tmp, "not-a-venture")], { encoding: "utf8" });
  t("a folder with no venture cannot be checked", missing.status === 2 && /no venture.json/.test(missing.stdout + missing.stderr), missing.stdout + missing.stderr);
} finally { rmSync(tmp, { recursive: true, force: true }); }

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log("\nall passed");
