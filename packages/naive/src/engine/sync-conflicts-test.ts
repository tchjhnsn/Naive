// Tests conflict decisions for offline sync (packages/naive/src/engine/sync-conflicts.ts and sync-apply.ts): a
// conflict the field merge finds is filed as an open decision holding both values; a rerun files nothing new; a
// person approves store, local or their own value; and merging writes it at the path, items by id included.
//
//   node packages/naive/src/engine/sync-conflicts-test.ts
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approve, merge } from "./decisions.ts";
import { mergeRecord, type Json } from "./merge.ts";
import { applySyncConflict, chosenValue } from "./sync-apply.ts";
import { conflictDecision, fileConflicts } from "./sync-conflicts.ts";

let failed = 0;
const expect = (name: string, ok: unknown, detail?: unknown) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

// Pure parts first.
{
  const r = applySyncConflict({ price: { amount: 20 } }, ["price", "amount"], 25);
  expect("apply writes a nested field", r.ok && eq(r.record, { price: { amount: 25 } }), r);
  const o = applySyncConflict({ owners: [{ id: "o1", role: "a" }, { id: "o2", role: "b" }] }, ["owners", "[id=o2]", "role"], "board");
  expect("apply writes inside an array item by id", o.ok && eq(o.record, { owners: [{ id: "o1", role: "a" }, { id: "o2", role: "board" }] }), o);
  const del = applySyncConflict({ owners: [{ id: "o1" }, { id: "o2" }] }, ["owners", "[id=o2]"], undefined);
  expect("apply removes an item when the chosen value is absent", del.ok && eq(del.record, { owners: [{ id: "o1" }] }), del);
  const add = applySyncConflict({}, ["owners", "[id=o3]"], { id: "o3", role: "x" });
  expect("apply creates the list and appends a missing item", add.ok && eq(add.record, { owners: [{ id: "o3", role: "x" }] }), add);
  expect("the whole record is not resolved from a decision (not built)", !applySyncConflict({}, [], {}).ok);
  const before = { a: { b: 1 } };
  applySyncConflict(before, ["a", "b"], 2);
  expect("apply never changes the record it was given", before.a.b === 1);
  const sc = { file: "f.json", path: ["x"], local: 2, store: 3 };
  expect("answer store picks the store value", chosenValue("store", sc).value === 3);
  expect("answer local picks the working copy's value", chosenValue("local", sc).value === 2);
  expect("any other answer is a person's own value as JSON", chosenValue("7", sc).value === 7 && chosenValue("plain words", sc).value === "plain words");
  expect("an empty answer is refused", !chosenValue("", sc).ok);
}

// Filed, approved and merged in a venture.
const v = mkdtempSync(join(tmpdir(), "sync-conflicts-"));
const json = (rel: string) => JSON.parse(readFileSync(join(v, rel), "utf8"));
try {
  writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "lumen", name: "Lumen", type: "software-startup", phase: "discovery" }, null, 2));
  mkdirSync(join(v, "people"), { recursive: true });
  writeFileSync(join(v, "people/people.json"), JSON.stringify({ venture: "lumen", mode: "solo", people: [{ id: "founder", name: "Founder", role: "founder" }] }, null, 2));
  mkdirSync(join(v, "notes"), { recursive: true });
  const base: Json = { title: "Pricing", price: { amount: 20, currency: "USD" }, owners: [{ id: "o1", role: "founder" }] };
  const local: Json = { title: "Pricing", price: { amount: 25, currency: "USD" }, owners: [{ id: "o1", role: "ceo" }] };
  const store: Json = { title: "Pricing", price: { amount: 30, currency: "USD" }, owners: [{ id: "o1", role: "chair" }] };
  const m = mergeRecord(base, local, store);
  writeFileSync(join(v, "notes/pricing.json"), JSON.stringify(m.merged, null, 2));
  expect("the merge finds two conflicts", m.conflicts.length === 2, m.conflicts);

  const meta = { local_by: "Founder", store_by: "finance-agent", working_copy: "laptop" };
  const filed = fileConflicts(v, "notes/pricing.json", m.conflicts, meta);
  expect("each conflict is filed as a decision", filed.length === 2 && filed.every((f) => f.file), filed);
  const price = filed.find((f) => f.path === "price.amount");
  const d = price?.file ? json(price.file) : null;
  expect("the decision is open, proposed by the sync agent, and holds both values", d?.status === "open" && d?.provenance?.drafted_by?.id === "sync" && d?.sync_conflict?.local === 25 && d?.sync_conflict?.store === 30 && d?.sync_conflict?.base === 20, d);
  expect("its note names who wrote each value", /finance-agent/.test(d?.note ?? "") && /Founder/.test(d?.note ?? ""), d?.note);
  expect("the record keeps the store's value until a person decides", json("notes/pricing.json").price.amount === 30);

  const again = fileConflicts(v, "notes/pricing.json", m.conflicts, meta);
  expect("a rerun on the same conflict keeps the decisions already filed", eq(again.map((f) => f.id), filed.map((f) => f.id)) && again.every((f) => "kept" in f && f.kept), again);
  expect("the same values always give the same id", conflictDecision("notes/pricing.json", m.conflicts[0] as never).id === filed[0]?.id);

  const id = price?.id as string;
  const early = merge(v, id, { by: "Founder" });
  expect("an undecided conflict cannot be merged", !early.ok, early);
  const a = approve(v, id, { by: "Founder", answer: "local" });
  expect("a person approves the working copy's value", a.ok, a);
  const mg = merge(v, id, { by: "Founder" });
  expect("merging writes the chosen value at the path", mg.ok && json("notes/pricing.json").price.amount === 25 && json("notes/pricing.json").price.currency === "USD", mg.ok ? json("notes/pricing.json") : mg);

  const owner = filed.find((f) => f.path === "owners[id=o1].role");
  const a2 = approve(v, owner?.id as string, { by: "Founder", answer: "\"co-founder\"" });
  const m2 = merge(v, owner?.id as string, { by: "Founder" });
  expect("a person's own value is written inside the item by id", a2.ok && m2.ok && json("notes/pricing.json").owners[0].role === "co-founder", m2.ok ? json("notes/pricing.json") : m2);
  const third = fileConflicts(v, "notes/pricing.json", m.conflicts, meta);
  expect("a rerun after a person decided leaves the decision as it is", third.every((f) => "kept" in f && f.kept) && json(price?.file as string).status === "decided", third);
  const prov = readFileSync(join(v, "provenance.jsonl"), "utf8");
  expect("the merge is logged in provenance against the decision", prov.includes(`"decision":"${id}"`), prov.slice(-400));
} finally {
  rmSync(v, { recursive: true, force: true });
}

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("all passed");
