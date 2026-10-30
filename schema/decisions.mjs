#!/usr/bin/env node
// The decision matrix (EE-054, EE-057): every decision a venture has open, by layer and phase,
// with its parent, its boundary and whether it renders now. Behaviors:
// purpose/features/decisions.feature.
//
//   node schema/decisions.mjs <venture or workspace dir> [--json | --md]
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

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative } from "node:path";
import { FRAME, foundation } from "./foundation.mjs";
import { actingAgent, agentFromEnv, record as prov } from "../interface/provenance.mjs";
import { glob as routeFileGlob, routes } from "../interface/router.mjs";
// Caching hook (F-12): the decision list is computed once per router action (schema/caching.mjs).
import { memo } from "./caching.mjs";
import { roles as ventureRoles } from "./venture-type.mjs";
import { impact } from "./impact.mjs";
import { mark } from "./stale.mjs";
import { changedReasons, citesOf, stamp } from "./reasons.mjs";
import { grantBacked, layoutOf, liveGrant, logicalFiles, readDelegation, scopeWithin, ventureFile } from "./venture-paths.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (f) => JSON.parse(readFileSync(f, "utf8"));
const MODEL = load(join(repo, "schema/data-model.json"));
export const PHASES = ["discovery", "validation", "beachhead", "scale", "platform"];
const glob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*\//g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, "(?:[^/]+/)*") + "$");
const FOUNDATION_RECORDS = new Set(FRAME.questions.flatMap((q) => q.statements).map((s) => s.record).filter(Boolean));

/** The record type a venture-relative file belongs to. */
export function recordOf(file) {
  return MODEL.records.find((r) => r.level === "venture" && r.paths.some((p) => p.startsWith("instance/**/") && glob(p.slice("instance/**/".length)).test(file)))?.id ?? null;
}

// Every *.decision.json in a venture, outside drafts, hidden folders and nested ventures.
export function decisionFiles(dir, sub = "") {
  // A structured venture (EE-086): its decision files by their logical paths.
  if (!sub && layoutOf(dir) === "structured") return logicalFiles(dir).filter((r) => r.endsWith(".decision.json") && r.split("/").at(-2) === "decisions" && !r.split("/").some((s) => s.startsWith(".") || s.startsWith("_")));
  return readdirSync(ventureFile(dir, sub), { withFileTypes: true }).flatMap((e) => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) return e.name.startsWith(".") || e.name.startsWith("_") || existsSync(join(dir, rel, "venture.json")) ? [] : decisionFiles(dir, rel);
    return e.name.endsWith(".decision.json") && sub.split("/").at(-1) === "decisions" ? [rel] : [];
  });
}

/** Every decision of a venture, resolved: boundary, render state and what holds it. */
// Caching hook (F-12): without an explicit now, one action shares one decision list; now is the action's.
export function decisions(dir, now) {
  return now === undefined ? memo("decisions", () => decisionsAt(dir), { dir }) : decisionsAt(dir, now);
}
function decisionsAt(dir, now = Date.parse(process.env.DECISIONS_NOW ?? "") || Date.now()) {
  const venture = load(join(dir, "venture.json"));
  const phase = PHASES.indexOf(venture.phase);
  const productOnly = venture.kind === "product";
  const report = foundation(dir);
  const statements = report.flatMap((q) => q.statements);
  const settled = statements.filter((s) => s.status !== "planned").every((s) => s.status === "confirmed");
  const errors = [];

  /** @type {{ id: string, question: string, source: string, layer: string, parent: string | null, boundary: string, status: string, needed_in?: string, decides?: { record: string, path?: string }, part_of?: string, statement_status?: string, [k: string]: any }[]} */
  const list = [
    { id: "venture", question: `Build ${venture.name} as a venture`, source: "root", layer: "governance", parent: null, boundary: productOnly ? "fail-open" : "fail-closed", status: "decided", decided_at: null },
    { id: "foundation", question: `Settle the strategic foundation (${statements.filter((s) => !["confirmed", "planned"].includes(s.status)).length} statements open)`, source: "root", layer: "purpose", parent: "venture", boundary: productOnly ? "fail-open" : "fail-closed",
      status: settled ? "decided" : "open", decided_at: null, needed_in: venture.phase },
  ];
  for (const f of decisionFiles(dir)) {
    const d = load(ventureFile(dir, f));
    // decisions/<record>[.<topic>].decision.json decides <record>.json in the folder that holds decisions/.
    const at = f.split("/").slice(0, -2).join("/"), base = f.split("/").at(-1).split(".")[0];
    const path = d.decides?.path ?? (at ? `${at}/${base}.json` : `${base}.json`);
    const record = d.decides?.record ?? recordOf(path);
    const layer = d.layer ?? MODEL.records.find((r) => r.id === record)?.layer ?? f.split("/")[0];
    if (["venture", "foundation"].includes(d.id)) errors.push(`${f}: ${d.id} is a reserved root`);
    // Provenance (EE-058): a decision is decided only when a person approved its wording, at a
    // time and in a phase; an agent's wording waits for that approval.
    const pv = d.provenance;
    if (d.status === "decided" && !pv?.approved_by) errors.push(`${f}: decided, but names no one who decided`);
    else if (d.status === "decided" && (!pv.approved_at || !pv.phase)) errors.push(`${f}: decided, but its provenance has no ${!pv.approved_at ? "approved_at" : "phase"}`);
    if (pv?.approved_by && d.decided_by && pv.approved_by !== d.decided_by) errors.push(`${f}: decided_by ${d.decided_by} differs from provenance.approved_by ${pv.approved_by}`);
    if (pv?.phase && PHASES.indexOf(pv.phase) > phase) errors.push(`${f}: approved in ${pv.phase}, a phase the venture has not reached`);
    for (const o of d.outcomes ?? []) if (["met", "partly", "missed"].includes(o.result) && !o.actual) errors.push(`${f}: outcome ${o.id} is ${o.result} but records no actual outcome`);
    const boundary = d.boundary && d.boundary !== "inherit" ? d.boundary : record === "product" ? "fail-open" : "inherit";
    // A decision that settles a foundation statement is part of the foundation, not under it. One
    // about a foundation record waits on that record's open statement, set below, not the whole foundation.
    const parent = d.parent ?? (d.statement ? "venture" : null);
    list.push({ ...d, file: f, source: "file", decides: { record, path }, layer, boundary, parent, ...(d.statement ? { part_of: "foundation" } : {}) });
  }
  const covered = new Set(list.map((d) => d.statement).filter(Boolean));
  // The roll-up counts only the statements still open after decision records stand in for some.
  list[1].question = `Settle the strategic foundation (${statements.filter((s) => !["confirmed", "planned"].includes(s.status) && !s.derived_from && !list.some((d) => d.statement === s.id && d.status === "decided")).length} statements open)`;
  // A foundation statement no person has confirmed is a decision the founder still owes. It is
  // part of the foundation rather than under it, so the foundation does not hold it.
  for (const s of statements.filter((x) => !["confirmed", "planned"].includes(x.status) && !x.derived_from && !covered.has(x.id))) {
    const question = { missing: `Write the ${s.id} statement`, draft: `Accept or change the agent's draft of the ${s.id} statement`, agent: `Confirm the ${s.id} statement an agent wrote` }[s.status] ?? `Confirm the ${s.id} statement (${s.status})`;
    list.push({ id: `foundation-${s.id}`, question, source: "foundation", statement_status: s.status, layer: MODEL.records.find((r) => r.id === s.record)?.layer ?? "purpose",
      decides: { record: s.record }, parent: "venture", part_of: "foundation", boundary: "inherit", status: "open", needed_in: venture.phase });
  }
  const statementFor = (record) => list.find((x) => x.part_of === "foundation" && x.status === "open" && x.decides?.record === record);
  // An agent's draft of a gated record waits for a person to accept it.
  const drafts = existsSync(join(ventureFile(dir, "_drafts"))) ? readdirSync(join(ventureFile(dir, "_drafts"))).filter((f) => f.endsWith(".draft")) : [];
  for (const d of drafts) {
    const path = d.replace(/\.draft$/, "").replace(/__/g, "/");
    const record = recordOf(path);
    // A draft of a foundation record is settled through its statement, which says to accept it.
    const s = statementFor(record);
    if (s?.statement_status === "draft") { s.decides = { record, path }; continue; }
    list.push({ id: `draft-${path.replace(/[^a-z0-9]+/g, "-").replace(/-json$/, "")}`, question: `Accept or reject the agent's draft of ${path}`, source: "draft",
      layer: MODEL.records.find((r) => r.id === record)?.layer ?? path.split("/")[0], decides: { record, path }, parent: FOUNDATION_RECORDS.has(record) ? (statementFor(record)?.id ?? "venture") : "venture",
      boundary: "inherit", status: "open", needed_in: venture.phase });
  }
  // A decision about a foundation record waits on that record's open statement only, so one open
  // statement does not hold every decision about the foundation.
  for (const d of list) if (d.parent === null && d.source === "file") d.parent = (FOUNDATION_RECORDS.has(d.decides?.record) ? statementFor(d.decides.record)?.id : null) ?? "venture";

  const byId = new Map();
  for (const d of list) { if (byId.has(d.id)) errors.push(`decision ${d.id}: duplicate id`); else byId.set(d.id, d); }
  for (const d of list) if (d.parent && !byId.has(d.parent)) { errors.push(`decision ${d.id}: unknown parent ${d.parent}`); d.parent = "venture"; }
  const ancestors = (d) => {
    const out = [];
    for (let p = byId.get(d.parent); p; p = byId.get(p.parent)) {
      if (p === d || out.includes(p)) { errors.push(`decision ${d.id}: its parents form a cycle`); break; }
      out.push(p);
    }
    return out;
  };
  const chains = new Map(list.map((d) => [d.id, ancestors(d)]));
  const boundaryOf = (d) => d.boundary !== "inherit" ? d.boundary : (chains.get(d.id).find((a) => a.boundary !== "inherit")?.boundary ?? "fail-closed");

  const resolved = list.map((d) => {
    const boundary = boundaryOf(d);
    // An open decision above that fails closed holds this one. As with React's error boundaries the
    // nearest boundary governs: a decision that fails open (a product) shields everything under it
    // from the fail-closed decisions above it.
    const holder = (() => {
      if (d.boundary === "fail-open") return null;
      for (const a of chains.get(d.id)) {
        if (a.boundary === "fail-open") return null;
        if (a.status !== "decided" && boundaryOf(a) === "fail-closed") return a;
      }
      return null;
    })();
    const parent = byId.get(d.parent);
    const at = (x) => x?.provenance?.approved_at ?? x?.decided_at;
    const parentStale = d.status === "decided" && at(d) && at(parent) && at(parent) > at(d);
    // Reasons with citations: a decided decision whose frozen cited file changed is stale too.
    const changed = d.source === "file" ? changedReasons(dir, d) : [];
    const stale = parentStale || changed.length > 0;
    // A due time is a real deadline: it overrides needed_in, and an open decision past it is overdue.
    const later = !d.due && d.needed_in && PHASES.indexOf(d.needed_in) > phase;
    const overdue = d.status === "open" && d.due && Date.parse(d.due) < now;
    const render = d.status === "withdrawn" ? "withdrawn" : d.status === "deferred" ? "deferred" : stale ? "stale" : overdue ? "overdue"
      : d.status === "decided" ? "done" : later ? "later" : holder ? "waiting" : "now";
    const firmness = d.status !== "decided" ? "open" : venture.phase === "discovery" ? "working" : "firm";
    // Lane (EE-060): a fail-closed decision is on the venture's ordered path, so what is under it waits;
    // a fail-open one can move on its own, beside the rest, at whatever priority it ranks.
    const lane = boundary === "fail-open" ? "async" : "sync";
    return { id: d.id, question: d.question, source: d.source, layer: d.layer, parent: d.parent, boundary, lane, needed_in: d.needed_in ?? null, status: d.status, render, firmness,
      ...(render === "waiting" || (overdue && holder) ? { held_by: holder.id } : {}),
      ...(d.due ? { due: d.due, due_in_hours: Math.round((Date.parse(d.due) - now) / 36e5) } : {}), ...(d.part_of ? { part_of: d.part_of } : {}), ...(d.decides ? { decides: d.decides } : {}), ...(d.file ? { file: d.file } : {}), ...(d.answer ? { answer: d.answer } : {}), ...(d.ideas?.length ? { ideas: d.ideas } : {}),
      ...(d.status === "open" && d.answer && d.provenance?.drafted_by?.kind === "agent" ? { awaiting: "approval" } : {}),
      ...(d.provenance ? { provenance: d.provenance } : {}),
      ...(d.reasons?.length ? { reasons: d.reasons } : {}),
      ...(changed.length ? { reasons_changed: changed.map(({ ref, claim, kind }) => ({ ref, claim, kind })) } : {}), ...(stale && !parentStale ? { stale_because: "reasons" } : {}),
      ...(d.outcomes?.length ? { outcomes: { total: d.outcomes.length, pending: d.outcomes.filter((o) => (o.result ?? "pending") === "pending").length,
        due: d.outcomes.filter((o) => (o.result ?? "pending") === "pending" && /^\d{4}-\d{2}-\d{2}/.test(o.by ?? "") && Date.parse(o.by) < now).map((o) => o.id) } } : {}),
      ...(d.unlocks?.length ? { unlocks: d.unlocks.map((u) => u.activity) } : {}),
      ...(["open", "deferred"].includes(d.status) ? { action: actionFor(d, venture.id) } : {}) };
  });
  return { venture: venture.id, phase: venture.phase, kind: productOnly ? "product" : "venture", errors, decisions: rank(resolved, venture.phase, now) };
}

// The route that writes a venture-relative file, for the commands a founder runs.
function routeOf(path, record) {
  const r = routes().find((x) => x.kind === "record" && (path ? x.files.some((g) => routeFileGlob(g).test(path)) : x.record === record && x.collection !== "item"));
  if (!r) return null;
  return r.collection === "item" && path ? r.route.replace("[id]", path.split("/").at(-1).replace(/\.json$/, "")) : r.route;
}

/** How a person settles an open decision: the command to run, and the word to type to confirm it. */
export function actionFor(d, venture) {
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
 *  every open decision, so a gate can carry the weight of what it holds (schema/docket.mjs). */
export function ownScore(d, phase, now = Date.now()) {
  const why = [];
  let s = 0;
  if (d.render === "overdue") { s += 100; why.push("past its due time"); }
  // Cost of delay grows as the deadline nears: 40 at three days, 60 at two, 120 at one, up to 300.
  else if (d.due) { const h = (Date.parse(d.due) - now) / 36e5; if (h <= 72) { s += Math.min(300, Math.round((60 * 48) / Math.max(h, 1))); why.push(`due in ${Math.max(0, Math.round(h))}h`); } }
  // A why entry may carry cites (the refs a reason supplies); why stays a list of strings, and
  // why_cites pairs each cited entry with its refs (backward compatible).
  const cites = [];
  if (d.render === "stale" && d.stale_because !== "reasons") { s += 30; why.push("its parent changed after it was decided"); }
  else if (d.render === "stale") s += 30;
  for (const c of d.reasons_changed ?? []) { const w = `the reason you decided ${d.id} changed: ${c.ref}`; why.push(w); cites.push({ why: w, cites: [c.ref] }); }
  if (d.unlocks?.length) { s += 10 * d.unlocks.length; why.push(`unlocks ${d.unlocks.join("; ")}`); }
  if (d.part_of === "foundation") { s += phase === "discovery" ? 20 : 10; why.push("settles the strategic foundation"); }
  if (d.awaiting) { s += 8; why.push("an agent has drafted it: approving takes a minute"); }
  if (d.outcomes?.total) { s += 3 * d.outcomes.total; why.push(`${d.outcomes.total} expected outcome${d.outcomes.total > 1 ? "s" : ""} to test`); }
  // Cited reasons carry no weight of their own yet; they say what the decision rests on.
  const refs = d.status !== "decided" ? citesOf(d.reasons) : [];
  if (refs.length) { const w = `rests on ${d.reasons.length} reason${d.reasons.length > 1 ? "s" : ""} citing ${refs.length} source${refs.length > 1 ? "s" : ""}`; why.push(w); cites.push({ why: w, cites: refs }); }
  return { score: s, why, ...(cites.length ? { why_cites: cites } : {}) };
}

/** Which open decisions matter most now, and why (EE-057): a decision's own weight plus 12 for each
 *  decision that waits on it. Ranks the decisions that render now, overdue or stale; the others keep
 *  rank null. Higher first; ties keep their order. */
export function rank(ds, phase, now = Date.now()) {
  const below = (id) => ds.filter((x) => x.held_by === id || x.parent === id).length;
  const scored = ds.map((d) => {
    if (!["now", "overdue", "stale"].includes(d.render) || d.source === "root") return { ...d, rank: null };
    const { score, why, why_cites } = ownScore(d, phase, now);
    const n = below(d.id);
    // Kept in the order the reasons were always given: deadline and staleness first, then what waits.
    const first = /due|parent changed|reason you decided/;
    if (n) why.splice(why.findIndex((w) => !first.test(w)) === -1 ? why.length : why.findIndex((w) => !first.test(w)), 0, `${n} decision${n > 1 ? "s" : ""} wait on it`);
    return { ...d, rank: score + 12 * n, why, ...(why_cites ? { why_cites } : {}) };
  });
  const order = scored.map((d, i) => [d, i]).sort(([a, i], [b, j]) => (b.rank ?? -1) - (a.rank ?? -1) || i - j).map(([d]) => d);
  return order;
}

export function holding(dir, file) {
  if (!existsSync(join(dir, "venture.json"))) return null;
  const record = recordOf(file);
  const m = decisions(dir).decisions.find((d) => d.source === "file" && (d.decides?.path === file || (!d.decides?.path && d.decides?.record === record))
    && (d.render === "waiting" || d.render === "stale" || (d.status === "open" && d.boundary === "fail-closed")));
  return m ? { id: m.id, why: m.render === "waiting" ? `waits on ${m.held_by}` : m.render === "stale" ? "is stale" : "is open and fails closed" } : null;
}

// Routes an unlock names are globs over routes, as in the team plan's robots.
const routeGlob = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\0").replace(/\*/g, "[^/]*").replace(/\0/g, ".*") + "$");

/** The decision that keeps a route closed to an actor (EE-058): an undecided decision that unlocks it. */
export function locked(dir, route, actorId) {
  if (!existsSync(join(dir, "venture.json"))) return null;
  const files = decisionFiles(dir).map((f) => load(ventureFile(dir, f)));
  const d = files.find((x) => x.status !== "decided" && x.status !== "withdrawn" && (x.unlocks ?? []).some((u) =>
    (u.routes ?? []).some((g) => routeGlob(g).test(route)) && (!u.for?.length || !actorId || u.for.includes(actorId))));
  return d ? { id: d.id, question: d.question } : null;
}

const runValidator = (d, schema) => {
  const scratch = mkdtempSync(join(tmpdir(), "decision-"));
  const f = join(scratch, "d.json");
  writeFileSync(f, JSON.stringify(d));
  const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", schema, "--file", f], { encoding: "utf8" });
  rmSync(scratch, { recursive: true, force: true });
  return v;
};
const validate = (d, schema = "decision-record.schema.json") => {
  const v = runValidator(d, schema);
  return v.status === 0 ? null : (v.stdout + v.stderr).trim();
};
/** The schema errors of a record, one per line, or null when the validator could not run: validate.py
 *  prints schema errors to stdout and exits 1, and anything else is a failure to check. */
const schemaErrors = (d, schema) => {
  const v = runValidator(d, schema);
  if (v.status === 0) return [];
  return v.status === 1 && v.stdout.trim() && !v.stderr.trim() ? v.stdout.trim().split("\n") : null;
};
const fileOf = (dir, id) => decisionFiles(dir).find((f) => load(ventureFile(dir, f)).id === id);
/** The venture-relative file of a decision record, by id. */
export const decisionFile = fileOf;

/** Whether an applies_to file is a relative path that stays inside the venture (no ".", "..", or empty segment, not absolute), so it has one spelling. */
const inside = (f) => typeof f === "string" && f !== "" && !isAbsolute(f) && !/^[a-zA-Z]:/.test(f) && !f.split(/[\\/]/).some((x) => ["", ".", ".."].includes(x));

/** An agent proposes a decision, or new wording for an open one. It stays open until a person
 *  approves it: an agent never decides (EE-058). at: the folder beside the record it decides.
 *  @param {string} dir @param {*} input @param {{ agentId?: string, via?: string, harness?: string, model?: string }} [opts] */
export function propose(dir, input, { agentId, via = "router", harness, model } = {}) {
  // Version history, merge state and rollback lineage are written by approve/merge/rollback, never by an agent.
  const { at = "", name, version: _v, versions: _vs, merged: _m, rolled_back_from: _r, proposed: _p, ...rest } = input ?? {};
  if (!rest.id || !rest.question) return { ok: false, error: "a decision needs an id and a question" };
  if (rest.status && rest.status !== "open") return { ok: false, error: "an agent may only propose an open decision; a person approves it" };
  const existing = fileOf(dir, rest.id);
  const file = existing ?? `${at ? `${at}/` : ""}decisions/${name ?? rest.id}.decision.json`;
  if (!existing && !/^([a-z0-9-]+\/)*decisions\/[a-z0-9.-]+\.decision\.json$/.test(file)) return { ok: false, error: `${file} is not a decisions/ path` };
  const outside = (rest.applies_to ?? []).find((t) => !inside(t?.file));
  if (outside) return { ok: false, error: `applies_to ${outside?.file} is not a path inside the venture` };
  const before = existing ? load(ventureFile(dir, existing)) : {};
  const drafted_by = { kind: "agent", ...(agentId ? { id: agentId } : {}) };
  let d;
  if (before.status === "decided") {
    // An agent never un-decides (EE-058): the decided version stays current, and the new wording waits
    // in proposed as a draft of the next version until a person approves it.
    if (!rest.answer) return { ok: false, error: `${rest.id} is decided; propose new wording as an answer, and a person approves it as the next version` };
    d = { ...before, proposed: { answer: rest.answer, ...(rest.options ? { options: rest.options } : {}), drafted_by, proposed_at: new Date().toISOString().replace(/\.\d+Z$/, "Z") } };
  } else {
    // New wording for an open decision keeps what the agent did not restate: its parent, boundary, unlocks.
    if (rest.reasons) rest.reasons = stamp(dir, rest.reasons);
    d = { ...before, ...rest, status: "open", provenance: { drafted_by } };
  }
  const bad = validate(d);
  if (bad) return { ok: false, error: `does not match schema/decision-record.schema.json:\n${bad}` };
  mkdirSync(dirname(ventureFile(dir, file)), { recursive: true });
  writeFileSync(ventureFile(dir, file), JSON.stringify(d, null, 2) + "\n");
  const e = prov(dir, /** @type {Parameters<typeof prov>[1]} */ ({ entity: file, route: "governance/decisions", activity: "draft", agent: agentFromEnv("agent", via, { ...(agentId ? { id: agentId } : {}), ...(harness ? { harness } : {}), ...(model ? { model } : {}) }), note: `proposed decision ${d.id}` }));
  return { ok: true, result: { proposed: d.id, file, awaiting: "approval", provenance: e.hash } };
}

/** The decision with its current version moved into versions and the version number raised. */
function nextVersion(d) {
  const { versions = [], ...cur } = d;
  const snap = { version: cur.version ?? 1, status: cur.status, answer: cur.answer ?? null, ...(cur.options ? { options: cur.options } : {}), ...(cur.provenance ? { provenance: cur.provenance } : {}), ...(cur.merged?.version === (cur.version ?? 1) ? { merged: cur.merged } : {}), superseded_at: new Date().toISOString().replace(/\.\d+Z$/, "Z") };
  const { rolled_back_from, merged, proposed, ...rest } = cur;
  return { ...rest, version: (cur.version ?? 1) + 1, versions: [...versions, snap] };
}

const setField = (o, path, v) => { const ks = path.split("."); let x = o; for (const k of ks.slice(0, -1)) x = x[k] ??= {}; x[ks.at(-1)] = v; };

/** Merge: apply a decided version's answer to the records it decides (applies_to). A separate step from
 *  approving, so it can be delegated: only a person may merge unless a delegation grant names merge for
 *  this decision's class (the delegation suite). Logged as a merge in provenance. Ends by building the
 *  @param {string} dir @param {string} id @param {{ by?: string, role?: string, via?: string, note?: string, today?: string }} [opts]
 *  decision's impact map (schema/impact.mjs) and returns its summary. */
export function merge(dir, id, { by, role, via = "cli", note, today } = {}) {
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  if (!by && !role) return { ok: false, error: "merging needs the name of who merges (--by)" };
  const d = load(ventureFile(dir, file));
  if (d.status !== "decided") return { ok: false, error: `${id} is not decided; approve it before merging` };
  if (!d.applies_to?.length) return { ok: false, error: `${id} names no applies_to: nothing to merge into` };
  const version = d.version ?? 1;
  if (d.merged?.version === version) return { ok: false, error: `${id} version ${version} is already merged` };
  const outside = d.applies_to.find((t) => !inside(t?.file));
  if (outside) return { ok: false, error: `${id} applies_to ${outside?.file} is not a path inside the venture` };
  const may = mayMerge(dir, d, { by, role, today });
  if (!may.ok) return may;
  by = by ?? role;
  const actor = role ? agentFromEnv("agent", via, { id: role }) : agentFromEnv("person", via, { id: by });
  // Every target is built and checked against its record type's schema before any is written.
  const recs = new Map();
  for (const t of d.applies_to) {
    const f = ventureFile(dir, t.file);
    const rec = recs.get(t.file) ?? (existsSync(f) ? load(f) : {});
    setField(rec, t.field, d.answer);
    recs.set(t.file, rec);
  }
  // Gaps the record already had (a field not written yet) do not block a merge; errors the answer adds
  // do. A record that does not exist yet has no gaps, so a new record must pass whole. A validator that
  // cannot run proves nothing, so it refuses the merge.
  for (const [rel, rec] of recs) {
    const schema = MODEL.records.find((r) => r.id === recordOf(rel))?.schema?.replace(/^schema\//, "");
    if (!schema) continue;
    const f = ventureFile(dir, rel);
    const before = existsSync(f) ? schemaErrors(load(f), schema) : [];
    const after = schemaErrors(rec, schema);
    if (!before || !after) return { ok: false, error: `could not check ${rel} against schema/${schema}; nothing was written` };
    const added = after.filter((l) => !before.includes(l));
    if (added.length) return { ok: false, error: `merging ${id} would make ${rel} not match schema/${schema}; nothing was written:\n${added.join("\n")}` };
  }
  const files = [];
  for (const t of d.applies_to) {
    writeFileSync(ventureFile(dir, t.file), JSON.stringify(recs.get(t.file), null, 2) + "\n");
    prov(dir, { entity: t.file, route: "governance/decisions", activity: "write", agent: actor, decision: id, note: `merged ${id} version ${version} into ${t.field}` });
    files.push(t.file);
  }
  const out = { ...d, merged: { version, by, at: new Date().toISOString().replace(/\.\d+Z$/, "Z"), files } };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "merge", agent: actor, note: note ?? `merged ${id} version ${version}${may.grant ? ` under grant ${may.grant}` : ""}` });
  // Public variants written from a merged field (MDX with variant_of: <file>#<field>) were worded from
  // the old version: they are marked stale so they are re-linted before the next publish (the hook
  // item 11, republish-on-change, builds on).
  const variants = d.applies_to.flatMap((t) => variantsOf(dir, t.file, t.field));
  if (variants.length) mark(dir, variants, { paths: files, version: String(version), via: "merge" });
  const im = impact(dir, id, { via });
  return { ok: true, result: { merged: id, version, files, ...(may.grant ? { grant: may.grant } : {}), variants_stale: variants, provenance: e.hash, impact: im.ok ? im.result : { error: im.error } } };
}

/** The venture's delegation record (governance/delegation.json, the delegation suite), or null. */
const delegationOf = (dir) => { const f = ventureFile(dir, "governance/delegation.json"); return existsSync(f) ? readDelegation(f) : null; };
// Classes that are one-way doors: every class the decision-rights register marks escalate (the
// founder decides), plus production-ship. Built from the register so a class it escalates can never
// be merged by a role, and a venture's one_way_doors only adds to them.
let oneWayDefault;
export function oneWayClasses() {
  if (oneWayDefault) return oneWayDefault;
  const f = join(new URL("..", import.meta.url).pathname, "governance/venture-template/decision-rights.json");
  oneWayDefault = new Set(["production-ship", ...(load(f).classes ?? []).filter((c) => c.level === "escalate").map((c) => c.id)]);
  return oneWayDefault;
}

const rosterOf = (dir) => { const pf = ventureFile(dir, "people/people.json"); return existsSync(pf) ? load(pf).people ?? [] : []; };
/** Whether a role is a founding one, by the roles register (founder, co-founder, general partner). */
const founding = (role) => ventureRoles().some((r) => r.founder && r.id === role);

/** The venture's founders: named in governance/delegation.json, or holding a founding role in people/people.json. */
function foundersOf(dir, del) {
  const out = new Set([del?.founder ?? []].flat());
  for (const p of rosterOf(dir)) if (founding(p.role)) for (const k of [p.id, p.name]) if (k) out.add(k);
  return out;
}

/** The name setup acts as: the first founder the venture names, else its first person. */
export function founderName(dir) {
  let del = null;
  try { del = delegationOf(dir); } catch {} // approve reports a delegation file that does not parse.
  const roster = rosterOf(dir);
  return [del?.founder ?? []].flat()[0] ?? roster.find((p) => founding(p.role))?.name ?? roster[0]?.name ?? "Founder";
}

/** The people who may act as a person in this venture: ids and names in people/people.json, and the
 *  founders named in governance/delegation.json. Empty when the venture records no one. */
function peopleOf(dir) {
  const out = new Set();
  for (const p of rosterOf(dir)) for (const k of [p.id, p.name]) if (k) out.add(k);
  const founders = delegationOf(dir)?.founder;
  for (const f of [founders ?? []].flat()) if (f) out.add(f);
  return out;
}

/** Why by cannot act as a person here, or null. An agent acting, or a role, never can. A venture that
 *  records people limits it to them; rosterRequired refuses a venture that records no one. */
function notAPerson(dir, del, by, { rosterRequired }) {
  const agent = actingAgent(by);
  if (agent) return `an agent (${agent}) is acting: it cannot act as the person ${by}`;
  const roles = new Set([...(del?.grants ?? []).flatMap((g) => [g.to, g.from]), ...agentRoleIds()].filter((r) => r && r !== del?.root));
  if (roles.has(by)) return `${by} is a role, not a person`;
  const people = peopleOf(dir);
  if (!people.size) return rosterRequired ? "the venture names no people (people/people.json) or founder (governance/delegation.json): no one can act as a person" : null;
  return people.has(by) ? null : `${by} is not a person in people/people.json or a founder in governance/delegation.json`;
}

/** Who may merge a decided version. A person may (with no grant, only the founder merges), and only a
 *  founder merges a one-way door. A role (an agent or a delegate acting as one) may only under a live
 *  delegation grant to that role that names may_merge and the decision's class, whose chain reaches the
 *  @param {string} dir @param {*} d @param {{ by?: string, role?: string, today?: string }} [opts]
 *  root and whose scope holds every record the decision writes. */
export function mayMerge(dir, d, { by, role, today = new Date().toISOString().slice(0, 10) } = {}) {
  let del;
  try { del = delegationOf(dir); } catch (e) { return { ok: false, error: `${e.message}: no one merges until it is fixed` }; }
  if (by && role) return { ok: false, error: "merge as a person (--by) or as a role (--role), not both" };
  const oneWay = new Set([...oneWayClasses(), ...(del?.one_way_doors ?? [])]);
  if (!role) {
    const refused = notAPerson(dir, del, by, { rosterRequired: true });
    if (refused) return { ok: false, error: `${refused}: merge as a person only as yourself, and a role only under a delegation grant (--role)` };
    if (oneWay.has(d.class) && !foundersOf(dir, del).has(by)) return { ok: false, error: `${d.id} is a ${d.class} decision, a one-way door: only a founder merges it` };
    return { ok: true };
  }
  if (!d.class) return { ok: false, error: `${d.id} names no decision class, so no grant can cover it: only the founder merges it` };
  if (oneWay.has(d.class)) return { ok: false, error: `${d.id} is a ${d.class} decision, a one-way door: it is never delegated, only the founder merges it` };
  const held = (del?.grants ?? []).filter((g) => g.to === role && g.may_merge === true && (g.classes ?? []).includes(d.class) && liveGrant(g, today));
  if (!held.length) return { ok: false, error: `no live grant in governance/delegation.json lets ${role} merge ${d.class} decisions: only the founder merges ${d.id}` };
  const backed = held.filter((g) => grantBacked(del, g, today).ok);
  if (!backed.length) return { ok: false, error: `${role}'s grant exceeds its grantor's authority (${grantBacked(del, held[0], today).why}): only the founder merges ${d.id}` };
  const targets = (d.applies_to ?? []).map((t) => t.file);
  const g = backed.find((g) => targets.every((f) => scopeWithin(f, g.scope)));
  if (!g) return { ok: false, error: `${d.id} writes outside the scope of ${role}'s grant: only the founder merges it` };
  return { ok: true, grant: g.id ?? `${g.from}-to-${g.to}` };
}

let agentRoles;
function agentRoleIds() {
  if (agentRoles) return agentRoles;
  const f = join(new URL("..", import.meta.url).pathname, "governance/venture-template/roles/agent-roles.json");
  try { agentRoles = (load(f).roles ?? []).map((r) => r.id).filter((id) => id && id !== "founder"); } catch { agentRoles = []; }
  return agentRoles;
}

/** The public variants of a field: MDX files under the venture's content folders whose frontmatter says variant_of: <file>#<field>. */
export function variantsOf(dir, rel, field) {
  const out = [];
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
 *  The restored version is decided; merge it to apply it.
 *  @param {string} dir @param {string} id @param {string | number} to @param {{ by?: string, via?: string }} [opts] */
export function rollback(dir, id, to, { by, via = "cli" } = {}) {
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  if (!by) return { ok: false, error: "rolling back needs the person's name (--by)" };
  let del;
  try { del = delegationOf(dir); } catch (e) { return { ok: false, error: `${e.message}: no one rolls back until it is fixed` }; }
  const refused = notAPerson(dir, del, by, { rosterRequired: false });
  if (refused) return { ok: false, error: `only a person rolls back a decision: ${refused}` };
  const d = load(ventureFile(dir, file));
  const old = (d.versions ?? []).find((v) => v.version === Number(to));
  if (!old) return { ok: false, error: `${id} has no version ${to}` };
  if (old.status !== "decided") return { ok: false, error: `${id} version ${to} was never decided; only a decided version can be restored` };
  const n = nextVersion(d);
  const out = { ...n, status: "decided", answer: old.answer, ...(old.options ? { options: old.options } : {}), rolled_back_from: Number(to), provenance: { ...(old.provenance ?? {}), drafted_by: old.provenance?.drafted_by ?? { kind: "person", id: by }, approved_by: by, approved_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"), phase: load(join(dir, "venture.json")).phase, wording: "own", via } };
  if (old.provenance?.reasons) out.reasons = old.provenance.reasons;
  else delete out.reasons;
  const bad = validate(out);
  if (bad) return { ok: false, error: bad };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, /** @type {Parameters<typeof prov>[1]} */ ({ entity: file, route: "governance/decisions", activity: "accept", agent: agentFromEnv("person", via, { id: by }), note: `rolled ${id} back to version ${to} as version ${out.version}` }));
  return { ok: true, result: { decided: id, version: out.version, restored: Number(to), provenance: e.hash, next: out.applies_to?.length ? `mentura merge ${id}` : null } };
}

/** A person approves a decision: as worded, or with their own answer. @param {string} dir @param {string} id @param {{ by?: string, answer?: string, via?: string, note?: string, reasons?: object[], verified?: boolean }} [opts]
 *  verified: false is a door with no sign-in. by is then a claimed name, so the records say unverified, not person. */
export function approve(dir, id, { by, answer, via = "cli", note, reasons, verified = true } = {}) {
  const kind = verified ? "person" : "unverified";
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  if (!by) return { ok: false, error: "approving needs the person's name (--by)" };
  let del;
  try { del = delegationOf(dir); } catch (e) { return { ok: false, error: `${e.message}: no one approves until it is fixed` }; }
  // Setup approves before anyone is recorded, so a venture that names no one has no roster to check.
  const refused = notAPerson(dir, del, by, { rosterRequired: false });
  if (refused) return { ok: false, error: `only a person approves a decision: ${refused}` };
  const d = load(ventureFile(dir, file));
  // A decided decision changes by a new version: the decided one is kept, and this one supersedes it.
  // An agent's pending wording (proposed) is what the person approves when they give no answer of their own.
  if (d.status === "decided" && !answer && d.proposed) answer = d.proposed.answer;
  if (d.status === "decided" && (!answer || answer === d.answer)) return { ok: false, error: `${id} is already decided as worded; give a new --answer to make version ${(d.version ?? 1) + 1}` };
  if (d.status === "decided") {
    const pending = d.proposed, nv = nextVersion(d);
    for (const k of Object.keys(d)) delete d[k];
    Object.assign(d, nv);
    // The next version is drafted by whoever drafted it: the agent when its proposed wording is approved,
    // else the person approving their own answer. Its predecessor's wording no longer counts as a draft.
    d.answer = pending?.answer === answer ? answer : null;
    if (pending?.answer === answer && pending.options) d.options = pending.options;
    d.provenance = { drafted_by: pending?.answer === answer ? pending.drafted_by : { kind, id: by } };
  }
  if (!answer && !d.answer) return { ok: false, error: `${id} has no wording to approve; give an answer` };
  const drafted = d.provenance?.drafted_by ?? { kind, id: by };
  const wording = !verified ? "unverified" : !d.answer || drafted.kind === "framework" ? "own" : answer && answer !== d.answer ? (drafted.kind === "person" && drafted.id === by ? "own" : "changed") : drafted.kind === "person" ? "own" : "approved";
  const phase = load(join(dir, "venture.json")).phase;
  // Reasons given at approval join the drafted ones and freeze into this version's provenance, each local
  // citation with its sha256 now. On a later version every reason in d.reasons is inherited and keeps the
  // hash it was frozen at, so a citation that changed since still makes this version stale. A reason given
  // now with the same claim replaces the inherited one, which is how staleness is cleared.
  const restated = new Set((reasons ?? []).map((x) => x.claim));
  const kept = (d.reasons ?? []).filter((x) => !restated.has(x.claim));
  const given = [...(d.versions?.length ? kept : stamp(dir, kept, { keep: false })), ...stamp(dir, reasons ?? [], { keep: false })];
  const { reasons: _old, ...pv } = d.provenance ?? {};
  const frozen = given.length ? given : null;
  const out = { ...d, status: "decided", answer: answer ?? d.answer, ...(frozen ? { reasons: frozen } : {}), provenance: { ...pv, drafted_by: drafted, approved_by: by, approved_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"), phase, wording, via, ...(frozen ? { reasons: frozen } : {}) } };
  const bad = validate(out);
  if (bad) return { ok: false, error: bad };
  writeFileSync(ventureFile(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, /** @type {Parameters<typeof prov>[1]} */ ({ entity: file, route: "governance/decisions", activity: "accept", agent: agentFromEnv(kind, via, { id: by }), note: note ?? `approved decision ${id} (${wording})` }));
  return { ok: true, result: { decided: id, wording, phase, provenance: e.hash, unlocks: (out.unlocks ?? []).map((u) => u.activity), ...(frozen ? { reasons: frozen.length, cites: citesOf(frozen) } : {}) } };
}

/** The matrix: for each layer, the decisions that render now, wait, or come later, by phase. */
export function matrix(r) {
  const live = r.decisions.filter((d) => !["done", "withdrawn"].includes(d.render) && d.source !== "root");
  const layers = [...new Set(live.map((d) => d.layer))].sort();
  return layers.map((l) => ({ layer: l, ...Object.fromEntries(PHASES.map((p) => [p, live.filter((d) => d.layer === l && (d.needed_in ?? r.phase) === p).map((d) => `${d.id} (${d.render})`)])) }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (!arg) { console.error("usage: node schema/decisions.mjs <venture or workspace dir> [--json | --md]"); process.exit(2); }
  const walk = (d) => existsSync(join(d, "venture.json")) ? [d] : readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_")).flatMap((e) => walk(join(d, e.name)));
  const dirs = walk(arg);
  const rs = dirs.map((d) => ({ dir: d, ...decisions(d) }));
  if (process.argv.includes("--json")) console.log(JSON.stringify(rs.length === 1 ? rs[0] : rs, null, 2));
  else for (const r of rs) {
    console.log(`\n${relative(process.cwd(), r.dir) || "."} (${r.phase}, ${r.kind})`);
    const order = ["overdue", "stale", "now", "waiting", "later", "deferred", "done"];
    const byDue = (a, b) => (b.rank ?? -1) - (a.rank ?? -1) || (a.due ?? "~").localeCompare(b.due ?? "~");
    for (const state of order) for (const d of r.decisions.filter((x) => x.render === state && x.source !== "root" || (x.id === "foundation" && x.render === state)).sort(byDue)) console.log(`  ${state.padEnd(8)} ${d.id.padEnd(30)} ${d.boundary.padEnd(11)} ${d.layer.padEnd(10)} ${d.question}${d.held_by ? ` [held by ${d.held_by}]` : ""}${d.render === "done" ? ` [${d.firmness}${d.provenance?.approved_by ? `, approved by ${d.provenance.approved_by} in ${d.provenance.phase}` : ""}]` : ""}${d.awaiting ? " [agent's wording, awaiting approval]" : ""}${d.due && d.render !== "done" ? ` [due ${d.due}, ${d.due_in_hours}h]` : ""}${d.outcomes?.due?.length ? ` [outcomes due: ${d.outcomes.due.join(", ")}]` : ""}${d.why?.length ? `\n           why now: ${d.why.join("; ")}` : ""}`);
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
