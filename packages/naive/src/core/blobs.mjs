// The blob store (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "As-of reads (Naive)", build
// plan item 2): the bytes each provenance line names, kept under <venture>/.naive/blobs/<aa>/<sha256>, where <sha256>
// is the line's own sha256 field (the content's SHA-256) and <aa> its first two characters. A blob is content-addressed
// and immutable: writing one that exists is a no-op, and a file whose bytes do not hash to its name is never served.
//
// The provenance log writes the blob before it appends the line (packages/naive/src/core/provenance.mjs record), so a
// line written since blobs exist always has its blob. Lines written before carry no blob, and nothing backfills them.
// packages/naive/src/store/as-of.mjs reads a record as it was at a transaction time from these blobs.
//
// This is a .mjs file, not .ts, because every write through the router imports it, and Node does not strip types
// under node_modules, so an app that installs Naive (Mentura) could not load a .ts file here.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { ventureFile } from "./venture-paths.mjs";

/** The blob store's folder, as a logical path in a venture. Every layout keeps .naive/ at the top. */
export const BLOBS = ".naive/blobs";
const HEX = /^[0-9a-f]{64}$/;

/** The SHA-256 of some bytes, in hex: the hash a provenance line records and a blob is named by. */
export const blobHash = (/** @type {string | Buffer} */ bytes) => createHash("sha256").update(bytes).digest("hex");

/** The logical path of a blob in a venture: .naive/blobs/<first two hex characters>/<sha256>. */
export function blobRel(/** @type {string} */ sha256) {
  if (typeof sha256 !== "string" || !HEX.test(sha256)) throw new Error(`${sha256} is not a SHA-256 in lowercase hex`);
  return `${BLOBS}/${sha256.slice(0, 2)}/${sha256}`;
}

/** The absolute path of a blob in a venture. */
export const blobFile = (/** @type {string} */ dir, /** @type {string} */ sha256) => ventureFile(dir, blobRel(sha256));

/** Is the blob for this hash in the venture's store? */
export const hasBlob = (/** @type {string} */ dir, /** @type {string} */ sha256) => HEX.test(sha256) && existsSync(blobFile(dir, sha256));

/**
 * Stores bytes under their SHA-256 and returns the hash. An existing blob is left as it is. The bytes go to a
 * temporary file beside the blob first and are renamed into place, so a reader never sees half a blob.
 * @param {string} dir the venture folder
 * @param {string | Buffer} bytes
 * @returns {string}
 */
export function writeBlob(dir, bytes) {
  const sha256 = blobHash(bytes);
  const f = blobFile(dir, sha256);
  if (existsSync(f)) return sha256;
  mkdirSync(dirname(f), { recursive: true });
  const tmp = `${f}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  try {
    writeFileSync(tmp, bytes);
    renameSync(tmp, f);
  } finally { rmSync(tmp, { force: true }); }
  return sha256;
}

/**
 * The bytes stored under a hash, or null when the venture has no such blob, or the file there does not hash to its
 * name (a damaged blob is treated as missing, never served).
 * @param {string} dir
 * @param {string} sha256
 * @returns {Buffer | null}
 */
export function readBlob(dir, sha256) {
  if (typeof sha256 !== "string" || !HEX.test(sha256)) return null;
  const f = blobFile(dir, sha256);
  if (!existsSync(f)) return null;
  const bytes = readFileSync(f);
  return blobHash(bytes) === sha256 ? bytes : null;
}
