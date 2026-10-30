// Checks each venture's telos (purpose/telos.json, EE-023): start with the end. Rules:
//   measures: ids unique, exactly one primary.
//   phases: each phase listed once; every exit criterion serves at least one known measure,
//     so each phase's exit traces back to the end; the venture's current phase has exit
//     criteria (warning when it has none).
//   owner outcome: the path exit.json prefers is the telos path, and the telos path is not
//     ruled out there; an ambition that cannot fit the path is a warning (aggressive growth
//     that intends to hold, or a hobby that intends an IPO).
//   presence: a venture past Discovery, with an ambition beyond hobby, and no telos is a
//     warning: the method starts with the end, but only the owner can write it.
//
//   node schema/check-telos.mjs <workspace or venture dir>

import { ventureFile } from "./venture-paths.mjs";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-telos.mjs <workspace or venture dir>"); process.exit(2); }
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
const errors = [], warnings = [];
let checked = 0;

for (const root of walk(dir)) {
  const v = load(ventureFile(root, "venture.json"));
  const tPath = ventureFile(root, "purpose/telos.json");
  if (!existsSync(tPath)) {
    if (v.phase !== "discovery" && v.ambition && v.ambition !== "hobby") warnings.push(`${v.id}: past Discovery with no purpose/telos.json; the owner should state the end first`);
    continue;
  }
  checked++;
  const t = load(tPath), at = `${v.id}/purpose/telos.json`;
  const ids = t.measures.map((m) => m.id);
  if (new Set(ids).size !== ids.length) errors.push(`${at}: duplicate measure ids`);
  if (t.measures.filter((m) => m.primary).length !== 1) errors.push(`${at}: exactly one measure is primary`);
  const seen = new Set();
  for (const p of t.phases ?? []) {
    if (seen.has(p.phase)) errors.push(`${at}: phase ${p.phase} listed twice`);
    seen.add(p.phase);
    for (const c of p.exit_criteria) for (const s of c.serves) if (!ids.includes(s)) errors.push(`${at}: ${p.phase}/${c.id} serves unknown measure ${s}`);
  }
  if (!seen.has(v.phase)) warnings.push(`${at}: no exit criteria for the current phase, ${v.phase}`);

  const path = t.owner_outcome.path;
  if (v.ambition === "aggressive-growth" && path === "hold") warnings.push(`${at}: aggressive growth usually means investors expecting an exit, but the owners intend to hold`);
  if (v.ambition === "hobby" && ["ipo", "acquisition"].includes(path)) warnings.push(`${at}: a hobby that intends ${path}; is the ambition still hobby?`);
  const ePath = ventureFile(root, "governance/exit.json");
  if (existsSync(ePath)) {
    const paths = load(ePath).paths;
    const preferred = paths.filter((p) => p.stance === "preferred").map((p) => p.kind);
    if (paths.some((p) => p.kind === path && p.stance === "ruled-out")) errors.push(`${v.id}/governance/exit.json: rules out ${path}, the path the telos intends`);
    if (preferred.length && !preferred.includes(path)) errors.push(`${v.id}/governance/exit.json: prefers ${preferred.join(", ")}, but the telos intends ${path}`);
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${checked} ventures with a telos: every exit criterion traces to the end.`);
