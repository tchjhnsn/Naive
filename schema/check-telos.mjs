// Checks each venture's telos (EE-023): start with the end. The telos is the venture goal in
// foundation/goals with its exit criteria, read as the telos view (frameworks/telos/adapter.mjs), and
// before telos-to-goals it is foundation/telos.json (or purpose/telos.json). Canonical records with no
// venture goal are no telos yet. Every path resolves through venture-paths.mjs. Rules:
//   measures: ids unique, exactly one primary. A venture goal with no measures yet is a warning.
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
import { scale } from "./canonical.mjs";
import { telosFile, telosView } from "../frameworks/telos/adapter.mjs";
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
  const view = telosView(root);
  const end = view?.statement ? view : null;
  const file = end ? null : telosFile(root);
  const t = end ?? (file ? load(ventureFile(root, file)) : null);
  const ambition = scale(root);
  if (!t) {
    if (v.phase !== "discovery" && ambition && ambition !== "hobby") warnings.push(`${v.id}: past Discovery with no telos (foundation/goals and foundation/exit-criteria); the owner should state the end first`);
    continue;
  }
  checked++;
  const at = `${v.id}/${file ?? "foundation/goals, foundation/exit-criteria"}`;
  const ids = t.measures.map((m) => m.id);
  if (new Set(ids).size !== ids.length) errors.push(`${at}: duplicate measure ids`);
  if (end && !ids.length) warnings.push(`${at}: the venture goal has no measures yet; the owner should say how the end is measured`);
  else if (t.measures.filter((m) => m.primary).length !== 1) errors.push(`${at}: exactly one measure is primary`);
  const seen = new Set();
  for (const p of t.phases ?? []) {
    if (seen.has(p.phase)) errors.push(`${at}: phase ${p.phase} listed twice`);
    seen.add(p.phase);
    for (const c of p.exit_criteria) for (const s of c.serves) if (!ids.includes(s)) errors.push(`${at}: ${p.phase}/${c.id} serves unknown measure ${s}`);
  }
  if (!seen.has(v.phase)) warnings.push(`${at}: no exit criteria for the current phase, ${v.phase}`);

  const path = t.owner_outcome?.path;
  if (ambition === "aggressive-growth" && path === "hold") warnings.push(`${at}: aggressive growth usually means investors expecting an exit, but the owners intend to hold`);
  if (ambition === "hobby" && ["ipo", "acquisition"].includes(path)) warnings.push(`${at}: a hobby that intends ${path}; is the ambition still hobby?`);
  const ePath = ventureFile(root, "governance/exit.json");
  if (path && existsSync(ePath)) {
    const paths = load(ePath).paths;
    const preferred = paths.filter((p) => p.stance === "preferred").map((p) => p.kind);
    if (paths.some((p) => p.kind === path && p.stance === "ruled-out")) errors.push(`${v.id}/governance/exit.json: rules out ${path}, the path the telos intends`);
    if (preferred.length && !preferred.includes(path)) errors.push(`${v.id}/governance/exit.json: prefers ${preferred.join(", ")}, but the telos intends ${path}`);
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${checked} ventures with a telos: every exit criterion traces to the end.`);
