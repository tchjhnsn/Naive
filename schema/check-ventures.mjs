// Checks the rules across a workspace's ventures that one venture.json alone cannot
// (EE-011, EE-012). Validate each file against its schema first; this checks how they fit.
//
//   node schema/check-ventures.mjs <dir>
//
// Rules: venture ids are unique; every parent exists; no venture is its own ancestor;
// links point at known ventures; within a venture, product ids are unique, flows_to and
// a client's products and a product's part_of name that venture's own products, and a
// product's scope names its layer or tier. Warns when a formalized venture
// (a legal form, or other members) has no governance layer.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-ventures.mjs <dir>"); process.exit(2); }
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [join(d, e.name)] : []);
const jsonIn = (d) => existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => join(d, f)) : [];
const clientsIn = (d) => existsSync(d) ? readdirSync(d).map((c) => join(d, c, "client.json")).filter(existsSync) : [];

const ventures = new Map();
const errors = [], warnings = [];
for (const f of walk(dir)) {
  const v = load(f);
  if (ventures.has(v.id)) errors.push(`${f}: duplicate venture id ${v.id}`);
  const root = dirname(f);
  ventures.set(v.id, { ...v, products: jsonIn(join(root, "products")).map(load), clients: clientsIn(join(root, "clients")).map(load) });
}
if (!ventures.size) { console.error(`no venture.json found under ${dir}`); process.exit(1); }

for (const v of ventures.values()) {
  if (v.parent !== null) {
    if (!ventures.has(v.parent)) errors.push(`${v.id}: parent ${v.parent} not found`);
    const seen = new Set([v.id]);
    for (let p = ventures.get(v.parent); p; p = ventures.get(p.parent)) {
      if (seen.has(p.id)) { errors.push(`${v.id}: its parents form a loop`); break; }
      seen.add(p.id);
    }
  }
  for (const l of v.links ?? []) if (!ventures.has(l.to)) errors.push(`${v.id}: link to unknown venture ${l.to}`);
  const ids = new Set();
  for (const p of v.products) {
    if (ids.has(p.id)) errors.push(`${v.id}: duplicate product id ${p.id}`);
    ids.add(p.id);
  }
  for (const p of v.products) for (const t of p.flows_to ?? []) if (!ids.has(t)) errors.push(`${v.id}/${p.id}: flows_to unknown product ${t}`);
  for (const p of v.products) for (const k of p.part_of ?? []) if (!ids.has(k)) errors.push(`${v.id}/${p.id}: part_of unknown product ${k}`);
  for (const p of v.products) {
    const sc = p.scope;
    if (sc?.level === "layer" && !sc.layer) errors.push(`${v.id}/${p.id}: a layer-scoped product names its layer`);
    if (sc?.level === "tier" && (!sc.tier || (sc.layer && sc.layer !== "operations"))) errors.push(`${v.id}/${p.id}: a tier-scoped product names its tier, which sits in the operations layer`);
  }
  for (const c of v.clients) for (const t of c.products ?? []) if (!ids.has(t)) errors.push(`${v.id}/clients/${c.id}: buys unknown product ${t}`);
  const formal = (v.form?.legal_form && v.form.legal_form !== "none") || (v.members?.length ?? 0) > 0;
  if (formal && !v.layers.governance) warnings.push(`${v.id}: formalized (legal form or members) but has no governance layer`);
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
const count = (k) => [...ventures.values()].reduce((n, v) => n + v[k].length, 0);
console.log(`${ventures.size} ventures, ${count("products")} products, ${count("clients")} clients: all cross-venture rules hold.`);
