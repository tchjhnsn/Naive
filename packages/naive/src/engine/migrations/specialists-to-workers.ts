// Migration specialists-to-workers (operations package 0.4.0, EE-235): temporary specialists (EE-213) become
// temporary digital workers.
//
//   1. Each operations/specialists/<id>.json becomes operations/workers/<id>.json with mode temporary. The id
//      keeps its <function>-specialist-<slug> form, which the worker schema and the router still take. The
//      parent is the role, spawned_at is started_at, spawned_by is deployed_by, and the level is Naive's default.
//   2. The sponsor is the venture's founder. A venture that names no person escalates and keeps its specialists.
//   3. Only a person activates a worker. A live specialist a person spawned stays active in that person's name.
//      A live one an agent spawned becomes proposed, so its writes wait for a person to run
//      naive workers activate. One past its expiry ends as expired, and a finished or revoked one ends with
//      the same word.
//   4. The old file is archived at _private/archive/specialists/<id>.json, never deleted, and a worker file
//      already there is escalated, never overwritten.
//   5. specialists.default_ttl in naive.config.json moves to workers.default_ttl.
//
// Every change goes through ctx (packages/naive/src/engine/upgrades.ts).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { ventureFile } from "../../core/venture-paths.ts";
import { founderName, notVenturePerson } from "../decisions.ts";
import { shipped } from "../agents/workers.ts";
import type { Worker } from "../../records/types/records.d.ts";

/** The part of the upgrade context (packages/naive/src/engine/upgrades.ts) this migration uses. */
type Ctx = {
  config: Record<string, unknown>;
  at: string;
  write(rel: string, text: string, opts?: { activity?: string; note?: string; derived_from?: string[]; log?: boolean }): void;
  mv(from: string, to: string): void;
  escalate(msg: string): void;
  note(msg: string): void;
  configChanged(): void;
  removeEmpty(rel: string): void;
};
/** A specialist record as EE-213 wrote it. */
type Specialist = { id: string; parent: string; function?: string; task: string; skills?: string[]; writes: string[]; spawned_at: string; spawned_by: string; expires: string; status: "live" | "finished" | "revoked"; finished_at?: string; note?: string };

export const id = "specialists-to-workers";
export const describe = "Moves each temporary specialist to a temporary digital worker under operations/workers/, keeps only a person's activation, archives the old file and moves specialists.default_ttl to workers.default_ttl";

const OLD = "operations/specialists";
const NEW = "operations/workers";
const json = (x: unknown) => JSON.stringify(x, null, 2) + "\n";

/** The worker a specialist becomes, or the reason it cannot. Pure apart from the person check it is given. */
export function toWorker(s: Specialist, { sponsor, isPerson, at, level }: { sponsor: string; isPerson: (id: string) => boolean; at: string; level: number }): Worker {
  const base: Worker = {
    id: s.id, role: s.parent, mode: "temporary", level, sponsor, writes: s.writes, started_at: s.spawned_at, expires: s.expires,
    status: "proposed", deployed_by: s.spawned_by, task: s.task, ...(s.skills?.length ? { skills: s.skills } : {}),
    note: `Moved from ${OLD}/${s.id}.json by naive upgrade (EE-235)${s.note ? `. ${s.note}` : ""}`,
  };
  if (s.status !== "live") return { ...base, status: "ended", ended_at: s.finished_at ?? s.expires, ended_how: s.status };
  if (Date.parse(s.expires) <= Date.parse(at)) return { ...base, status: "ended", ended_at: s.expires, ended_how: "expired" };
  if (isPerson(s.spawned_by)) return { ...base, status: "active", activated_by: s.spawned_by, activated_at: s.spawned_at };
  return base;
}

export function apply(dir: string, ctx: Ctx) {
  // The config moves whether or not the venture has any specialists.
  const old = ctx.config.specialists as { default_ttl?: string } | undefined;
  if (old !== undefined) {
    const workers = (ctx.config.workers ?? {}) as Record<string, unknown>;
    if (old.default_ttl && workers.default_ttl === undefined) workers.default_ttl = old.default_ttl;
    ctx.config.workers = workers;
    delete ctx.config.specialists;
    ctx.configChanged();
    ctx.note("naive.config.json: specialists is now workers");
  }

  const folder = ventureFile(dir, OLD);
  if (!existsSync(folder)) return;
  const files = readdirSync(folder).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) return ctx.removeEmpty(OLD);
  const sponsor = founderName(dir);
  if (notVenturePerson(dir, sponsor)) return ctx.escalate(`${OLD}/: the venture names no person to sponsor its workers (${notVenturePerson(dir, sponsor)}); name the founder in governance/delegation.json or people/people.json and upgrade again`);
  const isPerson = (who: string) => notVenturePerson(dir, who) === null && !/-(agent|lead|researcher|specialist-[a-z0-9-]+|worker-[a-z0-9-]+)$/.test(who);
  const level = shipped().default_level;
  let moved = 0, waiting = 0;
  for (const f of files) {
    const from = `${OLD}/${f}`, to = `${NEW}/${f}`;
    if (existsSync(ventureFile(dir, to))) { ctx.escalate(`${to} already exists, so ${from} was left as it is`); continue; }
    let s: Specialist;
    try { s = JSON.parse(readFileSync(ventureFile(dir, from), "utf8")) as Specialist; }
    catch (e) { ctx.escalate(`${from} does not parse (${(e as Error).message}); left as it is`); continue; }
    const w = toWorker(s, { sponsor, isPerson, at: ctx.at, level });
    if (w.status === "proposed") waiting++;
    ctx.write(to, json(w), { activity: "move", derived_from: [from], note: `specialist ${s.id} is a temporary worker, ${w.status}` });
    ctx.mv(from, `_private/archive/specialists/${f}`);
    moved++;
  }
  ctx.removeEmpty(OLD);
  if (moved) ctx.note(`${moved} specialist${moved === 1 ? " is" : "s are"} now temporary workers under ${NEW}/${waiting ? `; ${waiting} spawned by an agent wait${waiting === 1 ? "s" : ""} for a person to run naive workers activate` : ""}`);
}
