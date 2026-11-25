// Tests what a venture's activity assignments mean for a function agent (EE-173): the rule for each assignment, the
// function's assigned activities, a workflow step marked when its activity is assigned, and the brief and the prompt
// of a function agent in a venture that has assigned an activity. No model is needed.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSync } from "../../core/effect/run.ts";
import { readCatalog, readGroups } from "../activity-proposals.ts";
import { assignedActivities, assignedSteps, assignmentOf, ruleFor } from "./assignments.ts";
import { agentBrief } from "./brief.ts";
import { agentPrompt } from "./run.ts";
import type { ActivityCatalog } from "../../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const catalog = runSync(readCatalog()), groups = runSync(readGroups());
const [first, second, third] = catalog.activities;
const fn = groups.get(first.process_group) ?? "";
const record = { activities: { [first.id]: { performer: "person" }, [second.id]: { performer: "agent", approval: "person" }, "not-in-the-catalog": { performer: "agent" }, [third.id]: { performer: "robot" } } };

expect("a person performs: the rule tells the agent not to perform it", /^A person performs this activity\. Do not perform it/.test(ruleFor({ performer: "person" })), ruleFor({ performer: "person" }));
expect("an agent performs and a person approves: both sentences", /You perform this activity/.test(ruleFor({ performer: "agent", approval: "person" })) && /raise the result as a decision/.test(ruleFor({ performer: "agent", approval: "person" })));
expect("approval none says no approval is needed", ruleFor({ approval: "none" }) === "No approval is needed before it is done.");
expect("an assignment with a value outside the schema is dropped", assignmentOf(record, third.id) === null && assignmentOf(record, "missing") === null && assignmentOf(null, first.id) === null);

const assigned = assignedActivities(catalog, groups, fn, record);
expect("the function's assigned activities, in the catalog's order, with statement and rule", assigned.map((a) => a.id).join() === [first.id, second.id].join() && assigned[0].statement === first.statement && assigned[0].performer === "person" && assigned[1].approval === "person" && assigned.every((a) => a.rule === ruleFor(a)), assigned);
expect("another function has none of them", assignedActivities(catalog, groups, fn === "finance" ? "strategy" : "finance", record).length === 0);
const elsewhere: ActivityCatalog = { ...catalog, activities: [{ ...first, process_group: "0.0" }] };
expect("an activity under no function's process group is not assigned to it", assignedActivities(elsewhere, groups, fn, record).length === 0);

const workflow = { id: "w", steps: [{ id: "a", do: "x", activity: first.id }, { id: "b", do: "y", activity: "3.5.1.6" }, { id: "c", do: "z" }] };
const marked = assignedSteps(workflow, record) as { id: string, steps: { id: string, assignment?: { performer?: string, rule: string } }[] };
expect("a step that names an assigned activity carries the assignment and its rule", marked.steps[0].assignment?.performer === "person" && marked.steps[0].assignment.rule === ruleFor({ performer: "person" }), marked.steps[0]);
expect("a step with an unassigned activity or none is unchanged", !("assignment" in marked.steps[1]) && !("assignment" in marked.steps[2]) && marked.id === "w", marked);
expect("the workflow passed in is not changed", !("assignment" in workflow.steps[0]));
expect("a workflow without steps is returned as it is", assignedSteps({ id: "w" }, record) !== null && assignedSteps(null, record) === null);

const dir = mkdtempSync(join(tmpdir(), "naive-assignments-"));
try {
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t", name: "T", phase: "discovery", departments: [fn] }));
  const none = agentBrief(`${fn}-agent`, dir);
  expect("a venture with no assignments: the brief has an empty list and the usual how", !(none instanceof Error) && none.assignments?.length === 0 && !/assigned some of your activities/.test(none.how), none instanceof Error ? none.message : none.assignments);
  mkdirSync(join(dir, "operations"), { recursive: true });
  writeFileSync(join(dir, "operations", "activity-assignments.json"), JSON.stringify(record));
  const b = agentBrief(`${fn}-agent`, dir);
  if (b instanceof Error) throw b;
  expect("the brief carries the function's assigned activities and says to follow them", b.assignments?.map((a) => a.id).join() === [first.id, second.id].join() && /assigned some of your activities/.test(b.how), b.assignments);
  const other = agentBrief(`${fn === "finance" ? "strategy" : "finance"}-agent`, dir);
  expect("another function's brief carries none", !(other instanceof Error) && other.assignments?.length === 0);
  const noVenture = agentBrief(`${fn}-agent`, null);
  expect("a brief with no venture has no assignments field", !(noVenture instanceof Error) && noVenture.assignments === undefined);
  const prompt = agentPrompt(b, "do the work", dir);
  expect("the prompt lists each assigned activity with its rule", prompt.includes("## Activity assignments") && prompt.includes(`- ${first.id}: ${first.statement} ${ruleFor({ performer: "person" })}`), prompt.slice(0, 400));
  expect("a lead's brief has no assignments", (() => { const l = agentBrief("finance-lead", dir); return !(l instanceof Error) && l.assignments === undefined; })());
} finally { rmSync(dir, { recursive: true, force: true }); }

console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
