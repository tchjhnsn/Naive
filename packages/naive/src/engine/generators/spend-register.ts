// Record generator for a spend register line (EE-099; docs/design/LEAD_AGENTS_2026-11-08.md, "The spend register and
// the access matrix"). The agent asks for the vendor, what it is for, the amount, currency and cadence, the paying
// account by its money record id and the function that uses it. The generator derives the id from the vendor unless
// one is given, starts the status at active, and gives a one-time charge no renewal date. It never takes a card or
// account number: the account is a money record id. The draft goes to the write chain for finance/spend/<id>.json,
// which only the finance agent (finance-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { SpendRegister } from "../../records/types/records.d.ts";

export const record = "spend-register";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the vendor unless given", status: "active unless given", renewal_date: "null for a one-time charge" } });

export function draft(a: Partial<SpendRegister>) {
  if (!a.vendor || !a.purpose || a.amount === undefined || !a.currency || !a.cadence || !a.account || !a.function) {
    return { ok: false, record, errors: ["a spend line needs a vendor, a purpose, an amount, a currency, a cadence, the paying account's money record id and the function that uses it"] };
  }
  const id = slug(a.id ?? a.vendor);
  const rec = drop({ id, vendor: a.vendor, purpose: a.purpose, amount: a.amount, currency: a.currency, cadence: a.cadence,
    renewal_date: a.cadence === "one-time" ? null : a.renewal_date, last_charged: a.last_charged, account: a.account, function: a.function,
    cluster: a.cluster, connection: a.connection, approval: a.approval, status: a.status ?? "active", note: a.note }) as SpendRegister;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `finance/spend/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
