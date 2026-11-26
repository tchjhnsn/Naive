// Ranks candidate languages for one system on the language rubric (EE-189,
// packages/naive/src/functions/it/language-rubric.json). It is pure: no I/O, no model.
//
// A candidate is ruled out when it scores 0 on a gate criterion or below a must-have the system sets, and no weighted
// sum buys that back (the tool-selection skill's principle 5). Every other candidate scored on each weighted criterion
// gets a total from 0 to 1: the sum of weight times score over 4, divided by the sum of the weights. A criterion whose
// weight is 0 for the system is left out. Totals within the rubric's tie band of the leader are reported as tied.
// A score never decides: the result says a person decides, and names no winner.
import type { LanguageRubric } from "../records/types/records.d.ts";

export type Candidate = Pick<LanguageRubric["examples"][number]["candidates"][number], "id" | "language" | "scores">;
/** What a person sets for one system: weights that replace the defaults, and the lowest score a criterion needs. */
export type SystemOptions = { weights?: Record<string, number>; must?: Record<string, number> };
export type Part = { criterion: string; weight: number; score: number; contribution: number };
export type Shortfall = { criterion: string; score: number; needs: number; why: "gate" | "must" };
export type Scored =
  | { id: string; language: string; status: "ranked"; total: number; rank: number; tied: boolean; parts: Part[] }
  | { id: string; language: string; status: "ruled-out"; ruled_out: Shortfall[]; parts: Part[] }
  | { id: string; language: string; status: "incomplete"; unscored: string[]; parts: Part[] };
export type Ranking = { decides: "person"; note: string; tie_band: number; weights: Record<string, number>; results: Scored[] };

export const NOTE = "A score never decides: a person decides. The weights are unvalidated priors, and each score is a rater's judgment.";
const MAX = 4;

/** Ranks the candidates for one system. Throws a RangeError on a score outside 0 to 4, a criterion the rubric lacks, or weights that are all 0. */
export function scoreLanguages(rubric: LanguageRubric, candidates: Candidate[], opts: SystemOptions = {}): Ranking {
  const known = new Set(rubric.criteria.map((c) => c.id));
  for (const id of [...Object.keys(opts.weights ?? {}), ...Object.keys(opts.must ?? {})])
    if (!known.has(id)) throw new RangeError(`the rubric has no criterion ${id}`);
  const weights = Object.fromEntries(rubric.criteria.map((c) => [c.id, opts.weights?.[c.id] ?? c.weight]));
  const counted = rubric.criteria.filter((c) => weights[c.id] > 0);
  const sum = counted.reduce((s, c) => s + weights[c.id], 0);
  if (sum <= 0) throw new RangeError("every criterion is weighted 0, so nothing can be scored");

  const results: Scored[] = candidates.map((cand) => {
    for (const [id, s] of Object.entries(cand.scores)) {
      if (!known.has(id)) throw new RangeError(`${cand.id} scores ${id}, which the rubric has no criterion for`);
      if (!Number.isInteger(s) || s < 0 || s > MAX) throw new RangeError(`${cand.id} scores ${s} on ${id}; scores are whole numbers from 0 to ${MAX}`);
    }
    const base = { id: cand.id, language: cand.language };
    const parts: Part[] = counted.flatMap((c) => {
      const score = cand.scores[c.id];
      return score === undefined ? [] : [{ criterion: c.id, weight: weights[c.id], score, contribution: (weights[c.id] * score) / MAX / sum }];
    });
    const short: Shortfall[] = [];
    for (const c of rubric.criteria) {
      const score = cand.scores[c.id];
      if (score === undefined) continue;
      if (c.gate && score === 0) short.push({ criterion: c.id, score, needs: 1, why: "gate" });
      const need = opts.must?.[c.id];
      if (need !== undefined && score < need) short.push({ criterion: c.id, score, needs: need, why: "must" });
    }
    if (short.length) return { ...base, status: "ruled-out", ruled_out: short, parts };
    const unscored = counted.filter((c) => cand.scores[c.id] === undefined).map((c) => c.id);
    if (unscored.length) return { ...base, status: "incomplete", unscored, parts };
    const total = parts.reduce((s, p) => s + p.contribution, 0);
    return { ...base, status: "ranked", total, rank: 0, tied: false, parts };
  });

  const ranked = results.filter((r) => r.status === "ranked").sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  // Tied: within the band of the leader, when at least one other candidate is too.
  const near = (r: { total: number }) => ranked[0].total - r.total <= rubric.tie_band + 1e-12;
  const band = ranked.filter(near).length;
  ranked.forEach((r, i) => { r.rank = i + 1; r.tied = band > 1 && near(r); });
  const rest = results.filter((r) => r.status !== "ranked");
  return { decides: "person", note: NOTE, tie_band: rubric.tie_band, weights, results: [...ranked, ...rest] };
}
