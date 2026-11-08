// Eval sets: freezing what a recipe is scored on, and scoring it (everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The metric", "The eval plan" and "Noise stored beside the record",
// build plan item 5). The arithmetic is pure and lives in outcomes.ts and scoring.ts; this file reads the venture and
// runs the sandbox.
//
//   loadSignals(dir)                         every signal the venture reads, with its library and who stands behind it
//   drawWindows(start, end, cadence, gap)    training, dev and holdout as-of points on a cadence grid, purged
//   planRecipe(dir, pattern, opts)           a person's plan: writes <pattern>.plan.json and freezes _eval/<sha>/
//   loadPlan(dir, pattern), loadEvalSet(dir, sha)
//   evaluate(source, set, windows, opts)     runs a recipe on the set's rows in the sandbox, with noise ablation
//   checkRecipe(dir, pattern)                training feedback: per-row losses, settled and predicted, noise disagreements
//   scoreExperiment(set, plan, candidate, tip)   the dev verdict: keep, discard or fail
//   scoreHoldout(set, plan, candidate, live)     the one-bit holdout check a person's accept runs: pass or fail
//   forwardSet(dir, pattern, plan, since, now, sources)   rows at points after since whose horizon passed by now
//   scoreForward(set, plan, live, previous)      monitor's forward check: holds, or regressed against the previous recipe
//
// Plans are a person's. The router never serves _eval/. Its recipe route (router/recipes.ts) calls loadPlan,
// loadEvalSet and scoreExperiment to score a recipe write against the tip, scoreHoldout when a person accepts the
// tip, and forwardSet and scoreForward when monitor runs (build plan item 8).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { actingAgent, agentFromEnv, entries, record } from "../../core/provenance.mjs";
import { sessions, spans } from "../../core/instrumentation.mjs";
import { ventureFile } from "../../core/venture-paths.mjs";
import { readDataModel, globRegExp, venturePaths } from "../../records/index.mjs";
import { validateValue } from "../../records/validate.mjs";
import { readAsOf } from "../../store/as-of.mjs";
import { draft as draftPlan } from "../generators/eval-plan.ts";
import { LOCAL_LIBRARY, LOCAL_ROOT, dedupeSignals, fill, libraries, mergeTypes, resolveType, signalsOf, splitRange, typesIn } from "../signals.ts";
import { baselineRecord, forecastOutcome, recipeInput, settledRecord, timeMs } from "./outcomes.ts";
import type { Author, Known } from "./outcomes.ts";
import { recipeExports, runRecipes, scan, stripTypes } from "./sandbox.ts";
import type { JsonObject, RecipeCall, SandboxOptions } from "./sandbox.ts";
import { durationMs, fieldLosses, rowLoss, settledLoss, verdict } from "./scoring.ts";
import type { Outcomes, RowScore, Settles, Verdict } from "./scoring.ts";
import type { EvalPlan, Signal, SignalType } from "../../records/types/records.d.ts";

type Obj = Record<string, unknown>;
/** forward: points after the live recipe changed, scored by monitor once their horizon passed; never frozen. */
export type Window = "training" | "dev" | "holdout" | "forward";
/** One frozen (record, as-of point) row: the settled record, the plain fold and each forecast's outcome. */
export type EvalRow = { key: string; subject: string; point: string; window: Window; weight: number; settled: Obj | null; baseline: Obj | null; outcomes: Outcomes };
/** A fact's frozen versions: the content at each as-of point, as readAsOf gave it. */
export type FrozenFact = { ref: string; versions: { at: string; sha256: string; value: unknown }[] };
export type EvalSet = {
  plan: string; pattern: string; record_type: string; schema: string; made: string; settles: Settles;
  points: EvalPlan["windows"]; subjects: string[]; types: SignalType[]; index: Known[]; facts: Record<string, FrozenFact>; rows: EvalRow[];
};

const EVAL = "_eval";
const iso = (ms: number): string => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
const readJson = (file: string): unknown => JSON.parse(readFileSync(file, "utf8"));
const isObj = (v: unknown): v is Obj => v !== null && typeof v === "object" && !Array.isArray(v);

/**
 * Every signal the venture reads, through the signal engine's libraries (its local raw/signals/ and each source that
 * carries signals; a library that is not a folder is read once a person confirmed it), and every signal type they
 * and Naive's packages define. A local signal is a person's when a provenance line for its file names agent.kind
 * person and none names anyone else, and "other" otherwise (an agent's, or no line at all); a signal in another
 * library is its producer's. A signal file that fails its checks is left out and named in problems.
 */
export async function loadSignals(dir: string): Promise<{ known: Known[]; types: SignalType[]; problems: string[] }> {
  const people = new Set<string>(), others = new Set<string>();
  for (const e of entries(dir) as { entity: string; agent?: { kind?: string } }[]) (e.agent?.kind === "person" ? people : others).add(e.entity);
  const libs = await libraries(dir);
  const typeSets = await Promise.all(libs.map((l) => typesIn(l)));
  const merged = mergeTypes(typeSets.map((t) => t.types));
  const types: SignalType[] = merged.types;
  const ids = [...new Set(types.map((t) => t.id))];
  const sets = await Promise.all(libs.map((l) => signalsOf(l, ids, null, types)));
  const known: Known[] = dedupeSignals(sets.map((x) => x.signals)).map((p) => {
    if (p.library !== LOCAL_LIBRARY) return { signal: p.signal, library: p.library, by: "producer" as Author };
    const rel = `${LOCAL_ROOT}/${p.path}`;
    return { signal: p.signal, library: p.library, by: (people.has(rel) && !others.has(rel) ? "person" : "other") as Author };
  }).sort((a, b) => (a.signal.id < b.signal.id ? -1 : a.signal.id > b.signal.id ? 1 : 0));
  return { known, types, problems: [...typeSets.flatMap((t) => t.problems), ...merged.problems, ...sets.flatMap((x) => x.problems), ...libs.flatMap((l) => (l.problem ? [l.problem] : []))] };
}

/** The record type a pattern names: the data model type whose venture path matches the pattern's file. */
export function recordTypeFor(pattern: string): { id: string; schema: string; settles: Settles } | null {
  const file = `${fill(pattern, "x")}.json`;
  const model = readDataModel() as { records: { id: string; schema: string; paths?: string[]; settles?: Settles }[] };
  const r = model.records.find((x) => venturePaths(x).some((p: string) => globRegExp(p).test(file)));
  return r?.settles ? { id: r.id, schema: r.schema.split("/").at(-1) as string, settles: r.settles } : null;
}

/**
 * Training, dev and holdout as-of points on a cadence grid from start to end: about 60, 20 and 20 percent of the
 * points that are left once two purges are taken out. Dev starts more than a gap after training ends, holdout more
 * than a gap after dev ends, and read_cut is the last training point plus the horizon, so it is before the first
 * dev point. Null when there are too few points for one in each window.
 */
export function drawWindows(start: number, end: number, cadence: number, gap: number, horizon: number): { windows: EvalPlan["windows"]; read_cut: string } | null {
  const points: number[] = [];
  for (let t = start; t <= end; t += cadence) points.push(t);
  const g = Math.floor(gap / cadence) + 1;
  const usable = points.length + 2 - 2 * g;
  if (usable < 3) return null;
  const dev = Math.max(1, Math.floor(usable * 0.2)), holdout = Math.max(1, Math.floor(usable * 0.2)), training = usable - dev - holdout;
  const d0 = training - 1 + g, h0 = d0 + dev - 1 + g;
  const pick = (from: number, n: number) => points.slice(from, from + n).map(iso);
  return { windows: { training: pick(0, training), dev: pick(d0, dev), holdout: pick(h0, holdout) }, read_cut: iso(points[training - 1] + horizon) };
}

const planFile = (dir: string, pattern: string) => ventureFile(dir, `${pattern}.plan.json`);
const recipeFile = (dir: string, pattern: string) => ventureFile(dir, `${pattern}.recipe.ts`);
const evalFile = (dir: string, sha: string) => ventureFile(dir, `${EVAL}/${sha}/eval-set.json`);

export type PlanOptions = {
  by?: string; weights?: "uniform" | "cited"; min_gain?: number; gap?: string; made?: string;
  budgets?: EvalPlan["budgets"]; bootstrap?: EvalPlan["bootstrap"]; limits?: EvalPlan["limits"];
};
export type PlanResult = { ok: true; plan: EvalPlan; file: string; eval_set: string; rows: Record<Window, number>; problems: string[]; errors?: undefined } | { ok: false; errors: string[] };

const factPath = (ref: string): [string, string | null] => { const at = ref.indexOf("#"); return at < 0 ? [ref, null] : [ref.slice(0, at), ref.slice(at + 1)]; };
const readField = (o: unknown, path: string | null): unknown => (path === null ? o : path.split(".").reduce<unknown>((n, k) => (isObj(n) ? n[k] : undefined), o));

/** How often provenance and traces show the venture used a record before the cut: lines whose derived_from names
 *  its file, and spans that end by the cut and mention it. */
function uses(dir: string, file: string, cut: number): number {
  let n = 0;
  for (const e of entries(dir) as { at: string; derived_from?: string[] }[]) if (Date.parse(e.at) <= cut && e.derived_from?.includes(file)) n++;
  for (const s of sessions(dir)) for (const l of spans(dir, s) as { end?: string; start?: string }[]) {
    if (Date.parse(l.end ?? l.start ?? "") <= cut && JSON.stringify(l).includes(file)) n++;
  }
  return n;
}

/** The facts the recipes name (hears.facts), each read as readAsOf gives it at every point, newest version last. */
async function freezeFacts(dir: string, sources: readonly string[], points: readonly string[]): Promise<Record<string, FrozenFact>> {
  const facts: Record<string, FrozenFact> = {};
  for (const source of sources) {
    const ex = await recipeExports(source);
    const named = ex.ok && isObj(ex.output.hears.facts) ? ex.output.hears.facts : {};
    for (const [name, ref] of Object.entries(named)) {
      if (typeof ref !== "string" || name in facts) continue;
      const [file, field] = factPath(ref);
      const versions = new Map<string, FrozenFact["versions"][number]>();
      for (const p of points) {
        const v = readAsOf(dir, file, p);
        if (v && !versions.has(v.sha256)) versions.set(v.sha256, { at: v.at, sha256: v.sha256, value: readField(JSON.parse(v.content), field) ?? null });
      }
      facts[name] = { ref, versions: [...versions.values()].sort((a, b) => (a.at < b.at ? -1 : 1)) };
    }
  }
  return facts;
}

/** One row per subject and point where the settled record or the plain fold is not null, with each forecast's outcome. */
function rowsAt(index: readonly Known[], types: SignalType[], pattern: string, subjects: readonly string[], s: Settles, h: number, windows: readonly [Window, readonly string[]][], weightOf: ReadonlyMap<string, number>): EvalRow[] {
  const rows: EvalRow[] = [];
  for (const [window, points] of windows) {
    for (const point of points) {
      const t = Date.parse(point);
      for (const subject of subjects) {
        const settled = settledRecord(index, types, pattern, subject, t, h);
        const baseline = baselineRecord(index, types, pattern, subject, t);
        if (settled === null && baseline === null) continue;
        const outcomes: Record<string, 0 | 1 | null> = {};
        for (const [f, spec] of Object.entries(s.forecasts ?? {})) {
          outcomes[f] = spec.resolved_by.signals?.length ? forecastOutcome(index, types, spec.resolved_by.signals, subject, t, durationMs(spec.window), h) : null;
        }
        rows.push({ key: `${subject}@${point}`, subject, point, window, weight: weightOf.get(subject) ?? 1, settled, baseline, outcomes });
      }
    }
  }
  return rows;
}

/**
 * A person's plan for the recipe at a pattern. It draws the windows from the signals about the pattern's subjects,
 * freezes the eval set (the as-of points, the index of every signal about those subjects observed by the time the
 * plan is made, the facts the current recipe names as readAsOf gives them, and each row's settled record, plain
 * fold and forecast outcomes) at <venture>/_eval/<sha>/eval-set.json, writes <pattern>.plan.json, and logs both in
 * provenance as the person's. A signal file that fails its checks is left out and listed in problems. It refuses an agent, a pattern with no settles, a forecast window longer than the
 * horizon, too few rows for a window's min_counts, and a holdout that would reuse the previous plan's.
 */
export async function planRecipe(dir: string, pattern: string, o: PlanOptions = {}): Promise<PlanResult> {
  if (!o.by) return { ok: false, errors: ["a plan is a person's: name them with --by <person>"] };
  const agent = actingAgent(o.by);
  if (agent) return { ok: false, errors: [`an agent (${agent}) is acting: only a person makes an eval plan`] };
  if (!pattern.includes("[id]")) return { ok: false, errors: [`${pattern} has no [id]: a plan for a pattern with one record is not built`] };
  const rt = recordTypeFor(pattern);
  if (!rt) return { ok: false, errors: [`no record type at ${pattern} declares settles in the data model`] };
  const s = rt.settles, h = durationMs(s.horizon), cadence = durationMs(s.cadence), gap = durationMs(o.gap ?? s.horizon);
  if (!(h > 0) || !(cadence > 0) || !(gap >= h)) return { ok: false, errors: ["the horizon and cadence must be durations, and the gap at least the horizon"] };
  for (const [f, spec] of Object.entries(s.forecasts ?? {})) if (durationMs(spec.window) > h) return { ok: false, errors: [`forecast ${f}: its window is longer than the horizon, so its outcome would not settle in the plan`] };
  const made = Date.parse(o.made ?? iso(Date.now()));

  const { known: all, types, problems } = await loadSignals(dir);
  const projects = (sig: Signal) => { const [id, v] = splitRange(sig.type); return resolveType(types, id, v)?.projects.some((p) => p.route === pattern) ?? false; };
  const seen = all.filter((k) => timeMs(k.signal.observed) <= made);
  const subjects = [...new Set(seen.filter((k) => projects(k.signal)).map((k) => k.signal.subject))].sort();
  const index = seen.filter((k) => subjects.includes(k.signal.subject));
  const firstSeen = Math.min(...index.filter((k) => projects(k.signal)).map((k) => timeMs(k.signal.observed)));
  if (!Number.isFinite(firstSeen)) return { ok: false, errors: [`no signal about any subject of ${pattern} was observed by ${iso(made)}`] };
  const day = 86_400_000, start = Math.ceil(firstSeen / day) * day;
  const drawn = drawWindows(start, made - h, cadence, gap, h);
  if (!drawn) return { ok: false, errors: ["too few as-of points between the first signal and the plan's time less the horizon for three purged windows"] };

  // The previous plan, if any: this one follows it, and its holdout may not reuse the earlier one's points.
  let previous: EvalPlan | null = null;
  if (existsSync(planFile(dir, pattern))) previous = readJson(planFile(dir, pattern)) as EvalPlan;
  if (previous && Date.parse(drawn.windows.holdout[0]) <= Math.max(...previous.windows.holdout.map(Date.parse))) {
    return { ok: false, errors: [`the holdout would start at ${drawn.windows.holdout[0]}, inside the previous plan's (${previous.sha}): a holdout point is never reused`] };
  }

  // The facts the current recipe names, frozen at every as-of point.
  const facts = existsSync(recipeFile(dir, pattern)) ? await freezeFacts(dir, [readFileSync(recipeFile(dir, pattern), "utf8")], [...drawn.windows.training, ...drawn.windows.dev, ...drawn.windows.holdout]) : {};

  const weights = o.weights ?? "uniform", cut = Date.parse(drawn.read_cut);
  const weightOf = new Map(subjects.map((id) => [id, weights === "cited" ? 1 + Math.min(9, uses(dir, `${fill(pattern, id)}.json`, cut)) : 1]));
  const rows = rowsAt(index, types, pattern, subjects, s, h, [["training", drawn.windows.training], ["dev", drawn.windows.dev], ["holdout", drawn.windows.holdout]], weightOf);
  const count: Record<Window, number> = { training: 0, dev: 0, holdout: 0, forward: 0 };
  for (const r of rows) count[r.window]++;
  const short = (["training", "dev", "holdout"] as const).filter((w) => count[w] < s.min_counts[w]).map((w) => `${w} has ${count[w]} rows, fewer than min_counts ${s.min_counts[w]}`);
  if (short.length) return { ok: false, errors: short };

  const d = draftPlan({
    pattern, version: previous ? previous.version + 1 : 1, previous: previous?.sha, made: iso(made), made_by: { kind: "person", id: o.by },
    horizon: s.horizon, gap: o.gap ?? s.horizon, read_cut: drawn.read_cut, windows: drawn.windows, weights, min_gain: o.min_gain ?? 0.01,
    bootstrap: o.bootstrap, budgets: o.budgets ?? { dev_evaluations: 40, holdout_checks: 3 }, limits: o.limits,
  } as Partial<EvalPlan>);
  if (!d.ok || !d.draft) return { ok: false, errors: d.errors };
  const plan = d.draft as EvalPlan;
  const set: EvalSet = { plan: plan.sha, pattern, record_type: rt.id, schema: rt.schema, made: plan.made, settles: s, points: plan.windows, subjects, types, index, facts, rows };

  const agentOf = agentFromEnv("person", "cli", { id: o.by });
  const setRel = `${EVAL}/${plan.sha}/eval-set.json`, planRel = `${pattern}.plan.json`;
  mkdirSync(dirname(evalFile(dir, plan.sha)), { recursive: true });
  writeFileSync(evalFile(dir, plan.sha), JSON.stringify(set, null, 2) + "\n");
  record(dir, { entity: setRel, activity: "create", agent: agentOf, note: `eval set for ${pattern}, plan ${plan.sha}` });
  mkdirSync(dirname(planFile(dir, pattern)), { recursive: true });
  writeFileSync(planFile(dir, pattern), JSON.stringify(plan, null, 2) + "\n");
  record(dir, { entity: planRel, activity: previous ? "write" : "create", agent: agentOf, derived_from: [setRel] });
  return { ok: true, plan, file: planRel, eval_set: `${EVAL}/${plan.sha}/`, rows: count, problems };
}

export const loadPlan = (dir: string, pattern: string): EvalPlan | null => (existsSync(planFile(dir, pattern)) ? readJson(planFile(dir, pattern)) as EvalPlan : null);
export const loadEvalSet = (dir: string, sha: string): EvalSet | null => (existsSync(evalFile(dir, sha)) ? readJson(evalFile(dir, sha)) as EvalSet : null);

/** The facts as of t: each frozen fact's latest version at or before t, or null. */
function factsAt(set: EvalSet, names: readonly string[], t: number): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const n of names) out[n] = (set.facts[n]?.versions ?? []).filter((v) => Date.parse(v.at) <= t).at(-1)?.value ?? null;
  return out;
}

/** A noise reception the record turned out to depend on: without the signal, the record is not byte-identical. */
export type Disagreement = { row: string; signal: string; with: unknown; without: unknown };
export type ScoredRow = EvalRow & { loss: number; fields: Record<string, number>; predicted: Obj | null; receptions: unknown[] };
export type Evaluation = { ok: true; rows: ScoredRow[]; disagreements: Disagreement[] } | { ok: false; reason: string };
const failed = (e: Evaluation): e is { ok: false; reason: string } => !e.ok;

/** The sandbox options for a plan: its limits, the lint's subjects and signal addresses, and the record's schema. */
function sandboxOptions(set: EvalSet, plan: Pick<EvalPlan, "limits">): SandboxOptions {
  return {
    subjects: set.subjects, signals: set.index.map((k) => k.signal.id),
    callMs: plan.limits?.call_ms, wallMs: plan.limits?.wall_ms, memoryMb: plan.limits?.memory_mb,
    validateRecord: (rec) => { if (rec === null) return null; const v = validateValue(set.schema, rec); return v.status === 0 ? null : `the record fails ${set.schema}: ${(v.stdout || v.stderr).trim()}`; },
  };
}

/**
 * Runs a recipe on the set's rows in the given windows, each row as of its point, from the frozen index and facts.
 * Its exports (hears and knobs) must match recipe.schema.json. Any lint failure, throw, timeout or invalid output fails the whole evaluation. With ablate, every signal the
 * recipe calls noise is taken out of the index and the row run again: a record that is not byte-identical is a
 * disagreement.
 */
export async function evaluate(source: string, set: EvalSet, plan: Pick<EvalPlan, "limits">, windows: readonly Window[], o: { ablate?: boolean } = {}): Promise<Evaluation> {
  const opts = sandboxOptions(set, plan);
  const ex = await recipeExports(source, opts);
  if (!ex.ok) return { ok: false, reason: ex.reason };
  const shape = validateValue("recipe.schema.json", ex.output);
  if (shape.status !== 0) return { ok: false, reason: `the exports fail recipe.schema.json: ${(shape.stdout || shape.stderr).trim()}` };
  const ranges = ex.output.hears.signals as string[];
  const named = isObj(ex.output.hears.facts) ? Object.keys(ex.output.hears.facts) : [];
  const missing = named.filter((n) => !(n in set.facts) || (set.facts[n].ref !== (ex.output.hears.facts as JsonObject)[n]));
  if (missing.length) return { ok: false, reason: `the recipe names facts this plan did not freeze (${missing.join(", ")}): make a new plan` };
  const rows = set.rows.filter((r) => windows.includes(r.window));
  if (!rows.length) return { ok: false, reason: `the plan has no rows in ${windows.join(" or ")}` };
  const inputOf = (r: EvalRow, known: readonly Known[]) => { const t = Date.parse(r.point); return recipeInput(known, ranges, set.pattern, r.subject, t, factsAt(set, named, t)); };
  const calls: RecipeCall[] = rows.map((r) => ({ input: inputOf(r, set.index), knobs: null }));
  const results = await runRecipes(source, calls, opts);
  const scored: ScoredRow[] = [];
  for (const [i, r] of rows.entries()) {
    const res = results[i];
    if (!res.ok) return { ok: false, reason: `${r.key}: ${res.reason}` };
    const predicted = res.output.record as Obj | null;
    scored.push({ ...r, predicted, receptions: res.output.receptions, loss: rowLoss(set.settles, predicted, r.settled, r.outcomes), fields: fieldLosses(set.settles, predicted, r.settled, r.outcomes) });
  }
  const disagreements: Disagreement[] = [];
  if (o.ablate) {
    const ablations: { row: ScoredRow; signal: string }[] = [];
    for (const row of scored) for (const rc of row.receptions) if (isObj(rc) && rc.kind === "noise" && typeof rc.signal === "string") ablations.push({ row, signal: rc.signal });
    const again = await runRecipes(source, ablations.map((a) => ({ input: inputOf(a.row, set.index.filter((k) => k.signal.id !== a.signal)), knobs: null })), opts);
    for (const [i, a] of ablations.entries()) {
      const res = again[i];
      if (!res.ok) return { ok: false, reason: `${a.row.key} without ${a.signal}: ${res.reason}` };
      if (JSON.stringify(res.output.record) !== JSON.stringify(a.row.predicted)) disagreements.push({ row: a.row.key, signal: a.signal, with: a.row.predicted, without: res.output.record });
    }
  }
  return { ok: true, rows: scored, disagreements };
}

/** The baseline's loss on a row: the plain fold at the point, which forecasts nothing. */
const baselineLoss = (set: EvalSet, r: EvalRow): number => rowLoss(set.settles, r.baseline, r.settled, r.outcomes);

export type Check = { ok: true; plan: string; score: number; baseline_score: number; rows: { key: string; loss: number; baseline_loss: number; fields: Record<string, number>; settled: Obj | null; predicted: Obj | null; outcomes: Outcomes }[]; disagreements: Disagreement[]; reason?: undefined } | { ok: false; reason: string };

/** Training feedback for the recipe at a pattern under its current plan: every training row's loss, field losses,
 *  settled and predicted records and forecast outcomes, the settled loss beside the plain fold's, and every noise
 *  disagreement. */
export async function checkRecipe(dir: string, pattern: string, source?: string): Promise<Check> {
  const plan = loadPlan(dir, pattern);
  if (!plan) return { ok: false, reason: `no plan at ${pattern}.plan.json: a person makes one with naive recipes plan ${pattern} --by <person>` };
  const set = loadEvalSet(dir, plan.sha);
  if (!set) return { ok: false, reason: `the eval set ${EVAL}/${plan.sha}/ is missing` };
  const src = source ?? (existsSync(recipeFile(dir, pattern)) ? readFileSync(recipeFile(dir, pattern), "utf8") : null);
  if (src === null) return { ok: false, reason: `no recipe at ${pattern}.recipe.ts` };
  const e = await evaluate(src, set, plan, ["training"], { ablate: true });
  if (failed(e)) return e;
  const rows = e.rows.map((r) => ({ key: r.key, loss: r.loss, baseline_loss: baselineLoss(set, r), fields: r.fields, settled: r.settled, predicted: r.predicted, outcomes: r.outcomes }));
  return { ok: true, plan: plan.sha, score: settledLoss(e.rows), baseline_score: settledLoss(e.rows.map((r) => ({ loss: baselineLoss(set, r), weight: r.weight }))), rows, disagreements: e.disagreements };
}

/** A recipe's size: the tokens of its source once types are stripped, comments not counted. */
export function recipeSize(source: string): number {
  const js = stripTypes(source);
  const tokens = js.ok ? scan(js.output) : null;
  return tokens?.ok ? tokens.output.length : Number.POSITIVE_INFINITY;
}

export type Scored = (Verdict & { training: { score: number; rows: number } }) | { verdict: "fail"; reason: string };
const toRows = (rows: readonly ScoredRow[]): RowScore[] => rows.map((r) => ({ key: r.key, point: Date.parse(r.point), weight: r.weight, loss: r.loss }));

/**
 * The dev verdict on a candidate recipe. It fails on any lint failure, throw, timeout or invalid output on training
 * or dev, and on any noise disagreement. Otherwise it scores dev against the tip on paired rows, or against the
 * plain fold for a recipe's first write (tip_score null; a smaller recipe is never kept against the plain fold).
 */
export async function scoreExperiment(set: EvalSet, plan: EvalPlan, candidate: string, tip: string | null): Promise<Scored> {
  const c = await evaluate(candidate, set, plan, ["training", "dev"], { ablate: true });
  if (failed(c)) return { verdict: "fail", reason: c.reason };
  if (c.disagreements.length) return { verdict: "fail", reason: `noise that is not: ${c.disagreements.map((d) => `${d.row} ${d.signal}`).join(", ")}` };
  const train = c.rows.filter((r) => r.window === "training"), dev = c.rows.filter((r) => r.window === "dev");
  const training = { score: Math.round(settledLoss(train) * 1e9) / 1e9, rows: train.length };
  let against: RowScore[];
  let size: { candidate: number; against: number };
  if (tip === null) {
    against = dev.map((r) => ({ key: r.key, point: Date.parse(r.point), weight: r.weight, loss: baselineLoss(set, r) }));
    size = { candidate: 0, against: 0 };
  } else {
    const t = await evaluate(tip, set, plan, ["dev"]);
    if (failed(t)) return { verdict: "fail", reason: `the tip did not run: ${t.reason}` };
    against = toRows(t.rows);
    size = { candidate: recipeSize(candidate), against: recipeSize(tip) };
  }
  const v = verdict(toRows(dev), against, plan, size);
  if (v.dev.rows < 1) return { verdict: "fail", reason: "no dev row was scored" };
  return { ...v, dev: tip === null ? { ...v.dev, tip_score: null } : v.dev, training };
}

export type HoldoutResult = { result: "pass" | "fail"; rows: number };

/**
 * The holdout check a person's accept runs (one bit, the Ladder mechanism): the candidate against the live recipe
 * on the holdout window's paired rows, or against the plain fold when nothing is live, judged as dev is (better by the
 * margin, or smaller and no worse). Any run that fails, or no holdout row, is a fail. Only the bit leaves here, so a
 * check leaks at most one bit about the holdout.
 */
export async function scoreHoldout(set: EvalSet, plan: EvalPlan, candidate: string, live: string | null): Promise<HoldoutResult> {
  const c = await evaluate(candidate, set, plan, ["holdout"]);
  if (failed(c)) return { result: "fail", rows: 0 };
  let against: RowScore[];
  let size = { candidate: 0, against: 0 };
  if (live === null) against = c.rows.map((r) => ({ key: r.key, point: Date.parse(r.point), weight: r.weight, loss: baselineLoss(set, r) }));
  else {
    const l = await evaluate(live, set, plan, ["holdout"]);
    if (failed(l)) return { result: "fail", rows: 0 };
    against = toRows(l.rows);
    size = { candidate: recipeSize(candidate), against: recipeSize(live) };
  }
  const v = verdict(toRows(c.rows), against, plan, size);
  return { result: v.verdict === "keep" && v.dev.rows > 0 ? "pass" : "fail", rows: v.dev.rows };
}

/**
 * The forward rows for monitor: every point on the record type's cadence after since whose horizon has passed by now,
 * for every subject of the pattern, from every signal observed by now (live, not frozen: the plan never saw these
 * points). Facts the recipes name are read as of each point. Rows weigh 1 each.
 */
export async function forwardSet(dir: string, pattern: string, plan: EvalPlan, since: number, now: number, sources: readonly string[]): Promise<{ ok: true; set: EvalSet; reason?: undefined } | { ok: false; reason: string }> {
  const rt = recordTypeFor(pattern);
  if (!rt) return { ok: false, reason: `no record type at ${pattern} declares settles in the data model` };
  const s = rt.settles, h = durationMs(s.horizon), cadence = durationMs(s.cadence);
  const { known: all, types } = await loadSignals(dir);
  const projects = (sig: Signal) => { const [id, v] = splitRange(sig.type); return resolveType(types, id, v)?.projects.some((p) => p.route === pattern) ?? false; };
  const seen = all.filter((k) => timeMs(k.signal.observed) <= now);
  const subjects = [...new Set(seen.filter((k) => projects(k.signal)).map((k) => k.signal.subject))].sort();
  const index = seen.filter((k) => subjects.includes(k.signal.subject));
  const day = 86_400_000, points: string[] = [];
  for (let t = Math.floor(since / day) * day + cadence; t + h <= now; t += cadence) points.push(iso(t));
  const facts = await freezeFacts(dir, sources, points);
  const rows = rowsAt(index, types, pattern, subjects, s, h, [["forward", points]], new Map());
  return { ok: true, set: { plan: plan.sha, pattern, record_type: rt.id, schema: rt.schema, made: iso(now), settles: s, points: plan.windows, subjects, types, index, facts, rows } };
}

export type Forward =
  | { status: "waiting"; rows: number; needs: number; reason: string }
  | { status: "holds" | "regressed"; rows: number; live_score: number; previous_score: number; margin: number; reason: string }
  | { status: "fail"; rows: number; reason: string };

/**
 * Monitor's forward check: the live recipe against the one live before it (or the plain fold) on the forward rows,
 * judged by the plan's margin. regressed: the previous recipe beats the live one by more than the margin, which
 * proposes a rollback. waiting: fewer forward rows than the holdout's min_counts have settled.
 */
export async function scoreForward(set: EvalSet, plan: EvalPlan, live: string, previous: string | null): Promise<Forward> {
  const needs = set.settles.min_counts.holdout;
  const rows = set.rows.filter((r) => r.window === "forward").length;
  if (rows < needs) return { status: "waiting", rows, needs, reason: `${rows} forward rows have settled, fewer than ${needs}` };
  const l = await evaluate(live, set, plan, ["forward"]);
  if (failed(l)) return { status: "fail", rows, reason: `the live recipe did not run: ${l.reason}` };
  let prev: RowScore[];
  if (previous === null) prev = l.rows.map((r) => ({ key: r.key, point: Date.parse(r.point), weight: r.weight, loss: baselineLoss(set, r) }));
  else {
    const p = await evaluate(previous, set, plan, ["forward"]);
    if (failed(p)) return { status: "fail", rows, reason: `the previous recipe did not run: ${p.reason}` };
    prev = toRows(p.rows);
  }
  // The previous recipe as the candidate: it regressed when the previous one is better by the margin.
  const v = verdict(prev, toRows(l.rows), plan, { candidate: 0, against: 0 });
  const stats = { rows: v.dev.rows, live_score: v.dev.tip_score ?? 0, previous_score: v.dev.score, margin: v.dev.margin };
  return v.verdict === "keep" && v.kept_as === "better"
    ? { status: "regressed", ...stats, reason: `the ${previous === null ? "plain fold" : "previous recipe"} ${v.reason.replace(/^beats it/, "beats the live recipe")}` }
    : { status: "holds", ...stats, reason: `the live recipe holds: the ${previous === null ? "plain fold" : "previous recipe"} ${v.reason.replace(/^beats it/, "beats it only")}` };
}
