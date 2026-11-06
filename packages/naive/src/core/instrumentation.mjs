// Instrumentation (Naive's instrumentation.ts, P-4; logging fetches in development, F-4). One hook
// where every router call, every judgment and every provenance entry (write, draft, accept,
// confirm, decision) emits an event. Listeners registered in-process get every event. When a venture
// turns instrumentation on, events are also appended to <venture>/.naive/events.jsonl, which agent
// vitals read (packages/naive/src/router/vitals.mjs, N-6). Provenance stays the record of what changed; events are
// what it cost. An exporter in the app that hosts Naive (such as a LangSmith one) can ship a trace made from
// the events; the framework names no vendor.
//
// Turn it on in the venture's naive.config.json, like adding instrumentation.ts to a Next.js app:
//
//   { "instrumentation": { "events": true } }
//
// NAIVE_INSTRUMENT=1 turns it on for every venture in this process, and NAIVE_INSTRUMENT=0 off.
// No dependencies and no network. An event holds routes, sizes and times, never record content.

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "./venture-paths.mjs";

export const EVENTS = ".naive/events.jsonl";
const listeners = new Set();
const scope = new AsyncLocalStorage();

/** Tokens a payload costs an agent, estimated as characters / 4 (the common rule of thumb). */
export const tokens = (x) => Math.ceil((x === undefined ? 0 : typeof x === "string" ? x.length : (JSON.stringify(x) ?? "").length) / 4);

/** Registers a listener for every event, like register() in instrumentation.ts. Returns the unregister. */
export function register(fn) { listeners.add(fn); return () => listeners.delete(fn); }

const configOf = (dir) => {
  const f = dir && join(ventureFile(dir, "naive.config.json"));
  if (!f || !existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, "utf8")); } catch { return {}; }
};

/** Whether a venture writes its events log. */
export function enabled(dir) {
  if (process.env.NAIVE_INSTRUMENT === "0") return false;
  if (process.env.NAIVE_INSTRUMENT === "1") return !!dir;
  const i = configOf(dir).instrumentation;
  return i === true || i?.events === true;
}

/** Emits one event: to every listener, and to the venture's events log when it is on. */
export function emit(dir, event) {
  const e = { at: new Date().toISOString(), id: randomUUID(), session: process.env.MENTURA_SESSION ?? null, ...event };
  for (const k of Object.keys(e)) if (e[k] === undefined) delete e[k];
  for (const fn of listeners) { try { fn(e, dir); } catch {} }
  if (dir && enabled(dir)) {
    try { mkdirSync(join(dir, ".naive"), { recursive: true }); appendFileSync(ventureFile(dir, EVENTS), JSON.stringify(e) + "\n"); } catch {}
  }
  return e;
}

/** The venture's events, oldest first. */
export function events(dir) {
  const f = ventureFile(dir, EVENTS);
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).flatMap((l) => { try { return [JSON.parse(l)]; } catch { return []; } });
}

/**
 * Wraps one router call: times it, measures what it sends back, and emits a call event. A call made
 * inside another (a view reads its record, the overview runs its slots) carries its parent's id, so
 * vitals count only what the agent asked for. dirOf resolves the venture folder.
 */
export async function instrumented(args, fn, dirOf) {
  const parent = scope.getStore() ?? null;
  const id = randomUUID();
  const t0 = performance.now();
  const r = await scope.run(id, () => fn(args));
  if (process.env.NAIVE_INSTRUMENT === "0" && !listeners.size) return r;
  let dir = null;
  try { dir = args.venture ? dirOf(args.venture, args.workspace) : null; } catch {}
  if (!dir && !listeners.size) return r;
  const useful = !!r?.ok && r.result !== null && r.result !== undefined && !r.needs_input;
  emit(dir, { kind: "call", id, parent, session: args.session ?? args.input?.session ?? process.env.MENTURA_SESSION ?? null, venture: args.venture ?? null, route: args.route, action: args.action,
    ok: !!r?.ok, useful, ms: Math.round(performance.now() - t0), tokens: tokens(r?.result ?? r?.error), actor: args.actor ?? "agent", via: args.via ?? "router" });
  return r;
}

/**
 * Records one judgment (a System 1 call or a scored check): what was asked, the score and the outcome.
 * @param {string} dir
 * @param {{ question?: string, score?: number, threshold?: number, outcome: string, owner?: string, model?: string, route?: string, ms?: number }} j
 */
export function judgment(dir, { question, score, threshold, outcome, owner, model, route, ms }) {
  return emit(dir, { kind: "judgment", question, score, threshold, outcome, owner, model, route, ms });
}
