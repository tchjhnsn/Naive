#!/usr/bin/env node
// The decision matrix (EE-054, EE-057): every decision a venture has open, by layer and phase,
// with its parent, its boundary and whether it renders now. Behaviors:
// packages/naive/src/functions/strategy/features/decisions.feature.
//
//   node packages/naive/src/engine/decisions.ts <venture or workspace dir> [--json | --md]
//
// Sources: decision records (decisions/*.decision.json beside the record they decide), foundation
// statements no person has confirmed, and agents' drafts of gated records waiting in _drafts/.
// Need-now suggestions, failing checks and forecasts are not gathered yet.
//
// Like React's error boundaries, a boundary holds for everything under it: the venture root and
// the foundation fail closed (a product-only workspace, venture.json kind "product", fails open),
// a product fails open, and any other decision inherits its parent's boundary unless it sets one.
// Under an open fail-closed decision, children wait and agents only draft (Suspense). A decision
// made before its parent last changed is stale and shown to the owner again (revalidation). Like
// a component rendered only when needed, a decision needed in a later phase is held back.
// In Discovery a decided decision is still a working draft (EE-057). A decision is decided only
// when a person approved its wording; provenance says who, when and in which phase (EE-058).
//
// render: overdue (open and past its due time), now (open, needed in this phase or earlier,
//   nothing above it open and fail-closed),
//   later (needed in a later phase; checked before waiting), waiting, stale, deferred, done, withdrawn.
// Exit 1 on a duplicate id, an unknown parent, a cycle, or an id that takes a reserved root name.

import { pathText } from "./merge.ts";
import { brief, type Candidate, type CandidateBrief, candidateFor, liveCandidates, optionsOf, proposesOf, withdrawnCandidate, writeOf } from "./decision-candidates.ts";
import { applySyncConflict, chosenValue, type SyncConflict } from "./sync-apply.ts";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative } from "node:path";
import { FRAME, foundation, type StatementReport } from "./foundation.ts";
import { actingAgent, agentFromEnv, record as prov } from "../core/provenance.ts";
import { canonical, glob as routeFileGlob, routes, type RecordRoute } from "../records/routes/routes.ts";
// Caching hook (F-12): the decision list is computed once per router action (packages/naive/src/engine/caching.ts).
import { memo } from "./caching.ts";
import { roles as ventureRoles } from "./venture-type.ts";
import { impact } from "./impact.ts";
import { mark } from "./stale.ts";
import { changedReasons, citesOf, stamp } from "./reasons.ts";
import { grantBacked, layoutOf, liveGrant, logicalFiles, readDelegation, scopeWithin, ventureFile } from "../core/venture-paths.ts";
import { readDataModel, schemaNameOf, venturePaths } from "../records/index.ts";
import { validateFile } from "../records/validate.ts";
import type { DataModel, DecisionRecord, DecisionRecordReason, DecisionRights, Delegation, People, StrategicFoundation, Venture } from "../records/types/records.d.ts";
import { now as clockNow, nowMs } from "../core/clock.ts";

/** Where a decision in the matrix comes from: a root, a decision record, an unconfirmed foundation statement or an agent's draft. */
export type DecisionSource = "root" | "file" | "foundation" | "draft";
/** What a decision decides: a record type, a venture-relative file, or both. */
export type Decides = { record: string | null; path?: string };
/** A decision gathered for the matrix, before its boundary and render state are resolved. A file's entry carries its record's fields. */
type Entry = Omit<DecisionRecord, "layer" | "decides" | "boundary" | "parent"> & {
  source: DecisionSource;
  layer: string;
  decides?: Decides;
  boundary: "fail-closed" | "fail-open" | "inherit";
  parent: string | null;
  file?: string;
  part_of?: "foundation";
  statement_status?: string;
};
/** One foundation statement as foundation.ts reports it, with its status. */
/** A delegation grant. */
type Grant = Delegation["grants"][number];
/** A person in people/people.json. */
type Person = People["people"][number];
/** What ownScore reads from a decision. */
// status is optional and outcomes need only a total: a docket scenario (docket-eval.ts) ranks decisions that carry
// no status and count outcomes without due dates, and ownScore reads nothing more.
export type Scorable = Pick<ResolvedDecision, "id"> & Partial<Pick<ResolvedDecision, "status" | "render" | "boundary" | "due" | "stale_because" | "reasons_changed" | "unlocks" | "part_of" | "awaiting" | "reasons" | "one_way">>
  & { outcomes?: Pick<NonNullable<ResolvedDecision["outcomes"]>, "total"> };
/** A boundary once inheritance is resolved. */
export type Boundary = "fail-closed" | "fail-open";
/** How a decision renders in the matrix. */
export type Render = "withdrawn" | "deferred" | "stale" | "overdue" | "done" | "later" | "waiting" | "now";
/** How a person settles an open decision (actionFor). */
export type Action = { kind: "decide" | "accept" | "confirm" | "write" | "settle"; command: string; confirm?: string | null; route?: string | null; statement?: string };
/** A decision as the matrix resolves it: its boundary, lane, render state, what holds it, and what it carries from its record. */
export type ResolvedDecision = {
  id: string;
  question: string;
  source: DecisionSource;
  layer: string;
  parent: string | null;
  boundary: Boundary;
  lane: "sync" | "async";
  needed_in: string | null;
  status: DecisionRecord["status"];
  render: Render;
  firmness: "open" | "working" | "firm";
  held_by?: string;
  due?: string;
  due_in_hours?: number;
  part_of?: "foundation";
  decides?: Decides;
  file?: string;
  answer?: string | null;
  options?: DecisionRecord["options"];
  /** The ideas on the table (EE-211), each without its body: an undecided record holds several at once. */
  candidates?: CandidateBrief[];
  statement?: DecisionRecord["statement"];
  version?: DecisionRecord["version"];
  applies_to?: DecisionRecord["applies_to"];
  decided_at?: DecisionRecord["decided_at"];
  ideas?: string[];
  awaiting?: "approval";
  provenance?: DecisionRecord["provenance"];
  reasons?: DecisionRecordReason[];
  reasons_changed?: { ref: string; claim: string; kind: string }[];
  stale_because?: "reasons";
  outcomes?: { total: number; pending: number; due: string[] };
  unlocks?: string[];
  /** A one-way door: the record says door one-way, or its class is one of the delegation's one_way_doors. */
  one_way?: true;
  action?: Action;
};
/** A why entry with the refs its reasons cite. */
export type WhyCite = { why: string; cites: string[] };
/** A resolved decision ranked: rank is null for one that does not render now, overdue or stale. */
export type RankedDecision = ResolvedDecision & { rank: number | null; why?: string[]; why_cites?: WhyCite[] };
/** A venture's decision matrix. */
export type Matrix = { venture: string; phase: Venture["phase"]; kind: "product" | "venture"; errors: string[]; decisions: RankedDecision[] };
/** A decision record as an agent drafts it: any of its fields, checked against the schema before it is written. */
/** A reason as a caller gives it: the schema check, not the type, holds kind to for, against or context. */
export type ReasonInput = Omit<DecisionRecordReason, "kind"> & { kind: string };
// What a caller may pass for a record. The doors check it against the schema, so the fields a caller
// often builds from strings (status, layer, needed_in, a reason's kind) are strings here.
type Draft = Omit<Partial<DecisionRecord>, "needed_in" | "layer" | "status" | "reasons"> & { needed_in?: string; layer?: string; status?: string; reasons?: ReasonInput[] };
/** Fields only approve, merge and rollback write: an agent may send them, and propose drops them. */
type ServerWritten = "version" | "versions" | "merged" | "rolled_back_from" | "proposed";
/** What an agent may propose: a draft, the folder beside the record it decides (at) and the file's name. */
export type ProposeInput = Omit<Draft, ServerWritten> & { [K in ServerWritten]?: unknown } & { at?: string; name?: string };
/** What impact.ts returns for a merged version: its map file, how many records it affects, and per function. */
export type ImpactSummary = { file: string; affected: number; functions: { function: string; affected: number; proposed: string[] }[] };
/** What a decision door returns: a refusal with its reason, or what it did. */
export type DoorResult<T> = { ok: false; error: string; result?: undefined } | { ok: true; result: T; error?: undefined };

const repo = new URL("../../../..", import.meta.url).pathname;
const load = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const MODEL: DataModel = readDataModel();
export const PHASES = ["discovery", "validation", "beachhead", "scale", "platform"];
const glob = (g: string) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*") + "$");
const FOUNDATION_RECORDS = new Set<string | null | undefined>((FRAME as StrategicFoundation).questions.flatMap((q) => q.statements).map((s) => s.record).filter(Boolean));

/** The record type a venture-relative file belongs to. */
export function recordOf(file: string): string | null {
  return MODEL.records.find((r) => r.level === "venture" && venturePaths(r).some((p) => glob(p).test(file)))?.id ?? null;
}

// Every *.decision.json in a venture, outside drafts, hidden folders and nested ventures.
export function decisionFiles(dir: string, sub = ""): string[] {
  // A structured venture (EE-086): its decision files by their logical paths.
  if (!sub && layoutOf(dir) !== "flat") return logicalFiles(dir).filter((r: string) => r.endsWith(".decision.json") && r.split("/").at(-2) === "decisions" && !r.split("/").some((s) => s.startsWith(".") || s.startsWith("_")));
  return readdirSync(ventureFile(dir, sub), { withFileTypes: true }).flatMap((e) => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) return e.name.startsWith(".") || e.name.startsWith("_") || existsSync(join(dir, rel, "venture.json")) ? [] : decisionFiles(dir, rel);
    return e.name.endsWith(".decision.json") && sub.split("/").at(-1) === "decisions" ? [rel] : [];
  });
}

/** The record a decision file decides by convention: decisions/<record>[.<topic>].decision.json decides
 *  <record>.json in the folder that holds decisions/. A record's own decides.path overrides it. */
export function decidedPath(file: string): string {
  const at = file.split("/").slice(0, -2).join("/"), base = (file.split("/").at(-1) ?? "").split(".")[0];
  return at ? `${at}/${base}.json` : `${base}.json`;
}

/** Every decision of a venture, resolved: boundary, render state and what holds it. */
// Caching hook (F-12): without an explicit now, one action shares one decision list; now is the action's.
// now may be a Date or a string, as callers pass it; Number() reads it as the arithmetic below always did.
export function decisions(dir: string, now?: number | string | Date): Matrix {
  return now === undefined ? memo("decisions", () => decisionsAt(dir), { dir }) : decisionsAt(dir, Number(now));
}
function decisionsAt(dir: string, now = Date.parse(process.env.DECISIONS_NOW ?? "") || nowMs()): Matrix {
  const venture: Venture = load(join(dir, "venture.json"));
  const phase = PHASES.indexOf(venture.phase);
  const productOnly = venture.kind === "product";
  const report: { statements: StatementReport[] }[] = foundation(dir);
  const statements = report.flatMap((q) => q.statements);
  const settled = statements.filter((s) => s.status !== "planned").every((s) => s.status === "confirmed");
  const errors: string[] = [];
  const doors = oneWayDoors(dir);

  const list: Entry[] = [
    { id: "venture", question: `Build ${venture.name} as a venture`, source: "root", layer: "governance", parent: null, boundary: productOnly ? "fail-open" : "fail-closed", status: "decided", decided_at: null },
    { id: "foundation", question: `Settle the strategic foundation (${statements.filter((s) => !["confirmed", "planned"].includes(s.status)).length} statements open)`, source: "root", layer: "purpose", parent: "venture", boundary: productOnly ? "fail-open" : "fail-closed",
      status: settled ? "decided" : "open", decided_at: null, needed_in: venture.phase },
  ];
  for (const f of decisionFiles(dir)) {
    const d: DecisionRecord = load(ventureFile(dir, f));
    const path = d.decides?.path ?? decidedPath(f);
    const record = d.decides?.record ?? recordOf(path);
    const layer = d.layer ?? MODEL.records.find((r) => r.id === record)?.layer ?? f.split("/")[0];
    if (["venture", "foundation"].includes(d.id)) errors.push(`${f}: ${d.id} is a reserved root`);
    // Provenance (EE-058): a decision is decided only when a person approved its wording, at a
    // time and in a phase; an agent's wording waits for that approval.
    const pv = d.provenance;
    if (d.status === "decided" && !pv?.approved_by) errors.push(`${f}: decided, but names no one who decided`);
    else if (d.status === "decided" && pv && (!pv.approved_at || !pv.phase)) errors.push(`${f}: decided, but its provenance has no ${!pv.approved_at ? "approved_at" : "phase"}`);
    if (pv?.approved_by && d.decided_by && pv.approved_by !== d.decided_by) errors.push(`${f}: decided_by ${d.decided_by} differs from provenance.approved_by ${pv.approved_by}`);
    if (pv?.phase && PHASES.indexOf(pv.phase) > phase) errors.push(`${f}: approved in ${pv.phase}, a phase the venture has not reached`);
    for (const o of d.outcomes ?? []) if (["met", "partly", "missed"].includes(o.result ?? "") && !o.actual) errors.push(`${f}: outcome ${o.id} is ${o.result} but records no actual outcome`);
    if (d.duplicate_of !== undefined && d.status !== "withdrawn") errors.push(`${f}: duplicate_of ${d.duplicate_of}, but it is ${d.status}; a duplicate is withdrawn`);
    if (d.duplicate_of === d.id) errors.push(`${f}: is a duplicate of itself`);
    const boundary: Entry["boundary"] = d.boundary && d.boundary !== "inherit" ? d.boundary : record === "product" ? "fail-open" : "inherit";
    // A decision that settles a foundation statement is part of the foundation, not under it. One
    // about a foundation record waits on that record's open statement, set below, not the whole foundation.
    const parent = d.parent ?? (d.statement ? "venture" : null);
    list.push({ ...d, file: f, source: "file", decides: { record, path }, layer, boundary, parent, ...(d.statement ? { part_of: "foundation" } : {}) });
  }
  for (const d of list) if (d.duplicate_of && !list.some((x) => x.id === d.duplicate_of)) errors.push(`${d.file}: duplicate_of ${d.duplicate_of}, which is no decision here`);
  const covered = new Set(list.map((d) => d.statement).filter(Boolean));
  // The roll-up counts only the statements still open after decision records stand in for some.
  list[1].question = `Settle the strategic foundation (${statements.filter((s) => !["confirmed", "planned"].includes(s.status) && !s.derived_from && !list.some((d) => d.statement === s.id && d.status === "decided")).length} statements open)`;
  // A foundation statement no person has confirmed is a decision the founder still owes. It is
  // part of the foundation rather than under it, so the foundation does not hold it.
  for (const s of statements.filter((x) => !["confirmed", "planned"].includes(x.status) && !x.derived_from && !covered.has(x.id))) {
    const question = ({ missing: `Write the ${s.id} statement`, draft: `Accept the agent's draft of the ${s.id} statement`, agent: `Confirm the ${s.id} statement${s.agent_wrote ? " an agent wrote" : ""}` } as Record<string, string>)[s.status] ?? `Confirm the ${s.id} statement (${s.status})`;
    list.push({ id: `foundation-${s.id}`, question, source: "foundation", statement_status: s.status, layer: MODEL.records.find((r) => r.id === s.record)?.layer ?? "purpose",
      // Only a planned statement comes back without a record (foundation.ts statement()), and planned ones are skipped above.
      decides: { record: s.record ?? null, ...(s.path ? { path: s.path } : {}) }, parent: "venture", part_of: "foundation", boundary: "inherit", status: "open", needed_in: venture.phase });
  }
  const statementFor = (record: string | null | undefined) => list.find((x) => x.part_of === "foundation" && x.status === "open" && x.decides?.record === record);
  // An agent's draft of a gated record waits for a person to accept it.
  const drafts = existsSync(join(ventureFile(dir, "_drafts"))) ? readdirSync(join(ventureFile(dir, "_drafts"))).filter((f) => f.endsWith(".draft")).sort() : [];
  for (const d of drafts) {
    const path = d.replace(/\.draft$/, "").replace(/__/g, "/");
    const record = recordOf(path);
    // A draft of a foundation record is settled through its statement, which says to accept it. A statement names
    // one draft, so a collection with several drafts (two ICP profiles) has its statement accept the first, and every
    // other draft gets its own accept decision, part of the foundation like the statement.
    const s = statementFor(record);
    if (s?.statement_status === "draft" && !s.decides?.path) { s.decides = { record, path }; s.question = `Accept the agent's draft of ${path} (the ${s.id.replace(/^foundation-/, "")} statement)`; continue; }
    if (list.some((x) => x.decides?.path === path && (x.statement_status === "draft" || x.source === "draft"))) continue;
    // Never under its own open statement: accepting the draft is what settles the statement, so waiting on it would
    // hold the draft forever.
    list.push({ id: `draft-${path.replace(/[^a-z0-9]+/g, "-").replace(/-json$/, "")}`, question: `Accept the agent's draft of ${path}`, source: "draft",
      layer: MODEL.records.find((r) => r.id === record)?.layer ?? path.split("/")[0], decides: { record, path }, parent: "venture",
      ...(FOUNDATION_RECORDS.has(record) ? { part_of: "foundation" } : {}), boundary: "inherit", status: "open", needed_in: venture.phase });
  }
  // A decision about a foundation record waits on that record's open statement only, so one open
  // statement does not hold every decision about the foundation.
  for (const d of list) if (d.parent === null && d.source === "file") d.parent = (FOUNDATION_RECORDS.has(d.decides?.record) ? statementFor(d.decides?.record)?.id : null) ?? "venture";

  const byId = new Map<string, Entry>();
  for (const d of list) { if (byId.has(d.id)) errors.push(`decision ${d.id}: duplicate id`); else byId.set(d.id, d); }
  for (const d of list) if (d.parent && !byId.has(d.parent)) { errors.push(`decision ${d.id}: unknown parent ${d.parent}`); d.parent = "venture"; }
  const ancestors = (d: Entry) => {
    const out: Entry[] = [];
    for (let p = d.parent ? byId.get(d.parent) : undefined; p; p = p.parent ? byId.get(p.parent) : undefined) {
      if (p === d || out.includes(p)) { errors.push(`decision ${d.id}: its parents form a cycle`); break; }
      out.push(p);
    }
    return out;
  };
  const chains = new Map(list.map((d) => [d.id, ancestors(d)]));
  const boundaryOf = (d: Entry): Boundary => d.boundary !== "inherit" ? d.boundary : ((chains.get(d.id) ?? []).find((a): a is Entry & { boundary: Boundary } => a.boundary !== "inherit")?.boundary ?? "fail-closed");

  const resolved = list.map((d): ResolvedDecision => {
    const boundary = boundaryOf(d);
    // An open decision above that fails closed holds this one. As with React's error boundaries the
    // nearest boundary governs: a decision that fails open (a product) shields everything under it
    // from the fail-closed decisions above it.
    const holder = (() => {
      if (d.boundary === "fail-open") return null;
      for (const a of chains.get(d.id) ?? []) {
        if (a.boundary === "fail-open") return null;
        if (a.status !== "decided" && boundaryOf(a) === "fail-closed") return a;
      }
      return null;
    })();
    const parent = d.parent ? byId.get(d.parent) : undefined;
    const at = (x: Entry | undefined) => x?.provenance?.approved_at ?? x?.decided_at;
    const mine = at(d), theirs = at(parent);
    const parentStale = d.status === "decided" && mine && theirs && theirs > mine;
    // Reasons with citations: a decided decision whose frozen cited file changed is stale too.
    const changed: { ref: string; claim: string; kind: string }[] = d.source === "file" ? changedReasons(dir, d) : [];
    const stale = parentStale || changed.length > 0;
    // A due time is a real deadline: it overrides needed_in, and an open decision past it is overdue.
    const later = !d.due && d.needed_in && PHASES.indexOf(d.needed_in) > phase;
    const overdue = d.status === "open" && d.due && Date.parse(d.due) < now;
    const render: Render = d.status === "withdrawn" ? "withdrawn" : d.status === "deferred" ? "deferred" : stale ? "stale" : overdue ? "overdue"
      : d.status === "decided" ? "done" : later ? "later" : holder ? "waiting" : "now";
    const firmness = d.status !== "decided" ? "open" : venture.phase === "discovery" ? "working" : "firm";
    // Lane (EE-060): a fail-closed decision is on the venture's ordered path, so what is under it waits;
    // a fail-open one can move on its own, beside the rest, at whatever priority it ranks.
    const lane = boundary === "fail-open" ? "async" : "sync";
    return { id: d.id, question: d.question, source: d.source, layer: d.layer, parent: d.parent, boundary, lane, needed_in: d.needed_in ?? null, status: d.status, render, firmness,
      ...((render === "waiting" || (overdue && holder)) && holder ? { held_by: holder.id } : {}),
      ...(d.due ? { due: d.due, due_in_hours: Math.round((Date.parse(d.due) - now) / 36e5) } : {}), ...(d.part_of ? { part_of: d.part_of } : {}), ...(d.decides ? { decides: d.decides } : {}), ...(d.file ? { file: d.file } : {}), ...(d.answer ? { answer: d.answer } : {}), ...(d.options?.length ? { options: d.options } : {}),
      ...(liveCandidates(d).length ? { candidates: liveCandidates(d).map((c) => brief(c, d.decides?.path)) } : {}), ...(d.statement ? { statement: d.statement } : {}), ...(d.version ? { version: d.version } : {}), ...(d.applies_to?.length ? { applies_to: d.applies_to } : {}), ...(d.decided_at ? { decided_at: d.decided_at } : {}), ...(d.ideas?.length ? { ideas: d.ideas } : {}),
      ...(d.status === "open" && d.answer && d.provenance?.drafted_by?.kind === "agent" ? { awaiting: "approval" } : {}),
      ...(d.provenance ? { provenance: d.provenance } : {}),
      ...(d.reasons?.length ? { reasons: d.reasons } : {}),
      ...(changed.length ? { reasons_changed: changed.map(({ ref, claim, kind }) => ({ ref, claim, kind })) } : {}), ...(stale && !parentStale ? { stale_because: "reasons" } : {}),
      ...(d.outcomes?.length ? { outcomes: { total: d.outcomes.length, pending: d.outcomes.filter((o) => (o.result ?? "pending") === "pending").length,
        due: d.outcomes.filter((o) => (o.result ?? "pending") === "pending" && /^\d{4}-\d{2}-\d{2}/.test(o.by ?? "") && Date.parse(o.by ?? "") < now).map((o) => o.id) } } : {}),
      ...(d.unlocks?.length ? { unlocks: d.unlocks.map((u) => u.activity) } : {}),
      ...(d.door === "one-way" || (d.class !== undefined && doors.has(d.class)) ? { one_way: true as const } : {}),
      ...(["open", "deferred"].includes(d.status) ? { action: actionFor(d, venture.id) } : {}) };
  });
  return { venture: venture.id, phase: venture.phase, kind: productOnly ? "product" : "venture", errors, decisions: rank(resolved, venture.phase, now) };
}

// The route that writes a venture-relative file, for the commands a founder runs.
function routeOf(path: string | undefined, record: string | null | undefined): string | null {
  const r = routes().find((x): x is RecordRoute => x.kind === "record" && (path ? x.collection !== "list" && x.files.some((g) => routeFileGlob(g).test(path)) : (x.record === record || x.view_of === record) && x.collection !== "item"));
  if (!r) return null;
  return r.collection === "item" && path ? r.route.replace("[id]", (path.split("/").at(-1) ?? "").replace(/\.json$/, "")) : r.route;
}

/** How a person settles an open decision: the command to run, and the word to type to confirm it. */
export function actionFor(d: { id: string; question: string; source: DecisionSource; decides?: Decides; statement_status?: string }, venture: string): Action {
  const v = `--venture ${venture}`;
  if (d.source === "file") return { kind: "decide", confirm: d.id, command: `mentura decide ${d.id} ${v} --by <your name> [--answer "<your words>"]` };
  const route = routeOf(d.decides?.path, d.decides?.record);
  if (d.source === "draft" || d.statement_status === "draft") return { kind: "accept", route, confirm: route, command: `mentura accept ${route} ${v}` };
  if (d.source === "foundation" && d.statement_status === "agent") { const id = d.id.replace(/^foundation-/, ""); return { kind: "confirm", statement: id, confirm: id, command: `mentura confirm ${id} ${v}` }; }
  if (d.source === "foundation") return { kind: "write", route, command: `write ${route}${route ? "" : ` (${d.decides?.record})`} yourself, or ask an agent to draft it` };
  return { kind: "settle", command: d.question };
}

/** A decision's own weight, before anything that waits on it (EE-057): a deadline, a stale parent, what
 *  it unlocks, whether it settles the foundation, a draft ready to approve, outcomes to test. Scored for
 *  every open decision, so a gate can carry the weight of what it holds (packages/naive/src/engine/docket.ts). */
export function ownScore(d: Scorable, phase: string, now = nowMs()): { score: number; why: string[]; why_cites?: WhyCite[] } {
  const why: string[] = [];
  let s = 0;
  if (d.render === "overdue") { s += 100; why.push("past its due time"); }
  // Cost of delay grows as the deadline nears: 40 at three days, 60 at two, 120 at one, up to 300.
  // Further out, up to two weeks, a due date still counts, less the further it is (naive#72): 24 at five days, 9 at fourteen.
  else if (d.due) {
    const h = (Date.parse(d.due) - now) / 36e5;
    if (h <= 72) { s += Math.min(300, Math.round((60 * 48) / Math.max(h, 1))); why.push(`due in ${Math.max(0, Math.round(h))}h`); }
    else if (h <= 336) { s += Math.round((40 * 72) / h); why.push(`due in ${Math.round(h / 24)} days`); }
  }
  // An open fail-closed decision stops the work behind it until a person decides it (naive#72).
  if (d.status === "open" && d.boundary === "fail-closed") { s += 15; why.push("fails closed: the work behind it waits"); }
  // A one-way door is a person's alone and hard to undo, so it ranks above any placeholder the framework
  // raises (a foundation statement that fails closed scores 35 in Discovery).
  if (d.status === "open" && d.one_way) { s += 40; why.push("a one-way door: only you decide it, and it is hard to undo"); }
  // A why entry may carry cites (the refs a reason supplies); why stays a list of strings, and
  // why_cites pairs each cited entry with its refs (backward compatible).
  const cites: WhyCite[] = [];
  if (d.render === "stale" && d.stale_because !== "reasons") { s += 30; why.push("its parent changed after it was decided"); }
  else if (d.render === "stale") s += 30;
  for (const c of d.reasons_changed ?? []) { const w = `the reason you decided ${d.id} changed: ${c.ref}`; why.push(w); cites.push({ why: w, cites: [c.ref] }); }
  if (d.unlocks?.length) { s += 10 * d.unlocks.length; why.push(`unlocks ${d.unlocks.join("; ")}`); }
  if (d.part_of === "foundation") { s += phase === "discovery" ? 20 : 10; why.push("settles the strategic foundation"); }
  if (d.awaiting) { s += 8; why.push("an agent has drafted it: approving takes a minute"); }
  if (d.outcomes?.total) { s += 3 * d.outcomes.total; why.push(`${d.outcomes.total} expected outcome${d.outcomes.total > 1 ? "s" : ""} to test`); }
  // Cited reasons carry no weight of their own yet; they say what the decision rests on.
  const refs: string[] = d.status !== "decided" ? citesOf(d.reasons) : [];
  const nReasons = d.reasons?.length ?? 0;
  if (refs.length) { const w = `rests on ${nReasons} reason${nReasons > 1 ? "s" : ""} citing ${refs.length} source${refs.length > 1 ? "s" : ""}`; why.push(w); cites.push({ why: w, cites: refs }); }
  return { score: s, why, ...(cites.length ? { why_cites: cites } : {}) };
}

/** Which open decisions matter most now, and why (EE-057): a decision's own weight plus 12 for each
 *  decision that waits on it. Ranks the decisions that render now, overdue or stale; the others keep
 *  rank null. Higher first; ties keep their order. */
export function rank(ds: ResolvedDecision[], phase: string, now = nowMs()): RankedDecision[] {
  const below = (id: string) => ds.filter((x) => x.held_by === id || x.parent === id).length;
  const scored = ds.map((d): RankedDecision => {
    if (!["now", "overdue", "stale"].includes(d.render) || d.source === "root") return { ...d, rank: null };
    const { score, why, why_cites } = ownScore(d, phase, now);
    const n = below(d.id);
    // Kept in the order the reasons were always given: deadline and staleness first, then what waits.
    const first = /due|parent changed|reason you decided/;
    if (n) why.splice(why.findIndex((w) => !first.test(w)) === -1 ? why.length : why.findIndex((w) => !first.test(w)), 0, `${n} decision${n > 1 ? "s" : ""} wait on it`);
    return { ...d, rank: score + 12 * n, why, ...(why_cites ? { why_cites } : {}) };
  });
  const order = scored.map((d, i): [RankedDecision, number] => [d, i]).sort(([a, i], [b, j]) => (b.rank ?? -1) - (a.rank ?? -1) || i - j).map(([d]) => d);
  return order;
}

export function holding(dir: string, file: string): { id: string; why: string } | null {
  if (!existsSync(join(dir, "venture.json"))) return null;
  const record = recordOf(file);
  const m = decisions(dir).decisions.find((d) => d.source === "file" && (d.decides?.path === file || (!d.decides?.path && d.decides?.record === record))
    && (d.render === "waiting" || d.render === "stale" || (d.status === "open" && d.boundary === "fail-closed")));
  return m ? { id: m.id, why: m.render === "waiting" ? `waits on ${m.held_by}` : m.render === "stale" ? "is stale" : "is open and fails closed" } : null;
}

/** One open decision over a record, as a read reports it (EE-211). */
export type Undecided = { decision: string; question: string; status: DecisionRecord["status"]; options: string[]; candidates: (Candidate & { proposes: string })[]; decide: string };

/** What an agent reading a record has to know before it writes one (EE-211): the decisions still open over
 *  that record, with every idea on the table, so it reads all the live options instead of guessing one. Each
 *  candidate comes whole, body and all, because this is where the ideas are compared. Reads the decision
 *  files, not the matrix, so a record read costs no more than it did. */
export function undecidedFor(dir: string, file: string, venture?: string): Undecided[] {
  if (!existsSync(join(dir, "venture.json"))) return [];
  const out: Undecided[] = [];
  // Caching hook (F-12): one action scans the decision files once, however many records it reads.
  const records = memo("decision-records", () => decisionFiles(dir).map((f): [string, DecisionRecord] => [f, load(ventureFile(dir, f))]), { dir });
  for (const [f, d] of records) {
    if (d.status !== "open" && d.status !== "deferred") continue;
    const path = d.decides?.path ?? decidedPath(f);
    if (path !== file) continue;
    const v = venture ? ` --venture ${venture}` : "";
    out.push({ decision: d.id, question: d.question, status: d.status, options: optionsOf(d),
      candidates: liveCandidates(d).map((c) => ({ ...c, proposes: proposesOf(c, path) })),
      decide: `mentura decide ${d.id}${v} --by <your name> --answer <${optionsOf(d).join("|") || "your words"}>` });
  }
  return out;
}

// Routes an unlock names are globs over routes, as in the team plan's robots.
const routeGlob = (g: string) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, ".*") + "$");

/** The decision that keeps a route closed to an actor (EE-058): an undecided decision that unlocks it. */
export function locked(dir: string, route: string, actorId?: string | null): { id: string; question: string } | null {
  if (!existsSync(join(dir, "venture.json"))) return null;
  const files = decisionFiles(dir).map((f): DecisionRecord => load(ventureFile(dir, f)));
  const d = files.find((x) => x.status !== "decided" && x.status !== "withdrawn" && (x.unlocks ?? []).some((u) =>
    (u.routes ?? []).some((g) => routeGlob(canonical(g)).test(canonical(route))) && (!u.for?.length || !actorId || u.for.includes(actorId))));
  return d ? { id: d.id, question: d.question } : null;
}

const runValidator = (d: unknown, schema: string): { status: number | null; stdout: string; stderr: string } => {
  const scratch = mkdtempSync(join(tmpdir(), "decision-"));
  const f = join(scratch, "d.json");
  writeFileSync(f, JSON.stringify(d));
  const v = validateFile(schema, f);
  rmSync(scratch, { recursive: true, force: true });
  return v;
};
const validate = (d: unknown, schema = "decision-record.schema.json") => {
  const v = runValidator(d, schema);
  return v.status === 0 ? null : (v.stdout + v.stderr).trim();
};
/** The schema errors of a record, one per line, or null when the validator could not run: validate.ts
 *  reports schema errors to stdout and exits 1, and anything else is a failure to check. */
const schemaErrors = (d: unknown, schema: string): string[] | null => {
  const v = runValidator(d, schema);
  if (v.status === 0) return [];
  return v.status === 1 && v.stdout.trim() && !v.stderr.trim() ? v.stdout.trim().split("\n") : null;
};
const fileOf = (dir: string, id: string): string | undefined => decisionFiles(dir).find((f) => load(ventureFile(dir, f)).id === id);
/** The venture-relative file of a decision record, by id. */
export const decisionFile = fileOf;

/** Whether an applies_to file is a relative path that stays inside the venture (no ".", "..", or empty segment, not absolute), so it has one spelling. */
const inside = (f: unknown) => typeof f === "string" && f !== "" && !isAbsolute(f) && !/^[a-zA-Z]:/.test(f) && !f.split(/[\\/]/).some((x) => ["", ".", ".."].includes(x));

/** An agent proposes a decision, or new wording for an open one. It stays open until a person
 *  approves it: an agent never decides (EE-058). at: the folder beside the record it decides. */
export function propose(dir: string, input: ProposeInput | null | undefined, { agentId, via = "router", harness, model }: { agentId?: string; via?: string; harness?: string; model?: string } = {}): DoorResult<{ proposed: string; file: string; awaiting: "approval"; provenance: string }> {
  // Version history, merge state and rollback lineage are written by approve/merge/rollback, never by an agent.
  const { at = "", name, version: _v, versions: _vs, merged: _m, rolled_back_from: _r, proposed: _p, ...rest }: ProposeInput = input ?? {};
  if (!rest.id || !rest.question) return { ok: false, error: "a decision needs an id and a question" };
  if (rest.status && rest.status !== "open") return { ok: false, error: "an agent may only propose an open decision; a person approves it" };
  const existing = fileOf(dir, rest.id);
  const file = existing ?? `${at ? `${at}/` : ""}decisions/${name ?? rest.id}.decision.json`;
  if (!existing && !/^([a-z0-9-]+\/)*decisions\/[a-z0-9.-]+\.decision\.json$/.test(file)) return { ok: false, error: `${file} is not a decisions/ path` };
  const outside = (rest.applies_to ?? []).find((t) => !inside(t?.file));
  if (outside) return { ok: false, error: `applies_to ${outside?.file} is not a path inside the venture` };
  const before: Partial<DecisionRecord> = existing ? load(ventureFile(dir, existing)) : {};
  const drafted_by = { kind: "agent" as const, ...(agentId ? { id: agentId } : {}) };
  let d: Draft;
  if (before.status === "decided") {
    // An agent never un-decides (EE-058): the decided version stays current, and the new wording waits
    // in proposed as a draft of the next version until a person approves it.
    if (!rest.answer) return { ok: false, error: `${rest.id} is decided; propose new wording as an answer, and a person approves it as the next version` };
    d = { ...before, proposed: { answer: rest.answer, ...(rest.options ? { options: rest.options } : {}), drafted_by, proposed_at: clockNow().toISOString().replace(/\.\d+Z$/, "Z") } };
  } else {
    // New wording for an open decision keeps what the agent did not restate: its parent, boundary, unlocks.
    if (rest.reasons) rest.reasons = stamp(dir, rest.reasons);
    d = { ...before, ...rest, status: "open", provenance: { drafted_by } };
  }
  const bad = validate(d);
  if (bad) return { ok: false, error: `does not match packages/naive/src/records/decision-record.schema.json:\n${bad}` };
  mkdirSync(dirname(ventureFile(dir, file)), { recursive: true });
  writeFileSync(ventureFile(dir, file), JSON.stringify(d, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "draft", agent: agentFromEnv("agent", via, { ...(agentId ? { id: agentId } : {}), ...(harness ? { harness } : {}), ...(model ? { model } : {}) }), note: `proposed decision ${d.id}` } as Parameters<typeof prov>[1]);
  return { ok: true, result: { proposed: rest.id, file, awaiting: "approval", provenance: e.hash } };
}

/** The decision with its current version moved into versions and the version number raised. */
function nextVersion(d: DecisionRecord): DecisionRecord {
  const { versions = [], ...cur } = d;
  const snap = { version: cur.version ?? 1, status: cur.status, answer: cur.answer ?? null, ...(cur.options ? { options: cur.options } : {}), ...(cur.provenance ? { provenance: cur.provenance } : {}), ...(cur.merged?.version === (cur.version ?? 1) ? { merged: cur.merged } : {}), superseded_at: clockNow().toISOString().replace(/\.\d+Z$/, "Z") };
  const { rolled_back_from, merged, proposed, ...rest } = cur;
  return { ...rest, version: (cur.version ?? 1) + 1, versions: [...versions, snap] };
}

type Fields = { [key: string]: unknown };
const setField = (o: Fields, path: string, v: unknown) => { const ks = path.split("."); let x = o; for (const k of ks.slice(0, -1)) x = (x[k] ??= {}) as Fields; x[ks.at(-1) as string] = v; };

/** Merge: apply a decided version's answer to the records it decides (applies_to). A separate step from
 *  approving, so it can be delegated: only a person may merge unless a delegation grant names merge for
 *  this decision's class (the delegation suite). Logged as a merge in provenance. Ends by building the
 *  decision's impact map (packages/naive/src/engine/impact.ts) and returns its summary. */
export function merge(dir: string, id: string, { by, role, via = "cli", note, today }: { by?: string; role?: string; via?: string; note?: string; today?: string } = {}): DoorResult<{ merged: string; version: number; files: string[]; grant?: string; variants_stale: string[]; provenance: string; impact: ImpactSummary | { error: string } }> {
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  if (!by && !role) return { ok: false, error: "merging needs the name of who merges (--by)" };
  const d: DecisionRecord = load(ventureFile(dir, file));
  if (d.status !== "decided") return { ok: false, error: `${id} is not decided; approve it before merging` };
  const sc = d.sync_conflict as SyncConflict | undefined;
  // A chosen candidate (EE-211) brings the record it proposes: its whole body, or the fields it patches.
  // One with neither is an option with provenance, so its label merges at applies_to the way an answer does.
  const chosen = candidateFor(d, d.answer);
  const cw = chosen ? writeOf(chosen, d.decides?.path ?? decidedPath(file)) : null;
  if (cw && !cw.ok) return { ok: false, error: `${id}: ${cw.error}` };
  const write = cw?.ok ? cw.write : null;
  const whole = write?.kind === "body" ? write : null, patch = write?.kind === "patch" ? write.targets : null;
  const value = write?.kind === "label" ? write.label : d.answer;
  if (!d.applies_to?.length && !sc && !whole && !patch) return { ok: false, error: `${id} names no applies_to: nothing to merge into` };
  const version = d.version ?? 1;
  if (d.merged?.version === version) return { ok: false, error: `${id} version ${version} is already merged` };
  // A sync conflict (EE-174) writes the chosen value at its path in its one file instead of an answer at applies_to.
  const targets = whole ? [{ file: whole.file, field: pathText([]) }] : patch ? patch.map((t) => ({ file: t.file, field: t.field }))
    : sc ? [{ file: sc.file, field: pathText(sc.path) }] : d.applies_to ?? [];
  const outside = targets.find((t) => !inside(t?.file));
  if (outside) return { ok: false, error: `${id} applies_to ${outside?.file} is not a path inside the venture` };
  const may = mayMerge(dir, d, { by, role, today });
  if (!may.ok) return { ok: false, error: may.error };
  by = by ?? role;
  const actor = role ? agentFromEnv("agent", via, { id: role }) : agentFromEnv("person", via, { id: by });
  // Every target is built and checked against its record type's schema before any is written.
  const recs = new Map<string, Fields>();
  const recordAt = (rel: string): Fields => { const f = ventureFile(dir, rel); return recs.get(rel) ?? (existsSync(f) ? load(f) : {}); };
  if (whole) recs.set(whole.file, whole.body as Fields);
  else if (patch) for (const t of patch) { const rec = recordAt(t.file); setField(rec, t.field, t.value); recs.set(t.file, rec); }
  else if (sc) {
    const picked = chosenValue(d.answer, sc);
    if (!picked.ok) return { ok: false, error: `${id}: ${picked.error}` };
    const f = ventureFile(dir, sc.file);
    const applied = applySyncConflict(existsSync(f) ? load(f) : {}, sc.path, picked.value);
    if (!applied.ok) return { ok: false, error: `${id}: ${applied.error}` };
    recs.set(sc.file, applied.record);
  }
  else for (const t of targets) {
    const rec = recordAt(t.file);
    setField(rec, t.field, value);
    recs.set(t.file, rec);
  }
  // Gaps the record already had (a field not written yet) do not block a merge; errors the answer adds
  // do. A record that does not exist yet has no gaps, so a new record must pass whole. A validator that
  // cannot run proves nothing, so it refuses the merge.
  for (const [rel, rec] of recs) {
    const stored = MODEL.records.find((r) => r.id === recordOf(rel))?.schema;
    const schema = stored && schemaNameOf(stored);
    if (!schema) continue;
    const f = ventureFile(dir, rel);
    const before = existsSync(f) ? schemaErrors(load(f), schema) : [];
    const after = schemaErrors(rec, schema);
    if (!before || !after) return { ok: false, error: `could not check ${rel} against schema/${schema}; nothing was written` };
    const added = after.filter((l) => !before.includes(l));
    if (added.length) return { ok: false, error: `merging ${id} would make ${rel} not match schema/${schema}; nothing was written:\n${added.join("\n")}` };
  }
  const files: string[] = [];
  for (const t of targets) {
    // A merge may create the record, in a folder the venture does not have yet.
    mkdirSync(dirname(ventureFile(dir, t.file)), { recursive: true });
    writeFileSync(ventureFile(dir, t.file), JSON.stringify(recs.get(t.file), null, 2) + "\n");
    prov(dir, { entity: t.file, route: "governance/decisions", activity: "write", agent: actor, decision: id, note: `merged ${id} version ${version}${chosen ? ` candidate ${chosen.id}` : ""} into ${t.field}` });
    files.push(t.file);
  }
  const out = { ...d, merged: { version, by, at: clockNow().toISOString().replace(/\.\d+Z$/, "Z"), files } };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "merge", agent: actor, note: note ?? `merged ${id} version ${version}${may.grant ? ` under grant ${may.grant}` : ""}` });
  // Public variants written from a merged field (MDX with variant_of: <file>#<field>) were worded from
  // the old version: they are marked stale so they are re-linted before the next publish (the hook
  // item 11, republish-on-change, builds on).
  const variants = targets.flatMap((t) => variantsOf(dir, t.file, t.field));
  if (variants.length) mark(dir, variants, { paths: files, version: String(version), via: "merge" });
  const im = impact(dir, id, { via });
  return { ok: true, result: { merged: id, version, files, ...(may.grant ? { grant: may.grant } : {}), variants_stale: variants, provenance: e.hash, impact: im.ok ? im.result as ImpactSummary : { error: im.error as string } } };
}

/** The venture's delegation record (governance/delegation.json, the delegation suite), or null. */
const delegationOf = (dir: string): Delegation | null => { const f = ventureFile(dir, "governance/delegation.json"); return existsSync(f) ? readDelegation(f) : null; };
/** The classes a venture treats as one-way doors: the template delegation's one_way_doors and the venture's own,
 *  which only add to them, as for merging. */
export function oneWayDoors(dir: string): Set<string> {
  let del: Delegation | null = null;
  try { del = delegationOf(dir); } catch {} // ranking still runs on a delegation file that does not parse; approve reports it
  const f = join(new URL("../../../..", import.meta.url).pathname, "packages/naive/template/governance/delegation.json");
  return new Set([...((load(f) as Delegation).one_way_doors ?? []), ...(del?.one_way_doors ?? [])]);
}
// Classes that are one-way doors: every class the decision-rights register marks escalate (the
// founder decides), plus production-ship. Built from the register so a class it escalates can never
// be merged by a role, and a venture's one_way_doors only adds to them.
let oneWayDefault: Set<string> | undefined;
export function oneWayClasses(): Set<string> {
  if (oneWayDefault) return oneWayDefault;
  const f = join(new URL("../../../..", import.meta.url).pathname, "packages/naive/template/governance/decision-rights.json");
  oneWayDefault = new Set(["production-ship", ...((load(f) as DecisionRights).classes ?? []).filter((c) => c.level === "escalate").map((c) => c.id)]);
  return oneWayDefault;
}

const rosterOf = (dir: string): Person[] => { const pf = ventureFile(dir, "people/people.json"); return existsSync(pf) ? load(pf).people ?? [] : []; };
/** Whether a role is a founding one, by the roles register (founder, co-founder, general partner). */
const founding = (role: string) => ventureRoles().some((r: { founder?: boolean; id: string }) => r.founder && r.id === role);

/** The venture's founders: named in governance/delegation.json, or holding a founding role in people/people.json. */
function foundersOf(dir: string, del: Delegation | null): Set<string> {
  const out = new Set([del?.founder ?? []].flat());
  for (const p of rosterOf(dir)) if (founding(p.role)) for (const k of [p.id, p.name]) if (k) out.add(k);
  return out;
}

/** Who signs for the venture's founders: every founder it names, else its first person, else no one. */
export function signers(dir: string): Set<string> {
  const founders = foundersOf(dir, delegationOf(dir));
  const first = rosterOf(dir)[0];
  return founders.size || !first ? founders : new Set([first.id, first.name].filter(Boolean));
}

/** The name setup acts as: the first founder the venture names, else its first person. */
export function founderName(dir: string): string {
  let del: Delegation | null = null;
  try { del = delegationOf(dir); } catch {} // approve reports a delegation file that does not parse.
  const roster = rosterOf(dir);
  return [del?.founder ?? []].flat()[0] ?? roster.find((p) => founding(p.role))?.name ?? roster[0]?.name ?? "Founder";
}

/** The people who may act as a person in this venture: ids and names in people/people.json, and the
 *  founders named in governance/delegation.json. Empty when the venture records no one. */
function peopleOf(dir: string): Set<string> {
  const out = new Set<string>();
  for (const p of rosterOf(dir)) for (const k of [p.id, p.name]) if (k) out.add(k);
  const founders = delegationOf(dir)?.founder;
  for (const f of [founders ?? []].flat()) if (f) out.add(f);
  return out;
}

/** Why by cannot act as a person here, or null. An agent acting, or a role, never can. A venture that
 *  records people limits it to them; rosterRequired refuses a venture that records no one. */
function notAPerson(dir: string, del: Delegation | null, by: string | undefined, { rosterRequired }: { rosterRequired: boolean }): string | null {
  const agent = actingAgent(by);
  if (agent) return `an agent (${agent}) is acting: it cannot act as the person ${by}`;
  const roles = new Set([...(del?.grants ?? []).flatMap((g) => [g.to, g.from]), ...agentRoleIds()].filter((r) => r && r !== del?.root));
  if (by !== undefined && roles.has(by)) return `${by} is a role, not a person`;
  const people = peopleOf(dir);
  if (!people.size) return rosterRequired ? "the venture names no people (people/people.json) or founder (governance/delegation.json): no one can act as a person" : null;
  return by !== undefined && people.has(by) ? null : `${by} is not a person in people/people.json or a founder in governance/delegation.json`;
}

/** Why by may not write as a person in this venture, or null: the check approve makes, for a door that writes records. */
export function refusedPerson(dir: string, by: string | undefined): string | null {
  try { return notAPerson(dir, delegationOf(dir), by, { rosterRequired: false }); } catch (e) { return `${(e as Error).message}: no one writes until it is fixed`; }
}

/** Who may merge a decided version. A person may (with no grant, only the founder merges), and only a
 *  founder merges a one-way door. A role (an agent or a delegate acting as one) may only under a live
 *  delegation grant to that role that names may_merge and the decision's class, whose chain reaches the
 *  root and whose scope holds every record the decision writes. */
export function mayMerge(dir: string, d: Pick<DecisionRecord, "id" | "class" | "applies_to">, { by, role, today = clockNow().toISOString().slice(0, 10) }: { by?: string; role?: string; today?: string } = {}): { ok: false; error: string; grant?: undefined } | { ok: true; grant?: string; error?: undefined } {
  let del: Delegation | null;
  try { del = delegationOf(dir); } catch (e) { return { ok: false, error: `${(e as Error).message}: no one merges until it is fixed` }; }
  if (by && role) return { ok: false, error: "merge as a person (--by) or as a role (--role), not both" };
  const oneWay = new Set([...oneWayClasses(), ...(del?.one_way_doors ?? [])]);
  if (!role) {
    const refused = notAPerson(dir, del, by, { rosterRequired: true });
    if (refused) return { ok: false, error: `${refused}: merge as a person only as yourself, and a role only under a delegation grant (--role)` };
    if (d.class !== undefined && oneWay.has(d.class) && !(by !== undefined && foundersOf(dir, del).has(by))) return { ok: false, error: `${d.id} is a ${d.class} decision, a one-way door: only a founder merges it` };
    return { ok: true };
  }
  if (!d.class) return { ok: false, error: `${d.id} names no decision class, so no grant can cover it: only the founder merges it` };
  if (oneWay.has(d.class)) return { ok: false, error: `${d.id} is a ${d.class} decision, a one-way door: it is never delegated, only the founder merges it` };
  const cls = d.class;
  const held = (del?.grants ?? []).filter((g) => g.to === role && g.may_merge === true && (g.classes ?? []).includes(cls) && liveGrant(g, today));
  // A held grant came from del, so del is set whenever held is not empty.
  if (!held.length || !del) return { ok: false, error: `no live grant in governance/delegation.json lets ${role} merge ${d.class} decisions: only the founder merges ${d.id}` };
  const backed = held.filter((g: Grant) => grantBacked(del, g, today).ok);
  if (!backed.length) return { ok: false, error: `${role}'s grant exceeds its grantor's authority (${grantBacked(del, held[0], today).why}): only the founder merges ${d.id}` };
  const targets = (d.applies_to ?? []).map((t) => t.file);
  const g = backed.find((g: Grant) => targets.every((f) => scopeWithin(f, g.scope)));
  if (!g) return { ok: false, error: `${d.id} writes outside the scope of ${role}'s grant: only the founder merges it` };
  return { ok: true, grant: g.id ?? `${g.from}-to-${g.to}` };
}

let agentRoles: string[] | undefined;
function agentRoleIds(): string[] {
  if (agentRoles) return agentRoles;
  const f = join(new URL("../../../..", import.meta.url).pathname, "packages/naive/template/governance/roles/agent-roles.json");
  try { agentRoles = ((load(f) as { roles?: { id: string }[] }).roles ?? []).map((r) => r.id).filter((id) => id && id !== "founder"); } catch { agentRoles = []; }
  // The function agents and researchers (<function>-agent, <function>-researcher, one per department) and the role
  // templates (the leads among them) are roles too, so none of them can approve or withdraw as a person.
  const root = new URL("../../../..", import.meta.url).pathname;
  try { agentRoles.push(...((load(join(root, "packages/naive/src/functions/departments.json")) as { departments?: { id: string }[] }).departments ?? []).flatMap((d) => [`${d.id}-agent`, `${d.id}-researcher`])); } catch {} // a missing departments file leaves the register's roles
  const roles = join(root, "packages/naive/template/governance/roles");
  try { agentRoles.push(...readdirSync(roles).filter((n) => n.endsWith(".json") && !["agent-roles.json", "venture-roles.json", "founder.json"].includes(n)).map((n) => n.replace(/\.json$/, ""))); } catch {} // no role templates, no extra roles
  return agentRoles;
}

/** The public variants of a field: MDX files under the venture's content folders whose frontmatter says variant_of: <file>#<field>. */
export function variantsOf(dir: string, rel: string, field: string): string[] {
  const out: string[] = [];
  for (const d of ["marketing/content", "operations/marketing/content"]) {
    const root = ventureFile(dir, d);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root, { recursive: true }).map(String).filter((n) => n.endsWith(".mdx"))) {
      const m = readFileSync(join(root, name), "utf8").match(/^---\n([\s\S]*?)\n---/);
      if (m && new RegExp(`^variant_of:\\s*["']?${(rel + "#" + field).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?\\s*$`, "m").test(m[1])) out.push(`${d}/${name}`);
    }
  }
  return out;
}

/** Rollback: make an earlier version current again, as a new version, so history is never rewritten.
 *  The restored version is decided; merge it to apply it. */
export function rollback(dir: string, id: string, to: string | number, { by, via = "cli" }: { by?: string; via?: string } = {}): DoorResult<{ decided: string; version: number | undefined; restored: number; provenance: string; next: string | null }> {
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  if (!by) return { ok: false, error: "rolling back needs the person's name (--by)" };
  let del: Delegation | null;
  try { del = delegationOf(dir); } catch (e) { return { ok: false, error: `${(e as Error).message}: no one rolls back until it is fixed` }; }
  const refused = notAPerson(dir, del, by, { rosterRequired: false });
  if (refused) return { ok: false, error: `only a person rolls back a decision: ${refused}` };
  const d: DecisionRecord = load(ventureFile(dir, file));
  const old = (d.versions ?? []).find((v) => v.version === Number(to));
  if (!old) return { ok: false, error: `${id} has no version ${to}` };
  if (old.status !== "decided") return { ok: false, error: `${id} version ${to} was never decided; only a decided version can be restored` };
  const n = nextVersion(d);
  const { signer: _claimed, signer_account: _account, ...restored } = old.provenance ?? {};
  const out = { ...n, status: "decided", answer: old.answer, ...(old.options ? { options: old.options } : {}), rolled_back_from: Number(to), provenance: { ...restored, drafted_by: old.provenance?.drafted_by ?? { kind: "person", id: by }, approved_by: by, approved_at: clockNow().toISOString().replace(/\.\d+Z$/, "Z"), phase: load(join(dir, "venture.json")).phase, wording: "own", via } };
  if (old.provenance?.reasons) out.reasons = old.provenance.reasons as DecisionRecordReason[];
  else delete out.reasons;
  const bad = validate(out);
  if (bad) return { ok: false, error: bad };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "accept", agent: agentFromEnv("person", via, { id: by }), note: `rolled ${id} back to version ${to} as version ${out.version}` } as Parameters<typeof prov>[1]);
  return { ok: true, result: { decided: id, version: out.version, restored: Number(to), provenance: e.hash, next: out.applies_to?.length ? `mentura merge ${id}` : null } };
}

/** A person approves a decision: as worded, or with their own answer. unverified marks an approval
 *  from a door with no sign-in: the records say the signer is unverified and claim no wording.
 *  account marks one from a door that checked a sign-in: the records name that account as the signer. */
export function approve(dir: string, id: string, { by, answer, via = "cli", note, reasons, unverified = false, account }: { by?: string; answer?: string; via?: string; note?: string; reasons?: ReasonInput[]; unverified?: boolean; account?: string } = {}): DoorResult<{ decided: string; wording: string | null; signer?: "unverified" | "verified"; phase: string; provenance: string; unlocks: string[]; reasons?: number; cites?: string[] }> {
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  if (!by) return { ok: false, error: "approving needs the person's name (--by)" };
  if (unverified && account) return { ok: false, error: "an approval is unverified or names a checked account, not both" };
  let del: Delegation | null;
  try { del = delegationOf(dir); } catch (e) { return { ok: false, error: `${(e as Error).message}: no one approves until it is fixed` }; }
  // Setup approves before anyone is recorded, so a venture that names no one has no roster to check.
  const refused = notAPerson(dir, del, by, { rosterRequired: false });
  if (refused) return { ok: false, error: `only a person approves a decision: ${refused}` };
  const d: DecisionRecord = load(ventureFile(dir, file));
  // An idea a person took off the table is never the answer (EE-211); every live one still is.
  const gone = withdrawnCandidate(d, answer);
  if (gone) return { ok: false, error: `${answer} was withdrawn from ${id}${gone.withdrawn_by ? ` by ${gone.withdrawn_by}` : ""}: choose one of ${optionsOf(d).join(", ") || "none"}, word your own answer, or put it back with mentura option add` };
  // A decided decision changes by a new version: the decided one is kept, and this one supersedes it.
  // An agent's pending wording (proposed) is what the person approves when they give no answer of their own.
  if (d.status === "decided" && !answer && d.proposed) answer = d.proposed.answer;
  if (d.status === "decided" && (!answer || answer === d.answer)) return { ok: false, error: `${id} is already decided as worded; give a new --answer to make version ${(d.version ?? 1) + 1}` };
  if (d.status === "decided") {
    const pending = d.proposed, nv = nextVersion(d);
    for (const k of Object.keys(d)) delete (d as Fields)[k];
    Object.assign(d, nv);
    // The next version is drafted by whoever drafted it: the agent when its proposed wording is approved,
    // else the person approving their own answer. Its predecessor's wording no longer counts as a draft.
    const fromAgent = pending !== undefined && pending.answer === answer;
    d.answer = fromAgent ? answer : null;
    if (fromAgent && pending.options) d.options = pending.options;
    d.provenance = { drafted_by: fromAgent ? pending.drafted_by as NonNullable<DecisionRecord["provenance"]>["drafted_by"] : { kind: "person", id: by } };
  }
  if (!answer && !d.answer) return { ok: false, error: `${id} has no wording to approve; give an answer` };
  const drafted = d.provenance?.drafted_by ?? { kind: "person", id: by };
  const wording = !d.answer || drafted.kind === "framework" ? "own" : answer && answer !== d.answer ? (drafted.kind === "person" && drafted.id === by ? "own" : "changed") : drafted.kind === "person" ? "own" : "approved";
  const phase = load(join(dir, "venture.json")).phase;
  // Reasons given at approval join the drafted ones and freeze into this version's provenance, each local
  // citation with its sha256 now. On a later version every reason in d.reasons is inherited and keeps the
  // hash it was frozen at, so a citation that changed since still makes this version stale. A reason given
  // now with the same claim replaces the inherited one, which is how staleness is cleared.
  const restated = new Set((reasons ?? []).map((x) => x.claim));
  const kept = (d.reasons ?? []).filter((x) => !restated.has(x.claim));
  const given = [...(d.versions?.length ? kept : stamp(dir, kept, { keep: false })), ...stamp(dir, reasons ?? [], { keep: false })];
  const { reasons: _old, signer: _signer, signer_account: _account, ...pv } = d.provenance ?? {};
  const frozen = given.length ? given : null;
  const out = { ...d, status: "decided", answer: answer ?? d.answer, ...(frozen ? { reasons: frozen } : {}), provenance: { ...pv, drafted_by: drafted, approved_by: by, approved_at: clockNow().toISOString().replace(/\.\d+Z$/, "Z"), phase, ...(unverified ? { signer: "unverified" } : { wording }), ...(account ? { signer: "verified", signer_account: account } : {}), via, ...(frozen ? { reasons: frozen } : {}) } };
  const bad = validate(out);
  if (bad) return { ok: false, error: bad };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "accept", agent: agentFromEnv(unverified ? "unverified" : "person", via, { id: by, account }), note: note ?? (unverified ? `approved decision ${id} through ${via} with no sign-in: ${by} is unverified` : `approved decision ${id} (${wording})`) } as Parameters<typeof prov>[1]);
  return { ok: true, result: { decided: id, wording: unverified ? null : wording, ...(unverified ? { signer: "unverified" } : {}), ...(account ? { signer: "verified" } : {}), phase, provenance: e.hash, unlocks: (out.unlocks ?? []).map((u) => u.activity), ...(frozen ? { reasons: frozen.length, cites: citesOf(frozen) } : {}) } };
}

/** A person withdraws an open or deferred decision, optionally as a duplicate of another, so the queue keeps one
 *  question. With option, it withdraws that one candidate instead and the decision stays open (EE-211): one command
 *  takes a question or an idea off the table. Nothing is ever removed, so a withdrawal is recoverable: a withdrawn
 *  candidate is kept in the record and a person's mentura option add of the same id puts it back.
 *  Only a person withdraws (an agent proposes; it never removes a question), a decided decision changes by a
 *  new version instead, and the decision it duplicates must exist, be another one, and not itself be withdrawn. */
export function withdraw(dir: string, id: string, { by, duplicateOf, option, why, note, via = "cli" }: { by?: string; duplicateOf?: string; option?: string; why?: string; note?: string; via?: string } = {}): DoorResult<{ withdrawn: string; option?: string; left?: string[]; duplicate_of?: string; provenance: string }> {
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  if (!by) return { ok: false, error: "withdrawing needs the person's name (--by)" };
  let del: Delegation | null;
  try { del = delegationOf(dir); } catch (e) { return { ok: false, error: `${(e as Error).message}: no one withdraws until it is fixed` }; }
  const refused = notAPerson(dir, del, by, { rosterRequired: false });
  if (refused) return { ok: false, error: `only a person withdraws ${option ? "an option" : "a decision"}: ${refused}` };
  const d: DecisionRecord = load(ventureFile(dir, file));
  if (option !== undefined) return withdrawOption(dir, file, d, option, { by, why, note, via });
  if (d.status === "decided") return { ok: false, error: `${id} is decided; change it with a new version, not a withdrawal${d.answer ? `, or reopen it: mentura reopen ${id} --by ${by}` : ""}` };
  if (d.status === "withdrawn") return { ok: false, error: `${id} is already withdrawn` };
  if (duplicateOf !== undefined) {
    if (duplicateOf === id) return { ok: false, error: `${id} cannot be a duplicate of itself` };
    const other = fileOf(dir, duplicateOf);
    if (!other) return { ok: false, error: `no decision ${duplicateOf} to be a duplicate of` };
    if ((load(ventureFile(dir, other)) as DecisionRecord).status === "withdrawn") return { ok: false, error: `${duplicateOf} is withdrawn itself; name the decision that still asks the question` };
  }
  const out: DecisionRecord = { ...d, status: "withdrawn", ...(duplicateOf ? { duplicate_of: duplicateOf } : {}), withdrawn_by: by, withdrawn_at: clockNow().toISOString().replace(/\.\d+Z$/, "Z") };
  const bad = validate(out);
  if (bad) return { ok: false, error: bad };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "write", agent: agentFromEnv("person", via, { id: by }), note: note ?? (duplicateOf ? `withdrew decision ${id} as a duplicate of ${duplicateOf}` : `withdrew decision ${id}`) } as Parameters<typeof prov>[1]);
  return { ok: true, result: { withdrawn: id, ...(duplicateOf ? { duplicate_of: duplicateOf } : {}), provenance: e.hash } };
}

/** One candidate off the table, by a person, with the decision left open (EE-211). The candidate is kept
 *  with who withdrew it and why, never removed, so the idea can be read again and put back. */
function withdrawOption(dir: string, file: string, d: DecisionRecord, option: string, { by, why, note, via }: { by: string; why?: string; note?: string; via?: string }): DoorResult<{ withdrawn: string; option: string; left: string[]; provenance: string }> {
  if (d.status === "withdrawn") return { ok: false, error: `${d.id} is withdrawn: its options went with it` };
  const c = (d.candidates ?? []).find((x) => x.id === option);
  if (!c) return { ok: false, error: `${d.id} has no option ${option} (it has ${optionsOf(d).join(", ") || "none"})` };
  if (c.withdrawn_at) return { ok: false, error: `${option} is already withdrawn from ${d.id}` };
  // The answer is never left naming an idea no longer on the table: change the answer first.
  if (d.answer === option) return { ok: false, error: `${option} is the answer of ${d.id}: ${d.status === "decided" ? `reopen it first (mentura reopen ${d.id} --by ${by})` : "word another answer first"}` };
  const out: DecisionRecord = { ...d, candidates: (d.candidates ?? []).map((x) => x.id === option
    ? { ...x, withdrawn_by: by, withdrawn_at: clockNow().toISOString().replace(/\.\d+Z$/, "Z"), ...(why ? { withdrawn_why: why } : {}) } : x) };
  const bad = validate(out);
  if (bad) return { ok: false, error: bad };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "write", agent: agentFromEnv("person", via ?? "cli", { id: by }),
    note: note ?? `withdrew option ${option} from decision ${d.id}${why ? `: ${why}` : ""}` } as Parameters<typeof prov>[1]);
  return { ok: true, result: { withdrawn: d.id, option, left: optionsOf(out), provenance: e.hash } };
}

/** What a caller may send as a candidate: the schema check, not the type, holds proposed_by's kind. */
export type CandidateInput = Omit<Partial<Candidate>, "proposed_by"> & { proposed_by?: { kind?: string; id?: string } };

/** An agent or a person puts one more idea on the table of an open decision (EE-211). Any number coexist,
 *  so nothing has to be settled before the right time; each id becomes an option, beside the strings in
 *  options. An agent never chooses one: only a person decides. A person adding an id that was withdrawn
 *  puts that idea back, which is how a withdrawal stays recoverable; an agent may not, because a person
 *  took it off the table. */
export function addCandidate(dir: string, id: string, input: CandidateInput | null | undefined, { by, agentId, via = "cli", note }: { by?: string; agentId?: string; via?: string; note?: string } = {}): DoorResult<{ decision: string; option: string; options: string[]; restored?: true; proposes: string; provenance: string; decide: string }> {
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  const c = { ...(input ?? {}) } as CandidateInput;
  if (!c.id || !c.label) return { ok: false, error: "an option needs an id and a label" };
  if (c.withdrawn_by || c.withdrawn_at || c.withdrawn_why) return { ok: false, error: "an option is withdrawn with mentura withdraw, not written as withdrawn" };
  const person = by !== undefined;
  if (person) {
    const refused = refusedPerson(dir, by);
    if (refused) return { ok: false, error: `adding an option as a person: ${refused}` };
  }
  const d: DecisionRecord = load(ventureFile(dir, file));
  if (d.status !== "open" && d.status !== "deferred") return { ok: false, error: `${id} is ${d.status}; options go on an open decision${d.status === "decided" ? `, so reopen it first: mentura reopen ${id} --by <your name>` : ""}` };
  const was = (d.candidates ?? []).find((x) => x.id === c.id);
  if (was && !was.withdrawn_at) return { ok: false, error: `${id} already has an option ${c.id}; give it another id` };
  if (was && !person) return { ok: false, error: `${c.id} was withdrawn from ${id} by ${was.withdrawn_by ?? "a person"}; only a person puts it back` };
  c.proposed_by = person ? { kind: "person", id: by } : { kind: "agent", ...(agentId ? { id: agentId } : {}) };
  c.created = c.created ?? clockNow().toISOString().replace(/\.\d+Z$/, "Z");
  const next = c as Candidate;
  const out: DecisionRecord = { ...d, candidates: was ? (d.candidates ?? []).map((x) => x.id === c.id ? next : x) : [...(d.candidates ?? []), next] };
  const bad = validate(out);
  if (bad) return { ok: false, error: `does not match packages/naive/src/records/decision-record.schema.json:\n${bad}` };
  // What the candidate would write has to resolve now, so a person is never offered an idea that cannot be merged.
  const w = writeOf(next, d.decides?.path ?? decidedPath(file));
  if (!w.ok) return { ok: false, error: w.error };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: person ? "write" : "draft",
    agent: agentFromEnv(person ? "person" : "agent", via, person ? { id: by } : { ...(agentId ? { id: agentId } : {}) }),
    note: note ?? `${was ? "put back" : "added"} option ${next.id} on decision ${id}: ${next.label}` } as Parameters<typeof prov>[1]);
  return { ok: true, result: { decision: id, option: next.id, options: optionsOf(out), ...(was ? { restored: true as const } : {}), proposes: proposesOf(next, d.decides?.path ?? decidedPath(file)),
    provenance: e.hash, decide: `mentura decide ${id} --by <your name> --answer ${next.id}` } };
}

/** A person reopens a decided decision (EE-211), so a decision stays easy to change. The decided version is
 *  kept, the decision asks its question again with every candidate still on the table, and reopened records
 *  who, when, in which phase and why. The answer stays recoverable: mentura decide <id> --rollback <version>
 *  restores it.
 *
 *  Decisions are fluid while a venture is still finding its shape: in Discovery and Validation a person
 *  reopens one as a matter of course. Later a reopen is a change to something the venture has built on, so
 *  it needs the person's explicit override. A one-way door needs the override in every phase, and a founder,
 *  because it is the kind of decision the venture cannot take back. */
export function reopen(dir: string, id: string, { by, why, override = false, via = "cli", note }: { by?: string; why?: string; override?: boolean; via?: string; note?: string } = {}): DoorResult<{ reopened: string; version: number | undefined; was: string | null; from_version: number; phase: string; override?: true; options: string[]; provenance: string; restore: string }> {
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  if (!by) return { ok: false, error: "reopening needs the person's name (--by)" };
  let del: Delegation | null;
  try { del = delegationOf(dir); } catch (e) { return { ok: false, error: `${(e as Error).message}: no one reopens until it is fixed` }; }
  const refused = notAPerson(dir, del, by, { rosterRequired: false });
  if (refused) return { ok: false, error: `only a person reopens a decision: ${refused}` };
  const d: DecisionRecord = load(ventureFile(dir, file));
  if (d.status !== "decided") return { ok: false, error: `${id} is ${d.status}, not decided: there is nothing to reopen` };
  const phase: string = load(join(dir, "venture.json")).phase;
  const fluid = phase === "discovery" || phase === "validation";
  const oneWay = d.door === "one-way" || (d.class !== undefined && oneWayDoors(dir).has(d.class));
  if (oneWay && !override) return { ok: false, error: `${id} is a one-way door: reopening it is the founder's own call, with the override (--override)` };
  if (oneWay && !signers(dir).has(by)) return { ok: false, error: `${id} is a one-way door: only a founder reopens it` };
  if (!fluid && !override) return { ok: false, error: `${id} was decided and ${phase} is past Validation: work has been built on it. Reopen it with the override (--override) if you mean to change it` };
  const from = d.version ?? 1;
  const { decided_by: _by, ...cur } = nextVersion(d);
  const out: DecisionRecord = { ...cur, status: "open", answer: null, decided_at: null,
    provenance: { drafted_by: { kind: "person", id: by }, ...(via ? { via } : {}) },
    reopened: [...(d.reopened ?? []), { version: from, answer: d.answer ?? null, by, at: clockNow().toISOString().replace(/\.\d+Z$/, "Z"), phase: phase as NonNullable<DecisionRecord["reopened"]>[number]["phase"], ...(why ? { why } : {}), ...(override ? { override: true as const } : {}) }] };
  const bad = validate(out);
  if (bad) return { ok: false, error: bad };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "write", agent: agentFromEnv("person", via, { id: by }),
    note: note ?? `reopened decision ${id} from version ${from}${override ? ` with the override in ${phase}` : ""}${why ? `: ${why}` : ""}` } as Parameters<typeof prov>[1]);
  return { ok: true, result: { reopened: id, version: out.version, was: d.answer ?? null, from_version: from, phase, ...(override ? { override: true as const } : {}),
    options: optionsOf(out), provenance: e.hash, restore: `mentura decide ${id} --by ${by} --rollback ${from}` } };
}

/** The matrix: for each layer, the decisions that render now, wait, or come later, by phase. */
export function matrix(r: Pick<Matrix, "decisions" | "phase">): ({ layer: string } & Record<string, string[]>)[] {
  const live = r.decisions.filter((d) => !["done", "withdrawn"].includes(d.render) && d.source !== "root");
  const layers = [...new Set(live.map((d) => d.layer))].sort();
  return layers.map((l) => ({ layer: l, ...Object.fromEntries(PHASES.map((p) => [p, live.filter((d) => d.layer === l && (d.needed_in ?? r.phase) === p).map((d) => `${d.id} (${d.render})`)])) }) as { layer: string } & Record<string, string[]>);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (!arg) { console.error("usage: node packages/naive/src/engine/decisions.ts <venture or workspace dir> [--json | --md]"); process.exit(2); }
  const walk = (d: string): string[] => existsSync(join(d, "venture.json")) ? [d] : readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_")).flatMap((e) => walk(join(d, e.name)));
  const dirs = walk(arg);
  const rs = dirs.map((d) => ({ dir: d, ...decisions(d) }));
  if (process.argv.includes("--json")) console.log(JSON.stringify(rs.length === 1 ? rs[0] : rs, null, 2));
  else for (const r of rs) {
    console.log(`\n${relative(process.cwd(), r.dir) || "."} (${r.phase}, ${r.kind})`);
    const order = ["overdue", "stale", "now", "waiting", "later", "deferred", "done"];
    const byDue = (a: RankedDecision, b: RankedDecision) => (b.rank ?? -1) - (a.rank ?? -1) || (a.due ?? "~").localeCompare(b.due ?? "~");
    for (const state of order) for (const d of r.decisions.filter((x) => x.render === state && x.source !== "root" || (x.id === "foundation" && x.render === state)).sort(byDue)) console.log(`  ${state.padEnd(8)} ${d.id.padEnd(30)} ${d.boundary.padEnd(11)} ${d.layer.padEnd(10)} ${d.question}${d.held_by ? ` [held by ${d.held_by}]` : ""}${d.render === "done" ? ` [${d.firmness}${d.provenance?.approved_by ? `, approved by ${d.provenance.approved_by} in ${d.provenance.phase}` : ""}]` : ""}${d.awaiting ? " [agent's wording, awaiting approval]" : ""}${d.candidates?.length && d.render !== "done" ? ` [${d.candidates.length} ideas on the table: ${d.candidates.map((c) => c.id).join(", ")}]` : ""}${d.due && d.render !== "done" ? ` [due ${d.due}, ${d.due_in_hours}h]` : ""}${d.outcomes?.due?.length ? ` [outcomes due: ${d.outcomes.due.join(", ")}]` : ""}${d.why?.length ? `\n           why now: ${d.why.join("; ")}` : ""}`);
    if (process.argv.includes("--md")) {
      const m = matrix(r);
      console.log(`\n| layer | ${PHASES.join(" | ")} |\n| --- | ${PHASES.map(() => "---").join(" | ")} |`);
      for (const row of m) console.log(`| ${row.layer} | ${PHASES.map((p) => row[p].join("<br>")).join(" | ")} |`);
    }
  }
  const errs = rs.flatMap((r) => r.errors.map((e) => `${r.dir}: ${e}`));
  for (const e of errs) console.error(`FAIL  ${e}`);
  process.exit(errs.length ? 1 : 0);
}
