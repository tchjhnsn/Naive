// Creates an empty venture: its folder, one folder per starting layer, products/,
// accounts/, the three pillars as stubs pointing to their guides (EE-010), a venture profile and a venture.json to fill in
// (EE-011). Starting layers come from scaffold/defaults.json, by phase (EE-012).
//
//   node schema/init-venture.mjs <dir> <id> [--phase discovery] [--parent <id>] [--legal-form llc]
//
// Writes nothing over an existing venture.json.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const { layers, formalized, pillars, readme } = JSON.parse(readFileSync(join(here, "scaffold/defaults.json"), "utf8"));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args.splice(i, 2)[1]; };
const phase = flag("phase") ?? "discovery", parent = flag("parent"), legalForm = flag("legal-form");
const [dir, id] = args;
if (!dir || !id) { console.error("usage: node schema/init-venture.mjs <dir> <id> [--phase discovery] [--parent <id>] [--legal-form llc]"); process.exit(2); }
if (!layers[phase]) { console.error(`unknown phase ${phase}: one of ${Object.keys(layers).join(", ")}`); process.exit(2); }
if (existsSync(join(dir, "venture.json"))) { console.error(`${dir}/venture.json already exists`); process.exit(1); }

const on = [...layers[phase], ...(legalForm && legalForm !== "none" ? formalized : [])];
mkdirSync(dir, { recursive: true });
const venture = { id, name: id, parent: parent ?? null, phase };
if (legalForm) venture.form = { legal_form: legalForm };
if (phase !== "discovery") venture.core = { promise: "", promised_to: "", must_not: "", competence: "" };
Object.assign(venture, { owner: "self", status: "active", profile: "profile.md", layers: {} });
for (const layer of ["purpose", "knowledge", "operations", "execution", "evidence", "governance", "interface"]) {
  if (!on.includes(layer)) { if (!["governance", "interface"].includes(layer)) venture.layers[layer] = false; continue; }
  mkdirSync(join(dir, layer), { recursive: true });
  writeFileSync(join(dir, layer, "README.md"), `# ${layer}\n\n${readme[layer]}\n`);
  venture.layers[layer] = { location: `${layer}/` };
}
for (const sub of ["products", "accounts"]) { mkdirSync(join(dir, sub), { recursive: true }); writeFileSync(join(dir, sub, ".gitkeep"), ""); }
mkdirSync(join(dir, "pillars"), { recursive: true });
for (const [name, what] of Object.entries(pillars.stubs)) {
  const guide = relative(join(dir, "pillars"), join(repo, pillars.guides, `${name}.md`));
  writeFileSync(join(dir, "pillars", `${name}.md`), `# ${name[0].toUpperCase() + name.slice(1)} pillar\n\n${what}\n\nGuide: [${name} pillar](${guide})\n`);
}
writeFileSync(join(dir, "profile.md"), `# ${id}\n\nWhat this venture is, in a few sentences. Its machine fields are in venture.json (EE-011).\n\n## Changelog\n`);
writeFileSync(join(dir, "venture.json"), JSON.stringify(venture, null, 2) + "\n");
console.log(`created venture ${id} (${phase}) in ${dir} with ${on.join(", ")}, products/, accounts/ and the three pillars.${venture.core ? " Fill in the core product before ranking products." : ""}`);
