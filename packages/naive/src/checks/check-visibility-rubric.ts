// Checks the visibility rubric, packages/naive/src/functions/it/visibility-rubric.json (EE-222), and ranks its worked
// examples with scoreTools (packages/naive/src/engine/visibility-rubric.ts).
//
//   node packages/naive/src/checks/check-visibility-rubric.ts [--json]
//
// It fails when:
//   - the rubric does not match visibility-rubric.schema.json;
//   - a criterion, a channel, a tool kind or an example is listed twice, or a criterion repeats a level;
//   - a criterion does not describe scores 0 and 4;
//   - the criteria's default weights do not sum to 1;
//   - a source is not a reference id in the operations layer's references.json, or a decision is not an EE id in
//     docs/decisions/decisions.json;
//   - the channels are wrong as channelProblems reads them: no default channel or more than one, a default channel
//     that also names clauses, a channel that names none and is not the default, or a clause an earlier channel's
//     verb-only clause already covers;
//   - a channel names a tool kind the rubric lacks, or one that does not say it captures that channel; a channel has
//     no tool kind; a tool kind captures a channel the rubric lacks, or no channel names it;
//   - a tool kind or an example names a criterion the rubric lacks, a tool kind scores a criterion with no reason or
//     gives a reason with no score, or leaves a weighted criterion unscored;
//   - an example names a channel the rubric lacks, a candidate that is not a tool kind or does not capture its
//     channel, or a chosen candidate that is not one of its candidates.
// It never fails because the top score differs from the chosen candidate, and never because a candidate is a blind
// spot: a person decides. The output says, for each example, the ranking, the blind spots, whether the person's
// choice was the top score, and that a person decides.
//
// It reads files through VentureFs (EE-125). Findings exit 1; a file that cannot be read exits 2.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { validateValue } from "../records/validate.ts";
import { candidatesFor, channelProblems, NOTE, scoreTools, type Ranking } from "../engine/visibility-rubric.ts";
import type { VisibilityRubric } from "../records/types/records.d.ts";

// EE_ROOT points the check at another copy of the repository (used by check-visibility-rubric-test.ts).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
export const RUBRIC = "packages/naive/src/functions/it/visibility-rubric.json";
export const REFERENCES = "packages/naive/src/records/layers/operations/references/references.json";
export const DECISIONS = "docs/decisions/decisions.json";

export type Known = { references: Set<string>; decisions: Set<string> };
export type ExampleRanking = { example: string; channel: string; chosen: string; top: string | null; blind_spots: string[]; ranking: Ranking };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ids = (v: unknown, key: string): Set<string> =>
  new Set(isObject(v) && Array.isArray(v[key]) ? v[key].flatMap((x: unknown) => (isObject(x) && typeof x.id === "string" ? [x.id] : [])) : []);

/** Every finding for a rubric that already matches its schema. Pure, so the test can call it on copies. */
export function rubricErrors(r: VisibilityRubric, known: Known): string[] {
  const out: string[] = [];
  const twice = (what: string, xs: string[]) => {
    const seen = new Set<string>();
    for (const x of xs) { if (seen.has(x)) out.push(`${what} ${x} is listed twice`); seen.add(x); }
  };
  twice("criterion", r.criteria.map((c) => c.id));
  twice("tool kind", r.tool_kinds.map((t) => t.id));
  twice("example", r.examples.map((e) => e.id));
  const criteria = new Set(r.criteria.map((c) => c.id));
  for (const c of r.criteria) {
    twice(`criterion ${c.id} level`, c.levels.map((l) => String(l.score)));
    for (const s of [0, 4]) if (!c.levels.some((l) => l.score === s)) out.push(`criterion ${c.id} does not say what a score of ${s} means`);
    for (const s of c.sources) if (!known.references.has(s)) out.push(`criterion ${c.id} cites ${s}, which is not a reference id in ${REFERENCES}`);
    for (const d of c.decisions ?? []) if (!known.decisions.has(d)) out.push(`criterion ${c.id} cites ${d}, which is not in ${DECISIONS}`);
  }
  const sum = r.criteria.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(sum - 1) > 1e-9) out.push(`the criteria's weights sum to ${Number(sum.toFixed(6))}, not 1`);

  // The channels and the tool kinds must agree in both directions, so neither side can name the other wrongly.
  out.push(...channelProblems(r.channels));
  const channels = new Set(r.channels.map((c) => c.id));
  const weighted = r.criteria.filter((c) => c.weight > 0).map((c) => c.id);
  const named = new Set<string>();
  for (const c of r.channels) for (const id of c.tool_kinds) {
    named.add(id);
    const kind = r.tool_kinds.find((t) => t.id === id);
    if (!kind) out.push(`channel ${c.id} names tool kind ${id}, which the rubric lacks`);
    else if (!kind.captures.includes(c.id)) out.push(`channel ${c.id} names tool kind ${id}, which does not say it captures ${c.id}`);
  }
  for (const t of r.tool_kinds) {
    const at = `tool kind ${t.id}`;
    if (!named.has(t.id)) out.push(`${at} is named by no channel, so no activity can reach it`);
    for (const ch of t.captures) if (!channels.has(ch)) out.push(`${at} captures ${ch}, which is not a channel`);
    for (const id of Object.keys(t.scores)) {
      if (!criteria.has(id)) out.push(`${at} scores ${id}, which is not a criterion`);
      else if (!t.why[id]) out.push(`${at} scores ${id} with no reason`);
    }
    for (const id of Object.keys(t.why)) if (t.scores[id] === undefined) out.push(`${at} gives a reason for ${id} with no score`);
    for (const id of weighted) if (t.scores[id] === undefined) out.push(`${at} leaves ${id} unscored, so it cannot be ranked`);
  }

  for (const e of r.examples) {
    const at = `example ${e.id}`;
    const channel = r.channels.find((c) => c.id === e.channel);
    if (!channel) out.push(`${at} names channel ${e.channel}, which is not a channel`);
    for (const [field, map] of [["weights", e.weights ?? {}], ["must", e.must ?? {}]] as const)
      for (const id of Object.keys(map)) if (!criteria.has(id)) out.push(`${at} ${field} names ${id}, which is not a criterion`);
    for (const d of e.decided_by) if (!known.decisions.has(d)) out.push(`${at} is decided by ${d}, which is not in ${DECISIONS}`);
    if (!e.candidates.includes(e.chosen)) out.push(`${at} chose ${e.chosen}, which is not one of its candidates`);
    for (const id of e.candidates) {
      const kind = r.tool_kinds.find((t) => t.id === id);
      if (!kind) out.push(`${at} names candidate ${id}, which is not a tool kind`);
      else if (channel && !kind.captures.includes(channel.id)) out.push(`${at} names candidate ${id}, which does not capture ${channel.id}`);
    }
  }
  return out;
}

/** Ranks each worked example. Call it only on a rubric with no findings. */
export const rankExamples = (r: VisibilityRubric): ExampleRanking[] =>
  r.examples.map((e) => {
    const channel = r.channels.find((c) => c.id === e.channel)!;
    const candidates = candidatesFor(r, channel).filter((t) => e.candidates.includes(t.id));
    const ranking = scoreTools(r, candidates, { weights: e.weights, must: e.must });
    const first = ranking.results[0];
    return { example: e.id, channel: e.channel, chosen: e.chosen, top: first?.status === "ranked" ? first.id : null, blind_spots: ranking.blind_spots, ranking };
  });

const read = (file: string) => readJson(join(root, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

/** Reads the rubric and what it cites, checks it and ranks its examples. */
export const checkVisibilityRubric = Effect.gen(function* () {
  const raw = yield* read(RUBRIC);
  const known = { references: ids(yield* read(REFERENCES), "references"), decisions: ids(yield* read(DECISIONS), "decisions") };
  const v = validateValue("visibility-rubric.schema.json", raw);
  if (v.status !== 0) {
    const errors = (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l));
    return { errors: errors.map((e) => `${RUBRIC}: ${e}`), examples: [] };
  }
  const rubric = raw as VisibilityRubric;
  const errors = rubricErrors(rubric, known);
  if (errors.length) return { errors: errors.map((e) => `${RUBRIC}: ${e}`), examples: [] };
  const examples = rankExamples(rubric);
  const incomplete = examples.flatMap((x) => x.ranking.results.flatMap((s) => (s.status === "incomplete" ? [`${RUBRIC}: example ${x.example} candidate ${s.id} leaves ${s.unscored.join(", ")} unscored`] : [])));
  return { errors: incomplete, examples };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const json = process.argv.includes("--json");
  await runMain(Effect.map(checkVisibilityRubric, ({ errors, examples }) => {
    if (json) console.log(JSON.stringify({ ok: !errors.length, errors, examples }, null, 2));
    if (errors.length) { if (!json) for (const e of errors) console.error(`FAIL  ${e}`); process.exitCode = 1; return; }
    if (json) return;
    for (const x of examples) {
      console.log(`${x.example} (${x.channel}):`);
      for (const s of x.ranking.results) {
        const what = s.status === "ranked" ? `${s.total.toFixed(3)}${s.tied ? " (tied)" : ""}` : s.status === "ruled-out" ? `ruled out: ${s.ruled_out.map((f) => `${f.criterion} ${f.score} < ${f.needs} (${f.why})`).join(", ")}` : s.status;
        console.log(`  ${s.id.padEnd(30)} ${what}${s.blind_spot ? "  BLIND SPOT: it leaves the activity unrecorded" : ""}`);
      }
      console.log(`  chosen by a person: ${x.chosen}${x.top === x.chosen ? " (the top score)" : x.top ? ` (the top score was ${x.top})` : ""}`);
    }
    console.log(NOTE);
  }));
}
