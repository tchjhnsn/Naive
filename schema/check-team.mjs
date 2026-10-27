// Checks each venture's team plan (operations/team-plan.json) against the agent capability register
// (evidence/capabilities/agent-capabilities.json) and decision rights (EE-029). Rules:
//   roles: ids unique; a role not in the registry has a name; an agent occupies only a role the
//     registry gives to agents, or its own.
//   authority: each delegated class exists in the venture's decision rights; its owner is this
//     role; no agent holds an escalate class (those stay with a person).
//   human loops: every task cites a known capability. An agent's task that is cannot, not-allowed
//     or unknown names a human loop, a person role in the plan; can-with-review names one too.
//   recruiting: an open person role needed by the current phase is a role to recruit now; it needs
//     a recruiting entry, and the entry's brief exists (paths relative to the venture folder).
//   routes (robots, EE-032): each glob a role lists matches at least one route.
// Also checks the register: ids unique; an entry with a url has a checked date; not-allowed cites
// a decision class that exists; an eval file exists.
//
//   node schema/check-team.mjs <workspace or venture dir>

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-team.mjs <workspace or venture dir>"); process.exit(2); }
const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
const PHASES = ["discovery", "validation", "beachhead", "scale", "platform"];
const registry = new Map(load(join(repo, "governance/venture-template/roles/agent-roles.json")).roles.map((r) => [r.id, r]));
const template = load(join(repo, "governance/venture-template/decision-rights.json"));
const caps = load(join(repo, "evidence/capabilities/agent-capabilities.json"));
const errors = [], warnings = [], recruitNow = [];
const { routes, glob: routeGlob } = await import("../interface/router.mjs");
const routeList = routes().map((r) => r.route.replace("[id]", "x"));

const capIds = caps.capabilities.map((c) => c.id);
if (new Set(capIds).size !== capIds.length) errors.push("agent-capabilities.json: duplicate ids");
const templateClasses = new Set(template.classes.map((c) => c.id));
for (const c of caps.capabilities) for (const b of c.basis) {
  if (b.url && !b.checked) errors.push(`agent-capabilities.json: ${c.id} cites a url with no checked date`);
  if (b.eval && !existsSync(join(repo, b.eval))) errors.push(`agent-capabilities.json: ${c.id} eval ${b.eval} not found`);
  if (b.decision_class && !templateClasses.has(b.decision_class)) errors.push(`agent-capabilities.json: ${c.id} cites unknown decision class ${b.decision_class}`);
}
for (const c of caps.capabilities) if (c.status === "not-allowed" && !c.basis.some((b) => b.decision_class)) errors.push(`agent-capabilities.json: ${c.id} is not-allowed but cites no decision class`);
const cap = new Map(caps.capabilities.map((c) => [c.id, c]));

let checked = 0;
for (const root of walk(dir)) {
  const v = load(join(root, "venture.json"));
  const pPath = join(root, "operations/team-plan.json");
  if (!existsSync(pPath)) continue;
  checked++;
  const plan = load(pPath), at = `${v.id}/operations/team-plan.json`;
  // The venture's decision rights: the template, tightened by the venture's own file.
  const classes = new Map(template.classes.map((c) => [c.id, c]));
  const own = join(root, "governance/decision-rights.json");
  if (existsSync(own)) for (const c of load(own).classes) classes.set(c.id, { ...classes.get(c.id), ...c });
  const ids = plan.roles.map((r) => r.id);
  if (new Set(ids).size !== ids.length) errors.push(`${at}: duplicate role ids`);
  const persons = new Set(plan.roles.filter((r) => r.occupant === "person").map((r) => r.id));
  for (const r of plan.roles) {
    const reg = registry.get(r.id);
    if (!reg && !r.name) errors.push(`${at}: ${r.id} is not in the role registry, so it needs a name`);
    for (const g of [...(r.routes?.read ?? []), ...(r.routes?.write ?? [])]) if (!routeList.some((x) => routeGlob(g).test(x))) errors.push(`${at}: ${r.id} lists route ${g}, which matches no route`);
    if (reg && reg.occupant === "person" && r.occupant === "agent") errors.push(`${at}: ${r.id} is a person's role in the registry; an agent cannot occupy it`);
    for (const a of r.authority ?? []) {
      const c = classes.get(a);
      if (!c) { errors.push(`${at}: ${r.id} holds unknown decision class ${a}`); continue; }
      if (c.owner !== r.id) errors.push(`${at}: ${r.id} holds ${a}, which decision rights give to ${c.owner}`);
      if (r.occupant === "agent" && c.level === "escalate") errors.push(`${at}: ${r.id} is an agent and holds ${a}, an escalate class; a person decides it`);
    }
    for (const t of r.tasks ?? []) {
      const c = cap.get(t.capability);
      if (!c) { errors.push(`${at}: ${r.id} task cites unknown capability ${t.capability}`); continue; }
      if (r.occupant === "agent" && c.status !== "can") {
        if (!t.human_loop) errors.push(`${at}: ${r.id} does ${t.capability} (${c.status}), so it names a human loop`);
        else if (!persons.has(t.human_loop)) errors.push(`${at}: ${r.id}'s human loop ${t.human_loop} is not a person role in the plan`);
      }
      if (r.occupant === "agent" && c.status === "not-allowed") warnings.push(`${at}: ${r.id} does ${t.capability}, which agents may not do; the agent prepares and ${t.human_loop ?? "a person"} acts`);
    }
    if (r.occupant === "person" && r.status === "open" && PHASES.indexOf(r.needed_by) <= PHASES.indexOf(v.phase)) {
      recruitNow.push(`${v.id}: ${r.id}`);
      const rec = (plan.recruiting ?? []).find((x) => x.role === r.id);
      if (!rec) errors.push(`${at}: ${r.id} is needed now and open, but has no recruiting entry`);
    }
  }
  for (const rec of plan.recruiting ?? []) {
    if (!ids.includes(rec.role)) errors.push(`${at}: recruiting for unknown role ${rec.role}`);
    if (!existsSync(join(root, rec.brief))) errors.push(`${at}: recruiting brief ${rec.brief} not found (paths are relative to the venture folder)`);
    if (rec.assisted_by && plan.roles.find((r) => r.id === rec.assisted_by)?.occupant !== "agent") warnings.push(`${at}: recruiting for ${rec.role} is assisted by ${rec.assisted_by}, which is not an agent role in the plan`);
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${checked} ventures with a team plan: every agent task has its human loop${recruitNow.length ? `; recruit now: ${recruitNow.join(", ")}` : ""}.`);
