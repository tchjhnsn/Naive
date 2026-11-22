// Tests for gate strength (EE-156): each gate item on its evidence ladder, the policy's minimum and boundary, presets
// ordered by strictness, overrides from naive.config.json, the report on a fresh venture, enforcement in the
// lifecycle, the CLI and the route.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { itemStrength, levelFromCount, meter, phaseGate, policyFor, strictness } from "./phase-gate.ts";
import { advance, lifecycle } from "./lifecycle.ts";
import { ventureFile } from "../core/venture-paths.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail?: unknown): void => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

const repo = new URL("../../../..", import.meta.url).pathname;
const node = (args: string[], env: Record<string, string> = {}) => spawnSync("node", args, { cwd: repo, encoding: "utf8", env: { ...process.env, ...env } });
const ws = mkdtempSync(join(tmpdir(), "phase-gate-"));
const make = (id: string): string => {
  const d = join(ws, id);
  const r = node(["packages/naive/src/engine/init-venture.ts", d, id, "--type", "software-startup"]);
  expect(`a software startup venture ${id} starts`, r.status === 0, r.stderr);
  return d;
};
const put = (dir: string, rel: string, value: unknown): void => {
  const f = ventureFile(dir, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(value, null, 2) + "\n");
};

type Policies = { count_levels: Record<string, number>, phases: Record<string, { items: { id: string, label: string, record: string | null, measure: { kind: "grade" | "count" | "coverage" | "authority", of?: string }, requires: string[] }[], presets: Record<string, Record<string, { min: "very low" | "low" | "moderate" | "high", boundary: "fail-open" | "fail-closed" }>> }> };
const policies = JSON.parse(readFileSync(join(repo, "packages/naive/src/phases/gate-policies.json"), "utf8")) as Policies;
const discovery = policies.phases.discovery;
const item = (id: string) => {
  const i = discovery.items.find((x) => x.id === id);
  if (!i) throw new Error(`no item ${id}`);
  return i;
};
const today = new Date("2026-11-01");
const ev = (id: string, kind: string, extra: Record<string, unknown> = {}) => ({ id, kind, summary: id, source: { url: `https://example.com/${id}` }, audience: "target", collected: "2026-10-01", ...extra });
const ctxWith = (records: Record<string, Record<string, unknown> | null>, more: Record<string, unknown> = {}) => ({
  records: Object.fromEntries(Object.entries(records).map(([k, v]) => [k, { file: `${k}.json`, value: v }])),
  interviews: [], icps: [], countLevels: policies.count_levels, today, ...more,
});
const interview = (id: string, icp: string, given = true, solutions = false) => ({ id, icp, consent: { given }, ...(solutions ? { current_solutions: [{ for: "x", what_it_does: "y" }] } : {}) });

// ---- Pure ladders ----
const cl = policies.count_levels;
expect("counts map to levels: 0 very low, 1 low, 4 low, 5 moderate, 10 high",
  [0, 1, 4, 5, 10].map((n) => levelFromCount(n, cl)).join() === "very low,low,low,moderate,high", [0, 1, 4, 5, 10].map((n) => levelFromCount(n, cl)));

const problem = { statement: "Landlords lose rent to slow turnover", segment: "Small landlords" };
const one = itemStrength(item("problem"), ctxWith({ "validation-problem": { ...problem, evidence: [ev("a", "desk-research")] } }));
expect("one desk research source grades low", one.level === "low", one);
expect("the hint for low names what reaches moderate under GRADE", /commitment/.test(one.next ?? "") && /three distinct sources/.test(one.next ?? ""), one.next);
const desk = itemStrength(item("problem"), ctxWith({ "validation-problem": { ...problem, evidence: [ev("a", "desk-research"), ev("b", "desk-research"), ev("c", "desk-research")] } }));
expect("desk research from three independent sources reaches moderate, no interviews needed", desk.level === "moderate", desk);
const behavior = itemStrength(item("problem"), ctxWith({ "validation-problem": { ...problem, evidence: [ev("b", "behavior", { sample: { n: 6 } })] } }));
expect("behavior from the target audience with n>=5 reaches high", behavior.level === "high" && behavior.next === null, behavior);
const small = itemStrength(item("problem"), ctxWith({ "validation-problem": { ...problem, evidence: [ev("b", "behavior", { sample: { n: 3 } })] } }));
expect("behavior with a sample under 5 drops to moderate", small.level === "moderate", small);
const noSegment = itemStrength(item("problem"), ctxWith({ "validation-problem": { statement: "x", segment: "", evidence: [ev("b", "behavior", { sample: { n: 6 } })] } }));
expect("an empty required field is very low whatever the evidence, and names the field", noSegment.level === "very low" && noSegment.missing.join() === "segment" && /segment/.test(noSegment.next ?? ""), noSegment);
const absent = itemStrength(item("problem"), ctxWith({ "validation-problem": null }));
expect("a missing record is very low with every required field listed", absent.level === "very low" && absent.missing.join() === "statement,segment", absent);

const icps = [{ id: "landlords", primary: true }, { id: "agents", primary: false }];
const icpRec = { id: "landlords", who: "Small landlords", where_to_find: "Landlord forums", primary: true };
const three = itemStrength(item("customer"), ctxWith({ icp: icpRec }, { icps, interviews: [interview("1", "landlords"), interview("2", "landlords"), interview("3", "landlords"), interview("4", "agents"), interview("5", "landlords", false)] }));
expect("only consenting interviews with the primary ICP count: three reach low", three.level === "low" && three.count === 3, three);
expect("the count hint says how many more interviews reach moderate", /^moderate: 2 more/.test(three.next ?? ""), three.next);
const five = itemStrength(item("customer"), ctxWith({ icp: icpRec }, { icps, interviews: ["1", "2", "3", "4", "5"].map((i) => interview(i, "landlords")) }));
expect("five consenting primary-ICP interviews reach moderate", five.level === "moderate", five);
const alt = itemStrength(item("alternatives"), ctxWith({ "validation-solution": { statement: "s", alternatives: ["spreadsheets"], evidence: [ev("a", "desk-research"), ev("b", "desk-research"), ev("c", "desk-research")] } }));
expect("a count item takes the record's own grade when it is higher, so desk research counts too", alt.level === "moderate" && alt.count === 0, alt);
const altI = itemStrength(item("alternatives"), ctxWith({ "validation-solution": { statement: "s", alternatives: ["spreadsheets"], evidence: [] } }, { interviews: [interview("1", "x", true, true), interview("2", "x", true, false)] }));
expect("interviews with current solutions count for alternatives", altI.level === "low" && altI.count === 1, altI);

const plan = { venture: "acme", assumptions: [{ id: "a1", statement: "s", item: "customer", test: "t", pass: "p", by: "2026-12-01" }, { id: "a2", statement: "s", item: "problem", test: "t", pass: "p", by: "2026-12-01", status: "failed" }] };
const levels = { customer: "low", problem: "low", alternatives: "high", "solution-fit": "very low", channel: "very low", "economic-signal": "very low" } as const;
const cov = itemStrength(item("validation-plan"), ctxWith({ "validation-plan": plan }, { levels, items: discovery.items }));
expect("coverage counts open assumptions over the items below high (1 of 5: very low) and names the rest", cov.level === "very low" && /problem, solution-fit, channel, economic-signal/.test(cov.next ?? ""), cov);
const covAll = itemStrength(item("validation-plan"), ctxWith({ "validation-plan": { ...plan, assumptions: ["customer", "problem", "solution-fit", "channel"].map((i) => ({ id: i, statement: "s", item: i, test: "t", pass: "p", by: "2026-12-01", status: "passed" })) } }, { levels, items: discovery.items }));
expect("four of five items below high named is moderate", covAll.level === "moderate", covAll);
expect("authority is pending until a person decides", itemStrength(item("decision"), ctxWith({})).pending === true && itemStrength(item("decision"), ctxWith({}, { decidedBy: "maya" })).level === "high");
expect("the meter fills one cell per level", meter("very low") === "[#   ]" && meter("low") === "[##  ]" && meter("high") === "[####]");

// ---- Presets and overrides ----
const score = (p: string): number => strictness({ items: discovery.presets[p] }, discovery.presets).score;
expect("presets rank lenient < standard < strict by strictness", score("lenient") < score("standard") && score("standard") < score("strict"), [score("lenient"), score("standard"), score("strict")]);
expect("each preset's label is its own name", ["lenient", "standard", "strict"].every((p) => strictness({ items: discovery.presets[p] }, discovery.presets).label === p));
const over = policyFor(policies as never, "discovery", { phase_gates: { preset: "standard", items: { discovery: { "solution-fit": { boundary: "fail-closed" } } } } });
expect("an override changes one item's boundary and keeps its minimum", over?.items["solution-fit"].boundary === "fail-closed" && over?.items["solution-fit"].min === "low" && over?.items["solution-fit"].overridden === true, over?.items["solution-fit"]);
expect("an override raises strictness", strictness(over as never).score > score("standard"));
expect("a phase with no gate policy has no policy", policyFor(policies as never, "platform") === null);

// ---- A fresh venture ----
const fresh = make("fresh");
const g = phaseGate(fresh);
expect("a fresh venture is not ready under the standard policy", g.preset === "standard" && !g.ready && !g.passed && g.blocking.length === 4 && g.risks.length === 3, { blocking: g.blocking, risks: g.risks });
expect("every item reports its level, minimum, boundary and next step", g.items.length === 8 && g.items.every((r) => r.level && r.min && r.boundary && (r.passed || r.next)), g.items);
expect("lenient blocks less than standard", phaseGate(fresh, { preset: "lenient" }).blocking.length === 2);
put(fresh, "naive.config.json", { phase_gates: { preset: "strict", items: { discovery: { channel: { boundary: "fail-open" } } } } });
const strict = phaseGate(fresh);
expect("the preset and overrides come from naive.config.json", strict.preset === "strict" && strict.items.find((r) => r.id === "channel")?.boundary === "fail-open" && strict.items.find((r) => r.id === "customer")?.min === "high", strict.items.map((r) => [r.id, r.min, r.boundary]));
const cfgCheck = node(["packages/naive/src/checks/check-config.ts", fresh]);
expect("the phase_gates config passes the config check", cfgCheck.status === 0, cfgCheck.stdout + cfgCheck.stderr);

// ---- Enforcement in the lifecycle ----
const person = { kind: "person", via: "cli", id: "maya" };
type Moved = { result?: { gate?: { overridden?: string | null, strength?: { enforced: boolean, ready: boolean } | null } } };
const gateOf = (r: unknown) => (r as Moved).result?.gate;
const criteria = (dir: string): void => put(dir, "foundation/exit-criteria/discovery.json", { phase: "discovery", criteria: [{ id: "problem", statement: "A problem is real", met: { by: "maya", at: "2026-11-01T00:00:00Z" } }] });
const enforced = make("enforced");
criteria(enforced);
put(enforced, "naive.config.json", { phase_gates: { enforce: true } });
const le = lifecycle(enforced);
expect("with enforce, each fail-closed shortfall joins the lifecycle's blocking", !le.ready && le.blocking.filter((b: string) => b.startsWith("gate strength:")).length === 4 && le.phase_gate.enforce === true, le.blocking);
const refused = advance(enforced, "validation", { by: person });
expect("with enforce, advance refuses and names the gate strength shortfall", !refused.ok && /gate strength/.test(refused.error ?? ""), refused.error);
const overridden = advance(enforced, "validation", { by: person, override: "pilot customer signed" });
expect("with enforce, --override passes and is recorded", overridden.ok && gateOf(overridden)?.overridden === "pilot customer signed" && gateOf(overridden)?.strength?.enforced === true, overridden.error);
const reported = make("reported");
criteria(reported);
const lr = lifecycle(reported);
expect("report-only: the gate is reported but does not block", lr.ready && lr.phase_gate.items.length === 8 && !lr.phase_gate.ready && !lr.blocking.some((b: string) => b.startsWith("gate strength")), lr.blocking);
const moved = advance(reported, "validation", { by: person });
expect("report-only: advance goes on, with the gate's risks in the result", moved.ok && gateOf(moved)?.strength?.ready === false, moved.error);

// ---- The CLI and the route ----
const cli = node(["packages/naive/src/engine/phase-gate.ts", fresh, "--preset", "standard"]);
expect("the CLI prints a meter per item and exits 0 for a report", cli.status === 0 && /\[# {3}\] A named customer: very low \/ needs moderate, fail-closed/.test(cli.stdout), cli.stdout + cli.stderr);
const bad = node(["packages/naive/src/engine/phase-gate.ts", fresh, "--preset", "nope"]);
expect("an unknown preset is a bad call (exit 2)", bad.status === 2, bad.stderr);
expect("no venture is a bad call (exit 2)", node(["packages/naive/src/engine/phase-gate.ts"]).status === 2);
const route = node(["packages/naive/src/interfaces/cli/mentura.ts", "system/phase-gate", "run", "--venture", "fresh"], { MENTURA_WORKSPACE: ws });
let routed: { preset?: string, items?: unknown[] } = {};
try { routed = JSON.parse(route.stdout); } catch { routed = {}; }
expect("system/phase-gate runs the gate as a command route", route.status === 0 && routed.preset === "strict" && routed.items?.length === 8, route.stdout.slice(0, 300) || route.stderr);

rmSync(ws, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
