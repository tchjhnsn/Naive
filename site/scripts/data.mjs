// Writes generated/*.json from Naive's own records (the installed naive-framework package) before every build,
// so the pages that show routes, nouns, kits and decisions render what Naive holds now. Only method-level
// data is read: no instance venture, no record of any builder's venture.
// Marketing facts are not written here. site/scripts/venture-facts.mjs writes
// generated/venture-facts.json (EE-080).
//
//   node scripts/data.mjs

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { groups, kits, routes } from "naive-framework/src/records/routes/routes.mjs";
import { naiveCode } from "./naive.ts";

const repo = naiveCode;
const out = new URL("../generated/", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(join(repo, p), "utf8"));
mkdirSync(out, { recursive: true });
const write = (name, data) => writeFileSync(join(out, `${name}.json`), JSON.stringify(data, null, 2));

write("routes", routes().map(({ route, kind, collection, actions, files, script, decision_class, groups, note }) => ({ route, kind, collection: collection ?? null, actions, files: files ?? null, script: script ?? null, decision_class, groups, note })));
write("groups", groups());
write("nouns", load("packages/naive/src/terms/ontology.json").nouns.filter((n) => n.status !== "retired").map(({ noun, level, meaning, standard }) => ({ noun, level, meaning, standard })));
write("kits", kits().map((k) => ({ path: k.path, name: k.name, kit: k.name, layer: k.layer, purpose: k.purpose, skills: (k.skills?.length ? k.skills : k.skill ? [k.skill] : []).length, records: k.records ?? [], gaps: k.gaps ?? [] })));
// Decisions in force, as the schema logs them. A decision's "why" can quote the owner, so only the decision itself is published.
write("decisions", load("docs/decisions/decisions.json").decisions.filter((d) => d.status === "in-force").map(({ id, date, decision }) => ({ id, date, decision })));
console.log(`site data written to ${out}`);
