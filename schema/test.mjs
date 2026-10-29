// Tests for the schema's checkers: each runs once on the real records (it must pass) and
// once per broken copy (it must fail, naming the rule). Copies live in a temp folder.
//
//   node schema/test.mjs

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "ee-schema-test-"));
const run = (script, args = [], env = {}) => spawnSync("node", [join(root, "schema", script), ...args], { encoding: "utf8", env: { ...process.env, ...env } });
const edit = (file, f) => { const d = JSON.parse(readFileSync(file, "utf8")); f(d); writeFileSync(file, JSON.stringify(d, null, 2)); };
let failed = 0, n = 0;
const expect = (name, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };

// A broken copy of the EE venture, checked by the given script. `pattern` must appear in the errors.
const venture = join(root, "instance/ventures/everything-ecosystem");
function broken(name, script, change, pattern) {
  const dir = join(tmp, `v${++n}`);
  cpSync(venture, dir, { recursive: true });
  change(dir);
  const r = run(script, [script === "check-ventures.mjs" ? dir : dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const handoff = (dir, id) => join(dir, "operations/handoffs", `${id}.json`);

expect("check-ventures passes on the instance", run("check-ventures.mjs", [join(root, "instance")]).status === 0);
expect("check-ventures passes on the examples", run("check-ventures.mjs", [join(root, "schema/examples/workspace")]).status === 0);
broken("a flows_to to an unknown product fails", "check-ventures.mjs", (d) => edit(join(d, "products/mad.json"), (p) => { p.flows_to = ["nope"]; }), /flows_to unknown product nope/);
broken("a part_of to an unknown product fails", "check-ventures.mjs", (d) => edit(join(d, "products/five-step-algorithm.json"), (p) => { p.part_of = ["nope"]; }), /part_of unknown product nope/);
broken("a missing layer folder fails", "check-ventures.mjs", (d) => rmSync(join(d, "operations"), { recursive: true }), /operations layer location/);
broken("a tier scope outside operations fails", "check-ventures.mjs", (d) => edit(join(d, "products/kit.json"), (p) => { p.scope = { level: "tier", layer: "knowledge", tier: "delivery" }; }), /tier-scoped/);
broken("software with no repository fails", "check-ventures.mjs", (d) => edit(join(d, "venture.json"), (v) => { delete v.repos; }), /builds software, so the venture \(or a parent\) needs a repository/);
broken("several markets with no primary fail", "check-ventures.mjs", (d) => edit(join(d, "products/mad.json"), (p) => { p.market = [p.market, p.market]; }), /exactly one primary/);

expect("check-execution passes on the EE venture", run("check-execution.mjs", [venture]).status === 0);
broken("a class the role does not own fails", "check-execution.mjs", (d) => edit(handoff(d, "anatomy-json-output"), (h) => { h.decision_classes.push("new-structure"); }), /belongs to architect/);
broken("no self-proof criterion fails", "check-execution.mjs", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { h.done_criteria = h.done_criteria.filter((c) => c.kind !== "self-proof"); }), /no self-proof/);
broken("done without evidence fails", "check-execution.mjs", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { h.evidence = []; }), /no passing evidence/);
broken("done without a PR fails", "check-execution.mjs", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { delete h.pr; }), /done without a PR/);
broken("a review passed by the wrong role fails", "check-execution.mjs", (d) => {
  for (const f of ["anatomy-json-output"]) edit(handoff(d, f), (h) => { h.evidence = h.evidence.slice(-1); });
  const e = JSON.parse(readFileSync(handoff(d, "anatomy-json-output"), "utf8")).evidence[0];
  edit(join(d, "operations/handoffs", e), (x) => { x.results.forEach((r) => { if (r.kind === "review") r.by = "builder"; }); });
}, /must be passed by architect/);
broken("escalated with no open question fails", "check-execution.mjs", (d) => edit(handoff(d, "methodology-site-refresh"), (h) => { h.escalations.forEach((e) => { e.answer = "yes"; }); }), /escalated with no open question/);
broken("attempts used up while in progress fail", "check-execution.mjs", (d) => edit(handoff(d, "methodology-site-refresh"), (h) => { h.status = "in-progress"; h.attempts = 3; }), /attempts used up/);
broken("evidence whose passed flag lies fails", "check-execution.mjs", (d) => {
  const e = JSON.parse(readFileSync(handoff(d, "methodology-site-refresh"), "utf8")).evidence[0];
  edit(join(d, "operations/handoffs", e), (x) => { x.passed = true; });
}, /results disagree/);
broken("loosening a class without a decision fails", "check-execution.mjs", (d) => edit(join(d, "governance/decision-rights.json"), (r) => { r.classes = [{ id: "public-commitment", owner: "founder", level: "decide" }]; }), /loosens escalate to decide/);

// check-ready: a fresh draft built from a done handoff passes; each gap makes it fail.
function draft(name, change, pattern) {
  const dir = join(tmp, `r${++n}`);
  cpSync(venture, dir, { recursive: true });
  edit(handoff(dir, "anatomy-runner-fixes"), (h) => { Object.assign(h, { status: "draft", attempts: 0, evidence: [] }); delete h.pr; delete h.claimed_by; delete h.lesson; });
  change(dir);
  const r = run("check-ready.mjs", [dir, "anatomy-runner-fixes"]);
  expect(name, pattern ? r.status !== 0 && pattern.test(r.stdout) : r.status === 0);
}
const briefOf = (d) => join(d, "operations/handoffs/anatomy-runner-fixes.md");
draft("check-ready passes on a complete draft", () => {});
draft("a brief with no Outcome is not ready", (d) => writeFileSync(briefOf(d), readFileSync(briefOf(d), "utf8").replace(/## Outcome/, "## Background")), /FAIL  brief has its Outcome section/);
draft("a brief with a TBD is not ready", (d) => writeFileSync(briefOf(d), readFileSync(briefOf(d), "utf8") + "\nStep 4: TBD\n"), /FAIL  brief has no placeholders left: TBD/);
draft("an unknown product is not ready", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { h.products = ["nope"]; }), /FAIL  every product it serves exists: nope/);
draft("an unknown decision is not ready", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { h.governed_by = ["EE-999"]; }), /FAIL  every governing decision exists.*EE-999/);
draft("a criterion calling a missing script is not ready", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { h.done_criteria[0].check = "node purpose/nope.mjs"; }), /FAIL  every script a criterion runs exists/);
broken("in progress without a readiness check fails", "check-execution.mjs", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { h.status = "in-progress"; h.attempts = 1; }), /without a recorded readiness check/);

// check-governance and payouts, on broken copies of the venture-backed example.
const tandem = join(root, "schema/examples/workspace/ventures/tandem");
const gov = (d, f) => join(d, "governance", f);
function govBroken(name, change, pattern) {
  const dir = join(tmp, `g${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run("check-governance.mjs", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
expect("check-governance passes on the examples", run("check-governance.mjs", [join(root, "schema/examples/workspace")]).status === 0);
govBroken("venture capital with no formal board fails", (d) => rmSync(gov(d, "board.json")), /venture-capital funding needs/);
govBroken("two founders with no founder agreement fails", (d) => rmSync(gov(d, "founder-agreement.json")), /2 founders share ownership/);
govBroken("a founder missing from the agreement fails", (d) => edit(gov(d, "founder-agreement.json"), (a) => { a.founders.pop(); }), /founder ben is not in the agreement/);
govBroken("a grant to an unknown holder fails", (d) => edit(gov(d, "ownership.json"), (o) => { o.grants[0].holder = "nobody"; }), /grant to unknown holder nobody/);
govBroken("a cliff longer than vesting fails", (d) => edit(gov(d, "ownership.json"), (o) => { o.grants[0].vesting.cliff_months = 60; }), /cliff is longer/);
govBroken("a preferred class with no price fails", (d) => edit(gov(d, "ownership.json"), (o) => { delete o.classes[1].price_per_share; }), /needs price_per_share/);
govBroken("an S corporation with preferred stock fails", (d) => edit(join(d, "venture.json"), (v) => { v.form.legal_form = "s-corp"; }), /one class of stock/);
govBroken("an investor seat without a board-seat right fails", (d) => edit(gov(d, "ownership.json"), (o) => { o.classes[1].rights = ["information"]; }), /holds no board-seat right/);
govBroken("reserved matters on an advisory board fail", (d) => edit(gov(d, "board.json"), (b) => { b.boards[1].reserved_matters = ["approve the budget"]; }), /advisory board advisors has reserved matters/);
{
  const { payouts } = await import(join(root, "schema/payouts.mjs"));
  const own = JSON.parse(readFileSync(gov(tandem, "ownership.json"), "utf8"));
  const pay = (v, h) => payouts(own, v).payouts.find((p) => p.holder === h).amount;
  expect("payouts: at a soft landing preferred takes its 1x preference", pay(3000000, "lark-ventures") === 2000000);
  expect("payouts: at a high value preferred converts and shares pro rata", payouts(own, 150000000).converted.includes("series-seed") && pay(150000000, "ana") === pay(150000000, "ben"));
  expect("payouts: payouts always add up to the sale value", [0, 1e6, 3e6, 4e7].every((v) => Math.abs(payouts(own, v).payouts.reduce((n, p) => n + p.amount, 0) - v) <= 1));
  expect("payouts: the unissued option pool is paid nothing", !payouts(own, 4e7).payouts.some((p) => p.holder === "pool"));
}

// check-telos: every exit criterion traces to a measure, and exit.json follows the telos.
function telosBroken(name, change, pattern) {
  const dir = join(tmp, `t${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run("check-telos.mjs", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const telosOf = (d) => join(d, "purpose/telos.json");
expect("check-telos passes on the examples", run("check-telos.mjs", [join(root, "schema/examples/workspace")]).status === 0);
telosBroken("an exit criterion serving no known measure fails", (d) => edit(telosOf(d), (t) => { t.phases[0].exit_criteria[0].serves = ["nope"]; }), /serves unknown measure nope/);
telosBroken("two primary measures fail", (d) => edit(telosOf(d), (t) => { t.measures[1].primary = true; }), /exactly one measure is primary/);
telosBroken("exit.json preferring another path fails", (d) => edit(telosOf(d), (t) => { t.owner_outcome.path = "ipo"; }), /prefers acquisition, but the telos intends ipo/);
telosBroken("exit.json ruling out the telos path fails", (d) => edit(gov(d, "exit.json"), (e) => { e.paths[0].stance = "ruled-out"; }), /rules out acquisition/);

// check-publication: every publication passes the gate (EE-025).
function pubBroken(name, change, pattern) {
  const dir = join(tmp, `p${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run("check-publication.mjs", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const policyOf = (d) => gov(d, "publication-policy.json");
const publishing = (d, h) => { mkdirSync(join(d, "operations/handoffs"), { recursive: true }); writeFileSync(join(d, "operations/handoffs/post.json"), JSON.stringify({ id: "post", decision_classes: ["public-commitment"], ...h })); };
expect("check-publication passes on the examples", run("check-publication.mjs", [join(root, "schema/examples/workspace")]).status === 0);
pubBroken("an agent role as approver fails", (d) => edit(policyOf(d), (p) => { p.channels[0].rules[0].approvers = ["builder"]; }), /builder is an agent role/);
pubBroken("a team with no person cannot approve", (d) => edit(policyOf(d), (p) => { p.teams[0].members = ["builder"]; }), /team founders has no person/);
pubBroken("a channel following an unknown guideline fails", (d) => edit(policyOf(d), (p) => { p.channels[0].guidelines.push("nope"); }), /follows unknown guideline nope/);
pubBroken("a guideline with a missing file fails", (d) => edit(policyOf(d), (p) => { p.guidelines[0].path = "pillars/nope.md"; }), /guideline brand not found/);
pubBroken("a newsletter that names no platform fails", (d) => edit(policyOf(d), (p) => { delete p.channels[1].platform; }), /is newsletter, so it names its platform/);
pubBroken("a platform channel citing none of the platform's rules fails", (d) => edit(policyOf(d), (p) => { p.channels[1].guidelines = ["brand"]; }), /runs on substack but cites none of its rules/);
pubBroken("a social channel silent on replies fails", (d) => edit(policyOf(d), (p) => { delete p.channels[1].replies; }), /says how replies and comments are handled/);
pubBroken("replies delegated to agents only fail", (d) => edit(policyOf(d), (p) => { p.channels[1].replies.delegates = ["builder"]; }), /delegates replies to agents only/);
pubBroken("a publishing handoff with no channel fails", (d) => publishing(d, {}), /names its channel and content/);
pubBroken("a publishing handoff on an unknown channel fails", (d) => publishing(d, { publication: { channel: "billboard", content: "product pages" } }), /unknown channel billboard/);
pubBroken("content the channel has no rule for fails", (d) => publishing(d, { publication: { channel: "website", content: "memes" } }), /no rule for "memes"/);
pubBroken("a publishing handoff with no policy fails", (d) => { rmSync(policyOf(d)); publishing(d, {}); }, /no governance\/publication-policy.json/);
expect("a publishing handoff naming a known channel and rule passes", (() => { const d = join(tmp, `p${++n}`); cpSync(tandem, d, { recursive: true }); publishing(d, { publication: { channel: "website", content: "product pages" } }); return run("check-publication.mjs", [d]).status === 0; })());

// check-validation: evidence grades (EE-026), adapted from GRADE.
{
  const { gradeItem, gradeRecord } = await import(join(root, "schema/check-validation.mjs"));
  const today = new Date("2026-10-27");
  const item = (o) => ({ id: "x", kind: "stated", summary: "s", source: { path: "a" }, audience: "target", sample: { n: 12 }, specificity: "specific", collected: "2026-09-01", ...o });
  expect("validation: a claim with no evidence grades very low", gradeRecord({ evidence: [] }, today).level === "very low");
  expect("validation: behavior from the target segment grades high", gradeItem(item({ kind: "behavior" }), today).level === "high");
  expect("validation: the wrong audience drops two grades", gradeItem(item({ kind: "behavior", audience: "wrong" }), today).level === "low");
  expect("validation: a sample under 5 drops a grade", gradeItem(item({ kind: "commitment", sample: { n: 3 } }), today).level === "low");
  expect("validation: general answers drop stated evidence to very low", gradeItem(item({ specificity: "general" }), today).level === "very low");
  expect("validation: evidence older than 18 months drops a grade", gradeItem(item({ kind: "behavior", collected: "2024-01-01" }), today).level === "moderate");
  expect("validation: three agreeing sources raise a record one grade", gradeRecord({ evidence: [1, 2, 3].map((i) => item({ id: `s${i}`, source: { path: `p${i}` } })) }, today).level === "moderate");
  expect("validation: evidence as strong against the claim lowers it", gradeRecord({ evidence: [item({ kind: "behavior" }), item({ id: "y", kind: "behavior", supports: false })] }, today).level === "moderate");
}
function valBroken(name, change, pattern) {
  const dir = join(tmp, `v${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run("check-validation.mjs", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const problemOf = (d) => join(d, "purpose/validation/problem.json");
{
  const { score, facts } = await import(join(root, "schema/check-validation.mjs"));
  const W = JSON.parse(readFileSync(join(root, "purpose/kits/validation/weights.json"), "utf8"));
  const all = (p, e = 1) => Object.fromEntries(["problem", "solution", "product-market-fit", "pricing", "go-to-market", "team", "operations-readiness"].map((k) => [k, { probability: p, weight: e }]));
  expect("score: strong evidence on every sub-score recommends Validation", score(all(0.9), W).recommends_validated);
  expect("score: a problem below its floor holds the venture back", (() => { const r = all(0.9); r.problem = { probability: 0.9, weight: 0.1 }; const s = score(r, W); return !s.recommends_validated && s.below_floor.includes("problem"); })());
  expect("score: cofounder-first weighs team over product-market fit", (() => { const s = score(all(0.5), W, { path: "cofounder-first" }); const w = (id) => s.parts.find((x) => x.id === id).w; return w("team") > w("product-market-fit"); })());
  expect("score: a missing sub-score counts zero and is listed", score({ problem: { probability: 1, weight: 1 } }, W).not_stated.length === 6);
  expect("facts: Ellis share and flat retention are read from the data", (() => { const f = facts("product-market-fit", { ellis: { asked: 10, very_disappointed: 4 }, retention: { cohorts: [{ size: 10, active: [10, 8, 7, 7, 7] }] } }); return f.ellis_share === 0.4 && f.retention_levels_off === true; })());
  expect("facts: team gaps are skills needed with no holder", facts("team", { needed: [{ skill: "sales", by_phase: "validation" }], held: [] }).gaps.length === 1);
}
expect("check-validation passes on the examples", run("check-validation.mjs", [join(root, "schema/examples/workspace")]).status === 0);
valBroken("a source file that does not exist fails", (d) => edit(problemOf(d), (p) => { p.evidence[0].source.path = "knowledge/nope.md"; }), /source knowledge\/nope.md not found/);
valBroken("a url with no checked date fails", (d) => edit(problemOf(d), (p) => { p.evidence[0].source = { url: "https://example.com/report" }; }), /cites a url with no checked date/);
valBroken("a file that is not a sub-score fails", (d) => writeFileSync(join(d, "purpose/validation/vibes.json"), "{}"), /not a validation sub-score/);
valBroken("more very disappointed than asked fails", (d) => edit(join(d, "purpose/validation/product-market-fit.json"), (p) => { p.ellis.very_disappointed = 99; }), /more very disappointed than asked/);
valBroken("duplicate evidence ids fail", (d) => edit(problemOf(d), (p) => { p.evidence[1].id = p.evidence[0].id; }), /duplicate evidence ids/);

// need-now: what a venture needs at this moment (EE-028).
{
  const { needNow } = await import(join(root, "schema/need-now.mjs"));
  const N = JSON.parse(readFileSync(join(root, "schema/need-now.json"), "utf8"));
  const model = JSON.parse(readFileSync(join(root, "schema/data-model.json"), "utf8"));
  const venture = new Set(model.records.filter((r) => r.level === "venture" && r.id !== "venture").map((r) => r.id));
  expect("need-now: every venture record type has a prior, and only those", [...venture].every((t) => N.records[t]) && Object.keys(N.records).every((t) => venture.has(t)));
  const t = needNow(tandem), row = (id) => t.rows.find((r) => r.type === id);
  expect("need-now: a venture-capital venture needs a board", row("board").now === 1);
  expect("need-now: records that exist are held, not suggested", row("validation-problem").status === "held");
  const solo = join(tmp, "solo"); cpSync(tandem, solo, { recursive: true });
  edit(join(solo, "venture.json"), (v) => { v.phase = "discovery"; v.form = { legal_form: "none", funding: "bootstrapped" }; v.members = []; v.owner = "self"; });
  for (const f of ["ownership.json", "board.json", "founder-agreement.json", "exit.json", "publication-policy.json"]) rmSync(join(solo, "governance", f));
  const s = needNow(solo), srow = (id) => s.rows.find((r) => r.type === id);
  expect("need-now: a solo bootstrapped venture in Discovery holds back the cap table and board", srow("ownership").status === "hold back" && srow("board").status === "hold back");
}

// time-to-ready: running, and ready per layer and tier (the telos's Option B measure).
{
  const { timeToReady } = await import(join(root, "schema/time-to-ready.mjs"));
  const r = timeToReady(tandem);
  expect("time-to-ready: a venture with no live product is not running yet", !r.running.on && r.running.missing.includes("product_offered"));
  expect("time-to-ready: layers the venture turned off are not asked for", !r.layers.some((l) => l.layer === "interface"));
  const live = join(tmp, "live"); cpSync(tandem, live, { recursive: true });
  edit(join(live, "products/shop-app.json"), (p) => { p.status = "live"; });
  mkdirSync(join(live, "accounts/first-shop"), { recursive: true });
  writeFileSync(join(live, "accounts/first-shop/account.json"), JSON.stringify({ id: "first-shop", name: "First shop", relationship: "customer" }));
  expect("time-to-ready: a live product with an account and next-phase exit criteria is running", !!timeToReady(live).running.on);
}

// check-team: agents as teammates, with human loops where they are needed (EE-029).
const eeVenture = join(root, "instance/ventures/everything-ecosystem");
function teamBroken(name, change, pattern) {
  const dir = join(tmp, `team${++n}`);
  cpSync(eeVenture, dir, { recursive: true });
  change(dir);
  const r = run("check-team.mjs", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const planOf = (d) => join(d, "operations/team-plan.json");
expect("check-team passes on the instance", run("check-team.mjs", [join(root, "instance")]).status === 0);
teamBroken("an agent holding an escalate class fails", (d) => edit(planOf(d), (p) => { p.roles[1].authority.push("spend-money"); }), /holds spend-money, which decision rights give to founder|an escalate class/);
teamBroken("an agent doing an unknown task with no human loop fails", (d) => edit(planOf(d), (p) => { delete p.roles[3].tasks[0].human_loop; }), /names a human loop/);
teamBroken("a human loop that is not a person role fails", (d) => edit(planOf(d), (p) => { p.roles[3].tasks[0].human_loop = "builder"; }), /is not a person role/);
teamBroken("a task citing an unknown capability fails", (d) => edit(planOf(d), (p) => { p.roles[2].tasks[0].capability = "telepathy"; }), /unknown capability telepathy/);
teamBroken("an open person role needed now with no recruiting entry fails", (d) => edit(planOf(d), (p) => { p.roles.push({ id: "sales-lead", name: "Sales lead", occupant: "person", needed_by: "discovery", status: "open" }); }), /needed now and open, but has no recruiting entry/);
teamBroken("an agent in a person's registry role fails", (d) => edit(planOf(d), (p) => { p.roles[0].occupant = "agent"; }), /an agent cannot occupy it/);

// The source-of-truth matrix and the where-used list (EE-042), on broken copies of tandem.
function knowBroken(name, script, change, pattern) {
  const dir = join(tmp, `k${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run(script, [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const srcMap = (d) => join(d, "knowledge/sources.json");
const used = (d) => join(d, "knowledge/where-used.json");
const anyRule = { record: "product", attribute: "*", phase: "*", product: "*", account: "*", actor: "*", system_of_record: "venture", owner: "founder" };
expect("check-sources passes on the examples", run("check-sources.mjs", [join(root, "schema/examples/workspace")]).status === 0);
expect("check-where-used passes on the examples", run("check-where-used.mjs", [join(root, "schema/examples/workspace")]).status === 0);
knowBroken("a matrix rule naming an unknown source fails", "check-sources.mjs", (d) => edit(srcMap(d), (m) => { m.rules[0].system_of_record = "crm"; }), /system of record crm is not one of its sources/);
knowBroken("two matrix rules that can tie fail", "check-sources.mjs", (d) => edit(srcMap(d), (m) => { m.rules.push({ ...anyRule, phase: "validation" }, { ...anyRule, actor: "agent" }); }), /can both hold and tie/);
knowBroken("a matrix rule for a pinned record type fails", "check-sources.mjs", (d) => edit(srcMap(d), (m) => { m.rules.push({ ...anyRule, record: "venture", phase: "scale" }); }), /venture stays in the venture folder/);
knowBroken("a live child that no longer shows its parent's value is drift", "check-where-used.mjs", (d) => edit(join(d, "products/shop-app.json"), (p) => { p.name = "Tandem for shops"; }), /does not show "Tandem for shops"/);
knowBroken("a parent pointer with no value fails", "check-where-used.mjs", (d) => edit(used(d), (w) => { w.facts[0].parent.pointer = "/price"; }), /has no value at \/price/);
knowBroken("a child in an unknown source fails", "check-where-used.mjs", (d) => edit(used(d), (w) => { w.facts[0].children[0].source = "website"; }), /website is not one of the venture's sources/);

// Departments (EE-047): imported only when needed, tagged in their own folders, grouping optional.
const dept = (d, ...p) => join(d, "operations/departments", ...p, "department.json");
expect("check-departments passes on the examples", run("check-departments.mjs", [join(root, "schema/examples/workspace")]).status === 0);
knowBroken("a listed department with no folder fails", "check-departments.mjs", (d) => edit(join(d, "venture.json"), (v) => { v.departments.push("human-capital"); }), /human-capital is listed but has no folder/);
knowBroken("a department folder not in venture.json fails", "check-departments.mjs", (d) => edit(join(d, "venture.json"), (v) => { v.departments = ["marketing-and-sales"]; }), /finance is not in venture.json departments/);
knowBroken("a value-chain tag that disagrees with the catalog fails", "check-departments.mjs", (d) => edit(dept(d, "finance"), (t) => { t.value_chain = "primary"; }), /value_chain primary, the catalog says support/);
knowBroken("a department grouped under the wrong value-chain folder fails", "check-departments.mjs", (d) => { const s = join(d, "operations/departments"); mkdirSync(join(s, "primary"), { recursive: true }); renameSync(join(s, "finance"), join(s, "primary/finance")); }, /grouped under primary\/ but finance is a support activity/);
knowBroken("a department folder without its tag fails", "check-departments.mjs", (d) => rmSync(dept(d, "finance")), /has no department.json/);
{
  const dir = join(tmp, `k${++n}`);
  cpSync(tandem, dir, { recursive: true });
  edit(used(dir), (w) => { w.facts[0].children = w.facts[0].children.filter((c) => c.status === "frozen"); });
  edit(join(dir, "products/shop-app.json"), (p) => { p.name = "Tandem for shops"; });
  expect("a frozen child is history: a changed parent is not drift for it", run("check-where-used.mjs", [dir]).status === 0);
}

// check-integrations and check-nouns read a whole repository: run them on a copy.
const repo = join(tmp, "repo");
cpSync(root, repo, { recursive: true, filter: (s) => !/\/(\.git|node_modules|\.next|_pagefind)(\/|$)|\/site\/(generated|out)(\/|$)/.test(s) });
expect("check-integrations passes on the repository", run("check-integrations.mjs", [], { EE_ROOT: repo }).status === 0);
edit(join(repo, "interface/tooling/integrations.json"), (list) => { list.push({ id: "obsidian", name: "Obsidian", layer: "interface", role: "notes", interfaces: ["app"], reach: ["knowledge"], interface_kind: "custom", status: "in-use" }); });
{ const r = run("check-integrations.mjs", [], { EE_ROOT: repo }); expect("a single-layer tool listed as an interface fails", r.status !== 0 && /reaches 1 layers/.test(r.stderr)); }
expect("check-nouns passes on the repository", run("check-nouns.mjs", [], { EE_ROOT: repo }).status === 0);
writeFileSync(join(repo, "schema/README.md"), readFileSync(join(repo, "schema/README.md"), "utf8") + "\nEach sphere holds products.\n"); // a retired noun, on purpose
{ const r = run("check-nouns.mjs", [], { EE_ROOT: repo }); expect("a retired noun in a checked file fails", r.status !== 0 && /retired noun "sphere"/.test(r.stderr)); }

// check-boundary reads a whole repository: framework code never imports platform code (EE-041).
expect("check-boundary passes on the repository", run("check-boundary.mjs", [], { EE_ROOT: repo }).status === 0);
writeFileSync(join(repo, "knowledge/connectors/leak.mjs"), 'import { connect } from "../../platform/connectors/github.mjs";\nexport default connect;\n');
{ const r = run("check-boundary.mjs", [], { EE_ROOT: repo }); expect("a framework file importing from platform/ fails", r.status !== 0 && /framework code never imports platform code/.test(r.stderr)); }
rmSync(join(repo, "knowledge/connectors/leak.mjs"));
edit(join(repo, "knowledge/tooling/integrations.json"), (list) => { list.find((t) => t.id === "github").connector.module = "knowledge/connectors/filesystem.mjs"; list.find((t) => t.id === "github").credentials = ["GITHUB_TOKEN"]; });
{ const r = run("check-boundary.mjs", [], { EE_ROOT: repo }); expect("a framework connector with credentials fails", r.status !== 0 && /needs no credentials/.test(r.stderr)); }

// check-data-model reads a whole repository too: each case breaks a fresh copy.
const copy = (name) => { const d = join(tmp, name); cpSync(root, d, { recursive: true, filter: (s) => !/\/(\.git|node_modules|\.next|_pagefind)(\/|$)|\/site\/(generated|out)(\/|$)/.test(s) }); return d; };
expect("check-data-model passes on the repository", run("check-data-model.mjs", [], { EE_ROOT: copy("dm0") }).status === 0);
for (const [name, change, pattern] of [
  ["a JSON file with no record type fails", (d) => writeFileSync(join(d, "purpose/stray.json"), "{}"), /purpose\/stray.json: no record type/],
  ["a schema no record type names fails", (d) => writeFileSync(join(d, "schema/stray.schema.json"), "{}"), /a schema no record type names/],
  ["a skill no layer or package lists fails", (d) => { mkdirSync(join(d, "operations/skills/run-handoff"), { recursive: true }); writeFileSync(join(d, "operations/skills/run-handoff/SKILL.md"), "---\n---\n"); }, /no layer or package lists this skill/],
  ["a layer owning another layer's record fails", (d) => edit(join(d, "purpose/layer.json"), (k) => { k.records.push("handoff"); }), /handoff: owned by both/],
  ["a layer reading an unknown record type fails", (d) => edit(join(d, "operations/layer.json"), (k) => { k.reads.push("no-such-record"); }), /reads unknown record type no-such-record/],
]) {
  const d = copy(`dm${++n}`);
  change(d);
  const r = run("check-data-model.mjs", [], { EE_ROOT: d });
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log("all checker tests pass");
