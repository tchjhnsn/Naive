#!/usr/bin/env node
// Prerequisites (EE-217): what must exist before a function workflow may run, and the lock that holds when it does
// not. A workflow says what it needs in `requires` (function-workflow.schema.json), and a step may say more of its
// own. Three kinds, and nothing else:
//
//   records    a route whose record is live in the venture. A draft the gate holds is not live: a person accepts it.
//   meetings   a function workflow a meeting walked, closed with its goal reached. The meeting record is EE-200.
//   decisions  a decision a person has decided.
//
// It fails closed. An entry this cannot resolve, for any reason, counts as missing, so a workflow whose ground is
// unknown does not run. The chain Naive ships is data, in the workflow files: the strategy foundation before products,
// products before what is sold, and so on down. A venture loosens or tightens an entry under `prerequisites` in
// naive.config.json, which the schema holds to `set_by` a person, so only a person ever opens a lock.
//
// Who the lock holds: `naive due` and `naive loop` mark a blocked workflow blocked and never start it, `naive agent
// run --workflow` refuses it, and the router refuses a write to a route only blocked workflows write, for an agent
// and for a person alike (packages/naive/src/router/gate-hooks.ts). A person may pass an explicit override, which the
// provenance line keeps; an agent never may.
//
//   node packages/naive/src/engine/prerequisites.ts <venture dir> [--json]     every workflow, in hierarchical order
//   naive blocked [--json]
//
// judge, overrideProblem and requireProblems are pure. Reading the venture is an Effect through VentureFs (EE-125).

import { Effect } from "effect";
import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import type { VentureFsShape } from "../core/effect/fs.ts";
import { CannotRun } from "../core/effect/errors.ts";
import type { NaiveError } from "../core/effect/errors.ts";
import { runMain, runSync } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { PHASES, resolve } from "../records/routes/routes.ts";
import { loadPhase } from "../phases/phases.ts";
import { catalog } from "./departments.ts";
import { decisionFile } from "./decisions.ts";
import { functionAgent } from "./agents/function-spec.ts";
import { readConfig } from "./naive-config.ts";
import { functionsOf } from "./research-programs.ts";

/** The three kinds of ground a workflow may stand on. */
export type RequireKind = "record" | "meeting" | "decision";
/** `requires` on a workflow or one of its steps. */
export type RequireList = { records?: readonly string[]; meetings?: readonly string[]; decisions?: readonly string[] };
/** One entry, as the workflow named it. */
export type Requirement = { readonly kind: RequireKind; readonly ref: string };
/** Why an entry does not hold: missing (it is not there yet) or unresolved (nothing here can say, so it fails closed). */
export type MissingState = "missing" | "unresolved";
/** One entry that blocks, with the sentence a person reads. */
export type Missing = { readonly kind: RequireKind; readonly ref: string; readonly why: string; readonly state: MissingState };
/** The verdict on one workflow or step: met, or the entries that block it, in the order they were named. */
export type Prerequisites = { readonly met: boolean; readonly missing: readonly Missing[] };

/** What a meeting record says, of the little this reads (meeting.schema.json, EE-200). */
export type MeetingFact = { readonly id?: string; readonly workflow?: string | null; readonly status?: string; readonly outcome?: { readonly reached?: string } | null };
/** What a decision record says, of the little this reads. */
export type DecisionFact = { readonly id: string; readonly status: string };
/**
 * What the venture says about the entries asked about, gathered once and judged purely.
 * `live` holds the record refs whose record is live, `known` the ones the route table serves, `workflows` the
 * `<function>/<workflow>` ids the function modules have, and `unresolved` the kinds nothing here can answer for,
 * each with why, so every entry of that kind fails closed.
 */
export type Facts = {
  readonly live: ReadonlySet<string>;
  readonly known: ReadonlySet<string>;
  readonly workflows: ReadonlySet<string>;
  readonly meetings: readonly MeetingFact[];
  readonly decisions: readonly DecisionFact[];
  readonly unresolved: ReadonlyMap<RequireKind, string>;
};

/** A person's explicit override of the lock on one write. */
export type Override = { readonly by?: string; readonly why?: string };
/** The override as the provenance line keeps it. */
export type OverrideRecord = { rule: string; by: string; why: string; missing: string[] };

const MET: Prerequisites = { met: true, missing: [] };
const list = (v: readonly string[] | undefined): readonly string[] => v ?? [];

/** The entries of a `requires`, in kind order: records, then meetings, then decisions. */
export const requirementsIn = (r: RequireList | undefined): Requirement[] => !r ? [] : [
  ...list(r.records).map((ref): Requirement => ({ kind: "record", ref })),
  ...list(r.meetings).map((ref): Requirement => ({ kind: "meeting", ref })),
  ...list(r.decisions).map((ref): Requirement => ({ kind: "decision", ref })),
];

/** The same entry named twice, by the workflow and by a step, is one entry. */
export const dedupe = (reqs: readonly Requirement[]): Requirement[] => {
  const seen = new Set<string>();
  return reqs.filter((r) => { const k = `${r.kind} ${r.ref}`; if (seen.has(k)) return false; seen.add(k); return true; });
};

/**
 * The verdict on a set of entries, from facts the caller gathered. Pure. `off` holds the entries a person loosened
 * (`<kind> <ref>` or the bare ref), which do not block. Every other entry must be provably met, or it blocks: this is
 * the fail-closed rule, and it is the whole point of the lock.
 */
export function judge(reqs: readonly Requirement[], facts: Facts, off: ReadonlySet<string> = new Set()): Prerequisites {
  const missing: Missing[] = [];
  for (const { kind, ref } of dedupe(reqs)) {
    if (off.has(ref) || off.has(`${kind} ${ref}`)) continue;
    const unresolved = facts.unresolved.get(kind);
    const block = (why: string, state: MissingState = "missing") => missing.push({ kind, ref, why, state });
    if (kind === "record") {
      if (!facts.known.has(ref)) block(`${ref} is no record route in this install, so nothing can say whether it exists`, "unresolved");
      else if (!facts.live.has(ref)) block(`no record is live at ${ref}: write it, and a person accepts it if the gate holds the draft`);
      continue;
    }
    if (kind === "meeting") {
      if (unresolved) block(unresolved, "unresolved");
      else if (!facts.workflows.has(ref)) block(`${ref} is no function workflow, so no meeting can walk it`, "unresolved");
      else {
        const held = facts.meetings.filter((m) => m.workflow === ref);
        const closed = held.filter((m) => m.status === "closed");
        if (closed.some((m) => m.outcome?.reached === "yes")) continue;
        block(closed.length ? `the meeting that walked ${ref} closed without reaching its goal (${closed.map((m) => m.outcome?.reached ?? "no outcome").join(", ")}): hold it again and close it with its goal reached`
          : held.length ? `the meeting that walked ${ref} is ${held.map((m) => m.status ?? "unknown").join(", ")}, not closed: work its agenda and close it with its goal reached`
          : `no meeting has walked ${ref}: hold it, draft the records its agenda asks for, and close it with its goal reached`);
      }
      continue;
    }
    if (unresolved) { block(unresolved, "unresolved"); continue; }
    const d = facts.decisions.find((x) => x.id === ref);
    if (d?.status === "decided") continue;
    block(d ? `decision ${ref} is ${d.status}: only a person decides it` : `the venture has no decision ${ref}: raise it, and a person decides it`);
  }
  return missing.length ? { met: false, missing } : MET;
}

/** Why this override does not count, or null. Only a person overrides, and they say who they are and why. Pure. */
export function overrideProblem({ actor, acting = false, override }: { actor: string; acting?: boolean; override?: Override | null }): string | null {
  if (!override) return "no override was named";
  if (actor !== "person" || acting) return `an agent never overrides a prerequisite: ${acting ? "this call is made while an agent is acting" : "this call is an agent's"}`;
  if (!override.by?.trim()) return "an override names the person making it (--by <person>)";
  if (!override.why?.trim()) return "an override says why, for the provenance line (--why <text>)";
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// The shipped chain, read from the function modules. The repository is the same for every venture, so it is memoized.

/** One workflow of a function module, of what this reads. */
export type Flow = { id: string; function: string; title?: string; requires?: RequireList; steps?: readonly { id?: string; requires?: RequireList; writes?: readonly string[] }[] };
let flows: Map<string, Flow> | undefined;

/** Every workflow of every function module, by `<function>/<workflow>`. The modules are the repository's, read once per process. */
export function allFlows(): Map<string, Flow> {
  if (flows) return flows;
  flows = new Map();
  for (const d of catalog()) {
    let spec;
    try { spec = functionAgent(d.id); } catch { continue; }
    for (const w of spec.workflows) {
      try { flows.set(`${d.id}/${w}`, JSON.parse(readFileSync(join(spec.module, "workflows", `${w}.json`), "utf8")) as Flow); } catch { /* check-functions reports a workflow that cannot be read */ }
    }
  }
  return flows;
}

/** A collection route and its item route are one place: `foundation/goals/[id]` is a write to `foundation/goals`. */
export const routeKey = (route: string): string => route.replace(/\/(\[[^\]]+\]|\*)$/, "");

/**
 * The workflows whose steps write a route, by `<function>/<workflow>`. The route may be concrete (product/kettle) or
 * a table route (product/[id]); both are matched at the collection, so one place has one set of writers. Pure.
 */
export function writersOf(route: string, table?: string): string[] {
  const keys = new Set([routeKey(route), ...(table ? [routeKey(table)] : [])]);
  const out: string[] = [];
  for (const [id, w] of allFlows()) if ((w.steps ?? []).some((s) => (s.writes ?? []).some((x) => keys.has(routeKey(x))))) out.push(id);
  return out;
}

/**
 * The routes every function may write, whatever its ground: decisions and handoffs. A blocked workflow still raises
 * the decision and opens the handoff that unblock it, so the lock never shuts the door it is opened through.
 */
export const ALWAYS_OPEN = ["decisions", "decisions/*", "operations/handoff"];
const alwaysOpen = (route: string, table?: string): boolean =>
  [route, table ?? route].some((x) => ALWAYS_OPEN.some((o) => routeKey(x) === routeKey(o) || x.startsWith(`${routeKey(o)}/`)));

// ---------------------------------------------------------------------------------------------------------------
// The venture: its own loosening and tightening, the facts, and the verdicts.

/** `prerequisites` in naive.config.json. The schema requires `set_by`, so a venture loosens nothing without a person. */
export type PrerequisiteConfig = { set_by?: { person?: string; at?: string }; workflows?: Record<string, RequireList & { off?: readonly string[] }> };

/** The venture's `prerequisites`, or undefined. A block with no person in `set_by` is ignored: only a person loosens a lock. */
export const prerequisiteConfig = (dir: string): Effect.Effect<PrerequisiteConfig | undefined, CannotRun> => Effect.try({
  try: () => {
    const p = (readConfig(dir) as { prerequisites?: PrerequisiteConfig }).prerequisites;
    return p?.set_by?.person?.trim() ? p : undefined;
  },
  catch: (cause) => new CannotRun({ message: cause instanceof Error ? cause.message : String(cause), cause }),
});

/** What one workflow, or one of its steps, requires: the shipped chain plus what the venture added. A step inherits the workflow's. */
export const requirementsOf = (dir: string, workflow: string, step?: string): Effect.Effect<{ reqs: Requirement[]; off: Set<string> }, NaiveError> => Effect.gen(function* () {
  const w = allFlows().get(workflow);
  const cfg = yield* prerequisiteConfig(dir);
  const own = cfg?.workflows?.[workflow];
  const s = step === undefined ? undefined : (w?.steps ?? []).find((x) => x.id === step);
  if (step !== undefined && !s) return yield* new CannotRun({ message: `${workflow} has no step ${step}` });
  return {
    reqs: dedupe([...requirementsIn(w?.requires), ...requirementsIn(s?.requires), ...requirementsIn(own)]),
    off: new Set(own?.off ?? []),
  };
});

/** Whether a record is live at a route: a file the route names is there. A held draft lives in _drafts/, so it is not. */
const liveAt = (fs: VentureFsShape, dir: string, ref: string): Effect.Effect<boolean> => Effect.gen(function* () {
  const { r, params } = resolve(ref);
  if (!r || r.kind !== "record") return false;
  const patterns = r.collection === "item" && params.id !== undefined ? r.files.map((f) => f.replace(/\*\*\/\*|\*/, String(params.id))) : r.files;
  // ventureFile maps the logical path to where this venture's layout keeps it; a `*` is one name along the way.
  for (const p of patterns) if (yield* anyFile(fs, dir, relative(dir, ventureFile(dir, p)).split(sep))) return true;
  return false;
});

/** Whether any file under `at` matches the rest of a pattern's segments, where `*` stands for one name. */
const anyFile = (fs: VentureFsShape, at: string, segs: readonly string[]): Effect.Effect<boolean> => Effect.gen(function* () {
  const [head, ...rest] = segs;
  if (head === undefined) return false;
  const names = head.includes("*")
    ? (yield* Effect.orElseSucceed(fs.list(at), () => [])).filter((n) => new RegExp(`^${head.split("*").map((x) => x.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("[^/]*")}$`).test(n))
    : [head];
  for (const n of names) {
    const next = join(at, n);
    if (!rest.length) { if (yield* fs.exists(next)) return true; continue; }
    if (yield* anyFile(fs, next, rest)) return true;
  }
  return false;
});

/** The route the meeting record lives at (EE-200), when this install has it. */
export const MEETING_ROUTE = "operations/meeting/[id]";
/** Stands for a file that could not be read. A record's own content is never this, so the two never mix up. */
const UNREADABLE: unique symbol = Symbol("unreadable");

/** The facts the venture can offer about the entries asked about. Anything it cannot answer is recorded as unresolved, so it fails closed. */
export const gatherFacts = (dir: string, reqs: readonly Requirement[]): Effect.Effect<Facts, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const live = new Set<string>(), known = new Set<string>();
  const unresolved = new Map<RequireKind, string>();
  for (const ref of new Set(reqs.filter((r) => r.kind === "record").map((r) => r.ref))) {
    const r = resolve(ref).r;
    if (!r || r.kind !== "record") continue;
    known.add(ref);
    if (yield* liveAt(fs, dir, ref)) live.add(ref);
  }
  const meetings: MeetingFact[] = [];
  if (reqs.some((r) => r.kind === "meeting")) {
    const route = resolve(MEETING_ROUTE.replace("[id]", "x")).r;
    const folder = route?.kind === "record" ? route.files.find((f) => f.includes("*"))?.split("/").slice(0, -1).join("/") : undefined;
    if (!folder) unresolved.set("meeting", `this install has no ${MEETING_ROUTE} route, so no meeting can be read: a meeting is a record since EE-200`);
    else {
      const at = ventureFile(dir, folder);
      for (const f of (yield* Effect.orElseSucceed(fs.list(at), () => [])).filter((x) => x.endsWith(".json"))) {
        const m = yield* Effect.orElseSucceed(readJson(join(at, f)), () => UNREADABLE);
        if (m === UNREADABLE) { unresolved.set("meeting", `${folder}/${f} cannot be read, so what has been met cannot be told`); break; }
        meetings.push(m as MeetingFact);
      }
    }
  }
  const decisions: DecisionFact[] = [];
  for (const id of new Set(reqs.filter((r) => r.kind === "decision").map((r) => r.ref))) {
    // The venture's decision files are read as every other command reads them, by id (engine/decisions.ts).
    const found = yield* Effect.orElseSucceed(Effect.try(() => decisionFile(dir, id) ?? null), () => UNREADABLE);
    if (found === UNREADABLE) { unresolved.set("decision", "the venture's decisions cannot be read, so what has been decided cannot be told"); break; }
    if (typeof found !== "string") continue;
    const d = yield* Effect.orElseSucceed(readJson(ventureFile(dir, found)), () => UNREADABLE);
    if (d === UNREADABLE) { unresolved.set("decision", `${found} cannot be read, so what has been decided cannot be told`); break; }
    const rec = d as { id?: string; status?: string };
    decisions.push({ id: rec.id ?? id, status: rec.status ?? "open" });
  }
  return { live, known, workflows: new Set(allFlows().keys()), meetings, decisions, unresolved };
});

/** Whether a workflow, or one of its steps, may run in this venture. Fails closed on anything it cannot resolve. */
export const prerequisitesOfEffect = (dir: string, workflow: string, step?: string): Effect.Effect<Prerequisites, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const { reqs, off } = yield* requirementsOf(dir, workflow, step);
  if (!reqs.length) return MET;
  return judge(reqs, yield* gatherFacts(dir, reqs), off);
});

/**
 * Whether a workflow, or one of its steps, may run in this venture: { met, missing }. This is the one answer every
 * caller asks for, the router and another runner alike. It is pure over the files: no model, and nothing is written.
 */
export const prerequisitesOf = (dir: string, workflow: string, step?: string): Prerequisites => runSync(prerequisitesOfEffect(dir, workflow, step));

/** Every workflow of the functions the venture lists, with its verdict. The facts are gathered once for all of them. */
export const blockedForEffect = (dir: string): Effect.Effect<Map<string, Prerequisites>, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const mine = [...allFlows().keys()].filter((id) => functionsOf(dir).includes(id.split("/")[0]));
  const each = new Map<string, { reqs: Requirement[]; off: Set<string> }>();
  for (const id of mine) each.set(id, yield* requirementsOf(dir, id));
  const facts = yield* gatherFacts(dir, [...each.values()].flatMap((x) => x.reqs));
  return new Map(mine.map((id) => {
    const { reqs, off } = each.get(id) ?? { reqs: [], off: new Set<string>() };
    return [id, reqs.length ? judge(reqs, facts, off) : MET];
  }));
});

/** Every workflow of the functions the venture lists, with its verdict. */
export const blockedFor = (dir: string): Map<string, Prerequisites> => runSync(blockedForEffect(dir));

/** The lock on one write: the blocked workflows that are the only writers of this route, and what they are missing. */
export type BlockedWrite = { readonly rule: "prerequisites"; readonly source: "function workflows"; readonly workflows: readonly string[]; readonly missing: readonly Missing[]; readonly why: string };

/**
 * Whether a write to a route is locked: null when some workflow that writes it may run, or when no workflow writes it
 * at all, and the lock when every workflow that writes it is blocked. Decisions and handoffs are never locked.
 */
export const blockedWriteEffect = (dir: string, { route, table }: { route: string; table?: string }): Effect.Effect<BlockedWrite | null, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  if (alwaysOpen(route, table)) return null;
  const mine = functionsOf(dir);
  const writers = writersOf(route, table).filter((id) => mine.includes(id.split("/")[0]));
  if (!writers.length) return null;
  const verdicts = new Map<string, Prerequisites>();
  for (const id of writers) {
    const v = yield* prerequisitesOfEffect(dir, id);
    if (v.met) return null;
    verdicts.set(id, v);
  }
  const seen = new Set<string>();
  const missing = [...verdicts.values()].flatMap((v) => v.missing).filter((m) => { const k = `${m.kind} ${m.ref}`; if (seen.has(k)) return false; seen.add(k); return true; });
  return {
    rule: "prerequisites", source: "function workflows", workflows: writers, missing,
    why: `${route} is written by ${writers.join(", ")}, and ${writers.length === 1 ? "it is" : "every one is"} blocked: ${missing.map((m) => m.why).join("; ")}`,
  };
});

/** Whether a write to a route is locked (blockedWriteEffect), as a plain value. */
export const blockedWrite = (dir: string, args: { route: string; table?: string }): BlockedWrite | null => runSync(blockedWriteEffect(dir, args));

// ---------------------------------------------------------------------------------------------------------------
// naive blocked: the venture's workflows in hierarchical order, phase, then function, then workflow.

/** One row of `naive blocked`. */
export type BlockedRow = {
  readonly phase: string | null;
  readonly function: string;
  readonly workflow: string;
  readonly title: string;
  readonly met: boolean;
  readonly missing: readonly Missing[];
  /** What unblocks it first, or null. */
  readonly first: Missing | null;
};

/** The venture's workflows in hierarchical order: the phase that first lists one as active, then its function, then the module's order. */
export const blockedList = (dir: string): Effect.Effect<BlockedRow[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const verdicts = yield* blockedForEffect(dir);
  const phase = new Map<string, string>();
  for (const p of PHASES) for (const w of (yield* loadPhase(p.id)).workflows) if (!phase.has(w)) phase.set(w, p.id);
  const order: string[] = PHASES.map((p) => p.id);
  const fns = functionsOf(dir);
  const rows = [...verdicts].map(([workflow, v]): BlockedRow => ({
    phase: phase.get(workflow) ?? null, function: workflow.split("/")[0], workflow, title: allFlows().get(workflow)?.title ?? workflow,
    met: v.met, missing: v.missing, first: v.missing[0] ?? null,
  }));
  return rows.sort((a, b) => (a.phase === null ? order.length : order.indexOf(a.phase)) - (b.phase === null ? order.length : order.indexOf(b.phase))
    || fns.indexOf(a.function) - fns.indexOf(b.function) || a.workflow.localeCompare(b.workflow));
});

// ---------------------------------------------------------------------------------------------------------------
// The check the function modules are held to (packages/naive/src/checks/check-functions.ts calls this).

/**
 * The tier above the strategy foundation (EE-220): a pre-registration comes before the mission, the vision and the
 * rest of the strategy documents. The rule below is on whenever the route exists: check-functions fails any workflow
 * that writes a foundation record without requiring a pre-registration, on the workflow or on the writing step, so
 * the entry cannot be forgotten when a new workflow is added.
 */
export const PRE_REGISTRATION = "foundation/pre-registration";
/** Whether a workflow writes a foundation record, which is what must come after a pre-registration. */
const writesFoundation = (w: Flow): boolean => (w.steps ?? []).some((s) => (s.writes ?? []).some((x) => x === "foundation" || x.startsWith("foundation/")));

/**
 * What is wrong with the `requires` of a set of workflows. Pure, over the modules alone: every record entry is a
 * record route, every meeting entry is a workflow some module has, no shipped workflow names a decision (a venture's
 * decision ids are its own, so only its naive.config.json may name one), every workflow that writes a foundation
 * record requires a pre-registration once that route exists, and no cycle: a workflow never waits, through the records
 * written and the meetings held, on a workflow that waits on it.
 */
export function requireProblems(workflows: ReadonlyMap<string, Flow>, { recordRoute, hasWorkflow }: { recordRoute: (ref: string) => boolean; hasWorkflow: (id: string) => boolean }): { workflow: string; error: string }[] {
  const out: { workflow: string; error: string }[] = [];
  const edges = new Map<string, Set<string>>();
  const writers = (ref: string): string[] => [...workflows].filter(([, w]) => (w.steps ?? []).some((s) => (s.writes ?? []).some((x) => routeKey(x) === routeKey(ref)))).map(([id]) => id);
  for (const [id, w] of workflows) {
    const where: [string, RequireList | undefined][] = [["requires", w.requires], ...(w.steps ?? []).map((s): [string, RequireList | undefined] => [`step ${s.id}`, s.requires])];
    const to = new Set<string>();
    for (const [at, req] of where) {
      for (const ref of list(req?.records)) {
        if (!recordRoute(ref)) out.push({ workflow: id, error: `${at} names record ${ref}, which is no record route` });
        else for (const from of writers(ref)) if (from !== id) to.add(from);
      }
      for (const ref of list(req?.meetings)) {
        if (!hasWorkflow(ref)) out.push({ workflow: id, error: `${at} names meeting ${ref}, which is no function workflow` });
        else if (ref !== id) to.add(ref);
      }
      for (const ref of list(req?.decisions)) out.push({ workflow: id, error: `${at} names decision ${ref}; a shipped workflow cannot know a venture's decision ids, so only naive.config.json prerequisites names one` });
    }
    // The pre-registration tier, once its route exists (EE-220).
    if (recordRoute(PRE_REGISTRATION) && writesFoundation(w) && !where.some(([, req]) => list(req?.records).includes(PRE_REGISTRATION)))
      out.push({ workflow: id, error: `it writes a foundation record, so it must require the record ${PRE_REGISTRATION}: a pre-registration comes before the mission, the vision and the rest of the strategy documents (EE-220)` });
    edges.set(id, to);
  }
  // A cycle would lock every workflow in it for good, since neither could ever go first.
  const state = new Map<string, number>();
  const walk = (id: string, path: string[]): void => {
    if (state.get(id) === 2) return;
    if (state.get(id) === 1) { out.push({ workflow: id, error: `requires is a cycle: ${[...path.slice(path.indexOf(id)), id].join(" waits on ")}` }); return; }
    state.set(id, 1);
    for (const next of edges.get(id) ?? []) walk(next, [...path, id]);
    state.set(id, 2);
  };
  for (const id of workflows.keys()) walk(id, []);
  return out;
}

/**
 * What is wrong with a venture's `prerequisites` (packages/naive/src/checks/check-config.ts): a workflow it does not
 * have, an entry that does not resolve, and an `off` that names no entry of that workflow, which would look like it
 * opened a lock and open nothing. Pure, over the modules and the names the venture gave.
 */
export function prerequisiteProblems(cfg: PrerequisiteConfig | undefined, mine: readonly string[]): string[] {
  if (!cfg) return [];
  const out: string[] = [];
  for (const [id, own] of Object.entries(cfg.workflows ?? {})) {
    if (!mine.includes(id)) { out.push(`prerequisites: workflows names ${id}, which is not a workflow of a function this venture lists`); continue; }
    for (const ref of list(own.records)) if (resolve(ref).r?.kind !== "record") out.push(`prerequisites: ${id} records ${ref}, which is no record route`);
    for (const ref of list(own.meetings)) if (!allFlows().has(ref)) out.push(`prerequisites: ${id} meetings ${ref}, which is no function workflow`);
    const has = new Set(requirementsIn(allFlows().get(id)?.requires).concat(requirementsIn(own)).flatMap((r) => [r.ref, `${r.kind} ${r.ref}`]));
    for (const ref of list(own.off)) if (!has.has(ref)) out.push(`prerequisites: ${id} turns off ${ref}, which is not one of its entries (${[...has].filter((x) => !x.includes(" ")).join(", ") || "it has none"})`);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  const program: Effect.Effect<void, NaiveError, "naive/VentureFs"> = Effect.gen(function* () {
    if (!dir) return yield* new CannotRun({ message: "usage: node packages/naive/src/engine/prerequisites.ts <venture dir> [--json]" });
    const rows = yield* blockedList(dir);
    if (args.includes("--json")) { console.log(JSON.stringify({ blocked: rows.filter((r) => !r.met).length, workflows: rows }, null, 2)); return; }
    if (!rows.length) { console.log("The venture lists no functions in venture.json departments, so no workflow has prerequisites."); return; }
    for (const r of rows) console.log(`${(r.met ? "met" : "blocked").padEnd(8)} ${(r.phase ?? "-").padEnd(11)} ${r.workflow.padEnd(44)} ${r.first ? `${r.first.ref}: ${r.first.why}` : "nothing is missing"}`);
    const blocked = rows.filter((r) => !r.met).length;
    console.log(`\n${blocked} of ${rows.length} workflow${rows.length === 1 ? "" : "s"} blocked. A person opens a lock under prerequisites in naive.config.json, or passes --override --by <person> --why <text> on one write.`);
  });
  await runMain(program);
}
