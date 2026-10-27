// Checks the rules across a set of spheres that one sphere.json alone cannot (EE-004, EE-009).
// Validate each file against sphere.schema.json first; this checks how they fit together.
//
//   node schema/check-spheres.mjs <dir-or-files...>
//
// Rules: ids are unique; every parent exists; only a venture may be top level; a
// client sits inside a venture; stage only on ventures, legal_form only at the
// company stage; links point at known spheres; no sphere is its own ancestor.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// A directory is searched for sphere.json files at any depth; if it has none,
// every .json file directly in it is read (as in schema/examples/spheres/).
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : e.name === "sphere.json" ? [join(d, e.name)] : []);
const files = process.argv.slice(2).flatMap((p) => {
  if (!statSync(p).isDirectory()) return [p];
  const found = walk(p);
  return found.length ? found : readdirSync(p).filter((f) => f.endsWith(".json")).map((f) => join(p, f));
});
if (!files.length) { console.error("usage: node schema/check-spheres.mjs <dir-or-files...>"); process.exit(2); }

const spheres = new Map();
const errors = [];
for (const f of files) {
  const s = JSON.parse(readFileSync(f, "utf8"));
  if (spheres.has(s.id)) errors.push(`${f}: duplicate id ${s.id}`);
  spheres.set(s.id, s);
}

for (const s of spheres.values()) {
  if (s.parent === null) {
    if (s.kind !== "venture") errors.push(`${s.id}: only a venture can be top level`);
  } else {
    const parent = spheres.get(s.parent);
    if (!parent) errors.push(`${s.id}: parent ${s.parent} not found`);
    else if (parent.kind !== "venture") errors.push(`${s.id}: spheres sit inside ventures, not inside a ${parent.kind}`);
    const seen = new Set([s.id]);
    for (let p = parent; p; p = spheres.get(p.parent)) {
      if (seen.has(p.id)) { errors.push(`${s.id}: its parents form a loop`); break; }
      seen.add(p.id);
    }
  }
  if (s.stage && s.kind !== "venture") errors.push(`${s.id}: stage applies to ventures only`);
  if (s.legal_form && s.stage !== "company") errors.push(`${s.id}: legal_form applies to ventures at the company stage only`);
  for (const l of s.links ?? []) if (!spheres.has(l.to)) errors.push(`${s.id}: link to unknown sphere ${l.to}`);
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
const top = [...spheres.values()].filter((s) => s.parent === null).length;
console.log(`${spheres.size} spheres (${top} top-level ventures): all cross-sphere rules hold.`);
