#!/usr/bin/env node
// naive recipes search: knob descent with no model (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md,
// "With no model (graft: knob search)", build plan item 10). Coordinate descent over a recipe's knobs: for each knob in
// name order, one step each way (engine/recipes/knobs.ts stepsOf), each step a normal experiment write to
// recipes/<pattern> through the router, scored there against the tip (router/recipes.ts). A keep moves the tip and the
// search goes on to the next knob; a pass that keeps nothing makes the step smaller (the square root of the factor) up
// to --shrinks times, then the search stops. It also stops when the plan's dev budget is spent, at --max-writes, or on
// any refusal that carries no verdict (the gate, a base that is no longer the tip).
//
//   node packages/naive/src/router/orchestration/recipe-search.ts <venture dir> <pattern> [--factor 2] [--shrinks 2] [--max-writes 200] [--json]
//
// It writes as the agent knob-search (via cli), so a keep is held as a draft for a person to accept like any agent's
// keep (the evidence package's recipe-keeps-held rule), and the holdout check runs then (accept is build plan item 8,
// not built). It never supplies a score: the router scores every write. A candidate this plan's log has already scored
// is not written again, so a search spends nothing going back to a value it left. It calls no model.
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { knobsIn, setKnob, stepsOf } from "../../engine/recipes/knobs.ts";
import type { KnobValue } from "../../engine/recipes/knobs.ts";
import { recipeExports } from "../../engine/recipes/sandbox.ts";
import { logLines } from "../recipes.ts";
import { call } from "../router.mjs";

type Reply = { ok: boolean; error?: string; verdict?: string; retried?: boolean; result?: Record<string, unknown>; line?: { dev?: Dev; reason?: string } };
type Dev = { score: number; tip_score: number | null; margin: number };
/** One step the search took: the knob, the value it left and the one it tried, and what the router answered. */
export type Step = { knob: string; from: KnobValue; to: KnobValue; verdict: "keep" | "discard" | "fail"; kept_as?: string; dev?: Dev; reason: string; candidate: string };
export type SearchOptions = { factor?: number; shrinks?: number; maxWrites?: number };
export type SearchResult = {
  ok: boolean; pattern: string; start: string | null; tip: string | null; kept: number; spent: number;
  steps: Step[]; skipped: { knob: string; why: string }[]; stopped: string; error?: string;
};

/** The writer every step names: Naive's own search, an agent, never a person. */
export const SEARCHER = Object.freeze({ actor: "agent", actor_id: "knob-search", via: "cli" });
const sha = (s: string): string => createHash("sha256").update(s).digest("hex");
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Coordinate descent over the knobs of the recipe at a pattern (see the top of this file). */
export async function search(dir: string, pattern: string, o: SearchOptions = {}): Promise<SearchResult> {
  const venture = (JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) as { id: string }).id;
  const route = `recipes/${pattern}`;
  const at = (action: string, input?: unknown) => call({ venture, workspace: dir, route, action, input, ...SEARCHER }) as Promise<Reply>;
  const out: SearchResult = { ok: true, pattern, start: null, tip: null, kept: 0, spent: 0, steps: [], skipped: [], stopped: "" };
  const stop = (stopped: string, error?: string): SearchResult => ({ ...out, ok: !error, stopped, ...(error ? { error } : {}) });
  const skip = (knob: string, why: string) => { if (!out.skipped.some((s) => s.knob === knob && s.why === why)) out.skipped.push({ knob, why }); };

  let factor = o.factor ?? 2;
  if (!(factor > 1)) return stop("refused", "--factor is a number above 1");
  let shrinks = o.shrinks ?? 2;
  const maxWrites = o.maxWrites ?? 200;
  const read = await at("read");
  if (!read.ok || !read.result) return stop("refused", read.error ?? "the recipe route did not answer");
  const r0 = read.result as { tip: string | null; source: string | null; plan: string | null; spent: { dev_evaluations: number; of: number } | null };
  if (!r0.tip || r0.source === null) return stop("refused", `no recipe at ${pattern} to search: write one first`);
  if (!r0.plan || !r0.spent) return stop("refused", `no eval plan at ${pattern}.plan.json, so nothing can score a step: a person makes one with naive recipes plan ${pattern} --by <person>`);
  let tip = { sha: r0.tip, source: r0.source };
  out.start = out.tip = tip.sha;
  const plan = r0.plan;
  // Every candidate this plan's log has scored, and every tip the search has stood on: neither is written again.
  const scored = new Set<string>([tip.sha, ...logLines(dir, pattern).filter((l) => l.kind === "experiment" && l.plan === plan).map((l) => l.candidate)]);

  const found = knobsIn(tip.source);
  if (!found.ok) return stop("refused", found.reason);
  for (const s of found.skipped) skip(s.name, s.why);
  const names = found.knobs.map((k) => k.name).sort();
  for (const k of found.knobs) if (!stepsOf(k.value, factor).length) skip(k.name, `no step for ${JSON.stringify(k.value)}: only numbers, booleans and rating floors (B2) are stepped`);
  let writes = 0;

  for (;;) {
    let keptThisPass = false;
    for (const name of names) {
      const now = knobsIn(tip.source);
      if (!now.ok) return stop("refused", now.reason);
      const knob = now.knobs.find((k) => k.name === name);
      if (!knob) continue;
      for (const to of stepsOf(knob.value, factor)) {
        const edit = setKnob(tip.source, name, to);
        if (!edit.ok) { skip(name, edit.reason); break; }
        const candidate = sha(edit.source);
        if (scored.has(candidate)) continue;
        // The edit must read back as exactly this knob changed, through the sandbox's own reading of the exports.
        const [before, after] = await Promise.all([recipeExports(tip.source), recipeExports(edit.source)]);
        if (!before.ok || !after.ok) return stop("refused", `the recipe's exports cannot be read: ${!before.ok ? before.reason : !after.ok ? after.reason : ""}`);
        const expected = { ...before.output.knobs, [name]: to };
        if (!same(after.output.knobs, expected)) { skip(name, "a rewrite of its value did not read back as that knob alone changed"); break; }
        if (writes >= maxWrites) return stop(`stopped at --max-writes ${maxWrites}`);
        writes++;
        scored.add(candidate);
        const w = await at("write", { source: edit.source, base: tip.sha });
        const verdict = (w.ok ? (w.result?.verdict as string) : w.verdict) as Step["verdict"] | undefined;
        if (!verdict) {
          // A refusal with no verdict scored nothing: a spent budget ends the search; anything else is an error.
          if (/spent its \d+ dev evaluations/.test(w.error ?? "")) return stop("the plan's dev budget is spent");
          return stop("refused", w.error ?? "the write was refused");
        }
        const line = (w.ok ? w.result?.line : w.line) as { dev?: Dev; reason?: string; kept_as?: string } | undefined;
        out.steps.push({ knob: name, from: knob.value, to, verdict, ...(line?.kept_as ? { kept_as: line.kept_as } : {}), ...(line?.dev ? { dev: { score: line.dev.score, tip_score: line.dev.tip_score, margin: line.dev.margin } } : {}), reason: line?.reason ?? w.error ?? "", candidate });
        if (verdict !== "fail" && !w.retried) out.spent++;
        if (verdict === "keep") {
          tip = { sha: candidate, source: edit.source };
          out.tip = tip.sha; out.kept++; keptThisPass = true;
          break;
        }
      }
    }
    if (keptThisPass) continue;
    if (shrinks <= 0) return stop(out.kept ? "no step kept at the smallest step" : "no step was kept");
    shrinks--;
    factor = Math.sqrt(factor);
  }
}

function print(r: SearchResult): void {
  const show = (v: KnobValue) => JSON.stringify(v);
  for (const s of r.steps) console.log(`${s.verdict === "keep" ? "keep   " : s.verdict === "discard" ? "discard" : "fail   "}  ${s.knob} ${show(s.from)} -> ${show(s.to)}${s.dev ? `  dev ${s.dev.score} (tip ${s.dev.tip_score ?? "plain fold"}, margin ${s.dev.margin})` : ""}  ${s.reason}`);
  for (const s of r.skipped) console.log(`skipped  ${s.knob}: ${s.why}`);
  if (r.ok) console.log(`${r.kept} kept of ${r.steps.length} steps (${r.spent} dev evaluations spent); tip ${r.tip}${r.tip !== r.start ? ` (was ${r.start})` : " (unchanged)"}; ${r.stopped}`);
  else console.error(`refused: ${r.error}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, pattern, ...a] = process.argv.slice(2);
  const opt = (n: string) => { const i = a.indexOf(`--${n}`); return i >= 0 ? a[i + 1] : undefined; };
  const num = (n: string) => (opt(n) === undefined ? undefined : Number(opt(n)));
  if (!dir || !pattern || !existsSync(join(dir, "venture.json"))) {
    console.error("usage: node packages/naive/src/router/orchestration/recipe-search.ts <venture dir> <pattern> [--factor 2] [--shrinks 2] [--max-writes 200] [--json]");
    process.exit(2);
  }
  const r = await search(dir, pattern, { factor: num("factor"), shrinks: num("shrinks"), maxWrites: num("max-writes") });
  if (a.includes("--json")) console.log(JSON.stringify(r, null, 2)); else print(r);
  process.exit(r.ok ? 0 : 1);
}
