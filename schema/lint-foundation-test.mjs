#!/usr/bin/env node
// Foundation lint, through the CLI and the foundation/lint route, on ventures in a temp folder.
// A clean venture is silent. One fixture fires each rule. The config mode sets the exit code.
// A missing or malformed record is skipped and the run still exits. Structured ventures are read
// through ventureFile (k-base/ and meta/), so a decoy at the flat path does not count.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../interface/router.mjs";

const repo = new URL("..", import.meta.url).pathname;
const root = mkdtempSync(join(tmpdir(), "lint-foundation-"));
let failed = 0;
const expect = (name, ok, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};
const cli = (dir, ...args) => spawnSync("node", [join(repo, "schema/lint-foundation.mjs"), dir, ...args], { encoding: "utf8" });
const jsonOf = (r) => { try { return JSON.parse(r.stdout); } catch { return null; } };
const rulesOf = (r) => new Set((jsonOf(r)?.findings ?? []).map((f) => f.rule));

let n = 0;
function venture(extra = {}) {
  const id = `v${n++}`;
  const dir = join(root, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id, name: "Fixture", parent: null, phase: "discovery", owner: "self", status: "active", profile: "profile.md", layers: {}, ...extra }, null, 2) + "\n");
  return dir;
}
const put = (dir, rel, body) => {
  mkdirSync(join(dir, rel, ".."), { recursive: true });
  writeFileSync(join(dir, rel), typeof body === "string" ? body : JSON.stringify(body, null, 2) + "\n");
};

const cleanRecords = () => ({
  core: { promise: "We help early founders decide the next step.", promised_to: "early founders", must_not: "Guess.", competence: "Records." },
});
const icp = (jobs = ["decide the next step"], forms = ["next-step"], extra = {}) => ({
  venture: "fixture",
  profiles: [{ id: "early-founders", who: "People starting a company", short: "early founders", primary: true, jobs, problem_forms: forms, ...extra }],
});
const alignment = (check = "schema/check-nouns.mjs") => ({
  venture: "fixture",
  principles: [{ id: "sourced", statement: "Every default traces to a source", source: "EE-014", check }],
});
/** @param {unknown[]} [forms] */
const problem = (forms = [{ id: "next-step", statement: "The next step is unclear." }]) => ({
  venture: "fixture", statement: "The next step is unclear.", segment: "early founders", evidence: [], forms,
});

// ---- Clean venture: every rule stays silent, exit 0.
{
  const dir = venture(cleanRecords());
  put(dir, "foundation/icp.json", icp());
  put(dir, "foundation/alignment.json", alignment());
  put(dir, "foundation/problem.json", problem());
  const r = cli(dir, "--json");
  const body = jsonOf(r);
  expect("a clean venture exits 0 with no findings", r.status === 0 && body?.ok === true && body.findings.length === 0, r.stdout + r.stderr);
  const route = await call({ venture: dir.split("/").at(-1), workspace: root, route: "foundation/lint", action: "run" });
  expect("foundation/lint on a clean venture returns no findings", route.ok && route.result?.findings?.length === 0, JSON.stringify(route));
}

// ---- One fixture fires each rule.
{
  const dir = venture({ core: { promise: "We help everyone.", promised_to: "", must_not: "", competence: "" } });
  put(dir, "foundation/icp.json", {
    venture: "fixture",
    profiles: [{ id: "mentors", who: "People who advise founders", short: "mentors", primary: true, jobs: [], problem_forms: [] }],
  });
  put(dir, "foundation/alignment.json", {
    venture: "fixture",
    principles: [{ id: "sourced", statement: "Every default traces to a source", source: "EE-014", check: null }],
  });
  put(dir, "foundation/problem.json", problem([{ id: "orphan", statement: "A form nobody claimed." }]));
  const r = cli(dir, "--json");
  const body = jsonOf(r);
  const ids = [...rulesOf(r)].sort();
  expect("the fixture exits 0 while every rule fires", r.status === 0 && body?.ok === true && ids.join(",") === "alignment-no-check,icp-no-jobs,mission-names-no-icp,problem-form-no-icp", r.stdout);
  const by = Object.fromEntries(body.findings.map((f) => [f.rule, f]));
  expect("each finding names its file and the record that broke the rule",
    by["mission-names-no-icp"].file === "venture.json" && /ICP/.test(by["mission-names-no-icp"].message)
    && by["icp-no-jobs"].file === "foundation/icp.json" && /mentors/.test(by["icp-no-jobs"].message)
    && by["alignment-no-check"].file === "foundation/alignment.json" && /sourced/.test(by["alignment-no-check"].message)
    && by["problem-form-no-icp"].file === "foundation/problem.json" && /orphan/.test(by["problem-form-no-icp"].message)
    && body.findings.every((f) => f.mode === "fail-open" && f.suggestion));
  const human = cli(dir);
  expect("a fail-open finding is a warning on the console", human.status === 0 && /WARN\s+\[icp-no-jobs\]/.test(human.stdout));
  put(dir, "naive.config.json", { foundation_lint: { rules: { "icp-no-jobs": { mode: "fail-closed" } } } });
  const mixed = cli(dir, "--json");
  const mixedBody = jsonOf(mixed);
  expect("exit 1 when one of several findings is fail-closed, and the others stay warnings",
    mixed.status === 1 && mixedBody?.ok === false
    && mixedBody.findings.some((f) => f.rule === "icp-no-jobs" && f.mode === "fail-closed")
    && mixedBody.findings.filter((f) => f.rule !== "icp-no-jobs").every((f) => f.mode === "fail-open"),
    mixed.stdout);
}

// ---- The mode override drives the exit code.
{
  const dir = venture({ core: { promise: "We help everyone.", promised_to: "", must_not: "", competence: "" } });
  put(dir, "foundation/icp.json", icp());
  put(dir, "foundation/alignment.json", alignment());
  put(dir, "foundation/problem.json", problem());
  put(dir, "naive.config.json", { foundation_lint: { rules: { "alignment-no-check": { mode: "fail-closed" } } } });
  const silent = cli(dir, "--json");
  expect("a fail-closed rule with no finding still exits 0", silent.status === 0 && jsonOf(silent)?.findings?.length === 1 && jsonOf(silent).findings[0].rule === "mission-names-no-icp", silent.stdout);
  put(dir, "naive.config.json", { foundation_lint: { rules: { "mission-names-no-icp": { mode: "fail-closed" } } } });
  const closed = cli(dir, "--json");
  const closedBody = jsonOf(closed);
  expect("exit 1 when the rule that fired is fail-closed", closed.status === 1 && closedBody?.ok === false && closedBody.findings[0].mode === "fail-closed", closed.stdout);
  const text = cli(dir);
  expect("a fail-closed finding prints FAIL", text.status === 1 && /FAIL\s+\[mission-names-no-icp\]/.test(text.stdout));
  put(dir, "naive.config.json", { foundation_lint: { rules: { "mission-names-no-icp": { mode: "fail-open" }, "icp-no-jobs": { mode: "nope" } } } });
  const open = cli(dir, "--json");
  expect("fail-open, and an unknown mode, keep the default and exit 0", open.status === 0 && jsonOf(open)?.findings?.every((f) => f.mode === "fail-open"), open.stdout);
}

// ---- Missing and malformed records do not crash.
{
  const bare = venture();
  const missing = cli(bare, "--json");
  expect("a venture with no foundation records exits 0 and reports nothing", missing.status === 0 && jsonOf(missing)?.findings?.length === 0, missing.stderr);
  const bad = venture({ core: { promise: "We help early founders.", promised_to: "", must_not: "", competence: "" } });
  put(bad, "foundation/icp.json", "{not json");
  put(bad, "foundation/alignment.json", "[]");
  put(bad, "foundation/problem.json", "\"hello\"");
  put(bad, "naive.config.json", "{not");
  const malformed = cli(bad, "--json");
  expect("malformed records are skipped and the run exits 0", malformed.status === 0 && jsonOf(malformed)?.findings?.length === 0, malformed.stdout + malformed.stderr);
  const holes = venture(cleanRecords());
  put(holes, "foundation/icp.json", icp());
  put(holes, "foundation/alignment.json", { venture: "fixture", principles: [null, { id: "sourced", statement: "Every default traces to a source", source: "EE-014", check: "schema/check-nouns.mjs" }] });
  put(holes, "foundation/problem.json", problem([
    null,
    { id: "next-step", statement: "Kept." },
    { id: "old", statement: "Dropped.", status: "dropped" },
    { statement: "No id." },
  ]));
  const kept = cli(holes, "--json");
  expect("a null principle, a dropped form and a form with no id add no finding", kept.status === 0 && jsonOf(kept)?.findings?.length === 0, kept.stdout);
  const blanks = venture(cleanRecords());
  put(blanks, "foundation/icp.json", icp(["  "]));
  put(blanks, "foundation/alignment.json", alignment("  "));
  put(blanks, "foundation/problem.json", problem());
  const blank = cli(blanks, "--json");
  expect("a blank job and a blank check are findings", rulesOf(blank).has("icp-no-jobs") && rulesOf(blank).has("alignment-no-check") && !rulesOf(blank).has("problem-form-no-icp"), blank.stdout);
}

// ---- Older paths, a profile folder, and a retired profile.
{
  const old = venture(cleanRecords());
  put(old, "purpose/icp.json", icp(["decide the next step"], []));
  put(old, "purpose/alignment.json", alignment(null));
  put(old, "purpose/validation/problem.json", problem([{ id: "next-step", statement: "Unclaimed." }]));
  const r = cli(old, "--json");
  const files = new Set((jsonOf(r)?.findings ?? []).map((f) => `${f.rule}:${f.file}`));
  expect("purpose/ records count when foundation/ has none",
    files.has("alignment-no-check:purpose/alignment.json") && files.has("problem-form-no-icp:purpose/validation/problem.json") && !files.has("icp-no-jobs:purpose/icp.json"),
    [...files].join(" "));
  const folder = venture({ core: { promise: "We help mentors.", promised_to: "", must_not: "", competence: "" } });
  put(folder, "foundation/icp/mentors.json", { id: "mentors", who: "Advisors", short: "mentors", jobs: [] });
  put(folder, "foundation/problem.json", problem([{ id: "advice", statement: "No profile claimed it." }]));
  const fromFolder = cli(folder, "--json");
  expect("a profile file with no jobs fires, and its form is unowned",
    rulesOf(fromFolder).has("icp-no-jobs") && rulesOf(fromFolder).has("problem-form-no-icp") && !rulesOf(fromFolder).has("mission-names-no-icp"),
    fromFolder.stdout);
  const retired = venture(cleanRecords());
  put(retired, "foundation/icp.json", {
    venture: "fixture",
    profiles: [
      { id: "early-founders", who: "People starting a company", short: "early founders", primary: true, jobs: ["decide the next step"], problem_forms: ["next-step"] },
      { id: "old", who: "Gone", short: "old", status: "retired", jobs: [], problem_forms: ["ghost"] },
    ],
  });
  put(retired, "foundation/alignment.json", alignment());
  put(retired, "foundation/problem.json", problem([
    { id: "next-step", statement: "Claimed by the current profile." },
    { id: "ghost", statement: "Only the retired profile claimed it." },
  ]));
  const gone = cli(retired, "--json");
  const goneIds = [...rulesOf(gone)];
  expect("a retired profile is not a current ICP", goneIds.length === 1 && goneIds[0] === "problem-form-no-icp" && /ghost/.test(jsonOf(gone).findings[0].message), gone.stdout);
}

// ---- Inputs come through ventureFile: a structured venture reads k-base/ and meta/.
{
  const dir = venture({ layout: "structured", core: { promise: "We help early founders.", promised_to: "early founders", must_not: "", competence: "" } });
  put(dir, "foundation/icp.json", icp());
  put(dir, "k-base/foundation/icp.json", icp([]));
  put(dir, "k-base/foundation/alignment.json", alignment());
  put(dir, "k-base/foundation/problem.json", problem());
  put(dir, "meta/naive.config.json", { foundation_lint: { rules: { "icp-no-jobs": { mode: "fail-closed" } } } });
  put(dir, "naive.config.json", { foundation_lint: { rules: { "icp-no-jobs": { mode: "fail-open" } } } });
  const r = cli(dir, "--json");
  const body = jsonOf(r);
  expect("a structured venture reads k-base and meta, not the flat decoy",
    r.status === 1 && body?.findings?.length === 1 && body.findings[0].rule === "icp-no-jobs" && body.findings[0].file === "foundation/icp.json" && body.findings[0].mode === "fail-closed",
    r.stdout);
}

// ---- Usage.
{
  const none = spawnSync("node", [join(repo, "schema/lint-foundation.mjs")], { encoding: "utf8" });
  expect("no venture dir exits 2", none.status === 2 && /usage:/.test(none.stderr), none.stderr);
  const missing = cli(join(root, "nope"));
  expect("a folder with no venture.json exits 2", missing.status === 2, missing.stderr);
}

// ---- The mission names its ICP in core.promised_to, not only in the promise.
{
  const dir = venture({ core: { promise: "We help builders decide.", promised_to: "early founders", must_not: "", competence: "" } });
  put(dir, "foundation/icp.json", icp());
  expect("an ICP named in core.promised_to counts as named", !rulesOf(cli(dir, "--json")).has("mission-names-no-icp"));
}

process.exit(failed ? 1 : 0);
