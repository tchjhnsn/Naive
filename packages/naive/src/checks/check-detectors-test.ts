// Tests packages/naive/src/checks/check-detectors.ts on made-up ventures in a temp folder: each structural rule
// breaks on a copy, numbers never fail the check, and --propose files a criterion change once, files nothing under
// 30 resolved trials, when the interval includes zero or for a one_way_door detector, and leaves a decided proposal
// alone.
//
//   node packages/naive/src/checks/check-detectors-test.ts

import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { lineHash } from "../core/provenance.mjs";
import { approve } from "../engine/decisions.mjs";
import { checkVenture, compare, proposeCriteria, proposalId, yesAt } from "./check-detectors.ts";
import type { Detector } from "../records/types/records.d.ts";

let failed = 0;
const ok = (cond: boolean, name: string): void => { console.log(`${cond ? "ok  " : "FAIL"}  ${name}`); if (!cond) failed++; };
const root = mkdtempSync(join(tmpdir(), "check-detectors-"));
const DET = "governance/detectors";
const put = (dir: string, rel: string, o: unknown): void => {
  mkdirSync(join(dir, rel, ".."), { recursive: true });
  writeFileSync(join(dir, rel), typeof o === "string" ? o : JSON.stringify(o, null, 2) + "\n");
};

const detector = (id: string, over: Partial<Detector> = {}): Detector => ({
  id,
  title: `Detector ${id}`,
  tier: "low",
  question: { verb: "accept", noun: "routing", asking_function: "products" },
  evidence: { kind: "founder-agent", sensor: "an agent", sources: [{ source: "venture", records: "validation/feedback/[id]" }], scale: { min: 0, max: 1, yes_when: "above" } },
  criterion: { yes: { value: 0.9, set_by: "Torian" } },
  costs: { hit: 1, miss: 1, false_alarm: 1, correct_rejection: 1, set_by: "tier" },
  base_rate: { source: "ledger" },
  resolution: { resolver: { kind: "person", id: "founder" }, time_to_detect: "1w" },
  ...over,
});

type Spec = { score: number; signal: boolean };
type Raw = Record<string, unknown>;
/** Ledger lines for scored trials, each called at the line and resolved by its truth, chained from genesis. */
function ledger(id: string, specs: Spec[], line = 0.9, yesWhen: "above" | "below" = "above", resolve = true): Raw[] {
  const raw: Raw[] = [];
  specs.forEach((s, i) => {
    const call = yesAt(s.score, line, yesWhen) ? "yes" : "no";
    raw.push({ kind: "trial", id: `t${i}`, detector: id, at: "2026-11-01T00:00:00Z", score: s.score, criterion: { yes: line, yes_when: yesWhen }, call });
    if (resolve) raw.push({ kind: "resolution", id: `r${i}`, detector: id, at: "2026-11-02T00:00:00Z", trial: `t${i}`, outcome: call === "yes" ? (s.signal ? "hit" : "false-alarm") : (s.signal ? "miss" : "correct-rejection"), by: { kind: "person", id: "founder" } });
  });
  return chain(raw);
}
function chain(raw: Raw[]): Raw[] {
  let prev = "genesis";
  return raw.map((l) => { const line: Raw = { ...l, prev }; delete line.hash; const hash = lineHash(prev, line); prev = hash; return { ...line, hash }; });
}
const jsonl = (lines: Raw[]): string => lines.map((l) => JSON.stringify(l)).join("\n") + "\n";

// 20 signals scored 0.6 to 0.79 that the 0.9 line misses, and 20 noise trials scored 0.1 to 0.29.
const clear: Spec[] = [...Array.from({ length: 20 }, (_, i) => ({ score: 0.6 + i / 100, signal: true })), ...Array.from({ length: 20 }, (_, i) => ({ score: 0.1 + i / 100, signal: false }))];

const base = join(root, "base");
put(base, "venture.json", { id: "fixture", phase: "discovery" });
put(base, "knowledge/sources.json", { sources: [{ id: "linear", connector: "linear" }] });
put(base, `${DET}/route.json`, detector("route"));
put(base, `${DET}/route.trials.jsonl`, jsonl(ledger("route", clear)));
const copy = (name: string): string => { const d = join(root, name); cpSync(base, d, { recursive: true }); return d; };
const errorsOf = (dir: string): string[] => checkVenture(dir).errors;

// A clean venture passes, and Naive's defaults it has no copy of are named.
const clean = checkVenture(base);
ok(clean.errors.length === 0, `a clean venture has no structural errors${clean.errors.length ? `: ${clean.errors.join("; ")}` : ""}`);
ok(clean.defaults.includes("gate-confidence") && clean.detectors.some((d) => d.id === "gate-confidence" && d.from === "default"), "shipped defaults the venture has no copy of are reported as defaults");
const route = clean.detectors.find((d) => d.id === "route");
ok(route?.from === "venture" && route.resolved === 40 && route.summary?.counts.misses === 20 && route.summary?.counts.correct_rejections === 20, "the report counts the ledger's resolved trials");
ok(route?.summary?.roc_area === 1 && route.base_rate.value === 0.5, "ROC area and the ledger base rate are reported");
ok(route?.comparison?.best.line === 0.6 && route.comparison.current.cost === 0 && route.comparison.best.cost === -1, "expected cost at the current and the best observed line");

// Each structural rule breaks on a copy.
const lines = ledger("route", clear);
{
  const d = copy("edited");
  const edited = lines.map((l, i) => (i === 2 ? { ...l, score: 0.99 } : l));
  put(d, `${DET}/route.trials.jsonl`, jsonl(edited));
  ok(errorsOf(d).some((e) => /chain breaks/.test(e)), "an edited ledger line breaks the chain");
}
{
  const d = copy("dropped");
  put(d, `${DET}/route.trials.jsonl`, jsonl(lines.filter((_, i) => i !== 3)));
  ok(errorsOf(d).some((e) => /chain breaks: prev/.test(e)), "a deleted ledger line breaks the chain");
}
{
  const d = copy("other-detector");
  put(d, `${DET}/route.trials.jsonl`, jsonl(chain(lines.map((l, i) => (i === 0 ? { ...l, detector: "gate-confidence" } : l)))));
  const e = errorsOf(d);
  ok(e.some((x) => /names detector gate-confidence/.test(x)) && !e.some((x) => /chain breaks/.test(x)), "a line naming another detector fails, with the chain intact");
}
{
  const d = copy("unknown-trial");
  put(d, `${DET}/route.trials.jsonl`, jsonl(chain(lines.map((l, i) => (i === 1 ? { ...l, trial: "nope" } : l)))));
  ok(errorsOf(d).some((e) => /resolves nope, which no earlier line is/.test(e)), "a resolution of an unknown trial fails");
}
{
  const d = copy("bad-outcome");
  // t0 (score 0.6) is a no call; resolve it as a hit.
  put(d, `${DET}/route.trials.jsonl`, jsonl(chain(lines.map((l, i) => (i === 1 ? { ...l, outcome: "hit" } : l)))));
  ok(errorsOf(d).some((e) => /a no call cannot resolve as hit/.test(e)), "an outcome the call cannot have fails");
}
{
  const d = copy("twice");
  put(d, `${DET}/route.trials.jsonl`, jsonl(chain([...lines, { ...lines[1], id: "r0-again" }])));
  ok(errorsOf(d).some((e) => /already resolved/.test(e)), "a trial resolved twice fails");
}
{
  const d = copy("not-json-line");
  put(d, `${DET}/route.trials.jsonl`, jsonl(lines) + "{oops\n");
  ok(errorsOf(d).some((e) => /not JSON/.test(e)), "a ledger line that is not JSON fails");
}
{
  const d = copy("no-line-above");
  put(d, `${DET}/route.json`, detector("route", { criterion: { yes: { value: 0.7, set_by: "Torian" }, no: { value: 0.8, set_by: "Torian" } } }));
  ok(errorsOf(d).some((e) => /no line 0.8 must be below the yes line 0.7/.test(e)), "a no line above the yes line fails under yes_when above");
  put(d, `${DET}/route.json`, detector("route", { criterion: { yes: { value: 0.7, set_by: "Torian" }, no: { value: 0.3, set_by: "Torian" } } }));
  ok(errorsOf(d).length === 0, "a no line below the yes line passes under yes_when above");
}
{
  const d = copy("no-line-below");
  const ev = { ...detector("route").evidence, scale: { min: 0, max: 1, yes_when: "below" as const } };
  put(d, `${DET}/route.json`, detector("route", { evidence: ev, criterion: { yes: { value: 0.7, set_by: "Torian" }, no: { value: 0.5, set_by: "Torian" } } }));
  put(d, `${DET}/route.trials.jsonl`, "");
  ok(errorsOf(d).some((e) => /must be above the yes line/.test(e)), "a no line below the yes line fails under yes_when below");
  put(d, `${DET}/route.json`, detector("route", { evidence: ev, criterion: { yes: { value: 0.7, set_by: "Torian" }, no: { value: 0.8, set_by: "Torian" } } }));
  ok(errorsOf(d).length === 0, "a no line above the yes line passes under yes_when below");
}
{
  const d = copy("tier-costs");
  put(d, `${DET}/route.json`, detector("route", { costs: { hit: 1, miss: 5, false_alarm: 1, correct_rejection: 1, set_by: "tier" } }));
  ok(errorsOf(d).some((e) => /set_by tier, but miss is 5 where low sets 1/.test(e)), "costs that disagree with the tier fail when set_by is tier");
  put(d, `${DET}/route.json`, detector("route", { costs: { hit: 1, miss: 5, false_alarm: 1, correct_rejection: 1, set_by: "Torian" } }));
  ok(errorsOf(d).length === 0, "the same costs pass when a person set them");
  put(d, `${DET}/route.json`, detector("route", { tier: "costly", costs: { hit: 1, miss: 3, false_alarm: 1, correct_rejection: 1, set_by: "tier" } }));
  ok(errorsOf(d).length === 0, "costly tier costs (a miss costs 3) pass");
}
{
  const d = copy("one-way-line");
  put(d, `${DET}/route.json`, detector("route", { tier: "one_way_door" }));
  const e = errorsOf(d);
  ok(e.some((x) => /one_way_door detector draws no line/.test(x)) && e.some((x) => /one_way_door detector has no costs/.test(x)), "a one_way_door detector with a line and costs fails");
}
{
  const d = copy("unknown-source");
  put(d, `${DET}/route.json`, detector("route", { evidence: { ...detector("route").evidence, sources: [{ source: "slack", records: "x" }] } }));
  ok(errorsOf(d).some((e) => /evidence source slack is neither venture nor a source/.test(e)), "an evidence source the venture does not list fails");
  put(d, `${DET}/route.json`, detector("route", { evidence: { ...detector("route").evidence, sources: [{ source: "linear", records: "product/bugs" }] } }));
  ok(errorsOf(d).length === 0, "a source listed in knowledge/sources.json passes");
}
{
  const d = copy("unknown-roles");
  put(d, `${DET}/route.json`, detector("route", { resolution: { resolver: { kind: "person", id: "wizard" }, time_to_detect: "1w" } }));
  ok(errorsOf(d).some((e) => /resolver wizard is not a role/.test(e)), "a person resolver that is no role or named person fails");
  put(d, `${DET}/route.json`, detector("route", { resolution: { resolver: { kind: "record", id: "no-such-record" }, time_to_detect: "1w" } }));
  ok(errorsOf(d).some((e) => /resolver record no-such-record is not a record type/.test(e)), "a record resolver that is no record type fails");
  put(d, `${DET}/route.json`, detector("route", { resolution: { resolver: { kind: "record", id: "draft" }, time_to_detect: "1w" } }));
  ok(errorsOf(d).length === 0, "a record resolver naming the gate's drafts passes");
  put(d, `${DET}/route.json`, detector("route", { evidence: { ...detector("route").evidence, kind: "check", sensor: "packages/naive/src/engine/no-such-module.mjs" } }));
  ok(errorsOf(d).some((e) => /sensor packages\/naive\/src\/engine\/no-such-module.mjs is not a file/.test(e)), "a check sensor naming a missing module fails");
  put(d, `${DET}/route.json`, detector("route", { evidence: { ...detector("route").evidence, kind: "person", sensor: "nobody-here" } }));
  ok(errorsOf(d).some((e) => /sensor nobody-here is not a role/.test(e)), "a person sensor that is no role fails");
}
{
  const d = copy("orphan-ledger");
  put(d, `${DET}/ghost.trials.jsonl`, jsonl(ledger("ghost", clear.slice(0, 2))));
  ok(errorsOf(d).some((e) => /a ledger for ghost, which neither the venture nor Naive defines/.test(e)), "a ledger for an undefined detector fails");
}
{
  const d = copy("bad-detector");
  put(d, `${DET}/route.json`, "{ not json");
  ok(errorsOf(d).some((e) => /route.json: not JSON/.test(e)), "a detector file that is not JSON fails");
  put(d, `${DET}/route.json`, { ...detector("route"), id: "other" });
  ok(errorsOf(d).some((e) => /its id is other, not its file name route/.test(e)), "a detector whose id is not its file name fails");
}

// Numbers never fail the check: a detector that is wrong on every call passes.
{
  const d = copy("awful");
  const awful = [...Array.from({ length: 20 }, (_, i) => ({ score: 0.1 + i / 100, signal: true })), ...Array.from({ length: 20 }, (_, i) => ({ score: 0.91 + i / 1000, signal: false }))];
  put(d, `${DET}/route.trials.jsonl`, jsonl(ledger("route", awful)));
  const r = checkVenture(d);
  const run = spawnSync(process.execPath, ["packages/naive/src/checks/check-detectors.ts", d], { encoding: "utf8" });
  ok(r.errors.length === 0 && r.detectors.find((x) => x.id === "route")?.summary?.counts.hits === 0 && run.status === 0, "a detector wrong on every call has no structural error and exits 0");
}
{
  const d = copy("broken-cli");
  put(d, `${DET}/route.trials.jsonl`, jsonl(lines.map((l, i) => (i === 2 ? { ...l, score: 0.99 } : l))));
  const run = spawnSync(process.execPath, ["packages/naive/src/checks/check-detectors.ts", d, "--json"], { encoding: "utf8" });
  ok(run.status === 1 && JSON.parse(run.stdout).errors.length > 0, "the command exits 1 on a structural error and --json carries it");
}

// A yes_when below detector: the best line maps back to a strict line that makes the same calls.
{
  // Noise (should not be held) scored 0.6 to 0.69 sits below a 0.7 line, so it is held; signals score 0.1 to 0.39.
  const below = [...Array.from({ length: 10 }, (_, i) => ({ score: 0.6 + i / 100, signal: false })), ...Array.from({ length: 30 }, (_, i) => ({ score: 0.1 + i / 100, signal: true }))];
  const trials = below.map((s) => ({ score: s.score, call: (s.score < 0.7 ? "yes" : "no") as "yes" | "no", outcome: (s.signal ? "signal" : "noise") as "signal" | "noise" }));
  const c = compare(trials, 0.7, "below", { hit: 1, miss: 3, false_alarm: 1, correct_rejection: 1 });
  const direct = (line: number): number => trials.reduce((sum, t) => { const y = t.score < line; return sum + (t.outcome === "signal" ? (y ? -1 : 3) : (y ? 1 : -1)); }, 0) / trials.length;
  ok(c !== null && c.best.line === 0.6 && Math.abs(direct(c.best.line) - c.best.cost) < 1e-12 && Math.abs(direct(0.7) - c.current.cost) < 1e-12, "under yes_when below the best line is a strict line whose calls give the best cost");
  ok(c !== null && c.excludes_zero && c.per_100.false_alarms === -25, "lowering the gate's line saves its false alarms");
}

// --propose.
{
  const d = copy("propose");
  const first = proposeCriteria(d, checkVenture(d));
  const id = proposalId(checkVenture(d).detectors.find((x) => x.id === "route")!);
  ok(first.length === 1 && first[0].ok && first[0].result?.proposed === id, "a detector with 40 resolved trials and a clearly cheaper line gets one proposal");
  const file = join(d, "decisions", `${id}.decision.json`);
  const rec = JSON.parse(readFileSync(file, "utf8"));
  ok(rec.status === "open" && /^Lower route \(Detector route\)'s yes line from 0.9 to 0.6: at today's costs it saves about 50 misses per 100 calls\./.test(rec.question), `the decision states the change and its effect in plain words: ${rec.question}`);
  ok(JSON.parse(readFileSync(join(d, `${DET}/route.json`), "utf8")).criterion.yes.value === 0.9, "proposing never edits the detector");
  const again = proposeCriteria(d, checkVenture(d));
  ok(again.length === 1 && again[0].result?.kept === id && readFileSync(file, "utf8") === JSON.stringify(rec, null, 2) + "\n", "a rerun keeps the open proposal as it is");
  const decided = approve(d, id, { by: "Torian", answer: "not yet", reasons: [{ kind: "against", claim: "wait for more trials" }] });
  ok(decided.ok, `a person decides the proposal${decided.ok ? "" : `: ${decided.error}`}`);
  const after = readFileSync(file, "utf8");
  const third = proposeCriteria(d, checkVenture(d));
  ok(third[0]?.result?.kept === id && third[0]?.result?.status === "decided" && readFileSync(file, "utf8") === after, "a rerun leaves a decided proposal alone");
  const cli = spawnSync(process.execPath, ["packages/naive/src/checks/check-detectors.ts", d, "--propose", "--json"], { encoding: "utf8" });
  ok(cli.status === 0 && JSON.parse(cli.stdout).proposed[0].result.kept === id, "the command's --propose keeps it too");
}
{
  const d = copy("few");
  put(d, `${DET}/route.trials.jsonl`, jsonl(ledger("route", [...clear.slice(0, 14), ...clear.slice(20, 34)])));
  const r = checkVenture(d);
  ok(proposeCriteria(d, r).length === 0 && /fewer than 30/.test(r.detectors.find((x) => x.id === "route")!.proposal.reason), "28 resolved trials file nothing");
}
{
  const d = copy("unresolved");
  put(d, `${DET}/route.trials.jsonl`, jsonl(ledger("route", clear, 0.9, "above", false)));
  const r = checkVenture(d).detectors.find((x) => x.id === "route")!;
  ok(r.trials === 40 && r.resolved === 0 && proposeCriteria(d, checkVenture(d)).length === 0, "unresolved trials are no data and file nothing");
}
{
  const d = copy("zero");
  // 30 noise trials far below, then signal, noise, signal just under the line: the best line moves one trial.
  const specs = [...Array.from({ length: 30 }, (_, i) => ({ score: 0.1 + i / 100, signal: false })), { score: 0.85, signal: true }, { score: 0.84, signal: false }, { score: 0.83, signal: true }];
  put(d, `${DET}/route.trials.jsonl`, jsonl(ledger("route", specs)));
  const r = checkVenture(d);
  const one = r.detectors.find((x) => x.id === "route")!;
  ok(one.comparison !== null && one.comparison.changed > 0 && !one.comparison.excludes_zero && proposeCriteria(d, r).length === 0, "a cheaper line whose interval includes zero files nothing");
}
{
  const d = copy("one-way");
  const ow = detector("route", { tier: "one_way_door", criterion: { route: "person" } });
  delete ow.costs;
  put(d, `${DET}/route.json`, ow);
  const raw = chain(clear.flatMap((s, i) => [
    { kind: "trial", id: `t${i}`, detector: "route", at: "2026-11-01T00:00:00Z", score: s.score, criterion: { route: "person" }, call: s.score > 0.5 ? "yes" : "no" },
    { kind: "resolution", id: `r${i}`, detector: "route", at: "2026-11-02T00:00:00Z", trial: `t${i}`, outcome: s.score > 0.5 ? "hit" : "correct-rejection", by: { kind: "person", id: "founder" } },
  ]));
  put(d, `${DET}/route.trials.jsonl`, jsonl(raw));
  const r = checkVenture(d);
  ok(r.errors.length === 0 && r.detectors.find((x) => x.id === "route")!.resolved === 40, "a one_way_door detector's ledger is read and reported");
  ok(proposeCriteria(d, r).length === 0 && /one_way_door/.test(r.detectors.find((x) => x.id === "route")!.proposal.reason), "a one_way_door detector never gets a proposal");
}

rmSync(root, { recursive: true, force: true });
console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
