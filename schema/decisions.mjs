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
import { dirname, join, relative } from "node:path";
import { FRAME, foundation } from "./foundation.mjs";
import { agentFromEnv, record as prov } from "../interface/provenance.mjs";

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
function decisionFiles(dir, sub = "") {
  return readdirSync(join(dir, sub), { withFileTypes: true }).flatMap((e) => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) return e.name.startsWith(".") || e.name.startsWith("_") || existsSync(join(dir, rel, "venture.json")) ? [] : decisionFiles(dir, rel);
    return e.name.endsWith(".decision.json") && sub.split("/").at(-1) === "decisions" ? [rel] : [];
  });
}

/** Every decision of a venture, resolved: boundary, render state and what holds it. */
export function decisions(dir, now = Date.parse(process.env.DECISIONS_NOW ?? "") || Date.now()) {
  const venture = load(join(dir, "venture.json"));
  const phase = PHASES.indexOf(venture.phase);
  const productOnly = venture.kind === "product";
  const report = foundation(dir);
  const statements = report.flatMap((q) => q.statements);
  const settled = statements.filter((s) => s.status !== "planned").every((s) => s.status === "confirmed");
  const errors = [];

  const list = [
    { id: "venture", question: `Build ${venture.name} as a venture`, source: "root", layer: "governance", parent: null, boundary: productOnly ? "fail-open" : "fail-closed", status: "decided", decided_at: null },
    { id: "foundation", question: `Settle the strategic foundation (${statements.filter((s) => !["confirmed", "planned"].includes(s.status)).length} statements open)`, source: "root", layer: "purpose", parent: "venture", boundary: productOnly ? "fail-open" : "fail-closed",
      status: settled ? "decided" : "open", decided_at: null, needed_in: venture.phase },
  ];
  for (const f of decisionFiles(dir)) {
    const d = load(join(dir, f));
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
    // A decision that settles a foundation statement is part of the foundation, not under it.
    const parent = d.parent ?? (d.statement ? "venture" : FOUNDATION_RECORDS.has(record) ? "foundation" : "venture");
    list.push({ ...d, file: f, source: "file", decides: { record, path }, layer, boundary, parent, ...(d.statement ? { part_of: "foundation" } : {}) });
  }
  const covered = new Set(list.map((d) => d.statement).filter(Boolean));
  // A foundation statement no person has confirmed is a decision the founder still owes. It is
  // part of the foundation rather than under it, so the foundation does not hold it.
  for (const s of statements.filter((x) => !["confirmed", "planned"].includes(x.status) && !x.derived_from && !covered.has(x.id))) {
    list.push({ id: `foundation-${s.id}`, question: `Confirm the ${s.id} statement (${s.status})`, source: "foundation", layer: MODEL.records.find((r) => r.id === s.record)?.layer ?? "purpose",
      decides: { record: s.record }, parent: "venture", part_of: "foundation", boundary: "inherit", status: "open", needed_in: venture.phase });
  }
  // An agent's draft of a gated record waits for a person to accept it.
  const drafts = existsSync(join(dir, "_drafts")) ? readdirSync(join(dir, "_drafts")).filter((f) => f.endsWith(".draft")) : [];
  for (const d of drafts) {
    const path = d.replace(/\.draft$/, "").replace(/__/g, "/");
    const record = recordOf(path);
    list.push({ id: `draft-${path.replace(/[^a-z0-9]+/g, "-").replace(/-json$/, "")}`, question: `Accept or reject the agent's draft of ${path}`, source: "draft",
      layer: MODEL.records.find((r) => r.id === record)?.layer ?? path.split("/")[0], decides: { record, path }, parent: FOUNDATION_RECORDS.has(record) ? "foundation" : "venture",
      boundary: "inherit", status: "open", needed_in: venture.phase });
  }

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

  return { venture: venture.id, phase: venture.phase, kind: productOnly ? "product" : "venture", errors, decisions: list.map((d) => {
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
    const stale = d.status === "decided" && at(d) && at(parent) && at(parent) > at(d);
    // A due time is a real deadline: it overrides needed_in, and an open decision past it is overdue.
    const later = !d.due && d.needed_in && PHASES.indexOf(d.needed_in) > phase;
    const overdue = d.status === "open" && d.due && Date.parse(d.due) < now;
    const render = d.status === "withdrawn" ? "withdrawn" : d.status === "deferred" ? "deferred" : stale ? "stale" : overdue ? "overdue"
      : d.status === "decided" ? "done" : later ? "later" : holder ? "waiting" : "now";
    const firmness = d.status !== "decided" ? "open" : venture.phase === "discovery" ? "working" : "firm";
    return { id: d.id, question: d.question, source: d.source, layer: d.layer, parent: d.parent, boundary, needed_in: d.needed_in ?? null, status: d.status, render, firmness,
      ...(render === "waiting" || (overdue && holder) ? { held_by: holder.id } : {}),
      ...(d.due ? { due: d.due, due_in_hours: Math.round((Date.parse(d.due) - now) / 36e5) } : {}), ...(d.part_of ? { part_of: d.part_of } : {}), ...(d.decides ? { decides: d.decides } : {}), ...(d.file ? { file: d.file } : {}), ...(d.answer ? { answer: d.answer } : {}),
      ...(d.status === "open" && d.answer && d.provenance?.drafted_by?.kind === "agent" ? { awaiting: "approval" } : {}),
      ...(d.provenance ? { provenance: d.provenance } : {}),
      ...(d.outcomes?.length ? { outcomes: { total: d.outcomes.length, pending: d.outcomes.filter((o) => (o.result ?? "pending") === "pending").length,
        due: d.outcomes.filter((o) => (o.result ?? "pending") === "pending" && /^\d{4}-\d{2}-\d{2}/.test(o.by ?? "") && Date.parse(o.by) < now).map((o) => o.id) } } : {}),
      ...(d.unlocks?.length ? { unlocks: d.unlocks.map((u) => u.activity) } : {}) };
  }) };
}

/** The decision that makes an agent's write of this file a draft: open and failing closed, or held. */
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
  const files = decisionFiles(dir).map((f) => load(join(dir, f)));
  const d = files.find((x) => x.status !== "decided" && x.status !== "withdrawn" && (x.unlocks ?? []).some((u) =>
    (u.routes ?? []).some((g) => routeGlob(g).test(route)) && (!u.for?.length || !actorId || u.for.includes(actorId))));
  return d ? { id: d.id, question: d.question } : null;
}

const validate = (d) => {
  const scratch = mkdtempSync(join(tmpdir(), "decision-"));
  const f = join(scratch, "d.json");
  writeFileSync(f, JSON.stringify(d));
  const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "decision-record.schema.json", "--file", f], { encoding: "utf8" });
  rmSync(scratch, { recursive: true, force: true });
  return v.status === 0 ? null : (v.stdout + v.stderr).trim();
};
const fileOf = (dir, id) => decisionFiles(dir).find((f) => load(join(dir, f)).id === id);

/** An agent proposes a decision, or new wording for an open one. It stays open until a person
 *  approves it: an agent never decides (EE-058). at: the folder beside the record it decides. */
export function propose(dir, input, { agentId, via = "router", harness, model } = {}) {
  const { at = "", name, ...rest } = input ?? {};
  if (!rest.id || !rest.question) return { ok: false, error: "a decision needs an id and a question" };
  if (rest.status && rest.status !== "open") return { ok: false, error: "an agent may only propose an open decision; a person approves it" };
  const existing = fileOf(dir, rest.id);
  if (existing && load(join(dir, existing)).status === "decided") return { ok: false, error: `${rest.id} is decided; only a person can change it` };
  const file = existing ?? `${at ? `${at}/` : ""}decisions/${name ?? rest.id}.decision.json`;
  if (!existing && !/^([a-z0-9-]+\/)*decisions\/[a-z0-9.-]+\.decision\.json$/.test(file)) return { ok: false, error: `${file} is not a decisions/ path` };
  const d = { ...rest, status: "open", provenance: { drafted_by: { kind: "agent", ...(agentId ? { id: agentId } : {}) } } };
  const bad = validate(d);
  if (bad) return { ok: false, error: `does not match schema/decision-record.schema.json:\n${bad}` };
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), JSON.stringify(d, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "draft", agent: agentFromEnv("agent", via, { ...(agentId ? { id: agentId } : {}), ...(harness ? { harness } : {}), ...(model ? { model } : {}) }), note: `proposed decision ${d.id}` });
  return { ok: true, result: { proposed: d.id, file, awaiting: "approval", provenance: e.hash } };
}

/** A person approves a decision: as worded, or with their own answer. */
export function approve(dir, id, { by, answer, via = "cli", note } = {}) {
  const file = fileOf(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  if (!by) return { ok: false, error: "approving needs the person's name (--by)" };
  const d = load(join(dir, file));
  if (d.status === "decided") return { ok: false, error: `${id} is already decided` };
  if (!answer && !d.answer) return { ok: false, error: `${id} has no wording to approve; give an answer` };
  const drafted = d.provenance?.drafted_by ?? { kind: "person", id: by };
  const wording = answer && answer !== d.answer ? (drafted.kind === "person" && drafted.id === by ? "own" : "changed") : drafted.kind === "person" ? "own" : "approved";
  const phase = load(join(dir, "venture.json")).phase;
  const out = { ...d, status: "decided", answer: answer ?? d.answer, provenance: { ...d.provenance, drafted_by: drafted, approved_by: by, approved_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"), phase, wording, via } };
  const bad = validate(out);
  if (bad) return { ok: false, error: bad };
  writeFileSync(join(dir, file), JSON.stringify(out, null, 2) + "\n");
  const e = prov(dir, { entity: file, route: "governance/decisions", activity: "accept", agent: agentFromEnv("person", via, { id: by }), note: note ?? `approved decision ${id} (${wording})` });
  return { ok: true, result: { decided: id, wording, phase, provenance: e.hash, unlocks: (out.unlocks ?? []).map((u) => u.activity) } };
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
    const byDue = (a, b) => (a.due ?? "~").localeCompare(b.due ?? "~");
    for (const state of order) for (const d of r.decisions.filter((x) => x.render === state && x.source !== "root" || (x.id === "foundation" && x.render === state)).sort(byDue)) console.log(`  ${state.padEnd(8)} ${d.id.padEnd(30)} ${d.boundary.padEnd(11)} ${d.layer.padEnd(10)} ${d.question}${d.held_by ? ` [held by ${d.held_by}]` : ""}${d.render === "done" ? ` [${d.firmness}${d.provenance?.approved_by ? `, approved by ${d.provenance.approved_by} in ${d.provenance.phase}` : ""}]` : ""}${d.awaiting ? " [agent's wording, awaiting approval]" : ""}${d.due && d.render !== "done" ? ` [due ${d.due}, ${d.due_in_hours}h]` : ""}${d.outcomes?.due?.length ? ` [outcomes due: ${d.outcomes.due.join(", ")}]` : ""}`);
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
