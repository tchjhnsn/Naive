// The detection ledger (docs/design/SIGNAL_DETECTION_2026-11-07.md, "The detection ledger"): each call a detector makes is a
// trial line in <venture>/governance/detectors/<id>.trials.jsonl, and its later settling is a resolution line that
// names the trial. Every line goes through the router's append action (governance/detector-trial/<id>), so the gate,
// team plan access, the record's schema and provenance apply, and the router chains it onto the ledger's last line.
//
// A resolution is refused for a trial the ledger does not hold, for a trial already resolved, and for an outcome the
// call cannot have (a yes call resolves as a hit or a false alarm, a no call as a miss or a correct rejection). The
// check and the append are one step: the append names the version the check read, and a ledger that moved in between
// is read and checked again. Silence is no data: nothing here resolves a trial because time passed.
//
// The gate is the first caller (packages/naive/src/router/gate-hooks.ts ledgerHook). Rates, sensitivity and ROC
// area over a ledger are packages/naive/src/engine/detection.ts.

import { randomUUID } from "node:crypto";
import { lineHash } from "../core/provenance.ts";
import { call } from "./router.ts";
import type { CallProvenance } from "./router.ts";
import type { DetectorTrial } from "../records/types/records.d.ts";

const RETRIES = 200;
const pause = () => new Promise<void>((ok) => setTimeout(ok, 1 + Math.random() * 10));
const drop = (o: Record<string, unknown>) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

/** Where a detector's ledger lives, relative to the venture. */
export const ledgerPath = (detector: string) => `governance/detectors/${detector}.trials.jsonl`;
/** The router route of a detector's ledger. */
export const ledgerRoute = (detector: string) => `governance/detector-trial/${detector}`;

/** The outcomes each call can resolve as. An unsure call went to a person, whose own call is not recorded here, so any outcome fits it. */
export const FITS: Record<string, string[]> = { yes: ["hit", "false-alarm"], no: ["miss", "correct-rejection"], unsure: ["hit", "miss", "false-alarm", "correct-rejection"] };

/** Who reads or appends, and through which venture. */
export type Ctx = { venture?: string; workspace?: string; actor?: string; actor_id?: string; via?: string; provenance?: CallProvenance };
/** One ledger line: a trial or a resolution. */
export type Line = DetectorTrial;

/**
 * A detector's ledger, read through the router: its lines in order and its version (null when there is none yet).
 */
export async function read(ctx: Ctx, detector: string): Promise<{ lines: Line[]; version: string | null }> {
  const res = await call({ venture: ctx.venture, workspace: ctx.workspace, route: ledgerRoute(detector), action: "read", actor: ctx.actor ?? "agent", actor_id: ctx.actor_id, via: ctx.via ?? "router" });
  if (!res.ok) throw new Error(res.error ?? `could not read ${ledgerPath(detector)}`);
  return { lines: Array.isArray(res.result) ? res.result : [], version: res.source?.version ?? null };
}

/**
 * Checks a ledger's chain and shape: each line's prev is the hash before it (genesis first), each hash is lineHash of
 * its line, ids are unique, and each resolution names an earlier trial, resolves it once and fits its call.
 */
export function verify(lines: Line[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  const ids = new Set<string>(), trials = new Map<string, Line>(), resolved = new Set<string | undefined>();
  let prev = "genesis";
  lines.forEach((l, i) => {
    const at = `line ${i + 1}${l?.id ? ` (${l.id})` : ""}`;
    if (l.prev !== prev) errors.push(`${at}: prev is ${l.prev}, the line before hashes to ${prev}`);
    if (l.hash !== lineHash(l.prev, l)) errors.push(`${at}: its hash does not match its content`);
    prev = l.hash;
    if (ids.has(l.id)) errors.push(`${at}: the id is used twice`);
    ids.add(l.id);
    if (l.kind === "trial") trials.set(l.id, l);
    else if (l.kind === "resolution") {
      const t = trials.get(l.trial ?? "");
      if (!t) errors.push(`${at}: resolves ${l.trial}, which no earlier line is`);
      else if (!(FITS[t.call ?? ""] ?? []).includes(l.outcome ?? "")) errors.push(`${at}: a ${t.call} call cannot resolve as ${l.outcome}`);
      if (resolved.has(l.trial)) errors.push(`${at}: ${l.trial} was already resolved`);
      resolved.add(l.trial);
    }
  });
  return { ok: !errors.length, errors };
}

/**
 * Appends one trial: the call a detector made. The caller makes the call; this records it.
 */
export async function appendTrial(ctx: Ctx, { detector, score, criterion, call: made, provenance, id, at, note }: {
  detector: string; score: number; criterion: DetectorTrial["criterion"]; call: "yes" | "no" | "unsure"; provenance?: string; id?: string; at?: string; note?: string;
}) {
  const line = drop({ kind: "trial", id: id ?? randomUUID(), detector, at: at ?? new Date().toISOString(), score, criterion, call: made, provenance, note });
  return await call({ venture: ctx.venture, workspace: ctx.workspace, route: ledgerRoute(detector), action: "append", input: { line }, actor: ctx.actor ?? "agent", actor_id: ctx.actor_id, via: ctx.via ?? "router", provenance: ctx.provenance });
}

/**
 * Appends one resolution: how a trial turned out, and who settled it. Refused for an unknown trial, a trial already
 * resolved, or an outcome its call cannot have.
 */
export async function resolveTrial(ctx: Ctx, { detector, trial, outcome, by, signal, id, at, note }: {
  detector: string; trial: string; outcome: NonNullable<DetectorTrial["outcome"]>; by: NonNullable<DetectorTrial["by"]>; signal?: DetectorTrial["signal"]; id?: string; at?: string; note?: string;
}) {
  for (let i = 0; ; i++) {
    const { lines, version } = await read(ctx, detector);
    const t = lines.find((l) => l.kind === "trial" && l.id === trial);
    if (!t) return { ok: false, error: `${ledgerPath(detector)} holds no trial ${trial}` };
    const done = lines.find((l) => l.kind === "resolution" && l.trial === trial);
    if (done) return { ok: false, error: `trial ${trial} is already resolved as ${done.outcome} (${done.id})`, resolved_by: done.id };
    if (!(FITS[t.call ?? ""] ?? []).includes(outcome)) return { ok: false, error: `trial ${trial} was a ${t.call} call, which cannot resolve as ${outcome}` };
    const line = drop({ kind: "resolution", id: id ?? randomUUID(), detector, at: at ?? new Date().toISOString(), trial, outcome, signal, by, note });
    const res = await call({ venture: ctx.venture, workspace: ctx.workspace, route: ledgerRoute(detector), action: "append", input: { line, base: version }, actor: ctx.actor ?? "person", actor_id: ctx.actor_id, via: ctx.via ?? "router", provenance: ctx.provenance });
    if (res.ok || !res.conflict || i >= RETRIES) return res;
    await pause();
  }
}

/** The no-call trial that judged a write, by that write's provenance hash, when it is not resolved yet. */
export function unresolvedNoCall(lines: Line[], hash: string): Line | null {
  const resolved = new Set(lines.filter((l) => l.kind === "resolution").map((l) => l.trial));
  return lines.filter((l) => l.kind === "trial" && l.call === "no" && l.provenance === hash && !resolved.has(l.id)).at(-1) ?? null;
}
