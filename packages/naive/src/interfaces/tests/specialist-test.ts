// Tests temporary specialists (EE-213): the spawn rules, the reach that is never wider than the parent's, the router
// refusing a write outside it or after it is gone, the brief naming the parent and the task, and naive agent spawn
// over one venture in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/specialist-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.ts";
import { runSync } from "../../core/effect/run.ts";
import { agentBrief } from "../../engine/agents/brief.ts";
import { functionAgent } from "../../engine/agents/function-spec.ts";
import { narrowWrites, reachRefusal, specialistOfAgent, specialistReach, within } from "../../engine/agents/reach.ts";
import { end, liveSpecialists, roleFor, spawn, spawnPlan, ttlMillis } from "../../engine/agents/specialist.ts";
import type { Specialist } from "../../records/types/records.d.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "specialist-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_READS_AS_OF", "MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_MODEL"]) { delete process.env[k]; delete env[k]; }

interface Reply { ok: boolean, error?: string, gate_rule?: string, may_write?: string[] }
const ask = async (a: { route: string, action?: string, input?: unknown, actor?: string, actor_id?: string }): Promise<Reply> =>
  await call({ venture: "lab", workspace: ws, action: "read", ...a }) as Reply;

const parent = functionAgent("strategy");
const ctx = { parentWrites: parent.writes, parentSkills: parent.skills.map((s) => s.name), taken: new Set<string>(), ttl: "4 hours" };
const input = { parent: "strategy-agent", task: "Read the competitor pricing pages.", by: "strategy-agent", at: "2026-06-15T00:00:00.000Z" };

try {
  // The rules, before anything is read or written.
  expect("a specialist role names its parent's function and its slug",
    specialistOfAgent("strategy-specialist-pricing")?.function === "strategy" && specialistOfAgent("marketing-and-sales-specialist-ads")?.slug === "ads");
  expect("a function agent, a lead and an unknown function are no specialist",
    ["strategy-agent", "strategy-lead", "nope-specialist-x", "-specialist-x", "strategy-specialist-", undefined].every((r) => specialistOfAgent(r) === null));
  expect("a glob is inside another when every route it matches the other matches too",
    within("purpose/competitor/*", "purpose/competitor/*") && within("purpose/competitor/acme", "purpose/competitor/*") && !within("purpose/competitor/*", "purpose/competitor/acme") && !within("customers/*", "purpose/competitor/*"));
  expect("narrowWrites keeps the globs the parent covers and names the ones it does not",
    JSON.stringify(narrowWrites(["decisions/*", "customers/*"], parent.writes)) === JSON.stringify({ writes: ["decisions/*"], wider: ["customers/*"] }));
  expect("a role slug drops the filler words and takes the next four",
    roleFor("strategy", "Read the three competitor pricing pages for us", new Set()) === "strategy-specialist-read-three-competitor-pricing");
  expect("a slug already taken takes a number", roleFor("strategy", "Read", new Set(["strategy-specialist-read"])) === "strategy-specialist-read-2");
  expect("a ttl is a number and a unit", ttlMillis("2 hours") === 7_200_000 && ttlMillis("30 minutes") === 1_800_000 && ttlMillis("soon") === null && ttlMillis("0 hours") === null);

  const bad = (over: Record<string, unknown>) => spawnPlan({ ...input, ...over }, ctx);
  expect("only a function agent spawns one", bad({ parent: "strategy-lead" }).rule === "function-agent-spawns" && /only a function agent/.test(bad({ parent: "strategy-lead" }).error ?? ""));
  expect("a specialist does not spawn another, so a chain cannot grow",
    bad({ parent: "strategy-specialist-pricing" }).rule === "function-agent-spawns" && /a specialist does not spawn another/.test(bad({ parent: "strategy-specialist-pricing" }).error ?? ""));
  expect("an agent spawns only its own specialist, by the role it claims or the one the process says is acting",
    bad({ by: "finance-agent" }).rule === "parent-spawns" && /finance-agent may not spawn a specialist of strategy-agent/.test(bad({ by: "finance-agent" }).error ?? ""), bad({ by: "finance-agent" }));
  process.env.MENTURA_ACTOR_ID = "finance-agent";
  const disguised = bad({ by: "a person" });
  delete process.env.MENTURA_ACTOR_ID;
  expect("a spawn made while another agent is acting is refused too", disguised.rule === "parent-spawns" && /finance-agent may not spawn/.test(disguised.error ?? ""), disguised);
  expect("a specialist is spawned for one task", bad({ task: "  " }).rule === "task-needed");
  expect("a skill the parent does not have is refused", bad({ skills: ["nonsense"] }).rule === "parent-skills" && /its skills are/i.test(bad({ skills: ["nonsense"] }).hint ?? ""));
  expect("a write outside the parent's own reach is refused, because a specialist is never wider",
    bad({ writes: ["customers/*"] }).rule === "never-wider" && /never wider than its parent/.test(bad({ writes: ["customers/*"] }).error ?? ""));
  expect("a ttl that is not a duration is refused", bad({ ttl: "a while" }).rule === "ttl");

  const planned = spawnPlan({ ...input, skills: ["competitor-research"], ttl: "2 hours", writes: ["purpose/competitor/*"] }, ctx);
  const rec = planned.record as Specialist;
  expect("a spawn gives the role, the parent, the task, the reach asked for and an expiry one ttl on",
    planned.ok && rec.id === "strategy-specialist-read-competitor-pricing-pages" && rec.parent === "strategy-agent" && rec.function === "strategy"
    && rec.writes.join() === "purpose/competitor/*" && rec.status === "live" && rec.expires === "2026-06-15T02:00:00.000Z", planned);
  expect("with no --writes it gets its parent's own reach, which is equal and never wider",
    JSON.stringify((spawnPlan(input, ctx).record as Specialist).writes) === JSON.stringify(parent.writes));

  const at = (now: string, over: Partial<Specialist> = {}) => specialistReach({ ...rec, ...over }, now);
  expect("a live, unexpired specialist keeps the globs its parent still covers", at("2026-06-15T01:00:00.000Z").gone === null && at("2026-06-15T01:00:00.000Z").writes.join() === "purpose/competitor/*");
  expect("once its expiry has passed the reach is gone", /expired on/.test(at("2026-06-15T02:00:00.000Z").gone ?? ""));
  expect("a finished or revoked specialist has no reach either",
    at("2026-06-15T01:00:00.000Z", { status: "finished" }).gone === "its run has finished" && at("2026-06-15T01:00:00.000Z", { status: "revoked" }).gone === "a person revoked it");
  expect("a record edited to a reach outside its parent's keeps nothing of it",
    at("2026-06-15T01:00:00.000Z", { writes: ["customers/*"] }).writes.length === 0 && /inside strategy-agent's own reach/.test(at("2026-06-15T01:00:00.000Z", { writes: ["customers/*"] }).gone ?? ""));

  // Through the router, in a venture.
  const made = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/init-venture.ts"), join(ws, "ventures/lab"), "lab", "--type", "software-startup"], { encoding: "utf8", env });
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  const dir = join(ws, "ventures/lab");

  const unknown = await ask({ route: "purpose/competitor/acme", action: "write", input: { id: "acme" }, actor: "agent", actor_id: "strategy-specialist-ghost" });
  expect("a specialist with no spawn record is refused, naming the spawn that would make one",
    !unknown.ok && unknown.gate_rule === "specialist-reach" && /has no operations\/specialists\/strategy-specialist-ghost\.json/.test(unknown.error ?? "") && /naive agent spawn strategy-agent/.test(unknown.error ?? ""), unknown);

  const live = runSync(spawn(dir, { parent: "strategy-agent", task: "Record what each competitor charges.", skills: ["competitor-research"], writes: ["purpose/competitor/*"], by: "strategy-agent" }));
  expect("the spawn is a record in the venture, with its reach and expiry", existsSync(join(dir, `operations/specialists/${live.id}.json`))
    && (JSON.parse(readFileSync(join(dir, `operations/specialists/${live.id}.json`), "utf8")) as Specialist).writes.join() === "purpose/competitor/*", live);
  expect("and a provenance line records who spawned what", /spawned the specialist/.test(readFileSync(join(dir, "provenance.jsonl"), "utf8")));
  expect("it is listed as live", runSync(liveSpecialists(dir, new Date().toISOString())).some((s) => s.id === live.id));

  const inside = await ask({ route: "purpose/competitor/acme", action: "write", input: { id: "acme", name: "Acme", sources: [] }, actor: "agent", actor_id: live.id });
  expect("the live specialist writing inside its reach is not refused for reach", inside.gate_rule !== "specialist-reach", JSON.stringify(inside));
  const outside = await ask({ route: "foundation/telos", action: "write", input: { venture: "lab" }, actor: "agent", actor_id: live.id });
  expect("writing a route its record does not name is refused, although its parent may write it",
    !outside.ok && outside.gate_rule === "specialist-reach" && outside.may_write?.join() === "purpose/competitor/*" && /hand the change back to strategy-agent/.test(outside.error ?? ""),
    JSON.stringify(outside));
  expect("its parent may write that route, so the narrowing is what refused it", parent.writes.includes("foundation/telos"));

  const brief = agentBrief(live.id, dir);
  expect("the brief names its parent, its task and the reach it has", !(brief instanceof Error) && brief.kind === "specialist"
    && /a temporary specialist strategy-agent spawned for one task: Record what each competitor charges\./.test(brief.how)
    && JSON.stringify(brief.spec.writes) === JSON.stringify(["purpose/competitor/*"]) && brief.skills?.length === 1, brief instanceof Error ? brief.message : brief.how);
  expect("the brief carries its parent's instructions and the skill its spawn named",
    !(brief instanceof Error) && /role: strategy-agent/.test(brief.instructions?.text ?? "") && /competitor-research/.test(brief.skills?.[0]?.path ?? ""));

  const ended = runSync(end(dir, live.id, "finished"));
  expect("ending it writes finished with the time", ended.status === "finished" && typeof ended.finished_at === "string");
  const after = await ask({ route: "purpose/competitor/beta", action: "write", input: { id: "beta", name: "Beta", sources: [] }, actor: "agent", actor_id: live.id });
  expect("once finished, its writes are refused and the refusal says why its reach is gone",
    !after.ok && after.gate_rule === "specialist-reach" && /its run has finished/.test(after.error ?? ""), JSON.stringify(after));
  expect("and it is no longer listed as live", !runSync(liveSpecialists(dir, new Date().toISOString())).some((s) => s.id === live.id));
  expect("reachRefusal with no venture folder refuses rather than guessing a reach",
    reachRefusal({ role: live.id, route: "purpose/competitor/acme" })?.rule === "specialist-reach");

  // naive agent spawn: the record, the prompt, and the listing.
  const agent = (...a: string[]) => spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/agents/run.ts"), ...a, "--venture", dir], { encoding: "utf8", env });
  const spawned = agent("spawn", "strategy-agent", "--task", "Check the pricing page of each competitor", "--skills", "competitor-research", "--ttl", "2 hours", "--writes", "purpose/competitor/*", "--by", "strategy-agent", "--print");
  expect("naive agent spawn records the specialist and prints its prompt", spawned.status === 0
    && /spawned strategy-specialist-check-pricing-page-competitor/.test(spawned.stderr) && /one of Naive's temporary specialists/.test(spawned.stdout)
    && /## What you may write\n\n- purpose\/competitor\/\*/.test(spawned.stdout), spawned.stderr.slice(0, 400));
  expect("the prompt does not tell a specialist to spawn one of its own", !/naive agent spawn/.test(spawned.stdout), spawned.stdout.slice(0, 200));
  expect("--print leaves it live, because nothing ran", runSync(liveSpecialists(dir, new Date().toISOString())).some((s) => s.id === "strategy-specialist-check-pricing-page-competitor"));
  const listed = agent("list");
  expect("naive agent list shows a live specialist of the venture under its parent",
    listed.status === 0 && /strategy-specialist-check-pricing-page-competitor\s+specialist\s+of strategy-agent until /.test(listed.stdout), listed.stdout.split("\n").filter((l) => /specialist/.test(l)));
  expect("a function agent's own prompt names the spawn and the steps it must record",
    /naive agent spawn strategy-agent --task/.test(agent("brief", "strategy-agent").stdout) && /naive due record <function>\/<workflow> --steps/.test(agent("brief", "strategy-agent").stdout));
  const refused = agent("spawn", "strategy-lead", "--task", "Do a thing", "--by", "a person");
  expect("naive agent spawn refuses a parent that is not a function agent", refused.status !== 0 && /only a function agent spawns a specialist/.test(refused.stdout + refused.stderr), refused.stdout + refused.stderr);

  // A person revoking it: the one write of a specialist record the router takes, so a person can end one early.
  writeFileSync(join(ws, "revoke.json"), JSON.stringify({ ...runSync(liveSpecialists(dir, new Date().toISOString()))[0], status: "revoked" }));
  const revoked = spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/mentura.ts"), `operations/specialist/strategy-specialist-check-pricing-page-competitor`, "write", "--venture", "lab", "--input", join(ws, "revoke.json")], { encoding: "utf8", env });
  expect("a person writes the record to revoke it, and the reach is then gone", revoked.status === 0
    && !runSync(liveSpecialists(dir, new Date().toISOString())).some((s) => s.id === "strategy-specialist-check-pricing-page-competitor"), revoked.stdout + revoked.stderr);
}
catch (e) { expect("the test ran", false, e instanceof Error ? e.stack ?? e.message : String(e)); }
finally { rmSync(ws, { recursive: true, force: true }); }

console.log(failed ? `\n${failed} failed` : "\nspecialists: all passed");
process.exit(failed ? 1 : 0);
