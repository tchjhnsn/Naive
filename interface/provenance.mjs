// The provenance log (EE-031): one append-only JSON line per write, after W3C PROV (entity,
// activity, agent, derived from). Each line carries the previous line's hash, so an edited or
// deleted line breaks the chain. Lives at <venture>/provenance.jsonl, in the system layer, so it
// is on whatever layers a venture uses. Git history stays the implicit provenance for anything
// written outside the router.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const LOG = "provenance.jsonl";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const sorted = (x) => Array.isArray(x) ? x.map(sorted) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted(x[k])])) : x;
export const lineHash = (prev, entry) => { const { hash, ...rest } = entry; return sha(prev + JSON.stringify(sorted(rest))); };
export const contentHash = (file) => sha(readFileSync(file));

export function entries(dir) {
  const f = join(dir, LOG);
  return existsSync(f) ? readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
}

/** The agent behind this process: MENTURA_ACTOR (person or agent), MENTURA_ACTOR_ID, MENTURA_MODEL, MENTURA_SESSION, MENTURA_HARNESS. */
export function agentFromEnv(kind, via, extra = {}) {
  const e = process.env;
  const a = { kind, via, id: e.MENTURA_ACTOR_ID, model: kind === "agent" ? e.MENTURA_MODEL : undefined, session: e.MENTURA_SESSION, harness: e.MENTURA_HARNESS, ...extra };
  return Object.fromEntries(Object.entries(a).filter(([, v]) => v));
}

/**
 * Appends one entry for a file just written: a path relative to the venture folder, or, for a
 * record in another source (EE-037), its address (<source>://<path>) with the content's sha256
 * and the source's version, commit and pull request.
 */
export function record(dir, { entity, route, activity, agent, derived_from, decision, note, sha256, source, statement }) {
  const prior = entries(dir);
  const prev = prior.length ? prior.at(-1).hash : "genesis";
  const entry = Object.fromEntries(Object.entries({ at: new Date().toISOString(), entity, route, activity, agent,
    derived_from: derived_from?.length ? derived_from : undefined, decision, note, source, statement, sha256: sha256 ?? contentHash(join(dir, entity)), prev }).filter(([, v]) => v !== undefined));
  entry.hash = lineHash(prev, entry);
  appendFileSync(join(dir, LOG), JSON.stringify(entry) + "\n");
  fireTriggers(dir);
  return entry;
}

// Triggers hook (M-12, E-7): every entry is an event. A venture whose naive.config.json has triggers or
// kits runs them (schema/triggers.mjs) in a separate process after the write; the runs themselves do
// not fire this again. A crash of that process is kept for the next run to raise, never lost.
function fireTriggers(dir) {
  if (process.env.NAIVE_TRIGGERS_ACTIVE) return;
  let cfg;
  try { cfg = JSON.parse(readFileSync(join(dir, "naive.config.json"), "utf8")); } catch { return; }
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
