// The provenance log (EE-031): one append-only JSON line per write, after W3C PROV (entity,
// activity, agent, derived from). Each line carries the previous line's hash, so an edited or
// deleted line breaks the chain. Lives at <venture>/provenance.jsonl, in the system layer, so it
// is on whatever layers a venture uses. A handoff package's membership gate writes a second log,
// <id>.provenance.jsonl beside the package: the line's sha256 is the package body's, so a gate
// does not depend on another gate having run first, and running the same gate on the same body
// again returns the line already written. Git history stays the implicit provenance for anything
// written outside the router.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { appendFileSync, closeSync, constants, existsSync, linkSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { emit } from "./instrumentation.mjs";
import { ventureFile } from "./venture-paths.mjs";

export const LOG = "provenance.jsonl";
const sha = (s) => createHash("sha256").update(s).digest("hex");
const sorted = (x) => Array.isArray(x) ? x.map(sorted) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted(x[k])])) : x;
export const lineHash = (prev, entry) => { const { hash: _hash, ...rest } = entry; return sha(prev + JSON.stringify(sorted(rest))); };
export const contentHash = (file) => sha(readFileSync(file));

/** The membership-gate sidecar for one .json package: <id>.provenance.jsonl beside the file. */
export function gateSidecar(packageFile) {
  if (!packageFile.endsWith(".json")) throw new Error("a handoff package is a .json file");
  return join(dirname(packageFile), `${basename(packageFile).slice(0, -".json".length)}.provenance.jsonl`);
}

/** The package a sidecar was written for. The inverse of gateSidecar. */
export function packageForSidecar(sidecar) {
  if (!sidecar.endsWith(".provenance.jsonl")) throw new Error("not a gate sidecar");
  return `${sidecar.slice(0, -".provenance.jsonl".length)}.json`;
}

function sleepMs(ms) {
  const ran = spawnSync("sleep", [String(ms / 1000)]);
  if (ran.error) { const end = Date.now() + ms; while (Date.now() < end) Date.now(); }
}

const LOCK_STALE_MS = 2000;
const LOCK_WAIT_MS = 15000;

/** @param {number} pid */
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (e) { return e?.code === "EPERM"; }
}

/** The pid written into the lock, or null when the file is empty or unreadable. */
function holderPid(lock) {
  try {
    const pid = Number(readFileSync(lock, "utf8").trim());
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch { return null; }
}

/**
 * Remove the lock only when the renamed file is still the one `judged`.
 * A rename that catches a newer lock puts that lock back and removes nothing.
 * @param {string} lock
 * @param {{ ino: number, mtimeMs: number }} judged
 * @returns {boolean} true when this process removed the judged file
 */
export function takeStaleLock(lock, judged) {
  const parked = `${lock}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
  try { renameSync(lock, parked); } catch { return false; }
  let parkedSt;
  try { parkedSt = statSync(parked); } catch { return false; }
  if (parkedSt.ino !== judged.ino || parkedSt.mtimeMs !== judged.mtimeMs) {
    try { linkSync(parked, lock); } catch { /* a live lock is already at the path */ }
    try { unlinkSync(parked); } catch { /* the extra name is already gone */ }
    return false;
  }
  try { unlinkSync(parked); } catch { /* already gone */ }
  return true;
}

/** Drop a lock whose holder is gone. A live pid is never removed, however old the file is. */
export function stealDeadLock(lock) {
  let st;
  try { st = statSync(lock); } catch { return false; }
  if (st.isDirectory()) throw new Error(`could not lock ${lock}: not a lock file`);
  const pid = holderPid(lock);
  if (pid !== null && pidAlive(pid)) return false;
  // An empty lock may be a writer that has created it and not yet written its pid.
  if (pid === null && Date.now() - st.mtimeMs < LOCK_STALE_MS) return false;
  return takeStaleLock(lock, { ino: st.ino, mtimeMs: st.mtimeMs });
}

/** One writer at a time for a package sidecar. The chain is read again inside the lock. */
function withSidecarLock(packageFile, fn) {
  const lock = `${gateSidecar(packageFile)}.lock`;
  const start = Date.now();
  for (;;) {
    let fd;
    try {
      fd = openSync(lock, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR);
      writeSync(fd, String(process.pid));
    }
    catch (e) {
      if (fd !== undefined) { try { closeSync(fd); } catch { /* not opened */ } }
      if (e?.code !== "EEXIST") throw new Error(`could not lock ${lock}: ${e?.code ?? e?.message ?? e}`);
      stealDeadLock(lock);
      if (Date.now() - start > LOCK_WAIT_MS) throw new Error(`could not lock ${lock}`);
      sleepMs(5);
      continue;
    }
    try { return fn(); }
    finally { closeSync(fd); try { unlinkSync(lock); } catch { /* already released */ } }
  }
}

/** @param {string} file */
export function readJsonl(file) {
  return existsSync(file) ? readFileSync(file, "utf8").split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : [];
}

/** What a gate line is about: the function, the body's sha256, and the verdict. Not its place in the chain. */
export function gateLineKey(entry) {
  return `${entry.gate}\0${entry.sha256}\0${JSON.stringify(sorted(entry.judgment))}`;
}

/**
 * Appends one membership-gate line bound to the package body's sha256.
 * The same gate, the same body and the same verdict return the existing line and do not append.
 * @param {string} packageFile
 * @param {{ function: string }} judgment
 */
export function recordGate(packageFile, judgment) {
  return withSidecarLock(packageFile, () => {
    const file = gateSidecar(packageFile);
    const sha256 = contentHash(packageFile);
    const prior = existsSync(file) ? readJsonl(file) : [];
    const draft = { activity: "gate", gate: judgment.function, sha256, judgment };
    const existing = prior.find((e) => e.activity === "gate" && gateLineKey(e) === gateLineKey(draft));
    if (existing) return existing;
    const prev = prior.length ? prior.at(-1).hash : "genesis";
    const entry = {
      at: new Date().toISOString(), entity: basename(packageFile), activity: "gate",
      agent: { kind: "agent", via: "cli", id: "ontology-gate" }, sha256, gate: judgment.function, judgment, prev,
    };
    entry.hash = lineHash(prev, entry);
    appendFileSync(file, JSON.stringify(entry) + "\n");
    return entry;
  });
}

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
// kits runs them (packages/naive/src/router/orchestration/triggers.mjs) in a separate process after the write; the runs themselves do
// not fire this again. A crash of that process is kept for the next run to raise, never lost.
function fireTriggers(dir) {
  if (process.env.NAIVE_TRIGGERS_ACTIVE) return;
  let cfg;
  try { cfg = JSON.parse(readFileSync(join(ventureFile(dir, "naive.config.json")), "utf8")); } catch { return; }
  if (!cfg?.triggers?.length && !cfg?.kits?.length) return;
  // The write has landed; nothing here may undo it or throw past it.
  try {
    const p = spawnSync(process.execPath, [new URL("../router/orchestration/triggers.mjs", import.meta.url).pathname, dir, "--fire", "--quiet"], { encoding: "utf8", env: { ...process.env, NAIVE_TRIGGERS_ACTIVE: "hook" } });
    if (p.status !== 0) {
      mkdirSync(join(dir, ".naive"), { recursive: true });
      appendFileSync(join(dir, ".naive/trigger-errors.jsonl"), JSON.stringify({ at: new Date().toISOString(), status: p.status, error: (p.stderr || p.stdout || String(p.error ?? "")).trim().slice(-2000) }) + "\n");
    }
  } catch (e) { console.error(`triggers did not run after this write: ${e.message}`); }
}
