// A function agent's write reach, derived from Naive's own data, and the router's rule over it. function-spec.ts
// builds its spec's writes from functionWrites here, so the spec and the rule the router applies are one list.
//
//   functionWrites("finance")              // ["decisions/*", "operations/handoff/*", "finance/budget/*", ..., "money/*"]
//   functionOfAgent("finance-agent")       // "finance"; null for a lead, a researcher or any other role
//   reachRefusal({ role, route, table })   // a refusal naming the agent, the route and its patterns, or null
//
// A temporary specialist (EE-213) is the same rule with a narrower list and an expiry. Its role is
// `<function>-specialist-<slug>` and its reach is the record a function agent spawned it with
// (<venture>/operations/specialists/<role>.json), intersected with its parent's own reach on every write, so it can
// never be wider than the parent whatever the record says. Once the record is missing, its status is not live, or its
// expiry has passed, the reach is gone and every write by the role is refused.
//
//   specialistOfAgent("finance-specialist-dunning")   // { function: "finance", slug: "dunning" }; null otherwise
//   specialistReach(record, "2026-11-26T...Z")        // { writes, gone } after the intersection

import { existsSync, readFileSync } from "node:fs";
import { readDataModel } from "../../records/index.ts";
import { routes } from "../../records/routes/routes.ts";
import { PLANS, routeGlob } from "../access.ts";
import { catalog } from "../departments.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import type { DataModel, Specialist } from "../../records/types/records.d.ts";
import { nowIso } from "../../core/clock.ts";

const cache = new Map<string, string[]>();

/**
 * The function id an acting role is the function agent of: the role is `<function>-agent` for a function that
 * departments.json lists. Anything else (a person's role, a lead, a researcher, the chief of staff, plain agent) is
 * null.
 */
export function functionOfAgent(role: string | undefined | null): string | null {
  if (typeof role !== "string" || !role.endsWith("-agent")) return null;
  const fn = role.slice(0, -"-agent".length);
  return catalog().some((d) => d.id === fn) ? fn : null;
}

/**
 * The write globs of one function's agent: decisions/* (to raise a question), operations/handoff/* (to hand work to
 * another function, as its workflows do; the handoff claim rules then limit who edits it) plus every concrete write route of a
 * record type the data model gives this function, [id] as *, minus any route whose files include a team-plan file
 * (PLANS). The record type's function, not the folder its file sits in, decides. Derived once per process.
 */
export function functionWrites(fn: string): string[] {
  const hit = cache.get(fn);
  if (hit) return hit;
  const model: DataModel = readDataModel();
  const mine = new Set(model.records.filter((r) => r.function === fn).map((r) => r.id));
  const all: { route: string; record?: string; actions?: string[]; files?: string[] }[] = routes();
  const owned = all.filter((r) => r.actions?.includes("write") && r.files?.length && r.record && mine.has(r.record)
    && !r.files.some((f) => PLANS.includes(f)));
  // Deduplicated: a function that owns the handoff record type would otherwise list operations/handoff/* twice.
  const writes = [...new Set(["decisions/*", "operations/handoff/*", ...[...new Set(owned.map((r) => r.route.replace("[id]", "*")))].sort()])];
  cache.set(fn, writes);
  return writes;
}

/** Where a venture keeps the specialists a function agent spawned (EE-213). */
export const SPECIALISTS = "operations/specialists";

/**
 * The function and slug a specialist role names: `<function>-specialist-<slug>` for a function departments.json
 * lists. Anything else, a function agent included, is null. A function id never holds "specialist", so the first
 * occurrence splits the role.
 */
export function specialistOfAgent(role: string | undefined | null): { function: string; slug: string } | null {
  if (typeof role !== "string") return null;
  const at = role.indexOf("-specialist-");
  if (at <= 0) return null;
  const fn = role.slice(0, at), slug = role.slice(at + "-specialist-".length);
  return slug && catalog().some((d) => d.id === fn) ? { function: fn, slug } : null;
}

/**
 * Whether one write glob sits inside another: every route the child matches, the parent matches too. A `*` stands
 * for one segment, so instantiating the child's wildcards and testing the parent decides it.
 */
export const within = (child: string, parent: string): boolean => routeGlob(parent).test(child.replace(/\*/g, "x"));

/** The globs of `child` that `parent` covers, and the ones it does not. Pure. */
export function narrowWrites(child: readonly string[], parent: readonly string[]): { writes: string[]; wider: string[] } {
  const writes: string[] = [], wider: string[] = [];
  for (const g of child) (parent.some((p) => within(g, p)) ? writes : wider).push(g);
  return { writes, wider };
}

/**
 * A specialist's reach at `now`: its record's globs that its parent function's reach still covers, and why the reach
 * is gone when it is. Pure, so the same record gives the same answer wherever it is read.
 */
export function specialistReach(rec: Specialist, now: string): { writes: string[]; gone: string | null } {
  const { writes } = narrowWrites(rec.writes, functionWrites(rec.function));
  const gone = rec.status === "revoked" ? "a person revoked it"
    : rec.status === "finished" ? "its run has finished"
      : Date.parse(rec.expires) <= Date.parse(now) ? `it expired on ${rec.expires}`
        : writes.length === 0 ? `none of its write globs is inside ${rec.parent}'s own reach` : null;
  return { writes, gone };
}

/** One venture's record for a specialist role, or null when it has none. Read fresh, so a revoked one is seen at once. */
export function readSpecialist(dir: string | null | undefined, role: string): Specialist | null {
  if (!dir) return null;
  const file = ventureFile(dir, `${SPECIALISTS}/${role}.json`);
  if (!existsSync(file)) return null;
  const rec: Specialist = JSON.parse(readFileSync(file, "utf8"));
  return rec.id === role ? rec : null;
}

/**
 * The router's reach rule: a write by a function agent (role `<function>-agent`) lands only on a route one of its
 * write globs matches, the concrete route or its route-table pattern with [id] as *. A write by a specialist
 * (`<function>-specialist-<slug>`, EE-213) lands only on a route its record's globs match that its parent's reach
 * covers too, and only while its record is live and unexpired. Every other role, a person and the projector are not
 * checked here. Returns a refusal or null.
 */
export function reachRefusal({ role, route, table, dir, now }: { role?: string | null; route: string; table?: string; dir?: string | null; now?: string }): { then: "refuse"; rule: string; source: string; matched: string[]; why: string; writes: string[] } | null {
  const pattern = table ? table.replace(/\[id\]/g, "*") : null;
  const matches = (writes: readonly string[]) => writes.some((g) => routeGlob(g).test(route) || g === pattern);
  const fn = functionOfAgent(role);
  if (fn) {
    const writes = functionWrites(fn);
    if (matches(writes)) return null;
    return { then: "refuse", rule: "agent-reach", source: "function agent", matched: ["agent-reach"], writes,
      why: `${role} may not write ${route}: a function agent writes only its reach (decisions, handoffs and the routes of the record types the data model gives ${fn}), which is ${writes.join(", ")}; hand the change to the function that owns ${route} through a handoff, or a person writes it` };
  }
  const sp = specialistOfAgent(role);
  if (!sp) return null;
  const refuse = (why: string, writes: string[] = []) => ({ then: "refuse" as const, rule: "specialist-reach", source: "temporary specialist", matched: ["specialist-reach"], writes, why });
  const rec = readSpecialist(dir, role as string);
  if (!rec) return refuse(`${role} may not write ${route}: a specialist writes only the reach its spawn record gives it, and ${dir ? `this venture has no ${SPECIALISTS}/${role}.json` : "no venture folder was given to read it from"}; spawn it with naive agent spawn ${sp.function}-agent, or a person writes it`);
  const { writes, gone } = specialistReach(rec, now ?? nowIso());
  if (gone) return refuse(`${role} may not write ${route}: its reach is gone because ${gone}; spawn a new specialist with naive agent spawn ${rec.parent}, or a person writes it`, writes);
  if (matches(writes)) return null;
  return refuse(`${role} may not write ${route}: a specialist of ${rec.parent} writes only ${writes.join(", ")}, the reach its spawn record gives it inside its parent's own; hand the change back to ${rec.parent}, or a person writes it`, writes);
}
