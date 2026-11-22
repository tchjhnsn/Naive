// The brief an MCP client reads to act as a function agent or a lead: the spec from function-spec.ts or lead-spec.ts,
// with the text of the files it points at, so a harness with no plugin can staff the agent. Naive's MCP server answers
// mentura_agent_brief with it. Every path in a brief is relative to the Naive root, never a machine path.
//
//   agentBrief("finance-agent", null)   // { kind: "function-agent", role, spec, instructions: { path, text }, workflows, decisions, env }
//   agentBrief("finance-lead", dir)     // { kind: "lead", role, spec, skill: { path, text }, env, staffed, fix? }
//   agentRoles()                        // every role a brief exists for: each <function>-agent, then each lead

import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { roleOf } from "../access.ts";
import type { Phase, TeamPlanRole } from "./function-spec.ts";
import { functionAgent, functionIds, naivePath, teamPlanEntry } from "./function-spec.ts";
import { leadAgent, leadIds, leadTeamPlanEntry } from "./lead-spec.ts";

/** A file the brief carries: its path from the Naive root and its whole text. */
export interface BriefFile { readonly path: string, readonly text: string }
/** A JSON file the brief carries: its path from the Naive root and its parsed content. */
export interface BriefJson { readonly path: string, readonly id: string, readonly content: unknown }

export interface AgentBrief {
  readonly kind: "function-agent" | "lead",
  readonly role: string,
  /** The spec with every machine path made relative to the Naive root. */
  readonly spec: Record<string, unknown>,
  /** function agent: the module's agent.md. */
  readonly instructions?: BriefFile | null,
  /** function agent: each workflows/<id>.json. */
  readonly workflows?: readonly BriefJson[],
  /** function agent: the module's decisions.json. */
  readonly decisions?: BriefJson | null,
  /** lead: the template's SKILL.md. */
  readonly skill?: BriefFile | null,
  /** The environment to act under, so every write through the CLI or router is the role's. */
  readonly env: { readonly MENTURA_ACTOR_ID: string },
  /** The team-plan entry a person adds so a venture staffs the role. The agent never writes it. */
  readonly team_plan_entry: TeamPlanRole,
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
    const workflows = s.workflows.map((w) => json(join(s.module, "workflows", `${w}.json`), w)).filter((w): w is BriefJson => !!w);
    return {
      kind: "function-agent", role: s.role,
      spec: { ...s, module: rel(s.module), instructions: s.instructions ? rel(s.instructions) : null, decisions: s.decisions ? rel(s.decisions) : null },
      instructions: text(s.instructions), workflows, decisions: json(s.decisions, "decisions"),
      env: { MENTURA_ACTOR_ID: s.role }, team_plan_entry: teamPlanEntry(s, phase), ...staffing(s.role),
      how: `Act as ${s.role}: follow instructions, run a workflow's steps in order, raise a question in decisions/* when the decision matrix says escalate, and write only the routes in spec.writes. Skill paths under /function/ are relative to spec.module.`,
    };
  }
  if ((leadIds() as string[]).includes(role)) {
    const l = leadAgent(role);
    const skillFile = l.skill ? join(l.skill, "SKILL.md") : null;
    return {
      kind: "lead", role: l.role, spec: { ...l, skill: l.skill ? rel(l.skill) : null },
      skill: text(skillFile), env: { MENTURA_ACTOR_ID: l.role }, team_plan_entry: leadTeamPlanEntry(l, phase), ...staffing(l.role),
      how: `Act as ${l.role}: plan and verify cross-function work for ${l.portfolio.join(", ")}, hand work to their function agents as handoffs (mentura_route_task says who takes a task), and write only the routes in spec.writes.`,
    };
  }
  return new Error(`no agent ${role}: the roles are ${agentRoles().join(", ")}`);
}
