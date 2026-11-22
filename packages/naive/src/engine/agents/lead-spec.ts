// What a lead agent is, derived from Naive's own data (lead agents design, Naive docs/design/LEAD_AGENTS_2026-11-08.md,
// build plan item 4). There is no list of leads here: a lead is any role template in the installed Naive with a
// portfolio, and everything the lead needs comes from data Naive already ships.
//
//   template/governance/roles/<id>.json    the id, name, portfolio, default measure kinds, grantable classes and skill
//   template/governance/delegation.json    the one-way doors and never-redelegated classes no agent takes
//   departments.json (through function-spec.ts)   the function agents a lead hands work to
//   engine/route-task.ts                   the routing rule: which of a function agent, a lead or a person takes a task
//
// A lead reads every record and writes only its own lead plan (operations/lead/<id>), decisions/* and
// operations/handoff/*, never a function's records and never the team plan (Naive's check-team.ts holds a venture's
// team plan to the same rule).
//
//   const spec = leadAgent("growth-lead");       // throws on an id no role template with a portfolio has
//   spec.portfolio                               // ["marketing-and-sales", "customer-service"]
//   spec.writes                                  // ["operations/lead/growth-lead", "decisions/*", "operations/handoff/*"]
//   routeFor({ functions: ["finance"] }, dir)    // { to: "function-agent", role: "finance-agent", tool: "agent_finance", ... }

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ventureFile } from "../../core/venture-paths.ts";
import { measures } from "../canonical.mjs";
import { roleOf, routeGlob } from "../access.mjs";
import { routeTask } from "../route-task.ts";
import type { Context, LeadPlanBinding, Measure, Routed, Task } from "../route-task.ts";
import { routes } from "../../records/routes/routes.ts";
import type { FunctionId, Phase, TeamPlanRole } from "./function-spec.ts";
import { functionAgent, functionIds, naivePath, reachesTeamPlan, teamPlanEntry } from "./function-spec.ts";

/** Only leadAgent() makes a spec, so a spec always agrees with Naive's role templates. Erased at runtime. */
declare const derived: unique symbol;

/** A lead id: a role template with a portfolio. Made only by leadIds() and leadAgent(). */
export type LeadId = string & { readonly __lead: true };

/**
 * One lead agent. Invariants, checked when the spec is derived: every portfolio function is in departments.json; the
 * write globs reach only the lead's own plan, decisions and handoffs, so never a function's records or the team plan.
 */
export interface LeadAgentSpec {
  readonly [derived]: true,
  readonly id: LeadId,
  readonly label: string,
  /** The team-plan role the lead acts in: its template id (growth-lead). */
  readonly role: string,
  readonly description: string,
  readonly portfolio: readonly FunctionId[],
  /** The telos measure kinds the lead is bound to by default, which route a task whose measure no lead plan binds. */
  readonly measureKinds: readonly string[],
  /** The decision classes its template says may be granted to it (from the chief of staff). */
  readonly grantable: readonly string[],
  /** The folder of the template's skill in the installed Naive, mounted read-only at /lead/ in the agent's files. */
  readonly skill: string | null,
  /** Its lead plan route, operations/lead/<id> (file operations/leads/<id>.json). */
  readonly plan: string,
  /** The write globs its team-plan role should get: its plan, decisions/* and operations/handoff/*. Reads are every route. */
  readonly writes: readonly string[],
}

interface RoleTemplate { id: string, name?: string, description?: string, portfolio?: string[], default_measure_kinds?: string[], grantable_classes?: string[], skill?: string }

const ROLES = "packages/naive/template/governance/roles";
const DELEGATION = "packages/naive/template/governance/delegation.json";
const load = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));

/** Every role template with a portfolio in the installed Naive, by file name order. */
function leadTemplates(): RoleTemplate[] {
  const dir = naivePath(ROLES);
  return readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => load(join(dir, f)))
    .filter((r): r is RoleTemplate => !!r && typeof r === "object" && "id" in r && Array.isArray((r as RoleTemplate).portfolio));
}

/** Every lead the installed Naive defines. */
export function leadIds(): LeadId[] {
  return leadTemplates().map((r) => r.id as LeadId);
}

/** What a lead may write: its own plan, decisions and handoffs (the rule Naive's check-team.ts holds a team plan to). */
const leadMayWrite = (id: string, route: string): boolean =>
  route === `operations/lead/${id}` || /^decisions(\/|$)/.test(route) || /^operations\/handoff(\/|$)/.test(route);

/**
 * The routes these write globs reach that a lead may not write, [id] read as one item. Empty when the globs keep to
 * the lead's plan, decisions and handoffs. A glob with no wildcard may name one item (operations/lead/growth-lead).
 */
export function beyondLead(id: string, globs: readonly string[]): string[] {
  const table = [...(routes() as { route: string }[]).map((r) => r.route.replace(/\[id\]/g, "x")), `operations/lead/${id}`];
  return [...new Set(globs.flatMap((g) => table.filter((r) => routeGlob(g).test(r) && !leadMayWrite(id, r))))];
}

const cache = new Map<string, LeadAgentSpec>();

/**
 * The lead agent for one role template id. Throws an Error naming the leads when no template with a portfolio has
 * that id, and an Error naming the file when the template breaks an invariant above. Derived once per process.
 */
export function leadAgent(id: string): LeadAgentSpec {
  const hit = cache.get(id);
  if (hit) return hit;
  const all = leadTemplates();
  const t = all.find((r) => r.id === id);
  if (!t) throw new Error(`no lead ${id}: the role templates with a portfolio are ${all.map((r) => r.id).join(", ")}`);
  const known = new Set<string>(functionIds());
  const unknown = (t.portfolio ?? []).filter((f) => !known.has(f));
  if (unknown.length) throw new Error(`${ROLES}/${id}.json: portfolio names ${unknown.join(", ")}, which departments.json does not list`);
  const writes = [`operations/lead/${id}`, "decisions/*", "operations/handoff/*"];
  const beyond = beyondLead(id, writes);
  if (beyond.length || reachesTeamPlan(writes)) throw new Error(`${id}'s write routes reach beyond its plan, decisions and handoffs: ${beyond.join(", ") || "the team plan"}`);
  const fields: Omit<LeadAgentSpec, typeof derived> = {
    id: id as LeadId, label: t.name ?? id, role: id, description: t.description ?? "",
    portfolio: (t.portfolio ?? []) as FunctionId[], measureKinds: t.default_measure_kinds ?? [], grantable: t.grantable_classes ?? [],
    skill: t.skill && existsSync(naivePath(t.skill)) ? dirname(naivePath(t.skill)) : null,
    plan: `operations/lead/${id}`, writes,
  };
  const spec = fields as LeadAgentSpec;
  cache.set(id, spec);
  return spec;
}

/**
 * The team-plan entry a person adds so the venture staffs this lead: write routes its plan, decisions and handoffs,
 * reads every route. The lead never writes the team plan itself. Naive's check-team.ts also wants a lead plan that
 * binds the lead to a telos measure; the lead's first run writes it, or a person does.
 */
export function leadTeamPlanEntry(spec: LeadAgentSpec, phase: Phase): TeamPlanRole {
  return { id: spec.role, name: spec.label, occupant: "agent", needed_by: phase, status: "filled",
    why: `Plans and verifies cross-function work for ${spec.portfolio.join(", ")}`, routes: { write: [...spec.writes] } };
}

// ---- Routing (lead agents design, "Routing a task") ----

/** Where a routed task goes in Mentura: the MCP tool that takes it (agent_<function> or lead_<id>), or null for a person. */
export type RouteAnswer = Routed & { tool: string | null, staffed: boolean, fix?: TeamPlanRole };

/** The tool name for a lead: lead_growth-lead. */
export const leadToolName = (id: string): string => `lead_${id}`;

/**
 * The routing rule's context for one venture, read from its files: the leads (role templates with a portfolio), the
 * venture's lead plans (operations/leads/*.json), its telos measures (Naive's canonical measures), the one-way doors
 * and never-redelegated classes (the template's delegation lists and the venture's own, both bind), and the function
 * ids. With no venture folder, the template alone.
 */
export function routeContext(dir: string | null): Context {
  const delegation = [load(naivePath(DELEGATION))];
  const own = dir ? ventureFile(dir, "governance/delegation.json") as string : null;
  if (own && existsSync(own)) delegation.push(load(own));
  const list = (k: "one_way_doors" | "never_redelegated"): string[] => [...new Set(delegation.flatMap((d) => (d as Record<string, string[] | undefined>)[k] ?? []))];
  const plansDir = dir ? ventureFile(dir, "operations/leads") as string : null;
  const plans: LeadPlanBinding[] = plansDir && existsSync(plansDir)
    ? readdirSync(plansDir).filter((f) => f.endsWith(".json")).map((f) => load(join(plansDir, f)) as { lead?: string, measures?: string[] })
      .filter((p) => typeof p.lead === "string").map((p) => ({ lead: p.lead as string, measures: p.measures ?? [] }))
    : [];
  return {
    leads: leadTemplates().map((t) => ({ id: t.id, portfolio: t.portfolio ?? [], default_measure_kinds: t.default_measure_kinds ?? [] })),
    plans, measures: dir ? measures(dir) as Measure[] : [],
    one_way_doors: list("one_way_doors"), never_redelegated: list("never_redelegated"), functions: functionIds(),
  };
}

/**
 * Routes one classified task for a venture: Naive's routeTask decides, and this names the MCP tool that takes it.
 * staffed is false when the target's role is not an agent's in the venture's team plan; then fix is the entry a person
 * adds. A task for a person has no tool. With no venture folder every target counts as staffed.
 */
export function routeFor(task: Task, dir: string | null): RouteAnswer {
  const routed = routeTask(task, routeContext(dir));
  if (routed.to === "person" || !routed.role) return { ...routed, tool: null, staffed: true };
  const isLead = routed.to === "lead";
  const fn = isLead ? null : routed.role.replace(/-agent$/, "");
  const tool = isLead ? leadToolName(routed.role) : `agent_${fn}`;
  const staffed = !dir || (roleOf(dir, routed.role) as { occupant?: string } | null)?.occupant === "agent";
  if (staffed) return { ...routed, tool, staffed };
  const phase = phaseOfDir(dir);
  const fix: TeamPlanRole = isLead ? leadTeamPlanEntry(leadAgent(routed.role), phase) : teamPlanEntry(functionAgent(fn as string), phase);
  return { ...routed, tool, staffed, fix };
}

const phaseOfDir = (dir: string): Phase => {
  try { return (load(join(dir, "venture.json")) as { phase?: Phase }).phase ?? "discovery"; }
  catch { return "discovery"; }
};
