// The blob store (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "As-of reads (Naive)", build
// plan item 2): the bytes each provenance line names, kept under <venture>/.naive/blobs/<aa>/<sha256>, where <sha256>
// is the line's own sha256 field (the content's SHA-256) and <aa> its first two characters. A blob is content-addressed
// and immutable: writing one that exists is a no-op, and a file whose bytes do not hash to its name is never served.
//
// The provenance log writes the blob before it appends the line (packages/naive/src/core/provenance.ts record), so a
// line written since blobs exist always has its blob. Lines written before carry no blob, and nothing backfills them.
// packages/naive/src/store/as-of.ts reads a record as it was at a transaction time from these blobs.
//
// This is a .mjs file, not .ts, because every write through the router imports it, and Node does not strip types
// under node_modules, so an app that installs Naive (Mentura) could not load a .ts file here.
//
// The logic is written as Effects (EE-125): files through VentureFs, a bad hash as a tagged error. Each export
// keeps its old plain shape by running its Effect with runSync; `writeBlobEffect`, `readBlobEffect` and
// `hasBlobEffect` are the Effect versions, for code that composes them.

import { createHash } from "node:crypto";
import { Effect } from "effect";
import { ParseError, type IoError, type NotFound } from "./effect/errors.ts";
import { VentureFs } from "./effect/fs.ts";
import { runSync } from "./effect/run.ts";
import { ventureFile } from "./venture-paths.ts";

/** The blob store's folder, as a logical path in a venture. Every layout keeps .naive/ at the top. */
export const BLOBS = ".naive/blobs";
const HEX = /^[0-9a-f]{64}$/;

/** The SHA-256 of some bytes, in hex: the hash a provenance line records and a blob is named by. */
export const blobHash = (bytes: string | Buffer): string => createHash("sha256").update(bytes).digest("hex");

/** The logical path of a blob in a venture: .naive/blobs/<first two hex characters>/<sha256>. */
export function blobRel(sha256: string): string {
  if (typeof sha256 !== "string" || !HEX.test(sha256)) throw new Error(`${sha256} is not a SHA-256 in lowercase hex`);
  return `${BLOBS}/${sha256.slice(0, 2)}/${sha256}`;
}

/** The absolute path of a blob in a venture. */
export const blobFile = (dir: string, sha256: string): string => ventureFile(dir, blobRel(sha256));

/** Is the blob for this hash in the venture's store? */
export const hasBlobEffect = (dir: string, sha256: string): Effect.Effect<boolean, never, "naive/VentureFs"> => Effect.gen(function* () {
  if (!HEX.test(sha256)) return false;
  const fs = yield* VentureFs;
  return yield* fs.exists(blobFile(dir, sha256));
});

/** Is the blob for this hash in the venture's store? */
export const hasBlob = (dir: string, sha256: string): boolean => runSync(hasBlobEffect(dir, sha256));

/**
 * Stores bytes under their SHA-256 and succeeds with the hash. An existing blob is left as it is. The bytes go to a
 * temporary file beside the blob first and are renamed into place, so a reader never sees half a blob; the
 * temporary file is removed whether or not the rename happened. `dir` is the venture folder.
 */
export const writeBlobEffect = (dir: string, bytes: string | Buffer): Effect.Effect<string, IoError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const sha256 = blobHash(bytes);
  const f = blobFile(dir, sha256);
  if (yield* fs.exists(f)) return sha256;
  const tmp = `${f}.${process.pid}.${Math.random().toString(16).slice(2)}.tmp`;
  yield* Effect.ensuring(
    Effect.andThen(fs.writeText(tmp, bytes), fs.rename(tmp, f)),
    Effect.ignore(fs.remove(tmp)),
  );
  return sha256;
});

/**
 * Stores bytes under their SHA-256 and returns the hash. Throws an IoError when the store cannot be written.
 * `dir` is the venture folder.
 */
export const writeBlob = (dir: string, bytes: string | Buffer): string => runSync(writeBlobEffect(dir, bytes));

/**
 * The bytes stored under a hash. Fails with NotFound when the venture has no such blob or the hash is not one,
 * and with ParseError when the file there does not hash to its name (a damaged blob is never served).
 */
export const readBlobEffect = (dir: string, sha256: string): Effect.Effect<Buffer, IoError | NotFound | ParseError, "naive/VentureFs"> => Effect.gen(function* () {
  if (typeof sha256 !== "string" || !HEX.test(sha256)) return yield* Effect.fail(new ParseError({ path: String(sha256), cause: "not a SHA-256 in lowercase hex" }));
  const fs = yield* VentureFs;
  const f = blobFile(dir, sha256);
  const bytes = yield* fs.readBytes(f);
  if (blobHash(bytes) !== sha256) return yield* Effect.fail(new ParseError({ path: f, cause: "the bytes do not hash to the blob's name" }));
  return bytes;
});

/**
 * The bytes stored under a hash, or null when the venture has no such blob, or the file there does not hash to its
 * name (a damaged blob is treated as missing, never served).
 */
export function readBlob(dir: string, sha256: string): Buffer | null {
  return runSync(Effect.catchTags(readBlobEffect(dir, sha256), { NotFound: () => Effect.succeed(null), ParseError: () => Effect.succeed(null) }));
}
