// Tests the skipped ledger (EE-213): what each kind of run leaves behind, the hierarchical order, the handback
// decision, and the command and the loop's plan line over one venture folder made here.
//
//   node packages/naive/src/engine/skipped-test.ts

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runSync } from "../core/effect/run.ts";
import { groupOf, handback, handbackId, skipped, skippedFor } from "./skipped.ts";
import type { Hierarchy, SkippedItem, SkippedWorkflow } from "./skipped.ts";
import type { WorkflowRun } from "./due.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };

const h: Hierarchy = { category: { f: "1.0", g: "3.0" }, group: { "catalog-act": "3.1" } };
expect("an APQC activity's process group is its first two segments, and a catalog activity's is the catalog's",
  groupOf("1.1.1.2", h) === "1.1" && groupOf("catalog-act", h) === "3.1" && groupOf("unlisted", h) === null && groupOf(null, h) === null);

const flow = (id: string, fn: string, steps: SkippedWorkflow["steps"]): SkippedWorkflow => ({ id, function: fn, title: `the ${id} workflow`, steps });
const review = flow("review", "f", [
  { id: "first", do: "Do the first thing." },
  { id: "deep", do: "Dig in.", activity: "1.1.1.2" },
  { id: "maybe", do: "Try the product.", consider: { why: "Using it shows what it does.", when: "A competitor bears on an open decision." } },
  { id: "last", do: "Write it up." },
]);
const sell = flow("sell", "g", [{ id: "call", do: "Call the buyer.", activity: "catalog-act" }, { id: "log", do: "Log the call." }]);
const now = "2026-06-15T00:00:00.000Z";
const run = (workflow: string, at: string, outcome: WorkflowRun["outcome"], steps?: string[]): WorkflowRun => ({ workflow, at, outcome, by: "f-agent", ...(steps ? { steps } : {}) });
const by = (list: readonly SkippedItem[]) => Object.fromEntries(list.map((i) => [i.id, i]));

expect("with no runs nothing is left behind", skipped([review, sell], [], now, h).length === 0);
expect("a run that reports no steps leaves nothing behind, because it said nothing about them",
  skipped([review], [run("f/review", "2026-06-14T00:00:00.000Z", "done")], now, h).length === 0);

const left = skipped([review], [run("f/review", "2026-06-14T00:00:00.000Z", "done", ["first", "last"])], now, h);
const m = by(left);
expect("the steps a reporting run left out are on the ledger, and the ones it finished are not",
  left.length === 2 && "f/review#deep" in m && "f/review#maybe" in m && !("f/review#first" in m), left.map((i) => i.id));
expect("a step with no consider is required, and says the run did not finish it",
  m["f/review#deep"].required && m["f/review#deep"].kind === "step" && /did not finish this required step/.test(m["f/review#deep"].why), m["f/review#deep"]);
expect("a step to consider is not required and carries its why and when for a person or the agent to judge",
  !m["f/review#maybe"].required && m["f/review#maybe"].consider?.when === "A competitor bears on an open decision."
  && /one to consider: Using it shows what it does\./.test(m["f/review#maybe"].why) && /f-agent judges whether it does now/.test(m["f/review#maybe"].why), m["f/review#maybe"]);
expect("a step's element is its activity, with the activity's process group; a step without one sits at its function",
  m["f/review#deep"].element === "1.1.1.2" && m["f/review#deep"].process_group === "1.1" && m["f/review#maybe"].element === "1.0" && m["f/review#maybe"].process_group === null, m);

const later = skipped([review], [run("f/review", "2026-06-14T00:00:00.000Z", "done", ["first"]), run("f/review", "2026-06-14T12:00:00.000Z", "done", ["deep", "last"])], now, h);
expect("only the latest reporting run counts, so a step a later run finished is no longer left behind",
  by(later)["f/review#first"] !== undefined && by(later)["f/review#deep"] === undefined, later.map((i) => i.id));
expect("a run recorded after now is not read", skipped([review], [run("f/review", "2026-07-01T00:00:00.000Z", "done", [])], now, h).length === 0);
expect("a failed run reports nothing, because it did not finish", skipped([review], [run("f/review", "2026-06-14T00:00:00.000Z", "failed", ["first"])], now, h).length === 0);

const occurrence = skipped([review], [run("f/review", "2026-06-10T00:00:00.000Z", "skipped"), run("f/review", "2026-06-12T00:00:00.000Z", "skipped")], now, h);
expect("an occurrence a person skipped is one item for the workflow, counted, at its function",
  occurrence.length === 1 && occurrence[0].id === "f/review" && occurrence[0].kind === "workflow" && occurrence[0].count === 2
  && occurrence[0].last === "2026-06-12T00:00:00.000Z" && occurrence[0].element === "1.0" && /2 occurrences in all/.test(occurrence[0].why), occurrence[0]);
expect("an occurrence the workflow has run since says so",
  /It has run since\./.test(skipped([review], [run("f/review", "2026-06-10T00:00:00.000Z", "skipped"), run("f/review", "2026-06-11T00:00:00.000Z", "done")], now, h)[0].why));

const both = skipped([sell, review], [run("f/review", "2026-06-14T00:00:00.000Z", "done", ["first"]), run("g/sell", "2026-06-14T00:00:00.000Z", "done", []), run("f/review", "2026-06-09T00:00:00.000Z", "skipped")], now, h);
expect("the order is the framework's: function, then process group, then activity, then the workflow and its step order",
  both.map((i) => i.id).join(" ") === "f/review f/review#maybe f/review#last f/review#deep g/sell#log g/sell#call", both.map((i) => `${i.element} ${i.id}`));
expect("the same runs in any order give the same list",
  JSON.stringify(skipped([review, sell], [...both.length ? [run("f/review", "2026-06-09T00:00:00.000Z", "skipped"), run("g/sell", "2026-06-14T00:00:00.000Z", "done", []), run("f/review", "2026-06-14T00:00:00.000Z", "done", ["first"])] : []], now, h).map((i) => i.id)) === JSON.stringify(both.map((i) => i.id)));

expect("an item's handback decision id is its own id, flattened", handbackId({ id: "f/review#deep" }) === "skipped-f-review-deep");

// One venture folder: two functions in Discovery, read from the shipped function modules.
const dir = mkdtempSync(join(tmpdir(), "naive-skipped-"));
try {
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v", name: "V", phase: "discovery", departments: ["strategy", "customer-service"] }));
  expect("a venture whose runs reported nothing has nothing left behind", runSync(skippedFor(dir, now)).length === 0);

  const cli = (...a: string[]) => spawnSync(process.execPath, ["packages/naive/src/engine/skipped.ts", dir, ...a], { encoding: "utf8" });
  const record = (...a: string[]) => spawnSync(process.execPath, ["packages/naive/src/engine/due.ts", dir, "record", ...a], { encoding: "utf8" });
  const done = record("strategy/competitor-review", "--at", "2026-06-14T00:00:00.000Z", "--by", "strategy-agent", "--steps", "name-the-decision,identify-competitors,evaluate,feed-decisions");
  expect("naive due record --steps keeps the steps the run finished", done.status === 0 && /having finished name-the-decision/.test(done.stdout), done.stdout + done.stderr);
  expect("a skipped occurrence is recorded the same way", record("strategy/intake", "--at", "2026-06-10T00:00:00.000Z", "--outcome", "skipped", "--by", "a person").status === 0);

  const found = runSync(skippedFor(dir, now));
  const v = by(found);
  expect("the venture's ledger holds the shipped workflow's unfinished steps and the skipped occurrence",
    "strategy/competitor-review#identify-alternatives" in v && "strategy/competitor-review#predict-next-move" in v && "strategy/intake" in v, found.map((i) => i.id));
  expect("identify-alternatives is required and predict-next-move is one to consider",
    v["strategy/competitor-review#identify-alternatives"].required && !v["strategy/competitor-review#predict-next-move"].required);
  expect("an item says what its element feeds downstream, from the element graph",
    v["strategy/competitor-review#identify-alternatives"].blocks.some((b) => b.element === "3.5.1.6" && b.records.includes("competitor")), v["strategy/competitor-review#identify-alternatives"].blocks);
  expect("--function narrows to one function", runSync(skippedFor(dir, now, "strategy")).every((i) => i.function === "strategy"));

  const listed = cli("--at", now, "--json");
  const parsed = JSON.parse(listed.stdout) as { at: string; skipped: SkippedItem[] };
  expect("the command prints the same list as JSON, due ones of the hierarchy first", listed.status === 0 && parsed.at === now && parsed.skipped.length === found.length && parsed.skipped[0].id === found[0].id, listed.stderr);
  const text = cli("--at", now);
  expect("the plain listing gives each item its kind, element and one sentence", text.status === 0
    && /required\s+1\.1\.1\.3\s+strategy\/competitor-review#identify-alternatives/.test(text.stdout) && /in hierarchical order/.test(text.stdout), text.stdout);

  const handed = cli("handback", "strategy/competitor-review#identify-alternatives", "--at", now);
  const file = join(dir, "decisions/skipped-strategy-competitor-review-identify-alternatives.decision.json");
  const d = JSON.parse(readFileSync(file, "utf8")) as { status: string; assigned_to: string; options: string[]; note: string; answer?: string };
  expect("handback files one open decision for the owning function agent with the three recommendations",
    handed.status === 0 && d.status === "open" && d.assigned_to === "strategy-agent" && d.options.join() === "do-now,defer,drop" && /A person decides\.$/.test(d.note), d);
  expect("the note carries why it is skipped and what it blocks", /did not finish this required step/.test(d.note) && /It blocks .*3\.5\.1\.6 Manage opportunity pipeline\./.test(d.note), d.note);
  expect("the decision has no answer: the agent recommends and a person decides", d.answer === undefined);
  const again = cli("handback", "strategy/competitor-review#identify-alternatives", "--at", now);
  expect("a rerun leaves the decision as it is", again.status === 0 && /already asks strategy-agent/.test(again.stdout), again.stdout + again.stderr);
  expect("handback to a role no agent brief exists for is refused", /is not a role to hand work to/.test(cli("handback", "strategy/intake", "--to", "nobody", "--at", now).stderr));
  const toLead = cli("handback", "strategy/intake", "--to", "strategy-lead", "--at", now);
  expect("--to hands it to another agent role instead", toLead.status === 0 && /strategy-lead recommends/.test(toLead.stdout), toLead.stdout + toLead.stderr);
  expect("an item that is not on the ledger is refused, naming the ones that are", /is not on the skipped ledger/.test(cli("handback", "strategy/nope#x", "--at", now).stderr));

  const plan = spawnSync(process.execPath, ["packages/naive/src/engine/loop.ts", dir, "plan", "--at", now], { encoding: "utf8" });
  expect("naive loop plan ends with one line naming how much skipped work waits",
    plan.status === 0 && new RegExp(`skipped\\s+${found.length}\\s+${found.length} items of skipped work waiting`).test(plan.stdout), plan.stdout + plan.stderr);
  const planned = JSON.parse(spawnSync(process.execPath, ["packages/naive/src/engine/loop.ts", dir, "plan", "--at", now, "--json"], { encoding: "utf8" }).stdout) as { skipped: number };
  expect("and its JSON carries the count", planned.skipped === found.length, planned);

  expect("a missing venture folder and a bad command are usage errors", cli("--at", "tomorrow").status === 2 && cli("nonsense").status === 2);
} finally { rmSync(dir, { recursive: true, force: true }); }

if (failed) { console.error(`\n${failed} failed`); process.exit(1); }
console.log("\nskipped: all passed");
