#!/usr/bin/env node
// Checks venture types and people (EE-082) in a workspace: a venture's type is in schema/venture-types.json;
// in people/people.json every role is in the role registry and allowed for the venture's type, every hat
// is a function the venture imports, a solo venture has one person who wears every hat, and every
// founder has a file in people/founders/ that agrees with the roster (and the roster lists every file).
//
//   node schema/check-people.mjs <workspace>

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { roles as ROLES, types as TYPES } from "./venture-type.mjs";
import { ventureFile } from "../packages/core/venture-paths.mjs";

const ws = process.argv[2];
if (!ws || !existsSync(ws)) { console.error("usage: node schema/check-people.mjs <workspace>"); process.exit(2); }
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);

const types = new Map(TYPES().map((t) => [t.id, t]));
const roles = new Map(ROLES().map((r) => [r.id, r]));
const errors = [];
let ventures = 0, rosters = 0;
for (const dir of walk(ws)) {
  ventures++;
  const v = load(join(dir, "venture.json"));
  const at = (m) => errors.push(`${v.id}: ${m}`);
  const type = v.type ? types.get(v.type) : null;
  if (v.type && !type) at(`type ${v.type} is not in schema/venture-types.json`);
  const rosterFile = join(ventureFile(dir, "people/people.json"));
  const fdir = join(ventureFile(dir, "people/founders"));
  const files = existsSync(fdir) ? readdirSync(fdir).filter((f) => f.endsWith(".json")) : [];
  if (!existsSync(rosterFile)) { if (files.length) at("people/founders/ has files but there is no people/people.json"); continue; }
  rosters++;
  const roster = load(rosterFile);
  // In the structured layout (EE-086) the org chart is venture.json's functions, and a person's hats are the
  // functions they own there; in the flat layout, the departments venture.json imports, worn as hats in people/.
  const structured = v.layout === "structured";
  const imported = new Set(structured ? Object.keys(v.functions ?? {}) : v.departments ?? []);
  const ids = new Set(roster.people.map((p) => p.id));
  if (structured) {
    for (const [fn, f] of Object.entries(v.functions ?? {})) {
      if (f.owner && !ids.has(f.owner)) at(`venture.json says ${f.owner} owns ${fn}, but people/people.json has no ${f.owner}`);
      for (const c of f.contributors ?? []) if (!ids.has(c) && !roles.has(c)) at(`${fn} names contributor ${c}, who is neither a person in people/ nor a role`);
    }
    for (const p of roster.people) p.hats = Object.entries(v.functions ?? {}).filter(([, f]) => f.owner === p.id).map(([fn]) => fn);
  }
  for (const p of roster.people) {
    const role = roles.get(p.role);
    if (!role) { at(`${p.id} has role ${p.role}, which is not in governance/venture-template/roles/venture-roles.json`); continue; }
    if (type && !type.roles.includes(p.role)) at(`${p.id} is a ${p.role}, which a ${type.label.toLowerCase()} does not have (${type.roles.join(", ")})`);
    for (const h of p.hats ?? []) if (imported.size && !imported.has(h)) at(`${p.id} wears the ${h} hat, but venture.json does not import ${h}`);
    p.hats ??= [];
    if (!role.owns_when_solo && p.hats.length) at(`${p.id} is a ${p.role}, who owns no function, but wears ${p.hats.join(", ")}`);
    if (role.founder) {
      const f = `people/founders/${p.id}.json`;
      if (p.founder_file !== f) at(`${p.id} is a founder, so founder_file is ${f}`);
      else if (!existsSync(ventureFile(dir, f))) at(`${f} is missing`);
      else {
        const rec = load(ventureFile(dir, f));
        if (rec.id !== p.id || rec.role !== p.role) at(`${f} says ${rec.id} is a ${rec.role}; the roster says ${p.id} is a ${p.role}`);
        if (!structured && JSON.stringify([...(rec.hats ?? [])].sort()) !== JSON.stringify([...p.hats].sort())) at(`${f} and the roster disagree on ${p.id}'s hats`);
        if (structured && rec.hats) at(`${f} stores hats; in the structured layout they are read from venture.json`);
        if (rec.agreement && !existsSync(ventureFile(dir, rec.agreement.path))) at(`${f} links a founder agreement at ${rec.agreement.path}, which does not exist`);
      }
    }
  }
  if (roster.mode === "solo") {
    if (roster.people.length !== 1) at(`a solo venture has one person; people/people.json lists ${roster.people.length}`);
    else if (roles.get(roster.people[0].role)?.owns_when_solo && imported.size) {
      const missing = [...imported].filter((h) => !roster.people[0].hats.includes(h));
      if (missing.length) at(`${roster.people[0].id} is alone, so owns every function; missing ${missing.join(", ")}`);
    }
  }
  if (roster.mode === "team" && imported.size) {
    const worn = new Set(roster.people.flatMap((p) => p.hats));
    const unowned = [...imported].filter((h) => !worn.has(h));
    if (unowned.length) at(`no one owns ${unowned.join(", ")}`);
  }
  for (const f of files) if (!roster.people.some((p) => p.founder_file === `people/founders/${f}`)) at(`people/founders/${f} is not in people/people.json`);
}
for (const e of errors) console.log(`FAIL  ${e}`);
console.log(`${ventures} ventures, ${rosters} people rosters: ${errors.length ? `${errors.length} error(s)` : "every role, hat and founder file agrees"}.`);
process.exit(errors.length ? 1 : 0);
