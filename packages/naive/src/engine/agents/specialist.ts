// Temporary specialists (EE-213, step 10 of docs/design/HOOKS_AND_LOOPS_2026-11-26.md, designed in
// docs/design/SKIPPED_WORK_AND_SPECIALISTS_2026-11-26.md). A function agent that meets a task outside its own skills
// has nowhere to put it, so it spawns one specialist for that task: a role derived from itself, with reach equal to or
// narrower than its own, an expiry, and a brief naming its parent and the task.
//
//   naive agent spawn <parent-role> --task "<text>" [--skills a,b] [--ttl "2 hours"] [--writes a,b] [--print]
//
// The spawn is a record, <venture>/operations/specialists/<role>.json (route operations/specialist/[id]), with a
// provenance line, so who spawned what, for which task, with which reach and until when is auditable. The record is
// the reach: the router gives the role the globs it holds that the parent's own reach still covers (specialistReach in
// ./reach.ts), so a specialist is never wider than its parent, and once it is finished, revoked or expired its reach
// is gone and every write by the role is refused.
//
// A spawn is not a decision about the venture, so it needs no person: the agent is only dividing work it may already
// do, and every write the specialist makes still meets the gate as its own role. Only the parent agent itself, or a
// person, may spawn it, so no agent borrows another function's reach by proxy. A lead, a researcher and a specialist
// cannot spawn one at all, so a chain of specialists cannot grow.
//
// Reading and writing files is an Effect through VentureFs (EE-125); spawnPlan() is pure.

import { Duration, Effect, Option } from "effect";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Refused } from "../../core/effect/errors.ts";
import type { NaiveError } from "../../core/effect/errors.ts";
import { VentureFs, readJson } from "../../core/effect/fs.ts";
import { actingAgent, agentFromEnv, recordEffect } from "../../core/provenance.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { functionAgent, naivePath } from "./function-spec.ts";
import { SPECIALISTS, functionOfAgent, narrowWrites, readSpecialist, specialistOfAgent, specialistReach } from "./reach.ts";
import type { Specialist } from "../../records/types/records.d.ts";
import { nowIso } from "../../core/clock.ts";

export { SPECIALISTS, readSpecialist, specialistOfAgent, specialistReach } from "./reach.ts";

/** Naive's defaults for a specialist: unvalidated priors a venture overrides under `specialists` in naive.config.json. */
export const DEFAULTS = "packages/naive/src/engine/specialists.json";
/** What a venture may override. */
export type SpecialistConfig = { default_ttl?: string };

/** What a spawn asks for. */
export interface SpawnInput {
  readonly parent: string,
  readonly task: string,
  readonly skills?: readonly string[],
  readonly ttl?: string,
  /** Write globs to narrow the parent's reach to. Left out, the specialist gets the parent's own reach. */
  readonly writes?: readonly string[],
  readonly at?: string,
  /** The acting role or person doing the spawning. */
  readonly by?: string,
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
/** The ttl Naive ships, from its data. */
export const shippedTtl = (): string => {
  const d: unknown = JSON.parse(readFileSync(naivePath(DEFAULTS), "utf8"));
  return isObject(d) && typeof d.default_ttl === "string" ? d.default_ttl : "4 hours";
};
/** The milliseconds a ttl is worth, or null when it is not a duration such as "2 hours" or "30 minutes". */
export const ttlMillis = (ttl: string): number | null => {
  const d = Duration.fromInput(ttl.trim() as Duration.Input);
  if (Option.isNone(d)) return null;
  const ms = Duration.toMillis(d.value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};

/** Words that say nothing about the task, dropped from a role's slug so the id reads. */
const FILLER = new Set(["a", "an", "and", "as", "at", "by", "each", "every", "for", "from", "in", "into", "its", "of", "on", "or", "our", "that", "the", "their", "then", "this", "to", "what", "which", "with"]);

/** A role id from the task's words: `<function>-specialist-<slug>`, with a number when the slug is taken. */
export function roleFor(fn: string, task: string, taken: ReadonlySet<string>): string {
  const words = task.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").filter((w) => w && !FILLER.has(w));
  const slug = words.slice(0, 4).join("-").slice(0, 40).replace(/-+$/, "") || "task";
  for (let n = 1; ; n++) {
    const role = `${fn}-specialist-${slug}${n === 1 ? "" : `-${n}`}`;
    if (!taken.has(role)) return role;
  }
}

/** What a spawn would write, or why it is refused. Each branch carries the other's keys as undefined, as DoorResult does, so a caller reads it without narrowing. */
export type SpawnPlan =
  | { ok: true; record: Specialist; rule?: undefined; error?: undefined; hint?: undefined }
  | { ok: false; rule: string; error: string; hint?: string; record?: undefined };

/**
 * The record a spawn would write, or why it is refused. Pure: it takes the parent's reach, its skills, the roles
 * already taken and the ttl, so every rule is decided before anything is read or written.
 */
export function spawnPlan(input: SpawnInput, ctx: { parentWrites: readonly string[]; parentSkills: readonly string[]; taken: ReadonlySet<string>; ttl: string }): SpawnPlan {
  const fn = functionOfAgent(input.parent);
  if (!fn) {
    return specialistOfAgent(input.parent)
      ? { ok: false, rule: "function-agent-spawns", error: `${input.parent} is a specialist, and a specialist does not spawn another`, hint: `Spawn from its parent function agent instead.` }
      : { ok: false, rule: "function-agent-spawns", error: `${input.parent} is not a function agent, and only a function agent spawns a specialist`, hint: "Name <function>-agent, as naive agent list shows it." };
  }
  const by = input.by?.trim();
  if (!by) return { ok: false, rule: "parent-spawns", error: "name who is spawning it", hint: "Pass --by, or run as the parent agent with MENTURA_ACTOR_ID set." };
  // Who is spawning: the role the process says is acting, and the role `by` claims. Either one that is another
  // function's agent is refused, so no agent borrows another function's reach by proxy.
  const other = [actingAgent(by), functionOfAgent(by) ? by : null].find((r) => r && r !== input.parent);
  if (other) return { ok: false, rule: "parent-spawns", error: `${other} may not spawn a specialist of ${input.parent}: an agent spawns only its own`, hint: `Run it as ${input.parent}, or a person spawns it.` };
  const task = input.task?.trim();
  if (!task) return { ok: false, rule: "task-needed", error: "a specialist is spawned for one task", hint: 'Pass --task "<what it should do>".' };
  const skills = [...new Set(input.skills ?? [])];
  const unknown = skills.filter((s) => !ctx.parentSkills.includes(s));
  if (unknown.length) return { ok: false, rule: "parent-skills", error: `${input.parent} has no skill ${unknown.join(", ")}`, hint: `Its skills are ${ctx.parentSkills.join(", ") || "none"}.` };
  const asked = [...new Set(input.writes ?? ctx.parentWrites)];
  const { writes, wider } = narrowWrites(asked, ctx.parentWrites);
  if (wider.length) return { ok: false, rule: "never-wider", error: `${wider.join(", ")} is outside ${input.parent}'s own reach, and a specialist is never wider than its parent`, hint: `Its parent writes ${ctx.parentWrites.join(", ")}.` };
  if (!writes.length) return { ok: false, rule: "never-wider", error: `${input.parent} has no write reach to give`, hint: "A function agent with no reach cannot spawn a specialist." };
  const ttl = input.ttl?.trim() || ctx.ttl;
  const ms = ttlMillis(ttl);
  if (ms === null) return { ok: false, rule: "ttl", error: `${ttl} is not a duration`, hint: 'A ttl is a number and a unit, such as "2 hours" or "30 minutes".' };
  const at = input.at ?? nowIso();
  if (Number.isNaN(Date.parse(at))) return { ok: false, rule: "ttl", error: `${at} is not a time` };
  const spawned_at = new Date(at).toISOString();
  return { ok: true, record: {
    id: roleFor(fn, task, ctx.taken), parent: input.parent, function: fn, task, ...(skills.length ? { skills } : {}),
    writes, spawned_at, spawned_by: by, expires: new Date(Date.parse(spawned_at) + ms).toISOString(), status: "live",
  } };
}

/** The venture's specialist records, by file name. A missing folder is none. */
export const readSpecialists = (dir: string): Effect.Effect<Specialist[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const folder = ventureFile(dir, SPECIALISTS);
  const out: Specialist[] = [];
  for (const f of (yield* fs.list(folder)).filter((x) => x.endsWith(".json"))) out.push((yield* readJson(join(folder, f))) as Specialist);
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
});

/** The specialists whose reach still stands at `now`. */
export const liveSpecialists = (dir: string, now: string): Effect.Effect<Specialist[], NaiveError, "naive/VentureFs"> =>
  Effect.map(readSpecialists(dir), (all) => all.filter((s) => specialistReach(s, now).gone === null));

/** The venture's ttl: `specialists.default_ttl` in naive.config.json, else Naive's shipped prior. */
export const ttlFor = (dir: string): Effect.Effect<string, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const file = ventureFile(dir, "naive.config.json");
  if (!(yield* fs.exists(file))) return shippedTtl();
  const cfg: unknown = yield* readJson(file);
  const own = isObject(cfg) && isObject(cfg.specialists) ? cfg.specialists.default_ttl : undefined;
  return typeof own === "string" && own.trim() ? own.trim() : shippedTtl();
});

/** Writes the record and its provenance line, and returns it. */
const store = (dir: string, rec: Specialist, note: string): Effect.Effect<Specialist, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const file = `${SPECIALISTS}/${rec.id}.json`;
  yield* fs.writeText(ventureFile(dir, file), `${JSON.stringify(rec, null, 2)}\n`);
  yield* recordEffect(dir, { entity: file, route: `operations/specialist/${rec.id}`, activity: "write",
    agent: agentFromEnv(rec.spawned_by === rec.parent ? "agent" : "person", "cli", { id: rec.spawned_by }), note } as Parameters<typeof recordEffect>[1]);
  return rec;
});

/** Spawns one specialist: the plan's rules, then the record and its provenance line. */
export const spawn = (dir: string, input: SpawnInput): Effect.Effect<Specialist, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fn = functionOfAgent(input.parent);
  const parent = fn ? functionAgent(fn) : null;
  const plan = spawnPlan(input, {
    parentWrites: parent?.writes ?? [], parentSkills: (parent?.skills ?? []).map((s) => s.name),
    taken: new Set((yield* readSpecialists(dir)).map((s) => s.id)), ttl: yield* ttlFor(dir),
  });
  if (!plan.ok) return yield* new Refused({ rule: plan.rule, message: plan.error, ...(plan.hint ? { hint: plan.hint } : {}) });
  return yield* store(dir, plan.record, `spawned the specialist ${plan.record.id} of ${plan.record.parent} for one task, until ${plan.record.expires}`);
});

/** Ends a specialist: its reach is gone from here on. `revoked` is a person's, `finished` its own run ending. */
export const end = (dir: string, role: string, how: "finished" | "revoked", at?: string): Effect.Effect<Specialist, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const rec = readSpecialist(dir, role);
  if (!rec) return yield* new Refused({ rule: "known-specialist", message: `${role} is not a specialist of this venture`, hint: `Its record would be ${SPECIALISTS}/${role}.json.` });
  if (rec.status !== "live") return rec;
  const ended: Specialist = { ...rec, status: how, finished_at: new Date(at ?? nowIso()).toISOString() };
  return yield* store(dir, ended, `the specialist ${role} is ${how}, so its reach is gone`);
});
