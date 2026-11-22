// Record generator for the phase gate policies (EE-099, EE-156), packages/naive/src/phases/gate-policies.json. The
// policies are framework data, so a draft is a change to the framework (a pull request), not a venture route. A draft
// takes the phases, each with its gate items and presets, and checks what the schema cannot: every item's record is a
// record type in the data model (or null for a person's act), and every preset gives every item of its phase a
// minimum level and boundary and names no other. strictness scores a preset from 0 to 100.
import { readDataModel } from "../../records/index.mjs";
import { cli, describeFrom, validate } from "./function-common.ts";
import type { PhaseGatePolicies } from "../../records/types/records.d.ts";

export const record = "phase-gate-policies";
export const describe = () => describeFrom(record, { file: "packages/naive/src/phases/gate-policies.json" });

export const LEVELS = ["very low", "low", "moderate", "high"] as const;
type Phase = PhaseGatePolicies["phases"][string];
type Rule = Phase["presets"][string][string];

/** What the schema cannot check: unknown record types and presets that miss or add items. */
export function problems(p: PhaseGatePolicies): string[] {
  const types = new Set((readDataModel() as { records: { id: string }[] }).records.map((r) => r.id));
  const out: string[] = [];
  for (const [phase, ph] of Object.entries(p.phases ?? {})) {
    const ids = ph.items.map((i) => i.id);
    for (const i of ph.items) if (i.record !== null && !types.has(i.record)) out.push(`${phase}/${i.id}: record ${i.record} is no record type in the data model`);
    for (const [name, preset] of Object.entries(ph.presets ?? {})) {
      for (const id of ids) if (!preset[id]) out.push(`${phase} preset ${name}: no rule for item ${id}`);
      for (const id of Object.keys(preset)) if (!ids.includes(id)) out.push(`${phase} preset ${name}: rule for unknown item ${id}`);
    }
  }
  return out;
}

/** A preset's strictness from 0 to 100: each item's minimum level index over 3, weighted 1 when it fails closed and
 *  0.25 when it fails open, averaged over the items. */
export function strictness(rules: Record<string, Rule>): number {
  const r = Object.values(rules);
  if (!r.length) return 0;
  const sum = r.reduce((s, x) => s + (LEVELS.indexOf(x.min) / 3) * (x.boundary === "fail-closed" ? 1 : 0.25), 0);
  return Math.round((sum / r.length) * 100);
}

export function draft(a: { phases?: Record<string, Phase>, note?: string, count_levels?: PhaseGatePolicies["count_levels"], count_note?: string }) {
  if (!a.phases || !Object.keys(a.phases).length) return { ok: false, record, errors: ["phase gate policies need at least one phase, with its gate items and presets"] };
  const rec = {
    version: "0.1.0",
    ...(a.note ? { note: a.note } : {}),
    levels: [...LEVELS],
    ...(a.count_levels ? { count_levels: a.count_levels } : {}),
    ...(a.count_note ? { count_note: a.count_note } : {}),
    phases: a.phases,
  } as PhaseGatePolicies;
  const v = validate(record, rec);
  const extra = v.ok ? problems(rec) : [];
  return { ok: v.ok && !extra.length, record, file: "packages/naive/src/phases/gate-policies.json", draft: rec, errors: [...v.errors, ...extra] };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
