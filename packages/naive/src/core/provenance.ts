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
import type { Scope } from "effect/Scope";
import { blobHash, writeBlobEffect } from "./blobs.ts";
import { IoError, ParseError, Refused, type NotFound } from "./effect/errors.ts";
import { VentureFs } from "./effect/fs.ts";
import { runSync } from "./effect/run.ts";
import { currentSpan, emit } from "./instrumentation.ts";
import { ventureFile } from "./venture-paths.ts";
import type { ProvenanceEntry } from "../records/types/records.d.ts";

/**
 * Who acted, as a provenance line names them. The schema (ProvenanceEntry) lists the kinds and interfaces the router
 * writes and requires both; the log keeps whatever agent a writer passes (some log through "harness"), so here they
 * are optional strings.
 */
export type EntryAgent = {
  kind?: string; via?: string; id?: string; account?: string; model?: string; session?: string; harness?: string; [key: string]: unknown;
};
/** A membership gate's verdict as a gate line keeps it: the function the gate ran as, and the rest of the judgment. */
export type GateJudgment = { function: string; [key: string]: unknown };
/**
 * A provenance line as written: ProvenanceEntry, except that activity is whatever activity the writer names (writers
 * also log create and port) and agent is EntryAgent. Lines read back from a log are trusted to have this shape.
 */
export type Entry = Omit<ProvenanceEntry, "activity" | "agent" | "judgment"> & { activity: string; agent?: EntryAgent; judgment?: GateJudgment };
/** What a caller hands record: the line's fields, plus the content the sha256 names when it is not the local file. */
export type RecordInput = {
  entity: string; route?: string; activity: string; agent?: EntryAgent; derived_from?: string[]; decision?: string; note?: string;
  sha256?: string; content?: string | Buffer; source?: ProvenanceEntry["source"]; statement?: string; statements?: string[];
};
/** A file's identity when a stale lock was judged. */
export type LockStat = { ino: number; mtimeMs: number };

export const LOG = "provenance.jsonl";
const sha = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
const sorted = (x: unknown): unknown => Array.isArray(x) ? x.map(sorted) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => [k, sorted(v)])) : x;
export const lineHash = (prev: string, entry: Record<string, unknown>): string => { const { hash: _hash, ...rest } = entry; return sha(prev + JSON.stringify(sorted(rest))); };

/** The SHA-256 of a file's bytes. */
export const contentHashEffect = (file: string): Effect.Effect<string, IoError | NotFound, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  return sha(yield* fs.readBytes(file));
});
export const contentHash = (file: string): string => runSync(contentHashEffect(file));

/** The membership-gate sidecar for one .json package: <id>.provenance.jsonl beside the file. */
export function gateSidecar(packageFile: string): string {
  if (!packageFile.endsWith(".json")) throw new Error("a handoff package is a .json file");
  return join(dirname(packageFile), `${basename(packageFile).slice(0, -".json".length)}.provenance.jsonl`);
}

/** The package a sidecar was written for. The inverse of gateSidecar. */
export function packageForSidecar(sidecar: string): string {
  if (!sidecar.endsWith(".provenance.jsonl")) throw new Error("not a gate sidecar");
  return `${sidecar.slice(0, -".provenance.jsonl".length)}.json`;
}

/** Sleeps the process: record is synchronous, so a waiting writer cannot yield to an event loop. */
function sleepMs(ms: number): void {
  const ran = spawnSync("sleep", [String(ms / 1000)]);
  if (ran.error) { const end = Date.now() + ms; while (Date.now() < end) Date.now(); }
}

const LOCK_STALE_MS = 2000;
const LOCK_WAIT_MS = 15000;

function pidAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; }
  catch (e) { return typeof e === "object" && e !== null && "code" in e && e.code === "EPERM"; }
}

/** The pid written into the lock, or null when the file is empty or unreadable. */
const holderPid = (lock: string): Effect.Effect<number | null, never, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const text = yield* Effect.orElseSucceed(fs.readText(lock), () => "");
  const pid = Number(text.trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
});

/**
 * Remove the lock only when the renamed file is still the one `judged`.
 * A rename that catches a newer lock puts that lock back and removes nothing.
 * Succeeds with true when this process removed the judged file.
 */
export const takeStaleLockEffect = (lock: string, judged: LockStat): Effect.Effect<boolean, never, "naive/VentureFs"> => Effect.gen(function* () {
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
export const takeStaleLock = (lock: string, judged: LockStat): boolean => runSync(takeStaleLockEffect(lock, judged));

/**
 * Drop a lock whose holder is gone. A live pid is never removed, however old the file is.
 * Fails with IoError when the path is a folder, not a lock file.
 */
export const stealDeadLockEffect = (lock: string): Effect.Effect<boolean, IoError, "naive/VentureFs"> => Effect.gen(function* () {
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
export const stealDeadLock = (lock: string): boolean => runSync(stealDeadLockEffect(lock));

/**
 * The lock file as a scoped resource: acquiring creates it exclusively with this process's pid in it, waiting
 * (and stealing a dead holder's lock) for up to LOCK_WAIT_MS; the scope's end removes it, whether the work
 * inside succeeded, failed or was interrupted. The lock is a file, so it holds across processes, not just fibers.
 */
export const lockFile = (lock: string): Effect.Effect<string, IoError, "naive/VentureFs" | Scope> => Effect.acquireRelease(
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

/** Runs `use` while this process holds the lock file. */
export const withLockFileEffect = <A, E>(lock: string, use: Effect.Effect<A, E, "naive/VentureFs">): Effect.Effect<A, E | IoError, "naive/VentureFs"> => Effect.scoped(Effect.andThen(lockFile(lock), use));

/** The lines of a provenance log (the venture's or a gate sidecar), or none when it is missing. */
export const readJsonlEffect = (file: string): Effect.Effect<Entry[], IoError | ParseError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  if (!(yield* fs.exists(file))) return [];
  const text = yield* Effect.catchTag(fs.readText(file), "NotFound", () => Effect.succeed(""));
  return yield* Effect.try({
    try: () => text.split("\n").filter((l) => l.trim()).map((l): Entry => JSON.parse(l)),
    catch: (cause) => new ParseError({ path: file, cause }),
  });
});
export const readJsonl = (file: string): Entry[] => runSync(readJsonlEffect(file));

/** What a gate line is about: the function, the body's sha256, and the verdict. Not its place in the chain. */
export function gateLineKey(entry: Pick<Entry, "gate" | "sha256" | "judgment">): string {
  return `${entry.gate}\0${entry.sha256}\0${JSON.stringify(sorted(entry.judgment))}`;
}

/**
 * Appends one membership-gate line bound to the package body's sha256.
 * The same gate, the same body and the same verdict return the existing line and do not append.
 * One writer at a time for a package sidecar: the chain is read again inside the lock.
 */
export const recordGateEffect = (packageFile: string, judgment: GateJudgment): Effect.Effect<Entry, Refused | IoError | NotFound | ParseError, "naive/VentureFs"> => Effect.gen(function* () {
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
    const fields: Omit<Entry, "hash"> = {
      at: new Date().toISOString(), entity: basename(packageFile), activity: "gate",
      agent: { kind: "agent", via: "cli", id: "ontology-gate" }, sha256, gate: judgment.function, judgment, prev,
    };
    const entry: Entry = { ...fields, hash: lineHash(prev, fields) };
    yield* fs.append(file, JSON.stringify(entry) + "\n");
    return entry;
  }));
});
export const recordGate = (packageFile: string, judgment: GateJudgment): Entry => runSync(recordGateEffect(packageFile, judgment));

/** The venture's provenance lines, oldest first. */
export const entriesEffect = (dir: string): Effect.Effect<Entry[], IoError | ParseError, "naive/VentureFs"> => readJsonlEffect(ventureFile(dir, LOG));
export const entries = (dir: string): Entry[] => runSync(entriesEffect(dir));

/** The agent behind this process: MENTURA_ACTOR (person or agent), MENTURA_ACTOR_ID, MENTURA_MODEL, MENTURA_SESSION, MENTURA_HARNESS. */
export function agentFromEnv(kind: string, via: string, extra: Record<string, unknown> = {}): EntryAgent {
  const e = process.env;
  const a: EntryAgent = { kind, via, id: e.MENTURA_ACTOR_ID, model: kind === "agent" ? e.MENTURA_MODEL : undefined, session: e.MENTURA_SESSION, harness: e.MENTURA_HARNESS, ...extra };
  for (const [k, v] of Object.entries(a)) if (!v) Reflect.deleteProperty(a, k);
  return a;
}

/** The agent this process says is acting, when it is not the person named by: MENTURA_ACTOR other than person,
 *  MENTURA_MODEL, or a MENTURA_ACTOR_ID other than by. These are environment variables anyone can
 *  unset, so this catches an honest or careless agent; it is not signed identity. */
export function actingAgent(by?: string): string | null {
  const e = process.env;
  const said = e.MENTURA_ACTOR?.trim().toLowerCase();
  if ((said && said !== "person") || e.MENTURA_MODEL) return e.MENTURA_ACTOR_ID ?? e.MENTURA_MODEL ?? "agent";
  return e.MENTURA_ACTOR_ID && e.MENTURA_ACTOR_ID !== by ? e.MENTURA_ACTOR_ID : null;
}

/**
 * Appends one entry for a file just written: a path relative to the venture folder, or, for a
 * record in another source (EE-037), its address (<source>://<path>) with the content's sha256
 * and the source's version, commit and pull request.
 *
 * The bytes the line's sha256 names go to the blob store (packages/naive/src/core/blobs.ts) before
 * the line is appended, so an as-of read can return them (packages/naive/src/store/as-of.ts). With no
 * sha256 and no content, they are the local file's bytes. A caller that passes content (a write to
 * another source) has them stored when they hash to the sha256. A caller that passes only a sha256
 * (a log append, a publish) stores no blob: an append-only log would otherwise keep a whole copy of
 * itself per line.
 */
export const recordEffect = (dir: string, { entity, route, activity, agent, derived_from, decision, note, sha256, content, source, statement, statements }: RecordInput): Effect.Effect<Entry, IoError | NotFound | ParseError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  // The blob first: a line written from here on always has its bytes in the store.
  // With no sha256 the bytes are the content, else the local file's; with one, only content that hashes to it is kept.
  let hash: string;
  if (sha256 === undefined) {
    const bytes = content ?? (yield* fs.readBytes(ventureFile(dir, entity)));
    hash = blobHash(bytes);
    yield* writeBlobEffect(dir, bytes);
  } else {
    hash = sha256;
    if (content !== undefined && blobHash(content) === sha256) yield* writeBlobEffect(dir, content);
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
    const fields: Omit<Entry, "hash"> = { at: new Date().toISOString(), entity, route, activity, agent,
      derived_from: derived_from?.length ? derived_from : undefined, span, decision, note, source, statement, statements, sha256: hash, prev };
    for (const [k, v] of Object.entries(fields)) if (v === undefined) Reflect.deleteProperty(fields, k);
    const entry: Entry = { ...fields, hash: lineHash(prev, fields) };
    yield* fs.append(log, JSON.stringify(entry) + "\n");
    return entry;
  }));
  // Context hook: every provenance entry (write, draft, accept, confirm, decision) is an instrumentation event (P-4).
  yield* Effect.sync(() => emit(dir, { kind: "provenance", activity: entry.activity, entity: entry.entity, route: entry.route, decision: entry.decision, by: entry.agent?.kind, via: entry.agent?.via }));
  yield* fireTriggersEffect(dir);
  return entry;
});
export const record = (dir: string, input: RecordInput): Entry => runSync(recordEffect(dir, input));

// Triggers hook (M-12, E-7): every entry is an event. A venture whose naive.config.json has triggers or
// kits runs them (packages/naive/src/router/orchestration/triggers.ts) in a separate process after the write; the runs themselves do
// not fire this again. A crash of that process is kept for the next run to raise, never lost.
// The write has landed, so this Effect never fails: nothing here may undo it or throw past it.
const fireTriggersEffect = (dir: string): Effect.Effect<void, never, "naive/VentureFs"> => Effect.gen(function* () {
  if (process.env.NAIVE_TRIGGERS_ACTIVE) return;
  const fs = yield* VentureFs;
  const text = yield* Effect.orElseSucceed(fs.readText(ventureFile(dir, "naive.config.json")), () => null);
  if (text === null) return;
  let cfg: { triggers?: unknown[]; kits?: unknown[] } | null;
  try { cfg = JSON.parse(text); } catch { return; }
  if (!cfg?.triggers?.length && !cfg?.kits?.length) return;
  const ran = yield* Effect.exit(Effect.try({
    try: () => spawnSync(process.execPath, [new URL("../router/orchestration/triggers.ts", import.meta.url).pathname, dir, "--fire", "--quiet"], { encoding: "utf8", env: { ...process.env, NAIVE_TRIGGERS_ACTIVE: "hook" } }),
    catch: (cause) => cause,
  }));
  if (ran._tag === "Failure") {
    const cause: unknown = ran.cause;
    const message = typeof cause === "object" && cause !== null && "message" in cause ? cause.message : undefined;
    yield* Effect.sync(() => console.error(`triggers did not run after this write: ${message ?? String(ran.cause)}`));
    return;
  }
  const p = ran.value;
  if (p.status === 0) return;
  const line = JSON.stringify({ at: new Date().toISOString(), status: p.status, error: (p.stderr || p.stdout || String(p.error ?? "")).trim().slice(-2000) }) + "\n";
  const kept = yield* Effect.exit(fs.append(join(dir, ".naive/trigger-errors.jsonl"), line));
  if (kept._tag === "Failure") yield* Effect.sync(() => console.error(`triggers did not run after this write: ${kept.cause}`));
});
