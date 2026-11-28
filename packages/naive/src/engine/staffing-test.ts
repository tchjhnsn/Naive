// Tests the specification gates and the staffing gate (EE-236): each answer read from its record type and field, a
// hole that never blocks, a gate reached only after every gate before it, the shipped gates valid and naming real
// record types, the staffing plan's candidates, and end to end in a venture: a draft refused while the specs are
// missing, one decision with candidates and proposed workers once 1B is reached, a rerun that files nothing, apply
// refused for an agent, before a person decides and when the specs regress, and a person's apply activating the chosen
// workers and ending the rest.
//
//   node packages/naive/src/engine/staffing-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { runSync } from "../core/effect/run.ts";
import { validateValue } from "../records/validate.ts";
import type { DecisionRecord, Role, SpecGates, Worker } from "../records/types/records.d.ts";
import { loadRoles } from "./agents/roles.ts";
import { readWorkers } from "./agents/workers.ts";
import { approve, decisionFile } from "./decisions.ts";
import { crossErrors } from "./generators/spec-gates.ts";
import { answerOf, evaluateGates, loadGates, missingFor } from "./spec-gates.ts";
import type { Rec } from "./spec-gates.ts";
import { apply, distinct, draft, leadFor, planCandidates, staffingState, status } from "./staffing.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 900)}`}`); if (!ok) failed++; };
const refusal = (f: () => unknown): { rule?: string, message?: string } => { try { f(); return {}; } catch (e) { return e as { rule?: string, message?: string }; } };
const ws = mkdtempSync(join(tmpdir(), "staffing-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_READS_AS_OF", "MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_MODEL", "MENTURA_PERSON"]) { delete process.env[k]; delete env[k]; }
const PERSON = "Ana";
const rec = (path: string, value: unknown): Rec => ({ path, value });

try {
  // One answer, read from its record type and field.
  expect("a presence answer holds when one record of the type exists, and cites it",
    answerOf({ record: "idea-dump" }, [rec("raw/dump.md", "ideas")]).holds && answerOf({ record: "idea-dump" }, [rec("raw/dump.md", "x")]).cites[0] === "raw/dump.md"
    && !answerOf({ record: "idea-dump" }, []).holds);
  expect("a field answer needs the field filled, and cites path#field",
    answerOf({ record: "telos", field: "end_state" }, [rec("foundation/telos.json", { end_state: "x" })]).cites[0] === "foundation/telos.json#end_state"
    && !answerOf({ record: "telos", field: "end_state" }, [rec("foundation/telos.json", { end_state: " " })]).holds
    && !answerOf({ record: "constraints", field: "must_not" }, [rec("foundation/constraints.json", { must_not: [] })]).holds);
  expect("a dotted field reads into the record", answerOf({ record: "venture", field: "core.promise" }, [rec("venture.json", { core: { promise: "p" } })]).holds);
  expect("in counts only the values listed, and a list counts when any item does",
    !answerOf({ record: "goal", field: "status", in: ["active"] }, [rec("g.json", { status: "proposed" })]).holds
    && answerOf({ record: "goal", field: "status", in: ["active"] }, [rec("a.json", { status: "proposed" }), rec("b.json", { status: "active" })]).holds
    && answerOf({ record: "x", field: "tags", in: ["b"] }, [rec("x.json", { tags: ["a", "b"] })]).holds);
  const every = answerOf({ record: "requirement", field: "verified_by", every: true }, [rec("r1.json", { verified_by: { kind: "check" } }), rec("r2.json", {})]);
  expect("every needs every record to count, and names the ones that do not", !every.holds && /r2\.json lacks requirement verified_by/.test(every.why ?? ""), every);
  expect("where reads only the records it selects",
    answerOf({ record: "c", where: { field: "status", in: ["building"] }, field: "goals", every: true }, [rec("a.json", { status: "building", goals: ["g"] }), rec("b.json", { status: "retired" })]).holds);
  const blocked = answerOf({ record: "decision-record", field: "status", in: ["open"], none: true, touches: ["foundation/goals/"] },
    [rec("decisions/a.decision.json", { status: "open", applies_to: [{ file: "foundation/goals/g.json", field: "statement" }] }), rec("decisions/b.decision.json", { status: "open", decides: { path: "products/x.json" } })]);
  expect("none holds only when no record matches, and touches keeps the ones naming a spec record", !blocked.holds && blocked.cites.join() === "decisions/a.decision.json#status", blocked);
  expect("a decided decision on a spec record blocks nothing",
    answerOf({ record: "decision-record", field: "status", in: ["open"], none: true, touches: ["foundation/goals/"] }, [rec("d.json", { status: "decided", decides: { path: "foundation/goals/g.json" } })]).holds);

  // The gates.
  const def: Pick<SpecGates, "gates"> = { gates: [
    { id: "a", sad: "0A", name: "A", question: "Is A?", questions: [{ id: "q", question: "q?", answers: [{ record: "t" }] }, { id: "h", question: "h?", hole: "Not built." }] },
    { id: "b", sad: "0B", name: "B", question: "Is B?", questions: [{ id: "q", question: "q?", any: true, answers: [{ record: "u" }, { record: "t" }] }] },
  ] };
  const none = evaluateGates(def, {});
  const some = evaluateGates(def, { t: [rec("t.json", {})] });
  expect("a hole is reported and never blocks its gate", some.gates[0].passed && some.holes.join() === "a/h" && some.gates[0].questions[1].status === "hole");
  expect("any holds on one answer", some.gates[1].passed && some.reached === "b");
  expect("a gate is reached only when every gate before it passes", evaluateGates(def, { u: [rec("u.json", {})] }).gates[1].passed && evaluateGates(def, { u: [rec("u.json", {})] }).reached === null);
  expect("missingFor names each missing question up to the gate, with why", missingFor(none, "b").length === 2 && /^a q: q\? \(no t record\)$/.test(missingFor(none, "b")[0]), missingFor(none, "b"));

  const shipped = loadGates();
  expect("the shipped gates validate against their schema", validateValue("spec-gates.schema.json", shipped).status === 0, validateValue("spec-gates.schema.json", shipped));
  expect("the shipped gates name only record types a venture holds, and the staffing gate follows a gate", crossErrors(shipped).length === 0, crossErrors(shipped));
  expect("the shipped gates ask SAD's 0A to 1B in order, each named by a question", shipped.gates.map((g) => g.sad).join() === "0A,0B,0C,1A,1B" && shipped.gates.every((g) => g.question.endsWith("?")));
  expect("the generator refuses an unknown record type and a staffing gate after no gate",
    crossErrors({ gates: [{ id: "x", sad: "0A", name: "X", question: "X?", questions: [{ id: "q", question: "q?", answers: [{ record: "nonsense" }] }] }], staffing: { ...shipped.staffing, after: "zz" } }).length === 2);
  expect("the schema refuses a question that is both a hole and answered",
    validateValue("spec-gates.schema.json", { ...shipped, gates: [{ ...shipped.gates[0], questions: [{ id: "q", question: "q?", hole: "x", answers: [{ record: "telos" }] }] }] }).status !== 0);

  // The plan's candidates.
  const roles = loadRoles();
  expect("the lead whose portfolio holds a function deploys for it", leadFor("products", roles) === "product-lead" && leadFor("human-capital", roles) === "strategy-lead");
  const plans = planCandidates(shipped.staffing, ["products", "strategy"], roles);
  expect("function-agents proposes each function's agent, deployed by its lead",
    plans[0].deployments.map((d) => `${d.role}/${d.deployer}`).join() === "products-agent/product-lead,strategy-agent/strategy-lead", plans[0]);
  expect("library-roles proposes the library's roles for each function, never a lead or a person",
    plans[1].deployments.some((d) => d.role === "architect") && plans[1].deployments.every((d) => !(roles.get(d.role) as Role | undefined)?.portfolio && (roles.get(d.role) as Role | undefined)?.kind !== "person"), plans[1]);
  expect("a function no library role serves falls back to its agent", planCandidates(shipped.staffing, ["supply-chain"], roles)[1].deployments[0]?.role === "supply-chain-agent");
  expect("a candidate that proposes the same workers as an earlier one is dropped", distinct(planCandidates(shipped.staffing, ["supply-chain"], roles)).length === 1);
  expect("the stages follow the gate, the decision and its workers",
    staffingState(false, null, []) === "specs-missing" && staffingState(true, null, []) === "ready-to-draft"
    && staffingState(true, { status: "open", candidates: [] }, []) === "awaiting-decision"
    && staffingState(true, { status: "decided", answer: "x", candidates: [{ id: "x", label: "x", proposed_by: { kind: "agent" } }] }, [{ plan: { decision: "d", candidate: "x" }, status: "proposed" } as Worker]) === "ready-to-apply"
    && staffingState(true, { status: "decided", answer: "x", candidates: [{ id: "x", label: "x", proposed_by: { kind: "agent" } }] }, [{ plan: { decision: "d", candidate: "x" }, status: "active" } as Worker]) === "deployed");

  // End to end in a venture.
  const made = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/init-venture.ts"), join(ws, "ventures/lab"), "lab", "--type", "software-startup"], { encoding: "utf8", env });
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  const dir = join(ws, "ventures/lab");
  const put = (p: string, v: unknown): void => { mkdirSync(dirname(join(dir, p)), { recursive: true }); writeFileSync(join(dir, p), typeof v === "string" ? v : JSON.stringify(v, null, 2)); };
  put("people/people.json", { venture: "lab", mode: "solo", people: [{ id: "ana", name: PERSON, role: "founder" }] });

  const early = refusal(() => runSync(draft(dir)));
  expect("a draft before 1B is refused, naming what is missing", early.rule === "staffing-gate" && /0a ideas-written: Are the founder's ideas written down\?/.test(early.message ?? ""), early);
  expect("a refused draft writes nothing", !decisionFile(dir, "staffing-plan") && !existsSync(join(dir, "operations/workers")));

  put("raw/dump.md", "Release notes write themselves.\n");
  put("ideas/graph.json", { root: "release-notes" });
  put("foundation/problem.json", { venture: "lab", statement: "Release notes take a day.", segment: "maintainers", evidence: ["interview-1"] });
  put("foundation/telos.json", { statement: "s", end_state: "Every release explains itself.", measures: [], owner_outcome: "o" });
  const v = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) as Record<string, unknown>;
  put("venture.json", { ...v, core: { ...(v.core as object | undefined), promise: "Release notes from your commits." } });
  put("foundation/icp/maintainers.json", { id: "maintainers" });
  put("foundation/pre-registration/notes.json", { id: "notes", status: "registered", thesis: "t" });
  put("foundation/goals/ship.json", { id: "ship", statement: "Ship notes.", kind: "outcome", status: "active" });
  put("foundation/exit-criteria/discovery.json", { phase: "discovery", criteria: ["ten maintainers use it"] });
  put("foundation/constraints.json", { must_not: ["store source code"] });
  put("product/notes.json", { name: "Notes" });
  put("product/capabilities/generate.json", { id: "generate", status: "building", goals: ["ship"] });
  put("foundation/requirements/cite.json", { id: "cite", statement: "s", derives_from: "ship", verified_by: { kind: "check" }, constrains: ["products", "marketing-and-sales"] });
  put("governance/decisions/scope.decision.json", { id: "scope", question: "Narrow the goal?", status: "open", applies_to: [{ file: "foundation/goals/ship.json", field: "statement" }] });
  const before = runSync(status(dir));
  expect("an open decision on a spec record keeps 1B from being reached, and so do the questions still missing",
    before.stage === "specs-missing" && before.missing.some((m) => m.startsWith("1b decisions-settled")) && before.missing.some((m) => m.startsWith("1b design-written")), before.missing);
  put("governance/decisions/scope.decision.json", { id: "scope", question: "Narrow the goal?", status: "decided", answer: "no", applies_to: [{ file: "foundation/goals/ship.json", field: "statement" }] });
  put("artifacts/spec.json", { id: "spec", kind: "document", title: "Spec", built_from: [], built_at: "2026-11-28T00:00:00Z", document_kind: "spec" });
  const ready = runSync(status(dir));
  expect("with every question answered 1B is reached, the holes reported and the plan ready to draft",
    ready.stage === "ready-to-draft" && ready.gates.reached === "1b" && ready.gates.holes.join() === "0b/research-synthesized,1b/data-modelled", ready);
  expect("each met answer cites where in the records it lives",
    ready.gates.gates[2].questions.find((q) => q.id === "promise-stated")?.answers[0].cites.join() === "venture.json#core.promise");

  process.env.MENTURA_ACTOR_ID = "growth-lead";
  const imposter = refusal(() => runSync(draft(dir)));
  delete process.env.MENTURA_ACTOR_ID;
  expect("another agent may not draft in the drafting lead's name", imposter.rule === "drafter" && /growth-lead is acting/.test(imposter.message ?? ""), imposter);
  expect("a role that is not a lead may not draft", refusal(() => runSync(draft(dir, { by: "architect" }))).rule === "drafter");

  process.env.MENTURA_ACTOR_ID = "strategy-lead";
  const filed = runSync(draft(dir, { at: "2026-11-28T00:00:00.000Z" }));
  delete process.env.MENTURA_ACTOR_ID;
  const file = decisionFile(dir, "staffing-plan") ?? "";
  const d = JSON.parse(readFileSync(join(dir, file), "utf8")) as DecisionRecord;
  expect("the human-capital lead files one open decision asking whether to begin deploying agents",
    filed.filed && filed.drafted_by === "strategy-lead" && file === "operations/decisions/staffing-plan.decision.json" && d.status === "open" && d.question === "Would you like to begin deploying agents?", { filed, d });
  expect("its candidates are the distinct sets of proposed workers, proposed by the lead and resting on the spec records",
    (d.candidates ?? []).map((c) => c.id).join() === "function-agents,library-roles" && (d.candidates ?? []).every((c) => c.proposed_by.kind === "agent" && c.proposed_by.id === "strategy-lead")
    && (d.candidates?.[0].evidence ?? []).includes("foundation/requirements/cite.json"), d.candidates);
  const workers = runSync(readWorkers(dir));
  const fa = workers.filter((w) => w.plan?.candidate === "function-agents");
  expect("the specs' functions are in scope: those the requirement constrains and those the spec records belong to",
    fa.map((w) => w.role).sort().join() === "marketing-and-sales-agent,products-agent,strategy-agent", fa.map((w) => w.role));
  expect("every worker is written proposed, durable, sponsored by the founder and deployed by the lead that holds its function",
    workers.length === filed.workers.length && workers.every((w) => w.status === "proposed" && w.mode === "durable" && w.sponsor === PERSON)
    && fa.find((w) => w.role === "products-agent")?.deployed_by === "product-lead" && fa.find((w) => w.role === "marketing-and-sales-agent")?.deployed_by === "growth-lead", workers);
  expect("every proposed worker validates", workers.every((w) => validateValue("worker.schema.json", w).status === 0));
  expect("a rerun leaves the plan already filed", !runSync(draft(dir)).filed && runSync(readWorkers(dir)).length === workers.length);

  expect("apply before a person decides is refused", /is open: a person decides it first/.test(refusal(() => runSync(apply(dir, { by: PERSON }))).message ?? ""));
  process.env.MENTURA_ACTOR_ID = "strategy-lead";
  const agentApply = refusal(() => runSync(apply(dir, { by: PERSON })));
  delete process.env.MENTURA_ACTOR_ID;
  expect("apply by an acting agent is refused, even in a person's name", agentApply.rule === "person-only" && /an agent \(strategy-lead\) is acting/.test(agentApply.message ?? ""), agentApply);
  expect("apply by a role is refused", refusal(() => runSync(apply(dir, { by: "strategy-lead" }))).rule === "person-only");

  const decided = approve(dir, "staffing-plan", { by: PERSON, answer: "library-roles" });
  expect("a person decides the plan by choosing a candidate", decided.ok, decided);
  rmSync(join(dir, "artifacts/spec.json"));
  const regressed = refusal(() => runSync(apply(dir, { by: PERSON })));
  expect("apply when the specs no longer reach 1B is refused, and nothing is activated",
    regressed.rule === "staffing-gate" && /1b design-written/.test(regressed.message ?? "") && runSync(readWorkers(dir)).every((w) => w.status === "proposed"), regressed);
  put("artifacts/spec.json", { id: "spec", kind: "document", title: "Spec", built_from: [], built_at: "2026-11-28T00:00:00Z", document_kind: "spec" });

  const applied = runSync(apply(dir, { by: PERSON }));
  const after = runSync(readWorkers(dir));
  const chosen = after.filter((w) => w.plan?.candidate === "library-roles");
  expect("apply activates the chosen candidate's workers in the person's name, with the decision",
    applied.candidate === "library-roles" && chosen.length === applied.activated.length && chosen.every((w) => w.status === "active" && w.activated_by === PERSON && w.decision === "staffing-plan"), { applied, chosen });
  expect("and ends the proposed workers of the candidates not chosen",
    after.filter((w) => w.plan?.candidate === "function-agents").every((w) => w.status === "ended" && w.ended_how === "revoked") && applied.ended.length === fa.length, applied);
  expect("a second apply changes nothing", runSync(apply(dir, { by: PERSON })).activated.length === 0);
  expect("the plan is deployed", runSync(status(dir)).stage === "deployed");

  const cli = (args: string[], extra: NodeJS.ProcessEnv = {}) => spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/naive.ts"), "staffing", ...args, "--venture", dir], { encoding: "utf8", env: { ...env, ...extra } });
  const shown = cli(["--json"]);
  expect("naive staffing --json prints the gates and the stage", shown.status === 0 && (JSON.parse(shown.stdout) as { stage?: string }).stage === "deployed", shown.stdout + shown.stderr);
  const text = cli(["status"]);
  expect("naive staffing status names each gate by its question", /reached\s+1B Is the version specified well enough to staff\?/.test(text.stdout) && /hole\s+What does the product store/.test(text.stdout), text.stdout);
  const viaAgent = cli(["apply", "--by", PERSON], { MENTURA_ACTOR_ID: "strategy-lead" });
  expect("naive staffing apply by an agent exits non-zero", viaAgent.status !== 0 && /only a person applies the staffing plan/.test(viaAgent.stderr), viaAgent.stderr);
  expect("naive staffing with an unknown command prints its usage", cli(["hire"]).status === 2);
}
catch (e) { expect("the test ran", false, e instanceof Error ? e.stack ?? e.message : String(e)); }
finally { rmSync(ws, { recursive: true, force: true }); }

console.log(failed ? `\n${failed} failed` : "\nstaffing: all passed");
process.exit(failed ? 1 : 0);
