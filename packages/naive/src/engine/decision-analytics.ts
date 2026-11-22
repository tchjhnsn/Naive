#!/usr/bin/env node
// Decision analytics (EE-072): how many decisions of each type each function of the venture has made,
// open against decided, in whose words, in which phase, and what their outcomes were. Like Next.js's
// instrumentation beside Vercel Analytics: the framework counts from the decision records already in
// the venture (EE-054, EE-058); ranking decisions by impact over time is the next view, and is
// listed under `next` rather than computed.
//
//   node packages/naive/src/engine/decision-analytics.ts <venture dir>
//
// Output is data (JSON), never a view: rendering it belongs to the platform, or to a visualization
// skill when Naive runs inside another harness such as Claude Code, Codex or Cursor (Torian, 2026-10-28).
//
// Function: the core package that holds the record a decision decides (EE-069, EE-071); foundation
// statements and decisions about venture.json belong to Foundation; anything else is "Venture".
// Type: the record type or foundation statement it decides (problem, product, mission...), so counts
// answer "which kinds of decision has each function made". A decision record may set `type`.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decisions } from "./decisions.ts";
import { HOME, PACKAGES, TITLES } from "./packages.mjs";
import { ventureFile } from "../core/venture-paths.ts";
import type { DecisionRecord } from "../records/types/records.d.ts";

const load = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const titleOf = (t: string): string => ({ icp: "ICP", "venture-core": "Core product" } as Record<string, string>)[t] ?? (TITLES as Record<string, string>)[t] ?? t.replace(/^validation-/, "").replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
const FUNCTION_OF: Record<string, string> = { ...HOME, "venture-core": "foundation", brand: "marketing" };
const DECIDED = new Set(["decided", "accepted"]);
const OPEN = new Set(["now", "overdue", "waiting", "stale", "later"]);

/** One decision as analytics counts it. */
export type AnalyticsRow = { id: string; question: string; kind: string; type: string; function: string; function_id: string; state: string; render: string; decided_by: string | null; decided_at: string | null; phase: string | null; wording: string | null; outcomes: string[] };

/** Counts over a venture's decisions; nothing is written. */
export function analytics(dir: string, now?: number) {
  const r = decisions(dir, now);
  const rows = r.decisions.filter((d) => d.source !== "root").map((d): AnalyticsRow => {
    // A decision record may set its own type; the schema does not name it.
    const raw: Partial<DecisionRecord> & { type?: string } = d.file ? load(ventureFile(dir, d.file)) : {};
    const record = d.decides?.record ?? null;
    // A foundation statement belongs to the strategic foundation whatever record holds it; so does a
    // decision about venture.json itself (the core product, the team).
    const statement = d.source === "foundation" ? d.id.replace(/^foundation-/, "") : null;
    const fn = statement || d.part_of === "foundation" || d.decides?.path === "venture.json" ? "foundation" : (record !== null ? FUNCTION_OF[record] : undefined) ?? null;
    const state = DECIDED.has(d.status) ? "decided" : OPEN.has(d.render) ? "open" : d.render;
    const pv = d.provenance ?? raw.provenance ?? null;
    return {
      id: d.id, question: d.question, kind: d.source === "draft" ? "acceptance" : d.source === "foundation" ? "foundation statement" : "decision",
      type: raw.type ?? titleOf(statement ?? record ?? d.id), function: fn ? PACKAGES.core[fn].title : "Venture", function_id: fn ?? "venture",
      state, render: d.render, decided_by: pv?.approved_by ?? null, decided_at: pv?.approved_at ?? null, phase: pv?.phase ?? null,
      wording: state === "decided" ? (pv?.wording ?? (pv?.signer === "unverified" ? "unverified" : "unknown")) : null,
      outcomes: (raw.outcomes ?? []).map((o) => o.result ?? "pending"),
    };
  });
  // A key is a property name, so a null key counts under "null", as JavaScript names it.
const count = <T>(xs: T[], key: (x: T) => unknown) => Object.entries(xs.reduce((m: Record<string, number>, x) => ((m[String(key(x))] = (m[String(key(x))] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ key: k, n }));
  const functions = [...new Set(rows.map((x) => x.function))].map((f) => {
    const xs = rows.filter((x) => x.function === f);
    return { function: f, id: xs[0].function_id, total: xs.length, decided: xs.filter((x) => x.state === "decided").length, open: xs.filter((x) => x.state === "open").length,
      types: count(xs, (x) => x.type).map(({ key, n }) => ({ type: key, n, decided: xs.filter((x) => x.type === key && x.state === "decided").length })) };
  }).sort((a, b) => b.total - a.total || a.function.localeCompare(b.function));
  const decided = rows.filter((x) => x.state === "decided");
  const outcomes = rows.flatMap((x) => x.outcomes);
  const days = count(decided.filter((x) => x.decided_at), (x) => (x.decided_at ?? "").slice(0, 10)).sort((a, b) => a.key.localeCompare(b.key));
  return {
    venture: r.venture, phase: r.phase, total: rows.length, decided: decided.length, open: rows.filter((x) => x.state === "open").length,
    functions, types: count(rows, (x) => x.type), kinds: count(rows, (x) => x.kind),
    wording: count(decided, (x) => x.wording), by: count(decided.filter((x) => x.decided_by), (x) => x.decided_by), phases: count(decided.filter((x) => x.phase), (x) => x.phase),
    outcomes: { total: outcomes.length, ...Object.fromEntries(["met", "partly", "missed", "pending"].map((k) => [k, outcomes.filter((o) => o === k).length])) } as { total: number; met: number; partly: number; missed: number; pending: number },
    over_time: days.map(({ key, n }) => ({ day: key, decided: n })),
    decisions: rows,
    next: [
      "Highest-impact decisions over time: a Score of each decision's impact (System 1), combined in code with its recorded outcomes",
      "Projected against actual outcomes, once outcomes are recorded with results",
      "How long decisions survive before they are revisited",
    ],
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node packages/naive/src/engine/decision-analytics.ts <venture dir>"); process.exit(2); }
  console.log(JSON.stringify(analytics(dir), null, 2));
}
