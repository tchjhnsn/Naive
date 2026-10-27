// Product Anatomy Matrix runner, version 0.1.0 (unevaluated).
//
//   node anatomy.mjs request <input.json>                      print the Jev request; sends nothing
//   node anatomy.mjs score   <input.json> <answers.json> --send ask Jev, write the answers file
//   node anatomy.mjs matrix  <input.json> <answers.json>        deduce roles for every phase
//
// Order matters: the input's `core` (promise, who it is made to, what it must
// not deliver, the competence behind it) is fixed first, and every product is
// judged against it. Jev answers the typed questions in questions.json, one per
// product. Spillover comes from the input's `flows`. Must-holds are checked in
// code, never by Jev. Weights live in phases.json, so re-weighting a phase never
// needs re-scoring. Without TYPESAFE_API_KEY, a reasoning model fills the same
// answers file by hand and says so in its `scorer` field.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const MODEL = "jev-latest";
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const { questions } = load(join(here, "questions.json"));
const { phases, must_hold, tie } = load(join(here, "phases.json"));

function request(input) {
  const qs = {};
  for (const pid of Object.keys(input.products)) {
    for (const [qid, q] of Object.entries(questions)) {
      qs[`${qid}:${pid}`] = { ...q, instructions: `About the product in \`products.${pid}\`: ${q.instructions}` };
    }
  }
  return { state: { company: input.company, core: input.core, products: input.products }, model: MODEL, questions: qs };
}

async function score(input, outPath) {
  if (!process.env.TYPESAFE_API_KEY) {
    console.error("No TYPESAFE_API_KEY set: fill the answers file with a reasoning model instead, and name it in `scorer`.");
    process.exit(3);
  }
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TYPESAFE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(request(input)),
  });
  if (!res.ok) throw new Error(`TypeSafe returned ${res.status}: ${await res.text()}`);
  const { answers } = await res.json();
  const out = { scorer: MODEL, scored: new Date().toISOString(), answers: {} };
  for (const [key, a] of Object.entries(answers)) {
    const [qid, pid] = key.split(":");
    out.answers[pid] ??= {};
    out.answers[pid][qid] = a.type === "noul" ? a.noul : a.score;
    out.answers[pid][`${qid}_confidence`] = a.confidence ?? null;
  }
  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`wrote ${outPath} (${Object.keys(answers).length} answers from ${MODEL})`);
}

function norm(qid, v) {
  const q = questions[qid];
  return q.type === "score" ? v / (q.criteria.length - 1) : v;
}

function deduce(input, answersFile) {
  const A = answersFile.answers;
  const pids = Object.keys(input.products);
  const out = Object.fromEntries(pids.map((p) => [p, 0]));
  for (const f of input.flows ?? []) out[f.from] += 1;
  const maxOut = Math.max(1, ...Object.values(out));
  const phaseIndex = Object.fromEntries(phases.map((p, i) => [p.id, i]));
  const now = phaseIndex[input.company.phase];

  // Substrate: the product that is the core competence itself, phase-independent.
  const substrate = pids.filter((p) => A[p].competence_draw >= 2.5)
    .sort((a, b) => A[b].competence_draw - A[a].competence_draw || out[b] - out[a])[0] ?? null;

  const byPhase = phases.map((ph, i) => {
    const allowed = (p) => i >= phaseIndex[input.products[p].allowed_from ?? phases[0].id];
    const rows = pids.map((p) => {
      const w = ph.weights;
      let sum = 0, total = 0;
      for (const [c, wt] of Object.entries(w)) {
        sum += wt * (c === "spillover" ? out[p] / maxOut : norm(c, A[p][c]));
        total += wt;
      }
      const fails = [];
      if (!allowed(p)) fails.push(`not allowed until ${input.products[p].allowed_from}`);
      if (A[p].promise_delivery < must_hold.flagship.promise_delivery_at_least) fails.push("does not deliver the promise directly");
      if (A[p].promise_breach >= must_hold.flagship.promise_breach_below) fails.push("could breach the promise");
      return { p, score: sum / total, fails };
    }).sort((a, b) => b.score - a.score);

    const eligible = rows.filter((r) => !r.fails.length);
    const flagship = eligible[0]?.p ?? null;
    const tied = eligible.filter((r) => r.p !== flagship && eligible[0].score - r.score < tie).map((r) => r.p);
    const topRevenue = Math.max(...pids.filter(allowed).map((p) => A[p].revenue));
    const revenue = pids.filter((p) => allowed(p) && A[p].revenue === topRevenue);
    const role = {};
    for (const p of pids) {
      const r = [];
      if (p === flagship) r.push("flagship");
      if (p === substrate) r.push("substrate");
      if (revenue.includes(p)) r.push(revenue.length > 1 ? "revenue engine (tied)" : "revenue engine");
      if (!r.length) {
        if (!allowed(p)) r.push(`option (allowed from ${input.products[p].allowed_from})`);
        else if ((input.flows ?? []).some((f) => f.from === p && f.to === flagship) && A[p].ready >= 2) r.push("wedge");
        else if (A[p].promise_delivery <= 1 && A[p].competence_draw <= 1) r.push("unassigned: weak tie to the core");
        else r.push("end product");
      }
      role[p] = r.join(" + ");
    }
    return { phase: ph, rows, flagship, tied, role, projection: i > now };
  });

  byPhase.forEach((b, i) => {
    const next = byPhase[i + 1];
    if (next && next.flagship && next.flagship !== b.flagship) b.successor = next.flagship;
  });
  return { substrate, byPhase, out };
}

function report(input, answersFile, d) {
  const name = (p) => input.products[p].name;
  const lines = [`# Product Anatomy Matrix: ${input.company.name}`, "",
    `Scored by: ${answersFile.scorer.replace(/\.$/, "")}. Current phase: ${input.company.phase}. Later phases are projections from today's answers; re-answer at each gate.`, "",
    `Core promise: ${input.core.promise}`, ""];
  lines.push(`| Product | ${phases.map((p) => p.name).join(" | ")} |`, `| --- |${phases.map(() => " --- |").join("")}`);
  for (const p of Object.keys(input.products)) lines.push(`| ${name(p)} | ${d.byPhase.map((b) => b.role[p]).join(" | ")} |`);
  for (const b of d.byPhase) {
    lines.push("", `## ${b.phase.name}${b.projection ? " (projection)" : ""}: ${b.phase.binding_constraint}`, "",
      "| Product | Phase score | Flagship must-holds |", "| --- | ---: | --- |");
    for (const r of b.rows) lines.push(`| ${name(r.p)} | ${r.score.toFixed(2)} | ${r.fails.length ? r.fails.join("; ") : "pass"} |`);
    lines.push("", `Flagship: ${b.flagship ? name(b.flagship) : "none passes the must-holds"}${b.tied.length ? ` (tie within ${tie} with ${b.tied.map(name).join(", ")})` : ""}.${b.successor ? ` Successor: ${name(b.successor)}.` : ""}`);
  }
  return lines.join("\n");
}

const [cmd, inputPath, answersPath] = process.argv.slice(2).filter((a) => a !== "--send");
if (!inputPath) { console.error("usage: node anatomy.mjs request|score|matrix <input.json> [answers.json] [--send]"); process.exit(2); }
const input = load(inputPath);
if (cmd === "request") console.log(JSON.stringify(request(input), null, 2));
else if (cmd === "score") {
  if (!process.argv.includes("--send")) { console.log(JSON.stringify(request(input), null, 2)); console.error("Printed only. Add --send to call TypeSafe."); }
  else await score(input, answersPath);
} else if (cmd === "matrix") {
  const answers = load(answersPath);
  console.log(report(input, answers, deduce(input, answers)));
} else { console.error(`unknown command ${cmd}`); process.exit(2); }
