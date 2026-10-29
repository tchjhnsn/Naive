// Access (P-27, the robots of a venture): what each team-plan role may read and write, as globs over
// routes (purpose/**, product/*). The same rules the router applies before every action, here so the
// gate (X-4) and every read of a record (F-5) can check them again. Files only: no model, no network.
//
// A role the team plan does not list, or one that lists no routes, may reach every route; gates
// still apply. A role with routes may read every route unless it lists read, and write none unless
// it lists write.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const PLANS = ["people/team-plan.json", "operations/team-plan.json"];

// Globs over routes, as in the team plan: * is one segment, ** any depth.
export const routeGlob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*\*/g, "\u0001").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*").replace(/\u0001/g, ".*") + "$");

/** The venture's team plan, or null. Read fresh on every call, so a changed plan is seen at once. */
export function teamPlan(dir) {
  const f = dir && PLANS.map((p) => join(dir, p)).find((p) => existsSync(p));
  return f ? { path: f, ...JSON.parse(readFileSync(f, "utf8")) } : null;
}

/** A role's entry in the team plan, or null. */
export function roleOf(dir, roleId) {
  if (!roleId) return null;
  return teamPlan(dir)?.roles?.find((r) => r.id === roleId) ?? null;
}

/** The globs a role may read and write, or null for a role that may reach every route. */
export function globsOf(dir, roleId) {
  const role = roleOf(dir, roleId);
  if (!role?.routes) return null;
  return { read: role.routes.read ?? ["**"], write: role.routes.write ?? [] };
}

/** Whether a role may read or write a route. */
export function may(dir, roleId, act, route) {
  if (!roleId || !dir) return true;
  const g = globsOf(dir, roleId);
  if (!g) return true;
  return (act === "write" ? g.write : g.read).some((x) => routeGlob(x).test(route));
}

/**
 * Whether a role may read at least one item of a collection: it may read the list route itself,
 * or one of its read globs reaches an item under it (product/kettle under product).
 */
export function mayReadSome(dir, roleId, listRoute) {
  if (may(dir, roleId, "read", listRoute)) return true;
  const g = globsOf(dir, roleId);
  return !!g && g.read.some((x) => x.startsWith(`${listRoute}/`) || routeGlob(x).test(`${listRoute}/x`));
}

/** Whether a role may read one item of a collection: the list route covers its items, or the item route is listed. */
export function mayReadItem(dir, roleId, listRoute, id) {
  return may(dir, roleId, "read", listRoute) || may(dir, roleId, "read", `${listRoute}/${id}`);
}
