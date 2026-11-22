#!/usr/bin/env node
// The Lean Canvas as the venture's shared kernel (EE-155). The canvas (packages/naive/src/functions/strategy/lean-canvas.json,
// after Maurya's Running Lean) has nine boxes, and each box is a reference to a record attribute, never a copy. This
// module resolves the references for one venture: each box's owner (the function data-model.json gives its record
// type), its status and value (read the way the identity statements are, through foundation.ts `statement`), the
// files it points at, and what filling it unlocks. Then it orders the boxes into a roadmap: first what the current
// phase's gate asks for, in the gate's own order, then what the next gate asks for, then the rest in canvas order.
//
//   node packages/naive/src/engine/lean-canvas.ts <venture dir> [--box <id>] [--json]
//
// What a box unlocks comes from Naive's data, never from a model:
//   gate      the phase gate whose exit evidence names the box's record type (phase.json gate.evidence)
//   workflow  each function workflow that reads the box's route (functions/<id>/workflows/*.json reads)
//   record    each record type whose refs point at the box's record type (data-model.json refs)
// Exit 1 when the canvas names a record type the data model lacks, or two boxes share an id. Exit 2 on a bad call.
// A .mjs file because the router runs it as a command route, also when Naive is installed under node_modules.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { filesOf, statement } from "./foundation.ts";
import { readDataModel, venturePaths } from "../records/index.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
/** @param {string} f */
const load = (f) => JSON.parse(readFileSync(f, "utf8"));

/**
 * @typedef {{ id: string, label: string, ask: string, record: string, attribute: string }} Box
 * @typedef {{ kind: "gate", phase: string, gate: string, next: string | null } | { kind: "workflow", function: string, workflow: string, title: string } | { kind: "record", record: string, field: string }} Unlock
 * @typedef {{ id: string, step: number, gate: { name: string, evidence?: { id: string, source?: string }[] } }} Phase
 */

/** The canvas definition. */
export const CANVAS = /** @type {{ version: string, note?: string, standard?: Record<string, string>, boxes: Box[] }} */ (load(join(repo, "packages/naive/src/functions/strategy/lean-canvas.json")));
/** The function that owns the canvas itself: it assembles and orders the boxes and writes none of them. */
export const CANVAS_OWNER = "strategy";
const MODEL = readDataModel();

/** The phase modules in lifecycle order. @returns {Phase[]} */
function phases() {
  const d = join(repo, "packages/naive/src/phases");
  return readdirSync(d).filter((x) => existsSync(join(d, x, "phase.json"))).map((x) => /** @type {Phase} */ (load(join(d, x, "phase.json")))).sort((a, b) => a.step - b.step);
}

/** The record types a phase's gate asks for, in the gate's order. @param {Phase | undefined} p @returns {string[]} */
const gateRecords = (p) => [...new Set((p?.gate.evidence ?? []).map((e) => e.source).filter((x) => typeof x === "string"))];

/**
 * The routes a record type lives at, from its venture paths: `instance/**\/foundation/icp/*.json` is `foundation/icp`.
 * @param {string} type @returns {string[]}
 */
export function routesOf(type) {
  const r = MODEL.records.find((/** @type {{ id: string }} */ x) => x.id === type);
  if (!r) return [];
  return [...new Set(venturePaths(r).map((/** @type {string} */ g) => g.replace(/\/\*\.json$/, "").replace(/\.json$/, "").replace(/\*\.[a-z.]+$/, "").replace(/\/$/, "")))].filter(Boolean);
}

/** Every function workflow with what it reads. @returns {{ function: string, workflow: string, title: string, reads: string[] }[]} */
function workflows() {
  const root = join(repo, "packages/naive/src/functions");
  return readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(root, e.name, "workflows"))).flatMap((e) =>
    readdirSync(join(root, e.name, "workflows")).filter((f) => f.endsWith(".json")).map((f) => load(join(root, e.name, "workflows", f)))
      .map((w) => ({ function: e.name, workflow: String(w.id), title: String(w.title ?? w.id), reads: Array.isArray(w.reads) ? w.reads.map(String) : [] })));
}

/**
 * What filling a box unlocks, from the phase gates, the function workflows and the data model's refs. Pure over its inputs.
 * @param {Box} box
 * @param {{ phases: Phase[], workflows: ReturnType<typeof workflows>, model: { records: { id: string, refs?: { field: string, to: string }[] }[] } }} data
 * @returns {Unlock[]}
 */
export function unlocksOf(box, data) {
  /** @type {Unlock[]} */
  const out = [];
  data.phases.forEach((p, i) => { if (gateRecords(p).includes(box.record)) out.push({ kind: "gate", phase: p.id, gate: p.gate.name, next: data.phases[i + 1]?.id ?? null }); });
  const routes = routesOf(box.record);
  for (const w of data.workflows) if (w.reads.some((r) => routes.includes(r))) out.push({ kind: "workflow", function: w.function, workflow: w.workflow, title: w.title });
  for (const r of data.model.records) for (const ref of r.refs ?? []) if (ref.to === box.record && r.id !== box.record) out.push({ kind: "record", record: r.id, field: ref.field });
  return out;
}

/**
 * The roadmap order: boxes the current gate asks for in the gate's order, then those the next gate asks for in its
 * order, then the rest in canvas order. Pure.
 * @param {readonly { id: string, record: string }[]} boxes
 * @param {readonly string[]} gateNow
 * @param {readonly string[]} gateNext
 * @returns {{ box: string, why: string }[]}
 */
export function roadmapOrder(boxes, gateNow, gateNext) {
  const rankIn = (/** @type {readonly string[]} */ g, /** @type {string} */ r) => { const i = g.indexOf(r); return i < 0 ? Infinity : i; };
  const tier = (/** @type {{ record: string }} */ b) => gateNow.includes(b.record) ? 0 : gateNext.includes(b.record) ? 1 : 2;
  return boxes.map((b, i) => ({ b, i })).sort((x, y) => tier(x.b) - tier(y.b)
    || (tier(x.b) === 0 ? rankIn(gateNow, x.b.record) - rankIn(gateNow, y.b.record) : tier(x.b) === 1 ? rankIn(gateNext, x.b.record) - rankIn(gateNext, y.b.record) : 0)
    || x.i - y.i)
    .map(({ b }) => ({ box: b.id, why: tier(b) === 0 ? "the current phase's gate asks for it" : tier(b) === 1 ? "the next phase's gate asks for it" : "the canvas needs it; no gate asks for it yet" }));
}

/**
 * The canvas for one venture: the kernel, each box resolved, and the roadmap.
 * @param {string} dir
 */
export function leanCanvas(dir) {
  const venture = load(join(dir, "venture.json"));
  const all = phases();
  const at = all.findIndex((p) => p.id === venture.phase);
  const gateNow = gateRecords(all[at]), gateNext = gateRecords(all[at + 1]);
  const data = { phases: all, workflows: workflows(), model: MODEL };
  const boxes = CANVAS.boxes.map((b) => {
    const s = /** @type {{ status: string, value?: unknown }} */ (statement(dir, { id: b.id, record: b.record, attribute: b.attribute }));
    const owner = MODEL.records.find((/** @type {{ id: string }} */ r) => r.id === b.record)?.function ?? "venture";
    return {
      id: b.id, label: b.label, ask: b.ask, owner, record: b.record, attribute: b.attribute,
      refs: filesOf(dir, b.record), routes: routesOf(b.record),
      status: s.status, ...(s.value !== undefined ? { value: s.value } : {}),
      gate: gateNow.includes(b.record), unlocks: unlocksOf(b, data),
    };
  });
  const roadmap = roadmapOrder(boxes, gateNow, gateNext).map((r) => ({ ...r, status: boxes.find((b) => b.id === r.box)?.status }));
  return {
    venture: venture.id, phase: venture.phase,
    kernel: { owner: CANVAS_OWNER, standard: CANVAS.standard ?? null, note: "Each box references a record its owner writes; the canvas copies nothing" },
    gate: { phase: venture.phase, name: all[at]?.gate.name ?? null, records: gateNow },
    next: roadmap.find((r) => r.status !== "confirmed")?.box ?? null,
    roadmap, boxes,
  };
}

/** One box of the canvas, fetched by id, or null. @param {string} dir @param {string} id */
export function canvasBox(dir, id) {
  const c = leanCanvas(dir);
  const box = c.boxes.find((b) => b.id === id);
  return box ? { venture: c.venture, phase: c.phase, kernel: c.kernel, place: c.roadmap.findIndex((r) => r.box === id) + 1, ...box } : null;
}

/** What is wrong with the canvas definition itself. @returns {string[]} */
export function problems() {
  const out = CANVAS.boxes.filter((b) => !MODEL.records.some((/** @type {{ id: string }} */ r) => r.id === b.record)).map((b) => `lean canvas: box ${b.id} names record type ${b.record}, which the data model lacks`);
  const ids = CANVAS.boxes.map((b) => b.id);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) out.push(`lean canvas: two boxes are named ${id}`);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  const flag = (/** @type {string} */ n) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : undefined; };
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/engine/lean-canvas.ts <venture dir> [--box <id>] [--json]"); process.exit(2); }
  const errs = problems();
  for (const e of errs) console.error(`FAIL  ${e}`);
  if (errs.length) process.exit(1);
  const id = flag("--box");
  if (id !== undefined) {
    const box = canvasBox(dir, id);
    if (!box) { console.error(`no box ${id}; the canvas has ${CANVAS.boxes.map((b) => b.id).join(", ")}`); process.exit(2); }
    if (process.argv.includes("--json")) console.log(JSON.stringify(box, null, 2));
    else console.log(`${box.label} (${box.owner}, ${box.status})\n  ${box.ask}\n  reads ${box.record}${box.attribute === "." ? "" : `.${box.attribute}`} at ${box.refs.join(", ")}\n${box.unlocks.map((u) => `  unlocks ${u.kind === "gate" ? `the ${u.phase} gate (${u.gate})` : u.kind === "workflow" ? `${u.function} workflow ${u.workflow}` : `${u.record} (${u.field})`}`).join("\n")}`);
  } else {
    const c = leanCanvas(dir);
    if (process.argv.includes("--json")) console.log(JSON.stringify(c, null, 2));
    else {
      console.log(`Lean Canvas for ${c.venture}, ${c.phase}. Gate: ${c.gate.name}. Next: ${c.next ?? "every box is confirmed"}.`);
      c.roadmap.forEach((r, i) => {
        const b = c.boxes.find((x) => x.id === r.box);
        if (b) console.log(`${String(i + 1).padStart(2)}. ${b.label.padEnd(26)} ${b.owner.padEnd(20)} ${String(b.status).padEnd(9)} ${b.unlocks.length} unlocks  ${r.why}`);
      });
    }
  }
}
