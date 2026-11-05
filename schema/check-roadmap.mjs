#!/usr/bin/env node
// Decision roadmaps (schema/decision-roadmap.schema.json): ordered frames, never answers. A roadmap is
// rejected when its steps form a cycle, name a frame the library does not have, have no decider, name a
// decider or merger that is not a role template, or
// delegate a one-way door away from the founder.
//
//   node schema/check-roadmap.mjs [<roadmap file> ...]     every roadmap in library/packages/*/roadmaps when none is named

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { frames } from "./frames.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const FOUNDER = "founder";

const dirOf = (pkg) => join(repo, "library", "packages", pkg, "roadmaps");
export function roadmaps() {
  if (!existsSync(join(repo, "library", "packages"))) return [];
  return readdirSync(join(repo, "library", "packages")).filter((p) => existsSync(dirOf(p))).flatMap((p) =>
    readdirSync(dirOf(p)).filter((f) => f.endsWith(".json")).map((f) => ({ ...load(join(dirOf(p), f)), package: p, file: `library/packages/${p}/roadmaps/${f}` })));
}
export const roadmapOf = (id) => roadmaps().find((r) => r.id === id) ?? null;

/** The rules a schema cannot state. Returns a list of errors, empty when the roadmap passes. */
const rolesDir = join(repo, "governance/venture-template/roles");
/** Role ids and aliases from the role templates (schema/role-template.schema.json). */
export function roleIds() {
  return new Set(readdirSync(rolesDir).filter((f) => f.endsWith(".json")).map((f) => load(join(rolesDir, f)))
    .filter((r) => r.id && r.grantable_classes).flatMap((r) => [r.id, ...(r.aliases ?? [])]));
}

export function check(r, known = new Set(frames().map((f) => f.id)), roles = roleIds()) {
  const errors = [];
  const ids = new Set();
  for (const s of r.steps ?? []) {
    if (ids.has(s.id)) errors.push(`${r.id}: step ${s.id} appears twice`);
    ids.add(s.id);
  }
  if (r.package && r.package !== r.function) errors.push(`${r.id}: lives in library/packages/${r.package} but its function is ${r.function}`);
  for (const s of r.steps ?? []) {
    if (!known.has(s.frame)) errors.push(`${r.id}: step ${s.id} uses frame ${s.frame}, which the decision library does not have`);
    if (!s.decided_by?.trim()) errors.push(`${r.id}: step ${s.id} has no decider`);
    for (const k of ["decided_by", "merged_by"]) if (s[k]?.trim() && !roles.has(s[k])) errors.push(`${r.id}: step ${s.id} ${k} ${s[k]} is not a role in governance/venture-template/roles`);
    if (s.door === "one-way" && s.decided_by !== FOUNDER) errors.push(`${r.id}: step ${s.id} is a one-way door delegated to ${s.decided_by || "no one"}; only the founder decides a one-way door`);
    for (const d of s.depends_on ?? []) if (!ids.has(d)) errors.push(`${r.id}: step ${s.id} depends on ${d}, which is not a step`);
  }
  // Cycles, by depth-first search over depends_on.
  const by = Object.fromEntries((r.steps ?? []).map((s) => [s.id, s]));
  const state = {};
  const visit = (id, path) => {
    if (state[id] === "done" || !by[id]) return;
    if (state[id] === "open") { errors.push(`${r.id}: steps form a cycle: ${[...path.slice(path.indexOf(id)), id].join(" -> ")}`); return; }
    state[id] = "open";
    for (const d of by[id].depends_on ?? []) visit(d, [...path, id]);
    state[id] = "done";
  };
  for (const id of Object.keys(by)) visit(id, []);
  return errors;
}

/** Steps in the order to take them: by dependency first, then by their order. */
export function ordered(r) {
  const out = [], seen = new Set();
  const by = Object.fromEntries(r.steps.map((s) => [s.id, s]));
  const take = (s) => { if (seen.has(s.id)) return; seen.add(s.id); for (const d of s.depends_on ?? []) if (by[d]) take(by[d]); out.push(s); };
  for (const s of [...r.steps].sort((a, b) => a.order - b.order)) take(s);
  return out;
}

if (process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const files = process.argv.slice(2);
  const list = files.length ? files.map((f) => ({ ...load(f), file: f })) : roadmaps();
  const errs = list.flatMap((r) => check(r));
  if (errs.length) { console.error(errs.join("\n")); process.exit(1); }
  console.log(`${list.length} roadmap(s): acyclic, every frame known, every step decided by someone, every one-way door the founder's.`);
}
