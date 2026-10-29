#!/usr/bin/env node
// The idea graph (EE-060): the step after the idea map in the pipeline dump -> map -> graph -> roadmap.
// The dump and the map stay loose; the graph is the first structured form. It is a Merkle DAG: an
// idea builds on the ideas that must be worked out before it, and its id is a hash of its text and
// the hashes of those ideas, so a change upstream changes every id downstream, as in git. The graph
// has no decisions in it; decisions come later, from what it shows.
//
// From the graph:
//   - signal: how much each idea is worth developing next (graph.json `signal`, version 0.x, ours and
//     unevaluated): what the venture's phase needs of the records it feeds, how much builds on it,
//     how concrete it is, and how much of the dump circles it;
//   - lanes: ideas tied by dependencies form one lane and move in order (synchronous); a lane with no
//     tie to another moves on its own (asynchronous) and can run beside it;
//   - layout: left to right by dependency depth, lanes and ideas top down by signal.
//
// Dependencies come from Jev (one typed question per ordered pair of ideas) when the platform hands
// over its answers; otherwise from Naive's convention of which records build on which.
//
//   node graph.mjs request <venture>                  the Jev request (pairs and concreteness)
//   node graph.mjs build <venture> [<answers.json>]   writes purpose/ideas/graph.json
//   node graph.mjs <venture> [--json]                  summary of the graph

import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CONVENTIONS, MAP, parse } from "./ideamap.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../../..");
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const GRAPH = "purpose/ideas/graph.json";
const NEED = load(join(repo, "schema/need-now.json")).records;

// Naive's convention of which records build on which, used when no judge has answered. An idea that
// feeds a later record builds on an idea that feeds an earlier one in the same department.
export const ORDER = ["telos", "validation-problem", "icp", "venture-core", "validation-solution", "product", "validation-pricing", "validation-go-to-market", "brand", "validation-team", "alignment"];
const EXTRA_NEED = { "venture-core": { discovery: 0.8, validation: 0.9, beachhead: 0.9, scale: 0.9, platform: 0.9 }, brand: { discovery: 0.2, validation: 0.4, beachhead: 0.7, scale: 0.8, platform: 0.8 } };
export const WEIGHTS = { need: 0.35, unblocks: 0.25, concrete: 0.25, emphasis: 0.15 };
// Jev answers dependency questions conservatively (in our first runs few pairs passed 0.75), so the bar is 0.5.
const THRESHOLD = 0.5;

const CONCRETE = ["A wish or a theme: nothing anyone could act on yet", "A direction: it names what, but not how or for whom", "A plan: someone could start on it with a few questions answered", "Actionable now: someone could act on it this week as written"];

/** The Jev request: for each ordered pair, whether one idea must be worked out first; and how concrete each is. */
export function request(ideas, venture = {}) {
  const questions = {};
  for (const a of ideas) for (const b of ideas) if (a.id !== b.id)
    questions[`dep:${a.id}>${b.id}`] = { type: "noul", instructions: `Does developing the idea in \`ideas.${b.id}\` depend on the idea in \`ideas.${a.id}\` being worked out first (it builds on it, needs its answer, or makes no sense without it)?`,
      criteria: { true: "Yes: it builds directly on that idea", false: "No: it could be developed without it" } };
  for (const i of ideas) questions[`concrete:${i.id}`] = { type: "score", instructions: `How concrete is the idea in \`ideas.${i.id}\`?`, criteria: CONCRETE };
  return { state: { venture: { id: venture.id, phase: venture.phase }, guidelines: CONVENTIONS.guidelines.graph, ideas: Object.fromEntries(ideas.map((i) => [i.id, i.section ? `[${i.section}] ${i.text}` : i.text])) }, model: "jev-latest", questions };
}

/** Dependencies by convention: b builds on a when a feeds an earlier record and they share a department. */
export function conventionEdges(ideas) {
  const rank = (i) => Math.min(...(i.records ?? []).map((r) => ORDER.indexOf(r)).filter((x) => x >= 0), 99);
  const edges = [];
  for (const a of ideas) for (const b of ideas) {
    if (a.id === b.id || rank(a) >= rank(b) || rank(a) === 99) continue;
    if ((a.departments ?? []).some((d) => (b.departments ?? []).includes(d))) edges.push({ from: a.id, to: b.id, p: 0.8, by: "convention" });
  }
  return edges;
}

// Keeps the graph a DAG: edges are added strongest first, and one that would close a cycle is dropped.
function acyclic(ids, edges) {
  const out = new Map(ids.map((i) => [i, new Set()]));
  const reaches = (from, to) => { const seen = new Set(), stack = [from]; while (stack.length) { const x = stack.pop(); if (x === to) return true; if (seen.has(x)) continue; seen.add(x); stack.push(...out.get(x)); } return false; };
  const kept = [], dropped = [];
  for (const e of [...edges].sort((a, b) => b.p - a.p)) {
    if (reaches(e.to, e.from)) { dropped.push(e); continue; }
    out.get(e.from).add(e.to); kept.push(e);
  }
  // Transitive reduction: a -> c goes when a -> b -> c already says it.
  const reduced = kept.filter((e) => ![...out.get(e.from)].some((m) => m !== e.to && reaches(m, e.to)));
  return { edges: reduced, dropped };
}

const sha = (s) => createHash("sha256").update(s).digest("hex");

/** The Merkle DAG with signal, lanes and layout. */
export function build(ideas, { answers = null, phase = "discovery", venture, source } = {}) {
  const ids = ideas.map((i) => i.id);
  let raw = [], concrete = {};
  if (answers) {
    for (const [k, a] of Object.entries(answers)) {
      if (k.startsWith("dep:")) { const [from, to] = k.slice(4).split(">"); const p = typeof a.noul === "number" ? a.noul : a.noul === true ? 1 : 0; if (p >= THRESHOLD) raw.push({ from, to, p: Math.round(p * 100) / 100, by: "jev" }); }
      else if (k.startsWith("concrete:")) concrete[k.slice(9)] = typeof a.score === "number" ? a.score / (CONCRETE.length - 1) : null;
    }
  } else raw = conventionEdges(ideas);
  const { edges, dropped } = acyclic(ids, raw);
  const parents = new Map(ids.map((i) => [i, edges.filter((e) => e.to === i).map((e) => e.from)]));
  const children = new Map(ids.map((i) => [i, edges.filter((e) => e.from === i).map((e) => e.to)]));

  // Topological order, depth (longest path from a root) and Merkle hashes.
  const order = [], depth = {}, hash = {};
  const indeg = new Map(ids.map((i) => [i, parents.get(i).length]));
  const queue = ids.filter((i) => !indeg.get(i));
  while (queue.length) { const x = queue.shift(); order.push(x); for (const c of children.get(x)) { indeg.set(c, indeg.get(c) - 1); if (!indeg.get(c)) queue.push(c); } }
  const byId = Object.fromEntries(ideas.map((i) => [i.id, i]));
  for (const x of order) {
    depth[x] = Math.max(-1, ...parents.get(x).map((p) => depth[p])) + 1;
    hash[x] = sha(JSON.stringify({ text: byId[x].text, parents: parents.get(x).map((p) => hash[p]).sort() })).slice(0, 16);
  }
  const descendants = (x, seen = new Set()) => { for (const c of children.get(x)) if (!seen.has(c)) { seen.add(c); descendants(c, seen); } return seen; };

  // Signal (version 0.x): need of the records it feeds in this phase, what builds on it, how concrete
  // it is, and how much of the dump shares its department.
  const need = (r) => (NEED[r]?.base ?? EXTRA_NEED[r])?.[phase] ?? 0;
  const deptCount = {};
  for (const i of ideas) for (const d of i.departments ?? []) deptCount[d] = (deptCount[d] ?? 0) + 1;
  const maxDesc = Math.max(1, ...ids.map((x) => descendants(x).size));
  const maxDept = Math.max(1, ...Object.values(deptCount));
  const nodes = ids.map((x) => {
    const i = byId[x];
    const parts = {
      need: Math.max(0, ...(i.records ?? []).map(need)),
      unblocks: descendants(x).size / maxDesc,
      concrete: concrete[x] ?? (i.exists ? 1 : 0.5),
      emphasis: Math.max(0, ...(i.departments ?? []).map((d) => deptCount[d] / maxDept)),
    };
    const signal = Object.entries(WEIGHTS).reduce((s, [k, w]) => s + w * parts[k], 0);
    return { id: x, hash: hash[x], text: i.text, ...(i.section ? { section: i.section } : {}), pillar: i.pillar, departments: i.departments ?? [], records: i.records ?? [], exists: !!i.exists,
      depth: depth[x], builds_on: parents.get(x), signal: Math.round(signal * 100) / 100, parts: Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, Math.round(v * 100) / 100])) };
  });

  // Lanes: the weakly connected parts of the DAG. A lane with dependencies is synchronous inside; lanes
  // are asynchronous to each other. Lanes and their ideas are ordered by signal.
  const lane = {}, lanes = [];
  for (const x of ids) {
    if (lane[x] !== undefined) continue;
    const members = [], stack = [x];
    while (stack.length) { const y = stack.pop(); if (lane[y] !== undefined) continue; lane[y] = lanes.length; members.push(y); stack.push(...parents.get(y), ...children.get(y)); }
    lanes.push(members);
  }
  const nodeOf = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const top = (ms) => Math.max(...ms.map((m) => nodeOf[m].signal));
  const ranked = lanes.map((ms) => ms.sort((a, b) => nodeOf[a].depth - nodeOf[b].depth || nodeOf[b].signal - nodeOf[a].signal)).sort((a, b) => top(b) - top(a) || b.length - a.length);
  const laneOut = ranked.map((ms, k) => {
    const depts = {}; for (const m of ms) for (const d of nodeOf[m].departments.slice(0, 1)) depts[d] = (depts[d] ?? 0) + 1;
    const id = `lane-${k + 1}`;
    for (const m of ms) nodeOf[m].lane = id;
    return { id, mode: ms.length > 1 ? "sync" : "async", ideas: ms, department: Object.entries(depts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null, signal: top(ms),
      why: ms.length > 1 ? `${ms.length} ideas that build on each other: they move in order` : "stands alone: it can move on its own, beside the other lanes" };
  });
  const sinks = nodes.filter((n) => !children.get(n.id).length).map((n) => n.hash).sort();
  return {
    version: "0.1.0", venture, phase, created: new Date().toISOString().replace(/\.\d+Z$/, "Z"), source,
    root: sha(sinks.join("")).slice(0, 16), judged_by: answers ? "jev" : "convention", weights: WEIGHTS,
    nodes: nodes.sort((a, b) => b.signal - a.signal), edges, dropped, lanes: laneOut,
    next: nodes.filter((n) => n.depth === 0).sort((a, b) => b.signal - a.signal).slice(0, 3).map((n) => n.id),
  };
}

/** Which ideas changed between two graphs: a changed hash means the idea or something it builds on changed. */
export function diff(a, b) {
  const A = new Map(a.nodes.map((n) => [n.id, n.hash])), B = new Map(b.nodes.map((n) => [n.id, n.hash]));
  return { changed: [...B].filter(([id, h]) => A.has(id) && A.get(id) !== h).map(([id]) => id), added: [...B.keys()].filter((id) => !A.has(id)), removed: [...A.keys()].filter((id) => !B.has(id)) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [a, b, c] = process.argv.slice(2);
  const venture = (d) => load(join(d, "venture.json"));
  const mapOf = (d) => parse(readFileSync(join(d, MAP), "utf8"));
  if (a === "request") console.log(JSON.stringify(request(mapOf(b).ideas, venture(b))));
  else if (a === "build") {
    const answers = c ? (load(c).answers ?? load(c)) : null;
    const g = build(mapOf(b).ideas, { answers, phase: venture(b).phase, venture: venture(b).id, source: `${MAP}@${sha(readFileSync(join(b, MAP), "utf8")).slice(0, 16)}` });
    writeFileSync(join(b, GRAPH), JSON.stringify(g, null, 2) + "\n");
    console.log(`wrote ${GRAPH}: ${g.nodes.length} ideas, ${g.edges.length} dependencies, ${g.lanes.filter((l) => l.mode === "sync").length} sync lanes, ${g.lanes.filter((l) => l.mode === "async").length} async; root ${g.root}`);
  } else if (a && existsSync(join(a, "venture.json"))) {
    if (!existsSync(join(a, GRAPH))) { console.error(`${GRAPH} does not exist yet: build it from the idea map (node graph.mjs build <venture>)`); process.exit(1); }
    const g = load(join(a, GRAPH));
    if (process.argv.includes("--json")) console.log(JSON.stringify(g, null, 2));
    else {
      console.log(`${g.nodes.length} ideas, ${g.edges.length} dependencies (${g.judged_by}), root ${g.root}`);
      for (const l of g.lanes) console.log(`${l.id} ${l.mode.padEnd(5)} ${String(l.signal).padEnd(4)} ${l.department ?? ""}: ${l.ideas.join(" -> ")}`);
      console.log(`Highest signal to develop next: ${g.next.join(", ")}`);
    }
  } else { console.error("usage: node graph.mjs request <venture> | build <venture> [<answers.json>] | <venture> [--json]"); process.exit(2); }
}
