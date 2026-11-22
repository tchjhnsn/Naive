// The durable engine (EE-161, Effect runtime plan phases 11 and 12): which workflow engine a venture's durable work
// runs on, chosen by `durable.engine` in naive.config.json.
//
//   memory    the default: no state across processes, so callers keep their plain path
//   sqlite    an Effect cluster workflow engine over <venture>/.naive/durable[-<kind>].sqlite, through node-sqlite.ts
//   postgres  the same engine over the host's SQL client, from the `sql` hook (registerHook("sql", fn) in
//             packages/naive/src/core/runtime.ts). Naive depends on no Postgres driver; the host owns the pool. Without
//             the hook, and always on a laptop, it is refused.
//
// Each kind of durable work (handoffs, signals, recipes, triggers) keeps its own SQLite file, so a write inside one
// kind's workflow that starts another kind's (a trigger after a handoff's evidence, say) never waits on the first
// one's shard locks. The workflow and cluster modules load only here, and only when a caller asks for an engine.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, join } from "node:path";
import { type Context, Effect, Layer, ManagedRuntime, Schema } from "effect";
import type { WorkflowEngine, WorkflowInstance } from "effect/workflow/WorkflowEngine";
import { NodeSqlite } from "./node-sqlite.ts";
import { hostHook, missingHook } from "../runtime.ts";

/** The durable engines naive.config.json may name. */
export type DurableEngine = "memory" | "sqlite" | "postgres";

/** The engine naive.config.json's durable.engine names: memory unless it says sqlite or postgres. */
export function durableEngine(dir: string): DurableEngine {
  try {
    const e = (JSON.parse(readFileSync(join(dir, "naive.config.json"), "utf8")) as { durable?: { engine?: unknown } }).durable?.engine;
    return e === "sqlite" || e === "postgres" ? e : "memory";
  } catch { return "memory"; }
}

/** Whether durable work is on: the engine keeps state across processes. */
export const isDurable = (dir: string) => durableEngine(dir) !== "memory";

/** The SQLite file one kind of durable work keeps: durable.sqlite for handoffs, durable-<kind>.sqlite for the rest. */
export const durableFile = (dir: string, kind = "handoffs") => join(dir, ".naive", kind === "handoffs" ? "durable.sqlite" : `durable-${kind}.sqlite`);

/** The workflow engine layer for a venture's durable work of one kind. */
export async function engineLayer(dir: string, kind = "handoffs", engine: DurableEngine = durableEngine(dir)): Promise<Layer.Layer<WorkflowEngine>> {
  if (engine === "memory") return (await import("effect/workflow/WorkflowEngine")).layerMemory;
  const [ClusterWorkflowEngine, SingleRunner, Digest, SqlClient] = await Promise.all([
    import("effect/cluster/ClusterWorkflowEngine"), import("effect/cluster/SingleRunner"), import("effect/crypto/Digest"), import("effect/sql/SqlClient"),
  ]);
  let sql;
  if (engine === "sqlite") {
    mkdirSync(dirname(durableFile(dir, kind)), { recursive: true });
    sql = NodeSqlite(durableFile(dir, kind));
  } else {
    const hook = hostHook("sql");
    if (!hook) throw missingHook("durable.engine postgres", "sql", "Naive ships no Postgres driver, so the host provides the client");
    sql = Layer.succeed(SqlClient.SqlClient, await hook());
  }
  // Shard locks live in the database (runnerStorage sql), so a run that died leaves no lock in memory to wait out.
  return ClusterWorkflowEngine.layer.pipe(
    Layer.provideMerge(SingleRunner.layer({ runnerStorage: "sql" })),
    Layer.provide(sql),
    Layer.provide(Digest.layerWebCrypto),
  ) as Layer.Layer<WorkflowEngine>;
}

/** Runs a workflow's effect on a runtime built from its layer, and disposes the runtime after, whatever happens. */
export async function runDurable<A, E, R>(layer: Layer.Layer<R, unknown>, effect: Effect.Effect<A, E, R>): Promise<A> {
  const runtime = ManagedRuntime.make(layer);
  try { return await runtime.runPromise(effect); } finally { await runtime.dispose(); }
}

/** One step of durable work: an async function run as a workflow activity, its JSON result stored under its name. */
export type Step = <A>(name: string, run: () => Promise<A>) => Promise<A>;

/** A step that just runs, for the memory path: callers take a Step and stay one function on both paths. */
export const plainStep: Step = (_name, run) => run();

/**
 * The step bridge: inside a workflow body, given the body's own context, runs async code as activities. A resumed
 * workflow answers a finished step from storage without running it, so code written against Step replays the same
 * way as long as everything it reads that can change comes from a step. Activity names are replay keys and must be
 * unique within one run.
 */
export async function activityStep(): Promise<(_context: Context.Context<WorkflowEngine | WorkflowInstance>) => Step> {
  const Activity = await import("effect/workflow/Activity");
  return (context) => (name, run) => Effect.runPromiseWith(context)(Activity.make({
    name, success: Schema.String,
    execute: Effect.promise(async () => { const v = await run(); killSeam(name); return JSON.stringify(v ?? null); }),
  })).then((s) => JSON.parse(s));
}

/**
 * A test seam for crash-and-resume tests: NAIVE_DURABLE_KILL=<step name prefix>:<marker file> kills the process once,
 * right after a step whose name starts with the prefix has run and before its result is stored, as a crash would.
 * The marker file makes it once. Unset, it does nothing.
 */
function killSeam(name: string): void {
  const seam = process.env.NAIVE_DURABLE_KILL;
  if (!seam) return;
  const at = seam.indexOf(":");
  const prefix = seam.slice(0, at), marker = seam.slice(at + 1);
  if (!name.startsWith(prefix) || !marker || existsSync(marker)) return;
  writeFileSync(marker, name);
  process.kill(process.pid, "SIGKILL");
}

/**
 * The open run of one kind of durable work: a run id kept in .naive/durable-runs/<kind>-<name>.json until the run
 * closes, so a process that died resumes the same workflow and a later run starts a new one.
 */
export function openRun(dir: string, kind: string, name: string): string {
  const f = join(dir, ".naive", "durable-runs", `${kind}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`);
  try { return (JSON.parse(readFileSync(f, "utf8")) as { id: string }).id; } catch { /* no open run */ }
  const id = randomUUID();
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify({ id, opened: new Date().toISOString() }) + "\n");
  return id;
}

/** Closes the open run of one kind of durable work, so the next run starts afresh. */
export function closeRun(dir: string, kind: string, name: string): void {
  rmSync(join(dir, ".naive", "durable-runs", `${kind}-${name.replace(/[^a-zA-Z0-9._-]/g, "_")}.json`), { force: true });
}
