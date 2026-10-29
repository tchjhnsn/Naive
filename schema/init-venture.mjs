// Creates an empty venture: its folder, one folder per starting layer, products/,
// accounts/, the three pillars as stubs pointing to their guides (EE-010), a venture profile and a venture.json to fill in
// (EE-011). Starting layers come from scaffold/defaults.json, by phase (EE-012).
//
//   node schema/init-venture.mjs <dir> <id> [--phase discovery] [--parent <id>] [--legal-form llc] [--layers purpose,governance]
//
// --layers turns on only the layers named, for a builder adopting part of the system (EE-030);
// without it the phase's defaults apply.
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
const phase = flag("phase") ?? "discovery", parent = flag("parent"), legalForm = flag("legal-form"), only = flag("layers");
const [dir, id] = args;
if (!dir || !id) { console.error("usage: node schema/init-venture.mjs <dir> <id> [--phase discovery] [--parent <id>] [--legal-form llc]"); process.exit(2); }
if (!layers[phase]) { console.error(`unknown phase ${phase}: one of ${Object.keys(layers).join(", ")}`); process.exit(2); }
if (existsSync(join(dir, "venture.json"))) { console.error(`${dir}/venture.json already exists`); process.exit(1); }

const ALL = ["purpose", "knowledge", "operations", "evidence", "governance", "interface"];
const on = only !== null ? only.split(",").filter(Boolean) : [...layers[phase], ...(legalForm && legalForm !== "none" ? formalized : [])];
const unknown = on.filter((l) => !ALL.includes(l));
if (unknown.length) { console.error(`unknown layers: ${unknown.join(", ")}; one of ${ALL.join(", ")}`); process.exit(2); }
mkdirSync(dir, { recursive: true });
const venture = { id, name: id, parent: parent ?? null, phase };
if (legalForm) venture.form = { legal_form: legalForm };
if (phase !== "discovery") venture.core = { promise: "", promised_to: "", must_not: "", competence: "" };
Object.assign(venture, { owner: "self", status: "active", profile: "profile.md", layers: {} });
for (const layer of ALL) {
  if (!on.includes(layer)) { if (only !== null || !["governance", "interface"].includes(layer)) venture.layers[layer] = false; continue; }
  mkdirSync(join(dir, layer), { recursive: true });
  writeFileSync(join(dir, layer, "README.md"), `# ${layer}\n\n${readme[layer]}\n`);
  venture.layers[layer] = { location: `${layer}/` };
}
for (const sub of ["products", "accounts"]) { mkdirSync(join(dir, sub), { recursive: true }); writeFileSync(join(dir, sub, ".gitkeep"), ""); }
// The package folder layout (EE-070). Old layer folders above stay for one release.
for (const sub of ["raw/dump", "raw/sources", "ideas", "foundation", "validation", "product", "marketing", "finance", "people", "customers", "investors", "money", "decisions", "evidence", "public", "_private", "_drafts", ".release"]) {
  mkdirSync(join(dir, sub), { recursive: true });
}
mkdirSync(join(dir, "pillars"), { recursive: true });
for (const [name, what] of Object.entries(pillars.stubs)) {
  const guide = relative(join(dir, "pillars"), join(repo, pillars.guides, `${name}.md`));
  writeFileSync(join(dir, "pillars", `${name}.md`), `# ${name[0].toUpperCase() + name.slice(1)} pillar\n\n${what}\n\nGuide: [${name} pillar](${guide})\n`);
}
writeFileSync(join(dir, "profile.md"), `# ${id}\n\nWhat this venture is, in a few sentences. Its machine fields are in venture.json (EE-011).\n\n## Changelog\n`);
writeFileSync(join(dir, "venture.json"), JSON.stringify(venture, null, 2) + "\n");
// The product foundation (EE-059): Naive's own questions about products, asked first and failing
// closed. Does a product exist already, what is the core product, which product is the flagship.
// Each waits on the one before it; agents may not write product cards until the first is answered.
const framework = { drafted_by: { kind: "framework", id: "naive" } };
const productFoundation = [
  { id: "product-exists", question: "Does a product already exist (in use, for sale, a prototype or a pilot), or is the venture still an idea?", decides: { record: "product", path: "products/" }, statement: "products",
    options: ["Yes: one or more products exist", "Partly: a prototype or pilot exists", "No: it is still an idea"],
    unlocks: [{ activity: "Write product cards for what exists or is planned", routes: ["purpose/product/*"] }] },
  { id: "core-product", parent: "product-exists", question: "What is the core product: what anyone can claim from this venture, who it is promised to, what it must never deliver, and the competence that makes it deliverable?", decides: { record: "venture", path: "venture.json" },
    unlocks: [{ activity: "Judge the products against the core (Product Anatomy)", routes: ["purpose/anatomy-input/*", "purpose/anatomy-answers"] }] },
  { id: "flagship", parent: "core-product", question: "Which product is the flagship now: the one that best delivers the core promise?", decides: { record: "product", path: "products/" },
    unlocks: [{ activity: "Plan how to validate the flagship", routes: ["purpose/validation/solution"] }] },
];
// The team question (EE-060): asked in Discovery, failing open, so validation never waits on it. A
// founding team, or a founder looking for one, gets the founder-agreement kit beside validation.
mkdirSync(join(dir, "decisions"), { recursive: true });
writeFileSync(join(dir, "decisions/venture.team.decision.json"), JSON.stringify({ id: "founding-team", question: "Who is founding this venture: you alone, you with cofounders, or you looking for cofounders?",
  decides: { record: "founder-agreement", path: "governance/founder-agreement.json" }, layer: "governance", boundary: "fail-open", needed_in: phase, status: "open",
  options: ["Solo: I am founding it alone", "Cofounders: we are founding it together", "Looking: I want cofounders"],
  unlocks: [{ activity: "Draft the founder agreement with the founding-agreement kit", routes: ["governance/founder-agreement"] }], provenance: framework }, null, 2) + "\n");
mkdirSync(join(dir, "products/decisions"), { recursive: true });
for (const d of productFoundation) writeFileSync(join(dir, "products/decisions", `product.${d.id.replace(/^product-/, "")}.decision.json`),
  JSON.stringify({ ...d, layer: "purpose", boundary: "fail-closed", needed_in: phase, status: "open", provenance: framework }, null, 2) + "\n");
console.log(`created venture ${id} (${phase}) in ${dir} with ${on.join(", ") || "no layers"}, products/, accounts/ and the three pillars.${venture.core ? " Fill in the core product before ranking products." : ""}`);
