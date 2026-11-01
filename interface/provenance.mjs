// The provenance log (EE-031): one append-only JSON line per write, after W3C PROV (entity,
// activity, agent, derived from). Each line carries the previous line's hash, so an edited or
// deleted line breaks the chain. Lives at <venture>/provenance.jsonl, in the system layer, so it
// is on whatever layers a venture uses. Git history stays the implicit provenance for anything
// written outside the router.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { emit } from "./instrumentation.mjs";
import { ventureFile } from "../schema/venture-paths.mjs";

export const LOG = "provenance.jsonl";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const sorted = (x) => Array.isArray(x) ? x.map(sorted) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted(x[k])])) : x;
export const lineHash = (prev, entry) => { const { hash, ...rest } = entry; return sha(prev + JSON.stringify(sorted(rest))); };
export const contentHash = (file) => sha(readFileSync(file));

export function entries(dir) {
  const f = ventureFile(dir, LOG);
  return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
}

/** The agent behind this process: MENTURA_ACTOR (person or agent), MENTURA_ACTOR_ID, MENTURA_MODEL, MENTURA_SESSION, MENTURA_HARNESS. */
export function agentFromEnv(kind, via, extra = {}) {
  const e = process.env;
  const a = { kind, via, id: e.MENTURA_ACTOR_ID, model: kind === "agent" ? e.MENTURA_MODEL : undefined, session: e.MENTURA_SESSION, harness: e.MENTURA_HARNESS, ...extra };
  return Object.fromEntries(Object.entries(a).filter(([, v]) => v));
}

/** The agent this process says is acting, when it is not the person named by: MENTURA_ACTOR other than person,
 *  MENTURA_MODEL, or a MENTURA_ACTOR_ID other than by. These are environment variables anyone can
 *  unset, so this catches an honest or careless agent; it is not signed identity. */
export function actingAgent(by) {
  const e = process.env;
  const said = e.MENTURA_ACTOR?.trim().toLowerCase();
  if ((said && said !== "person") || e.MENTURA_MODEL) return e.MENTURA_ACTOR_ID ?? e.MENTURA_MODEL ?? "agent";
  return e.MENTURA_ACTOR_ID && e.MENTURA_ACTOR_ID !== by ? e.MENTURA_ACTOR_ID : null;
}

/**
 * Appends one entry for a file just written: a path relative to the venture folder, or, for a
 * record in another source (EE-037), its address (<source>://<path>) with the content's sha256
 * and the source's version, commit and pull request.
 * @param {string} dir
 * @param {{ entity: string, route?: string, activity: string, agent?: Record<string, any>, derived_from?: string[], decision?: string, note?: string, sha256?: string, source?: *, statement?: string, statements?: string[] }} entry
 */
export function record(dir, { entity, route, activity, agent, derived_from, decision, note, sha256, source, statement, statements }) {
  const prior = entries(dir);
  const prev = prior.length ? prior.at(-1).hash : "genesis";
  const entry = Object.fromEntries(Object.entries({ at: new Date().toISOString(), entity, route, activity, agent,
    derived_from: derived_from?.length ? derived_from : undefined, decision, note, source, statement, statements, sha256: sha256 ?? contentHash(ventureFile(dir, entity)), prev }).filter(([, v]) => v !== undefined));
  entry.hash = lineHash(prev, entry);
  appendFileSync(ventureFile(dir, LOG), JSON.stringify(entry) + "\n");
  // Context hook: every provenance entry (write, draft, accept, confirm, decision) is an instrumentation event (P-4).
  emit(dir, { kind: "provenance", activity: entry.activity, entity: entry.entity, route: entry.route, decision: entry.decision, by: entry.agent?.kind, via: entry.agent?.via });
  fireTriggers(dir);
  return entry;
}

// Triggers hook (M-12, E-7): every entry is an event. A venture whose naive.config.json has triggers or
// kits runs them (schema/triggers.mjs) in a separate process after the write; the runs themselves do
// not fire this again. A crash of that process is kept for the next run to raise, never lost.
function fireTriggers(dir) {
  if (process.env.NAIVE_TRIGGERS_ACTIVE) return;
  let cfg;
  try { cfg = JSON.parse(readFileSync(join(ventureFile(dir, "naive.config.json")), "utf8")); } catch { return; }
  if (!cfg?.triggers?.length && !cfg?.kits?.length) return;
  // The write has landed; nothing here may undo it or throw past it.
  try {
    const p = spawnSync(process.execPath, [new URL("../schema/triggers.mjs", import.meta.url).pathname, dir, "--fire", "--quiet"], { encoding: "utf8", env: { ...process.env, NAIVE_TRIGGERS_ACTIVE: "hook" } });
    if (p.status !== 0) {
      mkdirSync(join(dir, ".naive"), { recursive: true });
      appendFileSync(join(dir, ".naive/trigger-errors.jsonl"), JSON.stringify({ at: new Date().toISOString(), status: p.status, error: (p.stderr || p.stdout || String(p.error ?? "")).trim().slice(-2000) }) + "\n");
    }
  } catch (e) { console.error(`triggers did not run after this write: ${e.message}`); }
}
