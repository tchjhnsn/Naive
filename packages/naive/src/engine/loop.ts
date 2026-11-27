#!/usr/bin/env node
// The loop (EE-183): starts the function workflows that are due (packages/naive/src/engine/due.ts), as far as the
// venture's loop mode allows. A mode says how far the loop goes on its own:
//
//   manual  the loop starts nothing. A person starts a due workflow. This is the default.
//   ask     the loop files one open decision per due occurrence, "start it now?", and starts it once a person
//           answers start. An answer of skip records the occurrence as skipped.
//   auto    the loop starts it as its function agent.
//
// The mode is set in naive.config.json under `loops`: for the venture (`mode`), per function (`functions`) and per
// workflow (`workflows`). An open campaign or sprint (operations/time-boxes/<id>.json, EE-186) that covers a workflow
// and names a `loop_mode`, with the person who set it, sets the mode while it is open. The most specific one wins:
// workflow, then time box, then function, then venture, then manual. A workflow the venture's phase does not list as
// active is left alone unless a mode is set for that workflow by name or by a time box that covers it.
//
// No mode goes past the gate. Starting a workflow only starts its function agent (naive agent run, through
// NAIVE_AGENT_CMD): every write that agent makes still meets the gate as that role, a write the gate holds still
// waits as a draft for a person, and a one-way door is still a person's. There is no mode that skips this.
//
// A workflow whose last run failed is not started again on the loop's own word, in any mode but manual: the loop
// asks first. A tick holds a lock file, so two loops do not start the same workflow.
//
//   node packages/naive/src/engine/loop.ts <venture dir> [plan] [--at <iso>] [--json]   what a tick would do, ending with
//                                                                                       how much skipped work waits; writes nothing
//   node packages/naive/src/engine/loop.ts <venture dir> tick [--max <n>] [--at <iso>] [--json]
//   node packages/naive/src/engine/loop.ts <venture dir> watch [--every <duration>] [--max <n>]
//   node packages/naive/src/engine/loop.ts <venture dir> mode [<manual|ask|auto> [--function <id> | --workflow <function>/<workflow>] --by <person>]
//   naive loop [plan|tick|watch|mode ...]
//
// plan() and modeFor() are pure. Reading and writing files is an Effect through VentureFs (EE-125).

import { Duration, Effect, Schedule } from "effect";
import { readFileSync } from "node:fs";
import { VentureFs } from "../core/effect/fs.ts";
import { CannotRun, Refused } from "../core/effect/errors.ts";
import type { NaiveError } from "../core/effect/errors.ts";
import { runMain } from "../core/effect/run.ts";
import { actingAgent, agentFromEnv, record, withLockFileEffect } from "../core/provenance.ts";
import { envCommand } from "../core/runtime.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { main as agentMain } from "./agents/run.ts";
import { decisionFile, propose } from "./decisions.ts";
import { dueFor, recordRun, workflowsOf } from "./due.ts";
import type { CoveringBox, DueEntry } from "./due.ts";
import { CONFIG, readConfig, writeConfig } from "./naive-config.ts";
import { functionsOf } from "./research-programs.ts";
import { skippedFor } from "./skipped.ts";

export const MODES = ["manual", "ask", "auto"] as const;
export type LoopMode = typeof MODES[number];
/** `loops` in naive.config.json. */
export type LoopConfig = { mode?: LoopMode; functions?: Record<string, LoopMode>; workflows?: Record<string, LoopMode>; set_by?: { person: string; at: string } };
export type ModeFrom = "workflow" | "time-box" | "function" | "venture" | "default";
/** What a person said to the loop's question about one occurrence: the decision's status and answer. */
export type Asked = { status: string; answer: string | null };
export type LoopAction = "start" | "ask" | "wait" | "skip" | "leave" | "blocked";
export interface LoopStep {
  /** `<function>/<workflow>`. */
  readonly workflow: string,
  readonly role: string,
  readonly mode: LoopMode,
  /** Where the mode comes from. */
  readonly from: ModeFrom,
  readonly action: LoopAction,
  /** One sentence a person can read. */
  readonly why: string,
  /** The decision that asks about this occurrence, when the loop asks or has asked. */
  readonly decision: string | null,
  /** Why the workflow is due, from naive due. */
  readonly due: string,
}
/** A step and what the tick did with it. */
export interface LoopResult extends LoopStep { readonly did: "started-done" | "started-failed" | "asked" | "skipped" | "nothing" }
/** Starts one due workflow and returns its exit code. */
export type Starter = (dir: string, step: LoopStep) => number;

export const LOCK = ".naive/loop.lock";
export const ASKER = "loop";
export const isMode = (m: unknown): m is LoopMode => typeof m === "string" && (MODES as readonly string[]).includes(m);

/** The mode for one workflow: workflow, then the open time box that covers it, then function, then venture, then manual. A time box's mode counts only with the person who set it. */
export function modeFor(cfg: LoopConfig | undefined, workflow: string, box: CoveringBox | null = null): { mode: LoopMode; from: ModeFrom } {
  const fn = workflow.split("/")[0];
  const w = cfg?.workflows?.[workflow], f = cfg?.functions?.[fn];
  if (isMode(w)) return { mode: w, from: "workflow" };
  if (box && isMode(box.loop_mode) && box.set_by) return { mode: box.loop_mode, from: "time-box" };
  if (isMode(f)) return { mode: f, from: "function" };
  if (isMode(cfg?.mode)) return { mode: cfg.mode, from: "venture" };
  return { mode: "manual", from: "default" };
}

/** The decision id that asks about one occurrence of a due workflow. A new run, finished or failed, makes a new occurrence. */
export function askId(e: Pick<DueEntry, "workflow" | "last_done" | "last_failed">): string {
  const at = e.last_failed ?? e.last_done;
  return `run-${e.workflow.replace("/", "-")}-${at ? at.slice(0, 16).replace(/[^0-9t]/gi, "").toLowerCase() : "first"}`;
}

/** What a tick would do with each due workflow, in the order given. `canStart` is whether a harness is named to start an agent with. */
export function plan(entries: readonly DueEntry[], cfg: LoopConfig | undefined, asked: ReadonlyMap<string, Asked>, canStart: boolean): LoopStep[] {
  return entries.filter((e) => e.status === "due").map((e): LoopStep => {
    const { mode, from } = modeFor(cfg, e.workflow, e.time_box);
    const base = { workflow: e.workflow, role: e.role, mode, from, due: e.why };
    const where = from === "default" ? "no mode is set" : from === "time-box" && e.time_box ? `set by ${e.time_box.set_by ?? "a person"} for the ${e.time_box.kind} ${e.time_box.id}` : `set for the ${from}`;
    if (!e.in_phase && from !== "workflow" && from !== "time-box") return { ...base, action: "leave", decision: null, why: "The venture's phase does not list it as active, and no mode is set for this workflow by name or by an open time box." };
    if (mode === "manual") return { ...base, action: "leave", decision: null, why: `Its mode is manual (${where}): a person starts it.` };
    const start = (decision: string | null, why: string): LoopStep => canStart
      ? { ...base, action: "start", decision, why }
      : { ...base, action: "blocked", decision, why: `${why} NAIVE_AGENT_CMD names no agent harness, so nothing was started.` };
    if (mode === "auto" && !e.last_failed) return start(null, `Its mode is auto (${where}).`);
    const decision = askId(e);
    const said = asked.get(decision);
    const reason = e.last_failed ? `Its last run failed on ${e.last_failed.slice(0, 10)}, so the loop asks before it starts it again.` : `Its mode is ask (${where}).`;
    if (!said) return { ...base, action: "ask", decision, why: reason };
    if (said.status !== "decided") return { ...base, action: "wait", decision, why: `${reason} The decision ${decision} is ${said.status}.` };
    if (said.answer === "start") return start(decision, `A person answered start on ${decision}.`);
    if (said.answer === "skip") return { ...base, action: "skip", decision, why: `A person answered skip on ${decision}.` };
    return { ...base, action: "wait", decision, why: `The decision ${decision} is answered "${said.answer ?? ""}", which is neither start nor skip.` };
  });
}

/** `loops` from the venture's naive.config.json. */
export const loopConfig = (dir: string): Effect.Effect<LoopConfig | undefined, CannotRun> => Effect.try({
  try: () => (readConfig(dir) as { loops?: LoopConfig }).loops,
  catch: (cause) => new CannotRun({ message: cause instanceof Error ? cause.message : String(cause), cause }),
});

/** What a person has said to each question the loop could ask about these entries. */
const askedFor = (dir: string, entries: readonly DueEntry[]): Effect.Effect<Map<string, Asked>, CannotRun> => Effect.try({
  try: () => {
    const out = new Map<string, Asked>();
    for (const e of entries.filter((x) => x.status === "due")) {
      const id = askId(e), file = decisionFile(dir, id);
      if (!file) continue;
      const d: { status?: string; answer?: string | null } = JSON.parse(readFileSync(ventureFile(dir, file), "utf8"));
      out.set(id, { status: d.status ?? "open", answer: d.answer ?? null });
    }
    return out;
  },
  catch: (cause) => new CannotRun({ message: `cannot read the loop's decisions in ${dir}`, cause }),
});

/** What a tick would do at `now`. Writes nothing. */
export const planFor = (dir: string, now: string, canStart = envCommand("NAIVE_AGENT_CMD") !== undefined): Effect.Effect<LoopStep[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const entries = yield* dueFor(dir, now);
  return plan(entries, yield* loopConfig(dir), yield* askedFor(dir, entries), canStart);
});

/** Starts the workflow as its function agent through NAIVE_AGENT_CMD. */
export const startAgent: Starter = (dir, step) => agentMain(["run", step.role, `Run the workflow ${step.workflow} from start to end, as your workflows describe it. It is due: ${step.due}`, "--venture", dir]);

/**
 * One tick: plan, then ask, skip and start. Each started workflow is recorded in the run log as done or failed, by
 * its exit code, at the time `clock` gives when it ends. At most `max` workflows are started in one tick; the rest
 * wait for the next.
 */
export const tick = (dir: string, now: string, opts: { start?: Starter; max?: number; canStart?: boolean; clock?: () => string } = {}): Effect.Effect<LoopResult[], NaiveError, "naive/VentureFs"> => {
  const start = opts.start ?? startAgent, max = opts.max ?? Infinity;
  const clock = opts.clock ?? (() => new Date(Math.max(Date.parse(now), Date.now())).toISOString());
  const work = Effect.gen(function* () {
    const steps = yield* planFor(dir, now, opts.canStart ?? (opts.start !== undefined || envCommand("NAIVE_AGENT_CMD") !== undefined));
    const out: LoopResult[] = [];
    let started = 0;
    for (const s of steps) {
      if (s.action === "ask" && s.decision) {
        const id = s.decision;
        const asked = yield* Effect.try({
          try: () => propose(dir, { id, question: `Start ${s.workflow} now?`, note: `${s.due} ${s.why} Answer start and the loop starts it as ${s.role} on its next tick. Answer skip and this occurrence is recorded as skipped.`, options: ["start", "skip"] }, { agentId: ASKER, via: "cli" }),
          catch: (cause) => new CannotRun({ message: `cannot file ${id}`, cause }),
        });
        if (!asked.ok) return yield* new CannotRun({ message: `cannot file ${id}: ${asked.error}` });
        out.push({ ...s, did: "asked" });
      } else if (s.action === "skip") {
        yield* recordRun(dir, { workflow: s.workflow, at: now, outcome: "skipped", by: `decision ${s.decision}` });
        out.push({ ...s, did: "skipped" });
      } else if (s.action === "start" && started < max) {
        started++;
        const code = yield* Effect.try({ try: () => start(dir, s), catch: (cause) => cause }).pipe(Effect.orElseSucceed(() => 1));
        // The run is recorded when it ends, so the agent's own writes do not make its event workflow due again.
        yield* recordRun(dir, { workflow: s.workflow, at: clock(), outcome: code === 0 ? "done" : "failed", by: s.role });
        out.push({ ...s, did: code === 0 ? "started-done" : "started-failed" });
      } else out.push({ ...s, did: "nothing" });
    }
    return out;
  });
  return Effect.gen(function* () {
    const fs = yield* VentureFs;
    if (!(yield* fs.exists(ventureFile(dir, "venture.json")))) return yield* new CannotRun({ message: `no venture.json in ${dir}` });
    return yield* withLockFileEffect(ventureFile(dir, LOCK), work).pipe(
      Effect.mapError((e): NaiveError => e._tag === "IoError" && e.op === "lock" ? new Refused({ rule: "one-loop", message: "another loop tick is running in this venture", hint: `It holds ${LOCK}.` }) : e),
    );
  });
};

/** Ticks now and then again every `every`, until the process is stopped. A tick that fails is reported and the loop goes on. */
export const watch = (dir: string, every: Duration.Input, opts: { start?: Starter; max?: number; report?: (r: LoopResult[] | string) => void } = {}): Effect.Effect<void, never, "naive/VentureFs"> =>
  Effect.suspend(() => tick(dir, new Date().toISOString(), opts)).pipe(
    Effect.match({ onSuccess: (r) => opts.report?.(r), onFailure: (e) => opts.report?.(e.message) }),
    Effect.repeat(Schedule.spaced(every)),
    Effect.asVoid,
  );

/** A person sets a mode: for the venture, a function or a workflow. Refused for an acting agent and for a name the venture does not have. */
export const setMode = (dir: string, mode: string, o: { function?: string; workflow?: string; by?: string; at?: string }): Effect.Effect<LoopConfig, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  if (!isMode(mode)) return yield* new CannotRun({ message: `a mode is one of ${MODES.join(", ")}` });
  const by = o.by?.trim();
  if (!by) return yield* new Refused({ rule: "person-sets-mode", message: "a person sets the loop's mode", hint: "Name the person with --by." });
  const agent = actingAgent(by);
  if (agent) return yield* new Refused({ rule: "person-sets-mode", message: `a person sets the loop's mode, and ${agent} is acting` });
  if (o.function && o.workflow) return yield* new CannotRun({ message: "name a function or a workflow, not both" });
  if (o.function && !functionsOf(dir).includes(o.function)) return yield* new Refused({ rule: "known-function", message: `${o.function} is not a function this venture lists`, hint: `one of: ${functionsOf(dir).join(", ") || "none"}` });
  if (o.workflow) {
    const known = (yield* workflowsOf(dir)).map((w) => `${w.function}/${w.id}`);
    if (!known.includes(o.workflow)) return yield* new Refused({ rule: "known-workflow", message: `${o.workflow} is not a workflow of a function this venture lists`, hint: `one of: ${known.join(", ") || "none"}` });
  }
  return yield* Effect.try({
    try: () => {
      const cfg = readConfig(dir) as { loops?: LoopConfig };
      const loops: LoopConfig = { ...(cfg.loops ?? {}) };
      if (o.workflow) loops.workflows = { ...(loops.workflows ?? {}), [o.workflow]: mode };
      else if (o.function) loops.functions = { ...(loops.functions ?? {}), [o.function]: mode };
      else loops.mode = mode;
      loops.set_by = { person: by, at: o.at ?? new Date().toISOString() };
      writeConfig(dir, { ...cfg, loops } as Parameters<typeof writeConfig>[1]);
      record(dir, { entity: CONFIG, route: "system/naive-config", activity: "write", agent: agentFromEnv("person", "cli", { id: by }), note: `loop mode ${mode} for ${o.workflow ?? o.function ?? "the venture"}` } as Parameters<typeof record>[1]);
      return loops;
    },
    catch: (cause) => new CannotRun({ message: cause instanceof Error ? cause.message : String(cause), cause }),
  });
});

/** Problems in `loops`: a mode outside the three, a function or workflow the venture does not have, and a mode past manual with no person named. */
export function loopProblems(loops: LoopConfig | undefined, functions: readonly string[], workflows: readonly string[]): string[] {
  if (!loops) return [];
  const out: string[] = [];
  const all: [string, unknown][] = [["mode", loops.mode], ...Object.entries(loops.functions ?? {}).map(([k, v]): [string, unknown] => [`functions.${k}`, v]), ...Object.entries(loops.workflows ?? {}).map(([k, v]): [string, unknown] => [`workflows.${k}`, v])];
  for (const [k, v] of all) if (v !== undefined && !isMode(v)) out.push(`loops: ${k} is ${JSON.stringify(v)}, not one of ${MODES.join(", ")}`);
  for (const f of Object.keys(loops.functions ?? {})) if (!functions.includes(f)) out.push(`loops: functions names ${f}, which is not a function this venture lists`);
  for (const w of Object.keys(loops.workflows ?? {})) if (!workflows.includes(w)) out.push(`loops: workflows names ${w}, which is not a workflow of a function this venture lists`);
  if (all.some(([, v]) => v === "ask" || v === "auto") && !loops.set_by?.person?.trim()) out.push("loops: a mode of ask or auto counts only with set_by naming the person who set it");
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const valued = ["--at", "--max", "--every", "--function", "--workflow", "--by"];
  const [dir, cmd = "plan", arg] = args.filter((a, i) => !a.startsWith("--") && !valued.includes(args[i - 1]));
  const json = args.includes("--json");
  const at = flag("--at") ?? new Date().toISOString();
  const max = flag("--max") === undefined ? undefined : Number(flag("--max"));
  const usage = "usage: node packages/naive/src/engine/loop.ts <venture dir> [plan] [--at <iso>] [--json]\n       node packages/naive/src/engine/loop.ts <venture dir> tick [--max <n>] [--at <iso>] [--json]\n       node packages/naive/src/engine/loop.ts <venture dir> watch [--every <duration>] [--max <n>]\n       node packages/naive/src/engine/loop.ts <venture dir> mode [<manual|ask|auto> [--function <id> | --workflow <function>/<workflow>] --by <person>]";
  const line = (s: LoopStep, did?: string): string => `${(did && did !== "nothing" ? did : s.action).padEnd(15)} ${s.workflow.padEnd(44)} ${s.why}`;
  const program: Effect.Effect<void, NaiveError, "naive/VentureFs"> = Effect.gen(function* () {
    if (!dir || Number.isNaN(Date.parse(at)) || (max !== undefined && !(Number.isInteger(max) && max >= 0))) return yield* new CannotRun({ message: usage });
    const now = new Date(at).toISOString();
    if (cmd === "plan") {
      const steps = yield* planFor(dir, now);
      // Work the loop passed over is not due, so plan ends by naming it (EE-213): the loop never acts on it.
      const left = yield* skippedFor(dir, now);
      if (json) console.log(JSON.stringify({ at: now, steps, skipped: left.length }, null, 2));
      else {
        if (!steps.length) console.log("Nothing is due.");
        else for (const s of steps) console.log(line(s));
        if (left.length) console.log(`${"skipped".padEnd(15)} ${String(left.length).padEnd(44)} ${left.length === 1 ? "one item" : `${left.length} items`} of skipped work waiting: naive skipped lists them in hierarchical order.`);
      }
    } else if (cmd === "tick") {
      const done = yield* tick(dir, now, { max });
      if (json) console.log(JSON.stringify({ at: now, results: done }, null, 2));
      else if (!done.length) console.log("Nothing is due.");
      else for (const s of done) console.log(line(s, s.did));
    } else if (cmd === "watch") {
      const every = yield* Effect.fromOption(Duration.fromInput((flag("--every") ?? "15 minutes") as Duration.Input)).pipe(Effect.mapError(() => new CannotRun({ message: `--every takes a duration such as "15 minutes" or "1 hour"` })));
      yield* watch(dir, every, { max, report: (r) => { const t = new Date().toISOString(); if (typeof r === "string") console.error(`${t} ${r}`); else for (const s of r) console.log(`${t} ${line(s, s.did)}`); } });
    } else if (cmd === "mode") {
      if (arg === undefined) {
        const cfg = yield* loopConfig(dir);
        if (json) { console.log(JSON.stringify(cfg ?? {}, null, 2)); return; }
        for (const w of yield* workflowsOf(dir)) { const m = modeFor(cfg, `${w.function}/${w.id}`); console.log(`${m.mode.padEnd(7)} ${`${w.function}/${w.id}`.padEnd(44)} ${m.from === "default" ? "no mode is set" : `set for the ${m.from}`}`); }
        return;
      }
      const loops = yield* setMode(dir, arg, { function: flag("--function"), workflow: flag("--workflow"), by: flag("--by") });
      console.log(json ? JSON.stringify(loops, null, 2) : `loop mode ${arg} for ${flag("--workflow") ?? flag("--function") ?? "the venture"}, set by ${loops.set_by?.person}`);
    } else return yield* new CannotRun({ message: usage });
  });
  await runMain(program);
}
