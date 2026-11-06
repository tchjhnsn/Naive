// Checks each venture's departments (EE-047): every id in venture.json `departments` is in the
// catalog (packages/naive/src/functions/departments.json) and has at least one folder; every department folder
// holds a department.json whose tags match the catalog, is named for its department, sits
// directly under departments/ or under the grouping folder for its place in the value chain, and
// is listed in `departments`. A venture with no departments passes: they are imported only when
// needed (EE-048).
//
//   node packages/naive/src/checks/check-departments.mjs <workspace or venture dir>

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { catalog, foldersOf } from "../engine/departments.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node packages/naive/src/checks/check-departments.mjs <workspace or venture dir>"); process.exit(2); }
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
const byId = new Map(catalog().map((d) => [d.id, d]));
const errors = [];
let ventures = 0, folders = 0;
for (const v of walk(dir)) {
  const venture = JSON.parse(readFileSync(join(v, "venture.json"), "utf8"));
  const listed = venture.departments ?? [];
  const found = foldersOf(v);
  if (!listed.length && !found.length) continue;
  ventures++;
  for (const id of listed) {
    if (!byId.has(id)) errors.push(`${venture.id}: departments lists ${id}, which is not in packages/naive/src/functions/departments.json`);
    else if (!found.some((f) => f.tag?.department === id)) errors.push(`${venture.id}: ${id} is listed but has no folder (node packages/naive/src/engine/add-department.mjs ${v} ${id})`);
  }
  for (const f of found) {
    folders++;
    const where = `${venture.id}: ${f.path}`;
    if (!f.tag) { errors.push(`${where} has no department.json`); continue; }
    const d = byId.get(f.tag.department);
    if (!d) { errors.push(`${where}: unknown department ${f.tag.department}`); continue; }
    if (f.folder !== d.id) errors.push(`${where}: folder is named ${f.folder} but holds ${d.id}`);
    if (f.tag.value_chain !== d.value_chain) errors.push(`${where}: value_chain ${f.tag.value_chain}, the catalog says ${d.value_chain}`);
    if (f.tag.apqc !== d.apqc.id) errors.push(`${where}: apqc ${f.tag.apqc}, the catalog says ${d.apqc.id}`);
    if (f.group && f.group !== d.value_chain) errors.push(`${where}: grouped under ${f.group}/ but ${d.id} is a ${d.value_chain} activity`);
    if (!listed.includes(d.id)) errors.push(`${where}: ${d.id} is not in venture.json departments`);
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`departments: ${ventures} venture(s), ${folders} folder(s), all match the catalog`);
