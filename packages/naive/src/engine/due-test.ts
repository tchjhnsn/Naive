// Tests what is due (EE-182): each trigger kind against a run log and a provenance log, the cadence arithmetic, the
// route match, and the command over one venture folder made here.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runSync } from "../core/effect/run.ts";
import { after, covers, due, dueFor, isOpen, openBox, readRuns, recordRun, routeMatches, timeBoxSpan } from "./due.ts";
import { plan } from "./loop.ts";
import type { DueBox, DueWorkflow } from "./due.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

expect("a day and a week are 24 hours and 7 days", after("2026-01-31T10:00:00.000Z", "daily") === "2026-02-01T10:00:00.000Z" && after("2026-01-31T10:00:00.000Z", "weekly") === "2026-02-07T10:00:00.000Z");
expect("a month is a calendar month, and a day past the month's end is its last day", after("2026-01-31T10:00:00.000Z", "monthly") === "2026-02-28T10:00:00.000Z" && after("2026-03-15T00:00:00.000Z", "monthly") === "2026-04-15T00:00:00.000Z");
expect("a quarter is three calendar months, across a year's end", after("2026-11-30T08:00:00.000Z", "quarterly") === "2027-02-28T08:00:00.000Z");
expect("[id] and * stand for one segment each", routeMatches("support/cases/[id]", "support/cases/c-1") && routeMatches("support/*/x", "support/y/x") && !routeMatches("support/cases/[id]", "support/cases") && !routeMatches("support/cases/[id]", "support/cases/c-1/notes") && !routeMatches("support/cases/[id]", "sales/cases/c-1"));

const w = (id: string, trigger: DueWorkflow["trigger"]): DueWorkflow => ({ id, function: "f", title: id, trigger });
const flows = [w("intake", { kind: "intake" }), w("weekly", { kind: "schedule", cadence: "weekly" }), w("triage", { kind: "event", route: "support/cases/[id]" }), w("asked", { kind: "request" })];
const now = "2026-06-15T00:00:00.000Z";
const by = (list: ReturnType<typeof due>) => Object.fromEntries(list.map((e) => [e.workflow, e]));

const fresh = by(due(flows, [], [], now));
expect("with no runs, intake and the schedule are due, the event is not, and a request waits to be handed off", fresh["f/intake"].status === "due" && fresh["f/weekly"].status === "due" && fresh["f/triage"].status === "not-due" && fresh["f/asked"].status === "on-request", fresh);
expect("due entries come first, then the rest in the order given", due(flows, [], [], now).map((e) => e.workflow).join() === "f/intake,f/weekly,f/triage,f/asked");
expect("each entry names the role that runs it", fresh["f/intake"].role === "f-agent");

const ran = by(due(flows, [{ workflow: "f/intake", at: "2026-06-01T00:00:00.000Z", outcome: "done", by: "f-agent" }, { workflow: "f/weekly", at: "2026-06-10T00:00:00.000Z", outcome: "done", by: "f-agent" }], [], now));
expect("intake that finished is not due again", ran["f/intake"].status === "not-due" && ran["f/intake"].last_done === "2026-06-01T00:00:00.000Z");
expect("a schedule inside its cadence is not due and says when it next is", ran["f/weekly"].status === "not-due" && ran["f/weekly"].next_due === "2026-06-17T00:00:00.000Z", ran["f/weekly"]);
const late = by(due(flows, [{ workflow: "f/weekly", at: "2026-06-08T00:00:00.000Z", outcome: "done", by: "f-agent" }], [], now));
expect("a schedule is due at the moment its cadence has passed", late["f/weekly"].status === "due" && late["f/weekly"].next_due === now, late["f/weekly"]);
const fail = by(due(flows, [{ workflow: "f/weekly", at: "2026-06-01T00:00:00.000Z", outcome: "done", by: "a" }, { workflow: "f/weekly", at: "2026-06-14T00:00:00.000Z", outcome: "failed", by: "a" }, { workflow: "f/intake", at: "2026-06-14T00:00:00.000Z", outcome: "failed", by: "a" }], [], now));
expect("a failed run does not move a schedule or finish intake", fail["f/weekly"].status === "due" && fail["f/weekly"].last_done === "2026-06-01T00:00:00.000Z" && /failed/.test(fail["f/weekly"].why) && fail["f/intake"].status === "due" && /failed/.test(fail["f/intake"].why), fail);
expect("a failed run that nothing has settled since is named as the last failure", fail["f/weekly"].last_failed === "2026-06-14T00:00:00.000Z" && ran["f/weekly"].last_failed === null);
const skip = by(due(flows, [{ workflow: "f/weekly", at: "2026-06-14T00:00:00.000Z", outcome: "failed", by: "a" }, { workflow: "f/weekly", at: "2026-06-14T12:00:00.000Z", outcome: "skipped", by: "decision x" }, { workflow: "f/intake", at: "2026-06-14T12:00:00.000Z", outcome: "skipped", by: "decision y" }], [], now));
expect("a skipped run settles the occurrence the way a finished run does", skip["f/weekly"].status === "not-due" && skip["f/weekly"].last_failed === null && skip["f/weekly"].next_due === "2026-06-21T12:00:00.000Z" && skip["f/intake"].status === "not-due", skip);
expect("a run recorded after now is not counted", by(due(flows, [{ workflow: "f/intake", at: "2026-07-01T00:00:00.000Z", outcome: "done", by: "a" }], [], now))["f/intake"].status === "due");

const writes = [{ route: "support/cases/c-1", at: "2026-06-02T00:00:00.000Z" }, { route: "support/cases/c-2", at: "2026-06-12T00:00:00.000Z" }, { route: "finance/spend/s-1", at: "2026-06-13T00:00:00.000Z" }];
const ev = by(due(flows, [], writes, now));
expect("an event workflow is due when its route was written, and says how often and where", ev["f/triage"].status === "due" && /^2 writes/.test(ev["f/triage"].why) && /support\/cases\/c-2\.$/.test(ev["f/triage"].why), ev["f/triage"]);
const handled = by(due(flows, [{ workflow: "f/triage", at: "2026-06-05T00:00:00.000Z", outcome: "done", by: "a" }], writes, now));
expect("only writes after its last finished run count", handled["f/triage"].status === "due" && /^1 write /.test(handled["f/triage"].why), handled["f/triage"]);
expect("and none after it means not due", by(due(flows, [{ workflow: "f/triage", at: "2026-06-12T12:00:00.000Z", outcome: "done", by: "a" }], writes, now))["f/triage"].status === "not-due");
expect("an entry says whether the phase lists its workflow as active", by(due(flows, [], [], now, new Set(["f/intake"])))["f/intake"].in_phase && !fresh["f/intake"].in_phase);

// Time boxes (EE-186): a workflow `during` a sprint is due only while an open sprint covers it.
const sprintFlows = [w("standup", { kind: "schedule", cadence: "daily", during: "sprint" }), w("launch", { kind: "event", route: "marketing/content", during: "campaign" }), w("intake", { kind: "intake" })];
const box = (id: string, over: Partial<DueBox> = {}): DueBox => ({ id, kind: "sprint", starts: "2026-06-10T00:00:00.000Z", ends: "2026-06-24T00:00:00.000Z", status: "active", functions: ["f"], ...over });
expect("a time box is open from its start until its end, while active", isOpen(box("s"), now) && !isOpen(box("s"), "2026-06-24T00:00:00.000Z") && !isOpen(box("s"), "2026-06-09T00:00:00.000Z") && !isOpen(box("s", { status: "closed" }), now) && !isOpen(box("s", { status: "cancelled" }), now));
expect("a time box covers its functions' workflows and the workflows it names", covers(box("s"), "f/x") && !covers(box("s"), "g/x") && covers(box("s", { functions: undefined, workflows: ["g/x"] }), "g/x"));
const noBox = by(due(sprintFlows, [], [], now));
expect("with no open sprint, a workflow during a sprint is not due and says why", noBox["f/standup"].status === "not-due" && /only while a sprint/.test(noBox["f/standup"].why) && noBox["f/standup"].time_box === null, noBox["f/standup"]);
const inBox = by(due(sprintFlows, [], [], now, new Set(), [box("s1", { loop_mode: "auto", set_by: { person: "Founder", at: "2026-06-09T00:00:00.000Z" } })]));
expect("inside an open sprint it is due as its kind says, and names the sprint", inBox["f/standup"].status === "due" && /sprint s1 is open until 2026-06-24/.test(inBox["f/standup"].why) && inBox["f/standup"].time_box?.id === "s1" && inBox["f/standup"].time_box?.loop_mode === "auto" && inBox["f/standup"].time_box?.set_by === "Founder", inBox["f/standup"]);
expect("a sprint does not open a workflow during a campaign", inBox["f/launch"].status === "not-due" && inBox["f/launch"].time_box === null);
expect("a workflow with no during is not held by time boxes, and still names the box that covers it", inBox["f/intake"].status === "due" && inBox["f/intake"].time_box?.id === "s1");
const campaignWrites = [{ route: "marketing/content", at: "2026-06-05T00:00:00.000Z" }];
const camp = (from: string) => by(due(sprintFlows, [], campaignWrites, now, new Set(), [box("c1", { kind: "campaign", starts: from })]))["f/launch"].status;
expect("during a campaign an event counts only from the campaign's start", camp("2026-06-01T00:00:00.000Z") === "due" && camp("2026-06-10T00:00:00.000Z") === "not-due");
expect("of two open sprints, the later to start covers it", openBox([box("a"), box("b", { starts: "2026-06-12T00:00:00.000Z" })], "f/x", now)?.id === "b");
const set = { person: "Founder", at: "2026-06-01T00:00:00.000Z" };
const since = [{ route: "marketing/content", at: "2026-06-02T00:00:00.000Z" }];
const both = by(due(sprintFlows, [], since, now, new Set(["f/launch"]), [
  box("spring", { kind: "campaign", starts: "2026-06-01T00:00:00.000Z", loop_mode: "auto", set_by: set, workflows: ["f/launch"] }),
  box("focus", { kind: "sprint", starts: "2026-06-12T00:00:00.000Z", loop_mode: "manual", set_by: set, functions: undefined, workflows: ["f/launch"] }),
]));
expect("a later sprint that names the workflow sets the mode over an earlier campaign", both["f/launch"].status === "due" && both["f/launch"].time_box?.id === "focus" && both["f/launch"].time_box?.loop_mode === "manual", both["f/launch"]);
const held = plan([both["f/launch"]], { functions: { f: "auto" } }, new Map(), true)[0];
expect("the loop follows that later mode and does not start it", held?.action === "leave" && held?.mode === "manual" && held?.from === "time-box", held);
const focusAuto = by(due(sprintFlows, [], since, now, new Set(), [
  box("spring", { kind: "campaign", starts: "2026-06-01T00:00:00.000Z", workflows: ["f/launch"] }),
  box("focus", { kind: "sprint", starts: "2026-06-12T00:00:00.000Z", loop_mode: "auto", set_by: set, functions: undefined, workflows: ["f/launch"] }),
]));
const started = plan([focusAuto["f/launch"]], { functions: { f: "manual" } }, new Map(), true)[0];
expect("a later sprint's mode applies when the earlier campaign sets none", focusAuto["f/launch"].status === "due" && focusAuto["f/launch"].time_box?.id === "focus" && started?.action === "start" && started?.mode === "auto", started);
expect("a start that is not a time, or an end that is not after it, is refused", timeBoxSpan("tomorrow", "2026-06-02T00:00:00.000Z") !== null && timeBoxSpan("2026-06-02T00:00:00.000Z", "2026-06-01T00:00:00.000Z") !== null && timeBoxSpan("2026-06-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z") !== null && timeBoxSpan("2026-06-01T00:00:00.000Z", "2026-06-02T00:00:00.000Z") === null);

// One venture folder: two functions in Discovery, read from the shipped function modules.
const dir = mkdtempSync(join(tmpdir(), "naive-due-"));
try {
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v", name: "V", phase: "discovery", departments: ["strategy", "customer-service"] }));
  const first = runSync(dueFor(dir, now));
  const m = by(first);
  expect("a venture's workflows come from the functions it lists", first.length > 0 && first.every((e) => ["strategy", "customer-service"].includes(e.function)) && "strategy/intake" in m && "customer-service/case-triage" in m, first.map((e) => e.workflow));
  expect("with no run log every intake and schedule is due", m["strategy/intake"].status === "due" && m["customer-service/weekly-contact-review"].status === "due" && m["customer-service/case-triage"].status === "not-due");
  expect("Discovery lists strategy/intake as active and not customer-service/intake", m["strategy/intake"].in_phase && !m["customer-service/intake"].in_phase);
  expect("--function narrows to one function", runSync(dueFor(dir, now, "strategy")).every((e) => e.function === "strategy"));

  runSync(recordRun(dir, { workflow: "strategy/intake", at: "2026-06-14T00:00:00.000Z", outcome: "done", by: "strategy-agent" }));
  expect("a recorded run is in the log and intake is no longer due", runSync(readRuns(dir)).length === 1 && by(runSync(dueFor(dir, now)))["strategy/intake"].status === "not-due");
  let refused = "";
  try { runSync(recordRun(dir, { workflow: "finance/intake", at: now, outcome: "done", by: "x" })); } catch (e) { refused = (e as Error).message; }
  expect("a run of a workflow the venture does not have is refused", /finance\/intake is not a workflow/.test(refused) && runSync(readRuns(dir)).length === 1, refused);

  mkdirSync(join(dir, "support/cases"), { recursive: true });
  const line = (activity: string) => `${JSON.stringify({ at: "2026-06-14T12:00:00.000Z", entity: "support/cases/c-1.json", route: "support/cases/c-1", activity })}\n`;
  writeFileSync(join(dir, "provenance.jsonl"), line("draft"));
  expect("a draft held for a person does not make the event workflow due", by(runSync(dueFor(dir, now)))["customer-service/case-triage"].status === "not-due");
  writeFileSync(join(dir, "provenance.jsonl"), line("draft") + line("accept"));
  expect("the person's accept does", by(runSync(dueFor(dir, now)))["customer-service/case-triage"].status === "due");
  writeFileSync(join(dir, "provenance.jsonl"), line("write"));
  expect("a write in the provenance log makes the event workflow due", by(runSync(dueFor(dir, now)))["customer-service/case-triage"].status === "due");

  mkdirSync(join(dir, "operations/time-boxes"), { recursive: true });
  writeFileSync(join(dir, "operations/time-boxes/launch.json"), JSON.stringify({ id: "launch", kind: "sprint", title: "Launch", goal: "Ship it", starts: "2026-06-01T00:00:00.000Z", ends: "2026-06-30T00:00:00.000Z", status: "active", functions: ["strategy"] }));
  const boxed = by(runSync(dueFor(dir, now)));
  expect("an open sprint in the venture's folder names the workflows it covers", boxed["strategy/intake"].time_box?.id === "launch" && boxed["customer-service/intake"].time_box === null, boxed["strategy/intake"]);
  const cli = (...a: string[]) => spawnSync(process.execPath, ["packages/naive/src/engine/due.ts", dir, ...a], { encoding: "utf8" });
  const listed = cli("--at", now, "--json");
  const parsed = JSON.parse(listed.stdout) as { at: string; due: { workflow: string; status: string }[] };
  expect("the command prints the same list as JSON", listed.status === 0 && parsed.at === now && parsed.due[0].status === "due" && parsed.due.some((e) => e.workflow === "customer-service/case-triage" && e.status === "due"), listed.stderr);
  const rec = cli("record", "customer-service/case-triage", "--at", now, "--by", "customer-service-agent");
  expect("record appends a run, and the workflow is then not due", rec.status === 0 && /recorded customer-service\/case-triage done/.test(rec.stdout) && by(runSync(dueFor(dir, now)))["customer-service/case-triage"].status === "not-due", rec.stderr);
  const text = cli("--at", now);
  expect("the plain listing gives one line per workflow with why", text.status === 0 && /due\s+customer-service\/weekly-contact-review\s+It runs weekly and has never run\./.test(text.stdout), text.stdout);
  expect("a bad outcome and a missing target are usage errors", cli("record", "strategy/intake", "--outcome", "maybe").status === 2 && cli("record").status === 2);
} finally { rmSync(dir, { recursive: true, force: true }); }

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log("\ndue: all passed");
