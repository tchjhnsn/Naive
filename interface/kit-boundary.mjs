// The boundary around a kit's agent workflow (S-15): the Next.js advice to wrap a third-party component
// that uses client features, with the library author declaring "use client". A kit (Mentura's enhanced
// package, platform/kits/<name>/kit.json) declares, under boundary, what its workflow reads, what it
// writes and which of its steps use a model:
//
//   { "name": "...", "package": "<the package it extends>",
//     "boundary": { "reads": [<route globs>], "writes": [<route globs>], "use_model": [<model steps>] } }
//
// wrap(kit) returns the router's call with that boundary around it: a read outside reads or writes, a
// write outside writes, or a command it does not read is refused as an expected error, and every call
// acts as the kit's agent, never as a person. A kit that uses a model writes judgments, so it declares
// knowledge/judgment/** in writes. This module reads kit.json as data and never imports from platform/.
//
//   node interface/kit-boundary.mjs <kit.json>      check one kit's boundary

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { call as routerCall, glob, repo, routes } from "./router.mjs";
// schema/model-steps.mjs is imported inside checkKit, not here, because it imports wrap from this module.

const ID = /^[a-z0-9][a-z0-9-]*$/;
export const actorOf = (kit) => `kit-${kit.name}`;
const any = (globs, route) => (globs ?? []).some((g) => glob(g).test(route));
const reachable = (b, route) => any(b.reads, route) || any(b.writes, route);

/** Errors in a kit's declared boundary, its model steps included. */
export async function checkKit(kit) {
  const { checkSteps, inputOf } = await import("../schema/model-steps.mjs");
  const e = [];
  if (!kit || typeof kit !== "object") return ["a kit.json is an object"];
  if (typeof kit.name !== "string" || !ID.test(kit.name)) e.push("a kit has a name of lowercase letters, digits and hyphens");
  if (typeof kit.package !== "string" || !existsSync(join(repo, "packages", kit.package, "package.json"))) e.push(`kit ${kit.name}: package ${kit.package} is not a package in packages/ (a kit extends one package and never replaces it)`);
  const b = kit.boundary;
  if (!b || typeof b !== "object") { e.push(`kit ${kit.name}: declares a boundary: what it reads, what it writes, which steps use a model`); return e; }
  for (const k of ["reads", "writes", "use_model"]) if (!Array.isArray(b[k])) e.push(`kit ${kit.name}: boundary.${k} is an array${k === "use_model" ? ", empty when it calls no model" : ""}`);
  if (e.length) return e;
  const all = routes().map((r) => r.route);
  for (const g of [...b.reads, ...b.writes]) if (!all.some((r) => glob(g).test(r) || glob(g).test(r.replace("[id]", "x")))) e.push(`kit ${kit.name}: ${g} matches no route`);
  const steps = b.use_model.map((s) => ({ ...s, package: kit.name }));
  e.push(...(await checkSteps(steps)).map((x) => `kit ${x}`));
  for (const s of steps) {
    if (s.for_each && !reachable(b, s.for_each)) e.push(`kit ${kit.name}/${s.step}: reads ${s.for_each}, outside the kit's reads`);
    for (const i of s.inputs ?? []) { const p = inputOf(i); if (p.form === "route" && !reachable(b, p.route)) e.push(`kit ${kit.name}/${s.step}: input ${i} is outside the kit's reads`); }
    for (const spec of Object.values(s.computed ?? {})) {
      const route = spec?.count ?? (spec?.read ? String(spec.read).split("#")[0] : null);
      if (route && !reachable(b, route)) e.push(`kit ${kit.name}/${s.step}: computes from ${route}, outside the kit's reads`);
    }
  }
  if (steps.length && !any(b.writes, "knowledge/judgment/x")) e.push(`kit ${kit.name}: uses a model, so it writes judgments: declare knowledge/judgment/** in boundary.writes`);
  return e;
}

/** The router's call, wrapped in the kit's boundary. */
export function wrap(kit, call = routerCall) {
  const b = kit.boundary ?? { reads: [], writes: [], use_model: [] };
  return async (args) => {
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
  if (!f) { console.error("usage: node interface/kit-boundary.mjs <kit.json>"); process.exit(2); }
  const kit = JSON.parse(readFileSync(f, "utf8"));
  const e = await checkKit(kit);
  if (e.length) { console.error(e.join("\n")); process.exit(1); }
  console.log(`kit ${kit.name}: reads ${kit.boundary.reads.length} route patterns, writes ${kit.boundary.writes.length}, ${kit.boundary.use_model.length} model steps, inside its boundary.`);
}
