// Tests eval plans and scoring on a venture (packages/naive/src/engine/recipes/eval-set.ts), the verifier of
// autoresearch build plan item 5: the windows are purged, an agent's write resolves nothing, and the verdict is the
// same over two runs. Also: naive recipes plan refuses an agent, check reports noise disagreements, and a recipe that
// throws fails its experiment. Every venture is a temporary folder.
//
//   node packages/naive/src/engine/recipes/eval-set-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { record } from "../../core/provenance.mjs";
import { signalId } from "../../core/signal-id.ts";
import { windowProblems } from "../generators/eval-plan.ts";
import { settledRecord, timeMs } from "./outcomes.ts";
import { checkRecipe, drawWindows, loadEvalSet, loadPlan, planRecipe, scoreExperiment } from "./eval-set.ts";
import type { EvalSet } from "./eval-set.ts";
import type { EvalPlan } from "../../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const repo = fileURLToPath(new URL("../../../../../", import.meta.url));
const examples = join(repo, "packages/naive/src/records/examples/signals");
const PATTERN = "competitors/[id]/signals";
const MADE = "2026-06-01T00:00:00Z";
const DAY = 86_400_000;
const tmp = mkdtempSync(join(tmpdir(), "naive-eval-set-"));
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");

type Spec = { producer: string; series: string; time: string; lag: number; rating?: [string, number] };
const signal = (subject: string, s: Spec) => {
  const body = { type: "competitor-funding@1.0", producer: s.producer, subject, time: s.time, observed: iso(Date.parse(`${s.time}T00:00:00Z`) + s.lag * DAY),
    props: { org: { name: subject }, round: { series: s.series, amount: 1000000, currency: "USD" } }, rating: { reliability: (s.rating ?? ["B", 2])[0], credibility: (s.rating ?? ["B", 2])[1] }, cites: [] };
  return { ...body, id: signalId(body) };
};

// Four competitors. Each round is reported by lib-a two days after it and confirmed by lib-b twenty days after it,
// except a rumor only lib-a reports, and a round a person confirms in the venture's own library.
const ROUNDS: Record<string, [string, string][]> = {
  "alpha-robotics": [["seed", "2024-02-05"], ["series-a", "2024-11-11"], ["series-b", "2025-09-01"]],
  "beta-labs": [["seed", "2024-03-18"], ["series-a", "2025-02-10"]],
  "gamma-ai": [["seed", "2024-01-22"], ["series-a", "2024-08-19"], ["series-b", "2025-05-05"]],
  "delta-works": [["seed", "2024-04-15"], ["series-a", "2025-07-14"]],
};

/** Writes a venture with two signal libraries and the example recipe, and returns its folder. */
function venture(name: string, local: "agent" | "person" | "none"): string {
  const dir = join(tmp, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: name, name, phase: "discovery" }) + "\n");
  mkdirSync(join(dir, "knowledge"), { recursive: true });
  writeFileSync(join(dir, "knowledge/sources.json"), JSON.stringify({ sources: [
    { id: "lib-a", connector: "filesystem", root: "libs/a", writes: "none", carries: "signals" },
    { id: "lib-b", connector: "filesystem", root: "libs/b", writes: "none", carries: "signals" },
  ], records: {} }, null, 2));
  const put = (root: string, sig: ReturnType<typeof signal>) => {
    const f = join(dir, root, "signals/competitor-funding", sig.subject, `${sig.time}-${sig.id}.json`);
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, JSON.stringify(sig, null, 2) + "\n");
    return f.slice(dir.length + 1);
  };
  for (const [subject, rounds] of Object.entries(ROUNDS)) {
    for (const [series, time] of rounds) {
      put("libs/a", signal(subject, { producer: "lib-a/research", series, time, lag: 2 }));
      put("libs/b", signal(subject, { producer: "lib-b/news", series, time, lag: 20 }));
    }
    // A low-rated duplicate the example recipe calls noise.
    put("libs/a", signal(subject, { producer: "lib-a/research", series: "seed", time: iso(Date.parse(`${rounds[0][1]}T00:00:00Z`) - 10 * DAY).slice(0, 10), lag: 15, rating: ["D", 4] }));
  }
  put("libs/a", signal("beta-labs", { producer: "lib-a/research", series: "series-b", time: "2025-08-04", lag: 2 })); // a rumor: one producer only
  put("libs/b", signal("gamma-ai", { producer: "lib-b/news", series: "series-c", time: "2026-05-20", lag: 20 })); // observed after the plan: not frozen
  if (local !== "none") {
    // The local claim: delta-works raised a series-b. lib-a also reports it, so a person's statement settles it.
    put("libs/a", signal("delta-works", { producer: "lib-a/research", series: "series-b", time: "2025-03-03", lag: 2 }));
    const rel = put("raw/signals", signal("delta-works", { producer: `local/${local === "person" ? "founder" : "research-agent"}`, series: "series-b", time: "2025-03-03", lag: 1 }));
    record(dir, { entity: rel, activity: "create", agent: local === "person" ? { kind: "person", via: "cli", id: "founder" } : { kind: "agent", via: "mcp", id: "research-agent" } });
  }
  mkdirSync(join(dir, "competitors/[id]"), { recursive: true });
  cpSync(join(examples, "competitors/[id]/signals.recipe.ts"), join(dir, "competitors/[id]/signals.recipe.ts"));
  return dir;
}

const example = readFileSync(join(examples, "competitors/[id]/signals.recipe.ts"), "utf8");
// The example recipe with a steeper raise forecast, which this data rewards.
const tuned = example.replace("raise_base: 0.05, raise_per_month: 0.02", "raise_base: 0.05, raise_per_month: 0.06");
// A recipe that lists each round once, as the plain fold does: larger, and no better, since set-jaccard reads a
// funding list as a set already.
const deduped = example.replace("  for (const s of input.signals) {", "  const listed: string[] = [];\n  for (const s of input.signals) {")
  .replace("    funding.push({ series:", "    const key = typeof series === \"string\" ? series : \"unknown\";\n    if (!listed.includes(key)) { listed.push(key); funding.push({ series:")
  .replace("support: s.withdrawn ? \"withdrawn\" : \"supported\" });", "support: s.withdrawn ? \"withdrawn\" : \"supported\" }); }");
// A recipe that calls every low-rated signal noise but still lets it set first_seen.
const liar = example.replace("if (!atLeast(s.rating, k.min_rating)) { receptions.push({ kind: \"noise\", signal: s.id, why: `rated below ${k.min_rating}` }); continue; }",
  "if (!atLeast(s.rating, k.min_rating)) { receptions.push({ kind: \"noise\", signal: s.id, why: \"low\" }); first = first === null ? s.time : Math.min(first, s.time); last = last === null ? s.time : Math.max(last, s.time); continue; }");
const thrower = example.replace("  const receptions: Reception[] = [];", "  if (input.signals.length > 3) throw new Error(\"too many\");\n  const receptions: Reception[] = [];");

try {
  // ---- drawWindows ----
  const w = drawWindows(Date.parse("2024-01-01T00:00:00Z"), Date.parse("2026-03-01T00:00:00Z"), 7 * DAY, 90 * DAY, 90 * DAY);
  expect("drawWindows: three windows with purges the plan generator accepts", w !== null && windowProblems({ horizon: "90d", gap: "90d", read_cut: w.read_cut, windows: w.windows, made: "2026-06-01T00:00:00Z" }).length === 0, w);
  expect("drawWindows: too few points for three purged windows gives null", drawWindows(0, 100 * DAY, 7 * DAY, 90 * DAY, 90 * DAY) === null);

  // ---- Plan ----
  const dir = venture("agent", "agent");
  const r = await planRecipe(dir, PATTERN, { by: "founder", made: MADE });
  expect("plan: a person's plan writes <pattern>.plan.json and freezes _eval/<sha>/, every signal file read", r.ok && r.problems.length === 0 && loadPlan(dir, PATTERN)?.sha === r.plan.sha && loadEvalSet(dir, r.plan.sha) !== null, r);
  if (!r.ok) throw new Error("no plan; the rest needs one");
  const plan = loadPlan(dir, PATTERN) as EvalPlan, set = loadEvalSet(dir, plan.sha) as EvalSet;
  const provenance = readFileSync(join(dir, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { entity: string; agent?: { kind: string } });
  expect("plan: provenance logs the plan and the eval set as a person's", [PATTERN + ".plan.json", `_eval/${plan.sha}/eval-set.json`].every((e) => provenance.some((p) => p.entity === e && p.agent?.kind === "person")));

  // ---- Verifier 1: the windows are purged ----
  expect("purged: the plan's windows pass windowProblems", windowProblems(plan).length === 0, windowProblems(plan));
  const lastTraining = Math.max(...plan.windows.training.map(Date.parse)), firstDev = Math.min(...plan.windows.dev.map(Date.parse));
  const lastDev = Math.max(...plan.windows.dev.map(Date.parse)), firstHoldout = Math.min(...plan.windows.holdout.map(Date.parse));
  const H = 90 * DAY;
  expect("purged: dev starts more than a horizon after training, holdout more than a horizon after dev", firstDev - lastTraining > H && firstHoldout - lastDev > H);
  expect("purged: read_cut is after the last training outcome settles and before the first dev point", Date.parse(plan.read_cut) >= lastTraining + H && Date.parse(plan.read_cut) < firstDev);
  const beforeCut = set.index.filter((k) => timeMs(k.signal.observed) <= Date.parse(plan.read_cut));
  const training = set.rows.filter((x) => x.window === "training");
  expect("purged: every training row's settled record is known by read_cut, from the signals observed by then alone",
    training.length > 0 && training.every((x) => JSON.stringify(settledRecord(beforeCut, set.types, PATTERN, x.subject, Date.parse(x.point), H)) === JSON.stringify(x.settled)));
  expect("purged: no signal observed after the plan was made is in the frozen index", set.index.every((k) => timeMs(k.signal.observed) <= Date.parse(MADE)) && !set.index.some((k) => k.signal.props.round && (k.signal.props.round as { series: string }).series === "series-c"));
  const shortGap = await planRecipe(venture("short-gap", "none"), PATTERN, { by: "founder", made: MADE, gap: "30d" });
  expect("purged: a plan with a gap shorter than the horizon is refused", !shortGap.ok && /gap/.test(shortGap.errors.join(" ")), shortGap);
  expect("purged: every window has its min_counts of rows", r.rows.training >= 20 && r.rows.dev >= 10 && r.rows.holdout >= 10, r.rows);

  // ---- Verifier 2: an agent's write resolves nothing ----
  const none = venture("none", "none"), person = venture("person", "person");
  const rn = await planRecipe(none, PATTERN, { by: "founder", made: MADE }), rp = await planRecipe(person, PATTERN, { by: "founder", made: MADE });
  if (!rn.ok || !rp.ok) throw new Error("the comparison plans failed");
  const setNone = loadEvalSet(none, rn.plan.sha) as EvalSet, setPerson = loadEvalSet(person, rp.plan.sha) as EvalSet;
  const outcomes = (s: EvalSet) => JSON.stringify(s.rows.map((x) => [x.key, x.settled, x.outcomes]));
  const delta = (s: EvalSet) => s.rows.filter((x) => x.subject === "delta-works");
  expect("agent: the agent's local signal is in the index as no one's", set.index.some((k) => k.library === "local" && k.by === "other"));
  // lib-a's report of the same round is in both ventures; only the person's statement can confirm it.
  const noneAlsoA = venture("none-with-a", "none");
  const a = signal("delta-works", { producer: "lib-a/research", series: "series-b", time: "2025-03-03", lag: 2 });
  mkdirSync(join(noneAlsoA, "libs/a/signals/competitor-funding/delta-works"), { recursive: true });
  writeFileSync(join(noneAlsoA, "libs/a/signals/competitor-funding/delta-works", `${a.time}-${a.id}.json`), JSON.stringify(a));
  const ra = await planRecipe(noneAlsoA, PATTERN, { by: "founder", made: MADE });
  if (!ra.ok) throw new Error("the lib-a-only plan failed");
  const setA = loadEvalSet(noneAlsoA, ra.plan.sha) as EvalSet;
  expect("agent: every settled record and outcome is the same as with no local signal at all", outcomes(set) === outcomes(setA), delta(set).find((x, i) => JSON.stringify(x.settled) !== JSON.stringify(delta(setA)[i]?.settled)));
  expect("agent: a person's same statement settles the round", outcomes(setPerson) !== outcomes(setA)
    && delta(setPerson).some((x) => (x.settled?.funding as { series: string }[] | undefined)?.some((f) => f.series === "series-b")), delta(setPerson).at(-1));
  expect("agent: with no local signal and no second producer, the round never settles", delta(setNone).every((x) => !(x.settled?.funding as { series: string }[] | undefined)?.some((f) => f.series === "series-b")));
  const cliEnv = { ...process.env, MENTURA_ACTOR: "agent", MENTURA_ACTOR_ID: "research-agent" };
  const cli = spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/naive.mjs"), "recipes", "plan", PATTERN, "--by", "founder", "--venture", none], { encoding: "utf8", env: cliEnv });
  expect("agent: naive recipes plan refuses an agent", cli.status === 1 && /agent \(research-agent\) is acting/.test(cli.stderr), [cli.status, cli.stderr, cli.stdout]);
  const noBy = await planRecipe(none, PATTERN, {});
  expect("agent: a plan names the person who made it", !noBy.ok && /--by/.test(noBy.errors[0]));

  // ---- Verifier 3: the same verdict over two runs ----
  const first = await scoreExperiment(set, plan, tuned, example), second = await scoreExperiment(set, plan, tuned, example);
  expect("verdict: identical over two runs", JSON.stringify(first) === JSON.stringify(second), [first, second]);
  expect("verdict: a steeper raise forecast beats the example recipe on dev by the margin and is kept as better", first.verdict === "keep" && "kept_as" in first && first.kept_as === "better", first);
  const backwards = await scoreExperiment(set, plan, example, tuned);
  expect("verdict: the reverse is discarded", backwards.verdict === "discard", backwards);
  const bigger = await scoreExperiment(set, plan, deduped, example), smaller = await scoreExperiment(set, plan, example, deduped);
  expect("verdict: a larger recipe that scores the same is discarded; the smaller one is kept as smaller",
    bigger.verdict === "discard" && smaller.verdict === "keep" && "kept_as" in smaller && smaller.kept_as === "smaller", [bigger, smaller]);
  const firstWrite = await scoreExperiment(set, plan, example, null);
  expect("verdict: a first write is scored against the plain fold, tip_score null", firstWrite.verdict !== "fail" && "dev" in firstWrite && firstWrite.dev.tip_score === null, firstWrite);
  const again = await scoreExperiment(loadEvalSet(dir, plan.sha) as EvalSet, loadPlan(dir, PATTERN) as EvalPlan, example, null);
  expect("verdict: identical when the set is read again from disk", JSON.stringify(again) === JSON.stringify(firstWrite));

  // ---- Fails, and check ----
  const thrown = await scoreExperiment(set, plan, thrower, example);
  expect("fail: a recipe that throws fails the experiment", thrown.verdict === "fail" && "reason" in thrown && /too many/.test(thrown.reason), thrown);
  const lied = await scoreExperiment(set, plan, liar, example);
  expect("fail: a recipe whose noise changes its record fails the experiment", lied.verdict === "fail" && "reason" in lied && /noise that is not/.test(lied.reason), lied);
  const checked = await checkRecipe(dir, PATTERN);
  expect("check: the example recipe's training rows, losses, settled and predicted records, and no disagreement",
    checked.ok && checked.rows.length === r.rows.training && checked.rows.every((x) => "settled" in x && "predicted" in x && typeof x.loss === "number") && checked.disagreements.length === 0, checked.ok ? checked.disagreements : checked);
  const checkedLiar = await checkRecipe(dir, PATTERN, liar);
  expect("check: reports each noise disagreement", checkedLiar.ok && checkedLiar.disagreements.length > 0 && checkedLiar.disagreements.every((d) => d.without !== undefined), checkedLiar.ok ? checkedLiar.disagreements.length : checkedLiar);
  const cliCheck = spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/naive.mjs"), "recipes", "check", PATTERN, "--venture", dir], { encoding: "utf8" });
  expect("check: naive recipes check prints the training loss beside the plain fold's", cliCheck.status === 0 && /training loss .* \(plain fold .*\) over \d+ rows/.test(cliCheck.stdout), [cliCheck.status, cliCheck.stderr, cliCheck.stdout.slice(0, 300)]);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
