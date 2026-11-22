// The router's hooks into the gate group (X-1 to X-6, P-2, P-7, U-4). Each is called from one
// marked line in packages/naive/src/router/router.ts, so the router stays the route table and the logic stays in
// packages/naive/src/engine/gate.ts (the verdict), packages/naive/src/engine/gate-drafts.ts (held drafts) and packages/naive/src/engine/naive-config.ts
// (the venture's overrides).

import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { confidenceCall, evaluate, writerRule } from "../engine/gate.ts";
import { trialOf, writeHeld } from "../engine/gate-drafts.ts";
import { reachRefusal } from "../engine/agents/reach.ts";
import { entries as provEntries } from "../core/provenance.ts";
import { checksFor, configFor } from "../engine/naive-config.ts";
import { ventureFile } from "../core/venture-paths.ts";
import type { CallProvenance, RouteEntry } from "./router.ts";
import type { Appended } from "./detection-ledger.ts";
import type { DetectorTrial } from "../records/types/records.d.ts";

/** The gate's verdict on a write that does not pass. */
export type Verdict = { then: string; rule: string | null; source: string | null; why?: string; fix?: unknown; owner?: string; matched?: unknown[]; variants?: boolean; function?: string | null };
/** A refusal as a router answer. */
type Refusal = { ok: false; error: string; gate_rule: string; refused_by: string; fix?: unknown; may_write?: unknown };
type Ledgered = Record<string, unknown>;
/** What the gate reads of a route: recipes/<pattern> passes its own table entry (recipes.ts). */
type GateRoute = { route?: string; record?: string; writer?: string; function?: string | null };
/** A thrown value's message, when it has one. */
const messageOf = (e: unknown): unknown => (e && typeof e === "object" && "message" in e ? e.message : undefined);

/**
 * One writer per file, checked on every write and append, local or in another source, before anything else is
 * read or checked: a projection record only from the projector, and from the projector only projection records
 * or a missing record a person owns (writerRule in packages/naive/src/engine/gate.ts). A record in another source
 * counts as existing, since only its connector could say otherwise. A record type with writer person (a research
 * program) only from a person: actor is the call's actor and acting says the process names an agent as acting. A
 * record type with writer function (the spend register) only from <function>-agent or a person: role is the acting role.
 * Returns the refusal as a router answer, or null.
 */
export function ownerOfWrite({ dir, r, route, file, projector, remote = false, actor = "agent", acting = false, role }: {
  dir: string; r: RouteEntry; route: string; file: string; projector: boolean; remote?: boolean; actor?: string; acting?: boolean; role?: string;
}): Refusal | null {
  const v = writerRule({ route, writer: r.writer, projector, exists: remote || existsSync(ventureFile(dir, file)), actor, acting, role, fn: r.function });
  return v ? { ok: false, error: v.why, gate_rule: v.rule, refused_by: v.source, ...(v.fix ? { fix: v.fix } : {}) } : null;
}

/**
 * A function agent's write reach, checked on every write before the schema: an agent acting as <function>-agent
 * (a function in departments.json) writes only a route its derived write globs match (functionWrites in
 * packages/naive/src/engine/agents/reach.ts: decisions/* and the routes of the record types the data model gives
 * its function). A person's call made while the process says an agent is acting counts as the agent's. A person, the
 * projector and every other role (leads, researchers, the chief of staff, plain agent) are not checked here.
 * Returns the refusal as a router answer, or null.
 */
export function reachOfWrite({ r, route, projector, actor = "agent", acting = false, role }: {
  r: RouteEntry; route: string; projector: boolean; actor?: string; acting?: boolean; role?: string;
}): Refusal | null {
  if (projector || (actor === "person" && !acting)) return null;
  const v = reachRefusal({ role, route, table: r.route });
  return v ? { ok: false, error: v.why, gate_rule: v.rule, refused_by: v.source, may_write: v.writes } : null;
}

/**
 * The gate's verdict on a local write, or null when it passes. A person is never held, only
 * refused. A naive.config.json that is not valid JSON fails closed: an agent's write is held. The
 * projector's write to a projection record is never held either: no one but the projector could accept it.
 */
export function gateWrite({ dir, r, route, requested, file, actor, actor_id, provenance = {}, gate, projector = false }: {
  dir: string; r: GateRoute; route: string; requested: string; file: string; actor: string; actor_id?: string; provenance?: { confidence?: number | string | null };
  gate?: { owner?: string | null } | null; projector?: boolean;
}): Verdict | null {
  const settled = projector && r.writer === "projection";
  let config;
  try { config = configFor(dir); }
  catch (e) { return actor === "person" || settled ? null : { then: "draft", rule: "naive.config.json", source: "naive.config.json", why: `${messageOf(e)}: the gate fails closed, written as a draft for a person to accept` }; }
  const confidence = provenance.confidence === undefined || provenance.confidence === null || provenance.confidence === "" ? undefined : Number(provenance.confidence);
  const v = evaluate({ config, dir, route, table: r.route, requested, record: r.record, actor, role: actor_id, confidence: Number.isNaN(confidence) ? undefined : confidence,
    exists: existsSync(ventureFile(dir, file)), decisionOwner: gate?.owner ?? undefined, writer: r.writer, writerFunction: r.function, projector });
  if (v.then === "pass") return null;
  if ((actor === "person" || settled) && v.then !== "refuse") return null;
  return v;
}

/** Stores an agent's held draft: its sidecar, the owner it was sent to, and variants side by side. */
export function heldDraft(dir: string, { draft, file, text, verdict, route, agent, trial }: {
  draft: string; file: string; text: string; verdict: Verdict | null; route: string; agent?: { id?: string; kind?: string }; trial?: string;
}) {
  return writeHeld(dir, { draft, file, text, verdict, route, agent, trial });
}

/** The gate's detector: its question is "does this write need a person?". Its file is the venture's to keep. */
export const GATE_DETECTOR = "gate-confidence";

/**
 * The detection ledger hook for one local write through the router, or null when the venture keeps no
 * governance/detectors/gate-confidence.json (then nothing is read or written, and the write is as before).
 * Called before the write lands. An agent's write the gate asked its confidence question about becomes a trial: held
 * is a yes call, passed a no call. Its id goes on the held draft (held), so accepting that draft can resolve it. A
 * person accepting a held draft resolves its trial as a false alarm (signal override); a person's revert of a write
 * (activity rollback) resolves the no call that let the write through as a miss (signal correction). after(hash)
 * appends the line once the write's provenance line exists, and answers what it appended or why it could not; a
 * ledger that cannot be written never undoes the write.
 */
export function ledgerHook({ dir, venture, workspace, r, route, file, draftFile, actor, actor_id, via, provenance = {}, draft }: {
  dir: string; venture?: string; workspace?: string; r: RouteEntry; route: string; file: string; draftFile: string; actor: string; actor_id?: string; via?: string;
  provenance?: CallProvenance; draft?: boolean;
}): { held?: string; after: (hash: string) => Promise<Ledgered> } | null {
  const detFile = ventureFile(dir, `governance/detectors/${GATE_DETECTOR}.json`);
  if (!existsSync(detFile)) return null;
  const ctx = { venture, workspace, actor_id, via };
  const ledger = () => import("./detection-ledger.ts");
  const answer = (res: Appended, what: { kind: string; call?: string; outcome?: string }): Ledgered => res.ok && res.result ? { id: GATE_DETECTOR, appended: what.kind, line: res.result.line.id, ...(what.call ? { call: what.call } : { outcome: what.outcome }) } : { id: GATE_DETECTOR, error: res.error };
  const guard = (fn: (hash: string) => Promise<Ledgered>) => async (hash: string): Promise<Ledgered> => { try { return await fn(hash); } catch (e) { return { id: GATE_DETECTOR, error: String(messageOf(e) ?? e) }; } };
  if (actor === "person") {
    const by = { kind: "person" as const, id: process.env.MENTURA_PERSON ?? actor_id ?? "founder" };
    const person = { ...ctx, actor: "person" };
    if (provenance.activity === "accept") {
      const trial = trialOf(dir, draftFile, provenance.derived_from?.[0]);
      if (!trial) return null;
      return { after: guard(async () => answer(await (await ledger()).resolveTrial(person, { detector: GATE_DETECTOR, trial, outcome: "false-alarm", signal: "override", by,
        note: `a person accepted the held draft of ${route}` }), { kind: "resolution", outcome: "false-alarm" })) };
    }
    if (provenance.activity === "rollback") {
      return { after: guard(async (hash) => {
        // The write reverted is the one before this revert; the no call that let it through was a miss.
        const before = provEntries(dir).filter((e: { entity: string; hash: string }) => e.entity === file && e.hash !== hash).at(-1);
        const { read, resolveTrial, unresolvedNoCall } = await ledger();
        const t = before ? unresolvedNoCall((await read(person, GATE_DETECTOR)).lines, before.hash) : null;
        if (!t) return { id: GATE_DETECTOR, note: "no unresolved no call judged the write reverted" };
        return answer(await resolveTrial(person, { detector: GATE_DETECTOR, trial: t.id, outcome: "miss", signal: "correction", by, note: `a person reverted ${route}` }), { kind: "resolution", outcome: "miss" });
      }) };
    }
    return null;
  }
  let config, detector;
  try { config = configFor(dir); detector = JSON.parse(readFileSync(detFile, "utf8")); } catch { return null; }
  const confidence = provenance.confidence === undefined || provenance.confidence === null || provenance.confidence === "" ? undefined : Number(provenance.confidence);
  const c = confidenceCall({ config, route, table: r.route, actor, role: actor_id, confidence, exists: existsSync(ventureFile(dir, file)) });
  if (!c) return null;
  // The criterion in force, as the ledger keeps it: the line the gate rule actually used (a rule's number,
  // naive.config.json thresholds or the detector, as configFor resolved them), yes strictly below it, or route person.
  const criterion: DetectorTrial["criterion"] = detector?.criterion?.route === "person" ? { route: "person" } : { yes: c.limit, yes_when: "below" };
  const id = randomUUID();
  return {
    held: draft && c.call === "yes" ? id : undefined,
    after: guard(async (hash) => answer(await (await ledger()).appendTrial({ ...ctx, actor: "agent" }, { detector: GATE_DETECTOR, id, score: c.score, criterion, call: c.call, provenance: hash,
      note: `gate rule ${c.rule}: confidence ${c.score} against ${c.limit}` }), { kind: "trial", call: c.call })),
  };
}

/** A route's checks with their mode from naive.config.json: run, warn or off. A broken config runs them all. */
export function checkPlan(dir: string, checks: string[]): { check: string; mode: string }[] {
  try { return checksFor(configFor(dir), checks); } catch { return checks.map((check) => ({ check, mode: "run" })); }
}
