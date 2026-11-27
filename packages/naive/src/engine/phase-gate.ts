#!/usr/bin/env node
// Gate strength (EE-156): how strong the evidence behind each item of a phase gate is, and whether that is enough
// under the venture's policy. Each gate item (packages/naive/src/phases/gate-policies.json) has an evidence ladder
// on the levels very low, low, moderate and high, the way a password meter has one, and the policy gives each item a
// minimum level and a boundary: fail-closed refuses the phase change, fail-open lets it pass and reports the
// shortfall as an open risk. Interviews are the strongest common proof but not the only one: a record's own evidence
// is graded by packages/naive/src/engine/evidence-grade.ts (adapted from GRADE), so desk research from three
// independent sources can reach moderate.
//
//   node packages/naive/src/engine/phase-gate.ts <venture dir> [--preset <name>] [--json]
//
// The measures:
//   grade      the record's evidence grade
//   count      the higher of the level its interviews reach (count_levels) and the record's own grade
//   coverage   the share of the other items below high that a validation plan assumption (open or passed) names
//   authority  high only when a person decided; otherwise pending
// A record that is missing, or has a required field empty, is very low whatever else it holds.
//
// The policy is a preset (default standard) from naive.config.json phase_gates.preset, with per-item overrides under
// phase_gates.items.<phase>.<item>; phase_gates.count_levels replaces the interview counts per level and
// phase_gates.staleness_months how old evidence may be before it drops a level (both proposed by gate-calibration.ts, EE-157). Scoring is pure; reading the venture is an Effect over VentureFs (EE-125), and
// phaseGate runs it with runSync. Exit 0 for a report, 2 on a bad call.
// A .mjs file because packages/naive/src/engine/lifecycle.ts imports it and the router runs it as a command route.

import { Effect } from "effect";
import { join } from "node:path";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { runSync } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { ROOT } from "../phases/phases.ts";
import { readDataModel, venturePaths } from "../records/index.ts";
import { gradeRecord, LEVELS } from "./evidence-grade.ts";
import { CONFIG } from "./naive-config.ts";
import type { NaiveConfig, PhaseGatePolicies, PhaseGatePoliciesLevel } from "../records/types/records.d.ts";

export type Level = PhaseGatePoliciesLevel;
export type Boundary = "fail-open" | "fail-closed";
export type Policies = PhaseGatePolicies;
export type PhasePolicies = Policies["phases"][string];
/** One gate item. The gate never reads `ask`, so a caller may leave it out. */
export type GateItem = Omit<PhasePolicies["items"][number], "ask"> & { ask?: string };
export type Measure = GateItem["measure"];
export type ItemPolicy = { min: Level, boundary: Boundary };
export type Policy = { preset: string, items: Record<string, ItemPolicy & { overridden?: boolean }> };
export type GateConfig = Pick<NaiveConfig, "phase_gates">;
export type Found = { file: string, value: Record<string, unknown> | null };
/** What the gate reads of an interview file, which it does not validate. */
export type Interview = { id?: string, icp?: string, consent?: { given?: boolean }, current_solutions?: unknown[] };
export type Icp = { id?: string, primary?: boolean };
export type GateContext = {
  records: Record<string, Found>, interviews: Interview[], icps: Icp[], countLevels: Record<string, number>,
  decidedBy?: string | null, levels?: Record<string, Level>, items?: GateItem[], today?: Date, staleMonths?: number,
};
export type Strength = { level: Level, missing: string[], why: string[], next: string | null, pending?: boolean, count?: number };
export type GateRow = { id: string, label: string, record: string | null, file: string | null, level: Level, min: Level, boundary: Boundary, passed: boolean, missing: string[], why: string[], next: string | null };
export type GateOpts = { preset?: string, phase?: string, decidedBy?: string | null, root?: string, today?: Date };

/** The policy file. */
export const POLICIES = "packages/naive/src/phases/gate-policies.json";
/** The preset a venture has when it names none. */
export const DEFAULT_PRESET = "standard";
/** Where a venture's validation plan lives while the data model does not list the record type yet. */
const PLAN_FALLBACK = "validation/plan.json";
/** How much a fail-open item counts toward strictness against a fail-closed one. */
export const OPEN_WEIGHT = 0.25;

const rank = (l: string) => LEVELS.indexOf(l);
const at = (i: number): Level => LEVELS[Math.max(0, Math.min(LEVELS.length - 1, i))] as Level;
const empty = (v: unknown) => v == null || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

/** The level a count of interviews reaches, by the minimum counts in count_levels. */
export function levelFromCount(n: number, countLevels: Record<string, number>): Level {
  for (const l of ["high", "moderate", "low"]) if (typeof countLevels[l] === "number" && n >= countLevels[l]) return l as Level;
  return "very low";
}

/** What reaches each next level under the GRADE rules (evidence-grade.ts), for a graded record. */
export const GRADE_NEXT = Object.freeze({
  low: "add desk research about the target audience, or specific stated answers from 5 or more of the target audience (one such source reaches low)",
  moderate: "add commitment from the target audience with a sample of 5 or more (a deposit, a pre-order, a letter of intent), or three distinct sources that each grade low or better",
  high: "add behavior from the target audience with a sample of 5 or more (what they paid, used or switched)",
});

/** Which interviews count for a count measure: consenting ones, filtered by what the measure counts. */
export function countedInterviews(of: string | undefined, ctx: GateContext) {
  const consenting = ctx.interviews.filter((i) => i.consent?.given === true);
  if (of === "interviews-with-primary-icp") {
    const ids = ctx.icps.filter((p) => p.primary === true).map((p) => p.id);
    const allowed = new Set(ids.length ? ids : ctx.icps.map((p) => p.id));
    return consenting.filter((i) => typeof i.icp === "string" && allowed.has(i.icp));
  }
  if (of === "interviews-with-current-solutions") return consenting.filter((i) => Array.isArray(i.current_solutions) && i.current_solutions.length > 0);
  return consenting;
}

const countNoun = (of: string | undefined) => of === "interviews-with-primary-icp" ? "consenting interviews with someone who fits the primary ICP"
  : of === "interviews-with-current-solutions" ? "consenting interviews that record how the person copes today (current_solutions)" : "consenting interviews";

/**
 * The strength of one gate item. Pure: ctx holds the records already read. For a coverage item, ctx.levels holds the
 * other items' levels and ctx.items the phase's items.
 */
export function itemStrength(item: GateItem, ctx: GateContext): Strength {
  const kind = item.measure.kind;
  if (kind === "authority") {
    const who = typeof ctx.decidedBy === "string" && ctx.decidedBy.trim() ? ctx.decidedBy.trim() : null;
    return who
      ? { level: "high", missing: [], why: [`decided by ${who}`], next: null }
      : { level: "very low", missing: [], why: ["pending: no person has decided yet"], next: "a person weighs the evidence and decides (naive phase advance)", pending: true };
  }
  const found = item.record ? ctx.records[item.record] : undefined;
  const rec = found?.value ?? null;
  if (!rec) return { level: "very low", missing: [...item.requires], why: [`no ${item.record} record${found?.file ? ` at ${found.file}` : ""}`], next: `write ${found?.file ?? `the ${item.record} record`}${item.requires.length ? ` with ${item.requires.join(", ")}` : ""}` };
  const missing = item.requires.filter((f) => empty(rec[f]));
  if (missing.length) return { level: "very low", missing, why: [`${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} empty`], next: `fill ${missing.join(", ")} in ${found?.file}` };

  if (kind === "grade") {
    const g = gradeRecord(rec, ctx.today ?? new Date(), ctx.staleMonths);
    const level = g.level as Level;
    const up = rank(level) < 3 ? (at(rank(level) + 1) as "low" | "moderate" | "high") : null;
    return { level, missing: [], why: [`evidence grades ${level}`, ...g.why], next: up ? `${up}: ${GRADE_NEXT[up]}` : null };
  }

  if (kind === "count") {
    const n = countedInterviews(item.measure.of, ctx).length;
    const byCount = levelFromCount(n, ctx.countLevels);
    const g = gradeRecord(rec, ctx.today ?? new Date(), ctx.staleMonths).level as Level;
    const level = rank(g) > rank(byCount) ? g : byCount;
    const why = [`${n} ${countNoun(item.measure.of)} (${byCount})`, ...(rank(g) > rank(byCount) ? [`the record's own evidence grades ${g}`] : [])];
    if (rank(level) >= 3) return { level, missing: [], why, next: null, count: n };
    const up = at(rank(level) + 1);
    const need = Math.max(1, (ctx.countLevels[up] ?? 0) - n);
    return { level, missing: [], why, count: n, next: `${up}: ${need} more ${countNoun(item.measure.of)}, or ${GRADE_NEXT[up as "low" | "moderate" | "high"]} on the record` };
  }

  // coverage: the other items below high, each named by an open or passed assumption.
  const assumptions = (Array.isArray(rec.assumptions) ? rec.assumptions : []) as { item?: string, status?: string }[];
  const named = new Set(assumptions.filter((a) => (a.status ?? "open") === "open" || a.status === "passed").map((a) => a.item));
  const others = (ctx.items ?? []).filter((i) => i.id !== item.id && i.measure.kind !== "authority" && i.measure.kind !== "coverage" && rank(ctx.levels?.[i.id] ?? "very low") < 3);
  const unnamed = others.filter((i) => !named.has(i.id)).map((i) => i.id);
  const share = others.length ? (others.length - unnamed.length) / others.length : 1;
  const level = share >= 1 ? "high" : share >= 2 / 3 ? "moderate" : share >= 1 / 3 ? "low" : "very low";
  return { level, missing: [], why: [`${others.length - unnamed.length} of ${others.length} items below high have an open or passed assumption`], next: unnamed.length ? `add an assumption for ${unnamed.join(", ")}` : null };
}

/**
 * The policy for a phase: a preset (opts preset, else naive.config.json phase_gates.preset, else standard), then
 * per-item overrides from phase_gates.items.<phase>.<item>. Null when the phase has no gate policy. Throws on an
 * unknown preset.
 */
export function policyFor(policies: Policies, phase: string, config: GateConfig = {}, preset?: string): Policy | null {
  const def = policies.phases[phase];
  if (!def) return null;
  const name = preset ?? config.phase_gates?.preset ?? DEFAULT_PRESET;
  const base = def.presets[name];
  if (!base) throw new Error(`no gate preset ${name}; the presets are ${Object.keys(def.presets).join(", ")}`);
  const over = config.phase_gates?.items?.[phase] ?? {};
  const items: Policy["items"] = {};
  for (const item of def.items) {
    const o = over[item.id] ?? {};
    const p = base[item.id] ?? { min: "very low", boundary: "fail-open" };
    items[item.id] = { min: o.min ?? p.min, boundary: o.boundary ?? p.boundary, ...(o.min || o.boundary ? { overridden: true } : {}) };
  }
  return { preset: name, items };
}

const score = (items: Record<string, ItemPolicy>) => {
  const xs = Object.values(items);
  if (!xs.length) return 0;
  const sum = xs.reduce((s, p) => s + (rank(p.min) / 3) * (p.boundary === "fail-closed" ? 1 : OPEN_WEIGHT), 0);
  return Math.round((sum / xs.length) * 100);
};

/**
 * How strict a policy is, 0 to 100: each item's minimum level over 3, weighted 1 when fail-closed and 0.25 when
 * fail-open, averaged. The label names the nearest preset when presets are given.
 */
export function strictness(policy: { items: Record<string, ItemPolicy> }, presets: Record<string, Record<string, ItemPolicy>> = {}): { score: number, label: string } {
  const s = score(policy.items);
  let label = "custom", best = Infinity;
  for (const [name, items] of Object.entries(presets)) { const d = Math.abs(score(items) - s); if (d < best) { best = d; label = name; } }
  return { score: s, label };
}

/** Scores a phase's items against its policy. Pure. */
export function scoreItems(items: GateItem[], policy: Policy, ctx: GateContext): GateRow[] {
  const levels: Record<string, Level> = {};
  const strengths: Map<string, Strength> = new Map();
  for (const item of items.filter((i) => i.measure.kind !== "coverage")) { const s = itemStrength(item, ctx); strengths.set(item.id, s); levels[item.id] = s.level; }
  for (const item of items.filter((i) => i.measure.kind === "coverage")) strengths.set(item.id, itemStrength(item, { ...ctx, levels, items }));
  return items.map((item) => {
    const s = strengths.get(item.id) as Strength;
    const p = policy.items[item.id];
    const passed = item.measure.kind === "authority" ? !s.pending : rank(s.level) >= rank(p.min);
    return { id: item.id, label: item.label, record: item.record, file: item.record ? ctx.records[item.record]?.file ?? null : null, level: s.level, min: p.min, boundary: p.boundary, passed, missing: s.missing, why: s.why, next: passed ? null : s.next };
  });
}

const sentence = (r: GateRow, preset: string) => r.why[0]?.startsWith("pending")
  ? `${r.id} (${r.label}): ${r.why[0]}`
  : `${r.id} (${r.label}) is ${r.level}; the ${preset} policy needs ${r.min}, ${r.boundary}${r.next ? `. Next: ${r.next}` : ""}`;

/** Every venture file of a record type, as logical paths; a collection's glob is listed. */
export const filesFor = (dir: string, globs: string[]) => Effect.gen(function* () {
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

/**
 * Reads what the gate needs from a venture and returns the report. A phase with no gate policy returns policy null
 * and never blocks.
 */
export const phaseGateEffect = (dir: string, opts: GateOpts = {}) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const root = opts.root ?? ROOT;
  const policies = (yield* readJson(join(root, POLICIES))) as Policies;
  const venture = (yield* readJson(join(dir, "venture.json"))) as { id: string, phase: string };
  const phase = opts.phase ?? venture.phase;
  const cfgFile = ventureFile(dir, CONFIG);
  const config = ((yield* fs.exists(cfgFile)) ? yield* readJson(cfgFile) : {}) as GateConfig;
  const policy = policyFor(policies, phase, config, opts.preset);
  if (!policy) return { venture: venture.id, phase, policy: null, preset: null, enforce: false, strictness: null, items: [], ready: true, passed: true, blocking: [], risks: [] };
  const def = policies.phases[phase];

  const model = readDataModel() as { records: { id: string, paths?: string[] }[] };
  const globsOf = (type: string) => { const r = model.records.find((x) => x.id === type); const g = r ? venturePaths(r) : []; return g.length ? g : type === "validation-plan" ? [PLAN_FALLBACK] : []; };
  const read = (file: string) => Effect.map(readJson(ventureFile(dir, file)), (v) => v as Record<string, unknown>);
  const all = (type: string) => Effect.gen(function* () {
    const files = yield* filesFor(dir, globsOf(type));
    return yield* Effect.forEach(files, (f) => Effect.map(read(f), (value) => ({ file: f, value })));
  });

  const icps = yield* all("icp");
  const interviews = yield* all("validation-interview");
  const records: Record<string, Found> = {};
  for (const type of new Set(def.items.map((i) => i.record).filter((x) => typeof x === "string"))) {
    const t = type as string;
    if (t === "icp") {
      const live = icps.filter((x) => x.value.status !== "retired");
      const primary = live.find((x) => x.value.primary === true) ?? live[0];
      records[t] = primary ?? { file: globsOf(t)[0]?.replace("*", "<id>") ?? t, value: null };
      continue;
    }
    const found = yield* all(t);
    records[t] = found[0] ?? { file: globsOf(t)[0] ?? t, value: null };
  }

  const ctx: GateContext = { records, interviews: interviews.map((x) => x.value as Interview), icps: icps.map((x) => x.value as Icp), countLevels: { ...policies.count_levels, ...config.phase_gates?.count_levels }, staleMonths: config.phase_gates?.staleness_months, decidedBy: opts.decidedBy ?? null, today: opts.today };
  const items = scoreItems(def.items, policy, ctx);
  const authority = new Set(def.items.filter((i) => i.measure.kind === "authority").map((i) => i.id));
  const closed = items.filter((r) => r.boundary === "fail-closed" && !r.passed);
  const ready = !closed.some((r) => !authority.has(r.id));
  return {
    venture: venture.id, phase, preset: policy.preset, enforce: config.phase_gates?.enforce === true,
    strictness: strictness(policy, def.presets),
    items, ready,
    passed: ready && items.every((r) => !authority.has(r.id) || r.passed || r.boundary === "fail-open"),
    blocking: closed.filter((r) => !authority.has(r.id)).map((r) => sentence(r, policy.preset)),
    risks: items.filter((r) => r.boundary === "fail-open" && !r.passed).map((r) => sentence(r, policy.preset)),
    pending: closed.filter((r) => authority.has(r.id)).map((r) => sentence(r, policy.preset)),
  };
});

/** The gate report as plain values. */
export const phaseGate = (dir: string, opts: GateOpts = {}) => runSync(phaseGateEffect(dir, opts));

/** A meter of four cells for a level, password-meter style: `[##  ]` is low. */
export const meter = (level: string) => `[${"#".repeat(rank(level) + 1).padEnd(4, " ")}]`;

/** The report as text, one meter per item. */
export function gateText(g: ReturnType<typeof phaseGate>) {
  if (!g.strictness) return `${g.venture}: ${g.phase} has no gate policy, so the gate never blocks.`;
  const lines = [`${g.venture}: the ${g.phase} gate under the ${g.preset} policy (strictness ${g.strictness.score} of 100, nearest ${g.strictness.label})${g.enforce ? ", enforced" : ", reported only"}`];
  for (const r of g.items) {
    lines.push(`  ${r.passed ? "✓" : "○"} ${meter(r.level)} ${r.label}: ${r.level} / needs ${r.min}, ${r.boundary}`);
    if (!r.passed && r.next) lines.push(`      next: ${r.next}`);
  }
  lines.push(g.ready ? (g.passed ? "Passed." : "Ready: the evidence is enough; a person decides.") : `Not ready: ${g.blocking.length} fail-closed item${g.blocking.length === 1 ? "" : "s"} short.`);
  if (g.risks.length) lines.push(`Open risks: ${g.risks.length}.`);
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args[0];
  const flag = (n: string) => { const i = args.indexOf(n); return i > 0 ? args[i + 1] : undefined; };
  const usage = "usage: node packages/naive/src/engine/phase-gate.ts <venture dir> [--preset <name>] [--json]";
  if (!dir || dir.startsWith("--") || !runSync(Effect.flatMap(VentureFs, (fs) => fs.exists(join(dir, "venture.json"))))) { console.error(usage); process.exit(2); }
  const preset = flag("--preset");
  if (args.includes("--preset") && !preset) { console.error(usage); process.exit(2); }
  try {
    const g = phaseGate(dir, { preset });
    console.log(args.includes("--json") ? JSON.stringify(g, null, 2) : gateText(g));
  } catch (e) {
    console.error(String((e as { message?: string }).message ?? e));
    process.exit(2);
  }
}
