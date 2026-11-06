#!/usr/bin/env node
// Evidence for the docket (EE-075): scores its next step against venture states where the right next
// step is argued from a cited source (packages/naive/src/records/examples/docket-scenarios.json), and builds the same
// question for an independent judge, so the docket, the judge and the source can be compared.
//
//   node packages/naive/src/engine/docket-eval.mjs [--json]                    the docket against the scenarios
//   node packages/naive/src/engine/docket-eval.mjs request | <judge> > a.json  the judge's request (a Jev client, as NAIVE_JUDGE_CMD names)
//   node packages/naive/src/engine/docket-eval.mjs --answers a.json [--json]   the docket and the judge against the scenarios
//
// Per state: does the docket's next decision match the expected one, and its leading function? For the
// judge, each open decision the founder can act on is one question ("is this the best next step?") and
// the judge's pick is the one it is most sure of. A day scenario is scored at every step, settling the
// expected decision before the next, so a miss early does not cascade.

import { readFileSync } from "node:fs";
import { rankDocket } from "./docket.mjs";

const FILE = new URL("../records/examples/docket-scenarios.json", import.meta.url).pathname;
const NOW = Date.parse("2026-10-29T12:00:00Z");
const TITLE = { foundation: "Foundation", validation: "Validation", product: "Product", marketing: "Marketing and sales", finance: "Finance", people: "People", legal: "Legal and governance", operations: "Operations" };

/** The decisions as decisions.mjs would resolve them, after the given ones are settled. */
function resolve(decisions, settled) {
  const open = decisions.filter((d) => !settled.has(d.id));
  return open.map((d) => {
    const held = d.held_by && !settled.has(d.held_by);
    const render = d.state === "waiting" ? (held ? "waiting" : "now") : d.state;
    return { id: d.id, question: d.question, source: "file", render, ...(held ? { held_by: d.held_by } : {}),
      ...(d.due_in_hours != null ? { due: new Date(NOW + d.due_in_hours * 36e5).toISOString() } : {}),
      ...(d.unlocks?.length ? { unlocks: d.unlocks } : {}), ...(d.foundation ? { part_of: "foundation" } : {}),
      ...(d.drafted ? { awaiting: "approval" } : {}), ...(d.outcomes ? { outcomes: { total: d.outcomes, pending: d.outcomes } } : {}),
      function: { id: d.function, title: TITLE[d.function] ?? d.function } };
  });
}

/** Every moment to score: one per scenario, or one per step of a day. */
export function states(file = FILE) {
  const { scenarios } = JSON.parse(readFileSync(file, "utf8"));
  return scenarios.flatMap((s) => {
    const steps = s.steps ?? [s.expected];
    const settled = new Set();
    return steps.map((exp, i) => {
      const st = { id: steps.length > 1 ? `${s.id}#${i + 1}` : s.id, scenario: s, phase: s.phase, decisions: resolve(s.decisions, settled), expected: exp };
      settled.add(exp.decision);
      return st;
    });
  });
}

const actionable = (st) => st.decisions.filter((d) => ["now", "overdue", "stale"].includes(d.render));

export function request(list = states()) {
  const questions = {};
  for (const st of list) for (const d of actionable(st))
    questions[`next:${st.id}:${d.id}`] = { type: "noul", instructions: `In the venture state \`states.${st.id}\`, is the open decision \`${d.id}\` the single best next step for the founder to settle now, before every other open decision listed there?`,
      criteria: { true: "Yes: this one should come first", false: "No: another listed decision should come first" } };
  const state = Object.fromEntries(list.map((st) => [st.id, { phase: st.phase, situation: st.scenario.situation,
    open: Object.fromEntries(st.decisions.map((d) => [d.id, `${d.question} [${d.function.title}; ${d.render}${d.held_by ? `, waits on ${d.held_by}` : ""}${d.due ? `; due ${d.due}` : ""}]`])) }]));
  return { state: { guidelines: "Each state is a venture at one moment: its phase, its situation, and its open decisions with their function and whether each can be settled now or waits on another. Judge as an experienced startup advisor would.", states: state }, model: "jev-latest", questions };
}

export function score(answers = null, list = states()) {
  const rows = list.map((st) => {
    const k = rankDocket(st.decisions, st.phase, NOW);
    const judge = answers ? actionable(st).map((d) => {
      const a = answers[`next:${st.id}:${d.id}`];
      return { id: d.id, fn: d.function.id, p: typeof a?.noul === "number" ? a.noul : a?.noul === true ? 1 : 0 };
    }).sort((a, b) => b.p - a.p)[0] : null;
    return { state: st.id, expected: st.expected, docket: { decision: k.next?.decision, function: k.next?.function_id, dominant: k.next?.dominant, leading: k.functions.map((f) => `${f.id} ${f.attention}`) },
      ...(judge ? { judge: { decision: judge.id, function: judge.fn, p: Math.round(judge.p * 100) / 100 } } : {}),
      docket_right: k.next?.decision === st.expected.decision, docket_function_right: k.next?.function_id === st.expected.function,
      ...(judge ? { judge_right: judge.id === st.expected.decision, agree: judge.id === k.next?.decision } : {}) };
  });
  const rate = (k) => Math.round((rows.filter((r) => r[k]).length / rows.length) * 100) / 100;
  return { states: rows.length, docket_next: rate("docket_right"), docket_function: rate("docket_function_right"),
    ...(answers ? { judge_next: rate("judge_right"), docket_judge_agree: rate("agree") } : {}), rows };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv[2] === "request") { console.log(JSON.stringify(request())); process.exit(0); }
  const i = process.argv.indexOf("--answers");
  const answers = i >= 0 ? JSON.parse(readFileSync(process.argv[i + 1], "utf8")).answers : null;
  const r = score(answers);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.rows) console.log(`${x.docket_right ? "right" : "MISS "}  ${x.state.padEnd(34)} expected ${x.expected.decision.padEnd(22)} docket ${String(x.docket.decision).padEnd(22)}${x.judge ? ` judge ${x.judge.decision} (${x.judge.p})${x.judge_right ? "" : " MISS"}` : ""}`);
    console.log(`\n${r.states} states: the docket picked the expected next step in ${Math.round(r.docket_next * 100)}% and the expected function in ${Math.round(r.docket_function * 100)}%${answers ? `; the judge picked it in ${Math.round(r.judge_next * 100)}%, and agreed with the docket in ${Math.round(r.docket_judge_agree * 100)}%` : ""}`);
  }
}
