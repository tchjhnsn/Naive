#!/usr/bin/env node
// Moves one venture onto the package folder layout (EE-070). Files move with git mv.
// Provenance is appended, never rewritten: each move is a new line, and the set of moves
// is one release under .release/. Old routes keep resolving through interface/route-aliases.json.
//
//   node schema/migrate-venture.mjs <venture dir>

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../interface/provenance.mjs";

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, "venture.json"))) {
  console.error("usage: node schema/migrate-venture.mjs <venture dir>");
  process.exit(2);
}
const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const rel = (p) => relative(repo, p);
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const moved = [];
const escalated = [];

function mv(fromRel, toRel) {
  const from = join(dir, fromRel), to = join(dir, toRel);
  if (!existsSync(from)) return;
  if (existsSync(to)) { console.error(`${toRel} already exists`); process.exit(1); }
  mkdirSync(dirname(to), { recursive: true });
  execSync(`git mv ${JSON.stringify(rel(from))} ${JSON.stringify(rel(to))}`, { cwd: repo });
  moved.push([fromRel, toRel]);
}

// A decision file infers its target from the folder it sits in. Stamp that path before the
// file moves, so the decision still points at the same record.
function stampDecisions(folder) {
  const d = join(dir, folder);
  if (!existsSync(d)) return;
  for (const f of readdirSync(d).filter((x) => x.endsWith(".decision.json"))) {
    const path = join(d, f);
    const rec = load(path);
    if (rec.decides?.path) continue;
    const at = folder.split("/").slice(0, -1).join("/");
    const base = f.split(".")[0];
    rec.decides = { ...(rec.decides ?? {}), path: at ? `${at}/${base}.json` : `${base}.json` };
    writeFileSync(path, JSON.stringify(rec, null, 2) + "\n");
  }
}

const pairs = [
  ["purpose/validation/problem.json", "foundation/problem.json"],
  ["purpose/icp.json", "foundation/icp.json"],
  ["purpose/alignment.json", "foundation/alignment.json"],
  ["purpose/telos.draft.md", "foundation/telos.draft.md"],
  ["purpose/validation/solution.json", "validation/solution.json"],
  ["purpose/validation/go-to-market.json", "validation/go-to-market.json"],
  ["operations/team-plan.json", "people/team-plan.json"],
  ["pillars/brand.md", "marketing/brand.md"],
  ["knowledge/README.md", "AGENTS.md"],
  ["purpose/anatomy.answers.reasoned.json", "product/anatomy.answers.reasoned.json"],
  ["purpose/anatomy.matrix.md", "product/anatomy.matrix.md"],
];
for (const [a, b] of pairs) mv(a, b);

const products = existsSync(join(dir, "products")) ? readdirSync(join(dir, "products")).filter((f) => f.endsWith(".json")) : [];
for (const f of products) mv(`products/${f}`, `product/${f}`);

const anatomy = existsSync(join(dir, "purpose/anatomy")) ? readdirSync(join(dir, "purpose/anatomy")).filter((f) => f.endsWith(".json")) : [];
for (const f of anatomy) mv(`purpose/anatomy/${f}`, `product/anatomy/${f}`);

for (const folder of ["purpose/decisions", "purpose/anatomy/decisions", "operations/decisions"]) {
  stampDecisions(folder);
  const d = join(dir, folder);
  if (!existsSync(d)) continue;
  for (const f of readdirSync(d).filter((x) => x.endsWith(".decision.json"))) mv(`${folder}/${f}`, `decisions/${f}`);
}

for (const f of ["product.md", "business.md"]) {
  if (existsSync(join(dir, "pillars", f))) {
    mv(`pillars/${f}`, `_private/pillars/${f}`);
    escalated.push(`${f.replace(".md", "")} pillar: the brief names a home only for brand (marketing/). Archived at _private/pillars/${f} rather than guessed.`);
  }
}
const research = join(dir, "purpose/research");
if (existsSync(research)) {
  for (const f of readdirSync(research)) {
    mv(`purpose/research/${f}`, `_private/research/${f}`);
    escalated.push(`purpose/research/${f}: no package home in the route table. Archived at _private/research/${f}.`);
  }
}

function removeEmpty(p) {
  if (!existsSync(p)) return;
  for (const e of readdirSync(p, { withFileTypes: true })) if (e.isDirectory()) removeEmpty(join(p, e.name));
  if (readdirSync(p).length === 0) rmSync(p, { recursive: true });
}
for (const gone of ["purpose", "pillars", "knowledge", "products"]) removeEmpty(join(dir, gone));

const policy = join(dir, "governance/publication-policy.json");
if (existsSync(policy)) {
  const text = readFileSync(policy, "utf8");
  if (text.includes("pillars/brand.md")) writeFileSync(policy, text.replaceAll("pillars/brand.md", "marketing/brand.md"));
}

for (const sub of ["raw/dump", "raw/sources", "ideas", "finance", "customers", "investors", "money", "public"]) {
  const p = join(dir, sub);
  if (!existsSync(p)) { mkdirSync(p, { recursive: true }); writeFileSync(join(p, ".gitkeep"), ""); }
}

const release = {
  version: 1,
  at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
  note: "Moved onto the package folder layout (EE-070). Old routes stay as aliases for one release.",
  moves: moved.map(([from, to]) => ({ from, to })),
  escalated,
};
mkdirSync(join(dir, ".release"), { recursive: true });
const releaseRel = ".release/layout.json";
writeFileSync(join(dir, releaseRel), JSON.stringify(release, null, 2) + "\n");

const agent = { kind: "agent", id: "grokbot", via: "cli" };
for (const [from, to] of moved) {
  record(dir, { entity: to, activity: "move", agent, derived_from: [from], note: `moved from ${from} (EE-070)` });
}
record(dir, { entity: releaseRel, activity: "release", agent, derived_from: moved.map(([, to]) => to), note: "package folder layout" });

console.log(`migrated ${load(join(dir, "venture.json")).id}: ${moved.length} files moved, ${escalated.length} archived for a decision.`);
for (const e of escalated) console.log(`escalate  ${e}`);
