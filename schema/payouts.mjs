// Computes who gets what if the venture is sold, from <venture>/governance/ownership.json
// and the scenarios in exit.json (EE-022): the preference stack. Indicative only, not
// legal, tax or financial advice: the signed documents decide, and real deals add debt,
// fees, escrow and earn-outs that this leaves out.
//
//   node schema/payouts.mjs <venture dir>              every scenario in exit.json
//   node schema/payouts.mjs <venture dir> <value>      one sale value
//   node schema/payouts.mjs <venture dir> --json       as data
//
// Rules, from standard terms (NVCA model documents; Feld and Mendelson, Venture Deals):
// preferred classes are paid first, highest seniority first, equal ranks pro rata; a
// non-participating preference takes the greater of its preference or converting to common;
// a participating one takes both. A post-money SAFE or note takes the greater of its amount
// or its as-converted share (amount over valuation cap), on par with the lowest-ranked
// preferred. The unissued option pool is paid nothing. What is left goes pro rata to common.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../packages/core/venture-paths.mjs";

export function payouts(own, value) {
  const classes = new Map(own.classes.map((c) => [c.id, c]));
  const kindOf = new Map(own.holders.map((h) => [h.id, h.kind]));
  const grants = own.grants.filter((g) => kindOf.get(g.holder) !== "pool");
  const issued = grants.reduce((n, g) => n + g.amount, 0);
  const instruments = own.instruments ?? [];
  const safeShare = instruments.reduce((n, i) => n + (i.valuation_cap ? i.amount / i.valuation_cap : 0), 0);
  const ranks = own.classes.filter((c) => c.kind === "preferred").map((c) => c.liquidation?.seniority ?? 0);
  const lowest = ranks.length ? Math.min(...ranks) : 0;

  // One position per grant or instrument: its as-converted fraction and its preference.
  const pos = [
    ...grants.map((g) => {
      const c = classes.get(g.class);
      const pref = c.kind === "preferred" ? g.amount * (c.price_per_share ?? 0) * (c.liquidation?.multiple ?? 1) : 0;
      return { holder: g.holder, of: g.class, fraction: (1 - safeShare) * g.amount / issued, pref, rank: c.liquidation?.seniority ?? 0, participating: !!c.liquidation?.participating };
    }),
    ...instruments.map((i) => ({ holder: i.holder, of: i.id, fraction: i.valuation_cap ? i.amount / i.valuation_cap : 0, pref: i.amount, rank: lowest, participating: false })),
  ];

  const run = (converted) => {
    let left = value;
    const paid = pos.map(() => 0);
    const takesPref = (p, i) => p.pref > 0 && !converted.has(i);
    for (const rank of [...new Set(pos.filter(takesPref).map((p) => p.rank))].sort((a, b) => b - a)) {
      const group = pos.map((p, i) => [p, i]).filter(([p, i]) => takesPref(p, i) && p.rank === rank);
      const owed = group.reduce((n, [p]) => n + p.pref, 0);
      const pay = Math.min(left, owed);
      for (const [p, i] of group) paid[i] += pay * p.pref / owed;
      left -= pay;
    }
    const sharers = pos.map((p, i) => [p, i]).filter(([p, i]) => p.pref === 0 || p.participating || converted.has(i));
    const total = sharers.reduce((n, [p]) => n + p.fraction, 0);
    for (const [p, i] of sharers) paid[i] += total ? left * p.fraction / total : 0;
    return paid;
  };

  // Each non-participating preference converts when converting pays it more; repeat until stable.
  const converted = new Set();
  for (let changed = true, guard = 0; changed && guard < 50; guard++) {
    changed = false;
    const now = run(converted);
    for (const [i, p] of pos.entries()) {
      if (p.pref === 0 || p.participating || converted.has(i)) continue;
      const tryIt = new Set([...converted, i]);
      if (run(tryIt)[i] > now[i] + 1e-9) { converted.add(i); changed = true; break; }
    }
  }
  const paid = run(converted);
  const byHolder = new Map();
  for (const [i, p] of pos.entries()) byHolder.set(p.holder, (byHolder.get(p.holder) ?? 0) + paid[i]);
  return { value, converted: [...converted].map((i) => pos[i].of), payouts: [...byHolder].map(([holder, amount]) => ({ holder, amount: Math.round(amount * 100) / 100 })) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, arg] = process.argv.slice(2);
  if (!dir) { console.error("usage: node schema/payouts.mjs <venture dir> [value] [--json]"); process.exit(2); }
  const own = JSON.parse(readFileSync(join(ventureFile(dir, "governance/ownership.json")), "utf8"));
  const exitFile = join(ventureFile(dir, "governance/exit.json"));
  const scenarios = arg && !arg.startsWith("--") ? [{ id: "given", value: Number(arg) }]
    : existsSync(exitFile) ? JSON.parse(readFileSync(exitFile, "utf8")).scenarios ?? [] : [];
  if (!scenarios.length) { console.error("no scenarios: pass a value or add scenarios to governance/exit.json"); process.exit(2); }
  const results = scenarios.map((s) => ({ scenario: s.id, ...payouts(own, s.value) }));
  if (process.argv.includes("--json")) { console.log(JSON.stringify(results, null, 2)); process.exit(0); }
  const names = new Map(own.holders.map((h) => [h.id, h.name]));
  const cur = own.currency ?? "";
  for (const r of results) {
    console.log(`\n${r.scenario}: sale value ${r.value.toLocaleString("en-US")} ${cur}${r.converted.length ? ` (converts to common: ${r.converted.join(", ")})` : ""}`);
    for (const p of r.payouts) console.log(`  ${(names.get(p.holder) ?? p.holder).padEnd(28)} ${p.amount.toLocaleString("en-US", { maximumFractionDigits: 0 }).padStart(14)}  ${(100 * p.amount / (r.value || 1)).toFixed(1).padStart(5)}%`);
  }
  console.log("\nIndicative only; the signed documents decide. Not legal, tax or financial advice.");
}
