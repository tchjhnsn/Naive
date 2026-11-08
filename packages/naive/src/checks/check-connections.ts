// Checks the capability cluster catalog and each venture's connections (docs/design/LEAD_AGENTS_2026-11-08.md,
// "Capability clusters and connections", build plan item 7).
//
//   node packages/naive/src/checks/check-connections.ts [<workspace or venture dir>]
//
// The catalog, packages/naive/src/functions/it/capability-clusters.json, always: it matches its schema (which allows
// no vendor field), its gap kind and cluster ids are unique, every function it names is an id in
// packages/naive/src/functions/departments.json, and every gap a cluster names is one of its gap kinds.
//
// Each venture's it/connections/<id>.json, when a folder is given. A connection fails when:
//   - it is not JSON, does not match connection.schema.json, or its id is not its file name;
//   - its cluster is not in the catalog, or its integration is not an integration id in any layer's
//     tooling/integrations.json;
//   - a send, payment or signature action names no approval class, or a class other than the one it needs
//     (APPROVAL_CLASS: public-commitment, spend-money and legal-or-terms), or any action names a class that the
//     venture's governance/decision-rights.json (else Naive's template) does not define;
//   - it claims authority (authoritative_for) without naming its source, names a source the venture's
//     knowledge/sources.json does not list, or claims a record or field that the source map does not give to that
//     source: the rule resolve.mjs picks for it must exist, must not tie, and must name the connection's source as its
//     system of record. A connection points at the source map; it never overrides it.
// It does not connect to anything: the app's connectors act, and a connector being present is not permission to act.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";
import { validateValue } from "../records/validate.mjs";
import type { CapabilityCluster, Connection } from "../records/types/records.d.ts";
import { LOCAL, MAP } from "../store/connectors/index.mjs";
import { resolve } from "../store/connectors/resolve.mjs";
import { APPROVAL_CLASS } from "../engine/generators/connection.ts";

// EE_ROOT points the catalog checks at another copy of the repository (used by check-connections-test.ts).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
export const CATALOG = "packages/naive/src/functions/it/capability-clusters.json";
const DEPARTMENTS = "packages/naive/src/functions/departments.json";
const CONNECTIONS = "it/connections";

const readJson = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const schemaErrors = (schema: string, value: unknown): string[] => {
  const v = validateValue(schema, value);
  return v.status === 0 ? [] : (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l));
};

const errors: string[] = [];

// The catalog.
const departments = new Set((readJson(join(root, DEPARTMENTS)) as { departments: { id: string }[] }).departments.map((d) => d.id));
const clusters = new Set<string>();
if (!existsSync(join(root, CATALOG))) errors.push(`${CATALOG}: missing`);
else {
  const raw = readJson(join(root, CATALOG));
  const bad = schemaErrors("capability-cluster.schema.json", raw);
  for (const e of bad) errors.push(`${CATALOG}: ${e}`);
  if (!bad.length) {
    const cat = raw as CapabilityCluster;
    const kinds = new Set<string>();
    for (const g of cat.gap_kinds) { if (kinds.has(g.id)) errors.push(`${CATALOG}: gap kind ${g.id} is listed twice`); kinds.add(g.id); }
    for (const c of cat.clusters) {
      if (clusters.has(c.id)) errors.push(`${CATALOG}: cluster ${c.id} is listed twice`);
      clusters.add(c.id);
      for (const f of c.functions) if (!departments.has(f)) errors.push(`${CATALOG}: cluster ${c.id} names function ${f}, which is not an id in ${DEPARTMENTS}`);
      for (const g of c.gaps) if (!kinds.has(g)) errors.push(`${CATALOG}: cluster ${c.id} names gap ${g}, which is not one of its gap_kinds`);
    }
  }
}

// The integration ids every layer lists.
const LAYERS = join(root, "packages/naive/src/records/layers");
const integrations = new Set<string>(existsSync(LAYERS) ? readdirSync(LAYERS).flatMap((l) => {
  const f = join(LAYERS, l, "tooling/integrations.json");
  return existsSync(f) ? (readJson(f) as { id: string }[]).map((i) => i.id) : [];
}) : []);

/** The decision classes a venture defines: its own governance/decision-rights.json, else Naive's template. */
function classesOf(v: string): Set<string> {
  const own = ventureFile(v, "governance/decision-rights.json");
  const f = existsSync(own) ? own : join(root, "packages/naive/template/governance/decision-rights.json");
  const d = readJson(f);
  return new Set(isObject(d) && Array.isArray(d.classes) ? d.classes.flatMap((c: unknown) => (isObject(c) && typeof c.id === "string" ? [c.id] : [])) : []);
}

/** The problems with one connection, read against its venture's source map and decision classes. */
export function connectionErrors(c: Connection, map: unknown, classes: Set<string>): string[] {
  const out: string[] = [];
  if (clusters.size && !clusters.has(c.cluster)) out.push(`cluster ${c.cluster} is not in ${CATALOG}`);
  if (c.integration && !integrations.has(c.integration)) out.push(`integration ${c.integration} is not an integration id in any layer's tooling/integrations.json`);
  for (const a of c.actions) {
    const need = APPROVAL_CLASS[a.kind];
    if (need && !a.approval) out.push(`action ${a.id}: a ${a.kind} names no approval class; it needs ${need}, so a person approves it first`);
    else if (need && a.approval !== need) out.push(`action ${a.id}: a ${a.kind} names approval ${a.approval}; it needs ${need}`);
    if (a.approval && !classes.has(a.approval)) out.push(`action ${a.id}: approval ${a.approval} is not a decision class in governance/decision-rights.json`);
  }
  if (c.authoritative_for.length) {
    const sources = new Set(isObject(map) && Array.isArray(map.sources) ? map.sources.flatMap((s: unknown) => (isObject(s) && typeof s.id === "string" ? [s.id] : [])) : []);
    if (!c.source) out.push(`claims authority over ${c.authoritative_for.length} record field(s) but names no source; name the ${MAP} source it feeds`);
    else if (c.source === LOCAL || !sources.has(c.source)) out.push(`source ${c.source} is not a source in ${MAP}`);
    for (const x of c.authoritative_for) {
      const at = `${x.record}${x.attribute === "*" ? "" : `.${x.attribute}`}`;
      const hit = isObject(map) ? resolve(map, { record: x.record, attribute: x.attribute }) : null;
      if (!hit) { out.push(`claims ${at}, but no rule in ${MAP} names it; the source map, not the connection, says which source masters a field`); continue; }
      if (hit.ties.length) { out.push(`claims ${at}, but the rules in ${MAP} for it tie`); continue; }
      if (c.source && hit.rule.system_of_record !== c.source) out.push(`claims ${at}, which ${MAP} gives to ${hit.rule.system_of_record}, not ${c.source}`);
    }
  }
  return out;
}

const walk = (d: string): string[] => existsSync(join(d, "venture.json")) ? [d, ...sub(d)] : sub(d);
const sub = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() && e.name !== "node_modules" && !e.name.startsWith(".") ? walk(join(d, e.name)) : []);

let ventures = 0, connections = 0;
const dir = process.argv[2];
if (dir) {
  if (!existsSync(dir)) { console.error(`no such folder: ${dir}`); process.exit(2); }
  for (const v of walk(dir)) {
    ventures++;
    const folder = ventureFile(v, CONNECTIONS);
    if (!existsSync(folder)) continue;
    const id = (() => { try { const j = readJson(join(v, "venture.json")); return isObject(j) && typeof j.id === "string" ? j.id : v; } catch { return v; } })();
    const mapFile = ventureFile(v, MAP);
    const map = existsSync(mapFile) ? readJson(mapFile) : { sources: [], records: {} };
    const classes = classesOf(v);
    for (const name of readdirSync(folder).filter((f) => f.endsWith(".json")).sort()) {
      connections++;
      const where = `${id}: ${CONNECTIONS}/${name}`;
      let raw: unknown;
      try { raw = readJson(join(folder, name)); } catch { errors.push(`${where}: not JSON`); continue; }
      const bad = schemaErrors("connection.schema.json", raw);
      if (bad.length) { for (const e of bad) errors.push(`${where}: ${e}`); continue; }
      const c = raw as Connection;
      if (`${c.id}.json` !== name) errors.push(`${where}: id ${c.id} is not its file name`);
      for (const e of connectionErrors(c, map, classes)) errors.push(`${where}: ${e}`);
    }
  }
}

if (errors.length) { for (const e of errors) console.error(`FAIL  ${e}`); process.exit(1); }
console.log(`${clusters.size} capability clusters${dir ? `, ${connections} connections in ${ventures} ventures` : ""}: every action that sends, pays or signs names its approval class, and no connection claims a field another source owns.`);
