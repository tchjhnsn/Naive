// Tests scoreLanguages (EE-189) on the rubric Naive ships and its worked examples, and on small candidates whose
// expected totals are worked out by hand from the rubric's rule: sum of weight times score over 4, over the weights.
//
//   node packages/naive/src/engine/language-rubric-test.ts

import { readFileSync } from "node:fs";
import type { LanguageRubric } from "../records/types/records.d.ts";
import { scoreLanguages, type Candidate } from "./language-rubric.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const rubric = JSON.parse(readFileSync(`${repo}packages/naive/src/functions/it/language-rubric.json`, "utf8")) as LanguageRubric;
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const close = (a: number | undefined, b: number) => a !== undefined && Math.abs(a - b) < 1e-9;
const example = (id: string) => {
  const e = rubric.examples.find((x) => x.id === id);
  if (!e) throw new Error(`no example ${id}`);
  return e;
};
const all = (score: number): Record<string, number> => Object.fromEntries(rubric.criteria.map((c) => [c.id, score]));
const totalOf = (r: ReturnType<typeof scoreLanguages>, id: string) => {
  const s = r.results.find((x) => x.id === id);
  return s?.status === "ranked" ? s.total : undefined;
};

// The worked example: Naive's framework.
const fw = example("naive-framework");
const fr = scoreLanguages(rubric, fw.candidates, { weights: fw.weights, must: fw.must });
t("framework: TypeScript on Effect ranks first, as EE-087, EE-125 and EE-159 chose", fr.results[0]?.id === "typescript-effect" && fr.results[0].status === "ranked" && fr.results[0].rank === 1, fr.results);
// 0.15*3 + 0.15*2 + 0.1*4 + 0.1*4 + 0.15*4 + 0.15*4 + 0.1*3 + 0.1*4 = 3.45, over 4 = 0.8625
t("framework: TypeScript on Effect totals 0.8625", close(totalOf(fr, "typescript-effect"), 0.8625), fr.results[0]);
// 0.15*4 + 0.15*1 + 0.1*1 + 0.1*4 + 0.15*3 + 0.15*4 + 0.1*4 + 0.1*4 = 3.10, over 4 = 0.775
t("framework: JavaScript totals 0.775 and is not tied (0.0875 apart, band 0.05)", close(totalOf(fr, "javascript"), 0.775) && fr.results.every((r) => r.status !== "ranked" || !r.tied), fr.results);
t("framework: the result says a person decides and names no winner", fr.decides === "person" && /a person decides/.test(fr.note) && !("winner" in fr));

// The worked example: Naive's proofs, with a must-have of 4 on correctness and the effect model weighted 0.
const pr = example("naive-proofs");
const prr = scoreLanguages(rubric, pr.candidates, { weights: pr.weights, must: pr.must });
const ts = prr.results.find((r) => r.id === "typescript");
t("proofs: TypeScript is ruled out by the correctness must-have, whatever its other scores", ts?.status === "ruled-out" && ts.ruled_out.some((f) => f.criterion === "correctness" && f.why === "must" && f.needs === 4), ts);
t("proofs: Lean 4 is the only ranked candidate", prr.results.filter((r) => r.status === "ranked").map((r) => r.id).join() === "lean-4", prr.results);
// (0.15*4 + 0.15*4 + 0.1*3 + 0.15*2 + 0.15*3 + 0.1*3 + 0.1*4) / 4 / 0.9 = 2.95 / 3.6
t("proofs: a weight of 0 leaves the effect model out, so Lean 4 is not incomplete without it", close(totalOf(prr, "lean-4"), 2.95 / 3.6) && prr.weights["effects-and-concurrency"] === 0, prr.results);

// Gates, ties, incomplete candidates and bad input.
const perfect: Candidate = { id: "perfect", language: "P", scores: all(4) };
const gated: Candidate = { id: "gated", language: "G", scores: { ...all(4), licence: 0 } };
const g = scoreLanguages(rubric, [perfect, gated]);
const gr = g.results.find((r) => r.id === "gated");
t("a 0 on a gate criterion rules a candidate out even with 4 everywhere else", gr?.status === "ruled-out" && gr.ruled_out[0].why === "gate" && gr.ruled_out[0].criterion === "licence", gr);
t("a 0 on a criterion that is not a gate only lowers the total", close(totalOf(scoreLanguages(rubric, [{ id: "x", language: "X", scores: { ...all(4), ecosystem: 0 } }]), "x"), 0.9));
const near: Candidate = { id: "near", language: "N", scores: { ...all(4), ecosystem: 2 } }; // 1 - 0.1*2/4 = 0.95
const tie = scoreLanguages(rubric, [perfect, near, { id: "far", language: "F", scores: all(2) }]);
t("totals within the tie band of the leader are tied, and one below the band is not", tie.results.map((r) => (r.status === "ranked" ? `${r.id}:${r.tied}` : r.id)).join() === "perfect:true,near:true,far:false", tie.results);
const partial = scoreLanguages(rubric, [{ id: "partial", language: "Q", scores: { "runtime-fit": 4 } }]).results[0];
t("a candidate that leaves weighted criteria unscored is incomplete, not ranked", partial.status === "incomplete" && partial.unscored.length === rubric.criteria.length - 1, partial);
const threw = (f: () => unknown) => { try { f(); return null; } catch (e) { return e; } };
t("a score outside 0 to 4 is refused", threw(() => scoreLanguages(rubric, [{ id: "y", language: "Y", scores: { ...all(4), licence: 5 } }])) instanceof RangeError);
t("a criterion the rubric lacks is refused", threw(() => scoreLanguages(rubric, [{ id: "z", language: "Z", scores: { speed: 4 } }])) instanceof RangeError && threw(() => scoreLanguages(rubric, [perfect], { must: { speed: 2 } })) instanceof RangeError);

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("language rubric: all passed");
