// Tests packages/naive/src/engine/tool-recommendations.ts (EE-222): which functions a goal puts in scope and why,
// which activities need a tool to be seen and which are blind spots, the candidates scored once per channel, the
// venture's own weights and must-haves from naive.config.json, and propose, which files one open decision per
// function as that function's agent, keeps one already filed as it is and never decides.
//
//   node packages/naive/src/engine/tool-recommendations-test.ts

import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runSync } from "../core/effect/run.ts";
import { approve } from "./decisions.ts";
import {
  advise, decisionId, derivesFrom, functionsInScope, gapOf, needsFor, note, options, optionsOf, question,
  readRubric, recommend, proposeRecommendation, slug, stepsByActivity, ventureOptionProblems,
  type ChannelAdvice, type FunctionInScope, type RecStep, type Step,
} from "./tool-recommendations.ts";
import type { ElementOwner, RoleInfo } from "./element-owners.ts";
import type { Goal, Requirement } from "../records/types/records.d.ts";

let failed = 0;
const ok = (cond: boolean, name: string, detail: unknown = ""): void => { console.log(`${cond ? "ok  " : "FAIL"}  ${name}${cond ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!cond) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "tool-recommendations-"));
const rubric = runSync(readRubric());

const put = (dir: string, rel: string, value: unknown) => {
  const f = join(dir, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(value, null, 2) + "\n");
};

// functionsInScope: the flag, then the requirements, then the owner's role, then every listed function.
const listed = ["strategy", "finance", "it"];
const goal: Goal = { id: "paying", statement: "Ten teams pay", kind: "venture", owner: "finance-lead", measures: [{ id: "teams", statement: "Teams paying" }] };
const other: Goal = { id: "other", statement: "Something else", kind: "learning", measures: [{ id: "teams", statement: "A measure of the same name" }] };
const req = (id: string, derives: string[], constrains: string[]): Requirement => ({ id, statement: `${id} holds`, derives_from: derives, constrains });
const roles = new Map<string, RoleInfo>([["finance-lead", { kind: "person", reach: ["finance", "it"] }], ["founder", { kind: "person", reach: "all" }]]);
const ids = (xs: readonly FunctionInScope[]) => xs.map((f) => f.id).join();

ok(ids(functionsInScope(listed, { only: "finance" })) === "finance" && functionsInScope(listed, { only: "finance" })[0].from === "flag", "--function wins over everything");
ok(functionsInScope(listed, { only: "supply-chain" }).length === 0, "a function the venture does not list is dropped");
const byReq = functionsInScope(listed, { goal, all: [goal], reqs: [req("r1", ["paying"], ["finance"]), req("r2", ["paying/teams"], ["it"]), req("r3", ["nothing"], ["strategy"])], roles });
ok(ids(byReq) === "finance,it" && byReq.every((f) => f.from === "requirement") && /r1, r2 derive from paying/.test(byReq[0].why), "the requirements that derive from the goal or its measures give their constrained functions", byReq);
const byOwner = functionsInScope(listed, { goal, all: [goal], reqs: [req("r3", ["nothing"], ["strategy"])], roles });
ok(ids(byOwner) === "finance,it" && byOwner[0].from === "owner" && /owned by the role finance-lead/.test(byOwner[0].why), "with no requirement, the goal owner's role reach gives the functions", byOwner);
ok(ids(functionsInScope(listed, { goal: { ...goal, owner: "founder" }, all: [goal], roles })) === "finance,it,strategy", "an owner that answers for everything narrows nothing");
ok(ids(functionsInScope(listed, {})) === "finance,it,strategy" && functionsInScope(listed, {})[0].from === "venture", "with no goal, every function the venture lists is in scope");
ok(derivesFrom(req("r", ["paying"], []), goal, [goal]) && derivesFrom(req("r", ["paying/teams"], []), goal, [goal]) && derivesFrom(req("r", ["teams"], []), goal, [goal]), "a requirement derives from a goal by its id, by goal/measure and by a bare measure id");
ok(!derivesFrom(req("r", ["teams"], []), goal, [goal, other]), "a bare measure id two goals share derives from neither, so no function is claimed on a guess");

// gapOf and stepsByActivity.
const wrote: Step[] = [{ workflow: "finance/intake", step: "ask", writes: ["finance/spend"] }];
const silent: Step[] = [{ workflow: "finance/intake", step: "ask", writes: [] }];
ok(gapOf("agent", undefined, []) === "no-record" && gapOf("person", undefined, silent) === "no-record", "no step, and a step that writes nothing, is no-record");
ok(gapOf("person", undefined, wrote) === "outcome-only" && gapOf("agent", "person", wrote) === "outcome-only", "a person performing or approving it, with a step that writes, is outcome-only");
ok(gapOf("agent", "none", wrote) === "visible", "an agent performing it with a step that writes is visible");
const workflows: RecStep[] = [{ id: "intake", function: "finance", steps: [{ id: "a", do: "x", activity: "9.6.1.4", writes: ["finance/spend"] }, { id: "b", do: "y" }, { id: "c", do: "z", activity: "9.6.1.4" }] }];
const byActivity = stepsByActivity(workflows);
ok(byActivity.get("9.6.1.4")?.map((s) => `${s.workflow}#${s.step}`).join() === "finance/intake#a,finance/intake#c" && byActivity.size === 1, "the steps that perform each activity, in the workflows' order, and a step with no activity is skipped", byActivity);

// needsFor: a person's activity and a step that writes nothing, never an agent's activity nothing performs.
const owner = (id: string, name: string, over: Partial<ElementOwner> = {}): ElementOwner =>
  ({ id, name, level: 4, function: "finance", owner: { role: "founder" }, kind: "person", source: "root", performer: "person", ...over });
const scope: FunctionInScope[] = [{ id: "finance", from: "flag", why: "the flag" }];
const owners: ElementOwner[] = [
  owner("9.6.1.4", "Approve payments"),
  owner("9.3.1.1", "Negotiate service-level agreements"),
  owner("9.9.9.1", "Process something an agent does", { performer: "agent", kind: "agent", owner: { role: "finance-agent" }, source: "default" }),
  owner("9.9.9.2", "Reconcile an agent's ledger", { performer: "agent", kind: "agent", owner: { role: "finance-agent" }, source: "default" }),
  owner("9.9.9.3", "Approve it in another function", { function: "strategy" }),
  owner("9.3.0", "A process, not an activity", { level: 3, performer: undefined }),
];
const steps = stepsByActivity([
  { id: "w", function: "finance", steps: [{ id: "writes", do: "x", activity: "9.9.9.1", writes: ["finance/spend"] }, { id: "silent", do: "y", activity: "9.9.9.2" }] },
]);
const needs = needsFor(owners, steps, rubric, scope);
ok(needs.map((n) => n.activity).join() === "9.6.1.4,9.3.1.1,9.9.9.2", "a person's activity, and an agent's whose step writes nothing, need a tool", needs.map((n) => `${n.activity} ${n.gap}`));
ok(!needs.some((n) => n.activity === "9.9.9.1"), "an agent's activity whose step writes a record is visible and is left out");
ok(!needs.some((n) => n.function === "strategy"), "an activity of a function out of scope is left out");
ok(!needs.some((n) => n.activity === "9.3.0"), "an element that is not a level 4 activity is left out");
ok(needs.find((n) => n.activity === "9.6.1.4")?.channel === "decision" && needs.find((n) => n.activity === "9.3.1.1")?.channel === "conversation", "each need carries the channel read from its words", needs);
const named = needsFor(owners, steps, rubric, scope, "9.9.9.1");
ok(named.length === 1 && named[0].activity === "9.9.9.1" && named[0].gap === "visible", "an activity a person names is reported whatever its gap, so the answer can be that it is already visible", named);

// advise: one entry per channel, in the rubric's order, with the candidates scored once.
const advice = advise(rubric, needs);
ok(advice.map((c) => c.channel).join() === "conversation,decision,transaction", "one entry per channel the needs fall into, in the rubric's order", advice.map((c) => c.channel));
ok(advice[0].ranking.results[0].id === "self-hosted-recorder" && advice[0].ranking.blind_spots.join() === "plain-meeting-tool", "the conversation channel ranks the tool the venture runs itself first and names the blind spot", advice[0].ranking.results.map((r) => r.id));
ok(advice[1].ranking.results[0].id === "own-record-store", "a decision a person makes is recorded in the venture's own store");
ok(advise(rubric, needs, { must: { ownership: 3 } })[0].ranking.results.filter((r) => r.status === "ruled-out").map((r) => r.id).join() === "hosted-recorder,plain-meeting-tool", "a must-have rules candidates out of every channel", advise(rubric, needs, { must: { ownership: 3 } })[0].ranking.results);

// The venture's own lines, and lines the rubric cannot hold.
const lines = join(tmp, "lines");
mkdirSync(lines, { recursive: true });
put(lines, "venture.json", { id: "lines", phase: "discovery", departments: ["finance"] });
put(lines, "naive.config.json", { visibility: { weights: { ownership: 0 }, must: { "activity-record": 3 } } });
ok(optionsOf(lines).weights?.ownership === 0 && optionsOf(lines).must?.["activity-record"] === 3, "the venture's weights and must-haves are read from naive.config.json", optionsOf(lines));
ok(ventureOptionProblems(rubric, { weights: { speed: 1 }, must: { cheapness: 2 } }).length === 2 && /no criterion speed/.test(ventureOptionProblems(rubric, { weights: { speed: 1 } })[0]), "a criterion the rubric lacks is a problem in both weights and must");
ok(ventureOptionProblems(rubric, optionsOf(lines)).length === 0, "the venture's own lines are fine when they name criteria");
type Results = ChannelAdvice["ranking"]["results"];
/** The nth ranked total, or NaN when there is no nth ranked candidate. */
const total = (rs: Results, at: number) => { const r = rs.flatMap((x) => (x.status === "ranked" ? [x.total] : []))[at]; return r ?? NaN; };
const owned = advise(rubric, needs)[0].ranking.results;
const noOwnership = advise(rubric, needs, { weights: { ownership: 0 } })[0].ranking.results;
const leader = noOwnership[0];
ok(total(noOwnership, 0) - total(noOwnership, 1) < total(owned, 0) - total(owned, 1) && leader.id === "self-hosted-recorder" && leader.status === "ranked" && leader.tied && noOwnership[1].id === "hosted-recorder",
  "a venture that weighs ownership 0 narrows the gap until the hosted recorder ties the one the venture would run itself",
  noOwnership.map((r) => `${r.id} ${r.status === "ranked" ? r.total.toFixed(3) : r.status}`));

// End to end, on a venture with a goal and a requirement.
const dir = join(tmp, "v");
mkdirSync(dir, { recursive: true });
put(dir, "venture.json", { id: "v", phase: "discovery", departments: ["finance", "strategy"] });
put(dir, "foundation/goals/paying.json", { id: "paying", statement: "Ten teams pay", kind: "venture", measures: [{ id: "teams", statement: "Teams paying", target: 10 }] });
put(dir, "foundation/requirements/calls-recorded.json", { id: "calls-recorded", statement: "Every call leaves a transcript.", derives_from: ["paying/teams"], constrains: ["finance"] });
const rec = runSync(recommend(dir, { goal: "paying" }));
ok(rec.functions.map((f) => f.id).join() === "finance" && rec.functions[0].from === "requirement", "the requirement puts one function in scope", rec.functions);
ok(rec.goal?.measures.join() === "paying/teams" && rec.decides === "person" && /never decides/.test(rec.note), "the goal's measures are reported and a person decides", rec.goal);
ok(rec.recommend.length > 0 && rec.recommend.every((c) => c.needs.every((n) => n.function === "finance")), "every need is in the function in scope");
ok(rec.blind.length > 0 && rec.blind.every((n) => n.gap === "no-record"), "the blind list holds only the activities nothing records", rec.blind.map((n) => n.activity));
const whole = runSync(recommend(dir, {}));
ok(whole.functions.map((f) => f.id).join() === "finance,strategy" && whole.functions.every((f) => f.from === "venture"), "with no goal, every listed function is in scope", whole.functions);
const fails = (f: () => unknown, says: RegExp) => { try { f(); return false; } catch (e) { return says.test((e as Error).message); } };
ok(fails(() => runSync(recommend(dir, { goal: "nope" })), /no goal nope/), "a goal the venture lacks fails");
ok(fails(() => runSync(recommend(dir, { function: "supply-chain" })), /does not list supply-chain/), "a function the venture does not list fails");

// propose.
ok(slug("3.5.1.6") === "3-5-1-6" && decisionId(rec, "finance") === "tools-paying-finance" && decisionId(whole, "finance") === "tools-finance", "the decision id names the goal and the function, and an APQC id becomes a slug");
ok(/^finance: which tools should cover the \d+ activities that goal paying needs to be visible\?$/.test(question(rec, "finance", rec.blind)), "the question names the function, the count and the goal", question(rec, "finance", rec.blind));
const text = note(rec, "finance");
ok(/visibility rubric/.test(text) && /in scope because the requirements calls-recorded/.test(text) && /Measures: paying\/teams/.test(text) && /Candidates, best first:/.test(text) && /mentura withdraw tools-paying-finance/.test(text), "the note names the rubric, why the function is in scope, the measures, the candidates and how to withdraw it", text.slice(0, 400));
ok(options(rec, "finance").includes("decision: own-record-store") && options(rec, "finance").some((o) => /a blind spot/.test(o)), "every candidate is an option, with the blind spots marked", options(rec, "finance"));

const first = proposeRecommendation(dir, rec);
const file = join(dir, "decisions/tools-paying-finance.decision.json");
const d = JSON.parse(readFileSync(file, "utf8"));
ok(first.length === 1 && first[0].ok && first[0].result?.proposed === "tools-paying-finance", "one open decision per function in scope with a need", first);
ok(d.status === "open" && d.provenance.drafted_by.kind === "agent" && d.provenance.drafted_by.id === "finance-agent" && d.answer === undefined, "it is open, drafted by that function's agent, and answers nothing", d.provenance);
ok(/"activity":"draft"/.test(readFileSync(join(dir, "provenance.jsonl"), "utf8").replace(/\s/g, "")), "the proposal is in the provenance log");
const again = proposeRecommendation(dir, rec);
ok(again[0].result?.kept === "tools-paying-finance" && again[0].result?.status === "open" && readdirSync(join(dir, "decisions")).length === 1, "a rerun keeps the decision it already filed", again);
approve(dir, "tools-paying-finance", { answer: "conversation: self-hosted-recorder", by: "a person" });
const third = proposeRecommendation(dir, rec);
ok(third[0].result?.kept === "tools-paying-finance" && third[0].result?.status === "decided", "a rerun leaves a decided proposal as it is", third);
const everything = proposeRecommendation(dir, whole);
ok(everything.map((p) => p.id).sort().join() === "tools-finance,tools-strategy", "with no goal, one decision per function that has a need", everything.map((p) => p.id));
ok(everything.every((p) => p.ok), "each one is filed", everything);

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("tool-recommendations: all passed");
