// Recipe writes through the router (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "Keep and
// discard through the router", build plan item 6). The route is recipes/<pattern> (recipes/competitors/[id]/signals).
//
//   read    { pattern, tip, source, live, draft, plan, spent }: the tip is the recipe a write edits from (the last kept
//           candidate in the experiment log, else the live <pattern>.recipe.ts, else none), with its source and sha
//   write   { source, base }: one experiment. base is the tip's sha the source was edited from, or null for a recipe's
//           first write. In order, under one lock per pattern:
//             1. a retry (the same plan, candidate and base already logged) answers the logged line and spends nothing;
//             2. a base that is not the tip is refused, naming the tip, and logs nothing; so is a candidate that is the
//                tip, and a plan whose dev budget is spent (counted from the log for the plan's sha);
//             3. the venture's gate is asked first, so a refusal spends nothing;
//             4. the candidate is scored (engine/recipes/eval-set.ts scoreExperiment: lint, training, dev against the tip
//                on paired rows, or against the plain fold for a first write), inside a judgment span when traces are on;
//             5. a keep lands: an agent's is held as a draft by the gate (the evidence package's recipe-keeps-held rule)
//                and becomes the tip, a person's is written live and removes a held draft of an earlier tip; a discard
//                or a fail lands nothing;
//             6. the experiment line is appended to <pattern>.experiments.jsonl, hash-chained, with the candidate stored
//                by its sha in the blob store and the span named; a discard or fail answers ok false with its verdict.
//
// The evaluator writes the log; no route appends to it, so an agent cannot supply a score. Accept with the holdout check
// is build plan item 8 (not built).
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readBlob, writeBlob } from "../core/blobs.mjs";
import { tracing, withSpan } from "../core/instrumentation.mjs";
import { agentFromEnv, entries, record as prov } from "../core/provenance.mjs";
import { ventureFile } from "../core/venture-paths.mjs";
import { validateValue } from "../records/validate.mjs";
import { loadEvalSet, loadPlan, scoreExperiment } from "../engine/recipes/eval-set.ts";
import type { Scored } from "../engine/recipes/eval-set.ts";
import { chainOnto } from "../engine/generators/experiment.ts";
import { gateWrite, heldDraft } from "./gate-hooks.mjs";
import type { EvalPlan, Experiment } from "../records/types/records.d.ts";

type Obj = Record<string, unknown>;
type Answer = { ok: boolean; [k: string]: unknown };
type Agent = { kind: string; via?: string; id?: string; [k: string]: unknown };
type Tip = { sha: string; source: string; from: "log" | "live" };
export type RecipeCall = {
  dir: string; r: Obj; route: string; pattern: string | undefined; action: string; input: unknown; actor: string; actor_id?: string; via?: string;
  provenance?: { agent?: Obj; note?: string; derived_from?: string[]; confidence?: number | string | null };
};

/** A pattern as the eval plan schema has it: segments of lowercase words, or a literal [id]. */
export const PATTERN = /^[a-z0-9][a-z0-9-]*(\/([a-z0-9][a-z0-9-]*|\[id\]))*$/;
const SHA = /^[0-9a-f]{64}$/;
/** Who writes the experiment log: the router's own code, never a caller. */
export const EVALUATOR = Object.freeze({ kind: "agent", id: "evaluator", via: "router" });

const sha = (s: string | Buffer): string => createHash("sha256").update(s).digest("hex");
export const liveFile = (pattern: string) => `${pattern}.recipe.ts`;
export const logFile = (pattern: string) => `${pattern}.experiments.jsonl`;
// The router's own draft path (router.mjs draftPath): _drafts/<file with / as __>.draft.
export const draftFile = (file: string) => `_drafts/${file.replace(/\//g, "__")}.draft`;

/** The experiment log's lines, oldest first. */
export function logLines(dir: string, pattern: string): Experiment[] {
  const f = ventureFile(dir, logFile(pattern));
  return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as Experiment) : [];
}

/** The tip: the last kept candidate in the log (its source from the blob store), else the live recipe, else null. */
export function tipOf(dir: string, pattern: string, lines: readonly Experiment[] = logLines(dir, pattern)): Tip | null {
  const kept = lines.filter((l) => l.kind === "experiment" && l.verdict === "keep").at(-1);
  if (kept) {
    const bytes = readBlob(dir, kept.candidate);
    if (!bytes) throw new Error(`the blob store has no source for the tip ${kept.candidate}`);
    return { sha: kept.candidate, source: bytes.toString("utf8"), from: "log" };
  }
  const live = ventureFile(dir, liveFile(pattern));
  if (!existsSync(live)) return null;
  const source = readFileSync(live, "utf8");
  return { sha: sha(source), source, from: "live" };
}

/** Dev evaluations spent under a plan: its keep and discard lines. A fail is logged and not counted. */
export const spentUnder = (lines: readonly Experiment[], plan: string) => lines.filter((l) => l.kind === "experiment" && l.plan === plan && (l.verdict === "keep" || l.verdict === "discard")).length;

/** Runs fn holding the pattern's lock, so a base check, a score and an append are one step. A lock older than ten
 *  minutes is taken as left by a process that died. */
async function locked<T>(dir: string, pattern: string, fn: () => Promise<T>): Promise<T> {
  const lock = ventureFile(dir, `.naive/recipes/${sha(pattern).slice(0, 16)}.lock`);
  mkdirSync(dirname(lock), { recursive: true });
  const STALE = 10 * 60_000, until = Date.now() + STALE;
  for (;;) {
    try { closeSync(openSync(lock, "wx")); break; } catch (e) {
      if ((e as { code?: string }).code !== "EEXIST") throw e;
      try { if (Date.now() - statSync(lock).mtimeMs > STALE) { rmSync(lock, { force: true }); continue; } } catch { continue; }
      if (Date.now() > until) throw new Error(`another write to recipes/${pattern} holds its lock`);
      await new Promise((ok) => setTimeout(ok, 50));
    }
  }
  try { return await fn(); } finally { rmSync(lock, { force: true }); }
}

/** Appends one experiment line, chained to the line before and checked against its schema, and logs it in provenance as
 *  the evaluator's. */
function appendExperiment(dir: string, pattern: string, route: string, line: Omit<Experiment, "prev" | "hash">): Experiment {
  const file = ventureFile(dir, logFile(pattern));
  const before = existsSync(file) ? readFileSync(file, "utf8") : "";
  const last = logLines(dir, pattern).at(-1);
  const chained = chainOnto(last ? last.hash : "genesis", line);
  const v = validateValue("experiment.schema.json", chained);
  if (v.status !== 0) throw new Error(`the experiment line does not match experiment.schema.json: ${(v.stdout || v.stderr).trim()}`);
  const text = JSON.stringify(chained) + "\n";
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, text);
  prov(dir, { entity: logFile(pattern), route, activity: "write", agent: { ...EVALUATOR }, sha256: sha(before + text), note: `experiment ${chained.id}: ${chained.verdict}` });
  return chained;
}

/** The answer for a logged line: a keep is ok, with where it landed; a discard or fail is refused with its verdict. */
function answer(dir: string, line: Experiment, extra: Obj = {}): Answer {
  if (line.verdict === "keep") {
    const landed = line.provenance ? (entries(dir) as { hash: string; entity: string; activity: string }[]).find((e) => e.hash === line.provenance) : undefined;
    return { ok: true, result: { verdict: "keep", kept_as: line.kept_as, tip: line.candidate, written: landed?.entity ?? null, draft: landed?.activity === "draft",
      dev: line.dev, training: line.training, reason: line.reason, line, note: landed?.activity === "draft" ? "kept: held as a draft that is now the tip, for a person to accept" : "kept: written live, and now the tip", ...extra } };
  }
  return { ok: false, outcome: line.verdict, verdict: line.verdict, error: `${line.verdict === "discard" ? "discarded" : "failed"}: ${line.reason ?? "no reason given"}`, line, ...extra };
}

/** One action on recipes/<pattern>: read or write (see the top of this file). */
export async function recipeAction(c: RecipeCall): Promise<Answer> {
  const { dir, pattern } = c;
  if (!pattern || !PATTERN.test(pattern)) return { ok: false, error: `${c.route} names no recipe pattern: recipes/<pattern>, where the pattern is a route of lowercase words and [id] (recipes/competitors/[id]/signals)` };
  const plan = loadPlan(dir, pattern);
  if (c.action === "read") {
    const lines = logLines(dir, pattern), tip = tipOf(dir, pattern, lines);
    const liveAt = ventureFile(dir, liveFile(pattern));
    const live = existsSync(liveAt) ? sha(readFileSync(liveAt)) : null;
    return { ok: true, result: { pattern, tip: tip?.sha ?? null, source: tip?.source ?? null, live, draft: !!tip && tip.sha !== live, plan: plan?.sha ?? null,
      spent: plan ? { dev_evaluations: spentUnder(lines, plan.sha), of: plan.budgets.dev_evaluations } : null, experiments: lines.length } };
  }
  if (c.action !== "write") return { ok: false, error: `recipes/${pattern} has no action ${c.action}` };
  const input = c.input as { source?: unknown; base?: unknown } | null;
  if (!input || typeof input !== "object" || typeof input.source !== "string" || !input.source.trim()) return { ok: false, error: "a recipe write is { source, base }: the recipe's TypeScript source, and the tip's sha it was edited from (null for a first write)" };
  if (!Object.hasOwn(input, "base") || (input.base !== null && (typeof input.base !== "string" || !SHA.test(input.base)))) return { ok: false, error: "a recipe write names its base: the tip's sha it was edited from (read recipes/<pattern> for it), or null for a recipe's first write" };
  if (!plan) return { ok: false, error: `no eval plan at ${pattern}.plan.json, so nothing can score this write: a person makes one with naive recipes plan ${pattern} --by <person>` };
  const set = loadEvalSet(dir, plan.sha);
  if (!set) return { ok: false, error: `the eval set _eval/${plan.sha}/ is missing, so nothing can score this write` };
  const source = input.source, base = input.base as string | null, candidate = sha(source);
  const agent = agentFromEnv(c.actor === "person" ? "person" : "agent", c.via ?? "router", { ...(c.actor_id && c.actor !== "person" ? { id: c.actor_id } : {}), ...c.provenance?.agent }) as Agent;

  return locked(dir, pattern, async () => {
    const lines = logLines(dir, pattern);
    const prior = lines.find((l) => l.kind === "experiment" && l.plan === plan.sha && l.candidate === candidate && l.base === base);
    if (prior) return answer(dir, prior, { retried: true, note_retry: "this write was scored before: the logged line is the answer, and nothing more is spent" });
    const tip = tipOf(dir, pattern, lines);
    if ((tip?.sha ?? null) !== base) return { ok: false, error: `the base ${base ?? "null"} is not the tip ${tip?.sha ?? "null"}: read recipes/${pattern}, edit the tip's source and write again`, conflict: { tip: tip?.sha ?? null } };
    if (tip && tip.sha === candidate) return { ok: false, error: "the candidate is the tip already: change the recipe before writing it" };
    const spent = spentUnder(lines, plan.sha);
    if (spent >= plan.budgets.dev_evaluations) return { ok: false, error: `the plan ${plan.sha} has spent its ${plan.budgets.dev_evaluations} dev evaluations: a person makes the next plan with naive recipes plan ${pattern} --by <person>` };
    const gate = gateWrite({ dir, r: c.r, route: c.route, requested: c.route, file: liveFile(pattern), actor: c.actor, actor_id: c.actor_id, provenance: c.provenance ?? {}, gate: null });
    if (gate?.then === "refuse") return { ok: false, error: gate.why, gate_rule: gate.rule, refused_by: gate.source };
    writeBlob(dir, source);
    const attributes: Obj = { "naive.question": `does this recipe beat the tip of ${pattern} on dev?`, "naive.route": c.route };
    return withSpan(dir, { name: `recipe experiment ${pattern}`, kind: "judgment", attributes }, async (ctx) => {
      const scored: Scored = await scoreExperiment(set, plan as EvalPlan, source, tip?.source ?? null);
      Object.assign(attributes, { "naive.outcome": scored.verdict, ...("dev" in scored ? { "naive.score": scored.dev.score, "naive.threshold": scored.dev.margin } : {}) });
      let landed: { hash: string } | null = null;
      if (scored.verdict === "keep") {
        const note = `kept as ${scored.kept_as} under plan ${plan.sha}`;
        if (c.actor !== "person" && gate) {
          const held = heldDraft(dir, { draft: draftFile(liveFile(pattern)), file: liveFile(pattern), text: source, verdict: gate, route: c.route, agent, trial: undefined });
          landed = prov(dir, { entity: held.written, route: c.route, activity: "draft", agent, derived_from: [`${pattern}.plan.json`], note });
        } else {
          const live = ventureFile(dir, liveFile(pattern));
          mkdirSync(dirname(live), { recursive: true });
          writeFileSync(live, source);
          // A held draft of an earlier tip is no longer the tip, so it is not left for a person to accept.
          for (const f of [draftFile(liveFile(pattern)), `${draftFile(liveFile(pattern))}.gate`]) rmSync(ventureFile(dir, f), { force: true });
          landed = prov(dir, { entity: liveFile(pattern), route: c.route, activity: "write", agent, derived_from: [`${pattern}.plan.json`], note });
        }
      }
      const span = tracing(dir).on ? { trace_id: ctx.trace_id, span_id: ctx.span_id, ...(ctx.session !== ctx.trace_id ? { session: ctx.session } : {}) } : undefined;
      const line = appendExperiment(dir, pattern, c.route, Object.fromEntries(Object.entries({
        kind: "experiment", id: sha(`${plan.sha} ${candidate} ${base ?? "null"}`).slice(0, 24), at: new Date().toISOString(), pattern, plan: plan.sha, candidate, base,
        verdict: scored.verdict, kept_as: "kept_as" in scored ? scored.kept_as : undefined, dev: "dev" in scored ? scored.dev : undefined, training: "training" in scored ? scored.training : undefined,
        reason: scored.reason, actor: agent, span, provenance: landed?.hash,
      }).filter(([, v]) => v !== undefined)) as unknown as Omit<Experiment, "prev" | "hash">);
      return answer(dir, line);
    });
  });
}
