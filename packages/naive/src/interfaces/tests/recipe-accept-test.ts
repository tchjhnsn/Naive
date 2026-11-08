// Tests accepting a recipe and monitoring it through the router (packages/naive/src/router/recipes.ts), the verifier of
// autoresearch build plan item 8: the holdout check's pass, fail and override paths, and a regression raising a
// decision. An agent's smaller keep passes the one-bit holdout check and goes live; a recipe overfit to the time before
// the holdout window is kept on dev, fails the check and stays a draft; a retry reuses the bit and spends nothing; an
// override is logged and spends no second check; an agent never accepts. Then, with the clock pinned later (NAIVE_NOW),
// monitor scores the forward points since the override against the recipe live before it, finds the regression and
// proposes one open rollback decision, and check-recipes finds nothing wrong with the log. The venture is a temporary
// folder.
//
//   node packages/naive/src/interfaces/tests/recipe-accept-test.ts

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { signalId } from "../../core/signal-id.ts";
import { record } from "../../core/provenance.mjs";
import { planRecipe } from "../../engine/recipes/eval-set.ts";
import { decisionFile } from "../../engine/decisions.mjs";
import { checkRecipes } from "../../checks/check-recipes.ts";
import { call } from "../../router/router.mjs";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
const repo = fileURLToPath(new URL("../../../../../", import.meta.url));
const examples = join(repo, "packages/naive/src/records/examples/signals");
const PATTERN = "competitors/[id]/signals", ROUTE = `recipes/${PATTERN}`;
const DAY = 86_400_000;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
const tmp = mkdtempSync(join(tmpdir(), "naive-recipe-accept-"));
const dir = join(tmp, "lab");

// The same four competitors as the eval set test: each round reported by two producers, a low-rated duplicate and a rumor.
const ROUNDS: Record<string, [string, string][]> = {
  "alpha-robotics": [["seed", "2024-02-05"], ["series-a", "2024-11-11"], ["series-b", "2025-09-01"]],
  "beta-labs": [["seed", "2024-03-18"], ["series-a", "2025-02-10"]],
  "gamma-ai": [["seed", "2024-01-22"], ["series-a", "2024-08-19"], ["series-b", "2025-05-05"]],
  "delta-works": [["seed", "2024-04-15"], ["series-a", "2025-07-14"]],
};
const signal = (subject: string, producer: string, series: string, time: string, lag: number, rating: [string, number] = ["B", 2]) => {
  const body = { type: "competitor-funding@1.0", producer, subject, time, observed: iso(Date.parse(`${time}T00:00:00Z`) + lag * DAY),
    props: { org: { name: subject }, round: { series, amount: 1000000, currency: "USD" } }, rating: { reliability: rating[0], credibility: rating[1] }, cites: [] };
  return { ...body, id: signalId(body) };
};
const put = (root: string, s: ReturnType<typeof signal>) => {
  const f = join(dir, root, "signals/competitor-funding", s.subject, `${s.time}-${s.id}.json`);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(s, null, 2) + "\n");
};

const example = readFileSync(join(examples, "competitors/[id]/signals.recipe.ts"), "utf8");
const lines = () => existsSync(join(dir, `${PATTERN}.experiments.jsonl`)) ? readFileSync(join(dir, `${PATTERN}.experiments.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const agentWrite = (source: string, base: string | null, extra: Record<string, unknown> = {}) => call({ venture: "lab", workspace: tmp, route: ROUTE, action: "write", input: { source, base, ...extra }, actor: "agent", actor_id: "strategy-researcher", via: "mcp" });
const draft = join(dir, "_drafts", `${PATTERN.replace(/\//g, "__")}.recipe.ts.draft`);

try {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "lab", name: "Lab", parent: null, phase: "discovery", owner: "self", status: "active",
    layers: { purpose: false, knowledge: { location: "knowledge/" }, operations: false, evidence: false } }) + "\n");
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ traces: true }) + "\n");
  mkdirSync(join(dir, "knowledge"), { recursive: true });
  writeFileSync(join(dir, "knowledge/sources.json"), JSON.stringify({ sources: [
    { id: "lib-a", connector: "filesystem", root: "libs/a", writes: "none", carries: "signals" },
    { id: "lib-b", connector: "filesystem", root: "libs/b", writes: "none", carries: "signals" },
  ], records: {} }, null, 2));
  for (const [subject, rounds] of Object.entries(ROUNDS)) {
    for (const [series, time] of rounds) { put("libs/a", signal(subject, "lib-a/research", series, time, 2)); put("libs/b", signal(subject, "lib-b/news", series, time, 20)); }
    put("libs/a", signal(subject, "lib-a/research", "seed", iso(Date.parse(`${rounds[0][1]}T00:00:00Z`) - 10 * DAY).slice(0, 10), 15, ["D", 4]));
  }
  put("libs/a", signal("beta-labs", "lib-a/research", "series-b", "2025-08-04", 2));

  // After the plan is made, gamma-ai raises again: two producers report it, so it settles, on points the plan never froze.
  put("libs/a", signal("gamma-ai", "lib-a/research", "series-c", "2026-08-03", 2));
  put("libs/b", signal("gamma-ai", "lib-b/news", "series-c", "2026-08-03", 20));

  // A person's live recipe and plan: three dev evaluations and two holdout checks.
  mkdirSync(join(dir, "competitors/[id]"), { recursive: true });
  writeFileSync(join(dir, `${PATTERN}.recipe.ts`), example);
  record(dir, { entity: `${PATTERN}.recipe.ts`, activity: "create", agent: { kind: "person", via: "cli", id: "founder" } });
  const plan = await planRecipe(dir, PATTERN, { by: "founder", made: "2026-06-01T00:00:00Z", budgets: { dev_evaluations: 3, holdout_checks: 2 } });
  if (!plan.ok) throw new Error(`no plan: ${plan.errors.join("; ")}`);
  const live = sha(example);
  const liveNow = () => readFileSync(join(dir, `${PATTERN}.recipe.ts`), "utf8");
  const holdouts = () => lines().filter((l) => l.kind === "holdout");

  // A smaller recipe that behaves the same, and one overfit to the time before the holdout window: it forecasts as
  // the tuned recipe does on training and dev, and 0.99 on every later point.
  const smaller = example.replace(" || input.id === null", "");
  const H = Date.parse(plan.plan.windows.holdout[0]);
  const overfit = smaller.replace("k.raise_base + k.raise_per_month * months", `(input.asOf < ${H} ? k.raise_base + 0.06 * months : 0.99)`);
  if (overfit === smaller) throw new Error("the overfit recipe did not change");

  const monitor = () => call({ venture: "lab", workspace: tmp, route: ROUTE, action: "monitor", actor: "agent", actor_id: "ops", via: "mcp" });
  const accept = (over = false, actor: "person" | "agent" = "person") => call({ venture: "lab", workspace: tmp, route: ROUTE, action: "accept", input: { over_holdout: over }, actor, actor_id: actor === "person" ? "founder" : "ops", via: "cli" });

  const idle = await monitor();
  expect("monitor: nothing has gone live through the log, so there is nothing to monitor", idle.ok && idle.result.status === "idle", idle);

  // Pass: an agent's smaller keep is held, a person accepts it, the check passes and it goes live.
  const kept = await agentWrite(smaller, live);
  expect("setup: the smaller recipe is kept as smaller and held as a draft", kept.ok && kept.result.kept_as === "smaller" && kept.result.draft === true, kept);
  const byAgent = await accept(false, "agent");
  expect("accept: an agent is refused, and nothing is checked or logged", !byAgent.ok && /only a person accepts/.test(String(byAgent.error)) && holdouts().length === 0, byAgent);
  process.env.MENTURA_MODEL = "a-model";
  const masked = await accept();
  delete process.env.MENTURA_MODEL;
  expect("accept: a call as a person while an agent is acting (MENTURA_MODEL) is refused", !masked.ok && /an agent, a-model, is acting/.test(String(masked.error)) && holdouts().length === 0, masked);
  process.env.NAIVE_NOW = "2026-06-02T00:00:00Z";
  const passed = await accept();
  expect("pass: the holdout check passes, the tip is written live and its draft removed", passed.ok && passed.result.result === "pass" && passed.result.over_holdout === false
    && liveNow() === smaller && !existsSync(draft) && !existsSync(`${draft}.gate`), passed);
  const h1 = holdouts();
  expect("pass: one holdout line, the person's, naming the tip, the bit and the accept's provenance line", h1.length === 1 && h1[0].candidate === sha(smaller) && h1[0].result === "pass" && h1[0].over_holdout === false
    && h1[0].actor?.kind === "person" && h1[0].at === "2026-06-02T00:00:00.000Z" && !("dev" in h1[0])
    && readFileSync(join(dir, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).some((e) => e.hash === h1[0].provenance && e.activity === "accept" && e.agent?.kind === "person"), h1);
  const again = await accept();
  expect("pass: accepting again finds nothing held, and logs nothing", !again.ok && /nothing to accept/.test(String(again.error)) && holdouts().length === 1, again);
  process.env.NAIVE_NOW = "2026-06-03T00:00:00Z";
  const waiting = await monitor();
  expect("monitor: right after an accept no forward point has settled", waiting.ok && waiting.result.status === "waiting" && waiting.result.live === sha(smaller) && waiting.result.previous === live, waiting);

  // Fail: the overfit recipe is kept on dev, fails the holdout check and stays a draft.
  const overKept = await agentWrite(overfit, sha(smaller));
  expect("setup: the overfit recipe is kept as better on dev and held", overKept.ok && overKept.result.kept_as === "better" && overKept.result.draft === true, overKept);
  process.env.NAIVE_NOW = "2026-06-04T00:00:00Z";
  const failedCheck = await accept();
  expect("fail: the holdout check fails, the accept is refused with only the bit, and the draft and live recipe stay", !failedCheck.ok && failedCheck.result === "fail" && !/score|loss|margin/.test(String(failedCheck.error))
    && readFileSync(draft, "utf8") === overfit && liveNow() === smaller, failedCheck);
  expect("fail: logged as a holdout line with result fail", holdouts().length === 2 && holdouts()[1].result === "fail" && holdouts()[1].over_holdout === false && holdouts()[1].candidate === sha(overfit));
  const retried = await accept();
  expect("fail: accepting again reuses the bit, runs no check and logs nothing", !retried.ok && retried.retried === true && holdouts().length === 2, retried);

  // Override: the person accepts over the failed check; it is logged, and spends no second check.
  const overruled = await accept(true);
  expect("override: the tip is written live over the failed check, and the draft removed", overruled.ok && overruled.result.over_holdout === true && liveNow() === overfit && !existsSync(draft), overruled);
  expect("override: logged as over_holdout on a third line, while the plan has spent two checks", holdouts().length === 3 && holdouts()[2].over_holdout === true && holdouts()[2].result === "fail"
    && new Set(holdouts().map((l) => l.candidate)).size === 2);

  // Regression: later, the forward points since the override settle, and the overfit recipe forecasts 0.99 on them.
  process.env.NAIVE_NOW = "2027-03-01T00:00:00Z";
  const regressed = await monitor();
  const id = regressed.result?.decision as string | undefined;
  const file = id ? decisionFile(dir, id) : null;
  const filed = file ? JSON.parse(readFileSync(join(dir, file), "utf8")) : null;
  expect("regression: monitor finds the live recipe worse on forward points than the one live before it", regressed.ok && regressed.result.status === "regressed" && regressed.result.live === sha(overfit)
    && regressed.result.previous === sha(smaller) && regressed.result.previous_score < regressed.result.live_score && regressed.result.rows >= 10, regressed);
  expect("regression: one open rollback decision is proposed by the monitor, naming the pattern, and nothing rolls back", regressed.result?.proposed === true && filed?.status === "open"
    && filed?.provenance?.drafted_by?.id === "recipe-monitor" && String(filed?.question).includes(PATTERN) && liveNow() === overfit, filed ?? regressed);
  const twice = await monitor();
  expect("regression: a rerun files nothing new", twice.ok && twice.result.decision === id && twice.result.kept === true, twice);

  const checked = await checkRecipes(dir);
  expect("check-recipes: the log the route wrote, with its holdout lines and override, agrees", checked.recipes === 1 && checked.findings.length === 0, checked.findings);
} finally {
  delete process.env.NAIVE_NOW;
  delete process.env.MENTURA_MODEL;
  rmSync(tmp, { recursive: true, force: true });
}

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
