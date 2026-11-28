#!/usr/bin/env node
// Goals as durable records (EE-210), the way the decision ledger is durable: a goal carries where it stands, the
// goal it serves, the goals it replaces, and every version of it stays readable.
//
//   naive goals [list] [--json]                        the goal tree: parent and children, status, measures, owner
//   naive goals show <id> [--at <iso>] [--json]        one goal, as it is now or as it stood at a transaction time
//   naive goals history <id> [--json]                  every version of it, oldest first, from provenance and the blobs
//   naive goals status <id> <status> --by <person>     a person moves it on
//          [--note <text>] [--measure <id>=<value>]... [--superseded-by <id>] [--json]
//
//   node packages/naive/src/engine/goals.ts <venture dir> [list|show|history|status] ...
//
// The lifecycle (LIFECYCLE below) is a state machine, not a set of booleans:
//
//   proposed -> active, dropped, superseded      a goal nobody adopted is never met or missed
//   active   -> met, missed, dropped, superseded
//   met, missed, dropped, superseded -> active   a settled goal reopens only to active, as a correction
//   superseded also needs the successor, on both sides: the old goal's superseded_by and the new goal's supersedes
//
// Only a person settles a goal (EE-058 for decisions, the same rule here): `naive goals status` refuses anyone who
// is not a person of the venture, and an agent acting as one. An agent proposes a goal and may say where it should
// go; the router holds any write of a lifecycle field as a draft whatever the gate says (goalSettles, wired in
// packages/naive/src/router/router.ts), so a person accepting the draft is the person's act. A write that breaks the
// state machine, or that edits the wording a person adopted, is refused outright (goalWriteRefusal).
//
// History needs no new log. Every write through the router or through here appends a provenance line whose sha256
// names the bytes in the blob store (packages/naive/src/core/blobs.ts), so the versions are already kept;
// historyOf reads those lines and their blobs, and `show --at` reads one version through
// packages/naive/src/store/as-of.ts. A line written before the blob store existed has no bytes, and is reported as a
// version whose record is null; nothing is backfilled.
//
// The pure parts (statusOf, transitionRefusal, goalSettles, goalWriteRefusal, goalTree) take records and return
// verdicts. Reading and writing files is an Effect through VentureFs (EE-125).

import { Effect } from "effect";
import { join } from "node:path";
import { CannotRun, NotFound, Refused, SchemaInvalid, type NaiveError } from "../core/effect/errors.ts";
import { VentureFs, readJson } from "../core/effect/fs.ts";
import { runMain } from "../core/effect/run.ts";
import { readBlobEffect } from "../core/blobs.ts";
import { agentFromEnv, entriesEffect, type Entry } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { readAsOf } from "../store/as-of.ts";
import { writeRecordEffect } from "../store/record-write.ts";
import { validateValue } from "../records/validate.ts";
import { refusedPerson } from "./decisions.ts";
import { inbox } from "./gate-drafts.ts";
import type { Goal, Requirement } from "../records/types/records.d.ts";

/** Where a venture's goals live, as a logical path. */
export const GOALS = "foundation/goals";
/** Where a venture's requirements live, as a logical path. Requirements derive from goals. */
export const REQUIREMENTS = "foundation/requirements";

export type GoalStatus = NonNullable<Goal["status"]>;
/** Every status, in lifecycle order. */
export const STATUSES: readonly GoalStatus[] = ["proposed", "active", "met", "missed", "dropped", "superseded"];
/** The statuses a goal is settled in: it is no longer being worked, unless a person reopens it. */
export const SETTLED: readonly GoalStatus[] = ["met", "missed", "dropped", "superseded"];
/** Where a goal may go from where it is. A status never changes to itself, so no entry lists its own key. */
export const LIFECYCLE: Readonly<Record<GoalStatus, readonly GoalStatus[]>> = Object.freeze({
  proposed: ["active", "dropped", "superseded"],
  active: ["met", "missed", "dropped", "superseded"],
  met: ["active"],
  missed: ["active"],
  dropped: ["active", "superseded"],
  superseded: ["active"],
});
/** The fields that say where a goal stands. Only a person settles them. */
export const LIFECYCLE_FIELDS: readonly (keyof Goal)[] = ["status", "status_by", "status_at", "result", "superseded_by"];
/** The wording a person adopted when the goal left proposed. It is superseded, never edited by an agent. */
export const ADOPTED_FIELDS: readonly (keyof Goal)[] = ["statement", "kind", "value", "end_state"];

/** Where a goal stands. A record with no status is proposed, so goals written before the ledger stay valid. */
export const statusOf = (g: Pick<Goal, "status">): GoalStatus => g.status ?? "proposed";

/** Whether a value is one of the statuses. A record reaches the write rule before its schema, so this is a real check. */
export const isStatus = (s: unknown): s is GoalStatus => STATUSES.some((x) => x === s);

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Why a goal cannot go from one status to another, or null. Staying where it is is always allowed. Pure. */
export function transitionRefusal(from: GoalStatus, to: GoalStatus): string | null {
  if (from === to) return null;
  if (!isStatus(to)) return `${String(to)} is not a goal status: one of ${STATUSES.join(", ")}`;
  if (LIFECYCLE[from].includes(to)) return null;
  const reopen = SETTLED.includes(from) ? `; a settled goal reopens only to active` : "";
  return `a ${from} goal does not become ${to}: from ${from} it goes to ${LIFECYCLE[from].join(", ")}${reopen}`;
}

/** Whether a write settles a goal: it changes a field that says where the goal stands. Pure. */
export function goalSettles(stored: Partial<Goal> | null, input: Partial<Goal>): boolean {
  if (!stored) return LIFECYCLE_FIELDS.some((f) => f !== "status" ? input[f] !== undefined : statusOf(input) !== "proposed");
  return LIFECYCLE_FIELDS.some((f) => (f === "status" ? statusOf(input) !== statusOf(stored) : !same(input[f], stored[f])));
}

/**
 * Why one write of a goal is refused, or null when it may go on. `stored` is the goal as it is now (null for a new
 * one), `input` the whole record being written, and `person` true for a person's write.
 *
 * Nobody breaks the state machine, a person included: a mis-set status is corrected by reopening the goal to active,
 * which the log keeps. An agent may propose a goal and say where it should go, which the router holds as a draft, but
 * it never rewrites the wording a person adopted: that is a new goal that supersedes this one.
 */
export function goalWriteRefusal({ stored, input, person }: { stored: Partial<Goal> | null; input: Partial<Goal>; person: boolean }): string | null {
  const id = input.id ?? stored?.id ?? "the goal";
  const to = statusOf(input);
  if (!stored) return isStatus(to) ? null : `${String(to)} is not a goal status: one of ${STATUSES.join(", ")}`;
  const from = statusOf(stored);
  const why = transitionRefusal(from, to);
  if (why) return `${id} is ${from}: ${why}`;
  if (person) return null;
  const edited = ADOPTED_FIELDS.filter((f) => !same(input[f], stored[f]));
  if (from !== "proposed" && edited.length) return `${id} is ${from}, so a person adopted its wording: an agent does not change ${edited.join(", ")}. Write a new goal whose supersedes names ${id}, and a person supersedes this one with naive goals status ${id} superseded --superseded-by <new goal> --by <person>`;
  return null;
}

/** A goal with the file it came from, and whether it is live or a draft waiting for a person. */
export interface GoalRecord { readonly goal: Goal, readonly file: string, readonly draft: boolean }
/** One node of the goal tree: a goal, and the goals that serve it. */
export interface GoalNode extends GoalRecord { readonly depth: number }
/** One version of a goal, from one provenance line. `record` is null when the line has no bytes in the blob store. */
export interface GoalVersion {
  readonly at: string, readonly activity: string, readonly by: string, readonly sha256: string,
  readonly note?: string, readonly status: GoalStatus | null, readonly record: Goal | null,
}

const hasId = (v: unknown): v is { id: string } => typeof v === "object" && v !== null && typeof (v as { id?: unknown }).id === "string";
const isGoal = (v: unknown): v is Goal => hasId(v);
const isRequirement = (v: unknown): v is Requirement => hasId(v);
const fileOf = (id: string) => `${GOALS}/${id}.json`;

/** Every JSON record in one of a venture's record folders, by file name. A folder that is not there holds none. */
const collection = <T>(dir: string, rel: string, is: (v: unknown) => v is T): Effect.Effect<{ rec: T, file: string }[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const folder = ventureFile(dir, rel);
  if (!(yield* fs.isDirectory(folder))) return [];
  const out: { rec: T, file: string }[] = [];
  for (const f of (yield* fs.list(folder)).filter((x) => x.endsWith(".json")).sort()) {
    const rec = yield* readJson(join(folder, f));
    if (is(rec)) out.push({ rec, file: `${rel}/${f}` });
  }
  return out;
});

/** A venture's live goals, by file name. A venture with no goals folder has none. */
export const readGoals = (dir: string): Effect.Effect<GoalRecord[], NaiveError, "naive/VentureFs"> =>
  Effect.map(collection(dir, GOALS, isGoal), (found) => found.map(({ rec, file }) => ({ goal: rec, file, draft: false })));

/** A venture's requirements, by file name. Each one derives from goals or their measures. */
export const readRequirements = (dir: string): Effect.Effect<{ rec: Requirement, file: string }[], NaiveError, "naive/VentureFs"> => collection(dir, REQUIREMENTS, isRequirement);

/**
 * The goals waiting as held drafts (the gate's _drafts/, packages/naive/src/engine/gate-drafts.ts). A list read of
 * foundation/goals shows only live records, so a reader is told "no goals yet" while an agent's drafts wait; `naive
 * goals list` shows these too, marked as drafts. Only variant a is read: the others are the same goal's alternatives.
 */
export const readDraftGoals = (dir: string): Effect.Effect<GoalRecord[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const held = (yield* Effect.sync(() => inbox(dir))).filter((d) => d.file.startsWith(`${GOALS}/`) && d.file.endsWith(".json"));
  const out: GoalRecord[] = [];
  for (const d of held) {
    const rec = yield* readJson(ventureFile(dir, d.draft));
    if (isGoal(rec)) out.push({ goal: rec, file: d.file, draft: true });
  }
  return out;
});

/** Every goal a venture has, live first and then the held drafts of goals that have no live record. */
export const allGoals = (dir: string): Effect.Effect<GoalRecord[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const live = yield* readGoals(dir);
  const ids = new Set(live.map((g) => g.goal.id));
  return [...live, ...(yield* readDraftGoals(dir)).filter((d) => !ids.has(d.goal.id))];
});

/**
 * The goal tree: each root (a goal with no parent, or whose parent is not here) followed by the goals that serve it,
 * depth first, by id. A goal in a parent cycle is listed once, at the end, at depth 0, so the tree always shows every
 * goal; packages/naive/src/checks/check-goals.ts is what fails on the cycle. Pure.
 */
export function goalTree(goals: readonly GoalRecord[]): GoalNode[] {
  const byId = new Map(goals.map((g) => [g.goal.id, g]));
  const children = new Map<string, GoalRecord[]>();
  const roots: GoalRecord[] = [];
  for (const g of [...goals].sort((a, b) => a.goal.id.localeCompare(b.goal.id))) {
    const parent = g.goal.parent;
    if (parent !== undefined && byId.has(parent) && parent !== g.goal.id) children.set(parent, [...(children.get(parent) ?? []), g]);
    else roots.push(g);
  }
  const out: GoalNode[] = [];
  const seen = new Set<string>();
  const walk = (g: GoalRecord, depth: number): void => {
    if (seen.has(g.goal.id)) return;
    seen.add(g.goal.id);
    out.push({ ...g, depth });
    for (const c of children.get(g.goal.id) ?? []) walk(c, depth + 1);
  };
  for (const r of roots) walk(r, 0);
  for (const g of goals) if (!seen.has(g.goal.id)) out.push({ ...g, depth: 0 });
  return out;
}

/** Who a provenance line says wrote a version. */
const whoOf = (e: Entry): string => e.agent?.id ?? e.agent?.kind ?? "unknown";

/**
 * Every version of one goal, oldest first: one entry per provenance line for its file, with the record those bytes
 * hold. Drafts are versions too, marked by their activity, because a held draft is part of the goal's history even
 * though it was never live.
 */
export const historyOf = (dir: string, id: string): Effect.Effect<GoalVersion[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const path = fileOf(id);
  const out: GoalVersion[] = [];
  for (const e of (yield* entriesEffect(dir)).filter((x) => x.entity === path || x.entity.endsWith(`://${path}`))) {
    const bytes = e.sha256 ? yield* Effect.catchTags(readBlobEffect(dir, e.sha256), { NotFound: () => Effect.succeed(null), ParseError: () => Effect.succeed(null) }) : null;
    let record: Goal | null = null;
    if (bytes) { try { const v: unknown = JSON.parse(bytes.toString("utf8")); record = isGoal(v) ? v : null; } catch { record = null; } }
    out.push({ at: e.at, activity: e.activity, by: whoOf(e), sha256: e.sha256 ?? "", ...(e.note ? { note: e.note } : {}), status: record ? statusOf(record) : null, record });
  }
  return out;
});

/** What a person's status change adds to the goal. */
export interface StatusInput {
  readonly by?: string, readonly note?: string, readonly supersededBy?: string,
  readonly measures?: readonly { id: string, value: string | number }[], readonly at?: string, readonly via?: string,
}

/**
 * A person moves a goal on. It refuses anyone who is not a person of the venture, an agent acting as one, a
 * transition the state machine does not allow, a met or missed goal with nothing to show for it, and a supersession
 * that does not name an existing successor. On success the goal is written and the change is in provenance, with its
 * bytes in the blob store, so `naive goals history` can read this version back.
 */
export const setStatus = (dir: string, id: string, status: GoalStatus, input: StatusInput = {}): Effect.Effect<{ goal: Goal, from: GoalStatus, provenance: string }, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  if (!isStatus(status)) return yield* new Refused({ rule: "goal-status", message: `${String(status)} is not a goal status`, hint: `one of ${STATUSES.join(", ")}` });
  const by = input.by;
  if (!by) return yield* new Refused({ rule: "person-only", message: "setting a goal's status needs the person's name (--by)" });
  const refused = yield* Effect.sync(() => refusedPerson(dir, by));
  if (refused) return yield* new Refused({ rule: "person-only", message: `only a person settles a goal: ${refused}` });
  const file = ventureFile(dir, fileOf(id));
  if (!(yield* fs.exists(file))) return yield* new NotFound({ what: `goal ${id}`, path: fileOf(id) });
  const stored = yield* readJson(file);
  if (!isGoal(stored)) return yield* new Refused({ rule: "goal-record", message: `${fileOf(id)} is not a goal record` });
  const from = statusOf(stored);
  const why = transitionRefusal(from, status);
  if (why) return yield* new Refused({ rule: "goal-lifecycle", message: why });
  const at = input.at ?? new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const next: Goal = { ...stored, status, status_by: by, status_at: at };
  if (status === "superseded") {
    const successor = input.supersededBy;
    if (!successor) return yield* new Refused({ rule: "goal-successor", message: `superseding ${id} names the goal that replaces it`, hint: `--superseded-by <goal id>` });
    if (successor === id) return yield* new Refused({ rule: "goal-successor", message: `${id} cannot supersede itself` });
    if (!(yield* fs.exists(ventureFile(dir, fileOf(successor))))) return yield* new NotFound({ what: `goal ${successor}, which would replace ${id}`, path: fileOf(successor) });
    next.superseded_by = successor;
  } else Reflect.deleteProperty(next, "superseded_by");
  if (status === "met" || status === "missed") {
    const measures = (input.measures ?? []).map((m) => ({ ...m }));
    const unknown = measures.filter((m) => !(stored.measures ?? []).some((x) => x.id === m.id)).map((m) => m.id);
    if (unknown.length) return yield* new Refused({ rule: "goal-measure", message: `${id} has no measure ${unknown.join(", ")}`, hint: `its measures are ${(stored.measures ?? []).map((m) => m.id).join(", ") || "none"}` });
    if (!input.note && !measures.length) return yield* new Refused({ rule: "goal-result", message: `a ${status} goal says what happened`, hint: `--note <text>, or --measure <id>=<value> for each measure` });
    next.result = { ...(input.note ? { note: input.note } : {}), ...(measures.length ? { measures } : {}), by, at };
  }
  const v = validateValue("goal.schema.json", next);
  if (v.status !== 0) return yield* new SchemaInvalid({ schema: "goal.schema.json", errors: (v.stdout + v.stderr).trim().split("\n").filter(Boolean) });
  const entry = yield* writeRecordEffect(dir, fileOf(id), next, { route: `${GOALS}/${id}`, activity: "write", agent: agentFromEnv("person", input.via ?? "cli", { id: by }),
    note: `${id} is ${status}${status === "superseded" ? `, replaced by ${next.superseded_by}` : ""} (set by ${by})` });
  return { goal: next, from, provenance: entry.hash };
});

const line = (n: GoalNode): string => {
  const g = n.goal;
  const parts = [
    g.owner ? `owner ${g.owner}` : "no owner",
    `${(g.measures ?? []).length} ${(g.measures ?? []).length === 1 ? "measure" : "measures"}`,
    ...(g.due ? [`due ${g.due}`] : []),
    ...(g.superseded_by ? [`replaced by ${g.superseded_by}`] : []),
    ...(n.draft ? ["draft, waiting for a person"] : []),
  ];
  return `${"  ".repeat(n.depth)}${g.id} [${statusOf(g)}] ${g.statement} (${parts.join(", ")})`;
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const valued = ["--by", "--note", "--superseded-by", "--measure", "--at"];
  const flag = (name: string): string | undefined => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1]; };
  const all = (name: string): string[] => argv.flatMap((a, i) => (a === name && argv[i + 1] !== undefined ? [argv[i + 1]] : []));
  const [dir, cmd = "list", id, status] = argv.filter((a, i) => !a.startsWith("--") && !valued.includes(argv[i - 1]));
  const json = argv.includes("--json");
  const usage = "usage: node packages/naive/src/engine/goals.ts <venture dir> [list] [--json]\n"
    + "       node packages/naive/src/engine/goals.ts <venture dir> show <id> [--at <iso>] [--json]\n"
    + "       node packages/naive/src/engine/goals.ts <venture dir> history <id> [--json]\n"
    + "       node packages/naive/src/engine/goals.ts <venture dir> status <id> <status> --by <person> [--note <text>] [--measure <id>=<value>]... [--superseded-by <id>] [--json]";
  const program: Effect.Effect<void, NaiveError, "naive/VentureFs"> = Effect.gen(function* () {
    if (!dir || !["list", "show", "history", "status"].includes(cmd) || (cmd !== "list" && !id) || (cmd === "status" && !isStatus(status))) return yield* new CannotRun({ message: usage });
    if (cmd === "list") {
      const nodes = goalTree(yield* allGoals(dir));
      if (json) { console.log(JSON.stringify({ goals: nodes.map((n) => ({ id: n.goal.id, status: statusOf(n.goal), parent: n.goal.parent ?? null, depth: n.depth, draft: n.draft, owner: n.goal.owner ?? null, due: n.goal.due ?? null, measures: (n.goal.measures ?? []).map((m) => m.id), statement: n.goal.statement })) }, null, 2)); return; }
      if (!nodes.length) { console.log(`no goals in ${GOALS} yet, and none waiting as a draft`); return; }
      for (const n of nodes) console.log(line(n));
      console.log(`\nOnly a person moves a goal on: naive goals status <id> <status> --by <person>. Nothing written.`);
      return;
    }
    if (cmd === "show") {
      const path = fileOf(String(id));
      const cut = flag("--at");
      if (cut !== undefined) {
        if (Number.isNaN(Date.parse(cut))) return yield* new CannotRun({ message: `--at takes a time: ${cut}` });
        const was = yield* Effect.sync(() => readAsOf(dir, path, cut));
        if (!was) return yield* new NotFound({ what: `goal ${id} as of ${cut}`, path });
        console.log(json ? JSON.stringify({ at: was.at, activity: was.activity, sha256: was.sha256, record: JSON.parse(was.content) }, null, 2) : `${path} as of ${cut} (written ${was.at})\n${was.content.trimEnd()}`);
        return;
      }
      const found = (yield* allGoals(dir)).find((g) => g.goal.id === id);
      if (!found) return yield* new NotFound({ what: `goal ${id}`, path });
      console.log(json ? JSON.stringify(found, null, 2) : `${path}${found.draft ? " (a draft waiting for a person)" : ""}\n${JSON.stringify(found.goal, null, 2)}`);
      return;
    }
    if (cmd === "history") {
      const versions = yield* historyOf(dir, String(id));
      if (json) { console.log(JSON.stringify({ goal: id, versions }, null, 2)); return; }
      if (!versions.length) { console.log(`no provenance lines for ${fileOf(String(id))}: nothing was written through Naive`); return; }
      for (const v of versions) console.log(`${v.at}  ${v.activity.padEnd(7)} ${(v.status ?? "?").padEnd(10)} ${v.by.padEnd(16)} ${v.record ? v.record.statement : "(no bytes in the blob store: written before it existed)"}`);
      return;
    }
    const given = all("--measure");
    if (given.some((m) => !m.includes("="))) return yield* new CannotRun({ message: `--measure takes <id>=<value>: ${given.filter((m) => !m.includes("=")).join(", ")}` });
    const measures = given.map((m) => { const at = m.indexOf("="); return { id: m.slice(0, at), value: m.slice(at + 1) }; });
    if (!isStatus(status)) return yield* new CannotRun({ message: usage });
    const out = yield* setStatus(dir, String(id), status, { by: flag("--by") ?? process.env.MENTURA_PERSON, note: flag("--note"), supersededBy: flag("--superseded-by"), measures, at: flag("--at") });
    console.log(json ? JSON.stringify(out, null, 2) : `${out.goal.id}: ${out.from} -> ${statusOf(out.goal)} by ${out.goal.status_by} at ${out.goal.status_at} (provenance ${out.provenance.slice(0, 12)})`);
  });
  await runMain(program);
}
