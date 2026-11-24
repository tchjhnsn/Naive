#!/usr/bin/env node
// Triggers (M-12) and what happens when one fails (E-7). In React an event handler or an effect starts
// an action when something happens; in Naive an event is a line of the venture's provenance log (a
// record written, drafted, accepted, confirmed or moved), and a trigger starts the next step: one router
// call, or a decision proposed for a person. Triggers come from naive.config.json `triggers`, and from
// the automations of the Mentura kits the venture lists in `kits`. A kit's automation runs only once
// the package it needs is complete; until then its run waits, and is retried on every later event.
//
// React's error boundaries do not catch errors in event handlers or async code: you catch and store
// them yourself. So does this. Every run is stored in <venture>/.naive/triggers.json before the cursor
// moves past its event. A run that fails, or throws, is raised as a decision for the founder (retry,
// skip this event, or turn the trigger off) and settled when the founder decides it. A crash of the
// runner itself is kept by the provenance hook and raised on the next run. Nothing is lost.
//
//   node packages/naive/src/router/orchestration/triggers.ts <venture dir> [--json]     the triggers, their recent runs and open failures
//   node packages/naive/src/router/orchestration/triggers.ts <venture dir> --fire        run what the new events start (the provenance hook does this)
//
// Trigger runs act as agents (id trigger-<id>, via router), so their writes meet the same gates as any
// agent's: a gated record is drafted for a person. A trigger never fires on its own writes.

import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { entries } from "../../core/provenance.ts";
import { call, glob } from "../router.ts";
import { decisions, propose } from "../../engine/decisions.ts";
import { crashSeam } from "../../core/crash-seam.ts";
import { kit } from "../../engine/kits.ts";
import { CONFIG, readConfig, writeConfig } from "../../engine/naive-config.ts";
import { packages } from "../../engine/packages.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import type { NaiveConfig, Trigger, Venture } from "../../records/types/records.d.ts";
import type { Entry } from "../../core/provenance.ts";

/**
 * The config as triggers read it. triggers_off is read and written here but naive-config.schema.json
 * does not define it, and that schema has additionalProperties false: the code and the schema disagree.
 */
type Config = NaiveConfig & { triggers_off?: string[] };
/** A trigger with where it came from and whether it runs. */
type Live = Trigger & { from: string; enabled?: boolean };
/** One run of a trigger, as kept in the state file. */
type Run = {
  n: number; trigger: string; from: string; event?: string | null; entity?: string | null; activity?: string | null; at: string;
  outcome?: string; result?: unknown; error?: string; status?: string; decision?: string;
  retry_of?: number; retried_as?: number; waited_since?: string; settled_at?: string;
};
type Waiting = { trigger: string; event: string; at: string; needs: string };
type State = { since: string; cursor: string | null; runs: Run[]; waiting: Waiting[]; unreadable?: string };
/** A decision as decisions() lists it, with only the fields read here. */
type Dec = { id: string; status: string; answer?: unknown };

export const STATE = ".naive/triggers.json";
export const ERRORS = ".naive/trigger-errors.jsonl";
const load = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
const now = () => new Date().toISOString();

/** The venture's triggers, from its config and its kits, with what is wrong with any of them. */
export function triggersOf(dir: string): { triggers: Live[]; problems: string[] } {
  const cfg: Config = readConfig(dir);
  const off = new Set(cfg.triggers_off ?? []);
  const problems: string[] = [];
  // The config schema leaves its triggers untyped; each one is a trigger record (trigger.schema.json).
  const out: Live[] = ((cfg.triggers ?? []) as Trigger[]).map((t) => ({ ...t, from: "naive.config.json" }));
  for (const name of cfg.kits ?? []) {
    const k: { automations?: Trigger[] } | null = kit(name);
    if (!k) { problems.push(`kit ${name} is listed in ${CONFIG} kits but is not installed (no ${name}/kit.json in the folder NAIVE_KITS names)`); continue; }
    for (const a of k.automations ?? []) {
      if (!a.needs) { problems.push(`kit ${name}: automation ${a.id} names no package it needs, so it never runs (a kit's automation runs only once its package is complete)`); continue; }
      out.push({ ...a, id: `${name}-${a.id}`, from: `kit ${name}` });
    }
  }
  const seen = new Set<string>();
  for (const t of out) { if (seen.has(t.id)) problems.push(`trigger ${t.id} is defined twice; the first one runs`); seen.add(t.id); }
  return { triggers: out.filter((t, i) => out.findIndex((x) => x.id === t.id) === i).map((t) => ({ ...t, enabled: t.enabled !== false && !off.has(t.id) })), problems };
}

/** Whether a provenance entry starts a trigger. */
export function matches(t: Trigger, e: Entry) {
  const on: Trigger["on"] = t.on ?? {};
  const acts: string[] | null = on.activity ? [on.activity].flat() : null;
  if (acts && !acts.includes(e.activity)) return false;
  if (on.route && !(e.route && glob(on.route).test(e.route))) return false;
  if (on.entity && !glob(on.entity).test(e.entity)) return false;
  if (on.by && e.agent?.kind !== on.by) return false;
  return true;
}

function readState(dir: string): State {
  const f = ventureFile(dir, STATE);
  if (existsSync(f)) {
    try { const s = load(f) as State; if (Array.isArray(s.runs) && Array.isArray(s.waiting)) return s; } catch {}
    // A state file that cannot be read is kept beside it, and the failure is raised; runs start again from now.
    const kept = `.naive/triggers.unreadable-${Date.now()}.json`;
    renameSync(f, ventureFile(dir, kept));
    return { since: now(), cursor: null, runs: [], waiting: [], unreadable: kept };
  }
  // Triggers start with the events after they were configured, not the venture's whole history.
  const cfg = ventureFile(dir, CONFIG);
  return { since: existsSync(cfg) ? statSync(cfg).mtime.toISOString() : now(), cursor: null, runs: [], waiting: [] };
}
const saveState = (dir: string, s: State) => { mkdirSync(join(dir, ".naive"), { recursive: true }); writeFileSync(ventureFile(dir, STATE), JSON.stringify(s, null, 2) + "\n"); };

const complete = (dir: string, name: string | undefined): boolean => { try { return name !== undefined && packages(dir).complete.includes(name); } catch { return false; } };
const brief = (x: unknown) => (x == null ? null : typeof x === "string" ? x.slice(0, 300) : JSON.stringify(x).slice(0, 300));

// E-7: a failed run becomes a decision the founder owes. It fails open: the rest of the venture goes on.
function raise(dir: string, run: Run) {
  const v = load(join(dir, "venture.json")) as Venture;
  // A runner failure can recur across state files, so its id carries the time instead of the run number.
  const id = `trigger-${run.trigger}-failed-${run.trigger === "runner" ? Date.now().toString(36) : run.n}`.replace(/[^a-z0-9-]+/g, "-").slice(0, 80);
  const r = propose(dir, { id, question: `Trigger ${run.trigger} ${run.outcome === "uncaught" ? "crashed" : "failed"} on ${run.activity ?? "an event"} of ${run.entity ?? "the venture"}: ${String(run.error).split("\n")[0].slice(0, 300)}. Retry it, skip this event, or turn the trigger off?`,
    options: ["Retry", "Skip this event", "Turn the trigger off"], layer: "operations", boundary: "fail-open", needed_in: v.phase, decides: { path: CONFIG },
    note: `Raised by packages/naive/src/router/orchestration/triggers.ts (E-7). The run is kept in ${STATE} as run ${run.n}.` }, { agentId: "naive-triggers", via: "router" } as Parameters<typeof propose>[2]);
  return r.ok ? id : null;
}

async function runOne(dir: string, t: Live, e: Entry | undefined, state: State, extra: Partial<Run> = {}): Promise<Run> {
  const v = load(join(dir, "venture.json")) as Venture;
  const run: Run = ({ n: state.runs.length + 1, trigger: t.id, from: t.from, event: e?.hash ?? null, entity: e?.entity ?? null, activity: e?.activity ?? null, at: now(), ...extra });
  // A run is keyed by its trigger and event. A runner that stopped after a route call landed and before the state was
  // saved finds the call in provenance on the next run and records it as ran instead of calling again, so state, the
  // cursor and this key together make each trigger run once per event (EE-161, phase 12d). A retry runs again.
  const key = e?.hash ? `event ${e.hash}` : null;
  const landed = key && !extra.retry_of && !t.run.propose && entries(dir).some((x: Entry) => x.agent?.id === `trigger-${t.id}` && typeof x.note === "string" && x.note.includes(key));
  try {
    let r: { ok: boolean; result?: unknown; error?: string };
    if (landed) r = { ok: true, result: "already ran before the runner stopped; not called again" };
    else if (t.run.propose) r = propose(dir, t.run.propose, { agentId: `trigger-${t.id}`, via: "router" } as Parameters<typeof propose>[2]);
    else if (typeof t.run.route !== "string") throw new Error(`trigger ${t.id} names no route to run`); // a malformed trigger crashes; the router would read it as a broken route table
    else r = await call({ venture: v.id, workspace: dir, route: t.run.route, action: t.run.action as string /* the trigger schema requires an action beside a route */, input: t.run.input, actor: "agent", actor_id: `trigger-${t.id}`, via: "router",
      provenance: { derived_from: e?.entity && !/:\/\//.test(e.entity) ? [e.entity] : undefined, note: `trigger ${t.id} on ${e?.activity ?? "retry"} of ${e?.entity ?? "?"}${key ? ` (${key})` : ""}` } });
    crashSeam(`trigger/${t.id}`);
    run.outcome = r.ok ? "ran" : "failed";
    if (r.ok) run.result = brief(r.result); else run.error = r.error ?? brief(r.result) ?? "the call did not succeed";
  } catch (err) { run.outcome = "uncaught"; run.error = String((err as { stack?: unknown } | null)?.stack ?? err).slice(0, 2000); }
  if (run.outcome !== "ran") { const d = raise(dir, run); run.status = d ? "raised" : "unraised"; if (d) run.decision = d; }
  state.runs.push(run);
  saveState(dir, state);
  return run;
}

/** Settles failures the founder has decided: retry the run, skip its event, or turn the trigger off. */
export async function settle(dir: string, state: State = readState(dir)): Promise<Run[]> {
  const raised = state.runs.filter((r) => r.status === "raised");
  if (!raised.length) return [];
  const ds = new Map<string, Dec>(decisions(dir).decisions.map((d: Dec) => [d.id, d] as const));
  const { triggers } = triggersOf(dir);
  const log: Entry[] = entries(dir);
  const done: Run[] = [];
  for (const run of raised) {
    const d = run.decision === undefined ? undefined : ds.get(run.decision);
    if (!d || !["decided", "withdrawn"].includes(d.status)) continue;
    const answer = String(d.answer ?? "").toLowerCase();
    if (d.status === "withdrawn" || answer.startsWith("skip")) run.status = "skipped";
    else if (/\boff\b|disable|turn/.test(answer)) {
      const cfg: Config = readConfig(dir);
      cfg.triggers_off = [...new Set([...(cfg.triggers_off ?? []), run.trigger])];
      writeConfig(dir, cfg);
      run.status = "turned off";
    } else if (answer.startsWith("retry")) {
      run.status = "retried";
      const t = triggers.find((x) => x.id === run.trigger);
      const e = log.find((x) => x.hash === run.event);
      saveState(dir, state);
      if (t && t.enabled) { const again = await runOne(dir, t, e, state, { retry_of: run.n }); run.retried_as = again.n; }
      else run.status = "retried, but the trigger is gone or off";
    } else continue;
    run.settled_at = now();
    done.push(run);
    saveState(dir, state);
  }
  return done;
}

/** Runs what the events since the last run start. Returns the runs it made. */
export async function fire(dir: string, { rounds = 20 }: { rounds?: number } = {}): Promise<Run[]> {
  const held = process.env.NAIVE_TRIGGERS_ACTIVE;
  process.env.NAIVE_TRIGGERS_ACTIVE = "fire";
  const state = readState(dir);
  const made: Run[] = [];
  try {
    if (state.unreadable) {
      const run: Run = { n: 1, trigger: "runner", from: "packages/naive/src/router/orchestration/triggers.ts", at: now(), outcome: "failed", error: `${STATE} could not be read; it is kept at ${state.unreadable} and triggers start again from now` };
      const d = raise(dir, run); run.status = d ? "raised" : "unraised"; if (d) run.decision = d;
      delete state.unreadable; state.runs.push(run); made.push(run); saveState(dir, state);
    }
    // A crash the provenance hook kept is a failure too.
    const ef = ventureFile(dir, ERRORS);
    if (existsSync(ef)) {
      for (const l of readFileSync(ef, "utf8").split("\n").filter(Boolean)) {
        const x = JSON.parse(l) as { at: string; error: string };
        const run: Run = { n: state.runs.length + 1, trigger: "runner", from: "provenance hook", event: null, entity: null, activity: null, at: x.at, outcome: "uncaught", error: x.error };
        const d = raise(dir, run); run.status = d ? "raised" : "unraised"; if (d) run.decision = d;
        state.runs.push(run); made.push(run);
      }
      writeFileSync(ef, "");
      saveState(dir, state);
    }
    made.push(...await settle(dir, state));
    const { triggers } = triggersOf(dir);
    const active = triggers.filter((t) => t.enabled);
    const ranOnce = (t: Live) => t.once && state.runs.some((r) => r.trigger === t.id && r.outcome === "ran");
    for (let round = 0; round < rounds; round++) {
      const log: Entry[] = entries(dir);
      const at = state.cursor ? log.findIndex((e) => e.hash === state.cursor) + 1 : log.findIndex((e) => e.at >= state.since);
      const pending = at < 0 ? [] : log.slice(at);
      // Runs waiting on a package go first, once the package is complete.
      for (const w of [...state.waiting]) {
        const t = active.find((x) => x.id === w.trigger);
        if (!t || ranOnce(t)) { state.waiting = state.waiting.filter((x) => x !== w); continue; }
        if (!complete(dir, t.needs)) continue;
        state.waiting = state.waiting.filter((x) => x !== w);
        made.push(await runOne(dir, t, log.find((e) => e.hash === w.event), state, { waited_since: w.at }));
      }
      if (!pending.length) break;
      for (const e of pending) {
        for (const t of active) {
          if (!matches(t, e) || e.agent?.id === `trigger-${t.id}` || ranOnce(t)) continue;
          if (t.needs && !complete(dir, t.needs)) {
            if (!state.waiting.some((w) => w.trigger === t.id)) state.waiting.push({ trigger: t.id, event: e.hash, at: now(), needs: t.needs });
            continue;
          }
          made.push(await runOne(dir, t, e, state));
        }
        state.cursor = e.hash;
        saveState(dir, state);
      }
      if (round === rounds - 1 && entries(dir).at(-1)?.hash !== state.cursor) {
        const run: Run = { n: state.runs.length + 1, trigger: "runner", from: "packages/naive/src/router/orchestration/triggers.ts", at: now(), outcome: "failed", error: `triggers kept starting each other for ${rounds} rounds; the rest wait for the next event` };
        const d = raise(dir, run); run.status = d ? "raised" : "unraised"; if (d) run.decision = d;
        state.runs.push(run); made.push(run); saveState(dir, state);
      }
    }
    return made;
  } finally {
    if (held === undefined) delete process.env.NAIVE_TRIGGERS_ACTIVE; else process.env.NAIVE_TRIGGERS_ACTIVE = held;
  }
}

/** The triggers, the latest runs, what waits on a package, and the failures still open. */
export function report(dir: string) {
  const { triggers, problems } = triggersOf(dir);
  // Read only: a listing never moves an unreadable state file aside (the next run does, and raises it).
  const s = (() => { try { return load(ventureFile(dir, STATE)) as State; } catch { return { runs: [] as Run[], waiting: [] as Waiting[] }; } })();
  return { triggers: triggers.map((t) => ({ id: t.id, from: t.from, on: t.on, run: t.run.propose ? { propose: t.run.propose.id } : { route: t.run.route, action: t.run.action }, needs: t.needs ?? null, needs_complete: t.needs ? complete(dir, t.needs) : null, enabled: t.enabled, once: !!t.once })),
    problems, runs: s.runs.slice(-10), waiting: s.waiting, open: s.runs.filter((r) => r.status === "raised").map((r) => ({ run: r.n, trigger: r.trigger, error: r.error, decision: r.decision, decide: `mentura decide ${r.decision} --venture ${(load(join(dir, "venture.json")) as Venture).id} --by <your name> --answer "Retry" (or "Skip this event", "Turn the trigger off")` })) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/router/orchestration/triggers.ts <venture dir> [--fire] [--json]"); process.exit(2); }
  const json = process.argv.includes("--json"), quiet = process.argv.includes("--quiet");
  if (process.argv.includes("--fire")) {
    const made = await fire(dir);
    if (json) console.log(JSON.stringify(made, null, 2));
    else if (!quiet) for (const r of made) console.log(`${(r.outcome ?? r.status ?? "").padEnd(9)} ${r.trigger}${r.entity ? ` on ${r.activity} of ${r.entity}` : ""}${r.error ? `: ${String(r.error).split("\n")[0]}` : ""}${r.decision && r.status === "raised" ? ` (raised as decision ${r.decision})` : ""}`);
    process.exit(0);
  }
  const r = report(dir);
  if (json) { console.log(JSON.stringify(r, null, 2)); process.exit(0); }
  if (!r.triggers.length) console.log(`no triggers: add them to ${CONFIG} triggers, or list a kit in kits`);
  for (const t of r.triggers) console.log(`trigger   ${t.id} (${t.from})${t.enabled ? "" : " [off]"}: on ${JSON.stringify(t.on)} run ${JSON.stringify(t.run)}${t.needs ? `, needs ${t.needs} (${t.needs_complete ? "complete" : "not complete yet"})` : ""}`);
  for (const p of r.problems) console.log(`problem   ${p}`);
  for (const x of r.runs) console.log(`run ${String(x.n).padEnd(5)} ${(x.outcome ?? "").padEnd(9)} ${x.trigger}${x.entity ? ` on ${x.activity} of ${x.entity}` : ""}${x.status ? ` [${x.status}]` : ""}`);
  for (const w of r.waiting) console.log(`waiting   ${w.trigger}: needs the ${w.needs} package complete`);
  for (const o of r.open) console.log(`failed    ${o.trigger} (run ${o.run}): ${String(o.error).split("\n")[0]}\n          ${o.decide}`);
}
