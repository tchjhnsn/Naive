// Ties the Lean model of element state (packages/naive/lean/Naive/Elements.lean) to the TypeScript
// (element-state.ts), EE-190 and step 8 of docs/design/HOOKS_AND_LOOPS_2026-11-26.md. It runs a fixed set of cases
// through the TypeScript `transition` and `propagate` and writes each result as a Lean `example` proved by `decide`,
// so `lake build` checks that the Lean model gives the same answer.
//
//   node packages/naive/src/engine/element-cases.ts           write packages/naive/lean/Naive/Generated/ElementCases.lean
//   node packages/naive/src/engine/element-cases.ts --check   exit 1 when the committed file differs from a fresh run
//
// A change to the TypeScript changes the file, so --check fails until it is regenerated, and the regenerated file
// fails `lake build` unless the Lean model agrees. A change to the Lean model fails `lake build` against the file.
//
// Ids. Lean ids are natural numbers. Within each case, the workflow ids, the record ids and the element ids are each
// numbered in string order, which keeps every cause key in the order the TypeScript sorts it (a key's kind decides
// first, then its id). In a propagation case the elements are numbered in id order, which is `Fin n`. A cleared key
// that names no cause kind is a key with rank 4, which no cause has. The person who retires is 0.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { propagate, transition } from "./element-state.ts";
import type { Cause, ElementEvent, ElementState, Feeds, Own } from "./element-state.ts";

export const OUTPUT = "packages/naive/lean/Naive/Generated/ElementCases.lean";

type Space = "workflow" | "record" | "element";
const KINDS: Record<string, { rank: number, space: Space }> = {
  "run-failed": { rank: 0, space: "workflow" }, "run-overdue": { rank: 1, space: "workflow" },
  "stale": { rank: 2, space: "record" }, "upstream": { rank: 3, space: "element" },
};

const fail = (workflow: string): Cause => ({ kind: "run-failed", workflow });
export const STATES: ElementState[] = [
  { tag: "absent" }, { tag: "started" }, { tag: "operating" },
  { tag: "degraded", causes: [fail("f/w")], was: "started" },
  { tag: "degraded", causes: [{ kind: "upstream", element: "2.0", upstream: "absent" }], was: "operating" },
  { tag: "degraded", causes: [fail("f/w"), { kind: "stale", record: "a.json" }], was: "operating" },
  { tag: "degraded", causes: [{ kind: "run-overdue", workflow: "f/w" }, { kind: "upstream", element: "3.0", upstream: "degraded" }], was: "started" },
  { tag: "retired" },
];
export const EVENTS: ElementEvent[] = [
  { kind: "record-written", record: "a.json", data: "master" }, { kind: "record-written", record: "b.json", data: "transactional" }, { kind: "record-written", record: "c.json", data: null },
  { kind: "run-finished", workflow: "f/w" }, { kind: "run-finished", workflow: "f/other" },
  { kind: "run-failed", workflow: "f/w" }, { kind: "run-failed", workflow: "e/w" }, { kind: "run-overdue", workflow: "f/w" }, { kind: "record-stale", record: "a.json" },
  { kind: "upstream-down", element: "2.0", upstream: "absent" }, { kind: "upstream-down", element: "3.0", upstream: "retired" },
  { kind: "cleared", cause: "run-failed:f/w" }, { kind: "cleared", cause: "upstream:2.0" }, { kind: "cleared", cause: "nothing" },
  { kind: "retire", by: "person" },
];

const op = (id: string, level: Own["level"] = 3): Own => ({ id, state: { tag: "operating" }, level });
export const NETS: { name: string, own: Own[], feeds: Feeds[] }[] = [
  { name: "an absent root degrades a chain and caps its levels", own: [{ id: "A", state: { tag: "absent" }, level: 0 }, op("B"), op("C")], feeds: [{ from: "A", to: "B" }, { from: "B", to: "C" }] },
  { name: "a strong upstream does not raise what it feeds", own: [op("A", 3), op("B", 1), op("C", 1)], feeds: [{ from: "A", to: "B" }, { from: "B", to: "C" }] },
  { name: "absent and retired downstream elements stay as they are", own: [{ id: "A", state: { tag: "absent" }, level: 0 }, { id: "B", state: { tag: "absent" }, level: 0 }, { id: "C", state: { tag: "retired" }, level: 0 }], feeds: [{ from: "A", to: "B" }, { from: "B", to: "C" }] },
  { name: "a healthy cycle stays healthy, and a self feed is ignored", own: [op("A"), op("B"), op("C")], feeds: [{ from: "A", to: "B" }, { from: "B", to: "A" }, { from: "C", to: "A" }, { from: "A", to: "A" }] },
  { name: "harm on a cycle settles with its root outside the cycle", own: [op("A"), op("B"), { id: "C", state: { tag: "degraded", causes: [fail("c/w")], was: "operating" }, level: 1 }], feeds: [{ from: "A", to: "B" }, { from: "B", to: "A" }, { from: "C", to: "A" }, { from: "A", to: "A" }] },
  { name: "a started element fed by two down elements names both, in key order", own: [{ id: "A", state: { tag: "retired" }, level: 0 }, { id: "B", state: { tag: "absent" }, level: 0 }, { id: "C", state: { tag: "started" }, level: 2 }, op("D", 2)], feeds: [{ from: "B", to: "C" }, { from: "A", to: "C" }, { from: "C", to: "D" }] },
];

type Ids = Record<Space, string[]>;
const keyParts = (key: string): { rank: number, space: Space, id: string } | null => {
  const at = key.indexOf(":");
  const kind = at > 0 ? KINDS[key.slice(0, at)] : undefined;
  return kind ? { ...kind, id: key.slice(at + 1) } : null;
};
const causeSpace = (c: Cause): [Space, string] => (c.kind === "upstream" ? ["element", c.element] : c.kind === "stale" ? ["record", c.record] : ["workflow", c.workflow]);
const stateIds = (s: ElementState): [Space, string][] => (s.tag === "degraded" ? s.causes.map(causeSpace) : []);
const eventIds = (e: ElementEvent): [Space, string][] => {
  if (e.kind === "record-written" || e.kind === "record-stale") return [["record", e.record]];
  if (e.kind === "run-finished" || e.kind === "run-failed" || e.kind === "run-overdue") return [["workflow", e.workflow]];
  if (e.kind === "upstream-down") return [["element", e.element]];
  if (e.kind === "cleared") { const k = keyParts(e.cause); return k ? [[k.space, k.id]] : []; }
  return [];
};
const number = (pairs: [Space, string][], elements: string[] = []): Ids => {
  const ids: Ids = { workflow: [], record: [], element: [...elements] };
  for (const [space, id] of pairs) if (!ids[space].includes(id)) ids[space].push(id);
  for (const space of ["workflow", "record"] as const) ids[space].sort();
  if (!elements.length) ids.element.sort();
  return ids;
};
const idOf = (ids: Ids, space: Space, id: string): number => {
  const i = ids[space].indexOf(id);
  if (i < 0) throw new Error(`no ${space} id ${id}`);
  return i;
};

const leanCause = (ids: Ids, c: Cause): string =>
  c.kind === "upstream" ? `(.upstream ${idOf(ids, "element", c.element)} .${c.upstream})`
  : c.kind === "stale" ? `(.stale ${idOf(ids, "record", c.record)})`
  : `(.${c.kind === "run-failed" ? "runFailed" : "runOverdue"} ${idOf(ids, "workflow", c.workflow)})`;
const leanState = (ids: Ids, s: ElementState): string =>
  s.tag === "degraded" ? `(.degraded [${s.causes.map((c) => leanCause(ids, c)).join(", ")}] .${s.was})` : `.${s.tag}`;
const leanEvent = (ids: Ids, e: ElementEvent): string => {
  switch (e.kind) {
    case "record-written": return `(.recordWritten ${idOf(ids, "record", e.record)} ${e.data ? `(some .${e.data})` : "none"})`;
    case "run-finished": return `(.runFinished ${idOf(ids, "workflow", e.workflow)})`;
    case "run-failed": return `(.runFailed ${idOf(ids, "workflow", e.workflow)})`;
    case "run-overdue": return `(.runOverdue ${idOf(ids, "workflow", e.workflow)})`;
    case "record-stale": return `(.recordStale ${idOf(ids, "record", e.record)})`;
    case "upstream-down": return `(.upstreamDown ${idOf(ids, "element", e.element)} .${e.upstream})`;
    case "cleared": { const k = keyParts(e.cause); return k ? `(.cleared ⟨${k.rank}, ${idOf(ids, k.space, k.id)}⟩)` : "(.cleared ⟨4, 0⟩)"; }
    case "retire": return "(.retire 0)";
  }
};

/** The Lean file: one example per transition case and per propagation case. */
export function render(): string {
  const out = [
    "/-",
    "  Generated by `node packages/naive/src/engine/element-cases.ts` from `packages/naive/src/engine/element-state.ts`.",
    "  Never edited by hand: `--check` fails when this file differs from a fresh run. Each example is a result of the",
    "  TypeScript, and `decide` checks that the Lean model in `Naive/Elements.lean` gives the same one.",
    "-/",
    "import Naive.Elements",
    "",
    "namespace Elements.Cases",
    "",
    "open Elements",
    "",
    `/-! ## transition: ${STATES.length} states by ${EVENTS.length} events -/`,
    "",
  ];
  for (const s of STATES) for (const e of EVENTS) {
    const t = transition(s, e);
    const ids = number([...stateIds(s), ...eventIds(e), ...stateIds(t)]);
    out.push(`example : transition ${leanState(ids, s)} ${leanEvent(ids, e)} = ${leanState(ids, t)} := by decide`);
  }
  out.push("", "/-! ## propagate: each case checked after `n + 1` rounds, which `effectsOf_eq` lifts to `propagate` -/", "");
  for (const net of NETS) {
    const own = [...net.own].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const elements = own.map((o) => o.id);
    const n = own.length;
    const result = propagate(own, net.feeds);
    const ids = number([...own.flatMap((o) => stateIds(o.state)), ...[...result.values()].flatMap((r) => stateIds(r.state))], elements);
    const fin = (id: string) => `(${idOf(ids, "element", id)} : Fin ${n})`;
    const netText = `netL ${n} [${own.map((o) => leanState(ids, o.state)).join(", ")}] [${own.map((o) => o.level).join(", ")}] [${net.feeds.map((f) => `(${fin(f.from)}, ${fin(f.to)})`).join(", ")}] 1`;
    const rows = own.map((o) => { const r = result.get(o.id)!; return `(${leanState(ids, r.state)}, ${r.level}, ([${r.roots.map(fin).join(", ")}] : List (Fin ${n})))`; });
    out.push(`/-- ${net.name} -/`, `example : effectsOf (${netText}) =`, `    [${rows.join(",\n      ")}] := by`, `  rw [effectsOf_eq _ ${n + 1} (by decide)]; decide`, "");
  }
  out.push("end Elements.Cases", "");
  return out.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = join(new URL(".", import.meta.url).pathname, "../../../..", OUTPUT);
  const text = render();
  if (process.argv.includes("--check")) {
    let committed = "";
    try { committed = readFileSync(out, "utf8"); } catch { committed = ""; }
    if (committed !== text) { console.error(`${OUTPUT} is stale: run node packages/naive/src/engine/element-cases.ts`); process.exit(1); }
    console.log(`${OUTPUT} matches element-state.ts`);
  } else {
    writeFileSync(out, text);
    console.log(`wrote ${OUTPUT}`);
  }
}
