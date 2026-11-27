// Record generator for a temporary specialist (EE-213): the role a function agent spawns for one task. The agent
// names its parent, the task, the skills it needs, the write reach and how long it lasts. The generator derives the
// role id from the task, starts the status at live, and refuses a reach wider than the parent's or a ttl that is not a
// duration, because a specialist is never wider than its parent. `naive agent spawn` is the usual way in; this
// generator is what a harness with no CLI drafts through, and the draft goes to the write chain for
// operations/specialists/<role>.json (route operations/specialist/[id]).
import { cli, questions, schemaOf, validate } from "./generate.ts";
import { functionAgent } from "../agents/function-spec.ts";
import { functionOfAgent } from "../agents/reach.ts";
import { shippedTtl, spawnPlan } from "../agents/specialist.ts";
import type { Specialist } from "../../records/types/records.d.ts";

export const record = "specialist";
const DERIVED = ["id", "status", "spawned_at", "expires", "finished_at"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the task unless given", status: "live", spawned_at: "now unless given", expires: `spawned_at plus the ttl (${shippedTtl()} unless the venture or the answers say otherwise)` } });

export function draft(a: Partial<Specialist> & { ttl?: string; taken?: string[] }) {
  const fn = functionOfAgent(a.parent);
  const parent = fn ? functionAgent(fn) : null;
  const plan = spawnPlan(
    { parent: a.parent ?? "", task: a.task ?? "", skills: a.skills, ttl: a.ttl, writes: a.writes, at: a.spawned_at, by: a.spawned_by },
    { parentWrites: parent?.writes ?? [], parentSkills: (parent?.skills ?? []).map((s) => s.name), taken: new Set(a.taken ?? []), ttl: shippedTtl() },
  );
  if (!plan.ok) return { ok: false, record, errors: [plan.error, ...(plan.hint ? [plan.hint] : [])] };
  const rec = a.id ? { ...plan.record, id: a.id } : plan.record;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `operations/specialist/${rec.id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
