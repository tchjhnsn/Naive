// The brief an MCP client reads to act as a function agent or a lead: the spec from function-spec.ts or lead-spec.ts,
// with the text of the files it points at, so a harness with no plugin can staff the agent. Naive's MCP server answers
// mentura_agent_brief with it. Every path in a brief is relative to the Naive root, never a machine path.
//
//   agentBrief("finance-agent", null)   // { kind: "function-agent", role, spec, instructions: { path, text }, workflows, decisions, env }
//   agentBrief("finance-agent", dir)    // the same, with the venture's activity assignments for finance (EE-173)
//   agentBrief("finance-lead", dir)     // { kind: "lead", role, spec, skill: { path, text }, env, staffed, fix? }
//   agentBrief("finance-worker-dunning", dir)  // { kind: "worker", role, spec (its deployment record and the reach it
//                                       //   still has), instructions (its role's), skills, env, how } (EE-235)
//   agentRoles()                        // every role a brief exists for: each <function>-agent, then each lead. A
//                                       //   digital worker is not listed: it lives in one venture, not in Naive's data

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { roleOf } from "../access.ts";
import type { AssignedActivity } from "./assignments.ts";
import { assignedSteps, assignmentsFor } from "./assignments.ts";
import type { Phase, TeamPlanRole } from "./function-spec.ts";
import { functionAgent, functionIds, naivePath, teamPlanEntry } from "./function-spec.ts";
import { leadAgent, leadIds, leadTeamPlanEntry } from "./lead-spec.ts";
import { WORKERS, functionOfAgent, readWorker, workerOfAgent, workerReach } from "./reach.ts";
import { loadRoles } from "./roles.ts";

/** A file the brief carries: its path from the Naive root and its whole text. */
export interface BriefFile { readonly path: string, readonly text: string }
/** A JSON file the brief carries: its path from the Naive root and its parsed content. */
export interface BriefJson { readonly path: string, readonly id: string, readonly content: unknown }

export interface AgentBrief {
  readonly kind: "function-agent" | "lead" | "worker",
  readonly role: string,
  /** The spec with every machine path made relative to the Naive root. */
  readonly spec: Record<string, unknown>,
  /** function agent: the module's agent.md. */
  readonly instructions?: BriefFile | null,
  /** function agent: each workflows/<id>.json. With a venture, a step whose activity it has assigned, or whose kind gives a default, carries `assignment`. */
  readonly workflows?: readonly BriefJson[],
  /** function agent, with a venture: the function's activities the venture has assigned and the ones a person performs by default for their kind (EE-179), each with the rule to follow. */
  readonly assignments?: readonly AssignedActivity[],
  /** function agent: the module's decisions.json. */
  readonly decisions?: BriefJson | null,
  /** lead: the template's SKILL.md. */
  readonly skill?: BriefFile | null,
  /** worker: the SKILL.md of each skill its deployment named, from its role's function module (EE-235). */
  readonly skills?: readonly BriefFile[],
  /** The environment to act under, so every write through the CLI or router is the role's. */
  readonly env: { readonly MENTURA_ACTOR_ID: string },
  /** The team-plan entry a person adds so a venture staffs the role. The agent never writes it. A worker has none: its reach is its deployment record, not the plan. */
  readonly team_plan_entry?: TeamPlanRole,
  /** With a venture: whether its team plan has the role as an agent's. */
  readonly staffed?: boolean,
  readonly how: string,
}

const root = naivePath("");
const rel = (p: string): string => relative(root, p);
const text = (p: string | null): BriefFile | null => (p && existsSync(p) ? { path: rel(p), text: readFileSync(p, "utf8") } : null);
const json = (p: string | null, id: string): BriefJson | null => (p && existsSync(p) ? { path: rel(p), id, content: JSON.parse(readFileSync(p, "utf8")) as unknown } : null);

/** Every role a brief exists for: each `<function>-agent` in departments.json order, then each lead. */
export function agentRoles(): string[] {
  return [...functionIds().map((f) => `${f}-agent`), ...leadIds()];
}

const phaseOf = (dir: string | null): Phase => {
  if (!dir) return "discovery";
  try { return (JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) as { phase?: Phase }).phase ?? "discovery"; }
  catch { return "discovery"; }
};

/**
 * The brief for one role, or an Error naming every valid role when no function agent or lead has it. With a venture
 * folder, staffed says whether its team plan has the role as an agent's.
 */
export function agentBrief(role: string, dir: string | null): AgentBrief | Error {
  const phase = phaseOf(dir);
  const staffing = (r: string): { staffed?: boolean } => (dir ? { staffed: (roleOf(dir, r) as { occupant?: string } | null)?.occupant === "agent" } : {});
  const fn = /^(.+)-agent$/.exec(role)?.[1];
  if (fn && (functionIds() as string[]).includes(fn)) {
    const s = functionAgent(fn);
    const assigned = dir ? assignmentsFor(dir, fn) : null;
    const workflows = s.workflows.map((w) => json(join(s.module, "workflows", `${w}.json`), w)).filter((w): w is BriefJson => !!w)
      .map((w) => (assigned ? { ...w, content: assignedSteps(w.content, assigned.record, assigned.activities) } : w));
    return {
      kind: "function-agent", role: s.role,
      spec: { ...s, module: rel(s.module), instructions: s.instructions ? rel(s.instructions) : null, decisions: s.decisions ? rel(s.decisions) : null },
      instructions: text(s.instructions), workflows, decisions: json(s.decisions, "decisions"),
      ...(assigned ? { assignments: assigned.activities } : {}),
      env: { MENTURA_ACTOR_ID: s.role }, team_plan_entry: teamPlanEntry(s, phase), ...staffing(s.role),
      how: `Act as ${s.role}: follow instructions, read foundation/telos and foundation/goals first and name which goal the run serves, run a workflow's steps in order (a step with consider is optional: run it only when its when condition holds or a person asks, and otherwise say you considered it and why you did not run it), reach the workflow's goal and stop only when its done_criteria pass, raise a question in decisions/* when the decision matrix says escalate, and write only the routes in spec.writes. Ask the person what only they can know; when no one answers, record the gap as an assumption on the record and never write a guess as a fact. Cite the record behind every claim. Skill paths under /function/ are relative to spec.module.${assigned?.activities.length ? " Some of your activities have a rule, from the venture's own assignments or by default from the activity's kind: follow the rule of each entry in assignments, and of a step's assignment." : ""}`,
    };
  }
  // A digital worker (EE-235): its spec is its deployment record, its instructions its role's, and its reach what the
  // router will still give it now. It is only a deployment in a venture, so without a venture folder there is no brief.
  if (workerOfAgent(role)) {
    const rec = readWorker(dir, role);
    if (!rec) return new Error(`no worker ${role}${dir ? ` in this venture: its record would be ${WORKERS}/${role}.json` : ": name the venture it was deployed in with --venture"}`);
    const r = loadRoles(dir ?? undefined).get(rec.role);
    const wfn = functionOfAgent(rec.role) ?? (r?.function && (functionIds() as string[]).includes(r.function) ? r.function : null);
    const p = wfn ? functionAgent(wfn) : null;
    const { writes, gone } = workerReach(rec, dir, new Date().toISOString());
    const named = new Set(rec.skills ?? []);
    const skills = p ? p.skills.filter((s) => named.has(s.name)).map((s) => text(join(p.module, `${s.path.replace("/function/", "")}SKILL.md`))).filter((f): f is BriefFile => !!f) : [];
    const instructions = functionOfAgent(rec.role) && p ? text(p.instructions) : text(r?.skill ? naivePath(r.skill) : null);
    const task = rec.task?.trim();
    return {
      kind: "worker", role: rec.id,
      spec: { ...rec, writes, ...(p ? { label: p.label, charter: p.charter, module: rel(p.module) } : {}), ...(gone ? { reach_gone: gone } : {}) },
      instructions, skills, env: { MENTURA_ACTOR_ID: rec.id }, ...staffing(rec.id),
      how: `Act as ${rec.id}, a digital worker deployed as ${rec.role} by ${rec.deployed_by}, sponsored by ${rec.sponsor}${task ? `, for one task: ${/[.!?]$/.test(task) ? task : `${task}.`} Do that task and nothing else` : ". Do the role's work"}, hand anything beyond it back to ${rec.deployed_by}, and write only the routes in spec.writes. ${gone ? `Your reach is gone because ${gone}, so every write is refused: tell ${rec.deployed_by}.` : rec.expires ? `Your reach ends at ${rec.expires}, after which every write is refused.` : "Your reach lasts until a person suspends or ends you."} It is never wider than ${rec.role}'s reach or ${rec.deployed_by}'s.`,
    };
  }
  if ((leadIds() as string[]).includes(role)) {
    const l = leadAgent(role);
    const skillFile = l.skill ? join(l.skill, "SKILL.md") : null;
    return {
      kind: "lead", role: l.role, spec: { ...l, skill: l.skill ? rel(l.skill) : null },
      skill: text(skillFile), env: { MENTURA_ACTOR_ID: l.role }, team_plan_entry: leadTeamPlanEntry(l, phase), ...staffing(l.role),
      how: `Act as ${l.role}: read the skill, plan and verify cross-function work for ${l.portfolio.join(", ")} against the telos measures your lead plan binds, hand work to their function agents as handoffs (mentura_route_task says who takes a task), verify what comes back and never your own work, and write only the routes in spec.writes. A one-way door or a never-redelegated class is a person's, however your plan ranks it.`,
    };
  }
  return new Error(`no agent ${role}: the roles are ${agentRoles().join(", ")}`);
}
