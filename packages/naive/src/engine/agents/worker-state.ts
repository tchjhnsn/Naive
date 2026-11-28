// The lifecycle of a digital worker (EE-235): a deployment of one role as a running agent, recorded at
// operations/workers/<id>.json. This file is the statechart and nothing else, pure, so the router, the commands and
// the Lean model in packages/naive/lean/Naive/Workers.lean read one table.
//
//   transition("proposed", "activate", "person")   // { to: "active", refused: null }
//   transition("proposed", "activate", "agent")    // { to: "proposed", refused: "only a person activates a worker" }
//   reachOf("active", ["a/*"])                     // ["a/*"]; any other status gives []
//
// The machine is total: every phase, event and actor gives an answer, and an event the phase has no move for leaves
// the phase as it was with the reason. Ended is absorbing. Only a person moves a worker into active, by activate or
// by resume, which is the hook the staffing gate (EE-236) uses. No event changes a worker's writes, and only an
// active worker has any reach, so a transition never widens what a worker may write.

/** The four statuses a worker record holds. */
export const STATUSES = ["proposed", "active", "suspended", "ended"] as const;
export type WorkerStatus = typeof STATUSES[number];
/** A phase of the machine: a status, or absent before the worker is proposed. */
export type Phase = "absent" | WorkerStatus;
export const PHASES: readonly Phase[] = ["absent", ...STATUSES];
/** The six events. */
export const EVENTS = ["propose", "activate", "suspend", "resume", "end", "expire"] as const;
export type WorkerEvent = typeof EVENTS[number];
/** Who causes an event: a person, or an agent (a lead, a function agent, the worker itself, or the clock's sweep). */
export const ACTORS = ["person", "agent"] as const;
export type Actor = typeof ACTORS[number];

/** Each phase's moves: the event, where it goes, and whether only a person may cause it. */
const MOVES: Readonly<Record<Phase, Partial<Record<WorkerEvent, { readonly to: Phase; readonly person?: true }>>>> = {
  absent: { propose: { to: "proposed" } },
  proposed: { activate: { to: "active", person: true }, end: { to: "ended" }, expire: { to: "ended" } },
  active: { suspend: { to: "suspended" }, end: { to: "ended" }, expire: { to: "ended" } },
  suspended: { resume: { to: "active", person: true }, end: { to: "ended" }, expire: { to: "ended" } },
  ended: {},
};

/** One step of the machine. Total: a move it lacks, or one only a person may make, leaves the phase with a reason. */
export function transition(from: Phase, event: WorkerEvent, by: Actor): { to: Phase; refused: string | null } {
  const move = MOVES[from][event];
  if (!move) return { to: from, refused: from === "ended" ? "an ended worker stays ended: deploy a new one" : `a ${from} worker has no ${event}` };
  if (move.person && by !== "person") return { to: from, refused: `only a person ${event === "resume" ? "resumes" : "activates"} a worker` };
  return { to: move.to, refused: null };
}

/** The event that moves a worker from one phase to another, or null when no event does. */
export function eventBetween(from: Phase, to: Phase): WorkerEvent | null {
  const hit = (Object.entries(MOVES[from]) as [WorkerEvent, { to: Phase }][]).find(([, m]) => m.to === to);
  return hit ? hit[0] : null;
}

/** What a worker may write in a phase: its writes while active, and nothing otherwise. */
export const reachOf = (phase: Phase, writes: readonly string[]): string[] => (phase === "active" ? [...writes] : []);
