// The boundary around a kit's agent workflow (S-15): the Next.js advice to wrap a third-party component
// that uses client features, with the library author declaring "use client". A kit (Mentura's enhanced
// package, <NAIVE_KITS>/<name>/kit.json) declares, under boundary, what its workflow reads, what it
// writes and which of its steps use a model:
//
//   { "name": "...", "package": "<the package it extends>",
//     "boundary": { "reads": [<route globs>], "writes": [<route globs>], "use_model": [<model steps>] } }
//
// wrap(kit) returns the router's call with that boundary around it: a read outside reads or writes, a
// write outside writes, or a command it does not read is refused as an expected error, and every call
// acts as the kit's agent, never as a person. A kit that uses a model writes judgments, so it declares
// knowledge/judgment/** in writes. This module reads kit.json as data and never imports the app's code.
//
//   node packages/naive/src/router/kit-boundary.ts <kit.json>      check one kit's boundary

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { call as routerCall, glob, repo, routes } from "./router.ts";
import type { CallArgs, RouteEntry } from "./router.ts";
import type { Declared } from "./orchestration/model-steps.ts";
// packages/naive/src/router/orchestration/model-steps.ts is imported inside checkKit, not here, because it imports wrap from this module.

/** A kit's boundary: what its workflow reads, writes and asks a model. */
type Boundary = { reads: string[]; writes: string[]; use_model: Omit<Declared, "package">[] };
/**
 * A kit.json as this module reads it: its name, the package it extends and its boundary. kit.schema.json
 * has no boundary field, so this shape is written here.
 */
export type BoundedKit = { name: string; package?: string; boundary?: Boundary };

const ID = /^[a-z0-9][a-z0-9-]*$/;
export const actorOf = (kit: { name: string }) => `kit-${kit.name}`;
const any = (globs: string[] | undefined, route: string) => (globs ?? []).some((g) => glob(g).test(route));
const reachable = (b: Boundary, route: string) => any(b.reads, route) || any(b.writes, route);

/** Errors in a kit's declared boundary, its model steps included. */
export async function checkKit(kit: unknown): Promise<string[]> {
  const { checkSteps, inputOf } = await import("./orchestration/model-steps.ts");
  const e: string[] = [];
  if (!kit || typeof kit !== "object") return ["a kit.json is an object"];
  const k = kit as BoundedKit; // checked field by field below
  if (typeof k.name !== "string" || !ID.test(k.name)) e.push("a kit has a name of lowercase letters, digits and hyphens");
  if (typeof k.package !== "string" || !existsSync(join(repo, "packages/naive/library", "packages", k.package, "package.json"))) e.push(`kit ${k.name}: package ${k.package} is not a package in packages/naive/library/packages/ (a kit extends one package and never replaces it)`);
  const b = k.boundary;
  if (!b || typeof b !== "object") { e.push(`kit ${k.name}: declares a boundary: what it reads, what it writes, which steps use a model`); return e; }
  for (const f of ["reads", "writes", "use_model"] as const) if (!Array.isArray(b[f])) e.push(`kit ${k.name}: boundary.${f} is an array${f === "use_model" ? ", empty when it calls no model" : ""}`);
  if (e.length) return e;
  const all: string[] = routes().map((r: RouteEntry) => r.route);
  for (const g of [...b.reads, ...b.writes]) if (!all.some((r) => glob(g).test(r) || glob(g).test(r.replace("[id]", "x")))) e.push(`kit ${k.name}: ${g} matches no route`);
  const steps = b.use_model.map((s) => ({ ...s, package: k.name }));
  e.push(...(await checkSteps(steps)).map((x) => `kit ${x}`));
  for (const s of steps) {
    if (s.for_each && !reachable(b, s.for_each)) e.push(`kit ${k.name}/${s.step}: reads ${s.for_each}, outside the kit's reads`);
    for (const i of s.inputs ?? []) { const p = inputOf(i); if (p.form === "route" && !reachable(b, p.route)) e.push(`kit ${k.name}/${s.step}: input ${i} is outside the kit's reads`); }
    for (const spec of Object.values(s.computed ?? {})) {
      const route = spec?.count ?? (spec?.read ? String(spec.read).split("#")[0] : null);
      if (route && !reachable(b, route)) e.push(`kit ${k.name}/${s.step}: computes from ${route}, outside the kit's reads`);
    }
  }
  if (steps.length && !any(b.writes, "knowledge/judgment/x")) e.push(`kit ${k.name}: uses a model, so it writes judgments: declare knowledge/judgment/** in boundary.writes`);
  return e;
}

/** The router's call, wrapped in the kit's boundary. */
export function wrap(kit: BoundedKit, call: typeof routerCall = routerCall) {
  const b = kit.boundary ?? { reads: [], writes: [], use_model: [] };
  return async (args: CallArgs) => {
    const route = args.route;
    const act = args.action === "write" ? "write" : "read";
    const ok = act === "write" ? any(b.writes, route) : reachable(b, route);
    if (!ok) return { ok: false, outcome: "expected", error: `kit ${kit.name} declares no ${act} of ${route} (boundary.${act === "write" ? "writes" : "reads"} in its kit.json)` };
    // The kit's workflow is an agent, whatever the caller passed.
    return call({ ...args, actor: "agent", actor_id: actorOf(kit), provenance: { ...(args.provenance ?? {}), note: `kit ${kit.name}${args.provenance?.note ? `: ${args.provenance.note}` : ""}` } });
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const f = process.argv[2];
  if (!f) { console.error("usage: node packages/naive/src/router/kit-boundary.ts <kit.json>"); process.exit(2); }
  const parsed: unknown = JSON.parse(readFileSync(f, "utf8"));
  const e = await checkKit(parsed);
  if (e.length) { console.error(e.join("\n")); process.exit(1); }
  const kit = parsed as BoundedKit & { boundary: Boundary }; // checkKit passed, so the boundary is there
  console.log(`kit ${kit.name}: reads ${kit.boundary.reads.length} route patterns, writes ${kit.boundary.writes.length}, ${kit.boundary.use_model.length} model steps, inside its boundary.`);
}
