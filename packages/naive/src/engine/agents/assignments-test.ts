// Tests what a venture's activity assignments mean for a function agent (EE-173): the rule for each assignment, the
// function's assigned activities, a workflow step marked when its activity is assigned, and the brief and the prompt
// of a function agent in a venture that has assigned an activity. It also tests the defaults by kind (EE-179): an
// unassigned activity whose kind a person performs has an entry marked default. No model is needed.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSync } from "../../core/effect/run.ts";
import { readCatalog, readGroups, readPcf } from "../activity-proposals.ts";
import { assignedActivities, assignedSteps, assignmentOf, ruleFor } from "./assignments.ts";
import type { AssignedActivity } from "./assignments.ts";
import { agentBrief } from "./brief.ts";
import { agentPrompt } from "./run.ts";
import type { ActivityCatalog } from "../../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const catalog = runSync(readCatalog()), groups = runSync(readGroups()), pcf = runSync(readPcf());
const [first, second, third] = catalog.activities;
const fn = groups.get(first.process_group) ?? "";
const record = { activities: { [first.id]: { performer: "person" }, [second.id]: { performer: "agent", approval: "person" }, "not-in-the-catalog": { performer: "agent" }, [third.id]: { performer: "robot" } } };

expect("a person performs: the rule tells the agent not to perform it", /^A person performs this activity\. Do not perform it/.test(ruleFor({ performer: "person" })), ruleFor({ performer: "person" }));
expect("an agent performs and a person approves: both sentences", /You perform this activity/.test(ruleFor({ performer: "agent", approval: "person" })) && /raise the result as a decision/.test(ruleFor({ performer: "agent", approval: "person" })));
expect("approval none says no approval is needed", ruleFor({ approval: "none" }) === "No approval is needed before it is done.");
expect("an assignment with a value outside the schema is dropped", assignmentOf(record, third.id) === null && assignmentOf(record, "missing") === null && assignmentOf(null, first.id) === null);

const own = (xs: readonly AssignedActivity[] | undefined) => (xs ?? []).filter((a) => a.source === "assigned");
const assigned = assignedActivities(catalog, groups, fn, record);
expect("the function's assigned activities, in the catalog's order, with statement and rule", assigned.map((a) => a.id).join() === [first.id, second.id].join() && assigned[0].statement === first.statement && assigned[0].performer === "person" && assigned[1].approval === "person" && assigned.every((a) => a.source === "assigned" && a.rule === ruleFor(a)), assigned);
expect("another function has none of them", own(assignedActivities(catalog, groups, fn === "finance" ? "strategy" : "finance", record)).length === 0);
const elsewhere: ActivityCatalog = { ...catalog, activities: [{ ...first, process_group: "0.0" }] };
expect("an activity under no function's process group is not assigned to it", assignedActivities(elsewhere, groups, fn, record).length === 0);

const apqcRecord = { activities: { ...record.activities, "3.5.1.6": { approval: "person" }, "3.5.1.2": { performer: "person" }, "99.9.9.9": { performer: "agent" }, "1.1.1.1": { performer: "agent" } } };
const all = assignedActivities(catalog, groups, "marketing-and-sales", apqcRecord, pcf);
const withApqc = all.filter((a) => a.source === "assigned");
const name = (id: string) => pcf.elements.find((e) => e.id === id)?.name;
expect("APQC level 4 activities under the function come first, in the framework's order, with APQC's name", withApqc.slice(0, 2).map((a) => `${a.id} ${a.from} ${a.process_group} ${a.process}`).join("; ") === "3.5.1.2 pcf 3.5 3.5.1; 3.5.1.6 pcf 3.5 3.5.1" && withApqc[0].statement === name("3.5.1.2") && withApqc[1].approval === "person", withApqc.slice(0, 2));
expect("the catalog's activities follow, marked as the catalog's", withApqc.slice(2).every((a) => a.from === "catalog") && withApqc.length === 2 + assigned.length, withApqc.map((a) => a.id));
expect("an APQC activity of another category, or one APQC lacks, is not this function's", !withApqc.some((a) => a.id === "1.1.1.1" || a.id === "99.9.9.9") && own(assignedActivities(catalog, groups, "strategy", apqcRecord, pcf)).map((a) => a.id).join() === "1.1.1.1");
expect("with no framework given, only the catalog's are found", assignedActivities(catalog, groups, "marketing-and-sales", apqcRecord).every((a) => a.from === "catalog"));

const defaults = all.filter((a) => a.source === "default");
const customers = defaults.find((a) => a.id === "3.5.2.4");
expect("an unassigned activity whose kind a person performs is a default, with its kind and rule", customers?.kind === "relationship" && customers.performer === "person" && customers.statement === name("3.5.2.4") && customers.rule === ruleFor({ performer: "person" }, "relationship") && /default for a relationship/.test(customers.rule), defaults.map((a) => `${a.id} ${a.kind}`));
expect("defaults and assignments keep the framework's order together", all.filter((a) => a.from === "pcf").map((a) => a.id).join() === pcf.elements.filter((e) => all.some((a) => a.from === "pcf" && a.id === e.id)).map((e) => e.id).join());
expect("an activity of no kind has no entry", !all.some((a) => a.id === "3.5.1.1"), all.map((a) => a.id));
const overridden = assignedActivities(catalog, groups, "marketing-and-sales", { activities: { "3.5.2.4": { performer: "agent", approval: "person" } } }, pcf).find((a) => a.id === "3.5.2.4");
expect("the venture's own assignment replaces a default", overridden?.source === "assigned" && overridden.performer === "agent" && overridden.kind === undefined && !/default/.test(overridden.rule), overridden);
expect("a catalog without kinds gives no default", assignedActivities({ ...catalog, kinds: [] }, groups, "marketing-and-sales", null, pcf).length === 0);
const byDefault = assignedSteps({ id: "d", steps: [{ id: "a", activity: "3.5.2.4" }, { id: "b", activity: "3.5.1.6" }] }, null, all) as { steps: { assignment?: { performer?: string, source?: string, kind?: string, rule: string } }[] };
expect("a step whose activity has a default carries it, marked default", byDefault.steps[0].assignment?.source === "default" && byDefault.steps[0].assignment.kind === "relationship" && byDefault.steps[0].assignment.performer === "person", byDefault.steps);
const stepOverride = assignedSteps({ id: "d", steps: [{ id: "a", activity: "3.5.2.4" }] }, { activities: { "3.5.2.4": { performer: "agent" } } }, all) as { steps: { assignment?: { performer?: string, source?: string } }[] };
expect("a step's own assignment replaces its default", stepOverride.steps[0].assignment?.source === "assigned" && stepOverride.steps[0].assignment.performer === "agent", stepOverride.steps);

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
  expect("a venture with no assignments: the brief has the defaults only, and says to follow them", !(none instanceof Error) && own(none.assignments).length === 0 && none.assignments?.length === assignedActivities(catalog, groups, fn, null, pcf).length && (none.assignments.length === 0) === !/have a rule/.test(none.how), none instanceof Error ? none.message : none.assignments);
  mkdirSync(join(dir, "operations"), { recursive: true });
  writeFileSync(join(dir, "operations", "activity-assignments.json"), JSON.stringify(record));
  const b = agentBrief(`${fn}-agent`, dir);
  if (b instanceof Error) throw b;
  expect("the brief carries the function's assigned activities and says to follow them", own(b.assignments).map((a) => a.id).join() === [first.id, second.id].join() && /Some of your activities have a rule/.test(b.how), b.assignments);
  const other = agentBrief(`${fn === "finance" ? "strategy" : "finance"}-agent`, dir);
  expect("another function's brief carries none of them", !(other instanceof Error) && own(other.assignments).length === 0);
  const noVenture = agentBrief(`${fn}-agent`, null);
  expect("a brief with no venture has no assignments field", !(noVenture instanceof Error) && noVenture.assignments === undefined);
  writeFileSync(join(dir, "operations", "activity-assignments.json"), JSON.stringify(apqcRecord));
  const m = agentBrief("marketing-and-sales-agent", dir);
  if (m instanceof Error) throw m;
  const review = m.workflows?.find((w) => w.id === "weekly-pipeline-review")?.content as { steps: { id: string, activity?: string, assignment?: { approval?: string, rule: string } }[] } | undefined;
  const step = review?.steps.find((s) => s.activity === "3.5.1.6");
  expect("a shipped workflow step that names an assigned APQC activity carries the assignment", step?.assignment?.approval === "person" && step.assignment.rule === ruleFor({ approval: "person" }) && review?.steps.filter((s) => s.assignment).length === 1, review?.steps);
  expect("the brief lists the assigned APQC activities", m.assignments?.some((a) => a.id === "3.5.1.6" && a.from === "pcf") === true, m.assignments?.map((a) => a.id));
  const prompt = agentPrompt(b, "do the work", dir);
  expect("the prompt lists each assigned activity with its rule", prompt.includes("## Activity assignments") && prompt.includes(`- ${first.id} (assigned): ${first.statement} ${ruleFor({ performer: "person" })}`) && (!b.assignments?.some((a) => a.source === "default") || prompt.includes("(default): ")), prompt.slice(0, 400));
  expect("a lead's brief has no assignments", (() => { const l = agentBrief("finance-lead", dir); return !(l instanceof Error) && l.assignments === undefined; })());
} finally { rmSync(dir, { recursive: true, force: true }); }

console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
