// Tests recipe writes through the router (packages/naive/src/router/recipes.ts), the verifier of autoresearch build plan
// item 6: an agent's keep lands as a held draft that becomes the tip, a discard is refused, and a retry spends nothing.
// Also: a stale base is refused and logs nothing, a fail is logged and not counted, a person's keep lands live, the gate
// refuses before anything is spent, the budget stops writes, the evaluator alone writes the log, and the keep's line and
// draft name one judgment span. A recipe file cannot be written around the route: agent-files' write and edit of
// /<pattern>.recipe.ts go to recipes/<pattern> and are scored (a keep is held), and knowledge/recipe refuses a write,
// a person's too, naming recipes/<pattern>. The venture is a temporary folder.
//
//   node packages/naive/src/interfaces/tests/recipe-routes-test.ts

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { signalId } from "../../core/signal-id.ts";
import { record } from "../../core/provenance.mjs";
import { planRecipe } from "../../engine/recipes/eval-set.ts";
import { call, resolve } from "../../router/router.mjs";
import { edit as fileEdit, readRaw as fileRead, write as fileWrite } from "../../router/agent-files.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
const repo = fileURLToPath(new URL("../../../../../", import.meta.url));
const examples = join(repo, "packages/naive/src/records/examples/signals");
const PATTERN = "competitors/[id]/signals", ROUTE = `recipes/${PATTERN}`;
const DAY = 86_400_000;
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
const iso = (ms: number) => new Date(ms).toISOString().replace(/\.\d+Z$/, "Z");
const tmp = mkdtempSync(join(tmpdir(), "naive-recipe-routes-"));
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
const tuned = example.replace("raise_base: 0.05, raise_per_month: 0.02", "raise_base: 0.05, raise_per_month: 0.06");
const tunedSmaller = tuned.replace(" || input.id === null", "");
const thrower = tuned.replace("  const receptions: Reception[] = [];", "  if (input.signals.length > 3) throw new Error(\"too many\");\n  const receptions: Reception[] = [];");
const lines = () => existsSync(join(dir, `${PATTERN}.experiments.jsonl`)) ? readFileSync(join(dir, `${PATTERN}.experiments.jsonl`), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
const agentWrite = (source: string, base: string | null, extra: Record<string, unknown> = {}) => call({ venture: "lab", workspace: tmp, route: ROUTE, action: "write", input: { source, base, ...extra }, actor: "agent", actor_id: "strategy-researcher", via: "mcp" });
// A researcher reads as of a cut; the recipe route answers the tip, which is code and holds no outcome.
let cut: string | null = null;
const read = () => call({ venture: "lab", workspace: tmp, route: ROUTE, action: "read", actor: "agent", actor_id: "strategy-researcher", reads_as_of: cut });
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

  // Routes and refusals that need no plan.
  expect("route: recipes/<pattern> resolves with the pattern, slashes and [id] included", resolve(ROUTE).r?.recipe === true && resolve(ROUTE).params.pattern === PATTERN);
  const noPlan = await agentWrite(example, null);
  expect("refused: no eval plan, nothing scores the write", !noPlan.ok && /no eval plan/.test(String(noPlan.error)), noPlan);
  const badPattern = await call({ venture: "lab", workspace: tmp, route: "recipes/Competitors", action: "write", input: { source: example, base: null } });
  expect("refused: a route that names no pattern", !badPattern.ok && /names no recipe pattern/.test(String(badPattern.error)), badPattern);

  // A person's live recipe and plan. The plan's dev budget is three evaluations.
  mkdirSync(join(dir, "competitors/[id]"), { recursive: true });
  writeFileSync(join(dir, `${PATTERN}.recipe.ts`), example);
  record(dir, { entity: `${PATTERN}.recipe.ts`, activity: "create", agent: { kind: "person", via: "cli", id: "founder" } });
  const plan = await planRecipe(dir, PATTERN, { by: "founder", made: "2026-06-01T00:00:00Z", budgets: { dev_evaluations: 5, holdout_checks: 1 } });
  if (!plan.ok) throw new Error(`no plan: ${plan.errors.join("; ")}`);
  cut = plan.plan.read_cut;
  const live = sha(example);
  const r0 = await read();
  expect("read: the tip is the live recipe, with its source and the budget", r0.ok && r0.result.tip === live && r0.result.source === example && r0.result.draft === false && r0.result.spent.dev_evaluations === 0 && r0.result.spent.of === 5, r0);
  const missingBase = await call({ venture: "lab", workspace: tmp, route: ROUTE, action: "write", input: { source: tuned } });
  expect("refused: a write that names no base", !missingBase.ok && /names its base/.test(String(missingBase.error)), missingBase);

  // Verifier 1: an agent's keep lands as a held draft that becomes the tip.
  const kept = await agentWrite(tuned, live);
  const after1 = lines();
  expect("keep: an agent's better recipe is kept as better", kept.ok && kept.result.verdict === "keep" && kept.result.kept_as === "better", kept);
  expect("keep: it lands as a held draft, and the live recipe is unchanged", kept.ok && kept.result.draft === true && existsSync(draft) && readFileSync(draft, "utf8") === tuned
    && readFileSync(join(dir, `${PATTERN}.recipe.ts`), "utf8") === example && existsSync(`${draft}.gate`) && JSON.parse(readFileSync(`${draft}.gate`, "utf8")).rule === "recipe-keeps-held");
  const r1 = await read();
  expect("keep: the draft is the tip now", r1.ok && r1.result.tip === sha(tuned) && r1.result.source === tuned && r1.result.draft === true && r1.result.live === live, r1.result);
  expect("keep: one experiment line, chained from genesis, naming the candidate, the base and the draft's provenance line",
    after1.length === 1 && after1[0].prev === "genesis" && after1[0].candidate === sha(tuned) && after1[0].base === live && after1[0].verdict === "keep" && typeof after1[0].provenance === "string", after1);
  const prov = readFileSync(join(dir, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const draftLine = prov.find((e) => e.hash === after1[0].provenance);
  expect("keep: the draft's provenance line and the experiment line name one judgment span", !!draftLine?.span && draftLine.span.span_id === after1[0].span?.span_id
    && readFileSync(join(dir, "traces", `${after1[0].span.session ?? after1[0].span.trace_id}.jsonl`), "utf8").includes(`"naive.outcome":"keep"`), [draftLine, after1[0]]);
  expect("keep: the candidate is in the blob store under its sha", existsSync(join(dir, ".naive/blobs", sha(tuned).slice(0, 2), sha(tuned))));
  expect("keep: the evaluator, not the agent, writes the log", prov.some((e) => e.entity === `${PATTERN}.experiments.jsonl` && e.agent?.id === "evaluator"));

  // Verifier 3: a retry spends nothing.
  const retried = await agentWrite(tuned, live);
  expect("retry: the same write answers the logged line and logs nothing", retried.ok && retried.result.retried === true && retried.result.line.hash === after1[0].hash && lines().length === 1, retried);

  // A stale base is refused and logs nothing.
  const stale = await agentWrite(tunedSmaller, live);
  expect("refused: a base that is not the tip, naming the tip, logging nothing", !stale.ok && stale.conflict?.tip === sha(tuned) && lines().length === 1, stale);
  const same = await agentWrite(tuned, sha(tuned));
  expect("refused: a candidate that is the tip already", !same.ok && /tip already/.test(String(same.error)) && lines().length === 1, same);

  // Verifier 2: a discard is refused.
  const discarded = await agentWrite(example, sha(tuned));
  expect("discard: a worse recipe is refused with its verdict", !discarded.ok && discarded.verdict === "discard" && /discarded/.test(String(discarded.error)), discarded);
  expect("discard: logged, counted, and the tip and the draft unchanged", lines().length === 2 && lines()[1].verdict === "discard" && readFileSync(draft, "utf8") === tuned
    && (await read()).result.tip === sha(tuned) && (await read()).result.spent.dev_evaluations === 2);
  const discardAgain = await agentWrite(example, sha(tuned));
  expect("retry: a retried discard answers the same verdict and spends nothing", !discardAgain.ok && discardAgain.retried === true && lines().length === 2 && (await read()).result.spent.dev_evaluations === 2, discardAgain);

  // A fail is logged and not counted.
  const thrown = await agentWrite(thrower, sha(tuned));
  expect("fail: a recipe that throws is refused, logged and not counted", !thrown.ok && thrown.verdict === "fail" && /too many/.test(String(thrown.error)) && lines().length === 3 && (await read()).result.spent.dev_evaluations === 2, thrown);

  // The gate refuses before anything is spent.
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ traces: true, gate: { rules: [{ id: "no-agent-recipes", routes: ["recipes/**"], actors: ["agent"], then: "refuse" }] } }));
  const gated = await agentWrite(tunedSmaller, sha(tuned));
  expect("gate: a rule that refuses agent recipe writes stops the write before it is scored", !gated.ok && gated.gate_rule === "no-agent-recipes" && lines().length === 3, gated);
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ traces: true }));

  // A person's keep lands live and removes the held draft of the earlier tip.
  const person = await call({ venture: "lab", workspace: tmp, route: ROUTE, action: "write", input: { source: tunedSmaller, base: sha(tuned) }, actor: "person", via: "cli" });
  expect("person: a smaller recipe that is no worse is kept as smaller and written live", person.ok && person.result.kept_as === "smaller" && person.result.draft === false
    && readFileSync(join(dir, `${PATTERN}.recipe.ts`), "utf8") === tunedSmaller && !existsSync(draft) && !existsSync(`${draft}.gate`), person);
  const r3 = await read();
  expect("person: the live recipe is the tip, and three dev evaluations are spent", r3.result.tip === sha(tunedSmaller) && r3.result.draft === false && r3.result.spent.dev_evaluations === 3, r3.result);

  // No recipe file is written around the route. The record route refuses, naming recipes/<pattern>, a person included.
  for (const [who, actor] of [["an agent", "agent"], ["a person", "person"]] as const) {
    for (const action of ["write", "append"]) {
      const direct = await call({ venture: "lab", workspace: tmp, route: "knowledge/recipe", action, input: { source: tuned }, actor, actor_id: actor === "agent" ? "strategy-researcher" : undefined });
      expect(`record route: ${who}'s ${action} of knowledge/recipe is refused, naming recipes/<pattern>`, !direct.ok && /write recipes\/<pattern> with \{ source, base \}/.test(String(direct.error)) && direct.fix?.route === "recipes/<pattern>", direct);
    }
  }
  expect("record route: nothing was written or logged", readFileSync(join(dir, `${PATTERN}.recipe.ts`), "utf8") === tunedSmaller && lines().length === 4);

  // Agent files: a recipe file's read is the tip's source, and its edit and write go to recipes/<pattern>, scored.
  const ctx = { venture: "lab", workspace: tmp, actor_id: "strategy-researcher", reads_as_of: cut ?? undefined };
  const FILE = `/${PATTERN}.recipe.ts`;
  const shown = await fileRead(ctx, FILE);
  expect("agent files: reading /<pattern>.recipe.ts gives the tip's source", shown.ok && shown.content === tunedSmaller, shown);
  const leaner = tunedSmaller.replace("first === null || last === null", "last === null");
  const edited = await fileEdit(ctx, FILE, "first === null || last === null", "last === null");
  expect("agent files: an edit is scored through recipes/<pattern>, kept as smaller and held as a draft; the live recipe is unchanged", edited.ok && edited.draft === true && edited.occurrences === 1
    && readFileSync(draft, "utf8") === leaner && readFileSync(join(dir, `${PATTERN}.recipe.ts`), "utf8") === tunedSmaller
    && lines().length === 5 && lines()[4].candidate === sha(leaner) && lines()[4].base === sha(tunedSmaller) && lines()[4].kept_as === "smaller", edited);
  const imported = await fileWrite(ctx, FILE, `import { x } from "y";\n${leaner}`);
  expect("agent files: a whole-file write is scored from the tip as it is; a recipe that fails lint is refused, logged and not counted", !imported.ok && imported.verdict === "fail"
    && lines().length === 6 && lines()[5].base === sha(leaner) && (await read()).result.spent.dev_evaluations === 4, imported);

  const worse = await fileEdit(ctx, FILE, "raise_per_month: 0.06", "raise_per_month: 0.02");
  expect("agent files: an edit that scores worse is refused with its verdict and logged against the draft tip", !worse.ok && worse.verdict === "discard"
    && lines().length === 7 && lines()[6].base === sha(leaner) && readFileSync(draft, "utf8") === leaner && (await read()).result.spent.dev_evaluations === 5, worse);
  // The budget stops writes.
  const over = await agentWrite(tuned, sha(leaner));
  expect("budget: a write once the plan's dev evaluations are spent is refused and logs nothing", !over.ok && /spent its 5 dev evaluations/.test(String(over.error)) && lines().length === 7, over);

  // Nobody but the evaluator writes the log through the router.
  const forged = await call({ venture: "lab", workspace: tmp, route: "evidence/experiment", action: "write", input: lines()[0], actor: "person" });
  expect("log: the experiment log route takes no write", !forged.ok && /has no action write/.test(String(forged.error)), forged);
  const chain = lines();
  expect("log: every line chains onto the one before", chain.every((l, i) => l.prev === (i === 0 ? "genesis" : chain[i - 1].hash)));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(failed === 0 ? "\nall passed" : `\n${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
