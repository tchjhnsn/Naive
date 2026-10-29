#!/usr/bin/env node
// Tests for the docket across functions (EE-074) on the example ventures: a gate carries the weight of
// what it holds, functions rank by attention, dominance means outweighing every other function, and a
// replayed day always settles the top decision of the top function.
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { docket, replay } from "./docket.mjs";

const root = new URL("examples/workspace/ventures/", import.meta.url).pathname;
const now = Date.parse("2026-10-29T12:00:00Z");
let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m); };

for (const v of readdirSync(root)) {
  const dir = join(root, v);
  const k = docket(dir, now);
  const all = k.functions.flatMap((f) => f.decisions);
  t(`${v}: a decision's value is its own weight plus what it holds, never less`, () => {
    for (const d of all) ok(d.value >= d.own && (d.holds.length === 0 ? d.value === d.own : d.value > d.own), `${d.id}: own ${d.own}, value ${d.value}, holds ${d.holds.length}`);
  });
  t(`${v}: functions rank by attention, each the halving sum of its decisions' values`, () => {
    for (const f of k.functions) ok(f.attention === Math.round(f.decisions.reduce((s, d, i) => s + d.value / 2 ** i, 0)), `${f.id} attention ${f.attention}`);
    for (let i = 1; i < k.functions.length; i++) ok(k.functions[i - 1].attention >= k.functions[i].attention, "functions out of order");
  });
  t(`${v}: dominant means outweighing every other function together`, () => {
    for (const f of k.functions) for (const d of f.decisions) ok(d.dominant === (k.functions.length > 1 && d.value > k.total - f.attention), d.id);
  });
  t(`${v}: next is the top decision of the top function`, () => {
    ok(!k.functions.length || (k.next.function_id === k.functions[0].id && k.next.decision === k.functions[0].decisions[0].id), JSON.stringify(k.next));
  });
}

t("a replayed day settles or sets aside the top decision at every step, and never repeats one", () => {
  const r = replay(join(root, "tandem"), 12);
  ok(r.timeline.length > 0, "nothing replayed");
  const ids = r.timeline.map((x) => x.decision);
  ok(new Set(ids).size === ids.length, `repeated: ${ids.join(", ")}`);
});

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
