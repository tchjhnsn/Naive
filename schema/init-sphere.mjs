// Creates an empty sphere: its folder, one folder per starting layer, a profile,
// the three pillars for a venture (EE-010), and a sphere.json to fill in.
// Starting layers come from scaffold/defaults.json.
//
//   node schema/init-sphere.mjs <dir> <id> venture --stage hobby|venture|company [--parent <id>]
//   node schema/init-sphere.mjs <dir> <id> client --parent <venture-id>
//
// Writes nothing over an existing sphere.json.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const { layers, pillars, readme } = JSON.parse(readFileSync(join(here, "scaffold/defaults.json"), "utf8"));
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? null : args.splice(i, 2)[1]; };
const stage = flag("stage"), parent = flag("parent");
const [dir, id, kind] = args;
const usage = "usage: node schema/init-sphere.mjs <dir> <id> venture|client [--stage hobby|venture|company] [--parent <id>]";
if (!dir || !id || !kind) { console.error(usage); process.exit(2); }
if (!["venture", "client"].includes(kind)) { console.error(`unknown kind ${kind}: a sphere is a venture or a client (EE-009)`); process.exit(2); }
if (kind === "venture" && !stage) { console.error("a venture needs --stage hobby, venture or company"); process.exit(2); }
if (kind === "client" && !parent) { console.error("a client sits inside a venture: give --parent <venture-id>"); process.exit(2); }
if (kind === "client" && stage) { console.error("stage applies to ventures only"); process.exit(2); }
const on = layers[kind === "venture" ? `venture:${stage}` : kind];
if (!on) { console.error(`unknown stage ${stage}`); process.exit(2); }
if (existsSync(join(dir, "sphere.json"))) { console.error(`${dir}/sphere.json already exists`); process.exit(1); }

mkdirSync(dir, { recursive: true });
const sphere = { id, name: id, kind, parent: parent ?? null };
if (stage) sphere.stage = stage;
if (stage === "company") sphere.legal_form = "none";
Object.assign(sphere, { owner: kind === "client" ? "shared" : "self", status: "active", profile: "profile.md", layers: {} });
for (const layer of ["purpose", "knowledge", "operations", "execution", "evidence", "governance", "interface"]) {
  if (!on.includes(layer)) { if (!["governance", "interface"].includes(layer)) sphere.layers[layer] = false; continue; }
  mkdirSync(join(dir, layer), { recursive: true });
  writeFileSync(join(dir, layer, "README.md"), `# ${layer}\n\n${readme[layer]}\n`);
  sphere.layers[layer] = { location: `${layer}/` };
}
writeFileSync(join(dir, "profile.md"), `# ${id}\n\nWhat this ${kind} is, in a few sentences. Its machine fields are in sphere.json (EE-008).\n\n## Changelog\n`);
if (kind === pillars.applies_to) {
  mkdirSync(join(dir, "pillars"), { recursive: true });
  for (const f of pillars.files) copyFileSync(join(repo, pillars.from, f), join(dir, "pillars", f));
}
writeFileSync(join(dir, "sphere.json"), JSON.stringify(sphere, null, 2) + "\n");
console.log(`created ${kind}${stage ? ` (${stage})` : ""} sphere ${id} in ${dir} with ${on.join(", ")}${kind === "venture" ? " and the three pillars" : ""}. Fill in name and profile, then run check-spheres.`);
