// Checks the data model (schema/data-model.json) and the kit manifests against the
// repository (EE-018). Rules: record type ids are unique and owned by a known layer;
// every JSON file in the repo is a record of some type (or ignored with a reason), and
// every schema file governs one (or is a part one $refs); each reference names a known record type and a check
// that exists, or says that nothing checks it yet; every layer has a kit at <layer>/kit.json and may hold more under <layer>/kits/; each record
// type is owned by exactly one kit, of its own layer; kits read and write only known
// types owned by other kits; every SKILL.md belongs to exactly one kit.
//
//   node schema/check-data-model.mjs          check, and list unchecked references
//   node schema/check-data-model.mjs --md     print the layer relationships derived from the kits
//
// Layer relationships are never written by hand: they come from each kit's reads and writes.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

// EE_ROOT points the check at another copy of the repository (used by schema/test.mjs).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const model = load("schema/data-model.json");
const errors = [];
const warnings = [];

const files = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
  [".git", "node_modules"].includes(e.name) ? [] : e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]);
const all = files(".").map((f) => relative(".", f));
const glob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*") + "$");
const matches = (g) => all.filter((f) => glob(g).test(f));

// Record types.
const types = new Map();
const layers = new Set(["system", ...model.layers]);
for (const r of model.records) {
  if (types.has(r.id)) errors.push(`data model: duplicate record type ${r.id}`);
  types.set(r.id, r);
  if (!layers.has(r.layer)) errors.push(`${r.id}: unknown layer ${r.layer}`);
  if (r.schema && !existsSync(join(root, r.schema))) errors.push(`${r.id}: schema ${r.schema} not found`);
  r.files = [...new Set(r.paths.flatMap(matches))];
  if (!r.files.length) warnings.push(`${r.id}: no records yet at ${r.paths.join(", ")}`);
}
for (const r of types.values()) for (const ref of r.refs ?? []) {
  if (!ref.to.startsWith("(") && !types.has(ref.to)) errors.push(`${r.id}.${ref.field}: refers to unknown record type ${ref.to}`);
  if (ref.checked_by && !existsSync(join(root, ref.checked_by))) errors.push(`${r.id}.${ref.field}: check ${ref.checked_by} not found`);
  if (!ref.checked_by) warnings.push(`${r.id}.${ref.field} -> ${ref.to}: nothing checks this reference yet`);
}
for (const c of model.records.filter((r) => r.contains)) for (const t of c.contains) if (!types.has(t)) errors.push(`${c.id}: contains unknown record type ${t}`);

// Every JSON file is a record of some type; every schema file governs one.
const claimed = new Set([...types.values()].flatMap((r) => r.files));
const ignored = new Set(model.ignore.map((i) => i.path));
const schemas = new Set([...types.values()].map((r) => r.schema).filter(Boolean));
// A schema that a named schema $refs (a shared part, such as the validation evidence item) counts as named.
for (const s of [...schemas]) for (const m of readFileSync(join(root, s), "utf8").matchAll(/"\$ref":\s*"([a-z0-9-]+\.schema\.json)/g)) schemas.add(`schema/${m[1]}`);
for (const f of all.filter((f) => f.endsWith(".json"))) {
  if (f.endsWith(".schema.json")) { if (!schemas.has(f)) errors.push(`${f}: a schema no record type names`); continue; }
  if (!claimed.has(f) && !ignored.has(f)) errors.push(`${f}: no record type in schema/data-model.json covers this file`);
}

// Decision classes a record type names must exist in the decision-rights template (EE-032).
const classIds = new Set(load("governance/venture-template/decision-rights.json").classes.map((c) => c.id));
for (const r of types.values()) if (r.decision_class && !classIds.has(r.decision_class)) errors.push(`${r.id}: unknown decision class ${r.decision_class}`);

// Kits.
// Each layer has one kit at <layer>/kit.json and may hold more at <layer>/kits/<kit>/kit.json (EE-026).
const kitFiles = [...model.layers.map((l) => `${l}/kit.json`), "schema/kit.json", ...all.filter((f) => /^[a-z]+\/kits\/[^/]+\/kit\.json$/.test(f))];
const kits = new Map();
const owner = new Map();
for (const p of kitFiles) {
  if (!existsSync(join(root, p))) { errors.push(`${p}: missing; every layer has a kit`); continue; }
  const k = load(p);
  const folderLayer = p === "schema/kit.json" ? "system" : p.split("/")[0];
  if (k.layer !== folderLayer) errors.push(`${p}: layer says ${k.layer}`);
  kits.set(k.kit, k);
  for (const t of k.records) {
    if (!types.has(t)) { errors.push(`${k.kit}: owns unknown record type ${t}`); continue; }
    if (owner.has(t)) errors.push(`${t}: owned by both ${owner.get(t)} and ${k.kit}`);
    owner.set(t, k.kit);
    if (types.get(t).layer !== k.layer) errors.push(`${k.kit}: owns ${t}, which the data model gives to ${types.get(t).layer}`);
  }
  for (const c of k.checks) if (!existsSync(join(root, c))) errors.push(`${k.kit}: check ${c} not found`);
}
for (const t of types.keys()) if (!owner.has(t)) errors.push(`${t}: no kit owns this record type`);
for (const k of kits.values()) for (const rel of ["reads", "writes"]) for (const t of k[rel]) {
  if (!types.has(t)) errors.push(`${k.kit}: ${rel} unknown record type ${t}`);
  else if (owner.get(t) === k.kit) errors.push(`${k.kit}: ${rel} ${t}, which it owns; list only other kits' records`);
}
for (const k of kits.values()) if (k.product) {
  const [v, id] = k.product.split("/");
  const card = all.find((f) => f.endsWith(`/${v}/products/${id}.json`));
  if (!card) errors.push(`${k.kit}: product card ${k.product} not found`);
}

// Skills: each SKILL.md belongs to exactly one kit.
const skillFiles = all.filter((f) => /(^|\/)SKILL\.md$/.test(f) && !f.includes("/_archive/") && model.layers.includes(f.split("/")[0]));
const listed = new Map();
for (const k of kits.values()) for (const s of k.skills) {
  if (!existsSync(join(root, s.path))) errors.push(`${k.kit}/${s.id}: ${s.path} not found`);
  if (listed.has(s.path)) errors.push(`${s.path}: listed by ${listed.get(s.path)} and ${k.kit}`);
  listed.set(s.path, k.kit);
  if (k.layer === "operations" && !s.tier) errors.push(`${k.kit}/${s.id}: an operations skill names the MAD tier it serves`);
  if (k.layer !== "operations" && s.tier) errors.push(`${k.kit}/${s.id}: tiers belong to operations skills only`);
  if (s.move_to && !kits.has(s.move_to)) errors.push(`${k.kit}/${s.id}: move_to unknown kit ${s.move_to}`);
}
for (const f of skillFiles) if (!listed.has(f)) errors.push(`${f}: no kit lists this skill`);

// Layer relationships, derived.
const layerOf = (t) => kits.get(owner.get(t))?.layer;
const edges = new Map();
const edge = (from, to, t) => { if (!from || from === to) return; const key = `${from}>${to}`; edges.set(key, [...(edges.get(key) ?? []), t]); };
for (const k of kits.values()) {
  for (const t of k.reads) edge(layerOf(t), k.layer, t);
  for (const t of k.writes) edge(k.layer, layerOf(t), t);
}

if (process.argv.includes("--md")) {
  const order = [...model.layers, "system"];
  const rows = order.map((l) => {
    const k = [...kits.values()].find((x) => x.layer === l);
    const from = [...edges].filter(([e]) => e.endsWith(`>${l}`)).map(([e, ts]) => `${e.split(">")[0]} (${[...new Set(ts)].join(", ")})`);
    const to = [...edges].filter(([e]) => e.startsWith(`${l}>`)).map(([e, ts]) => `${e.split(">")[1]} (${[...new Set(ts)].join(", ")})`);
    return `| ${l} | ${k?.skills.length ?? 0} | ${k?.records.join(", ") || "none"} | ${from.join("; ") || "none"} | ${to.join("; ") || "none"} |`;
  });
  console.log([
    "### Layer relationships (generated by `node schema/check-data-model.mjs --md`)",
    "",
    "Each arrow is a record type one layer owns and another reads, or one layer writes into another. A reader depends on the owner: change the owner's record and the reader's checks run.",
    "",
    "| Layer | Skills | Owns | Takes from | Gives to |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
    "",
    "```mermaid",
    "flowchart LR",
    ...[...edges].map(([e, ts]) => `  ${e.split(">")[0]} -->|${[...new Set(ts)].join(", ")}| ${e.split(">")[1]}`),
    "```",
  ].join("\n"));
  process.exit(0);
}

for (const w of warnings) console.log(`warn  ${w}`);
if (errors.length) { for (const e of errors) console.error(`FAIL  ${e}`); process.exit(1); }
const moves = [...kits.values()].flatMap((k) => k.skills.filter((s) => s.move_to)).length;
console.log(`${types.size} record types, ${claimed.size} record files, ${kits.size} kits, ${listed.size} skills (${moves} proposed moves): the data model and kits hold.`);
