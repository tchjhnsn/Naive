// Tests the function and lead agent specs (moved here from everything-ecosystem platform/agents/): one function agent
// per departments.json id with its module's instructions, workflows and matrix; write reach that covers what its
// workflows write and never the team plan; four leads whose portfolios cover the 13 functions once; and the routing
// answer for one function, one portfolio, across portfolios and a one-way door. No model and no venture is needed.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { routeGlob } from "../access.ts";
import { functionAgent, functionIds, reachesTeamPlan, teamPlanEntry } from "./function-spec.ts";
import { beyondLead, leadAgent, leadIds, leadTeamPlanEntry, routeFor } from "./lead-spec.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const ids = functionIds();
expect("one function agent per departments.json id, 13 in all", ids.length === 13, ids);
for (const id of ids) {
  const s = functionAgent(id);
  expect(`${id}: role ${id}-agent with its module's agent.md, intake and decision matrix`, s.role === `${id}-agent` && !!s.instructions && !!s.intake && s.workflows.includes(s.intake ?? "") && !!s.decisions, s);
  expect(`${id}: writes decisions, handoffs and at least one record route of its own, never the team plan`, s.writes[0] === "decisions/*" && s.writes[1] === "operations/handoff/*" && s.writes.length > 2 && !reachesTeamPlan(s.writes), s.writes);
  const outside: string[] = [];
  for (const w of s.workflows) {
    const wf = JSON.parse(readFileSync(join(s.module, "workflows", `${w}.json`), "utf8")) as { steps: { writes?: string[] }[] };
    for (const r of wf.steps.flatMap((x) => x.writes ?? [])) {
      const concrete = r.replace(/\[id\]/g, "x");
      if (!s.writes.some((g) => routeGlob(g).test(concrete))) outside.push(`${w}: ${r}`);
    }
  }
  expect(`${id}: every route its workflows write is in its write reach`, outside.length === 0, outside);
  const entry = teamPlanEntry(s, "discovery");
  expect(`${id}: the team-plan entry a person adds staffs the agent with exactly that reach`, entry.id === s.role && entry.occupant === "agent" && entry.routes.write.join() === s.writes.join(), entry);
}
let unknown = false;
try { functionAgent("legal"); } catch (e) { unknown = /no function legal/.test(String(e)); }
expect("an id departments.json does not list is refused, naming the valid ids", unknown);

const leads = leadIds();
expect("four leads", leads.length === 4, leads);
const covered = leads.flatMap((l) => leadAgent(l).portfolio);
expect("the lead portfolios cover the 13 functions once each", covered.length === 13 && new Set(covered).size === 13 && ids.every((f) => covered.includes(f)), covered);
for (const l of leads) {
  const s = leadAgent(l);
  expect(`${l}: writes only its plan, decisions and handoffs`, beyondLead(l, s.writes).length === 0 && !reachesTeamPlan(s.writes), s.writes);
  expect(`${l}: its team-plan entry carries the same reach`, leadTeamPlanEntry(s, "discovery").routes.write.join() === s.writes.join());
}

const one = routeFor({ functions: ["finance"] }, null);
expect("one function goes to that function's agent", one.to === "function-agent" && one.role === "finance-agent" && one.tool === "agent_finance", one);
const portfolio = routeFor({ functions: ["marketing-and-sales", "customer-service"] }, null);
expect("functions in one portfolio go to its lead", portfolio.to === "lead" && portfolio.role === "growth-lead", portfolio);
const door = routeFor({ functions: ["finance"], classes: ["ownership-or-control"] }, null);
expect("a one-way door goes to a person, with no tool", door.to === "person" && door.tool === null, door);

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("agent specs: all passed");
