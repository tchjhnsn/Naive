// Digital workers (EE-235, step 7 of docs/design/ROLES_AS_AGENTS_2026-11-28.md). A running agent is a digital worker:
// one role from the role library, or a venture's own role, deployed with a sponsor, a level, a write reach and a
// status, recorded at <venture>/operations/workers/<id>.json (route operations/workers/[id]). Never an employee.
//
//   naive workers [list] [--all] [--json]           the live workers: proposed, active and suspended (--all adds ended)
//   naive workers count [--json]                    active workers by role, by function and by mode
//   naive workers history [<id>] [--json]           every change to a worker record, from the provenance log
//   naive workers deploy <role> --sponsor <person> [--mode temporary|durable] [--level <1..7>] [--writes a,b]
//                        [--ttl "4 hours"] [--task "<text>"] [--skills a,b] [--by <who>]
//                                                   write a proposed worker; a person's deployment is activated at once
//   naive workers activate <id> --by <person> [--decision <id>]   only a person activates
//   naive workers suspend|resume|end <id> --by <who>              resume is a person's; suspend and end are open
//   naive workers expire                            end every worker whose expiry has passed
//   naive workers role <id> (--function <fn> | --merge <a,b>) --by <lead or person> [--name <text>] [--description <text>]
//                                                   write a temporary venture-local role, or merge two or more roles
//   naive workers promotions [--propose]            temporary roles deployed at least promote_after times; --propose
//                                                   files one open decision each
//   naive workers promote <role> --by <person>      a person makes a temporary role durable
//
// The statechart is worker-state.ts, modelled in packages/naive/lean/Naive/Workers.lean: a worker is proposed, then
// active only once a person activates it (the hook the staffing gate, EE-236, uses), suspended and resumed, and ended
// for good. Its reach is reach.ts: the record's globs narrowed on every write to its role's reach and its deployer's,
// only while it is active and unexpired. A person role is never deployed, and a worker never deploys another.
//
// naive agent spawn (EE-213) deploys a temporary worker of a function agent. When a person spawns it, it is activated
// at once in the person's name; when the agent spawns it, it waits, proposed, for a person to activate it.
//
// Reading and writing files is an Effect through VentureFs (EE-125); every rule (deployPlan, movePlan, rolePlan,
// workerWriteRefusal) is a pure function decided before anything is written.

import { Duration, Effect, Option } from "effect";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NotFound, Refused, SchemaInvalid } from "../../core/effect/errors.ts";
import type { NaiveError } from "../../core/effect/errors.ts";
import { VentureFs, readJson } from "../../core/effect/fs.ts";
import { runSync } from "../../core/effect/run.ts";
import { actingAgent, agentFromEnv, entriesEffect } from "../../core/provenance.ts";
import { ventureFile } from "../../core/venture-paths.ts";
import { validateValue } from "../../records/validate.ts";
import { writeRecordEffect } from "../../store/record-write.ts";
import { catalog } from "../departments.ts";
import { approve, decisionFile, founderName, merge, notVenturePerson, propose, refusedPerson } from "../decisions.ts";
import { functionAgent, naivePath } from "./function-spec.ts";
import { WORKERS, deployerReach, functionOfAgent, narrowWrites, portfolioOf, readWorker, roleReach, workerOfAgent, workerReach } from "./reach.ts";
import { VENTURE_ROLES, isPersonRole, loadRoles } from "./roles.ts";
import { eventBetween, transition } from "./worker-state.ts";
import type { Actor, Phase, WorkerEvent } from "./worker-state.ts";
import type { Role, Worker } from "../../records/types/records.d.ts";

export { WORKERS, readWorker, workerOfAgent, workerReach } from "./reach.ts";

/** Naive's defaults: unvalidated priors a venture overrides under `workers` in naive.config.json. */
export const DEFAULTS = "packages/naive/src/engine/workers.json";
export type WorkerConfig = { default_ttl: string; default_level: number; promote_after: number };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const stamp = (at?: string): string => new Date(at ?? new Date().toISOString()).toISOString();

/** Naive's shipped priors, from its data. */
export const shipped = (): WorkerConfig => {
  const d: unknown = JSON.parse(readFileSync(naivePath(DEFAULTS), "utf8"));
  const o = isObject(d) ? d : {};
  return {
    default_ttl: typeof o.default_ttl === "string" ? o.default_ttl : "4 hours",
    default_level: typeof o.default_level === "number" ? o.default_level : 3,
    promote_after: typeof o.promote_after === "number" ? o.promote_after : 3,
  };
};

/** The venture's lines: `workers` in naive.config.json over Naive's priors. */
export const configFor = (dir: string): Effect.Effect<WorkerConfig, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const base = shipped();
  const file = ventureFile(dir, "naive.config.json");
  if (!(yield* fs.exists(file))) return base;
  const cfg: unknown = yield* readJson(file);
  const own = isObject(cfg) && isObject(cfg.workers) ? cfg.workers : {};
  return {
    default_ttl: typeof own.default_ttl === "string" && own.default_ttl.trim() ? own.default_ttl.trim() : base.default_ttl,
    default_level: typeof own.default_level === "number" ? own.default_level : base.default_level,
    promote_after: typeof own.promote_after === "number" ? own.promote_after : base.promote_after,
  };
});

/** The milliseconds a ttl is worth, or null when it is not a duration such as "2 hours" or "30 minutes". */
export const ttlMillis = (ttl: string): number | null => {
  const d = Duration.fromInput(ttl.trim() as Duration.Input);
  if (Option.isNone(d)) return null;
  const ms = Duration.toMillis(d.value);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
};

/** Words that say nothing about the task, dropped from a worker's slug so the id reads. */
const FILLER = new Set(["a", "an", "and", "as", "at", "by", "each", "every", "for", "from", "in", "into", "its", "of", "on", "or", "our", "that", "the", "their", "then", "this", "to", "what", "which", "with"]);

/** The stem of a worker id: the role id less a trailing -agent, so finance-agent's workers are finance-worker-<slug>. */
export const stemOf = (role: string): string => (role.endsWith("-agent") ? role.slice(0, -"-agent".length) : role);

/** A worker id: `<stem>-worker-<slug>`, the slug from the task's words (or the role's), with a number when taken. */
export function workerId(role: string, task: string | undefined, taken: ReadonlySet<string>): string {
  const words = (task ?? "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").filter((w) => w && !FILLER.has(w));
  const slug = words.slice(0, 4).join("-").slice(0, 40).replace(/-+$/, "") || "1";
  for (let n = 1; ; n++) {
    const id = `${stemOf(role)}-worker-${slug}${n === 1 ? "" : `-${n}`}`;
    if (!taken.has(id)) return id;
  }
}

/** What a deployment asks for. */
export interface DeployInput {
  readonly role: string,
  /** Who is deploying: a person, a lead, or a function agent deploying its own role. */
  readonly by: string,
  readonly sponsor: string,
  readonly mode?: "temporary" | "durable",
  readonly level?: number,
  /** Write globs to narrow the bound to. Left out, the worker gets the whole bound: its role's reach inside the deployer's. */
  readonly writes?: readonly string[],
  readonly ttl?: string,
  readonly task?: string,
  readonly skills?: readonly string[],
  readonly at?: string,
  readonly run?: string,
  readonly session?: string,
  /** The staffing plan decision and candidate that propose it (EE-236). */
  readonly plan?: { readonly decision: string, readonly candidate: string },
}

/** What a deployment needs to know, read before the plan so the plan is pure. */
export interface DeployContext {
  /** The role, or undefined when it is a function agent (in no file) or unknown. */
  readonly roleRecord: Role | undefined,
  /** roleReach of the role: null when it is never deployed. */
  readonly roleWrites: readonly string[] | null,
  /** deployerReach of `by`: null for a person, who is bounded only by the role. */
  readonly deployerWrites: readonly string[] | null,
  /** Whether `by` is a lead, and so may deploy any agent role inside its portfolio. */
  readonly byIsLead: boolean,
  /** The skills the role may load, by name. */
  readonly roleSkills: readonly string[],
  /** Why the sponsor is not a person of the venture, or null. */
  readonly sponsorRefused: string | null,
  /** The agent this process says is acting, when it is not `by`. */
  readonly acting: string | null,
  readonly taken: ReadonlySet<string>,
  readonly config: WorkerConfig,
}

/** A plan's answer: the record, or the rule that refused it. Each branch carries the other's keys as undefined. */
export type Plan<T> =
  | { ok: true; record: T; rule?: undefined; error?: undefined; hint?: undefined }
  | { ok: false; rule: string; error: string; hint?: string; record?: undefined };

const no = <T>(rule: string, error: string, hint?: string): Plan<T> => ({ ok: false, rule, error, ...(hint ? { hint } : {}) });

/** The proposed worker a deployment would write, or why it is refused. Pure. */
export function deployPlan(input: DeployInput, ctx: DeployContext): Plan<Worker> {
  const role = input.role?.trim();
  if (!role) return no("role-needed", "name the role to deploy", "naive workers deploy <role>");
  if (isPersonRole(ctx.roleRecord)) return no("person-role", `${role} is a person role, and a person role is never deployed as an agent`, "A person holds it: name them in people/people.json.");
  if (ctx.roleWrites === null) return no("deployable-role", `${role} is not a role an agent is deployed as`, "Deploy a role from the library, the venture's governance/roles, or <function>-agent.");
  const by = input.by?.trim();
  if (!by) return no("deployer", "name who is deploying it", "Pass --by, or run as the deploying agent with MENTURA_ACTOR_ID set.");
  if (ctx.acting && ctx.acting !== by) return no("deployer", `${ctx.acting} is acting, so it may not deploy in the name of ${by}`, `Run it as ${by}, or a person deploys it.`);
  if (workerOfAgent(by)) return no("no-chains", `${by} is a digital worker, and a worker never deploys another`, "Hand the work back to whoever deployed it.");
  const fn = functionOfAgent(by);
  // An agent deploying: a function agent deploys only its own role, a lead any agent role inside its portfolio.
  if (ctx.deployerWrites !== null && !ctx.byIsLead && !(fn && by === role))
    return no("deployer", fn ? `${by} may deploy only itself, not ${role}` : `${by} may not deploy a worker: only a person, a lead or a function agent deploying itself does`, fn ? `Run naive agent spawn ${by}, or a lead or a person deploys ${role}.` : undefined);
  const sponsor = input.sponsor?.trim();
  if (!sponsor) return no("sponsor", "a worker needs a sponsor, the person who answers for it", "Pass --sponsor <person>.");
  if (workerOfAgent(sponsor) || functionOfAgent(sponsor)) return no("sponsor", `${sponsor} is an agent, and a worker's sponsor is a person`);
  if (ctx.sponsorRefused) return no("sponsor", `the sponsor must be a person of the venture: ${ctx.sponsorRefused}`);
  const mode = input.mode ?? "temporary";
  if (mode !== "temporary" && mode !== "durable") return no("mode", `${String(mode)} is not a mode`, "temporary or durable");
  const task = input.task?.trim();
  if (mode === "temporary" && !task) return no("task-needed", "a temporary worker is deployed for one task", 'Pass --task "<what it should do>".');
  const skills = [...new Set(input.skills ?? [])];
  const unknown = skills.filter((s) => !ctx.roleSkills.includes(s));
  if (unknown.length) return no("role-skills", `${role} has no skill ${unknown.join(", ")}`, `Its skills are ${ctx.roleSkills.join(", ") || "none"}.`);
  const bound = ctx.deployerWrites === null ? [...ctx.roleWrites] : narrowWrites(ctx.roleWrites, ctx.deployerWrites).writes;
  const asked = [...new Set(input.writes ?? bound)];
  const { writes, wider } = narrowWrites(asked, bound);
  if (wider.length) return no("never-wider", `${wider.join(", ")} is outside what ${role} may write${ctx.deployerWrites === null ? "" : ` inside ${by}'s reach`}, and a worker is never wider than its role or its deployer`, `It may be given ${bound.join(", ") || "nothing"}.`);
  if (!writes.length) return no("never-wider", `${role} has no write reach ${by} may give`, ctx.byIsLead ? `${role}'s reach is outside ${by}'s portfolio.` : undefined);
  const level = input.level ?? ctx.roleRecord?.level ?? ctx.config.default_level;
  if (!Number.isInteger(level) || level < 1 || level > 7) return no("level", `${level} is not a level`, "A whole number from 1 to 7, SFIA's scale.");
  const at = input.at ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(at))) return no("time", `${at} is not a time`);
  const started_at = stamp(at);
  let expires: string | undefined;
  if (mode === "temporary" || input.ttl) {
    const ttl = input.ttl?.trim() || ctx.config.default_ttl;
    const ms = ttlMillis(ttl);
    if (ms === null) return no("ttl", `${ttl} is not a duration`, 'A ttl is a number and a unit, such as "2 hours" or "30 minutes".');
    expires = new Date(Date.parse(started_at) + ms).toISOString();
  }
  return { ok: true, record: {
    id: workerId(role, task, ctx.taken), role, mode, level, sponsor, writes, ...(task ? { task } : {}), ...(skills.length ? { skills } : {}),
    started_at, ...(expires ? { expires } : {}), status: "proposed", deployed_by: by,
    ...(input.run ? { run: input.run } : {}), ...(input.session ? { session: input.session } : {}), ...(input.plan ? { plan: { ...input.plan } } : {}),
  } };
}

/** What a move asks for. */
export interface MoveInput {
  readonly event: Exclude<WorkerEvent, "propose">,
  readonly by: string,
  readonly decision?: string,
  readonly how?: "finished" | "revoked",
  readonly at?: string,
}

/** What a move needs to know, read before the plan. */
export interface MoveContext {
  /** Whether `by` is a person of the venture with no agent acting. */
  readonly person: boolean,
  /** Why the decision named does not let a person activate the worker, or null. */
  readonly decisionRefused: string | null,
}

/** The record a move would write, or why it is refused. Pure. */
export function movePlan(rec: Worker, input: MoveInput, ctx: MoveContext): Plan<Worker> {
  const by = input.by?.trim();
  if (!by) return no("who", `${input.event} needs the name of who does it (--by)`);
  const actor: Actor = ctx.person ? "person" : "agent";
  // An agent may only stop a worker: its deployer, or the worker itself when its run finishes. The clock's sweep expires.
  if (!ctx.person && (input.event === "suspend" || input.event === "end") && by !== rec.deployed_by && by !== rec.id)
    return no("who", `${by} may not ${input.event} ${rec.id}: an agent stops only a worker it deployed or itself`, "Its deployer or a person does.");
  const at = stamp(input.at);
  if (input.event === "expire" && !(rec.expires && Date.parse(rec.expires) <= Date.parse(at)))
    return no("not-expired", `${rec.id} has ${rec.expires ? `not expired: it expires on ${rec.expires}` : "no expiry"}`, `End it instead: naive workers end ${rec.id} --by <who>.`);
  const t = transition(rec.status, input.event, actor);
  if (t.refused) return no("worker-lifecycle", `${rec.id} is ${rec.status}: ${t.refused}`);
  if (input.event === "activate" && input.decision && ctx.decisionRefused) return no("decision", ctx.decisionRefused);
  const to = t.to as Worker["status"];
  const next: Worker = { ...rec, status: to };
  if (input.event === "activate" || input.event === "resume") Object.assign(next, { activated_by: by, activated_at: at, ...(input.decision ? { decision: input.decision } : {}) });
  if (to === "ended") Object.assign(next, { ended_at: at, ended_by: by, ended_how: input.event === "expire" ? "expired" : input.how ?? (by === rec.id ? "finished" : "revoked") });
  return { ok: true, record: next };
}

/** Fields no write may change once a worker is proposed: who it is, what it was deployed as and by whom. */
const FIXED = ["id", "role", "mode", "level", "sponsor", "started_at", "deployed_by", "task", "skills", "plan"] as const;

/**
 * The router's rule for a write to a worker record (applied before the schema, like goals and bets): the status moves
 * only along the statechart, so an agent never activates or resumes one; an agent proposes a worker only in its own
 * name; nobody widens a worker's writes or changes what it was deployed as; and an ended worker stays as it ended.
 * Returns the reason, or null.
 */
export function workerWriteRefusal({ stored, input, person, by }: { stored: Worker | null; input: Worker; person: boolean; by?: string | null }): string | null {
  const from: Phase = stored?.status ?? "absent";
  if (stored?.status === "ended") return `${stored.id} has ended and stays as it ended: deploy a new worker`;
  if (stored) {
    const changed = FIXED.filter((k) => JSON.stringify(stored[k]) !== JSON.stringify(input[k]));
    if (changed.length) return `${stored.id} keeps the ${changed.join(", ")} it was deployed with: deploy a new worker instead`;
    const { wider } = narrowWrites(input.writes, stored.writes);
    if (wider.length) return `${stored.id}'s writes never widen: ${wider.join(", ")} is not in what it was given`;
    if (!person && stored.expires !== input.expires) return `only a person changes when ${stored.id} expires`;
  }
  if (from === input.status) return null;
  const event = eventBetween(from, input.status);
  if (!event) return `a worker does not go from ${from} to ${input.status}`;
  const t = transition(from, event, person ? "person" : "agent");
  if (t.refused) return `${t.refused}: run naive workers ${event} ${input.id} --by <person>`;
  if (event === "propose" && !person && input.deployed_by !== by) return `an agent proposes a worker only in its own name: deployed_by is ${input.deployed_by}, not ${by ?? "the acting agent"}`;
  if (event === "propose" && input.status !== "proposed") return "a new worker starts proposed";
  return null;
}

/** The venture's worker records, by id. A missing folder is none. */
export const readWorkers = (dir: string): Effect.Effect<Worker[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const folder = ventureFile(dir, WORKERS);
  const out: Worker[] = [];
  for (const f of (yield* fs.list(folder)).filter((x) => x.endsWith(".json"))) out.push((yield* readJson(join(folder, f))) as Worker);
  return out.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
});

/** Writes a worker record and its provenance line, and returns it. */
const store = (dir: string, rec: Worker, by: string, person: boolean, note: string): Effect.Effect<Worker, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  yield* writeRecordEffect(dir, `${WORKERS}/${rec.id}.json`, rec, { route: `${WORKERS}/${rec.id}`, activity: "write",
    agent: agentFromEnv(person ? "person" : "agent", "cli", { id: by }), note });
  return rec;
});

/** Whether `by` names a person of the venture, with no agent acting in this process. */
const isPerson = (dir: string, by: string): boolean => !workerOfAgent(by) && !functionOfAgent(by) && refusedPerson(dir, by) === null && !loadRoles(dir).has(by);

/** The skills a role may load: a function agent's module skills, or those of the function a role serves. */
const skillsOf = (role: string, r: Role | undefined): string[] => {
  const fn = functionOfAgent(role) ?? (r?.function && catalog().some((d) => d.id === r.function) ? r.function : null);
  return fn ? functionAgent(fn).skills.map((s) => s.name) : [];
};

/** What deployPlan needs to know about a deployment, read from the venture. `acting` as for deploy. */
export const deployContext = (dir: string, input: DeployInput, opts: { acting?: string | null } = {}): Effect.Effect<DeployContext, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const r = loadRoles(dir).get(input.role);
  const by = input.by?.trim() ?? "";
  return {
    roleRecord: r, roleWrites: roleReach(input.role, dir), deployerWrites: by ? deployerReach(by, dir) : null,
    byIsLead: !!portfolioOf(by, dir), roleSkills: skillsOf(input.role, r), sponsorRefused: input.sponsor ? notVenturePerson(dir, input.sponsor) : null,
    acting: "acting" in opts ? opts.acting ?? null : actingAgent(by), taken: new Set((yield* readWorkers(dir)).map((w) => w.id)), config: yield* configFor(dir),
  };
});

/**
 * Deploys a worker: the plan's rules, then the record. A person's deployment is activated at once in their name.
 * `acting` replaces the agent this process says is acting, for an orchestration that checked who acts itself: the
 * staffing plan (EE-236) proposes each worker in the name of the lead whose portfolio bounds it.
 */
export const deploy = (dir: string, input: DeployInput, opts: { acting?: string | null } = {}): Effect.Effect<Worker, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const by = input.by?.trim() ?? "";
  const plan = deployPlan(input, yield* deployContext(dir, input, opts));
  if (!plan.ok) return yield* new Refused({ rule: plan.rule, message: plan.error, ...(plan.hint ? { hint: plan.hint } : {}) });
  const person = isPerson(dir, by);
  const rec = yield* store(dir, plan.record, by, person, `deployed ${plan.record.id} as ${plan.record.role} (${plan.record.mode}), sponsored by ${plan.record.sponsor}; it waits for a person to activate it`);
  return person ? yield* move(dir, rec.id, { event: "activate", by, at: input.at }) : rec;
});

/** Moves a worker along the statechart: activate, suspend, resume, end or expire. */
export const move = (dir: string, id: string, input: MoveInput): Effect.Effect<Worker, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const rec = readWorker(dir, id);
  if (!rec) return yield* new NotFound({ what: `worker ${id}`, path: `${WORKERS}/${id}.json` });
  const by = input.by?.trim() ?? "";
  let decisionRefused: string | null = null;
  if (input.decision) {
    const file = decisionFile(dir, input.decision);
    if (!file) decisionRefused = `no decision ${input.decision}`;
    else {
      const d: unknown = yield* readJson(ventureFile(dir, file));
      if (!isObject(d) || d.status !== "decided") decisionRefused = `${input.decision} is not decided: a person decides it before the worker is activated`;
    }
  }
  const plan = movePlan(rec, input, { person: by !== "" && isPerson(dir, by), decisionRefused });
  if (!plan.ok) return yield* new Refused({ rule: plan.rule, message: plan.error, ...(plan.hint ? { hint: plan.hint } : {}) });
  return yield* store(dir, plan.record, by, by !== "" && isPerson(dir, by), `${id}: ${rec.status} to ${plan.record.status} (${input.event} by ${by})`);
});

/** Ends every worker whose expiry has passed, as the expiry sweep. */
export const expireAll = (dir: string, at?: string): Effect.Effect<Worker[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const now = stamp(at);
  const out: Worker[] = [];
  for (const w of yield* readWorkers(dir)) if (w.status !== "ended" && w.expires && Date.parse(w.expires) <= Date.parse(now)) out.push(yield* move(dir, w.id, { event: "expire", by: "naive-workers", at: now }));
  return out;
});

/** The function a worker's role serves, for counting: a function agent's function, a role's own, or all. */
const functionOfRole = (role: string, roles: ReadonlyMap<string, Role>): string => functionOfAgent(role) ?? roles.get(role)?.function ?? "unknown";

/** Active workers by role, by function and by mode: how many digital workers the business uses. Pure over records. */
export function countWorkers(workers: readonly Worker[], roles: ReadonlyMap<string, Role>, now: string): { active: number; by_role: Record<string, number>; by_function: Record<string, number>; by_mode: Record<string, number> } {
  const live = workers.filter((w) => w.status === "active" && !(w.expires && Date.parse(w.expires) <= Date.parse(now)));
  const tally = (key: (w: Worker) => string): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const w of live) out[key(w)] = (out[key(w)] ?? 0) + 1;
    return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
  };
  return { active: live.length, by_role: tally((w) => w.role), by_function: tally((w) => functionOfRole(w.role, roles)), by_mode: tally((w) => w.mode) };
}

/** Every provenance line on a worker record (or every worker's), oldest first. */
export const history = (dir: string, id?: string): Effect.Effect<{ at: string; worker: string; activity: string; by: string; note: string }[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  if (!(yield* fs.exists(ventureFile(dir, "provenance.jsonl")))) return [];
  const prefix = `${WORKERS}/`;
  return (yield* entriesEffect(dir)).filter((e) => e.entity.startsWith(prefix) && e.entity.endsWith(".json") && (!id || e.entity === `${prefix}${id}.json`))
    .map((e) => ({ at: e.at ?? "", worker: e.entity.slice(prefix.length, -".json".length), activity: e.activity, by: e.agent?.id ?? e.agent?.kind ?? "", note: e.note ?? "" }));
});

// Temporary roles, merges and promotion.

/** What a lead or a person asks for when writing a temporary role. */
export interface RoleInput {
  readonly id: string,
  readonly by: string,
  readonly function?: string,
  readonly merge?: readonly string[],
  readonly name?: string,
  readonly description?: string,
  readonly at?: string,
}

/** What writing a role needs to know, read before the plan. */
export interface RoleContext {
  readonly roles: ReadonlyMap<string, Role>,
  /** The library's own roles, which a venture's temporary role never replaces. */
  readonly library: ReadonlySet<string>,
  /** Whether `by` is a person of the venture with no agent acting. */
  readonly person: boolean,
  /** The functions `by` leads, or null when it is not a lead. */
  readonly portfolio: readonly string[] | null,
  /** deployerReach of `by`, the lead's whole portfolio (null for a person). */
  readonly bound: readonly string[] | null,
  /** roleReach of each parent named in merge, by id. */
  readonly parentReach: ReadonlyMap<string, readonly string[] | null>,
}

const unionBy = <T>(lists: readonly (readonly T[] | undefined)[], key: (x: T) => string): T[] => {
  const out = new Map<string, T>();
  for (const l of lists) for (const x of l ?? []) if (!out.has(key(x))) out.set(key(x), x);
  return [...out.values()];
};

/** The temporary role a lead or a person would write, or why it is refused. Pure. */
export function rolePlan(input: RoleInput, ctx: RoleContext): Plan<Role> {
  const id = input.id?.trim();
  if (!id || !/^[a-z0-9-]+$/.test(id)) return no("role-id", `${id || "(none)"} is not a role id`, "Lower-case words joined by hyphens.");
  if (workerOfAgent(id) || functionOfAgent(id) || id.endsWith("-researcher")) return no("role-id", `${id} has the shape of a worker or a function agent, so a role may not take it`);
  if (ctx.library.has(id)) return no("role-id", `${id} is a role in the library, and a temporary role never replaces one`, "Choose another id.");
  if (ctx.roles.has(id)) return no("role-id", `the venture already has a role ${id}`, "Choose another id, or a person changes the role itself.");
  const by = input.by?.trim();
  if (!by) return no("who", "name who writes the role (--by)");
  if (!ctx.person && !ctx.portfolio) return no("who", `${by} may not write a role: only a lead or a person does`);
  const fn = input.function?.trim(), parents = [...new Set(input.merge ?? [])];
  if (!!fn === parents.length > 0) return no("role-shape", "a temporary role either serves one function (--function) or merges roles (--merge a,b), not both and not neither");
  const at = stamp(input.at);
  const base = { id, name: input.name?.trim() || id.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" "), kind: "agent" as const, status: "temporary" as const, proposed_by: by, created_at: at,
    grantable_classes: [], default_tier: "workhorse" as const, lint_suites: [], verified_by: ctx.portfolio ? by : "founder" };
  if (fn) {
    if (!catalog().some((d) => d.id === fn)) return no("function", `${fn} is not an id in packages/naive/src/functions/departments.json`);
    if (ctx.portfolio && !ctx.portfolio.includes(fn)) return no("never-wider", `${fn} is outside ${by}'s portfolio (${ctx.portfolio.join(", ")}), and a lead's role is never wider than its portfolio`);
    return { ok: true, record: { ...base, function: fn, description: input.description?.trim() || `A temporary role ${by} wrote for the ${fn} function.`, skill: `packages/naive/src/functions/${fn}/agent.md` } };
  }
  if (parents.length < 2) return no("merge", "a merge names at least two roles");
  const missing = parents.filter((p) => !ctx.roles.has(p) && !functionOfAgent(p));
  if (missing.length) return no("merge", `no role ${missing.join(", ")} to merge`);
  const people = parents.filter((p) => isPersonRole(ctx.roles.get(p)));
  if (people.length) return no("person-role", `${people.join(", ")} is a person role, and a person role is never merged into an agent's`);
  const reaches = parents.map((p) => ctx.parentReach.get(p) ?? null);
  const dead = parents.filter((_, i) => reaches[i] === null);
  if (dead.length) return no("deployable-role", `${dead.join(", ")} is not a role an agent is deployed as`);
  const merged = [...new Set(reaches.flatMap((r) => r ?? []))];
  if (ctx.bound) {
    const { wider } = narrowWrites(merged, ctx.bound);
    if (wider.length) return no("never-wider", `the merged role would write ${wider.join(", ")}, outside ${by}'s portfolio (${(ctx.portfolio ?? []).join(", ")}), and a merged role is never wider than the lead's portfolio`);
  }
  const rs = parents.map((p) => ctx.roles.get(p));
  const fnOf = (p: string, r: Role | undefined): string | undefined => functionOfAgent(p) ?? r?.function;
  const pcf = unionBy(rs.map((r) => r?.pcf), (x) => `${x.id}:${x.raci}`);
  const artifacts = unionBy(rs.map((r) => r?.artifacts), (x) => JSON.stringify(x));
  return { ok: true, record: {
    ...base, merged_from: parents, function: fnOf(parents[0], rs[0]) ?? "all",
    description: input.description?.trim() || `A temporary role ${by} merged from ${parents.join(" and ")}: their PCF elements and artifacts, and their reach together.`,
    skill: rs.find((r) => r?.skill)?.skill ?? `packages/naive/src/functions/${fnOf(parents[0], rs[0])}/agent.md`,
    ...(pcf.length ? { pcf } : {}), ...(artifacts.length ? { artifacts } : {}),
  } };
}

/** Writes a temporary role at governance/roles/<id>/role.json, checked against role.schema.json first. */
export const writeRole = (dir: string, input: RoleInput): Effect.Effect<Role, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const by = input.by?.trim() ?? "";
  const acting = actingAgent(by);
  if (acting) return yield* new Refused({ rule: "who", message: `${acting} is acting, so it may not write a role in the name of ${by}` });
  const roles = loadRoles(dir), library = new Set(loadRoles().keys());
  const plan = rolePlan(input, {
    roles, library, person: isPerson(dir, by), portfolio: portfolioOf(by, dir), bound: portfolioOf(by, dir) ? deployerReach(by, dir) : null,
    parentReach: new Map((input.merge ?? []).map((p) => [p, roleReach(p, dir)])),
  });
  if (!plan.ok) return yield* new Refused({ rule: plan.rule, message: plan.error, ...(plan.hint ? { hint: plan.hint } : {}) });
  const v = validateValue("role.schema.json", plan.record);
  if (v.status !== 0) return yield* new SchemaInvalid({ schema: "role.schema.json", errors: (v.stdout + v.stderr).trim().split("\n").filter(Boolean) });
  const file = `${VENTURE_ROLES}/${plan.record.id}/role.json`;
  yield* writeRecordEffect(dir, file, plan.record, { route: file, activity: "write", agent: agentFromEnv(isPerson(dir, by) ? "person" : "agent", "cli", { id: by }),
    note: plan.record.merged_from ? `${by} merged ${plan.record.merged_from.join(", ")} into the temporary role ${plan.record.id}` : `${by} wrote the temporary role ${plan.record.id}` });
  return plan.record;
});

/** The decision that proposes a temporary role as durable. */
export const promotionId = (role: string): string => `promote-role-${role}`;

/** Each temporary role of the venture with how many workers were deployed as it, and whether that meets the line. */
export const promotions = (dir: string): Effect.Effect<{ role: string; proposed_by: string | undefined; deployments: number; due: boolean; decision: string | null }[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const cfg = yield* configFor(dir);
  const workers = yield* readWorkers(dir);
  const out: { role: string; proposed_by: string | undefined; deployments: number; due: boolean; decision: string | null }[] = [];
  for (const r of loadRoles(dir).values()) {
    if (r.status !== "temporary") continue;
    const n = workers.filter((w) => w.role === r.id).length;
    out.push({ role: r.id, proposed_by: r.proposed_by, deployments: n, due: n >= cfg.promote_after, decision: decisionFile(dir, promotionId(r.id)) ? promotionId(r.id) : null });
  }
  return out.sort((a, b) => (a.role < b.role ? -1 : 1));
});

/** Files one open decision per temporary role due for promotion, as the lead that wrote it. A rerun leaves one filed. */
export const proposePromotions = (dir: string): Effect.Effect<string[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const cfg = yield* configFor(dir);
  const filed: string[] = [];
  for (const p of (yield* promotions(dir)).filter((x) => x.due && !x.decision)) {
    const r = propose(dir, {
      at: "governance", id: promotionId(p.role),
      question: `Make the temporary role ${p.role} durable? It has been deployed ${p.deployments} times, at or past the line of ${cfg.promote_after}.`,
      options: ["durable", "temporary"], applies_to: [{ file: `${VENTURE_ROLES}/${p.role}/role.json`, field: "status" }],
    }, { agentId: p.proposed_by ?? "naive-workers", via: "cli" });
    if (!r.ok) return yield* new Refused({ rule: "promotion", message: r.error });
    filed.push(promotionId(p.role));
  }
  return filed;
});

/** A person makes a temporary role durable: approves its promotion decision as durable and merges it into the role. */
export const promote = (dir: string, role: string, by: string): Effect.Effect<Role, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const refused = refusedPerson(dir, by);
  if (refused) return yield* new Refused({ rule: "person-only", message: `only a person makes a role durable: ${refused}`, hint: "A lead proposes it with naive workers promotions --propose; a person accepts." });
  const r = loadRoles(dir).get(role);
  if (!r || r.status !== "temporary") return yield* new Refused({ rule: "promotion", message: `${role} is not a temporary role of this venture` });
  const id = promotionId(role);
  if (!decisionFile(dir, id)) return yield* new Refused({ rule: "promotion", message: `no decision ${id} proposes ${role} as durable`, hint: "naive workers promotions --propose files it once the role has been deployed enough times." });
  const a = approve(dir, id, { by, answer: "durable" });
  if (!a.ok) return yield* new Refused({ rule: "promotion", message: a.error });
  const m = merge(dir, id, { by });
  if (!m.ok) return yield* new Refused({ rule: "promotion", message: m.error });
  return loadRoles(dir).get(role) as Role;
});

// The command line.

const VALUED = ["--venture", "--sponsor", "--mode", "--level", "--writes", "--ttl", "--task", "--skills", "--by", "--decision", "--function", "--merge", "--name", "--description", "--at"];

export function main(argv: string[]): number {
  const [dir, cmd = "list", ...rest] = argv;
  const flag = (n: string): string | undefined => { const i = rest.indexOf(n); return i >= 0 ? rest[i + 1] : undefined; };
  const list = (n: string): string[] | undefined => flag(n)?.split(",").map((s) => s.trim()).filter(Boolean);
  const positional = rest.filter((a, i) => !a.startsWith("--") && !(i > 0 && VALUED.includes(rest[i - 1])));
  const json = rest.includes("--json");
  const by = flag("--by") ?? process.env.MENTURA_ACTOR_ID ?? "";
  const out = (v: unknown, text: string): void => console.log(json ? JSON.stringify(v, null, 2) : text);
  const now = new Date().toISOString();
  if (cmd === "list") {
    const all = runSync(readWorkers(dir)).filter((w) => rest.includes("--all") || w.status !== "ended");
    out(all, all.length ? all.map((w) => `${w.id.padEnd(40)} ${w.status.padEnd(9)} ${w.role} (${w.mode}, level ${w.level}), sponsor ${w.sponsor}${w.expires ? `, ${Date.parse(w.expires) <= Date.parse(now) && w.status !== "ended" ? "expired" : "until"} ${w.expires}` : ""}`).join("\n") : "no live workers");
    return 0;
  }
  if (cmd === "count") {
    const c = countWorkers(runSync(readWorkers(dir)), loadRoles(dir), now);
    const lines = (o: Record<string, number>) => Object.entries(o).map(([k, n]) => `  ${k}: ${n}`).join("\n") || "  none";
    out(c, `${c.active} active digital ${c.active === 1 ? "worker" : "workers"}\nby role:\n${lines(c.by_role)}\nby function:\n${lines(c.by_function)}\nby mode:\n${lines(c.by_mode)}`);
    return 0;
  }
  if (cmd === "history") {
    const h = runSync(history(dir, positional[0]));
    out(h, h.length ? h.map((x) => `${x.at}  ${x.worker}  ${x.activity} by ${x.by}  ${x.note}`).join("\n") : "no worker changes recorded");
    return 0;
  }
  if (cmd === "deploy") {
    const mode = flag("--mode") as DeployInput["mode"] | undefined;
    const level = flag("--level");
    const w = runSync(deploy(dir, { role: positional[0] ?? "", by, sponsor: flag("--sponsor") ?? "", mode, level: level === undefined ? undefined : Number(level), writes: list("--writes"), ttl: flag("--ttl"), task: flag("--task"), skills: list("--skills") }));
    out(w, `deployed ${w.id} as ${w.role}: ${w.status}${w.status === "proposed" ? `. A person activates it: naive workers activate ${w.id} --by <person>` : ""}. It writes ${w.writes.join(", ")}.`);
    return 0;
  }
  if (["activate", "suspend", "resume", "end"].includes(cmd)) {
    const w = runSync(move(dir, positional[0] ?? "", { event: cmd as MoveInput["event"], by, decision: flag("--decision") }));
    out(w, `${w.id} is ${w.status}`);
    return 0;
  }
  if (cmd === "expire") {
    const ended = runSync(expireAll(dir));
    out(ended, ended.length ? ended.map((w) => `${w.id} expired`).join("\n") : "no worker past its expiry");
    return 0;
  }
  if (cmd === "role") {
    const r = runSync(writeRole(dir, { id: positional[0] ?? "", by, function: flag("--function"), merge: list("--merge"), name: flag("--name"), description: flag("--description") }));
    out(r, `wrote the temporary role ${r.id} at ${VENTURE_ROLES}/${r.id}/role.json`);
    return 0;
  }
  if (cmd === "promotions") {
    const filed = rest.includes("--propose") ? runSync(proposePromotions(dir)) : [];
    const p = runSync(promotions(dir));
    out({ promotions: p, filed }, [...p.map((x) => `${x.role.padEnd(32)} ${x.deployments} deployed${x.due ? ", due" : ""}${x.decision ? `, decision ${x.decision}` : ""}`), ...filed.map((f) => `filed ${f}`)].join("\n") || "no temporary roles");
    return 0;
  }
  if (cmd === "promote") {
    const r = runSync(promote(dir, positional[0] ?? "", by));
    out(r, `${r.id} is ${r.status}`);
    return 0;
  }
  console.error("usage: naive workers [list [--all]] | count | history [<id>] | deploy <role> --sponsor <person> [...] | activate|suspend|resume|end <id> --by <who> | expire | role <id> (--function <fn> | --merge a,b) --by <who> | promotions [--propose] | promote <role> --by <person>   [--json]");
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (e) {
    const hint = isObject(e) && typeof e.hint === "string" ? `\n${e.hint}` : "";
    console.error(`${e instanceof Error ? e.message : String(e)}${hint}`);
    process.exitCode = 1;
  }
}

/** The default sponsor of a worker an agent spawns: the venture's founder. */
export const defaultSponsor = (dir: string): string => founderName(dir);
