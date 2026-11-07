#!/usr/bin/env node
// Checks a venture's recipes across files (autoresearch design, everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, build plan item 11). A recipe is <pattern>.recipe.ts beside the
// records it makes; its eval plan is <pattern>.plan.json and its experiment log <pattern>.experiments.jsonl beside it,
// and each record it rendered has <record>.reception.json. For every recipe it checks:
//
//   recipe       it lints in the sandbox (size, no import, no literal holding a subject id or signal address); its hears
//                and knobs pass recipe.schema.json; its pattern is a projected record type (writer projection); every
//                signal type range it hears resolves to a type a library the venture reads holds; every fact it names
//                is a file of a record type
//   plan         it passes eval-plan.schema.json, names the recipe's pattern, its sha is the address of its other
//                fields, and its windows are ordered and purged (windowProblems)
//   log          every line passes experiment.schema.json and names the pattern; the hash chain holds; every line
//                names the plan's sha or its previous one; each experiment was edited from the tip as it stood (a stale
//                base is refused before it is logged, so none may be in the log); a holdout check checks the tip; the
//                dev evaluations (keep and discard; a fail is not counted) and holdout checks of the current plan stay
//                within its budgets; once something went live (a person's write, or an accepted holdout check), the
//                live recipe is the last one that did
//   receptions   each passes reception.schema.json and names its record; it names a recipe the log or the live file
//                knows; every signal it names is in a library the venture reads and was observed by the render; and,
//                when the recipe that rendered it is the live one, the sandbox renders the record again exactly, with
//                the same reception for each signal, and noise has its checked meaning: dropping any one noise signal
//                leaves the record byte for byte the same
//
// A plan or log with no recipe beside it fails. Nothing here scores a recipe: settled loss, dev verdicts and the
// holdout check are build plan items 5 and 8, so the check trusts the scores the log holds and checks only what does
// not depend on them. The recipe input it builds (route, id, asOf, the heard signals in (time, id) order with
// withdrawn as of the render, and named facts read live) is the check's own until rendering through recipes (build
// plan item 9) gives one to share.
//
//   node packages/naive/src/checks/check-recipes.ts [<venture dir> ...] [--json]
//
// With no folder it checks Naive's example venture, packages/naive/src/records/examples/signals/. Exit 1 on any
// failure.

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { globRegExp, readDataModel, venturePaths } from "../records/index.mjs";
import { validateValue } from "../records/validate.mjs";
import { canonicalJson } from "../core/signal-id.ts";
import { lineHash } from "../core/provenance.mjs";
import { hasBlob, readBlob } from "../core/blobs.mjs";
import { lintRecipe, recipeExports, runRecipes } from "../engine/recipes/sandbox.ts";
import type { JsonObject } from "../engine/recipes/sandbox.ts";
import { planSha, windowProblems } from "../engine/generators/eval-plan.ts";
import { fieldOf, findSignal, libraries, mergeTypes, typesIn } from "../engine/signals.ts";
import { resolveType, splitRange } from "../engine/signals/render.ts";
import type { EvalPlan, Experiment, Reception, Signal } from "../records/types/records.d.ts";

export type Finding = { file: string; problem: string };
export type Report = { root: string; recipes: number; findings: Finding[]; notes: string[] };

const repo = new URL("../../../../", import.meta.url).pathname;
export const EXAMPLE = "packages/naive/src/records/examples/signals";
const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const ID = /^[a-z0-9][a-z0-9-]*$/;
type ModelRecord = { id: string; writer?: string; paths?: string[] };

/** Every file under a venture folder, venture-relative, skipping dot, underscore (_eval, _drafts, _private) and node_modules folders. */
function filesOf(root: string, sub = ""): string[] {
  const here = join(root, sub);
  if (!existsSync(here)) return [];
  return readdirSync(here, { withFileTypes: true }).flatMap((e) => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) return e.name.startsWith(".") || e.name.startsWith("_") || e.name === "node_modules" ? [] : filesOf(root, rel);
    return [rel];
  });
}

const readJson = (f: string): unknown => JSON.parse(readFileSync(f, "utf8"));
const firstLine = (s: string) => s.trim().split("\n").find((l) => !/checked against/.test(l)) ?? "";
const schemaProblem = (schema: string, value: unknown): string | null => { const v = validateValue(schema, value); return v.status === 0 ? null : firstLine(v.stdout + v.stderr); };

/** The record files a pattern makes: competitors/[id]/signals makes competitors/<id>/signals.json. */
const recordsOf = (all: readonly string[], pattern: string) => {
  const re = globRegExp(`${pattern.replaceAll("[id]", "*")}.json`);
  return all.filter((f) => re.test(f) && !f.endsWith(".reception.json") && !f.endsWith(".plan.json") && !f.includes("[id]"));
};
/** The id a record path fills into its pattern's [id], or null for a single record. */
function idOf(pattern: string, file: string): string | null {
  const p = pattern.split("/"), f = file.replace(/\.json$/, "").split("/");
  const i = p.indexOf("[id]");
  return i < 0 ? null : f[i] ?? null;
}
/** The subject ids a pattern's collection holds now: the folders and .json files where its [id] sits. */
function subjectsOf(root: string, pattern: string): string[] {
  const i = pattern.split("/").indexOf("[id]");
  if (i < 0) return [];
  const dir = join(root, ...pattern.split("/").slice(0, i));
  if (!existsSync(dir)) return [];
  return [...new Set(readdirSync(dir).map((n) => n.replace(/\.json$/, "")).filter((n) => ID.test(n)))];
}

/** Checks every recipe in one venture folder. */
export async function checkRecipes(rootGiven: string): Promise<Report> {
  const root = resolve(rootGiven);
  const findings: Finding[] = [], notes: string[] = [];
  const fail = (file: string, problem: string) => findings.push({ file, problem });
  const model = readDataModel() as { records: ModelRecord[] };
  const all = filesOf(root);
  const recipes = all.filter((f) => f.endsWith(".recipe.ts")).sort();
  const patterns = new Set(recipes.map((f) => f.slice(0, -".recipe.ts".length)));
  for (const f of all.filter((x) => x.endsWith(".plan.json") || x.endsWith(".experiments.jsonl"))) {
    const p = f.replace(/\.(plan\.json|experiments\.jsonl)$/, "");
    if (!patterns.has(p)) fail(f, `there is no recipe ${p}.recipe.ts beside it`);
  }
  if (!recipes.length) return { root, recipes: 0, findings, notes };

  // The signal types every library the venture reads holds (signal library design), and the libraries for finding signals.
  const libs = await libraries(root);
  for (const l of libs) if (l.problem) notes.push(l.problem);
  const typed = await Promise.all(libs.map((l) => typesIn(l)));
  const merged = mergeTypes(typed.map((t) => t.types));
  for (const p of [...typed.flatMap((t) => t.problems), ...merged.problems]) notes.push(p);
  const types = merged.types;
  const recordTypes = model.records.map((r) => ({ r, res: venturePaths(r).map((v: string) => globRegExp(v)) }));

  for (const file of recipes) {
    const pattern = file.slice(0, -".recipe.ts".length);
    const source = readFileSync(join(root, file), "utf8");
    const live = sha256(source);

    // The recipe's pattern is a projected record type: its records are the projector's alone.
    const projected = model.records.find((r) => r.writer === "projection" && venturePaths(r).some((v: string) => v.replaceAll("*", "[id]") === `${pattern}.json`));
    if (!projected) fail(file, `${pattern} is not a projected record type (writer projection in the data model): a recipe makes only records the projector writes`);

    // Receptions first, so the lint knows every signal address the recipe must not hold as a literal.
    const made = recordsOf(all, pattern);
    const receptionFiles = made.map((f) => f.replace(/\.json$/, ".reception.json")).filter((f) => all.includes(f));
    const receptions = new Map<string, Reception>();
    for (const rf of receptionFiles) {
      let rec: Reception;
      try { rec = readJson(join(root, rf)) as Reception; } catch { fail(rf, "is not JSON"); continue; }
      const bad = schemaProblem("reception.schema.json", rec);
      if (bad) { fail(rf, `does not match reception.schema.json: ${bad}`); continue; }
      receptions.set(rf, rec);
    }
    const heardIds = [...new Set([...receptions.values()].flatMap((r) => r.receptions.map((x) => x.signal)))];
    const subjects = subjectsOf(root, pattern);
    const guard = { subjects, signals: heardIds };

    for (const p of lintRecipe(source, guard)) fail(file, `the sandbox's lint refuses it: ${p}`);
    const exp = await recipeExports(source, guard);
    let hears: { signals?: string[]; facts?: Record<string, string> } = {};
    if (!exp.ok) fail(file, `its exports could not be read in the sandbox: ${exp.reason}`);
    else {
      const bad = schemaProblem("recipe.schema.json", exp.output);
      if (bad) fail(file, `its hears and knobs do not match recipe.schema.json: ${bad}`);
      hears = exp.output.hears as typeof hears;
    }
    for (const range of hears.signals ?? []) {
      const [id, r] = splitRange(range);
      if (!resolveType(types, id, r)) fail(file, `it hears ${range}, but no library this venture reads holds a type ${id} in that range`);
    }
    for (const [name, ref] of Object.entries(hears.facts ?? {})) {
      const f = String(ref).split("#")[0];
      if (!recordTypes.some(({ res }) => res.some((re: RegExp) => re.test(f)))) fail(file, `its fact ${name} reads ${f}, which is not a file of any record type`);
    }

    // The plan.
    const planFile = `${pattern}.plan.json`, logFile = `${pattern}.experiments.jsonl`;
    let plan: EvalPlan | null = null;
    if (all.includes(planFile)) {
      try { plan = readJson(join(root, planFile)) as EvalPlan; } catch { fail(planFile, "is not JSON"); }
      if (plan) {
        const bad = schemaProblem("eval-plan.schema.json", plan);
        if (bad) { fail(planFile, `does not match eval-plan.schema.json: ${bad}`); plan = null; }
      }
      if (plan) {
        if (plan.pattern !== pattern) fail(planFile, `names the pattern ${plan.pattern}, but it sits beside ${pattern}.recipe.ts`);
        const sha = planSha(plan as unknown as Record<string, unknown>);
        if (sha !== plan.sha) fail(planFile, `its sha ${plan.sha} is not the address of its other fields (${sha}): a plan is frozen once made`);
        for (const p of windowProblems(plan)) fail(planFile, p);
      }
    }

    // The log.
    const known = new Set<string>([live]);
    let wentLive: string | null = null;
    if (all.includes(logFile)) {
      if (!all.includes(planFile)) fail(logFile, `there is no plan ${planFile} beside it: every experiment is scored under a plan`);
      const text = readFileSync(join(root, logFile), "utf8");
      const lines: Experiment[] = [];
      text.split("\n").forEach((l, i) => {
        if (!l.trim()) return;
        try { lines.push(JSON.parse(l) as Experiment); } catch { fail(logFile, `line ${i + 1} is not JSON`); }
      });
      const plans = new Set([plan?.sha, (plan as { previous?: string } | null)?.previous].filter((x): x is string => !!x));
      let prev = "genesis", tip: string | null = null, dev = 0, holdouts = 0;
      lines.forEach((x, i) => {
        const at = `line ${i + 1}`;
        const bad = schemaProblem("experiment.schema.json", x);
        if (bad) fail(logFile, `${at} does not match experiment.schema.json: ${bad}`);
        if (x.prev !== prev || x.hash !== lineHash(x.prev, x)) fail(logFile, `${at} breaks the hash chain: the log is append-only`);
        prev = x.hash;
        if (x.pattern !== pattern) fail(logFile, `${at} names the pattern ${x.pattern}`);
        if (plans.size && !plans.has(x.plan)) fail(logFile, `${at} names the plan ${x.plan}, which is neither the plan beside it nor its previous one`);
        known.add(x.candidate);
        const current = x.plan === plan?.sha;
        if (x.kind === "holdout") {
          if (x.candidate !== tip) fail(logFile, `${at} checks ${x.candidate} on holdout, but the tip was ${tip ?? "none"}: a holdout check checks the tip a person accepts`);
          if (current) holdouts++;
          if (x.result === "pass" || x.over_holdout) wentLive = x.candidate;
          return;
        }
        if ((x.base ?? null) !== tip) fail(logFile, `${at} was edited from ${x.base ?? "nothing"}, but the tip was ${tip ?? "none"}: a write from a stale base is refused before it is scored, so it is never logged`);
        if (x.verdict !== "fail" && current) dev++;
        const person = x.actor?.kind === "person";
        if (x.verdict === "keep" || (person && x.verdict === "discard")) tip = x.candidate;
        if (person && x.verdict !== "fail") wentLive = x.candidate;
      });
      if (plan && dev > plan.budgets.dev_evaluations) fail(logFile, `${dev} dev evaluations under plan ${plan.sha}, over its budget of ${plan.budgets.dev_evaluations}`);
      if (plan && holdouts > plan.budgets.holdout_checks) fail(logFile, `${holdouts} holdout checks under plan ${plan.sha}, over its budget of ${plan.budgets.holdout_checks}`);
      if (wentLive && wentLive !== live) fail(file, `its sha is ${live}, but the last recipe that went live in ${logFile} is ${wentLive}: the live recipe was changed outside the router`);
    }

    // Receptions: the recipe that rendered each record, its signals, and noise that is really noise.
    for (const [rf, rec] of receptions) {
      const recordFile = rf.replace(/\.reception\.json$/, ".json");
      if (rec.record !== recordFile) fail(rf, `names the record ${rec.record}, but it sits beside ${recordFile}`);
      if (!known.has(rec.recipe)) { fail(rf, `was rendered by recipe ${rec.recipe}, which neither the live recipe nor ${logFile} knows`); continue; }
      const src = rec.recipe === live ? source : hasBlob(root, rec.recipe) ? readBlob(root, rec.recipe)?.toString("utf8") ?? null : null;
      const asOf = Date.parse(rec.as_of);
      const views: JsonObject[] = [];
      let missing = false;
      for (const x of rec.receptions) {
        const found = await findSignal(libs, x.signal, types);
        if (!found.signal) { fail(rf, `names signal ${x.signal}: ${found.problem ?? "not found"}`); missing = true; continue; }
        const s = found.signal.signal as Signal;
        if (Date.parse(s.observed) > asOf) fail(rf, `heard signal ${s.id}, observed ${s.observed}, after the render as of ${rec.as_of}`);
        const withdrawn = x.withdrawn_at !== null && x.withdrawn_at !== undefined && Date.parse(x.withdrawn_at) <= asOf;
        views.push({ id: s.id, type: s.type, producer: s.producer, subject: s.subject, time: Date.parse(s.time), observed: Date.parse(s.observed), rating: s.rating as unknown as JsonObject, props: s.props as JsonObject, withdrawn });
      }
      if (missing) continue;
      if (src === null) { notes.push(`${rf}: rendered by ${rec.recipe}, whose source is neither live nor in the blob store, so it is not rendered again`); continue; }
      views.sort((a, b) => (Number(a.time) - Number(b.time)) || (String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0));
      const facts: JsonObject = {};
      for (const [name, ref] of Object.entries(hears.facts ?? {})) {
        const [f, field] = String(ref).split("#");
        const value = existsSync(join(root, f)) ? readJson(join(root, f)) : null;
        facts[name] = (field && value !== null ? fieldOf(value, field) : value) as JsonObject;
      }
      const base = { route: pattern, id: idOf(pattern, recordFile), asOf, signals: views, ...(Object.keys(facts).length ? { facts } : {}) };
      const noise = rec.receptions.filter((x) => x.kind === "noise").map((x) => x.signal);
      const calls = [{ input: base, knobs: null }, ...noise.map((id) => ({ input: { ...base, signals: views.filter((v) => v.id !== id) }, knobs: null }))];
      const runs = await runRecipes(src, calls, guard);
      const full = runs[0];
      if (!full?.ok) { fail(rf, `the recipe that rendered it fails in the sandbox now: ${full?.reason ?? "no result"}`); continue; }
      const stored = all.includes(recordFile) ? readJson(join(root, recordFile)) : null;
      if (canonicalJson(full.output.record) !== canonicalJson(stored)) fail(recordFile, `rendering it again as of ${rec.as_of} with recipe ${rec.recipe} gives a different record`);
      for (const x of rec.receptions) {
        const got = full.output.receptions.find((y) => y.signal === x.signal);
        if (got?.kind !== x.kind) fail(rf, `signal ${x.signal} is ${x.kind} here, but rendering again makes it ${String(got?.kind ?? "absent")}`);
      }
      noise.forEach((id, i) => {
        const r = runs[i + 1];
        if (!r?.ok) fail(rf, `rendering without noise signal ${id} fails in the sandbox: ${r?.reason ?? "no result"}`);
        else if (canonicalJson(r.output.record) !== canonicalJson(full.output.record)) fail(rf, `signal ${id} is called noise, but the record changes without it: noise means the record does not depend on the signal`);
      });
    }
  }
  return { root, recipes: recipes.length, findings, notes };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const dirs = argv.filter((a) => !a.startsWith("--"));
  const roots = dirs.length ? dirs : [join(repo, EXAMPLE)];
  const bad = roots.find((d) => !existsSync(d) || !statSync(d).isDirectory());
  if (bad) { console.error(`usage: node packages/naive/src/checks/check-recipes.ts [<venture dir> ...] [--json]: ${bad} is not a folder`); process.exit(2); }
  const reports: Report[] = [];
  for (const r of roots) reports.push(await checkRecipes(r));
  if (json) console.log(JSON.stringify(reports, null, 2));
  else {
    for (const rep of reports) {
      const where = relative(process.cwd(), rep.root) || ".";
      for (const f of rep.findings) console.log(`FAIL  ${where}/${f.file}: ${f.problem}`);
      for (const n of rep.notes) console.log(`note  ${where}: ${n}`);
    }
    const n = reports.reduce((a, r) => a + r.findings.length, 0), count = reports.reduce((a, r) => a + r.recipes, 0);
    console.log(`${n ? "FAIL" : "pass"}  check-recipes: ${count} recipe(s) in ${reports.length} venture folder(s)${n ? `, ${n} problem(s)` : ": every recipe, plan, log and reception agrees"}`);
  }
  process.exit(reports.some((r) => r.findings.length) ? 1 : 0);
}
