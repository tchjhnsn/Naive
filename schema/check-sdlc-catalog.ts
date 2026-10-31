// Checks the SDLC catalog (knowledge/sdlc/catalog.json, R-26) for what its schema cannot state:
// process ids are unique and their clauses follow their group; every task's decision classes
// are classes in the venture template's decision rights, and every owner role is a role
// template; a technical process names a MAD module unless it is the product function's or
// listed for completeness; task references (<mad_module>/<activity>/<task>) are unique, so
// MAD's method-request can name a task by them; every process names one of the venture
// functions in operations/departments.json. It prints the references with --refs.
//
// --phase <id> [--processes a,b] prints what a method-request's `open` and `enumeration`
// carry for that phase: the catalog file's sha256, the count, and each task a MAD module
// routes that is needed by then (needed_from at or before the phase), so `open` is a
// projection of the catalog, never a hand-made list (R-63, MAD contract 0.2.0).
//
//   node schema/check-sdlc-catalog.ts [--refs] [--phase <id> [--processes a,b]]

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { SdlcCatalog } from "./types/records.d.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (rel: string): unknown => JSON.parse(readFileSync(join(root, rel), "utf8"));

const CATALOG = "knowledge/sdlc/catalog.json";
const catalog = read(CATALOG) as SdlcCatalog;
const functions = new Set((read("operations/departments.json") as { departments: { id: string }[] }).departments.map((d) => d.id));
const PHASES = ["discovery", "validation", "beachhead", "scale", "platform"];
const rights = read("governance/venture-template/decision-rights.json") as { classes: { id: string }[] };
const classes = new Set(rights.classes.map((c) => c.id));
const isRole = (id: string): boolean => existsSync(join(root, "governance/venture-template/roles", `${id}.json`));

const CLAUSE: Record<string, string> = { agreement: "6.1.", "organizational-project-enabling": "6.2.", "technical-management": "6.3.", technical: "6.4." };
// Technical processes that MAD does not route: whether and why to build is the product function's (R-21).
const NOT_MAD = new Set(["business-or-mission-analysis", "disposal"]);

const errors: string[] = [];
const ids = new Set<string>();
const refs = new Map<string, string>();
const neededFrom = new Map<string, string>();

for (const group of catalog.groups) {
  for (const p of group.processes) {
    if (ids.has(p.id)) errors.push(`${p.id}: duplicate process id`);
    ids.add(p.id);
    if (!p.clause.startsWith(CLAUSE[group.id])) errors.push(`${p.id}: clause ${p.clause} is not in group ${group.id} (${CLAUSE[group.id]}x)`);
    if (!isRole(p.owner_role)) errors.push(`${p.id}: owner role ${p.owner_role} is not a role template`);
    if (!functions.has(p.function)) errors.push(`${p.id}: function ${p.function} is not a department in operations/departments.json`);
    if (group.id === "technical") {
      if (p.mad_layer) errors.push(`${p.id}: a technical process names a MAD module, not a layer`);
      if (!p.mad_module && !NOT_MAD.has(p.id)) errors.push(`${p.id}: technical process with no MAD module`);
    } else if (p.mad_module !== undefined || p.activities) {
      errors.push(`${p.id}: only technical processes carry a MAD module and activities`);
    }
    for (const a of p.activities ?? []) {
      for (const t of a.tasks) {
        const where = `${p.id}/${a.id}/${t.id}`;
        for (const c of t.decision_classes) if (!classes.has(c)) errors.push(`${where}: decision class ${c} is not in the decision rights template`);
        if (!isRole(t.owner_role)) errors.push(`${where}: owner role ${t.owner_role} is not a role template`);
        if (!p.mad_module) continue;
        const ref = `${p.mad_module}/${a.id}/${t.id}`;
        if (refs.has(ref)) errors.push(`${where}: reference ${ref} is also ${refs.get(ref)}`);
        refs.set(ref, where);
        neededFrom.set(ref, t.needed_from);
      }
    }
  }
}

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const phase = arg("--phase");
if (phase) {
  if (!PHASES.includes(phase)) errors.push(`--phase ${phase} is not one of ${PHASES.join(", ")}`);
  const only = arg("--processes")?.split(",");
  const open = [...neededFrom]
    .filter(([ref, from]) => PHASES.indexOf(from) <= PHASES.indexOf(phase) && (!only || only.includes(ref.split("/")[0])))
    .map(([ref]) => ref)
    .sort();
  const catalog_sha256 = createHash("sha256").update(readFileSync(join(root, CATALOG))).digest("hex");
  console.log(JSON.stringify({ catalog_version: catalog.version, enumeration: { catalog_sha256, phase, ...(only ? { processes: only } : {}), needed: open.length }, open }, null, 2));
}
if (process.argv.includes("--refs")) for (const ref of [...refs.keys()].sort()) console.log(ref);
for (const e of errors) console.error(e);
console.log(errors.length ? `sdlc catalog: ${errors.length} problem${errors.length === 1 ? "" : "s"}` : `sdlc catalog: ok, ${ids.size} processes, ${refs.size} task references`);
process.exit(errors.length ? 1 : 0);
