#!/usr/bin/env node
// Checks each venture's goal ledger (EE-210): goals are durable records, so the links between them have to hold.
// The schema (packages/naive/src/records/goal.schema.json) already holds one record's shape; this checks what
// crosses records.
//
//   node packages/naive/src/checks/check-goals.ts <workspace or venture dir> [--json]
//
// Errors (exit 1):
//   parent        a goal whose parent is no goal of this venture, that is its own parent, or a parent chain that cycles
//   successor     a superseded goal whose superseded_by names no goal here, or names itself
//   result        a met or missed goal with no note and no measure in its result, or a result measure the goal lacks
//   active        an active goal with no owner, or with no measure: nobody could tell whether it was reached
//   settled by    a goal past proposed that does not name the person who set its status (status_by)
//   orphan        a requirement that derives from a dropped or superseded goal: it has nothing live to serve
//
// Warnings:
//   a goal whose parent is still a held draft; a superseded goal whose successor does not list it in supersedes;
//   a requirement that derives from a goal still waiting as a draft, or from no goal and no measure here.
//
// It reads and writes nothing. Reading is an Effect through VentureFs (EE-125), and the rules are pure
// (goalProblems), so the test runs them on records with no venture on disk.

import { Effect } from "effect";
import { join } from "node:path";
import { CannotRun, type NaiveError } from "../core/effect/errors.ts";
import { VentureFs } from "../core/effect/fs.ts";
import { runMain } from "../core/effect/run.ts";
import { GOALS, SETTLED, readDraftGoals, readGoals, readRequirements, statusOf, type GoalRecord } from "../engine/goals.ts";
import type { Requirement } from "../records/types/records.d.ts";

/** What the rules read for one venture. */
export interface LedgerInputs {
  readonly venture: string,
  readonly goals: readonly GoalRecord[],
  readonly requirements: readonly { rec: Requirement, file: string }[],
}
/** What is wrong, and what is only worth saying. */
export interface Problems { readonly errors: string[], readonly warnings: string[] }

/** The goal a requirement's derives_from entry points at: a goal id, <goal>/<measure>, or a bare measure id. */
export function goalOfRef(ref: string, goals: readonly GoalRecord[]): GoalRecord | null {
  const [head] = ref.split("/");
  const byId = goals.find((g) => g.goal.id === ref) ?? goals.find((g) => g.goal.id === head);
  if (byId) return byId;
  const measure = ref.includes("/") ? ref.slice(ref.indexOf("/") + 1) : ref;
  return goals.find((g) => (g.goal.measures ?? []).some((m) => m.id === measure)) ?? null;
}

/** Everything wrong with one venture's goal ledger. Pure. */
export function goalProblems(i: LedgerInputs): Problems {
  const errors: string[] = [], warnings: string[] = [];
  const at = (g: GoalRecord) => `${i.venture}/${g.file}`;
  const byId = new Map(i.goals.map((g) => [g.goal.id, g]));
  const live = new Map(i.goals.filter((g) => !g.draft).map((g) => [g.goal.id, g]));

  for (const g of i.goals) {
    const goal = g.goal, status = statusOf(goal);
    const parent = goal.parent;
    if (parent !== undefined) {
      if (parent === goal.id) errors.push(`${at(g)}: ${goal.id} is its own parent`);
      else if (!byId.has(parent)) errors.push(`${at(g)}: parent ${parent} is no goal of this venture (${GOALS}/${parent}.json)`);
      else if (!live.has(parent)) warnings.push(`${at(g)}: parent ${parent} is still a held draft, so this goal serves nothing live yet`);
    }
    const successor = goal.superseded_by;
    if (successor !== undefined) {
      if (successor === goal.id) errors.push(`${at(g)}: ${goal.id} cannot be superseded by itself`);
      else if (!byId.has(successor)) errors.push(`${at(g)}: superseded_by names ${successor}, which is no goal of this venture: a superseded goal names the goal that replaced it`);
      else if (!(byId.get(successor)?.goal.supersedes ?? []).includes(goal.id)) warnings.push(`${at(g)}: ${successor} replaced it, but ${successor} does not list ${goal.id} in supersedes`);
    }
    if (status === "met" || status === "missed") {
      const result = goal.result;
      const measures = result?.measures ?? [];
      if (!result?.note && !measures.length) errors.push(`${at(g)}: ${goal.id} is ${status} with nothing to show for it: its result needs a note or a measure`);
      const unknown = measures.map((m) => m.id).filter((id) => !(goal.measures ?? []).some((m) => m.id === id));
      if (unknown.length) errors.push(`${at(g)}: its result names ${unknown.join(", ")}, which ${unknown.length === 1 ? "is not a measure" : "are not measures"} of ${goal.id}`);
    }
    if (status === "active") {
      if (!goal.owner) errors.push(`${at(g)}: ${goal.id} is active with no owner: name the person or role who owns it`);
      if (!(goal.measures ?? []).length) errors.push(`${at(g)}: ${goal.id} is active with no measure: nobody could tell whether it was reached`);
    }
    if (status !== "proposed" && !goal.status_by && !g.draft) errors.push(`${at(g)}: ${goal.id} is ${status} but names nobody who set it (status_by): only a person settles a goal, with naive goals status ${goal.id} ${status} --by <person>`);
  }

  // A parent chain that cycles: walk up from each goal until a root, a repeat, or a goal that is not here.
  for (const g of i.goals) {
    const seen = new Set<string>([g.goal.id]);
    let cur = g.goal.parent !== undefined ? byId.get(g.goal.parent) : undefined;
    while (cur) {
      if (seen.has(cur.goal.id)) { errors.push(`${at(g)}: the parent chain of ${g.goal.id} cycles through ${[...seen].join(" -> ")} -> ${cur.goal.id}`); break; }
      seen.add(cur.goal.id);
      cur = cur.goal.parent !== undefined ? byId.get(cur.goal.parent) : undefined;
    }
  }

  for (const { rec, file } of i.requirements) {
    for (const ref of rec.derives_from) {
      const found = goalOfRef(ref, i.goals);
      if (!found) { warnings.push(`${i.venture}/${file}: derives from ${ref}, which is no goal and no goal measure of this venture`); continue; }
      const status = statusOf(found.goal);
      if (found.draft) warnings.push(`${i.venture}/${file}: derives from ${found.goal.id}, which is still a held draft: the requirement stands on a goal no person has adopted`);
      else if (status === "superseded") errors.push(`${i.venture}/${file}: derives from ${found.goal.id}, which was superseded by ${found.goal.superseded_by}: point it at ${found.goal.superseded_by} or drop it`);
      else if (status === "dropped") errors.push(`${i.venture}/${file}: derives from ${found.goal.id}, which was dropped: it has no live goal to serve`);
    }
  }
  return { errors, warnings };
}

/** One venture's ledger, read from disk. */
export const ledgerOf = (dir: string, venture: string): Effect.Effect<LedgerInputs, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const live = yield* readGoals(dir);
  const ids = new Set(live.map((g) => g.goal.id));
  const drafts = (yield* readDraftGoals(dir)).filter((d) => !ids.has(d.goal.id));
  return { venture, goals: [...live, ...drafts], requirements: yield* readRequirements(dir) };
});

/** Every venture folder under a directory: the ones that hold a venture.json. Hidden folders and node_modules are skipped. */
export const venturesIn = (dir: string): Effect.Effect<string[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const out: string[] = [];
  const walk = (d: string): Effect.Effect<void, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
    if (yield* fs.exists(join(d, "venture.json"))) out.push(d);
    for (const name of yield* fs.list(d)) {
      if (name === "node_modules" || name.startsWith(".") || name.startsWith("_")) continue;
      if (yield* fs.isDirectory(join(d, name))) yield* walk(join(d, name));
    }
  });
  if (yield* fs.isDirectory(dir)) yield* walk(dir);
  return out;
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const [dir] = args.filter((a) => !a.startsWith("--"));
  const json = args.includes("--json");
  const program: Effect.Effect<void, NaiveError, "naive/VentureFs"> = Effect.gen(function* () {
    if (!dir) return yield* new CannotRun({ message: "usage: node packages/naive/src/checks/check-goals.ts <workspace or venture dir> [--json]" });
    const roots = yield* venturesIn(dir);
    if (!roots.length) return yield* new CannotRun({ message: `no venture.json in ${dir} or below it` });
    const errors: string[] = [], warnings: string[] = [];
    let goals = 0, settled = 0;
    for (const root of roots) {
      const name = root.slice(dir.length).replace(/^\/+/, "") || ".";
      const inputs = yield* ledgerOf(root, name);
      const found = goalProblems(inputs);
      errors.push(...found.errors);
      warnings.push(...found.warnings);
      goals += inputs.goals.length;
      settled += inputs.goals.filter((g) => SETTLED.includes(statusOf(g.goal))).length;
    }
    if (json) { console.log(JSON.stringify({ ok: errors.length === 0, errors, warnings, goals, settled, ventures: roots.length }, null, 2)); if (errors.length) process.exitCode = 1; return; }
    for (const w of warnings) console.warn(`warning: ${w}`);
    if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; return; }
    console.log(`ok  ${goals} ${goals === 1 ? "goal" : "goals"} in ${roots.length} ${roots.length === 1 ? "venture" : "ventures"} (${settled} settled): every parent, successor, result and requirement holds.`);
  });
  await runMain(program);
}
