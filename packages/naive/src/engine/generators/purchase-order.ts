// Record generator for a purchase order (APQC PCF 4.2.3; Incoterms 2020). The agent asks for the supplier by its
// supplier record id, the lines (item, quantity, unit price), the currency and, for a cross-border order, the Incoterms
// rule and named place. The generator takes the id given or derives one from the supplier and the order date, computes
// the total from the lines and starts the status at draft. The record type carries decision class spend-money, so an
// agent's write to supply-chain/purchase-orders/<id>.json is held as a draft until a person accepts it.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { PurchaseOrder } from "../../records/types/records.d.ts";

export const record = "purchase-order";
const DERIVED = ["id", "total", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "po-<supplier>-<order date> unless given", total: "the sum of quantity times unit price", status: "draft unless given" } });

export function draft(a: Partial<PurchaseOrder>) {
  if (!a.supplier || !a.lines?.length || !a.currency) return { ok: false, record, errors: ["a purchase order needs a supplier record id, at least one line and a currency"] };
  const id = slug(a.id ?? `po-${a.supplier}-${a.ordered_on ?? "draft"}`);
  const total = Math.round(a.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0) * 100) / 100;
  const rec = drop({ id, supplier: a.supplier, lines: a.lines, currency: a.currency, total, incoterm: a.incoterm, named_place: a.named_place,
    ordered_on: a.ordered_on, delivery_date: a.delivery_date, payment_terms: a.payment_terms, status: a.status ?? "draft", decision: a.decision, note: a.note }) as PurchaseOrder;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `supply-chain/purchase-orders/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
