#!/usr/bin/env node
// Running a function workflow step by step, observed (EE-227, docs/design/PROVING_WORK_2026-11-27.md). Each step of the
// workflow is one activity of an Effect workflow (effect/workflow), keyed by the venture, the workflow and the run:
// the runner starts the agent harness (NAIVE_AGENT_CMD) on that one step under the session `run:<run>/<step>`,
// notes when the step started and ended, and when the harness returns it gathers the step's evidence from the
// provenance log itself, every line written under that session. The agent says only what it did (done, not-needed,
// nothing-to-record or skipped, with why) in the file NAIVE_STEP_RESULT names; it never lists its own evidence.
// When every step has returned, the run and its package go into the run log (.naive/workflow-runs.jsonl) as one more
// activity, and the run is checked (packages/naive/src/engine/run-proof.ts).
//
// With durable.engine sqlite or postgres in naive.config.json, a run that dies resumes: a finished step is not run
// again, and the open run stays in .naive/durable-runs/ until the run is recorded. With memory, the default, nothing
// survives the process.
//
//   node packages/naive/src/engine/workflow-run.ts <venture dir> <function>/<workflow> [--as <role>] [--print] [--json]
//   naive workflow run <function>/<workflow>
//
// A blocked workflow is refused (EE-217), and so is a run with no NAIVE_AGENT_CMD, which prints each step's prompt
// with --print instead. A harness that exits non-zero without writing a result fails the run, which keeps the steps
// before it. Exit 0 when the run verifies, 1 when it does not or failed, 2 on a bad call.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { activityStep, closeRun, engineLayer, openRun, runDurable, type DurableEngine } from "../core/effect/durable.ts";
import { runSync } from "../core/effect/run.ts";
import { entriesEffect } from "../core/provenance.ts";
import { envCommand } from "../core/runtime.ts";
import { agentBrief } from "./agents/brief.ts";
import { agentPrompt } from "./agents/run.ts";
import { recordRun, workflowsOf, type DueWorkflow, type WorkflowRun } from "./due.ts";
import { prerequisitesOf } from "./prerequisites.ts";
import { evidenceFor, runText, sessionOf, verifyRunById, type RunCheck, type Step, type StepResult } from "./run-proof.ts";

export type WorkflowRunOptions = { role?: string; harness?: string | null; engine?: DurableEngine; log?: (_line: string) => void };
export type WorkflowRunResult = { run: WorkflowRun; check: RunCheck };

const STATUSES = new Set(["done", "not-needed", "nothing-to-record", "skipped"]);

/** The task one step hands the agent: the workflow, its goal, the step, and how to report it. Pure. */
export function stepTask(flow: DueWorkflow & { goal?: string }, step: Step, session: string): string {
  return [
    `Run one step of ${flow.function}/${flow.id}, "${flow.title}"${flow.goal ? `, whose goal is: ${flow.goal}` : ""}.`,
    `The step is ${step.id}${step.activity ? ` (APQC ${step.activity})` : ""}: ${step.do}`,
    step.skill ? `Its skill is ${step.skill}.` : "",
    step.consider ? `This step is one to consider: ${step.consider.why} Do it when ${step.consider.when}` : "",
    `Proof of work: this step is checked against the venture's provenance log, not against your word. Every record you write through naive in this step is written under the session ${session}, which this run sets for you, and only those writes count as its evidence. Write the step's output as records (the routes the step names, else a handoff or a decision), or it is not proven.`,
    `When you finish, write a JSON object to the file named by NAIVE_STEP_RESULT: {"status": "done"} when you did the step, {"status": "not-needed", "why": "..."} when it is a step to consider and its when does not hold for this business, {"status": "nothing-to-record", "why": "..."} when the step only feeds decisions and none was needed, or {"status": "skipped", "why": "..."} when you could not do it. Never claim done for work you did not write down.`,
  ].filter(Boolean).join("\n\n");
}

/** One step: the harness run under the step's session, timed by the runner, its evidence read from the log. */
export function runStep(dir: string, flow: DueWorkflow, step: Step, run: string, role: string, harness: string): StepResult & { failed?: string } {
  const session = sessionOf(run, step.id);
  const file = join(dir, ".naive", "runs", run, `${step.id}.json`);
  mkdirSync(join(dir, ".naive", "runs", run), { recursive: true });
  rmSync(file, { force: true });
  const b = agentBrief(role, dir);
  if (b instanceof Error) return { step: step.id, status: "skipped", why: `no brief for ${role}: ${b.message}`, session, failed: b.message };
  const prompt = agentPrompt({ ...b, workflows: (b.workflows ?? []).filter((w) => w.id === flow.id) }, stepTask(flow, step, session), dir);
  const started = new Date().toISOString();
  const [bin, ...args] = harness.trim().split(/\s+/);
  const p = spawnSync(bin, args, { input: prompt, stdio: ["pipe", "inherit", "inherit"], cwd: dir, env: { ...process.env, MENTURA_ACTOR_ID: role, MENTURA_SESSION: session, NAIVE_RUN: run, NAIVE_STEP: step.id, NAIVE_STEP_RESULT: file } });
  const ended = new Date().toISOString();
  if (p.error) return { step: step.id, status: "skipped", why: `the harness did not start: ${p.error.message}`, session, started, ended, failed: p.error.message };
  let said: { status?: unknown; why?: unknown } | null = null;
  if (existsSync(file)) { try { said = JSON.parse(readFileSync(file, "utf8")) as { status?: unknown; why?: unknown }; } catch { said = { status: "skipped", why: "the step's result file is not JSON" }; } }
  if (!said && p.status !== 0) return { step: step.id, status: "skipped", why: `the harness exited with ${p.status} and reported no result`, session, started, ended, failed: `exit ${p.status}` };
  const status = (said && STATUSES.has(String(said.status)) ? said.status : said ? "skipped" : "done") as StepResult["status"];
  const why = typeof said?.why === "string" ? said.why : said && !STATUSES.has(String(said.status)) ? `the result named no known status (${String(said.status)})` : undefined;
  const evidence = status === "done" ? evidenceFor(runSync(entriesEffect(dir)), session) : [];
  return { step: step.id, status, ...(why ? { why } : {}), session, started, ended, ...(status === "done" ? { evidence } : {}) };
}

/** Runs one workflow of the venture step by step through the harness, records the run with its package, and checks it. */
export async function runWorkflow(dir: string, key: string, { role, harness = envCommand("NAIVE_AGENT_CMD"), engine, log = console.log }: WorkflowRunOptions = {}): Promise<WorkflowRunResult> {
  dir = resolve(dir);
  const flow = runSync(workflowsOf(dir)).find((w) => `${w.function}/${w.id}` === key);
  if (!flow) throw new Error(`${key} is not a workflow of a function this venture lists`);
  const prereq = prerequisitesOf(dir, key);
  if (!prereq.met) throw new Error(`${key} is blocked, so it was not run: ${prereq.missing.map((m) => m.why).join("; ")}. Run naive blocked to see what unblocks it first.`);
  if (!harness) throw new Error("no NAIVE_AGENT_CMD is set, so no agent can run the steps: set it (for example \"claude -p\"), or pass --print to see each step's prompt");
  const actor = role ?? `${flow.function}-agent`;
  const { Effect, Layer, Schema } = await import("effect");
  const Workflow = await import("effect/workflow/Workflow");
  const toStep = await activityStep();
  const run = openRun(dir, "workflows", key);
  const Flow = Workflow.make("naive/workflow-run", {
    payload: { dir: Schema.String, workflow: Schema.String, run: Schema.String },
    success: Schema.String,
    idempotencyKey: (p) => `${p.dir}#${p.workflow}#${p.run}`,
  });
  const FlowLive = Flow.toLayer(Effect.fn(function* () {
    const context = yield* Effect.context<import("effect/workflow/WorkflowEngine").WorkflowEngine | import("effect/workflow/WorkflowEngine").WorkflowInstance>();
    const step = toStep(context);
    const recorded = yield* Effect.promise(async () => {
      const started = await step("started", async () => new Date().toISOString());
      const results: StepResult[] = [];
      let failed: string | null = null;
      for (const s of flow.steps ?? []) {
        const r = await step(`step/${s.id}`, async () => runStep(dir, flow, s, run, actor, harness));
        const { failed: why, ...result } = r;
        log(`${s.id}: ${result.status}${result.evidence ? `, ${result.evidence.length} line${result.evidence.length === 1 ? "" : "s"} of evidence` : ""}${result.why ? ` (${result.why})` : ""}`);
        results.push(result);
        if (why) { failed = why; break; }
      }
      return step("record", async () => runSync(recordRun(dir, { workflow: key, at: new Date().toISOString(), outcome: failed ? "failed" : "done", by: actor, run, started, results, observed: true })));
    });
    return JSON.stringify(recorded);
  }));
  const out = await runDurable(FlowLive.pipe(Layer.provideMerge(await engineLayer(dir, "workflows", engine))), Flow.execute({ dir, workflow: key, run }));
  closeRun(dir, "workflows", key);
  const recorded = JSON.parse(out) as WorkflowRun;
  return { run: recorded, check: runSync(verifyRunById(dir, run)) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  const [dir, key] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--as");
  if (!dir || !key || !key.includes("/")) { console.error("usage: node packages/naive/src/engine/workflow-run.ts <venture dir> <function>/<workflow> [--as <role>] [--print] [--json]"); process.exit(2); }
  try {
    if (args.includes("--print")) {
      const flow = runSync(workflowsOf(resolve(dir))).find((w) => `${w.function}/${w.id}` === key);
      if (!flow) throw new Error(`${key} is not a workflow of a function this venture lists`);
      for (const s of flow.steps ?? []) console.log(`--- ${s.id}\n${stepTask(flow, s, sessionOf("<run>", s.id))}\n`);
      process.exit(0);
    }
    const r = await runWorkflow(dir, key, { role: flag("--as") });
    console.log(args.includes("--json") ? JSON.stringify(r.check, null, 2) : runText(r.check));
    process.exit(r.check.verdict === "verified" ? 0 : 1);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
