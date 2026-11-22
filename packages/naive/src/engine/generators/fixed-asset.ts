// Record generator for an asset register entry (EE-099; ISO 55000:2024; APQC 10.3.2). The agent asks what the item
// is, its category, whether it holds data, who holds it, when it was acquired, its cost and currency, and whether the
// venture owns, leases, was given or borrows it. The generator derives the id (the asset's tag) from the name unless
// one is given, starts the status at in-use, or in-storage when no one holds it. The draft goes to the write chain for
// assets/register/<id>.json, which only the assets agent (assets-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { FixedAsset } from "../../records/types/records.d.ts";

export const record = "fixed-asset";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the name unless given", status: "in-use, or in-storage when the custodian is null, unless given" } });

export function draft(a: Partial<FixedAsset>) {
  if (!a.name || !a.category || a.holds_data === undefined || a.custodian === undefined || !a.acquired || a.cost === undefined || !a.currency || !a.ownership) {
    return { ok: false, record, errors: ["an asset needs a name, a category, whether it holds data, its custodian (or null), the date acquired, its cost and currency, and how the venture holds it"] };
  }
  const id = slug(a.id ?? a.name);
  const rec = drop({ id, name: a.name, category: a.category, serial: a.serial, holds_data: a.holds_data, custodian: a.custodian,
    location: a.location, acquired: a.acquired, cost: a.cost, currency: a.currency, ownership: a.ownership, capitalized: a.capitalized,
    useful_life_months: a.useful_life_months, warranty_end: a.warranty_end, spend: a.spend, lease: a.lease,
    status: a.status ?? (a.custodian === null ? "in-storage" : "in-use"), disposal: a.disposal, note: a.note }) as FixedAsset;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `assets/register/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
