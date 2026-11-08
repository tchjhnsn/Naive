// Recipe writes through the router (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "Keep and
// discard through the router", build plan item 6). The route is recipes/<pattern> (recipes/competitors/[id]/signals).
//
//   read    { pattern, tip, source, live, draft, plan, spent }: the tip is the recipe a write edits from (the last
//           candidate in the experiment log that moved it, a keep or a person's discard, else the live
//           <pattern>.recipe.ts, else none), with its source and sha
//   write   { source, base }: one experiment. base is the tip's sha the source was edited from, or null for a recipe's
//           first write. In order, under one lock per pattern:
//             1. a retry (the same plan, candidate and base already logged) answers the logged line and spends nothing;
//             2. a base that is not the tip is refused, naming the tip, and logs nothing; so is a candidate that is the
//                tip, and a plan whose dev budget is spent (counted from the log for the plan's sha);
//             3. the venture's gate is asked first, so a refusal spends nothing;
//             4. the candidate is scored (engine/recipes/eval-set.ts scoreExperiment: lint, training, dev against the tip
//                on paired rows, or against the plain fold for a first write), inside a judgment span when traces are on;
//             5. the line is checked against experiment.schema.json, then a keep lands: an agent's is held as a draft by
//                the gate (the evidence package's recipe-keeps-held rule) and becomes the tip; a person's write that is
//                not a fail is written live, a discard too, because a person decides, and removes a held draft of an
//                earlier tip; an agent's discard and every fail land nothing;
//             6. the experiment line is appended to <pattern>.experiments.jsonl, hash-chained, with the candidate (and a
//                live tip that had no line yet) stored by its sha in the blob store and the span named; what landed
//                nothing answers ok false with its verdict.
//
//   accept  { over_holdout? }: a person promotes the held tip (build plan item 8, "mentura accept recipes/<pattern>").
//           It refuses an agent, a tip that is live already and a spent holdout budget (distinct tips checked under
//           the plan). It runs the one-bit holdout check (scoreHoldout: the tip against the live recipe on the holdout
//           window) and appends a holdout line. pass: the tip is written live and its draft removed. fail: refused,
//           the draft stays, unless over_holdout, which writes it live and logs over_holdout true. Accepting a tip
//           already checked under the plan reuses that line's bit and runs no new check.
//   monitor  the forward check (scoreForward): since the live recipe last changed (an accept or a person's write),
//           points whose horizon has passed are scored against the recipe live before it. A regression proposes one
//           open rollback decision (agent recipe-monitor); nothing rolls back on its own, and a rerun files nothing new.
//
// The evaluator writes the log; no route appends to it, so an agent cannot supply a score.
import { createHash } from "node:crypto";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { readBlob, writeBlob } from "../core/blobs.mjs";
import { tracing, withSpan } from "../core/instrumentation.mjs";
import { actingAgent, agentFromEnv, entries, record as prov } from "../core/provenance.mjs";
import { now } from "../engine/clock.mjs";
import { decisionFile, propose } from "../engine/decisions.mjs";
import { ventureFile } from "../core/venture-paths.mjs";
import { validateValue } from "../records/validate.mjs";
import { forwardSet, loadEvalSet, loadPlan, scoreExperiment, scoreForward, scoreHoldout } from "../engine/recipes/eval-set.ts";
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
/** The interfaces a provenance agent names (provenance-entry.schema.json); any other caller over the router is logged as router. */
const VIAS: readonly string[] = ["cli", "mcp", "api", "router", "console"];
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

/** Whether a logged experiment moved the tip: a keep, or a person's discard, which lands live because a person decides. */
export const movesTip = (l: Experiment): boolean => l.kind === "experiment" && (l.verdict === "keep" || (l.verdict === "discard" && l.actor?.kind === "person"));

/** The tip: the last candidate in the log that moved it (its source from the blob store), else the live recipe, else null. */
export function tipOf(dir: string, pattern: string, lines: readonly Experiment[] = logLines(dir, pattern)): Tip | null {
  const kept = lines.filter(movesTip).at(-1);
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

/** Holdout checks spent under a plan: the distinct tips its holdout lines checked. An override reuses its tip's check. */
export const holdoutsUnder = (lines: readonly Experiment[], plan: string) => new Set(lines.filter((l) => l.kind === "holdout" && l.plan === plan).map((l) => l.candidate)).size;

/** Every time the live recipe changed, oldest first: a recipe live before the log (the first experiment's stored base),
 *  then each person's write that is not a fail and each holdout line that passed or was accepted over. */
export function liveHistory(dir: string, lines: readonly Experiment[]): { sha: string; at: string | null }[] {
  const out: { sha: string; at: string | null }[] = [];
  const first = lines.find((l) => l.kind === "experiment");
  if (first?.base) out.push({ sha: first.base, at: null });
  for (const l of lines) {
    const went = l.kind === "holdout" ? l.result === "pass" || l.over_holdout === true : l.actor?.kind === "person" && l.verdict !== "fail";
    if (went) out.push({ sha: l.candidate, at: l.at });
  }
  return out;
}

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
  if (movesTip(line)) {
    const landed = line.provenance ? (entries(dir) as { hash: string; entity: string; activity: string }[]).find((e) => e.hash === line.provenance) : undefined;
    const note = line.verdict === "discard" ? "discarded on dev, but a person decides: written live, and now the tip"
      : landed?.activity === "draft" ? "kept: held as a draft that is now the tip, for a person to accept" : "kept: written live, and now the tip";
    return { ok: true, result: { verdict: line.verdict, kept_as: line.kept_as, tip: line.candidate, written: landed?.entity ?? null, draft: landed?.activity === "draft",
      dev: line.dev, training: line.training, reason: line.reason, line, note, ...extra } };
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
  if (c.action === "accept") return accept(c, pattern);
  if (c.action === "monitor") return monitor(c, pattern);
  if (c.action !== "write") return { ok: false, error: `recipes/${pattern} has no action ${c.action}` };
  const input = c.input as { source?: unknown; base?: unknown } | null;
  if (!input || typeof input !== "object" || typeof input.source !== "string" || !input.source.trim()) return { ok: false, error: "a recipe write is { source, base }: the recipe's TypeScript source, and the tip's sha it was edited from (null for a first write)" };
  if (!Object.hasOwn(input, "base") || (input.base !== null && (typeof input.base !== "string" || !SHA.test(input.base)))) return { ok: false, error: "a recipe write names its base: the tip's sha it was edited from (read recipes/<pattern> for it), or null for a recipe's first write" };
  if (!plan) return { ok: false, error: `no eval plan at ${pattern}.plan.json, so nothing can score this write: a person makes one with naive recipes plan ${pattern} --by <person>` };
  const set = loadEvalSet(dir, plan.sha);
  if (!set) return { ok: false, error: `the eval set _eval/${plan.sha}/ is missing, so nothing can score this write` };
  const source = input.source, base = input.base as string | null, candidate = sha(source);
  // The line's actor is shaped as a provenance agent, whose via is one of the router's interfaces: a call through
  // agent-files or any other caller over the router is logged as via router.
  const via = VIAS.includes(c.via ?? "") ? c.via as string : "router";
  const agent = agentFromEnv(c.actor === "person" ? "person" : "agent", via, { ...(c.actor_id && c.actor !== "person" ? { id: c.actor_id } : {}), ...c.provenance?.agent }) as Agent;

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
    // A tip that is the live recipe before any experiment is stored too, so every base the log names has its source.
    if (tip?.from === "live") writeBlob(dir, tip.source);
    const attributes: Obj = { "naive.question": `does this recipe beat the tip of ${pattern} on dev?`, "naive.route": c.route };
    return withSpan(dir, { name: `recipe experiment ${pattern}`, kind: "judgment", attributes }, async (ctx) => {
      const scored: Scored = await scoreExperiment(set, plan as EvalPlan, source, tip?.source ?? null);
      Object.assign(attributes, { "naive.outcome": scored.verdict, ...("dev" in scored ? { "naive.score": scored.dev.score, "naive.threshold": scored.dev.margin } : {}) });
      const span = tracing(dir).on ? { trace_id: ctx.trace_id, span_id: ctx.span_id, ...(ctx.session !== ctx.trace_id ? { session: ctx.session } : {}) } : undefined;
      const lineOf = (provenance: string | undefined) => Object.fromEntries(Object.entries({
        kind: "experiment", id: sha(`${plan.sha} ${candidate} ${base ?? "null"}`).slice(0, 24), at: new Date().toISOString(), pattern, plan: plan.sha, candidate, base,
        verdict: scored.verdict, kept_as: "kept_as" in scored ? scored.kept_as : undefined, dev: "dev" in scored ? scored.dev : undefined, training: "training" in scored ? scored.training : undefined,
        reason: scored.reason, actor: agent, span, provenance,
      }).filter(([, v]) => v !== undefined)) as unknown as Omit<Experiment, "prev" | "hash">;
      // The line is checked before a keep lands, so nothing is written that the log cannot record.
      // A keep moves the tip, and so does a person's discard: a person's write lands live because a person decides.
      const lands = scored.verdict === "keep" || (scored.verdict === "discard" && c.actor === "person");
      const check = validateValue("experiment.schema.json", chainOnto("genesis", lineOf(lands ? "0".repeat(64) : undefined)));
      if (check.status !== 0) return { ok: false, error: `the experiment line would not match experiment.schema.json, so nothing was written: ${(check.stdout || check.stderr).trim()}` };
      let landed: { hash: string } | null = null;
      if (lands) {
        const note = "kept_as" in scored ? `kept as ${scored.kept_as} under plan ${plan.sha}` : `discarded on dev under plan ${plan.sha}, written live by a person`;
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
      return answer(dir, appendExperiment(dir, pattern, c.route, lineOf(landed?.hash)));
    });
  });
}

/** A person accepts the held tip: the one-bit holdout check, then the tip goes live on a pass or over a failed check. */
async function accept(c: RecipeCall, pattern: string): Promise<Answer> {
  const { dir } = c;
  const acting = actingAgent((c.actor_id ?? c.provenance?.agent?.id) as string | undefined);
  if (c.actor !== "person" || acting) return { ok: false, error: `only a person accepts a recipe${acting ? ` (an agent, ${acting}, is acting)` : ""}: an agent never accepts its own work` };
  const over = !!(c.input as { over_holdout?: unknown } | null)?.over_holdout;
  const plan = loadPlan(dir, pattern);
  if (!plan) return { ok: false, error: `no eval plan at ${pattern}.plan.json, so no holdout can be checked` };
  const set = loadEvalSet(dir, plan.sha);
  if (!set) return { ok: false, error: `the eval set _eval/${plan.sha}/ is missing, so no holdout can be checked` };
  const via = VIAS.includes(c.via ?? "") ? c.via as string : "router";
  const person = agentFromEnv("person", via, { ...(c.actor_id ? { id: c.actor_id } : {}), ...c.provenance?.agent }) as Agent;
  return locked(dir, pattern, async () => {
    const lines = logLines(dir, pattern), tip = tipOf(dir, pattern, lines);
    const liveAt = ventureFile(dir, liveFile(pattern));
    const liveSource = existsSync(liveAt) ? readFileSync(liveAt, "utf8") : null;
    if (!tip || tip.sha === (liveSource === null ? null : sha(liveSource))) return { ok: false, error: `nothing to accept at recipes/${pattern}: the tip is live already` };
    const prior = lines.filter((l) => l.kind === "holdout" && l.plan === plan.sha && l.candidate === tip.sha).at(-1);
    let result: "pass" | "fail";
    if (prior) result = prior.result as "pass" | "fail";
    else {
      if (holdoutsUnder(lines, plan.sha) >= plan.budgets.holdout_checks) return { ok: false, error: `the plan ${plan.sha} has spent its ${plan.budgets.holdout_checks} holdout checks: a person makes the next plan with naive recipes plan ${pattern} --by <person>` };
      result = (await scoreHoldout(set, plan as EvalPlan, tip.source, liveSource)).result;
    }
    // A failed check reused without an override answers the same bit, logs nothing and spends nothing.
    if (prior && result === "fail" && !over) return { ok: false, result: "fail", retried: true, error: `the holdout check of ${tip.sha} failed under plan ${plan.sha}; accept over it with --over-holdout, which is logged` };
    const lands = result === "pass" || over;
    let landed: { hash: string } | null = null;
    const line = { kind: "holdout", id: sha(`holdout ${plan.sha} ${tip.sha} ${lines.length}`).slice(0, 24), at: now().toISOString(), pattern, plan: plan.sha, candidate: tip.sha,
      result, over_holdout: result === "fail" && over, actor: person } as unknown as Omit<Experiment, "prev" | "hash">;
    const check = validateValue("experiment.schema.json", chainOnto("genesis", { ...line, ...(lands ? { provenance: "0".repeat(64) } : {}) }));
    if (check.status !== 0) return { ok: false, error: `the holdout line would not match experiment.schema.json, so nothing was written: ${(check.stdout || check.stderr).trim()}` };
    if (lands) {
      mkdirSync(dirname(liveAt), { recursive: true });
      writeFileSync(liveAt, tip.source);
      for (const f of [draftFile(liveFile(pattern)), `${draftFile(liveFile(pattern))}.gate`]) rmSync(ventureFile(dir, f), { force: true });
      landed = prov(dir, { entity: liveFile(pattern), route: c.route, activity: "accept", agent: person, derived_from: [`${pattern}.plan.json`, draftFile(liveFile(pattern))],
        note: result === "pass" ? `accepted ${tip.sha}: the holdout check passed` : `accepted ${tip.sha} over a failed holdout check` });
    }
    const logged = appendExperiment(dir, pattern, c.route, landed ? { ...line, provenance: landed.hash } as Omit<Experiment, "prev" | "hash"> : line);
    if (!lands) return { ok: false, result: "fail", line: logged, error: `the holdout check of ${tip.sha} failed: the draft stays; accept over it with --over-holdout, which is logged` };
    return { ok: true, result: { result, over_holdout: result === "fail", written: liveFile(pattern), tip: tip.sha, line: logged,
      note: result === "pass" ? "the holdout check passed: the tip is live" : "accepted over a failed holdout check: the tip is live, and the override is logged" } };
  });
}

/** The forward check after the live recipe changed; a regression proposes one open rollback decision. */
async function monitor(c: RecipeCall, pattern: string): Promise<Answer> {
  const { dir } = c;
  const plan = loadPlan(dir, pattern);
  if (!plan) return { ok: false, error: `no eval plan at ${pattern}.plan.json, so there is no margin to judge by` };
  const lines = logLines(dir, pattern), history = liveHistory(dir, lines);
  const current = history.at(-1), previous = history.at(-2) ?? null;
  if (!current?.at) return { ok: true, result: { status: "idle", note: `the live recipe at ${pattern} has not changed through the log, so there is nothing to monitor` } };
  const liveAt = ventureFile(dir, liveFile(pattern));
  if (!existsSync(liveAt) || sha(readFileSync(liveAt)) !== current.sha) return { ok: false, error: `the live recipe at ${pattern} is not ${current.sha}, the last that went live in the log: it was changed outside the router` };
  const liveSource = readFileSync(liveAt, "utf8");
  const prevSource = previous ? readBlob(dir, previous.sha)?.toString("utf8") ?? null : null;
  if (previous && prevSource === null) return { ok: false, error: `the blob store has no source for ${previous.sha}, the recipe live before ${current.sha}` };
  const fs = await forwardSet(dir, pattern, plan as EvalPlan, Date.parse(current.at), now().getTime(), [liveSource, ...(prevSource ? [prevSource] : [])]);
  if (!fs.ok) return { ok: false, error: fs.reason };
  const f = await scoreForward(fs.set, plan as EvalPlan, liveSource, prevSource);
  const base = { pattern, live: current.sha, previous: previous?.sha ?? null, since: current.at, ...f };
  if (f.status !== "regressed") return { ok: true, result: base };
  const id = `recipe-rollback-${sha(`${pattern} ${current.sha} ${previous?.sha ?? "plain fold"}`).slice(0, 12)}`;
  if (decisionFile(dir, id)) return { ok: true, result: { ...base, decision: id, kept: true, note: "the rollback decision is filed already" } };
  const back = previous ? `the recipe live before it (${previous.sha.slice(0, 12)})` : "the plain fold";
  const p = propose(dir, { id, question: `The recipe at ${pattern} (${current.sha.slice(0, 12)}, live since ${current.at}) scores worse on forward points than ${back}: ${f.reason}. Roll back to it?`,
    note: `Proposed by recipes/${pattern} monitor (autoresearch build plan item 8) over ${f.rows} forward rows. Nothing rolls back on its own: a person decides, and a rollback is a person's write to recipes/${pattern}.` },
    { agentId: "recipe-monitor", via: "router" });
  if (!p.ok) return { ok: false, error: `the rollback decision was not proposed: ${p.error}` };
  return { ok: true, result: { ...base, decision: id, proposed: true, note: "regressed: a rollback decision is proposed for a person" } };
}
