// Tests the loop (EE-183): the mode for a workflow, the plan for each mode, and ticks over one venture folder made
// here, with a stand-in starter in place of an agent harness.
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runSync } from "../core/effect/run.ts";
import { approve, decisionFile } from "./decisions.ts";
import { dueFor, readRuns } from "./due.ts";
import type { DueEntry } from "./due.ts";
import { askId, loopProblems, modeFor, plan, planFor, setMode, tick } from "./loop.ts";
import type { Asked, LoopConfig, LoopStep } from "./loop.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
for (const k of ["NAIVE_AGENT_CMD", "MENTURA_ACTOR", "MENTURA_ACTOR_ID", "MENTURA_MODEL"]) Reflect.deleteProperty(process.env, k);

const cfg: LoopConfig = { mode: "ask", functions: { f: "auto" }, workflows: { "f/slow": "manual" } };
expect("the workflow's mode wins, then the function's, then the venture's, then manual", modeFor(cfg, "f/slow").mode === "manual" && modeFor(cfg, "f/slow").from === "workflow" && modeFor(cfg, "f/fast").mode === "auto" && modeFor(cfg, "f/fast").from === "function" && modeFor(cfg, "g/any").mode === "ask" && modeFor(cfg, "g/any").from === "venture" && modeFor(undefined, "g/any").mode === "manual" && modeFor(undefined, "g/any").from === "default");

const entry = (id: string, over: Partial<DueEntry> = {}): DueEntry => ({ workflow: `f/${id}`, function: "f", title: id, role: "f-agent", trigger: { kind: "schedule", cadence: "weekly" }, status: "due", why: "It runs weekly and has never run.", last_done: null, last_failed: null, next_due: null, in_phase: true, ...over });
expect("the question about an occurrence is named by the workflow and its last run", askId(entry("w")) === "run-f-w-first" && askId(entry("w", { last_done: "2026-06-08T09:30:00.000Z" })) === "run-f-w-20260608t0930" && askId(entry("w", { last_done: "2026-06-08T09:30:00.000Z", last_failed: "2026-06-14T10:00:00.000Z" })) === "run-f-w-20260614t1000");

const none = new Map<string, Asked>();
const one = (e: DueEntry, c: LoopConfig | undefined, asked = none, canStart = true): LoopStep => plan([e], c, asked, canStart)[0];
expect("a workflow that is not due is not in the plan", plan([entry("w", { status: "not-due" }), entry("r", { status: "on-request" })], { mode: "auto" }, none, true).length === 0);
expect("with no mode set the loop leaves a due workflow to a person", one(entry("w"), undefined).action === "leave" && one(entry("w"), { mode: "manual" }).action === "leave");
expect("auto starts it", one(entry("w"), { mode: "auto" }).action === "start" && one(entry("w"), { mode: "auto" }).decision === null);
expect("ask files a question first", one(entry("w"), { mode: "ask" }).action === "ask" && one(entry("w"), { mode: "ask" }).decision === "run-f-w-first");
expect("and waits while the question is open", one(entry("w"), { mode: "ask" }, new Map([["run-f-w-first", { status: "open", answer: null }]])).action === "wait");
expect("a person's start starts it and a person's skip skips it", one(entry("w"), { mode: "ask" }, new Map([["run-f-w-first", { status: "decided", answer: "start" }]])).action === "start" && one(entry("w"), { mode: "ask" }, new Map([["run-f-w-first", { status: "decided", answer: "skip" }]])).action === "skip");
expect("any other answer waits", one(entry("w"), { mode: "ask" }, new Map([["run-f-w-first", { status: "decided", answer: "later" }]])).action === "wait");
expect("a workflow the phase does not list is left alone, unless a mode names that workflow", one(entry("w", { in_phase: false }), { mode: "auto", functions: { f: "auto" } }).action === "leave" && one(entry("w", { in_phase: false }), { workflows: { "f/w": "auto" } }).action === "start");
const broke = entry("w", { last_done: "2026-06-01T00:00:00.000Z", last_failed: "2026-06-14T00:00:00.000Z" });
expect("auto asks before it starts a workflow whose last run failed", one(broke, { mode: "auto" }).action === "ask" && /failed/.test(one(broke, { mode: "auto" }).why) && one(broke, { mode: "manual" }).action === "leave");
expect("with no agent harness a start is blocked and says why", one(entry("w"), { mode: "auto" }, none, false).action === "blocked" && /NAIVE_AGENT_CMD/.test(one(entry("w"), { mode: "auto" }, none, false).why));

expect("a config check finds a mode outside the three, an unknown function or workflow, and a mode past manual with no person", loopProblems({ mode: "bypass" as "auto" }, [], []).length === 1 && loopProblems({ functions: { g: "manual" } }, ["f"], []).length === 1 && loopProblems({ workflows: { "f/x": "manual" } }, ["f"], ["f/w"]).length === 1 && loopProblems({ mode: "auto" }, [], []).length === 1 && loopProblems({ mode: "auto", set_by: { person: "Ada", at: "2026-06-01" } }, [], []).length === 0 && loopProblems({ mode: "manual" }, [], []).length === 0);

// One venture folder: two functions in Discovery, read from the shipped function modules.
const dir = mkdtempSync(join(tmpdir(), "naive-loop-"));
try {
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v", name: "V", phase: "discovery", departments: ["strategy", "customer-service"] }));
  const t1 = "2026-06-15T00:00:00.000Z", t2 = "2026-06-15T01:00:00.000Z", t3 = "2026-06-15T02:00:00.000Z", t4 = "2026-06-15T03:00:00.000Z";
  const started: string[] = [];
  const ok = (_d: string, s: LoopStep) => { started.push(s.workflow); return 0; };
  const by = (list: readonly { workflow: string }[]) => Object.fromEntries(list.map((e) => [e.workflow, e])) as Record<string, LoopStep & { did?: string }>;
  const wasDue = runSync(dueFor(dir, t1)).filter((e) => e.status === "due").length;

  const quiet = runSync(tick(dir, t1, { start: ok }));
  expect("with no mode set a tick starts nothing, asks nothing and records nothing", quiet.length === wasDue && quiet.every((s) => s.action === "leave" && s.did === "nothing") && started.length === 0 && runSync(readRuns(dir)).length === 0 && !existsSync(join(dir, "decisions")), quiet);
  expect("and it leaves no lock behind", !existsSync(join(dir, ".naive/loop.lock")));

  const refuse = (f: () => unknown): string => { try { f(); return ""; } catch (e) { return (e as Error).message; } };
  expect("setting a mode needs a person's name", /person sets/.test(refuse(() => runSync(setMode(dir, "ask", {})))));
  process.env.MENTURA_ACTOR = "agent";
  expect("an acting agent may not set a mode", /is acting/.test(refuse(() => runSync(setMode(dir, "auto", { by: "Ada" })))) && !existsSync(join(dir, "naive.config.json")));
  Reflect.deleteProperty(process.env, "MENTURA_ACTOR");
  expect("a mode outside the three, a function and a workflow the venture lacks are refused", /one of manual/.test(refuse(() => runSync(setMode(dir, "bypass", { by: "Ada" })))) && /finance is not a function/.test(refuse(() => runSync(setMode(dir, "ask", { by: "Ada", function: "finance" })))) && /strategy\/nope is not a workflow/.test(refuse(() => runSync(setMode(dir, "ask", { by: "Ada", workflow: "strategy/nope" })))));
  const set = runSync(setMode(dir, "ask", { by: "Ada", function: "strategy", at: t1 }));
  const written = JSON.parse(readFileSync(join(dir, "naive.config.json"), "utf8")) as { loops: LoopConfig };
  expect("a person's mode is written to naive.config.json with who set it, and logged", set.functions?.strategy === "ask" && written.loops.functions?.strategy === "ask" && written.loops.set_by?.person === "Ada" && /loop mode ask for strategy/.test(readFileSync(join(dir, "provenance.jsonl"), "utf8")), written);

  const asked = by(runSync(tick(dir, t1, { start: ok })));
  const q = "run-strategy-intake-first";
  const file = decisionFile(dir, q);
  const dec = file ? JSON.parse(readFileSync(join(dir, file), "utf8")) as { status: string; options: string[]; question: string } : null;
  expect("ask mode files one open decision per due occurrence, with start and skip as options", asked["strategy/intake"].did === "asked" && dec?.status === "open" && dec.options.join() === "start,skip" && /strategy\/intake/.test(dec.question) && started.length === 0, { asked: asked["strategy/intake"], dec });
  expect("the other function keeps its own mode", asked["customer-service/weekly-contact-review"].action === "leave");
  const again = by(runSync(tick(dir, t1, { start: ok })));
  expect("a second tick waits on the open decision and files nothing new", again["strategy/intake"].action === "wait" && again["strategy/intake"].did === "nothing" && started.length === 0);

  const yes = approve(dir, q, { by: "Ada", answer: "start" });
  const ran = by(runSync(tick(dir, t2, { start: ok, clock: () => t2 })));
  const runs = runSync(readRuns(dir));
  expect("after a person answers start, the next tick starts it as its function agent and records the run", yes.ok && ran["strategy/intake"].did === "started-done" && started.join() === "strategy/intake" && runs.some((r) => r.workflow === "strategy/intake" && r.outcome === "done" && r.by === "strategy-agent" && r.at === t2), { yes, ran: ran["strategy/intake"], runs });
  expect("and it is no longer due", !runSync(planFor(dir, t3, true)).some((s) => s.workflow === "strategy/intake"));

  // Auto for one workflow by name, which Discovery does not list as active. Its first run fails.
  runSync(setMode(dir, "auto", { by: "Ada", workflow: "customer-service/intake", at: t2 }));
  const fail = by(runSync(tick(dir, t2, { start: () => 1, clock: () => t2 })));
  expect("auto starts a workflow named by its own mode, and a start that fails is recorded as failed", fail["customer-service/intake"].action === "start" && fail["customer-service/intake"].did === "started-failed" && runSync(readRuns(dir)).some((r) => r.workflow === "customer-service/intake" && r.outcome === "failed"));
  const retry = by(runSync(tick(dir, t3, { start: ok, clock: () => t3 })));
  const rq = retry["customer-service/intake"].decision ?? "";
  expect("the next tick does not start it again: it asks", retry["customer-service/intake"].did === "asked" && rq === "run-customer-service-intake-20260615t0100" && !started.includes("customer-service/intake"), retry["customer-service/intake"]);
  const no = approve(dir, rq, { by: "Ada", answer: "skip" });
  const skipped = by(runSync(tick(dir, t4, { start: ok, clock: () => t4 })));
  expect("a person's skip is recorded as skipped and settles the occurrence", no.ok && skipped["customer-service/intake"].did === "skipped" && runSync(readRuns(dir)).some((r) => r.workflow === "customer-service/intake" && r.outcome === "skipped" && r.by === `decision ${rq}`) && !runSync(planFor(dir, "2026-06-15T04:00:00.000Z", true)).some((s) => s.workflow === "customer-service/intake"), { no, s: skipped["customer-service/intake"] });

  // Auto for the whole venture and for two workflows by name: each due one starts, at most max in one tick.
  runSync(setMode(dir, "auto", { by: "Ada", at: t4 }));
  runSync(setMode(dir, "auto", { by: "Ada", function: "strategy", at: t4 }));
  for (const w of ["strategy/competitor-review", "customer-service/weekly-contact-review"]) runSync(setMode(dir, "auto", { by: "Ada", workflow: w, at: t4 }));
  const want = runSync(planFor(dir, t4, true)).filter((s) => s.action === "start").length;
  const before = started.length;
  const capped = runSync(tick(dir, t4, { start: ok, max: 1, clock: () => t4 }));
  expect("a tick starts at most max workflows and leaves the rest for the next", want > 1 && started.length === before + 1 && capped.filter((s) => s.did === "started-done").length === 1 && capped.filter((s) => s.action === "start" && s.did === "nothing").length === want - 1, { want, capped: capped.map((s) => [s.workflow, s.action, s.did]) });
  const blocked = runSync(tick(dir, t4, {}));
  expect("with no NAIVE_AGENT_CMD a tick starts nothing and says so", blocked.some((s) => s.action === "blocked") && blocked.every((s) => s.did === "nothing") && started.length === before + 1);

  const cli = (...a: string[]) => spawnSync(process.execPath, ["packages/naive/src/engine/loop.ts", dir, ...a], { encoding: "utf8", env: { ...process.env } });
  const planned = cli("plan", "--at", t4, "--json");
  expect("the command prints the plan as JSON and writes nothing", planned.status === 0 && (JSON.parse(planned.stdout) as { steps: LoopStep[] }).steps.some((s) => s.action === "blocked"), planned.stderr);
  const modes = cli("mode");
  expect("mode with no argument lists each workflow's mode and where it comes from", modes.status === 0 && /auto\s+customer-service\/intake\s+set for the workflow/.test(modes.stdout) && /auto\s+strategy\/intake\s+set for the function/.test(modes.stdout), modes.stdout + modes.stderr);
  const bad = cli("mode", "auto");
  expect("mode without --by is refused", bad.status === 1 && /person sets/.test(bad.stderr), bad.stderr);
  const check = () => spawnSync(process.execPath, ["packages/naive/src/checks/check-config.ts", dir, "--json"], { encoding: "utf8" });
  const fine = check();
  expect("the config check accepts the loop modes a person set", fine.status === 0, fine.stdout + fine.stderr);
  const c = JSON.parse(readFileSync(join(dir, "naive.config.json"), "utf8")) as { loops: LoopConfig };
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ ...c, loops: { ...c.loops, functions: { finance: "auto" } } }));
  const wrong = check();
  expect("and refuses a function the venture does not list", wrong.status === 1 && /finance, which is not a function/.test(wrong.stdout + wrong.stderr), wrong.stdout + wrong.stderr);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("loop tests passed");
