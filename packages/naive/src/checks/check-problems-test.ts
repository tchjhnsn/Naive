// Breaks check-problems on venture folders made here (EE-219). A record written before the problem tree existed
// passes, the accepted record passes, and each broken tree fails with the rule named. The fail-closed rule fires
// only once a solution, offer or public content is written.
//
//   node packages/naive/src/checks/check-problems-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IcpProfile, ValidationProblem } from "../records/types/records.d.ts";

const CHECK = new URL("./check-problems.ts", import.meta.url).pathname;
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-problems-test-"));
let n = 0;

const CORE = "does-not-know-what-to-do-next";
/** The record Torian accepted: a core problem, one problem that causes it and one narrower case of it. */
const accepted: ValidationProblem = {
  venture: "t",
  statement: "A founder with ten things on the list does not know which one to do next.",
  segment: "Solo founders building a first venture",
  forms: [
    { id: CORE, statement: "The founder does not know what to do next.", status: "target" },
    { id: "nothing-holds-what-the-venture-knows", statement: "What the venture knows is spread over notes and three tools.", cause_of: [CORE] },
    { id: "does-not-know-which-tool-for-the-goal", statement: "The founder knows the goal and not the tool.", parent: CORE },
  ],
  evidence: [],
};
const profile: IcpProfile = { id: "solo-founder", who: "A solo founder", primary: true, problem_forms: [CORE, "nothing-holds-what-the-venture-knows", "does-not-know-which-tool-for-the-goal"], core_problem: CORE };

/** A venture with the files given, run through the check. */
function venture(files: Record<string, unknown>, args: string[] = []) {
  const dir = join(tmp, `v-${++n}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t", name: "T", phase: "validation" }));
  for (const [rel, value] of Object.entries(files)) { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), JSON.stringify(value)); }
  const r = spawnSync(process.execPath, [CHECK, dir, ...args], { encoding: "utf8" });
  return { dir, status: r.status, out: r.stdout + r.stderr };
}
const solution = { venture: "t", statement: "One place that ranks the work", alternatives: ["a notebook"], evidence: [] };
const forms = (f: NonNullable<ValidationProblem["forms"]>) => ({ "foundation/problem.json": { venture: "t", statement: "s", segment: "who", forms: f, evidence: [] } });

try {
  const empty = venture({});
  t("a venture with no problem record passes and says what comes next", empty.status === 0 && /no forms|ok /.test(empty.out), empty);
  const legacy = venture({ "foundation/problem.json": { venture: "t", statement: "s", segment: "who", evidence: [] } });
  t("a record written before the problem tree existed passes: it is a one-problem tree", legacy.status === 0 && /write the problem tree/.test(legacy.out), legacy);
  const good = venture({ "foundation/problem.json": accepted, "foundation/icp/solo-founder.json": profile, "validation/solution.json": solution });
  t("the accepted record with a core problem, a target and a solution passes", good.status === 0 && /1 venture\(s\); 1 with a target problem/.test(good.out), good);
  const json = venture({ "foundation/problem.json": accepted, "foundation/icp/solo-founder.json": profile }, ["--json"]);
  const parsed = JSON.parse(json.out || "{}");
  t("--json prints each venture with its forms, its target and its findings", json.status === 0 && parsed.ok === true
    && parsed.ventures[0].forms === 3 && parsed.ventures[0].target === CORE, json.out.slice(0, 300));

  const noTarget = venture({ "foundation/problem.json": { ...accepted, forms: accepted.forms?.map((f) => ({ ...f, status: "open" as const })) }, "foundation/icp/solo-founder.json": profile, "validation/solution.json": solution });
  t("a solution written while no form is the target fails closed, naming the file and the rule", noTarget.status === 1
    && /validation\/solution.json is written while no form has status target/.test(noTarget.out), noTarget);
  const noCore = venture({ "foundation/problem.json": accepted, "foundation/icp/solo-founder.json": { ...profile, core_problem: undefined }, "validation/solution.json": solution });
  t("a solution written while the primary profile names no core problem fails closed", noCore.status === 1 && /names no core_problem/.test(noCore.out), noCore);
  const offer = venture({ "foundation/problem.json": { ...accepted, forms: [] }, "foundation/icp/solo-founder.json": profile, "service-delivery/offers/setup.json": { id: "setup", name: "Setup", outcome: "A venture set up" } });
  t("an offer counts as much as a solution: the rule covers every record type the definition names", offer.status === 1 && /offers\/setup.json is written while/.test(offer.out), offer);
  const content = venture({ "foundation/problem.json": { ...accepted, forms: [] }, "marketing/content/home.mdx": "x" });
  t("public content counts too, and a .mdx file is found by the data model's paths", content.status === 1 && /marketing\/content\/home.mdx is written while/.test(content.out), content);
  const notWritten = venture({ "foundation/problem.json": { ...accepted, forms: [] }, "foundation/icp/solo-founder.json": { ...profile, problem_forms: [], core_problem: undefined } });
  t("with no solution, offer or content written the same gaps are next steps, not failures", notWritten.status === 0 && /next .*has no forms/.test(notWritten.out), notWritten);

  const twoTargets = venture(forms([{ id: "a", statement: "A", status: "target" }, { id: "b", statement: "B", status: "target" }]));
  t("two targets fail", twoTargets.status === 1 && /one problem is the target at a time/.test(twoTargets.out), twoTargets);
  const loop = venture(forms([{ id: "a", statement: "A", parent: "b" }, { id: "b", statement: "B", parent: "a" }]));
  t("a loop through parent fails", loop.status === 1 && /loop through parent/.test(loop.out), loop);
  const badCause = venture(forms([{ id: "a", statement: "A", cause_of: ["gone"] }]));
  t("a cause no form has fails", badCause.status === 1 && /is a cause of gone, which no form has/.test(badCause.out), badCause);
  const bothRelations = venture(forms([{ id: "a", statement: "A", parent: "b", cause_of: ["b"] }, { id: "b", statement: "B" }]));
  t("a form that is both a narrower case of another and a cause of it fails", bothRelations.status === 1 && /both a narrower case of b and a cause of it/.test(bothRelations.out), bothRelations);
  const badCore = venture({ "foundation/problem.json": accepted, "foundation/icp/solo-founder.json": { ...profile, core_problem: "gone" } });
  t("a core problem that names no form fails", badCore.status === 1 && /core_problem gone names no form/.test(badCore.out), badCore);
  const badInterview = venture({
    "foundation/problem.json": accepted,
    "validation/interviews/p-01.json": { id: "p-01", person: "p-01", icp: "solo-founder", consent: { given: true, at: "2026-11-20T10:00:00Z", method: "written" }, transcript: { source: "raw/sources/p-01" }, bottlenecks: ["x"], problems: [{ problem: "invented", raised: "unprompted" }] },
  });
  t("an interview that codes a problem no form has fails", badInterview.status === 1 && /codes the problem invented/.test(badInterview.out), badInterview);
  const reserved = venture(forms([{ id: "root", statement: "A" }]));
  t("a form named root fails", reserved.status === 1 && /may not be named root/.test(reserved.out), reserved);

  // A workspace of ventures: the check walks them and fails on the one that is broken.
  const ws = join(tmp, "ws");
  for (const [id, f] of [["ok-one", accepted], ["broken-one", { ...accepted, forms: [{ id: "a", statement: "A", parent: "missing" }] }]] as const) {
    mkdirSync(join(ws, id, "foundation"), { recursive: true });
    writeFileSync(join(ws, id, "venture.json"), JSON.stringify({ id, name: id, phase: "validation" }));
    writeFileSync(join(ws, id, "foundation/problem.json"), JSON.stringify(f));
  }
  const walked = spawnSync(process.execPath, [CHECK, ws], { encoding: "utf8" });
  t("a workspace folder is walked, and the broken venture is named", walked.status === 1 && /broken-one: foundation\/problem.json: form a names the parent missing/.test(walked.stdout + walked.stderr), walked.stdout + walked.stderr);
  const usage = spawnSync(process.execPath, [CHECK], { encoding: "utf8" });
  t("no folder exits 2 with the usage", usage.status === 2 && /usage: node packages\/naive\/src\/checks\/check-problems.ts/.test(usage.stderr), usage.stderr);
} finally { rmSync(tmp, { recursive: true, force: true }); }

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log("\nall passed");
