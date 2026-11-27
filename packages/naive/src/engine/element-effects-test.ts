// Tests element state, level and effects over one venture folder made here (EE-190): what belongs to an element,
// each source of evidence (provenance writes and their data category, finished, failed and skipped runs, overdue
// schedules, stale records), propagation from strategy's competitor elements to the pipeline, and naive effects.
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runPromise, runSync } from "../core/effect/run.ts";
import { attachments, evidenceOf, report } from "./element-effects.ts";
import type { ElementReport } from "./element-effects.ts";
import { buildGraph, shippedInput } from "./element-graph.ts";
import { causeKey } from "./element-state.ts";
import type { ElementState } from "./element-state.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 800)}`}`); if (!ok) failed++; };

const g = buildGraph(runSync(shippedInput()));
const att = attachments(g);
expect("an activity's workflows and record types are those of the steps that perform it", JSON.stringify(att.get("1.1.1.1")) === JSON.stringify({ workflows: ["strategy/competitor-review"], records: ["competitor"] }) && JSON.stringify(att.get("3.5.1.6")) === JSON.stringify({ workflows: ["marketing-and-sales/weekly-pipeline-review"], records: ["opportunity"] }), [att.get("1.1.1.1"), att.get("3.5.1.6")]);
expect("a function holds all its workflows and every record type they write", att.get("3.0")!.workflows.length === 5 && att.get("3.0")!.workflows.includes("marketing-and-sales/campaign-daily-review") && att.get("1.0")!.records.includes("competitor") && att.get("1.0")!.records.includes("goal") && !att.get("1.0")!.records.includes("telos"), att.get("1.0"));

const keys = (s: ElementState): string[] => (s.tag === "degraded" ? s.causes.map(causeKey) : []);
const dir = mkdtempSync(join(tmpdir(), "naive-effects-"));
const at = (day: number) => new Date(Date.UTC(2026, 5, day)).toISOString();
const by = async (now: string): Promise<Record<string, ElementReport>> => Object.fromEntries(report(g, await runPromise(evidenceOf(dir, now)), now).map((r) => [r.element.id, r]));
const write = (entity: string, route: string, day: number) => { mkdirSync(join(dir, entity, ".."), { recursive: true }); writeFileSync(join(dir, entity), "{}"); appendFileSync(join(dir, "provenance.jsonl"), `${JSON.stringify({ at: at(day), entity, route, activity: "write" })}\n`); };
const ran = (workflow: string, day: number, outcome = "done") => appendFileSync(join(dir, ".naive/workflow-runs.jsonl"), `${JSON.stringify({ workflow, at: at(day), outcome, by: "a" })}\n`);
try {
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v", name: "V", phase: "discovery", departments: ["strategy", "marketing-and-sales"] }));
  mkdirSync(join(dir, ".naive"));
  const empty = await by(at(2));
  expect("with no records every element is absent at level 0", Object.values(empty).every((r) => r.effective.state.tag === "absent" && r.effective.level === 0) && Object.keys(empty).length === 25);

  write("sales/opportunities/o-1.json", "sales/opportunities/o-1", 1);
  appendFileSync(join(dir, "provenance.jsonl"), `${JSON.stringify({ at: at(1), entity: "competitors/draft.json", route: "purpose/competitor/draft", activity: "draft" })}\n`);
  ran("marketing-and-sales/weekly-pipeline-review", 2);
  const one = await by(at(3));
  expect("a transactional record makes the element that writes it operating", one["3.5.1.2"].effective.own.tag === "operating" && one["3.5.1.2"].quality.level === 1);
  expect("a draft held for a person is not a record written", one["1.1.1.1"].effective.state.tag === "absent");
  expect("the pipeline operates on its own evidence, and is degraded because the competitor elements that feed it are absent", one["3.5.1.6"].effective.own.tag === "operating"
    && ["upstream:1.1.1.1", "upstream:1.1.1.2", "upstream:1.1.1.3"].every((k) => keys(one["3.5.1.6"].effective.state).includes(k)) && one["3.5.1.6"].effective.roots.includes("1.1.1.1"), one["3.5.1.6"].effective);

  write("competitors/acme.json", "purpose/competitor/acme", 3);
  for (const d of [3, 4, 5]) ran("strategy/competitor-review", d);
  const two = await by(at(6));
  expect("a master record and three finished runs make identifying competitors operating at level 3", two["1.1.1.1"].effective.own.tag === "operating" && two["1.1.1.1"].quality.level === 3, two["1.1.1.1"].quality);
  expect("once they operate the pipeline is no longer degraded, and its level is capped by the weakest element that feeds it", two["3.5.1.6"].effective.state.tag === "operating" && two["3.5.1.6"].effective.level === 1 && two["3.5.1.6"].why.some((w) => /1 finished run/.test(w)), two["3.5.1.6"]);
  expect("strategy is degraded by the functions the venture does not list, which feed it and are absent", keys(two["1.0"].effective.state).includes("upstream:2.0") && two["1.0"].why.length >= 2);

  const late = await by(at(10));
  expect("a weekly workflow past its cadence degrades its elements as overdue", keys(late["3.5.1.6"].effective.state).includes("run-overdue:marketing-and-sales/weekly-pipeline-review") && late["3.5.1.6"].effective.own.tag === "degraded");

  ran("strategy/competitor-review", 7, "failed");
  const broke = await by(at(8));
  expect("a failed run degrades its element, holds it at level 1, and degrades the pipeline it feeds", keys(broke["1.1.1.1"].effective.state).join() === "run-failed:strategy/competitor-review" && broke["1.1.1.1"].quality.level === 1 && keys(broke["3.5.1.6"].effective.state).includes("upstream:1.1.1.1"), broke["1.1.1.1"].effective);
  ran("strategy/competitor-review", 8, "skipped");
  expect("a skipped run settles the failure, as a person decided", (await by(at(8)))["1.1.1.1"].effective.own.tag === "operating");

  const year = await by("2027-09-01T00:00:00.000Z");
  expect("a record freshness finds stale degrades the element that writes it", keys(year["1.1.1.1"].effective.own).includes("stale:competitors/acme.json"), year["1.1.1.1"].effective.own);

  const naive = (...a: string[]) => spawnSync(process.execPath, ["packages/naive/src/interfaces/cli/naive.ts", "effects", "--venture", dir, "--at", at(6), ...a], { encoding: "utf8" });
  const all = naive("--json");
  const parsed = JSON.parse(all.stdout) as { elements: ElementReport[] };
  expect("naive effects --json lists every element with its state, level and why", all.status === 0 && parsed.elements.length === 25 && parsed.elements.every((e) => e.why.length > 0 && typeof e.effective.level === "number"), all.stderr);
  const one11 = naive("1.1.1.1", "--json");
  const w = JSON.parse(one11.stdout) as { what_if: { scenario: string, downstream: { id: string, changed: boolean, then: { state: ElementState, level: number } }[] }[] };
  const pipe = (s: string) => w.what_if.find((x) => x.scenario === s)!.downstream.find((d) => d.id === "3.5.1.6")!;
  expect("naive effects <element> gives the what-if: absent degrades the pipeline, strong changes nothing", one11.status === 0 && pipe("absent").changed && keys(pipe("absent").then.state).includes("upstream:1.1.1.1") && !pipe("strong").changed, one11.stderr);
  expect("the text form prints each element and the what-if", /^1\.0 strategy/.test(naive().stdout) && /If 1\.1\.1\.1 were absent/.test(naive("1.1.1.1").stdout));
  expect("an unknown element or a stray argument cannot run", naive("99.9").status === 2 && naive("1.0", "extra").status === 2 && naive("--bogus").status === 2);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("element effects: all passed");
