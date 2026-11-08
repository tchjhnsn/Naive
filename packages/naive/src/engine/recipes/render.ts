// Rendering through recipes (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The recipe" and
// "Noise stored beside the record", build plan item 9). The signal pull (packages/naive/src/router/orchestration/
// signals.ts) renders a pattern through its live recipe in the sandbox instead of the plain fold when the venture has
// one, writes the receptions beside each record, and fills hindsight once the horizon has passed. This file decides;
// the pull writes, as the projector.
//
//   projectedPatterns(), patternType(pattern)    the projected record types' route patterns, and one pattern's type
//   liveRecipes(read)                            the venture's live recipes: <pattern>.recipe.ts beside its records
//   renderSubjects(recipe, subjects, known, facts, asOf)   each subject's record and receptions, in one sandbox child
//   receptionsDoc(...)                           <record>.reception.json for one render, with the engine's factors
//   producerShares(known, types, signal, t, horizon)   the producer's confirmed and withdrawn shares as of t
//   sameReceptions(a, b)                         whether two reception files say the same apart from when they were made
//   hindsightDoc(...)                            the receptions with each label: the loss without the signal against with it
//
// Nothing here calls a model or a clock: every time is an argument.
import { createHash } from "node:crypto";
import { readDataModel, globRegExp, venturePaths } from "../../records/index.mjs";
import { validateValue } from "../../records/validate.mjs";
import { readAsOf } from "../../store/as-of.mjs";
import { draft as draftReceptions } from "../generators/reception.ts";
import { fill, withdraw } from "../signals.ts";
import { forecastOutcome, recipeInput, settledRecord, settledSignals, timeMs } from "./outcomes.ts";
import type { Known, RecipeInput } from "./outcomes.ts";
import { recipeExports, runRecipes } from "./sandbox.ts";
import type { JsonObject, RecipeCall, SandboxOptions } from "./sandbox.ts";
import { durationMs, rowLoss } from "./scoring.ts";
import type { Settles } from "./scoring.ts";
import type { Reception, SignalType } from "../../records/types/records.d.ts";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);
const iso = (ms: number): string => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
const round = (x: number) => Math.round(x * 1e9) / 1e9;
export const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

type ModelRecord = { id: string; schema: string; writer?: string; paths?: string[]; settles?: Settles };

/** The route pattern of each projected record type with one collection id: the path competitors/<id>/signals.json
 *  is the pattern competitors/[id]/signals. A pattern with no [id] is left out: rendering one record through a recipe is not built. */
export function projectedPatterns(): string[] {
  const model = readDataModel() as { records: ModelRecord[] };
  const out = new Set<string>();
  for (const r of model.records.filter((x) => x.writer === "projection")) {
    for (const p of venturePaths(r) as string[]) if (!p.includes("**") && (p.match(/\*/g) ?? []).length === 1 && p.endsWith(".json")) out.add(p.replace("*", "[id]").replace(/\.json$/, ""));
  }
  return [...out].sort();
}

/** The projected record type a pattern names: its id, schema file name, settles (or null) and whether any projection
 *  to the pattern writes it once. */
export function patternType(pattern: string): { id: string; schema: string; settles: Settles | null } | null {
  const file = `${fill(pattern, "x")}.json`;
  const model = readDataModel() as { records: ModelRecord[] };
  const r = model.records.find((x) => x.writer === "projection" && (venturePaths(x) as string[]).some((p) => globRegExp(p).test(file)));
  return r ? { id: r.id, schema: r.schema.split("/").at(-1) as string, settles: r.settles ?? null } : null;
}

/** The subject a rendered route names under a pattern, or null: competitors/acme/signals is acme under competitors/[id]/signals. */
export function subjectIn(pattern: string, route: string): string | null {
  const [before, after] = pattern.split("[id]");
  if (after === undefined || !route.startsWith(before) || !route.endsWith(after)) return null;
  const id = route.slice(before.length, route.length - after.length);
  return /^[a-z0-9][a-z0-9-]*$/.test(id) ? id : null;
}

export type LiveRecipe = {
  readonly pattern: string;
  readonly file: string;
  readonly source: string;
  readonly sha256: string;
  readonly ranges: string[];
  /** Named facts: name to file#field. */
  readonly facts: Record<string, string>;
  readonly type: { id: string; schema: string; settles: Settles | null };
};

/** The venture's live recipes, read with `read` (a venture path to its text, or null). A recipe whose exports cannot
 *  be read is a failure, not a fallback to the plain fold: the pull refuses to render that pattern at all. */
export async function liveRecipes(read: (_path: string) => Promise<string | null>): Promise<{ recipes: LiveRecipe[]; failures: string[] }> {
  const recipes: LiveRecipe[] = [];
  const failures: string[] = [];
  for (const pattern of projectedPatterns()) {
    const file = `${pattern}.recipe.ts`;
    const source = await read(file);
    if (source === null) continue;
    const type = patternType(pattern);
    if (!type) continue;
    const ex = await recipeExports(source);
    if (!ex.ok) { failures.push(`${file}: ${ex.reason}`); continue; }
    const facts = isObj(ex.output.hears.facts) ? Object.fromEntries(Object.entries(ex.output.hears.facts).filter((e): e is [string, string] => typeof e[1] === "string")) : {};
    recipes.push({ pattern, file, source, sha256: sha256(source), ranges: ex.output.hears.signals as string[], facts, type });
  }
  return { recipes, failures };
}

/** The type ids a recipe hears: competitor-funding@^1 is competitor-funding. */
export const rangeIds = (ranges: readonly string[]) => [...new Set(ranges.map((r) => r.slice(0, r.indexOf("@"))))].sort();

export type Heard = Pick<Known, "signal" | "library">;
export type SubjectRender = { subject: string; route: string; input: RecipeInput; record: Obj | null; receptions: Obj[] };

/** The sandbox options a render uses: no literal may hold a subject id or a signal address it is given, and the
 *  record must pass its record type's schema. */
function options(recipe: LiveRecipe, subjects: readonly string[], signals: readonly string[]): SandboxOptions {
  return {
    subjects, signals,
    validateRecord: (rec) => { if (rec === null) return null; const v = validateValue(recipe.type.schema, rec); return v.status === 0 ? null : `the record fails ${recipe.type.schema}: ${(v.stdout || v.stderr).trim()}`; },
  };
}

/**
 * Each subject's record and receptions as of asOf, rendered by the recipe in one sandbox child, with the input the
 * scorer gives it (recipeInput): every heard signal about the subject observed by asOf, in (time, id) order, withdrawn
 * as known then, and the named facts. Receptions come back in the input's order. Any lint failure, throw, timeout,
 * invalid output or record that fails its schema fails the whole render.
 */
export async function renderSubjects(recipe: LiveRecipe, subjects: readonly string[], known: readonly Heard[], facts: Record<string, unknown>, asOf: number, lint: readonly string[] = []): Promise<{ ok: true; rendered: SubjectRender[]; reason?: undefined } | { ok: false; reason: string }> {
  const inputs = subjects.map((s) => recipeInput(known, recipe.ranges, recipe.pattern, s, asOf, facts));
  if (!inputs.length) return { ok: true, rendered: [] };
  const opts = options(recipe, [...new Set([...lint, ...subjects])], [...new Set(inputs.flatMap((i) => i.signals.map((s) => s.id)))]);
  const results = await runRecipes(recipe.source, inputs.map((input): RecipeCall => ({ input, knobs: null })), opts);
  const rendered: SubjectRender[] = [];
  for (const [i, input] of inputs.entries()) {
    const r = results[i];
    if (!r.ok) return { ok: false, reason: `${recipe.file} for ${input.id}: ${r.reason}` };
    const by = new Map(r.output.receptions.map((x) => [String(x.signal), x as Obj]));
    rendered.push({ subject: input.id, route: fill(recipe.pattern, input.id), input, record: r.output.record as Obj | null, receptions: input.signals.map((s) => by.get(s.id) as Obj) });
  }
  return { ok: true, rendered };
}

/**
 * The producer's record as of t: of its signals observed before this one and settled by t (observed plus the
 * horizon at or before t), the share a second producer or a person confirmed by t, and the share retracted or
 * superseded by t. Both are null when none has settled, or when the record type declares no horizon.
 */
export function producerShares(known: readonly Known[], types: readonly SignalType[], signal: Heard["signal"], t: number, horizon: number | null): { producer_confirmed: number | null; producer_withdrawn: number | null } {
  if (horizon === null) return { producer_confirmed: null, producer_withdrawn: null };
  const seen = known.filter((k) => timeMs(k.signal.observed) <= t);
  const mine = timeMs(signal.observed);
  const earlier = seen.filter((k) => k.signal.producer === signal.producer && k.signal.id !== signal.id && !k.signal.retracts && timeMs(k.signal.observed) < mine && timeMs(k.signal.observed) + horizon <= t);
  if (!earlier.length) return { producer_confirmed: null, producer_withdrawn: null };
  const confirmed = new Set(settledSignals(seen, types, t, 0).map((k) => k.signal.id));
  const withdrawn = withdraw(seen.map((k) => ({ signal: k.signal, library: k.library }))).withdrawn;
  return {
    producer_confirmed: round(earlier.filter((k) => confirmed.has(k.signal.id)).length / earlier.length),
    producer_withdrawn: round(earlier.filter((k) => withdrawn.has(k.signal.id)).length / earlier.length),
  };
}

/** One record's receptions file for one render, through the reception generator: each heard signal's times, when it
 *  was withdrawn as known at the render, and the factors lag, age and the producer's shares. Uptake stays null (not
 *  built). */
export function receptionsDoc(a: { record: string; recipe: string; asOf: number; rendered: SubjectRender; known: readonly Known[]; types: readonly SignalType[]; horizon: number | null }): { ok: true; doc: Reception; errors?: undefined } | { ok: false; errors: string[] } {
  const seen = a.known.filter((k) => k.signal.subject === a.rendered.subject && timeMs(k.signal.observed) <= a.asOf);
  const withdrawn = withdraw(seen.map((k) => ({ signal: k.signal, library: k.library }))).withdrawn;
  const byId = new Map(a.known.map((k) => [k.signal.id, k.signal]));
  const signals = a.rendered.input.signals.map((v) => {
    const s = byId.get(v.id);
    const by = withdrawn.get(v.id);
    return { id: v.id, time: s?.time ?? iso(v.time), observed: s?.observed ?? iso(v.observed), withdrawn_at: by ? byId.get(by)?.observed ?? null : null,
      ...(s ? producerShares(a.known, a.types, s, a.asOf, a.horizon) : {}) };
  });
  const receptions = a.rendered.receptions.map((r) => ({ kind: r.kind as "salient" | "noise", signal: String(r.signal),
    ...(Array.isArray(r.fields) ? { fields: r.fields.map(String) } : {}), ...(typeof r.why === "string" ? { why: r.why } : {}), ...(typeof r.predicate === "string" ? { predicate: r.predicate } : {}) }));
  const d = draftReceptions({ record: a.record, recipe: a.recipe, as_of: iso(a.asOf), receptions, signals });
  return d.ok && d.draft ? { ok: true, doc: d.draft } : { ok: false, errors: d.errors };
}

/** Whether two reception files say the same thing, apart from when they were made: the same record and recipe, and
 *  per signal the same kind, fields or reasons, times and withdrawal. Factors and hindsight are as of each render. */
export function sameReceptions(a: Reception, b: Reception): boolean {
  const key = (r: Reception) => JSON.stringify([r.record, r.recipe, r.receptions.map((x) => [x.signal, x.kind, x.fields ?? null, x.failed ?? null, x.time, x.observed, x.withdrawn_at])]);
  return key(a) === key(b);
}

/** The named facts as they were at t: each file#field read from the blob store, or null. */
export function factsAsOf(dir: string, facts: Record<string, string>, t: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, ref] of Object.entries(facts)) {
    const at = ref.indexOf("#");
    const [file, field] = at < 0 ? [ref, ""] : [ref.slice(0, at), ref.slice(at + 1)];
    const v = readAsOf(dir, file, iso(t)) as { content: string } | null;
    let value: unknown = null;
    try { value = v ? JSON.parse(v.content) : null; } catch { value = null; }
    for (const k of field ? field.split(".") : []) value = isObj(value) ? value[k] : undefined;
    out[name] = value ?? null;
  }
  return out;
}

/** Whether a receptions file is due for hindsight at now: some reception has none, and the render's as-of point plus
 *  the horizon has passed, so the settled record at that point is final. */
export const hindsightDue = (doc: Reception, horizon: number, now: number) => doc.receptions.some((r) => !r.hindsight) && Date.parse(doc.as_of) + horizon <= now;

/**
 * Hindsight for one receptions file: the recipe that rendered it runs again at its as-of point, once with every
 * signal and once without each one, and each record is scored against the settled record at that point (only people
 * and producers settle a claim). A signal is helpful when the loss without it is higher, harmful when lower, and
 * inert when the same. A reception that already has a label keeps it.
 */
export async function hindsightDoc(a: { doc: Reception; source: string; ranges: readonly string[]; pattern: string; subject: string; schema: string; known: readonly Known[]; types: readonly SignalType[]; settles: Settles; facts: Record<string, unknown>; now: number }): Promise<{ ok: true; doc: Reception; reason?: undefined } | { ok: false; reason: string }> {
  const t = Date.parse(a.doc.as_of), h = durationMs(a.settles.horizon);
  const without = a.doc.receptions.filter((r) => !r.hindsight).map((r) => r.signal);
  const inputs = [recipeInput(a.known, a.ranges, a.pattern, a.subject, t, a.facts), ...without.map((id) => recipeInput(a.known.filter((k) => k.signal.id !== id), a.ranges, a.pattern, a.subject, t, a.facts))];
  const opts: SandboxOptions = { subjects: [a.subject], signals: inputs[0].signals.map((s) => s.id) };
  const results = await runRecipes(a.source, inputs.map((input): RecipeCall => ({ input, knobs: null })), opts);
  const bad = results.find((r) => !r.ok);
  if (bad && !bad.ok) return { ok: false, reason: bad.reason };
  const settled = settledRecord(a.known, a.types, a.pattern, a.subject, t, h);
  const outcomes: Record<string, 0 | 1 | null> = {};
  for (const [f, spec] of Object.entries(a.settles.forecasts ?? {})) outcomes[f] = spec.resolved_by.signals?.length ? forecastOutcome(a.known, a.types, spec.resolved_by.signals, a.subject, t, durationMs(spec.window), h) : null;
  const loss = (r: (typeof results)[number]) => round(rowLoss(a.settles, r.ok ? (r.output.record as JsonObject | null) : null, settled, outcomes));
  const withLoss = loss(results[0]);
  const at = iso(a.now);
  const labels = new Map(without.map((id, i) => {
    const lw = loss(results[i + 1]);
    const label: "helpful" | "inert" | "harmful" = lw > withLoss ? "helpful" : lw < withLoss ? "harmful" : "inert";
    return [id, { label, recipe: a.doc.recipe, at, loss_with: withLoss, loss_without: lw }];
  }));
  const doc: Reception = { ...a.doc, receptions: a.doc.receptions.map((r) => (labels.has(r.signal) ? { ...r, hindsight: labels.get(r.signal) } : r)) };
  const v = validateValue("reception.schema.json", doc);
  return v.status === 0 ? { ok: true, doc } : { ok: false, reason: `the receptions with hindsight fail reception.schema.json: ${(v.stdout || v.stderr).trim()}` };
}
