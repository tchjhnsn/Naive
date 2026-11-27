// Breaks check-visibility-rubric on copies (EE-222). Each case copies the rubric and the files it cites into a small
// EE_ROOT, breaks one rule, and expects the check to name it. The repository passes.
//
//   node packages/naive/src/checks/check-visibility-rubric-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { VisibilityRubric } from "../records/types/records.d.ts";
import { DECISIONS, REFERENCES, RUBRIC } from "./check-visibility-rubric.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-visibility-rubric.ts");
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-visibility-rubric-test-"));
const run = (env: Record<string, string> = {}, args: string[] = []) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { status: r.status, out: r.stdout + r.stderr };
};
const original = JSON.parse(readFileSync(join(repo, RUBRIC), "utf8")) as VisibilityRubric;

let n = 0;
/** A copy of the repository's files with the rubric changed, run through the check. */
function broken(change: (_r: VisibilityRubric) => void) {
  const root = join(tmp, `r-${++n}`);
  for (const f of [RUBRIC, REFERENCES, DECISIONS]) { mkdirSync(dirname(join(root, f)), { recursive: true }); cpSync(join(repo, f), join(root, f)); }
  const r = structuredClone(original); change(r);
  writeFileSync(join(root, RUBRIC), JSON.stringify(r, null, 2) + "\n");
  return run({ EE_ROOT: root });
}
const criterion = (r: VisibilityRubric, id: string) => {
  const c = r.criteria.find((x) => x.id === id);
  if (!c) throw new Error(`no criterion ${id}`);
  return c;
};
const kind = (r: VisibilityRubric, id: string) => {
  const k = r.tool_kinds.find((x) => x.id === id);
  if (!k) throw new Error(`no tool kind ${id}`);
  return k;
};
const channel = (r: VisibilityRubric, id: string) => {
  const c = r.channels.find((x) => x.id === id);
  if (!c) throw new Error(`no channel ${id}`);
  return c;
};
const fails = (name: string, change: (_r: VisibilityRubric) => void, says: RegExp) => {
  const r = broken(change);
  t(name, r.status === 1 && says.test(r.out), r);
};

const ok = run();
t("the repository's rubric passes and ranks every worked example", ok.status === 0 && /goal-setting-meetings \(conversation\):/.test(ok.out) && /strategy-documents \(document\):/.test(ok.out) && /a person decides/.test(ok.out), ok);
t("the blind spot is named in the output", /plain-meeting-tool.*BLIND SPOT/.test(ok.out), ok);
const json = JSON.parse(run({}, ["--json"]).out) as { ok: boolean; examples: { example: string; chosen: string; top: string | null; blind_spots: string[] }[] };
t("--json gives each example's choice beside its top score and its blind spots", json.ok && json.examples.every((x) => x.top === x.chosen) && json.examples[0].blind_spots.join() === "plain-meeting-tool", json);

fails("weights that do not sum to 1", (r) => { criterion(r, "events").weight = 0.2; }, /weights sum to 1\.05, not 1/);
fails("a criterion listed twice", (r) => { r.criteria.push(structuredClone(criterion(r, "events"))); r.criteria.forEach((c) => { c.weight = 1 / r.criteria.length; }); }, /criterion events is listed twice/);
fails("a criterion that does not describe a score of 4", (r) => { const c = criterion(r, "ownership"); c.levels = c.levels.filter((l) => l.score !== 4); }, /ownership does not say what a score of 4 means/);
fails("a source that is not a reference id", (r) => { criterion(r, "events").sources = ["no-such-reference"]; }, /cites no-such-reference, which is not a reference id/);
fails("a decision that is not in the log", (r) => { criterion(r, "ownership").decisions = ["EE-999"]; }, /cites EE-999, which is not in/);
fails("no default channel", (r) => { delete channel(r, "work-in-a-tool").default; }, /names no clauses and is not the default/);
fails("a channel that names a tool kind the rubric lacks", (r) => { channel(r, "decision").tool_kinds.push("ouija-board"); }, /names tool kind ouija-board, which the rubric lacks/);
fails("a channel that names a tool kind which does not capture it", (r) => { channel(r, "decision").tool_kinds.push("ledger-with-events"); }, /names tool kind ledger-with-events, which does not say it captures decision/);
fails("a tool kind no channel names", (r) => { r.tool_kinds.push({ ...structuredClone(kind(r, "notes-by-hand")), id: "orphan" }); }, /tool kind orphan is named by no channel/);
fails("a tool kind that captures a channel the rubric lacks", (r) => { kind(r, "notes-by-hand").captures.push("telepathy"); }, /captures telepathy, which is not a channel/);
fails("a tool kind that leaves a weighted criterion unscored", (r) => { const k = kind(r, "notes-by-hand"); delete k.scores.events; delete k.why.events; }, /leaves events unscored, so it cannot be ranked/);
fails("a tool kind score with no reason", (r) => { delete kind(r, "own-record-store").why.ownership; }, /scores ownership with no reason/);
fails("a tool kind reason with no score", (r) => { kind(r, "own-record-store").why.speed = "fast"; }, /gives a reason for speed with no score/);
fails("an example whose choice is not a candidate", (r) => { r.examples[0].chosen = "carrier-pigeon"; }, /chose carrier-pigeon, which is not one of its candidates/);
fails("an example candidate that is not a tool kind", (r) => { r.examples[0].candidates.push("carrier-pigeon"); }, /names candidate carrier-pigeon, which is not a tool kind/);
fails("an example candidate that does not capture its channel", (r) => { r.examples[0].candidates.push("own-telemetry"); }, /names candidate own-telemetry, which does not capture conversation/);
fails("an example on a channel the rubric lacks", (r) => { r.examples[0].channel = "smoke-signal"; }, /names channel smoke-signal, which is not a channel/);
fails("a must-have on a criterion the rubric lacks", (r) => { r.examples[1].must = { speed: 3 }; }, /must names speed, which is not a criterion/);
fails("a score outside the scale fails the schema", (r) => { kind(r, "own-record-store").scores.ownership = 5; }, /visibility-rubric\.json/);

const disagree = broken((r) => { r.examples[1].chosen = "notes-by-hand"; });
t("a person's choice that is not the top score passes and is reported", disagree.status === 0 && /chosen by a person: notes-by-hand \(the top score was message-log-the-system-reads\)/.test(disagree.out), disagree);
const blind = broken((r) => { r.examples[0].candidates = ["plain-meeting-tool"]; r.examples[0].chosen = "plain-meeting-tool"; delete r.examples[0].must; });
t("a blind spot a person chose passes: it is flagged, never ruled out", blind.status === 0 && /plain-meeting-tool.*BLIND SPOT/.test(blind.out), blind);

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("check-visibility-rubric: all passed");
