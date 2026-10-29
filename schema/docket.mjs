#!/usr/bin/env node
// The decision docket across functions (EE-075): which function of the venture needs the founder's
// attention most right now, and which of its decisions come first. Decisions are ranked inside each
// function, and functions are ranked against each other, so the answer can move many times in a day as
// decisions are settled.
//
//   node schema/docket.mjs <venture dir> [--json]
//   node schema/docket.mjs <venture dir> --replay [--steps <n>]   settles the top decision, again and again, in a copy
//
// The model, in code (no model call):
//   own(d)    a decision's own weight: 10 for being open, plus ownScore in schema/decisions.mjs (deadline,
//             staleness, what it unlocks, the foundation, a draft to approve, outcomes to test)
//   value(d)  own(d) plus the own weight of every decision it holds, transitively. A fail-closed gate carries
//             the weight of everything waiting behind it, so one decision can outweigh whole functions.
//   attention(f)  the values of the decisions in f the founder can act on now, highest first, each worth half
//             the one before (v1 + v2/2 + v4/4...). A founder settles one decision at a time, so breadth adds
//             urgency but never outweighs one heavy decision. Each held decision counts once, under its gate.
//   dominant  a decision whose value is more than the attention of every other function put together.
//
// Function: the core package whose record the decision decides (schema/decision-analytics.mjs).

import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { decisions, ownScore } from "./decisions.mjs";
import { analytics } from "./decision-analytics.mjs";
import { PACKAGES } from "./packages.mjs";

const ACTIONABLE = new Set(["now", "overdue", "stale"]);
const OPEN = new Set(["now", "overdue", "stale", "waiting"]);
const BASE = 10;

export function docket(dir, now = Date.parse(process.env.DECISIONS_NOW ?? "") || Date.now(), { set_aside = new Set() } = {}) {
  const r = decisions(dir, now);
  const fnOf = new Map(analytics(dir, now).decisions.map((x) => [x.id, { id: x.function_id, title: x.function }]));
  const ds = r.decisions.filter((d) => d.source !== "root" && !set_aside.has(d.id)).map((d) => ({ ...d, function: fnOf.get(d.id) }));
  return { venture: r.venture, ...rankDocket(ds, r.phase, now) };
}

/** The ranking itself, over decisions as decisions.mjs resolves them, each with its function ({id, title}).
 *  Pure, so scenarios can be ranked without a venture on disk (schema/docket-eval.mjs). */
export function rankDocket(all, phase, now = Date.now()) {
  const ds = all.filter((d) => OPEN.has(d.render));
  const own = new Map(ds.map((d) => { const o = ownScore(d, phase, now); return [d.id, { score: BASE + o.score, why: o.why }]; }));
  const heldBy = new Map();
  for (const d of ds) if (d.held_by) heldBy.set(d.held_by, [...(heldBy.get(d.held_by) ?? []), d.id]);
  const holds = (id, seen = new Set()) => { for (const x of heldBy.get(id) ?? []) if (!seen.has(x)) { seen.add(x); holds(x, seen); } return seen; };

  const rows = ds.filter((d) => ACTIONABLE.has(d.render)).map((d) => {
    const held = [...holds(d.id)];
    const value = own.get(d.id).score + held.reduce((s, x) => s + (own.get(x)?.score ?? 0), 0);
    const fn = d.function ?? { id: "venture", title: "Venture" };
    return { id: d.id, question: d.question, function: fn.title, function_id: fn.id, render: d.render, own: own.get(d.id).score, value,
      holds: held, why: [...own.get(d.id).why, ...(held.length ? [`holds ${held.length} decision${held.length > 1 ? "s" : ""}: ${held.join(", ")}`] : [])], action: d.action ?? null };
  });
  const functions = [...new Set(rows.map((x) => x.function_id))].map((id) => {
    const xs = rows.filter((x) => x.function_id === id).sort((a, b) => b.value - a.value || a.id.localeCompare(b.id));
    return { id, function: xs[0].function, attention: Math.round(xs.reduce((s, x, i) => s + x.value / 2 ** i, 0)), decisions: xs };
  // A tie goes to the function that fits the phase better (schema/packages.json, base), not to the alphabet.
  }).sort((a, b) => b.attention - a.attention || (PACKAGES.core[b.id]?.base?.[phase] ?? 0) - (PACKAGES.core[a.id]?.base?.[phase] ?? 0) || a.id.localeCompare(b.id));
  const total = functions.reduce((s, f) => s + f.attention, 0);
  for (const f of functions) {
    f.share = total ? Math.round((f.attention / total) * 100) / 100 : 0;
    for (const d of f.decisions) d.dominant = d.value > total - f.attention && functions.length > 1;
  }
  const top = functions[0];
  return {
    phase, at: new Date(now).toISOString(), total,
    next: top ? { function: top.function, function_id: top.id, decision: top.decisions[0].id, question: top.decisions[0].question, value: top.decisions[0].value,
      dominant: top.decisions[0].dominant, why: top.decisions[0].why, action: top.decisions[0].action } : null,
    functions,
  };
}

// Settles one decision the way a founder would, through the CLI, with its proposed wording.
function settle(ws, venture, d) {
  const cli = (...a) => spawnSync("node", [new URL("../interface/cli/mentura.mjs", import.meta.url).pathname, ...a], { env: { ...process.env, MENTURA_WORKSPACE: ws }, encoding: "utf8" });
  const a = d.action;
  if (!a) return false;
  const p = a.kind === "decide" ? cli("decide", d.id, "--venture", venture, "--by", "Founder (replay)", "--answer", "Settled in the replay", "--confirm", a.confirm)
    : a.kind === "accept" ? cli("accept", a.route, "--venture", venture, "--confirm", a.confirm)
    : a.kind === "confirm" ? cli("confirm", a.statement, "--venture", venture, "--confirm", a.confirm) : null;
  return p?.status === 0;
}

/** The founder's day, replayed on a copy: settle the top decision, recompute, and record which function
 *  leads after each step. A decision only the founder can write (a statement to draft) can't be settled
 *  by a replay, so it is set aside for the rest of the day, as a founder who leaves it for tomorrow would. */
export function replay(dir, steps = 20) {
  const ws = mkdtempSync(join(tmpdir(), "docket-replay-"));
  const venture = basename(dir);
  const copy = join(ws, "ventures", venture);
  mkdirSync(join(ws, "ventures"), { recursive: true });
  cpSync(dir, copy, { recursive: true });
  const skipped = new Set();
  const timeline = [];
  for (let i = 0; i < steps; i++) {
    const k = docket(copy, undefined, { set_aside: skipped });
    const top = k.functions[0];
    if (!top) break;
    const pick = { f: top, d: top.decisions[0] };
    const ok = settle(ws, venture, pick.d);
    timeline.push({ step: i + 1, leading: pick.f.function, attention: Object.fromEntries(k.functions.map((f) => [f.function, f.attention])),
      decision: pick.d.id, value: pick.d.value, dominant: pick.d.dominant, settled: ok });
    if (!ok) skipped.add(pick.d.id);
  }
  const leaders = timeline.filter((t) => t.settled).map((t) => t.leading);
  return { venture, steps: timeline.length, settled: timeline.filter((t) => t.settled).length,
    leader_changes: leaders.filter((l, i) => i && l !== leaders[i - 1]).length, timeline };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node schema/docket.mjs <venture dir> [--json] [--replay [--steps <n>]]"); process.exit(2); }
  const i = process.argv.indexOf("--steps");
  if (process.argv.includes("--replay")) {
    const r = replay(dir, i >= 0 ? Number(process.argv[i + 1]) : 20);
    if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
    else {
      for (const t of r.timeline) console.log(`${String(t.step).padStart(2)}. ${t.leading.padEnd(12)} ${t.decision}${t.dominant ? " (outweighs every other function)" : ""}  value ${t.value}${t.settled ? "" : "  [the founder writes this one: set aside]"}   ${Object.entries(t.attention).map(([f, a]) => `${f} ${a}`).join(" · ")}`);
      console.log(`\n${r.settled} settled; the leading function changed ${r.leader_changes} times`);
    }
  } else {
    const k = docket(dir);
    if (process.argv.includes("--json")) console.log(JSON.stringify(k, null, 2));
    else {
      console.log(`${k.venture} (${k.phase}): next is ${k.next ? `${k.next.decision} in ${k.next.function}${k.next.dominant ? ", which outweighs every other function" : ""}` : "nothing"}`);
      for (const f of k.functions) {
        console.log(`\n${f.function}: attention ${f.attention} (${Math.round(f.share * 100)}%)`);
        for (const d of f.decisions) console.log(`  ${String(d.value).padStart(4)}  ${d.id}${d.dominant ? "  [dominant]" : ""}: ${d.why.join("; ")}`);
      }
    }
  }
}
