// Breaks check-language-rubric on copies (EE-189). Each case copies the rubric and the files it cites into a small
// EE_ROOT, breaks one rule, and expects the check to name it. The repository passes.
//
//   node packages/naive/src/checks/check-language-rubric-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { LanguageRubric } from "../records/types/records.d.ts";
import { DECISIONS, REFERENCES, RUBRIC } from "./check-language-rubric.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-language-rubric.ts");
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-language-rubric-test-"));
const run = (env: Record<string, string> = {}, args: string[] = []) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { status: r.status, out: r.stdout + r.stderr };
};
const original = JSON.parse(readFileSync(join(repo, RUBRIC), "utf8")) as LanguageRubric;

let n = 0;
/** A copy of the repository's files with the rubric changed, run through the check. */
function broken(change: (_r: LanguageRubric) => void) {
  const root = join(tmp, `r-${++n}`);
  for (const f of [RUBRIC, REFERENCES, DECISIONS]) { mkdirSync(dirname(join(root, f)), { recursive: true }); cpSync(join(repo, f), join(root, f)); }
  const r = structuredClone(original); change(r);
  writeFileSync(join(root, RUBRIC), JSON.stringify(r, null, 2) + "\n");
  return run({ EE_ROOT: root });
}
const criterion = (r: LanguageRubric, id: string) => {
  const c = r.criteria.find((x) => x.id === id);
  if (!c) throw new Error(`no criterion ${id}`);
  return c;
};
const fails = (name: string, change: (_r: LanguageRubric) => void, says: RegExp) => {
  const r = broken(change);
  t(name, r.status === 1 && says.test(r.out), r);
};

const ok = run();
t("the repository's rubric passes and ranks both worked examples", ok.status === 0 && /naive-framework:/.test(ok.out) && /naive-proofs:/.test(ok.out) && /a person decides/.test(ok.out), ok);
const json = JSON.parse(run({}, ["--json"]).out) as { ok: boolean; examples: { example: string; chosen: string; top: string | null }[] };
t("--json gives each example's choice beside its top score", json.ok && json.examples.every((x) => x.top === x.chosen), json);

fails("weights that do not sum to 1", (r) => { criterion(r, "licence").weight = 0.2; }, /weights sum to 1\.1, not 1/);
fails("a criterion listed twice", (r) => { r.criteria.push(structuredClone(criterion(r, "licence"))); r.criteria.forEach((c) => { c.weight = 1 / r.criteria.length; }); }, /criterion licence is listed twice/);
fails("a criterion that does not describe a score of 4", (r) => { const c = criterion(r, "ecosystem"); c.levels = c.levels.filter((l) => l.score !== 4); }, /ecosystem does not say what a score of 4 means/);
fails("a source that is not a reference id", (r) => { criterion(r, "licence").sources = ["no-such-reference"]; }, /cites no-such-reference, which is not a reference id/);
fails("a decision that is not in the log", (r) => { criterion(r, "team-skill").decisions = ["EE-999"]; }, /cites EE-999, which is not in/);
fails("an example whose choice is not a candidate", (r) => { r.examples[0].chosen = "cobol"; }, /chose cobol, which is not one of its candidates/);
fails("a score on a criterion the rubric lacks", (r) => { r.examples[0].candidates[0].scores.speed = 3; r.examples[0].candidates[0].why.speed = "fast"; }, /scores speed, which is not a criterion/);
fails("a score with no reason", (r) => { delete r.examples[0].candidates[0].why.licence; }, /scores licence with no reason/);
fails("a must-have on a criterion the rubric lacks", (r) => { r.examples[1].must = { speed: 3 }; }, /must names speed, which is not a criterion/);
fails("a candidate that leaves a weighted criterion unscored", (r) => { const c = r.examples[0].candidates[1]; delete c.scores.ecosystem; delete c.why.ecosystem; }, /candidate javascript leaves ecosystem unscored/);
fails("a score outside the scale fails the schema", (r) => { r.examples[0].candidates[0].scores.licence = 5; }, /language-rubric\.json/);
const disagree = broken((r) => { r.examples[0].chosen = "javascript"; });
t("a person's choice that is not the top score passes and is reported", disagree.status === 0 && /chosen by a person: javascript \(the top score was typescript-effect\)/.test(disagree.out), disagree);

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("check-language-rubric: all passed");
