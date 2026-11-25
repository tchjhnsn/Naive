// Tests the field merge for offline sync (packages/naive/src/engine/merge.ts): each of its five rules, removals,
// arrays merged by id, records created on both sides, and that the result never depends on key order.
//
//   node packages/naive/src/engine/merge-test.ts
import { mergeRecord, pathText, type Json } from "./merge.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

const base: Json = { name: "Lumen", price: { amount: 20, currency: "USD" }, tags: ["b2b"], owners: [{ id: "o1", role: "founder" }, { id: "o2", role: "advisor" }] };

{
  const r = mergeRecord(base, base, base);
  expect("rule 1: nothing changed leaves the record as it was", eq(r.merged, base) && r.conflicts.length === 0, r);
}
{
  const both = { ...base, name: "Lumen Labs" };
  const r = mergeRecord(base, both, both);
  expect("rule 1: the same change on both sides is no conflict", eq(r.merged, both) && r.conflicts.length === 0, r);
}
{
  const local = { ...base, name: "Lumen Labs" };
  const r = mergeRecord(base, local, base);
  expect("rule 2: a change made only offline is kept", eq(r.merged, local) && r.conflicts.length === 0, r);
  const r2 = mergeRecord(base, base, local);
  expect("rule 2: a change made only in the store is taken", eq(r2.merged, local) && r2.conflicts.length === 0, r2);
}
{
  const local = { ...base, price: { amount: 25, currency: "USD" } };
  const store = { ...base, name: "Lumen Labs" };
  const r = mergeRecord(base, local, store);
  expect("rule 3: different fields changed on each side both survive", eq(r.merged, { ...base, name: "Lumen Labs", price: { amount: 25, currency: "USD" } }) && r.conflicts.length === 0, r);
}
{
  const local = { ...base, price: { amount: 25, currency: "USD" } };
  const store = { ...base, price: { amount: 30, currency: "USD" } };
  const r = mergeRecord(base, local, store);
  const c = r.conflicts[0];
  expect("rule 5: the same field changed to different values is one conflict", r.conflicts.length === 1 && c !== undefined && pathText(c.path) === "price.amount" && c.base === 20 && c.local === 25 && c.store === 30, r.conflicts);
  expect("rule 5: the merged record keeps the store's value until a person decides", eq(r.merged, store), r.merged);
}
{
  const local = { ...base, price: { amount: 25, currency: "EUR" } };
  const store = { ...base, price: { amount: 20, currency: "GBP" } };
  const r = mergeRecord(base, local, store);
  expect("rule 3 inside an object: amount merges, currency conflicts", eq(r.merged, { ...base, price: { amount: 25, currency: "GBP" } }) && r.conflicts.length === 1 && pathText(r.conflicts[0]?.path ?? []) === "price.currency", r);
}
{
  const local = { ...base, owners: [{ id: "o1", role: "founder" }, { id: "o2", role: "board" }] };
  const store = { ...base, owners: [{ id: "o1", role: "ceo" }, { id: "o2", role: "advisor" }, { id: "o3", role: "investor" }] };
  const r = mergeRecord(base, local, store);
  expect("rule 4: arrays with ids merge item by item", eq(r.merged, { ...base, owners: [{ id: "o1", role: "ceo" }, { id: "o2", role: "board" }, { id: "o3", role: "investor" }] }) && r.conflicts.length === 0, r);
}
{
  const local = { ...base, owners: [{ id: "o1", role: "founder" }, { id: "o2", role: "advisor" }, { id: "o4", role: "mentor" }] };
  const store = { ...base, owners: [{ id: "o1", role: "founder" }, { id: "o2", role: "advisor" }, { id: "o3", role: "investor" }] };
  const r = mergeRecord(base, local, store);
  expect("rule 4: items added on both sides are both kept, store's first", eq((r.merged as { owners: { id: string }[] }).owners.map((o) => o.id), ["o1", "o2", "o3", "o4"]) && r.conflicts.length === 0, r);
}
{
  const local = { ...base, owners: [{ id: "o1", role: "founder" }] };
  const store = { ...base, owners: [{ id: "o1", role: "founder" }, { id: "o2", role: "board" }] };
  const r = mergeRecord(base, local, store);
  const c = r.conflicts[0];
  expect("an item removed offline but edited in the store is a conflict", r.conflicts.length === 1 && c !== undefined && pathText(c.path) === "owners[id=o2]" && c.local === undefined, r.conflicts);
}
{
  const local = { ...base, owners: [{ id: "o1", role: "founder" }] };
  const r = mergeRecord(base, local, base);
  expect("an item removed only offline is removed", eq(r.merged, local) && r.conflicts.length === 0, r);
}
{
  const local = { ...base, tags: ["b2b", "ai"] };
  const store = { ...base, tags: ["b2b", "services"] };
  const r = mergeRecord(base, local, store);
  expect("an array without ids is one value: changes on both sides conflict", r.conflicts.length === 1 && pathText(r.conflicts[0]?.path ?? []) === "tags", r.conflicts);
}
{
  const local: Record<string, Json> = { ...base };
  delete local.tags;
  const store = { ...base, name: "Lumen Labs" };
  const r = mergeRecord(base, local, store);
  expect("a key removed offline and another changed in the store both land", eq(r.merged, { name: "Lumen Labs", price: base.price, owners: base.owners }) && r.conflicts.length === 0, r);
}
{
  const r = mergeRecord(base, undefined, { ...base, name: "Lumen Labs" });
  expect("a record removed offline but edited in the store is a conflict on the whole record", r.conflicts.length === 1 && pathText(r.conflicts[0]?.path ?? ["x"]) === "(record)" && r.conflicts[0]?.local === undefined, r.conflicts);
  const r2 = mergeRecord(base, undefined, base);
  expect("a record removed only offline is removed", r2.merged === undefined && r2.conflicts.length === 0, r2);
}
{
  const r = mergeRecord(undefined, { id: "x", name: "A", stage: "idea" }, { id: "x", name: "B", stage: "idea" });
  expect("a record created on both sides merges like any other", r.conflicts.length === 1 && pathText(r.conflicts[0]?.path ?? []) === "name", r);
}
{
  const store = { price: { currency: "USD", amount: 20 }, owners: base.owners, tags: ["b2b"], name: "Lumen" };
  const r = mergeRecord(base, base, store);
  expect("key order alone is not a change", r.conflicts.length === 0 && eq(r.merged, store), r);
}

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("all passed");
