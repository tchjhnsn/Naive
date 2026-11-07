// The autoresearch record types (autoresearch design, build plan item 3; everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md): the recipe, the eval plan, the experiment log, the receptions and
// settles on projected types. The examples validate and agree with each other (the example recipe renders the example
// record in the sandbox, its sha is the one the log and the receptions name, the log's chain holds, the plan's sha is
// its address), the schemas refuse what the design forbids, the data model gives each path its kind, and each
// generator drafts a record that passes its schema.
//   node packages/naive/src/engine/generators/recipes-test.ts
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateFile, validateValue } from "../../records/validate.mjs";
import { pathKind, readDataModel } from "../../records/index.mjs";
import { canonicalJson } from "../../core/signal-id.ts";
import { lineHash } from "../../core/provenance.mjs";
import { recipeExports, runRecipe } from "../recipes/sandbox.ts";
import * as recipe from "./recipe.ts";
import * as evalPlan from "./eval-plan.ts";
import * as experiment from "./experiment.ts";
import * as reception from "./reception.ts";
import type { EvalPlan, Experiment, Reception, Signal } from "../../records/types/records.d.ts";

let fails = 0;
const t = (name: string, ok: boolean, detail = "") => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : `  ${detail}`}`); if (!ok) fails++; };
const ex = new URL("../../records/examples/signals/", import.meta.url).pathname;
const text = (rel: string) => readFileSync(join(ex, rel), "utf8");
const load = <T>(rel: string): T => JSON.parse(text(rel)) as T;
const valid = (name: string, value: unknown) => validateValue(name, value).status === 0;
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

const RECIPE = "competitors/[id]/signals.recipe.ts", PLAN = "competitors/[id]/signals.plan.json", LOG = "competitors/[id]/signals.experiments.jsonl";
const RECORD = "competitors/acme-robotics/signals.json", RECEPTION = "competitors/acme-robotics/signals.reception.json";
const SIGNAL = "library/signals/competitor-funding/acme-robotics/2026-11-05-3a50ad6dfb3a46b0f160cc36.json";

// The examples validate.
const plan = load<EvalPlan>(PLAN);
const lines = text(LOG).split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Experiment);
const rec = load<Reception>(RECEPTION);
t(`${PLAN} passes eval-plan.schema.json`, validateFile("eval-plan.schema.json", join(ex, PLAN)).status === 0);
t(`${LOG}: every line passes experiment.schema.json`, lines.length === 3 && lines.every((l) => valid("experiment.schema.json", l)));
t(`${RECEPTION} passes reception.schema.json`, validateFile("reception.schema.json", join(ex, RECEPTION)).status === 0);
t(`${RECORD} passes competitor-signals.schema.json with its forecast`, validateFile("competitor-signals.schema.json", join(ex, RECORD)).status === 0 && typeof load<{ p_raise_90d: number }>(RECORD).p_raise_90d === "number");

// The example recipe: its exports pass recipe.schema.json, and it renders the example record from the example signal.
const source = text(RECIPE);
const recipeSha = sha256(source);
const sig = load<Signal>(SIGNAL);
const exps = await recipeExports(source, { subjects: [sig.subject], signals: [sig.id] });
t("the example recipe's hears and knobs pass recipe.schema.json", exps.ok && valid("recipe.schema.json", exps.output), exps.ok ? validateValue("recipe.schema.json", exps.output).stdout : exps.reason);
const view = { id: sig.id, type: sig.type, producer: sig.producer, subject: sig.subject, time: Date.parse(sig.time), observed: Date.parse(sig.observed), rating: sig.rating, props: sig.props, withdrawn: false };
const input = { route: "competitors/[id]/signals", id: sig.subject, asOf: Date.parse(rec.as_of), signals: [view] };
const run = await runRecipe(source, input, null, { subjects: [sig.subject], signals: [sig.id] });
t("the example recipe renders the example record exactly, in the sandbox", run.ok && canonicalJson(run.output.record) === canonicalJson(load(RECORD)), run.ok ? JSON.stringify(run.output.record) : run.reason);
const drafted = run.ok ? reception.draft({ record: "competitors/acme-robotics/signals.json", recipe: recipeSha, as_of: rec.as_of, receptions: run.output.receptions as never, signals: [{ id: sig.id, time: sig.time, observed: sig.observed }] }) : null;
t("the receptions generator, given the render, writes the example reception file", drafted?.ok === true && canonicalJson(drafted.draft) === canonicalJson(rec) && drafted.file === RECEPTION);
const withdrawn = await runRecipe(source, { ...input, signals: [{ ...view, withdrawn: true }] }, null);
t("a withdrawn signal stays salient with support withdrawn, and the record has no time to report", withdrawn.ok && withdrawn.output.record === null && withdrawn.output.receptions[0]?.kind === "salient");
const lowRated = await runRecipe(source, { ...input, signals: [{ ...view, rating: { reliability: "D", credibility: 4 } }] }, null);
t("a signal rated below min_rating is noise and the record is null", lowRated.ok && lowRated.output.record === null && lowRated.output.receptions[0]?.kind === "noise");

// The examples agree with each other.
t("the plan's sha is the address of its other fields", evalPlan.planSha(plan as unknown as Record<string, unknown>) === plan.sha);
t("the example plan's windows are ordered and purged", evalPlan.windowProblems(plan).length === 0, evalPlan.windowProblems(plan).join("; "));
t("the log's chain holds", lines.every((l, i) => l.prev === (i === 0 ? "genesis" : lines[i - 1].hash) && l.hash === lineHash(l.prev, l)));
t("every log line names the plan's sha", lines.every((l) => l.plan === plan.sha));
t("the kept candidate is the example recipe's sha, and the discard was edited from it", lines[0].verdict === "keep" && lines[0].candidate === recipeSha && lines[1].verdict === "discard" && lines[1].base === recipeSha);
t("the holdout check is a person's and checks the tip", lines[2].kind === "holdout" && lines[2].actor.kind === "person" && lines[2].candidate === recipeSha);
t("the receptions name the recipe that rendered the record", rec.recipe === recipeSha && rec.record === RECORD);

// What the schemas refuse.
t("plan: an agent's plan fails", !valid("eval-plan.schema.json", { ...plan, made_by: { kind: "agent", id: "researcher" } }));
t("plan: weights outside uniform and cited fail", !valid("eval-plan.schema.json", { ...plan, weights: "recent" }));
t("plan: an empty window fails", !valid("eval-plan.schema.json", { ...plan, windows: { ...plan.windows, holdout: [] } }));
t("plan: a budget of zero fails", !valid("eval-plan.schema.json", { ...plan, budgets: { dev_evaluations: 0, holdout_checks: 1 } }));
const { hash: _h, prev: _p, ...keepBody } = lines[0];
const line = (o: Record<string, unknown>) => ({ ...keepBody, ...o, prev: "genesis", hash: "0".repeat(64) });
const { dev: _dev, ...keepNoDev } = keepBody;
t("experiment: a keep without its dev score fails", !valid("experiment.schema.json", { ...keepNoDev, prev: "genesis", hash: "0".repeat(64) }));
t("experiment: a fail with a dev score fails", !valid("experiment.schema.json", line({ verdict: "fail", reason: "lint" })));
t("experiment: a fail without a reason fails", !valid("experiment.schema.json", (() => { const { dev: _d, reason: _r, kept_as: _k, ...o } = keepBody; return { ...o, verdict: "fail", prev: "genesis", hash: "0".repeat(64) }; })()));
t("experiment: a verdict outside keep, discard and fail fails", !valid("experiment.schema.json", line({ verdict: "maybe" })));
t("experiment: an experiment without its base fails", !valid("experiment.schema.json", (() => { const { base: _b, ...o } = keepBody; return { ...o, prev: "genesis", hash: "0".repeat(64) }; })()));
t("holdout: an agent's holdout check fails", !valid("experiment.schema.json", { ...lines[2], actor: { kind: "agent", via: "mcp" } }));
t("holdout: a holdout line with a verdict fails", !valid("experiment.schema.json", { ...lines[2], verdict: "keep" }));
t("holdout: a holdout line without its result fails", !valid("experiment.schema.json", (() => { const { result: _r, ...o } = lines[2]; return o; })()));
const r0 = rec.receptions[0];
const withOne = (o: Record<string, unknown>) => ({ ...rec, receptions: [{ ...r0, ...o }] });
t("reception: a noise reception without its failed reasons fails", !valid("reception.schema.json", withOne({ kind: "noise", fields: undefined })));
t("reception: a noise reception with its reasons passes", valid("reception.schema.json", (() => { const { fields: _f, ...o } = r0; return { ...rec, receptions: [{ ...o, kind: "noise", failed: [{ predicate: "min_rating", why: "rated below B2" }] }] }; })()));
t("reception: a salient reception with failed reasons fails", !valid("reception.schema.json", withOne({ failed: [{ why: "x" }] })));
t("reception: a hindsight label outside helpful, inert and harmful fails", !valid("reception.schema.json", withOne({ hindsight: { label: "lucky", recipe: recipeSha, at: rec.as_of } })));
t("reception: a hindsight label with the recipe's sha passes", valid("reception.schema.json", withOne({ hindsight: { label: "helpful", recipe: recipeSha, at: rec.as_of, loss_with: 0.2, loss_without: 0.4 } })));
t("reception: a factor left out fails", !valid("reception.schema.json", withOne({ factors: { lag: 1, age: 1 } })));
t("recipe: hears with no signal ranges fails", !valid("recipe.schema.json", { hears: { signals: [] }, knobs: {} }));
t("recipe: a knob that is an object fails", !valid("recipe.schema.json", { hears: { signals: ["competitor-funding@^1"] }, knobs: { nested: { a: 1 } } }));

// windowProblems catches what the schema cannot.
const later = (o: Partial<EvalPlan>) => evalPlan.windowProblems({ ...plan, ...o });
t("plan: a gap shorter than the horizon is refused", later({ gap: "30d" }).some((p) => /gap/.test(p)));
t("plan: dev starting inside the purge is refused", later({ windows: { ...plan.windows, dev: ["2025-07-01T00:00:00Z"] } }).some((p) => /dev starts/.test(p)));
t("plan: a read cut after the first dev point is refused", later({ read_cut: "2026-01-01T00:00:00Z" }).some((p) => /read_cut/.test(p)));
t("plan: a holdout not yet settled when the plan was made is refused", later({ made: "2026-05-01T00:00:00Z" }).some((p) => /holdout outcome/.test(p)));

// The data model.
const model = readDataModel();
t("the data model passes data-model.schema.json", valid("data-model.schema.json", model));
const cs = model.records.find((r: { id: string }) => r.id === "competitor-signals");
t("competitor signals settles its fields and forecasts p_raise_90d by competitor-funding", cs?.settles?.forecasts?.p_raise_90d?.resolved_by?.signals?.[0] === "competitor-funding@^1" && cs?.settles?.loss?.funding?.fn === "set-jaccard");
const settling = (settles: unknown) => valid("data-model.schema.json", { ...model, records: model.records.map((r: { id: string }) => r.id === "competitor-signals" ? { ...r, settles } : r) });
t("settles: abs-scaled without a scale fails", !settling({ ...cs.settles, loss: { first_seen: { fn: "abs-scaled" } } }));
t("settles: a loss outside the catalog fails", !settling({ ...cs.settles, loss: { first_seen: { fn: "squared" } } }));
t("settles: a scale on exact fails", !settling({ ...cs.settles, loss: { first_seen: { fn: "exact", scale: 2 } } }));
t("settles: a forecast with no resolver fails", !settling({ ...cs.settles, forecasts: { p_raise_90d: { window: "90d" } } }));
t("settles: a forecast resolved by a person's decision passes", settling({ ...cs.settles, forecasts: { p_raise_90d: { resolved_by: { decision: "decided-or-dismissed" }, window: "30d" } } }));
const KINDS: [string, string][] = [
  ["competitors/[id]/signals.recipe.ts", "record"], ["competitors/[id]/signals.plan.json", "record"], ["competitors/[id]/signals.experiments.jsonl", "log"],
  ["competitors/acme/signals.reception.json", "record"], ["programs/strategy.md", "record"], [`competitors/[id]/_eval/${plan.sha}/index.json`, "record"],
];
for (const [p, k] of KINDS) {
  let got: string | null = null;
  try { got = pathKind(p, model); } catch (e) { got = (e as Error).message; }
  t(`${p} is a ${k}`, got === k, String(got));
}

// The generators.
for (const g of [recipe, evalPlan, experiment, reception]) t(`${g.record}: describe asks at least one required field`, g.describe().ask.some((q: { required: boolean }) => q.required));
const r = recipe.draft({ pattern: "market/rounds", hears: { signals: ["competitor-funding@^1"], facts: { markets: "foundation/icp.json#markets" } }, knobs: { min_rating: "B2" } });
t("recipe: the draft is market/rounds.recipe.ts, its exports pass and it lints clean", r.ok && r.file === "market/rounds.recipe.ts", (r.errors ?? []).join("; "));
const drun = r.ok && r.draft ? await runRecipe(r.draft, input, null) : null;
t("recipe: the drafted recipe runs in the sandbox, renders no record and calls every signal noise", drun?.ok === true && drun.output.record === null && drun.output.receptions.every((x) => x.kind === "noise"), drun && !drun.ok ? drun.reason : "");
t("recipe: a pattern that is not a route pattern is refused", !recipe.draft({ pattern: "Market Rounds", hears: { signals: ["competitor-funding@^1"] } }).ok);
const { sha: _sha, version: _v, gap: _g, ...answers } = plan;
const pd = evalPlan.draft(answers);
t("eval-plan: the draft fills version, gap and sha, and matches the example", pd.ok && canonicalJson(pd.draft) === canonicalJson(plan) && pd.eval_set === `_eval/${plan.sha}/`);
t("eval-plan: an unpurged plan is refused", !evalPlan.draft({ ...answers, windows: { ...plan.windows, dev: ["2025-07-01T00:00:00Z"] } }).ok);
const hd = experiment.draft({ pattern: plan.pattern, plan: plan.sha, candidate: recipeSha, result: "fail", over_holdout: true, actor: { kind: "person", via: "cli", id: "founder" } });
t("experiment: a holdout check accepted over a fail drafts and chains as a first line", hd.ok && hd.draft?.kind === "holdout" && hd.draft.prev === "genesis" && hd.file === LOG);
const chained = experiment.chainOnto(lines[2].hash, hd.draft as Experiment);
t("experiment: chainOnto chains a line onto the log's last", chained.prev === lines[2].hash && chained.hash === lineHash(chained.prev, chained) && valid("experiment.schema.json", chained));
t("experiment: an experiment without a verdict is refused", !experiment.draft({ pattern: plan.pattern, plan: plan.sha, candidate: recipeSha, base: null, actor: { kind: "agent", via: "mcp" } }).ok);
t("reception: a reception for a signal not heard is refused", !reception.draft({ record: RECORD, recipe: recipeSha, as_of: rec.as_of, receptions: [{ kind: "noise", signal: "000000000000000000000000", why: "x" }], signals: [] }).ok);

if (fails) { console.error(`${fails} check(s) failed`); process.exit(1); }
console.log("autoresearch record types: ok");
