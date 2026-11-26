#!/usr/bin/env node
// What is due (EE-182). Every function workflow says what starts it (function-workflow.schema.json `trigger`):
// intake, a schedule, an event on a route, or a request. This reads those triggers for the functions a venture lists
// in venture.json departments, the venture's run log and its provenance log, and says which workflows are due now
// and why. It starts nothing: a person or the loop (not built) starts a due workflow as its function agent and then
// records the run.
//
//   intake    due until it has run once.
//   schedule  due when it has never run, or when the cadence has passed since its last finished run.
//   event     due when a record on its route went live after its last finished run. A draft held for a person does
//             not count until the person accepts it.
//   request   never due on its own: a lead or a person hands it off.
//
// A run is one line of <venture>/.naive/workflow-runs.jsonl. A failed run does not move a schedule: the workflow
// stays due. The phase module (packages/naive/src/phases/<id>/phase.json) lists the workflows active in the venture's
// phase, and each entry says whether its workflow is one of them.
//
//   node packages/naive/src/engine/due.ts <venture dir> [--at <iso>] [--function <id>] [--json]
//   node packages/naive/src/engine/due.ts <venture dir> record <function>/<workflow> [--outcome done|failed] [--by <who>] [--at <iso>]
//   naive due [record ...]
//
// due() is pure. Reading and writing files is an Effect through VentureFs (EE-125).

import { Effect } from "effect";
import { join } from "node:path";
import { VentureFs, readJson } from "../core/effect/fs.ts";
import { CannotRun, Refused } from "../core/effect/errors.ts";
import type { NaiveError } from "../core/effect/errors.ts";
import { runMain } from "../core/effect/run.ts";
import { entriesEffect } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { loadPhase } from "../phases/phases.ts";
import { functionAgent } from "./agents/function-spec.ts";
import { functionsOf } from "./research-programs.ts";

export const RUNS = ".naive/workflow-runs.jsonl";
/** The provenance activities that put a record's content live. A draft is not one: it waits for a person. */
export const LIVE = new Set(["write", "accept", "merge", "rollback"]);

export type Cadence = "daily" | "weekly" | "monthly" | "quarterly";
export type WorkflowTrigger = { kind: "intake" | "schedule" | "event" | "request"; cadence?: Cadence; route?: string };
/** The part of a function workflow this reads. */
export type DueWorkflow = { id: string; function: string; title: string; trigger: WorkflowTrigger };
/** One line of the run log. */
export type WorkflowRun = { workflow: string; at: string; outcome: "done" | "failed"; by: string };
/** A write the provenance log holds: the route written and when. */
export type Written = { route: string; at: string };
export type DueStatus = "due" | "not-due" | "on-request";
export interface DueEntry {
  /** `<function>/<workflow>`, the way a phase module names it. */
  readonly workflow: string,
  readonly function: string,
  readonly title: string,
  /** The role that runs it. */
  readonly role: string,
  readonly trigger: WorkflowTrigger,
  readonly status: DueStatus,
  /** One sentence a person can read. */
  readonly why: string,
  /** When it last finished, or null. */
  readonly last_done: string | null,
  /** For a schedule that has run: when it is next due. */
  readonly next_due: string | null,
  /** Whether the venture's phase lists it as active. */
  readonly in_phase: boolean,
}

/** The moment one cadence after `from`, in UTC. A month is a calendar month, and a day past the month's end is its last day. */
export function after(from: string, cadence: Cadence): string {
  const d = new Date(from);
  if (cadence === "daily" || cadence === "weekly") return new Date(d.getTime() + (cadence === "daily" ? 1 : 7) * 86_400_000).toISOString();
  const months = cadence === "monthly" ? 1 : 3;
  const day = d.getUTCDate();
  const first = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds(), d.getUTCMilliseconds()));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.toISOString();
}

/** Whether a written route matches a route pattern: `[id]` and `*` each stand for one segment. */
export function routeMatches(pattern: string, route: string): boolean {
  const p = pattern.split("/"), r = route.split("/");
  return p.length === r.length && p.every((seg, i) => seg === "*" || /^\[[^\]]+\]$/.test(seg) || seg === r[i]);
}

/** What is due at `now`, one entry per workflow, due ones first and then in the order given. */
export function due(workflows: readonly DueWorkflow[], runs: readonly WorkflowRun[], written: readonly Written[], now: string, active: ReadonlySet<string> = new Set()): DueEntry[] {
  const out = workflows.map((w): DueEntry => {
    const key = `${w.function}/${w.id}`;
    const mine = runs.filter((r) => r.workflow === key && r.at <= now);
    const last = mine.reduce<string | null>((m, r) => (m === null || r.at > m ? r.at : m), null);
    const last_done = mine.filter((r) => r.outcome === "done").reduce<string | null>((m, r) => (m === null || r.at > m ? r.at : m), null);
    const failed = last !== null && last !== last_done;
    const base = { workflow: key, function: w.function, title: w.title, role: `${w.function}-agent`, trigger: w.trigger, last_done, in_phase: active.has(key) };
    const t = w.trigger;
    if (t.kind === "request") return { ...base, status: "on-request", why: "It starts when a lead or a person hands it off.", next_due: null };
    if (t.kind === "intake") {
      return last_done
        ? { ...base, status: "not-due", why: `Intake ran on ${last_done.slice(0, 10)}.`, next_due: null }
        : { ...base, status: "due", why: failed ? "Intake has not finished: its last run failed." : "Intake has not run.", next_due: null };
    }
    if (t.kind === "schedule") {
      const cadence = t.cadence ?? "weekly";
      if (!last_done) return { ...base, status: "due", why: failed ? `It runs ${cadence} and its only runs failed.` : `It runs ${cadence} and has never run.`, next_due: null };
      const next_due = after(last_done, cadence);
      return next_due <= now
        ? { ...base, status: "due", why: `It runs ${cadence}, last finished on ${last_done.slice(0, 10)} and was due on ${next_due.slice(0, 10)}${failed ? "; its last run failed" : ""}.`, next_due }
        : { ...base, status: "not-due", why: `It runs ${cadence}, last finished on ${last_done.slice(0, 10)} and is next due on ${next_due.slice(0, 10)}.`, next_due };
    }
    const route = t.route ?? "";
    const hits = written.filter((e) => e.at <= now && (last_done === null || e.at > last_done) && routeMatches(route, e.route));
    return hits.length
      ? { ...base, status: "due", why: `${hits.length} ${hits.length === 1 ? "write" : "writes"} to ${route} since ${last_done ? `it last finished on ${last_done.slice(0, 10)}` : "the start"}, the latest to ${hits[hits.length - 1].route}.`, next_due: null }
      : { ...base, status: "not-due", why: `Nothing was written to ${route}${last_done ? ` since it last finished on ${last_done.slice(0, 10)}` : ""}.`, next_due: null };
  });
  return [...out.filter((e) => e.status === "due"), ...out.filter((e) => e.status !== "due")];
}

/** The workflows of the functions a venture lists, as its shipped function modules define them. */
export const workflowsOf = (dir: string, only?: string): Effect.Effect<DueWorkflow[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const out: DueWorkflow[] = [];
  for (const f of functionsOf(dir).filter((x) => only === undefined || x === only)) {
    const spec = functionAgent(f);
    for (const w of spec.workflows) out.push((yield* readJson(join(spec.module, "workflows", `${w}.json`))) as DueWorkflow);
  }
  return out;
});

/** The venture's run log, oldest first. A missing log is no runs. */
export const readRuns = (dir: string): Effect.Effect<WorkflowRun[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const file = ventureFile(dir, RUNS);
  if (!(yield* fs.exists(file))) return [];
  const text = yield* fs.readText(file);
  return text.split("\n").filter((l) => l.trim()).map((l): WorkflowRun => JSON.parse(l));
});

/** Record that a workflow ran. Refused for a workflow the venture's functions do not have. */
export const recordRun = (dir: string, run: WorkflowRun): Effect.Effect<WorkflowRun, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const known = (yield* workflowsOf(dir)).map((w) => `${w.function}/${w.id}`);
  if (!known.includes(run.workflow)) return yield* new Refused({ rule: "known-workflow", message: `${run.workflow} is not a workflow of a function this venture lists`, hint: `one of: ${known.join(", ") || "none"}` });
  const fs = yield* VentureFs;
  yield* fs.append(ventureFile(dir, RUNS), `${JSON.stringify(run)}\n`);
  return run;
});

/** What is due for a venture at `now`. */
export const dueFor = (dir: string, now: string, only?: string): Effect.Effect<DueEntry[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const venture = (yield* readJson(join(dir, "venture.json"))) as { phase?: string };
  const active = venture.phase ? new Set((yield* loadPhase(venture.phase)).workflows) : new Set<string>();
  const written = (yield* entriesEffect(dir)).flatMap((e) => (e.route && e.at && LIVE.has(e.activity) ? [{ route: e.route, at: e.at }] : []));
  return due(yield* workflowsOf(dir, only), yield* readRuns(dir), written, now, active);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const valued = ["--at", "--function", "--outcome", "--by"];
  const [dir, cmd, target] = args.filter((a, i) => !a.startsWith("--") && !valued.includes(args[i - 1]));
  const at = flag("--at") ?? new Date().toISOString();
  const usage = "usage: node packages/naive/src/engine/due.ts <venture dir> [--at <iso>] [--function <id>] [--json]\n       node packages/naive/src/engine/due.ts <venture dir> record <function>/<workflow> [--outcome done|failed] [--by <who>] [--at <iso>]";
  const program: Effect.Effect<void, NaiveError, "naive/VentureFs"> = Effect.gen(function* () {
    if (!dir || Number.isNaN(Date.parse(at)) || (cmd !== undefined && cmd !== "record") || (cmd === "record" && !target)) return yield* new CannotRun({ message: usage });
    const now = new Date(at).toISOString();
    if (cmd === "record") {
      const outcome = flag("--outcome") ?? "done";
      if (outcome !== "done" && outcome !== "failed") return yield* new CannotRun({ message: usage });
      const run = yield* recordRun(dir, { workflow: target, at: now, outcome, by: flag("--by") ?? process.env.MENTURA_ACTOR_ID ?? "person" });
      console.log(args.includes("--json") ? JSON.stringify(run) : `recorded ${run.workflow} ${run.outcome} at ${run.at} by ${run.by}`);
      return;
    }
    const found = yield* dueFor(dir, now, flag("--function"));
    if (args.includes("--json")) { console.log(JSON.stringify({ at: now, due: found }, null, 2)); return; }
    if (!found.length) console.log("The venture lists no functions in venture.json departments, so nothing is due.");
    for (const e of found) console.log(`${e.status.padEnd(10)} ${e.workflow.padEnd(44)} ${e.why}${e.in_phase ? "" : "  (not listed as active in this phase)"}`);
  });
  await runMain(program);
}
