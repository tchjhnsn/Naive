// The connector contract (EE-037). A connector reaches one source of records (a folder, a GitHub
// repository, later a database, Notion or Salesforce) and does the same five things for every one:
//
//   list(prefix)            [{ path, version }] for every item under the prefix, sorted by path
//   read(path)              { path, content, version, commit?, permalink? }, or null when it is missing
//   version(path)           the item's version, or null when it is missing
//   search(query, {limit})  [{ path, version }] for items whose text holds every word of the query
//   write(path, content, {message, title, base, append})
//                           { path, version, commit?, pull_request? }; how it writes is the
//                           connector's `writes`: direct (in place), pull-request (a draft pull
//                           request; merging it accepts the write) or none (read-only, write throws)
//
// Compare on write. `base` is the version the writer started from, or null for an item it believes
// is new. When `base` is given and the item's current version differs, the write is refused with a
// VersionConflict that carries the current version (null when the item is missing), so the caller
// can read again and retry. `append: true` adds `content` (whole lines, ending in a newline) to the
// end of a log instead of replacing it; with `base`, it is refused unless the stored log is still
// exactly the copy the writer began from, so no line lands after lines the writer never saw and a
// hash chain stays intact. A write without `base` or `append` replaces the item as it always has.
//
// Paths are relative to the source's root and use forward slashes; a path that leaves the root is
// refused. Content is UTF-8 text. A version is the git blob SHA-1 of the content, whichever
// connector holds it, so the same content has the same version in every source and a version
// can be checked without asking the source. An item's address is <source id>://<path>; with its
// version it is what provenance cites.

// Pure helpers stay plain functions. The two that refuse (safePath, checkWrite) are written as Effects
// (safePathEffect, checkWriteEffect) that fail with tagged errors, and the plain names run them (EE-125).

import { createHash } from "node:crypto";
import { Effect } from "effect";
import { Refused, VersionConflict } from "../../core/effect/errors.ts";
import { runSync } from "../../core/effect/run.ts";

export { VersionConflict };

export const METHODS = ["list", "read", "version", "search", "write"] as const;
export const WRITES = ["direct", "pull-request", "none"] as const;
/** How a connector's writes reach its source. */
export type Writes = (typeof WRITES)[number];
/** One item a list or search names. */
export type Listed = { path: string; version: string };
/** One item read whole. */
export type Item = { path: string; content: string; version: string; commit?: string; permalink?: string };
/** What a write may say: the version it started from, whether it appends, and a commit or pull request's words. */
export type WriteOptions = { base?: string | null; append?: boolean; message?: string; title?: string };
/** What a write answers: the item's new version, and the commit or the draft pull request that holds it. */
export type Written = Listed & { commit?: string; pull_request?: { url: string; branch: string; [key: string]: unknown } };
/** A connected connector as the contract has it: its id, how it writes, and the five methods, each a Promise. */
export type Connector = {
  id: string;
  writes: Writes;
  list: (prefix?: string) => Promise<Listed[]>;
  read: (path: string) => Promise<Item | null>;
  version: (path: string) => Promise<string | null>;
  search: (query: string, opts?: { limit?: number }) => Promise<Listed[]>;
  write: (path: string, content: string | Buffer, opts?: WriteOptions) => Promise<Written>;
};

const isWrites = (w: unknown): w is Writes => WRITES.some((x) => x === w);

/** The git blob SHA-1 of some content: what `git hash-object` prints. */
export const blobSha = (content: string | Buffer): string => {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
};

const outside = (message: string) => new Refused({ rule: "path-inside-source", message });

/** A path inside a source, normalised; fails with Refused for one that is empty or leaves the root. */
export const safePathEffect = (p: unknown): Effect.Effect<string, Refused> => Effect.suspend(() => {
  if (typeof p !== "string" || !p.length || p.includes("\0") || p.includes("\\") || p.startsWith("/")) return Effect.fail(outside(`${JSON.stringify(p)} is not a path inside the source`));
  const parts = p.split("/").filter((s) => s && s !== ".");
  if (!parts.length || parts.includes("..")) return Effect.fail(outside(`${p} is not a path inside the source`));
  return Effect.succeed(parts.join("/"));
});

/** A path inside a source, normalised, or a thrown Refused for one that is empty or leaves the root. */
export const safePath = (p: unknown): string => runSync(safePathEffect(p));

/**
 * Checks a write's options against the item's current version and content, before anything is
 * written. Fails with a VersionConflict for a stale base, and with Refused for a base that is not a
 * version or an append that would not add whole lines at a line boundary. Shared so every connector
 * refuses the same writes. `current` is the version now and `stored` the content now (used only for append), each
 * null when the item is missing.
 */
export const checkWriteEffect = (path: string, current: string | null, stored: string | null, content: string | Buffer, { base, append }: Pick<WriteOptions, "base" | "append"> = {}): Effect.Effect<void, VersionConflict | Refused> => Effect.suspend((): Effect.Effect<void, VersionConflict | Refused> => {
  const refuse = (rule: string, message: string) => Effect.fail(new Refused({ rule, message }));
  if (base !== undefined && base !== null && typeof base !== "string") return refuse("base-version", `${path}: base must be a version or null`);
  if (base !== undefined && base !== current) return Effect.fail(new VersionConflict(path, base, current));
  if (!append) return Effect.void;
  const text = Buffer.isBuffer(content) ? content.toString("utf8") : String(content);
  if (!text.length || !text.endsWith("\n")) return refuse("append-whole-lines", `${path}: an append adds whole lines, ending in a newline`);
  if (stored && !stored.endsWith("\n")) return refuse("append-whole-lines", `${path}: the stored log does not end at a line boundary, so an append would join a partial line`);
  return Effect.void;
});

/** checkWriteEffect run at once: throws the VersionConflict or Refused. */
export const checkWrite = (path: string, current: string | null, stored: string | null, content: string | Buffer, opts: Pick<WriteOptions, "base" | "append"> = {}): void => runSync(checkWriteEffect(path, current, stored, content, opts));

export const address = (sourceId: string, path: string): string => `${sourceId}://${path}`;

/** Every word of the query, lowercased, appears in the text. */
export const matches = (text: string, query: string): boolean => {
  const t = text.toLowerCase();
  return words(query).every((w) => t.includes(w));
};
export const words = (s: string): string[] => String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);

/** Text a catalog may index: small files that are not binary. */
export const isText = (path: string, content?: string): boolean => !/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf|mp4|mov)$/i.test(path) && (content === undefined || !content.includes("\0"));

/** Checks an object has the contract's methods and a known `writes`. Returns the problems. */
export function conformance(c: unknown): string[] {
  const get = (k: string): unknown => ((typeof c === "object" || typeof c === "function") && c !== null ? Reflect.get(c, k) : undefined);
  const problems = METHODS.filter((m) => typeof get(m) !== "function").map((m) => `no ${m}()`);
  if (!isWrites(get("writes"))) problems.push(`writes is ${String(get("writes"))}, not one of ${WRITES.join(", ")}`);
  if (typeof get("id") !== "string") problems.push("no id");
  return problems;
}

/** Whether a module's connect() gave a connector the contract accepts: an id, a known `writes` and the five methods. */
export const isConnector = (c: unknown): c is Connector => conformance(c).length === 0;
