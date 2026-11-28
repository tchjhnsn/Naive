#!/usr/bin/env node
// The element graph (EE-188, step 6 of docs/design/HOOKS_AND_LOOPS_2026-11-26.md). An element is one node of APQC's
// Process Classification Framework as Naive carries it (packages/naive/src/functions/pcf.json): a category (level 1,
// which Naive calls a function), a process group, a process, an activity or a task. A catalog activity
// (packages/naive/src/functions/activities.json) is an element too, under its process or process group.
//
// The graph is built from the 13 function modules' workflows (packages/naive/src/functions/<id>/workflows/*.json).
// Its nodes are elements, workflows, the route patterns workflows name and the record types those routes resolve to
// (packages/naive/src/records/routes/routes.ts). Its edges:
//
//   contains    element -> element      the PCF hierarchy, a catalog activity under its process or process group
//   belongs-to  workflow -> element     a workflow to its function's category
//   performs    workflow -> element     a step's activity, naming the step
//   writes      workflow -> route       a step's writes, naming the step
//   reads       workflow -> route       the workflow's reads
//   listens     workflow -> route       an event trigger's route
//   resolves    route -> record type    the record types a route pattern names
//   feeds       element -> element      derived: A feeds B when a route a step attached to A writes resolves to a record
//                                       type that a workflow attached to B reads or is triggered by
//
// Roles (EE-234, step 6 of docs/design/ROLES_AS_AGENTS_2026-11-28.md) join the graph from the role library
// (packages/naive/src/roles/<id>/role.json). A role is a node, and so is each document kind a role produces:
//
//   raci        role -> element         a role's pcf links, naming the RACI part; the element and its ancestors join
//   produces    role -> record type     a record_type artifact
//   produces    role -> document kind   a document_kind artifact (packages/naive/src/functions/documents.json)
//   reads       role -> record type     a role's reads
//   reads       document -> record type the record types a document kind's sections read
//   depends-on  role -> role            derived: A depends on B when A reads a record type B produces, or produces a
//                                       document kind rendered from one; never typed by hand
//
// Each depends-on names its evidence: the record type, and the document kind when A needs it as a document's source.
// A role reading what it produces itself is not a dependency. A cycle of depends-on is reported, never refused.
//
// A step is attached to its activity and every ancestor of it, and always to its function's category. A workflow is
// attached to every element one of its steps is attached to. Feeds join elements of the same level only, and each
// names its evidence: the writing workflow, step and route, the reading workflow and route, and the record type. A
// workflow reading what it wrote itself is a loop, not a feed, so it is left out. A route that resolves to no record
// type matches only the same pattern.
//
// buildGraph() and every query are pure and deterministic: the same workflows and roles in any order give the same
// graph. Reading the shipped modules is an Effect through VentureFs (EE-125); the role library and the document catalog
// are read from the repository. State, quality and effects are element-effects.ts (EE-190), which leaves roles out.
//
//   node packages/naive/src/engine/element-graph.ts [--function <id>] [--element <id>] [--role <id>] [--json] [--mermaid]
//   naive graph [...]

import { Effect, Graph, Option } from "effect";
import type { Predicate } from "effect";
import { join } from "node:path";
import { readJson } from "../core/effect/fs.ts";
import { CannotRun } from "../core/effect/errors.ts";
import type { NaiveError } from "../core/effect/errors.ts";
import { runMain } from "../core/effect/run.ts";
import { routes } from "../records/routes/routes.ts";
import type { ActivityCatalog, DataModel, DocumentCatalog, FunctionWorkflow, Pcf, Role } from "../records/types/records.d.ts";
import { VENTURE_PREFIX, globRegExp, readDataModel, venturePaths } from "../records/index.ts";
import { readCatalog, readPcf } from "./activity-proposals.ts";
import { functionAgent, functionIds, naivePath } from "./agents/function-spec.ts";
import { loadRoles } from "./agents/roles.ts";
import { artifactKind } from "./artifact-kind.ts";
import type { ArtifactRef } from "./artifact-kind.ts";
import { catalog as documentCatalog } from "./documents.ts";
import { routeMatches } from "./due.ts";

/** The part of a function workflow the graph reads. */
export type GraphWorkflow = Pick<FunctionWorkflow, "id" | "function" | "title" | "trigger" | "reads" | "steps">;
/** One element as input: a PCF element or a catalog activity, with its parent. */
export type ElementIn = { readonly id: string, readonly name: string, readonly level: number, readonly parent: string | null };
export interface GraphInput {
  /** Every element the graph may use. Only the functions, the activities steps name and their ancestors become nodes. */
  readonly elements: readonly ElementIn[],
  /** Each function id and its APQC category's hierarchy id, such as strategy and 1.0. */
  readonly functions: readonly { readonly id: string, readonly category: string }[],
  readonly workflows: readonly GraphWorkflow[],
  /** The record types each route pattern resolves to. A pattern missing here resolves to none. */
  readonly records: Readonly<Record<string, readonly string[]>>,
  /** The roles (EE-234). None leaves the graph as the workflows alone make it. */
  readonly roles?: readonly GraphRole[],
  /** Each document kind a role may produce and the record types its sections read. A kind missing here reads none. */
  readonly documents?: Readonly<Record<string, readonly string[]>>,
}
/** The part of a role the graph reads. */
export type GraphRole = Pick<Role, "id" | "name" | "kind"> & {
  readonly pcf: readonly NonNullable<Role["pcf"]>[number][],
  readonly reads: readonly string[],
  readonly artifacts: readonly ArtifactRef[],
};
export type Raci = NonNullable<Role["pcf"]>[number]["raci"];

export type ElementNode = { readonly kind: "element", readonly id: string, readonly name: string, readonly level: number, readonly function: string | null };
export type WorkflowNode = { readonly kind: "workflow", readonly id: string, readonly function: string, readonly title: string, readonly trigger: GraphWorkflow["trigger"] };
export type RouteNode = { readonly kind: "route", readonly id: string };
export type RecordNode = { readonly kind: "record", readonly id: string };
export type DocumentNode = { readonly kind: "document", readonly id: string };
export type RoleNode = { readonly kind: "role", readonly id: string, readonly name: string, readonly role_kind: Role["kind"] };
export type GraphNode = ElementNode | WorkflowNode | RouteNode | RecordNode | DocumentNode | RoleNode;
/** Why role A depends on role B: a record type B produces that A reads, or that a document kind A produces is rendered from. */
export interface Dependency {
  readonly record: string,
  /** The document kind A produces from the record, or null when A reads it itself. */
  readonly document: string | null,
}
/** Why A feeds B: one route A's step writes and one route B's workflow reads, sharing a record type. */
export interface Feed {
  /** `<function>/<workflow>` that writes. */
  readonly writer: string,
  readonly step: string,
  readonly wrote: string,
  /** `<function>/<workflow>` that reads or is triggered. */
  readonly reader: string,
  readonly read: string,
  readonly via: "read" | "trigger",
  /** The record type both routes resolve to, or null when they are the same pattern resolving to none. */
  readonly record: string | null,
}
export type GraphEdge =
  | { readonly kind: "contains" | "belongs-to" | "reads" | "listens" | "resolves" }
  | { readonly kind: "performs" | "writes", readonly step: string }
  | { readonly kind: "feeds", readonly evidence: readonly Feed[] }
  | { readonly kind: "raci", readonly raci: Raci }
  | { readonly kind: "produces" }
  | { readonly kind: "depends-on", readonly evidence: readonly Dependency[] };
export interface ElementGraph {
  readonly graph: Graph.DirectedGraph<GraphNode, GraphEdge>,
  /** Each node's key, `<kind>:<id>`, to its index. */
  readonly index: ReadonlyMap<string, Graph.NodeIndex>,
}
/** A neighbour in the feeds graph and the evidence for the edge. */
export interface Neighbour { readonly element: ElementNode, readonly evidence: readonly Feed[] }
/** A route read that no workflow writes, or written that no workflow reads. */
export interface LooseRoute {
  readonly route: string,
  readonly records: readonly string[],
  /** The workflows that read it (with " (trigger)" for an event trigger), or the `<workflow>#<step>` that write it. */
  readonly by: readonly string[],
}

export const keyOf = (n: Pick<GraphNode, "kind" | "id">): string => `${n.kind}:${n.id}`;

/** Hierarchy ids in numeric order (1.2 before 1.10), then catalog ids by name. */
const byElement = (a: string, b: string): number => {
  const na = /^\d/.test(a), nb = /^\d/.test(b);
  if (na !== nb) return na ? -1 : 1;
  if (!na) return a < b ? -1 : a > b ? 1 : 0;
  const pa = a.split(".").map(Number), pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pa[i] ?? -1) !== (pb[i] ?? -1)) return (pa[i] ?? -1) - (pb[i] ?? -1);
  return 0;
};
const byString = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const feedKey = (f: Feed): string => [f.writer, f.step, f.wrote, f.reader, f.read, f.via, f.record ?? ""].join("\u0000");

/** Builds the element graph. Pure: the order of the input does not change the result. */
export function buildGraph(input: GraphInput): ElementGraph {
  const all = new Map(input.elements.map((e) => [e.id, e]));
  const categoryOf = new Map(input.functions.map((f) => [f.id, f.category]));
  const functionOfCategory = new Map(input.functions.map((f) => [f.category, f.id]));
  const workflows = [...input.workflows].sort((a, b) => byString(`${a.function}/${a.id}`, `${b.function}/${b.id}`));
  const chain = (id: string): string[] => {
    const out: string[] = [];
    for (let e = all.get(id); e && !out.includes(e.id); e = e.parent === null ? undefined : all.get(e.parent)) out.push(e.id);
    return out;
  };
  // The elements each step is attached to: its activity's chain and its function's category.
  const attached = (w: GraphWorkflow, s: GraphWorkflow["steps"][number]): string[] => {
    const category = categoryOf.get(w.function);
    return [...new Set([...(s.activity ? chain(s.activity) : []), ...(category && all.has(category) ? [category] : [])])];
  };

  const used = new Set<string>();
  for (const f of input.functions) for (const id of chain(f.category)) used.add(id);
  for (const w of workflows) for (const s of w.steps) for (const id of attached(w, s)) used.add(id);
  const roles = [...(input.roles ?? [])].sort((a, b) => byString(a.id, b.id));
  const documentsOf = (kind: string): string[] => [...new Set(input.documents?.[kind] ?? [])].sort(byString);
  for (const r of roles) for (const p of r.pcf) for (const id of chain(p.id)) used.add(id);
  const top = (id: string): string | null => functionOfCategory.get(chain(id).at(-1) ?? "") ?? null;
  const elements = [...used].sort(byElement).map((id): ElementNode => {
    const e = all.get(id)!;
    return { kind: "element", id, name: e.name, level: e.level, function: top(id) };
  });
  const records = (pattern: string): string[] => [...new Set(input.records[pattern] ?? [])].sort(byString);
  const patterns = [...new Set(workflows.flatMap((w) => [...(w.reads ?? []), ...(w.trigger.route ? [w.trigger.route] : []), ...w.steps.flatMap((s) => s.writes ?? [])]))].sort(byString);
  const produced = (r: GraphRole) => ({
    records: [...new Set(r.artifacts.flatMap((a) => (a.record_type !== undefined ? [a.record_type] : [])))].sort(byString),
    documents: [...new Set(r.artifacts.flatMap((a) => (a.document_kind !== undefined ? [a.document_kind] : [])))].sort(byString),
  });
  const documents = [...new Set(roles.flatMap((r) => produced(r).documents))].sort(byString);
  const recordTypes = [...new Set([...patterns.flatMap(records), ...roles.flatMap((r) => [...r.reads, ...produced(r).records]), ...documents.flatMap(documentsOf)])].sort(byString);

  // Depends-on: what each role needs (its reads, and the sources of the documents it produces) against what others produce.
  const dependsOn: { from: string, to: string, evidence: Dependency[] }[] = [];
  for (const a of roles) {
    const needs: Dependency[] = [...a.reads.map((record) => ({ record, document: null })), ...produced(a).documents.flatMap((document) => documentsOf(document).map((record) => ({ record, document })))];
    for (const b of roles) {
      if (a.id === b.id) continue;
      const makes = new Set(produced(b).records);
      const evidence = new Map(needs.filter((n) => makes.has(n.record)).map((n) => [`${n.record}\u0000${n.document ?? ""}`, n]));
      if (evidence.size) dependsOn.push({ from: a.id, to: b.id, evidence: [...evidence.entries()].sort(([x], [y]) => byString(x, y)).map(([, n]) => n) });
    }
  }

  // Writes and reads per element, for feeds.
  type Write = { writer: string, step: string, wrote: string };
  type Read = { reader: string, read: string, via: Feed["via"] };
  const writesOf = new Map<string, Write[]>(), readsOf = new Map<string, Read[]>();
  const push = <T>(m: Map<string, T[]>, k: string, v: T) => { const l = m.get(k); if (l) l.push(v); else m.set(k, [v]); };
  for (const w of workflows) {
    const key = `${w.function}/${w.id}`;
    const mine = new Set<string>();
    for (const s of w.steps) for (const e of attached(w, s)) { mine.add(e); for (const r of s.writes ?? []) push(writesOf, e, { writer: key, step: s.id, wrote: r }); }
    const reads: Read[] = [...(w.reads ?? []).map((r): Read => ({ reader: key, read: r, via: "read" })), ...(w.trigger.kind === "event" && w.trigger.route ? [{ reader: key, read: w.trigger.route, via: "trigger" as const }] : [])];
    for (const e of mine) for (const r of reads) push(readsOf, e, r);
  }
  const shared = (wrote: string, read: string): (string | null)[] => {
    const a = records(wrote), b = new Set(records(read));
    if (!a.length && !b.size) return wrote === read ? [null] : [];
    return a.filter((r) => b.has(r));
  };
  const feeds: { from: string, to: string, evidence: Feed[] }[] = [];
  for (const a of elements) for (const b of elements) {
    if (a.id === b.id || a.level !== b.level) continue;
    const evidence = new Map<string, Feed>();
    for (const w of writesOf.get(a.id) ?? []) for (const r of readsOf.get(b.id) ?? []) {
      if (w.writer === r.reader) continue;
      for (const record of shared(w.wrote, r.read)) { const f: Feed = { ...w, ...r, record }; evidence.set(feedKey(f), f); }
    }
    if (evidence.size) feeds.push({ from: a.id, to: b.id, evidence: [...evidence.entries()].sort(([x], [y]) => byString(x, y)).map(([, f]) => f) });
  }

  const index = new Map<string, Graph.NodeIndex>();
  const graph = Graph.directed<GraphNode, GraphEdge>((m) => {
    const add = (n: GraphNode) => { index.set(keyOf(n), Graph.addNode(m, n)); };
    const at = (kind: GraphNode["kind"], id: string): Graph.NodeIndex => index.get(`${kind}:${id}`)!;
    const seen = new Set<string>();
    const edge = (from: Graph.NodeIndex, to: Graph.NodeIndex, data: GraphEdge) => {
      const k = `${from} ${to} ${JSON.stringify(data)}`;
      if (!seen.has(k)) { seen.add(k); Graph.addEdge(m, from, to, data); }
    };
    for (const e of elements) add(e);
    for (const w of workflows) add({ kind: "workflow", id: `${w.function}/${w.id}`, function: w.function, title: w.title, trigger: w.trigger });
    for (const p of patterns) add({ kind: "route", id: p });
    for (const r of recordTypes) add({ kind: "record", id: r });
    for (const d of documents) add({ kind: "document", id: d });
    for (const r of roles) add({ kind: "role", id: r.id, name: r.name, role_kind: r.kind });
    for (const e of elements) { const parent = all.get(e.id)?.parent; if (parent && used.has(parent)) edge(at("element", parent), at("element", e.id), { kind: "contains" }); }
    for (const w of workflows) {
      const wi = at("workflow", `${w.function}/${w.id}`);
      const category = categoryOf.get(w.function);
      if (category && used.has(category)) edge(wi, at("element", category), { kind: "belongs-to" });
      for (const s of w.steps) {
        if (s.activity && used.has(s.activity)) edge(wi, at("element", s.activity), { kind: "performs", step: s.id });
        for (const r of s.writes ?? []) edge(wi, at("route", r), { kind: "writes", step: s.id });
      }
      for (const r of w.reads ?? []) edge(wi, at("route", r), { kind: "reads" });
      if (w.trigger.kind === "event" && w.trigger.route) edge(wi, at("route", w.trigger.route), { kind: "listens" });
    }
    for (const p of patterns) for (const r of records(p)) edge(at("route", p), at("record", r), { kind: "resolves" });
    for (const f of feeds) edge(at("element", f.from), at("element", f.to), { kind: "feeds", evidence: f.evidence });
    for (const d of documents) for (const r of documentsOf(d)) edge(at("document", d), at("record", r), { kind: "reads" });
    for (const r of roles) {
      const ri = at("role", r.id);
      for (const p of [...r.pcf].sort((x, y) => byElement(x.id, y.id) || byString(x.raci, y.raci))) if (used.has(p.id)) edge(ri, at("element", p.id), { kind: "raci", raci: p.raci });
      const mine = produced(r);
      for (const x of mine.records) edge(ri, at("record", x), { kind: "produces" });
      for (const x of mine.documents) edge(ri, at("document", x), { kind: "produces" });
      for (const x of [...new Set(r.reads)].sort(byString)) edge(ri, at("record", x), { kind: "reads" });
    }
    for (const d of dependsOn) edge(at("role", d.from), at("role", d.to), { kind: "depends-on", evidence: d.evidence });
  });
  return { graph, index };
}

const nodeAt = (g: ElementGraph, i: Graph.NodeIndex): GraphNode => Option.getOrThrow(Graph.getNode(g.graph, i));
const edgeAt = (g: ElementGraph, i: Graph.EdgeIndex): Graph.Edge<GraphEdge> => Option.getOrThrow(Graph.getEdge(g.graph, i));

/** The element an id names: a hierarchy id, a catalog activity id, or a function id for its category. */
export function elementOf(g: ElementGraph, ref: string): ElementNode | undefined {
  const direct = g.index.get(`element:${ref}`);
  if (direct !== undefined) return nodeAt(g, direct) as ElementNode;
  for (const [, n] of Graph.entries(Graph.nodes(g.graph))) if (n.kind === "element" && n.level === 1 && n.function === ref) return n;
  return undefined;
}

const neighbours = (g: ElementGraph, ref: string, direction: "incoming" | "outgoing"): Neighbour[] => {
  const e = elementOf(g, ref);
  if (!e) return [];
  const i = g.index.get(keyOf(e))!;
  return (direction === "incoming" ? Graph.incomingEdges(g.graph, i) : Graph.outgoingEdges(g.graph, i)).map((x) => edgeAt(g, x))
    .flatMap((x): Neighbour[] => (x.data.kind === "feeds" ? [{ element: nodeAt(g, direction === "incoming" ? x.source : x.target) as ElementNode, evidence: x.data.evidence }] : []))
    .sort((a, b) => byElement(a.element.id, b.element.id));
};
/** The elements that feed this one, each with its evidence. */
export const upstream = (g: ElementGraph, ref: string): Neighbour[] => neighbours(g, ref, "incoming");
/** The elements this one feeds, each with its evidence. */
export const downstream = (g: ElementGraph, ref: string): Neighbour[] => neighbours(g, ref, "outgoing");

/** Each route node's record types, or the route itself when it resolves to none, and who reads and writes it. */
const routeUse = (g: ElementGraph) => {
  const out: { route: string, keys: string[], records: string[], readers: string[], writers: string[] }[] = [];
  for (const [i, n] of Graph.entries(Graph.nodes(g.graph))) {
    if (n.kind !== "route") continue;
    const records = Graph.outgoingEdges(g.graph, i).map((x) => edgeAt(g, x)).filter((x) => x.data.kind === "resolves").map((x) => nodeAt(g, x.target).id);
    const readers: string[] = [], writers: string[] = [];
    for (const x of Graph.incomingEdges(g.graph, i).map((y) => edgeAt(g, y))) {
      const w = nodeAt(g, x.source).id;
      if (x.data.kind === "reads") readers.push(w);
      else if (x.data.kind === "listens") readers.push(`${w} (trigger)`);
      else if (x.data.kind === "writes") writers.push(`${w}#${x.data.step}`);
    }
    out.push({ route: n.id, keys: records.length ? records : [`route:${n.id}`], records, readers: [...new Set(readers)].sort(byString), writers: [...new Set(writers)].sort(byString) });
  }
  return out;
};
/** Routes some workflow reads or is triggered by that no workflow writes: inputs a person, an intake or an outside source must give. */
export function unfed(g: ElementGraph): LooseRoute[] {
  const use = routeUse(g);
  const written = new Set(use.filter((u) => u.writers.length).flatMap((u) => u.keys));
  return use.filter((u) => u.readers.length && !u.keys.some((k) => written.has(k))).map((u) => ({ route: u.route, records: u.records, by: u.readers }));
}
/** Routes some workflow writes that no workflow reads or is triggered by. */
export function unread(g: ElementGraph): LooseRoute[] {
  const use = routeUse(g);
  const read = new Set(use.filter((u) => u.readers.length).flatMap((u) => u.keys));
  return use.filter((u) => u.writers.length && !u.keys.some((k) => read.has(k))).map((u) => ({ route: u.route, records: u.records, by: u.writers }));
}

/** Every node and edge, by key, in index order: the graph as JSON. */
export function toJson(g: ElementGraph): { nodes: (GraphNode & { key: string })[], edges: ({ from: string, to: string } & GraphEdge)[] } {
  return {
    nodes: [...Graph.values(Graph.nodes(g.graph))].map((n) => ({ key: keyOf(n), ...n })),
    edges: [...Graph.values(Graph.edges(g.graph))].map((e) => ({ from: keyOf(nodeAt(g, e.source)), to: keyOf(nodeAt(g, e.target)), ...e.data })),
  };
}

/** The subgraph of the nodes that pass, as Mermaid, or only the edges into and out of one of them. */
const mermaidOf = (g: ElementGraph, pass: Predicate.Predicate<GraphNode>, focus: GraphNode | undefined, label: NonNullable<Graph.MermaidOptions<GraphNode, GraphEdge>["nodeLabel"]>): string => {
  const nodes = [...Graph.entries(Graph.nodes(g.graph))].filter(([, n]) => pass(n)).map(([i]) => i);
  const keep = focus === undefined ? undefined : g.index.get(keyOf(focus));
  const sub = Graph.inducedSubgraph(g.graph, nodes);
  const near = keep === undefined ? sub : Graph.mutate(sub, (m) => {
    for (const [i, e] of Graph.entries(Graph.edges(m))) if (e.source !== keep && e.target !== keep) Graph.removeEdge(m, i);
    for (const [i] of [...Graph.entries(Graph.nodes(m))]) if (i !== keep && Graph.incomingEdges(m, i).length === 0 && Graph.outgoingEdges(m, i).length === 0) Graph.removeNode(m, i);
  });
  return Graph.toMermaid(near, {
    direction: "LR",
    nodeLabel: label,
    edgeLabel: (e) => (e.kind === "feeds" ? [...new Set(e.evidence.map((f) => f.record ?? f.wrote))].sort(byString).join(", ")
      : e.kind === "depends-on" ? [...new Set(e.evidence.map((d) => d.record))].sort(byString).join(", ") : e.kind),
  });
};

/** The feeds graph between functions as Mermaid, or only the edges into and out of one function. */
export function functionMermaid(g: ElementGraph, only?: string): string {
  return mermaidOf(g, (n) => n.kind === "element" && n.level === 1, only === undefined ? undefined : elementOf(g, only), (n) => (n.kind === "element" ? n.function ?? n.id : n.id));
}

/** The role a role id names, or undefined. */
export function roleOf(g: ElementGraph, id: string): RoleNode | undefined {
  const i = g.index.get(`role:${id}`);
  return i === undefined ? undefined : (nodeAt(g, i) as RoleNode);
}

/** A role it depends on, or that depends on it, with the evidence. */
export interface RoleNeighbour { readonly role: RoleNode, readonly evidence: readonly Dependency[] }
/** One role in the graph: what it depends on, what depends on it, its elements by RACI part and its artifacts. */
export interface RoleView {
  readonly role: RoleNode,
  readonly depends_on: readonly RoleNeighbour[],
  readonly depended_on_by: readonly RoleNeighbour[],
  readonly elements: Readonly<Record<Raci, readonly ElementNode[]>>,
  readonly artifacts: readonly ({ readonly kind: "record", readonly id: string } | { readonly kind: "document", readonly id: string, readonly records: readonly string[] })[],
  readonly reads: readonly string[],
}

/** What the graph holds about one role, or undefined when it has no such role. */
export function roleView(g: ElementGraph, id: string): RoleView | undefined {
  const role = roleOf(g, id);
  if (!role) return undefined;
  const i = g.index.get(keyOf(role))!;
  const out = Graph.outgoingEdges(g.graph, i).map((x) => edgeAt(g, x));
  const near = (edges: Graph.Edge<GraphEdge>[], end: "source" | "target"): RoleNeighbour[] => edges
    .flatMap((x): RoleNeighbour[] => (x.data.kind === "depends-on" ? [{ role: nodeAt(g, x[end]) as RoleNode, evidence: x.data.evidence }] : []))
    .sort((a, b) => byString(a.role.id, b.role.id));
  const elements: Record<Raci, ElementNode[]> = { responsible: [], accountable: [], consulted: [], informed: [] };
  for (const x of out) if (x.data.kind === "raci") elements[x.data.raci].push(nodeAt(g, x.target) as ElementNode);
  const records = (d: Graph.NodeIndex) => Graph.outgoingEdges(g.graph, d).map((x) => edgeAt(g, x)).filter((x) => x.data.kind === "reads").map((x) => nodeAt(g, x.target).id).sort(byString);
  return {
    role,
    depends_on: near(out, "target"),
    depended_on_by: near(Graph.incomingEdges(g.graph, i).map((x) => edgeAt(g, x)), "source"),
    elements,
    artifacts: out.filter((x) => x.data.kind === "produces").map((x) => {
      const n = nodeAt(g, x.target);
      return n.kind === "document" ? { kind: "document" as const, id: n.id, records: records(x.target) } : { kind: "record" as const, id: n.id };
    }),
    reads: out.filter((x) => x.data.kind === "reads").map((x) => nodeAt(g, x.target).id).sort(byString),
  };
}

/** Each cycle of depends-on between roles, as its role ids sorted, the cycles sorted. A cycle is reported, never refused. */
export function roleCycles(g: ElementGraph): string[][] {
  const roles = [...Graph.entries(Graph.nodes(g.graph))].filter(([, n]) => n.kind === "role").map(([i]) => i);
  const sub = Graph.inducedSubgraph(g.graph, roles);
  return Graph.stronglyConnectedComponents(sub).filter((c) => c.length > 1)
    .map((c) => c.map((i) => Option.getOrThrow(Graph.getNode(sub, i)).id).sort(byString))
    .sort((a, b) => byString(a.join(), b.join()));
}

/** The depends-on graph between roles as Mermaid, or only the edges into and out of one role. */
export function roleMermaid(g: ElementGraph, only?: string): string {
  return mermaidOf(g, (n) => n.kind === "role", only === undefined ? undefined : roleOf(g, only), (n) => n.id);
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const FUNCTIONS = "packages/naive/src/functions";

/** The input for the shipped function modules: PCF 8.0, the activity catalog, every workflow, the route table, the role
 *  library and the document catalog. */
export const shippedInput = (): Effect.Effect<GraphInput, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const pcf: Pcf = yield* readPcf();
  const catalog: ActivityCatalog = yield* readCatalog();
  const departments = yield* readJson(naivePath(`${FUNCTIONS}/departments.json`));
  const functions = (isObject(departments) && Array.isArray(departments.departments) ? departments.departments.filter(isObject) : [])
    .flatMap((d) => (typeof d.id === "string" && isObject(d.apqc) && typeof d.apqc.id === "string" ? [{ id: d.id, category: d.apqc.id }] : []));
  const parentOf = (id: string): string | null => { const p = id.split("."); return p.length === 2 ? (p[1] === "0" ? null : `${p[0]}.0`) : p.slice(0, -1).join("."); };
  const levels = new Map(pcf.elements.map((e) => [e.id, e.level]));
  const elements: ElementIn[] = [
    ...pcf.elements.map((e) => ({ id: e.id, name: e.name, level: e.level, parent: parentOf(e.id) })),
    ...catalog.activities.map((a) => { const parent = a.process ?? a.process_group; return { id: a.id, name: a.statement, level: (levels.get(parent) ?? 2) + 1, parent }; }),
  ];
  const workflows: GraphWorkflow[] = [];
  for (const f of functionIds()) {
    const spec = functionAgent(f);
    for (const w of spec.workflows) workflows.push((yield* readJson(join(spec.module, "workflows", `${w}.json`))) as GraphWorkflow);
  }
  return { elements, functions, workflows, records: resolveRecords(workflows), ...shippedRoles() };
});

/** The role library as graph roles, each artifact resolved through artifactKind (an unknown one is left out, and
 *  check-roles.ts reports it), and each document kind's sources. */
export function shippedRoles(): Pick<GraphInput, "roles" | "documents"> {
  const model = readDataModel(), c = documentCatalog();
  const roles = [...loadRoles().values()].map((r): GraphRole => ({
    id: r.id, name: r.name, kind: r.kind, pcf: r.pcf ?? [], reads: r.reads ?? [],
    artifacts: (r.artifacts ?? []).filter((a) => artifactKind(a as ArtifactRef, { model, catalog: c }).kind !== "unknown") as ArtifactRef[],
  }));
  return { roles, documents: documentSources(c, model) };
}

/** The record types each document kind's sections read: the venture record types whose data-model paths match a
 *  section's `from`. A section that names no record, such as a hole, reads none. */
export function documentSources(c: Pick<DocumentCatalog, "kinds">, model: Pick<DataModel, "records">): Record<string, string[]> {
  const globs = model.records.flatMap((r) => venturePaths(r).map((v) => ({ id: r.id, re: globRegExp(VENTURE_PREFIX + v) })));
  const of = (from: string): string[] => { const sample = `instance/${from.replace(/\*/g, "_")}`; return globs.filter((x) => x.re.test(sample)).map((x) => x.id); };
  return Object.fromEntries(c.kinds.map((k) => [k.id, [...new Set(k.sections.flatMap((s) => (s.from === undefined ? [] : of(s.from))))].sort(byString)]));
}

/** The record types each route pattern the workflows name resolves to in the route table. `*` and `[id]` stand for one segment. */
export function resolveRecords(workflows: readonly GraphWorkflow[]): Record<string, string[]> {
  const table = routes().flatMap((r) => (r.kind === "record" && r.record ? [{ route: r.route, record: r.record }] : []));
  const out: Record<string, string[]> = {};
  const patterns = new Set(workflows.flatMap((w) => [...(w.reads ?? []), ...(w.trigger.route ? [w.trigger.route] : []), ...w.steps.flatMap((s) => s.writes ?? [])]));
  for (const p of patterns) {
    const exact = table.filter((r) => r.route === p);
    const hits = exact.length ? exact : table.filter((r) => routeMatches(p, r.route) || routeMatches(r.route, p));
    out[p] = [...new Set(hits.map((r) => r.record))].sort(byString);
  }
  return out;
}

const evidenceLine = (f: Feed): string => `${f.writer}#${f.step} writes ${f.wrote}, ${f.via === "trigger" ? "which starts" : "read by"} ${f.reader}${f.via === "trigger" ? ` (on ${f.read})` : ` as ${f.read}`}${f.record ? ` [${f.record}]` : ""}`;
const label = (e: ElementNode): string => `${e.id}${e.level === 1 && e.function ? ` (${e.function})` : ""} ${e.level === 1 ? "" : e.name}`.trim();

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const usage = "usage: node packages/naive/src/engine/element-graph.ts [--function <id> | --element <id> | --role <id>] [--json] [--mermaid]";
  const program: Effect.Effect<void, NaiveError, "naive/VentureFs"> = Effect.gen(function* () {
    const valued = ["--function", "--element", "--role"];
    const known = new Set([...valued, "--json", "--mermaid"]);
    const stray = args.filter((a, i) => !known.has(a) && !valued.includes(args[i - 1]));
    const fn = flag("--function"), el = flag("--element"), ro = flag("--role");
    if (stray.length || valued.some((v) => args.includes(v) && !flag(v)) || (ro !== undefined && (fn !== undefined || el !== undefined))) return yield* new CannotRun({ message: usage });
    if (fn && !functionIds().includes(fn as never)) return yield* new CannotRun({ message: `no function ${fn}: one of ${functionIds().join(", ")}` });
    const g = buildGraph(yield* shippedInput());
    if (ro !== undefined) {
      const v = roleView(g, ro);
      if (!v) return yield* new CannotRun({ message: `no role ${ro} in the role library (packages/naive/src/roles/)` });
      if (args.includes("--mermaid")) { console.log(roleMermaid(g, ro)); return; }
      const cycles = roleCycles(g);
      if (args.includes("--json")) { console.log(JSON.stringify({ ...v, cycles }, null, 2)); return; }
      const because = (d: Dependency) => `${d.record}${d.document ? ` (source of ${d.document})` : ""}`;
      console.log(`${v.role.id} (${v.role.role_kind}) ${v.role.name}`);
      for (const [title, list] of [["Depends on", v.depends_on], ["Depended on by", v.depended_on_by]] as const) {
        console.log(`\n${title} (${list.length}):`);
        for (const n of list) console.log(`  ${n.role.id}  ${n.evidence.map(because).join(", ")}`);
      }
      console.log("\nElements:");
      for (const [raci, list] of Object.entries(v.elements)) if (list.length) console.log(`  ${raci}: ${list.map(label).join("; ")}`);
      console.log(`\nArtifacts (${v.artifacts.length}):`);
      for (const a of v.artifacts) console.log(a.kind === "record" ? `  record type ${a.id}` : `  document kind ${a.id}, from ${a.records.join(", ") || "no record"}`);
      console.log(`\nReads (${v.reads.length}):${v.reads.length ? ` ${v.reads.join(", ")}` : ""}`);
      console.log(`\nCycles of depends-on across the library (${cycles.length}):`);
      for (const c of cycles) console.log(`  ${c.join(", ")}`);
      return;
    }
    if (args.includes("--mermaid")) { console.log(functionMermaid(g, fn)); return; }
    const ref = el ?? fn;
    if (ref !== undefined) {
      const e = elementOf(g, ref);
      if (!e) return yield* new CannotRun({ message: `no element ${ref} in the graph: name a function, an APQC hierarchy id a workflow reaches, or a catalog activity a step performs` });
      const up = upstream(g, ref), down = downstream(g, ref);
      const routesOf = (w: string) => w.split(/[#\s]/)[0];
      const mine = (l: LooseRoute[]) => (fn ? l.filter((r) => r.by.some((b) => routesOf(b).startsWith(`${fn}/`))) : []);
      if (args.includes("--json")) { console.log(JSON.stringify({ element: e, upstream: up, downstream: down, ...(fn ? { unfed: mine(unfed(g)), unread: mine(unread(g)) } : {}) }, null, 2)); return; }
      console.log(label(e));
      for (const [title, list] of [["Fed by", up], ["Feeds", down]] as const) {
        console.log(`\n${title} (${list.length}):`);
        for (const n of list) { console.log(`  ${label(n.element)}`); for (const f of n.evidence) console.log(`    ${evidenceLine(f)}`); }
      }
      if (fn) {
        for (const [title, list] of [["Reads that no workflow writes", mine(unfed(g))], ["Writes that no workflow reads", mine(unread(g))]] as const) {
          console.log(`\n${title} (${list.length}):`);
          for (const r of list) console.log(`  ${r.route}  ${r.by.filter((b) => routesOf(b).startsWith(`${fn}/`)).join(", ")}`);
        }
      }
      return;
    }
    if (args.includes("--json")) { console.log(JSON.stringify({ ...toJson(g), unfed: unfed(g), unread: unread(g) }, null, 2)); return; }
    console.log("Feeds between functions (A feeds B when a route A's workflows write is read by, or starts, a workflow of B):");
    for (const f of toJson(g).edges.filter((x) => x.kind === "feeds" && x.from.match(/^element:\d+\.0$/))) {
      const records = f.kind === "feeds" ? [...new Set(f.evidence.map((x) => x.record ?? x.wrote))].join(", ") : "";
      const name = (k: string) => elementOf(g, k.slice("element:".length))?.function ?? k;
      console.log(`  ${name(f.from)} -> ${name(f.to)}  ${records}`);
    }
    for (const [title, list] of [["Routes read that no workflow writes", unfed(g)], ["Routes written that no workflow reads", unread(g)]] as const) {
      console.log(`\n${title} (${list.length}):`);
      for (const r of list) console.log(`  ${r.route}  ${r.by.join(", ")}`);
    }
  });
  await runMain(program);
}
