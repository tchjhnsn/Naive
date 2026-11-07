// Record generator for an eval plan (EE-099; autoresearch design, everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The eval plan"). A person gives the pattern, the windows' as-of
// points, the horizon, the read cut, the weights, min_gain and the budgets. The generator fills the version (1
// unless given), the gap (the horizon unless given), the time it was made (now unless given) and the sha, the
// address of every other field, and refuses a plan whose windows are not ordered and purged (windowProblems). The
// draft is for <pattern>.plan.json. Freezing its eval set at _eval/<sha>/ is naive recipes plan, not built.
import { createHash } from "node:crypto";
import { cli, drop, questions, schemaOf, validate } from "./generate.mjs";
import { canonicalJson } from "../../core/signal-id.ts";
import type { EvalPlan } from "../../records/types/records.d.ts";

export const record = "eval-plan";
const DERIVED = ["version", "sha", "made", "gap", "$schema"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { version: "1 unless given", gap: "the horizon unless given", made: "now unless given", sha: "sha256 of the canonical JSON of every other field" } });

/** A plan's address: sha256 of the canonical JSON of every field but sha. */
export function planSha(plan: Record<string, unknown>): string {
  const { sha: _sha, ...rest } = plan;
  return createHash("sha256").update(canonicalJson(rest)).digest("hex");
}

/** Milliseconds in a duration: seconds as an integer, or a number followed by s, m, h, d or w. */
export function durationMs(d: number | string): number {
  if (typeof d === "number") return d * 1000;
  const m = /^([0-9]+)(s|m|h|d|w)$/.exec(d);
  if (!m) return Number.NaN;
  return Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400, w: 604800 }[m[2] as "s" | "m" | "h" | "d" | "w"] * 1000;
}

/**
 * What is wrong with a plan's windows, or nothing: each window in time order; the gap at least the horizon; dev
 * starts a gap after training ends and holdout a gap after dev ends (purged); read_cut after the last training
 * outcome settles and before the first dev point; every holdout outcome settled by the time the plan was made.
 */
export function windowProblems(p: Pick<EvalPlan, "horizon" | "gap" | "read_cut" | "windows" | "made">): string[] {
  const out: string[] = [];
  const h = durationMs(p.horizon), g = durationMs(p.gap);
  if (!(g >= h)) out.push(`the gap (${p.gap}) is shorter than the horizon (${p.horizon})`);
  const ms = (xs: string[]) => xs.map((x) => Date.parse(x));
  const [tr, dv, ho] = [ms(p.windows.training), ms(p.windows.dev), ms(p.windows.holdout)];
  for (const [name, xs] of [["training", tr], ["dev", dv], ["holdout", ho]] as const) {
    if (xs.some((x, i) => i > 0 && x <= xs[i - 1])) out.push(`the ${name} points are not in time order`);
  }
  const last = (xs: number[]) => Math.max(...xs), first = (xs: number[]) => Math.min(...xs);
  if (first(dv) < last(tr) + g) out.push("dev starts less than a gap after training ends");
  if (first(ho) < last(dv) + g) out.push("holdout starts less than a gap after dev ends");
  const cut = Date.parse(p.read_cut);
  if (cut < last(tr) + h) out.push("read_cut comes before the last training outcome settles");
  if (cut >= first(dv)) out.push("read_cut is not before the first dev point");
  if (last(ho) + h > Date.parse(p.made)) out.push("a holdout outcome had not settled when the plan was made");
  return out;
}

export function draft(a: Partial<EvalPlan>) {
  if (!a.pattern || !a.made_by || !a.horizon || !a.read_cut || !a.windows || !a.weights || a.min_gain === undefined || !a.budgets) {
    return { ok: false, record, errors: ["a plan needs the pattern, who made it, the horizon, the read cut, the windows, the weights, min_gain and the budgets"] };
  }
  const body = drop({ pattern: a.pattern, version: a.version ?? 1, previous: a.previous, made: a.made ?? new Date().toISOString().replace(/\.\d+Z$/, "Z"), made_by: a.made_by,
    horizon: a.horizon, gap: a.gap ?? a.horizon, read_cut: a.read_cut, windows: a.windows, weights: a.weights, min_gain: a.min_gain, bootstrap: a.bootstrap, budgets: a.budgets, limits: a.limits });
  const rec = { ...body, sha: planSha(body) } as EvalPlan;
  const v = validate(record, rec);
  const problems = v.ok ? windowProblems(rec) : [];
  return { ok: v.ok && problems.length === 0, record, file: `${a.pattern}.plan.json`, eval_set: `_eval/${rec.sha}/`, draft: rec, errors: [...v.errors, ...problems] };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
