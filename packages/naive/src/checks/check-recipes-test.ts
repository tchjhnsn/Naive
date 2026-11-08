// Breaks check-recipes on copies of the example venture (autoresearch design, everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, build plan item 11): the clean copy passes, and each broken copy
// fails with the problem it was broken for, whether in the recipe, its plan, its experiment log or a reception.
//
//   node packages/naive/src/checks/check-recipes-test.ts

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkRecipes, EXAMPLE } from "./check-recipes.ts";
import { planSha } from "../engine/generators/eval-plan.ts";
import { chainOnto } from "../engine/generators/experiment.ts";
import { signalId } from "../core/signal-id.ts";
import type { EvalPlan, Experiment, Reception } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const RECIPE = "competitors/[id]/signals.recipe.ts", PLAN = "competitors/[id]/signals.plan.json", LOG = "competitors/[id]/signals.experiments.jsonl";
const RECORD = "competitors/acme-robotics/signals.json", RECEPTION = "competitors/acme-robotics/signals.reception.json";
let failed = 0;
const tmp = mkdtempSync(join(tmpdir(), "check-recipes-test-"));
let n = 0;

const copy = (): string => { const d = join(tmp, `v${n++}`); cpSync(join(repo, EXAMPLE), d, { recursive: true }); return d; };
const read = (d: string, f: string) => readFileSync(join(d, f), "utf8");
const json = <T>(d: string, f: string): T => JSON.parse(read(d, f)) as T;
const put = (d: string, f: string, v: unknown) => writeFileSync(join(d, f), typeof v === "string" ? v : JSON.stringify(v, null, 2) + "\n");
const lines = (d: string) => read(d, LOG).split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Experiment);
/** Writes log lines chained afresh, so only the change under test breaks a rule. */
const putLog = (d: string, ls: Experiment[]) => {
  let prev = "genesis";
  const out = ls.map((l) => { const c = chainOnto(prev, l); prev = c.hash; return JSON.stringify(c); });
  put(d, LOG, out.join("\n") + "\n");
};
/** Writes a plan with its sha recomputed, and points the log at it. */
const putPlan = (d: string, p: EvalPlan) => {
  const { sha: _s, ...rest } = p;
  const sha = planSha(rest as Record<string, unknown>);
  put(d, PLAN, { ...rest, sha });
  putLog(d, lines(d).map((l) => ({ ...l, plan: sha })));
};

async function expect(name: string, change: (d: string) => void, problem: RegExp | null): Promise<void> {
  const d = copy();
  change(d);
  const r = await checkRecipes(d);
  const text = r.findings.map((f) => `${f.file}: ${f.problem}`).join("\n");
  const ok = problem === null ? r.findings.length === 0 && r.recipes === 1 : r.findings.some((f) => problem.test(`${f.file}: ${f.problem}`));
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `\n      ${text || "no findings"}`}`);
  if (!ok) failed++;
}

try {
  await expect("the example venture passes", () => {}, null);

  // The recipe.
  await expect("a recipe that imports fails the sandbox's lint", (d) => put(d, RECIPE, `import { x } from "y";\n${read(d, RECIPE)}`), /lint refuses it/);
  await expect("a recipe holding a subject id as a literal fails", (d) => put(d, RECIPE, read(d, RECIPE).replace("const MONTH", 'const WHO = "acme-robotics";\nconst MONTH')), /subject id "acme-robotics"/);
  await expect("a recipe hearing a type no library holds fails", (d) => put(d, RECIPE, read(d, RECIPE).replace('"competitor-funding@^1"', '"rumour@^1"')), /hears rumour@\^1, but no library/);
  await expect("a recipe hearing a type outside every version's range fails", (d) => put(d, RECIPE, read(d, RECIPE).replace('"competitor-funding@^1"', '"competitor-funding@^2"')), /no library this venture reads holds a type competitor-funding/);
  await expect("a fact that is not a file of a record type fails", (d) => put(d, RECIPE, read(d, RECIPE).replace('signals: ["competitor-funding@^1"] }', 'signals: ["competitor-funding@^1"], facts: { notes: "notes/scratch.txt" } }')), /fact notes reads notes\/scratch\.txt/);
  await expect("a recipe for a pattern that is not projected fails", (d) => { cpSync(join(d, RECIPE), join(d, "market-rounds.recipe.ts")); }, /market-rounds is not a projected record type/);
  await expect("hears and knobs outside recipe.schema.json fail", (d) => put(d, RECIPE, read(d, RECIPE).replace('min_rating: "B2"', "min_rating: { nested: 1 }")), /do not match recipe\.schema\.json/);

  // The plan.
  await expect("a plan edited after it was made fails its sha", (d) => put(d, PLAN, { ...json<EvalPlan>(d, PLAN), min_gain: 0.02 }), /not the address of its other fields/);
  await expect("a plan whose dev window starts inside the purge fails", (d) => { const p = json<EvalPlan>(d, PLAN); putPlan(d, { ...p, windows: { ...p.windows, dev: ["2025-07-01T00:00:00Z"] } }); }, /dev starts/);
  await expect("a plan naming another pattern fails", (d) => putPlan(d, { ...json<EvalPlan>(d, PLAN), pattern: "market/rounds" }), /names the pattern market\/rounds/);
  await expect("a plan with no recipe beside it fails", (d) => cpSync(join(d, PLAN), join(d, "market-rounds.plan.json")), /no recipe market-rounds\.recipe\.ts/);
  await expect("a log with no plan beside it fails", (d) => rmSync(join(d, PLAN)), /no plan .*signals\.plan\.json beside it/);

  // The log.
  await expect("an edited log line breaks the chain", (d) => put(d, LOG, read(d, LOG).replace('"score":0.33', '"score":0.29')), /breaks the hash chain/);
  await expect("an experiment from a stale base fails", (d) => { const ls = lines(d); ls[1] = { ...ls[1], base: ls[1].candidate }; putLog(d, ls); }, /line 2 was edited from .*but the tip was/);
  await expect("a log that starts from a recipe kept in the blob store passes", (d) => {
    const before = "// the recipe before the log\n" + read(d, RECIPE);
    const s = createHash("sha256").update(before).digest("hex");
    mkdirSync(join(d, ".naive/blobs", s.slice(0, 2)), { recursive: true });
    writeFileSync(join(d, ".naive/blobs", s.slice(0, 2), s), before);
    const ls = lines(d); ls[0] = { ...ls[0], base: s }; putLog(d, ls);
  }, null);
  await expect("a log that starts from a recipe with no stored source fails", (d) => { const ls = lines(d); ls[0] = { ...ls[0], base: "0".repeat(64) }; putLog(d, ls); }, /line 1 was edited from 0{64}, but the tip was none/);
  await expect("a holdout check of something that is not the tip fails", (d) => { const ls = lines(d); ls[2] = { ...ls[2], candidate: ls[1].candidate }; putLog(d, ls); }, /line 3 checks .* on holdout, but the tip was/);
  await expect("a line naming an unknown plan fails", (d) => { const ls = lines(d); ls[1] = { ...ls[1], plan: "0".repeat(64) }; putLog(d, ls); }, /neither the plan beside it nor its previous one/);
  await expect("dev evaluations over the plan's budget fail", (d) => { const p = json<EvalPlan>(d, PLAN); putPlan(d, { ...p, budgets: { ...p.budgets, dev_evaluations: 1 } }); }, /2 dev evaluations under plan .* over its budget of 1/);
  await expect("a fail is not counted against the budget", (d) => {
    const p = json<EvalPlan>(d, PLAN); putPlan(d, { ...p, budgets: { ...p.budgets, dev_evaluations: 2 } });
    const ls = lines(d);
    const { dev: _d, kept_as: _k, ...body } = ls[1];
    putLog(d, [...ls, { ...body, id: "e3", at: "2026-11-07T16:10:00.000Z", base: ls[0].candidate, verdict: "fail", reason: "the training run threw" } as Experiment]);
  }, null);
  await expect("holdout checks over the plan's budget fail", (d) => { const p = json<EvalPlan>(d, PLAN); putPlan(d, { ...p, budgets: { ...p.budgets, holdout_checks: 1 } }); const ls = lines(d); putLog(d, [...ls, { ...ls[2], id: "h2", candidate: "0".repeat(64) }]); }, /2 holdout checks under plan .* over its budget of 1/);
  await expect("a second line for a tip already checked spends no second check", (d) => { const p = json<EvalPlan>(d, PLAN); putPlan(d, { ...p, budgets: { ...p.budgets, holdout_checks: 1 } }); const ls = lines(d); putLog(d, [...ls, { ...ls[2], id: "h2" }]); }, null);
  await expect("a live recipe changed outside the router fails", (d) => put(d, RECIPE, `${read(d, RECIPE)}// edited by hand\n`), /the live recipe was changed outside the router/);

  // Receptions.
  await expect("a record that the recipe does not render again fails", (d) => put(d, RECORD, { ...json<Record<string, unknown>>(d, RECORD), p_raise_90d: 0.99 }), /signals\.json: rendering it again .* gives a different record/);
  await expect("a reception naming a recipe nobody logged fails", (d) => put(d, RECEPTION, { ...json<Reception>(d, RECEPTION), recipe: "0".repeat(64) }), /which neither the live recipe nor .* knows/);
  await expect("a reception naming a signal no library holds fails", (d) => { const r = json<Reception>(d, RECEPTION); put(d, RECEPTION, { ...r, receptions: [{ ...r.receptions[0], signal: "0".repeat(24) }] }); }, /names signal 0{24}: no library/);
  await expect("a signal heard before it was observed fails", (d) => put(d, RECEPTION, { ...json<Reception>(d, RECEPTION), as_of: "2026-11-06T09:00:00Z" }), /observed .* after the render/);
  await expect("a reception sitting beside another record fails", (d) => put(d, RECEPTION, { ...json<Reception>(d, RECEPTION), record: "competitors/other/signals.json" }), /names the record competitors\/other\/signals\.json/);
  await expect("noise that really is noise passes: the record is the same without it", (d) => {
    const { id: _i, ...body } = json<Record<string, unknown>>(d, "library/signals/competitor-funding/acme-robotics/2026-11-05-3a50ad6dfb3a46b0f160cc36.json");
    const low = { ...body, time: "2026-11-04", observed: "2026-11-05T09:00:00Z", producer: "market-example/rumours", rating: { reliability: "D", credibility: 4 } };
    const id = signalId(low);
    put(d, `library/signals/competitor-funding/acme-robotics/2026-11-04-${id}.json`, { id, ...low });
    const r = json<Reception>(d, RECEPTION);
    put(d, RECEPTION, { ...r, receptions: [...r.receptions, { signal: id, kind: "noise", failed: [{ predicate: "min_rating", why: "rated below B2" }], time: "2026-11-04", observed: "2026-11-05T09:00:00Z", withdrawn_at: null, factors: { lag: 0, age: 0, producer_confirmed: null, producer_withdrawn: null, uptake: null } }] });
  }, null);
  await expect("a heard signal with no reception fails: the render's input is the shared recipe input", (d) => {
    const { id: _i, ...body } = json<Record<string, unknown>>(d, "library/signals/competitor-funding/acme-robotics/2026-11-05-3a50ad6dfb3a46b0f160cc36.json");
    const more = { ...body, time: "2026-11-04", observed: "2026-11-05T09:00:00Z", producer: "market-example/rumours" };
    const id = signalId(more);
    put(d, `library/signals/competitor-funding/acme-robotics/2026-11-04-${id}.json`, { id, ...more });
  }, /heard signal [0-9a-f]{24}, which has no reception/);
  await expect("noise the record depends on fails", (d) => {
    const r = json<Reception>(d, RECEPTION);
    const { fields: _f, ...x } = r.receptions[0] as Reception["receptions"][number] & { fields?: string[] };
    put(d, RECEPTION, { ...r, receptions: [{ ...x, kind: "noise", failed: [{ predicate: "min_rating", why: "said to be noise" }] }] });
  }, /is called noise, but the record changes without it/);

  // The command line.
  const cli = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-recipes.ts")], { encoding: "utf8" });
  const ok = cli.status === 0 && /pass {2}check-recipes: 1 recipe/.test(cli.stdout);
  console.log(`${ok ? "pass" : "FAIL"}  the command checks the example venture with no folder given`);
  if (!ok) failed++;
  const d = copy();
  put(d, LOG, read(d, LOG).replace('"score":0.33', '"score":0.29'));
  const broken = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-recipes.ts"), d, "--json"], { encoding: "utf8" });
  const jok = broken.status === 1 && (JSON.parse(broken.stdout) as { findings: unknown[] }[])[0].findings.length > 0;
  console.log(`${jok ? "pass" : "FAIL"}  the command exits 1 on a broken venture and prints its findings as JSON`);
  if (!jok) failed++;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(failed ? `${failed} failed` : "check-recipes: all pass");
process.exit(failed ? 1 : 0);
