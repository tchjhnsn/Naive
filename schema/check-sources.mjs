// Checks each venture's source map (<venture>/knowledge/sources.json, EE-037) for what its schema
// cannot state: source ids are unique; each names a connector in the registry
// (knowledge/tooling/integrations.json) and a write mode that connector supports; a GitHub source
// names its repository; every record type it maps is a venture record type and goes to a source
// it lists. The venture, its provenance log and the map itself stay in the venture folder, so they
// cannot be mapped away. It does not connect to any source: the connector evals do that.
//
//   node schema/check-sources.mjs <workspace or venture dir>

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LOCAL, MAP, registry } from "../knowledge/connectors/index.mjs";
import { ANY, CONTEXT, specificity } from "../knowledge/connectors/resolve.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-sources.mjs <workspace or venture dir>"); process.exit(2); }
const root = new URL("..", import.meta.url).pathname;
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
const model = JSON.parse(readFileSync(join(root, "schema/data-model.json"), "utf8"));
const ventureTypes = new Set(model.records.filter((r) => r.level === "venture").map((r) => r.id));
const PINNED = new Set(["venture", "provenance", "knowledge-sources"]);
const reg = registry();
// The systems a function's truth can live in (EE-083); a connected one must have code that reads it.
const catalog = JSON.parse(readFileSync(join(root, "schema/systems-catalog.json"), "utf8"));
const errors = [];
let maps = 0;

for (const v of walk(dir)) {
  const f = join(v, MAP);
  if (!existsSync(f)) continue;
  maps++;
  const id = JSON.parse(readFileSync(join(v, "venture.json"), "utf8")).id;
  const m = JSON.parse(readFileSync(f, "utf8"));
  const ids = new Set([LOCAL]);
  for (const s of m.sources ?? []) {
    const where = `${id}: source ${s.id}`;
    if (ids.has(s.id)) errors.push(`${where}: duplicate id${s.id === LOCAL ? " (venture is the venture's own folder)" : ""}`);
    ids.add(s.id);
    const c = reg.get(s.connector);
    if (!c) { errors.push(`${where}: no connector ${s.connector} (the registry has ${[...reg.keys()].join(", ")})`); continue; }
    if (s.writes && !c.writes.includes(s.writes)) errors.push(`${where}: ${s.connector} writes ${c.writes.join(" or ")}, not ${s.writes}`);
    if (s.connector === "github" && !s.repo) errors.push(`${where}: a github source names its repo`);
    for (const k of Object.keys(s).filter((k) => !["id", "connector", "writes", "note"].includes(k))) if (!(c.options ?? []).includes(k)) errors.push(`${where}: ${s.connector} takes no option ${k}`);
  }
  for (const [type, src] of Object.entries(m.records ?? {})) {
    if (!ventureTypes.has(type)) errors.push(`${id}: ${type} is not a venture record type`);
    if (PINNED.has(type)) errors.push(`${id}: ${type} stays in the venture folder`);
    if (!ids.has(src)) errors.push(`${id}: ${type} goes to ${src}, which is not one of its sources`);
  }
  // The matrix (EE-042): every rule names a known record type and a known source, and two rules
  // that can hold at once never tie. Product and account ids are not checked here: those records
  // may themselves live in another source.
  const rules = m.rules ?? [];
  rules.forEach((rule, i) => {
    const where = `${id}: rule ${i + 1} (${rule.record}${rule.attribute !== ANY ? `.${rule.attribute}` : ""})`;
    if (!ventureTypes.has(rule.record)) errors.push(`${where}: ${rule.record} is not a venture record type`);
    if (PINNED.has(rule.record)) errors.push(`${where}: ${rule.record} stays in the venture folder`);
    if (!ids.has(rule.system_of_record)) errors.push(`${where}: system of record ${rule.system_of_record} is not one of its sources`);
    for (const s of rule.survivorship?.also_in ?? []) if (!ids.has(s) || s === rule.system_of_record) errors.push(`${where}: survivorship names ${s}, which is not another of its sources`);
  });
  for (const [fn, f] of Object.entries(m.functions ?? {})) for (const s of f.systems) {
    const sys = catalog.systems[s.system];
    if (!sys) { errors.push(`${id}: ${fn} keeps its truth in ${s.system}, which is not in schema/systems-catalog.json`); continue; }
    if (s.status === "connected" && !sys.connect) errors.push(`${id}: ${fn} says ${s.system} is connected, but no code reads ${sys.label} yet; it is pointed`);
    if (s.source && !ids.has(s.source)) errors.push(`${id}: ${fn} names source ${s.source}, which is not in sources`);
  }
  const overlap = (a, b) => a.record === b.record && ["attribute", ...CONTEXT].every((k) => a[k] === ANY || b[k] === ANY || a[k] === b[k]);
  for (let i = 0; i < rules.length; i++) for (let j = i + 1; j < rules.length; j++)
    if (overlap(rules[i], rules[j]) && specificity(rules[i]) === specificity(rules[j]) && rules[i].attribute === rules[j].attribute)
      errors.push(`${id}: rules ${i + 1} and ${j + 1} (${rules[i].record}) can both hold and tie at the same specificity; narrow one`);
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${maps} source maps: every source has a connector, every record type a source, every function's systems are known, and no two matrix rules tie.`);
