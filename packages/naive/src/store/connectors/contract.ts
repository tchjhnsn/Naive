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

export const METHODS = ["list", "read", "version", "search", "write"];
export const WRITES = ["direct", "pull-request", "none"];

/** The git blob SHA-1 of some content: what `git hash-object` prints. @param {string | Buffer} content */
export const blobSha = (content) => {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
  return createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");
};

/** @param {string} message */
const outside = (message) => new Refused({ rule: "path-inside-source", message });

/**
 * A path inside a source, normalised; fails with Refused for one that is empty or leaves the root.
 * @param {unknown} p
 * @returns {Effect.Effect<string, Refused>}
 */
export const safePathEffect = (p) => Effect.suspend(() => {
  if (typeof p !== "string" || !p.length || p.includes("\0") || p.includes("\\") || p.startsWith("/")) return Effect.fail(outside(`${JSON.stringify(p)} is not a path inside the source`));
  const parts = p.split("/").filter((s) => s && s !== ".");
  if (!parts.length || parts.includes("..")) return Effect.fail(outside(`${p} is not a path inside the source`));
  return Effect.succeed(parts.join("/"));
});

/** A path inside a source, normalised, or a thrown Refused for one that is empty or leaves the root. @param {unknown} p */
export const safePath = (p) => runSync(safePathEffect(p));

/**
 * Checks a write's options against the item's current version and content, before anything is
 * written. Fails with a VersionConflict for a stale base, and with Refused for a base that is not a
 * version or an append that would not add whole lines at a line boundary. Shared so every connector
 * refuses the same writes.
 * @param {string} path @param {string | null} current the version now, or null when missing
 * @param {string | null} stored the content now, or null when missing (used only for append)
 * @param {string | Buffer} content @param {{ base?: string | null, append?: boolean }} [opts]
 * @returns {Effect.Effect<void, VersionConflict | Refused>}
 */
export const checkWriteEffect = (path, current, stored, content, { base, append } = {}) => Effect.suspend(/** @returns {Effect.Effect<void, VersionConflict | Refused>} */ () => {
  /** @param {string} rule @param {string} message */
  const refuse = (rule, message) => Effect.fail(new Refused({ rule, message }));
  if (base !== undefined && base !== null && typeof base !== "string") return refuse("base-version", `${path}: base must be a version or null`);
  if (base !== undefined && base !== current) return Effect.fail(new VersionConflict(path, base, current));
  if (!append) return Effect.void;
  const text = Buffer.isBuffer(content) ? content.toString("utf8") : String(content);
  if (!text.length || !text.endsWith("\n")) return refuse("append-whole-lines", `${path}: an append adds whole lines, ending in a newline`);
  if (stored && !stored.endsWith("\n")) return refuse("append-whole-lines", `${path}: the stored log does not end at a line boundary, so an append would join a partial line`);
  return Effect.void;
});

/**
 * checkWriteEffect run at once: throws the VersionConflict or Refused.
 * @param {string} path @param {string | null} current @param {string | null} stored
 * @param {string | Buffer} content @param {{ base?: string | null, append?: boolean }} [opts]
 */
export const checkWrite = (path, current, stored, content, opts = {}) => runSync(checkWriteEffect(path, current, stored, content, opts));

export const address = (sourceId, path) => `${sourceId}://${path}`;

/** Every word of the query, lowercased, appears in the text. */
export const matches = (text, query) => {
  const t = text.toLowerCase();
  return words(query).every((w) => t.includes(w));
};
export const words = (s) => String(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);

/** Text a catalog may index: small files that are not binary. */
export const isText = (path, content) => !/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|woff2?|ttf|mp4|mov)$/i.test(path) && (content === undefined || !content.includes("\0"));

/** Checks an object has the contract's methods and a known `writes`. Returns the problems. */
export function conformance(c) {
  const problems = METHODS.filter((m) => typeof c?.[m] !== "function").map((m) => `no ${m}()`);
  if (!WRITES.includes(c?.writes)) problems.push(`writes is ${c?.writes}, not one of ${WRITES.join(", ")}`);
  if (typeof c?.id !== "string") problems.push("no id");
  return problems;
}
