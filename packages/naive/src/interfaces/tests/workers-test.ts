// Tests digital workers (EE-235): the deployment rules, a reach never wider than the role's or the deployer's, only a
// person activating, the router refusing a write outside the reach or before activation or after the end, the router
// refusing an agent that moves a worker record past its statechart, naive agent spawn as a temporary worker (EE-213),
// naive workers list, count and history, and a lead's temporary roles, merges and their promotion, which only a person
// accepts, over one venture in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/workers-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.ts";
import { runSync } from "../../core/effect/run.ts";
import { agentBrief } from "../../engine/agents/brief.ts";
import { functionAgent } from "../../engine/agents/function-spec.ts";
import { deployerReach, narrowWrites, reachRefusal, roleReach, within, workerOfAgent, workerReach } from "../../engine/agents/reach.ts";
import { loadRoles } from "../../engine/agents/roles.ts";
import { countWorkers, deploy, deployPlan, move, movePlan, promote, readWorkers, rolePlan, shipped, ttlMillis, workerId, workerWriteRefusal, writeRole } from "../../engine/agents/workers.ts";
import type { DeployContext } from "../../engine/agents/workers.ts";
import type { Worker } from "../../records/types/records.d.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "workers-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_READS_AS_OF", "MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_MODEL"]) { delete process.env[k]; delete env[k]; }

interface Reply { ok: boolean, error?: string, gate_rule?: string, may_write?: string[] }
const ask = async (a: { route: string, action?: string, input?: unknown, actor?: string, actor_id?: string }): Promise<Reply> =>
  await call({ venture: "lab", workspace: ws, action: "read", ...a }) as Reply;

const strategy = functionAgent("strategy");
const ctx: DeployContext = {
  roleRecord: undefined, roleWrites: strategy.writes, deployerWrites: strategy.writes, byIsLead: false, roleSkills: strategy.skills.map((s) => s.name),
  sponsorRefused: null, acting: null, taken: new Set<string>(), config: shipped(),
};
const input = { role: "strategy-agent", by: "strategy-agent", sponsor: "Ana", task: "Read the competitor pricing pages.", at: "2026-06-15T00:00:00.000Z" };
const PERSON = "Ana";

try {
  // The rules, before anything is read or written.
  expect("a worker id names its stem and slug, and its function when the stem is one",
    workerOfAgent("strategy-worker-pricing")?.function === "strategy" && workerOfAgent("growth-lead-worker-ads")?.stem === "growth-lead" && workerOfAgent("growth-lead-worker-ads")?.function === null
    && workerOfAgent("strategy-specialist-pricing")?.function === "strategy");
  expect("a function agent, a lead and a malformed id are no worker", ["strategy-agent", "strategy-lead", "-worker-x", "strategy-worker-", undefined].every((r) => workerOfAgent(r) === null));
  expect("a glob is inside another when every route it matches the other matches too",
    within("purpose/competitor/*", "purpose/competitor/*") && within("purpose/competitor/acme", "purpose/competitor/*") && !within("purpose/competitor/*", "purpose/competitor/acme"));
  expect("narrowWrites keeps the globs the bound covers and names the ones it does not",
    JSON.stringify(narrowWrites(["decisions/*", "customers/*"], strategy.writes)) === JSON.stringify({ writes: ["decisions/*"], wider: ["customers/*"] }));
  expect("a worker id drops the filler words, takes the next four, and strips -agent from the role",
    workerId("strategy-agent", "Read the three competitor pricing pages for us", new Set()) === "strategy-worker-read-three-competitor-pricing" && workerId("growth-lead", undefined, new Set()) === "growth-lead-worker-1");
  expect("an id already taken takes a number", workerId("strategy-agent", "Read", new Set(["strategy-worker-read"])) === "strategy-worker-read-2");
  expect("a ttl is a number and a unit", ttlMillis("2 hours") === 7_200_000 && ttlMillis("soon") === null && ttlMillis("0 hours") === null);
  expect("a function agent's role reach is its function's, a lead's its plan, decisions and handoffs, and a person role has none",
    JSON.stringify(roleReach("strategy-agent")) === JSON.stringify(strategy.writes) && JSON.stringify(roleReach("growth-lead")) === JSON.stringify(["operations/lead/growth-lead", "decisions/*", "operations/handoff/*"])
    && roleReach("founder") === null && roleReach("nobody") === null);
  expect("a lead may give its whole portfolio, a person is bounded only by the role, and a worker gives nothing",
    (deployerReach("growth-lead") ?? []).some((g) => g.startsWith("marketing/")) && deployerReach(PERSON) === null && deployerReach("growth-worker-x")?.length === 0);

  const bad = (over: Partial<typeof input>, c: Partial<DeployContext> = {}) => deployPlan({ ...input, ...over }, { ...ctx, ...c });
  expect("a person role is never deployed", bad({ role: "founder" }, { roleRecord: loadRoles().get("founder"), roleWrites: null }).rule === "person-role");
  expect("a role no agent is deployed as is refused", bad({ role: "nobody" }, { roleWrites: null }).rule === "deployable-role");
  expect("a function agent deploys only itself", bad({ role: "growth-lead" }, { roleWrites: roleReach("growth-lead") }).rule === "deployer");
  expect("a deployment made while another agent is acting is refused", /finance-agent is acting/.test(bad({}, { acting: "finance-agent" }).error ?? ""));
  expect("a worker never deploys another", bad({ by: "strategy-worker-x" }, { deployerWrites: [] }).rule === "no-chains");
  expect("a worker needs a person as its sponsor", bad({ sponsor: "" }).rule === "sponsor" && bad({ sponsor: "finance-agent" }).rule === "sponsor" && bad({}, { sponsorRefused: "x is a role" }).rule === "sponsor");
  expect("a temporary worker is deployed for one task", bad({ task: " " }).rule === "task-needed");
  expect("a skill its role does not have is refused", bad({ skills: ["nonsense"] } as Partial<typeof input>).rule === "role-skills");
  expect("a write outside the role's reach is refused, because a worker is never wider",
    bad({ writes: ["customers/*"] } as Partial<typeof input>).rule === "never-wider" && /never wider than its role or its deployer/.test(bad({ writes: ["customers/*"] } as Partial<typeof input>).error ?? ""));
  expect("a lead deploys an agent role only inside its portfolio",
    deployPlan({ role: "finance-agent", by: "growth-lead", sponsor: PERSON, task: "x", writes: roleReach("finance-agent") ?? [] }, { ...ctx, roleWrites: roleReach("finance-agent"), deployerWrites: deployerReach("growth-lead"), byIsLead: true }).rule === "never-wider"
    && deployPlan({ role: "marketing-and-sales-agent", by: "growth-lead", sponsor: PERSON, task: "x" }, { ...ctx, roleWrites: roleReach("marketing-and-sales-agent"), deployerWrites: deployerReach("growth-lead"), byIsLead: true, roleSkills: [] }).ok);
  expect("a ttl that is not a duration is refused", bad({ ttl: "a while" } as Partial<typeof input>).rule === "ttl");

  const planned = deployPlan({ ...input, skills: ["competitor-research"], ttl: "2 hours", writes: ["purpose/competitor/*"] }, ctx);
  const rec = planned.record as Worker;
  expect("a deployment is proposed, with the role, its level, the reach asked for and an expiry one ttl on",
    planned.ok && rec.id === "strategy-worker-read-competitor-pricing-pages" && rec.role === "strategy-agent" && rec.status === "proposed" && rec.mode === "temporary"
    && rec.level === shipped().default_level && rec.writes.join() === "purpose/competitor/*" && rec.expires === "2026-06-15T02:00:00.000Z", planned);
  expect("with no --writes it gets its whole bound, which is never wider", JSON.stringify((deployPlan(input, ctx).record as Worker).writes) === JSON.stringify(strategy.writes));

  const m = (r: Worker, e: Parameters<typeof movePlan>[1]["event"], by: string, person: boolean, at = "2026-06-15T01:00:00.000Z") => movePlan(r, { event: e, by, at }, { person, decisionRefused: null });
  expect("an agent's activate is refused, and a person's activates with their name", m(rec, "activate", "strategy-agent", false).rule === "worker-lifecycle"
    && m(rec, "activate", PERSON, true).record?.status === "active" && m(rec, "activate", PERSON, true).record?.activated_by === PERSON);
  const active = m(rec, "activate", PERSON, true).record as Worker;
  expect("its deployer may suspend or end it, another agent may not", m(active, "suspend", "strategy-agent", false).record?.status === "suspended" && m(active, "end", "finance-agent", false).rule === "who");
  expect("an agent's resume is refused", m({ ...active, status: "suspended" }, "resume", "strategy-agent", false).rule === "worker-lifecycle");
  expect("ending names how: finished when it ends itself, revoked when someone else does",
    m(active, "end", active.id, false).record?.ended_how === "finished" && m(active, "end", PERSON, true).record?.ended_how === "revoked");
  expect("expire is refused before the expiry and ends it after", m(active, "expire", "naive-workers", false).rule === "not-expired"
    && m(active, "expire", "naive-workers", false, "2026-06-15T03:00:00.000Z").record?.ended_how === "expired");
  expect("an ended worker stays ended", m({ ...active, status: "ended", ended_at: "2026-06-15T01:00:00.000Z" }, "activate", PERSON, true).rule === "worker-lifecycle");

  expect("through the router an agent may not activate a worker", /only a person activates/.test(workerWriteRefusal({ stored: rec, input: { ...rec, status: "active", activated_by: "x" }, person: false, by: "strategy-agent" }) ?? ""));
  expect("an agent proposes a worker only in its own name", /only in its own name/.test(workerWriteRefusal({ stored: null, input: rec, person: false, by: "finance-agent" }) ?? "")
    && workerWriteRefusal({ stored: null, input: rec, person: false, by: "strategy-agent" }) === null);
  expect("no one widens a worker's writes or rewrites its role", /never widen/.test(workerWriteRefusal({ stored: rec, input: { ...rec, writes: ["purpose/competitor/*", "decisions/*"] }, person: true }) ?? "")
    && /keeps the role/.test(workerWriteRefusal({ stored: rec, input: { ...rec, role: "finance-agent" }, person: true }) ?? ""));
  expect("an ended worker record is not rewritten", /stays as it ended/.test(workerWriteRefusal({ stored: { ...rec, status: "ended" }, input: rec, person: true }) ?? ""));
  expect("a person's move along the statechart passes", workerWriteRefusal({ stored: rec, input: active, person: true }) === null);

  const at = (now: string, over: Partial<Worker> = {}) => workerReach({ ...active, ...over }, null, now);
  expect("an active, unexpired worker keeps the globs its role and deployer cover", at("2026-06-15T01:00:00.000Z").gone === null && at("2026-06-15T01:00:00.000Z").writes.join() === "purpose/competitor/*");
  expect("a proposed, suspended, ended or expired worker has no reach",
    /waits for a person/.test(at("2026-06-15T01:00:00.000Z", { status: "proposed" }).gone ?? "") && /suspended/.test(at("2026-06-15T01:00:00.000Z", { status: "suspended" }).gone ?? "")
    && /ended/.test(at("2026-06-15T01:00:00.000Z", { status: "ended" }).gone ?? "") && /expired on/.test(at("2026-06-15T02:00:00.000Z").gone ?? ""));
  expect("a record edited to a reach outside its role keeps nothing of it", at("2026-06-15T01:00:00.000Z", { writes: ["customers/*"] }).writes.length === 0);
  const counted = countWorkers([active, { ...active, id: "b", mode: "durable", expires: undefined }, { ...active, id: "c", status: "proposed" }], loadRoles(), "2026-06-15T01:00:00.000Z");
  expect("count tallies active workers by role, function and mode", counted.active === 2 && counted.by_role["strategy-agent"] === 2 && counted.by_function.strategy === 2 && counted.by_mode.durable === 1 && counted.by_mode.temporary === 1, counted);

  // Lead-written roles and merges, the pure rule.
  const roles = loadRoles();
  const rctx = { roles, library: new Set(roles.keys()), person: false, portfolio: ["strategy", "capabilities", "human-capital", "external-relationships"], bound: deployerReach("strategy-lead"), parentReach: new Map<string, readonly string[] | null>() };
  const fnRole = rolePlan({ id: "pricing-analyst", by: "strategy-lead", function: "strategy", at: "2026-06-15T00:00:00.000Z" }, rctx);
  expect("a lead writes a temporary role for a function in its portfolio", fnRole.ok && fnRole.record.status === "temporary" && fnRole.record.proposed_by === "strategy-lead" && fnRole.record.created_at === "2026-06-15T00:00:00.000Z" && fnRole.record.verified_by === "strategy-lead");
  expect("not for a function outside it", rolePlan({ id: "x-analyst", by: "strategy-lead", function: "finance" }, rctx).rule === "never-wider");
  expect("an agent that is not a lead may not write one", rolePlan({ id: "x-analyst", by: "finance-agent", function: "finance" }, { ...rctx, portfolio: null, bound: null }).rule === "who");
  expect("a temporary role never replaces a library role", rolePlan({ id: "architect", by: "strategy-lead", function: "strategy" }, rctx).rule === "role-id");
  const parents = new Map<string, readonly string[] | null>([["strategy-agent", roleReach("strategy-agent")], ["human-capital-agent", roleReach("human-capital-agent")], ["finance-agent", roleReach("finance-agent")]]);
  const merged = rolePlan({ id: "org-strategist", by: "strategy-lead", merge: ["strategy-agent", "human-capital-agent"] }, { ...rctx, parentReach: parents });
  expect("a lead merges two roles inside its portfolio", merged.ok && merged.record.merged_from?.join() === "strategy-agent,human-capital-agent" && merged.record.function === "strategy");
  expect("a merge is never wider than the lead's portfolio", /never wider than the lead's portfolio/.test(rolePlan({ id: "money-strategist", by: "strategy-lead", merge: ["strategy-agent", "finance-agent"] }, { ...rctx, parentReach: parents }).error ?? ""));
  expect("a person role is never merged", rolePlan({ id: "y", by: "strategy-lead", merge: ["strategy-agent", "founder"] }, { ...rctx, parentReach: new Map([...parents, ["founder", null]]) }).rule === "person-role");

  // Through the router and the commands, in a venture.
  const made = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/init-venture.ts"), join(ws, "ventures/lab"), "lab", "--type", "software-startup"], { encoding: "utf8", env });
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  const dir = join(ws, "ventures/lab");

  const ghost = await ask({ route: "purpose/competitor/acme", action: "write", input: { id: "acme" }, actor: "agent", actor_id: "strategy-worker-ghost" });
  expect("a worker with no deployment record is refused, naming how to deploy one",
    !ghost.ok && ghost.gate_rule === "worker-reach" && /has no operations\/workers\/strategy-worker-ghost\.json/.test(ghost.error ?? ""), ghost);
  const legacy = await ask({ route: "purpose/competitor/acme", action: "write", input: { id: "acme" }, actor: "agent", actor_id: "strategy-specialist-ghost" });
  expect("an old specialist id with no record is refused too, so a leftover role fails closed", !legacy.ok && legacy.gate_rule === "worker-reach", legacy);

  const proposed = runSync(deploy(dir, { role: "strategy-agent", by: "strategy-agent", sponsor: PERSON, task: "Record what each competitor charges.", skills: ["competitor-research"], writes: ["purpose/competitor/*"] }));
  expect("an agent's deployment is a record in the venture, proposed", proposed.status === "proposed" && existsSync(join(dir, `operations/workers/${proposed.id}.json`)), proposed);
  const early = await ask({ route: "purpose/competitor/acme", action: "write", input: { id: "acme", name: "Acme", sources: [] }, actor: "agent", actor_id: proposed.id });
  expect("a proposed worker's writes are refused until a person activates it", !early.ok && early.gate_rule === "worker-reach" && /waits for a person to activate it/.test(early.error ?? ""), early);
  const forged = await ask({ route: `operations/workers/${proposed.id}`, action: "write", input: { ...proposed, status: "active", activated_by: "strategy-agent" }, actor: "agent", actor_id: "strategy-agent" });
  expect("an agent writing its worker active through the router is refused, by its reach or by the lifecycle", !forged.ok && (forged.gate_rule === "agent-reach" || (forged.gate_rule === "worker-lifecycle" && /only a person activates/.test(forged.error ?? ""))), forged);
  const widened = await ask({ route: `operations/workers/${proposed.id}`, action: "write", input: { ...proposed, writes: [...proposed.writes, "customers/*"] }, actor: "person", actor_id: PERSON });
  expect("a write that widens a worker is refused by the lifecycle rule, a person's too", !widened.ok && widened.gate_rule === "worker-lifecycle" && /never widen/.test(widened.error ?? ""), widened);
  let agentActivate: unknown = null;
  process.env.MENTURA_ACTOR_ID = "strategy-agent";
  try { runSync(move(dir, proposed.id, { event: "activate", by: "strategy-agent" })); } catch (e) { agentActivate = e; }
  delete process.env.MENTURA_ACTOR_ID;
  expect("an agent's naive workers activate is refused", agentActivate instanceof Error && /only a person activates/.test(agentActivate.message), String(agentActivate));

  const live = runSync(move(dir, proposed.id, { event: "activate", by: PERSON }));
  expect("a person activates it", live.status === "active" && live.activated_by === PERSON);
  const inside = await ask({ route: "purpose/competitor/acme", action: "write", input: { id: "acme", name: "Acme", sources: [] }, actor: "agent", actor_id: live.id });
  expect("the active worker writing inside its reach is not refused for reach", inside.gate_rule !== "worker-reach", inside);
  const outside = await ask({ route: "foundation/telos", action: "write", input: { venture: "lab" }, actor: "agent", actor_id: live.id });
  expect("writing a route its record does not name is refused, although its role may write it",
    !outside.ok && outside.gate_rule === "worker-reach" && outside.may_write?.join() === "purpose/competitor/*" && strategy.writes.includes("foundation/telos"), outside);

  const brief = agentBrief(live.id, dir);
  expect("the brief names its role, deployer, sponsor and task, and the reach it has", !(brief instanceof Error) && brief.kind === "worker"
    && /deployed as strategy-agent by strategy-agent, sponsored by Ana, for one task: Record what each competitor charges\./.test(brief.how)
    && JSON.stringify(brief.spec.writes) === JSON.stringify(["purpose/competitor/*"]) && brief.skills?.length === 1, brief instanceof Error ? brief.message : brief.how);
  expect("the brief carries its role's instructions", !(brief instanceof Error) && /role: strategy-agent/.test(brief.instructions?.text ?? ""));

  const ended = runSync(move(dir, live.id, { event: "end", by: live.id, how: "finished" }));
  expect("ending it writes ended with when, by whom and how", ended.status === "ended" && ended.ended_how === "finished" && typeof ended.ended_at === "string");
  const after = await ask({ route: "purpose/competitor/beta", action: "write", input: { id: "beta", name: "Beta", sources: [] }, actor: "agent", actor_id: live.id });
  expect("once ended, its writes are refused and the refusal says why", !after.ok && after.gate_rule === "worker-reach" && /it has ended \(finished\)/.test(after.error ?? ""), after);
  expect("reachRefusal with no venture folder refuses rather than guessing a reach", reachRefusal({ role: live.id, route: "purpose/competitor/acme" })?.rule === "worker-reach");

  // naive agent spawn: a person's spawn is active and runs; an agent's waits for a person.
  const agent = (args: string[], extra: NodeJS.ProcessEnv = {}) => spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/agents/run.ts"), ...args, "--venture", dir], { encoding: "utf8", env: { ...env, ...extra } });
  const spawned = agent(["spawn", "strategy-agent", "--task", "Check the pricing page of each competitor", "--skills", "competitor-research", "--ttl", "2 hours", "--writes", "purpose/competitor/*", "--by", PERSON, "--print"]);
  expect("a person's naive agent spawn deploys an active temporary worker and prints its prompt", spawned.status === 0
    && /spawned strategy-worker-check-pricing-page-competitor/.test(spawned.stderr) && /one of Naive's digital workers/.test(spawned.stdout)
    && /## What you may write\n\n- purpose\/competitor\/\*/.test(spawned.stdout), spawned.stderr.slice(0, 400));
  expect("the prompt does not tell a worker to spawn one of its own", !/naive agent spawn/.test(spawned.stdout));
  const byAgent = agent(["spawn", "strategy-agent", "--task", "Draft the competitor summary", "--writes", "purpose/competitor/*"], { MENTURA_ACTOR_ID: "strategy-agent" });
  expect("an agent's spawn proposes the worker and runs nothing until a person activates it", byAgent.status === 0
    && /proposed strategy-worker-draft-competitor-summary/.test(byAgent.stderr) && /naive workers activate strategy-worker-draft-competitor-summary --by <person>/.test(byAgent.stderr) && byAgent.stdout === "", byAgent.stderr);
  const listed = agent(["list"]);
  expect("naive agent list shows the venture's live workers", /strategy-worker-check-pricing-page-competitor\s+worker\s+active as strategy-agent/.test(listed.stdout), listed.stdout.split("\n").filter((l) => /worker/.test(l)));
  const refused = agent(["spawn", "strategy-lead", "--task", "Do a thing", "--by", PERSON]);
  expect("naive agent spawn refuses an agent that is not a function agent", refused.status !== 0 && /only a function agent spawns a worker of itself/.test(refused.stdout + refused.stderr));

  // naive workers.
  const workers = (args: string[], extra: NodeJS.ProcessEnv = {}) => spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/naive.ts"), "workers", ...args, "--venture", dir], { encoding: "utf8", env: { ...env, ...extra } });
  const count = workers(["count", "--json"]);
  const c = JSON.parse(count.stdout || "{}") as { active?: number, by_mode?: Record<string, number> };
  expect("naive workers count counts the active digital workers", count.status === 0 && c.active === 1 && c.by_mode?.temporary === 1, count.stdout + count.stderr);
  const lst = workers(["list"]);
  expect("naive workers list shows the live ones and not the ended", /strategy-worker-draft-competitor-summary\s+proposed/.test(lst.stdout) && !lst.stdout.includes(live.id), lst.stdout);
  const hist = workers(["history", live.id]);
  expect("naive workers history reads every change from provenance", hist.status === 0 && hist.stdout.trim().split("\n").length === 3 && /proposed to active/.test(hist.stdout) && /active to ended/.test(hist.stdout), hist.stdout);
  const viaCli = workers(["activate", "strategy-worker-draft-competitor-summary", "--by", "strategy-agent"], { MENTURA_ACTOR_ID: "strategy-agent" });
  expect("naive workers activate by an agent is refused", viaCli.status !== 0 && /only a person activates/.test(viaCli.stderr), viaCli.stderr);
  const dep = workers(["deploy", "founder", "--sponsor", PERSON, "--by", PERSON, "--task", "x"]);
  expect("naive workers deploy refuses a person role", dep.status !== 0 && /never deployed as an agent/.test(dep.stderr), dep.stderr);

  // A lead's temporary role, deployed until it is proposed as durable; only a person accepts.
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ ...JSON.parse(existsSync(join(dir, "naive.config.json")) ? readFileSync(join(dir, "naive.config.json"), "utf8") : "{}"), workers: { promote_after: 2 } }, null, 2));
  process.env.MENTURA_ACTOR_ID = "strategy-lead";
  const role = runSync(writeRole(dir, { id: "pricing-analyst", by: "strategy-lead", function: "strategy" }));
  const d1 = runSync(deploy(dir, { role: "pricing-analyst", by: "strategy-lead", sponsor: PERSON, task: "Price the starter plan" }));
  const d2 = runSync(deploy(dir, { role: "pricing-analyst", by: "strategy-lead", sponsor: PERSON, task: "Price the team plan" }));
  delete process.env.MENTURA_ACTOR_ID;
  expect("a lead writes a temporary role in the venture and deploys workers as it, proposed", role.status === "temporary" && existsSync(join(dir, "governance/roles/pricing-analyst/role.json"))
    && d1.status === "proposed" && d2.status === "proposed" && d1.id === "pricing-analyst-worker-price-starter-plan", { role, d1 });
  const roleCheck = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-roles.ts"), dir], { encoding: "utf8", env });
  expect("check-roles passes the venture's temporary role", roleCheck.status === 0, roleCheck.stdout);
  const promos = workers(["promotions", "--propose"], { MENTURA_ACTOR_ID: "strategy-lead" });
  expect("a temporary role deployed promote_after times is proposed as one open decision", promos.status === 0 && /filed promote-role-pricing-analyst/.test(promos.stdout)
    && existsSync(join(dir, "governance/decisions/promote-role-pricing-analyst.decision.json")), promos.stdout + promos.stderr);
  expect("a rerun leaves the decision it filed", !/filed/.test(workers(["promotions", "--propose"], { MENTURA_ACTOR_ID: "strategy-lead" }).stdout));
  const leadAccepts = workers(["promote", "pricing-analyst", "--by", "strategy-lead"], { MENTURA_ACTOR_ID: "strategy-lead" });
  expect("a lead may not accept the promotion it proposed", leadAccepts.status !== 0 && /only a person makes a role durable/.test(leadAccepts.stderr), leadAccepts.stderr);
  // Merging a decision as a person needs the venture to name its people.
  mkdirSync(join(dir, "people"), { recursive: true });
  writeFileSync(join(dir, "people/people.json"), JSON.stringify({ venture: "lab", mode: "solo", people: [{ id: "ana", name: PERSON, role: "founder" }] }, null, 2));
  const accepted = runSync(promote(dir, "pricing-analyst", PERSON));
  expect("a person accepts, and the role becomes durable", accepted.status === "durable" && (JSON.parse(readFileSync(join(dir, "governance/roles/pricing-analyst/role.json"), "utf8")) as { status?: string }).status === "durable", accepted);
  expect("every worker record still validates", runSync(readWorkers(dir)).length === 5);
}
catch (e) { expect("the test ran", false, e instanceof Error ? e.stack ?? e.message : String(e)); }
finally { rmSync(ws, { recursive: true, force: true }); }

console.log(failed ? `\n${failed} failed` : "\nworkers: all passed");
process.exit(failed ? 1 : 0);
