// Breaks check-activities on copies (EE-164). Each case copies the activity catalog and the files it refers to into a
// small EE_ROOT, adds one valid rated activity (the shipped catalog has none yet), breaks one rule, and expects the
// check to name it. The repository passes, and so does the copy with the valid activity.
//
//   node packages/naive/src/checks/check-activities-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { ActivityCatalog } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-activities.ts");
const CATALOG = "packages/naive/src/functions/activities.json";
const LAYERS = "packages/naive/src/records/layers";
const REFERENCES = readdirSync(join(repo, LAYERS)).map((l) => `${LAYERS}/${l}/references/references.json`).filter((f) => existsSync(join(repo, f)));
const COPIED = [CATALOG, "packages/naive/src/functions/tools.json", ...REFERENCES];
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-activities-test-"));
const run = (env: Record<string, string> = {}, args: string[] = []) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { status: r.status, out: r.stdout + r.stderr };
};
const original = JSON.parse(readFileSync(join(repo, CATALOG), "utf8")) as ActivityCatalog;
type Activity = ActivityCatalog["activities"][number];
const valid: Activity = {
  id: "interview-customers",
  process_group: "3.1",
  process: "3.1.1",
  statement: "Interview prospective customers to learn how they solve the problem today and what it costs them.",
  scope: { kind: "cross-industry" },
  source: { ref: "onet-online", locator: "example", changed: true },
  ratings: { "cognitive-complexity": 2.5, verification: 3, importance: 4, share: 80, frequency: 4 },
  rated: { by: "check-activities-test", on: "2026-11-25", basis: "a fixture for this test" },
};

let n = 0;
/** A copy of the repository's files with the catalog holding the valid activity, then changed, run through the check. */
function broken(change: (_c: ActivityCatalog) => void) {
  const root = join(tmp, `r-${++n}`);
  for (const f of COPIED) { mkdirSync(dirname(join(root, f)), { recursive: true }); cpSync(join(repo, f), join(root, f)); }
  const c = structuredClone(original); c.activities.push(structuredClone(valid)); change(c);
  writeFileSync(join(root, CATALOG), JSON.stringify(c, null, 2) + "\n");
  return run({ EE_ROOT: root });
}
const first = (c: ActivityCatalog) => c.activities[0];
const scale = (c: ActivityCatalog, id: string) => {
  const x = c.scales.find((y) => y.id === id);
  if (!x) throw new Error(`no scale ${id} in the catalog`);
  return x;
};
const fails = (name: string, change: (_c: ActivityCatalog) => void, says: RegExp) => {
  const r = broken(change);
  t(name, r.status === 1 && says.test(r.out), r);
};

const clean = run();
t("the repository's catalog passes", clean.status === 0, clean);
const withValid = broken(() => {});
t("a copy with one valid rated activity passes", withValid.status === 0 && /1 activities \(1 rated\) in 1 process groups of 1 functions/.test(withValid.out), withValid);

fails("an unknown field fails the schema", (c) => { Object.assign(first(c), { owner: "someone" }); }, /additional|owner/i);
fails("ratings with no rated fail the schema", (c) => { delete first(c).rated; }, /'rated' is a dependency of 'ratings'/);
fails("a statement that starts lower case fails the schema", (c) => { first(c).statement = "interview customers about the problem."; }, /statement: .*does not match/);
fails("a NAICS code of one digit fails the schema", (c) => { first(c).scope = { kind: "industry", naics: "5" }; }, /scope: .* is not valid under any of the given schemas/);
fails("an industry scope with no NAICS code fails the schema", (c) => { Object.assign(first(c), { scope: { kind: "industry" } }); }, /scope: .* is not valid under any of the given schemas/);
fails("a scale listed twice", (c) => { c.scales.push(structuredClone(scale(c, "importance"))); }, /scale importance is listed twice/);
fails("an activity listed twice", (c) => { c.activities.push({ ...structuredClone(valid), statement: "Survey prospective customers about the problem." }); }, /activity interview-customers is listed twice/);
fails("a statement repeated in one process group and scope", (c) => { c.activities.push({ ...structuredClone(valid), id: "interview-buyers" }); }, /activity interview-buyers repeats a statement already in process group 3\.1 \(cross-industry\)/);
t("the same statement in another scope passes", broken((c) => { c.activities.push({ ...structuredClone(valid), id: "interview-retail-buyers", scope: { kind: "industry", naics: "44" } }); }).status === 0);
fails("a process group not in the tool catalog", (c) => { first(c).process_group = "3.9"; delete first(c).process; }, /names process group 3\.9, which is not in packages\/naive\/src\/functions\/tools\.json/);
fails("a process under another process group", (c) => { first(c).process = "3.2.1"; }, /names process 3\.2\.1, which is not under its process group 3\.1/);
fails("a statement over 30 words", (c) => { first(c).statement = `Interview ${"prospective ".repeat(30)}customers.`; }, /statement has 32 words; a task statement has at most 30/);
fails("a statement of two sentences", (c) => { first(c).statement = "Interview prospective customers. Record what they say."; }, /statement is more than one sentence/);
fails("a statement that starts with an article", (c) => { first(c).statement = "The customers are interviewed about the problem."; }, /statement starts with "The"/);
fails("a rating on a scale the catalog does not list", (c) => { c.scales = c.scales.filter((s) => s.id !== "frequency"); }, /rates frequency, which is not a scale in the catalog/);
fails("a rating above its scale's range", (c) => { first(c).ratings = { ...first(c).ratings, importance: 6 }; }, /rates importance 6, outside the scale's range \[1, 5\]/);
fails("a rating below its scale's range, read from the scales data", (c) => { scale(c, "share").range = [90, 100]; }, /rates share 80, outside the scale's range \[90, 100\]/);
fails("a scale whose range does not rise", (c) => { scale(c, "frequency").range = [7, 1]; }, /scale frequency has range \[7, 1\], whose lowest value is not below its highest/);
fails("a scale source that is not a reference id", (c) => { scale(c, "importance").source = "made-up-source"; }, /scale importance cites made-up-source, which is not a reference id/);
fails("an activity source that is not a reference id", (c) => { first(c).source = { ref: "made-up-source" }; }, /activity interview-customers cites made-up-source, which is not a reference id/);

const j = run({}, ["--json"]);
const parsed = (() => { try { return JSON.parse(j.out) as { ok: boolean; coverage: { function: string; process_groups: unknown[] }[] }; } catch { return null; } })();
t("--json gives counts for each of the 13 functions and their process groups", j.status === 0 && parsed?.ok === true && parsed.coverage.length === 13 && parsed.coverage.every((x) => x.process_groups.length > 0), j.out.slice(0, 300));

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("check-activities: every rule fails on a copy that breaks it");
