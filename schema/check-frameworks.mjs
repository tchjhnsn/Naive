#!/usr/bin/env node
// Checks that frameworks for thinking sit over the canonical schema and never inside it (Torian, 2026-10-30).
//
//   node schema/check-frameworks.mjs [repo root]
//
// Fails when:
//   - a frameworks/<id>/framework.json maps_to targets a route that is not a canonical record route
//     (foundation/goals, foundation/requirements, foundation/exit-criteria, foundation/constraints);
//   - core code (schema/*.mjs) reads a framework-only field, telos.json or a venture's ambition, outside
//     the framework adapters, the migration, the canonical fallback (schema/canonical.mjs) and the checks a
//     framework declares as its own. A simple static check; tests are not core code.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const CANONICAL = ["foundation/goals", "foundation/requirements", "foundation/exit-criteria", "foundation/constraints"];
const canonical = (route) => CANONICAL.some((c) => route === c || route === `${c}/[id]` || (route.startsWith(`${c}/`) && !route.slice(c.length + 1).includes("/")));
const FRAMEWORK_ONLY = [/telos\.json/, /\.ambition\b/];
const ALWAYS_ALLOWED = ["schema/canonical.mjs", "schema/check-frameworks.mjs", "schema/upgrades.mjs", "schema/validate.py"];

export function check(root) {
  const errors = [];
  const fdir = join(root, "frameworks");
  const fws = existsSync(fdir) ? readdirSync(fdir, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(fdir, e.name, "framework.json"))).map((e) => ({ dir: `frameworks/${e.name}`, f: JSON.parse(readFileSync(join(fdir, e.name, "framework.json"), "utf8")) })) : [];
  const allowed = new Set(ALWAYS_ALLOWED);
  for (const { dir, f } of fws) {
    if (f.id !== dir.split("/")[1]) errors.push(`${dir}/framework.json: id ${f.id} does not match its folder`);
    for (const m of f.maps_to ?? []) if (!canonical(m.canonical_route)) errors.push(`${dir}: maps_to ${m.framework_field} -> ${m.canonical_route}, which is not a canonical route (${CANONICAL.join(", ")})`);
    for (const p of [f.template, f.skill, f.adapter, ...(f.checks ?? [])].filter(Boolean)) if (!existsSync(join(root, p))) errors.push(`${dir}: ${p} not found`);
    for (const c of f.checks ?? []) allowed.add(c);
  }
  const sdir = join(root, "schema");
  const core = [...(existsSync(sdir) ? readdirSync(sdir) : []).filter((n) => n.endsWith(".mjs")).map((n) => `schema/${n}`)].filter((p) => !/-test\.mjs$|\/test\.mjs$|-eval\.mjs$/.test(p));
  for (const p of core) {
    if (allowed.has(p)) continue;
    readFileSync(join(root, p), "utf8").split("\n").forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      for (const re of FRAMEWORK_ONLY) if (re.test(line)) errors.push(`${p}:${i + 1}: reads a framework-only field (${re.source.replace(/\\/g, "")}); read canonical records through schema/canonical.mjs`);
    });
  }
  return { frameworks: fws.map((x) => x.f.id), errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2] ?? new URL("..", import.meta.url).pathname;
  const r = check(root);
  for (const e of r.errors) console.error(`error: ${e}`);
  if (r.errors.length) process.exit(1);
  console.log(`${r.frameworks.length} frameworks (${r.frameworks.join(", ")}) map onto canonical records only, and core code reads no framework-only field.`);
}
