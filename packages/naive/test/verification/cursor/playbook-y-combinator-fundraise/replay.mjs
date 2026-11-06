// Replays the seed-fundraising playbook against the router.
//   node packages/naive/test/verification/cursor/playbook-y-combinator-fundraise/replay.mjs
//
// Fixture names and the amount 1 are not a company, a round, or advice.
// A check fails in the blank and missing cases and passes on the filled path.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../../..");
const playbook = readFileSync(join(repo, "library/packages/investors/playbooks/y-combinator-fundraise.md"), "utf8");
const tla = readFileSync(join(here, "YCFundraise.tla"), "utf8");

const rows = [];
const fail = (name, detail) => { rows.push({ name, result: "FAIL", detail }); };
const pass = (name, detail) => { rows.push({ name, result: "PASS", detail }); };
function check(name, ok, detail) { (ok ? pass : fail)(name, detail); return ok; }

function setOf(source, name) {
  const m = source.match(new RegExp(`${name} == \\{([^}]+)\\}`));
  if (!m) throw new Error(`no set ${name}`);
  return new Set([...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
}

const routeLine = tla.match(/^Routes == .+$/m);
const modelRoutes = new Set([
  ...setOf(tla, "Provided"),
  ...setOf(tla, "Optional"),
  ...setOf(tla, "Writes"),
  ...[...routeLine[0].matchAll(/"([^"]+)"/g)].map((x) => x[1]),
]);

const listed = spawnSync("node", [join(repo, "packages/naive/src/router/router.mjs")], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (listed.status !== 0) { console.error(listed.stderr); process.exit(1); }
const table = new Map(JSON.parse(listed.stdout).map((r) => [r.route, r]));

function normalize(token) {
  return token
    .replaceAll("<id>", "[id]")
    .replace(/^decisions\/raise-plan$/, "decisions/[id]")
    .replace(/^foundation\/icp\/[a-z0-9-]+$/, "foundation/icp/[id]")
    .replace(/^operations\/handoff\/data-room$/, "operations/handoff/[id]")
    .replace(/^investors\/[a-z0-9-]+$/, "investors/[id]")
    .replace(/^product\/[a-z0-9-]+$/, "product/[id]")
    .replace(/^people\/founders\/[a-z0-9-]+$/, "people/founders/[id]");
}

const mentioned = new Set();
const forbidden = new Set();
for (const line of playbook.split("\n")) {
  for (const raw of [...line.matchAll(/`([^`]+)`/g)].map((m) => m[1])) {
    const route = normalize(raw);
    if (!table.has(route)) continue;
    const banned = /Do not write `([^`]+)`/.exec(line);
    if (banned && normalize(banned[1]) === route) forbidden.add(route);
    else mentioned.add(route);
  }
}
for (const route of forbidden) mentioned.delete(route);

const missingFromModel = [...mentioned].filter((r) => !modelRoutes.has(r)).sort();
const missingFromPlaybook = [...modelRoutes].filter((r) => !mentioned.has(r)).sort();
const notInRouter = [...modelRoutes].filter((r) => !table.has(r)).sort();
check("RoutesExist: model routes are in the router", notInRouter.length === 0, notInRouter.join(", ") || `${modelRoutes.size} routes`);
check("RoutesExist: playbook routes match the model", missingFromModel.length === 0 && missingFromPlaybook.length === 0,
  `playbook only: ${missingFromModel.join(", ") || "none"}; model only: ${missingFromPlaybook.join(", ") || "none"}`);
check("purpose/data-stream/[id] is not a template step", forbidden.has("purpose/data-stream/[id]") && !modelRoutes.has("purpose/data-stream/[id]"),
  "the playbook names it only to say not to write it");

const unknown = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), "fundraising/plan", "read", "--venture", "none", "--workspace", "/tmp"], { encoding: "utf8" });
check("a route the router does not have fails the call", unknown.status !== 0 && /no route fundraising\/plan/.test(unknown.stderr), unknown.stderr.trim());

const ws = mkdtempSync(join(tmpdir(), "yc-raise-"));
const venture = "raise-fixture";
const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.mjs"), join(ws, "fixture"), venture, "--phase", "validation"], { encoding: "utf8" });
if (init.status !== 0) { console.error(init.stderr || init.stdout); process.exit(1); }

let n = 0;
/** @param {string} route @param {string} action @param {{ as?: string, input?: unknown }} [options] */
function call(route, action, { as = "agent", input } = {}) {
  const args = [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), route, action, "--venture", venture, "--workspace", ws, "--as", as, "--json"];
  if (input) {
    const file = join(ws, `in-${n++}.json`);
    writeFileSync(file, JSON.stringify(input, null, 2));
    args.push("--input", file);
  }
  const r = spawnSync("node", args, { encoding: "utf8" });
  let body = null;
  try { body = JSON.parse(r.stdout); } catch { body = null; }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, body };
}

const missingProblem = call("foundation/problem", "read");
check("NoUnreadSource: problem is absent until the venture writes it",
  missingProblem.body?.ok === true && missingProblem.body?.result == null && missingProblem.body?.not_found,
  missingProblem.body?.not_found?.note ?? missingProblem.stderr);

function noteFields(note) {
  const out = {};
  for (const line of String(note ?? "").split("\n")) {
    const m = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (m) out[m[1]] = m[2].trim();
  }
  return out;
}

function planCheck(record) {
  if (!record) return "missing";
  const fields = noteFields(record.note);
  const options = record.options ?? [];
  if (!options.includes("Do not raise.")) return "no do-not-raise option";
  for (const key of ["amount", "months", "use_of_funds"]) if (!fields[key]) return `blank ${key}`;
  if (!["none", "cap", "discount", "mfn", "priced"].includes(fields.instrument)) return "bad instrument";
  if (fields.instrument === "cap" && !fields.ownership_if_cap) return "blank ownership";
  if (fields.instrument !== "cap" && fields.ownership_if_cap !== "n/a") return "ownership should be n/a";
  for (const route of (fields.inputs ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const norm = normalize(route);
    if (!table.has(norm)) return `unknown input ${route}`;
    const read = call(route, "read");
    if (read.body?.result == null) return `input not found ${route}`;
  }
  if (record.status === "decided" && !record.provenance?.approved_by) return "decided with no approver";
  return "pass";
}

function investorCheck(list, plan) {
  if (!plan) return "no raise plan";
  const records = list && typeof list === "object" ? Object.values(list) : [];
  if (!records.length) return "no investors";
  if (records.some((r) => !r?.name)) return "investor without a name";
  return "pass";
}

const blank = {
  id: "raise-plan",
  question: "Do we raise outside capital now, and if we do, on what instrument, for how many months, and what does the money buy?",
  status: "open",
  options: [
    "Do not raise.",
    "A post-money valuation-cap form, unmodified, from the publisher's documents page, after a lawyer licensed where the company is formed has read it.",
    "A discount form with no valuation cap, on those same conditions.",
    "An uncapped most-favored-nation form, on those same conditions.",
    "A priced round, with a lawyer.",
  ],
  answer: null,
  note: "amount:\nmonths:\nuse_of_funds:\ninstrument:\nownership_if_cap:\ninputs:",
  needed_in: "validation",
  boundary: "fail-open",
  decides: { record: "investor", path: "governance/ownership.json" },
  provenance: { drafted_by: { kind: "agent", id: "playbook-replay" } },
};

const wroteBlank = call("decisions/raise-plan", "write", { input: blank });
check("main path: draft raise plan writes decisions/raise-plan.decision.json",
  wroteBlank.body?.ok === true && wroteBlank.body?.result?.written === "decisions/raise-plan.decision.json",
  wroteBlank.body?.result?.written ?? wroteBlank.stderr);
const blankRead = call("decisions/raise-plan", "read");
check("Checks: blank raise plan fails", planCheck(blankRead.body?.result) !== "pass", planCheck(blankRead.body?.result));

const ventureRecords = {
  "foundation/problem": {
    venture, statement: "Fixture problem for the replay. Not a customer quote.", segment: "Fixture segment", evidence: [],
  },
  "foundation/icp/fixture-buyer": { id: "fixture-buyer", who: "Fixture buyer, not a real segment.", primary: true },
  "foundation/alignment": {
    venture,
    principles: [{ id: "no-exclusive", statement: "Fixture principle: do not grant an exclusive.", source: "Fixture founder, 2026-10-29", check: null }],
  },
  "product/widget": { id: "widget", name: "Fixture product", description: "A fixture product for the replay. Not a shipped product." },
  "people/founders/ada": { id: "ada", name: "Ada Fixture", role: "founder", joined: "2026-01-15" },
  "people/team-plan": {
    venture,
    roles: [{ id: "founder", name: "Founder", occupant: "person", needed_by: "validation", status: "filled" }],
  },
  "purpose/money/summary": {
    source: "fixture",
    synced_at: "2026-10-29T00:00:00Z",
    as_of: "2026-10-29T00:00:00Z",
    cash: { amount: 100, currency: "USD" },
    note: "Fixture cents, not a company's cash.",
  },
};

for (const [route, input] of Object.entries(ventureRecords)) {
  const wrote = call(route, "write", { as: "person", input });
  check(`venture provides ${route}`, wrote.body?.ok === true && wrote.body?.result?.draft === false, wrote.body?.result?.note ?? wrote.stderr?.trim() ?? wrote.stdout?.slice(0, 200));
}

const foundation = call("purpose/foundation", "run");
const need = call("system/need-now", "run");
check("read purpose/foundation", foundation.body?.ok === true && Array.isArray(foundation.body?.result), foundation.status ? foundation.stderr : "ran");
check("read system/need-now", need.body?.ok === true && need.body?.result?.phase === "validation", need.body?.result?.phase ?? need.stderr);

const agentOwnership = call("governance/ownership", "write", {
  input: {
    updated: "2026-10-29", unit: "shares", currency: "USD",
    classes: [{ id: "common", kind: "common" }],
    holders: [{ id: "ada", name: "Ada Fixture", kind: "founder" }],
    grants: [{ holder: "ada", class: "common", amount: 1 }],
  },
});
const drafted = call("governance/ownership", "read");
check("agent write of governance/ownership is a draft, so the cap table check fails",
  agentOwnership.body?.result?.draft === true && drafted.body?.result == null && drafted.body?.not_found,
  agentOwnership.body?.result?.note ?? agentOwnership.stderr);

const personOwnership = call("governance/ownership", "write", {
  as: "person",
  input: {
    updated: "2026-10-29", unit: "shares", currency: "USD",
    classes: [{ id: "common", kind: "common" }],
    holders: [{ id: "ada", name: "Ada Fixture", kind: "founder" }],
    grants: [{ holder: "ada", class: "common", amount: 1 }],
  },
});
const owned = call("governance/ownership", "read");
check("person write of governance/ownership is the record",
  personOwnership.body?.ok === true && personOwnership.body?.result?.draft === false && owned.body?.result?.unit === "shares",
  personOwnership.body?.result?.written ?? personOwnership.stderr);

const badKind = call("governance/ownership", "write", {
  as: "person",
  input: {
    ...personOwnership.body.result ? owned.body.result : {},
    instruments: [{ id: "bad", holder: "ada", kind: "safe", amount: 1 }],
  },
});
check("an instrument kind outside the schema fails the write", badKind.status !== 0 && /kind/.test(badKind.stderr), badKind.stderr.trim().split("\n")[0]);

const inputs = "foundation/problem, foundation/icp, foundation/alignment, product/widget, people/founders/ada, people/team-plan, purpose/money/summary, governance/ownership";
const filled = {
  ...blank,
  note: `amount: 1\nmonths: 1\nuse_of_funds: fixture hire named on people/team-plan\ninstrument: cap\nownership_if_cap: 1/1\ninputs: ${inputs}\n`,
};
const wroteFilled = call("decisions/raise-plan", "write", { input: filled });
const filledRead = call("decisions/raise-plan", "read");
check("Checks: filled raise plan passes", wroteFilled.body?.ok === true && planCheck(filledRead.body?.result) === "pass", planCheck(filledRead.body?.result));

const noInvestors = call("investors", "read");
check("Checks: investor check fails before any investor record",
  investorCheck(noInvestors.body?.result, filledRead.body?.result) !== "pass",
  investorCheck(noInvestors.body?.result, filledRead.body?.result));

const wroteInvestor = call("investors/fixture-angel", "write", {
  input: { id: "fixture-angel", name: "Fixture Angel", summary: "Fixture investor the founder named. No contact was sent." },
});
const investors = call("investors", "read");
check("main path: investor record", wroteInvestor.body?.ok === true && investorCheck(investors.body?.result, filledRead.body?.result) === "pass",
  wroteInvestor.body?.result?.written ?? wroteInvestor.stderr);

const stream = call("purpose/data-stream/meetings", "write", { as: "person", input: { id: "meetings", sensitive: false } });
check("replay: a new data-stream id is stored under customers, which is why the playbook does not write it",
  stream.body?.result?.written === "customers/_streams/meetings/stream.json",
  stream.body?.result?.written ?? stream.stderr);

function roomCheck(handoff, problem) {
  if (!handoff) return "missing checklist";
  const evidence = call("evidence", "read");
  const evidenceCount = evidence.body?.result ? Object.keys(evidence.body.result).length : 0;
  const traction = (problem?.evidence?.length ?? 0) > 0 || evidenceCount > 0;
  if (!traction) return "no traction evidence";
  for (const criterion of handoff.done_criteria ?? []) {
    const m = /^route (\S+) (required|optional):/.exec(criterion.check ?? "");
    if (!m) continue;
    const route = m[1].replaceAll("<id>", "widget").replace("people/founders/<id>", "people/founders/ada").replace("product/<id>", "product/widget");
    const norm = normalize(m[1] === "product/<id>" ? "product/[id]" : m[1] === "people/founders/<id>" ? "people/founders/[id]" : m[1] === "decisions/raise-plan" ? "decisions/[id]" : m[1]);
    if (!table.has(norm)) return `unknown route ${m[1]}`;
    const read = call(route === "decisions/raise-plan" ? "decisions/raise-plan" : route, "read");
    if (read.body?.result == null) return `${m[2]} missing ${route}`;
    if (route.startsWith("product/") && !read.body.result.market) return `blank market ${route}`;
  }
  const plan = call("decisions/raise-plan", "read");
  if (planCheck(plan.body?.result) !== "pass") return "raise plan not ready";
  return "pass";
}

const criteria = [
  ["problem", "foundation/problem", "required", "the problem line"],
  ["icp", "foundation/icp", "required", "the customer line"],
  ["alignment", "foundation/alignment", "required", "principles the terms sit beside"],
  ["product", "product/widget", "required", "the product line"],
  ["founders", "people/founders/ada", "required", "the team line"],
  ["team", "people/team-plan", "required", "who a raise would hire"],
  ["money", "purpose/money/summary", "required", "minimum financials"],
  ["ownership", "governance/ownership", "required", "the cap table"],
  ["plan", "decisions/raise-plan", "required", "what this round is"],
];
function handoff() {
  return {
    id: "data-room",
    title: "Data room checklist",
    venture,
    products: ["widget"],
    governed_by: ["raise-plan"],
    assignment: "none",
    role: "builder",
    brief: "data-room.md",
    decision_classes: ["domain-fact"],
    done_criteria: [
      ...criteria.map(([id, route, mode, text]) => ({ id, kind: "review", reviewer: "founder", check: `route ${route} ${mode}: ${text}` })),
      { id: "form", kind: "review", reviewer: "founder", check: "outside: an unmodified form, reviewed by a lawyer. Not legal advice." },
      { id: "board", kind: "review", reviewer: "founder", check: "outside: board consent before issuance." },
    ],
    escalations: [
      { class: "ownership-or-control", question: "Record a signed instrument on the cap table?", to: "founder" },
      { class: "legal-or-terms", question: "Sign or send a form?", to: "founder" },
    ],
    status: "draft",
    attempts: 0,
    max_attempts: 3,
    run_cap: "2h",
    inputs: [
      "foundation/problem.json", "foundation/icp/fixture-buyer.json", "foundation/alignment.json", "product/widget.json",
      "people/founders/ada.json", "people/team-plan.json", "money/_summary.json", "governance/ownership.json",
      "decisions/raise-plan.decision.json",
    ],
  };
}

check("Checks: data room fails before the checklist exists", roomCheck(null, null) !== "pass", roomCheck(null, null));
const wroteRoom = call("operations/handoff/data-room", "write", { input: handoff() });
mkdirSync(join(ws, "fixture/operations/handoffs"), { recursive: true });
writeFileSync(join(ws, "fixture/operations/handoffs/data-room.md"),
  "This checklist is not legal advice and not financial advice. The criteria on the handoff are the list.\n");
const room = call("operations/handoff/data-room", "read");
const problem = call("foundation/problem", "read");
check("main path: checklist writes operations/handoffs/data-room.json",
  wroteRoom.body?.ok === true && wroteRoom.body?.result?.written === "operations/handoffs/data-room.json",
  wroteRoom.body?.result?.written ?? wroteRoom.stderr);
check("Checks: data room fails while traction evidence is empty",
  roomCheck(room.body?.result, problem.body?.result) === "no traction evidence",
  roomCheck(room.body?.result, problem.body?.result));

const withEvidence = {
  ...problem.body.result,
  evidence: [{
    id: "fixture-note",
    kind: "stated",
    summary: "Fixture note so the traction line can pass. Not a real interview.",
    source: { path: "replay-fixture.txt", title: "Fixture" },
    audience: "target",
    collected: "2026-10-29",
  }],
};
const wroteEvidence = call("foundation/problem", "write", { as: "person", input: withEvidence });
const problem2 = call("foundation/problem", "read");
check("venture provides cited evidence on foundation/problem", wroteEvidence.body?.ok === true && (problem2.body?.result?.evidence?.length ?? 0) === 1,
  wroteEvidence.stderr || "one item");
check("Checks: data room fails while the product has no market", roomCheck(room.body?.result, problem2.body?.result) === "blank market product/widget",
  roomCheck(room.body?.result, problem2.body?.result));
const wroteMarket = call("product/widget", "write", { as: "person", input: { ...ventureRecords["product/widget"], market: { customer: "b2b", segment: "Fixture segment" } } });
check("venture provides market on product/widget", wroteMarket.body?.ok === true, wroteMarket.stderr || "written");
check("Checks: data room passes once traction is cited and the market is on file", roomCheck(room.body?.result, problem2.body?.result) === "pass",
  roomCheck(room.body?.result, problem2.body?.result));
const optionalMissing = {
  ...room.body.result,
  done_criteria: [...room.body.result.done_criteria, { id: "telos", kind: "review", reviewer: "founder", check: "route foundation/telos optional: the vision line" }],
};
check("Checks: an optional line fails when the criterion is present and the record is missing",
  roomCheck(optionalMissing, problem2.body?.result) === "optional missing foundation/telos",
  roomCheck(optionalMissing, problem2.body?.result));

const decidedByAgent = { ...filled, status: "decided", provenance: { drafted_by: { kind: "agent", id: "playbook-replay" } } };
const wroteDecided = call("decisions/raise-plan", "write", { input: decidedByAgent });
const decidedRead = call("decisions/raise-plan", "read");
check("an agent write of status decided is held as a draft, so the read stays open",
  wroteDecided.body?.result?.draft === true && decidedRead.body?.result?.status === "open",
  wroteDecided.body?.result?.note ?? wroteDecided.stderr);
const wrotePersonDecided = call("decisions/raise-plan", "write", { as: "person", input: decidedByAgent });
check("a person's raw write of status decided with no approved_by is refused",
  wrotePersonDecided.status !== 0 && /approved_by/.test(wrotePersonDecided.stderr + wrotePersonDecided.stdout),
  wrotePersonDecided.stderr.trim().split("\n")[0]);
check("Checks: status decided with no approved_by fails on a record that holds it", planCheck({ ...decidedRead.body?.result, status: "decided" }) === "decided with no approver", "the case only a file edit can reach");
const restored = call("decisions/raise-plan", "write", { as: "person", input: filled });
check("main path: restoring the open filled plan passes again", restored.body?.ok === true && planCheck(call("decisions/raise-plan", "read").body?.result) === "pass", "restored");

const decided = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), "decide", "raise-plan", "--venture", venture, "--workspace", ws, "--by", "Ada Fixture", "--confirm", "raise-plan", "--answer", "Fixture answer, not a raise.", "--json"], { encoding: "utf8" });
const decidedPlan = call("decisions/raise-plan", "read").body?.result;
check("Checks: decide with --confirm settles the plan and it passes",
  decided.status === 0 && decidedPlan?.status === "decided" && decidedPlan?.provenance?.approved_by === "Ada Fixture" && planCheck(decidedPlan) === "pass",
  decided.stderr.trim() || planCheck(decidedPlan));

const signed = call("governance/ownership", "write", {
  as: "person",
  input: {
    ...owned.body.result,
    instruments: [{ id: "fixture-instrument", holder: "fixture-angel", kind: "safe-post-money", amount: 1 }],
  },
});
const signedRead = call("governance/ownership", "read");
const kindOk = (signedRead.body?.result?.instruments ?? []).every((i) => ["safe-post-money", "safe-pre-money", "convertible-note"].includes(i.kind));
check("person can record a schema instrument kind on governance/ownership",
  signed.body?.ok === true && signed.body?.result?.draft === false && kindOk,
  signed.body?.result?.written ?? signed.stderr);

const bad = rows.filter((r) => r.result === "FAIL");
console.log(["result", "rule", "replay"].join("\t"));
for (const row of rows) console.log([row.result, row.name, row.detail.replaceAll("\n", " ")].join("\t"));
console.log(`${rows.length - bad.length}/${rows.length} passed`);
if (bad.length) process.exit(1);
