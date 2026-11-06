// Says which records a venture needs now, which come soon, and which to hold back (EE-028), so a
// builder works only on what matters at this moment instead of overbuilding. Priors per record
// type and phase are in packages/naive/src/engine/need-now.json; facts about the venture raise or lower them:
//   phase, ambition, funding, legal_form, offering (of any product), software (any product),
//   path (go-to-market record), people, founders, agents, products (counts), publishes (a handoff
//   under public-commitment), team (the answer to Naive's team question: solo, cofounders, looking),
//   type (the venture type, EE-082).
// Departments (EE-047) are scored the same way, from their priors in operations/departments.json, and
// held once venture.json lists them. Records that already exist are listed as held; a record in a layer the venture has turned off is
// listed as layer off, not suggested. Jev re-scores the priors per venture once the
// scorer runs; until then the priors are the default.
//
//   node packages/naive/src/engine/need-now.mjs <venture dir> [--json]

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { catalog } from "./departments.mjs";
import { ventureFile } from "../core/venture-paths.mjs";
import { scale } from "./canonical.mjs";
import { readDataModel, venturePaths } from "../records/index.mjs";

const root = new URL("../../../..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const PHASES = load(join(root, "purpose/frameworks/product-anatomy/phases.json")).phases.map((p) => p.id);

const files = (d, base = d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? files(join(d, e.name), base) : [join(d, e.name).slice(base.length + 1)]) : [];
const glob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*") + "$");

/** Facts about a venture that the need-now conditions test. */
export function factsOf(dir) {
  const v = load(join(dir, "venture.json"));
  const json = (p) => existsSync(ventureFile(dir, p)) ? load(ventureFile(dir, p)) : null;
  const products = existsSync(join(ventureFile(dir, "products"))) ? readdirSync(join(ventureFile(dir, "products"))).filter((f) => f.endsWith(".json")).map((f) => load(join(ventureFile(dir, "products"), f))) : [];
  const members = (v.members ?? []).map((m) => typeof m === "string" ? { kind: "person", role: m } : m);
  const own = json("governance/ownership.json");
  const hDir = join(ventureFile(dir, "operations/handoffs"));
  const handoffs = existsSync(hDir) ? readdirSync(hDir).filter((f) => f.endsWith(".json")).map((f) => load(join(hDir, f))) : [];
  // The founding team, as the founder answered Naive's team question (EE-060): solo, cofounders or looking.
  const teamFile = join(ventureFile(dir, "decisions/venture.team.decision.json"));
  const td = existsSync(teamFile) ? load(teamFile) : null;
  const team = td?.status === "decided" ? ["solo", "cofounders", "looking"].find((t) => (td.answer ?? "").toLowerCase().startsWith(t)) ?? null : null;
  return {
    team, type: v.type ?? null, phase: v.phase, ambition: scale(dir, v), funding: v.form?.funding, legal_form: v.form?.legal_form,
    offering: products.map((p) => p.offering), software: products.some((p) => p.software),
    path: json("purpose/validation/go-to-market.json")?.path,
    people: members.filter((m) => m.kind !== "agent").length + (v.owner === "self" && !members.some((m) => m.kind !== "agent") ? 1 : 0),
    founders: own ? own.holders.filter((h) => h.kind === "founder").length : members.filter((m) => m.role === "founder").length,
    agents: members.filter((m) => m.kind === "agent").length, products: products.length,
    publishes: handoffs.some((h) => (h.decision_classes ?? []).includes("public-commitment") || (h.escalations ?? []).some((e) => e.class === "public-commitment")),
  };
}

export function holds(cond, f) {
  const m = cond.match(/^([a-z_]+)(>=|:)?(.*)$/);
  const [, key, op, val] = m;
  if (!op) return !!f[key];
  if (op === ">=") return (f[key] ?? 0) >= Number(val);
  return Array.isArray(f[key]) ? f[key].includes(val) : f[key] === val;
}

export function probability(spec, phase, f) {
  let p = spec.base[phase] ?? 0;
  for (const w of spec.when ?? []) {
    if (w.phase && w.phase !== phase) continue;
    if (!holds(w.if, f)) continue;
    if (w.at_least !== undefined) p = Math.max(p, w.at_least);
    if (w.at_most !== undefined) p = Math.min(p, w.at_most);
  }
  return p;
}

export function needNow(dir) {
  const N = load(join(root, "packages/naive/src/engine/need-now.json"));
  const model = readDataModel();
  const f = factsOf(dir);
  const v = load(join(dir, "venture.json"));
  const here = files(dir);
  const phase = PHASES.includes(f.phase) ? f.phase : "discovery";
  const next = PHASES[PHASES.indexOf(phase) + 1];
  const rows = Object.entries(N.records).map(([type, spec]) => {
    const rec = model.records.find((r) => r.id === type);
    const rels = venturePaths(rec);
    const held = rels.some((g) => here.some((x) => glob(g).test(x)));
    const now = probability(spec, phase, f), soon = next ? probability(spec, next, f) : now;
    const off = rec?.layer && v.layers?.[rec.layer] === false;
    const status = held ? "held" : off ? "layer off" : now >= N.suggest ? "suggest now" : soon >= N.suggest ? "coming soon" : "hold back";
    return { type, layer: rec?.layer, now, next: soon, status, why: spec.why };
  });
  // Departments are imported one by one (EE-047, EE-048), each with its own priors in the catalog.
  const departments = catalog().map((d) => {
    const now = probability(d, phase, f), soon = next ? probability(d, next, f) : now;
    const status = (v.departments ?? []).includes(d.id) ? "held" : now >= N.suggest ? "suggest now" : soon >= N.suggest ? "coming soon" : "hold back";
    return { type: `department:${d.id}`, layer: "operations", now, next: soon, status, why: d.why };
  });
  return { phase, next: next ?? null, facts: f, rows, departments };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/engine/need-now.mjs <venture dir> [--json]"); process.exit(2); }
  const r = needNow(dir);
  if (process.argv.includes("--json")) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  console.log(`Phase ${r.phase}${r.next ? `, next ${r.next}` : ""}. Work on what is needed now; the rest waits until it is.`);
  for (const status of ["suggest now", "coming soon", "held", "hold back", "layer off"]) {
    const rows = [...r.rows, ...r.departments].filter((x) => x.status === status);
    if (!rows.length) continue;
    console.log(`\n${status} (${rows.length})`);
    for (const x of rows.sort((a, b) => b.now - a.now)) console.log(`  ${x.type.padEnd(32)} now ${x.now.toFixed(2)}  next ${x.next.toFixed(2)}  ${["hold back", "layer off"].includes(status) ? "" : x.why}`);
  }
}
