// Checks a venture's detectors and their detection ledgers (docs/design/SIGNAL_DETECTION_2026-11-07.md, "The
// criterion rule" and "The detection ledger"), and reports what each ledger says about its detector.
//
//   node packages/naive/src/checks/check-detectors.ts <venture dir> [--json] [--propose]
//
// The detectors are the venture's own governance/detectors/<id>.json, plus each default Naive ships in
// packages/naive/template/governance/detectors/ that the venture has no copy of (reported as from "default").
//
// Report, per detector, from the resolved trials of its ledger (<id>.trials.jsonl): hit and false alarm rates with
// Wilson intervals, d' and c (log-linear corrected), ROC area, the base rate, and the expected cost per call at the
// current yes line and at the best observed line, with the detector's costs. The arithmetic is
// packages/naive/src/engine/detection.ts. A no line is not modelled in the costs: a score in the unsure band counts
// as the call the person made, which the resolution's outcome names.
//
// It fails only on structure, never on a number:
//   - a detector file that is not JSON, does not match detector.schema.json, or whose id is not its file name;
//   - a no line not below the yes line (above it under yes_when below);
//   - costs that differ from the tier's when costs.set_by is "tier";
//   - a one_way_door detector with a line or costs;
//   - an evidence source that is neither "venture" nor a source id in the venture's knowledge/sources.json;
//   - a resolver or sensor that does not exist, where that can be checked: a person resolver or a person sensor
//     must be a role in the venture roles or agent roles register (the venture's own copy, else Naive's), or a
//     founder or person the venture names; a record resolver must be a record type in the data model, or draft
//     (the gate's held drafts); a check sensor that names a module path must name a file in Naive or the venture.
//     A producer resolver and the sensors of the other kinds are free text and are not checked;
//   - an assign_to (the role a yes call's decision is put to, as seam detectors name a lead) that is not a role in
//     the registers, a person the venture names, or a role template (governance/roles/<id>.json, the venture's or Naive's);
//   - a ledger line that is not JSON or does not match detector-trial.schema.json, a broken hash chain, an id used
//     twice, a line naming another detector, a resolution of a trial no earlier line is, a trial resolved twice, an
//     outcome the call cannot have (a yes call resolves as a hit or a false alarm, a no call as a miss or a correct
//     rejection), and a ledger for a detector that neither the venture nor Naive defines.
//
// --propose files a criterion change as an open decision (an agent proposes; a person decides), only when the tier
// is not one_way_door, the ledger holds at least 30 resolved trials, and the Wilson interval on the cost difference
// between the current line and the best line excludes zero. Moving one line changes the call only for the trials
// between the two lines, and each of those either helps (a yes that becomes right) or hurts. The best line is
// cheaper exactly when the share that helps is above w_hurt / (w_help + w_hurt), where each weight is the value of
// the right call plus the cost of the wrong one for that trial's class. The Wilson interval on that share gives the
// interval on the cost difference. A proposal is filed once per detector and line in force: a rerun leaves it as
// it is, open or decided. It never edits a detector.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { lineHash } from "../core/provenance.mjs";
import { ventureFile } from "../core/venture-paths.mjs";
import { ROOT, readDataModel } from "../records/index.mjs";
import { validateValue } from "../records/validate.mjs";
import type { Detector, DetectorTrial } from "../records/types/records.d.ts";
import { LOCAL, MAP } from "../store/connectors/index.mjs";
import { bestCriterion, expectedCost, optimalBeta, summarize, wilson } from "../engine/detection.ts";
import type { Payoffs, Summary, Trial } from "../engine/detection.ts";
import { DETECTORS, TEMPLATE } from "../engine/detectors.mjs";
import { decisionFile, propose, signers } from "../engine/decisions.mjs";

/** The costs each impact tier sets by default (detector.schema.json, tier). */
export const TIER_COSTS: Readonly<Record<string, Payoffs>> = {
  low: { hit: 1, miss: 1, false_alarm: 1, correct_rejection: 1 },
  costly: { hit: 1, miss: 3, false_alarm: 1, correct_rejection: 1 },
};
/** Resolved trials a detector needs before a criterion change is proposed. */
export const MIN_TRIALS = 30;
/** The record a record resolver may name that is not a data model record type: the gate's held drafts. */
const NON_MODEL_RECORDS = new Set(["draft"]);
const PROPOSER = "check-detectors";
const FITS: Record<string, string[]> = { yes: ["hit", "false-alarm"], no: ["miss", "correct-rejection"], unsure: ["hit", "miss", "false-alarm", "correct-rejection"] };

type YesWhen = "above" | "below";
type Line = { line: number; cost: number };
type Comparison = {
  current: Line;
  best: Line;
  changed: number;
  helped: number;
  /** Mean cost difference per call, best minus current, and its interval. Negative is cheaper. */
  difference: { estimate: number; low: number; high: number } | null;
  excludes_zero: boolean;
  per_100: { hits: number; misses: number; false_alarms: number; correct_rejections: number };
};
export type DetectorReport = {
  id: string;
  from: "venture" | "default";
  tier: string;
  yes_when: YesWhen;
  trials: number;
  resolved: number;
  unresolved: number;
  base_rate: { source: string; value: number | null };
  summary: Summary | null;
  optimal_beta: number | null;
  costs: (Payoffs & { set_by: string }) | null;
  comparison: Comparison | null;
  proposal: { eligible: boolean; reason: string; text?: string };
};
export type Report = { venture: string; detectors: DetectorReport[]; defaults: string[]; errors: string[]; checked: string[] };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const readJson = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));
const schemaErrors = (schema: string, value: unknown): string[] => {
  const v = validateValue(schema, value);
  return v.status === 0 ? [] : (v.stdout + v.stderr).trim().split("\n").filter(Boolean);
};
const num = (x: number): string => String(Number(x.toPrecision(6)));
const tenth = (x: number): string => String(Math.round(x * 10) / 10);

/** Whether a score is a yes call at a yes line. Under above a score at or above the line is yes; under below a score strictly below it is. */
export const yesAt = (score: number, line: number, yesWhen: YesWhen): boolean => (yesWhen === "below" ? score < line : score >= line);

function rolesKnown(dir: string): Set<string> {
  const out = new Set<string>(signers(dir) as Set<string>);
  for (const name of ["venture-roles.json", "agent-roles.json"]) {
    const own = ventureFile(dir, `governance/roles/${name}`);
    const f = existsSync(own) ? own : join(ROOT, "packages/naive/template/governance/roles", name);
    if (!existsSync(f)) continue;
    const r = readJson(f);
    if (isObj(r) && Array.isArray(r.roles)) for (const x of r.roles) if (isObj(x) && typeof x.id === "string") out.add(x.id);
  }
  return out;
}

function sourcesKnown(dir: string): Set<string> {
  const out = new Set([LOCAL]);
  const f = ventureFile(dir, MAP);
  if (existsSync(f)) {
    const m = readJson(f);
    if (isObj(m) && Array.isArray(m.sources)) for (const s of m.sources) if (isObj(s) && typeof s.id === "string") out.add(s.id);
  }
  return out;
}

/** The structural rules on one detector record. */
function detectorErrors(dir: string, d: Detector, where: string, known: { roles: Set<string>; sources: Set<string>; records: Set<string> }): string[] {
  const errors: string[] = [];
  const yesWhen: YesWhen = d.evidence?.scale?.yes_when === "below" ? "below" : "above";
  const c = d.criterion ?? {};
  if (d.tier === "one_way_door") {
    if (c.yes || c.no) errors.push(`${where}: a one_way_door detector draws no line; every call goes to a person`);
    if (d.costs) errors.push(`${where}: a one_way_door detector has no costs`);
  } else {
    if (c.yes && c.no) {
      const ok = yesWhen === "above" ? c.no.value < c.yes.value : c.no.value > c.yes.value;
      if (!ok) errors.push(`${where}: the no line ${c.no.value} must be ${yesWhen === "above" ? "below" : "above"} the yes line ${c.yes.value} (yes_when ${yesWhen})`);
    }
    const tier = TIER_COSTS[d.tier];
    if (d.costs?.set_by === "tier" && tier) {
      const off = (Object.keys(tier) as (keyof Payoffs)[]).filter((k) => d.costs?.[k] !== tier[k]);
      if (off.length) errors.push(`${where}: costs say set_by tier, but ${off.map((k) => `${k} is ${d.costs?.[k]} where ${d.tier} sets ${tier[k]}`).join(", ")}`);
    }
  }
  for (const s of d.evidence?.sources ?? []) {
    if (!known.sources.has(s.source)) errors.push(`${where}: evidence source ${s.source} is neither venture nor a source in ${MAP}`);
  }
  const r = d.resolution?.resolver;
  if (r?.kind === "person" && !known.roles.has(r.id)) errors.push(`${where}: resolver ${r.id} is not a role in the roles registers or a person the venture names`);
  if (r?.kind === "record" && !known.records.has(r.id) && !NON_MODEL_RECORDS.has(r.id)) errors.push(`${where}: resolver record ${r.id} is not a record type in the data model`);
  // assign_to (seam detectors): a role in the registers, a person the venture names, or a role template, the venture's or Naive's.
  const assign = d.assign_to;
  if (assign && !known.roles.has(assign) && !existsSync(ventureFile(dir, `governance/roles/${assign}.json`)) && !existsSync(join(ROOT, "packages/naive/template/governance/roles", `${assign}.json`))) {
    errors.push(`${where}: assign_to ${assign} is not a role in the roles registers, a role template or a person the venture names`);
  }
  const sensor = d.evidence?.sensor ?? "";
  if (d.evidence?.kind === "person" && !known.roles.has(sensor)) errors.push(`${where}: sensor ${sensor} is not a role in the roles registers or a person the venture names`);
  const path = sensor.split(/\s/)[0];
  if (d.evidence?.kind === "check" && /\.(m?js|ts)$/.test(path) && !existsSync(join(ROOT, path)) && !existsSync(ventureFile(dir, path))) {
    errors.push(`${where}: sensor ${path} is not a file in Naive or the venture`);
  }
  return errors;
}

/** The structural rules on one ledger: shape, chain, ids, detector, trials named and outcomes that fit. */
export function ledgerErrors(id: string, text: string, where: string): { errors: string[]; lines: DetectorTrial[] } {
  const errors: string[] = [], lines: DetectorTrial[] = [];
  const ids = new Set<string>(), trials = new Map<string, DetectorTrial>(), resolved = new Set<string>();
  let prev = "genesis";
  text.split("\n").forEach((raw, i) => {
    if (!raw.trim()) return;
    const at = `${where}:${i + 1}`;
    let l: DetectorTrial;
    try { l = JSON.parse(raw) as DetectorTrial; } catch { errors.push(`${at}: not JSON`); prev = ""; return; }
    for (const e of schemaErrors("detector-trial.schema.json", l)) errors.push(`${at}: ${e}`);
    if (l.prev !== prev) errors.push(`${at}: the chain breaks: prev is ${l.prev}, the line before hashes to ${prev || "nothing readable"}`);
    if (l.hash !== lineHash(l.prev, l)) errors.push(`${at}: the chain breaks: its hash does not match its content`);
    prev = l.hash;
    if (ids.has(l.id)) errors.push(`${at}: the id ${l.id} is used twice`);
    ids.add(l.id);
    if (l.detector !== id) errors.push(`${at}: names detector ${l.detector}, but this is the ledger of ${id}`);
    if (l.kind === "trial") trials.set(l.id, l);
    else if (l.kind === "resolution") {
      const t = trials.get(l.trial ?? "");
      if (!t) errors.push(`${at}: resolves ${l.trial}, which no earlier line is`);
      else if (!(FITS[t.call ?? ""] ?? []).includes(l.outcome ?? "")) errors.push(`${at}: a ${t.call} call cannot resolve as ${l.outcome}`);
      if (resolved.has(l.trial ?? "")) errors.push(`${at}: ${l.trial} was already resolved`);
      resolved.add(l.trial ?? "");
    }
    lines.push(l);
  });
  return { errors, lines };
}

/** The resolved trials of a ledger, as detection.ts trials. The outcome names the call made, also for an unsure trial that a person called. */
function resolvedTrials(lines: DetectorTrial[]): Trial[] {
  const out = new Map<string, string>();
  for (const l of lines) if (l.kind === "resolution" && l.trial && l.outcome && !out.has(l.trial)) out.set(l.trial, l.outcome);
  const trials: Trial[] = [];
  for (const l of lines) {
    const o = l.kind === "trial" ? out.get(l.id) : undefined;
    if (!o || typeof l.score !== "number") continue;
    trials.push({ score: l.score, call: o === "hit" || o === "false-alarm" ? "yes" : "no", outcome: o === "hit" || o === "miss" ? "signal" : "noise" });
  }
  return trials;
}

/** Scores and lines in the orientation detection.ts assumes (a higher score means yes). */
const oriented = (trials: Trial[], yesWhen: YesWhen): Trial[] => (yesWhen === "below" ? trials.map((t) => ({ ...t, score: -t.score })) : trials);

/** The criterion detection.ts compares with (yes when score >= it) that calls the trials as the line does. */
function orientedLine(trials: Trial[], line: number, yesWhen: YesWhen): number {
  if (yesWhen === "above") return line;
  // yes when score < line, that is when -score > -line: the smallest negated score above -line, else every call no.
  const above = trials.map((t) => t.score).filter((s) => s > -line);
  return above.length ? Math.min(...above) : Infinity;
}

/** Maps detection.ts's best criterion back to a line on the detector's own scale. */
function lineBack(trials: Trial[], c: number, yesWhen: YesWhen): number {
  if (yesWhen === "above") return c;
  // c is a negated score -s (yes when score <= s) or Infinity (every call no). Under below the strict line that
  // makes the same calls is the lowest observed score above s, else the highest score plus one.
  const scores = trials.map((t) => -t.score);
  if (c === Infinity) return Math.min(...scores);
  const s = -c, higher = scores.filter((x) => x > s);
  return higher.length ? Math.min(...higher) : s + 1;
}

/** Current line against the best observed line, with the Wilson interval on their cost difference. */
export function compare(raw: Trial[], line: number, yesWhen: YesWhen, p: Payoffs, zCrit = 1.959963984540054): Comparison | null {
  if (!raw.length) return null;
  const trials = oriented(raw, yesWhen);
  const cur = expectedCost(trials, orientedLine(trials, line, yesWhen), p);
  const best = bestCriterion(trials, p);
  if (cur === null || best === null) return null;
  const bestLine = lineBack(trials, best.criterion, yesWhen);
  const n = trials.length;
  const delta = { hits: 0, misses: 0, false_alarms: 0, correct_rejections: 0 };
  let changed = 0, helped = 0, moreYes = false;
  for (const t of raw) {
    const before = yesAt(t.score, line, yesWhen), after = yesAt(t.score, bestLine, yesWhen);
    if (before === after) continue;
    changed++;
    moreYes = after;
    const signal = t.outcome === "signal";
    if (signal === after) helped++;
    if (signal) { delta.hits += after ? 1 : -1; delta.misses += after ? -1 : 1; }
    else { delta.false_alarms += after ? 1 : -1; delta.correct_rejections += after ? -1 : 1; }
  }
  const per = (k: number): number => (k * 100) / n;
  const per_100 = { hits: per(delta.hits), misses: per(delta.misses), false_alarms: per(delta.false_alarms), correct_rejections: per(delta.correct_rejections) };
  let difference: Comparison["difference"] = null, excludes = false;
  if (changed) {
    // One move of one line sends every changed trial the same way, so the helped trials are of one class and the
    // hurt ones of the other. Lowering a yes-above line (more yes calls) helps signal trials and hurts noise ones.
    const ws = p.hit + p.miss, wn = p.correct_rejection + p.false_alarm;
    const wHelp = moreYes ? ws : wn, wHurt = moreYes ? wn : ws;
    const w = wilson(helped, changed, zCrit);
    const at = (share: number): number => (changed / n) * ((1 - share) * wHurt - share * wHelp);
    if (w && wHelp + wHurt > 0) {
      difference = { estimate: at(w.estimate), low: at(w.high), high: at(w.low) };
      excludes = difference.high < 0;
    }
  }
  return { current: { line, cost: cur }, best: { line: bestLine, cost: best.cost }, changed, helped, difference, excludes_zero: excludes, per_100 };
}

/** The open decision's question: the change and its estimated effect in plain words. */
export function proposalText(d: Detector, c: Comparison): string {
  const name = d.title ? `${d.id} (${d.title})` : d.id;
  const verb = c.best.line < c.current.line ? "lower" : "raise";
  const p = c.per_100, parts: string[] = [];
  const say = (k: number, one: string, many: string, more: boolean): string => `${tenth(Math.abs(k))} ${more ? "more " : ""}${Math.abs(k) === 1 ? one : many}`;
  const saves = [p.false_alarms < 0 && say(p.false_alarms, "false alarm", "false alarms", false), p.misses < 0 && say(p.misses, "miss", "misses", false)].filter(Boolean);
  const costs = [p.false_alarms > 0 && say(p.false_alarms, "false alarm", "false alarms", true), p.misses > 0 && say(p.misses, "miss", "misses", true)].filter(Boolean);
  if (saves.length) parts.push(`it saves about ${saves.join(" and ")}`);
  if (costs.length) parts.push(`for ${costs.join(" and ")}`);
  const diff = c.difference;
  const cost = diff ? ` Net cost per call (the cost of errors less the value of right calls) falls from ${num(c.current.cost)} to ${num(c.best.cost)} (95% interval on the change: ${num(diff.low)} to ${num(diff.high)}).` : "";
  const bestLine = Number.isFinite(c.best.line) ? num(c.best.line) : "a line no score reaches";
  return `${verb[0].toUpperCase()}${verb.slice(1)} ${name}'s yes line from ${num(c.current.line)} to ${bestLine}: at today's costs ${parts.join(" ")} per 100 calls.${cost}`;
}

/** Reads and checks one venture's detectors and ledgers. */
export function checkVenture(dir: string): Report {
  const errors: string[] = [], reports: DetectorReport[] = [], checked: string[] = [];
  const folder = ventureFile(dir, DETECTORS);
  const files = existsSync(folder) ? readdirSync(folder) : [];
  const ownIds = files.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5));
  const shippedIds = existsSync(TEMPLATE) ? readdirSync(TEMPLATE).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : [];
  const defaults = shippedIds.filter((id) => !ownIds.includes(id));
  const known = { roles: rolesKnown(dir), sources: sourcesKnown(dir), records: new Set<string>(readDataModel().records.map((r: { id: string }) => r.id)) };
  checked.push("evidence sources against venture and knowledge/sources.json", "person resolvers and person sensors against the roles registers and the founders the venture names", "record resolvers against the data model (and draft)", "check sensors that name a module path against the files of Naive and the venture", "assign_to against the roles registers, the founders the venture names and the role templates", "not checked: producer resolvers and the sensors of founder-agent, accumulated and sequential detectors, which are free text");
  const venture = (() => { try { const v = readJson(join(dir, "venture.json")); return isObj(v) && typeof v.id === "string" ? v.id : dir; } catch { return dir; } })();

  for (const id of [...ownIds, ...defaults].sort()) {
    const own = ownIds.includes(id);
    const file = own ? join(folder, `${id}.json`) : join(TEMPLATE, `${id}.json`);
    const where = own ? `${DETECTORS}/${id}.json` : `${DETECTORS}/${id}.json (Naive's default)`;
    let d: Detector;
    try { d = readJson(file) as Detector; } catch (e) { errors.push(`${where}: not JSON (${e instanceof Error ? e.message : String(e)})`); continue; }
    const bad = schemaErrors("detector.schema.json", d);
    for (const e of bad) errors.push(`${where}: ${e}`);
    if (d.id !== id) errors.push(`${where}: its id is ${d.id}, not its file name ${id}`);
    errors.push(...detectorErrors(dir, d, where, known));

    const ledgerFile = join(folder, `${id}.trials.jsonl`);
    const { errors: le, lines } = existsSync(ledgerFile) ? ledgerErrors(id, readFileSync(ledgerFile, "utf8"), `${DETECTORS}/${id}.trials.jsonl`) : { errors: [], lines: [] };
    errors.push(...le);
    const trials = resolvedTrials(lines);
    const count = lines.filter((l) => l.kind === "trial").length;
    const yesWhen: YesWhen = d.evidence?.scale?.yes_when === "below" ? "below" : "above";
    const signal = trials.filter((t) => t.outcome === "signal").length;
    const base = d.base_rate?.source === "stated" ? (d.base_rate.value ?? null) : trials.length ? signal / trials.length : null;
    const costs = d.costs ? { hit: d.costs.hit, miss: d.costs.miss, false_alarm: d.costs.false_alarm, correct_rejection: d.costs.correct_rejection, set_by: d.costs.set_by } : null;
    const payoffs: Payoffs | null = costs ? { hit: costs.hit, miss: costs.miss, false_alarm: costs.false_alarm, correct_rejection: costs.correct_rejection } : null;
    const yes = d.criterion?.yes?.value;
    const comparison = payoffs && typeof yes === "number" && trials.length ? compare(trials, yes, yesWhen, payoffs) : null;
    let optimal: number | null = null;
    if (payoffs && base !== null && base > 0 && base < 1 && payoffs.hit + payoffs.miss > 0) optimal = optimalBeta(base, payoffs);
    const why = d.tier === "one_way_door" ? "one_way_door: every call goes to a person and no line is ever proposed"
      : bad.length || le.length ? "the detector or its ledger fails a structural rule"
      : trials.length < MIN_TRIALS ? `${trials.length} resolved trials, fewer than ${MIN_TRIALS}: the set line stays`
      : !comparison || !comparison.changed ? "the current line is already the best observed line"
      : !comparison.excludes_zero ? "the interval on the cost difference includes zero: the evidence does not favour the best line yet"
      : "";
    reports.push({
      id, from: own ? "venture" : "default", tier: d.tier, yes_when: yesWhen,
      trials: count, resolved: trials.length, unresolved: count - trials.length,
      base_rate: { source: d.base_rate?.source ?? "ledger", value: base },
      summary: trials.length ? summarize(oriented(trials, yesWhen)) : null,
      optimal_beta: optimal, costs, comparison,
      proposal: why ? { eligible: false, reason: why } : { eligible: true, reason: "the best line is cheaper and the interval excludes zero", text: comparison ? proposalText(d, comparison) : "" },
    });
  }
  for (const f of files.filter((x) => x.endsWith(".trials.jsonl"))) {
    const id = f.slice(0, -".trials.jsonl".length);
    if (!ownIds.includes(id) && !shippedIds.includes(id)) errors.push(`${DETECTORS}/${f}: a ledger for ${id}, which neither the venture nor Naive defines`);
  }
  return { venture, detectors: reports, defaults, errors, checked };
}

/** The decision id of a proposal: one per detector and line in force, so a rerun finds what it filed. */
export const proposalId = (d: DetectorReport): string =>
  `criterion-${d.id}-${createHash("sha256").update(JSON.stringify([d.yes_when, d.comparison?.current.line])).digest("hex").slice(0, 8)}`;

export type Proposed = { detector: string; ok: boolean; result?: Record<string, unknown>; error?: string };

/** Files each eligible proposal as an open decision once. A decision it already filed, open or decided, is left as it is. */
export function proposeCriteria(dir: string, report: Report): Proposed[] {
  const out: Proposed[] = [];
  for (const d of report.detectors) {
    if (!d.proposal.eligible || !d.proposal.text || d.tier === "one_way_door") continue;
    const id = proposalId(d);
    const file = decisionFile(dir, id);
    if (file) {
      const prior = readJson(ventureFile(dir, file));
      out.push({ detector: d.id, ok: true, result: { kept: id, file, status: isObj(prior) ? prior.status : undefined } });
      continue;
    }
    const r = propose(dir, { id, question: d.proposal.text, note: `check-detectors proposal for ${DETECTORS}/${d.id}.json. Accepting it means a person sets the detector's yes line; this check never edits a detector.` }, { agentId: PROPOSER, via: "cli" });
    out.push({ detector: d.id, ...r });
  }
  return out;
}

function print(r: Report, proposed: Proposed[] | null): void {
  if (r.defaults.length) console.log(`Naive's defaults in force (no venture copy): ${r.defaults.join(", ")}`);
  for (const d of r.detectors) {
    console.log(`\n${d.id} (${d.from}, ${d.tier}, yes when ${d.yes_when}): ${d.trials} trials, ${d.resolved} resolved, ${d.unresolved} unresolved`);
    const s = d.summary;
    if (s) {
      const iv = (x: { estimate: number; low: number; high: number } | null): string => (x ? `${num(x.estimate)} [${num(x.low)}, ${num(x.high)}]` : "no trials");
      console.log(`  hit rate ${iv(s.hit_rate)}, false alarm rate ${iv(s.false_alarm_rate)}`);
      console.log(`  d' ${num(s.gaussian.d_prime)}, c ${num(s.gaussian.c)} (log-linear), ROC area ${s.roc_area === null ? "needs both outcomes" : num(s.roc_area)}`);
    }
    console.log(`  base rate ${d.base_rate.value === null ? "unknown" : num(d.base_rate.value)} (${d.base_rate.source})${d.optimal_beta === null ? "" : `, optimal beta ${num(d.optimal_beta)}`}`);
    if (d.comparison) console.log(`  expected cost per call: ${num(d.comparison.current.cost)} at the current line ${num(d.comparison.current.line)}, ${num(d.comparison.best.cost)} at the best observed line ${num(d.comparison.best.line)}`);
    console.log(`  proposal: ${d.proposal.eligible ? d.proposal.text : d.proposal.reason}`);
  }
  if (proposed) console.log(`\nproposed ${proposed.filter((p) => p.result?.proposed).length} open decisions, kept ${proposed.filter((p) => p.result?.kept).length} already filed`);
  console.log(`\nchecked: ${r.checked.join("; ")}`);
  for (const e of r.errors) console.error(`error: ${e}`);
  console.log(`\n${r.detectors.length} detectors, ${r.errors.length} structural errors`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((a) => a.startsWith("--")));
  const [dir] = args.filter((a) => !a.startsWith("--"));
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/checks/check-detectors.ts <venture dir> [--json] [--propose]"); process.exit(2); }
  const report = checkVenture(dir);
  const proposed = flags.has("--propose") ? proposeCriteria(dir, report) : null;
  if (flags.has("--json")) console.log(JSON.stringify({ ...report, ...(proposed ? { proposed } : {}) }, null, 2));
  else print(report, proposed);
  const failed = (proposed ?? []).filter((p) => !p.ok);
  for (const p of failed) console.error(`could not propose for ${p.detector}: ${p.error}`);
  process.exit(report.errors.length || failed.length ? 1 : 0);
}
