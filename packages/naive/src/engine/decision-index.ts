#!/usr/bin/env node
// The live decision index (system/decision-index). The docket (rank(), ownScore() in decisions.ts) says
// which open decisions matter now; the index wraps it and keeps it current from the provenance stream:
//
//   1. structural impact for every decision, open or decided (impact.ts structural()): the records it
//      would change, the records that read them or refer to their type, the functions they fall in, and
//      the decisions linked to it (parent, children, held by, blocks, conflicts, shared records);
//   2. a weight per decision: phase weight (1 in the venture's phase, halved for each phase further
//      out), lifted to 1 when a heavy requirement pins it, and heavier for one-way doors, the foundation
//      and requirements;
//   3. requirements (foundation/requirements/<id>.json, when a venture has them): a decision that
//      violates one is flagged now, whatever phase the requirement holds in (a structural check only:
//      relation "violates", or an answer that fails the requirement's check pattern);
//   4. update: every run re-scores every active decision (a score moves with time, as a due date
//      passes, and with files outside provenance, so no cached entry is reused); the cursor only
//      counts the provenance events since the last run;
//   5. rank history: each re-score appends {at, decision, rank, score, why, cause} to
//      .naive/decision-index-history.jsonl;
//   6. the decision queue (packages/naive/src/engine/decision-queue.ts, EE-127): each decision's owning function,
//      the score ranked within each function (by_function), themes of decisions on the same record or handoff, and
//      one short queue across functions, the score weighted by the function's weight in the venture's phase.
//
// The index is a cache (.naive/decision-index.json, gitignored), recomputed in full on every run and
// never written to provenance. Qualitative notes are an agent's draft: note is null until one writes it, and only decisions above the threshold get one.
//
//   node packages/naive/src/engine/decision-index.ts <venture dir> [update | rebuild | read] [--since <iso>] [--json]
//   mentura index --venture <id> [--since <iso>] [--rebuild]
//   route system/decision-index (run: input value update, rebuild or read; view)

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { entries as provenance } from "../core/provenance.ts";
import { decisionFile, decisions, ownScore, PHASES } from "./decisions.ts";
import { structural, ventureRecords } from "./impact.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { line } from "./detectors.ts";
import { rank } from "./decision-queue.ts";
import type { RankedDecision } from "./decisions.ts";
import type { DecisionRecord, Requirement } from "../records/types/records.d.ts";

/** A requirement as the index reads it, with its file. phase and check are read when a requirement carries them. */
export type IndexedRequirement = Requirement & { file: string; phase?: string; check?: { answer_must_match?: string; answer_must_not_match?: string } };
/** A decision record as read, or {} for a decision with no file. */
type Raw = Partial<DecisionRecord>;
/** A link from one decision to another. */
export type Link = { to: string; kind: keyof typeof STRENGTH; strength: number };
/** A requirement a decision violates now. */
export type Violation = { requirement: string; why: string; holds_in?: string | null };

export const INDEX = ".naive/decision-index.json";
export const HISTORY = ".naive/decision-index-history.jsonl";
export const REQUIREMENTS = "foundation/requirements";
/** Propagation stops when an update's weight falls below this. The index records the decision-index-note
 *  detector's line (packages/naive/src/engine/detectors.ts), with this as the fallback. */
export const THRESHOLD = 0.25;
/** Link strengths between decisions. */
export const STRENGTH = { parent: 0.8, child: 0.8, held_by: 0.8, holds: 0.8, blocks: 0.9, blocked_by: 0.9, conflicts: 0.7, record: 0.5, requirement: 0.6 };
/** A requirement at or above this weight pins a later-phase decision into the current phase. */
export const HEAVY_REQUIREMENT = 0.5;

const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const stamp = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");
const ACTIVE = (d: RankedDecision) => !["done", "withdrawn"].includes(d.render) && d.source !== "root";

/** The venture's requirements, by id. None is fine: the index works without them. */
export function requirements(dir: string): Map<string, IndexedRequirement> {
  const at = ventureFile(dir, REQUIREMENTS);
  if (!existsSync(at)) return new Map();
  return new Map(readdirSync(at).filter((f) => f.endsWith(".json")).map((f): [string, IndexedRequirement] => {
    const r: IndexedRequirement = load(join(at, f));
    return [r.id ?? f.replace(/\.json$/, ""), { ...r, id: r.id ?? f.replace(/\.json$/, ""), file: `${REQUIREMENTS}/${f}` }];
  }));
}

/** Phase weight: 1 in the venture's phase or earlier, halved for each phase further out. */
export function phaseWeight(neededIn: string | null | undefined, phase: string): number {
  const gap = neededIn ? PHASES.indexOf(neededIn) - PHASES.indexOf(phase) : 0;
  return gap > 0 ? 0.5 ** gap : 1;
}

// A requirement's weight, 0 to 1 (default 0.5).
const reqWeight = (r: IndexedRequirement | undefined) => Math.max(0, Math.min(1, typeof r?.weight === "number" ? r.weight : 0.5));

/** The weight of one decision: phase weight, the requirement lift, and how heavy it is. */
export function weigh(d: Pick<RankedDecision, "needed_in" | "part_of" | "source">, raw: Raw, phase: string, reqs: Map<string, IndexedRequirement>) {
  const why: string[] = [];
  let pw = phaseWeight(d.needed_in, phase);
  const links = (raw.requirements ?? []).map((l) => ({ ...l, requirement: reqs.get(l.id) })).filter((l) => l.requirement && l.requirement.status !== "deleted");
  const pin = links.filter((l) => l.relation !== "violates" && reqWeight(l.requirement) >= HEAVY_REQUIREMENT).sort((a, b) => reqWeight(b.requirement) - reqWeight(a.requirement))[0];
  let lifted_by: string | null = null;
  if (pw < 1 && pin) { pw = 1; lifted_by = pin.id; why.push(`requirement ${pin.id} pins it to this phase`); }
  else if (pw < 1) why.push(`needed in ${d.needed_in}: a draft at ${pw} weight`);
  let heavy = 1;
  if (raw.door === "one-way") { heavy *= 1.5; why.push("a one-way door"); }
  if (d.part_of === "foundation" || d.source === "foundation") { heavy *= 1.5; why.push("part of the foundation"); }
  if (links.length) heavy *= 1 + Math.max(...links.map((l) => reqWeight(l.requirement))) / 2;
  return { phase: pw, heavy: Math.round(heavy * 100) / 100, total: Math.round(pw * heavy * 100) / 100, lifted_by, why };
}

/** Requirements a decision violates now: a structural check, never a model's. */
export function violations(raw: Raw, reqs: Map<string, IndexedRequirement>): Violation[] {
  const out: Violation[] = [];
  for (const l of raw.requirements ?? []) {
    const r = reqs.get(l.id);
    if (!r) { out.push({ requirement: l.id, why: `names requirement ${l.id}, which does not exist` }); continue; }
    if (r.status === "deleted") { out.push({ requirement: r.id, why: `names requirement ${r.id}, which ${r.deleted?.by ?? "someone"} deleted at ${r.deleted?.at ?? "an unknown time"}: ${r.deleted?.why ?? ""}`.trim() }); continue; }
    if (l.relation === "violates") { out.push({ requirement: r.id, why: `violates ${r.id}: ${r.statement ?? ""}`.trim(), holds_in: r.phase ?? null }); continue; }
    const answer = typeof raw.answer === "string" ? raw.answer : null;
    if (answer && r.check?.answer_must_match && !new RegExp(r.check.answer_must_match, "i").test(answer)) out.push({ requirement: r.id, why: `its answer does not meet ${r.id}: ${r.statement ?? ""}`.trim(), holds_in: r.phase ?? null });
    if (answer && r.check?.answer_must_not_match && new RegExp(r.check.answer_must_not_match, "i").test(answer)) out.push({ requirement: r.id, why: `its answer breaks ${r.id}: ${r.statement ?? ""}`.trim(), holds_in: r.phase ?? null });
  }
  return out;
}

// Everything one pass needs, read once.
function context(dir: string, now: number) {
  const m = decisions(dir, now);
  const reqs = requirements(dir);
  const all = { provenance: provenance(dir), files: ventureRecords(dir) };
  const raw = new Map(m.decisions.map((d): [string, Raw] => {
    const f = d.source === "file" ? (d.file ?? decisionFile(dir, d.id)) : null;
    return [d.id, f && existsSync(ventureFile(dir, f)) ? load(ventureFile(dir, f)) : {}];
  }));
  const impacts = new Map(m.decisions.map((d) => [d.id, structural(dir, { ...raw.get(d.id), decides: d.decides }, { all })]));
  return { m, reqs, raw, impacts, byId: new Map(m.decisions.map((d) => [d.id, d])) };
}
/** Everything one pass needs. */
type Context = ReturnType<typeof context>;
/** A decision's structural impact. context() builds one for every decision, so the lookup always finds it. */
const impactOf = (ctx: Context, id: string) => ctx.impacts.get(id) as NonNullable<ReturnType<Context["impacts"]["get"]>>;

/** The decisions linked to one decision, each with the link's kind and strength. */
export function links(id: string, ctx: Context): Link[] {
  const d = ctx.byId.get(id);
  if (!d || d.source === "root") return [];
  const raw = ctx.raw.get(id) ?? {};
  const out: Link[] = [];
  // The roots (venture, foundation) hold everything, so they carry no propagation.
  const add = (to: string | null | undefined, kind: Link["kind"]) => { if (to && to !== id && ctx.byId.has(to) && ctx.byId.get(to)?.source !== "root") out.push({ to, kind, strength: STRENGTH[kind] }); };
  add(d.parent, "parent");
  add(d.held_by, "held_by");
  for (const x of ctx.m.decisions) {
    if (x.parent === id) add(x.id, "child");
    if (x.held_by === id) add(x.id, "holds");
    if ((ctx.raw.get(x.id)?.blocks ?? []).includes(id)) add(x.id, "blocked_by");
    if ((ctx.raw.get(x.id)?.conflicts ?? []).includes(id)) add(x.id, "conflicts");
  }
  for (const b of raw.blocks ?? []) add(b, "blocks");
  for (const c of raw.conflicts ?? []) add(c, "conflicts");
  const mine = impactOf(ctx, id);
  const touched = new Set([...mine.changed, ...mine.records]);
  const reqIds = new Set((raw.requirements ?? []).map((r) => r.id));
  for (const x of ctx.m.decisions) {
    if (x.id === id) continue;
    const other = impactOf(ctx, x.id);
    if (other.changed.some((f) => touched.has(f))) add(x.id, "record");
    if ((ctx.raw.get(x.id)?.requirements ?? []).some((r) => reqIds.has(r.id))) add(x.id, "requirement");
  }
  // One link per target: the strongest.
  const best = new Map<string, Link>();
  for (const l of out) { const b = best.get(l.to); if (!b || b.strength < l.strength) best.set(l.to, l); }
  return [...best.values()];
}

/** One decision's index entry: the docket's score wrapped with impact, weight and requirements. */
function entry(d: RankedDecision, ctx: Context, now: number) {
  const raw = ctx.raw.get(d.id) ?? {};
  const im = impactOf(ctx, d.id);
  const ls = links(d.id, ctx);
  const w = weigh(d, raw, ctx.m.phase, ctx.reqs);
  const flags = violations(raw, ctx.reqs);
  // The docket's rank when it ranks this decision; otherwise its own score plus what waits on it.
  const own = ownScore(d, ctx.m.phase, now);
  const below = ctx.m.decisions.filter((x) => x.held_by === d.id || x.parent === d.id).length;
  const base = d.rank ?? own.score + 12 * below;
  const reach = 2 * im.records.length + 3 * im.functions.length + 2 * ls.length;
  const score = Math.round((base + reach + 50 * flags.length) * w.total);
  const why = [...(d.why ?? own.why), ...(im.functions.length ? [`touches ${im.functions.join(", ")}`] : []), ...w.why, ...flags.map((f) => f.why)];
  return {
    id: d.id, question: d.question, render: d.render, status: d.status, needed_in: d.needed_in, docket_rank: d.rank ?? null, score,
    weight: { phase: w.phase, heavy: w.heavy, total: w.total, lifted_by: w.lifted_by },
    impact: { changed: im.changed, records: im.records, functions: im.functions, decisions: ls.map((l) => ({ id: l.to, link: l.kind })) },
    requirements: (raw.requirements ?? []).map((r) => ({ id: r.id, relation: r.relation })), flags, why, note: null,
  };
}

/** One decision's index entry, ranked. */
export type IndexEntry = ReturnType<typeof entry> & { rank: number };

const order = (es: ReturnType<typeof entry>[]): IndexEntry[] => es.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).map((e, i) => ({ ...e, rank: i + 1 }));

// The queue, the per-function index and the themes over the ranked entries (decision-queue.ts).
const ranking = (dir: string, ctx: Context, entries: IndexEntry[]) => rank(dir, ctx.m.phase, entries.map((e) => ({ entry: e, decision: ctx.byId.get(e.id) ?? {}, raw: ctx.raw.get(e.id) ?? {} })));

/** One rank history line. */
export type HistoryRow = { at: string; decision: string; rank: number; score: number; why: string[]; cause: string };

function history(dir: string, rows: HistoryRow[]) {
  if (!rows.length) return;
  mkdirSync(join(dir, ".naive"), { recursive: true });
  appendFileSync(join(dir, HISTORY), rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
}

/** The index as written to .naive/decision-index.json. */
export type DecisionIndex = {
  venture: string; phase: string; built_at: string; updated_at: string; threshold: number;
  cursor: { events: number; hash: string | null };
  last_update: { mode: "rebuild" | "update"; events: number; seeds: string[]; touched: { id: string; weight: number }[]; removed?: string[] };
  entries: IndexEntry[];
} & Partial<ReturnType<typeof rank>>;

function save(dir: string, idx: DecisionIndex): DecisionIndex {
  mkdirSync(join(dir, ".naive"), { recursive: true });
  writeFileSync(join(dir, INDEX), JSON.stringify(idx, null, 2) + "\n");
  return idx;
}

/** The index as last written, or null. */
export function read(dir: string): DecisionIndex | null {
  return existsSync(join(dir, INDEX)) ? load(join(dir, INDEX)) : null;
}

/** Rebuilds the whole index and records every active decision's rank. */
export function rebuild(dir: string, { now = Date.now(), cause = "rebuild" }: { now?: number; cause?: string } = {}): DecisionIndex {
  const ctx = context(dir, now);
  const log = provenance(dir);
  const entries = order(ctx.m.decisions.filter(ACTIVE).map((d) => entry(d, ctx, now)));
  const at = stamp();
  history(dir, entries.map((e) => ({ at, decision: e.id, rank: e.rank, score: e.score, why: e.why, cause })));
  return save(dir, { venture: ctx.m.venture, phase: ctx.m.phase, built_at: at, updated_at: at, threshold: line(dir, "decision-index-note", THRESHOLD),
    cursor: { events: log.length, hash: log.at(-1)?.hash ?? null }, last_update: { mode: "rebuild", events: log.length, seeds: [], touched: entries.map((e) => ({ id: e.id, weight: 1 })) }, entries, ...ranking(dir, ctx, entries) });
}

/** Re-scores every active decision, as a rebuild does: scores depend on time (due, overdue) and on
 *  files outside provenance, so no cached entry can be reused. Appends history only for decisions
 *  whose rank or score moved, and counts the provenance events since the cursor (or since a time). */
export function update(dir: string, { now = Date.now(), since }: { now?: number; since?: string } = {}): DecisionIndex {
  const idx = read(dir);
  if (!idx) return rebuild(dir, { now, cause: "first build" });
  const log = provenance(dir);
  const events = since ? log.filter((e: { at: string }) => e.at >= since) : log.slice(Math.min(idx.cursor?.events ?? 0, log.length));
  const ctx = context(dir, now);
  const prior = new Map(idx.entries.map((e) => [e.id, e]));
  const ranked = order(ctx.m.decisions.filter(ACTIVE).map((d) => entry(d, ctx, now)));
  const moved = ranked.filter((e) => prior.get(e.id)?.rank !== e.rank || prior.get(e.id)?.score !== e.score);
  const at = stamp();
  history(dir, moved.map((e) => ({ at, decision: e.id, rank: e.rank, score: e.score, why: e.why, cause: prior.has(e.id) ? "rank moved" : "new decision" })));
  const active = new Set(ranked.map((e) => e.id));
  return save(dir, { venture: ctx.m.venture, phase: ctx.m.phase, built_at: idx.built_at, updated_at: at, threshold: line(dir, "decision-index-note", THRESHOLD), cursor: { events: log.length, hash: log.at(-1)?.hash ?? null },
    last_update: { mode: "update", events: events.length, seeds: [], touched: moved.map((e) => ({ id: e.id, weight: 1 })), removed: [...prior.keys()].filter((id) => !active.has(id)) }, entries: ranked, ...ranking(dir, ctx, ranked) });
}

/** A decision's rank over time, from the history. */
export function rankHistory(dir: string, id?: string): HistoryRow[] {
  const f = join(dir, HISTORY);
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").split("\n").filter(Boolean).map((l): HistoryRow => JSON.parse(l)).filter((r) => !id || r.decision === id);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const dir = argv[0];
  const mode = ["update", "rebuild", "read"].find((m) => argv.includes(m)) ?? "update";
  const since = argv.includes("--since") ? argv[argv.indexOf("--since") + 1] : undefined;
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/engine/decision-index.ts <venture dir> [update | rebuild | read] [--since <iso>] [--json]"); process.exit(2); }
  const idx = mode === "rebuild" ? rebuild(dir) : mode === "read" ? (read(dir) ?? rebuild(dir)) : update(dir, { since });
  const brief = { venture: idx.venture, phase: idx.phase, updated_at: idx.updated_at, last_update: { mode: idx.last_update.mode, events: idx.last_update.events, touched: idx.last_update.touched.length },
    flagged: idx.entries.filter((e) => e.flags.length).map((e) => ({ id: e.id, flags: e.flags.map((f) => f.why) })),
    entries: idx.entries.map((e) => ({ rank: e.rank, id: e.id, score: e.score, weight: e.weight.total, render: e.render, functions: e.impact.functions, why: e.why })),
    by_function: idx.by_function ?? {}, themes: idx.themes ?? [], queue: idx.queue ?? [] };
  if (argv.includes("--json")) console.log(JSON.stringify(brief, null, 2));
  else {
    console.log(`${idx.venture} (${idx.phase}): ${idx.last_update.mode}, ${idx.last_update.events} events, ${idx.last_update.touched.length} re-scored`);
    for (const e of brief.entries) console.log(`${String(e.rank).padStart(3)}. ${e.id.padEnd(40)} ${String(e.score).padStart(5)}  x${e.weight}  ${e.why.join("; ")}`);
    for (const f of brief.flagged) console.log(`flagged ${f.id}: ${f.flags.join("; ")}`);
    if (brief.queue.length) console.log("queue:");
    for (const q of brief.queue) console.log(`${String(q.rank).padStart(3)}. ${q.id.padEnd(40)} ${String(q.score).padStart(7)}  ${q.function}${q.lead ? ` (${q.lead})` : ""}${q.members.length > 1 ? `, theme of ${q.members.length}` : ""}`);
  }
}
