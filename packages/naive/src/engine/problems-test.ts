// The customer problem tree and its ranking (EE-219): packages/naive/src/engine/problems.ts.
//
//   node packages/naive/src/engine/problems-test.ts
//
// The worked example is the record Torian accepted on 2026-11-26: a core problem, one problem that causes it and one
// narrower case under it. The pure functions are tested on that shape, then the whole module over a venture folder
// made here, so the schema is proved to hold it.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { runPromise } from "../core/effect/run.ts";
import { countsOf, labelOf, nodesOf, prerequisite, problemsOf, ranking, scoreOf, treeFindings, treeOf } from "./problems.ts";
import type { Coding, Node, Profile } from "./problems.ts";
import type { ProblemPriority, ValidationProblem } from "../records/types/records.d.ts";

const MODULE = new URL("./problems.ts", import.meta.url).pathname;
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };

const CORE = "does-not-know-what-to-do-next";
/** The record Torian accepted: the core problem, one cause of it, and one narrower case of it. */
const RECORD: ValidationProblem = {
  venture: "mentura",
  statement: "A founder with ten things on the list does not know which one to do next.",
  segment: "Solo founders and small founding teams building their first venture",
  forms: [
    { id: CORE, statement: "The founder does not know what to do next, so the week goes to whatever is loudest.", status: "target" },
    { id: "nothing-holds-what-the-venture-knows", statement: "What the venture knows is spread over notes, chats and three tools, so nothing can rank the work.", cause_of: [CORE] },
    { id: "does-not-know-which-tool-for-the-goal", statement: "The founder knows the goal and does not know which tool serves it.", parent: CORE },
  ],
  evidence: [],
};
const DEF: ProblemPriority = {
  version: "test",
  weights: { raised_unprompted: 1, ranked_first: 2, pays_for_workaround: 3 },
  ranked_statuses: ["open", "target"],
  labels: [{ from: 1, label: "primary" }, { from: 2, label: "secondary" }, { from: 3, label: "tertiary" }],
  requires_target: { records: ["validation-solution"], why: "Name the problem first." },
};
const PROFILE: Profile = { id: "solo-founder", primary: true, problem_forms: [CORE, "nothing-holds-what-the-venture-knows", "does-not-know-which-tool-for-the-goal"], core_problem: CORE, file: "foundation/icp/solo-founder.json" };

// ---- the tree ----
const nodes = nodesOf(RECORD);
t("every form is a node, with its parent, its causes and its status", nodes.length === 3
  && nodes[0].status === "target" && nodes[0].parent === null
  && nodes[1].cause_of.join() === CORE && nodes[1].status === "open"
  && nodes[2].parent === CORE, nodes);
const tree = treeOf(nodes, RECORD.statement);
const core = tree.narrower.find((n) => n.id === CORE);
t("the tree holds the accepted record: the core problem under the statement, one cause of it and one narrower case",
  tree.narrower.length === 2 && core?.causes.join() === "nothing-holds-what-the-venture-knows"
  && core?.narrower.map((n) => n.id).join() === "does-not-know-which-tool-for-the-goal", tree);
t("a flat list of forms is still a tree one level deep (records written before EE-219 stay valid)",
  treeOf(nodesOf({ statement: "s", forms: [{ id: "a", statement: "A" }, { id: "b", statement: "B" }] } as ValidationProblem), "s").narrower.length === 2);

// ---- the counts and the ranking ----
const codings: Coding[] = [
  { interview: "p-01", entries: [{ problem: CORE, raised: "unprompted", ranked_first: true }, { problem: "nothing-holds-what-the-venture-knows", raised: "prompted", pays_for_workaround: true }] },
  { interview: "p-02", entries: [{ problem: "nothing-holds-what-the-venture-knows", raised: "unprompted", pays_for_workaround: true }] },
];
const counts = countsOf(codings);
t("the counts come from the interviews: interviews, raised unprompted, ranked first, pays for a workaround",
  JSON.stringify(counts.get("nothing-holds-what-the-venture-knows")) === JSON.stringify({ interviews: 2, raised_unprompted: 1, ranked_first: 0, pays_for_workaround: 2 })
  && JSON.stringify(counts.get(CORE)) === JSON.stringify({ interviews: 1, raised_unprompted: 1, ranked_first: 1, pays_for_workaround: 0 }), [...counts]);
t("a problem's score is its counts under the weights", scoreOf({ interviews: 2, raised_unprompted: 1, ranked_first: 0, pays_for_workaround: 2 }, DEF.weights) === 7);

const hypothesis = ranking(nodes, new Map(), DEF, DEF.weights, [PROFILE]);
t("with no interview the basis is the founder's own order, labelled a hypothesis",
  hypothesis.basis === "hypothesis" && hypothesis.problems.map((p) => p.id).join() === `${CORE},nothing-holds-what-the-venture-knows,does-not-know-which-tool-for-the-goal`
  && hypothesis.problems[0].label === "primary" && hypothesis.problems[2].label === "tertiary", hypothesis.problems.map((p) => [p.id, p.rank, p.label]));
const evidence = ranking(nodes, counts, DEF, DEF.weights, [PROFILE]);
t("the counts outrank the founder's order once the interviews are coded: pays for a workaround weighs most",
  evidence.basis === "evidence" && evidence.problems[0].id === "nothing-holds-what-the-venture-knows" && evidence.problems[0].label === "primary"
  && evidence.problems[1].id === CORE && evidence.problems[1].label === "secondary", evidence.problems.map((p) => [p.id, p.score, p.label]));
t("the target and the core problem are read off the records, not the ranking",
  evidence.problems.find((p) => p.id === CORE)?.status === "target" && evidence.problems.find((p) => p.id === CORE)?.core_for.join() === "solo-founder");
t("a status the definition does not rank keeps its place with no rank and no label", (() => {
  const parked = ranking(nodesOf({ statement: "s", forms: [{ id: "a", statement: "A" }, { id: "b", statement: "B", status: "parked" }, { id: "c", statement: "C", status: "dropped" }] } as ValidationProblem), new Map(), DEF, DEF.weights);
  return parked.problems.filter((p) => p.rank === null).map((p) => p.id).join() === "b,c" && parked.problems[0].rank === 1;
})());
t("primary, secondary and tertiary are labels on the order: tertiary covers every rank from 3", labelOf(1, DEF.labels) === "primary" && labelOf(7, DEF.labels) === "tertiary" && labelOf(2, DEF.labels) === "secondary");
t("a venture's own weights change the order, and nothing else does", (() => {
  const own = ranking(nodes, counts, DEF, { raised_unprompted: 10, ranked_first: 1, pays_for_workaround: 0 }, [PROFILE]);
  return own.problems[0].id === CORE || own.problems[0].id === "nothing-holds-what-the-venture-knows";
})());

// ---- the findings ----
const clean = { nodes, profiles: [PROFILE], codings, solves: [], file: "foundation/problem.json" };
t("the accepted record has no findings", treeFindings(clean).length === 0, treeFindings(clean));
const broke = (forms: NonNullable<ValidationProblem["forms"]>, rest: Partial<typeof clean> = {}) => treeFindings({ ...clean, nodes: nodesOf({ statement: "s", forms } as ValidationProblem), ...rest });
t("two forms with one id fail", broke([{ id: "a", statement: "A" }, { id: "a", statement: "A again" }]).some((e) => /two forms are named a/.test(e)));
t("a form named root fails, because root names the record's own statement", broke([{ id: "root", statement: "A" }]).some((e) => /may not be named root/.test(e)));
t("a parent no form has fails", broke([{ id: "a", statement: "A", parent: "b" }]).some((e) => /names the parent b, which no form has/.test(e)));
t("a form that is a narrower case of itself fails", broke([{ id: "a", statement: "A", parent: "a" }]).some((e) => /narrower case of itself/.test(e)));
t("a loop through parent fails", broke([{ id: "a", statement: "A", parent: "b" }, { id: "b", statement: "B", parent: "a" }]).some((e) => /loop through parent/.test(e)));
t("a cause no form has fails", broke([{ id: "a", statement: "A", cause_of: ["b"] }]).some((e) => /is a cause of b, which no form has/.test(e)));
t("a loop through cause_of fails", broke([{ id: "a", statement: "A", cause_of: ["b"] }, { id: "b", statement: "B", cause_of: ["a"] }]).some((e) => /is a cause of itself through other forms/.test(e)));
t("a form that is both a narrower case of another and a cause of it fails: they are different claims",
  broke([{ id: "a", statement: "A", parent: "b", cause_of: ["b"] }, { id: "b", statement: "B" }]).some((e) => /both a narrower case of b and a cause of it/.test(e)));
t("a live narrower case under a dropped form fails", broke([{ id: "a", statement: "A", status: "dropped" }, { id: "b", statement: "B", parent: "a" }]).some((e) => /is dropped, and b is a narrower case of it/.test(e)));
t("two forms with status target fail: one problem is the target at a time",
  broke([{ id: "a", statement: "A", status: "target" }, { id: "b", statement: "B", status: "target" }]).some((e) => /one problem is the target at a time/.test(e)));
t("a profile whose core_problem names no form fails",
  treeFindings({ ...clean, profiles: [{ ...PROFILE, core_problem: "gone" }] }).some((e) => /core_problem gone names no form/.test(e)));
t("a core problem outside the profile's problem_forms fails",
  treeFindings({ ...clean, profiles: [{ ...PROFILE, problem_forms: ["does-not-know-which-tool-for-the-goal"] }] }).some((e) => /is not in problem_forms/.test(e)));
t("a target the primary profile does not have fails",
  treeFindings({ ...clean, profiles: [{ ...PROFILE, problem_forms: ["nothing-holds-what-the-venture-knows"], core_problem: "nothing-holds-what-the-venture-knows" }] }).some((e) => /is not a problem the primary profile/.test(e)));
t("an interview coding a problem no form has fails",
  treeFindings({ ...clean, codings: [{ interview: "p-09", entries: [{ problem: "invented", raised: "unprompted" }] }] }).some((e) => /codes the problem invented/.test(e)));
t("an interview that ranks two problems first fails",
  treeFindings({ ...clean, codings: [{ interview: "p-09", entries: [{ problem: CORE, raised: "unprompted", ranked_first: true }, { problem: "does-not-know-which-tool-for-the-goal", raised: "prompted", ranked_first: true }] }] }).some((e) => /are each ranked first/.test(e)));
t("a solution naming a problem no form has fails",
  treeFindings({ ...clean, solves: [{ file: "validation/solution.json", problem: "invented" }] }).some((e) => /problem invented names no form/.test(e)));
t("a solution naming a dropped problem fails", (() => {
  const dropped: Node[] = [...nodes.slice(1), { ...nodes[0], status: "dropped" }];
  return treeFindings({ ...clean, nodes: dropped, solves: [{ file: "validation/solution.json", problem: CORE }] }).some((e) => /is dropped, so this solution solves a problem the venture ruled out/.test(e));
})());

// ---- the fail-closed rule ----
const pre = (nodeList: readonly Node[], profiles: readonly Profile[], solutionFiles: string[]) =>
  prerequisite({ nodes: nodeList, profiles, definition: DEF, file: "foundation/problem.json", waiting: [{ record: "validation-solution", files: solutionFiles }] });
t("with a core problem and a target, a solution passes", pre(nodes, [PROFILE], ["validation/solution.json"]).ok);
t("a solution written with no target fails closed, and says what is missing", (() => {
  const open = nodes.map((n) => ({ ...n, status: "open" as const }));
  const v = pre(open, [PROFILE], ["validation/solution.json"]);
  return !v.ok && v.missing.some((m) => /no form has status target/.test(m)) && !!v.why;
})());
t("a solution written while the primary profile names no core problem fails closed",
  !pre(nodes, [{ ...PROFILE, core_problem: null }], ["validation/solution.json"]).ok);
t("with nothing written the same gaps are advice, not a failure", pre([], [PROFILE], []).ok && pre([], [PROFILE], []).missing.some((m) => /has no forms/.test(m)));
t("a venture with no profile at all is advised, because the profiles are the foundation lint's rule", (() => {
  const v = pre(nodes, [], ["validation/solution.json"]);
  return v.ok && v.advice.some((a) => /no ICP profile/.test(a));
})());

// ---- the whole module over a venture folder, so the schema is proved to hold the accepted record ----
const tmp = mkdtempSync(join(tmpdir(), "problems-test-"));
try {
  const dir = join(tmp, "mentura");
  const w = (rel: string, value: unknown) => { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), JSON.stringify(value, null, 2) + "\n"); };
  w("venture.json", { id: "mentura", name: "Mentura", phase: "validation" });
  w("foundation/problem.json", RECORD);
  w("foundation/icp/solo-founder.json", { id: "solo-founder", who: "A solo founder building a first venture", primary: true, problem_forms: PROFILE.problem_forms, core_problem: CORE });
  w("validation/interviews/p-01.json", {
    id: "p-01", person: "p-01", icp: "solo-founder", consent: { given: true, at: "2026-11-20T10:00:00Z", method: "written" },
    transcript: { source: "raw/sources/p-01" }, bottlenecks: ["does not know what to do next"],
    problems: [{ problem: CORE, raised: "unprompted", ranked_first: true }, { problem: "nothing-holds-what-the-venture-knows", raised: "prompted", pays_for_workaround: true }],
  });
  w("validation/interviews/p-02.json", {
    id: "p-02", person: "p-02", icp: "solo-founder", consent: { given: true, at: "2026-11-21T10:00:00Z", method: "written" },
    transcript: { source: "raw/sources/p-02" }, bottlenecks: ["everything is in a different tool"],
    problems: [{ problem: "nothing-holds-what-the-venture-knows", raised: "unprompted", pays_for_workaround: true }],
  });
  const valid = spawnSync(process.execPath, [new URL("../records/validate.ts", import.meta.url).pathname, dir], { encoding: "utf8" });
  t("every record of the worked example matches its schema", valid.status === 0, valid.stdout + valid.stderr);

  const p = await runPromise(Effect.map(problemsOf(dir), (x) => x));
  t("the venture's tree, ranking and verdict come from its own records", p.venture === "mentura" && p.file === "foundation/problem.json"
    && p.interviews === 2 && p.basis === "evidence" && p.problems[0].id === "nothing-holds-what-the-venture-knows"
    && p.findings.length === 0 && p.prerequisite.ok && p.weights.from === "framework", { basis: p.basis, order: p.problems.map((x) => x.id), findings: p.findings });
  const tree = spawnSync(process.execPath, [MODULE, dir, "tree"], { encoding: "utf8" });
  t("naive problems tree prints the tree with the cause marked", tree.status === 0 && /caused by nothing-holds-what-the-venture-knows/.test(tree.stdout) && /\[target\]/.test(tree.stdout), tree.stdout);
  const rank = spawnSync(process.execPath, [MODULE, dir, "rank", "--json"], { encoding: "utf8" });
  t("naive problems rank --json prints the order with its counts and its basis", rank.status === 0 && JSON.parse(rank.stdout).basis === "evidence"
    && JSON.parse(rank.stdout).problems[0].counts.pays_for_workaround === 2, rank.stdout.slice(0, 200));
  const bad = spawnSync(process.execPath, [MODULE, dir, "guess"], { encoding: "utf8" });
  t("a word that is not tree or rank exits 2", bad.status === 2, bad.stderr);

  w("naive.config.json", { problems: { weights: { pays_for_workaround: 0, ranked_first: 9 }, set_by: "Torian" } });
  const own = await runPromise(Effect.map(problemsOf(dir), (x) => x));
  t("the venture's own weights in naive.config.json replace the framework's priors", own.weights.from === "venture" && own.problems[0].id === CORE, own.problems.map((x) => [x.id, x.score]));
} finally { rmSync(tmp, { recursive: true, force: true }); }

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log("\nall passed");
