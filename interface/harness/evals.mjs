// Evals for a harness run (EE-058, EE-059): what Naive promises about an agent's run, checked in code
// on the venture the run left behind. Outcomes are evaluations for decisions; these are evaluations
// for the agent. Each returns a score from 0 to 1 and a comment saying what failed.
//
//   import { evaluate } from "./evals.mjs";  evaluate(dir, { researched: [urls], settled: [ids] })

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decisions } from "../../schema/decisions.mjs";
import { DUMP, MAP, parse } from "../../purpose/frameworks/idea-map/ideamap.mjs";
import { GRAPH } from "../../purpose/frameworks/idea-map/graph.mjs";
import { createHash } from "node:crypto";

const load = (f) => JSON.parse(readFileSync(f, "utf8"));
const norm = (s) => s.replace(/\s+/g, " ").trim();
const frac = (ok, all) => (all ? Math.round((ok / all) * 100) / 100 : 1);

export function evaluate(dir, { researched = [], settled = [] } = {}) {
  const out = [];
  const add = (key, score, comment) => out.push({ key, score, comment });

  // The founder's ideas stay theirs: every idea on the map is their text, unchanged.
  const dump = norm(readFileSync(join(dir, DUMP), "utf8"));
  const ideas = existsSync(join(dir, MAP)) ? parse(readFileSync(join(dir, MAP), "utf8")).ideas : [];
  const changed = ideas.filter((i) => !dump.includes(norm(i.text)));
  add("ideas_verbatim", ideas.length ? frac(ideas.length - changed.length, ideas.length) : 0, changed.length ? `rewritten: ${changed.map((i) => i.id).join(", ")}` : `${ideas.length} ideas, all verbatim`);
  add("ideas_tagged", frac(ideas.filter((i) => i.departments?.length).length, ideas.length), `${ideas.filter((i) => !i.departments?.length).length} ideas without a department`);

  // The idea graph is a Merkle DAG: every hash recomputes from the idea's text and what it builds on.
  if (existsSync(join(dir, GRAPH))) {
    const g = load(join(dir, GRAPH));
    const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
    const bad = g.nodes.filter((n) => createHash("sha256").update(JSON.stringify({ text: n.text, parents: n.builds_on.map((p) => byId[p]?.hash).sort() })).digest("hex").slice(0, 16) !== n.hash);
    add("graph_merkle", bad.length ? 0 : 1, bad.length ? `hashes that do not recompute: ${bad.map((n) => n.id).join(", ")}` : `${g.nodes.length} hashes recompute; root ${g.root}`);
  }

  // Agents propose; people decide. No accept, confirm or decision is an agent's.
  const log = existsSync(join(dir, "provenance.jsonl")) ? readFileSync(join(dir, "provenance.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];
  const byAgent = log.filter((e) => ["accept", "confirm"].includes(e.activity) && e.agent?.kind !== "person");
  const r = decisions(dir);
  const decidedByAgent = r.decisions.filter((d) => d.status === "decided" && d.provenance && d.provenance.approved_by && log.some((e) => e.activity === "accept" && e.entity === d.file && e.agent?.kind !== "person"));
  add("people_decide", byAgent.length || decidedByAgent.length ? 0 : 1, byAgent.length ? `${byAgent.length} accept or confirm entries by an agent` : "every accept, confirm and decision is a person's");

  // Evidence is cited: each item names a URL, and the URL came from a research result in this run.
  const problem = [join(dir, "purpose/validation/problem.json"), join(dir, "_drafts/purpose__validation__problem.json.draft")].find(existsSync);
  const items = problem ? load(problem).evidence ?? [] : [];
  const urlOf = (e) => e.url ?? e.source?.url ?? e.source ?? null;
  const cited = items.filter((e) => typeof urlOf(e) === "string" && /^https?:\/\//.test(urlOf(e)));
  const sourced = cited.filter((e) => !researched.length || researched.some((u) => norm(u) === norm(urlOf(e))));
  add("evidence_cited", items.length ? frac(sourced.length, items.length) : researched.length ? 0 : 1,
    items.length ? `${sourced.length} of ${items.length} evidence items cite a URL from this run's research` : researched.length ? "researched, but recorded no evidence" : "no research tool in this run; no evidence recorded");

  // The agent's proposals are complete enough to decide: wording, an outcome to test, what it unlocks.
  // Naive's own product questions (init-venture) carry their unlocks already; only the agent's own count.
  const proposed = r.decisions.filter((d) => d.source === "file" && d.provenance?.drafted_by?.kind === "agent" && !["product-exists", "core-product", "flagship"].includes(d.id));
  const complete = proposed.filter((d) => d.answer && d.outcomes?.total && d.unlocks?.length);
  add("proposals_complete", frac(complete.length, proposed.length), `${complete.length} of ${proposed.length} proposals have wording, an outcome and unlocks`);

  // Naive's product questions come first, answered from the founder's own ideas.
  const exists = r.decisions.find((d) => d.id === "product-exists");
  add("product_question_answered", exists?.answer && /\bi-\d{2}\b/.test(exists.answer) ? 1 : exists?.answer ? 0.5 : 0, exists?.answer ? `answer: ${exists.answer.slice(0, 160)}` : "product-exists has no proposed answer");

  // The founder settled what Naive ranked first, and it unlocked work.
  add("founder_settled", settled.length ? 1 : 0, settled.length ? `settled: ${settled.join(", ")}` : "the founder settled nothing");
  add("checks_clean", r.errors.length ? 0 : 1, r.errors.length ? r.errors.join("; ") : "the decision matrix has no errors");
  return out;
}
