#!/usr/bin/env node
// Skipped work is never lost (EE-213, step 9 of docs/design/HOOKS_AND_LOOPS_2026-11-26.md, designed in
// docs/design/SKIPPED_WORK_AND_SPECIALISTS_2026-11-26.md). Work gets passed over all the time and the record of it
// lived nowhere, so this is the ledger of what was left behind, walked in the order APQC's framework gives:
// the function's category, then its process groups, then the activity, then the workflow and the step's place in it.
//
// Two kinds of item, both read from the run log (<venture>/.naive/workflow-runs.jsonl) and the shipped workflows:
//
//   workflow  a person skipped a whole occurrence (a run with outcome skipped), with how many times and when last.
//   step      the latest finished run that reported its steps (naive due record --steps) left the step out. It is
//             required when the step has no `consider`, and otherwise carries the consider block, because nothing
//             judges a step's `when`: it is a sentence (EE-181), and a person or the function's agent judges it.
//
// A run that reports no steps says nothing about its steps, never that every step was done, so it puts nothing here.
//
// Each item says what it blocks downstream when the element graph can tell (downstream in element-graph.ts): the
// elements its activity feeds and the record types each feed runs on. An activity no workflow reaches has no feeds.
//
//   node packages/naive/src/engine/skipped.ts <venture dir> [--function <id>] [--at <iso>] [--json]
//   node packages/naive/src/engine/skipped.ts <venture dir> handback <item> [--to <role>]
//   naive skipped [handback <item> [--to <role>]]
//
// handback hands one item to the owning function agent for a recommendation: it files one open decision through the
// ordinary decision door (propose in decisions.ts), with assigned_to naming the role asked and the options do-now,
// defer and drop. The agent recommends; a person decides. A rerun leaves a decision already filed as it is.
//
// skipped() and withBlocks() are pure. Reading and writing files is an Effect through VentureFs (EE-125).

import { Effect } from "effect";
import { CannotRun, Refused } from "../core/effect/errors.ts";
import type { NaiveError } from "../core/effect/errors.ts";
import { runMain } from "../core/effect/run.ts";
import { agentRoles } from "./agents/brief.ts";
import { functionAgent } from "./agents/function-spec.ts";
import { readCatalog } from "./activity-proposals.ts";
import { decisionFile, propose } from "./decisions.ts";
import type { DoorResult } from "./decisions.ts";
import { readRuns, workflowsOf } from "./due.ts";
import type { DueWorkflow, WorkflowRun } from "./due.ts";
import { buildGraph, downstream, shippedInput } from "./element-graph.ts";
import type { ElementGraph } from "./element-graph.ts";
import type { FunctionWorkflow } from "../records/types/records.d.ts";
import { nowIso } from "../core/clock.ts";

/** The part of a function workflow the ledger reads. */
export type SkippedWorkflow = Pick<DueWorkflow, "id" | "function" | "title" | "steps">;
/** One step of a workflow, as the schema has it. */
export type WorkflowStep = FunctionWorkflow["steps"][number];
/** What an item blocks: one element its activity feeds, and the record types the feed runs on. */
export interface Blocked { readonly element: string, readonly name: string, readonly records: readonly string[] }
/** A step to consider, as the ledger carries it: nothing judges `when`, so the item names it and who judges it. */
export interface Consider { readonly why: string, readonly when: string | null }

export interface SkippedItem {
  /** `<function>/<workflow>` for an occurrence, `<function>/<workflow>#<step>` for a step. */
  readonly id: string,
  readonly kind: "workflow" | "step",
  readonly function: string,
  /** `<function>/<workflow>`. */
  readonly workflow: string,
  readonly step: string | null,
  /** The workflow's title, or the step's `do`. */
  readonly title: string,
  /** A step without `consider` is required; an occurrence a person skipped is not. */
  readonly required: boolean,
  /** One sentence a person can read. */
  readonly why: string,
  readonly consider: Consider | null,
  /** The step's activity, when it names one. */
  readonly activity: string | null,
  /** The activity's APQC process group, or null when the item sits at its function. */
  readonly process_group: string | null,
  /** The element the item is attached to: its activity, else the function's APQC category. */
  readonly element: string,
  /** How many times it was skipped or left out. */
  readonly count: number,
  /** When it was last skipped or left out. */
  readonly last: string,
  /** What it blocks downstream, when the element graph can tell. */
  readonly blocks: readonly Blocked[],
}

/** What the pure function needs from Naive's data: each function's APQC category, and each catalog activity's process group. */
export interface Hierarchy {
  readonly category: Readonly<Record<string, string>>,
  readonly group: Readonly<Record<string, string>>,
}

const day = (at: string): string => at.slice(0, 10);
/** The process group an activity sits under: an APQC hierarchy id's first two segments, else the catalog's. */
export const groupOf = (activity: string | null, h: Hierarchy): string | null =>
  activity === null ? null : /^\d/.test(activity) ? activity.split(".").slice(0, 2).join(".") : h.group[activity] ?? null;

/** Hierarchy ids in numeric order (1.2 before 1.10), then other ids by name. */
const byElement = (a: string, b: string): number => {
  const na = /^\d/.test(a), nb = /^\d/.test(b);
  if (na !== nb) return na ? -1 : 1;
  if (!na) return a < b ? -1 : a > b ? 1 : 0;
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? -1) !== (pb[i] ?? -1)) return (pa[i] ?? -1) - (pb[i] ?? -1);
  return 0;
};
/** null first, then by element id: an item with no activity sits at its function, before its process groups. */
const byNullable = (a: string | null, b: string | null): number => (a === b ? 0 : a === null ? -1 : b === null ? 1 : byElement(a, b));

/** The latest run at or before `now` that finished and reported the steps it finished, or null. */
const reporting = (mine: readonly WorkflowRun[]): WorkflowRun | null =>
  mine.filter((r) => r.outcome === "done" && r.steps !== undefined).reduce<WorkflowRun | null>((m, r) => (m === null || r.at > m.at ? r : m), null);

/**
 * Every piece of work left behind at `now`, in hierarchical order. Pure: the same runs and workflows in any order
 * give the same list.
 */
export function skipped(workflows: readonly SkippedWorkflow[], runs: readonly WorkflowRun[], now: string, h: Hierarchy): SkippedItem[] {
  const out: SkippedItem[] = [];
  const order = new Map<string, number>();
  for (const w of workflows) {
    const key = `${w.function}/${w.id}`;
    const category = h.category[w.function] ?? "";
    const mine = runs.filter((r) => r.workflow === key && r.at <= now);
    const common = { function: w.function, workflow: key, blocks: [] as readonly Blocked[] };

    const skips = mine.filter((r) => r.outcome === "skipped");
    if (skips.length) {
      const last = skips.reduce((m, r) => (r.at > m ? r.at : m), skips[0].at);
      const since = mine.some((r) => r.outcome === "done" && r.at > last);
      out.push({
        ...common, id: key, kind: "workflow", step: null, title: w.title, required: false, consider: null,
        why: `A person skipped this occurrence on ${day(last)}${skips.length > 1 ? `, and ${skips.length} occurrences in all` : ""}. ${since ? "It has run since." : "Nothing has run it since."}`,
        activity: null, process_group: null, element: category, count: skips.length, last,
      });
      order.set(key, out.length);
    }

    const run = reporting(mine);
    if (!run) continue;
    const finished = new Set(run.steps ?? []);
    const steps: readonly WorkflowStep[] = w.steps ?? [];
    for (const [i, s] of steps.entries()) {
      if (finished.has(s.id)) continue;
      const id = `${key}#${s.id}`;
      const activity = s.activity ?? null;
      const required = s.consider === undefined;
      const count = mine.filter((r) => r.outcome === "done" && r.steps !== undefined && !r.steps.includes(s.id)).length;
      const consider: Consider | null = s.consider ? { why: s.consider.why, when: s.consider.when ?? null } : null;
      const why = required
        ? `The run that finished on ${day(run.at)} did not finish this required step.`
        : `The run that finished on ${day(run.at)} did not run this step, which is one to consider: ${consider?.why ?? ""} ${consider?.when ? `It runs unasked when this holds: ${consider.when} A person or ${w.function}-agent judges whether it does now.` : "Only a person's ask runs it."}`;
      out.push({ ...common, id, kind: "step", step: s.id, title: s.do, required, consider, why, activity, process_group: groupOf(activity, h), element: activity ?? category, count, last: run.at });
      order.set(id, i + 1);
    }
  }
  return out.sort((a, b) =>
    byElement(h.category[a.function] ?? "", h.category[b.function] ?? "")
    || byNullable(a.process_group, b.process_group)
    || byNullable(a.activity, b.activity)
    || (a.workflow < b.workflow ? -1 : a.workflow > b.workflow ? 1 : 0)
    || (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/** Each item with what its element feeds, from the element graph. Pure. */
export function withBlocks(items: readonly SkippedItem[], g: ElementGraph): SkippedItem[] {
  return items.map((i) => ({ ...i, blocks: downstream(g, i.element).map((n): Blocked => ({ element: n.element.id, name: n.element.name, records: [...new Set(n.evidence.flatMap((f) => (f.record ? [f.record] : [])))].sort() })) }));
}

/** Each function's APQC category and each catalog activity's process group, from the shipped data. */
export const hierarchyOf = (functions: readonly string[]): Effect.Effect<Hierarchy, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const category: Record<string, string> = {};
  for (const f of functions) category[f] = functionAgent(f).charter.apqc.split(" ")[0] ?? "";
  const group: Record<string, string> = {};
  for (const a of (yield* readCatalog()).activities) group[a.id] = a.process_group;
  return { category, group };
});

/** Everything left behind in a venture at `now`, with what each item blocks. */
export const skippedFor = (dir: string, now: string, only?: string): Effect.Effect<SkippedItem[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const workflows = yield* workflowsOf(dir, only);
  const items = skipped(workflows, yield* readRuns(dir), now, yield* hierarchyOf([...new Set(workflows.map((w) => w.function))]));
  return items.length ? withBlocks(items, buildGraph(yield* shippedInput())) : items;
});

export const HANDBACK_AGENT = "skipped-ledger";
/** The decision id that asks what to do with one item. */
export const handbackId = (item: Pick<SkippedItem, "id">): string => `skipped-${item.id.replace(/[/#]/g, "-")}`;

/**
 * Hands one item to a role for its recommendation, as one open decision. Refused for a role no agent brief exists
 * for. A decision already filed is left as it is, so a rerun asks nothing twice.
 */
export function handback(dir: string, item: SkippedItem, to?: string): DoorResult<{ decision: string; assigned_to: string; kept?: true }> {
  const role = to?.trim() || `${item.function}-agent`;
  if (!agentRoles().includes(role)) return { ok: false, error: `${role} is not a role to hand work to: one of ${agentRoles().join(", ")}` };
  const id = handbackId(item);
  const existing = decisionFile(dir, id);
  if (existing) return { ok: true, result: { decision: id, assigned_to: role, kept: true } };
  const blocks = item.blocks.length ? ` It blocks ${item.blocks.map((b) => `${b.element} ${b.name}`).join("; ")}.` : " The element graph knows of nothing downstream of it.";
  const r = propose(dir, {
    id,
    question: `What should happen to the skipped ${item.kind === "step" ? `step ${item.step} of ${item.workflow}` : `occurrence of ${item.workflow}`}?`,
    assigned_to: role,
    options: ["do-now", "defer", "drop"],
    note: `${item.title} ${item.why}${blocks} ${role} recommends one option and says why: do-now, defer with the date it will be done, or drop with the reason. A person decides.`,
  }, { agentId: HANDBACK_AGENT, via: "cli" });
  return r.ok ? { ok: true, result: { decision: id, assigned_to: role } } : { ok: false, error: r.error };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const valued = ["--at", "--function", "--to"];
  const [dir, cmd, target] = args.filter((a, i) => !a.startsWith("--") && !valued.includes(args[i - 1]));
  const at = flag("--at") ?? nowIso();
  const json = args.includes("--json");
  const usage = "usage: node packages/naive/src/engine/skipped.ts <venture dir> [--function <id>] [--at <iso>] [--json]\n       node packages/naive/src/engine/skipped.ts <venture dir> handback <item> [--to <role>]";
  const program: Effect.Effect<void, NaiveError, "naive/VentureFs"> = Effect.gen(function* () {
    if (!dir || Number.isNaN(Date.parse(at)) || (cmd !== undefined && cmd !== "handback") || (cmd === "handback" && !target)) return yield* new CannotRun({ message: usage });
    const now = new Date(at).toISOString();
    const found = yield* skippedFor(dir, now, flag("--function"));
    if (cmd === "handback") {
      const item = found.find((i) => i.id === target);
      if (!item) return yield* new Refused({ rule: "known-item", message: `${target} is not on the skipped ledger`, hint: `one of: ${found.map((i) => i.id).join(", ") || "none"}` });
      const r = handback(dir, item, flag("--to"));
      if (!r.ok) return yield* new CannotRun({ message: r.error });
      console.log(json ? JSON.stringify(r.result) : r.result.kept
        ? `${r.result.decision} already asks ${r.result.assigned_to} about ${item.id}, so nothing was filed.`
        : `filed ${r.result.decision}: ${r.result.assigned_to} recommends do-now, defer or drop for ${item.id}, and a person decides.`);
      return;
    }
    if (json) { console.log(JSON.stringify({ at: now, skipped: found }, null, 2)); return; }
    if (!found.length) { console.log("Nothing has been skipped: no occurrence was skipped and no run reported a step it left out."); return; }
    for (const i of found) {
      console.log(`${i.required ? "required" : "consider"}  ${i.element.padEnd(9)} ${i.id}`);
      console.log(`          ${i.why}`);
      // The ids only, because an element can feed a dozen others; --json carries each one's name and record types.
      if (i.blocks.length) console.log(`          blocks ${i.blocks.map((b) => b.element).join(", ")}`);
    }
    console.log(`\n${found.length} item${found.length === 1 ? "" : "s"} in hierarchical order. naive skipped handback <item> asks the owning function agent to recommend do-now, defer or drop; a person decides.`);
  });
  await runMain(program);
}
