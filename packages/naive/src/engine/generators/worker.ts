// Record generator for a digital worker (EE-235): one role deployed as a running agent. The deployer names the role,
// who deploys it, the sponsor, the mode, and for a temporary worker the task; the generator derives the id, starts the
// status at proposed and the expiry from the ttl, and refuses a person role, a reach wider than the role's or the
// deployer's, or a ttl that is not a duration. `naive workers deploy` and `naive agent spawn` are the usual ways in;
// this generator is what a harness with no CLI drafts through, and the draft goes to the write chain for
// operations/workers/<id>.json (route operations/workers/[id]). Only a person activates it afterwards.
import { cli, questions, schemaOf, validate } from "./generate.ts";
import { functionAgent } from "../agents/function-spec.ts";
import { deployerReach, functionOfAgent, portfolioOf, roleReach } from "../agents/reach.ts";
import { loadRoles } from "../agents/roles.ts";
import { deployPlan, shipped } from "../agents/workers.ts";
import type { Worker } from "../../records/types/records.d.ts";

export const record = "worker";
const DERIVED = ["id", "status", "started_at", "expires", "activated_by", "activated_at", "decision", "ended_at", "ended_by", "ended_how"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the role and the task unless given", status: "proposed", started_at: "now unless given", expires: `started_at plus the ttl (${shipped().default_ttl} unless the answers say otherwise) for a temporary worker` } });

export function draft(a: Partial<Worker> & { ttl?: string; taken?: string[] }) {
  const role = a.role ?? "";
  const r = loadRoles().get(role);
  const fn = functionOfAgent(role) ?? r?.function;
  const by = a.deployed_by ?? "";
  const plan = deployPlan(
    { role, by, sponsor: a.sponsor ?? "", mode: a.mode, level: a.level, writes: a.writes, ttl: a.ttl, task: a.task, skills: a.skills, at: a.started_at },
    { roleRecord: r, roleWrites: roleReach(role), deployerWrites: by ? deployerReach(by) : null, byIsLead: !!portfolioOf(by), roleSkills: fn && functionOfAgent(`${fn}-agent`) ? functionAgent(fn).skills.map((s) => s.name) : [],
      sponsorRefused: null, acting: null, taken: new Set(a.taken ?? []), config: shipped() },
  );
  if (!plan.ok) return { ok: false, record, errors: [plan.error, ...(plan.hint ? [plan.hint] : [])] };
  const rec = a.id ? { ...plan.record, id: a.id } : plan.record;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `operations/workers/${rec.id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
