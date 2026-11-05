#!/usr/bin/env node
// Replays the netflix-culture playbook on fixture ventures through the router.
// A rule fails here only when the real routes do what the model forbids, or when
// a check cannot both pass and fail.
//
//   node verification/playbook-netflix-culture/replay.mjs

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { call, routes } from "../../interface/router.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../..");
const playbook = readFileSync(join(repo, "library/packages/people/playbooks/netflix-culture.md"), "utf8");
const rows = [];
const fail = (rule, message) => {
  rows.push({ rule, result: "FAIL", replay: message });
  console.error(`FAIL  ${rule}: ${message}`);
};
const pass = (rule, replay) => {
  rows.push({ rule, result: "PASS", replay });
  console.log(`PASS  ${rule}: ${replay}`);
};

const STEPS = [
  ["foundation/problem", "read"],
  ["knowledge/venture-profile", "read"],
  ["foundation/alignment", "read"],
  ["people/team", "read"],
  ["people", "read"],
  ["people/founders", "read"],
  ["people/founders/[id]", "read"],
  ["governance/decision-rights", "read"],
  ["governance/ownership", "read"],
  ["people/team-plan", "read"],
  ["people/team-plan", "write"],
  ["people/team-plan", "check"],
  ["decisions/[id]", "read"],
  ["decisions/[id]", "write"],
];

const MARKS = [
  "Netflix",
  "The Dream Team",
  "People Over Process",
  "People over Process",
  "Uncomfortably Exciting",
  "Great and Always Better",
  "keeper test",
  "informed captain",
  "farming for dissent",
  "context not control",
  "highly aligned, loosely coupled",
  "loosely coupled, highly aligned",
  "disagree then commit",
  "personal top of market",
  "Freedom and Responsibility",
  "Take vacation",
  "Act in Netflix's best interests",
];

const table = routes();
const missing = STEPS.filter(([route, action]) => {
  const hit = table.find((r) => r.route === route);
  return !hit || !hit.actions.includes(action) || !playbook.includes(route);
});
if (missing.length) fail("RouteIsReal", `missing from the router or the playbook: ${missing.map(([r, a]) => `${r} ${a}`).join("; ")}`);
else pass("RouteIsReal", `${STEPS.length} playbook routes are in the router with the named action, and each route string is in the playbook`);

const unmarked = MARKS.filter((m) => !playbook.toLowerCase().includes(m.toLowerCase()));
if (unmarked.length) fail("TrademarkNamed", `the playbook does not name: ${unmarked.join("; ")}`);
else pass("TrademarkNamed", "the playbook names every phrase the culture check refuses");

const mentura = (args, workspace) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...args, "--workspace", workspace], { encoding: "utf8" });

function gapsOf(team) {
  if (!team) return { ok: false, error: "people/team has no record" };
  const gaps = (team.needed ?? []).filter((n) => !(team.held ?? []).some((h) => h.skill === n.skill)).map((n) => n.skill);
  return { ok: true, gaps };
}

function cultureCheck({ plan, alignment, team, ownership, brief, decision, problem }) {
  const reasons = [];
  const note = plan?.note ?? "";
  const text = `${note}\n${brief ?? ""}`;
  for (const mark of MARKS) if (text.toLowerCase().includes(mark.toLowerCase())) reasons.push(`contains ${mark}`);
  for (const label of ["Behaviors:", "Not for:", "Question:", "Cites:", "Rests on:", "Revised:"]) {
    if (!note.includes(label)) reasons.push(`note has no ${label}`);
  }
  const behaviors = note.split("\n").filter((l) => l.startsWith("- "));
  if (!behaviors.length) reasons.push("note has no behavior");
  for (const line of behaviors) if (!line.includes(":")) reasons.push("a behavior has no test");
  const principles = alignment?.principles ?? [];
  const cites = (note.match(/^Cites: (.+)$/m) ?? [])[1] ?? "";
  if (!principles.length) {
    if (cites.trim() !== "none") reasons.push("Cites is not none");
  } else {
    for (const id of cites.split(",").map((s) => s.trim().replace(/^alignment:/, "")).filter(Boolean)) {
      if (!principles.some((p) => p.id === id)) reasons.push(`Cites names ${id}, which alignment does not have`);
    }
  }
  for (const p of principles) if (p.statement && note.includes(p.statement)) reasons.push("note pastes an alignment statement");
  if (problem?.statement && note.includes(problem.statement)) reasons.push("note pastes the problem statement");
  const gaps = gapsOf(team);
  if (!gaps.ok) reasons.push(gaps.error);
  else for (const skill of gaps.gaps) if (!(brief ?? "").includes(skill)) reasons.push(`brief does not name gap ${skill}`);
  if (!ownership) {
    if (!brief?.includes("Pay: not recorded")) reasons.push("pay is not recorded and the brief does not say so");
    if (!brief?.includes("Equity: not recorded")) reasons.push("equity is not recorded and the brief does not say so");
    if (/\d/.test(brief ?? "")) reasons.push("brief contains a figure");
  } else {
    if (!brief?.includes("Pay: see governance/ownership")) reasons.push("brief does not point pay at governance/ownership");
    if (!brief?.includes("Equity: see governance/ownership")) reasons.push("brief does not point equity at governance/ownership");
    for (const grant of ownership.grants ?? []) if (String(brief).includes(String(grant.amount))) reasons.push(`brief copies grant amount ${grant.amount}`);
  }
  if (decision?.status !== "decided" || !decision?.provenance?.approved_by) reasons.push("a person has not decided team-plan-culture");
  return reasons;
}

const noteFor = (cites) => `Behaviors:
- We name one owner for a significant decision: the owner asks for disagreement before the call, and the people who disagreed carry the call out
- We keep a rule only when it prevents a harm we can name: harassment and leaking private records are the rules in force here
Not for: someone who wants the bar to be adequate
Question: Would I be glad to work with this person again on the next hard week?
Cites: ${cites}
Rests on: foundation/problem, people/team
Revised: at the next phase change
`;

const briefFor = (pay, equity) => `# Practice lead

## The role

- Role and kind: hire.

## Hiring bar
Role: practice-lead
Must have:
- customer conversations
Working together: they leave the other person clearer
Decency: they do not belittle a colleague
Question: Would I be glad to work with this person again on the next hard week?
Adequate: a person who can do the task and is hard on the people around them is not enough
Pay: ${pay}
Equity: ${equity}
`;

/** @param {string} id @param {{ recruiting?: object[], note: string, why: string }} fields */
function planFor(id, { recruiting, note, why }) {
  return {
    venture: id,
    updated: "2026-10-29",
    note,
    roles: [
      { id: "founder", occupant: "person", needed_by: "discovery", status: "filled", why: "Decides the culture doc and the hiring bar" },
      { id: "practice-lead", name: "Practice lead", occupant: "person", needed_by: "discovery", status: "open", why },
    ],
    ...(recruiting ? { recruiting } : {}),
  };
}

async function writePerson(workspace, id, route, input) {
  const r = await call({ venture: id, route, action: "write", input, actor: "person", workspace, via: "replay" });
  if (!r.ok) throw new Error(`${route} write: ${r.error ?? JSON.stringify(r)}`);
  if (r.result?.draft) throw new Error(`${route} write by a person landed as a draft`);
  return r;
}

async function setup(workspace, id, { ownership }) {
  const dir = join(workspace, "ventures", id);
  const made = spawnSync("node", [join(repo, "schema/init-venture.mjs"), dir, id, "--phase", "discovery"], { encoding: "utf8" });
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  const evidence = {
    id: "founder-notes",
    kind: "stated",
    summary: "The founder named the skill this phase needs.",
    source: { title: "Fixture note", path: "profile.md" },
    audience: "target",
    collected: "2026-10-29",
  };
  await writePerson(workspace, id, "foundation/problem", {
    venture: id, updated: "2026-10-29", statement: "The fixture problem stays on this record.", segment: "The founder running this fixture", evidence: [],
  });
  await writePerson(workspace, id, "foundation/alignment", {
    venture: id, updated: "2026-10-29",
    principles: [{ id: "own-words", statement: "The founder writes the culture doc in their own words.", applies_to: ["team"], source: "Fixture Founder, 2026-10-29", check: "The team-plan note does not paste this statement." }],
  });
  await writePerson(workspace, id, "people/team", {
    venture: id, updated: "2026-10-29",
    needed: [{ skill: "customer conversations", by_phase: "discovery", why: "The founder cannot learn the segment alone." }],
    held: [],
    evidence: [evidence],
  });
  await writePerson(workspace, id, "people/founders/fixture-founder", { id: "fixture-founder", name: "Fixture Founder", role: "founder", joined: "2026-10-29" });
  await writePerson(workspace, id, "people", {
    venture: id, mode: "solo", updated: "2026-10-29",
    people: [{ id: "fixture-founder", name: "Fixture Founder", role: "founder", founder_file: "people/founders/fixture-founder.json" }],
  });
  if (ownership) {
    await writePerson(workspace, id, "governance/ownership", {
      updated: "2026-10-29", unit: "percent",
      classes: [{ id: "common", kind: "common" }],
      holders: [{ id: "fixture-founder", name: "Fixture Founder", kind: "founder", role: "founder" }],
      grants: [{ holder: "fixture-founder", class: "common", amount: 17, granted: "2026-10-29" }],
    });
  }
  return dir;
}

async function readRoute(workspace, id, route) {
  return call({ venture: id, route, action: "read", actor: "person", workspace, via: "replay" });
}

const ws = mkdtempSync(join(tmpdir(), "netflix-culture-"));
try {
  const bare = join(ws, "ventures", "no-team");
  spawnSync("node", [join(repo, "schema/init-venture.mjs"), bare, "no-team", "--phase", "discovery"], { encoding: "utf8" });
  const missingTeam = await readRoute(ws, "no-team", "people/team");
  const refused = gapsOf(missingTeam.result);
  let emptyPlanOk = false;
  const bareCheck = await call({ venture: "no-team", route: "people/team-plan", action: "check", workspace: ws, via: "replay" });
  const bareCulture = cultureCheck({ plan: null, alignment: null, team: null, ownership: null, brief: "", decision: null, problem: null });
  if (!(missingTeam.not_found && !refused.ok && !refused.gaps)) fail("NoReadAhead", `expected a missing team to refuse a bar, got ${JSON.stringify(missingTeam).slice(0, 240)}`);
  emptyPlanOk = bareCheck.ok && bareCulture.length > 0;

  const id = "culture-fixture";
  const dir = await setup(ws, id, { ownership: false });
  const reads = {};
  for (const route of ["foundation/problem", "knowledge/venture-profile", "foundation/alignment", "people/team", "people", "people/founders", "people/founders/fixture-founder", "governance/decision-rights", "governance/ownership", "people/team-plan"]) {
    reads[route] = await readRoute(ws, id, route);
  }
  const ahead = [];
  if (!reads["foundation/problem"].result?.statement) ahead.push("problem");
  if (typeof reads["knowledge/venture-profile"].result !== "string") ahead.push("profile");
  if (!reads["foundation/alignment"].result?.principles?.length) ahead.push("alignment");
  if (!gapsOf(reads["people/team"].result).gaps?.includes("customer conversations")) ahead.push("team gaps");
  if (!reads["people"].result?.people?.length) ahead.push("people");
  if (!reads["people/founders/fixture-founder"].result?.name) ahead.push("founder");
  if (!reads["governance/decision-rights"].not_found) ahead.push("decision-rights should be absent");
  if (!reads["governance/ownership"].not_found) ahead.push("ownership should be absent");
  if (!reads["people/team-plan"].not_found) ahead.push("team plan should be absent before the write");
  const goodNote = noteFor("alignment:own-words");
  if (goodNote.includes(reads["foundation/problem"].result.statement)) ahead.push("note pastes the problem");
  if (goodNote.includes(reads["foundation/alignment"].result.principles[0].statement)) ahead.push("note pastes alignment");
  if (ahead.length) fail("NoReadAhead", ahead.join("; "));
  else pass("NoReadAhead", "a missing people/team refuses a skill; the main path reads the problem, profile, alignment, team, people, and founder the venture has; decision-rights, ownership, and the team plan are absent; the note cites alignment:own-words and does not paste either statement");

  const why = "Strong means they can hold customer conversations and the people already here want to work with them.";
  const badRole = await writePerson(ws, id, "people/team-plan", planFor(id, { note: goodNote, why }));
  const checkMissingEntry = await call({ venture: id, route: "people/team-plan", action: "check", workspace: ws, via: "replay" });
  rmSync(join(dir, "people/team-plan.json"));
  const missingFile = planFor(id, { note: goodNote, why, recruiting: [{ role: "practice-lead", kind: "hire", brief: "people/briefs/practice-lead.md" }] });
  await writePerson(ws, id, "people/team-plan", missingFile);
  const checkMissingBrief = await call({ venture: id, route: "people/team-plan", action: "check", workspace: ws, via: "replay" });
  mkdirSync(join(dir, "people/briefs"), { recursive: true });
  const goodBrief = briefFor("not recorded", "not recorded");
  writeFileSync(join(dir, "people/briefs/practice-lead.md"), goodBrief);
  await writePerson(ws, id, "people/team-plan", planFor(id, { note: goodNote, why, recruiting: [{ role: "practice-lead", kind: "hire", brief: "people/briefs/practice-lead.md" }] }));
  const checkReady = await call({ venture: id, route: "people/team-plan", action: "check", workspace: ws, via: "replay" });
  if (emptyPlanOk && !checkMissingEntry.ok && !checkMissingBrief.ok && checkReady.ok) {
    pass("TeamPlanCheck", "people/team-plan check passes when the venture has no team plan, and the culture check still fails; the route check failed with no recruiting entry and with a missing brief, and passed once people/briefs/practice-lead.md existed");
  } else {
    fail("TeamPlanCheck", `empty ${emptyPlanOk} entry ${checkMissingEntry.ok} brief ${checkMissingBrief.ok} ready ${checkReady.ok} ${JSON.stringify(checkMissingEntry.result)?.slice(0, 300)}`);
  }

  const proposal = {
    id: "team-plan-culture",
    name: "team-plan-culture",
    question: "Do you accept the culture doc and the hiring bar on the team plan?",
    answer: "Yes. The note and the hiring bar on people/team-plan are mine.",
    decides: { record: "team-plan", path: "people/team-plan.json" },
    layer: "operations",
    boundary: "fail-closed",
    needed_in: "discovery",
    status: "open",
  };
  const proposalPath = join(ws, "proposal.json");
  writeFileSync(proposalPath, JSON.stringify(proposal));
  const proposed = mentura(["propose", "--venture", id, "--input", proposalPath], ws);
  if (proposed.status !== 0) fail("YouAccept", `propose failed: ${proposed.stderr || proposed.stdout}`);
  const openDecision = await readRoute(ws, id, "decisions/team-plan-culture");
  const pasted = { ...planFor(id, { note: `${goodNote}\n${reads["foundation/alignment"].result.principles[0].statement}`, why, recruiting: [{ role: "practice-lead", kind: "hire", brief: "people/briefs/practice-lead.md" }] }) };
  const agentPaste = await call({ venture: id, route: "people/team-plan", action: "write", input: pasted, actor: "agent", workspace: ws, via: "replay" });
  const liveAfterPaste = await readRoute(ws, id, "people/team-plan");
  const held = agentPaste.result?.draft === true && !liveAfterPaste.result?.note?.includes(reads["foundation/alignment"].result.principles[0].statement);
  if (!held) fail("YouAccept", `an agent write while team-plan-culture is open was not held as a draft: ${JSON.stringify(agentPaste.result)?.slice(0, 300)}`);

  const shared = {
    plan: liveAfterPaste.result,
    alignment: reads["foundation/alignment"].result,
    team: reads["people/team"].result,
    ownership: null,
    brief: goodBrief,
    problem: reads["foundation/problem"].result,
  };
  const before = cultureCheck({ ...shared, decision: openDecision.result });
  const decided = mentura(["decide", "team-plan-culture", "--venture", id, "--by", "Fixture Founder", "--confirm", "team-plan-culture"], ws);
  if (decided.status !== 0) fail("YouAccept", `decide failed: ${decided.stderr || decided.stdout}`);
  const decision = await readRoute(ws, id, "decisions/team-plan-culture");
  const after = cultureCheck({ ...shared, decision: decision.result });
  const pastedReasons = cultureCheck({ ...shared, plan: { ...liveAfterPaste.result, note: `${goodNote}\nThe founder writes the culture doc in their own words.` }, decision: decision.result });
  const problemReasons = cultureCheck({ ...shared, plan: { ...liveAfterPaste.result, note: `${goodNote}\n${reads["foundation/problem"].result.statement}` }, decision: decision.result });
  const markedReasons = cultureCheck({ ...shared, brief: `${goodBrief}\nkeeper test`, decision: decision.result });
  const figuredReasons = cultureCheck({ ...shared, brief: briefFor("1000", "not recorded"), decision: decision.result });
  if (held && before.length && !after.length && pastedReasons.length && problemReasons.length && markedReasons.length && figuredReasons.length && decision.result?.provenance?.approved_by === "Fixture Founder") {
    pass("CheckHonest", `an agent write that pasted a principle was held as a draft while team-plan-culture was open; the culture check failed before decide (${before.join("; ")}), failed on a pasted principle, a pasted problem statement, a trademark phrase, and a pay figure, and passed after Fixture Founder decided decisions/team-plan-culture`);
  } else {
    fail("CheckHonest", `held ${held} before ${before.join("; ") || "none"} after ${after.join("; ") || "none"} pasted ${pastedReasons.join("; ")} problem ${problemReasons.join("; ")} marked ${markedReasons.length} figured ${figuredReasons.length} by ${decision.result?.provenance?.approved_by} decision ${JSON.stringify(decision.result)?.slice(0, 400)}`);
  }

  const id2 = "culture-owned";
  const dir2 = await setup(ws, id2, { ownership: true });
  const owned = await readRoute(ws, id2, "governance/ownership");
  const ownedBrief = briefFor("see governance/ownership", "see governance/ownership");
  mkdirSync(join(dir2, "people/briefs"), { recursive: true });
  writeFileSync(join(dir2, "people/briefs/practice-lead.md"), ownedBrief);
  await writePerson(ws, id2, "people/team-plan", planFor(id2, { note: goodNote, why, recruiting: [{ role: "practice-lead", kind: "hire", brief: "people/briefs/practice-lead.md" }] }));
  const proposal2 = { ...proposal };
  writeFileSync(join(ws, "proposal-2.json"), JSON.stringify(proposal2));
  const proposed2 = mentura(["propose", "--venture", id2, "--input", join(ws, "proposal-2.json")], ws);
  const decided2 = mentura(["decide", "team-plan-culture", "--venture", id2, "--by", "Fixture Founder", "--confirm", "team-plan-culture"], ws);
  const decision2 = await readRoute(ws, id2, "decisions/team-plan-culture");
  const plan2 = await readRoute(ws, id2, "people/team-plan");
  const ownedInputs = {
    plan: plan2.result, alignment: (await readRoute(ws, id2, "foundation/alignment")).result,
    team: (await readRoute(ws, id2, "people/team")).result, ownership: owned.result,
    problem: (await readRoute(ws, id2, "foundation/problem")).result, decision: decision2.result,
  };
  const cleanPay = cultureCheck({ ...ownedInputs, brief: ownedBrief });
  const copiedPay = cultureCheck({ ...ownedInputs, brief: briefFor("see governance/ownership", "17") });
  if (proposed2.status === 0 && decided2.status === 0 && !cleanPay.length && copiedPay.some((r) => r.includes("17"))) {
    pass("NoInventedPay", "with governance/ownership present the brief points at the route and carries no grant amount; a brief that copies 17 fails the culture check");
  } else {
    fail("NoInventedPay", `propose ${proposed2.status} decide ${decided2.status} clean ${cleanPay.join("; ") || "ok"} copied ${copiedPay.join("; ") || "ok"} ownership ${owned.ok}`);
  }
} catch (error) {
  fail("Replay", error.stack ?? error.message);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

const bad = rows.filter((r) => r.result === "FAIL");
console.log(JSON.stringify(rows, null, 2));
process.exit(bad.length ? 1 : 0);
