// Tests for the schema's checkers: each runs once on the real records (it must pass) and
// once per broken copy (it must fail, naming the rule). Copies live in a temp folder.
//
//   node packages/naive/src/checks/test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readDataModel, recordsIn } from "../records/index.ts";
import { naiveScript } from "../core/scripts.ts";
import type { Board, DataModel, DecisionRights, Department, DepartmentCatalog, Evidence, Exit, FounderAgreement, Handoff, Integration, KnowledgeSources, Layer, LeadPlan, Ownership, Product, PublicationPolicy, TeamPlan, Telos, ValidationProblem, ValidationProductMarketFit, Venture, WhereUsed } from "../records/types/records.d.ts";

// A library package's package.json has no schema: the fields these tests change.
type PackageManifest = { department?: string, use_model?: { step: string, inputs: string[] }[] };
// Each broken copy is made by a function that changes the copied folder.
type Change = (dir: string) => void;

const root = new URL("../../../..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "ee-schema-test-"));
const run = (script: string, args: string[] = [], env: Record<string, string> = {}) => spawnSync("node", [naiveScript(script), ...args], { encoding: "utf8", env: { ...process.env, ...env } });
// The callback names the record type of the file it changes; a broken copy may leave that type on purpose.
const edit = <T>(file: string, f: (d: T) => void) => { const d = JSON.parse(readFileSync(file, "utf8")) as T; f(d); writeFileSync(file, JSON.stringify(d, null, 2)); };
// A fixture value a test reaches into: a missing one throws, as reading it unchecked did.
const must = <T>(v: T | null | undefined): T => { if (v == null) throw new TypeError("the fixture lacks a value this test changes"); return v; };
let failed = 0, n = 0;
const expect = (name: string, ok: unknown) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };

// A broken copy of the example software venture (relay), checked by the given script. `pattern` must appear in the errors.
const workspace = join(root, "packages/naive/src/records/examples/software");
const venture = join(workspace, "ventures/relay");
function broken(name: string, script: string, change: Change, pattern: RegExp) {
  const dir = join(tmp, `v${++n}`);
  cpSync(venture, dir, { recursive: true });
  change(dir);
  const r = run(script, [script === "check-ventures.ts" ? dir : dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const handoff = (dir: string, id: string) => join(dir, "operations/handoffs", `${id}.json`);

expect("check-ventures passes on the software example", run("check-ventures.ts", [workspace]).status === 0);
expect("check-ventures passes on the examples", run("check-ventures.ts", [join(root, "packages/naive/src/records/examples/workspace")]).status === 0);
broken("a flows_to to an unknown product fails", "check-ventures.ts", (d) => edit(join(d, "product/plugin.json"), (p: Product) => { p.flows_to = ["nope"]; }), /flows_to unknown product nope/);
broken("a part_of to an unknown product fails", "check-ventures.ts", (d) => edit(join(d, "product/recipes.json"), (p: Product) => { p.part_of = ["nope"]; }), /part_of unknown product nope/);
broken("a missing layer folder fails", "check-ventures.ts", (d) => rmSync(join(d, "operations"), { recursive: true }), /operations layer location/);
broken("a tier scope outside operations fails", "check-ventures.ts", (d) => edit(join(d, "products/cli.json"), (p: Product) => { p.scope = { level: "tier", layer: "knowledge", tier: "delivery" }; }), /tier-scoped/);
broken("software with no repository fails", "check-ventures.ts", (d) => edit(join(d, "venture.json"), (v: Venture) => { delete v.repos; }), /builds software, so the venture \(or a parent\) needs a repository/);
broken("several markets with no primary fail", "check-ventures.ts", (d) => edit(join(d, "product/plugin.json"), (p: Product) => { (p as { market?: unknown }).market = [p.market, p.market]; }), /exactly one primary/);

expect("check-execution passes on the software example", run("check-execution.ts", [venture]).status === 0);
broken("a class the role does not own fails", "check-execution.ts", (d) => edit(handoff(d, "json-output"), (h: Handoff) => { h.decision_classes.push("new-structure"); }), /belongs to architect/);
broken("no self-proof criterion fails", "check-execution.ts", (d) => edit(handoff(d, "flag-fixes"), (h: Handoff) => { h.done_criteria = h.done_criteria.filter((c) => c.kind !== "self-proof"); }), /no self-proof/);
broken("done without evidence fails", "check-execution.ts", (d) => edit(handoff(d, "flag-fixes"), (h: Handoff) => { h.evidence = []; }), /no passing evidence/);
broken("done without a PR fails", "check-execution.ts", (d) => edit(handoff(d, "flag-fixes"), (h: Handoff) => { delete h.pr; }), /done without a PR/);
broken("a review passed by the wrong role fails", "check-execution.ts", (d) => {
  for (const f of ["json-output"]) edit(handoff(d, f), (h: Handoff) => { h.evidence = must(h.evidence).slice(-1); });
  const e = JSON.parse(readFileSync(handoff(d, "json-output"), "utf8")).evidence[0];
  edit(join(d, "operations/handoffs", e), (x: Evidence) => { x.results.forEach((r) => { if (r.kind === "review") r.by = "builder"; }); });
}, /must be passed by architect/);
broken("escalated with no open question fails", "check-execution.ts", (d) => edit(handoff(d, "docs-refresh"), (h: Handoff) => { must(h.escalations).forEach((e) => { e.answer = "yes"; }); }), /escalated with no open question/);
broken("attempts used up while in progress fail", "check-execution.ts", (d) => edit(handoff(d, "docs-refresh"), (h: Handoff) => { h.status = "in-progress"; h.attempts = 3; }), /attempts used up/);
broken("evidence whose passed flag lies fails", "check-execution.ts", (d) => {
  const e = JSON.parse(readFileSync(handoff(d, "docs-refresh"), "utf8")).evidence[0];
  edit(join(d, "operations/handoffs", e), (x: Evidence) => { x.passed = true; });
}, /results disagree/);
// A measured value sits in its own record: quantity, value, unit and an optional limit.
type Limit = { min?: number, max?: number };
const measuredEvidence = (d: string) => join(d, "evidence/results/flag-fixes-20261101090000.json");
const measure = (value: number, limit: Limit) => (x: Evidence) => { x.conditions = [{ quantity: "ambient temperature", value: 21, unit: "Cel" }]; x.results[0].measured = [{ quantity: "p95 latency", value, unit: "ms", limit }]; };
broken("a result that passes with a measured value outside its limit fails", "check-execution.ts", (d) => edit(measuredEvidence(d), measure(250, { max: 200 })), /p95 latency 250 ms is outside its limit - to 200/);
broken("a measured limit whose min is above its max fails", "check-execution.ts", (d) => edit(measuredEvidence(d), measure(150, { min: 300, max: 200 })), /min is above its max/);
{
  const dir = join(tmp, `v${++n}`);
  cpSync(venture, dir, { recursive: true });
  edit(measuredEvidence(dir), measure(150, { max: 200 }));
  expect("a measured value inside its limit, with conditions, passes", run("check-execution.ts", [dir]).status === 0);
}
broken("loosening a class without a decision fails", "check-execution.ts", (d) => edit(join(d, "governance/decision-rights.json"), (r: DecisionRights) => { r.classes = [{ id: "public-commitment", owner: "founder", level: "decide" }]; }), /loosens escalate to decide/);

// check-ready: a fresh draft built from a done handoff passes; each gap makes it fail.
function draft(name: string, change: Change, pattern?: RegExp) {
  const dir = join(tmp, `r${++n}`);
  cpSync(venture, dir, { recursive: true });
  edit(handoff(dir, "flag-fixes"), (h: Handoff) => { Object.assign(h, { status: "draft", attempts: 0, evidence: [] }); delete h.pr; delete h.claimed_by; delete h.lesson; });
  change(dir);
  const r = run("check-ready.ts", [dir, "flag-fixes"]);
  expect(name, pattern ? r.status !== 0 && pattern.test(r.stdout) : r.status === 0);
}
const briefOf = (d: string) => join(d, "operations/handoffs/flag-fixes.md");
draft("check-ready passes on a complete draft", () => {});
draft("a brief with no Outcome is not ready", (d) => writeFileSync(briefOf(d), readFileSync(briefOf(d), "utf8").replace(/## Outcome/, "## Background")), /FAIL {2}brief has its Outcome section/);
draft("a brief with a TBD is not ready", (d) => writeFileSync(briefOf(d), readFileSync(briefOf(d), "utf8") + "\nStep 4: TBD\n"), /FAIL {2}brief has no placeholders left: TBD/);
draft("an unknown product is not ready", (d) => edit(handoff(d, "flag-fixes"), (h: Handoff) => { h.products = ["nope"]; }), /FAIL {2}every product it serves exists: nope/);
draft("an unknown decision is not ready", (d) => edit(handoff(d, "flag-fixes"), (h: Handoff) => { h.governed_by = ["EE-999"]; }), /FAIL {2}every governing decision exists.*EE-999/);
draft("a criterion calling a missing script is not ready", (d) => edit(handoff(d, "flag-fixes"), (h: Handoff) => { h.done_criteria[0].check = "node purpose/nope.mjs"; }), /FAIL {2}every script a criterion runs exists/);
broken("in progress without a readiness check fails", "check-execution.ts", (d) => edit(handoff(d, "flag-fixes"), (h: Handoff) => { h.status = "in-progress"; h.attempts = 1; }), /without a recorded readiness check/);

// check-governance and payouts, on broken copies of the venture-backed example.
const tandem = join(root, "packages/naive/src/records/examples/workspace/ventures/tandem");
const gov = (d: string, f: string) => join(d, "governance", f);
function govBroken(name: string, change: Change, pattern: RegExp) {
  const dir = join(tmp, `g${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run("check-governance.ts", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
expect("check-governance passes on the examples", run("check-governance.ts", [join(root, "packages/naive/src/records/examples/workspace")]).status === 0);
govBroken("venture capital with no formal board fails", (d) => rmSync(gov(d, "board.json")), /venture-capital funding needs/);
govBroken("two founders with no founder agreement fails", (d) => rmSync(gov(d, "founder-agreement.json")), /2 founders share ownership/);
govBroken("a founder missing from the agreement fails", (d) => edit(gov(d, "founder-agreement.json"), (a: FounderAgreement) => { a.founders.pop(); }), /founder ben is not in the agreement/);
govBroken("a grant to an unknown holder fails", (d) => edit(gov(d, "ownership.json"), (o: Ownership) => { o.grants[0].holder = "nobody"; }), /grant to unknown holder nobody/);
govBroken("a cliff longer than vesting fails", (d) => edit(gov(d, "ownership.json"), (o: Ownership) => { must(o.grants[0].vesting).cliff_months = 60; }), /cliff is longer/);
govBroken("a preferred class with no price fails", (d) => edit(gov(d, "ownership.json"), (o: Ownership) => { delete o.classes[1].price_per_share; }), /needs price_per_share/);
govBroken("an S corporation with preferred stock fails", (d) => edit(join(d, "venture.json"), (v: Venture) => { must(v.form).legal_form = "s-corp"; }), /one class of stock/);
govBroken("an investor seat without a board-seat right fails", (d) => edit(gov(d, "ownership.json"), (o: Ownership) => { o.classes[1].rights = ["information"]; }), /holds no board-seat right/);
govBroken("reserved matters on an advisory board fail", (d) => edit(gov(d, "board.json"), (b: Board) => { b.boards[1].reserved_matters = ["approve the budget"]; }), /advisory board advisors has reserved matters/);
{
  const { payouts } = await import(join(root, "packages/naive/src/engine/payouts.ts"));
  const own = JSON.parse(readFileSync(gov(tandem, "ownership.json"), "utf8"));
  const pay = (v: number, h: string) => payouts(own, v).payouts.find((p: { holder: string }) => p.holder === h).amount;
  expect("payouts: at a soft landing preferred takes its 1x preference", pay(3000000, "lark-ventures") === 2000000);
  expect("payouts: at a high value preferred converts and shares pro rata", payouts(own, 150000000).converted.includes("series-seed") && pay(150000000, "ana") === pay(150000000, "ben"));
  expect("payouts: payouts always add up to the sale value", [0, 1e6, 3e6, 4e7].every((v) => Math.abs(payouts(own, v).payouts.reduce((n: number, p: { amount: number }) => n + p.amount, 0) - v) <= 1));
  expect("payouts: the unissued option pool is paid nothing", !payouts(own, 4e7).payouts.some((p: { holder: string }) => p.holder === "pool"));
}

// check-telos: every exit criterion traces to a measure, and exit.json follows the telos.
function telosBroken(name: string, change: Change, pattern: RegExp) {
  const dir = join(tmp, `t${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run("check-telos.ts", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const telosOf = (d: string) => join(d, "purpose/telos.json");
expect("check-telos passes on the examples", run("check-telos.ts", [join(root, "packages/naive/src/records/examples/workspace")]).status === 0);
telosBroken("an exit criterion serving no known measure fails", (d) => edit(telosOf(d), (t: Telos) => { must(t.phases)[0].exit_criteria[0].serves = ["nope"]; }), /serves unknown measure nope/);
telosBroken("two primary measures fail", (d) => edit(telosOf(d), (t: Telos) => { t.measures[1].primary = true; }), /exactly one measure is primary/);
telosBroken("exit.json preferring another path fails", (d) => edit(telosOf(d), (t: Telos) => { t.owner_outcome.path = "ipo"; }), /prefers acquisition, but the telos intends ipo/);
telosBroken("exit.json ruling out the telos path fails", (d) => edit(gov(d, "exit.json"), (e: Exit) => { e.paths[0].stance = "ruled-out"; }), /rules out acquisition/);

// check-publication: every publication passes the gate (EE-025).
function pubBroken(name: string, change: Change, pattern: RegExp) {
  const dir = join(tmp, `p${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run("check-publication.ts", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const policyOf = (d: string) => gov(d, "publication-policy.json");
const publishing = (d: string, h: object) => { mkdirSync(join(d, "operations/handoffs"), { recursive: true }); writeFileSync(join(d, "operations/handoffs/post.json"), JSON.stringify({ id: "post", decision_classes: ["public-commitment"], ...h })); };
expect("check-publication passes on the examples", run("check-publication.ts", [join(root, "packages/naive/src/records/examples/workspace")]).status === 0);
pubBroken("an agent role as approver fails", (d) => edit(policyOf(d), (p: PublicationPolicy) => { p.channels[0].rules[0].approvers = ["builder"]; }), /builder is an agent role/);
pubBroken("a team with no person cannot approve", (d) => edit(policyOf(d), (p: PublicationPolicy) => { must(p.teams)[0].members = ["builder"]; }), /team founders has no person/);
pubBroken("a channel following an unknown guideline fails", (d) => edit(policyOf(d), (p: PublicationPolicy) => { must(p.channels[0].guidelines).push("nope"); }), /follows unknown guideline nope/);
pubBroken("a guideline with a missing file fails", (d) => edit(policyOf(d), (p: PublicationPolicy) => { must(p.guidelines)[0].path = "pillars/nope.md"; }), /guideline brand not found/);
pubBroken("a newsletter that names no platform fails", (d) => edit(policyOf(d), (p: PublicationPolicy) => { delete p.channels[1].platform; }), /is newsletter, so it names its platform/);
pubBroken("a platform channel citing none of the platform's rules fails", (d) => edit(policyOf(d), (p: PublicationPolicy) => { p.channels[1].guidelines = ["brand"]; }), /runs on substack but cites none of its rules/);
pubBroken("a social channel silent on replies fails", (d) => edit(policyOf(d), (p: PublicationPolicy) => { delete p.channels[1].replies; }), /says how replies and comments are handled/);
pubBroken("replies delegated to agents only fail", (d) => edit(policyOf(d), (p: PublicationPolicy) => { must(p.channels[1].replies).delegates = ["builder"]; }), /delegates replies to agents only/);
pubBroken("a publishing handoff with no channel fails", (d) => publishing(d, {}), /names its channel and content/);
pubBroken("a publishing handoff on an unknown channel fails", (d) => publishing(d, { publication: { channel: "billboard", content: "product pages" } }), /unknown channel billboard/);
pubBroken("content the channel has no rule for fails", (d) => publishing(d, { publication: { channel: "website", content: "memes" } }), /no rule for "memes"/);
pubBroken("a publishing handoff with no policy fails", (d) => { rmSync(policyOf(d)); publishing(d, {}); }, /no governance\/publication-policy.json/);
expect("a publishing handoff naming a known channel and rule passes", (() => { const d = join(tmp, `p${++n}`); cpSync(tandem, d, { recursive: true }); publishing(d, { publication: { channel: "website", content: "product pages" } }); return run("check-publication.ts", [d]).status === 0; })());

// check-validation: evidence grades (EE-026), adapted from GRADE.
{
  const { gradeItem, gradeRecord } = await import(join(root, "packages/naive/src/checks/check-validation.ts"));
  const today = new Date("2026-10-27");
  const item = (o: object) => ({ id: "x", kind: "stated", summary: "s", source: { path: "a" }, audience: "target", sample: { n: 12 }, specificity: "specific", collected: "2026-09-01", ...o });
  expect("validation: a claim with no evidence grades very low", gradeRecord({ evidence: [] }, today).level === "very low");
  expect("validation: behavior from the target segment grades high", gradeItem(item({ kind: "behavior" }), today).level === "high");
  expect("validation: the wrong audience drops two grades", gradeItem(item({ kind: "behavior", audience: "wrong" }), today).level === "low");
  expect("validation: a sample under 5 drops a grade", gradeItem(item({ kind: "commitment", sample: { n: 3 } }), today).level === "low");
  expect("validation: general answers drop stated evidence to very low", gradeItem(item({ specificity: "general" }), today).level === "very low");
  expect("validation: evidence older than 18 months drops a grade", gradeItem(item({ kind: "behavior", collected: "2024-01-01" }), today).level === "moderate");
  expect("validation: three agreeing sources raise a record one grade", gradeRecord({ evidence: [1, 2, 3].map((i) => item({ id: `s${i}`, source: { path: `p${i}` } })) }, today).level === "moderate");
  expect("validation: evidence as strong against the claim lowers it", gradeRecord({ evidence: [item({ kind: "behavior" }), item({ id: "y", kind: "behavior", supports: false })] }, today).level === "moderate");
}
function valBroken(name: string, change: Change, pattern: RegExp) {
  const dir = join(tmp, `v${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run("check-validation.ts", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const problemOf = (d: string) => join(d, "purpose/validation/problem.json");
{
  const { score, facts } = await import(join(root, "packages/naive/src/checks/check-validation.ts"));
  const W = JSON.parse(readFileSync(join(root, "packages/naive/src/functions/strategy/kits/validation/weights.json"), "utf8"));
  const all = (p: number, e = 1) => Object.fromEntries(["problem", "solution", "product-market-fit", "pricing", "go-to-market", "team", "operations-readiness"].map((k) => [k, { probability: p, weight: e }]));
  expect("score: strong evidence on every sub-score recommends Validation", score(all(0.9), W).recommends_validated);
  expect("score: a problem below its floor holds the venture back", (() => { const r = all(0.9); r.problem = { probability: 0.9, weight: 0.1 }; const s = score(r, W); return !s.recommends_validated && s.below_floor.includes("problem"); })());
  expect("score: cofounder-first weighs team over product-market fit", (() => { const s = score(all(0.5), W, { path: "cofounder-first" }); const w = (id: string) => s.parts.find((x: { id: string }) => x.id === id).w; return w("team") > w("product-market-fit"); })());
  expect("score: a missing sub-score counts zero and is listed", score({ problem: { probability: 1, weight: 1 } }, W).not_stated.length === 6);
  expect("facts: Ellis share and flat retention are read from the data", (() => { const f = facts("product-market-fit", { ellis: { asked: 10, very_disappointed: 4 }, retention: { cohorts: [{ size: 10, active: [10, 8, 7, 7, 7] }] } }); return f.ellis_share === 0.4 && f.retention_levels_off === true; })());
  expect("facts: team gaps are skills needed with no holder", facts("team", { needed: [{ skill: "sales", by_phase: "validation" }], held: [] }).gaps.length === 1);
}
expect("check-validation passes on the examples", run("check-validation.ts", [join(root, "packages/naive/src/records/examples/workspace")]).status === 0);
valBroken("a source file that does not exist fails", (d) => edit(problemOf(d), (p: ValidationProblem) => { p.evidence[0].source.path = "knowledge/nope.md"; }), /source knowledge\/nope.md not found/);
valBroken("a url with no checked date fails", (d) => edit(problemOf(d), (p: ValidationProblem) => { p.evidence[0].source = { url: "https://example.com/report" }; }), /cites a url with no checked date/);
valBroken("a file that is not a sub-score fails", (d) => writeFileSync(join(d, "purpose/validation/vibes.json"), "{}"), /not a validation sub-score/);
valBroken("more very disappointed than asked fails", (d) => edit(join(d, "purpose/validation/product-market-fit.json"), (p: ValidationProductMarketFit) => { must(p.ellis).very_disappointed = 99; }), /more very disappointed than asked/);
valBroken("duplicate evidence ids fail", (d) => edit(problemOf(d), (p: ValidationProblem) => { p.evidence[1].id = p.evidence[0].id; }), /duplicate evidence ids/);

// need-now: what a venture needs at this moment (EE-028).
{
  const { needNow } = await import(join(root, "packages/naive/src/engine/need-now.ts"));
  const N = JSON.parse(readFileSync(join(root, "packages/naive/src/engine/need-now.json"), "utf8"));
  const model = readDataModel() as DataModel;
  const venture = new Set(model.records.filter((r) => r.level === "venture" && r.id !== "venture").map((r) => r.id));
  expect("need-now: every venture record type has a prior, and only those", [...venture].every((t) => N.records[t]) && Object.keys(N.records).every((t) => venture.has(t)));
  const t = needNow(tandem), row = (id: string) => t.rows.find((r: { type: string }) => r.type === id);
  expect("need-now: a venture-capital venture needs a board", row("board").now === 1);
  expect("need-now: records that exist are held, not suggested", row("validation-problem").status === "held");
  const solo = join(tmp, "solo"); cpSync(tandem, solo, { recursive: true });
  edit(join(solo, "venture.json"), (v: Venture) => { v.phase = "discovery"; v.form = { legal_form: "none", funding: "bootstrapped" }; v.members = []; v.owner = "self"; });
  for (const f of ["ownership.json", "board.json", "founder-agreement.json", "exit.json", "publication-policy.json"]) rmSync(join(solo, "governance", f));
  const s = needNow(solo), srow = (id: string) => s.rows.find((r: { type: string }) => r.type === id);
  expect("need-now: a solo bootstrapped venture in Discovery holds back the cap table and board", srow("ownership").status === "hold back" && srow("board").status === "hold back");
}

// time-to-ready: running, and ready per layer and tier (the telos's Option B measure).
{
  const { timeToReady } = await import(join(root, "packages/naive/src/engine/time-to-ready.ts"));
  const r = timeToReady(tandem);
  expect("time-to-ready: a venture with no live product is not running yet", !r.running.on && r.running.missing.includes("product_offered"));
  expect("time-to-ready: layers the venture turned off are not asked for", !r.layers.some((l: { layer: string }) => l.layer === "interface"));
  const live = join(tmp, "live"); cpSync(tandem, live, { recursive: true });
  edit(join(live, "products/shop-app.json"), (p: Product) => { p.status = "live"; });
  mkdirSync(join(live, "accounts/first-shop"), { recursive: true });
  writeFileSync(join(live, "accounts/first-shop/account.json"), JSON.stringify({ id: "first-shop", name: "First shop", relationship: "customer" }));
  expect("time-to-ready: a live product with an account and next-phase exit criteria is running", !!timeToReady(live).running.on);
}

// check-team: agents as teammates, with human loops where they are needed (EE-029).
function teamBroken(name: string, change: Change, pattern: RegExp) {
  const dir = join(tmp, `team${++n}`);
  cpSync(venture, dir, { recursive: true });
  change(dir);
  const r = run("check-team.ts", [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const planOf = (d: string) => join(d, "people/team-plan.json");
expect("check-team passes on the software example", run("check-team.ts", [workspace]).status === 0);
teamBroken("an agent holding an escalate class fails", (d) => edit(planOf(d), (p: TeamPlan) => { must(p.roles[1].authority).push("spend-money"); }), /holds spend-money, which decision rights give to founder|an escalate class/);
teamBroken("an agent doing an unknown task with no human loop fails", (d) => edit(planOf(d), (p: TeamPlan) => { delete must(p.roles[3].tasks)[0].human_loop; }), /names a human loop/);
teamBroken("a human loop that is not a person role fails", (d) => edit(planOf(d), (p: TeamPlan) => { must(p.roles[3].tasks)[0].human_loop = "builder"; }), /is not a person role/);
teamBroken("a task citing an unknown capability fails", (d) => edit(planOf(d), (p: TeamPlan) => { must(p.roles[2].tasks)[0].capability = "telepathy"; }), /unknown capability telepathy/);
teamBroken("an open person role needed now with no recruiting entry fails", (d) => edit(planOf(d), (p: TeamPlan) => { p.roles.push({ id: "sales-lead", name: "Sales lead", occupant: "person", needed_by: "discovery", status: "open" }); }), /needed now and open, but has no recruiting entry/);
teamBroken("an agent in a person's registry role fails", (d) => edit(planOf(d), (p: TeamPlan) => { p.roles[0].occupant = "agent"; }), /an agent cannot occupy it/);

// check-team on leads (lead agents build item 3): a copy with telos measures, a growth-lead plan and the lead in its team plan passes;
// a lead that reaches a function's records, lists no write routes, or is bound to no telos measure fails.
const withLead = (d: string) => {
  // relay is migrated (it has canonical goals), so its telos measures live on the venture goal (telos-to-goals keeps the ids).
  writeFileSync(join(d, "foundation/goals/telos.json"), JSON.stringify({ id: "telos", statement: "s", kind: "venture", framework: "telos", measures: [{ id: "paying-teams", statement: "Teams that pay", kind: "revenue", primary: true }, { id: "weekly-users", statement: "Weekly users", kind: "usage_or_adoption" }] }));
  mkdirSync(join(d, "operations/leads"), { recursive: true });
  writeFileSync(join(d, "operations/leads/growth-lead.json"), JSON.stringify({ lead: "growth-lead", portfolio: ["marketing-and-sales", "customer-service"], measures: ["paying-teams"],
    bets: [{ id: "promise-check", statement: "Sales promises match what ships", measures: ["paying-teams"], handoffs: ["flag-fixes"], status: "active" }], review_cadence: "monthly" }));
  edit(planOf(d), (p: TeamPlan) => { p.roles.push({ id: "growth-lead", name: "Growth lead", occupant: "agent", routes: { write: ["operations/lead/growth-lead", "decisions/*", "operations/handoff/*"] } } as TeamPlan["roles"][number]); });
};
const leadOf = (d: string) => join(d, "operations/leads/growth-lead.json");
const growth = (p: TeamPlan) => must(p.roles.find((r) => r.id === "growth-lead"));
{
  const dir = join(tmp, `team${++n}`);
  cpSync(venture, dir, { recursive: true });
  withLead(dir);
  const r = run("check-team.ts", [dir]);
  expect("check-team passes a lead that writes only its plan, decisions and handoffs and is bound to a measure", r.status === 0);
}
{
  const dir = join(tmp, `team${++n}`);
  cpSync(venture, dir, { recursive: true });
  withLead(dir);
  // An unmigrated venture (no canonical goals) reads the measures from telos.json through the telos adapter.
  const goal = JSON.parse(readFileSync(join(dir, "foundation/goals/telos.json"), "utf8"));
  rmSync(join(dir, "foundation/goals"), { recursive: true });
  writeFileSync(join(dir, "foundation/telos.json"), JSON.stringify({ statement: goal.statement, measures: goal.measures }));
  const r = run("check-team.ts", [dir]);
  expect("check-team reads an unmigrated venture's measures from its telos", r.status === 0);
}
teamBroken("a lead with a function's write route fails", (d) => { withLead(d); edit(planOf(d), (p: TeamPlan) => { must(must(growth(p).routes).write).push("marketing/**"); }); }, /growth-lead is a lead and lists write route marketing\/\*\*, which reaches marketing\//);
teamBroken("a lead that may write another lead's plan fails", (d) => { withLead(d); edit(planOf(d), (p: TeamPlan) => { must(must(growth(p).routes).write)[0] = "operations/lead/*"; }); }, /lists write route operations\/lead\/\*, which reaches operations\/lead\/x/);
teamBroken("a lead with no write routes (so every route) fails", (d) => { withLead(d); edit(planOf(d), (p: TeamPlan) => { delete growth(p).routes; }); }, /growth-lead is a lead and lists no write routes/);
teamBroken("a lead with no lead plan fails", (d) => { withLead(d); rmSync(leadOf(d)); }, /growth-lead is a lead with no lead plan .* bound to no telos measure/);
teamBroken("a lead bound to no measure fails", (d) => { withLead(d); edit(leadOf(d), (l: LeadPlan) => { l.measures = []; l.bets = []; }); }, /growth-lead is bound to no telos measure/);
teamBroken("a lead bound to a measure the telos lacks fails", (d) => { withLead(d); edit(leadOf(d), (l: LeadPlan) => { l.measures = ["churn"]; l.bets = []; }); }, /measure churn is not a telos measure id/);
teamBroken("a lead plan outside its template's portfolio fails", (d) => { withLead(d); edit(leadOf(d), (l: LeadPlan) => { l.portfolio.push("finance"); }); }, /portfolio function finance is not in growth-lead's portfolio/);
teamBroken("a bet citing a handoff that does not exist fails", (d) => { withLead(d); edit(leadOf(d), (l: LeadPlan) => { l.bets[0].handoffs = ["nope"]; }); }, /bet promise-check cites handoff nope, which does not exist/);
teamBroken("a bet serving a measure the plan does not bind fails", (d) => { withLead(d); edit(leadOf(d), (l: LeadPlan) => { l.bets[0].measures = ["weekly-users"]; }); }, /bet promise-check serves measure weekly-users, which the plan does not bind/);
teamBroken("a lead plan for a role that is not a lead fails", (d) => { withLead(d); writeFileSync(join(d, "operations/leads/builder.json"), JSON.stringify({ lead: "builder", portfolio: ["products"], measures: ["paying-teams"], bets: [], review_cadence: "monthly" })); }, /operations\/leads\/builder.json: builder is not a lead/);

// The source-of-truth matrix and the where-used list (EE-042), on broken copies of tandem.
function knowBroken(name: string, script: string, change: Change, pattern: RegExp) {
  const dir = join(tmp, `k${++n}`);
  cpSync(tandem, dir, { recursive: true });
  change(dir);
  const r = run(script, [dir]);
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
const srcMap = (d: string) => join(d, "knowledge/sources.json");
const used = (d: string) => join(d, "knowledge/where-used.json");
const anyRule: NonNullable<KnowledgeSources["rules"]>[number] = { record: "product", attribute: "*", phase: "*", product: "*", account: "*", actor: "*", system_of_record: "venture", owner: "founder" };
expect("check-sources passes on the examples", run("check-sources.ts", [join(root, "packages/naive/src/records/examples/workspace")]).status === 0);
expect("check-where-used passes on the examples", run("check-where-used.ts", [join(root, "packages/naive/src/records/examples/workspace")]).status === 0);
knowBroken("a matrix rule naming an unknown source fails", "check-sources.ts", (d) => edit(srcMap(d), (m: KnowledgeSources) => { must(m.rules)[0].system_of_record = "crm"; }), /system of record crm is not one of its sources/);
knowBroken("two matrix rules that can tie fail", "check-sources.ts", (d) => edit(srcMap(d), (m: KnowledgeSources) => { must(m.rules).push({ ...anyRule, phase: "validation" }, { ...anyRule, actor: "agent" }); }), /can both hold and tie/);
knowBroken("a matrix rule for a pinned record type fails", "check-sources.ts", (d) => edit(srcMap(d), (m: KnowledgeSources) => { must(m.rules).push({ ...anyRule, record: "venture", phase: "scale" }); }), /venture stays in the venture folder/);
knowBroken("a live child that no longer shows its parent's value is drift", "check-where-used.ts", (d) => edit(join(d, "products/shop-app.json"), (p: Product) => { p.name = "Tandem for shops"; }), /does not show "Tandem for shops"/);
knowBroken("a parent pointer with no value fails", "check-where-used.ts", (d) => edit(used(d), (w: WhereUsed) => { w.facts[0].parent.pointer = "/price"; }), /has no value at \/price/);
knowBroken("a child in an unknown source fails", "check-where-used.ts", (d) => edit(used(d), (w: WhereUsed) => { w.facts[0].children[0].source = "website"; }), /website is not one of the venture's sources/);

// Departments (EE-047): imported only when needed, tagged in their own folders, grouping optional.
const dept = (d: string, ...p: string[]) => join(d, "operations/departments", ...p, "department.json");
expect("check-departments passes on the examples", run("check-departments.ts", [join(root, "packages/naive/src/records/examples/workspace")]).status === 0);
knowBroken("a listed department with no folder fails", "check-departments.ts", (d) => edit(join(d, "venture.json"), (v: Venture) => { must(v.departments).push("human-capital"); }), /human-capital is listed but has no folder/);
knowBroken("a department folder not in venture.json fails", "check-departments.ts", (d) => edit(join(d, "venture.json"), (v: Venture) => { v.departments = ["marketing-and-sales"]; }), /finance is not in venture.json departments/);
knowBroken("a value-chain tag that disagrees with the catalog fails", "check-departments.ts", (d) => edit(dept(d, "finance"), (t: Department) => { t.value_chain = "primary"; }), /value_chain primary, the catalog says support/);
knowBroken("a department grouped under the wrong value-chain folder fails", "check-departments.ts", (d) => { const s = join(d, "operations/departments"); mkdirSync(join(s, "primary"), { recursive: true }); renameSync(join(s, "finance"), join(s, "primary/finance")); }, /grouped under primary\/ but finance is a support activity/);
knowBroken("a department folder without its tag fails", "check-departments.ts", (d) => rmSync(dept(d, "finance")), /has no department.json/);
{
  const dir = join(tmp, `k${++n}`);
  cpSync(tandem, dir, { recursive: true });
  edit(used(dir), (w: WhereUsed) => { w.facts[0].children = w.facts[0].children.filter((c) => c.status === "frozen"); });
  edit(join(dir, "products/shop-app.json"), (p: Product) => { p.name = "Tandem for shops"; });
  expect("a frozen child is history: a changed parent is not drift for it", run("check-where-used.ts", [dir]).status === 0);
}

// check-integrations and check-nouns read a whole repository: run them on a copy.
const repo = join(tmp, "repo");
cpSync(root, repo, { recursive: true, filter: (s) => !/\/(\.git|node_modules|\.naive|\.next|_pagefind|dist|\.dist-[^/]*)(\/|$)|\/site\/(generated|out)(\/|$)/.test(s) });
expect("check-integrations passes on the repository", run("check-integrations.ts", [], { EE_ROOT: repo }).status === 0);
edit(join(repo, "packages/naive/src/records/layers/interface/tooling/integrations.json"), (list: Integration[]) => { list.push({ id: "obsidian", name: "Obsidian", layer: "interface", role: "notes", interfaces: ["app"], reach: ["knowledge"], interface_kind: "custom", status: "in-use" }); });
{ const r = run("check-integrations.ts", [], { EE_ROOT: repo }); expect("a single-layer tool listed as an interface fails", r.status !== 0 && /reaches 1 layers/.test(r.stderr)); }
expect("check-nouns passes on the repository", run("check-nouns.ts", [], { EE_ROOT: repo }).status === 0);
writeFileSync(join(repo, "packages/naive/src/engine/README.md"), readFileSync(join(repo, "packages/naive/src/engine/README.md"), "utf8") + "\nEach sphere holds products.\n"); // a retired noun, on purpose
{ const r = run("check-nouns.ts", [], { EE_ROOT: repo }); expect("a retired noun in a checked file fails", r.status !== 0 && /retired noun "sphere"/.test(r.stderr)); }

// check-boundary reads a whole repository: Naive never names an app's module (EE-041, EE-118). The app
// folder and the import keyword are built from variables so this file does not name or import one itself.
const from = "fr" + "om";
expect("check-boundary passes on the repository", run("check-boundary.ts", [], { EE_ROOT: repo }).status === 0);
const appFolder = "plat" + "form";
for (const [name, text, pattern] of ([
  ["an import of an app module fails", (app) => `import { connect } ${from} "../../${app}/connectors/github.mjs";\nexport default connect;\n`, /never names an app's module/],
  ["spawning an app module by path fails", (app) => `spawnSync("node", [join(repo, "${app}/integrations/jev.mjs")]);\n`, /never names an app's module/],
  ["an import that leaves the repository fails", () => `import x ${from} "../../../../../../elsewhere/x.mjs";\nexport default x;\n`, /outside the repository/],
] as [string, (app: string) => string, RegExp][])) {
  writeFileSync(join(repo, "packages/naive/src/store/connectors/leak.mjs"), text(appFolder));
  const r = run("check-boundary.ts", [], { EE_ROOT: repo });
  expect(name, r.status !== 0 && pattern.test(r.stderr));
  rmSync(join(repo, "packages/naive/src/store/connectors/leak.mjs"));
}
writeFileSync(join(repo, "packages/naive/src/store/connectors/leak.mjs"), `// a comment may name ${appFolder}/connectors/github.mjs\nexport default 1;\n`);
expect("a comment that names an app module passes", run("check-boundary.ts", [], { EE_ROOT: repo }).status === 0);
rmSync(join(repo, "packages/naive/src/store/connectors/leak.mjs"));
edit(join(repo, "packages/naive/src/records/layers/knowledge/tooling/integrations.json"), (list: Integration[]) => { const g = must(list.find((t) => t.id === "github")); g.connector = { module: "packages/naive/src/store/connectors/filesystem.ts", writes: ["direct"] }; g.credentials = ["GITHUB_TOKEN"]; });
{ const r = run("check-boundary.ts", [], { EE_ROOT: repo }); expect("a Naive connector with credentials fails", r.status !== 0 && /needs no credentials/.test(r.stderr)); }

// check-data-model reads a whole repository too: each case breaks a fresh copy.
// Files git ignores (such as a synced bank stream's events) are left out, as a clone would leave them out.
const ignored = new Set((spawnSync("git", ["ls-files", "--others", "--ignored", "--exclude-standard", "--directory"], { cwd: root, encoding: "utf8" }).stdout ?? "").split("\n").filter(Boolean).map((p) => join(root, p).replace(/\/$/, "")));
const copy = (name: string) => { const d = join(tmp, name); cpSync(root, d, { recursive: true, filter: (s) => !ignored.has(s) && !/\/(\.git|\.claude|node_modules|\.naive|\.next|_pagefind)(\/|$)|\/site\/(generated|out)(\/|$)/.test(s) }); return d; };
expect("check-data-model passes on the repository", run("check-data-model.ts", [], { EE_ROOT: copy("dm0") }).status === 0);
for (const [name, change, pattern] of ([
  ["a JSON file with no record type fails", (d) => writeFileSync(join(d, "packages/naive/src/functions/strategy/stray.json"), "{}"), /functions\/strategy\/stray.json: no record type/],
  ["a schema no record type names fails", (d) => writeFileSync(recordsIn(d).schemaFile("stray"), "{}"), /a schema no record type names/],
  ["a skill no layer or package lists fails", (d) => { mkdirSync(join(d, "packages/naive/src/functions/service-delivery/skills/run-handoff"), { recursive: true }); writeFileSync(join(d, "packages/naive/src/functions/service-delivery/skills/run-handoff/SKILL.md"), "---\n---\n"); }, /no layer or package lists this skill/],
  ["a layer owning another layer's record fails", (d) => edit(join(d, "packages/naive/src/records/layers/purpose/layer.json"), (k: Layer) => { k.records.push("handoff"); }), /handoff: owned by both/],
  ["a layer reading an unknown record type fails", (d) => edit(join(d, "packages/naive/src/records/layers/operations/layer.json"), (k: Layer) => { k.reads.push("no-such-record"); }), /reads unknown record type no-such-record/],
  ["a JSON file beside, not under, an ignored glob fails", (d) => writeFileSync(join(d, "docs/design/preserved.json"), "{}"), /docs\/design\/preserved.json: no record type/],
  ["a file in an example venture with no kind fails", (d) => writeFileSync(join(d, "packages/naive/src/records/examples/software/ventures/relay/notes.txt"), "x"), /ventures\/relay\/notes.txt: no kind/],
  ["a json-lines record type that is not a log fails", (d) => edit(recordsIn(d).dataModelFile(), (m: DataModel) => { delete must(m.records.find((r) => r.id === "provenance")).kind; }), /provenance: kind record with form json-lines/],
  ["a log record type that is not json-lines fails", (d) => edit(recordsIn(d).dataModelFile(), (m: DataModel) => { must(m.records.find((r) => r.id === "venture")).kind = "log"; }), /venture: kind log with form json/],
  ["a files entry that disagrees with a record type's kind fails", (d) => edit(recordsIn(d).dataModelFile(), (m: DataModel) => { must(m.files).push({ path: "instance/**/provenance.jsonl", kind: "record", reason: "test" }); }), /provenance.jsonl: the data model gives it more than one kind/],
  ["a record type with an unknown function id fails", (d) => edit(recordsIn(d).dataModelFile(), (m: DataModel) => { (must(m.records.find((r) => r.id === "goal")) as { function?: unknown }).function = "marketing"; }), /goal: function marketing is not an id in packages\/naive\/src\/functions\/departments.json/],
  ["a record type that names no function fails", (d) => edit(recordsIn(d).dataModelFile(), (m: DataModel) => { delete (must(m.records.find((r) => r.id === "goal")) as { function?: unknown }).function; }), /goal: names no function/],
  ["a record type in another function's package folder fails", (d) => edit(recordsIn(d).dataModelFile(), (m: DataModel) => { must(m.records.find((r) => r.id === "goal")).function = "finance"; }), /goal: function finance, but its records sit in foundation\/, which strategy owns/],
  ["a method record type under another function's folder fails", (d) => edit(recordsIn(d).dataModelFile(), (m: DataModel) => { must(m.records.find((r) => r.id === "sdlc-catalog")).function = null; }), /sdlc-catalog: lives under packages\/naive\/src\/functions\/products\/, so its function is products/],
  ["a record type that disagrees with its owning package's function fails", (d) => edit(join(d, "packages/naive/library/packages/fund/package.json"), (p: PackageManifest) => { p.department = "strategy"; }), /fund-thesis: function finance, but package fund that owns it is strategy/],
  ["a record type with writer function and no function fails", (d) => edit(recordsIn(d).dataModelFile(), (m: DataModel) => { must(m.records.find((r) => r.id === "spend-register")).function = null; }), /spend-register: writer function needs a function/],
  ["a data model schema whose function list drifts from departments.json fails", (d) => edit(join(d, "packages/naive/src/functions/departments.json"), (c: DepartmentCatalog) => { must(c.departments.find((x) => x.id === "it")).id = "information-technology"; }), /function it is not an id in packages\/naive\/src\/functions\/departments.json/],
] as [string, Change, RegExp][])) {
  const d = copy(`dm${++n}`);
  change(d);
  const r = run("check-data-model.ts", [], { EE_ROOT: d });
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}
{
  const d = copy("dmglob");
  mkdirSync(join(d, "docs/design/preserved/someone-2026-11-04/deep"), { recursive: true });
  writeFileSync(join(d, "docs/design/preserved/someone-2026-11-04/deep/copy.json"), "{}");
  expect("a JSON file under an ignored glob passes", run("check-data-model.ts", [], { EE_ROOT: d }).status === 0);
}
{
  const d = copy("priv");
  edit(join(d, "packages/naive/library/packages/customers/package.json"), (p: PackageManifest) => { p.use_model = [{ step: "summarize", inputs: ["ada.note"] }]; });
  mkdirSync(join(d, "workspace/ventures/demo/customers"), { recursive: true });
  writeFileSync(join(d, "workspace/ventures/demo/customers/ada.json"), JSON.stringify({ id: "ada", private_fields: ["note"] }));
  const r = run("check-private.ts", [join(d, "workspace")], { EE_ROOT: d });
  expect("check-private catches a private field named in use_model", r.status !== 0 && /ada\.note is private/.test(r.stderr));
}

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log("all checker tests pass");
