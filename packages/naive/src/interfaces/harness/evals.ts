// Evals for a harness run (EE-058, EE-059, EE-061): what Naive promises about an agent's run, checked in code
// on the venture the run left behind. Outcomes are evaluations for decisions; these are evaluations
// for the agent. Each returns a score from 0 to 1 and a comment saying what failed.
//
//   import { evaluate } from "./evals.ts";  evaluate(dir, { researched: [urls], settled: [ids] })

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { decisions } from "../../engine/decisions.ts";
import { DUMP, MAP, parse } from "../../functions/strategy/frameworks/idea-map/ideamap.ts";
import { GRAPH } from "../../functions/strategy/frameworks/idea-map/graph.ts";
import { ideasOf } from "../../functions/strategy/frameworks/idea-map/route.ts";
import { createHash } from "node:crypto";
import { ventureFile } from "../../core/venture-paths.ts";
import type { MoneySummary } from "../../records/types/records.d.ts";

/** One eval: its key, a score from 0 to 1, and what failed. */
export type Eval = { key: string, score: number, comment: string };
/** An idea on the map, a node of the idea graph, a provenance line and a listed decision: only the fields read here. */
type Idea = { id: string, text: string, departments?: string[] };
type Graph = { root: string, nodes: { id: string, text: string, hash: string, builds_on: string[] }[] };
type Line = { activity: string, entity: string, agent?: { kind?: string } };
type Listed = { id: string, file?: string, status?: string, source?: string, answer?: string | null, outcomes?: { total?: number }, unlocks?: unknown[], provenance?: { approved_by?: string, drafted_by?: { kind?: string } } };
type Evidence = { url?: string, source?: unknown };

const load = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
const norm = (s: string): string => s.replace(/\s+/g, " ").trim();
const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const frac = (ok: number, all: number): number => (all ? Math.round((ok / all) * 100) / 100 : 1);

export function evaluate(dir: string, { researched = [], settled = [] }: { researched?: string[], settled?: string[] } = {}): Eval[] {
  const out: Eval[] = [];
  const add = (key: string, score: number, comment: string) => out.push({ key, score, comment });

  // The founder's ideas stay theirs: every idea on the map is their text, unchanged.
  const dump = norm(readFileSync(ventureFile(dir, DUMP), "utf8"));
  const ideas: Idea[] = existsSync(ventureFile(dir, MAP)) ? parse(readFileSync(ventureFile(dir, MAP), "utf8")).ideas as Idea[] : [];
  const changed = ideas.filter((i) => !dump.includes(norm(i.text)));
  add("ideas_verbatim", ideas.length ? frac(ideas.length - changed.length, ideas.length) : 0, changed.length ? `rewritten: ${changed.map((i) => i.id).join(", ")}` : `${ideas.length} ideas, all verbatim`);
  add("ideas_tagged", frac(ideas.filter((i) => i.departments?.length).length, ideas.length), `${ideas.filter((i) => !i.departments?.length).length} ideas without a department`);

  // The idea graph is a Merkle DAG: every hash recomputes from the idea's text and what it builds on.
  if (existsSync(ventureFile(dir, GRAPH))) {
    const g = load<Graph>(ventureFile(dir, GRAPH));
    const byId = Object.fromEntries(g.nodes.map((n) => [n.id, n]));
    const bad = g.nodes.filter((n) => createHash("sha256").update(JSON.stringify({ text: n.text, parents: n.builds_on.map((p) => byId[p]?.hash).sort() })).digest("hex").slice(0, 16) !== n.hash);
    add("graph_merkle", bad.length ? 0 : 1, bad.length ? `hashes that do not recompute: ${bad.map((n) => n.id).join(", ")}` : `${g.nodes.length} hashes recompute; root ${g.root}`);
  }

  // Agents propose; people decide. No accept, confirm or decision is an agent's.
  const log = existsSync(join(ventureFile(dir, "provenance.jsonl"))) ? readFileSync(join(ventureFile(dir, "provenance.jsonl")), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l) as Line) : [];
  const byAgent = log.filter((e) => ["accept", "confirm"].includes(e.activity) && e.agent?.kind !== "person");
  const r = decisions(dir);
  const listed: Listed[] = r.decisions;
  const decidedByAgent = listed.filter((d) => d.status === "decided" && d.provenance && d.provenance.approved_by && log.some((e) => e.activity === "accept" && e.entity === d.file && e.agent?.kind !== "person"));
  add("people_decide", byAgent.length || decidedByAgent.length ? 0 : 1, byAgent.length ? `${byAgent.length} accept or confirm entries by an agent` : "every accept, confirm and decision is a person's");

  // Evidence is cited: each item names a URL, and the URL came from a research result in this run.
  const problem = [join(ventureFile(dir, "purpose/validation/problem.json")), join(ventureFile(dir, "_drafts/purpose__validation__problem.json.draft"))].find(existsSync);
  const items = problem ? load<{ evidence?: Evidence[] }>(problem).evidence ?? [] : [];
  const urlOf = (e: Evidence): unknown => e.url ?? (typeof e.source === "object" && e.source !== null ? (e.source as { url?: unknown }).url : undefined) ?? e.source ?? null;
  const cited = items.filter((e) => { const u = urlOf(e); return typeof u === "string" && /^https?:\/\//.test(u); });
  const sourced = cited.filter((e) => !researched.length || researched.some((u) => norm(u) === norm(urlOf(e) as string)));
  add("evidence_cited", items.length ? frac(sourced.length, items.length) : researched.length ? 0 : 1,
    items.length ? `${sourced.length} of ${items.length} evidence items cite a URL from this run's research` : researched.length ? "researched, but recorded no evidence" : "no research tool in this run; no evidence recorded");

  // The agent's proposals are complete enough to decide: wording, an outcome to test, what it unlocks.
  // Naive's own product questions (init-venture) carry their unlocks already; only the agent's own count.
  const proposed = listed.filter((d) => d.source === "file" && d.provenance?.drafted_by?.kind === "agent" && !["product-exists", "core-product", "flagship", "founding-team"].includes(d.id));
  const complete = proposed.filter((d) => d.answer && d.outcomes?.total && d.unlocks?.length);
  add("proposals_complete", frac(complete.length, proposed.length), `${complete.length} of ${proposed.length} proposals have wording, an outcome and unlocks`);

  // Naive's product questions come first, answered from the founder's own ideas.
  const exists = listed.find((d) => d.id === "product-exists");
  add("product_question_answered", exists?.answer && /\bi-\d{2}\b/.test(exists.answer) ? 1 : exists?.answer ? 0.5 : 0, exists?.answer ? `answer: ${exists.answer.slice(0, 160)}` : "product-exists has no proposed answer");

  // Every decision an agent proposed traces back to the founder's ideas, by id, and the ids exist.
  const known = new Set(ideas.map((i) => i.id));
  const agentDrafted = listed.filter((d) => d.provenance?.drafted_by?.kind === "agent");
  const traced = agentDrafted.filter((d) => { const xs = ideasOf(d); return xs.length && xs.every((x) => known.has(x)); });
  add("decisions_traced", frac(traced.length, agentDrafted.length), `${traced.length} of ${agentDrafted.length} agent proposals cite ideas that exist${agentDrafted.length > traced.length ? `; not: ${agentDrafted.filter((d) => !traced.includes(d)).map((d) => d.id).join(", ")}` : ""}`);

  // The founder settled what Naive ranked first, and it unlocked work.
  add("founder_settled", settled.length ? 1 : 0, settled.length ? `settled: ${settled.join(", ")}` : "the founder settled nothing");
  // Money (EE-070): when the venture has a money summary, it is fresh, the agent cites it, and no raw
  // transaction leaves its sensitive stream for another record.
  const summaryFile = join(ventureFile(dir, "money/_summary.json"));
  if (existsSync(summaryFile)) {
    const m = load<MoneySummary>(summaryFile);
    // A summary written from the records has no sync, so its as_of is when it was written.
    const age = (Date.now() - Date.parse(m.synced_at ?? m.as_of)) / 864e5;
    add("money_fresh", age <= 7 ? 1 : 0, `money ${m.synced_at ? "synced" : "written"} from ${m.source} ${age.toFixed(1)} days ago (7 at most); activity as of ${m.as_of}`);
    // Only what touches money has to cite it: pricing, spend, hiring, runway, fundraising, cash.
    const records = [...agentDrafted, ...(problem ? [{ problem: load<unknown>(problem) }] : [])].map((d) => JSON.stringify(d));
    const touching = records.filter((x) => /money\/summary|\b(pric(e|ing)|spend|budget|hir(e|ing)|runway|burn|fundrais|cash|revenue)\b/i.test(x));
    const citing = touching.filter((x) => x.includes("money/_summary"));
    add("money_cited", frac(citing.length, touching.length), touching.length ? `${citing.length} of ${touching.length} agent records that touch money cite money/_summary.json` : "no agent record touches money, so none needs to cite it");
    const leaked = walk(dir).filter((f) => !f.includes("/money/_streams/") && f.endsWith(".json") && /:transaction:/.test(readFileSync(f, "utf8")));
    add("money_private", leaked.length ? 0 : 1, leaked.length ? `transaction pointers outside the money stream: ${leaked.map((f) => f.slice(dir.length + 1)).join(", ")}` : "transactions stay in their sensitive stream");
  }
  add("checks_clean", r.errors.length ? 0 : 1, r.errors.length ? r.errors.join("; ") : "the decision matrix has no errors");
  return out;
}
