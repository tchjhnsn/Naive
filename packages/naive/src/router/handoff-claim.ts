// The handoff claim (docs/design/LEAD_AGENTS_2026-11-08.md, "The handoff claim", build plan item 5). Two parts:
//
//   claim   the router's claim action on operations/handoff/<id>. It succeeds only when the handoff is ready,
//           unclaimed and its role is the acting role, and it sets claimed_by and status in-progress in one
//           write. claimed_by is the run id (the session the call carries: provenance.agent.session, else
//           MENTURA_SESSION), or the acting role when the call carries no run id. The write names the version
//           it read as its base, so the connector's lock and version check let exactly one of two racing claims
//           land; the loser reads again, finds the handoff claimed and is refused.
//   rules   who may write a handoff that names its requester (requested_by). Before a claim only the requester
//           edits it, and nothing but the claim action claims it. After a claim only the claimant writes
//           progress and evidence (PROGRESS), and only the requester writes the verification and acceptance
//           (VERIFY). Anyone else is refused. A handoff without requested_by is written as before, and a person
//           may write any handoff.
//
// Every handoff write passes through this file, and an app that installs Naive keeps it under node_modules, where
// Node strips no types, so the package ships it compiled to .mjs (scripts/build.ts, EE-160).
// It never calls a model.

import { record as prov } from "../core/provenance.ts";
import { address } from "../store/connectors/contract.ts";
import { schemaNameOf } from "../records/index.ts";
import { validateValue } from "../records/validate.ts";
import { gateWrite } from "./gate-hooks.ts";
import type { Answer, CallProvenance, RouteEntry, Source, Store } from "./router.ts";
import type { Handoff } from "../records/types/records.d.ts";

type Obj = Record<string, unknown>;
/** Who is writing, as provenance names the agent: the run id it carries, when it carries one. */
type Agent = { session?: string; [k: string]: unknown };

/** Fields the claimant writes after a claim: progress and evidence. */
export const PROGRESS = ["status", "evidence", "pr", "escalations", "lesson", "attempts"];
/** Fields the requester writes after a claim: the verification and acceptance, and sending work back. */
export const VERIFY = ["verification", "status", "claimed_by", "attempts"];

const RETRIES = 50;
const message = (e: unknown) => String((e && typeof e === "object" && "message" in e ? e.message : undefined) ?? e);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Who a claim names, and who a later write is compared with: the run id, else the acting role. */
export const claimantOf = (agent: Agent | undefined, actorId: string | undefined): string | null => agent?.session ?? actorId ?? null;

/** Top-level fields whose values differ between two records. */
const changedFields = (a: Obj, b: Obj) => [...new Set([...Object.keys(a), ...Object.keys(b)])].filter((k) => !same(a[k], b[k])).sort();

/**
 * Why a write of a handoff is refused, or null when it may go on. stored is the handoff as it is now (null for a new
 * one), input the whole record being written. person is true for a person's write, which no rule here refuses.
 */
export function handoffWriteRefusal({ stored, input, person, actorId, who }: {
  stored: Handoff | null; input: Partial<Handoff>; person: boolean; actorId?: string; who: string | null;
}): string | null {
  const req = stored?.requested_by ?? input.requested_by;
  if (!req || person) return null;
  const id = input.id ?? stored?.id ?? "the handoff";
  if (stored?.requested_by && input.requested_by !== stored.requested_by) return `${id} was requested by ${stored.requested_by}; requested_by does not change`;
  if (!stored || !stored.requested_by) {
    // A new handoff, or one written before requested_by: an agent names only itself as requester.
    if (actorId && input.requested_by !== actorId) return `an agent writes a handoff only as its requester: requested_by is ${input.requested_by}, and ${actorId} is acting`;
    if (!stored) return input.claimed_by === undefined && ["draft", "ready"].includes(String(input.status)) ? null
      : `a new handoff is draft or ready and unclaimed; the role it names claims it with the claim action on operations/handoff/${id}`;
  }
  const changed = changedFields(stored, input);
  if (!stored.claimed_by) {
    if (actorId !== req) return `only its requester ${req} writes ${id} before it is claimed, not ${actorId ?? "an agent with no role"}`;
    if (changed.includes("claimed_by") || !["draft", "ready"].includes(String(input.status))) return `${id} is claimed only through the claim action on operations/handoff/${id}, which the role ${stored.role} takes`;
    return null;
  }
  if (who && who === stored.claimed_by) {
    if (changed.includes("verification")) return `${who} claimed ${id} and may not verify its own work: ${req} verifies it`;
    const extra = changed.filter((k) => !PROGRESS.includes(k));
    if (extra.length) return `the claimant of ${id} writes only progress and evidence (${PROGRESS.join(", ")}), not ${extra.join(", ")}`;
    if (changed.includes("status") && !["in-progress", "escalated", "done"].includes(String(input.status))) return `the claimant of ${id} moves it to in-progress, escalated or done, not ${input.status}`;
    return null;
  }
  if (actorId === req) {
    const extra = changed.filter((k) => !VERIFY.includes(k));
    if (extra.length) return `the requester of ${id} writes only the verification and acceptance (${VERIFY.join(", ")}), not ${extra.join(", ")}: its claimant ${stored.claimed_by} writes progress and evidence`;
    const v = input.verification;
    if (changed.includes("verification")) {
      if (stored.status !== "done") return `${id} is ${stored.status}: its requester verifies it once its claimant has set it done`;
      if (v?.by !== req) return `the verification of ${id} is by its requester ${req}, not ${v?.by ?? "nobody named"}`;
    }
    if (changed.includes("status") || changed.includes("claimed_by")) {
      if (!(input.status === "ready" && input.claimed_by === undefined && v?.outcome === "rework")) return `the requester of ${id} sends it back only by recording verification outcome rework, setting status ready and clearing claimed_by`;
    }
    if (v?.outcome === "accepted" && input.status !== "done") return `${id} is accepted only while it is done`;
    return null;
  }
  return `${id} is claimed by ${stored.claimed_by} and was requested by ${req}: only the claimant writes progress and evidence, and only the requester writes the verification and acceptance, so ${who ?? actorId ?? "this caller"} may not write it`;
}

/**
 * The rule for one router write of a handoff. Returns { ok: false, error } when refused, else { ok: true, base }: base is
 * the version read when a rule applied (null for a new file), which the write names so nothing slips in between the
 * check and the write, or undefined when the handoff names no requester and the write goes on as before. input is the
 * record as written, not yet checked against the schema, read for the handoff fields the rules name.
 */
export async function handoffWriteRule({ store, file, input, person, actorId, agent }: {
  store: Store; file: string; input: Partial<Handoff>; person: boolean; actorId?: string; agent: Agent;
}): Promise<{ ok: false; error: string } | { ok: true; base: string | null | undefined; stored: Handoff | null }> {
  let cur: Awaited<ReturnType<Store["read"]>>;
  try { cur = await store.read(file); } catch (e) { return { ok: false, error: message(e) }; }
  let stored: Handoff | null = null;
  try { stored = cur ? JSON.parse(cur.content) : null; } catch { stored = null; }
  if (!stored?.requested_by && !input?.requested_by) return { ok: true, base: undefined, stored };
  const why = handoffWriteRefusal({ stored, input, person, actorId, who: claimantOf(agent, actorId) });
  return why ? { ok: false, error: why } : { ok: true, base: cur?.version ?? null, stored };
}

/**
 * Claims one handoff for the acting role. Returns { ok, result: { claimed, claimed_by, status, version, provenance } },
 * or { ok: false, error } naming why it was refused.
 */
export async function claimHandoff({ dir, r, id, route, requested, file, actor, actor_id, provenance = {}, store, src, agent, remote }: {
  dir: string; r: RouteEntry; id?: string; route: string; requested: string; file: string; actor: string; actor_id?: string;
  provenance?: CallProvenance; store: Store; src: Source; agent: Agent; remote: boolean | undefined;
}): Promise<Answer> {
  if (!actor_id) return { ok: false, error: `a claim names the acting role (actor_id), which must be the handoff's role` };
  if (store.writes !== "direct") return { ok: false, error: `${route} lives in ${src.id}, which ${store.writes === "none" ? "is read-only" : "takes writes by pull request, so a claim cannot land at once"}` };
  // Gate group hook: the venture's gate decides on a claim as on any write; a claim that would be held cannot wait.
  const verdict = remote ? null : gateWrite({ dir, r, route, requested, file, actor, actor_id, provenance, gate: null });
  if (verdict) return { ok: false, gate_rule: verdict.rule, error: verdict.then === "refuse" ? verdict.why : `gate rule ${verdict.rule} (${verdict.source}) would hold this claim as a draft, and a claim cannot wait: nothing was claimed` };
  const who = claimantOf(agent, actor_id);
  for (let i = 0; ; i++) {
    let cur: Awaited<ReturnType<Store["read"]>>;
    try { cur = await store.read(file); } catch (e) { return { ok: false, error: `${src.id}: ${message(e)}` }; }
    if (!cur) return { ok: false, error: `no handoff ${id} in ${route}` };
    let h: Handoff;
    try { h = JSON.parse(cur.content); } catch (e) { return { ok: false, error: `${file} does not parse: ${message(e)}` }; }
    if (h.claimed_by) return { ok: false, error: `${id} is already claimed by ${h.claimed_by}`, claimed_by: h.claimed_by };
    if (h.status !== "ready") return { ok: false, error: `${id} is ${h.status}: only a ready handoff is claimed (node packages/naive/src/checks/check-ready.ts --record makes it ready)` };
    if (h.role !== actor_id) return { ok: false, error: `${id} is addressed to ${h.role}, not ${actor_id}: only its role claims it` };
    const next = { ...h, claimed_by: who, status: "in-progress" };
    const v = validateValue(schemaNameOf(r.schema), next);
    if (v.status !== 0) return { ok: false, error: `does not match ${r.schema}:\n${(v.stdout + v.stderr).trim()}` };
    const text = JSON.stringify(next, null, 2) + "\n";
    let w: Awaited<ReturnType<Store["write"]>>;
    try { w = await store.write(file, text, { base: cur.version, message: `${route}: claimed by ${who}`, title: `Mentura: ${route}` }); }
    catch (e) {
      // Another write landed between the read and this one: read again, and the checks above decide.
      if (e && typeof e === "object" && "code" in e && e.code === "version-conflict" && i < RETRIES) continue;
      return { ok: false, error: `${src.id}: ${message(e)}` };
    }
    const entity = remote ? address(src.id, file) : file;
    const entry = prov(dir, { entity, route, activity: "write", agent, derived_from: provenance.derived_from, decision: provenance.decision,
      note: provenance.note ?? `claimed by ${who}`, ...(remote ? { source: { id: src.id, connector: src.connector, version: w.version } } : {}) });
    return { ok: true, result: { claimed: entity, claimed_by: who, status: "in-progress", version: w.version, provenance: entry.hash } };
  }
}
