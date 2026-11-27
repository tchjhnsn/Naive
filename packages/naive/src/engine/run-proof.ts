#!/usr/bin/env node
// Proof of work for function workflow runs (EE-227, docs/design/PROVING_WORK_2026-11-27.md). An agent's word that it
// finished a step is not evidence. A run carries a package, one result per step of its workflow, and this module
// checks each result against what the venture itself recorded: the provenance log (packages/naive/src/core/provenance.ts,
// hash-chained) and the blob store (packages/naive/src/core/blobs.ts). Nothing here trusts the run's own words except
// the reason it gives for leaving a step out, and that reason is reported as reasoned, never as proven.
//
// A step result (StepResult) says one of:
//   done               the step was done. Its evidence is the hash of every provenance line it wrote. Each must be a
//                      line of this venture's log, written under the step's session by the role that ran the run (or a
//                      specialist of its function), inside the step's time window, through the router, to a route the
//                      step may write (its `writes`, else its function's write reach), with its bytes in the blob
//                      store. A done step with no evidence, or with one line that fails, is unproven.
//   not-needed         only for a step with `consider` (EE-181): the run judged it not right for this business now,
//                      and says why. Reported as considered.
//   nothing-to-record  only for a step whose declared writes are all decisions/*: no decision was needed, and the run
//                      says why. Reported as reasoned.
//   skipped            the step was left out. It goes on the skipped ledger (packages/naive/src/engine/skipped.ts) and
//                      the run does not verify.
// A step with no result is missing, and the run does not verify. A run verifies when every step of its workflow is
// proven, considered or reasoned. A run that reports only step ids (`steps`, the older form) proves nothing.
//
// A run's step sessions are `run:<run id>/<step id>` (sessionOf). `naive workflow run` (packages/naive/src/engine/workflow-run.ts)
// sets each one, times each window itself and gathers the evidence from the log, so its runs are observed. A run
// recorded by hand with `naive due record --results` is reported: the evidence is still gathered from the log by
// session, but the window is the one the run states.
//
//   node packages/naive/src/engine/run-proof.ts <venture dir> [list] [--workflow <function>/<workflow>] [--json]
//   node packages/naive/src/engine/run-proof.ts <venture dir> verify <run id> [--json]
//   naive runs [list | verify <run id>]
//
// verifyRun is pure. Reading the venture is an Effect through VentureFs (EE-125). verify exits 1 on a run that does
// not verify, 2 on a bad call.

import { Effect } from "effect";
import { hasBlobEffect } from "../core/blobs.ts";
import { CannotRun, Refused } from "../core/effect/errors.ts";
import type { NaiveError } from "../core/effect/errors.ts";
import { runMain } from "../core/effect/run.ts";
import { entriesEffect, lineHash, type Entry } from "../core/provenance.ts";
import { functionOfAgent, functionWrites, specialistOfAgent, within } from "./agents/reach.ts";
import { readRuns, routeMatches, workflowsOf, type DueWorkflow, type WorkflowRun } from "./due.ts";
import type { FunctionWorkflow } from "../records/types/records.d.ts";

export type Step = FunctionWorkflow["steps"][number];
export type StepStatus = "done" | "not-needed" | "nothing-to-record" | "skipped";
/** One step's result, as a run's package carries it. */
export type StepResult = {
  step: string;
  status: StepStatus;
  /** Why a step was left out, not needed or had nothing to record. Required for those. */
  why?: string;
  /** The session the step's writes were made under, `run:<run id>/<step id>`. */
  session?: string;
  /** The step's window. An observed run's runner sets both. */
  started?: string;
  ended?: string;
  /** The hash of each provenance line the step wrote. */
  evidence?: string[];
};
export type StepVerdict = "proven" | "considered" | "reasoned" | "unproven" | "skipped" | "missing" | "not-allowed";
export type StepCheck = { step: string; verdict: StepVerdict; required: boolean; evidence: { hash: string; route: string | null; entity: string | null; activity: string | null; held: boolean }[]; problems: string[]; why: string | null };
export type RunVerdict = "verified" | "unverified" | "not-finished";
export type RunCheck = {
  run: string; workflow: string; at: string; by: string; observed: boolean; verdict: RunVerdict;
  steps: StepCheck[]; problems: string[];
  counts: Record<StepVerdict, number>;
};
/** What verification reads of the venture, gathered once. */
export type ProofFacts = { byHash: ReadonlyMap<string, Entry>; blob: (_sha256: string) => boolean; brokenAt: string | null };

/** The session a run's step writes under. */
export const sessionOf = (run: string, step: string): string => `run:${run}/${step}`;
/** The provenance activities that put work down: a held draft counts as work done, marked held. */
export const WORK = new Set(["write", "draft", "accept", "merge", "rollback", "confirm"]);
const OK: ReadonlySet<StepVerdict> = new Set(["proven", "considered", "reasoned"]);
const zero = (): Record<StepVerdict, number> => ({ proven: 0, considered: 0, reasoned: 0, unproven: 0, skipped: 0, missing: 0, "not-allowed": 0 });

/** Whether a role may stand for the run's runner: the runner itself, or a specialist of the runner's function. */
export function actsFor(runner: string, line: Entry): boolean {
  const id = line.agent?.id;
  if (runner === "person") return line.agent?.kind === "person";
  if (id === runner) return true;
  const fn = functionOfAgent(runner);
  return fn !== null && specialistOfAgent(id)?.function === fn;
}

/** The routes a step's evidence may be written to: its declared writes, else its runner's write reach. */
export function allowedRoutes(step: Step, runner: string): string[] {
  if (step.writes?.length) return [...step.writes];
  const fn = functionOfAgent(runner) ?? specialistOfAgent(runner)?.function ?? null;
  return fn ? functionWrites(fn) : ["decisions/*", "operations/handoff/*"];
}
const fits = (route: string, patterns: readonly string[]) => patterns.some((p) => routeMatches(p, route) || within(route, p));
const decisionStep = (s: Step) => !!s.writes?.length && s.writes.every((w) => w === "decisions/*" || w === "decisions");

/** The verdict on one step's result. Pure. */
export function verifyStep(step: Step, result: StepResult | undefined, run: { run: string; by: string; started: string | null; at: string }, facts: ProofFacts): StepCheck {
  const required = !step.consider;
  const out = (verdict: StepVerdict, problems: string[] = [], evidence: StepCheck["evidence"] = []): StepCheck => ({ step: step.id, verdict, required, evidence, problems, why: result?.why ?? null });
  if (!result) return out("missing", [`the run gave no result for ${step.id}`]);
  const why = (result.why ?? "").trim();
  if (result.status === "skipped") return out("skipped", [why ? `left out: ${why}` : "left out, with no reason given"]);
  if (result.status === "not-needed") {
    if (!step.consider) return out("not-allowed", [`${step.id} is a required step, so it cannot be judged not needed: do it or skip it`]);
    return why.length >= 12 ? out("considered") : out("not-allowed", ["a step judged not needed must say why, against the step's own when"]);
  }
  if (result.status === "nothing-to-record") {
    if (!decisionStep(step)) return out("not-allowed", [`${step.id} does not only feed decisions, so it must leave evidence: nothing-to-record is for a step whose writes are all decisions/*`]);
    return why.length >= 12 ? out("reasoned") : out("not-allowed", ["nothing-to-record must say why no decision was needed"]);
  }
  const session = result.session ?? sessionOf(run.run, step.id);
  const from = result.started ?? run.started, to = result.ended ?? run.at;
  const routes = allowedRoutes(step, run.by);
  const problems: string[] = [];
  const evidence: StepCheck["evidence"] = [];
  const hashes = result.evidence ?? [];
  if (!hashes.length) problems.push(`no evidence: the step wrote nothing through the router under session ${session}`);
  for (const h of hashes) {
    const line = facts.byHash.get(h);
    if (!line) { problems.push(`${h.slice(0, 12)} is no line of this venture's provenance log`); continue; }
    evidence.push({ hash: h, route: line.route ?? null, entity: line.entity ?? null, activity: line.activity, held: line.activity === "draft" });
    const where = `${line.entity} (${h.slice(0, 12)})`;
    if (!WORK.has(line.activity)) problems.push(`${where} is a ${line.activity}, which puts no work down`);
    if (line.agent?.session !== session) problems.push(`${where} was written under session ${line.agent?.session ?? "none"}, not ${session}`);
    if (!actsFor(run.by, line)) problems.push(`${where} was written by ${line.agent?.id ?? line.agent?.kind ?? "nobody named"}, not ${run.by} or a specialist of its function`);
    if (from && Date.parse(line.at) < Date.parse(from)) problems.push(`${where} was written at ${line.at}, before the step started at ${from}`);
    if (to && Date.parse(line.at) > Date.parse(to)) problems.push(`${where} was written at ${line.at}, after the step ended at ${to}`);
    if (!line.route) problems.push(`${where} did not go through the router`);
    else if (!fits(line.route, routes)) problems.push(`${where} went to ${line.route}, which the step may not write (${routes.join(", ")})`);
    if (!line.sha256 || !facts.blob(line.sha256)) problems.push(`${where} names bytes the blob store does not hold`);
    if (facts.brokenAt !== null && Date.parse(line.at) >= Date.parse(facts.brokenAt)) problems.push(`${where} sits after a break in the provenance chain at ${facts.brokenAt}`);
  }
  return problems.length ? out("unproven", problems, evidence) : out("proven", [], evidence);
}

/** The verdict on one run against its workflow. Pure. */
export function verifyRun(run: WorkflowRun, workflow: DueWorkflow | undefined, facts: ProofFacts): RunCheck {
  const id = run.run ?? `${run.workflow}@${run.at}`;
  const base = { run: id, workflow: run.workflow, at: run.at, by: run.by, observed: run.observed === true };
  if (run.outcome !== "done") return { ...base, verdict: "not-finished", steps: [], problems: [`the run ${run.outcome === "failed" ? "failed" : "was skipped by a person"}, so it claims no step`], counts: zero() };
  if (!workflow) return { ...base, verdict: "unverified", steps: [], problems: [`${run.workflow} is not a workflow of this venture's functions`], counts: zero() };
  if (!run.results) {
    return { ...base, verdict: "unverified", steps: [], counts: zero(),
      problems: [run.steps ? `the run names the steps it finished (${run.steps.join(", ") || "none"}) but gives no result or evidence for any of them, so nothing is proven` : "the run gives no step results, so nothing is proven"] };
  }
  const byStep = new Map(run.results.map((r) => [r.step, r]));
  const steps = (workflow.steps ?? []).map((s) => verifyStep(s, byStep.get(s.id), { run: id, by: run.by, started: run.started ?? null, at: run.at }, facts));
  const known = new Set((workflow.steps ?? []).map((s) => s.id));
  const problems = [
    ...run.results.filter((r) => !known.has(r.step)).map((r) => `a result names ${r.step}, which is no step of ${run.workflow}`),
    ...steps.filter((s) => !OK.has(s.verdict)).map((s) => `${s.step}: ${s.verdict}${s.problems.length ? `, ${s.problems[0]}` : ""}`),
  ];
  const counts = zero();
  for (const s of steps) counts[s.verdict]++;
  return { ...base, verdict: problems.length ? "unverified" : "verified", steps, problems, counts };
}

/** The first line whose hash does not chain from the line before, as its time, or null when the chain holds. Pure. */
export function chainBreak(lines: readonly Entry[]): string | null {
  // As check-provenance.ts reads it: the first line chains from "genesis", each next from the hash before it.
  let prev = "genesis";
  for (const l of lines) {
    if (l.prev !== prev || l.hash !== lineHash(l.prev ?? "", l as unknown as Record<string, unknown>)) return l.at ?? "";
    prev = l.hash ?? "";
  }
  return null;
}

/** The hashes of the provenance lines one step wrote, by its session, in log order. Pure. */
export const evidenceFor = (lines: readonly Entry[], session: string): string[] => lines.filter((l) => l.agent?.session === session && WORK.has(l.activity) && l.hash).map((l) => l.hash as string);

/** What verification reads of a venture: its provenance lines by hash, its blob store and where the chain breaks. */
export const proofFacts = (dir: string): Effect.Effect<ProofFacts, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const lines = yield* entriesEffect(dir);
  const shas = [...new Set(lines.map((l) => l.sha256).filter((s): s is string => typeof s === "string"))];
  const held = new Set<string>();
  for (const s of shas) if (yield* hasBlobEffect(dir, s)) held.add(s);
  return { byHash: new Map(lines.filter((l) => l.hash).map((l) => [l.hash as string, l])), blob: (s) => held.has(s), brokenAt: chainBreak(lines) };
});

/** Every run in the venture's log, checked, oldest first; with `workflow`, that workflow's only. */
export const verifyRuns = (dir: string, workflow?: string): Effect.Effect<RunCheck[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const flows = new Map((yield* workflowsOf(dir)).map((w) => [`${w.function}/${w.id}`, w]));
  const facts = yield* proofFacts(dir);
  return (yield* readRuns(dir)).filter((r) => workflow === undefined || r.workflow === workflow).map((r) => verifyRun(r, flows.get(r.workflow), facts));
});

/** One run, checked, by its id. */
export const verifyRunById = (dir: string, id: string): Effect.Effect<RunCheck, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const hit = (yield* verifyRuns(dir)).filter((r) => r.run === id);
  if (!hit.length) return yield* new Refused({ rule: "known-run", message: `the venture's run log has no run ${id}`, hint: "naive runs lists them" });
  return hit[hit.length - 1];
});

const mark = (v: StepVerdict) => (OK.has(v) ? "✓" : v === "skipped" || v === "missing" ? "○" : "✗");
export const runText = (r: RunCheck): string => [
  `${r.verdict === "verified" ? "verified" : r.verdict === "not-finished" ? "not finished" : "NOT VERIFIED"}  ${r.workflow}  run ${r.run}  ${r.at.slice(0, 16)}  by ${r.by}${r.observed ? " (observed)" : " (reported)"}`,
  ...r.steps.map((s) => `  ${mark(s.verdict)} ${s.step}: ${s.verdict}${s.evidence.length ? `, ${s.evidence.length} line${s.evidence.length === 1 ? "" : "s"}${s.evidence.some((e) => e.held) ? " (held for a person)" : ""}` : ""}${s.problems.length ? `\n      ${s.problems.join("\n      ")}` : s.why && s.verdict !== "proven" ? `\n      ${s.why}` : ""}`),
  ...(r.steps.length ? [] : r.problems.map((p) => `  ${p}`)),
].join("\n");

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const [dir, cmd = "list", id] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--workflow");
  const json = args.includes("--json");
  const flag = (k: string) => (args.includes(k) ? args[args.indexOf(k) + 1] : undefined);
  if (!dir || !["list", "verify"].includes(cmd) || (cmd === "verify" && !id)) {
    console.error("usage: node packages/naive/src/engine/run-proof.ts <venture dir> [list] [--workflow <function>/<workflow>] [--json]\n       node packages/naive/src/engine/run-proof.ts <venture dir> verify <run id> [--json]");
    process.exit(2);
  }
  await runMain(Effect.gen(function* () {
    if (cmd === "verify") {
      const r = yield* verifyRunById(dir, id as string);
      console.log(json ? JSON.stringify(r, null, 2) : runText(r));
      if (r.verdict !== "verified") process.exitCode = 1;
      return;
    }
    const all = yield* verifyRuns(dir, flag("--workflow"));
    if (json) { console.log(JSON.stringify(all, null, 2)); return; }
    if (!all.length) { console.log("no runs recorded"); return; }
    for (const r of all) console.log(runText(r));
  }).pipe(Effect.catchTag("ParseError", (e) => Effect.fail(new CannotRun({ message: `the venture's run log or provenance log cannot be read: ${e.message}`, cause: e })))));
}
