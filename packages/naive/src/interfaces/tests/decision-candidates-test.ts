// Tests for candidates and fluid decisions (EE-211): an undecided record holds several ideas at once, each
// idea is an option with its own provenance, a person withdraws a question or one idea with one command and
// nothing is removed, choosing one idea writes it and leaves the others, and a person reopens a decided
// decision freely in Discovery and Validation and with an explicit override after that.
//
// The worked case is a goal, because a goal record has no options of its own: before this, the only way to
// keep two goals in play was to pick one and lose the other.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCandidate, approve, decisions, merge, propose, reopen, rollback, undecidedFor, withdraw } from "../../engine/decisions.ts";
import { brief, liveCandidates, optionsOf, proposesOf, writeOf } from "../../engine/decision-candidates.ts";
import { call } from "../../router/router.ts";

let failed = 0;
const expect = (name: string, ok: unknown, detail?: unknown) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };

const v = mkdtempSync(join(tmpdir(), "candidates-"));
const json = (rel: string) => JSON.parse(readFileSync(join(v, rel), "utf8"));
const D = "foundation/goals/decisions/north-star.decision.json";
const GOAL = "foundation/goals/north-star.json";
const LAYERS = { purpose: true, knowledge: false, operations: false, evidence: false, governance: true, interface: false };
const phase = (p: string) => writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "cand", name: "Cand", type: "software-startup", parent: null, owner: "self", status: "active", phase: p, layers: LAYERS }, null, 2));
mkdirSync(join(v, "foundation/goals/decisions"), { recursive: true });
mkdirSync(join(v, "people"), { recursive: true });
phase("discovery");
writeFileSync(join(v, "people/people.json"), JSON.stringify({ venture: "cand", mode: "solo", people: [{ id: "founder", name: "Torian", role: "founder" }] }, null, 2));
const goal = (id: string, statement: string) => ({ id, statement, kind: "venture" });

const p = propose(v, { at: "foundation/goals", name: "north-star", id: "north-star", question: "What is the venture's north star goal?" }, { agentId: "strategy-agent" });
expect("an agent proposes the open decision beside the goal", p.ok && json(D).status === "open", p);

// --- 1. Candidates: any number of ideas coexist on one open decision ---

const one = addCandidate(v, "north-star", { id: "reach", label: "Reach a thousand founders", why: "The widest door", body: goal("north-star", "A thousand founders run a venture on Naive by the end of 2027."), evidence: ["purpose/problem.json"] }, { agentId: "strategy-agent" });
const two = addCandidate(v, "north-star", { id: "depth", label: "One venture all the way", why: "Proof beats reach", body: goal("north-star", "One venture reaches Beachhead entirely inside Naive.") }, { agentId: "products-agent" });
expect("an agent adds two ideas and both stay on the table", one.ok && two.ok && json(D).candidates.length === 2, json(D).candidates);
expect("each idea keeps who proposed it and when", json(D).candidates[0].proposed_by.id === "strategy-agent" && json(D).candidates[1].proposed_by.id === "products-agent" && !!json(D).candidates[0].created, json(D).candidates);
expect("each candidate's id is an option", optionsOf(json(D)).join(",") === "reach,depth", optionsOf(json(D)));
const three = addCandidate(v, "north-star", { id: "measure", label: "Add a measure to whichever goal wins", patch: [{ field: "why", value: "Because a goal with no measure is a wish." }] }, { agentId: "strategy-agent" });
expect("a third idea patches fields instead of proposing a whole record", three.ok && three.result.proposes === "foundation/goals/north-star.json why", three);
expect("a duplicate id is refused", /already has an option reach/.test(addCandidate(v, "north-star", { id: "reach", label: "Again" }, { agentId: "strategy-agent" }).error ?? ""));
expect("an idea cannot be written in as already withdrawn", /withdrawn with mentura withdraw/.test(addCandidate(v, "north-star", { id: "sneaky", label: "x", withdrawn_by: "Torian" }, { agentId: "strategy-agent" }).error ?? ""));
expect("an idea needs an id and a label", /needs an id and a label/.test(addCandidate(v, "north-star", { label: "No id" }, { agentId: "strategy-agent" }).error ?? ""));
const bad = addCandidate(v, "north-star", { id: "folder", label: "A folder is not a record", file: "foundation/goals/", body: goal("x", "x") }, { agentId: "strategy-agent" });
expect("an idea that writes a folder is refused when it is added, not at merge", !bad.ok && /not a record file/.test(bad.error ?? ""), bad);

// --- 2. Reads: the record is undecided and every live idea is on it ---

const listed = decisions(v).decisions.find((x) => x.id === "north-star");
expect("the decision matrix lists the ideas without their bodies", listed?.candidates?.length === 3 && listed?.candidates?.every((c) => !("body" in c) && !!c.proposes), listed?.candidates);
const un = undecidedFor(v, GOAL, "cand");
expect("the record reads as undecided, with every live idea whole", un.length === 1 && un[0].decision === "north-star" && un[0].candidates.length === 3 && !!un[0].candidates[0].body, un);
expect("the undecided read says how to decide it, with the live options", /--answer <reach\|depth\|measure>/.test(un[0].decide), un[0].decide);
const read = await call({ venture: "cand", route: "foundation/goals/north-star", action: "read", workspace: v, actor: "agent" }) as { ok: boolean; result: unknown; undecided?: { decision: string; candidates: unknown[] }[] };
expect("a route read of a record that does not exist yet still shows its ideas", read.ok && read.result === null && read.undecided?.[0]?.decision === "north-star" && read.undecided[0].candidates.length === 3, read.undecided);

// --- 3. Withdrawing: one command, and nothing is removed ---

expect("only a person withdraws an option", /only a person withdraws an option/.test(withdraw(v, "north-star", { by: "Mallory", option: "depth" }).error ?? ""));
const w = withdraw(v, "north-star", { by: "Torian", option: "depth", why: "Too narrow for a first goal" });
expect("one command takes one idea off the table and leaves the decision open", w.ok && json(D).status === "open" && w.result.left?.join(",") === "reach,measure", w);
expect("the withdrawn idea is kept with who withdrew it and why", json(D).candidates.length === 3 && json(D).candidates[1].withdrawn_by === "Torian" && json(D).candidates[1].withdrawn_why === "Too narrow for a first goal", json(D).candidates[1]);
expect("a withdrawn idea is no longer read as live", undecidedFor(v, GOAL)[0].candidates.length === 2 && liveCandidates(json(D)).length === 2);
expect("withdrawing it twice is refused", /already withdrawn/.test(withdraw(v, "north-star", { by: "Torian", option: "depth" }).error ?? ""));
expect("withdrawing an option the decision never had is refused", /has no option ghost/.test(withdraw(v, "north-star", { by: "Torian", option: "ghost" }).error ?? ""));
expect("a withdrawn idea is never the answer", /was withdrawn from north-star by Torian/.test(approve(v, "north-star", { by: "Torian", answer: "depth" }).error ?? ""));
expect("an agent cannot put back an idea a person withdrew", /only a person puts it back/.test(addCandidate(v, "north-star", { id: "depth", label: "Back" }, { agentId: "strategy-agent" }).error ?? ""));
const back = addCandidate(v, "north-star", { id: "depth", label: "One venture all the way", body: goal("north-star", "One venture reaches Beachhead entirely inside Naive.") }, { by: "Torian" });
expect("a person puts it back, so a withdrawal is recoverable", back.ok && back.result.restored === true && liveCandidates(json(D)).length === 3, back);

// --- 4. Choosing: the chosen idea is written, and the others stay ---

writeFileSync(join(v, D), JSON.stringify({ ...json(D), applies_to: [{ file: GOAL, field: "statement" }] }, null, 2));
const chose = approve(v, "north-star", { by: "Torian", answer: "reach" });
expect("a person decides with an idea's id", chose.ok && json(D).status === "decided" && json(D).answer === "reach", chose);
const m = merge(v, "north-star", { by: "Torian" });
expect("merging writes the chosen idea's whole record", m.ok && json(GOAL).statement === "A thousand founders run a venture on Naive by the end of 2027." && json(GOAL).kind === "venture", m);
expect("the ideas not chosen stay on the decision for later", json(D).candidates.length === 3 && optionsOf(json(D)).includes("measure"), json(D).candidates.map((c: { id: string }) => c.id));
expect("the chosen idea cannot be withdrawn while it is the answer", /is the answer of north-star: reopen it first/.test(withdraw(v, "north-star", { by: "Torian", option: "reach" }).error ?? ""));
expect("the provenance line names the candidate that landed", readFileSync(join(v, "provenance.jsonl"), "utf8").includes("candidate reach"));

// A body that breaks the record's schema is refused, and nothing is written.
const decided = readFileSync(join(v, D), "utf8");
writeFileSync(join(v, D), JSON.stringify({ ...json(D), status: "open", answer: null }, null, 2));
const broken = addCandidate(v, "north-star", { id: "broken", label: "A goal with no statement", body: { id: "north-star", kind: "nonsense" } }, { agentId: "strategy-agent" });
writeFileSync(join(v, D), JSON.stringify({ ...json(D), status: "decided", answer: "broken", version: 2, provenance: { drafted_by: { kind: "person", id: "Torian" }, approved_by: "Torian", approved_at: "2026-11-26T00:00:00Z", phase: "discovery" } }, null, 2));
const mb = merge(v, "north-star", { by: "Torian" });
expect("a candidate whose body breaks the record's schema is refused, and the record is unchanged", broken.ok && !mb.ok && /not match schema\/goal.schema.json/.test(mb.error ?? "") && json(GOAL).statement === "A thousand founders run a venture on Naive by the end of 2027.", mb);

// --- 5. Fluid decisions: a person reopens one ---

writeFileSync(join(v, D), decided);
expect("only a person reopens a decision", /only a person reopens/.test(reopen(v, "north-star", { by: "Mallory" }).error ?? ""));
expect("reopening needs a name", /needs the person's name/.test(reopen(v, "north-star", {}).error ?? ""));
const ro = reopen(v, "north-star", { by: "Torian", why: "The interviews changed my mind" });
const after = json(D);
expect("in Discovery a person reopens a decided decision as a matter of course", ro.ok && after.status === "open" && after.answer === null && after.version === 2, ro);
expect("the answer it had is kept, both in versions and in reopened", after.versions.some((x: { version: number; answer: string }) => x.version === 1 && x.answer === "reach") && after.reopened[0].version === 1 && after.reopened[0].answer === "reach" && after.reopened[0].by === "Torian" && after.reopened[0].phase === "discovery" && after.reopened[0].why === "The interviews changed my mind", after.reopened);
expect("the reopened decision keeps every idea on the table, each in its place", optionsOf(after).join(",") === "reach,depth,measure", optionsOf(after));
expect("the reopened question renders now again", decisions(v).decisions.find((x) => x.id === "north-star")?.render === "now");
expect("a reopen in Discovery needs no override, so none is recorded", !after.reopened[0].override, after.reopened[0]);
expect("reopening an open decision is refused", /is open, not decided/.test(reopen(v, "north-star", { by: "Torian" }).error ?? ""));
const rb = rollback(v, "north-star", 1, { by: "Torian" });
expect("the prior answer is recoverable: a rollback restores it", rb.ok && json(D).answer === "reach" && json(D).status === "decided", rb);
const again = reopen(v, "north-star", { by: "Torian" });
expect("a decision reopened twice counts both", again.ok && json(D).reopened.length === 2, again);
expect("an option cannot be added to a decided decision, and the refusal says to reopen it", (() => {
  const keep = readFileSync(join(v, D), "utf8");
  writeFileSync(join(v, D), JSON.stringify({ ...json(D), status: "decided", answer: "reach", provenance: { drafted_by: { kind: "person", id: "Torian" }, approved_by: "Torian", approved_at: "2026-11-26T00:00:00Z", phase: "discovery" } }, null, 2));
  const r = addCandidate(v, "north-star", { id: "late", label: "Too late" }, { agentId: "strategy-agent" });
  writeFileSync(join(v, D), keep);
  return !r.ok && /mentura reopen north-star/.test(r.error ?? "");
})());

// Past Validation a reopen needs the person's explicit override.
phase("beachhead");
writeFileSync(join(v, D), JSON.stringify({ ...json(D), status: "decided", answer: "reach", provenance: { drafted_by: { kind: "person", id: "Torian" }, approved_by: "Torian", approved_at: "2026-11-26T00:00:00Z", phase: "beachhead" } }, null, 2));
const late = reopen(v, "north-star", { by: "Torian" });
expect("past Validation a reopen is refused without the override", !late.ok && /beachhead is past Validation/.test(late.error ?? ""), late);
const over = reopen(v, "north-star", { by: "Torian", override: true, why: "The market moved" });
expect("with the override it reopens, and the record says so", over.ok && json(D).reopened.at(-1).override === true && json(D).reopened.at(-1).phase === "beachhead", over);

// A one-way door needs the override in every phase, and a founder.
phase("discovery");
writeFileSync(join(v, D), JSON.stringify({ ...json(D), status: "decided", answer: "reach", door: "one-way", provenance: { drafted_by: { kind: "person", id: "Torian" }, approved_by: "Torian", approved_at: "2026-11-26T00:00:00Z", phase: "discovery" } }, null, 2));
const door = reopen(v, "north-star", { by: "Torian" });
expect("a one-way door needs the override even in Discovery", !door.ok && /one-way door/.test(door.error ?? ""), door);
writeFileSync(join(v, "people/people.json"), JSON.stringify({ venture: "cand", mode: "team", people: [{ id: "founder", name: "Torian", role: "founder" }, { id: "ops", name: "Ada", role: "operator" }] }, null, 2));
const notFounder = reopen(v, "north-star", { by: "Ada", override: true });
expect("only a founder reopens a one-way door", !notFounder.ok && /only a founder reopens it/.test(notFounder.error ?? ""), notFounder);
const founder = reopen(v, "north-star", { by: "Torian", override: true, why: "We never shipped it" });
expect("a founder with the override reopens a one-way door", founder.ok && json(D).status === "open", founder);

// --- 6. The pure rules ---

const bare = { id: "plain", label: "Just the words", proposed_by: { kind: "person" as const, id: "Torian" } };
expect("a candidate with no body and no patch merges its label", writeOf(bare, GOAL).write?.kind === "label", writeOf(bare, GOAL));
expect("proposesOf says the shape of each idea in one phrase", proposesOf(bare, GOAL) === "its label as the answer" && proposesOf({ ...bare, body: {} }, GOAL) === `the whole of ${GOAL}`);
expect("a brief carries no body", !("body" in brief({ ...bare, body: { a: 1 } }, GOAL)), brief({ ...bare, body: { a: 1 } }, GOAL));

// A bare candidate merges its label wherever applies_to says, the way an options string does.
const b = mkdtempSync(join(tmpdir(), "candidates-label-"));
mkdirSync(join(b, "marketing/decisions"), { recursive: true });
mkdirSync(join(b, "people"), { recursive: true });
writeFileSync(join(b, "venture.json"), JSON.stringify({ id: "lab", name: "Lab", type: "software-startup", phase: "discovery" }, null, 2));
writeFileSync(join(b, "people/people.json"), readFileSync(join(v, "people/people.json")));
propose(b, { at: "marketing", name: "mission", id: "mission", question: "What is the mission?", applies_to: [{ file: "venture.json", field: "core.promise" }] }, { agentId: "cos" });
addCandidate(b, "mission", { id: "founders", label: "We help founders." }, { agentId: "cos" });
approve(b, "mission", { by: "Torian", answer: "founders" });
const ml = merge(b, "mission", { by: "Torian" });
expect("choosing a bare candidate merges its label at applies_to", ml.ok && JSON.parse(readFileSync(join(b, "venture.json"), "utf8")).core.promise === "We help founders.", ml);

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
