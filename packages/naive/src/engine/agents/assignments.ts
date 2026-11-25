// What a venture's activity assignments mean for a function agent (EE-173). A person's merged answer to an activity
// proposal says, per activity, who performs it and whether a person approves it
// (operations/activity-assignments.json, EE-172). A function agent's brief for that venture carries the assignments
// of its own function's activities, each with the rule to follow, and a workflow step that names an assigned
// activity carries the same rule. An activity is one in the catalog or an APQC level 4 activity (EE-176), which is
// what the shipped workflow steps name. Nothing here refuses a write: the gate does not know which activity a write is for.
//
// An activity the venture has not assigned gets a default from its kind (EE-179, ../activity-kinds.ts): a person
// performs a decision, a value, a commitment and a relationship. An entry says whether it is `assigned` or a
// `default`, and a default names its kind. An activity of no kind has no entry, and its function's agent performs it.
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
import { kindOf } from "../activity-kinds.ts";
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
  /** Whether a person assigned it for this venture, or it is the default for the activity's kind. */
  readonly source: "assigned" | "default",
  /** A default's kind: decision, value, commitment or relationship. */
  readonly kind?: string,
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

/** What an agent does about an assignment, in plain sentences. With a kind, the assignment is that kind's default. Pure. */
export function ruleFor(a: Assignment, kind?: string): string {
  return [
    a.performer === "person" ? "A person performs this activity. Do not perform it: ask the person or hand it to them, and record what they give you." : "",
    a.performer === "agent" ? "You perform this activity, and a person checks a sample of the results." : "",
    a.approval === "person" ? "A person approves it each time: raise the result as a decision, and do not treat the activity as done until a person decides." : "",
    a.approval === "none" ? "No approval is needed before it is done." : "",
    kind ? `This is the default for a ${kind}, because the venture has not assigned the activity. The venture's own assignment replaces it.` : "",
  ].filter(Boolean).join(" ");
}

/**
 * The activities under a function's process groups that have a rule: the ones the venture has assigned, and the ones
 * whose kind gives a default. APQC's level 4 activities come first in the framework's order, with APQC's name as the
 * statement, then the catalog's in the catalog's order. Pure.
 */
export function assignedActivities(catalog: ActivityCatalog, groups: Map<string, string>, fn: string, assignments: unknown, pcf?: Pcf): AssignedActivity[] {
  const kinds = catalog.kinds ?? [];
  const entry = (id: string, from: AssignedActivity["from"], group: string, process: string | undefined, statement: string): AssignedActivity[] => {
    if (groups.get(group) !== fn) return [];
    const base = { id, from, process_group: group, ...(process ? { process } : {}), statement };
    const a = assignmentOf(assignments, id);
    if (a) return [{ ...base, ...a, source: "assigned", rule: ruleFor(a) }];
    const k = kindOf(kinds, statement);
    return k ? [{ ...base, performer: k.performer, source: "default", kind: k.id, rule: ruleFor({ performer: k.performer }, k.id) }] : [];
  };
  const apqc = (pcf?.elements ?? []).flatMap((e) => {
    if (e.level !== 4 || !isApqcId(e.id)) return [];
    const [c, g, p] = e.id.split(".");
    return entry(e.id, "pcf", `${c}.${g}`, `${c}.${g}.${p}`, e.name);
  });
  return [...apqc, ...catalog.activities.flatMap((act) => entry(act.id, "catalog", act.process_group, act.process, act.statement))];
}

/**
 * A workflow with `assignment` on each step whose activity the venture has assigned, or whose activity has a default
 * among `activities` (the function's entries from assignedActivities). Other steps and fields are unchanged. Pure.
 */
export function assignedSteps(workflow: unknown, assignments: unknown, activities: readonly AssignedActivity[] = []): unknown {
  if (!isObject(workflow) || !Array.isArray(workflow.steps)) return workflow;
  return {
    ...workflow,
    steps: workflow.steps.map((s: unknown) => {
      if (!isObject(s) || typeof s.activity !== "string") return s;
      const a = assignmentOf(assignments, s.activity);
      if (a) return { ...s, assignment: { ...a, source: "assigned", rule: ruleFor(a) } };
      const d = activities.find((x) => x.id === s.activity && x.source === "default");
      return d ? { ...s, assignment: { performer: d.performer, source: "default", kind: d.kind, rule: d.rule } } : s;
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

/** For one function in one venture: the record as read, null when the venture has none, and the function's activities that have a rule, assigned or by default. */
export function assignmentsFor(dir: string, fn: string): { record: unknown, activities: AssignedActivity[] } {
  return runSync(Effect.gen(function* () {
    const record = yield* readAssignments(dir);
    return { record, activities: assignedActivities(yield* readCatalog(), yield* readGroups(), fn, record, yield* readPcf()) };
  }));
}
