// Tests for the schema's checkers: each runs once on the real records (it must pass) and
// once per broken copy (it must fail, naming the rule). Copies live in a temp folder.
//
//   node schema/test.mjs

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const handoff = (dir, id) => join(dir, "execution/handoffs", `${id}.json`);

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
  edit(join(d, "execution/handoffs", e), (x) => { x.results.forEach((r) => { if (r.kind === "review") r.by = "builder"; }); });
}, /must be passed by architect/);
broken("escalated with no open question fails", "check-execution.mjs", (d) => edit(handoff(d, "methodology-site-refresh"), (h) => { h.escalations.forEach((e) => { e.answer = "yes"; }); }), /escalated with no open question/);
broken("attempts used up while in progress fail", "check-execution.mjs", (d) => edit(handoff(d, "methodology-site-refresh"), (h) => { h.status = "in-progress"; h.attempts = 3; }), /attempts used up/);
broken("evidence whose passed flag lies fails", "check-execution.mjs", (d) => {
  const e = JSON.parse(readFileSync(handoff(d, "methodology-site-refresh"), "utf8")).evidence[0];
  edit(join(d, "execution/handoffs", e), (x) => { x.passed = true; });
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
const briefOf = (d) => join(d, "execution/handoffs/anatomy-runner-fixes.md");
draft("check-ready passes on a complete draft", () => {});
draft("a brief with no Outcome is not ready", (d) => writeFileSync(briefOf(d), readFileSync(briefOf(d), "utf8").replace(/## Outcome/, "## Background")), /FAIL  brief has its Outcome section/);
draft("a brief with a TBD is not ready", (d) => writeFileSync(briefOf(d), readFileSync(briefOf(d), "utf8") + "\nStep 4: TBD\n"), /FAIL  brief has no placeholders left: TBD/);
draft("an unknown product is not ready", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { h.products = ["nope"]; }), /FAIL  every product it serves exists: nope/);
draft("an unknown decision is not ready", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { h.governed_by = ["EE-999"]; }), /FAIL  every governing decision exists.*EE-999/);
draft("no assignment named is not ready", (d) => edit(handoff(d, "anatomy-runner-fixes"), (h) => { delete h.assignment; }), /FAIL  names the methodology assignment/);
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
{
  const r = spawnSync("node", [join(root, "operations/skills/methodology-selection/derive-answers.mjs"), tandem, "--json"], { encoding: "utf8" });
  const out = JSON.parse(r.stdout);
  expect("MAD reads who decides from the board instead of asking", out.derived["governance.who_decides"]?.answer === "board_or_committee");
  expect("MAD reads its success measure from the telos", out.derived["governance.success_measure"]?.answer === "usage_or_adoption");
}

// check-integrations and check-nouns read a whole repository: run them on a copy.
const repo = join(tmp, "repo");
cpSync(root, repo, { recursive: true, filter: (s) => !/\/(\.git|node_modules)(\/|$)/.test(s) });
expect("check-integrations passes on the repository", run("check-integrations.mjs", [], { EE_ROOT: repo }).status === 0);
edit(join(repo, "interface/tooling/integrations.json"), (list) => { list.push({ id: "obsidian", name: "Obsidian", layer: "interface", role: "notes", interfaces: ["app"], reach: ["knowledge"], interface_kind: "custom", status: "in-use" }); });
{ const r = run("check-integrations.mjs", [], { EE_ROOT: repo }); expect("a single-layer tool listed as an interface fails", r.status !== 0 && /reaches 1 layers/.test(r.stderr)); }
expect("check-nouns passes on the repository", run("check-nouns.mjs", [], { EE_ROOT: repo }).status === 0);
writeFileSync(join(repo, "schema/README.md"), readFileSync(join(repo, "schema/README.md"), "utf8") + "\nEach sphere holds products.\n"); // a retired noun, on purpose
{ const r = run("check-nouns.mjs", [], { EE_ROOT: repo }); expect("a retired noun in a checked file fails", r.status !== 0 && /retired noun "sphere"/.test(r.stderr)); }

// check-data-model reads a whole repository too: each case breaks a fresh copy.
const copy = (name) => { const d = join(tmp, name); cpSync(root, d, { recursive: true, filter: (s) => !/\/(\.git|node_modules)(\/|$)/.test(s) }); return d; };
expect("check-data-model passes on the repository", run("check-data-model.mjs", [], { EE_ROOT: copy("dm0") }).status === 0);
for (const [name, change, pattern] of [
  ["a JSON file with no record type fails", (d) => writeFileSync(join(d, "purpose/stray.json"), "{}"), /purpose\/stray.json: no record type/],
  ["a schema no record type names fails", (d) => writeFileSync(join(d, "schema/stray.schema.json"), "{}"), /a schema no record type names/],
  ["a skill no kit lists fails", (d) => { mkdirSync(join(d, "execution/skills/run-handoff"), { recursive: true }); writeFileSync(join(d, "execution/skills/run-handoff/SKILL.md"), "---\n---\n"); }, /no kit lists this skill/],
  ["a kit owning another layer's record fails", (d) => edit(join(d, "purpose/kit.json"), (k) => { k.records.push("handoff"); }), /handoff: owned by both/],
  ["a kit reading an unknown record type fails", (d) => edit(join(d, "operations/kit.json"), (k) => { k.reads.push("no-such-record"); }), /reads unknown record type no-such-record/],
]) {
  const d = copy(`dm${++n}`);
  change(d);
  const r = run("check-data-model.mjs", [], { EE_ROOT: d });
  expect(name, r.status !== 0 && pattern.test(r.stderr));
}

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} test(s) failed`); process.exit(1); }
console.log("all checker tests pass");
