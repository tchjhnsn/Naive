// Checks the tool catalog, packages/naive/src/functions/tools.json (venture console spec, 2026-11-24, phase 3).
//
//   node packages/naive/src/checks/check-tools.ts [--json]
//
// The catalog is a three-level taxonomy: function (APQC level 1, departments.json), process group (APQC level 2),
// tool. It fails when:
//   - it does not match tool-catalog.schema.json;
//   - a kind, process group or tool id is listed twice, or two tools share a title;
//   - a process group names a function that is not in departments.json, or its id does not start with that
//     function's APQC id (3.5 belongs to the function whose apqc.id is 3.0);
//   - a tool names a function that is not in departments.json, or a process group that is not in the catalog or
//     belongs to another function; a universal tool (function null) names a process group;
//   - a tool reads or writes a record type the data model does not have, or proposes one it does have (a type that
//     exists is read or written, not proposed); a tool reads, writes, keeps and proposes nothing;
//   - a tool names a capability cluster that is not in packages/naive/src/functions/it/capability-clusters.json;
//   - a function has no tool, or a process group has no tool;
//   - a tool shows in a phase before any record type it writes can be suggested. Need-now's priors
//     (packages/naive/src/engine/need-now.json) are the one source of when a record type starts: the route table's phase
//     groups come from them, and a tool's phase may not be earlier than the earliest phase in which a prior or one of
//     its conditions reaches the suggest line for some record type the tool writes (startOf in need-now.ts). A tool
//     whose writes are never suggested (master data, records only a person asks for) may show in any phase.
// --json prints the catalog's coverage per function, with each tool's derived status: ready when it proposes nothing (Naive has every record type it needs),
// proposed when it proposes and touches nothing else, partial otherwise.
//
// It reads files through VentureFs (EE-125). Findings exit 1; a catalog, departments.json, data model or cluster
// catalog that cannot be read exits 2.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { DATA_MODEL as MODEL_FILE, FOLDER } from "../records/index.ts";
import { validateValue } from "../records/validate.ts";
import { PHASES } from "../records/routes/routes.ts";
import { startOf, type Prior } from "../engine/need-now.ts";
import type { ToolCatalog } from "../records/types/records.d.ts";

// EE_ROOT points the check at another copy of the repository (used by check-tools-test.ts).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
export const CATALOG = "packages/naive/src/functions/tools.json";
const DEPARTMENTS = "packages/naive/src/functions/departments.json";
const DATA_MODEL = `${FOLDER}/${MODEL_FILE}`;
const CLUSTERS = "packages/naive/src/functions/it/capability-clusters.json";
const NEED_NOW = "packages/naive/src/engine/need-now.json";

type Tool = ToolCatalog["tools"][number];
export type Status = "ready" | "partial" | "proposed";
/**
 * What the catalog is checked against: each function's APQC major number, the data model's record types, the cluster
 * ids, the phases in order, and for each record type need-now lists, the earliest phase it can be suggested in.
 */
export type Known = { functions: Map<string, string>; records: Set<string>; clusters: Set<string>; phases: string[]; starts: Map<string, string | null> };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const list = (v: unknown, key: string): Record<string, unknown>[] => (isObject(v) && Array.isArray(v[key]) ? v[key].filter(isObject) : []);
const schemaErrors = (value: unknown): string[] => {
  const v = validateValue("tool-catalog.schema.json", value);
  return v.status === 0 ? [] : (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l));
};

/** A tool's status, derived from what it touches: nothing proposed is ready, only proposals is proposed. */
export const statusOf = (t: Tool): Status =>
  !t.proposes?.length ? "ready" : t.reads.length || t.writes.length || t.paths?.length ? "partial" : "proposed";

/** Every finding for a catalog that already matches its schema. Pure, so the test can call it on copies. */
export function catalogErrors(cat: ToolCatalog, known: Known): string[] {
  const out: string[] = [];
  const twice = (what: string, xs: string[]) => {
    const seen = new Set<string>();
    for (const x of xs) { if (seen.has(x)) out.push(`${what} ${x} is listed twice`); seen.add(x); }
  };
  twice("kind", cat.kinds.map((k) => k.id));
  twice("process group", cat.process_groups.map((g) => g.id));
  twice("tool", cat.tools.map((t) => t.id));
  twice("tool title", cat.tools.map((t) => t.title));

  const groupFunction = new Map<string, string>();
  for (const g of cat.process_groups) {
    groupFunction.set(g.id, g.function);
    const major = known.functions.get(g.function);
    if (major === undefined) out.push(`process group ${g.id} names function ${g.function}, which is not an id in ${DEPARTMENTS}`);
    else if (g.id.split(".")[0] !== major) out.push(`process group ${g.id} is under ${g.function}, whose APQC id is ${major}.0`);
  }

  const covered = new Set<string>(), served = new Set<string>();
  for (const t of cat.tools) {
    const at = `tool ${t.id}`;
    if (t.function === null) {
      if (t.process_groups.length) out.push(`${at} is universal (function null) but names process groups ${t.process_groups.join(", ")}`);
    } else {
      served.add(t.function);
      if (!known.functions.has(t.function)) out.push(`${at} names function ${t.function}, which is not an id in ${DEPARTMENTS}`);
      for (const g of t.process_groups) {
        const owner = groupFunction.get(g);
        if (owner === undefined) out.push(`${at} names process group ${g}, which is not in the catalog`);
        else if (owner !== t.function) out.push(`${at} serves ${t.function} but names process group ${g}, which belongs to ${owner}`);
        else covered.add(g);
      }
    }
    for (const [field, names] of [["reads", t.reads], ["writes", t.writes]] as const)
      for (const r of names) if (r !== "*" && !known.records.has(r)) out.push(`${at} ${field} ${r}, which is not a record type in ${DATA_MODEL}`);
    for (const r of t.proposes ?? []) if (known.records.has(r)) out.push(`${at} proposes ${r}, which the data model already has: read or write it instead`);
    if (!t.reads.length && !t.writes.length && !t.paths?.length && !t.proposes?.length) out.push(`${at} reads, writes, keeps and proposes nothing`);
    if (t.cluster !== undefined && !known.clusters.has(t.cluster)) out.push(`${at} names cluster ${t.cluster}, which is not in ${CLUSTERS}`);
    const starts = t.writes.flatMap((r) => { const s = known.starts.get(r); return s ? [[r, s] as const] : []; });
    if (starts.length) {
      const first = Math.min(...starts.map(([, s]) => known.phases.indexOf(s)));
      if (known.phases.indexOf(t.phase) < first)
        out.push(`${at} shows in ${t.phase}, but no record type it writes can be suggested before ${known.phases[first]} (${starts.map(([r, s]) => `${r} from ${s}`).join(", ")}, ${NEED_NOW})`);
    }
  }
  for (const f of known.functions.keys()) if (!served.has(f)) out.push(`function ${f} has no tool`);
  for (const g of cat.process_groups) if (!covered.has(g.id)) out.push(`process group ${g.id} (${g.function}) has no tool`);
  return out;
}

/** Each function's tools and process groups, with each tool's status. */
export const coverage = (cat: ToolCatalog) => {
  const fns = [null, ...new Set(cat.process_groups.map((g) => g.function))];
  return fns.map((f) => ({
    function: f,
    process_groups: cat.process_groups.filter((g) => g.function === f).map((g) => g.id),
    tools: cat.tools.filter((t) => t.function === f).map((t) => ({ id: t.id, title: t.title, status: statusOf(t) })),
  }));
};

const read = (file: string) => readJson(join(root, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

/** Reads the catalog and what it refers to, and checks it. */
export const checkTools = Effect.gen(function* () {
  const raw = yield* read(CATALOG);
  const functions = new Map<string, string>();
  for (const d of list(yield* read(DEPARTMENTS), "departments")) {
    const apqc = isObject(d.apqc) && typeof d.apqc.id === "string" ? d.apqc.id.split(".")[0] : "";
    if (typeof d.id === "string") functions.set(d.id, apqc);
  }
  const records = new Set(list(yield* read(DATA_MODEL), "records").flatMap((r) => (typeof r.id === "string" ? [r.id] : [])));
  const clusters = new Set(list(yield* read(CLUSTERS), "clusters").flatMap((c) => (typeof c.id === "string" ? [c.id] : [])));
  const need = yield* read(NEED_NOW);
  const priors = isObject(need) && isObject(need.records) ? need.records : {};
  const suggest = isObject(need) && typeof need.suggest === "number" ? need.suggest : 0.5;
  const phases = PHASES.map((p) => p.id);
  const starts = new Map(Object.entries(priors).map(([id, spec]) => [id, startOf(spec as Prior, phases, suggest).earliest] as const));
  const bad = schemaErrors(raw);
  if (bad.length) return { errors: bad.map((e) => `${CATALOG}: ${e}`), catalog: null };
  const catalog = raw as ToolCatalog;
  return { errors: catalogErrors(catalog, { functions, records, clusters, phases, starts }).map((e) => `${CATALOG}: ${e}`), catalog };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const json = process.argv.includes("--json");
  await runMain(Effect.map(checkTools, ({ errors, catalog }) => {
    if (json && catalog) console.log(JSON.stringify({ ok: !errors.length, errors, coverage: coverage(catalog) }, null, 2));
    if (errors.length) { if (!json) for (const e of errors) console.error(`FAIL  ${e}`); process.exitCode = 1; return; }
    if (json || !catalog) return;
    const n = (s: Status) => catalog.tools.filter((t) => statusOf(t) === s).length;
    const universal = catalog.tools.filter((t) => t.function === null).length;
    console.log(`${catalog.tools.length} tools (${universal} universal) cover ${catalog.process_groups.length} process groups in ${new Set(catalog.process_groups.map((g) => g.function)).size} functions: ${n("ready")} with every record type in Naive, ${n("partial")} partial, ${n("proposed")} proposed.`);
  }));
}
