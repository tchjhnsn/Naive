// The provenance log (EE-031): one append-only JSON line per write, after W3C PROV (entity,
// activity, agent, derived from). Each line carries the previous line's hash, so an edited or
// deleted line breaks the chain. Lives at <venture>/provenance.jsonl, in the system layer, so it
// is on whatever layers a venture uses. A handoff package's membership gate writes a second log,
// <id>.provenance.jsonl beside the package: the line's sha256 is the package body's, so a gate
// does not depend on another gate having run first, and running the same gate on the same body
// again returns the line already written. Git history stays the implicit provenance for anything
// written outside the router.
//
// The logic is written as Effects (EE-125): files through VentureFs, failures as tagged errors, and the lock file
// around read, chain and append as an Effect resource (lockFile, built with Effect.acquireRelease), so the lock is
// released however the work inside ends. Each export keeps its old plain shape by running its Effect with runSync:
// record is called synchronously by every router write, so the lock waits by sleeping the process, as before. The
// Effect versions carry the suffix Effect (recordEffect, entriesEffect, recordGateEffect, lockFile and the rest).

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { basename, dirname, join } from "node:path";
import { Effect } from "effect";
import { blobHash, writeBlobEffect } from "./blobs.mjs";
import { IoError, ParseError, Refused } from "./effect/errors.mjs";
import { VentureFs } from "./effect/fs.mjs";
import { runSync } from "./effect/run.mjs";
import { currentSpan, emit } from "./instrumentation.mjs";
import { ventureFile } from "./venture-paths.mjs";

/** @typedef {import("./effect/errors.mjs").NotFound} NotFound */
/** A provenance line as JSON.parse gives it; typed loosely, as before, so callers keep their own narrower shapes. @typedef {any} Entry */

export const LOG = "provenance.jsonl";
const sha = (/** @type {string | Buffer} */ s) => createHash("sha256").update(s).digest("hex");
/** @param {unknown} x @returns {unknown} */
const sorted = (x) => Array.isArray(x) ? x.map(sorted) : x && typeof x === "object" ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted(/** @type {Record<string, unknown>} */ (x)[k])])) : x;
/** @param {string} prev @param {Entry} entry */
export const lineHash = (prev, entry) => { const { hash: _hash, ...rest } = entry; return sha(prev + JSON.stringify(sorted(rest))); };

/**
 * The SHA-256 of a file's bytes.
 * @param {string} file
 * @returns {Effect.Effect<string, IoError | NotFound, "naive/VentureFs">}
 */
export const contentHashEffect = (file) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  return sha(yield* fs.readBytes(file));
});
/** @param {string} file */
export const contentHash = (file) => runSync(contentHashEffect(file));

/** The membership-gate sidecar for one .json package: <id>.provenance.jsonl beside the file. @param {string} packageFile */
export function gateSidecar(packageFile) {
  if (!packageFile.endsWith(".json")) throw new Error("a handoff package is a .json file");
  return join(dirname(packageFile), `${basename(packageFile).slice(0, -".json".length)}.provenance.jsonl`);
}

/** The package a sidecar was written for. The inverse of gateSidecar. @param {string} sidecar */
export function packageForSidecar(sidecar) {
  if (!sidecar.endsWith(".provenance.jsonl")) throw new Error("not a gate sidecar");
  return `${sidecar.slice(0, -".provenance.jsonl".length)}.json`;
}

/** Sleeps the process: record is synchronous, so a waiting writer cannot yield to an event loop. @param {number} ms */
function sleepMs(ms) {
  const ran = spawnSync("sleep", [String(ms / 1000)]);
  if (ran.error) { const end = Date.now() + ms; while (Date.now() < end) Date.now(); }
}

const LOCK_STALE_MS = 2000;
const LOCK_WAIT_MS = 15000;

/** @param {number} pid */
function pidAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (e) { return /** @type {{ code?: string }} */ (e)?.code === "EPERM"; }
}

/**
 * The pid written into the lock, or null when the file is empty or unreadable.
 * @param {string} lock
 * @returns {Effect.Effect<number | null, never, "naive/VentureFs">}
 */
const holderPid = (lock) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const text = yield* Effect.orElseSucceed(fs.readText(lock), () => "");
  const pid = Number(text.trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
});

/**
 * Remove the lock only when the renamed file is still the one `judged`.
 * A rename that catches a newer lock puts that lock back and removes nothing.
 * Succeeds with true when this process removed the judged file.
 * @param {string} lock
 * @param {{ ino: number, mtimeMs: number }} judged
 * @returns {Effect.Effect<boolean, never, "naive/VentureFs">}
 */
export const takeStaleLockEffect = (lock, judged) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const parked = `${lock}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}`;
  if ((yield* Effect.exit(fs.rename(lock, parked)))._tag === "Failure") return false;
  const parkedSt = yield* fs.stat(parked);
  if (!parkedSt) return false;
  if (parkedSt.ino !== judged.ino || parkedSt.mtimeMs !== judged.mtimeMs) {
    yield* Effect.ignore(fs.link(parked, lock)); // a live lock may already be at the path
    yield* Effect.ignore(fs.remove(parked));
    return false;
  }
  yield* Effect.ignore(fs.remove(parked));
  return true;
});
/** @param {string} lock @param {{ ino: number, mtimeMs: number }} judged */
export const takeStaleLock = (lock, judged) => runSync(takeStaleLockEffect(lock, judged));

/**
 * Drop a lock whose holder is gone. A live pid is never removed, however old the file is.
 * Fails with IoError when the path is a folder, not a lock file.
 * @param {string} lock
 * @returns {Effect.Effect<boolean, IoError, "naive/VentureFs">}
 */
export const stealDeadLockEffect = (lock) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const st = yield* fs.stat(lock);
  if (!st) return false;
  if (st.isDirectory) return yield* Effect.fail(new IoError({ path: lock, op: "lock", cause: "not a lock file" }));
  const pid = yield* holderPid(lock);
  if (pid !== null && pidAlive(pid)) return false;
  // An empty lock may be a writer that has created it and not yet written its pid.
  if (pid === null && Date.now() - st.mtimeMs < LOCK_STALE_MS) return false;
  return yield* takeStaleLockEffect(lock, { ino: st.ino, mtimeMs: st.mtimeMs });
});
/** @param {string} lock */
export const stealDeadLock = (lock) => runSync(stealDeadLockEffect(lock));

/**
 * The lock file as a scoped resource: acquiring creates it exclusively with this process's pid in it, waiting
 * (and stealing a dead holder's lock) for up to LOCK_WAIT_MS; the scope's end removes it, whether the work
 * inside succeeded, failed or was interrupted. The lock is a file, so it holds across processes, not just fibers.
 * @param {string} lock
 * @returns {Effect.Effect<string, IoError, "naive/VentureFs" | import("effect/Scope").Scope>}
 */
export const lockFile = (lock) => Effect.acquireRelease(
  Effect.gen(function* () {
    const fs = yield* VentureFs;
    const start = Date.now();
    for (;;) {
      if (yield* fs.createExclusive(lock)) {
        const wrote = yield* Effect.exit(fs.writeText(lock, String(process.pid)));
        if (wrote._tag === "Failure") {
          yield* Effect.ignore(fs.remove(lock));
          return yield* Effect.fail(new IoError({ path: lock, op: "lock", cause: wrote.cause }));
        }
        return lock;
      }
      yield* stealDeadLockEffect(lock);
      if (Date.now() - start > LOCK_WAIT_MS) return yield* Effect.fail(new IoError({ path: lock, op: "lock", cause: "timed out waiting for the lock" }));
      yield* Effect.sync(() => sleepMs(5));
    }
  }),
  (held) => Effect.ignore(Effect.gen(function* () { const fs = yield* VentureFs; yield* fs.remove(held); })),
);

/**
 * Runs `use` while this process holds the lock file.
 * @template A, E
 * @param {string} lock
 * @param {Effect.Effect<A, E, "naive/VentureFs">} use
 * @returns {Effect.Effect<A, E | IoError, "naive/VentureFs">}
 */
export const withLockFileEffect = (lock, use) => Effect.scoped(Effect.andThen(lockFile(lock), use));

/**
 * The lines of a JSONL file, or none when it is missing.
 * @param {string} file
 * @returns {Effect.Effect<Entry[], IoError | ParseError, "naive/VentureFs">}
 */
export const readJsonlEffect = (file) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  if (!(yield* fs.exists(file))) return [];
  const text = yield* Effect.catchTag(fs.readText(file), "NotFound", () => Effect.succeed(""));
  return yield* Effect.try({
    try: () => text.split("\n").filter((l) => l.trim()).map((l) => /** @type {Entry} */ (JSON.parse(l))),
    catch: (cause) => new ParseError({ path: file, cause }),
  });
});
/** @param {string} file */
export const readJsonl = (file) => runSync(readJsonlEffect(file));

/** What a gate line is about: the function, the body's sha256, and the verdict. Not its place in the chain. @param {Entry} entry */
export function gateLineKey(entry) {
  return `${entry.gate}\0${entry.sha256}\0${JSON.stringify(sorted(entry.judgment))}`;
}

/**
 * Appends one membership-gate line bound to the package body's sha256.
 * The same gate, the same body and the same verdict return the existing line and do not append.
 * One writer at a time for a package sidecar: the chain is read again inside the lock.
 * @param {string} packageFile
 * @param {{ function: string }} judgment
 * @returns {Effect.Effect<Entry, Refused | IoError | NotFound | ParseError, "naive/VentureFs">}
 */
export const recordGateEffect = (packageFile, judgment) => Effect.gen(function* () {
  const file = yield* Effect.try({ try: () => gateSidecar(packageFile), catch: (e) => new Refused({ rule: "gate-sidecar", message: e instanceof Error ? e.message : String(e) }) });
  return yield* withLockFileEffect(`${file}.lock`, Effect.gen(function* () {
    const fs = yield* VentureFs;
    const sha256 = yield* contentHashEffect(packageFile);
    const prior = yield* readJsonlEffect(file);
    const draft = { activity: "gate", gate: judgment.function, sha256, judgment };
    const existing = prior.find((e) => e.activity === "gate" && gateLineKey(e) === gateLineKey(draft));
    if (existing) return existing;
    const last = prior.at(-1);
    const prev = last ? last.hash : "genesis";
    /** @type {Entry} */
    const entry = {
      at: new Date().toISOString(), entity: basename(packageFile), activity: "gate",
      agent: { kind: "agent", via: "cli", id: "ontology-gate" }, sha256, gate: judgment.function, judgment, prev,
    };
    entry.hash = lineHash(prev, entry);
    yield* fs.append(file, JSON.stringify(entry) + "\n");
    return entry;
  }));
});
/** @param {string} packageFile @param {{ function: string }} judgment */
export const recordGate = (packageFile, judgment) => runSync(recordGateEffect(packageFile, judgment));

/**
 * The venture's provenance lines, oldest first.
 * @param {string} dir
 */
export const entriesEffect = (dir) => readJsonlEffect(ventureFile(dir, LOG));
/** @param {string} dir */
export const entries = (dir) => runSync(entriesEffect(dir));

/** The agent behind this process: MENTURA_ACTOR (person or agent), MENTURA_ACTOR_ID, MENTURA_MODEL, MENTURA_SESSION, MENTURA_HARNESS.
 * @param {string} kind @param {string} via @param {Record<string, unknown>} [extra] */
export function agentFromEnv(kind, via, extra = {}) {
  const e = process.env;
  const a = { kind, via, id: e.MENTURA_ACTOR_ID, model: kind === "agent" ? e.MENTURA_MODEL : undefined, session: e.MENTURA_SESSION, harness: e.MENTURA_HARNESS, ...extra };
  return Object.fromEntries(Object.entries(a).filter(([, v]) => v));
}

/** The agent this process says is acting, when it is not the person named by: MENTURA_ACTOR other than person,
 *  MENTURA_MODEL, or a MENTURA_ACTOR_ID other than by. These are environment variables anyone can
 *  unset, so this catches an honest or careless agent; it is not signed identity.
 * @param {string} [by] */
export function actingAgent(by) {
  const e = process.env;
  const said = e.MENTURA_ACTOR?.trim().toLowerCase();
  if ((said && said !== "person") || e.MENTURA_MODEL) return e.MENTURA_ACTOR_ID ?? e.MENTURA_MODEL ?? "agent";
  return e.MENTURA_ACTOR_ID && e.MENTURA_ACTOR_ID !== by ? e.MENTURA_ACTOR_ID : null;
}

/** @typedef {{ entity: string, route?: string, activity: string, agent?: Record<string, any>, derived_from?: string[], decision?: string, note?: string, sha256?: string, content?: string | Buffer, source?: *, statement?: string, statements?: string[] }} RecordInput */

/**
 * Appends one entry for a file just written: a path relative to the venture folder, or, for a
 * record in another source (EE-037), its address (<source>://<path>) with the content's sha256
 * and the source's version, commit and pull request.
 *
 * The bytes the line's sha256 names go to the blob store (packages/naive/src/core/blobs.mjs) before
 * the line is appended, so an as-of read can return them (packages/naive/src/store/as-of.mjs). With no
 * sha256 and no content, they are the local file's bytes. A caller that passes content (a write to
 * another source) has them stored when they hash to the sha256. A caller that passes only a sha256
 * (a log append, a publish) stores no blob: an append-only log would otherwise keep a whole copy of
 * itself per line.
 * @param {string} dir
 * @param {RecordInput} input
 * @returns {Effect.Effect<Entry, IoError | NotFound | ParseError, "naive/VentureFs">}
 */
export const recordEffect = (dir, { entity, route, activity, agent, derived_from, decision, note, sha256, content, source, statement, statements }) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  // The blob first: a line written from here on always has its bytes in the store.
  const bytes = content ?? (sha256 === undefined ? yield* fs.readBytes(ventureFile(dir, entity)) : undefined);
  if (bytes !== undefined) {
    const h = blobHash(bytes);
    if (sha256 === undefined) sha256 = h;
    if (h === sha256) yield* writeBlobEffect(dir, bytes);
  }
  // The chain is read and extended inside a lock, so two processes writing at once cannot both chain onto one line.
  const log = ventureFile(dir, LOG);
  const entry = yield* withLockFileEffect(join(dirname(log), `.${basename(log)}.lock`), Effect.gen(function* () {
    const prior = yield* entriesEffect(dir);
    const last = prior.at(-1);
    const prev = last ? last.hash : "genesis";
    // A write made inside a trace span names it (EE-121), so what changed points to the step that changed it.
    const cur = currentSpan();
    const span = cur ? { trace_id: cur.trace_id, span_id: cur.span_id, ...(cur.session && cur.session !== cur.trace_id ? { session: cur.session } : {}) } : undefined;
    /** @type {Entry} */
    const entry = Object.fromEntries(Object.entries({ at: new Date().toISOString(), entity, route, activity, agent,
      derived_from: derived_from?.length ? derived_from : undefined, span, decision, note, source, statement, statements, sha256, prev }).filter(([, v]) => v !== undefined));
    entry.hash = lineHash(prev, entry);
    yield* fs.append(log, JSON.stringify(entry) + "\n");
    return entry;
  }));
  // Context hook: every provenance entry (write, draft, accept, confirm, decision) is an instrumentation event (P-4).
  yield* Effect.sync(() => emit(dir, { kind: "provenance", activity: entry.activity, entity: entry.entity, route: entry.route, decision: entry.decision, by: entry.agent?.kind, via: entry.agent?.via }));
  yield* fireTriggersEffect(dir);
  return entry;
});
/** @param {string} dir @param {RecordInput} input */
export const record = (dir, input) => runSync(recordEffect(dir, input));

// Triggers hook (M-12, E-7): every entry is an event. A venture whose naive.config.json has triggers or
// kits runs them (packages/naive/src/router/orchestration/triggers.mjs) in a separate process after the write; the runs themselves do
// not fire this again. A crash of that process is kept for the next run to raise, never lost.
// The write has landed, so this Effect never fails: nothing here may undo it or throw past it.
/**
 * @param {string} dir
 * @returns {Effect.Effect<void, never, "naive/VentureFs">}
 */
const fireTriggersEffect = (dir) => Effect.gen(function* () {
  if (process.env.NAIVE_TRIGGERS_ACTIVE) return;
  const fs = yield* VentureFs;
  const text = yield* Effect.orElseSucceed(fs.readText(ventureFile(dir, "naive.config.json")), () => null);
  if (text === null) return;
  /** @type {{ triggers?: unknown[], kits?: unknown[] } | null} */
  let cfg;
  try { cfg = JSON.parse(text); } catch { return; }
  if (!cfg?.triggers?.length && !cfg?.kits?.length) return;
  const ran = yield* Effect.exit(Effect.try({
    try: () => spawnSync(process.execPath, [new URL("../router/orchestration/triggers.mjs", import.meta.url).pathname, dir, "--fire", "--quiet"], { encoding: "utf8", env: { ...process.env, NAIVE_TRIGGERS_ACTIVE: "hook" } }),
    catch: (cause) => cause,
  }));
  if (ran._tag === "Failure") {
    const cause = /** @type {{ message?: string }} */ (ran.cause);
    yield* Effect.sync(() => console.error(`triggers did not run after this write: ${cause?.message ?? String(ran.cause)}`));
    return;
  }
  const p = ran.value;
  if (p.status === 0) return;
  const line = JSON.stringify({ at: new Date().toISOString(), status: p.status, error: (p.stderr || p.stdout || String(p.error ?? "")).trim().slice(-2000) }) + "\n";
  const kept = yield* Effect.exit(fs.append(join(dir, ".naive/trigger-errors.jsonl"), line));
  if (kept._tag === "Failure") yield* Effect.sync(() => console.error(`triggers did not run after this write: ${kept.cause}`));
});
