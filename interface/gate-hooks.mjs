// The router's hooks into the gate group (X-1 to X-6, P-2, P-7, U-4). Each is called from one
// marked line in interface/router.mjs, so the router stays the route table and the logic stays in
// schema/gate.mjs (the verdict), schema/gate-drafts.mjs (held drafts) and schema/naive-config.mjs
// (the venture's overrides).

import { existsSync } from "node:fs";
import { join } from "node:path";
import { evaluate } from "../schema/gate.mjs";
import { writeHeld } from "../schema/gate-drafts.mjs";
import { checksFor, configFor } from "../schema/naive-config.mjs";
import { ventureFile } from "../schema/venture-paths.mjs";

/**
 * The gate's verdict on a local write, or null when it passes. A person is never held, only
 * refused. A naive.config.json that is not valid JSON fails closed: an agent's write is held.
 */
export function gateWrite({ dir, r, route, requested, file, actor, actor_id, provenance = {}, gate }) {
  let config;
  try { config = configFor(dir); }
  catch (e) { return actor === "person" ? null : { then: "draft", rule: "naive.config.json", source: "naive.config.json", why: `${e.message}: the gate fails closed, written as a draft for a person to accept` }; }
  const confidence = provenance.confidence === undefined || provenance.confidence === null || provenance.confidence === "" ? undefined : Number(provenance.confidence);
  const v = evaluate({ config, dir, route, table: r.route, requested, record: r.record, actor, role: actor_id, confidence: Number.isNaN(confidence) ? undefined : confidence,
    exists: existsSync(ventureFile(dir, file)), decisionOwner: gate?.owner ?? undefined });
  if (v.then === "pass") return null;
  if (actor === "person" && v.then !== "refuse") return null;
  return v;
}

/** Stores an agent's held draft: its sidecar, the owner it was sent to, and variants side by side. */
export function heldDraft(dir, { draft, file, text, verdict, route, agent }) {
  return writeHeld(dir, { draft, file, text, verdict, route, agent });
}

/** A route's checks with their mode from naive.config.json: run, warn or off. A broken config runs them all. */
export function checkPlan(dir, checks) {
  try { return checksFor(configFor(dir), checks); } catch { return checks.map((check) => ({ check, mode: "run" })); }
}
