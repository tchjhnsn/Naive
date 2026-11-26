// Record generator for a venture's validation plan (EE-099, EE-156), validation/plan.json. The agent asks for the
// assumptions not yet demonstrated, each with what must be true, the gate item it bears on, how it will be tested,
// the result that counts as passing (decided before the test) and a date. The generator derives each assumption's id
// from its statement unless one is given, starts its status at open, and refuses an item that no phase gate in
// packages/naive/src/phases/gate-policies.json names. uncovered lists the gate items a plan does not yet name, which
// is what the discovery gate's validation-plan item measures. The draft goes to the write chain at validation/plan
// (validation/plan.json).
import { join } from "node:path";
import { cli, drop, questions, readJson, repo, schemaOf, slug, validate } from "./generate.ts";
import type { PhaseGatePolicies, ValidationPlan } from "../../records/types/records.d.ts";
import { now } from "../../core/clock.ts";

export const record = "validation-plan";
const DERIVED = ["venture", "updated"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { venture: "from venture.json", updated: "today unless given", "assumptions.id": "from the statement unless given", "assumptions.status": "open unless given" } });

type Assumption = ValidationPlan["assumptions"][number];
const policies = (): PhaseGatePolicies | null => readJson(join(repo, "packages/naive/src/phases/gate-policies.json")) as PhaseGatePolicies | null;

/** Every gate item id in the policies, across phases. */
export const gateItems = (p: PhaseGatePolicies | null = policies()): Set<string> =>
  new Set(Object.values(p?.phases ?? {}).flatMap((ph) => ph.items.map((i) => i.id)));

export function draft(a: { assumptions?: Partial<Assumption>[], updated?: string }, opts: { venture?: string } = {}) {
  if (!a.assumptions?.length) return { ok: false, record, errors: ["a validation plan needs at least one assumption, each with a statement, the gate item it bears on, a test, the result that passes and a date"] };
  const missing = a.assumptions.filter((x) => !x.statement || !x.item || !x.test || !x.pass || !x.by);
  if (missing.length) return { ok: false, record, errors: [`${missing.length} assumption(s) lack a statement, gate item, test, passing result or date`] };
  const v0 = opts.venture ? readJson(join(opts.venture, "venture.json")) as { id?: string } | null : null;
  const items = gateItems();
  const seen = new Set<string>();
  const assumptions = a.assumptions.map((x) => {
    let id = slug(x.id ?? x.statement);
    for (let n = 2; seen.has(id); n++) id = `${slug(x.id ?? x.statement)}-${n}`;
    seen.add(id);
    return drop({ id, statement: x.statement, item: x.item, test: x.test, pass: x.pass, by: x.by, status: x.status ?? "open" }) as Assumption;
  });
  const rec = drop({ venture: v0?.id ?? "venture", updated: a.updated ?? now().toISOString().slice(0, 10), assumptions }) as ValidationPlan;
  const v = validate(record, rec);
  const unknown = items.size ? assumptions.filter((x) => !items.has(x.item)).map((x) => `assumption ${x.id}: no phase gate names the item ${x.item}`) : [];
  return { ok: v.ok && !unknown.length, record, route: "validation/plan", draft: rec, errors: [...v.errors, ...unknown] };
}

/** The gate items of a phase that no open or passed assumption in the plan names. */
export function uncovered(plan: ValidationPlan, phase = "discovery", p: PhaseGatePolicies | null = policies()): string[] {
  const named = new Set(plan.assumptions.filter((x) => x.status !== "dropped" && x.status !== "failed").map((x) => x.item));
  return (p?.phases[phase]?.items ?? []).filter((i) => i.measure.kind !== "authority" && i.measure.kind !== "coverage" && !named.has(i.id)).map((i) => i.id);
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
