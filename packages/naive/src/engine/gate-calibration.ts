#!/usr/bin/env node
// Gate calibration (EE-157): phase gate thresholds follow from the venture's market and industry, never a fixed
// number. The rules are data in packages/naive/src/phases/gate-calibration.json. calibrate reads the cells of the
// venture's primary market (markets/<id>.json) and the industry that market names (industries/<id>.json) and
// adjusts the venture's gate policy preset (packages/naive/src/phases/gate-policies.json): how many interviews reach
// each level, which items need more evidence or fail closed, how old evidence may be before it drops a level, what
// an override needs and how the problem is confirmed. A cell that is unknown, missing or no longer valid adjusts
// nothing and becomes an assumption to add to the validation plan.
//
//   node packages/naive/src/engine/gate-calibration.ts <venture dir> [--json] [--propose] [--valid-at <date>]
//
// calibrate is pure. Reading the venture is an Effect over VentureFs (EE-125) that parses every file it reads against
// its schema at the boundary, so calibrate trusts its inputs; calibration runs it with runSync and the CLI with
// runMain. --propose files one open decision asking whether to adopt the calibrated gate, with the proposed
// phase_gates in its note; a rerun leaves an open or decided one alone. Applying an accepted decision to
// naive.config.json is not built: the decision merge writes a string answer into a field, and phase_gates is an
// object. Exit 0 for a report, 1 when a file does not match its schema or a decision cannot be filed, 2 on a bad call.

import { Effect } from "effect";
import { join } from "node:path";
import { CannotRun, NotFound, Refused, SchemaInvalid } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { runMain, runSync } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { ROOT } from "../phases/phases.mjs";
import { readDataModel, readSchema, venturePaths } from "../records/index.ts";
import { validateValue } from "../records/validate.ts";
import type { AnatomyCellEnumCell, AnatomyCellNumberCell, GateCalibration, IndustryAnatomy, MarketAnatomy, PhaseGatePolicies } from "../records/types/records.d.ts";
import { LEVELS } from "./evidence-grade.ts";
import { decisionFile, propose } from "./decisions.ts";
import { CONFIG } from "./naive-config.ts";
import { DEFAULT_PRESET, POLICIES } from "./phase-gate.ts";

/** The rules file. */
export const RULES = "packages/naive/src/phases/gate-calibration.json";
/** The agent that proposes the calibrated gate. */
export const AGENT = "gate-calibration";

export type Level = PhaseGatePolicies["levels"][number];
export type Boundary = "fail-open" | "fail-closed";
export type ItemPolicy = { min: Level, boundary: Boundary };
export type Rules = GateCalibration;
export type Condition = Rules["rules"][number]["when"][number];
export type CountLevels = Rules["count_levels"]["default"];
export type Cell = AnatomyCellNumberCell | AnatomyCellEnumCell;
/** Which anatomy record a cell sits in. */
export type Anatomy = "market" | "industry";
/** A cell by its record and name, such as market.reachable_buyers; the boundary checks the schema has it. */
export type CellName = `${Anatomy}.${string}`;
/** A calendar date, YYYY-MM-DD, as the anatomy cells' valid_from and valid_to are written. */
export type IsoDate = string & { readonly __brand: "IsoDate" };
/** A preset that the phase's policies define (or any name for a phase with no gate items). */
export type PresetName = string & { readonly __brand: "PresetName" };

/** How a cell reads on a date: a value only when it is known or estimated and valid then. */
export type CellReading =
  | { status: "known" | "estimated", value: string | number }
  | { status: "unknown", value: null, expired?: string };
export type Read = CellReading & { record: string, cell: CellName };
export type Assumption = { cell: CellName, record: string, text: string, rules: string[] };
export type CalibratedItem = ItemPolicy & { base: ItemPolicy, because: string[] };
export type Calibration = {
  phase: string, base_preset: PresetName, valid_at: IsoDate,
  market: string | null, industry: string | null,
  items: Record<string, CalibratedItem>,
  count_levels: CountLevels & { because: string[] },
  staleness_months: number, staleness_because: string[],
  override_policy: { reason_required: boolean, second_person: boolean, because: string[] },
  problem_confirmation: { customer_type: string | null, rule: string, because: string[] },
  notes: { rule: string, text: string }[],
  adjustments: { rule: string, reason: string, effect: string }[],
  assumptions: Assumption[],
  reads: Read[],
  confidence: { score: number, label: "high" | "moderate" | "low" },
  phase_gates: { preset: PresetName, count_levels: CountLevels, staleness_months: number, items: Record<string, Record<string, ItemPolicy>> },
};
export type CalibrateOpts = { validAt: IsoDate, preset: PresetName, marketFile?: string | null, industryFile?: string | null };
export type Found<T> = { file: string, value: T };

/** Whether a string is a real calendar date written YYYY-MM-DD. */
export const isIsoDate = (s: string): s is IsoDate => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
/** Today as an IsoDate. */
export const today = (): IsoDate => { const d = new Date().toISOString().slice(0, 10); if (!isIsoDate(d)) throw new Error("the clock gave no date"); return d; };

const isPreset = (policies: PhaseGatePolicies, phase: string, name: string): name is PresetName => {
  const def = policies.phases[phase];
  return !def || Object.hasOwn(def.presets, name);
};
/** The preset name, checked against the phase's policies. */
export const parsePreset = (policies: PhaseGatePolicies, phase: string, name: string = DEFAULT_PRESET): Effect.Effect<PresetName, NotFound> =>
  isPreset(policies, phase, name) ? Effect.succeed(name) : Effect.fail(new NotFound({ what: `gate preset ${name} for ${phase} (the presets are ${Object.keys(policies.phases[phase]?.presets ?? {}).join(", ")})` }));

const rank = (l: Level): number => LEVELS.indexOf(l);
const isLevel = (s: string): s is Level => LEVELS.includes(s);
const at = (i: number): Level => { const l = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, i))]; return l !== undefined && isLevel(l) ? l : "very low"; };

/**
 * Where the market and industry anatomy records live. The data model is asked first, by schema file, so the paths
 * switch to the data model's once it lists the record types; until then the paths are the ones the schemas name.
 */
export function anatomyGlobs(): Record<Anatomy, string[]> {
  const model: { records: { id: string, schema?: string | null, paths?: string[] }[] } = readDataModel();
  const of = (schema: string, fallback: string): string[] => {
    const r = model.records.find((x) => typeof x.schema === "string" && x.schema.endsWith(`/${schema}`));
    const g: string[] = r ? venturePaths(r) : [];
    return g.length ? g : [fallback];
  };
  return { market: of("market-anatomy.schema.json", "markets/*.json"), industry: of("industry-anatomy.schema.json", "industries/*.json") };
}

/** A cell as calibration sees it on a date: unknown when missing, unknown by status, or not valid then. */
export function cellAt(cell: Cell | undefined, validAt: IsoDate): CellReading {
  if (!cell || cell.status === "unknown" || cell.value === undefined) return { status: "unknown", value: null };
  if (cell.valid_to && cell.valid_to < validAt) return { status: "unknown", value: null, expired: `valid_to ${cell.valid_to} has passed` };
  if (cell.valid_from && cell.valid_from > validAt) return { status: "unknown", value: null, expired: `valid_from ${cell.valid_from} is in the future` };
  return { status: cell.status, value: cell.value };
}

/** Whether a known value meets a condition. */
const meets = (c: Condition, v: string | number): boolean =>
  (c.in ? typeof v === "string" && c.in.includes(v) : true)
  && (c.gt !== undefined ? typeof v === "number" && v > c.gt : true)
  && (c.gte !== undefined ? typeof v === "number" && v >= c.gte : true);

const split = (name: CellName): [Anatomy, string] => {
  const i = name.indexOf(".");
  return [name.slice(0, i) === "industry" ? "industry" : "market", name.slice(i + 1)];
};

/**
 * Proposes a venture's gate thresholds from its market and industry. Pure: the records come in parsed.
 * @param market the primary market record, or null
 * @param industry the industry record the market names, or null
 * @param policies gate-policies.json
 * @param rules gate-calibration.json
 * @param phase the phase whose gate is calibrated
 * @param opts the date cells are read at, the base preset (checked by parsePreset) and the files the records came from
 */
export function calibrate(market: MarketAnatomy | null, industry: IndustryAnatomy | null, policies: PhaseGatePolicies, rules: Rules, phase: string, opts: CalibrateOpts): Calibration {
  const { validAt, preset } = opts;
  const def = policies.phases[phase];
  const base: Record<string, ItemPolicy> = def?.presets[preset] ?? {};
  const files: Record<Anatomy, string> = { market: opts.marketFile ?? "markets/<id>.json", industry: opts.industryFile ?? "industries/<id>.json" };
  const cells: Record<Anatomy, Partial<Record<string, Cell>>> = { market: market?.cells ?? {}, industry: industry?.cells ?? {} };

  const reads = new Map<CellName, Read>();
  const readers = new Map<CellName, Set<string>>();
  /** A cell by its name, recorded as read by a rule. */
  const read = (name: CellName, rule: string): CellReading => {
    const [kind, cell] = split(name);
    const got = cellAt(cells[kind][cell], validAt);
    if (!reads.has(name)) reads.set(name, { ...got, record: files[kind], cell: name });
    readers.set(name, (readers.get(name) ?? new Set<string>()).add(rule));
    return got;
  };
  /** Whether any valid cell meets one of the conditions; every cell is read, so unknown ones become assumptions. */
  const fires = (when: Condition[], rule: string): boolean =>
    when.map((c) => { const v = read(cellName(c.cell), rule); return v.value !== null && meets(c, v.value); }).some(Boolean);

  const adjustments: Calibration["adjustments"] = [];
  const items: Record<string, CalibratedItem> = {};
  for (const item of def?.items ?? []) {
    const p = base[item.id] ?? { min: "very low", boundary: "fail-open" };
    items[item.id] = { min: p.min, boundary: p.boundary, base: { min: p.min, boundary: p.boundary }, because: [] };
  }

  // Count levels.
  const cl = rules.count_levels;
  const type = read("market.customer_type", cl.id);
  const buyers = read("market.reachable_buyers", cl.id);
  let count_levels: Calibration["count_levels"] = { ...cl.default, because: [] };
  if (typeof buyers.value === "number" && !(typeof type.value === "string" && cl.keep_default_for.includes(type.value))) {
    const moderate = Math.min(cl.moderate_max, Math.max(cl.moderate_min, Math.ceil(buyers.value * cl.share)));
    const high = Math.round(moderate * cl.high_factor);
    count_levels = { low: cl.low, moderate, high, because: [cl.id] };
    if (moderate !== cl.default.moderate || high !== cl.default.high) adjustments.push({ rule: cl.id, reason: cl.reason, effect: `interviews: moderate at ${moderate}, high at ${high} (from ${buyers.value} reachable buyers)` });
  }

  // Item rules, staleness and notes.
  let staleness = rules.staleness.default_months;
  const staleness_because: string[] = [];
  const notes: Calibration["notes"] = [];
  for (const rule of rules.rules) {
    for (const r of rule.reads) read(cellName(r), rule.id);
    if (!fires(rule.when, rule.id)) continue;
    const effects: string[] = [];
    const set = (id: string, min: Level | undefined, boundary: Boundary | undefined): void => {
      const it = items[id];
      if (!it) return;
      if (min) it.min = min;
      if (boundary) it.boundary = boundary;
      it.because.push(rule.id);
      effects.push(`${id} needs ${it.min}, ${it.boundary}`);
    };
    const { raise, floor } = rule;
    if (raise) for (const id of raise.items) { const it = items[id]; if (it) set(id, at(rank(it.min) + raise.levels), raise.boundary); }
    if (floor) for (const id of floor.items) { const it = items[id]; if (it) set(id, floor.min && rank(it.min) < rank(floor.min) ? floor.min : undefined, floor.boundary); }
    if (typeof rule.staleness_months === "number") {
      staleness = Math.min(staleness, rule.staleness_months);
      staleness_because.push(rule.id);
      effects.push(`evidence older than ${rule.staleness_months} months drops a level`);
    }
    for (const text of rule.notes ?? []) { notes.push({ rule: rule.id, text }); effects.push(text); }
    if (effects.length) adjustments.push({ rule: rule.id, reason: rule.reason, effect: effects.join("; ") });
  }

  // Override policy and problem confirmation.
  const ov = rules.override;
  for (const r of ov.reads) read(cellName(r), ov.id);
  const second = fires(ov.second_person_when, ov.id);
  const override_policy = { reason_required: ov.reason_required, second_person: second, because: second ? [ov.id] : [] };
  if (second) adjustments.push({ rule: ov.id, reason: ov.reason, effect: "an override needs a reason and a second named person" });
  const pc = rules.problem_confirmation;
  const ct = read(cellName(pc.reads[0] ?? "market.customer_type"), pc.id).value;
  const kind = typeof ct === "string" && pc.business_types.includes(ct) ? "business" : typeof ct === "string" && pc.consumer_types.includes(ct) ? "consumer" : "unknown";
  const problem_confirmation = { customer_type: typeof ct === "string" ? ct : null, rule: pc[kind], because: [pc.id] };

  // Assumptions: each cell a rule reads that is unknown, missing or lapsed.
  const all = [...reads.values()];
  const assumptions: Assumption[] = all.filter((r) => r.status === "unknown").map((r) => {
    const [k, cell] = split(r.cell);
    return { cell: r.cell, record: r.record, text: `know the ${k}'s ${cell}`, rules: [...(readers.get(r.cell) ?? [])] };
  });

  // Confidence: known cells count 1, estimated 0.5, unknown 0, averaged over the cells the rules read.
  const weight = { known: 1, estimated: 0.5, unknown: 0 } satisfies Record<Read["status"], number>;
  const score = all.length ? Math.round((all.reduce((s, r) => s + weight[r.status], 0) / all.length) * 100) / 100 : 0;
  const label = score >= 0.75 ? "high" : score >= 0.4 ? "moderate" : "low";

  const changed: Record<string, ItemPolicy> = {};
  for (const [id, it] of Object.entries(items)) if (it.min !== it.base.min || it.boundary !== it.base.boundary) changed[id] = { min: it.min, boundary: it.boundary };
  return {
    phase, base_preset: preset, valid_at: validAt, market: market ? files.market : null, industry: industry ? files.industry : null,
    items, count_levels, staleness_months: staleness, staleness_because, override_policy, problem_confirmation, notes, adjustments, assumptions,
    reads: all, confidence: { score, label },
    phase_gates: { preset, count_levels: { low: count_levels.low, moderate: count_levels.moderate, high: count_levels.high }, staleness_months: staleness, items: Object.keys(changed).length ? { [phase]: changed } : {} },
  };
}

/** A cell name from the rules file; the boundary (parseRules) has checked it names a cell the schemas define. */
const cellName = (s: string): CellName => (s.startsWith("industry.") ? `industry.${s.slice(9)}` : `market.${s.slice(s.indexOf(".") + 1)}`);

/** The cell names an anatomy schema defines. */
const schemaCells = (schema: string): Set<string> => {
  const s: unknown = readSchema(schema);
  const props = typeof s === "object" && s !== null && "properties" in s && typeof s.properties === "object" && s.properties !== null && "cells" in s.properties ? s.properties.cells : null;
  const cells = typeof props === "object" && props !== null && "properties" in props && typeof props.properties === "object" && props.properties !== null ? props.properties : {};
  return new Set(Object.keys(cells));
};

/** Parses a JSON value against its schema at the boundary; the cast follows validation. */
const parse = <T>(schema: string, value: unknown): Effect.Effect<T, SchemaInvalid> => {
  const r = validateValue(schema, value);
  return r.status === 0 ? Effect.succeed(value as T) : Effect.fail(new SchemaInvalid({ schema, errors: (r.stdout + r.stderr).trim().split("\n") }));
};

/** Parses the rules file: its schema, then every cell it reads is one the market or industry schema defines. */
export const parseRules = (value: unknown): Effect.Effect<Rules, SchemaInvalid> => Effect.gen(function* () {
  const rules = yield* parse<Rules>("gate-calibration.schema.json", value);
  const known: Record<Anatomy, Set<string>> = { market: schemaCells("market-anatomy.schema.json"), industry: schemaCells("industry-anatomy.schema.json") };
  const named = [rules.count_levels, ...rules.rules, rules.override, rules.problem_confirmation].flatMap((r) => [
    ...r.reads.map((c) => ({ rule: r.id, cell: c })),
    ...("when" in r ? r.when : "second_person_when" in r ? r.second_person_when : []).map((c) => ({ rule: r.id, cell: c.cell })),
  ]);
  const bad = named.filter(({ cell }) => { const [k, c] = split(cellName(cell)); return !known[k].has(c) || !cell.startsWith(`${k}.`); });
  if (bad.length) return yield* Effect.fail(new SchemaInvalid({ schema: "gate-calibration.schema.json", errors: bad.map((b) => `rule ${b.rule} reads ${b.cell}, which no anatomy schema defines`) }));
  return rules;
});

/** Every venture file matching the globs, as logical paths. */
const filesFor = (dir: string, globs: string[]) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const out: string[] = [];
  for (const g of globs) {
    const star = g.indexOf("*");
    if (star < 0) { if (yield* fs.exists(ventureFile(dir, g))) out.push(g); continue; }
    const folder = g.slice(0, star), rest = g.slice(star + 1);
    if (rest.includes("*")) continue;
    for (const f of yield* fs.list(ventureFile(dir, folder))) if (f.endsWith(rest)) out.push(folder + f);
  }
  return out;
});

/** Reads the primary market (primary true, else the first by file name) and the industry it names, each parsed. */
export const anatomiesEffect = (dir: string) => Effect.gen(function* () {
  const globs = anatomyGlobs();
  const markets: Found<MarketAnatomy>[] = [];
  for (const f of yield* filesFor(dir, globs.market)) markets.push({ file: f, value: yield* parse<MarketAnatomy>("market-anatomy.schema.json", yield* readJson(ventureFile(dir, f))) });
  const market = markets.find((m) => m.value.primary === true) ?? markets[0] ?? null;
  const id = market?.value.industry;
  let industry: Found<IndustryAnatomy> | null = null;
  if (id !== undefined) for (const f of yield* filesFor(dir, globs.industry)) {
    const value = yield* parse<IndustryAnatomy>("industry-anatomy.schema.json", yield* readJson(ventureFile(dir, f)));
    if (value.id === id) { industry = { file: f, value }; break; }
  }
  return { market, industry, industryId: id ?? null };
});

/** The preset naive.config.json names under phase_gates.preset, read at the boundary; undefined when it names none. */
const presetIn = (config: unknown): string | undefined => {
  const pg = typeof config === "object" && config !== null && "phase_gates" in config ? config.phase_gates : undefined;
  return typeof pg === "object" && pg !== null && "preset" in pg && typeof pg.preset === "string" ? pg.preset : undefined;
};

/**
 * Reads the venture and calibrates its current phase's gate (or opts.phase), from the preset naive.config.json
 * phase_gates.preset names, else standard.
 */
export const calibrationEffect = (dir: string, opts: { validAt?: IsoDate, phase?: string, root?: string } = {}) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const root = opts.root ?? ROOT;
  const policies = yield* parse<PhaseGatePolicies>("phase-gate-policies.schema.json", yield* readJson(join(root, POLICIES)));
  const rules = yield* parseRules(yield* readJson(join(root, RULES)));
  const venture: unknown = yield* readJson(join(dir, "venture.json"));
  const id = typeof venture === "object" && venture !== null && "id" in venture && typeof venture.id === "string" ? venture.id : null;
  const current = typeof venture === "object" && venture !== null && "phase" in venture && typeof venture.phase === "string" ? venture.phase : null;
  if (!id || !current) return yield* Effect.fail(new SchemaInvalid({ schema: "venture.schema.json", errors: [`${join(dir, "venture.json")} needs an id and a phase`] }));
  const cfgFile = ventureFile(dir, CONFIG);
  const config: unknown = (yield* fs.exists(cfgFile)) ? yield* readJson(cfgFile) : {};
  const phase = opts.phase ?? current;
  const preset = yield* parsePreset(policies, phase, presetIn(config));
  const { market, industry, industryId } = yield* anatomiesEffect(dir);
  const c = calibrate(market?.value ?? null, industry?.value ?? null, policies, rules, phase, {
    validAt: opts.validAt ?? today(), preset,
    marketFile: market?.file ?? null, industryFile: industry?.file ?? (industryId ? `industries/${industryId}.json` : null),
  });
  return { venture: id, ...c };
});

export type VentureCalibration = Calibration & { venture: string };

/** The calibration as plain values. */
export const calibration = (dir: string, opts: { validAt?: IsoDate, phase?: string } = {}): VentureCalibration => runSync(calibrationEffect(dir, opts));

/** The decision id for a phase's calibrated gate. */
export const decisionId = (phase: string): string => `gate-calibration-${phase}`;

export type Proposal =
  | { kind: "proposed", id: string, file: string }
  | { kind: "kept", id: string, file: string, status: string };

/** The decision's note: what was read, each adjustment, the unknown cells and the proposed phase_gates. */
export const decisionNote = (c: VentureCalibration): string => [
  `Calibrated from ${c.market ?? "no market record"} and ${c.industry ?? "no industry record"} as of ${c.valid_at} (packages/naive/src/engine/gate-calibration.ts, rules in ${RULES}; every threshold is an unvalidated prior).`,
  c.adjustments.length ? `Adjustments: ${c.adjustments.map((a) => `${a.rule}: ${a.effect}`).join(" ")}` : "No adjustments: the cells read leave the preset as it is.",
  c.assumptions.length ? `Unknown cells, to add to the validation plan as assumptions: ${c.assumptions.map((a) => a.cell).join(", ")}.` : "",
  `Confidence ${c.confidence.score} (${c.confidence.label}).`,
  `Proposed naive.config.json phase_gates: ${JSON.stringify(c.phase_gates)}`,
  "Applying it to naive.config.json is not built: a person copies it in after deciding.",
].filter(Boolean).join("\n");

/** Files one open decision asking whether to adopt the calibrated gate; leaves an open or decided one alone. */
export const proposeEffect = (dir: string, c: VentureCalibration) => Effect.gen(function* () {
  const id = decisionId(c.phase);
  const existing: unknown = yield* Effect.sync(() => decisionFile(dir, id));
  if (typeof existing === "string") {
    const prior: unknown = yield* readJson(ventureFile(dir, existing));
    const status = typeof prior === "object" && prior !== null && "status" in prior && typeof prior.status === "string" ? prior.status : "open";
    return { kind: "kept", id, file: existing, status } satisfies Proposal;
  }
  const r: { ok: boolean, error?: string, result?: { file?: string } } = yield* Effect.sync(() => propose(dir, {
    id, question: `Adopt the calibrated ${c.phase} gate, derived from the venture's market and industry, in place of the ${c.base_preset} preset as it is?`,
    options: ["adopt the calibrated gate", `keep the ${c.base_preset} preset`], note: decisionNote(c),
  }, { agentId: AGENT, via: "cli" }));
  if (!r.ok || typeof r.result?.file !== "string") return yield* Effect.fail(new Refused({ rule: "decision-schema", message: `could not propose ${id}: ${r.error ?? "no file written"}` }));
  return { kind: "proposed", id, file: r.result.file } satisfies Proposal;
});

/** The proposal as plain values. */
export const proposeCalibration = (dir: string, c: VentureCalibration): Proposal => runSync(proposeEffect(dir, c));

const fmt = (p: ItemPolicy): string => `${p.min}, ${p.boundary}`;

/** The calibration as text: each adjustment with its reason, and each unknown cell. */
export function calibrationText(c: VentureCalibration): string {
  const lines = [`${c.venture}: the ${c.phase} gate calibrated from ${c.market ?? "no market record"} and ${c.industry ?? "no industry record"} as of ${c.valid_at}, on the ${c.base_preset} preset (confidence ${c.confidence.score}, ${c.confidence.label})`];
  lines.push(`  interviews: low ${c.count_levels.low}, moderate ${c.count_levels.moderate}, high ${c.count_levels.high}${c.count_levels.because.length ? "" : " (defaults)"}`);
  lines.push(`  evidence older than ${c.staleness_months} months drops a level`);
  for (const [id, it] of Object.entries(c.items)) {
    const moved = it.min !== it.base.min || it.boundary !== it.base.boundary;
    lines.push(`  ${moved ? "*" : " "} ${id}: ${fmt(it)}${moved ? ` (was ${fmt(it.base)}; ${it.because.join(", ")})` : ""}`);
  }
  if (c.adjustments.length) {
    lines.push("Adjustments:");
    for (const a of c.adjustments) lines.push(`  ${a.rule}: ${a.effect}`, `      because ${a.reason}`);
  } else lines.push("No adjustments: the cells read leave the preset as it is.");
  lines.push(`Overrides need ${c.override_policy.reason_required ? "a reason" : "nothing"}${c.override_policy.second_person ? " and a second named person" : ""}.`);
  lines.push(`Problem confirmation: ${c.problem_confirmation.rule}`);
  if (c.assumptions.length) {
    lines.push("Unknown cells (no adjustment; add each to the validation plan):");
    for (const a of c.assumptions) {
      const r = c.reads.find((x) => x.cell === a.cell);
      const why = r?.status === "unknown" && r.expired ? `, ${r.expired}` : "";
      lines.push(`  ${a.text} (${a.record}${why}; read by ${a.rules.join(", ")})`);
    }
  }
  return lines.join("\n");
}

const USAGE = "usage: node packages/naive/src/engine/gate-calibration.ts <venture dir> [--json] [--propose] [--valid-at <date>]";

/** Parses the CLI's arguments at the boundary. */
export const parseArgs = (args: string[]) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const [dir] = args;
  const i = args.indexOf("--valid-at");
  const raw = i > 0 ? args[i + 1] : undefined;
  if (!dir || dir.startsWith("--") || !(yield* fs.exists(join(dir, "venture.json")))) return yield* Effect.fail(new CannotRun({ message: USAGE }));
  if (i > 0 && !(raw !== undefined && isIsoDate(raw))) return yield* Effect.fail(new CannotRun({ message: `--valid-at needs a date written YYYY-MM-DD; ${USAGE}` }));
  return { dir, validAt: raw !== undefined && isIsoDate(raw) ? raw : undefined, json: args.includes("--json"), propose: args.includes("--propose") };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  await runMain(Effect.gen(function* () {
    const a = yield* parseArgs(process.argv.slice(2));
    const c = yield* calibrationEffect(a.dir, { validAt: a.validAt });
    const proposed = a.propose ? yield* proposeEffect(a.dir, c) : null;
    yield* Effect.sync(() => {
      if (a.json) console.log(JSON.stringify({ ...c, ...(proposed ? { proposed } : {}) }, null, 2));
      else {
        console.log(calibrationText(c));
        if (proposed) console.log(proposed.kind === "kept" ? `\nkept decision ${proposed.id} (${proposed.status})` : `\nproposed open decision ${proposed.id}`);
      }
    });
  }));
}
