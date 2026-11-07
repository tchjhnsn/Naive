// Checks the data model (packages/naive/src/records/data-model.json), the layer manifests and the venture
// packages against the repository (EE-018, EE-071). Rules: record type ids are unique and
// owned by a known layer; every JSON file in the repo is a record of some type (or ignored
// with a reason), and every schema file governs one (or is a part one $refs); each reference
// names a known record type and a check that exists, or says that nothing checks it yet;
// every layer has a manifest at <layer>/layer.json; each record type is owned by exactly one
// layer or one package; a layer that owns a record is of that record's layer; a package
// declares use_model (an array, empty when it calls no model) and at most one skill;
// layers and packages read and write only known types they do not own; a package's signal listeners pass the
// listener schema and name their consumers; every SKILL.md
// belongs to exactly one layer or package; a record type is a log exactly when its form is
// json-lines, and every file in an example venture has a kind (record, log or derived), from its
// record type or from the data model's files entries.
//
//   node packages/naive/src/checks/check-data-model.mjs          check, and list unchecked references
//   node packages/naive/src/checks/check-data-model.mjs --md     print the layer relationships derived from the manifests
//
// Layer relationships are never written by hand: they come from each manifest's reads and writes.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";
import { globRegExp, pathKind, recordsIn } from "../records/index.mjs";
import { validateValue } from "../records/validate.mjs";

// EE_ROOT points the check at another copy of the repository (used by packages/naive/src/checks/test.mjs).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
const GAPS = new Set(existsSync(join(root, "packages/naive/src/engine/generators/gaps.json")) ? JSON.parse(readFileSync(join(root, "packages/naive/src/engine/generators/gaps.json"), "utf8")).gaps : []);
const load = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
// The record types of the copy being checked, so EE_ROOT reads that copy's schemas and data model.
const records = recordsIn(root);
const model = records.readDataModel();
const errors = [];
const warnings = [];

const files = (dir) => readdirSync(join(root, dir), { withFileTypes: true }).flatMap((e) =>
  [".git", "node_modules", ".naive"].includes(e.name) ? [] : e.isDirectory() ? files(ventureFile(dir, e.name)) : [ventureFile(dir, e.name)]);
// The files git would track (so build output and installed packages under .gitignore are left out); a
// copy outside git, as the tests use, is walked instead.
const tracked = spawnSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" });
const all = tracked.status === 0 && tracked.stdout.trim() && !process.env.EE_ROOT ? tracked.stdout.trim().split("\n").filter((f) => existsSync(join(root, f))) : files(".").map((f) => relative(".", f));
const matches = (g) => all.filter((f) => globRegExp(g).test(f));

// Record types.
const types = new Map();
const layers = new Set(["system", ...model.layers]);
for (const r of model.records) {
  if (types.has(r.id)) errors.push(`data model: duplicate record type ${r.id}`);
  types.set(r.id, r);
  if (!layers.has(r.layer)) errors.push(`${r.id}: unknown layer ${r.layer}`);
  if (r.schema && !existsSync(records.recordPath(r.schema))) errors.push(`${r.id}: schema ${r.schema} not found`);
  // EE-099: a record generator beside each schema. gaps.json lists the types still without one; it only shrinks.
  if (r.generator && !existsSync(join(root, r.generator))) errors.push(`${r.id}: generator ${r.generator} not found`);
  if (!r.generator && !GAPS.has(r.id)) errors.push(`${r.id}: names no record generator (EE-099): add packages/naive/src/engine/generators/${r.id}.ts and the generator field`);
  if (r.generator && GAPS.has(r.id)) errors.push(`${r.id}: has a generator, so remove it from packages/naive/src/engine/generators/gaps.json`);
  r.files = [...new Set(r.paths.flatMap(matches))];
  if (!r.files.length) warnings.push(`${r.id}: no records yet at ${r.paths.join(", ")}`);
}
for (const r of types.values()) for (const ref of r.refs ?? []) {
  if (!ref.to.startsWith("(") && !types.has(ref.to)) errors.push(`${r.id}.${ref.field}: refers to unknown record type ${ref.to}`);
  if (ref.checked_by && !existsSync(join(root, ref.checked_by))) errors.push(`${r.id}.${ref.field}: check ${ref.checked_by} not found`);
  if (!ref.checked_by) warnings.push(`${r.id}.${ref.field} -> ${ref.to}: nothing checks this reference yet`);
}
// Kinds (hosted working copy design, section 2): an append-only record type is a log, and a log is append-only.
for (const r of types.values()) if ((r.form === "json-lines") !== (r.kind === "log")) errors.push(`${r.id}: kind ${r.kind ?? "record"} with form ${r.form ?? "json"}; a record type is a log exactly when its form is json-lines`);
// Every file in an example venture has a kind, read by its logical path (the path inside the venture folder).
for (const f of all) {
  const at = f.match(/^packages\/naive\/src\/records\/examples\/[^/]+\/ventures\/[^/]+\/(.+)$/);
  if (!at) continue;
  try {
    if (!pathKind(at[1], model)) errors.push(`${f}: no kind; no record type or files entry in packages/naive/src/records/data-model.json names it`);
  } catch (e) { errors.push(`${f}: ${/** @type {Error} */ (e).message}`); }
}
for (const c of model.records.filter((r) => r.contains)) for (const t of c.contains) if (!types.has(t)) errors.push(`${c.id}: contains unknown record type ${t}`);

// Every JSON file is a record of some type; every schema file governs one.
const claimed = new Set([...types.values()].flatMap((r) => r.files));
// An ignore path may be a glob (`*` within a folder, `**/` across folders), as record type paths are.
const ignorePatterns = model.ignore.map((i) => globRegExp(i.path));
const isIgnored = (f) => ignorePatterns.some((re) => re.test(f));
// Schemas are compared by absolute file, so a stored path and a tracked path name the same file wherever the record types sit.
const schemas = new Set([...types.values()].map((r) => r.schema).filter(Boolean).map((s) => records.recordPath(s)));
// A schema that a named schema $refs (a shared part, such as the validation evidence item) counts as named.
for (const s of [...schemas]) for (const m of readFileSync(s, "utf8").matchAll(/"\$ref":\s*"([a-z0-9-]+\.schema\.json)/g)) schemas.add(join(dirname(s), m[1]));
for (const f of all.filter((f) => f.endsWith(".json"))) {
  if (f.endsWith(".schema.json")) { if (!schemas.has(join(root, f))) errors.push(`${f}: a schema no record type names`); continue; }
  if (!claimed.has(f) && !isIgnored(f)) errors.push(`${f}: no record type in packages/naive/src/records/data-model.json covers this file`);
}

// Decision classes a record type names must exist in the decision-rights template (EE-032).
const classIds = new Set(load("packages/naive/template/governance/decision-rights.json").classes.map((c) => c.id));
for (const r of types.values()) if (r.decision_class && !classIds.has(r.decision_class)) errors.push(`${r.id}: unknown decision class ${r.decision_class}`);

// Layers and packages (EE-071). A layer manifest is packages/naive/src/records/layers/<layer>/layer.json. A package that lists
// `records` owns those record types (the validation package absorbed the old validation kit).
const layerFiles = [...model.layers.map((l) => `packages/naive/src/records/layers/${l}/layer.json`), "packages/naive/src/records/layer.json"];
const packageFiles = all.filter((f) => /^packages\/naive\/library\/packages\/[^/]+\/package\.json$/.test(f));
const skillsOf = (k) => [...(k.skills ?? []), ...(k.skill ? [k.skill] : [])];
const kits = new Map();
const owner = new Map();
const own = (id, t, k, p) => {
  if (!types.has(t)) { errors.push(`${id}: owns unknown record type ${t}`); return; }
  if (owner.has(t)) errors.push(`${t}: owned by both ${owner.get(t)} and ${id}`);
  owner.set(t, id);
  if (k.layer && types.get(t).layer !== k.layer) errors.push(`${id}: owns ${t}, which the data model gives to ${types.get(t).layer}`);
  if (!k.layer && p.startsWith("packages/naive/library/packages/")) errors.push(`${id}: owns ${t} but names no layer`);
};
for (const p of layerFiles) {
  if (!existsSync(join(root, p))) { errors.push(`${p}: missing; every layer has a manifest`); continue; }
  const k = { ...load(p), path: p };
  const folderLayer = p === "packages/naive/src/records/layer.json" ? "system" : p.split("/").at(-2);
  if (k.layer !== folderLayer) errors.push(`${p}: layer says ${k.layer}`);
  const id = k.name ?? k.kit;
  kits.set(id, k);
  for (const t of k.records ?? []) own(id, t, k, p);
  for (const c of k.checks ?? []) if (!existsSync(join(root, c))) errors.push(`${id}: check ${c} not found`);
}
for (const p of packageFiles) {
  const k = { ...load(p), path: p };
  if (!Array.isArray(k.use_model)) errors.push(`${p}: a package declares use_model, an array, empty when it calls no model`);
  if (skillsOf(k).length > 1) errors.push(`${p}: a package has at most one skill`);
  const id = k.name;
  if ((k.records ?? []).length) {
    kits.set(id, k);
    for (const t of k.records) own(id, t, k, p);
  }
  for (const c of k.checks ?? []) if (!existsSync(join(root, c))) errors.push(`${id}: check ${c} not found`);
  if (k.skill && !existsSync(join(root, k.skill.path))) errors.push(`${id}: skill ${k.skill.path} not found`);
  if (k.template_dir && !existsSync(join(root, k.template_dir))) errors.push(`${id}: template dir ${k.template_dir} not found`);
  // A package's signal listeners (signal library design): each passes packages/naive/src/records/listener.schema.json,
  // names its consumer, and has an id no other listener of the package has.
  const listenerIds = new Set();
  for (const l of k.listeners ?? []) {
    const v = validateValue("listener.schema.json", l);
    if (v.status !== 0) errors.push(`${id}: listener ${l?.id ?? "(no id)"}: ${(v.stdout + v.stderr).trim().split("\n").join("; ")}`);
    if (l && typeof l === "object" && !("consumer" in l)) errors.push(`${id}: listener ${l.id}: a package's listener names its consumer`);
    if (listenerIds.has(l?.id)) errors.push(`${id}: listener ${l.id} is defined twice`);
    listenerIds.add(l?.id);
  }
}
for (const t of types.keys()) if (!owner.has(t)) errors.push(`${t}: no layer or package owns this record type`);
for (const k of kits.values()) for (const rel of ["reads", "writes"]) for (const t of k[rel] ?? []) {
  const id = k.name ?? k.kit;
  if (!types.has(t)) errors.push(`${id}: ${rel} unknown record type ${t}`);
  else if (owner.get(t) === id) errors.push(`${id}: ${rel} ${t}, which it owns; list only records owned elsewhere`);
}
for (const k of kits.values()) if (k.product) {
  const id = k.name ?? k.kit;
  const [v, pid] = k.product.split("/");
  const card = all.find((f) => f.endsWith(`/${v}/products/${pid}.json`) || f.endsWith(`/${v}/product/${pid}.json`));
  if (!card) errors.push(`${id}: product card ${k.product} not found`);
}

// Skills: each SKILL.md belongs to exactly one layer or package.
const skillFiles = all.filter((f) => /(^|\/)SKILL\.md$/.test(f) && !f.includes("/_archive/") && (model.layers.includes(f.split("/")[0]) || /^packages\/naive\/src\/(functions|interfaces)\//.test(f)));
const listed = new Map();
for (const k of kits.values()) for (const s of skillsOf(k)) {
  const id = k.name ?? k.kit;
  if (!existsSync(join(root, s.path))) errors.push(`${id}/${s.id}: ${s.path} not found`);
  if (listed.has(s.path)) errors.push(`${s.path}: listed by ${listed.get(s.path)} and ${id}`);
  listed.set(s.path, id);
  if (s.move_to && !kits.has(s.move_to)) errors.push(`${id}/${s.id}: move_to unknown owner ${s.move_to}`);
}
for (const f of skillFiles) if (!listed.has(f)) errors.push(`${f}: no layer or package lists this skill`);

// Layer relationships, derived. The layer is the record type's layer (EE-071).
const layerOf = (t) => types.get(t)?.layer;
const edges = new Map();
const edge = (from, to, t) => { if (!from || from === to) return; const key = `${from}>${to}`; edges.set(key, [...(edges.get(key) ?? []), t]); };
for (const k of kits.values()) {
  for (const t of k.reads ?? []) edge(layerOf(t), k.layer, t);
  for (const t of k.writes ?? []) edge(k.layer, layerOf(t), t);
}

if (process.argv.includes("--md")) {
  const order = [...model.layers, "system"];
  // Confidential record types (Mentura's research engine) never appear in generated docs.
  const shown = (t) => !types.get(t)?.confidential;
  const rows = order.map((l) => {
    const k = [...kits.values()].find((x) => x.layer === l && String(x.path).endsWith("/layer.json"));
    const from = [...edges].filter(([e]) => e.endsWith(`>${l}`)).map(([e, ts]) => `${e.split(">")[0]} (${[...new Set(ts)].join(", ")})`);
    const to = [...edges].filter(([e]) => e.startsWith(`${l}>`)).map(([e, ts]) => `${e.split(">")[1]} (${[...new Set(ts)].join(", ")})`);
    return `| ${l} | ${k?.skills.length ?? 0} | ${k?.records.filter(shown).join(", ") || "none"} | ${from.join("; ") || "none"} | ${to.join("; ") || "none"} |`;
  });
  console.log([
    "### Layer relationships (generated by `node packages/naive/src/checks/check-data-model.mjs --md`)",
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
const moves = [...kits.values()].flatMap((k) => skillsOf(k).filter((s) => s.move_to)).length;
const layerCount = layerFiles.filter((p) => existsSync(join(root, p))).length;
console.log(`${types.size} record types, ${claimed.size} record files, ${layerCount} layers, ${packageFiles.length} packages, ${listed.size} skills (${moves} proposed moves): the data model holds.`);
