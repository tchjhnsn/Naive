// The briefing a person reads about a venture's activities (EE-180).
//
//   node packages/naive/src/engine/activity-briefing.ts <venture dir> [--function <id>] [--json]
//   naive activities briefing [--venture <dir>] [--function <id>] [--json]
//
// A person does not read every activity. The briefing is APQC levels 1 and 2: one entry per function the venture
// lists in venture.json departments, with its APQC category, and under it each process group. A process group says
// what it needs from a person: the activities a person performs and the ones a person approves, each from the
// venture's own assignment or by default from the activity's kind (EE-179), and how many activities are left to the
// function's agent. It reads the venture's assignments, the activity catalog and APQC's framework, and writes nothing.
//
// It counts activities and names who performs them. It does not say what happened: open decisions, handoffs and
// results are not in the briefing (not built).

import { Effect } from "effect";
import { runMain } from "../core/effect/run.ts";
import { readCatalog, readGroups, readPcf } from "./activity-proposals.ts";
import { assignedActivities, readAssignments } from "./agents/assignments.ts";
import type { AssignedActivity } from "./agents/assignments.ts";
import { functionsOf } from "./research-programs.ts";
import type { ActivityCatalog, Pcf } from "../records/types/records.d.ts";

/** One activity the process group needs from a person. */
export type Needed = Pick<AssignedActivity, "id" | "from" | "statement" | "source" | "kind">;
export interface GroupBriefing {
  readonly id: string,
  /** APQC's name for the process group. */
  readonly name: string,
  /** The activities a person performs. */
  readonly performs: readonly Needed[],
  /** The activities an agent performs and a person approves each time. */
  readonly approves: readonly Needed[],
  /** How many of the group's activities, APQC's level 4 and the catalog's, are left to the function's agent with no approval. */
  readonly agent: number,
}
export interface FunctionBriefing {
  readonly function: string,
  /** The function's APQC category, level 1. */
  readonly category: { readonly id: string, readonly name: string } | null,
  readonly process_groups: readonly GroupBriefing[],
  /** How many activities across the function a person performs or approves. */
  readonly needs_person: number,
}

const needed = (a: AssignedActivity): Needed => ({ id: a.id, from: a.from, statement: a.statement, source: a.source, ...(a.kind ? { kind: a.kind } : {}) });

/** The briefing for the functions given, in their order, with each function's process groups in the framework's order. Pure. */
export function briefing(catalog: ActivityCatalog, groups: Map<string, string>, pcf: Pcf, functions: readonly string[], assignments: unknown): FunctionBriefing[] {
  const name = new Map(pcf.elements.filter((e) => e.level <= 2).map((e) => [e.id, e.name]));
  const total = new Map<string, number>();
  const count = (group: string) => total.set(group, (total.get(group) ?? 0) + 1);
  for (const e of pcf.elements) if (e.level === 4) count(e.id.split(".").slice(0, 2).join("."));
  for (const a of catalog.activities) count(a.process_group);
  return functions.map((fn) => {
    const ruled = assignedActivities(catalog, groups, fn, assignments, pcf);
    const mine = [...groups].filter(([, f]) => f === fn).map(([id]) => id);
    const process_groups = mine.map((id): GroupBriefing => {
      const here = ruled.filter((a) => a.process_group === id);
      const performs = here.filter((a) => a.performer === "person");
      const approves = here.filter((a) => a.performer !== "person" && a.approval === "person");
      return { id, name: name.get(id) ?? "", performs: performs.map(needed), approves: approves.map(needed), agent: (total.get(id) ?? 0) - performs.length - approves.length };
    });
    const category = mine.length ? `${mine[0].split(".")[0]}.0` : null;
    return {
      function: fn,
      category: category && name.has(category) ? { id: category, name: name.get(category) ?? "" } : null,
      process_groups,
      needs_person: process_groups.reduce((n, g) => n + g.performs.length + g.approves.length, 0),
    };
  });
}

/** The briefing for a venture: the functions it lists, or the one named. */
export const briefingFor = (dir: string, only?: string) => Effect.gen(function* () {
  const functions = functionsOf(dir).filter((f) => only === undefined || f === only);
  return briefing(yield* readCatalog(), yield* readGroups(), yield* readPcf(), functions, yield* readAssignments(dir));
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const at = args.indexOf("--function");
  const only = at < 0 ? undefined : args[at + 1];
  const [dir] = args.filter((a, i) => !a.startsWith("--") && (at < 0 || i !== at + 1));
  if (!dir || (at >= 0 && !only)) {
    console.error("usage: node packages/naive/src/engine/activity-briefing.ts <venture dir> [--function <id>] [--json]");
    process.exit(2);
  }
  await runMain(Effect.map(briefingFor(dir, only), (found) => {
    if (only !== undefined && !found.length) {
      console.error(`the venture does not list the function ${only} in venture.json departments: it lists ${functionsOf(dir).join(", ") || "none"}`);
      process.exitCode = 2;
      return;
    }
    if (json) { console.log(JSON.stringify({ briefing: found }, null, 2)); return; }
    if (!found.length) console.log("The venture lists no functions in venture.json departments, so there is nothing to brief.");
    const line = (verb: string, a: Needed) => `      ${verb} ${a.id}  ${a.statement}  (${a.source === "default" ? `default for a ${a.kind}` : "assigned"})`;
    for (const f of found) {
      console.log(`\n${f.function}${f.category ? `  ${f.category.id} ${f.category.name}` : ""}: ${f.needs_person} activities need a person`);
      for (const g of f.process_groups) {
        console.log(`  ${g.id} ${g.name}: you perform ${g.performs.length}, you approve ${g.approves.length}, the agent does ${g.agent}`);
        for (const a of g.performs) console.log(line("perform", a));
        for (const a of g.approves) console.log(line("approve", a));
      }
    }
    if (found.length) console.log("\nA default follows from the activity's kind and is an unvalidated prior. The venture's own assignment replaces it. Nothing written.");
  }));
}
