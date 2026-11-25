// Tests packages/naive/src/engine/activity-proposals.ts (EE-169): a rule picks only rated cross-industry activities
// whose scores meet every condition, under the functions the venture lists; propose files one open decision per rule
// and function, a rerun files nothing more, a decided proposal is left alone, and list writes nothing. A venture's
// industry (EE-171) adds the activities filed under a NAICS code its own code starts with. A venture's
// own lines in naive.config.json (EE-170) turn a rule off or replace its lines, the note says whose lines they are,
// and lines the catalog cannot hold fail check-config and the command.
//
//   node packages/naive/src/engine/activity-proposals-test.ts

import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { approve } from "./decisions.ts";
import { applies, find, inIndustry, matches, note, proposeFound, question, ventureLineProblems } from "./activity-proposals.ts";
import type { ActivityCatalog } from "../records/types/records.d.ts";

let failed = 0;
const ok = (cond: boolean, name: string): void => { console.log(`${cond ? "ok  " : "FAIL"}  ${name}`); if (!cond) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "activity-proposals-"));
const venture = (name: string, departments: string[]): string => {
  const dir = join(tmp, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: name, phase: "discovery", departments }, null, 2) + "\n");
  return dir;
};

type Activity = ActivityCatalog["activities"][number];
const rated = { by: "activity-proposals-test", on: "2026-11-25", basis: "a fixture for this test" };
const activity = (id: string, over: Partial<Activity> = {}): Activity => ({ id, process_group: "3.1", statement: `Do ${id}.`, scope: { kind: "cross-industry" }, ratings: { verification: 8, "regulatory-restriction": 0 }, rated, ...over });
const catalog: ActivityCatalog = {
  version: "0.0.1",
  scales: [],
  proposal_rules: [
    { id: "checked", when: [{ scale: "verification", at_least: 7 }, { scale: "regulatory-restriction", at_most: 1 }], asks: "Should an agent perform these activities?", basis: "a fixture" },
    { id: "restricted", when: [{ scale: "regulatory-restriction", at_least: 2 }], asks: "Should a person approve each of these activities?", basis: "a fixture" },
  ],
  activities: [
    activity("survey-buyers"),
    activity("line-met-exactly", { ratings: { verification: 7, "regulatory-restriction": 1 } }),
    activity("low-verification", { ratings: { verification: 6.99, "regulatory-restriction": 0 } }),
    activity("no-score-on-a-scale", { ratings: { verification: 9 } }),
    activity("unrated", { ratings: undefined, rated: undefined }),
    activity("one-industry", { scope: { kind: "industry", naics: "44" } }),
    activity("another-function", { process_group: "9.1" }),
    activity("get-consent", { ratings: { verification: 3, "regulatory-restriction": 2.5 } }),
  ],
};
const groups = new Map([["3.1", "marketing-and-sales"], ["9.1", "finance"]]);
const [checked] = catalog.proposal_rules ?? [];

ok(matches(catalog.activities[0], checked) && matches(catalog.activities[1], checked), "a score on the line meets at_least and at_most");
ok(!matches(catalog.activities[2], checked) && !matches(catalog.activities[3], checked) && !matches(catalog.activities[4], checked), "a score under the line, a missing score and an unrated activity do not match");

const found = find(catalog, groups, ["marketing-and-sales"]);
ok(found.length === 2 && found[0].id === "activity-checked-marketing-and-sales" && found[1].id === "activity-restricted-marketing-and-sales", "one entry per rule and function, named activity-<rule>-<function>");
ok(found[0].activities.map((a) => a.id).join() === "survey-buyers,line-met-exactly", "an industry activity and another function's activity are left out");
ok(find(catalog, groups, []).length === 0 && find(catalog, groups, ["human-capital"]).length === 0, "a venture with no function, or a function with no match, gets nothing");
ok(find(catalog, groups, ["marketing-and-sales", "finance"]).some((f) => f.id === "activity-checked-finance"), "each listed function gets its own entry");
ok(question(found[0]) === "marketing-and-sales: Should an agent perform these activities (2 activities)?" && /\(1 activity\)\?$/.test(question(found[1])), "the question names the function and the count");
ok(/rule checked/.test(note(found[0])) && /survey-buyers \(3\.1\).*verification 8, regulatory-restriction 0.*Rated by activity-proposals-test on 2026-11-25/.test(note(found[0])) && /decides nothing/.test(note(found[0])), "the note names the rule, each activity's scores and who rated it");

const dir = venture("v", ["marketing-and-sales"]);
const firstRun = proposeFound(dir, found);
const file = join(dir, "decisions/activity-checked-marketing-and-sales.decision.json");
const d = JSON.parse(readFileSync(file, "utf8"));
ok(firstRun.every((p) => p.ok && p.result?.proposed) && d.status === "open" && d.provenance.drafted_by.kind === "agent" && d.provenance.drafted_by.id === "activity-proposals", "propose files open decisions drafted by the agent activity-proposals");
ok(readdirSync(join(dir, "decisions")).length === 2 && /"activity":"draft"/.test(readFileSync(join(dir, "provenance.jsonl"), "utf8").replace(/\s/g, "")), "one decision per entry, each logged in provenance");
const before = readFileSync(file, "utf8");
const again = proposeFound(dir, find({ ...catalog, activities: [...catalog.activities, activity("added-later")] }, groups, ["marketing-and-sales"]));
ok(again.every((p) => p.ok && p.result?.kept) && readFileSync(file, "utf8") === before, "a rerun keeps a decision already filed, even when the catalog grew");
const decided = approve(dir, "activity-checked-marketing-and-sales", { answer: "No, a person does them for now.", by: "Torian" });
const after = proposeFound(dir, found);
ok(decided.ok && after[0].result?.kept === "activity-checked-marketing-and-sales" && after[0].result.status === "decided" && JSON.parse(readFileSync(file, "utf8")).answer === "No, a person does them for now.", "a decided proposal is left alone");

const CLI = new URL("./activity-proposals.ts", import.meta.url).pathname;
const run = (...args: string[]) => { const r = spawnSync("node", [CLI, ...args], { encoding: "utf8" }); return { status: r.status, out: r.stdout + r.stderr }; };
const real = venture("real", ["marketing-and-sales"]);
const listed = run(real, "--json");
const listedFound: { id: string; activities: string[] }[] = listed.status === 0 ? JSON.parse(listed.out).found : [];
ok(listedFound.some((f) => f.id === "activity-person-approves-restricted-marketing-and-sales" && f.activities.length > 0) && !existsSync(join(real, "decisions")), "list reads the shipped catalog and writes nothing");
const filed = run(real, "propose");
ok(filed.status === 0 && new RegExp(`proposed ${listedFound.length} open decisions, kept 0`).test(filed.out) && readdirSync(join(real, "decisions")).length === listedFound.length, "propose files what list found");
ok(new RegExp(`proposed 0 open decisions, kept ${listedFound.length}`).test(run(real, "propose").out), "a second propose files nothing");
const none = run(venture("none", []));
ok(none.status === 0 && /lists no functions/.test(none.out), "a venture with no functions is told so");
ok(run().status === 2 && run(real, "decide").status === 2, "a missing folder or an unknown action is a usage error");

const scaled: ActivityCatalog = { ...catalog, scales: [
  { id: "verification", range: [1, 10], source: "a-fixture", means: "a fixture" },
  { id: "regulatory-restriction", range: [0, 3], source: "a-fixture", means: "a fixture" },
] };
const own = find(scaled, groups, ["marketing-and-sales"], { checked: { when: [{ scale: "verification", at_least: 6.5 }] }, restricted: "off" });
ok(own.length === 1 && own[0].lines === "venture" && own[0].activities.map((a) => a.id).join() === "survey-buyers,line-met-exactly,low-verification,no-score-on-a-scale", "a venture's lines replace all of the catalog's for the rule, and off finds nothing");
ok(found.every((f) => f.lines === "catalog") && own[0].id === found[0].id, "a rule the venture leaves out keeps the catalog's lines, and the decision id does not change");
ok(/venture's own lines from naive\.config\.json activity_proposals: verification at least 6\.5\./.test(note(own[0])) && !/venture's own lines/.test(note(found[0])), "the note says whose lines found the activities");
const wrong = ventureLineProblems(scaled, { missing: "off", checked: { when: [{ scale: "verification", at_least: 11 }, { scale: "regulatory-restriction", at_least: 2, at_most: 1 }, { scale: "share", at_most: 50 }] } });
ok(wrong.length === 4 && /no proposal rule missing/.test(wrong[0]) && /line at 11 on verification, outside its range 1 to 10/.test(wrong[1]) && /which no score meets/.test(wrong[2]) && /names the scale share/.test(wrong[3]), "a rule the catalog lacks, a line outside its scale, lines no score meets and an unknown scale are each named");
ok(ventureLineProblems(scaled, { checked: { when: [{ scale: "verification", at_least: 10 }] }, restricted: "off" }).length === 0 && ventureLineProblems(scaled).length === 0, "lines on the range's edge, off and no lines at all are fine");

const CHECK_CONFIG = new URL("../checks/check-config.ts", import.meta.url).pathname;
const checkConfig = (dir: string): { errors: string[] } => JSON.parse(spawnSync("node", [CHECK_CONFIG, dir, "--json"], { encoding: "utf8" }).stdout);
ok(inIndustry("44", "445110") && inIndustry("4451", "445110") && inIndustry("445110", "445110") && !inIndustry("4452", "445110") && !inIndustry("445110", "4451"), "a venture is in every industry its NAICS code starts with, and in none narrower than its own code");
ok(inIndustry("44", "459110") && inIndustry("31", "334111") && inIndustry("49", "484110") && !inIndustry("44", "484110") && !inIndustry("441", "459110"), "a two-digit code in a ranged sector (31-33, 44-45, 48-49) names the whole sector, and a longer code does not");
ok(!inIndustry("44", undefined) && applies(catalog.activities[0], undefined) && !applies(catalog.activities[5], undefined) && !applies(catalog.activities[5], "541511"), "a venture with no industry, or another one, gets cross-industry activities only");
const grocer = find(catalog, groups, ["marketing-and-sales"], {}, "445110");
ok(grocer[0].activities.map((a) => a.id).join() === "survey-buyers,line-met-exactly,one-industry" && /one-industry \(3\.1, NAICS 44\)/.test(note(grocer[0])) && grocer[0].id === found[0].id, "a venture in the activity's industry gets it under the same decision, and the note names the industry");

const inRetail = venture("in-retail", ["marketing-and-sales"]);
writeFileSync(join(inRetail, "venture.json"), JSON.stringify({ id: "in-retail", phase: "discovery", departments: ["marketing-and-sales"], industry: { system: "naics", code: "445110" } }, null, 2) + "\n");
ok(run(inRetail, "--json").out === listed.out.replaceAll("real", "in-retail") || JSON.parse(run(inRetail, "--json").out).found.length === listedFound.length, "the command reads the venture's industry, and the shipped catalog, which has no industry activity yet, gives it the same proposals");

const config = (dir: string, value: unknown): void => writeFileSync(join(dir, "naive.config.json"), JSON.stringify(value, null, 2) + "\n");
const strict = venture("strict", ["marketing-and-sales"]);
config(strict, { activity_proposals: { rules: { "agent-with-checked-result": { when: [{ scale: "verification", at_least: 10 }] }, "person-approves-restricted": "off" } } });
ok(checkConfig(strict).errors.length === 0 && run(strict, "--json").out.replace(/\s/g, "").includes('"found":[]'), "a venture that raises one line to the top and turns the other rule off gets no proposal from the shipped catalog");
const loose = venture("loose", ["marketing-and-sales"]);
config(loose, { activity_proposals: { rules: { "person-approves-restricted": { when: [{ scale: "regulatory-restriction", at_least: 0 }] } } } });
const looseFound: { id: string; lines: string; activities: string[] }[] = JSON.parse(run(loose, "--json").out).found;
const widened = looseFound.find((f) => f.id === "activity-person-approves-restricted-marketing-and-sales");
ok(widened?.lines === "venture" && widened.activities.length > (listedFound.find((f) => f.id === widened.id)?.activities.length ?? 0) && looseFound.some((f) => f.lines === "catalog"), "a venture that lowers a line gets more activities under that rule, and the other rule keeps the catalog's lines");
ok(/\(the venture's lines\)/.test(run(loose).out), "list marks a proposal found by the venture's lines");
const bad = venture("bad", ["marketing-and-sales"]);
config(bad, { activity_proposals: { rules: { "no-such-rule": "off", "person-approves-restricted": { when: [{ scale: "regulatory-restriction", at_least: 99 }] } } } });
const badCheck = checkConfig(bad).errors.join("\n");
ok(/no proposal rule no-such-rule/.test(badCheck) && /line at 99 on regulatory-restriction/.test(badCheck), "check-config refuses a rule the catalog lacks and a line outside its scale");
const badRun = run(bad, "propose");
ok(badRun.status !== 0 && /no proposal rule no-such-rule/.test(badRun.out) && !existsSync(join(bad, "decisions")), "the command refuses such lines and files nothing");
config(bad, { activity_proposals: { rules: { "person-approves-restricted": { when: [{ scale: "regulatory-restriction" }] } } } });
ok(/does not match/.test(checkConfig(bad).errors.join("\n")), "a line with neither at_least nor at_most fails the schema");
config(bad, { activity_proposals: { rules: { "person-approves-restricted": "on" } } });
ok(/neither off nor \{ when \}/.test(run(bad).out) && run(bad).status !== 0, "a setting that is neither off nor lines is refused by the command");

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("activity-proposals: scores only propose, once, by the catalog's lines or the venture's, and never decide");
