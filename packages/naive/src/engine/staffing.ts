// The staffing gate (EE-236, step 8 of docs/design/ROLES_AS_AGENTS_2026-11-28.md). Once the specification gates are
// reached through 1B (packages/naive/src/engine/spec-gates.ts), the lead whose portfolio holds human capital drafts a
// staffing plan from the specs as one open decision whose candidates (EE-211) are sets of proposed digital workers
// (EE-235). The decision asks "Would you like to begin deploying agents?". Only a person decides it, and only a person
// runs apply, which activates the chosen candidate's workers through the worker activate path and ends the others.
//
//   naive staffing [status] [--json]                 the gates, each by its question with where its answers live, and
//                                                    where the staffing plan stands
//   naive staffing draft [--by <lead>] [--sponsor <person>] [--json]
//                                                    file the plan and its proposed workers; refused, naming what is
//                                                    missing, while a gate before staffing is not reached
//   naive staffing apply --by <person> [--json]      after a person decides it, activate the chosen workers as that
//                                                    person; refused for an acting agent
//
// The gate fails closed (EE-217): nothing is drafted or applied while a question of 0A to 1B is missing, and an answer
// that cannot be read counts as missing. Each proposed worker is deployed in the name of the lead whose portfolio
// holds its role's function, so its writes are never wider than that lead's portfolio or its role. The rules that
// shape the plan (scopeOf, planCandidates, staffingState) are pure; reading and writing are Effects over VentureFs.

import { Effect } from "effect";
import { fileURLToPath } from "node:url";
import { Refused } from "../core/effect/errors.ts";
import type { NaiveError } from "../core/effect/errors.ts";
import { VentureFs, readJson } from "../core/effect/fs.ts";
import { runSync } from "../core/effect/run.ts";
import { actingAgent } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { readDataModel } from "../records/index.ts";
import type { DecisionRecord, Role, SpecGates, Worker } from "../records/types/records.d.ts";
import { isPersonRole, loadRoles } from "./agents/roles.ts";
import { deploy, deployContext, deployPlan, move, readWorkers } from "./agents/workers.ts";
import type { DeployInput } from "./agents/workers.ts";
import { candidateFor } from "./decision-candidates.ts";
import { decisionFile, founderName, notVenturePerson, propose, refusedPerson } from "./decisions.ts";
import { catalog } from "./departments.ts";
import { loadGates, missingFor, specGatesEffect } from "./spec-gates.ts";
import type { GateReport, Snapshot } from "./spec-gates.ts";

export type Staffing = SpecGates["staffing"];
/** One proposed worker of a candidate, before it is written. */
export type Deployment = { role: string; function: string; deployer: string };
export type CandidatePlan = { id: string; label: string; deployments: Deployment[]; uncovered: string[] };
/** The function a record type belongs to in the data model, or null. */
export type FunctionOfType = (recordType: string) => string | null;
/** Where the plan stands, from the gates, the decision and its workers. */
export type Stage = "specs-missing" | "ready-to-draft" | "awaiting-decision" | "ready-to-apply" | "deployed" | "declined";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const sorted = (xs: Iterable<string>): string[] => [...new Set(xs)].sort();

/**
 * The functions the specs put in scope: each function a requirement constrains, and the function of each record type
 * that answers the staffing gate's last spec gate, kept to the functions in departments.json and, when the venture
 * lists departments, to those. Pure.
 */
export function scopeOf(report: GateReport, snapshot: Snapshot, after: string, functionOfType: FunctionOfType, departments: readonly string[] | null): string[] {
  const known = new Set(catalog().map((d) => d.id));
  const gate = report.gates.find((g) => g.id === after);
  const fromTypes = (gate?.questions ?? []).flatMap((q) => q.answers.filter((a) => a.holds && a.cites.length).map((a) => functionOfType(a.record)));
  const constrained = (snapshot.requirement ?? []).flatMap((r) => (isObject(r.value) && Array.isArray(r.value.constrains) ? r.value.constrains : []));
  return sorted([...fromTypes, ...constrained].filter((f): f is string => typeof f === "string" && known.has(f) && (!departments || departments.includes(f))));
}

/** The lead whose portfolio holds a function, or null. */
export const leadFor = (fn: string, roles: ReadonlyMap<string, Role>): string | null =>
  [...roles.values()].find((r) => !isPersonRole(r) && r.portfolio?.includes(fn))?.id ?? null;

/** The library's agent roles that serve a function: durable, not a person's, and not a lead. */
const servingRoles = (fn: string, roles: ReadonlyMap<string, Role>): string[] =>
  sorted([...roles.values()].filter((r) => r.function === fn && !isPersonRole(r) && !r.portfolio?.length && r.status !== "temporary").map((r) => r.id));

/** Each candidate's proposed workers for the functions in scope, each deployed by the lead that holds its function. Pure. */
export function planCandidates(staffing: Pick<Staffing, "candidates">, functions: readonly string[], roles: ReadonlyMap<string, Role>): CandidatePlan[] {
  return staffing.candidates.map((c) => {
    const deployments: Deployment[] = [];
    const uncovered: string[] = [];
    for (const fn of functions) {
      const deployer = leadFor(fn, roles);
      if (!deployer) { uncovered.push(fn); continue; }
      const own = c.roles === "library" ? servingRoles(fn, roles) : [];
      for (const role of own.length ? own : [`${fn}-agent`]) deployments.push({ role, function: fn, deployer });
    }
    return { id: c.id, label: c.label, deployments, uncovered };
  });
}

/** Candidates that propose the same workers as an earlier one are dropped, so the person chooses between real differences. Pure. */
export const distinct = (plans: readonly CandidatePlan[]): CandidatePlan[] => plans.filter((p, i) => p.deployments.length
  && !plans.slice(0, i).some((q) => q.deployments.length && JSON.stringify(q.deployments.map((d) => d.role)) === JSON.stringify(p.deployments.map((d) => d.role))));

/** Where the plan stands. Pure. */
export function staffingState(reached: boolean, decision: Pick<DecisionRecord, "status" | "answer" | "candidates"> | null, workers: readonly Worker[]): Stage {
  if (!reached) return "specs-missing";
  if (!decision) return "ready-to-draft";
  if (decision.status !== "decided") return decision.status === "withdrawn" ? "declined" : "awaiting-decision";
  const chosen = candidateFor(decision, decision.answer);
  if (!chosen) return "declined";
  const mine = workers.filter((w) => w.plan?.candidate === chosen.id);
  return mine.length && mine.every((w) => w.status !== "proposed") ? "deployed" : "ready-to-apply";
}

const gatesAndDecision = (dir: string, staffing: Staffing) => Effect.gen(function* () {
  const report = yield* specGatesEffect(dir);
  const file = decisionFile(dir, staffing.decision);
  const decision = file ? (yield* readJson(ventureFile(dir, file))) as DecisionRecord : null;
  const workers = (yield* readWorkers(dir)).filter((w) => w.plan?.decision === staffing.decision);
  const reached = !!report.gates.find((g) => g.id === staffing.after)?.reached;
  return { report, decision, workers, reached };
});

/** The gates and where the staffing plan stands, with the next step. Reads only. */
export const status = (dir: string, def: SpecGates = loadGates()) => Effect.gen(function* () {
  const { staffing } = def;
  const { report, decision, workers, reached } = yield* gatesAndDecision(dir, staffing);
  const stage = staffingState(reached, decision, workers);
  const next: Record<Stage, string> = {
    "specs-missing": `answer what ${staffing.after} is missing, then run naive staffing draft`,
    "ready-to-draft": "naive staffing draft",
    "awaiting-decision": `naive decide ${staffing.decision} --by <person> --answer <candidate>`,
    "ready-to-apply": "naive staffing apply --by <person>",
    deployed: "the chosen workers are active: naive workers list",
    declined: `no candidate was chosen: a person reopens ${staffing.decision} to staff again`,
  };
  const gates: GateReport = { gates: report.gates, reached: report.reached, holes: report.holes };
  return {
    gates, stage, next: next[stage], missing: reached ? [] : missingFor(report, staffing.after),
    decision: decision ? { id: decision.id, question: decision.question, status: decision.status, answer: decision.answer ?? null } : null,
    candidates: (decision?.candidates ?? []).map((c) => ({ id: c.id, label: c.label, withdrawn: !!c.withdrawn_at,
      workers: workers.filter((w) => w.plan?.candidate === c.id).map((w) => ({ id: w.id, role: w.role, status: w.status, deployed_by: w.deployed_by })) })),
  };
});

/** The venture's departments, or null when it lists none. */
const departmentsOf = (dir: string) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const file = ventureFile(dir, "venture.json");
  if (!(yield* fs.exists(file))) return null;
  const v = yield* readJson(file);
  return isObject(v) && Array.isArray(v.departments) ? v.departments.filter((d): d is string => typeof d === "string") : null;
});

/**
 * A lead drafts the staffing plan: one open decision with a candidate per distinct set of proposed workers, and every
 * worker written as proposed. Refused, naming what is missing, while the gate before staffing is not reached; refused
 * when anyone but the drafting lead is acting; and a rerun leaves a plan already filed as it is.
 */
export const draft = (dir: string, opts: { by?: string; sponsor?: string; at?: string } = {}, def: SpecGates = loadGates()): Effect.Effect<{ filed: boolean; decision: string; drafted_by?: string; candidates: CandidatePlan[]; workers: string[] }, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const { staffing } = def;
  const { report, decision, reached } = yield* gatesAndDecision(dir, staffing);
  if (!reached) return yield* new Refused({ rule: "staffing-gate", message: `the staffing plan waits until ${staffing.after} is reached, and these are missing:\n${missingFor(report, staffing.after).join("\n")}`, hint: "naive staffing status shows each gate by its question and where its answers live." });
  if (decision) return { filed: false, decision: staffing.decision, candidates: [], workers: [] };
  const roles = loadRoles(dir);
  const by = opts.by?.trim() || leadFor(staffing.drafted_by_function, roles) || "";
  if (!roles.get(by)?.portfolio?.length) return yield* new Refused({ rule: "drafter", message: `${by || "(no one)"} is not a lead, and a lead drafts the staffing plan`, hint: `The lead whose portfolio holds ${staffing.drafted_by_function} drafts it by default.` });
  const acting = actingAgent(by);
  if (acting && acting !== by) return yield* new Refused({ rule: "drafter", message: `${acting} is acting, so it may not draft the staffing plan in the name of ${by}` });
  const sponsor = opts.sponsor?.trim() || founderName(dir);
  const notPerson = notVenturePerson(dir, sponsor);
  if (notPerson) return yield* new Refused({ rule: "sponsor", message: `the sponsor must be a person of the venture: ${notPerson}`, hint: "Pass --sponsor <person>." });
  const model = readDataModel();
  const functions = scopeOf(report, report.snapshot, staffing.after, (t) => model.records.find((r) => r.id === t)?.function ?? null, yield* departmentsOf(dir));
  const plans = distinct(planCandidates(staffing, functions, roles));
  if (!plans.length) return yield* new Refused({ rule: "staffing-scope", message: `the specs name no function a lead holds (${functions.join(", ") || "none"}), so there is no one to deploy`, hint: "A requirement names the functions it constrains in constrains." });
  // Every deployment is checked before anything is written, so a plan is filed whole or not at all.
  const inputs = plans.flatMap((p) => p.deployments.map((d): DeployInput => ({
    role: d.role, by: d.deployer, sponsor, mode: staffing.mode, plan: { decision: staffing.decision, candidate: p.id }, at: opts.at,
    task: `Staffing plan ${p.id}: hold the ${d.role} role for the specified version`,
  })));
  const taken = new Set<string>();
  for (const input of inputs) {
    const ctx = yield* deployContext(dir, input, { acting: null });
    const plan = deployPlan(input, { ...ctx, taken: new Set([...ctx.taken, ...taken]) });
    if (!plan.ok) return yield* new Refused({ rule: plan.rule, message: `the staffing plan cannot propose ${input.role}: ${plan.error}`, ...(plan.hint ? { hint: plan.hint } : {}) });
    taken.add(plan.record.id);
  }
  const evidence = sorted((report.gates.find((g) => g.id === staffing.after)?.questions ?? []).flatMap((q) => q.answers.flatMap((a) => (a.holds ? a.cites : [])).map((c) => c.split("#")[0])));
  const filed = propose(dir, {
    at: staffing.at, id: staffing.decision, question: staffing.question,
    candidates: plans.map((p) => ({
      id: p.id, label: p.label, proposed_by: { kind: "agent" as const, id: by },
      why: `Proposes ${p.deployments.length} ${staffing.mode} worker${p.deployments.length === 1 ? "" : "s"} for ${functions.join(", ")}: ${p.deployments.map((d) => `${d.role} (deployed by ${d.deployer})`).join(", ")}.${p.uncovered.length ? ` No lead holds ${p.uncovered.join(", ")}, so no worker is proposed for it.` : ""}`,
      ...(evidence.length ? { evidence } : {}),
    })),
  }, { agentId: by, via: "cli" });
  if (!filed.ok) return yield* new Refused({ rule: "staffing-decision", message: filed.error });
  const workers: string[] = [];
  for (const input of inputs) workers.push((yield* deploy(dir, input, { acting: null })).id);
  return { filed: true, decision: staffing.decision, drafted_by: by, candidates: plans, workers };
});

/**
 * A person applies the decided plan: the chosen candidate's proposed workers are activated in their name with the
 * decision, through the worker activate path, and the other candidates' proposed workers are ended. Refused for an
 * acting agent, while the decision is not decided on a candidate, and while the gate is no longer reached.
 */
export const apply = (dir: string, opts: { by?: string; at?: string } = {}, def: SpecGates = loadGates()): Effect.Effect<{ decision: string; candidate: string; activated: string[]; ended: string[]; unchanged: string[] }, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const { staffing } = def;
  const by = opts.by?.trim() ?? "";
  const refused = refusedPerson(dir, by || undefined) ?? (by ? null : "name the person (--by)");
  if (refused) return yield* new Refused({ rule: "person-only", message: `only a person applies the staffing plan: ${refused}`, hint: "A lead drafts it; a person decides it and applies it." });
  const { report, decision, workers, reached } = yield* gatesAndDecision(dir, staffing);
  if (!reached) return yield* new Refused({ rule: "staffing-gate", message: `the specs no longer reach ${staffing.after}, so nothing is activated:\n${missingFor(report, staffing.after).join("\n")}` });
  if (!decision) return yield* new Refused({ rule: "staffing-decision", message: `no decision ${staffing.decision}`, hint: "naive staffing draft files it." });
  const chosen = decision.status === "decided" ? candidateFor(decision, decision.answer) : null;
  if (!chosen) return yield* new Refused({ rule: "staffing-decision", message: decision.status === "decided" ? `${staffing.decision} was decided as ${decision.answer ?? "nothing"}, which is no candidate, so nothing is deployed` : `${staffing.decision} is ${decision.status}: a person decides it first`, hint: `naive decide ${staffing.decision} --by <person> --answer <candidate>` });
  const activated: string[] = [], ended: string[] = [], unchanged: string[] = [];
  for (const w of workers) {
    if (w.status !== "proposed") { unchanged.push(w.id); continue; }
    if (w.plan?.candidate === chosen.id) activated.push((yield* move(dir, w.id, { event: "activate", by, decision: staffing.decision, at: opts.at })).id);
    else ended.push((yield* move(dir, w.id, { event: "end", by, how: "revoked", at: opts.at })).id);
  }
  return { decision: staffing.decision, candidate: chosen.id, activated, ended, unchanged };
});

// The command line.

export function main(argv: string[]): number {
  const [dir, first = "status", ...more] = argv;
  // A flag in first place still asks for the status: naive staffing --json.
  const [cmd, rest] = first.startsWith("--") ? ["status", [first, ...more]] : [first, more];
  const flag = (n: string): string | undefined => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
  const json = rest.includes("--json");
  const out = (v: unknown, text: string): void => console.log(json ? JSON.stringify(v, null, 2) : text);
  if (cmd === "status") {
    const s = runSync(status(dir));
    const lines = s.gates.gates.flatMap((g) => [
      `${g.reached ? "reached" : g.passed ? "passed " : "missing"}  ${g.sad} ${g.question}`,
      ...g.questions.map((q) => `    ${q.status.padEnd(7)}  ${q.question}${q.status === "hole" ? `  ${q.hole}` : q.status === "met" ? (q.answers.some((a) => a.cites.length) ? `  (${q.answers.flatMap((a) => a.cites).slice(0, 3).join(", ")})` : "") : `  (${q.answers.filter((a) => !a.holds).map((a) => a.why).join("; ")})`}`),
    ]);
    const plan = s.decision ? [`${s.decision.id}: ${s.decision.question} (${s.decision.status}${s.decision.answer ? `, ${s.decision.answer}` : ""})`,
      ...s.candidates.map((c) => `    ${c.id}${c.withdrawn ? " (withdrawn)" : ""}: ${c.workers.map((w) => `${w.id} ${w.status}`).join(", ")}`)] : [];
    out(s, [...lines, "", `staffing: ${s.stage}`, ...plan, `next: ${s.next}`].join("\n"));
    return 0;
  }
  if (cmd === "draft") {
    const r = runSync(draft(dir, { by: flag("--by"), sponsor: flag("--sponsor") }));
    out(r, r.filed ? [`filed ${r.decision} as ${r.drafted_by}, with ${r.candidates.length} candidate${r.candidates.length === 1 ? "" : "s"}:`, ...r.candidates.map((c) => `    ${c.id}: ${c.deployments.map((d) => d.role).join(", ")}`), `proposed ${r.workers.length} workers; a person decides: naive decide ${r.decision} --by <person> --answer <candidate>`].join("\n") : `${r.decision} is already filed: naive staffing status`);
    return 0;
  }
  if (cmd === "apply") {
    const r = runSync(apply(dir, { by: flag("--by") ?? process.env.MENTURA_PERSON }));
    out(r, [`${r.decision}: ${r.candidate}`, ...r.activated.map((id) => `activated ${id}`), ...r.ended.map((id) => `ended ${id}`)].join("\n"));
    return 0;
  }
  console.error("usage: naive staffing [status] | draft [--by <lead>] [--sponsor <person>] | apply --by <person>   [--json]");
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) {
    const hint = isObject(e) && typeof e.hint === "string" ? `\n${e.hint}` : "";
    console.error(`${e instanceof Error ? e.message : String(e)}${hint}`);
    process.exitCode = 1;
  }
}
