// Creates an empty venture: its folder, one folder per starting layer, products/,
// accounts/, the three pillars as stubs pointing to their guides (EE-010), a venture profile and a venture.json to fill in
// (EE-011). Starting layers come from scaffold/defaults.json, by phase (EE-012).
//
//   node packages/naive/src/engine/init-venture.mjs <dir> <id> [--phase discovery] [--parent <id>] [--legal-form llc] [--layers purpose,governance]
//                                [--type <venture type>] [--layout flat|structured|src]
//
// --type (packages/naive/src/engine/venture-types.json, EE-082) decides the package folders, the functions venture.json
// imports and the first decisions: a software startup answers the product questions, a VC fund its
// thesis and terms. Without it, every package folder is made and the product questions are asked.
//
// --layers turns on only the layers named, for a builder adopting part of the system (EE-030);
// without it the phase's defaults apply.
//
// Creates new ventures only, like create-next-app: it refuses a directory that exists and is not empty,
// so it can never overwrite a founder's files. An existing project comes in through naive port (EE-076).

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { KBASE, ventureFile } from "../core/venture-paths.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../../../..");
const { layers, formalized, pillars, readme } = JSON.parse(readFileSync(join(here, "scaffold/defaults.json"), "utf8"));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args.splice(i, 2)[1]; };
const phase = flag("phase") ?? "discovery", parent = flag("parent"), legalForm = flag("legal-form"), only = flag("layers"), typeId = flag("type");
// --layout structured (EE-086): knowledge/, meta/ and an org chart in venture.json. --layout src (EE-118
// step 8): the template's src/<function>/ and public/, with each package folder under its function.
// Without either, the flat layout.
const layout = flag("layout") ?? "flat";
if (!["flat", "structured", "src"].includes(layout)) { console.error(`unknown layout ${layout}: flat, structured or src`); process.exit(2); }
const structured = layout === "structured";
const vtype = typeId ? JSON.parse(readFileSync(join(here, "venture-types.json"), "utf8")).types.find((t) => t.id === typeId) : null;
if (typeId && !vtype) { console.error(`unknown venture type ${typeId}: see node packages/naive/src/engine/venture-type.mjs list`); process.exit(2); }
const [dir, id] = args;
if (!dir || !id) { console.error("usage: node packages/naive/src/engine/init-venture.mjs <dir> <id> [--phase discovery] [--parent <id>] [--legal-form llc] [--layout flat|structured|src]"); process.exit(2); }
if (!layers[phase]) { console.error(`unknown phase ${phase}: one of ${Object.keys(layers).join(", ")}`); process.exit(2); }
if (existsSync(dir) && readdirSync(dir).length) { console.error(`${dir} already exists and is not empty: init creates new ventures only, and never writes into an existing project`); process.exit(1); }

const ALL = ["purpose", "knowledge", "operations", "evidence", "governance", "interface"];
const on = only !== null ? only.split(",").filter(Boolean) : [...new Set([...layers[phase], ...(vtype?.layers ?? []), ...(legalForm && legalForm !== "none" ? formalized : [])])];
const unknown = on.filter((l) => !ALL.includes(l));
if (unknown.length) { console.error(`unknown layers: ${unknown.join(", ")}; one of ${ALL.join(", ")}`); process.exit(2); }
mkdirSync(dir, { recursive: true });
const venture = /** @type {{ id: string, name: string, type?: string, parent: string | null, phase: string, form?: { legal_form?: string, funding?: string }, core?: Record<string, string>,
  owner?: string, status?: string, profile?: string, layers?: Record<string, { location: string } | false>, layout?: string, functions?: Record<string, { owner: string | null }> }} */ ({ id, name: id, ...(vtype ? { type: vtype.id } : {}), parent: parent ?? null, phase });
if (legalForm || vtype?.funding) venture.form = { ...(legalForm ? { legal_form: legalForm } : {}), ...(vtype?.funding ? { funding: vtype.funding } : {}) };
if (phase !== "discovery") venture.core = { promise: "", promised_to: "", must_not: "", competence: "" };
Object.assign(venture, { owner: "self", status: "active", profile: structured ? "README.md" : "profile.md", layers: {} });
// The package folders (EE-070); a typed venture gets its type's packages.
const packageDirs = vtype ? vtype.packages : ["foundation", "validation", "product", "marketing", "finance", "people", "customers", "investors", "money"];
if (structured) {
  // venture.json first, so every path below resolves into k-base/ and meta/. The org chart starts flat:
  // one function per package, owned by no one until create-venture or the founder names the owner.
  venture.layout = "structured";
  venture.functions = Object.fromEntries(packageDirs.map((p) => [p, { owner: null }]));
  for (const layer of ALL) venture.layers[layer] = on.includes(layer) ? { location: `${KBASE}/` } : false;
  writeFileSync(join(dir, "venture.json"), JSON.stringify(venture, null, 2) + "\n");
  for (const sub of [KBASE, "meta"]) mkdirSync(join(dir, sub), { recursive: true });
}
if (layout === "src") {
  // venture.json first, so every package path below resolves into src/<function>/, then the template's
  // src/ and public/ (packages/naive/template/), one folder per function and the static files.
  venture.layout = "src";
  writeFileSync(join(dir, "venture.json"), JSON.stringify(venture, null, 2) + "\n");
  for (const sub of ["src", "public"]) cpSync(join(repo, "packages/naive/template", sub), join(dir, sub), { recursive: true });
}
for (const layer of structured ? [] : ALL) {
  if (!on.includes(layer)) { if (only !== null || !["governance", "interface"].includes(layer)) venture.layers[layer] = false; continue; }
  mkdirSync(ventureFile(dir, layer), { recursive: true });
  writeFileSync(join(dir, layer, "README.md"), `# ${layer}\n\n${readme[layer]}\n`);
  venture.layers[layer] = { location: `${layer}/` };
}
if (!structured) for (const sub of ["products", "accounts"]) { mkdirSync(ventureFile(dir, sub), { recursive: true }); writeFileSync(join(dir, sub, ".gitkeep"), ""); }
// The package folder layout (EE-070). Old layer folders above stay for one release.
// A typed venture gets its type's packages; the rest stay out until need-now suggests them.
for (const sub of ["raw/dump", "raw/sources", "ideas", ...packageDirs, "decisions", "evidence", ...(structured ? [] : ["public"]), "_private", "_drafts", ".release"]) {
  mkdirSync(ventureFile(dir, sub), { recursive: true });
}
// Every package folder explains itself (EE-086): a README.md from its package, for people. GitHub and
// editors show it when the folder is opened; an AGENTS.md beside it is the founder's, for agents.
if (structured) for (const pkg of packageDirs) {
  const f = join(repo, "packages/naive/library", "packages", pkg, "package.json");
  if (!existsSync(f)) continue;
  const p = JSON.parse(readFileSync(f, "utf8"));
  const lines = [`# ${p.title ?? pkg}`, "", p.purpose ?? "", ...(p.required?.length ? ["", `What goes in it first: ${p.required.join(", ")}.`] : []), ...(p.optional?.length ? [`Also: ${p.optional.join(", ")}.`] : []),
    ...(p.gates?.length ? ["", `It is ready when ${p.gates.join("; ")}.`] : []), "", `Owner: whoever owns the ${pkg} function in venture.json.`, ""];
  writeFileSync(join(ventureFile(dir, pkg), "README.md"), lines.join("\n"));
}
if (!structured) mkdirSync(join(ventureFile(dir, "pillars")), { recursive: true });
for (const [name, what] of Object.entries(structured ? {} : pillars.stubs)) {
  const guide = relative(join(ventureFile(dir, "pillars")), join(repo, pillars.guides, `${name}.md`));
  writeFileSync(join(ventureFile(dir, "pillars"), `${name}.md`), `# ${name[0].toUpperCase() + name.slice(1)} pillar\n\n${what}\n\nGuide: [${name} pillar](${guide})\n`);
}
writeFileSync(join(ventureFile(dir, "profile.md")), `# ${id}\n\nWhat this venture is, in a few sentences. Its machine fields are in venture.json (EE-011).\n\n## Changelog\n`);
if (!structured) writeFileSync(join(dir, "venture.json"), JSON.stringify(venture, null, 2) + "\n");
// The venture's root layout (EE-072, I-4): every route's layout chain starts here. Lines shaped
// "key: value" are instructions the router hands an agent with the layout.
writeFileSync(join(dir, "AGENTS.md"), `# AGENTS.md: ${id}

The map of this venture for agents. Read it, then a route's layout, before writing anything here.

## How to work here

- List the routes with \`mentura routes\`. Read a route's \`layout\` and \`template\` before you write to it.
- Write through the router (the CLI or the MCP server), not by editing files. Every write is checked against its schema and recorded in provenance.jsonl.
- A write that fails closed comes back as a draft in \`_drafts/\`. A person accepts it with \`mentura accept\`.
- Never read or send anything under \`_private/\` to a model.
- A deeper AGENTS.md (for example \`marketing/AGENTS.md\`) adds to this one for the routes under it; the nearer one wins.

## Instructions

phase: ${venture.phase}
voice: plain words, in the founder's own terms
private: _private/
`);
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
mkdirSync(join(ventureFile(dir, "decisions")), { recursive: true });
writeFileSync(join(ventureFile(dir, "decisions/venture.team.decision.json")), JSON.stringify({ id: "founding-team", question: "Who is founding this venture: you alone, you with cofounders, or you looking for cofounders?",
  decides: { record: "founder-agreement", path: "governance/founder-agreement.json" }, layer: "governance", boundary: "fail-open", needed_in: phase, status: "open",
  options: ["Solo: I am founding it alone", "Cofounders: we are founding it together", "Looking: I want cofounders"],
  unlocks: [{ activity: "Draft the founder agreement with the founding-agreement kit", routes: ["governance/founder-agreement"] }], provenance: framework }, null, 2) + "\n");
// A fund's foundation (EE-082): the thesis first, then the terms it raises under, then the first close.
const fundFoundation = [
  { id: "fund-thesis", question: "What does the fund invest in, and why does it win: rounds, sectors, geographies, check size and its edge?", decides: { record: "fund-thesis", path: "fund/thesis.json" },
    unlocks: [{ activity: "Screen deals against the thesis", routes: ["deals/*"] }] },
  { id: "fund-terms", parent: "fund-thesis", question: "What are the fund's terms: target size, vintage, structure, management fee, carry and term?", decides: { record: "fund-terms", path: "fund/terms.json" },
    unlocks: [{ activity: "Raise from limited partners", routes: ["investors/*"] }] },
  { id: "first-close", parent: "fund-terms", question: "When is the first close, and how much must be committed to hold it?", decides: { record: "fund-terms", path: "fund/terms.json" },
    unlocks: [{ activity: "Make the first investment", routes: ["portfolio/*"] }] },
];
const decisionSet = vtype?.decisions ?? "product-foundation";
if (decisionSet === "fund-foundation") {
  mkdirSync(join(ventureFile(dir, "fund/decisions")), { recursive: true });
  for (const d of fundFoundation) writeFileSync(join(ventureFile(dir, "fund/decisions"), `${d.id === "first-close" ? "terms.first-close" : d.id.replace(/^fund-/, "")}.decision.json`),
    JSON.stringify({ ...d, layer: "purpose", boundary: "fail-closed", needed_in: phase, status: "open", provenance: framework }, null, 2) + "\n");
}
// The product questions sit beside the products: product/ in the structured layout, products/ in the flat one.
const productDecisions = structured ? "product/decisions" : "products/decisions";
if (decisionSet === "product-foundation") mkdirSync(join(ventureFile(dir, productDecisions)), { recursive: true });
if (decisionSet === "product-foundation") for (const d of productFoundation) writeFileSync(join(ventureFile(dir, productDecisions), `product.${d.id.replace(/^product-/, "")}.decision.json`),
  JSON.stringify({ ...d, layer: "purpose", boundary: "fail-closed", needed_in: phase, status: "open", provenance: framework }, null, 2) + "\n");
// The type's functions are imported like any department (EE-047): listed in venture.json, with their folders.
// In the structured layout the org chart is venture.json's functions; the flat layout imports departments.
if (vtype && !structured) for (const d of vtype.departments) {
  const r = spawnSync("node", [join(here, "add-department.mjs"), dir, d], { encoding: "utf8" });
  if (r.status !== 0) { console.error((r.stderr || r.stdout).trim()); process.exit(1); }
}
console.log(`created ${vtype ? `${vtype.label.toLowerCase()} ` : ""}venture ${id} (${phase}) in ${dir} with ${on.join(", ") || "no layers"}, products/, accounts/ and the three pillars.${venture.core ? " Fill in the core product before ranking products." : ""}`);
