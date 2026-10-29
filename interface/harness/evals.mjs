// Evals for a harness run (EE-058, EE-059, EE-061): what Naive promises about an agent's run, checked in code
// on the venture the run left behind. Outcomes are evaluations for decisions; these are evaluations
// for the agent. Each returns a score from 0 to 1 and a comment saying what failed.
//
//   import { evaluate } from "./evals.mjs";  evaluate(dir, { researched: [urls], settled: [ids] })

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decisions } from "../../schema/decisions.mjs";
import { DUMP, MAP, parse } from "../../purpose/frameworks/idea-map/ideamap.mjs";
import { GRAPH } from "../../purpose/frameworks/idea-map/graph.mjs";
import { ideasOf } from "../../purpose/frameworks/idea-map/route.mjs";
import { createHash } from "node:crypto";
import { ventureFile } from "../../schema/venture-paths.mjs";

const load = (f) => JSON.parse(readFileSync(f, "utf8"));
const norm = (s) => s.replace(/\s+/g, " ").trim();
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const frac = (ok, all) => (all ? Math.round((ok / all) * 100) / 100 : 1);

export function evaluate(dir, { researched = [], settled = [] } = {}) {
  const out = [];
  const add = (key, score, comment) => out.push({ key, score, comment });

  // The founder's ideas stay theirs: every idea on the map is their text, unchanged.
  const dump = norm(readFileSync(ventureFile(dir, DUMP), "utf8"));
  const ideas = existsSync(ventureFile(dir, MAP)) ? parse(readFileSync(ventureFile(dir, MAP), "utf8")).ideas : [];
  const changed = ideas.filter((i) => !dump.includes(norm(i.text)));
  add("ideas_verbatim", ideas.length ? frac(ideas.length - changed.length, ideas.length) : 0, changed.length ? `rewritten: ${changed.map((i) => i.id).join(", ")}` : `${ideas.length} ideas, all verbatim`);
  add("ideas_tagged", frac(ideas.filter((i) => i.departments?.length).length, ideas.length), `${ideas.filter((i) => !i.departments?.length).length} ideas without a department`);

  // The idea graph is a Merkle DAG: every hash recomputes from the idea's text and what it builds on.
  if (existsSync(ventureFile(dir, GRAPH))) {
    const g = load(ventureFile(dir, GRAPH));
    const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
    const bad = g.nodes.filter((n) => createHash("sha256").update(JSON.stringify({ text: n.text, parents: n.builds_on.map((p) => byId[p]?.hash).sort() })).digest("hex").slice(0, 16) !== n.hash);
    add("graph_merkle", bad.length ? 0 : 1, bad.length ? `hashes that do not recompute: ${bad.map((n) => n.id).join(", ")}` : `${g.nodes.length} hashes recompute; root ${g.root}`);
  }

  // Agents propose; people decide. No accept, confirm or decision is an agent's.
  const log = existsSync(join(ventureFile(dir, "provenance.jsonl"))) ? readFileSync(join(ventureFile(dir, "provenance.jsonl")), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const byAgent = log.filter((e) => ["accept", "confirm"].includes(e.activity) && e.agent?.kind !== "person");
  const r = decisions(dir);
  const decidedByAgent = r.decisions.filter((d) => d.status === "decided" && d.provenance && d.provenance.approved_by && log.some((e) => e.activity === "accept" && e.entity === d.file && e.agent?.kind !== "person"));
  add("people_decide", byAgent.length || decidedByAgent.length ? 0 : 1, byAgent.length ? `${byAgent.length} accept or confirm entries by an agent` : "every accept, confirm and decision is a person's");

  // Evidence is cited: each item names a URL, and the URL came from a research result in this run.
  const problem = [join(ventureFile(dir, "purpose/validation/problem.json")), join(ventureFile(dir, "_drafts/purpose__validation__problem.json.draft"))].find(existsSync);
  const items = problem ? load(problem).evidence ?? [] : [];
  const urlOf = (e) => e.url ?? e.source?.url ?? e.source ?? null;
  const cited = items.filter((e) => typeof urlOf(e) === "string" && /^https?:\/\//.test(urlOf(e)));
  const sourced = cited.filter((e) => !researched.length || researched.some((u) => norm(u) === norm(urlOf(e))));
  add("evidence_cited", items.length ? frac(sourced.length, items.length) : researched.length ? 0 : 1,
    items.length ? `${sourced.length} of ${items.length} evidence items cite a URL from this run's research` : researched.length ? "researched, but recorded no evidence" : "no research tool in this run; no evidence recorded");

  // The agent's proposals are complete enough to decide: wording, an outcome to test, what it unlocks.
  // Naive's own product questions (init-venture) carry their unlocks already; only the agent's own count.
  const proposed = r.decisions.filter((d) => d.source === "file" && d.provenance?.drafted_by?.kind === "agent" && !["product-exists", "core-product", "flagship", "founding-team"].includes(d.id));
  const complete = proposed.filter((d) => d.answer && d.outcomes?.total && d.unlocks?.length);
  add("proposals_complete", frac(complete.length, proposed.length), `${complete.length} of ${proposed.length} proposals have wording, an outcome and unlocks`);

  // Naive's product questions come first, answered from the founder's own ideas.
  const exists = r.decisions.find((d) => d.id === "product-exists");
  add("product_question_answered", exists?.answer && /\bi-\d{2}\b/.test(exists.answer) ? 1 : exists?.answer ? 0.5 : 0, exists?.answer ? `answer: ${exists.answer.slice(0, 160)}` : "product-exists has no proposed answer");

  // Every decision an agent proposed traces back to the founder's ideas, by id, and the ids exist.
  const known = new Set(ideas.map((i) => i.id));
  const agentDrafted = r.decisions.filter((d) => d.provenance?.drafted_by?.kind === "agent");
  const traced = agentDrafted.filter((d) => { const xs = ideasOf(d); return xs.length && xs.every((x) => known.has(x)); });
  add("decisions_traced", frac(traced.length, agentDrafted.length), `${traced.length} of ${agentDrafted.length} agent proposals cite ideas that exist${agentDrafted.length > traced.length ? `; not: ${agentDrafted.filter((d) => !traced.includes(d)).map((d) => d.id).join(", ")}` : ""}`);

  // The founder settled what Naive ranked first, and it unlocked work.
  add("founder_settled", settled.length ? 1 : 0, settled.length ? `settled: ${settled.join(", ")}` : "the founder settled nothing");
  // Money (EE-070): when the venture has a money summary, it is fresh, the agent cites it, and no raw
  // transaction leaves its sensitive stream for another record.
  const summaryFile = join(ventureFile(dir, "money/_summary.json"));
  if (existsSync(summaryFile)) {
    const m = load(summaryFile);
    const age = (Date.now() - Date.parse(m.synced_at)) / 864e5;
    add("money_fresh", age <= 7 ? 1 : 0, `money synced from ${m.source} ${age.toFixed(1)} days ago (7 at most); activity as of ${m.as_of}`);
    // Only what touches money has to cite it: pricing, spend, hiring, runway, fundraising, cash.
    const records = [...agentDrafted, ...(problem ? [{ problem: load(problem) }] : [])].map((d) => JSON.stringify(d));
    const touching = records.filter((x) => /money\/summary|\b(pric(e|ing)|spend|budget|hir(e|ing)|runway|burn|fundrais|cash|revenue)\b/i.test(x));
    const citing = touching.filter((x) => x.includes("money/_summary"));
    add("money_cited", frac(citing.length, touching.length), touching.length ? `${citing.length} of ${touching.length} agent records that touch money cite money/_summary.json` : "no agent record touches money, so none needs to cite it");
    const leaked = walk(dir).filter((f) => !f.includes("/money/_streams/") && f.endsWith(".json") && /:transaction:/.test(readFileSync(f, "utf8")));
    add("money_private", leaked.length ? 0 : 1, leaked.length ? `transaction pointers outside the money stream: ${leaked.map((f) => f.slice(dir.length + 1)).join(", ")}` : "transactions stay in their sensitive stream");
  }
  add("checks_clean", r.errors.length ? 0 : 1, r.errors.length ? r.errors.join("; ") : "the decision matrix has no errors");
  return out;
}
