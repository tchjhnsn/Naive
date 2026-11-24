// Durable handoffs, opt-in (EE-161, Effect runtime plan phase 11).
//
//   node packages/naive/src/router/orchestration/durable-handoff.ts <venture dir> <handoff id> [--runner <id>] [--as person|agent] [--actor-id <role>]
//   naive handoff run <handoff id>     picks this when naive.config.json sets durable.engine, else run-handoff.ts
//
// With `durable: { engine: "sqlite" }` in naive.config.json, a handoff run is an Effect workflow keyed by the venture,
// the handoff and its attempt (the evidence it already has). Each done-criterion is an activity named for its id, and
// the engine stores its result in <venture>/.naive/durable.sqlite (node:sqlite, no npm dependency). If the process
// dies inside a criterion, the next run resumes: a finished criterion is not rerun, and the interrupted one runs
// again, so a criterion must be safe to repeat. The evidence and the handoff's evidence list are written through the
// router, as one more activity, so they meet the gate, the handoff claim rules and provenance; a write repeated
// after a crash finds its evidence already listed and adds nothing.
//
// `memory` (the default) keeps no state across processes, so run-handoff.ts runs it as before. `postgres` runs on the
// host's SQL client, from its `sql` hook (packages/naive/src/core/effect/durable.ts). Review criteria are recorded with run-handoff.ts --review, not here.
// The workflow and cluster modules load only on this path.

import { basename, dirname, join, relative, resolve } from "node:path";
import { Effect, Layer, Schema } from "effect";
import { durableEngine, durableFile, engineLayer, runDurable, type DurableEngine } from "../../core/effect/durable.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { HostedRefusal, hostHook, isHosted, missingHook } from "../../core/runtime.ts";
import { evidenceOf, isBash, naiveVersion, readHandoff, runCriterion, type CriterionResult } from "../../engine/run-handoff.ts";
import type { Evidence } from "../../records/types/records.d.ts";
import { call } from "../router.ts";

export { durableEngine, durableFile, type DurableEngine };

const Result = Schema.Struct({ criterion: Schema.String, kind: Schema.String, passed: Schema.Boolean, command: Schema.String, output: Schema.String });

/** What a durable run returns: the evidence written and the route it was written to. */
export type DurableRun = { evidence: Evidence, route: string, engine: DurableEngine };

type Options = { runner?: string, actor?: "person" | "agent", actor_id?: string, log?: (_line: string) => void, engine?: DurableEngine };

/** Runs a handoff's conformance and self-proof criteria as a durable workflow, resuming an interrupted run. */
export async function runHandoffDurable(dir: string, id: string, { runner = "local", actor = "person", actor_id, log = console.log, engine = durableEngine(dir) }: Options = {}): Promise<DurableRun> {
  dir = resolve(dir);
  const h = readHandoff(dir, id);
  const sandbox = hostHook("sandbox");
  if (isHosted() && !sandbox && h.done_criteria.some(isBash)) throw missingHook("running a handoff's bash done-criteria", "sandbox", "Naive never runs a tenant's shell on the host");
  const attempt = (h.evidence ?? []).length;
  const criteria = h.done_criteria.filter((c) => c.kind !== "review");

  const [Workflow, Activity] = await Promise.all([
    import("effect/workflow/Workflow"), import("effect/workflow/Activity"),
  ]);
  const Handoff = Workflow.make("naive/handoff", {
    payload: { dir: Schema.String, handoff: Schema.String, attempt: Schema.Number },
    success: Schema.Struct({ evidence: Schema.String, route: Schema.String }),
    idempotencyKey: (p) => `${p.dir}#${p.handoff}#${p.attempt}`,
  });
  const write = (route: string, input: unknown) => Effect.promise(() => call({
    workspace: dirname(dir), venture: basename(dir), route, action: "write", input, actor, actor_id, via: "durable-handoff",
    provenance: { activity: "durable-handoff", note: `handoff ${id} attempt ${attempt}` },
  })).pipe(Effect.flatMap((a) => a.ok ? Effect.void : Effect.die(new Error(`${route}: ${a.error ?? "refused"}`))));

  const HandoffLive = Handoff.toLayer(Effect.fn(function* () {
    // The time the run started is kept, so a resumed run names the same evidence.
    const at = yield* Activity.make({ name: "started", success: Schema.String, execute: Effect.sync(() => new Date().toISOString().replace(/\.\d+Z$/, "Z")) });
    const results: CriterionResult[] = [];
    for (const c of criteria) {
      const r = yield* Activity.make({ name: `criterion/${c.id}`, success: Result, execute: Effect.promise(() => runCriterion(dir, c, sandbox)).pipe(Effect.map((x) => ({ criterion: x.criterion, kind: x.kind, passed: x.passed, command: x.command ?? "", output: x.output ?? "" }))) });
      results.push(r as CriterionResult);
    }
    const ev = evidenceOf(h, results, { at, runner, version: naiveVersion() });
    const route = `evidence/${ev.id}`;
    yield* Activity.make({
      name: "evidence", success: Schema.String, execute: Effect.gen(function* () {
        yield* write(route, ev);
        const now = readHandoff(dir, id);
        const entry = relative(ventureFile(dir, "operations/handoffs"), join(ventureFile(dir, "evidence/results"), `${ev.id}.json`));
        if (!(now.evidence ?? []).includes(entry)) yield* write(`operations/handoff/${id}`, { ...now, evidence: [...(now.evidence ?? []), entry] });
        return route;
      }),
    });
    return { evidence: JSON.stringify(ev), route };
  }));

  const EngineLayer = await engineLayer(dir, "handoffs", engine);
  const out = await runDurable(HandoffLive.pipe(Layer.provideMerge(EngineLayer)), Handoff.execute({ dir, handoff: id, attempt }));
  const evidence = JSON.parse(out.evidence) as Evidence;
  for (const r of evidence.results) log(`${r.passed ? "pass" : "FAIL"} ${r.criterion}`);
  return { evidence, route: out.route, engine };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, id] = process.argv.slice(2);
  if (!dir || !id) { console.error("usage: node packages/naive/src/router/orchestration/durable-handoff.ts <venture dir> <handoff id> [--runner <id>] [--as person|agent] [--actor-id <role>]"); process.exit(2); }
  const opt = (k: string) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined;
  try {
    const as = opt("--as");
    const run = await runHandoffDurable(dir, id, { runner: opt("--runner"), actor: as === "agent" ? "agent" : "person", actor_id: opt("--actor-id") });
    console.log(`${run.evidence.passed ? "every criterion run passed" : "some criteria failed"} (durable, ${run.engine}): ${run.route}`);
    process.exit(run.evidence.passed ? 0 : 1);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(e instanceof HostedRefusal ? 2 : 1);
  }
}
