#!/usr/bin/env node
// Idea routes (EE-061): the step after the idea graph in the pipeline dump -> map -> graph -> routes.
// The dump's payoff is seeing the ideas on one canvas; the graph's is seeing structure on them. The
// routes' payoff is next steps: each tagged idea goes to the records it feeds (the framework's
// destinations, purpose/frameworks/idea-map/conventions.json `records`), and each destination shows
// where it stands in the framework and the one step that moves it. Nothing here is invented: a
// destination's stage and next step come from the decision matrix (packages/naive/src/engine/decisions.mjs), the records
// on disk and the graph. Read as two Kanban boards:
//   - destinations, by stage: routed (ideas, nothing drafted yet), drafted (an agent's draft awaits the
//     founder), yours (a decision only a person can make), waiting (held by another decision), done;
//   - the decision docket, the same stages for every open decision, each traced to the ideas it comes
//     from (a decision record's `ideas`, or the i-NN ids its question and answer cite).
// A destination moves in order (sync) when it sits on the fail-closed path or its ideas share a lane
// that builds in order; it moves on its own (async) when its decisions fail open or its ideas stand alone.
// Each destination names its home package (packages/naive/src/engine/packages.json), and the routes say whether the
// founder has confirmed the understanding of their ideas yet: routing follows that gate (EE-069).
//
//   node route.mjs <venture> [--json]

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { decisions } from "../../../packages/naive/src/engine/decisions.mjs";
import { CONVENTIONS, MAP, parse } from "./ideamap.mjs";
import { GRAPH, ORDER } from "./graph.mjs";
import { confirmedIn } from "../../../packages/naive/src/engine/foundation.mjs";
import { loadPackages } from "../../../packages/naive/src/engine/load-packages.mjs";
import { ventureFile } from "../../../packages/naive/src/core/venture-paths.mjs";
import { readDataModel } from "../../../packages/naive/src/records/index.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const MODEL = readDataModel().records;

// Each destination's home package (EE-069, EE-071), so routing shows the packages taking shape.
const PKG = loadPackages(join(here, "../../.."));
const HOME = { "venture-core": "foundation", brand: "marketing", ...Object.fromEntries(Object.entries(PKG.core).flatMap(([id, p]) => [...p.required, ...p.optional].map((r) => [r, id]))) };

/** Understand is a gate (EE-069): the founder confirms Mentura read the ideas right, after any
 *  corrections, before they are routed. A person's confirm of the map after its last agent write. */
export function understood(dir) {
  return existsSync(ventureFile(dir, MAP)) && confirmedIn(dir, MAP, "ideas");
}

export const STAGES = [["routed", "Routed"], ["drafted", "Drafted"], ["yours", "Your decision"], ["waiting", "Waiting"], ["done", "Done"]];

/** A decision's Kanban stage: what a person or an agent does next to move it. */
export function stageOf(d) {
  if (["done", "withdrawn"].includes(d.render)) return "done";
  if (["waiting", "later", "deferred"].includes(d.render)) return "waiting";
  if (d.action?.kind === "write") return "routed";
  if (d.awaiting || ["accept", "confirm"].includes(d.action?.kind)) return "drafted";
  return "yours";
}

/** The ideas a decision comes from: its own `ideas`, then the ids its question and answer cite. */
export function ideasOf(d) {
  return [...new Set([...(d.ideas ?? []), ...(`${d.question ?? ""} ${d.answer ?? ""}`.match(/\bi-\d{2,}\b/g) ?? [])])];
}

// Whether the record a destination writes is on disk (outside _drafts/).
function written(dir, key) {
  const m = MODEL.find((r) => r.id === key);
  const rel = m?.paths?.[0]?.replace(/^instance\/\*\*\//, "");
  if (!rel) return null;
  if (rel.includes("*")) { const d = join(dir, dirname(rel)); return existsSync(d) && readdirSync(d).some((f) => f.endsWith(".json")); }
  return existsSync(ventureFile(dir, rel));
}

/** @param {string} dir @param {{ now?: string | Date }} [opts] */
export function route(dir, { now } = {}) {
  const venture = load(join(dir, "venture.json"));
  const g = existsSync(ventureFile(dir, GRAPH)) ? load(ventureFile(dir, GRAPH)) : null;
  const nodes = g?.nodes ?? (existsSync(ventureFile(dir, MAP)) ? parse(readFileSync(ventureFile(dir, MAP), "utf8")).ideas.map((i) => ({ ...i, signal: null, lane: null })) : []);
  if (!nodes.length) return { venture: venture.id, phase: venture.phase, waiting: "no idea map yet: map the idea dump first (purpose/ideas)" };
  const lanes = new Map((g?.lanes ?? []).map((l) => [l.id, l]));
  const m = decisions(dir, now);
  const ds = m.decisions.filter((d) => d.source !== "root");
  const byId = new Map(ds.map((d) => [d.id, d]));
  const short = (i) => ({ id: i.id, text: i.text, signal: i.signal, lane: i.lane });

  const destinations = [];
  for (const [key, c] of Object.entries(CONVENTIONS.records)) {
    const ideas = nodes.filter((n) => n.records?.includes(key)).sort((a, b) => (b.signal ?? 0) - (a.signal ?? 0));
    const related = ds.filter((d) => c.decisions?.includes(d.id) || (["file", "draft"].includes(d.source) && d.decides?.record === key));
    const open = related.filter((d) => stageOf(d) !== "done");
    const ranked = open.filter((d) => d.rank != null).sort((a, b) => b.rank - a.rank);
    const isWritten = c.route.includes("venture.json") ? related.length > 0 && !open.length : written(dir, key);
    if (!ideas.length && !related.length) continue;
    // The step that moves it: the top-ranked decision a person can settle now; else what holds it;
    // else, with ideas and nothing drafted, an agent's draft from those ideas.
    const top = ranked.find((d) => stageOf(d) !== "routed") ?? null;
    const held = !top && open.find((d) => stageOf(d) === "waiting");
    const ids = ideas.slice(0, 4).map((i) => i.id);
    let stage, next;
    if (top) { stage = stageOf(top); next = { by: "founder", decision: top.id, do: top.question, command: top.action?.command }; }
    else if (held) { const h = byId.get(held.held_by); stage = "waiting"; next = { by: null, decision: held.id, do: h ? `Waits on ${h.id}: ${h.question}` : `Waits until the ${held.needed_in ?? "next"} phase` }; }
    else if (isWritten && !open.length) { stage = "done"; next = null; }
    else if (ideas.length) { stage = "routed"; const inVenture = c.route.includes("venture.json");
      next = { by: "agent", do: `Draft ${(c.title ?? key).toLowerCase()} (${inVenture ? `the ${c.route.split(" ")[1]} statement in venture.json` : c.route}) from ${ids.join(", ")}; the draft waits for the founder to accept`, route: inVenture ? null : c.route }; }
    else { stage = stageOf(ranked[0] ?? open[0]); next = { by: "founder", decision: (ranked[0] ?? open[0]).id, do: (ranked[0] ?? open[0]).question, command: (ranked[0] ?? open[0]).action?.command }; }
    const ideaLanes = [...new Set(ideas.map((i) => i.lane).filter(Boolean))].map((l) => lanes.get(l)).filter(Boolean);
    const failOpen = related.length && related.every((d) => d.boundary === "fail-open");
    const lane = failOpen || (ideaLanes.length && ideaLanes.every((l) => l.mode === "async")) ? "async" : "sync";
    destinations.push({ id: key, title: c.title ?? key, route: c.route, stage, lane, order: lane === "sync" ? ORDER.indexOf(key) + 1 : null,
      signal: ideas.length && ideas[0].signal != null ? ideas[0].signal : null, ideas: ideas.map(short), decisions: related.map((d) => ({ id: d.id, stage: stageOf(d) })), next });
  }
  destinations.sort((a, b) => (b.signal ?? -1) - (a.signal ?? -1) || (a.order ?? 99) - (b.order ?? 99));

  // The docket: every decision in a stage, traced to its ideas, or else to its destination's ideas.
  const destOf = new Map(destinations.flatMap((x) => x.decisions.map((d) => [d.id, x])));
  const docket = ds.map((d) => {
    const own = ideasOf(d), dest = destOf.get(d.id);
    return { id: d.id, question: d.question, stage: stageOf(d), render: d.render, rank: d.rank ?? null, lane: d.lane, boundary: d.boundary, destination: dest?.id ?? null,
      ideas: own.length ? own : (dest?.ideas ?? []).slice(0, 3).map((i) => i.id), cited: own.length > 0, ...(d.awaiting ? { awaiting: d.awaiting } : {}),
      ...(d.held_by ? { held_by: d.held_by } : {}), ...(d.action ? { action: d.action } : {}), ...(d.answer ? { answer: d.answer } : {}) };
  });

  const routed = new Set(destinations.flatMap((x) => x.ideas.map((i) => i.id)));
  return { venture: venture.id, name: venture.name, phase: venture.phase, graph: g?.root ?? null, understood: understood(dir), stages: STAGES,
    destinations: destinations.map((d) => ({ ...d, package: HOME[d.id] ?? null })),
    loose: nodes.filter((n) => !routed.has(n.id)).map(short),
    gaps: Object.entries(CONVENTIONS.records).filter(([k]) => !destinations.some((x) => x.id === k)).map(([k, c]) => ({ id: k, title: c.title ?? k, about: c.about })),
    docket, counts: Object.fromEntries(STAGES.map(([s]) => [s, destinations.filter((x) => x.stage === s).length])) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node route.mjs <venture> [--json]"); process.exit(2); }
  const r = route(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else if (r.waiting) console.log(r.waiting);
  else {
    for (const [s, label] of STAGES) {
      const xs = r.destinations.filter((x) => x.stage === s);
      if (!xs.length) continue;
      console.log(`${label}:`);
      for (const x of xs) console.log(`  ${x.title.padEnd(18)} ${x.lane === "sync" ? `in order #${x.order}` : "on its own"}  ${x.ideas.map((i) => i.id).join(" ")}${x.next ? `\n    next (${x.next.by ?? "nobody yet"}): ${x.next.do}` : ""}`);
    }
    if (r.loose.length) console.log(`Loose, on the map only: ${r.loose.map((i) => i.id).join(", ")}`);
    if (r.gaps.length) console.log(`Nothing in the dump feeds: ${r.gaps.map((x) => x.title).join(", ")}`);
  }
}
