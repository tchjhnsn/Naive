// Record generator for a product capability (EE-224). The agent asks for the name, the product, whether it is a
// category or a capability, the category it sits under and the agent role that owns it. The generator derives the id
// from the name unless one is given, starts the status at building, and refuses a capability with no category. The
// draft goes to the write chain for product/capabilities/<id>.json (route product/capabilities/[id]).
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { ProductCapability } from "../../records/types/records.d.ts";

export const record = "product-capability";
const DERIVED = ["id", "venture", "status", "since"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the name unless given", status: "building", parent: "null for a category directly under the products function" } });

export function draft(a: Partial<ProductCapability>) {
  if (!a.name || !a.product || !a.kind || !a.owner) return { ok: false, record, errors: ["a capability needs a name, its product, its kind (category or capability) and the agent role that owns it"] };
  if (a.kind === "capability" && !a.parent) return { ok: false, record, errors: ["a capability sits under a category: name its parent"] };
  const id = slug(a.id ?? a.name);
  const rec = drop({ id, venture: a.venture, name: a.name, product: a.product, kind: a.kind, parent: a.parent ?? null, owner: a.owner,
    status: a.status ?? "building", summary: a.summary, since: a.since, note: a.note }) as ProductCapability;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `product/capabilities/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
