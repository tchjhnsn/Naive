// Tests proof of work (EE-227): the pure verdicts on each kind of step result and each way a claim can be false, a run
// recorded by hand with a package, and `naive workflow run` driving a stand-in harness through the strategy intake
// step by step: what it wrote is proven, what it only said is not, a write under another session or by another role
// does not count, and a durable run killed mid-step resumes without running finished steps again.
//
//   node packages/naive/src/engine/run-proof-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSync } from "../core/effect/run.ts";
import { entriesEffect, type Entry } from "../core/provenance.ts";
import type { DueWorkflow, WorkflowRun } from "./due.ts";
import { chainBreak, sessionOf, verifyRun, verifyRuns, verifyStep, type ProofFacts, type Step } from "./run-proof.ts";
import { skippedFor } from "./skipped.ts";
import { runWorkflow } from "./workflow-run.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 900)}`}`); if (!ok) failed++; };
for (const k of ["MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_SESSION", "MENTURA_MODEL", "NAIVE_AGENT_CMD", "NAIVE_DURABLE_KILL"]) Reflect.deleteProperty(process.env, k);

// ---- The pure verdicts, on a stand-in log.
const line = (over: Partial<Entry>): Entry => ({ at: "2026-11-27T10:00:30.000Z", entity: "foundation/problem.json", route: "foundation/problem", activity: "write", agent: { kind: "agent", via: "cli", id: "strategy-agent", session: "run:r1/s" }, sha256: "aa", prev: "", hash: "h1", ...over } as Entry);
const facts = (lines: Entry[], blobs: string[] = ["aa"]): ProofFacts => ({ byHash: new Map(lines.map((l) => [l.hash as string, l])), blob: (s) => blobs.includes(s), brokenAt: null });
const run = { run: "r1", by: "strategy-agent", started: "2026-11-27T10:00:00.000Z", at: "2026-11-27T10:05:00.000Z" };
const step = (over: Partial<Step> = {}): Step => ({ id: "s", do: "Write the problem.", writes: ["foundation/problem"], ...over } as Step);
const done = (evidence: string[]) => ({ step: "s", status: "done" as const, session: "run:r1/s", started: run.started, ended: run.at, evidence });

expect("a step whose evidence is a line it wrote, in its window, under its session, to a route it may write, with its bytes kept, is proven",
  verifyStep(step(), done(["h1"]), run, facts([line({})])).verdict === "proven");
expect("a done step with no evidence is unproven: its word is not evidence",
  verifyStep(step(), done([]), run, facts([])).verdict === "unproven");
const lies: [string, Partial<Entry>, RegExp, string[]?][] = [
  ["a line under another session", { agent: { kind: "agent", via: "cli", id: "strategy-agent", session: "run:other/s" } }, /session/],
  ["a line another role wrote", { agent: { kind: "agent", via: "cli", id: "finance-agent", session: "run:r1/s" } }, /written by finance-agent/],
  ["a line written before the step started", { at: "2026-11-27T09:00:00.000Z" }, /before the step started/],
  ["a line written after the step ended", { at: "2026-11-27T11:00:00.000Z" }, /after the step ended/],
  ["a line to a route the step may not write", { route: "finance/spend/x" }, /may not write/],
  ["a line written outside the router", { route: undefined }, /did not go through the router/],
  ["a line whose bytes the blob store lacks", {}, /blob store/, []],
  ["a line that puts no work down", { activity: "gate" }, /puts no work down/],
];
for (const [name, over, why, blobs] of lies) {
  const v = verifyStep(step(), done(["h1"]), run, facts([line(over)], blobs));
  expect(`${name} does not prove the step`, v.verdict === "unproven" && v.problems.some((p) => why.test(p)), v);
}
expect("evidence that is no line of the log does not prove the step", /no line of this venture's provenance log/.test(verifyStep(step(), done(["zz"]), run, facts([line({})])).problems.join()));
expect("a worker of the runner's function, migrated from a specialist (strategy-specialist-pricing) or new (strategy-worker-pricing), stands for it",
  ["strategy-specialist-pricing", "strategy-worker-pricing"].every((id) => verifyStep(step(), done(["h1"]), run, facts([line({ agent: { kind: "agent", via: "cli", id, session: "run:r1/s" } })])).verdict === "proven"));
expect("a held draft is evidence of work, marked held", verifyStep(step(), done(["h1"]), run, facts([line({ activity: "draft" })])).evidence[0].held);
expect("with no declared writes, a write inside the function's reach fits", verifyStep(step({ writes: undefined }), done(["h1"]), run, facts([line({ route: "operations/handoff/x" })])).verdict === "proven");
expect("a required step cannot be judged not needed", verifyStep(step(), { step: "s", status: "not-needed", why: "we are too early for this" }, run, facts([])).verdict === "not-allowed");
expect("a step to consider judged not needed, with why, is considered",
  verifyStep(step({ consider: { why: "early", when: "after first revenue" } }), { step: "s", status: "not-needed", why: "the venture has no revenue yet" }, run, facts([])).verdict === "considered");
expect("not needed with no reason is not allowed", verifyStep(step({ consider: { why: "early", when: "later" } }), { step: "s", status: "not-needed" }, run, facts([])).verdict === "not-allowed");
expect("nothing to record is only for a step that feeds decisions",
  verifyStep(step(), { step: "s", status: "nothing-to-record", why: "no decision was needed at all" }, run, facts([])).verdict === "not-allowed"
  && verifyStep(step({ writes: ["decisions/*"] }), { step: "s", status: "nothing-to-record", why: "no decision was needed at all" }, run, facts([])).verdict === "reasoned");
expect("a skipped step and a step with no result are not proven",
  verifyStep(step(), { step: "s", status: "skipped", why: "no time" }, run, facts([])).verdict === "skipped" && verifyStep(step(), undefined, run, facts([])).verdict === "missing");

const flow = { id: "w", function: "strategy", title: "W", trigger: { kind: "request" }, steps: [step(), step({ id: "t", writes: ["decisions/*"] })] } as DueWorkflow;
const base: WorkflowRun = { workflow: "strategy/w", at: run.at, outcome: "done", by: "strategy-agent", run: "r1", started: run.started };
expect("a run verifies when every step is proven, considered or reasoned",
  verifyRun({ ...base, results: [done(["h1"]), { step: "t", status: "nothing-to-record", why: "nothing was left to decide" }] }, flow, facts([line({})])).verdict === "verified");
const one = verifyRun({ ...base, results: [done(["h1"])] }, flow, facts([line({})]));
expect("a run missing one step's result does not verify, and names it", one.verdict === "unverified" && one.problems.some((p) => /^t: missing/.test(p)), one);
const older = verifyRun({ workflow: "strategy/w", at: run.at, outcome: "done", by: "strategy-agent", steps: ["s", "t"] }, flow, facts([]));
expect("a run that only names the steps it finished proves nothing", older.verdict === "unverified" && /gives no result or evidence/.test(older.problems[0]), older);
expect("a failed run claims no step", verifyRun({ ...base, outcome: "failed" }, flow, facts([])).verdict === "not-finished");
expect("an intact chain has no break, and an edited line breaks it", chainBreak([]) === null && chainBreak([line({ prev: "x" })]) !== null);

// ---- End to end: a venture, a stand-in harness and the strategy intake.
const ws = mkdtempSync(join(tmpdir(), "run-proof-"));
const dir = join(ws, "v");
const count = join(ws, "count.json");
const harness = join(ws, "harness.ts");
// The stand-in agent: per step, what it does. It writes through the router as the role the runner set, under the
// session the runner set, and writes its result where the runner asked.
writeFileSync(harness, `
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { call } from ${JSON.stringify(join(repo, "packages/naive/src/router/router.ts"))};
const step = process.env.NAIVE_STEP;
const seen = existsSync(${JSON.stringify(count)}) ? JSON.parse(readFileSync(${JSON.stringify(count)}, "utf8")) : {};
seen[step] = (seen[step] ?? 0) + 1;
writeFileSync(${JSON.stringify(count)}, JSON.stringify(seen));
const say = (r) => writeFileSync(process.env.NAIVE_STEP_RESULT, JSON.stringify(r));
const write = (route, input) => call({ workspace: ${JSON.stringify(ws)}, venture: "v", route, action: "write", actor: "agent", actor_id: process.env.MENTURA_ACTOR_ID, input });
if (step === "pre-register-the-first-test") {
  const r = await write("foundation/pre-registration/first", { id: "first", status: "draft", thesis: { statement: "Solo founders pay for a weekly plan", falsified_if: "Fewer than two of ten pay" } });
  if (!r.ok) { console.error(r.error); process.exit(3); }
  say({ status: "done" });
} else if (step === "read-what-exists") say({ status: "done" });
else if (step === "ask-limits") say({ status: "not-needed", why: "the founder named no limits worth writing yet" });
else if (step === "summarize") say({ status: "nothing-to-record", why: "nothing in the intake needed a decision" });
else if (step === "ask-telos") {
  process.env.MENTURA_SESSION = "run:someone-else/ask-telos";
  await write("foundation/pre-registration/second", { id: "second", status: "draft", thesis: { statement: "A second thesis", falsified_if: "It fails" } });
  say({ status: "done" });
}
else say({ status: "skipped", why: "only the founder can answer it, and the founder was not reachable" });
`);
writeFileSync(join(ws, "v.json"), "{}");
try {
  const { mkdirSync } = await import("node:fs");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v", name: "V", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery", departments: ["strategy"] }));
  const lines: string[] = [];
  const r = await runWorkflow(dir, "strategy/intake", { harness: `${process.execPath} ${harness}`, log: (l) => lines.push(l) });
  const v = new Map(r.check.steps.map((s) => [s.step, s]));
  expect("the runner records the run with one result per step, observed", r.run.observed === true && r.run.results?.length === 7 && r.run.outcome === "done", r.run);
  expect("the step that wrote its record is proven from the log, with the evidence the runner gathered", v.get("pre-register-the-first-test")?.verdict === "proven" && (v.get("pre-register-the-first-test")?.evidence.length ?? 0) >= 1, v.get("pre-register-the-first-test"));
  expect("the step that only said done is unproven", v.get("read-what-exists")?.verdict === "unproven", v.get("read-what-exists"));
  expect("the step that wrote under another session has no evidence, so it is unproven", v.get("ask-telos")?.verdict === "unproven" && (v.get("ask-telos")?.evidence.length ?? 1) === 0, v.get("ask-telos"));
  expect("a step to consider judged not needed is considered, and the decision step with nothing to record is reasoned", v.get("ask-limits")?.verdict === "considered" && v.get("summarize")?.verdict === "reasoned");
  expect("the run does not verify, and says why step by step", r.check.verdict === "unverified" && r.check.counts.skipped === 2, r.check);
  const ledger = runSync(skippedFor(dir, new Date().toISOString()));
  expect("the skipped ledger lists the step claimed done but not proven, and not the proven one", ledger.some((i) => i.id === "strategy/intake#read-what-exists") && !ledger.some((i) => i.id === "strategy/intake#pre-register-the-first-test"), ledger.map((i) => i.id));
  const listed = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/run-proof.ts"), dir, "verify", r.run.run as string], { encoding: "utf8" });
  expect("naive runs verify exits 1 on a run that does not verify, naming the unproven steps", listed.status === 1 && /NOT VERIFIED/.test(listed.stdout) && /read-what-exists: unproven/.test(listed.stdout), listed.stdout + listed.stderr);

  // A run recorded by hand with a package: evidence is gathered by session, never listed by the agent.
  const results = join(ws, "results.json");
  writeFileSync(results, JSON.stringify([{ step: "pre-register-the-first-test", status: "done" }]));
  const at = new Date().toISOString();
  const rec = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/due.ts"), dir, "record", "strategy/intake", "--run", "hand", "--started", "2026-01-01T00:00:00.000Z", "--results", results, "--by", "strategy-agent", "--json"], { encoding: "utf8" });
  const hand = JSON.parse(rec.stdout || "{}") as WorkflowRun;
  expect("a hand-recorded run takes its results from a file, reported, with no evidence under a session nobody wrote", rec.status === 0 && hand.observed === false && hand.results?.[0].evidence?.length === 0 && hand.at >= at, rec.stdout + rec.stderr);
  const all = runSync(verifyRuns(dir));
  expect("every run in the log is checked", all.length === 2 && all.every((x) => x.verdict === "unverified"), all.map((x) => x.verdict));

  // Durable: a run killed right after a step resumes, and the steps before it are not run again.
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ durable: { engine: "sqlite" } }));
  rmSync(count, { force: true });
  const marker = join(ws, "killed");
  const script = join(ws, "drive.ts");
  writeFileSync(script, `import { runWorkflow } from ${JSON.stringify(join(repo, "packages/naive/src/engine/workflow-run.ts"))};\nconst r = await runWorkflow(${JSON.stringify(dir)}, "strategy/intake", { harness: ${JSON.stringify(`${process.execPath} ${harness}`)}, log: () => {} });\nconsole.log(JSON.stringify({ run: r.run.run, results: r.run.results.length }));\n`);
  const killed = spawnSync(process.execPath, [script], { encoding: "utf8", env: { ...process.env, NAIVE_DURABLE_KILL: `step/ask-telos:${marker}` } });
  const resumed = spawnSync(process.execPath, [script], { encoding: "utf8" });
  const seen = existsSync(count) ? JSON.parse(readFileSync(count, "utf8")) as Record<string, number> : {};
  expect("a run killed after a step resumes and finishes, recording every result once",
    killed.status !== 0 && existsSync(marker) && resumed.status === 0 && JSON.parse(resumed.stdout.trim().split("\n").at(-1) ?? "{}").results === 7, { killed: killed.stderr.slice(-300), resumed: resumed.stdout + resumed.stderr });
  expect("steps finished before the crash ran once; the interrupted step ran again", seen["read-what-exists"] === 1 && seen["pre-register-the-first-test"] === 1 && seen["ask-telos"] === 2 && seen["summarize"] === 1, seen);
  const evidenceLines = runSync(entriesEffect(dir)).filter((l) => l.agent?.session === sessionOf("x", "y"));
  expect("no line names a session the runner did not set", evidenceLines.length === 0);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("run-proof: all passed");
