// Tests naive recipes search (packages/naive/src/router/orchestration/recipe-search.ts), the verifier of autoresearch
// build plan item 10: a fixture venture improves with no model. The search steps the example recipe's knobs, each step
// an experiment write scored by the router; it keeps at least one, the tip's dev loss falls, and the tip differs from the
// start only in knob values. Also: every step is an agent's (knob-search), so a keep is held as a draft and the live
// recipe is unchanged; the evaluator alone writes the log; no candidate is scored twice; the search stops when the
// plan's dev budget is spent; and it refuses with no plan. The ventures are temporary folders, and no model is set.
//
//   node packages/naive/src/interfaces/tests/recipe-search-test.ts

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { signalId } from "../../core/signal-id.ts";
import { record } from "../../core/provenance.mjs";
import { planRecipe } from "../../engine/recipes/eval-set.ts";
import { knobsIn, setKnob } from "../../engine/recipes/knobs.ts";
import { search } from "../../router/orchestration/recipe-search.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 900)}`}`); if (!ok) failed++; };
const repo = fileURLToPath(new URL("../../../../../", import.meta.url));
const example = readFileSync(join(repo, "packages/naive/src/records/examples/signals/competitors/[id]/signals.recipe.ts"), "utf8");
const PATTERN = "competitors/[id]/signals";
const DAY = 86_400_000;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
const tmp = mkdtempSync(join(tmpdir(), "naive-recipe-search-"));
for (const k of ["MENTURA_MODEL", "MENTURA_ACTOR", "MENTURA_ACTOR_ID"]) delete process.env[k];

// The four competitors of the recipe route test: each round reported by two producers, a low-rated duplicate, a rumor.
const ROUNDS: Record<string, [string, string][]> = {
  "alpha-robotics": [["seed", "2024-02-05"], ["series-a", "2024-11-11"], ["series-b", "2025-09-01"]],
  "beta-labs": [["seed", "2024-03-18"], ["series-a", "2025-02-10"]],
  "gamma-ai": [["seed", "2024-01-22"], ["series-a", "2024-08-19"], ["series-b", "2025-05-05"]],
  "delta-works": [["seed", "2024-04-15"], ["series-a", "2025-07-14"]],
};

/** A venture with two signal libraries, the example recipe live as a person's, and a plan with this dev budget. */
async function venture(name: string, budget: number | null): Promise<string> {
  const dir = join(tmp, name);
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
  mkdirSync(join(dir, "knowledge"), { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: name, name, parent: null, phase: "discovery", owner: "self", status: "active",
    layers: { purpose: false, knowledge: { location: "knowledge/" }, operations: false, evidence: false } }) + "\n");
  writeFileSync(join(dir, "knowledge/sources.json"), JSON.stringify({ sources: [
    { id: "lib-a", connector: "filesystem", root: "libs/a", writes: "none", carries: "signals" },
    { id: "lib-b", connector: "filesystem", root: "libs/b", writes: "none", carries: "signals" },
  ], records: {} }, null, 2));
  for (const [subject, rounds] of Object.entries(ROUNDS)) {
    for (const [series, time] of rounds) { put("libs/a", signal(subject, "lib-a/research", series, time, 2)); put("libs/b", signal(subject, "lib-b/news", series, time, 20)); }
    put("libs/a", signal(subject, "lib-a/research", "seed", iso(Date.parse(`${rounds[0][1]}T00:00:00Z`) - 10 * DAY).slice(0, 10), 15, ["D", 4]));
  }
  put("libs/a", signal("beta-labs", "lib-a/research", "series-b", "2025-08-04", 2));
  mkdirSync(join(dir, "competitors/[id]"), { recursive: true });
  writeFileSync(join(dir, `${PATTERN}.recipe.ts`), example);
  record(dir, { entity: `${PATTERN}.recipe.ts`, activity: "create", agent: { kind: "person", via: "cli", id: "founder" } });
  if (budget !== null) {
    const plan = await planRecipe(dir, PATTERN, { by: "founder", made: "2026-06-01T00:00:00Z", budgets: { dev_evaluations: budget, holdout_checks: 1 } });
    if (!plan.ok) throw new Error(`no plan: ${plan.errors.join("; ")}`);
  }
  return dir;
}
const lines = (dir: string) => existsSync(join(dir, `${PATTERN}.experiments.jsonl`)) ? readFileSync(join(dir, `${PATTERN}.experiments.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

try {
  // Refused: nothing scores a step without a plan.
  const bare = await venture("bare", null);
  const none = await search(bare, PATTERN);
  expect("refused: no eval plan, and nothing is written", !none.ok && /no eval plan/.test(String(none.error)) && lines(bare).length === 0, none);

  // The verifier: a fixture venture improves with no model.
  const dir = await venture("lab", 24);
  const r = await search(dir, PATTERN);
  const log = lines(dir);
  const keeps = r.steps.filter((s) => s.verdict === "keep");
  for (const s of r.steps) console.log(`      ${s.verdict.padEnd(7)}  ${s.knob} ${JSON.stringify(s.from)} -> ${JSON.stringify(s.to)}  ${s.reason}`);
  console.log(`      ${r.stopped}`);
  expect("search: it keeps at least one step and moves the tip", r.ok && r.kept >= 1 && keeps.length === r.kept && r.tip !== r.start && r.start === sha(example), r);
  const first = keeps[0]?.dev, last = keeps.at(-1)?.dev;
  expect("search: the tip's dev loss falls below the start's", !!first && !!last && first.tip_score !== null && last.score < first.tip_score, { first, last });
  const tipSource = readFileSync(join(dir, "_drafts", `${PATTERN.replace(/\//g, "__")}.recipe.ts.draft`), "utf8");
  const k0 = knobsIn(example), k1 = knobsIn(tipSource);
  let back = tipSource;
  if (k0.ok) for (const k of k0.knobs) { const e = setKnob(back, k.name, k.value); if (e.ok) back = e.source; }
  expect("search: the tip differs from the start only in knob values", k0.ok && k1.ok && sha(tipSource) === r.tip && back === example
    && JSON.stringify(k0.knobs.map((k) => k.name)) === JSON.stringify(k1.knobs.map((k) => k.name)) && JSON.stringify(k0.knobs.map((k) => k.value)) !== JSON.stringify(k1.knobs.map((k) => k.value)), { k0, k1 });
  expect("search: each knob step reports the value it left and the one it tried", r.steps.every((s) => ["min_rating", "raise_base", "raise_per_month"].includes(s.knob) && JSON.stringify(s.from) !== JSON.stringify(s.to)), r.steps);

  // Every step is a normal experiment write, an agent's.
  expect("writes: one experiment line per step, the evaluator's, naming the agent knob-search", log.length === r.steps.length
    && log.every((l, i) => l.candidate === r.steps[i].candidate && l.verdict === r.steps[i].verdict && l.actor?.kind === "agent" && l.actor?.id === "knob-search"), log.map((l) => [l.verdict, l.actor]));
  const prov = readFileSync(join(dir, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  expect("writes: the log is written by the evaluator only", prov.filter((e) => e.entity === `${PATTERN}.experiments.jsonl`).every((e) => e.agent?.id === "evaluator"));
  expect("writes: a keep is held as a draft, and the live recipe is the person's, unchanged", readFileSync(join(dir, `${PATTERN}.recipe.ts`), "utf8") === example
    && existsSync(join(dir, "_drafts", `${PATTERN.replace(/\//g, "__")}.recipe.ts.draft.gate`)));
  expect("writes: no candidate is scored twice", new Set(log.map((l) => l.candidate)).size === log.length);
  expect("writes: the spent count matches the log's keeps and discards", r.spent === log.filter((l) => l.verdict === "keep" || l.verdict === "discard").length && r.spent <= 24, r);
  expect("search: it stops for a reason it names", r.ok && /no step kept|budget is spent|no step was kept/.test(r.stopped), r.stopped);

  // A search again from the tip writes nothing it has scored, and spends at most what is left.
  const again = await search(dir, PATTERN);
  const log2 = lines(dir);
  expect("again: a second search starts at the tip and scores no candidate twice", again.ok && again.start === r.tip && new Set(log2.map((l) => l.candidate)).size === log2.length, again);

  // The budget stops the search.
  const small = await venture("small", 2);
  const b = await search(small, PATTERN);
  expect("budget: the search stops when the plan's dev evaluations are spent", b.ok && b.spent === 2 && /budget is spent/.test(b.stopped)
    && lines(small).filter((l) => l.verdict === "keep" || l.verdict === "discard").length === 2, b);

  // A factor that is not above 1 is refused.
  const bad = await search(small, PATTERN, { factor: 1 });
  expect("refused: a factor that is not above 1", !bad.ok && /above 1/.test(String(bad.error)), bad);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
