#!/usr/bin/env node
// Each element's state, capability level and effects for one venture (EE-190, step 7 of
// docs/design/HOOKS_AND_LOOPS_2026-11-26.md). The rules are pure, in element-state.ts; this reads the venture into
// them. Elements and their feeds come from the element graph (element-graph.ts, EE-188).
//
// What belongs to an element. A step is attached to its activity, every ancestor of it and its function's category,
// as in the graph. An element's workflows are the workflows with a step attached to it, and its record types are the
// record types the routes those steps write resolve to.
//
// Its own state is the statechart replayed, from absent, over these events in time order:
//   record-written  a live line in provenance.jsonl (write, accept, merge or rollback) whose route resolves to one
//                   of its record types, carrying the record type's data category (EE-184): any record starts it,
//                   and a transactional one says it operates
//   run-finished    a done run of one of its workflows in .naive/workflow-runs.jsonl
//   run-failed      a failed run of one of its workflows
//   cleared         a skipped run clears that workflow's failure and lateness, as a person settled the occurrence
// and then, at now:
//   run-overdue     one of its scheduled workflows that has finished before and whose cadence has passed (due.ts)
//   record-stale    one of its records that freshness.ts finds stale or expired
// Retirement has no record yet, so no element is derived retired (not built). A record written to a shared route
// counts for every element whose steps write it, whether or not the venture lists that function.
//
// Its own level is levelOf() over that state and its runs. Effects are propagate() over the feeds edges.
//
//   node packages/naive/src/engine/element-effects.ts <venture dir> [<element>] [--at <iso>] [--json]
//   naive effects [<element>] [--venture <dir>] [--at <iso>] [--json]

import { Effect } from "effect";
import { join } from "node:path";
import { readJson } from "../core/effect/fs.ts";
import { CannotRun } from "../core/effect/errors.ts";
import type { NaiveError } from "../core/effect/errors.ts";
import { runMain } from "../core/effect/run.ts";
import { entriesEffect } from "../core/provenance.ts";
import { dataOf } from "../records/index.ts";
import { resolve } from "../records/routes/routes.ts";
import { LIVE, dueFor, readRuns } from "./due.ts";
import type { WorkflowRun } from "./due.ts";
import { buildGraph, elementOf, shippedInput, toJson } from "./element-graph.ts";
import type { ElementGraph, ElementNode } from "./element-graph.ts";
import { LEVELS, causeKey, levelOf, propagate, replay, whatIf, SCENARIOS } from "./element-state.ts";
import type { Data, Effective, ElementEvent, Feeds, Own, Quality, Scenario, WhatIf } from "./element-state.ts";
import { freshness } from "./freshness.ts";
import { functionsOf } from "./research-programs.ts";
import { now as clockNow } from "../core/clock.ts";

/** What belongs to an element: its workflows and the record types its steps write. */
export interface Attachment { readonly workflows: readonly string[], readonly records: readonly string[] }

/** Each element's workflows and record types, read off the graph. */
export function attachments(g: ElementGraph): Map<string, Attachment> {
  const { nodes, edges } = toJson(g);
  const sorted = (s: Iterable<string>) => [...new Set(s)].sort();
  const children = new Map<string, string[]>();
  for (const e of edges) if (e.kind === "contains") children.set(e.from, [...(children.get(e.from) ?? []), e.to]);
  const below = (id: string): string[] => [id, ...(children.get(`element:${id}`) ?? []).flatMap((c) => below(c.slice("element:".length)))];
  const resolves = new Map<string, string[]>();
  for (const e of edges) if (e.kind === "resolves") resolves.set(e.from, [...(resolves.get(e.from) ?? []), e.to.slice("record:".length)]);
  const writes = edges.flatMap((e) => (e.kind === "writes" ? [{ workflow: e.from.slice("workflow:".length), step: e.step, route: e.to }] : []));
  const performs = edges.flatMap((e) => (e.kind === "performs" ? [{ workflow: e.from.slice("workflow:".length), step: e.step, element: e.to.slice("element:".length) }] : []));
  const out = new Map<string, Attachment>();
  for (const n of nodes) {
    if (n.kind !== "element") continue;
    const steps = n.level === 1
      ? writes.filter((w) => w.workflow.startsWith(`${n.function}/`)).map((w) => ({ workflow: w.workflow, step: w.step }))
      : performs.filter((p) => below(n.id).includes(p.element)).map((p) => ({ workflow: p.workflow, step: p.step }));
    const workflows = n.level === 1 ? nodes.flatMap((w) => (w.kind === "workflow" && w.function === n.function ? [w.id] : [])) : steps.map((s) => s.workflow);
    const records = writes.filter((w) => steps.some((s) => s.workflow === w.workflow && s.step === w.step)).flatMap((w) => resolves.get(w.route) ?? []);
    out.set(n.id, { workflows: sorted(workflows), records: sorted(records) });
  }
  return out;
}

/** What the venture's files say, before it is split by element. */
export interface VentureEvidence {
  /** Live writes: the record file, its record type and data category, and when. */
  readonly writes: readonly { readonly path: string, readonly record: string, readonly data: Data | null, readonly at: string }[],
  readonly runs: readonly WorkflowRun[],
  /** Scheduled workflows that finished before and whose cadence has passed at now. */
  readonly overdue: readonly string[],
  /** Record files that are stale or expired at now, with their record type. */
  readonly stale: readonly { readonly path: string, readonly record: string }[],
  /** The functions venture.json departments lists. */
  readonly listed: readonly string[],
}
export interface ElementReport {
  readonly element: ElementNode,
  readonly attachment: Attachment,
  readonly events: readonly ElementEvent[],
  readonly quality: Quality,
  readonly effective: Effective,
  /** Why it has its own state, one sentence each. */
  readonly why: readonly string[],
}

/** The events an element's evidence gives, in time order, with now's conditions last. Pure. */
export function eventsOf(a: Attachment, v: VentureEvidence, now: string): ElementEvent[] {
  const timed: { at: string, e: ElementEvent }[] = [];
  for (const w of v.writes) if (w.at <= now && a.records.includes(w.record)) timed.push({ at: w.at, e: { kind: "record-written", record: w.path, data: w.data } });
  for (const r of v.runs) {
    if (r.at > now || !a.workflows.includes(r.workflow)) continue;
    if (r.outcome === "done") timed.push({ at: r.at, e: { kind: "run-finished", workflow: r.workflow } });
    else if (r.outcome === "failed") timed.push({ at: r.at, e: { kind: "run-failed", workflow: r.workflow } });
    else for (const c of ["run-failed", "run-overdue"]) timed.push({ at: r.at, e: { kind: "cleared", cause: `${c}:${r.workflow}` } });
  }
  timed.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0));
  return [
    ...timed.map((t) => t.e),
    ...v.overdue.filter((w) => a.workflows.includes(w)).map((workflow): ElementEvent => ({ kind: "run-overdue", workflow })),
    ...v.stale.filter((s) => a.records.includes(s.record)).map((s): ElementEvent => ({ kind: "record-stale", record: s.path })),
  ];
}

/** Every element's report for a venture's evidence at now. Pure. */
export function report(g: ElementGraph, v: VentureEvidence, now: string): ElementReport[] {
  const att = attachments(g);
  const nodes = toJson(g).nodes.flatMap((n) => (n.kind === "element" ? [n] : []));
  const feeds: Feeds[] = toJson(g).edges.flatMap((e) => (e.kind === "feeds" ? [{ from: e.from.slice("element:".length), to: e.to.slice("element:".length) }] : []));
  const parts = nodes.map((n) => {
    const a = att.get(n.id)!;
    const events = eventsOf(a, v, now);
    const state = replay(events);
    const runs = v.runs.filter((r) => r.at <= now && a.workflows.includes(r.workflow) && r.outcome !== "skipped").sort((x, y) => (x.at < y.at ? -1 : 1));
    const finished = runs.filter((r) => r.outcome === "done");
    const written = v.writes.filter((w) => w.at <= now && a.records.includes(w.record));
    const quality = levelOf({ state, performed: finished.length > 0 || written.some((w) => w.data === "transactional"), finished: finished.length, recent_failure: runs.slice(-3).some((r) => r.outcome === "failed") });
    const why = [
      written.length ? `${written.length} live ${written.length === 1 ? "write" : "writes"} to its records, the first ${written[0].path} on ${written[0].at.slice(0, 10)}.` : `No live write to its records (${a.records.join(", ") || "none"}).`,
      finished.length ? `${finished.length} finished ${finished.length === 1 ? "run" : "runs"}, the last ${finished.at(-1)!.workflow} on ${finished.at(-1)!.at.slice(0, 10)}.` : `No finished run of ${a.workflows.join(", ") || "any workflow"}.`,
      ...(state.tag === "degraded" ? [`Degraded by ${state.causes.map(causeKey).join(", ")}.`] : []),
      ...(n.function && !v.listed.includes(n.function) ? [`venture.json departments does not list ${n.function}.`] : []),
    ];
    return { element: n as ElementNode, attachment: a, events, quality, state, why };
  });
  const eff = propagate(parts.map((p): Own => ({ id: p.element.id, state: p.state, level: p.quality.level })), feeds);
  return parts.map((p) => ({ element: p.element, attachment: p.attachment, events: p.events, quality: p.quality, effective: eff.get(p.element.id)!, why: p.why }));
}

/** What happens downstream of one element under each scenario. Pure. */
export function whatIfs(g: ElementGraph, reports: readonly ElementReport[], element: string): WhatIf[] {
  const feeds: Feeds[] = toJson(g).edges.flatMap((e) => (e.kind === "feeds" ? [{ from: e.from.slice("element:".length), to: e.to.slice("element:".length) }] : []));
  const own = reports.map((r): Own => ({ id: r.element.id, state: r.effective.own, level: r.effective.own_level }));
  return (Object.keys(SCENARIOS) as Scenario[]).map((s) => whatIf(own, feeds, element, s));
}

/** Reads a venture's evidence at now. */
export const evidenceOf = (dir: string, now: string): Effect.Effect<VentureEvidence, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  yield* readJson(join(dir, "venture.json"));
  const writes = (yield* entriesEffect(dir)).flatMap((e) => {
    if (!e.route || !e.at || !LIVE.has(e.activity)) return [];
    const r = resolve(e.route).r;
    return r && r.kind === "record" && r.record ? [{ path: e.entity, record: r.record, data: dataOf(r.record), at: e.at }] : [];
  });
  const overdue = (yield* dueFor(dir, now)).filter((d) => d.trigger.kind === "schedule" && d.status === "due" && d.last_done !== null).map((d) => d.workflow);
  const fresh = yield* Effect.tryPromise({ try: () => freshness(dir, { now, light: true }), catch: (cause) => new CannotRun({ message: `freshness could not be read: ${String(cause)}`, cause }) });
  const stale = fresh.items.filter((i) => i.state !== "fresh").map((i) => ({ path: i.path, record: i.record }));
  return { writes, runs: yield* readRuns(dir), overdue, stale, listed: functionsOf(dir) };
});

const stateLabel = (e: Effective): string => (e.state.tag === "degraded" ? `degraded (${e.state.causes.map(causeKey).join(", ")})` : e.state.tag);
const name = (r: ElementNode): string => `${r.id}${r.level === 1 && r.function ? ` ${r.function}` : ` ${r.name}`}`;

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const valued = ["--at"];
  const [dir, ref, ...stray] = args.filter((a, i) => !a.startsWith("--") && !valued.includes(args[i - 1]));
  const i = args.indexOf("--at");
  const at = i < 0 ? clockNow().toISOString() : args[i + 1];
  const usage = "usage: node packages/naive/src/engine/element-effects.ts <venture dir> [<element>] [--at <iso>] [--json]";
  const program: Effect.Effect<void, NaiveError, "naive/VentureFs"> = Effect.gen(function* () {
    if (!dir || stray.length || !at || Number.isNaN(Date.parse(at)) || args.some((a) => a.startsWith("--") && !["--at", "--json"].includes(a))) return yield* new CannotRun({ message: usage });
    const now = new Date(at).toISOString();
    const g = buildGraph(yield* shippedInput());
    const reports = report(g, yield* evidenceOf(dir, now), now);
    const json = args.includes("--json");
    if (ref !== undefined) {
      const e = elementOf(g, ref);
      if (!e) return yield* new CannotRun({ message: `no element ${ref} in the graph: name a function, an APQC hierarchy id a workflow reaches, or a catalog activity a step performs` });
      const mine = reports.find((r) => r.element.id === e.id)!;
      const scenarios = whatIfs(g, reports, e.id);
      if (json) { console.log(JSON.stringify({ at: now, element: mine, what_if: scenarios }, null, 2)); return; }
      console.log(`${name(e)}: ${stateLabel(mine.effective)}, level ${mine.effective.level} (${LEVELS[mine.effective.level]}), own level ${mine.effective.own_level}`);
      for (const w of [...mine.why, ...mine.quality.why]) console.log(`  ${w}`);
      console.log(`  To raise it: ${mine.quality.next}`);
      for (const s of scenarios) {
        const changed = s.downstream.filter((d) => d.changed);
        console.log(`\nIf ${e.id} were ${s.scenario} (${s.downstream.length} downstream, ${changed.length} would change):`);
        for (const d of changed) console.log(`  ${d.id}: ${stateLabel(d.now)}, level ${d.now.level} -> ${stateLabel(d.then)}, level ${d.then.level}`);
      }
      return;
    }
    if (json) { console.log(JSON.stringify({ at: now, elements: reports }, null, 2)); return; }
    for (const r of reports) {
      const cap = r.effective.capped_by.length ? `, capped by ${r.effective.capped_by.join(", ")}` : "";
      console.log(`${name(r.element).padEnd(48).slice(0, 48)} ${stateLabel(r.effective)}; level ${r.effective.level} of own ${r.effective.own_level}${cap}`);
    }
  });
  await runMain(program);
}
