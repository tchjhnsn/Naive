// Offline sync between a working copy and a business store (EE-178, docs/design/OFFLINE_SYNC_2026-11-25.md).
// A working copy is a folder of a business's records as files; a business store is the same business kept by a
// host. A founder who worked for days with no network runs `naive sync pull` and `naive sync push`, and the two
// copies come back together with nothing lost.
//
//   naive sync link <business> [--host <url>]   device sign-in, and the token into the operating system's keychain
//   naive sync pull                             what the store changed since the sync point, merged into the files
//   naive sync push                             what the working copy changed since its base versions, with provenance
//   naive sync status                           where this working copy stands, and what is waiting
//
// Pull reads the base copy of each record from the blob store (packages/naive/src/core/blobs.ts) by the hash the
// last sync recorded, merges base, local and store with mergeRecord (merge.ts), writes the merged record, files
// each same-field conflict as an open decision for a person (sync-conflicts.ts, EE-175), copies down the files
// records point at by hash, and only then moves the sync point, so a pull that stopped halfway runs again and
// ends in the same place. Push collects every record whose bytes differ from its base, uploads the file hashes
// the host is missing, and sends the batch with each record's base version; the host writes it all or none, so a
// store that moved answers 409 and push pulls, merges and tries again, at most twice. A host may answer a push
// with the store head as it was before the push, so that a write which landed beside the push is not skipped; the
// next pull then replays this copy's own records, where base, local and store agree, and writes nothing.
//
// What never leaves the working copy: anything the data model does not call a record (so `.naive/`, every derived
// path, `provenance.jsonl` and every other log, `_private/`, `package.json` and code), any path no record route
// takes writes for (`venture.json`, and a decision beside a record in a subfolder), `.env` files, git internals,
// a record marked private or sensitive, and a nested venture's files. The same filter guards the writes a pull
// makes, so a host cannot push a path into a working copy that the working copy would never send.
//
// Naive names no vendor: the host is `--host <url>` at link time, or `sync.host` in naive.config.json, and it is
// then kept in the working copy's own sync state. A hosted run (NAIVE_RUNTIME=hosted) refuses every command here,
// because a hosted store is the store and reaching another host would leave the tenant.
//
// The HTTP client is injectable (the `http` option), so a test drives the whole flow against a stand-in server
// and nothing here reaches the network on its own.
//
// Not built: syncing a record that is not JSON (a README, a handoff brief), the append-only logs, files a record
// does not name by hash, the gate on a merged record (both sides were gated when they were written, and the
// schema check below catches an invalid combination), and resolving a whole-record conflict from a decision
// (EE-175). Provenance re-chaining on the host is its own pull request: push sends the lines and the host decides.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { blobHash, hasBlob, readBlob, writeBlob } from "../core/blobs.ts";
import { entries, record, type Entry } from "../core/provenance.ts";
import { HostedRefusal, isHosted } from "../core/runtime.ts";
import { logicalFiles, ventureFile } from "../core/venture-paths.ts";
import { globRegExp, pathKind, schemaNameOf, VENTURE_PREFIX, venturePaths, readDataModel } from "../records/index.ts";
import { glob as routeGlob, routes, type RecordRoute } from "../records/routes/routes.ts";
import { validateValue } from "../records/validate.ts";
import { mergeRecord, type Json } from "./merge.ts";
import { readConfig } from "./naive-config.ts";
import { fileConflicts } from "./sync-conflicts.ts";
import { readToken, saveToken, type TokenStore } from "./sync-credentials.ts";
import { nowMs, wallClock } from "../core/clock.ts";

/** The working copy's sync state, <venture>/.naive/sync.json. Local to one working copy and never synced. */
export const STATE = ".naive/sync.json";
/** The agent id a sync writes under, the same one conflict decisions are proposed by. */
export const SYNC_AGENT = "sync";
/** The version and content hash a working copy last saw for one record. */
export type Base = { version: string; sha256: string };
export type SyncState = {
  host: string;
  business: string;
  working_copy: string;
  point: string | null;
  bases: { [path: string]: Base };
  /** The hash of the last provenance line the host has, so a push sends only what is new. */
  provenance_pushed?: string;
};

// ---------------------------------------------------------------------------------------------------------------
// The HTTP boundary. One request shape, one reply shape, so a stand-in client is a function.
// ---------------------------------------------------------------------------------------------------------------

export type HttpRequest = { method: "GET" | "POST" | "PUT"; url: string; headers: { [name: string]: string }; body?: string | Buffer };
export type HttpReply = { status: number; body: Buffer };
export type Http = (req: HttpRequest) => Promise<HttpReply>;

/** The default client: the platform's fetch. Nothing else in this module reaches the network. */
export const httpFetch: Http = async (req) => {
  const r = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
  return { status: r.status, body: Buffer.from(await r.arrayBuffer()) };
};

/** A host that refused, or answered something this client cannot read. `status` is the HTTP status, 0 for neither. */
export class SyncError extends Error {
  readonly status: number;
  readonly code = "NAIVE_SYNC_FAILED";
  constructor(message: string, status = 0) { super(message); this.name = "SyncError"; this.status = status; }
}

/** One record as the host sends it. `content` and `sha256` null mean the record was removed there. */
export type StoreRecord = { path: string; version: string; sha256: string | null; content: Json | null; by?: string; at?: string };
export type ChangesReply = { business: string; point: string; records: StoreRecord[] };
/** One record as a push sends it. `base` null means the working copy believes the record is new. */
export type PushChange = { path: string; base: string | null; content: Json | null };
export type PushBody = { working_copy: string; changes: PushChange[]; provenance: Entry[] };
export type Accepted = { path: string; version: string };
export type StaleRow = { path: string; current: string };
/** What a push came back with. A string tag, so the union narrows with and without strict mode. */
export type PushReply = { status: "accepted"; point: string; accepted: Accepted[] } | { status: "stale"; stale: StaleRow[] };
export type DeviceCode = { device_code: string; user_code: string; verification_uri: string; verification_uri_complete?: string; expires_in: number; interval: number };

const json = (b: Buffer): unknown => { try { return JSON.parse(b.toString("utf8")); } catch { return null; } };
const isObj = (v: unknown): v is { [k: string]: unknown } => typeof v === "object" && v !== null && !Array.isArray(v);
const errorOf = (body: Buffer): string => { const b = json(body); return isObj(b) && typeof b.error === "string" ? b.error : body.toString("utf8").slice(0, 200); };
const base = (host: string): string => host.replace(/\/+$/, "");

/** Everything this client asks a host for, with the token on every call. */
export type Api = {
  changes: (since: string | null) => Promise<ChangesReply>;
  push: (body: PushBody) => Promise<PushReply>;
  missingFiles: (hashes: string[]) => Promise<string[]>;
  getFile: (sha256: string) => Promise<Buffer>;
  putFile: (sha256: string, bytes: Buffer) => Promise<void>;
};

/** The sync API of one host, for one business's token. */
export function api(host: string, token: string, http: Http = httpFetch): Api {
  const at = (path: string) => `${base(host)}/api/naive/sync${path}`;
  const headers = { authorization: `Bearer ${token}` };
  const sent = async (req: HttpRequest, what: string): Promise<HttpReply> => {
    const r = await http(req);
    if (r.status === 401) throw new SyncError(`the host refused this token: sign in again with naive sync link`, 401);
    if (r.status < 200 || r.status >= 300) throw new SyncError(`${what} was refused by the host (${r.status}): ${errorOf(r.body)}`, r.status);
    return r;
  };
  const postJson = (path: string, body: unknown): HttpRequest =>
    ({ method: "POST", url: at(path), headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(body) });
  return {
    async changes(since) {
      const r = await sent({ method: "GET", url: at(`/changes${since ? `?since=${encodeURIComponent(since)}` : ""}`), headers }, "reading what changed");
      const b = json(r.body);
      if (!isObj(b) || typeof b.point !== "string" || !Array.isArray(b.records)) throw new SyncError("the host's changes answer has no point and records");
      return b as unknown as ChangesReply;
    },
    async push(body) {
      const r = await http(postJson("/push", body));
      if (r.status === 409) {
        const b = json(r.body);
        const stale = isObj(b) && Array.isArray(b.stale) ? (b.stale as StaleRow[]) : [];
        if (!stale.length) throw new SyncError(`the push was refused by the host (409): ${errorOf(r.body)}`, 409);
        return { status: "stale", stale };
      }
      if (r.status === 401) throw new SyncError(`the host refused this token: sign in again with naive sync link`, 401);
      if (r.status < 200 || r.status >= 300) throw new SyncError(`the push was refused by the host (${r.status}): ${errorOf(r.body)}`, r.status);
      const b = json(r.body);
      if (!isObj(b) || typeof b.point !== "string" || !Array.isArray(b.accepted)) throw new SyncError("the host's push answer has no point and accepted");
      return { status: "accepted", point: b.point, accepted: b.accepted as Accepted[] };
    },
    async missingFiles(hashes) {
      if (!hashes.length) return [];
      const r = await sent(postJson("/files/missing", { hashes }), "asking which files the host is missing");
      const b = json(r.body);
      if (!isObj(b) || !Array.isArray(b.missing)) throw new SyncError("the host's missing-files answer has no missing");
      return b.missing.filter((h): h is string => typeof h === "string");
    },
    async getFile(sha256) {
      const r = await sent({ method: "GET", url: at(`/files/${sha256}`), headers }, `reading the file ${sha256.slice(0, 12)}`);
      if (blobHash(r.body) !== sha256) throw new SyncError(`the host's bytes for ${sha256.slice(0, 12)} do not hash to that name`);
      return r.body;
    },
    async putFile(sha256, bytes) {
      await sent({ method: "PUT", url: at(`/files/${sha256}`), headers: { ...headers, "content-type": "application/octet-stream" }, body: bytes }, `sending the file ${sha256.slice(0, 12)}`);
    },
  };
}

// ---------------------------------------------------------------------------------------------------------------
// What is syncable, and what a record's bytes are.
// ---------------------------------------------------------------------------------------------------------------

const ENV = /(^|\/)\.env($|\.)/;
const NEVER = [".git/", ".naive/", ".release/", "_eval/", "_private/", "node_modules/"];

let writable: RegExp[] | null = null;
/**
 * Does a record route that takes writes own this path? The host writes every accepted change through its own
 * router, so a path no route owns cannot be written there and is refused whole. Reading the same route table the
 * host reads keeps the two ends in agreement, instead of a second list here that could drift. `venture.json` and
 * a decision beside a record in a subfolder are records the data model owns and no route claims, so they stay in
 * the working copy.
 */
function routeTakes(path: string): boolean {
  writable ??= routes()
    .filter((r): r is RecordRoute => r.kind === "record" && r.actions.includes("write"))
    .flatMap((r) => (r.files ?? []).map(routeGlob));
  return writable.some((re) => re.test(path));
}

/** A record's bytes as this client writes them: the one canonical form both sides compare. */
export const bytesOf = (content: Json): Buffer => Buffer.from(JSON.stringify(content, null, 2) + "\n", "utf8");

/**
 * May this logical path be sent to a host, or written by a pull? A JSON record the data model owns, and nothing
 * else: no log, no derived file, no `.env`, no git internals, no private record and no file the data model does
 * not name. `content` is checked too when it is given, so a record marked private or sensitive never travels.
 */
export function syncable(path: string, content?: Json): boolean {
  if (!path.endsWith(".json") || path.startsWith("/") || path.split("/").includes("..")) return false;
  if (ENV.test(path) || NEVER.some((n) => path === n.slice(0, -1) || path.startsWith(n))) return false;
  let kind: string | null = null;
  try { kind = pathKind(path); } catch { return false; }
  if (kind !== "record") return false;
  if (!routeTakes(path)) return false;
  if (isObj(content) && (content.private === true || content.sensitive === true)) return false;
  return true;
}

/** Every record of a working copy that may be synced, by logical path, in a stable order. */
export function syncablePaths(dir: string): string[] {
  return logicalFiles(dir).filter((p) => syncable(p, readRecord(dir, p))).sort();
}

/** The record at a logical path, or undefined when the file is missing or is not JSON. */
export function readRecord(dir: string, path: string): Json | undefined {
  const f = ventureFile(dir, path);
  if (!existsSync(f)) return undefined;
  try { return JSON.parse(readFileSync(f, "utf8")) as Json; } catch { return undefined; }
}

/** The schema name that governs a logical path, from the data model, or null when no record type claims it. */
export function schemaForPath(path: string): string | null {
  for (const r of readDataModel().records) {
    if (!r.schema) continue;
    if (venturePaths(r).some((v) => globRegExp(VENTURE_PREFIX + v).test(`instance/${path}`))) return schemaNameOf(r.schema);
  }
  return null;
}

const HEX = /^[0-9a-f]{64}$/;

/**
 * Every sha256 a record names, anywhere in it: the files it points at (design rule 6). Any string of 64 lowercase
 * hex characters counts, because a record says where a file hash sits in its own schema, not here. A string that
 * looks like a hash and is not one costs one question to the host, which answers that it has no such file.
 */
export function fileHashes(content: Json | null | undefined): string[] {
  const out = new Set<string>();
  const walk = (v: Json | undefined) => {
    if (typeof v === "string") { if (HEX.test(v)) out.add(v); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (isObj(v)) for (const x of Object.values(v)) walk(x as Json);
  };
  walk(content ?? undefined);
  return [...out];
}

// ---------------------------------------------------------------------------------------------------------------
// The sync state.
// ---------------------------------------------------------------------------------------------------------------

/** The working copy's sync state, or null when it was never linked. */
export function readState(dir: string): SyncState | null {
  const f = ventureFile(dir, STATE);
  if (!existsSync(f)) return null;
  let p: unknown = null;
  try { p = JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { throw new SyncError(`${STATE} is not valid JSON (${e instanceof Error ? e.message : String(e)}): run naive sync link <business> again`); }
  if (!isObj(p) || typeof p.host !== "string" || typeof p.business !== "string") {
    throw new SyncError(`${STATE} is not a sync state: run naive sync link <business> again`);
  }
  const bases: { [path: string]: Base } = {};
  if (isObj(p.bases)) for (const [k, v] of Object.entries(p.bases)) {
    if (isObj(v) && typeof v.version === "string" && typeof v.sha256 === "string") bases[k] = { version: v.version, sha256: v.sha256 };
  }
  return {
    host: p.host, business: p.business,
    working_copy: typeof p.working_copy === "string" ? p.working_copy : "",
    point: typeof p.point === "string" ? p.point : null,
    provenance_pushed: typeof p.provenance_pushed === "string" ? p.provenance_pushed : undefined,
    bases,
  };
}

/** Writes the sync state, and only when it changed, so a pull that found nothing writes nothing. */
export function writeState(dir: string, s: SyncState): boolean {
  const f = ventureFile(dir, STATE);
  const text = JSON.stringify({ host: s.host, business: s.business, working_copy: s.working_copy, point: s.point, provenance_pushed: s.provenance_pushed, bases: s.bases }, null, 2) + "\n";
  if (existsSync(f) && readFileSync(f, "utf8") === text) return false;
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, text);
  return true;
}

function requireState(dir: string): SyncState {
  const s = readState(dir);
  if (!s) throw new SyncError(`this working copy is not linked to a business store: run naive sync link <business> --host <url>`);
  return s;
}

/** The host for a link: --host, else sync.host in naive.config.json. Naive ships no host of its own. */
export function configuredHost(dir: string, flag?: string): string | null {
  if (flag) return flag;
  const cfg: { sync?: { host?: string } } = readConfig(dir);
  return cfg.sync?.host ?? null;
}

/** A working copy's own id, as the host sees it. Random, so no machine name leaves the laptop. */
export const newWorkingCopy = (): string => `wc-${blobHash(`${wallClock()}:${Math.random()}`).slice(0, 12)}`;

type Options = { http?: Http; token?: string; log?: (line: string) => void };
const quiet = () => {};

function tokenFor(s: SyncState, o: Options): string {
  const token = o.token ?? readToken(s.host, s.business);
  if (!token) throw new SyncError(`no sign-in token for ${s.business}: run naive sync link ${s.business}`);
  return token;
}

/** Every command here is refused in hosted mode: a hosted store is the store. */
function refuseHosted(command: string): void {
  if (isHosted()) throw new HostedRefusal(`naive sync ${command}`, "offline sync reaches a host outside the tenant, and a hosted working copy already writes to its own store through the router");
}

// ---------------------------------------------------------------------------------------------------------------
// Pull.
// ---------------------------------------------------------------------------------------------------------------

export type PullResult = {
  point: string;
  /** Records whose file the pull wrote, with how each one landed. */
  written: { path: string; how: "store" | "merged" | "removed" }[];
  unchanged: string[];
  skipped: { path: string; why: string }[];
  conflicts: { path: string; field: string; decision: string }[];
  files: string[];
};

/** The last writer of a record in this working copy, for the note on a conflict decision. */
function lastWriter(log: Entry[], path: string): string | undefined {
  for (let i = log.length - 1; i >= 0; i--) if (log[i]?.entity === path) return log[i]?.agent?.id;
  return undefined;
}

/**
 * Brings the store's changes down. Each record is merged from its base (the bytes the last sync recorded, read
 * from the blob store), the local copy and the store copy. A field only one side changed lands; the same field
 * changed on both sides keeps the store's value and becomes an open decision. The sync point moves last.
 */
export async function pull(dir: string, o: Options = {}): Promise<PullResult> {
  refuseHosted("pull");
  const s = requireState(dir);
  const a = api(s.host, tokenFor(s, o), o.http);
  const log = o.log ?? quiet;
  const got = await a.changes(s.point);
  const out: PullResult = { point: got.point, written: [], unchanged: [], skipped: [], conflicts: [], files: [] };
  const bases = { ...s.bases };
  const provenanceLog = entries(dir);

  for (const r of got.records) {
    if (!syncable(r.path, r.content)) { out.skipped.push({ path: r.path, why: "not a record this working copy syncs" }); continue; }
    const file = ventureFile(dir, r.path);
    const had = bases[r.path];
    const baseCopy = had ? baseContent(dir, had) : undefined;
    const local = readRecord(dir, r.path);
    const store = r.content === null ? undefined : r.content;
    const { merged, conflicts } = mergeRecord(baseCopy, local, store);

    // A merge that brought local fields in must still pass the record's schema; one that did not is the store's
    // own value, which the store already accepted.
    let value = merged;
    let how: "store" | "merged" | "removed" = value === undefined ? "removed"
      : store !== undefined && bytesOf(value).equals(bytesOf(store)) ? "store" : "merged";
    const schema = how === "merged" ? schemaForPath(r.path) : null;
    if (schema && value !== undefined) {
      const checked = validateValue(schema, value);
      if (checked.status === 1) {
        conflicts.push({ path: [], base: baseCopy, local, store });
        value = store;
        how = "store";
        log(`  ${r.path}: the merged record does not match ${schema}, so the store's value stands and a decision holds the local one`);
      }
    }

    for (const c of fileConflicts(dir, r.path, conflicts, {
      store_by: r.by, found_at: r.at, working_copy: s.working_copy, local_by: lastWriter(provenanceLog, r.path),
    })) out.conflicts.push({ path: r.path, field: c.path, decision: c.id });

    // Write only a real difference, so a pull that runs twice writes nothing the second time.
    const bytes = value === undefined ? null : bytesOf(value);
    const current = existsSync(file) ? readFileSync(file) : null;
    if (bytes === null ? current === null : current !== null && current.equals(bytes)) {
      out.unchanged.push(r.path);
    } else {
      if (bytes === null) rmSync(file, { force: true });
      else { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, bytes); }
      record(dir, {
        entity: r.path, activity: "write", agent: { kind: "agent", via: "cli", id: SYNC_AGENT },
        ...(bytes === null ? { content: "" } : {}),
        note: `naive sync pull from the business store ${s.business}: ${how === "merged" ? `merged with the local copy${conflicts.length ? `, ${conflicts.length} conflict(s) for a person` : ""}` : how === "removed" ? "removed in the store" : "the store's value"}`,
      });
      out.written.push({ path: r.path, how });
    }

    // The base is the store's copy at the version just seen, whatever the file now holds.
    if (store === undefined) Reflect.deleteProperty(bases, r.path);
    else bases[r.path] = { version: r.version, sha256: writeBlob(dir, bytesOf(store)) };
  }

  // The files records point at, by hash (design rule 6): a file never conflicts, so a missing one is copied down.
  for (const r of got.records) {
    if (!syncable(r.path, r.content)) continue;
    for (const h of fileHashes(r.content)) {
      if (hasBlob(dir, h)) continue;
      writeBlob(dir, await a.getFile(h));
      out.files.push(h);
    }
  }

  writeState(dir, { ...s, bases, point: got.point });
  return out;
}

/** The base copy of a record: the bytes the last sync recorded, from the blob store, or undefined when gone. */
function baseContent(dir: string, b: Base): Json | undefined {
  const bytes = readBlob(dir, b.sha256);
  if (!bytes) return undefined;
  try { return JSON.parse(bytes.toString("utf8")) as Json; } catch { return undefined; }
}

// ---------------------------------------------------------------------------------------------------------------
// Push.
// ---------------------------------------------------------------------------------------------------------------

export type PushResult = { point: string; pushed: Accepted[]; files: string[]; retries: number };

/** Every record whose bytes differ from the base version the store gave, and every record removed since. */
export function localChanges(dir: string, s: SyncState): PushChange[] {
  const out: PushChange[] = [];
  const here = new Set<string>();
  for (const p of syncablePaths(dir)) {
    here.add(p);
    const content = readRecord(dir, p);
    if (content === undefined) continue;
    const b = s.bases[p];
    if (b && b.sha256 === blobHash(bytesOf(content))) continue;
    out.push({ path: p, base: b?.version ?? null, content });
  }
  for (const [p, b] of Object.entries(s.bases)) if (!here.has(p)) out.push({ path: p, base: b.version, content: null });
  return out.sort((x, y) => (x.path < y.path ? -1 : 1));
}

/** The provenance lines the host does not have yet, oldest first, and only for records this working copy syncs. */
export function provenanceToSend(dir: string, after?: string): Entry[] {
  const all = entries(dir);
  const from = after ? all.findIndex((l) => l.hash === after) : -1;
  // A hash the log no longer holds means the chain was rebuilt, so every line is offered again.
  return all.slice(from >= 0 ? from + 1 : 0).filter((l) => syncable(l.entity));
}

/**
 * Sends what this working copy changed. Every change names its base version, so the host writes the batch only
 * if the store did not move. A store that moved answers 409, and push pulls, merges and tries again, at most
 * twice.
 */
export async function push(dir: string, o: Options = {}): Promise<PushResult> {
  refuseHosted("push");
  const log = o.log ?? quiet;
  let s = requireState(dir);
  const a = api(s.host, tokenFor(s, o), o.http);
  const files: string[] = [];

  for (let attempt = 0; ; attempt++) {
    const changes = localChanges(dir, s);
    if (!changes.length) return { point: s.point ?? "", pushed: [], files, retries: attempt };

    // The files those records point at, by hash: the host takes the bytes before the records that name them.
    const hashes = [...new Set(changes.flatMap((c) => fileHashes(c.content)))].filter((h) => hasBlob(dir, h));
    for (const h of await a.missingFiles(hashes)) {
      const bytes = readBlob(dir, h);
      if (!bytes) continue;
      await a.putFile(h, bytes);
      files.push(h);
    }

    const provenance = provenanceToSend(dir, s.provenance_pushed);
    const reply = await a.push({ working_copy: s.working_copy, changes, provenance });
    if (reply.status === "accepted") {
      const bases = { ...s.bases };
      for (const acc of reply.accepted) {
        const sent = changes.find((c) => c.path === acc.path);
        if (!sent) continue;
        if (sent.content === null) Reflect.deleteProperty(bases, acc.path);
        else bases[acc.path] = { version: acc.version, sha256: writeBlob(dir, bytesOf(sent.content)) };
      }
      writeState(dir, { ...s, bases, point: reply.point, provenance_pushed: provenance.at(-1)?.hash ?? s.provenance_pushed });
      return { point: reply.point, pushed: reply.accepted, files, retries: attempt };
    }

    if (attempt >= 2) {
      throw new SyncError(`the store moved again while pushing (${reply.stale.map((x) => x.path).join(", ")}): pull, look at the conflicts, and push again`, 409);
    }
    log(`  the store moved (${reply.stale.map((x) => x.path).join(", ")}), pulling and trying again`);
    const pulled = await pull(dir, o);
    if (pulled.conflicts.length) log(`  ${pulled.conflicts.length} conflict(s) are open decisions for a person; the store's value stands in the record`);
    s = requireState(dir);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Link: the device sign-in.
// ---------------------------------------------------------------------------------------------------------------

export type LinkResult = { host: string; business: string; working_copy: string; stored: TokenStore };
type LinkOptions = Options & { host?: string; sleep?: (ms: number) => Promise<void>; now?: () => number };

const wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

/**
 * Signs this working copy in to a business store with the device authorization grant (RFC 8628): the host gives a
 * short code, the person approves it in their browser, and the token that comes back goes into the keychain, never
 * into the business folder. `business` null lets the person pick in the browser.
 */
export async function link(dir: string, business: string | null, o: LinkOptions = {}): Promise<LinkResult> {
  refuseHosted("link");
  const host = configuredHost(dir, o.host);
  if (!host) throw new SyncError(`no host: pass --host <url>, or set sync.host in naive.config.json. Naive ships no host of its own`);
  const http = o.http ?? httpFetch;
  const log = o.log ?? quiet;
  const sleep = o.sleep ?? wait;
  const now = o.now ?? (() => nowMs());
  const post = async (path: string, body: unknown): Promise<HttpReply> =>
    await http({ method: "POST", url: `${base(host)}/api/naive/device/${path}`, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

  const started = await post("code", { business, client: "naive-cli" });
  if (started.status < 200 || started.status >= 300) throw new SyncError(`${host} refused a device code (${started.status}): ${errorOf(started.body)}`, started.status);
  const code = json(started.body);
  if (!isObj(code) || typeof code.device_code !== "string" || typeof code.user_code !== "string" || typeof code.verification_uri !== "string") {
    throw new SyncError(`${host} answered no device code`);
  }
  const device = code as unknown as DeviceCode;
  log(`Open ${device.verification_uri_complete ?? device.verification_uri} and enter the code ${device.user_code}`);
  log(`Waiting for you to approve it. Ctrl-C to stop.`);

  let interval = Math.max(1, device.interval || 5) * 1000;
  const until = now() + Math.max(1, device.expires_in || 900) * 1000;
  for (;;) {
    await sleep(interval);
    const r = await post("token", { device_code: device.device_code });
    const b = json(r.body);
    if (r.status >= 200 && r.status < 300 && isObj(b) && typeof b.access_token === "string") {
      const id = typeof b.business === "string" ? b.business : business;
      if (!id) throw new SyncError(`${host} returned a token for no business`);
      const stored = saveToken(host, id, b.access_token);
      const was = readState(dir);
      const keep = was && was.host === host && was.business === id;
      writeState(dir, keep
        ? { ...was, host, business: id }
        : { host, business: id, working_copy: newWorkingCopy(), point: null, bases: {} });
      const s = requireState(dir);
      log(`Linked to ${id} at ${host}. The token is in the ${stored.kind === "keychain" ? "operating system keychain" : `file ${stored.where} (mode 0600)`}, never in this folder.`);
      log(keep ? `Working copy ${s.working_copy}, sync point ${s.point ?? "none yet"}. Run naive sync pull.` : `Working copy ${s.working_copy}. Run naive sync pull.`);
      return { host, business: id, working_copy: s.working_copy, stored };
    }
    const why = isObj(b) && typeof b.error === "string" ? b.error : `status ${r.status}`;
    // Pending and slow_down both mean keep waiting, and both stop at the host's own expiry, so a host that
    // only ever says slow_down cannot hold the loop open.
    if (why === "authorization_pending" || why === "slow_down") {
      if (now() > until) throw new SyncError(`the code expired before it was approved: run naive sync link again`);
      if (why === "slow_down") interval += 5000;
      continue;
    }
    if (why === "expired_token") throw new SyncError(`the code expired before it was approved: run naive sync link again`);
    if (why === "access_denied") throw new SyncError(`the sign-in was declined at ${host}`);
    throw new SyncError(`${host} refused the sign-in: ${why}`, r.status);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Status.
// ---------------------------------------------------------------------------------------------------------------

export type Status = {
  linked: boolean;
  host?: string;
  business?: string;
  working_copy?: string;
  point?: string | null;
  signed_in?: boolean;
  records?: number;
  changed?: PushChange[];
  conflicts?: string[];
};

/** Where this working copy stands. Reads nothing from the host, so it works with no network. */
export function status(dir: string, o: Options = {}): Status {
  refuseHosted("status");
  const s = readState(dir);
  if (!s) return { linked: false };
  const open = logicalFiles(dir)
    .filter((p) => /(^|\/)decisions\/sync-conflict-[0-9a-f]+\.decision\.json$/.test(p))
    .filter((p) => { const d = readRecord(dir, p); return isObj(d) && d.status === "open"; })
    .sort();
  return {
    linked: true, host: s.host, business: s.business, working_copy: s.working_copy, point: s.point,
    signed_in: Boolean(o.token ?? readToken(s.host, s.business)),
    records: syncablePaths(dir).length,
    changed: localChanges(dir, s),
    conflicts: open,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// The command line, behind `naive sync`.
// ---------------------------------------------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, sub = "status", ...rest] = process.argv.slice(2);
  const opt = (n: string): string | undefined => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
  const asJson = rest.includes("--json");
  const say = (line: string) => { if (!asJson) console.log(line); };
  if (!dir) { console.error("usage: node packages/naive/src/engine/sync.ts <venture dir> link <business> [--host <url>] | pull | push | status [--json]"); process.exit(2); }
  try {
    if (sub === "link") {
      const named = rest.find((a, i) => !a.startsWith("--") && rest[i - 1] !== "--host") ?? null;
      const r = await link(dir, named, { host: opt("host"), log: say });
      if (asJson) console.log(JSON.stringify({ ...r, stored: r.stored.kind }, null, 2));
    } else if (sub === "pull") {
      const r = await pull(dir, { log: say });
      if (asJson) console.log(JSON.stringify(r, null, 2));
      else {
        for (const w of r.written) say(`  ${w.how === "merged" ? "merged " : w.how === "removed" ? "removed" : "updated"}  ${w.path}`);
        for (const c of r.conflicts) say(`  decide  ${c.path} ${c.field}: ${c.decision}`);
        for (const k of r.skipped) say(`  skipped ${k.path}: ${k.why}`);
        say(`${r.written.length} record(s) written, ${r.unchanged.length} already current, ${r.conflicts.length} conflict(s) for a person, ${r.files.length} file(s) copied down. Sync point ${r.point}.`);
      }
    } else if (sub === "push") {
      const r = await push(dir, { log: say });
      if (asJson) console.log(JSON.stringify(r, null, 2));
      else say(r.pushed.length
        ? `${r.pushed.length} record(s) accepted, ${r.files.length} file(s) sent${r.retries ? `, after ${r.retries} retry(s)` : ""}. Sync point ${r.point}.`
        : `nothing to push: every record matches its base version in the store.`);
    } else if (sub === "status") {
      const r = status(dir);
      if (asJson) console.log(JSON.stringify(r, null, 2));
      else if (!r.linked) say(`not linked: run naive sync link <business> --host <url>`);
      else {
        say(`business ${r.business} at ${r.host}`);
        say(`working copy ${r.working_copy}, sync point ${r.point ?? "none yet (run naive sync pull)"}, ${r.signed_in ? "signed in" : "no token: run naive sync link"}`);
        say(`${r.records} record(s) here, ${r.changed?.length ?? 0} changed since their base version`);
        for (const c of r.changed ?? []) say(`  ${c.content === null ? "removed" : c.base ? "changed" : "new    "}  ${c.path}`);
        if (r.conflicts?.length) say(`${r.conflicts.length} open conflict decision(s): run naive decisions`);
      }
    } else { console.error(`no sync command ${sub}: link, pull, push or status`); process.exit(2); }
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}
