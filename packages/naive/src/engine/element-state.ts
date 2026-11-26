// The state, quality and effects of an element (EE-190, step 7 of docs/design/HOOKS_AND_LOOPS_2026-11-26.md). An
// element is a node of the element graph (element-graph.ts, EE-188): a function or an APQC process group, process or
// activity that a workflow reaches. Everything here is pure and total, with no I/O, so step 8 can state it in Lean 4
// without Mathlib: the statechart (`transition`), the capability level from evidence (`levelOf`), and propagation over
// the feeds edges (`propagate`, `whatIf`). element-effects.ts reads a venture's logs into these inputs.
//
// State. A tagged union with five tags. `degraded` keeps its causes, never empty, sorted by key, and the state it
// left (started or operating), which it returns to once the last cause clears.
//
//   absent     no record on its routes has been written
//   started    a record was written, and no finished run or transactional record says it operates
//   operating  a run of one of its workflows finished, or a transactional record was written
//   degraded   one or more causes: a failed run, an overdue run, a stale record, or an element it reads that is
//              absent, retired or degraded
//   retired    a person retired it. Absorbing: no event leaves it.
//
// Quality. A capability level after ISO/IEC 33020, 0 to 5. Naive evidences 0 to 3 only. Level 4 needs a measure with
// a target bound to the element and results against it, and level 5 needs changes to the process made from those
// measures; Naive keeps neither (not built), so every level is capped at 3. The run counts behind levels 2 and 3 are
// unvalidated priors.
//
// Effects. An element needs every element that feeds it: the workflows do not say which reads are optional (not
// built). Propagation applies `upstream-down` through `transition` for every upstream that is absent, retired or
// degraded, and caps each level at the weakest upstream level plus a slack (1, an unvalidated prior). It starts from
// each element's own state and level and repeats until nothing changes. It terminates on cycles because each round
// can only add causes and roots and lower levels, every one drawn from a finite set (the elements, the levels 0 to 5),
// so the values climb a finite lattice and must stop. It is deterministic: elements and edges are sorted first.

export type Data = "master" | "reference" | "transactional" | "derived";
export type Down = "absent" | "degraded" | "retired";
export type Cause =
  | { readonly kind: "run-failed", readonly workflow: string }
  | { readonly kind: "run-overdue", readonly workflow: string }
  | { readonly kind: "stale", readonly record: string }
  | { readonly kind: "upstream", readonly element: string, readonly upstream: Down };
export type ElementState =
  | { readonly tag: "absent" }
  | { readonly tag: "started" }
  | { readonly tag: "operating" }
  | { readonly tag: "degraded", readonly causes: readonly Cause[], readonly was: "started" | "operating" }
  | { readonly tag: "retired" };
export type ElementEvent =
  | { readonly kind: "record-written", readonly record: string, readonly data: Data | null }
  | { readonly kind: "run-finished", readonly workflow: string }
  | { readonly kind: "run-failed", readonly workflow: string }
  | { readonly kind: "run-overdue", readonly workflow: string }
  | { readonly kind: "record-stale", readonly record: string }
  | { readonly kind: "upstream-down", readonly element: string, readonly upstream: Down }
  | { readonly kind: "cleared", readonly cause: string }
  | { readonly kind: "retire", readonly by: string };

export const ABSENT: ElementState = { tag: "absent" };
export const causeKey = (c: Cause): string => (c.kind === "upstream" ? `upstream:${c.element}` : c.kind === "stale" ? `stale:${c.record}` : `${c.kind}:${c.workflow}`);
const byKey = (a: Cause, b: Cause): number => { const x = causeKey(a), y = causeKey(b); return x < y ? -1 : x > y ? 1 : 0; };

/** The cause an event brings, or null for an event that brings none. */
const causeOf = (e: ElementEvent): Cause | null =>
  e.kind === "run-failed" || e.kind === "run-overdue" ? { kind: e.kind, workflow: e.workflow }
  : e.kind === "record-stale" ? { kind: "stale", record: e.record }
  : e.kind === "upstream-down" ? { kind: "upstream", element: e.element, upstream: e.upstream }
  : null;
/** The cause keys an event clears: a finished run clears its workflow's failure and lateness, a write its own staleness. */
const clearsOf = (e: ElementEvent): string[] =>
  e.kind === "run-finished" ? [`run-failed:${e.workflow}`, `run-overdue:${e.workflow}`]
  : e.kind === "record-written" ? [`stale:${e.record}`]
  : e.kind === "cleared" ? [e.cause]
  : [];
/** Whether an event is evidence the element operates. */
const operates = (e: ElementEvent): boolean => e.kind === "run-finished" || (e.kind === "record-written" && e.data === "transactional");

/** The statechart. Total: every state and event gives a state. */
export function transition(s: ElementState, e: ElementEvent): ElementState {
  if (s.tag === "retired" || e.kind === "retire") return { tag: "retired" };
  if (s.tag === "absent") return e.kind === "record-written" ? (operates(e) ? { tag: "operating" } : { tag: "started" }) : s;
  const cause = causeOf(e);
  if (s.tag === "started" || s.tag === "operating") {
    const was = s.tag === "operating" || operates(e) ? "operating" : "started";
    return cause ? { tag: "degraded", causes: [cause], was } : { tag: was };
  }
  const clear = clearsOf(e);
  const kept = s.causes.filter((c) => !clear.includes(causeKey(c)));
  const causes = cause && !kept.some((c) => causeKey(c) === causeKey(cause)) ? [...kept, cause].sort(byKey) : kept;
  const was = s.was === "operating" || operates(e) ? "operating" : "started";
  return causes.length ? { tag: "degraded", causes, was } : { tag: was };
}

/** The state after a sequence of events, from absent. */
export const replay = (events: readonly ElementEvent[], from: ElementState = ABSENT): ElementState => events.reduce(transition, from);

/** Whether a state passes harm downstream, and as what. */
export const downOf = (s: ElementState): Down | null => (s.tag === "absent" || s.tag === "retired" || s.tag === "degraded" ? s.tag : null);

// Quality.

export type Level = 0 | 1 | 2 | 3 | 4 | 5;
export const LEVELS = ["incomplete", "performed", "managed", "established", "predictable", "innovating"] as const;
/** The highest level Naive can evidence. */
export const CAP: Level = 3;
/** Unvalidated priors: the finished runs level 2 and level 3 ask for, and the slack in propagation. */
export const PRIORS = { managed_runs: 2, established_runs: 3, slack: 1 } as const;
/** What a level is read from: the element's own state and its runs. */
export interface LevelEvidence {
  readonly state: ElementState,
  /** A finished run of one of its workflows, or a transactional record written. */
  readonly performed: boolean,
  /** Finished runs of its workflows. */
  readonly finished: number,
  /** Whether any of its last three runs failed. */
  readonly recent_failure: boolean,
}
export interface Quality {
  readonly level: Level,
  readonly name: (typeof LEVELS)[number],
  /** Why it has this level, one sentence per rule. */
  readonly why: readonly string[],
  /** What evidence would raise it, or why nothing Naive keeps can. */
  readonly next: string,
}
const q = (level: Level, why: string[], next: string): Quality => ({ level, name: LEVELS[level], why, next });

/** The capability level from evidence, capped at 3. */
export function levelOf(e: LevelEvidence): Quality {
  if (e.state.tag === "absent") return q(0, ["It is absent: no record on its routes has been written."], "A record written on one of its routes, then a finished run or a transactional record.");
  if (e.state.tag === "retired") return q(0, ["A person retired it."], "Nothing: a retired element stays retired.");
  if (!e.performed) return q(0, ["No run of its workflows has finished and no transactional record was written."], "A finished run of one of its workflows, or a transactional record written.");
  const why = ["It is performed: a run finished or a transactional record was written."];
  if (e.state.tag === "degraded") return q(1, [...why, `It is degraded (${e.state.causes.map(causeKey).join(", ")}), so its performance is not managed.`], "Clear every cause of its degradation and finish its runs to their triggers.");
  if (e.finished < PRIORS.managed_runs) return q(1, [...why, `${e.finished} finished ${e.finished === 1 ? "run" : "runs"}: level 2 asks for ${PRIORS.managed_runs} (an unvalidated prior).`], `${PRIORS.managed_runs - e.finished} more finished ${PRIORS.managed_runs - e.finished === 1 ? "run" : "runs"} with no failure, overdue run or stale record.`);
  why.push(`It is managed: its workflows have triggers, ${e.finished} runs finished, and no run failed or is overdue and no record is stale (${PRIORS.managed_runs} runs is an unvalidated prior).`);
  if (e.finished < PRIORS.established_runs || e.recent_failure) {
    return q(2, [...why, e.recent_failure ? "One of its last three runs failed." : `Level 3 asks for ${PRIORS.established_runs} finished runs (an unvalidated prior).`], `${e.recent_failure ? "Three runs in a row with no failure" : `${PRIORS.established_runs - e.finished} more finished ${PRIORS.established_runs - e.finished === 1 ? "run" : "runs"}`} of its shipped workflow.`);
  }
  why.push(`It is established: it runs the shipped workflow, the defined process, and its last three runs did not fail (${PRIORS.established_runs} runs is an unvalidated prior).`);
  return q(3, why, "Level 4 needs a measure with a target bound to this element and run results recorded against it, which Naive does not keep (not built).");
}

// Effects.

/** An element's own state and level, before what feeds it is counted. */
export interface Own { readonly id: string, readonly state: ElementState, readonly level: Level }
export interface Feeds { readonly from: string, readonly to: string }
export interface Effective {
  readonly id: string,
  readonly own: ElementState,
  readonly state: ElementState,
  readonly own_level: Level,
  readonly level: Level,
  /** The upstream elements that capped its level, weakest first, empty when its own evidence sets it. */
  readonly capped_by: readonly string[],
  /** The elements whose own state started the harm that reaches it, itself included when its own state is down. */
  readonly roots: readonly string[],
}

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const same = (a: Effective, b: Effective): boolean => JSON.stringify(a) === JSON.stringify(b);

/** Propagates harm and capability over the feeds edges. Pure, deterministic and terminating on cycles. */
export function propagate(own: readonly Own[], feeds: readonly Feeds[], slack: number = PRIORS.slack): Map<string, Effective> {
  const nodes = [...own].sort((a, b) => cmp(a.id, b.id));
  const ids = new Set(nodes.map((n) => n.id));
  const ups = new Map<string, string[]>();
  for (const f of feeds) if (f.from !== f.to && ids.has(f.from) && ids.has(f.to)) ups.set(f.to, [...new Set([...(ups.get(f.to) ?? []), f.from])].sort(cmp));
  let eff = new Map(nodes.map((n): [string, Effective] => [n.id, { id: n.id, own: n.state, state: n.state, own_level: n.level, level: n.level, capped_by: [], roots: downOf(n.state) ? [n.id] : [] }]));
  // Each round reads only the round before, so the order nodes are visited in cannot change the result. The bound is
  // never reached: it is the height of the lattice (causes and roots per element, plus the levels).
  const bound = nodes.length * (2 * nodes.length + 6) + 1;
  for (let round = 0; ; round++) {
    if (round > bound) throw new Error("propagation did not settle: a bug, since every round moves up a finite lattice");
    const next = new Map<string, Effective>();
    for (const n of nodes) {
      const from = (ups.get(n.id) ?? []).map((u) => eff.get(u)!);
      const down = from.flatMap((u) => { const d = downOf(u.state); return d ? [{ u, d }] : []; });
      const state = down.reduce<ElementState>((s, { u, d }) => transition(s, { kind: "upstream-down", element: u.id, upstream: d }), n.state);
      const cap = Math.min(...from.map((u) => u.level + slack), n.level);
      const level = Math.max(0, Math.min(n.level, cap)) as Level;
      const capped_by = level < n.level ? from.filter((u) => u.level + slack === level).map((u) => u.id) : [];
      const roots = [...new Set([...(downOf(n.state) ? [n.id] : []), ...(state.tag === "degraded" ? down.flatMap(({ u }) => u.roots) : [])])].sort(cmp);
      next.set(n.id, { id: n.id, own: n.state, state, own_level: n.level, level, capped_by, roots });
    }
    if (nodes.every((n) => same(next.get(n.id)!, eff.get(n.id)!))) return next;
    eff = next;
  }
}

export type Scenario = "absent" | "weak" | "strong";
/** What one scenario sets as an element's own state and level. Weak and strong are operating at level 1 and level 5. */
export const SCENARIOS: Readonly<Record<Scenario, { state: ElementState, level: Level }>> = {
  absent: { state: ABSENT, level: 0 },
  weak: { state: { tag: "operating" }, level: 1 },
  strong: { state: { tag: "operating" }, level: 5 },
};
export interface WhatIf {
  readonly element: string,
  readonly scenario: Scenario,
  /** Every element downstream of it, in order, with its effective state and level now and under the scenario. */
  readonly downstream: readonly { readonly id: string, readonly now: Effective, readonly then: Effective, readonly changed: boolean }[],
}

/** The elements reachable from one over the feeds edges, itself excluded, sorted. */
export function reachable(feeds: readonly Feeds[], from: string): string[] {
  const seen = new Set<string>([from]), todo = [from];
  while (todo.length) { const x = todo.pop()!; for (const f of feeds) if (f.from === x && !seen.has(f.to)) { seen.add(f.to); todo.push(f.to); } }
  seen.delete(from);
  return [...seen].sort(cmp);
}

/** What happens downstream if one element were absent, weak or strong, against what is so now. */
export function whatIf(own: readonly Own[], feeds: readonly Feeds[], element: string, scenario: Scenario, slack: number = PRIORS.slack): WhatIf {
  const now = propagate(own, feeds, slack);
  const set = SCENARIOS[scenario];
  const then = propagate(own.map((o) => (o.id === element ? { id: o.id, ...set } : o)), feeds, slack);
  return { element, scenario, downstream: reachable(feeds, element).filter((id) => now.has(id)).map((id) => ({ id, now: now.get(id)!, then: then.get(id)!, changed: !same(now.get(id)!, then.get(id)!) })) };
}
