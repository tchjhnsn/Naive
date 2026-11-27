// Breaks check-functions.ts on copies of the repository: each rule fails when its file is wrong, and the real
// repository passes without --complete.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repo = new URL("../../../..", import.meta.url).pathname;
const check = join(repo, "packages/naive/src/checks/check-functions.ts");
let failed = 0;
const expect = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail.slice(0, 800)}`}`); if (!ok) failed++; };
const run = (root: string, ...a: string[]) => spawnSync("node", [check, "--root", root, ...a], { encoding: "utf8" });

const real = run(repo);
expect("the repository's function modules pass", real.status === 0, real.stdout + real.stderr);

const copy = (): string => {
  const d = mkdtempSync(join(tmpdir(), "check-functions-"));
  for (const p of ["packages/naive/src/functions", "packages/naive/src/records", "packages/naive/template/governance", "packages/naive/src/engine/need-now.json"]) cpSync(join(repo, p), join(d, p), { recursive: true });
  return d;
};
type Row = { class: string, level: string, approver?: string, examples: string[] };
type Step = { id?: string, reads?: string[], writes?: string[], raises?: string[], skill?: string, activity?: string, consider?: { why?: string, when?: string } };
type Trigger = { kind: string, cadence?: string, route?: string };
type Doc = { rows: Row[], steps: Step[], reads?: string[], intake?: string, clusters?: string[], grants: { id: string }[], measures?: string[], trigger?: Trigger };
const edit = (root: string, rel: string, f: (j: Doc) => void) => { const p = join(root, rel); const j = JSON.parse(readFileSync(p, "utf8")) as Doc; f(j); writeFileSync(p, JSON.stringify(j, null, 2) + "\n"); };
const editText = (root: string, rel: string, f: (t: string) => string) => { const p = join(root, rel); writeFileSync(p, f(readFileSync(p, "utf8"))); };
const CATALOG_ACTIVITY = (JSON.parse(readFileSync(join(repo, "packages/naive/src/functions/activities.json"), "utf8")) as { activities: { id: string, process_group: string }[] }).activities.find((x) => x.process_group.startsWith("3."))?.id ?? "";
const FIN = "packages/naive/src/functions/finance";
const cases: [string, (d: string) => void, RegExp][] = [
  ["a one-way door that is not escalate fails", (d) => edit(d, `${FIN}/decisions.json`, (j) => { const row = j.rows.find((r) => r.class === "ownership-or-control"); if (row) row.level = "decide"; }), /ownership-or-control is a one-way door or never redelegated/],
  ["a class decision-rights does not have fails", (d) => edit(d, `${FIN}/decisions.json`, (j) => { j.rows.push({ class: "made-up", level: "decide", examples: ["x"] }); }), /made-up is not in decision-rights/],
  ["a workflow that reads a route the router does not serve fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.reads = [...(j.reads ?? []), "knowledge/sources"]; }), /reads knowledge\/sources, which no route serves/],
  ["a step that reads a route the router does not serve fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].reads = ["finance/nowhere"]; }), /step \S+ reads finance\/nowhere, which no route serves/],
  ["a step that writes outside the function's reach fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].writes = ["foundation/problem"]; }), /outside the function's write reach/],
  ["a step that writes the team plan fails, whoever owns its record type", (d) => edit(d, "packages/naive/src/functions/human-capital/workflows/intake.json", (j) => { j.steps[0].writes = ["people/team-plan"]; }), /writes people\/team-plan, outside the function's write reach/],
  ["a step that raises a class with no row fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].raises = ["production-ship"]; }), /raises production-ship, which decisions.json has no row for/],
  ["a workflow whose every step is one to consider fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { for (const s of j.steps) s.consider = { why: "It may help." }; }), /every step is one to consider/],
  ["a step to consider that gives no reason fails the schema", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].consider = { when: "There is a price." }; }), /consider/],
  ["a required intake step that writes a record type need-now suggests only later fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { delete j.steps[2].consider; }), /intake step ask-spend is required but writes finance\/spend\/\[id\], whose record type spend-register need-now suggests from Beachhead/],
  ["a required intake step that writes master data need-now never suggests fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { delete j.steps[1].consider; }), /intake step ask-accounts is required but writes money\/\[id\], whose record type money-account need-now suggests only when a person asks/],
  ["an intake step to consider whose when does not name the phase its record type starts in fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[2].consider = { why: "Costs renew.", when: "The venture pays for a tool." }; }), /writes finance\/spend\/\[id\], which starts in Beachhead, but its consider\.when does not name Beachhead/],
  ["the strategy intake asking for the legacy telos record as a required step fails", (d) => edit(d, "packages/naive/src/functions/strategy/workflows/intake.json", (j) => { const step = j.steps.find((s) => s.id === "ask-telos"); if (step) step.writes = ["foundation/telos"]; }), /intake step ask-telos is required but writes foundation\/telos, whose record type telos need-now suggests from Validation/],
  ["a step whose activity APQC does not have fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].activity = "9.1.1.99"; }), /performs activity 9\.1\.1\.99, which is not a level 4 activity in pcf\.json/],
  ["a step whose activity is an APQC process, not an activity, fails the schema", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].activity = "9.1.1"; }), /activity/],
  ["a step whose APQC activity is under another function's category fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].activity = "3.5.1.6"; }), /performs activity 3\.5\.1\.6, which is under APQC category 3\.0, not the function's 9\.0/],
  ["a step whose activity the catalog does not have fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].activity = "no-such-activity"; }), /performs activity no-such-activity, which is not an activity in activities\.json/],
  ["a step whose catalog activity is under another function's category fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].activity = CATALOG_ACTIVITY; }), /which is under APQC category 3\.0, not the function's 9\.0/],
  ["a step that loads a missing skill fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.steps[0].skill = "no-such-skill"; }), /skills\/ does not have/],
  ["an intake that is not a workflow fails", (d) => edit(d, `${FIN}/function.json`, (j) => { j.intake = "missing"; }), /intake missing is not a workflow/],
  ["an unknown capability cluster fails", (d) => edit(d, `${FIN}/function.json`, (j) => { j.clusters = ["vendor-x"]; }), /cluster vendor-x is not in capability-clusters/],
  ["an approver who holds no grant of the class fails", (d) => edit(d, "packages/naive/src/functions/it/decisions.json", (j) => { const row = j.rows.find((r) => r.class === "new-dependency-free"); if (row) row.approver = "product-lead"; }), /class new-dependency-free names approver product-lead, who holds no live grant of new-dependency-free reaching founder/],
  ["an approver whose grants miss a folder of the function's records fails", (d) => edit(d, "packages/naive/template/governance/delegation.json", (j) => { j.grants = j.grants.filter((g) => g.id !== "chief-of-staff-to-finance-lead-priorities-fund"); }), /class set-priorities names approver finance-lead, whose grants of set-priorities do not cover fund, where the function's records sit/],
  ["an agent.md that names another role fails", (d) => writeFileSync(join(d, `${FIN}/agent.md`), "---\nrole: strategy-agent\nfunction: finance\n---\n"), /does not name role: finance-agent/],
  // EE-215: goals, measures, the reach in prose, and the sections an agent reads.
  ["a workflow measure the function does not list fails", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { j.measures = ["learning"]; }), /moves measure kind learning, which function\.json does not list for finance/],
  ["a workflow with no goal fails the schema", (d) => editText(d, `${FIN}/workflows/intake.json`, (t) => t.replace(/^ {2}"goal":.*\n/m, "")), /goal/],
  ["a schedule with no cadence fails the schema", (d) => edit(d, `${FIN}/workflows/monthly-spend-review.json`, (j) => { delete j.trigger?.cadence; }), /cadence|trigger/],
  ["a cadence on an intake trigger fails the schema", (d) => edit(d, `${FIN}/workflows/intake.json`, (j) => { if (j.trigger) j.trigger.cadence = "weekly"; }), /cadence|trigger/],
  ["an event trigger with no route fails the schema", (d) => edit(d, "packages/naive/src/functions/customer-service/workflows/case-triage.json", (j) => { delete j.trigger?.route; }), /route|trigger/],
  ["an event trigger watching a route no route serves fails", (d) => edit(d, "packages/naive/src/functions/customer-service/workflows/case-triage.json", (j) => { if (j.trigger) j.trigger.route = "support/nowhere"; }), /event trigger watches support\/nowhere, which no route serves/],
  ["a step that writes a route the router serves without a write action fails", (d) => edit(d, "packages/naive/src/functions/products/workflows/intake.json", (j) => { j.steps[0].writes = ["product/anatomy-answers"]; }), /writes product\/anatomy-answers, which the router serves without a write action/],
  ["a recommend row whose approver is not in the function's line fails", (d) => edit(d, `${FIN}/decisions.json`, (j) => { const row = j.rows.find((r) => r.class === "set-priorities"); if (row) row.approver = "no-such-role"; }), /recommends to no-such-role, who is not in this function's line/],
  ["an agent.md with no \"When you do not know\" section fails", (d) => editText(d, `${FIN}/agent.md`, (t) => t.replace("## When you do not know", "## Notes")), /has no "## When you do not know" section/],
  ["an agent.md whose sections are out of order fails", (d) => editText(d, `${FIN}/agent.md`, (t) => t.replace("## What you work toward", "## Skills").replace(/## Skills\n\nLoad a skill/, "## What you work toward\n\nLoad a skill")), /sections are out of order/],
  ["an agent.md whose Writes line claims a route outside the reach fails", (d) => editText(d, `${FIN}/agent.md`, (t) => t.replace("Writes: ", "Writes: the team plan (`people/team-plan`), ")), /Writes line claims people\/team-plan, which is outside the function's write reach/],
  ["an agent.md whose Writes line leaves out a route fails", (d) => editText(d, `${FIN}/agent.md`, (t) => t.replace("exits (`governance/exit`) and", "exits and")), /Writes line leaves out governance\/exit/],
  ["an agent.md with no Writes line fails", (d) => editText(d, `${FIN}/agent.md`, (t) => t.replace("\nWrites: ", "\nIt writes ")), /has no "Writes: " line/],
  ["an agent.md that never names a skill the module ships fails", (d) => editText(d, `${FIN}/agent.md`, (t) => t.replace(", `exit-planning`", "")), /never names skill exit-planning, which the module ships/],
  ["an agent.md naming a lead whose portfolio does not hold the function fails", (d) => editText(d, `${FIN}/agent.md`, (t) => t.replace("lead: finance-lead", "lead: growth-lead")), /names lead growth-lead, but finance-lead is the lead whose portfolio holds finance/],
];
for (const [name, breakIt, want] of cases) {
  const d = copy();
  try { breakIt(d); const r = run(d); expect(name, r.status === 1 && want.test(r.stdout), r.stdout + r.stderr); }
  finally { rmSync(d, { recursive: true, force: true }); }
}
const complete = run(repo, "--complete");
expect("every one of the 13 modules is complete", complete.status === 0 && /13 checked, every one complete/.test(complete.stdout), complete.stdout);
{
  const d = copy();
  try { rmSync(join(d, `${FIN}/agent.md`)); const r = run(d, "--complete"); expect("--complete names a missing piece", r.status === 1 && /finance\/agent.md: missing/.test(r.stdout), r.stdout); }
  finally { rmSync(d, { recursive: true, force: true }); }
}

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("function modules check: all passed");
