// What a venture's activity assignments mean for a function agent (EE-173). A person's merged answer to an activity
// proposal says, per activity, who performs it and whether a person approves it
// (operations/activity-assignments.json, EE-172). A function agent's brief for that venture carries the assignments
// of its own function's activities, each with the rule to follow, and a workflow step that names an assigned
// activity carries the same rule. An activity is one in the catalog or an APQC level 4 activity (EE-176), which is
// what the shipped workflow steps name. Nothing here refuses a write: the gate does not know which activity a write is for.
//
//   assignedActivities(catalog, groups, "marketing-and-sales", assignments)   // [{ id, statement, performer, rule }]
//   assignedSteps(workflow, assignments)                                      // the workflow, steps marked
//   assignmentsFor(dir, "marketing-and-sales")                                // both, read from the venture

import { existsSync } from "node:fs";
import { Effect } from "effect";
import { CannotRun } from "../../core/effect/errors.ts";
import { readJson } from "../../core/effect/fs.ts";
import { describe, runSync } from "../../core/effect/run.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { ASSIGNMENTS, isApqcId, readCatalog, readGroups, readPcf } from "../activity-proposals.ts";
import type { ActivityAssignments, ActivityCatalog, Pcf } from "../../records/types/records.d.ts";

export type Assignment = ActivityAssignments["activities"][string];
/** An assigned activity as a brief carries it: what it is, who performs it, whether a person approves it, and the rule that follows. */
export interface AssignedActivity extends Assignment {
  readonly id: string,
  /** Where the activity is defined: APQC's framework or the activity catalog. */
  readonly from: "pcf" | "catalog",
  readonly process_group: string,
  readonly process?: string,
  readonly statement: string,
  readonly rule: string,
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The assignment a record holds for one activity, keeping only the two fields and their allowed values. Pure. */
export function assignmentOf(assignments: unknown, id: string): Assignment | null {
  const a = isObject(assignments) && isObject(assignments.activities) ? assignments.activities[id] : undefined;
  if (!isObject(a)) return null;
  const out: Assignment = {
    ...(a.performer === "agent" || a.performer === "person" ? { performer: a.performer } : {}),
    ...(a.approval === "person" || a.approval === "none" ? { approval: a.approval } : {}),
  };
  return out.performer || out.approval ? out : null;
}

/** What an agent does about an assignment, in plain sentences. Pure. */
export function ruleFor(a: Assignment): string {
  return [
    a.performer === "person" ? "A person performs this activity. Do not perform it: ask the person or hand it to them, and record what they give you." : "",
    a.performer === "agent" ? "You perform this activity, and a person checks a sample of the results." : "",
    a.approval === "person" ? "A person approves it each time: raise the result as a decision, and do not treat the activity as done until a person decides." : "",
    a.approval === "none" ? "No approval is needed before it is done." : "",
  ].filter(Boolean).join(" ");
}

/**
 * The activities under a function's process groups that the venture has assigned: APQC's level 4 activities in the
 * framework's order, with APQC's name as the statement, then the catalog's in the catalog's order. Pure.
 */
export function assignedActivities(catalog: ActivityCatalog, groups: Map<string, string>, fn: string, assignments: unknown, pcf?: Pcf): AssignedActivity[] {
  const apqc = (pcf?.elements ?? []).flatMap((e): AssignedActivity[] => {
    if (e.level !== 4 || !isApqcId(e.id)) return [];
    const [c, g, p] = e.id.split(".");
    const a = groups.get(`${c}.${g}`) === fn ? assignmentOf(assignments, e.id) : null;
    return a ? [{ id: e.id, from: "pcf", process_group: `${c}.${g}`, process: `${c}.${g}.${p}`, statement: e.name, ...a, rule: ruleFor(a) }] : [];
  });
  const own = catalog.activities.flatMap((act): AssignedActivity[] => {
    const a = groups.get(act.process_group) === fn ? assignmentOf(assignments, act.id) : null;
    return a ? [{ id: act.id, from: "catalog", process_group: act.process_group, ...(act.process ? { process: act.process } : {}), statement: act.statement, ...a, rule: ruleFor(a) }] : [];
  });
  return [...apqc, ...own];
}

/** A workflow with `assignment` on each step whose activity the venture has assigned. Other steps and fields are unchanged. Pure. */
export function assignedSteps(workflow: unknown, assignments: unknown): unknown {
  if (!isObject(workflow) || !Array.isArray(workflow.steps)) return workflow;
  return {
    ...workflow,
    steps: workflow.steps.map((s: unknown) => {
      const a = isObject(s) && typeof s.activity === "string" ? assignmentOf(assignments, s.activity) : null;
      return a && isObject(s) ? { ...s, assignment: { ...a, rule: ruleFor(a) } } : s;
    }),
  };
}

/** A venture's assignments record, or null when it has none. */
export const readAssignments = (dir: string) => {
  const file = ventureFile(dir, ASSIGNMENTS);
  return existsSync(file)
    ? readJson(file).pipe(Effect.mapError((e) => new CannotRun({ message: `${ASSIGNMENTS}: ${describe(e)}`, cause: e })))
    : Effect.succeed(null);
};

/** For one function in one venture: the record as read and the function's assigned activities. Empty when the venture has assigned nothing. */
export function assignmentsFor(dir: string, fn: string): { record: unknown, activities: AssignedActivity[] } {
  return runSync(Effect.gen(function* () {
    const record = yield* readAssignments(dir);
    if (!record) return { record, activities: [] };
    return { record, activities: assignedActivities(yield* readCatalog(), yield* readGroups(), fn, record, yield* readPcf()) };
  }));
}
