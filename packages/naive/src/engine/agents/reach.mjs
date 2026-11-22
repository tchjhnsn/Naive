// A function agent's write reach, derived from Naive's own data, and the router's rule over it. function-spec.ts
// builds its spec's writes from functionWrites here, so the spec and the rule the router applies are one list.
//
// This module is plain JavaScript because the router runs it from an installed copy, where Node does not strip
// types under node_modules.
//
//   functionWrites("finance")              // ["decisions/*", "finance/budget/*", ..., "money/*"]
//   functionOfAgent("finance-agent")       // "finance"; null for a lead, a researcher or any other role
//   reachRefusal({ role, route, table })   // a refusal naming the agent, the route and its patterns, or null

import { readDataModel } from "../../records/index.ts";
import { routes } from "../../records/routes/routes.ts";
import { PLANS, routeGlob } from "../access.mjs";
import { catalog } from "../departments.mjs";

/** @type {Map<string, string[]>} */
const cache = new Map();

/**
 * The function id an acting role is the function agent of: the role is `<function>-agent` for a function that
 * departments.json lists. Anything else (a person's role, a lead, a researcher, the chief of staff, plain agent) is
 * null. @param {string | undefined | null} role @returns {string | null}
 */
export function functionOfAgent(role) {
  if (typeof role !== "string" || !role.endsWith("-agent")) return null;
  const fn = role.slice(0, -"-agent".length);
  return catalog().some((/** @type {{ id: string }} */ d) => d.id === fn) ? fn : null;
}

/**
 * The write globs of one function's agent: decisions/* (to raise a question) plus every concrete write route of a
 * record type the data model gives this function, [id] as *, minus any route whose files include a team-plan file
 * (PLANS). The record type's function, not the folder its file sits in, decides. Derived once per process.
 * @param {string} fn @returns {string[]}
 */
export function functionWrites(fn) {
  const hit = cache.get(fn);
  if (hit) return hit;
  const model = /** @type {{ records: { id: string, function?: string | null }[] }} */ (readDataModel());
  const mine = new Set(model.records.filter((r) => r.function === fn).map((r) => r.id));
  const all = /** @type {{ route: string, record?: string, actions?: string[], files?: string[] }[]} */ (routes());
  const owned = all.filter((r) => r.actions?.includes("write") && r.files?.length && r.record && mine.has(r.record)
    && !r.files.some((f) => PLANS.includes(f)));
  const writes = ["decisions/*", ...[...new Set(owned.map((r) => r.route.replace("[id]", "*")))].sort()];
  cache.set(fn, writes);
  return writes;
}

/**
 * The router's reach rule: a write by a function agent (role `<function>-agent`) lands only on a route one of its
 * write globs matches, the concrete route or its route-table pattern with [id] as *. Every other role, a person and
 * the projector are not checked here. Returns a refusal or null.
 * @param {{ role?: string | null, route: string, table?: string }} q
 * @returns {{ then: "refuse", rule: string, source: string, matched: string[], why: string, writes: string[] } | null}
 */
export function reachRefusal({ role, route, table }) {
  const fn = functionOfAgent(role);
  if (!fn) return null;
  const writes = functionWrites(fn);
  const pattern = table ? table.replace(/\[id\]/g, "*") : null;
  if (writes.some((g) => routeGlob(g).test(route) || g === pattern)) return null;
  return { then: "refuse", rule: "agent-reach", source: "function agent", matched: ["agent-reach"], writes,
    why: `${role} may not write ${route}: a function agent writes only its reach (decisions plus the routes of the record types the data model gives ${fn}), which is ${writes.join(", ")}; hand the change to the function that owns ${route} through a handoff, or a person writes it` };
}
