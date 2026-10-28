// Imports one department into a venture (EE-047, EE-048): lists it in venture.json `departments`
// and creates its folders, the operations side always and the governance side when the venture's
// governance layer is on. Nothing else is created, so a venture holds only what it uses.
//
//   node schema/add-department.mjs <venture dir> <department id> [--group]
//
// --group puts the folders under primary/ or support/, by the department's place in the value
// chain. The grouping is for looking at only: the department.json tag says what the folder is.
// Writes nothing over an existing folder.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { catalog, foldersOf } from "./departments.mjs";

const args = process.argv.slice(2);
const group = args.includes("--group");
const [dir, id] = args.filter((a) => !a.startsWith("--"));
if (!dir || !id) { console.error("usage: node schema/add-department.mjs <venture dir> <department id> [--group]"); process.exit(2); }
if (!existsSync(join(dir, "venture.json"))) { console.error(`${dir} has no venture.json`); process.exit(2); }
const all = catalog();
const d = all.find((x) => x.id === id);
if (!d) { console.error(`unknown department ${id}: one of ${all.map((x) => x.id).join(", ")}`); process.exit(2); }

const venture = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
const layersOn = ["operations", ...(venture.layers?.governance ? ["governance"] : [])];
const held = foldersOf(dir).filter((f) => f.tag?.department === id).map((f) => f.layer);
const tag = { department: d.id, value_chain: d.value_chain, apqc: d.apqc.id };
const made = [];
for (const layer of layersOn.filter((l) => !held.includes(l))) {
  const rel = join(layer, "departments", ...(group ? [d.value_chain] : []), d.id);
  if (existsSync(join(dir, rel))) { console.error(`${rel} exists without a department.json; add the tag by hand`); process.exit(1); }
  mkdirSync(join(dir, rel), { recursive: true });
  writeFileSync(join(dir, rel, "department.json"), JSON.stringify(tag, null, 2) + "\n");
  const [file, title, what] = layer === "governance"
    ? ["charter.md", "charter", d.governance] : ["README.md", "operations", d.operations];
  writeFileSync(join(dir, rel, file), `# ${d.label}: ${title}\n\nHolds: ${what}.\n\nAPQC ${d.apqc.id} ${d.apqc.name}; value chain: ${d.value_chain} (${d.porter}).\n`);
  made.push(rel);
}
venture.departments = [...new Set([...(venture.departments ?? []), d.id])];
writeFileSync(join(dir, "venture.json"), JSON.stringify(venture, null, 2) + "\n");
console.log(made.length ? `added ${d.label}: ${made.join(", ")}` : `${d.label} is already in ${dir}`);
