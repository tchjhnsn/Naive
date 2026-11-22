// The decision queue (EE-127): one short ranked queue of open decisions across the 13 functions, right for the
// venture's phase. packages/naive/src/engine/decision-index.mjs scores each decision (the docket's score wrapped with
// impact, weight and requirements); this module adds four things on top and changes none of that score:
//
//   1. the owning function of each decision (ownerOf): its class's owner, else the function of the record it decides,
//      else of a record it would change, else "venture";
//   2. a per-function index (byFunction): the index's score ranked within each function;
//   3. a cross-function rank (crossScore): score x the function's weight in the phase over the mean weight, x 1.5
//      when the decision bears on a telos measure a lead plan binds, x 2 when it settles a record the phase's gate
//      asks for as exit evidence (phase.json gate.evidence, EE-155), so the queue asks first what the gate needs;
//   4. themes (themesOf): decisions that touch the same record or the same handoff, grouped so the queue shows one
//      item per theme. A theme is a plain grouping by shared keys, no model and no clustering library.
//
// The rules are pure functions. Reading what they need (phase weights, role templates, decision rights, the function
// matrices, lead plans, goals and handoffs) is an Effect through VentureFs (EE-125); rank() runs it with runSync.
// A .mjs file because decision-index.mjs imports it and the router imports that.

import { Effect } from "effect";
import { join } from "node:path";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { runSync } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { phaseGateRecords, phaseWeights, ROOT } from "../phases/phases.mjs";
import { readDataModel } from "../records/index.ts";
import { recordOf } from "./decisions.mjs";

/** The owner of a decision no rule assigns. */
export const VENTURE = "venture";
/** How much a decision that bears on a measure a lead plan binds is raised. */
export const MEASURE_LIFT = 1.5;
/** How much a decision that settles a record the phase's gate asks for is raised (EE-155). */
export const GATE_LIFT = 2;
/** How many items the queue shows. */
export const QUEUE_SIZE = 10;

/**
 * @typedef {{ function: string, by: "class" | "record" | "none", why: string }} Owner
 * @typedef {{ class?: string | null, record?: string | null, records?: (string | null)[] }} OwnerInput
 * @typedef {{ functions: readonly string[], classes: Record<string, string>, recordFunctions: Record<string, string | null> }} OwnerContext
 * @typedef {{ score: number, function: string, measures?: readonly string[], record?: string | null }} CrossInput
 * @typedef {{ weights: Record<string, number>, bound: Record<string, string>, gate?: readonly string[] }} CrossContext
 * @typedef {{ score: number, function_weight: number, multiplier: number, measure_lift: number, measures: string[], gate_lift: number, cross: number }} CrossParts
 * @typedef {{ id: string, keys: readonly string[] }} Keyed
 * @typedef {{ id: string, keys: string[], members: string[] }} Theme
 * @typedef {{ id: string, question?: string, score: number, why?: string[], impact?: { changed?: string[] } }} IndexEntry
 * @typedef {{ class?: string, decides?: { record?: string | null, path?: string } }} DecisionView
 * @typedef {{ outcomes?: { measure?: string }[] }} RawDecision
 * @typedef {{ entry: IndexEntry, decision: DecisionView, raw: RawDecision }} Item
 * @typedef {{
 *   phase: string, functions: string[], weights: Record<string, number>, classes: Record<string, string>,
 *   recordFunctions: Record<string, string | null>, leads: { id: string, portfolio: string[] }[],
 *   bound: Record<string, string>, goalMeasures: Record<string, string[]>, handoffs: Record<string, string[]>, gate: string[],
 * }} RankingContext
 */

/**
 * The function that owns a decision. The rule, in order:
 *   1. its class, when the class's owner maps to one function: the owning role's template function in decision rights,
 *      else the one function whose decision matrix lists the class (a class many matrices list maps to none);
 *   2. the function of the record type it decides (data-model.json `function`);
 *   3. the function of the first record it would change that has one;
 *   4. else "venture".
 * The decision-record schema has no function field, so the class comes first.
 * @param {OwnerInput} d
 * @param {OwnerContext} ctx
 * @returns {Owner}
 */
export function ownerOf(d, ctx) {
  const known = new Set(ctx.functions);
  const byClass = d.class ? ctx.classes[d.class] : undefined;
  if (byClass && known.has(byClass)) return { function: byClass, by: "class", why: `its class ${d.class} belongs to ${byClass}` };
  for (const [i, type] of [d.record ?? null, ...(d.records ?? [])].entries()) {
    const fn = type ? ctx.recordFunctions[type] : null;
    if (fn && known.has(fn)) return { function: fn, by: "record", why: `${i === 0 ? "it decides" : "it changes"} a record of type ${type}, which ${fn} owns` };
  }
  return { function: VENTURE, by: "none", why: "no class or record names a function, so the venture owns it" };
}

/** @param {number} n @param {number} [places] */
const round = (n, places = 2) => Math.round(n * 10 ** places) / 10 ** places;

/**
 * The cross-function score of one decision:
 *   cross = score x (w_f / mean w) x (MEASURE_LIFT when it bears on a measure a lead plan binds, else 1)
 *                 x (GATE_LIFT when it settles a record type the phase's gate asks for, else 1)
 * where w_f is its function's weight in the venture's phase (phase.json, through phaseWeights) and mean w the mean
 * weight over the phase's functions (1/13 when they sum to 1), so a function at the mean leaves the score as it is.
 * "venture", or a function the phase does not weigh, counts at the mean. With no weights the multiplier is 1.
 * @param {CrossInput} e
 * @param {CrossContext} ctx
 * @returns {CrossParts}
 */
export function crossScore(e, ctx) {
  const ws = Object.values(ctx.weights);
  const mean = ws.length ? ws.reduce((a, b) => a + b, 0) / ws.length : 0;
  const w = ctx.weights[e.function] ?? mean;
  const multiplier = mean > 0 ? round(w / mean, 3) : 1;
  const measures = [...new Set((e.measures ?? []).filter((m) => m in ctx.bound))].sort();
  const lift = measures.length ? MEASURE_LIFT : 1;
  const gate = e.record && (ctx.gate ?? []).includes(e.record) ? GATE_LIFT : 1;
  return { score: e.score, function_weight: round(w, 3), multiplier, measure_lift: lift, measures, gate_lift: gate, cross: round(e.score * multiplier * lift * gate) };
}

/**
 * Orders by cross score, then the gate's own order of its evidence (problem before customer profile), then the
 * index's score, then id: the same input always gives the same order.
 * @param {{ id: string, score: number, cross: number, gate_rank?: number }} a
 * @param {{ id: string, score: number, cross: number, gate_rank?: number }} b
 */
export const byCross = (a, b) => b.cross - a.cross || (a.gate_rank ?? Infinity) - (b.gate_rank ?? Infinity) || b.score - a.score || a.id.localeCompare(b.id);

/**
 * Where a record type stands in the gate's evidence list, or undefined when the gate does not ask for it.
 * @param {readonly string[] | undefined} gate @param {string | null | undefined} record
 */
const gateRank = (gate, record) => { const i = record ? (gate ?? []).indexOf(record) : -1; return i < 0 ? undefined : i; };

/**
 * Themes: decisions linked by a shared key (a record file, or a handoff) fall in one theme, transitively. Input in
 * rank order; each theme is named after its first member, lists its members in that order and the keys two or more
 * members share, and themes come in the order of their first member. No model, no clustering library.
 * @param {readonly Keyed[]} ranked
 * @returns {Theme[]}
 */
export function themesOf(ranked) {
  /** @type {Map<string, string>} */
  const parent = new Map(ranked.map((r) => [r.id, r.id]));
  const pos = new Map(ranked.map((r, i) => [r.id, i]));
  /** @param {string} x @returns {string} */
  const find = (x) => { let p = /** @type {string} */ (parent.get(x)); while (p !== x) { x = p; p = /** @type {string} */ (parent.get(x)); } return x; };
  /** @param {string} a @param {string} b */
  const join2 = (a, b) => { const [ra, rb] = [find(a), find(b)]; if (ra === rb) return; const [lo, hi] = (pos.get(ra) ?? 0) <= (pos.get(rb) ?? 0) ? [ra, rb] : [rb, ra]; parent.set(hi, lo); };
  /** @type {Map<string, string[]>} */
  const holders = new Map();
  for (const r of ranked) for (const k of new Set(r.keys)) holders.set(k, [...(holders.get(k) ?? []), r.id]);
  for (const ids of holders.values()) for (const id of ids.slice(1)) join2(ids[0], id);
  /** @type {Map<string, Theme>} */
  const out = new Map();
  for (const r of ranked) {
    const root = find(r.id);
    const t = out.get(root) ?? { id: root, keys: [], members: [] };
    t.members.push(r.id);
    out.set(root, t);
  }
  for (const [k, ids] of holders) if (ids.length > 1) out.get(find(ids[0]))?.keys.push(k);
  for (const t of out.values()) t.keys.sort();
  return [...out.values()];
}

/**
 * The measures a decision bears on: an outcome whose measure names a measure id (bare, or <goal>/<measure>), and the
 * measures of a goal file it would change.
 * @param {RawDecision} raw
 * @param {readonly string[]} changed
 * @param {Record<string, string[]>} goalMeasures goal file to its measure ids
 */
export function measuresOf(raw, changed, goalMeasures) {
  const named = (raw.outcomes ?? []).map((o) => o.measure).filter((m) => typeof m === "string" && /^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(m)).map((m) => /** @type {string} */ (m).split("/").at(-1) ?? "");
  return [...new Set([...named, ...changed.flatMap((f) => goalMeasures[f] ?? [])])].sort();
}

/**
 * The queue, the per-function index and the themes, from the index's entries and the ranking context. Pure.
 * @param {readonly Item[]} items
 * @param {RankingContext} ctx
 * @param {{ size?: number }} [opts]
 */
export function rankItems(items, ctx, { size = QUEUE_SIZE } = {}) {
  const rows = items.map(({ entry, decision, raw }) => {
    const changed = entry.impact?.changed ?? [];
    const owner = ownerOf({ class: decision.class ?? null, record: decision.decides?.record ?? null, records: changed.map(recordOf) }, ctx);
    const parts = crossScore({ score: entry.score, function: owner.function, measures: measuresOf(raw, changed, ctx.goalMeasures), record: decision.decides?.record ?? null }, ctx);
    const keys = [...changed.map((f) => `record:${f}`), ...(ctx.handoffs[entry.id] ?? []).map((h) => `handoff:${h}`)];
    return { id: entry.id, question: entry.question ?? "", score: entry.score, cross: parts.cross, owner, parts, keys, record: decision.decides?.record ?? null, gate_rank: gateRank(ctx.gate, decision.decides?.record), why: entry.why ?? [] };
  }).sort(byCross);
  const order = [...ctx.functions, VENTURE];
  /** @type {Record<string, { rank: number, id: string, score: number }[]>} */
  const by_function = {};
  for (const fn of order) {
    const mine = rows.filter((r) => r.owner.function === fn).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    if (mine.length) by_function[fn] = mine.map((r, i) => ({ rank: i + 1, id: r.id, score: r.score }));
  }
  const themes = themesOf(rows);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const leadOf = (/** @type {string} */ fn) => { const ls = ctx.leads.filter((l) => l.portfolio.includes(fn)).map((l) => l.id); return ls.length === 1 ? ls[0] : null; };
  const queue = themes.slice(0, size).map((t, i) => {
    const head = /** @type {(typeof rows)[number]} */ (byId.get(t.id));
    const fn = head.owner.function;
    const why = [
      head.owner.why,
      ...(fn === VENTURE ? [] : [`${fn} weighs ${head.parts.function_weight} in ${ctx.phase} (x${head.parts.multiplier} the mean)`]),
      ...head.parts.measures.map((m) => `bears on measure ${m}, which ${ctx.bound[m]}'s lead plan binds`),
      ...(head.parts.gate_lift > 1 ? [`the ${ctx.phase} gate asks for ${byId.get(t.id)?.record} as exit evidence (x${head.parts.gate_lift})`] : []),
      ...(t.members.length > 1 ? [`one theme with ${t.members.slice(1).join(", ")}: they share ${t.keys.map((k) => k.replace(/^[a-z]+:/, "")).join(", ")}`] : []),
      ...head.why,
    ];
    return { rank: i + 1, theme: t.id, id: head.id, question: head.question, function: fn, lead: fn === VENTURE ? null : leadOf(fn), score: head.cross, parts: head.parts, members: t.members, why };
  });
  return {
    by_function,
    themes: themes.map((t) => ({ id: t.id, function: byId.get(t.id)?.owner.function ?? VENTURE, keys: t.keys, members: t.members })),
    queue,
  };
}

// ---- Reading the context (Effect, through VentureFs) ----

/** @param {unknown} v @returns {v is Record<string, unknown>} */
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
/** @param {unknown} v @returns {string[]} */
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);

/**
 * Every JSON file in a folder, parsed, by file name. A venture file that cannot be read is left out, so one broken
 * lead plan or handoff does not stop the index.
 * @param {string} dir
 */
const jsonFiles = (dir) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  /** @type {{ name: string, value: unknown }[]} */
  const out = [];
  for (const name of yield* fs.list(dir)) {
    if (!name.endsWith(".json")) continue;
    const value = yield* Effect.orElseSucceed(readJson(join(dir, name)), () => null);
    if (value !== null) out.push({ name, value });
  }
  return out;
});

/**
 * What the ranking reads, for one venture in one phase. A phase with no module ranks with no weights.
 * @param {string} dir the venture folder
 * @param {string} phase
 * @param {{ root?: string }} [opts]
 * @returns {Effect.Effect<RankingContext, import("../core/effect/errors.ts").NaiveError, "naive/VentureFs">}
 */
export const rankingContextEffect = (dir, phase, { root = ROOT } = {}) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const depts = yield* readJson(join(root, "packages/naive/src/functions/departments.json"));
  const functions = isObject(depts) && Array.isArray(depts.departments) ? depts.departments.filter(isObject).map((d) => String(d.id)) : [];
  const weights = yield* phaseWeights(phase, { root }).pipe(Effect.catchTag("NotFound", () => Effect.succeed(/** @type {Record<string, number>} */ ({}))));
  const gate = yield* phaseGateRecords(phase, { root }).pipe(Effect.catchTag("NotFound", () => Effect.succeed(/** @type {string[]} */ ([]))));

  const roles = (yield* jsonFiles(join(root, "packages/naive/template/governance/roles"))).map((f) => f.value).filter(isObject);
  const leads = roles.filter((r) => Array.isArray(r.portfolio)).map((r) => ({ id: String(r.id), portfolio: strings(r.portfolio) }));
  const roleFunction = new Map(roles.filter((r) => typeof r.function === "string" && functions.includes(/** @type {string} */ (r.function))).map((r) => [String(r.id), /** @type {string} */ (r.function)]));

  // Classes: the owning role's function in decision rights (the venture's own, else the template's), else the one
  // function whose matrix lists the class.
  const ownRights = ventureFile(dir, "governance/decision-rights.json");
  const rightsFile = (yield* fs.exists(ownRights)) ? ownRights : join(root, "packages/naive/template/governance/decision-rights.json");
  const rights = yield* Effect.orElseSucceed(readJson(rightsFile), () => null);
  /** @type {Record<string, string>} */
  const classes = {};
  /** @type {Map<string, Set<string>>} */
  const inMatrices = new Map();
  for (const fn of functions) {
    const file = join(root, "packages/naive/src/functions", fn, "decisions.json");
    if (!(yield* fs.exists(file))) continue;
    const m = yield* readJson(file);
    for (const row of isObject(m) && Array.isArray(m.rows) ? m.rows.filter(isObject) : []) if (typeof row.class === "string") inMatrices.set(row.class, new Set([...(inMatrices.get(row.class) ?? []), fn]));
  }
  for (const [c, fns] of inMatrices) if (fns.size === 1) classes[c] = [...fns][0];
  for (const c of isObject(rights) && Array.isArray(rights.classes) ? rights.classes.filter(isObject) : []) {
    const fn = typeof c.owner === "string" ? roleFunction.get(c.owner) : undefined;
    if (typeof c.id === "string" && fn) classes[c.id] = fn;
  }

  /** @type {Record<string, string | null>} */
  const recordFunctions = Object.fromEntries(/** @type {{ id: string, function?: string | null }[]} */ (readDataModel().records).map((r) => [r.id, r.function ?? null]));

  // Measures a lead plan binds, to the lead (one accountable lead per measure; a measure two plans bind binds neither).
  /** @type {Map<string, Set<string>>} */
  const binders = new Map();
  for (const { value } of yield* jsonFiles(ventureFile(dir, "operations/leads"))) {
    if (!isObject(value) || typeof value.lead !== "string") continue;
    for (const m of strings(value.measures)) binders.set(m, new Set([...(binders.get(m) ?? []), /** @type {string} */ (value.lead)]));
  }
  /** @type {Record<string, string>} */
  const bound = {};
  for (const [m, ls] of binders) if (ls.size === 1) bound[m] = [...ls][0];

  /** @type {Record<string, string[]>} */
  const goalMeasures = {};
  for (const { name, value } of yield* jsonFiles(ventureFile(dir, "foundation/goals"))) {
    if (isObject(value) && Array.isArray(value.measures)) goalMeasures[`foundation/goals/${name}`] = value.measures.filter(isObject).map((m) => String(m.id));
  }

  // Handoffs, by the decisions they execute (governed_by).
  /** @type {Record<string, string[]>} */
  const handoffs = {};
  for (const { name, value } of yield* jsonFiles(ventureFile(dir, "operations/handoffs"))) {
    if (!isObject(value)) continue;
    const id = typeof value.id === "string" ? value.id : name.replace(/\.json$/, "");
    for (const d of strings(value.governed_by)) handoffs[d] = [...(handoffs[d] ?? []), id];
  }
  return { phase, functions, weights, classes, recordFunctions, leads, bound, goalMeasures, handoffs, gate };
});

/**
 * The ranking for one venture, as an Effect.
 * @param {string} dir @param {string} phase @param {readonly Item[]} items @param {{ root?: string, size?: number }} [opts]
 */
export const rankEffect = (dir, phase, items, opts = {}) => Effect.map(rankingContextEffect(dir, phase, opts), (ctx) => rankItems(items, ctx, opts));

/**
 * The ranking for one venture: by_function, themes and queue. Throws the tagged error when a file Naive ships cannot
 * be read.
 * @param {string} dir @param {string} phase @param {readonly Item[]} items @param {{ root?: string, size?: number }} [opts]
 */
export const rank = (dir, phase, items, opts = {}) => runSync(rankEffect(dir, phase, items, opts));
