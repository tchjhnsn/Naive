// Tests the routing rule (packages/naive/src/engine/route-task.ts) against the template's lead role templates,
// departments and delegation lists: each of rules 1 to 5, and that the four portfolios route every pair of functions.
//
//   node packages/naive/src/engine/route-task-test.ts
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { accountableLead, routeTask, type Context, type LeadTemplate } from "./route-task.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
const load = (p: string): unknown => JSON.parse(readFileSync(join(repo, p), "utf8"));
const rolesDir = "packages/naive/template/governance/roles";
const isLead = (r: unknown): r is LeadTemplate => !!r && typeof r === "object" && "id" in r && "portfolio" in r && Array.isArray(r.portfolio);
const leads = readdirSync(join(repo, rolesDir)).filter((f) => f.endsWith(".json")).map((f) => load(`${rolesDir}/${f}`)).filter(isLead);
const departments = load("packages/naive/src/functions/departments.json") as { departments: { id: string }[] };
const delegation = load("packages/naive/template/governance/delegation.json") as { one_way_doors: string[]; never_redelegated: string[] };
const functions = departments.departments.map((d) => d.id);

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };

const ctx: Context = {
  leads, functions, one_way_doors: delegation.one_way_doors, never_redelegated: delegation.never_redelegated,
  measures: [{ id: "paying-teams", kind: "revenue", primary: true }, { id: "weekly-users", kind: "usage_or_adoption" }, { id: "runway", kind: "cost_or_time_saved" }, { id: "lessons", kind: "learning" }],
  plans: [{ lead: "finance-lead", measures: ["paying-teams"] }],
};

expect("the template has four leads", leads.map((l) => l.id).sort().join() === "finance-lead,growth-lead,product-lead,strategy-lead", leads.map((l) => l.id));

const none = routeTask({ functions: [] }, ctx);
expect("rule 1: a task with no function goes to a person", none.to === "person" && none.rule === 1, none);
const odd = routeTask({ functions: ["sales"] }, ctx);
expect("rule 1: a function the venture does not know goes to a person", odd.to === "person" && odd.rule === 1, odd);

const door = routeTask({ functions: ["products"], classes: ["production-ship"] }, ctx);
expect("rule 2: a one-way door goes to a person, even for one function", door.to === "person" && door.rule === 2, door);
const money = routeTask({ functions: ["finance", "marketing-and-sales"], classes: ["spend-money"], measure: "paying-teams" }, ctx);
expect("rule 2: a never-redelegated class goes to a person before any lead", money.to === "person" && money.rule === 2, money);

const one = routeTask({ functions: ["finance"] }, ctx);
expect("rule 3: one function goes straight to its function agent", one.to === "function-agent" && one.role === "finance-agent" && one.rule === 3, one);
const twice = routeTask({ functions: ["it", "it"] }, ctx);
expect("rule 3: a function named twice is still one function", twice.role === "it-agent", twice);

const product = routeTask({ functions: ["products", "it"] }, ctx);
expect("rule 4: functions in one portfolio go to that lead", product.to === "lead" && product.role === "product-lead" && product.rule === 4, product);
const hire = routeTask({ functions: ["human-capital", "strategy"] }, ctx);
expect("rule 4: human-capital and strategy go to strategy-lead (default 2)", hire.role === "strategy-lead", hire);

const bound = routeTask({ functions: ["human-capital", "finance", "products"], measure: "paying-teams" }, ctx);
expect("rule 5: across portfolios, the lead whose plan binds the measure", bound.to === "lead" && bound.role === "finance-lead" && bound.rule === 5, bound);
const byKind = routeTask({ functions: ["marketing-and-sales", "finance"], measure: "lessons" }, ctx);
expect("rule 5: with no plan binding it, the one lead whose default kinds hold the measure's kind", byKind.role === "strategy-lead", byKind);
const shared = routeTask({ functions: ["marketing-and-sales", "finance"], measure: "weekly-users" }, ctx);
expect("rule 5: a kind two leads share by default goes to a person", shared.to === "person" && shared.rule === 5 && /growth-lead, product-lead/.test(shared.why), shared);
const noMeasure = routeTask({ functions: ["marketing-and-sales", "finance"] }, ctx);
expect("rule 5: across portfolios with no measure goes to a person (default 6)", noMeasure.to === "person" && noMeasure.rule === 5, noMeasure);
const twoPlans = accountableLead("paying-teams", { ...ctx, plans: [{ lead: "finance-lead", measures: ["paying-teams"] }, { lead: "growth-lead", measures: ["paying-teams"] }] });
expect("rule 5: a measure two plans bind has no accountable lead (default 1)", twoPlans.lead === null, twoPlans);
const unknownMeasure = routeTask({ functions: ["marketing-and-sales", "finance"], measure: "nope" }, ctx);
expect("rule 5: a measure that is not in the telos and no plan binds goes to a person", unknownMeasure.to === "person", unknownMeasure);

// Every pair of functions routes somewhere deterministic: to the one lead holding both, or on to rule 5.
let pairs = 0, toLead = 0;
for (const a of functions) for (const b of functions) if (a < b) {
  pairs++;
  const r = routeTask({ functions: [a, b] }, ctx);
  const same = leads.find((l) => l.portfolio.includes(a))?.id === leads.find((l) => l.portfolio.includes(b))?.id;
  if (same ? r.rule !== 4 : r.rule !== 5) expect(`pair ${a} + ${b} routes by rule ${same ? 4 : 5}`, false, r);
  if (r.to === "lead") toLead++;
}
expect(`all ${pairs} pairs of functions route by rule 4 or 5 (${toLead} to a lead)`, pairs === 78 && toLead > 0);

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("route-task: all pass");
