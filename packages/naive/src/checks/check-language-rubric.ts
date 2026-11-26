// Checks the language rubric, packages/naive/src/functions/it/language-rubric.json (EE-189), and ranks its worked
// examples with scoreLanguages (packages/naive/src/engine/language-rubric.ts).
//
//   node packages/naive/src/checks/check-language-rubric.ts [--json]
//
// It fails when:
//   - the rubric does not match language-rubric.schema.json;
//   - a criterion, an example or a candidate in one example is listed twice, or a criterion repeats a level;
//   - a criterion does not describe scores 0 and 4;
//   - the criteria's default weights do not sum to 1;
//   - a source is not a reference id in the operations layer's references.json, or a decision is not an EE id in
//     docs/decisions/decisions.json;
//   - an example's weights, must-haves, scores or reasons name a criterion the rubric lacks, a candidate scores a
//     criterion with no reason or gives a reason with no score, or its chosen candidate is not one of its candidates;
//   - an example cannot be ranked: a candidate leaves a weighted criterion unscored.
// It never fails because the top score differs from the chosen candidate: a person decides. The output says, for each
// example, the ranking, whether the person's choice was the top score, and that a person decides.
//
// It reads files through VentureFs (EE-125). Findings exit 1; a file that cannot be read exits 2.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { validateValue } from "../records/validate.ts";
import { NOTE, scoreLanguages, type Ranking } from "../engine/language-rubric.ts";
import type { LanguageRubric } from "../records/types/records.d.ts";

// EE_ROOT points the check at another copy of the repository (used by check-language-rubric-test.ts).
const root = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
export const RUBRIC = "packages/naive/src/functions/it/language-rubric.json";
export const REFERENCES = "packages/naive/src/records/layers/operations/references/references.json";
export const DECISIONS = "docs/decisions/decisions.json";

export type Known = { references: Set<string>; decisions: Set<string> };
export type ExampleRanking = { example: string; chosen: string; top: string | null; ranking: Ranking };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const ids = (v: unknown, key: string): Set<string> =>
  new Set(isObject(v) && Array.isArray(v[key]) ? v[key].flatMap((x: unknown) => (isObject(x) && typeof x.id === "string" ? [x.id] : [])) : []);

/** Every finding for a rubric that already matches its schema. Pure, so the test can call it on copies. */
export function rubricErrors(r: LanguageRubric, known: Known): string[] {
  const out: string[] = [];
  const twice = (what: string, xs: string[]) => {
    const seen = new Set<string>();
    for (const x of xs) { if (seen.has(x)) out.push(`${what} ${x} is listed twice`); seen.add(x); }
  };
  twice("criterion", r.criteria.map((c) => c.id));
  twice("example", r.examples.map((e) => e.id));
  const criteria = new Set(r.criteria.map((c) => c.id));
  for (const c of r.criteria) {
    const scores = c.levels.map((l) => l.score);
    twice(`criterion ${c.id} level`, scores.map(String));
    for (const s of [0, 4]) if (!scores.includes(s)) out.push(`criterion ${c.id} does not say what a score of ${s} means`);
    for (const s of c.sources) if (!known.references.has(s)) out.push(`criterion ${c.id} cites ${s}, which is not a reference id in ${REFERENCES}`);
    for (const d of c.decisions ?? []) if (!known.decisions.has(d)) out.push(`criterion ${c.id} cites ${d}, which is not in ${DECISIONS}`);
  }
  const sum = r.criteria.reduce((s, c) => s + c.weight, 0);
  if (Math.abs(sum - 1) > 1e-9) out.push(`the criteria's weights sum to ${Number(sum.toFixed(6))}, not 1`);

  for (const e of r.examples) {
    const at = `example ${e.id}`;
    twice(`${at} candidate`, e.candidates.map((c) => c.id));
    for (const [field, map] of [["weights", e.weights ?? {}], ["must", e.must ?? {}]] as const)
      for (const id of Object.keys(map)) if (!criteria.has(id)) out.push(`${at} ${field} names ${id}, which is not a criterion`);
    for (const d of e.decided_by) if (!known.decisions.has(d)) out.push(`${at} is decided by ${d}, which is not in ${DECISIONS}`);
    if (!e.candidates.some((c) => c.id === e.chosen)) out.push(`${at} chose ${e.chosen}, which is not one of its candidates`);
    for (const c of e.candidates) {
      for (const id of Object.keys(c.scores)) {
        if (!criteria.has(id)) out.push(`${at} candidate ${c.id} scores ${id}, which is not a criterion`);
        else if (!c.why[id]) out.push(`${at} candidate ${c.id} scores ${id} with no reason`);
      }
      for (const id of Object.keys(c.why)) if (c.scores[id] === undefined) out.push(`${at} candidate ${c.id} gives a reason for ${id} with no score`);
    }
  }
  return out;
}

/** Ranks each worked example. Call it only on a rubric with no findings. */
export const rankExamples = (r: LanguageRubric): ExampleRanking[] =>
  r.examples.map((e) => {
    const ranking = scoreLanguages(r, e.candidates, { weights: e.weights, must: e.must });
    const first = ranking.results[0];
    return { example: e.id, chosen: e.chosen, top: first?.status === "ranked" ? first.id : null, ranking };
  });

const read = (file: string) => readJson(join(root, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

/** Reads the rubric and what it cites, checks it and ranks its examples. */
export const checkLanguageRubric = Effect.gen(function* () {
  const raw = yield* read(RUBRIC);
  const known = { references: ids(yield* read(REFERENCES), "references"), decisions: ids(yield* read(DECISIONS), "decisions") };
  const v = validateValue("language-rubric.schema.json", raw);
  if (v.status !== 0) {
    const errors = (v.stdout + v.stderr).trim().split("\n").filter((l: string) => l && !/checked against/.test(l));
    return { errors: errors.map((e) => `${RUBRIC}: ${e}`), examples: [] };
  }
  const rubric = raw as LanguageRubric;
  const errors = rubricErrors(rubric, known);
  if (errors.length) return { errors: errors.map((e) => `${RUBRIC}: ${e}`), examples: [] };
  const examples = rankExamples(rubric);
  const incomplete = examples.flatMap((x) => x.ranking.results.flatMap((s) => (s.status === "incomplete" ? [`${RUBRIC}: example ${x.example} candidate ${s.id} leaves ${s.unscored.join(", ")} unscored`] : [])));
  return { errors: incomplete, examples };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const json = process.argv.includes("--json");
  await runMain(Effect.map(checkLanguageRubric, ({ errors, examples }) => {
    if (json) console.log(JSON.stringify({ ok: !errors.length, errors, examples }, null, 2));
    if (errors.length) { if (!json) for (const e of errors) console.error(`FAIL  ${e}`); process.exitCode = 1; return; }
    if (json) return;
    for (const x of examples) {
      console.log(`${x.example}:`);
      for (const s of x.ranking.results) {
        const what = s.status === "ranked" ? `${s.total.toFixed(3)}${s.tied ? " (tied)" : ""}` : s.status === "ruled-out" ? `ruled out: ${s.ruled_out.map((f) => `${f.criterion} ${f.score} < ${f.needs} (${f.why})`).join(", ")}` : s.status;
        console.log(`  ${s.id.padEnd(20)} ${what}`);
      }
      console.log(`  chosen by a person: ${x.chosen}${x.top === x.chosen ? " (the top score)" : x.top ? ` (the top score was ${x.top})` : ""}`);
    }
    console.log(NOTE);
  }));
}
