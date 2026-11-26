// Ranks candidate tools for one activity on the visibility rubric (EE-222,
// packages/naive/src/functions/it/visibility-rubric.json). It is pure: no I/O, no model.
//
// A candidate is ruled out when it scores 0 on a gate criterion or below a must-have the venture sets, and no
// weighted sum buys that back (the tool-selection skill's principle 5). Every other candidate scored on each
// weighted criterion gets a total from 0 to 1: the sum of weight times score over 4, divided by the sum of the
// weights. A criterion whose weight is 0 is left out. Totals within the rubric's tie band of the leader are reported
// as tied.
//
// A candidate scored 0 on a criterion marked blind_spot leaves the activity unrecorded. It is flagged
// (`blind_spot`), reported on its own in `blind_spots`, and still ranked unless a gate or a must-have ruled it out:
// only a person rules a tool out. A score never decides: the result says a person decides, and names no winner.
//
// channelOf reads the channel from the words of an activity's statement or of APQC's name for it, the same way an
// activity's kind is read (EE-179, activity-kinds.ts): the first word is its verb and the rest are its terms. It is
// an unvalidated prior and it can be wrong, because it reads words and nothing else.
import type { VisibilityRubric } from "../records/types/records.d.ts";

export type Criterion = VisibilityRubric["criteria"][number];
export type Channel = VisibilityRubric["channels"][number];
export type ToolKind = VisibilityRubric["tool_kinds"][number];
export type Candidate = Pick<ToolKind, "id" | "kind" | "scores">;
/** What a venture sets for one activity: weights that replace the defaults, and the lowest score a criterion needs. */
export type Options = { weights?: Record<string, number>; must?: Record<string, number> };
export type Part = { criterion: string; weight: number; score: number; contribution: number };
export type Shortfall = { criterion: string; score: number; needs: number; why: "gate" | "must" };
/** `blind_spot` is true when the candidate scores 0 on a criterion marked blind_spot, whatever its status. */
export type Scored = { id: string; kind: string; blind_spot: boolean; parts: Part[] } & (
  | { status: "ranked"; total: number; rank: number; tied: boolean }
  | { status: "ruled-out"; ruled_out: Shortfall[] }
  | { status: "incomplete"; unscored: string[] }
);
export type Ranking = {
  decides: "person";
  note: string;
  tie_band: number;
  weights: Record<string, number>;
  results: Scored[];
  /** The candidates that leave the activity unrecorded, by id. */
  blind_spots: string[];
};

export const NOTE = "A score never decides: a person decides. The weights are unvalidated priors, and each score is a prior for a kind of tool, not a measurement of any product.";
const MAX = 4;

/** Ranks the candidates for one activity. Throws a RangeError on a score outside 0 to 4, a criterion the rubric lacks, or weights that are all 0. */
export function scoreTools(rubric: VisibilityRubric, candidates: readonly Candidate[], opts: Options = {}): Ranking {
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
    // A blind spot is read from every criterion marked blind_spot, weighted or not: a weight of 0 hides the points, never the gap.
    const blind_spot = rubric.criteria.some((c) => c.blind_spot && cand.scores[c.id] === 0);
    const base = { id: cand.id, kind: cand.kind, blind_spot };
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

  const ranked = results.filter((r): r is Scored & { status: "ranked"; total: number; rank: number; tied: boolean } => r.status === "ranked")
    .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id));
  // Tied: within the band of the leader, when at least one other candidate is too.
  const near = (r: { total: number }) => ranked[0].total - r.total <= rubric.tie_band + 1e-12;
  const band = ranked.filter(near).length;
  ranked.forEach((r, i) => { r.rank = i + 1; r.tied = band > 1 && near(r); });
  const rest = results.filter((r) => r.status !== "ranked");
  const out = [...ranked, ...rest];
  return { decides: "person", note: NOTE, tie_band: rubric.tie_band, weights, results: out, blind_spots: out.filter((r) => r.blind_spot).map((r) => r.id) };
}

/** A statement's words in lower case: the first is its verb and the rest are its terms. Pure, as activity-kinds.ts reads them. */
export const wordsOf = (statement: string): string[] => statement.toLowerCase().split(/[^a-z]+/).filter(Boolean);

/**
 * The channel an activity is performed on: the first channel with a clause its statement meets, else the channel
 * marked default, else null. Pure.
 */
export function channelOf(rubric: VisibilityRubric, statement: string): Channel | null {
  const [verb, ...terms] = wordsOf(statement);
  const fallback = rubric.channels.find((c) => c.default) ?? null;
  if (!verb) return fallback;
  return rubric.channels.find((c) => (c.when ?? []).some((w) => (!w.verbs || w.verbs.includes(verb)) && (!w.terms || terms.some((t) => w.terms?.includes(t))))) ?? fallback;
}

/** The tool kinds a channel names, in the channel's order, skipping an id the rubric's tool kinds lack. Pure. */
export const candidatesFor = (rubric: VisibilityRubric, channel: Channel): ToolKind[] =>
  channel.tool_kinds.flatMap((id) => { const k = rubric.tool_kinds.find((t) => t.id === id); return k ? [k] : []; });

/**
 * What is wrong with the channels beyond their schema: a channel listed twice, a clause an earlier channel's
 * verb-only clause already covers, no default channel or more than one, and a default channel with clauses. Pure.
 */
export function channelProblems(channels: readonly Channel[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const verbOnly = new Map<string, string>();
  for (const c of channels) {
    if (seen.has(c.id)) out.push(`channel ${c.id} is listed twice`);
    seen.add(c.id);
    if (c.default && c.when?.length) out.push(`channel ${c.id} is the default and also names clauses: the default takes an activity whose words meet none`);
    if (!c.default && !c.when?.length) out.push(`channel ${c.id} names no clauses and is not the default, so no activity can reach it`);
    for (const w of c.when ?? []) {
      for (const v of w.verbs ?? []) {
        const first = verbOnly.get(v);
        if (first !== undefined) out.push(`channel ${c.id} names the verb ${v}, which channel ${first} already takes with no terms, so the clause can never apply`);
      }
      if (!w.terms) for (const v of w.verbs ?? []) if (!verbOnly.has(v)) verbOnly.set(v, c.id);
    }
  }
  const defaults = channels.filter((c) => c.default).map((c) => c.id);
  if (!defaults.length) out.push("no channel is the default, so an activity whose words meet no clause has none");
  else if (defaults.length > 1) out.push(`channels ${defaults.join(", ")} are all marked default; exactly one is`);
  return out;
}
