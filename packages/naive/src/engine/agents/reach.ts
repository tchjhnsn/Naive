// A function agent's write reach, derived from Naive's own data, and the router's rule over it. function-spec.ts
// builds its spec's writes from functionWrites here, so the spec and the rule the router applies are one list.
//
//   functionWrites("finance")              // ["decisions/*", "operations/handoff/*", "finance/budget/*", ..., "money/*"]
//   functionOfAgent("finance-agent")       // "finance"; null for a lead, a researcher or any other role
//   reachRefusal({ role, route, table })   // a refusal naming the agent, the route and its patterns, or null
//
// A digital worker (EE-235) is the same rule with a narrower list, a status and an expiry. Its id is the role it acts
// as, `<role stem>-worker-<slug>` (or `<function>-specialist-<slug>` for a worker migrated from a temporary specialist,
// EE-213), and its reach is its record (<venture>/operations/workers/<id>.json) narrowed on every write to its role's
// reach and its deployer's, so it is never wider than either whatever the record says. Once the record is missing, it
// is not active, or its expiry has passed, the reach is gone and every write by it is refused.
//
//   workerOfAgent("finance-worker-dunning")   // { stem: "finance", slug: "dunning", function: "finance" }; null otherwise
//   roleReach("finance-agent", dir)           // the globs a role may write when deployed, or null for one never deployed
//   deployerReach("growth-lead", dir)         // the globs a deployer may give: a lead's whole portfolio; null for a person
//   workerReach(record, dir, now)             // { writes, gone } after both narrowings

import { existsSync, readFileSync } from "node:fs";
import { readDataModel } from "../../records/index.ts";
import { routes } from "../../records/routes/routes.ts";
import { PLANS, routeGlob } from "../access.ts";
import { catalog } from "../departments.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { reachOf } from "./worker-state.ts";
import { isPersonRole, loadRoles } from "./roles.ts";
import type { DataModel, Worker } from "../../records/types/records.d.ts";

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
 * (PLANS) and any route only the signal projector writes (writer projection, which writerRule refuses to every other
 * actor). The record type's function, not the folder its file sits in, decides. Derived once per process.
 */
export function functionWrites(fn: string): string[] {
  const hit = cache.get(fn);
  if (hit) return hit;
  const model: DataModel = readDataModel();
  const mine = new Set(model.records.filter((r) => r.function === fn).map((r) => r.id));
  const all: { route: string; record?: string; actions?: string[]; files?: string[]; writer?: string }[] = routes();
  const owned = all.filter((r) => r.actions?.includes("write") && r.files?.length && r.record && mine.has(r.record)
    && r.writer !== "projection" && !r.files.some((f) => PLANS.includes(f)));
  // Deduplicated: a function that owns the handoff record type would otherwise list operations/handoff/* twice.
  const writes = [...new Set(["decisions/*", "operations/handoff/*", ...[...new Set(owned.map((r) => r.route.replace("[id]", "*")))].sort()])];
  cache.set(fn, writes);
  return writes;
}

/** Where a venture keeps its digital workers (EE-235). */
export const WORKERS = "operations/workers";

/**
 * The stem, slug and function a worker id names: `<stem>-worker-<slug>`, or `<stem>-specialist-<slug>` for a worker
 * migrated from a temporary specialist. The function is the stem when it is a function departments.json lists (a
 * worker deployed as `<function>-agent`), else null. Anything else, a function agent included, is null.
 */
export function workerOfAgent(role: string | undefined | null): { stem: string; slug: string; function: string | null } | null {
  if (typeof role !== "string") return null;
  const m = /^([a-z][a-z0-9-]*?)-(?:worker|specialist)-([a-z0-9-]+)$/.exec(role);
  if (!m) return null;
  const [, stem, slug] = m;
  return { stem, slug, function: catalog().some((d) => d.id === stem) ? stem : null };
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

/** A lead's own reach: its lead plan, decisions and handoffs (packages/naive/src/engine/agents/lead-spec.ts). */
const leadOwn = (id: string): string[] => [`operations/lead/${id}`, "decisions/*", "operations/handoff/*"];
const union = (lists: readonly (readonly string[])[]): string[] => [...new Set(lists.flat())];
const isFunction = (id: string | undefined): id is string => !!id && catalog().some((d) => d.id === id);

/**
 * The globs a role may write when it is deployed: a function agent, or a role serving one function, its function's
 * reach; a lead its own plan, decisions and handoffs; and a merged role the union of its parents'. A person role, a
 * researcher, an unknown role and a role whose function is all with no portfolio have none to give: null, so a worker
 * of it is refused. The venture's own roles overlay the library, so a temporary role a lead wrote counts.
 */
export function roleReach(role: string, dir?: string | null, seen: ReadonlySet<string> = new Set()): string[] | null {
  const fn = functionOfAgent(role);
  if (fn) return functionWrites(fn);
  if (seen.has(role)) return null;
  const r = loadRoles(dir ?? undefined).get(role);
  if (!r || isPersonRole(r)) return null;
  if (r.merged_from?.length) {
    const parents = r.merged_from.map((p) => roleReach(p, dir, new Set([...seen, role])));
    return parents.every((p): p is string[] => p !== null) ? union(parents as string[][]) : null;
  }
  if (r.portfolio?.length) return leadOwn(r.id);
  return isFunction(r.function) ? functionWrites(r.function) : null;
}

/** The functions a lead's portfolio names, or null when the role is not a lead. */
export function portfolioOf(id: string, dir?: string | null): string[] | null {
  const r = loadRoles(dir ?? undefined).get(id);
  return r?.portfolio?.length && !isPersonRole(r) ? r.portfolio.filter(isFunction) : null;
}

/**
 * The globs a deployer may give a worker: a function agent its own reach, a lead its whole portfolio (every function
 * it plans for, with its own plan, decisions and handoffs), any other agent role its role's reach, and a worker none,
 * so no worker deploys another. A person's name, or a person role, is null: a person is bounded only by the role.
 */
export function deployerReach(by: string, dir?: string | null): string[] | null {
  if (workerOfAgent(by)) return [];
  const fn = functionOfAgent(by);
  if (fn) return functionWrites(fn);
  const r = loadRoles(dir ?? undefined).get(by);
  if (!r) return by.endsWith("-agent") || by.endsWith("-researcher") || by.endsWith("-lead") ? [] : null;
  if (isPersonRole(r)) return null;
  const portfolio = portfolioOf(by, dir);
  if (portfolio) return union([leadOwn(r.id), ...portfolio.map(functionWrites)]);
  return roleReach(by, dir) ?? [];
}

/**
 * A worker's reach at `now`: its record's globs that its role's reach and its deployer's still cover, and why the
 * reach is gone when it is. Only an active worker has reach (reachOf in worker-state.ts).
 */
export function workerReach(rec: Worker, dir: string | null | undefined, now: string): { writes: string[]; gone: string | null } {
  const role = roleReach(rec.role, dir);
  if (role === null) return { writes: [], gone: `its role ${rec.role} is not one an agent is deployed as` };
  const bound = deployerReach(rec.deployed_by, dir);
  const inRole = narrowWrites(rec.writes, role).writes;
  const writes = bound === null ? inRole : narrowWrites(inRole, bound).writes;
  const gone = rec.status === "proposed" ? "it is proposed and waits for a person to activate it"
    : rec.status === "suspended" ? "it is suspended until a person resumes it"
      : rec.status === "ended" ? `it has ended${rec.ended_how ? ` (${rec.ended_how})` : ""}`
        : rec.expires && Date.parse(rec.expires) <= Date.parse(now) ? `it expired on ${rec.expires}`
          : writes.length === 0 ? `none of its write globs is inside both ${rec.role}'s reach and ${rec.deployed_by}'s` : null;
  return { writes: gone ? [] : reachOf(rec.status, writes), gone };
}

/** One venture's record for a worker, or null when it has none. Read fresh, so an ended one is seen at once. */
export function readWorker(dir: string | null | undefined, id: string): Worker | null {
  if (!dir) return null;
  const file = ventureFile(dir, `${WORKERS}/${id}.json`);
  if (!existsSync(file)) return null;
  const rec: Worker = JSON.parse(readFileSync(file, "utf8"));
  return rec.id === id ? rec : null;
}

/**
 * The router's reach rule: a write by a function agent (role `<function>-agent`) lands only on a route one of its
 * write globs matches, the concrete route or its route-table pattern with [id] as *. A write by a digital worker
 * (EE-235) lands only on a route its record's globs match that its role's reach and its deployer's cover too, and only
 * while it is active and unexpired. Every other role, a person and the projector are not checked here. Returns a
 * refusal or null.
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
  if (!workerOfAgent(role)) return null;
  const refuse = (why: string, writes: string[] = []) => ({ then: "refuse" as const, rule: "worker-reach", source: "digital worker", matched: ["worker-reach"], writes, why });
  const rec = readWorker(dir, role as string);
  if (!rec) return refuse(`${role} may not write ${route}: a digital worker writes only the reach its deployment record gives it, and ${dir ? `this venture has no ${WORKERS}/${role}.json` : "no venture folder was given to read it from"}; deploy one with naive workers deploy or naive agent spawn, or a person writes it`);
  const { writes, gone } = workerReach(rec, dir, now ?? new Date().toISOString());
  if (gone) return refuse(`${role} may not write ${route}: its reach is gone because ${gone}; a person activates it or deploys a new worker, or a person writes it`);
  if (matches(writes)) return null;
  return refuse(`${role} may not write ${route}: the worker ${role} of ${rec.role} writes only ${writes.join(", ")}, the reach its deployment gives it inside its role's and ${rec.deployed_by}'s; hand the change back to ${rec.deployed_by}, or a person writes it`, writes);
}
