// Record generator for a competitor's master record (EE-099; signal library design, everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md). A person gives the name and, if they like, the domain, their stance and
// notes; the id is the name's slug unless given. The draft is for competitors/<id>.json, which the person owns.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { Competitor } from "../../records/types/records.d.ts";

export const record = "competitor";
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => q.field !== "created_from"), derived: { id: "the name's slug unless given" } });

export function draft(a: Partial<Competitor>) {
  if (!a.name) return { ok: false, record, errors: ["a competitor needs a name"] };
  const id = slug(a.id ?? a.name);
  const rec = drop({ id, name: a.name, domain: a.domain, stance: a.stance, notes: a.notes, created_from: a.created_from }) as Competitor;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `competitors/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
