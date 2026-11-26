#!/usr/bin/env node
// Tests the goal ledger (EE-210, packages/naive/src/engine/goals.ts): the lifecycle rules as pure functions, the
// goal tree, a person settling a goal, the refusals, and the history read back from the provenance log and the blob
// store. The venture is made in a temporary workspace by init-venture.ts, so the paths are a real venture's.
//
//   node packages/naive/src/engine/goals-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { runPromise } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import {
  GOALS, LIFECYCLE, SETTLED, STATUSES, allGoals, goalSettles, goalTree, goalWriteRefusal, historyOf, readDraftGoals,
  setStatus, statusOf, transitionRefusal, type GoalRecord, type GoalStatus,
} from "./goals.ts";
import type { Goal } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: unknown, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 500)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "goals-test-"));
const dir = join(ws, "own");
const goal = (over: Partial<Goal> = {}): Goal => ({ id: "end", statement: "Ten customers pay", kind: "venture", ...over });
const rec = (g: Goal, draft = false): GoalRecord => ({ goal: g, file: `${GOALS}/${g.id}.json`, draft });
/** Why an Effect refused, or "" when it succeeded. runPromise throws the tagged error itself. */
const refusal = async (e: Effect.Effect<unknown, { message: string }, "naive/VentureFs">): Promise<string> => {
  try { await runPromise(e); return ""; } catch (err) { return (err as Error).message; }
};

try {
  // The lifecycle, as pure rules.
  expect("a record with no status is proposed", statusOf({}) === "proposed" && statusOf({ status: "met" }) === "met");
  expect("no status lists itself as a next status", STATUSES.every((s) => !LIFECYCLE[s].includes(s)));
  expect("staying where it is is never refused", STATUSES.every((s) => transitionRefusal(s, s) === null));
  expect("a proposed goal is adopted, dropped or superseded, and never met or missed",
    transitionRefusal("proposed", "active") === null && transitionRefusal("proposed", "dropped") === null
    && !!transitionRefusal("proposed", "met") && !!transitionRefusal("proposed", "missed"), transitionRefusal("proposed", "met"));
  expect("an active goal is met, missed, dropped or superseded", (["met", "missed", "dropped", "superseded"] as GoalStatus[]).every((s) => transitionRefusal("active", s) === null));
  expect("a settled goal reopens only to active", SETTLED.every((s) => transitionRefusal(s, "active") === null)
    && !!transitionRefusal("met", "missed") && !!transitionRefusal("superseded", "met"), transitionRefusal("met", "missed"));
  expect("the refusal says where the goal can go", (transitionRefusal("met", "missed") ?? "").includes("reopens only to active"), transitionRefusal("met", "missed"));

  // What counts as settling a goal: the router holds such a write as a draft.
  expect("proposing a goal does not settle it", !goalSettles(null, goal()) && !goalSettles(null, goal({ status: "proposed" })));
  expect("a new goal that is already active settles it", goalSettles(null, goal({ status: "active" })));
  expect("changing the statement does not settle it", !goalSettles(goal(), goal({ statement: "Twenty customers pay" })));
  expect("changing the status, the result, who set it or the successor settles it",
    goalSettles(goal(), goal({ status: "active" })) && goalSettles(goal({ status: "active" }), goal({ status: "active", result: { note: "x" } }))
    && goalSettles(goal(), goal({ status_by: "Torian" })) && goalSettles(goal({ status: "superseded", superseded_by: "a" }), goal({ status: "superseded", superseded_by: "b" })));

  // The write rule.
  expect("an agent may write a new goal", goalWriteRefusal({ stored: null, input: goal(), person: false }) === null);
  expect("an agent may propose where a proposed goal should go", goalWriteRefusal({ stored: goal(), input: goal({ status: "active" }), person: false }) === null);
  const adopted = goal({ status: "active", status_by: "Torian", owner: "Torian", measures: [{ id: "paying", statement: "Paying customers", target: 10 }] });
  const reworded = goalWriteRefusal({ stored: adopted, input: { ...adopted, statement: "Five customers pay" }, person: false });
  expect("an agent does not reword a goal a person adopted; the refusal names the supersede path",
    !!reworded && reworded.includes("statement") && reworded.includes("supersedes"), reworded);
  expect("a person may reword it", goalWriteRefusal({ stored: adopted, input: { ...adopted, statement: "Five customers pay" }, person: true }) === null);
  const jumped = goalWriteRefusal({ stored: goal({ status: "met", result: { note: "done" } }), input: goal({ status: "missed", result: { note: "no" } }), person: true });
  expect("nobody breaks the lifecycle, a person included", !!jumped && jumped.includes("does not become missed"), jumped);
  // The rule runs before the schema, so it sees records with a status the schema would refuse.
  const unchecked = JSON.parse(JSON.stringify({ ...goal(), status: "open" })) as Goal;
  expect("a status that is not a status is refused", !!goalWriteRefusal({ stored: null, input: unchecked, person: true }));

  // The tree.
  const tree = goalTree([rec(goal({ id: "pricing", kind: "function", parent: "end" })), rec(goal({ id: "end" })), rec(goal({ id: "brand", kind: "function", parent: "end" }))]);
  expect("the tree puts each goal under the goal it serves, by id",
    tree.map((n) => `${n.goal.id}@${n.depth}`).join(" ") === "end@0 brand@1 pricing@1", tree.map((n) => [n.goal.id, n.depth]));
  const cycle = goalTree([rec(goal({ id: "a", parent: "b" })), rec(goal({ id: "b", parent: "a" }))]);
  expect("a parent cycle still lists every goal once (the check is what fails on it)", cycle.length === 2 && new Set(cycle.map((n) => n.goal.id)).size === 2, cycle.map((n) => n.goal.id));

  // A venture on disk.
  const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.ts"), dir, "own"], { encoding: "utf8" });
  expect("a venture to test in", init.status === 0, init.stderr);
  mkdirSync(ventureFile(dir, GOALS), { recursive: true });
  const write = (g: Goal) => writeFileSync(ventureFile(dir, `${GOALS}/${g.id}.json`), JSON.stringify(g, null, 2) + "\n");
  write(goal({ id: "end", owner: "Torian", measures: [{ id: "paying", statement: "Paying customers", target: 10, primary: true }] }));
  write(goal({ id: "pricing", kind: "function", parent: "end", statement: "A price people say yes to", owner: "Torian", measures: [{ id: "quotes", statement: "Quotes accepted" }] }));

  // Only a person settles a goal.
  const byAgent = await refusal(setStatus(dir, "end", "active", { by: "strategy-agent" }));
  expect("an agent's role cannot settle a goal", /only a person/.test(byAgent), byAgent);
  const noone = await refusal(setStatus(dir, "end", "active", {}));
  expect("settling a goal needs the person's name", /needs the person's name/.test(noone), noone);
  const missing = await refusal(setStatus(dir, "nope", "active", { by: "Founder" }));
  expect("a goal that is not there is not found", /goal nope/.test(missing), missing);

  const active = await runPromise(setStatus(dir, "end", "active", { by: "Founder" }));
  expect("a person adopts the goal, and the record names who set it and when",
    active.from === "proposed" && active.goal.status === "active" && active.goal.status_by === "Founder" && !!active.goal.status_at, active.goal);
  const onDisk = JSON.parse(readFileSync(ventureFile(dir, `${GOALS}/end.json`), "utf8")) as Goal;
  expect("the change is on disk", onDisk.status === "active" && onDisk.status_by === "Founder", onDisk);

  const jump = await refusal(setStatus(dir, "end", "proposed", { by: "Founder" }));
  expect("an active goal does not go back to proposed", /does not become proposed/.test(jump), jump);
  const nothing = await refusal(setStatus(dir, "end", "met", { by: "Founder" }));
  expect("a met goal says what happened", /says what happened/.test(nothing), nothing);
  const wrongMeasure = await refusal(setStatus(dir, "end", "met", { by: "Founder", measures: [{ id: "signups", value: 3 }] }));
  expect("a result measure the goal does not have is refused", /no measure signups/.test(wrongMeasure), wrongMeasure);

  const met = await runPromise(setStatus(dir, "end", "met", { by: "Founder", note: "Twelve paying customers in November", measures: [{ id: "paying", value: "12" }] }));
  expect("a person settles it as met, with the note and the measure", met.goal.status === "met" && met.goal.result?.note?.startsWith("Twelve") && met.goal.result?.measures?.[0]?.id === "paying", met.goal.result);
  expect("the result names the person who recorded it", met.goal.result?.by === "Founder" && !!met.goal.result?.at, met.goal.result);

  // Superseding names the successor, on the superseded goal.
  const noSuccessor = await refusal(setStatus(dir, "pricing", "superseded", { by: "Founder" }));
  expect("superseding names the goal that replaces it", /names the goal that replaces it/.test(noSuccessor), noSuccessor);
  const unknownSuccessor = await refusal(setStatus(dir, "pricing", "superseded", { by: "Founder", supersededBy: "nope" }));
  expect("a successor that is not a goal here is not found", /goal nope/.test(unknownSuccessor), unknownSuccessor);
  write(goal({ id: "pricing-2", kind: "function", parent: "end", statement: "A price people say yes to, by segment", supersedes: ["pricing"] }));
  const superseded = await runPromise(setStatus(dir, "pricing", "superseded", { by: "Founder", supersededBy: "pricing-2" }));
  expect("the superseded goal names its successor", superseded.goal.status === "superseded" && superseded.goal.superseded_by === "pricing-2", superseded.goal);
  const reopened = await runPromise(setStatus(dir, "pricing", "active", { by: "Founder" }));
  expect("reopening a superseded goal clears the successor, as the schema requires", reopened.goal.status === "active" && reopened.goal.superseded_by === undefined, reopened.goal);

  // History: every version, from the provenance lines and the blobs they name.
  const history = await runPromise(historyOf(dir, "end"));
  expect("history holds one version per write, oldest first",
    history.length === 2 && history.map((v) => v.status).join(" ") === "active met" && history.every((v) => v.by === "Founder"), history.map((v) => [v.at, v.status, v.by]));
  expect("each version carries the record those bytes hold", history[0].record?.status === "active" && history[1].record?.result?.note?.startsWith("Twelve"), history.map((v) => v.record?.status));
  expect("the first write, made by hand before any provenance line, is not in the history", history.every((v) => v.status !== "proposed"), history.map((v) => v.status));

  // A held draft of a goal is shown, marked as a draft, so a reader is not told there are no goals.
  const draftDir = ventureFile(dir, "_drafts");
  mkdirSync(draftDir, { recursive: true });
  writeFileSync(join(draftDir, "foundation__goals__growth.json.draft"), JSON.stringify(goal({ id: "growth", kind: "function", statement: "Grow the pipeline" })) + "\n");
  const drafts = await runPromise(readDraftGoals(dir));
  expect("a goal waiting as a held draft is read, marked as a draft", drafts.length === 1 && drafts[0].goal.id === "growth" && drafts[0].draft, drafts);
  const every = await runPromise(allGoals(dir));
  expect("the list holds the live goals and the drafts of goals with no live record",
    every.map((g) => `${g.goal.id}${g.draft ? ":draft" : ""}`).sort().join(" ") === "end growth:draft pricing pricing-2", every.map((g) => g.goal.id));

  // The CLI.
  const cli = (...args: string[]) => spawnSync("node", [join(repo, "packages/naive/src/engine/goals.ts"), dir, ...args], { encoding: "utf8" });
  const list = cli("list");
  expect("naive goals list shows the tree, the statuses and the draft", list.status === 0 && /end \[met]/.test(list.stdout) && /growth \[proposed].*draft, waiting/.test(list.stdout), list.stdout + list.stderr);
  const listJson = JSON.parse(cli("list", "--json").stdout) as { goals: { id: string, depth: number, draft: boolean }[] };
  expect("--json gives the tree with each goal's depth", listJson.goals.find((g) => g.id === "pricing")?.depth === 1 && listJson.goals.find((g) => g.id === "growth")?.draft === true, listJson.goals);
  const histJson = JSON.parse(cli("history", "end", "--json").stdout) as { versions: { status: string }[] };
  expect("naive goals history --json gives every version", histJson.versions.length === 2, histJson.versions.map((v) => v.status));
  const show = cli("show", "end", "--at", history[0].at);
  expect("naive goals show --at reads the version that stood at a time", show.status === 0 && /"status": "active"/.test(show.stdout) && !/"result"/.test(show.stdout), show.stdout + show.stderr);
  const early = cli("show", "end", "--at", "2020-01-01T00:00:00Z");
  expect("before its first line there is no version to read", early.status === 1 && /not found/.test(early.stdout + early.stderr), early.stdout + early.stderr);
  const badStatus = cli("status", "end", "finished", "--by", "Founder");
  expect("a status the lifecycle does not have is refused by the usage", badStatus.status === 2, badStatus.stdout + badStatus.stderr);
  const badMeasure = cli("status", "pricing", "met", "--by", "Founder", "--measure", "quotes");
  expect("--measure takes <id>=<value>", badMeasure.status === 2 && /<id>=<value>/.test(badMeasure.stdout + badMeasure.stderr), badMeasure.stdout + badMeasure.stderr);
  const dropped = cli("status", "pricing-2", "dropped", "--by", "Founder");
  expect("the CLI settles a goal and says what moved", dropped.status === 0 && /pricing-2: proposed -> dropped by Founder/.test(dropped.stdout), dropped.stdout + dropped.stderr);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\ngoals: all passed");
