// naive recipes init: the starter recipe for a pattern, generated from the signal types' projects (everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The recipe", build plan item 9). A venture without a model starts
// with the plain fold of the signal library design (everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md):
// every heard signal folds into the record as its type's projection says, with no criterion. That is the baseline
// the scorer compares against (baselineRecord in outcomes.ts), so a starter renders what the baseline renders.
//
//   starterRecipe(types, pattern, opts)   the source of the starter: data (the plain fold's listeners, each signal
//                                         type's views and each view type's projection) and a small fold that reads it
//   initRecipe(dir, pattern, o)           a person writes <pattern>.recipe.ts once, logged in provenance as theirs
//
// The starter knows the signal types the venture's libraries hold when it is made. A signal of a type version it
// does not know is noise to it (the record is the same without it); running init again on a new pattern, or editing
// the recipe, takes in new versions.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { actingAgent, agentFromEnv, record } from "../../core/provenance.mjs";
import { ventureFile } from "../../core/venture-paths.mjs";
import { validateValue } from "../../records/validate.mjs";
import { idsIn, libraries, mergeTypes, resolveType, splitRange, typesIn } from "../signals.ts";
import { plainListeners } from "./outcomes.ts";
import { lintRecipe, recipeExports } from "./sandbox.ts";
import type { SandboxOptions } from "./sandbox.ts";
import { patternType } from "./render.ts";
import type { SignalType, SignalTypeProjection } from "../../records/types/records.d.ts";

const majorMinor = (v: string) => v.split(".").slice(0, 2).join(".");
const major = (v: string) => Number(v.split(".")[0]);

type Part = { part: string | null; type: string; version: string };
type Projection = { subject_field: string | null; fields: SignalTypeProjection["fields"] };

/** The data a starter folds with: the plain fold's listeners in order, each signal type version's views a listener
 *  may hear (the signal itself, part null, or a composed part, four levels at most), and each view type's projection
 *  to the pattern. Mirrors viewsOf and plainListeners in the signal engine. */
export function starterData(types: readonly SignalType[], pattern: string) {
  const listeners = plainListeners(types, pattern).map((l) => { const [type, range] = splitRange(l.hears); return { type, major: Number(range.slice(1)) }; });
  const projections: Record<string, Projection> = {};
  for (const t of types) {
    const mm = majorMinor(t.version);
    const p = resolveType(types, t.id, mm)?.projects.find((x) => x.route === pattern);
    if (p) projections[`${t.id}@${mm}`] = { subject_field: p.subject_field ?? null, fields: p.fields };
  }
  const heard = (type: string, version: string) => listeners.some((l) => l.type === type && l.major === major(version)) && `${type}@${version}` in projections;
  const views: Record<string, Part[]> = {};
  for (const t of types) {
    const mm = majorMinor(t.version);
    const key = `${t.id}@${mm}`;
    if (key in views) continue;
    const out: Part[] = heard(t.id, mm) ? [{ part: null, type: t.id, version: mm }] : [];
    const walk = (type: SignalType | undefined, prefix: string, depth: number) => {
      if (!type || depth > 4) return;
      for (const c of type.composes ?? []) {
        const [pid, prange] = splitRange(c.type);
        const pt = resolveType(types, pid, prange);
        if (!pt) continue;
        const at = prefix ? `${prefix}.${c.at}` : c.at;
        if (heard(pid, majorMinor(pt.version))) out.push({ part: at, type: pid, version: majorMinor(pt.version) });
        walk(pt, at, depth + 1);
      }
    };
    walk(resolveType(types, t.id, mm), "", 1);
    if (out.length) views[key] = out;
  }
  const hears = [...new Set(Object.keys(views).map((k) => { const [id, v] = splitRange(k); return `${id}@^${major(v)}`; }))].sort();
  return { listeners, views, projections, hears };
}

const json = (x: unknown) => JSON.stringify(x, null, 2);

/** The fold the starter runs: the signal library's fold, over the views its data names, in (time, id) order. A valid
 *  time reaches a recipe as milliseconds, so it is written back as a date when it is midnight UTC and as a UTC
 *  timestamp otherwise. */
const BODY = `type Json = null | boolean | number | string | readonly Json[] | { readonly [k: string]: Json };
type JsonObject = { readonly [k: string]: Json };
type Signal = {
  readonly id: string; readonly type: string; readonly producer: string; readonly subject: string; readonly time: number;
  readonly observed: number; readonly rating: JsonObject; readonly props: JsonObject; readonly withdrawn: boolean;
};
type Input = { readonly route: string; readonly id: string; readonly asOf: number; readonly signals: readonly Signal[] };
type Fold = { readonly reducer: string; readonly value: string; readonly unique_by?: readonly string[] };
type View = { readonly id: string; readonly type: string; readonly version: string; readonly part: string | null; readonly producer: string;
  readonly subject: string; readonly time: string; readonly observed: string; readonly rating: JsonObject; readonly props: JsonObject };
type Contribution = { readonly view: View; readonly fold: Fold; readonly standing: boolean; readonly order: number; readonly value?: unknown };
type Reception = { kind: "salient"; signal: string; fields: string[] } | { kind: "noise"; signal: string; why: string };

const isObject = (v: unknown): v is JsonObject => v !== null && typeof v === "object" && !Array.isArray(v);
const sorted = (x: unknown): unknown => (Array.isArray(x) ? x.map(sorted) : isObject(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted(x[k])])) : x);
const canonical = (x: unknown): string => JSON.stringify(sorted(x));
const timeOf = (ms: number): string => {
  const iso = new Date(ms).toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso.endsWith(".000Z") ? iso.slice(0, 19) + "Z" : iso;
};
const read = (node: unknown, path: string): unknown => {
  let n = node;
  for (const k of path.split(".")) { if (!isObject(n)) return undefined; n = n[k]; }
  return n;
};
const compare = (a: unknown, b: unknown): number => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  const x = canonical(a), y = canonical(b);
  return typeof a === "number" ? -1 : typeof b === "number" ? 1 : x < y ? -1 : x > y ? 1 : 0;
};

function fold(reducer: string, contributions: readonly Contribution[]): unknown {
  const all = [...contributions].sort((a, b) => a.order - b.order).map((c) => ({ ...c, value: read(c.view, c.fold.value) })).filter((c) => c.value !== undefined);
  const standing = all.filter((c) => c.standing);
  if (reducer === "set") return standing.length ? standing[standing.length - 1].value : undefined;
  if (reducer === "first") return standing.length ? standing[0].value : undefined;
  if (reducer === "max") return standing.length ? standing.map((c) => c.value).reduce((a, b) => (compare(b, a) > 0 ? b : a)) : undefined;
  if (reducer === "min") return standing.length ? standing.map((c) => c.value).reduce((a, b) => (compare(b, a) < 0 ? b : a)) : undefined;
  if (reducer === "union") {
    if (!standing.length) return undefined;
    const seen = new Map<string, unknown>();
    for (const c of standing) for (const v of Array.isArray(c.value) ? c.value : [c.value]) seen.set(canonical(v), v);
    return [...seen.values()].sort(compare);
  }
  if (reducer === "append") {
    if (!all.length) return undefined;
    const groups = new Map<string, Contribution[]>();
    for (const c of all) {
      const key = canonical((c.fold.unique_by ?? []).map((p) => read(c.view, p)));
      groups.set(key, [...(groups.get(key) ?? []), c]);
    }
    const entries = [...groups.values()].map((g) => ({ chosen: g.find((c) => c.standing) ?? g[0], support: g.some((c) => c.standing) ? "supported" : "withdrawn" }))
      .sort((a, b) => a.chosen.order - b.chosen.order);
    return entries.map(({ chosen, support }) => {
      const v = chosen.value;
      const body = isObject(v) ? { ...v } : { value: v };
      return { ...body, signal: chosen.view.id, support };
    });
  }
  return undefined;
}

export default function render(input: Input, _k: typeof knobs): { record: { [k: string]: unknown } | null; receptions: Reception[] } {
  const fed = new Map<string, Set<string>>();
  let subjectField: string | null = null;
  let made = false;
  const fields = new Map<string, Contribution[]>();
  for (const l of LISTENERS) {
    for (let order = 0; order < input.signals.length; order++) {
      const s = input.signals[order];
      for (const p of VIEWS[s.type] ?? []) {
        if (p.type !== l.type || Number(p.version.split(".")[0]) !== l.major) continue;
        const props = p.part === null ? s.props : read(s.props, p.part);
        const projection = PROJECTIONS[p.type + "@" + p.version];
        if (!isObject(props) || !projection) continue;
        const view: View = { id: s.id, type: p.type, version: p.version, part: p.part, producer: s.producer, subject: s.subject, time: timeOf(s.time), observed: timeOf(s.observed), rating: s.rating, props };
        if (!made) { made = true; subjectField = projection.subject_field; }
        for (const [field, f] of Object.entries(projection.fields)) fields.set(field, [...(fields.get(field) ?? []), { view, fold: f, standing: !s.withdrawn, order }]);
        fed.set(s.id, new Set([...(fed.get(s.id) ?? []), ...Object.keys(projection.fields)]));
      }
    }
  }
  const receptions: Reception[] = input.signals.map((s) => {
    const f = fed.get(s.id);
    return f ? { kind: "salient", signal: s.id, fields: [...f].sort() } : { kind: "noise", signal: s.id, why: "no projection of " + s.type + " to this pattern when the recipe was made" };
  });
  if (!made) return { record: null, receptions };
  const record: { [k: string]: unknown } = subjectField ? { [subjectField]: input.id } : {};
  for (const [field, cs] of fields) {
    if (new Set(cs.map((c) => c.fold.reducer)).size > 1) continue;
    const v = fold(cs[0].fold.reducer, cs);
    if (v !== undefined) record[field] = v;
  }
  return { record, receptions };
}
`;

/** The source of the starter recipe for a pattern, linted with the given options. */
export function starterRecipe(types: readonly SignalType[], pattern: string, opts: SandboxOptions = {}): { ok: true; source: string; hears: string[]; errors?: undefined } | { ok: false; errors: string[] } {
  const d = starterData(types, pattern);
  if (!d.listeners.length) return { ok: false, errors: [`no signal type the venture's libraries hold projects to ${pattern}`] };
  const source = [
    `// ${pattern}.recipe.ts: the starter recipe naive recipes init wrote from the signal types' projects (autoresearch`,
    "// design, everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, \"The recipe\"). It is the plain fold: every heard",
    "// signal folds into the record as its type's projection says, with no criterion. A signal of a type version it does",
    "// not list is noise. Edit it to do better; it runs only in the sandbox.",
    "",
    `export const hears = ${JSON.stringify({ signals: d.hears })} as const;`,
    "",
    "export const knobs = {};",
    "",
    "// The plain fold's listeners, in order: one per signal type major that projects to this pattern.",
    `const LISTENERS: readonly { readonly type: string; readonly major: number }[] = ${json(d.listeners)};`,
    "",
    "// The views of each signal type version a listener may hear: the signal itself (part null) or a composed part.",
    `const VIEWS: { readonly [signalType: string]: readonly { readonly part: string | null; readonly type: string; readonly version: string }[] } = ${json(d.views)};`,
    "",
    "// Each view type version's projection to this pattern.",
    `const PROJECTIONS: { readonly [viewType: string]: { readonly subject_field: string | null; readonly fields: { readonly [field: string]: Fold } } } = ${json(d.projections)};`,
    "",
    BODY,
  ].join("\n");
  const lint = lintRecipe(source, opts);
  return lint.length ? { ok: false, errors: lint } : { ok: true, source, hears: d.hears };
}

export type InitResult = { ok: true; file: string; hears: string[]; sha256: string; errors?: undefined } | { ok: false; errors: string[] };

/**
 * A person writes the starter recipe for a pattern: <pattern>.recipe.ts, created once and logged in provenance as
 * theirs. It refuses an agent (the router route that holds an agent's recipe write as a draft is build plan item 6),
 * a pattern that is not a projected record type with [id], and a pattern that already has a recipe.
 */
export async function initRecipe(dir: string, pattern: string, o: { by?: string } = {}): Promise<InitResult> {
  if (!o.by) return { ok: false, errors: ["a starter recipe is written by a person: name them with --by <person>"] };
  const agent = actingAgent(o.by);
  if (agent) return { ok: false, errors: [`an agent (${agent}) is acting: an agent's recipe write goes through the recipe route as a draft, not through init`] };
  if (!pattern.includes("[id]")) return { ok: false, errors: [`${pattern} has no [id]: a recipe for a pattern with one record is not built`] };
  const rt = patternType(pattern);
  if (!rt) return { ok: false, errors: [`${pattern} is not a projected record type in the data model`] };
  const rel = `${pattern}.recipe.ts`;
  if (existsSync(ventureFile(dir, rel))) return { ok: false, errors: [`${rel} already exists: edit it, or write a new version through the recipe route`] };
  const libs = await libraries(dir);
  const sets = await Promise.all(libs.map((l) => typesIn(l)));
  const types = mergeTypes(sets.map((s) => s.types)).types;
  const collection = pattern.split("/[id]")[0];
  const s = starterRecipe(types, pattern, { subjects: await idsIn(dir, collection) });
  if (!s.ok) return { ok: false, errors: s.errors };
  const ex = await recipeExports(s.source);
  if (!ex.ok) return { ok: false, errors: [ex.reason] };
  const v = validateValue("recipe.schema.json", ex.output);
  if (v.status !== 0) return { ok: false, errors: [`the starter's exports do not match recipe.schema.json: ${(v.stdout || v.stderr).trim()}`] };
  mkdirSync(dirname(ventureFile(dir, rel)), { recursive: true });
  writeFileSync(ventureFile(dir, rel), s.source);
  const line = record(dir, { entity: rel, route: "knowledge/recipe", activity: "create", agent: agentFromEnv("person", "cli", { id: o.by }), note: `naive recipes init: the plain fold for ${pattern} from the signal types' projects` }) as { sha256: string };
  return { ok: true, file: rel, hears: s.hears, sha256: line.sha256 };
}
