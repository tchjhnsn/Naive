// The file system connector (EE-037): a folder, inside a git repository or not. It is the default
// source: a venture without a source map keeps every record in its own folder, through this.
//
//   root     the folder (absolute)
//   writes   direct (default) or none
//   venture  true when the root is a venture folder: listing stops at a nested venture (it has
//            its own records) and skips the venture's private _ folders, as the router always has
//
// version is the git blob SHA-1 of the content. When the file is committed and unchanged, read
// also gives the last commit that touched it.
//
// A write with `base` or `append` holds a lock file beside the item (.<name>.lock, skipped by
// list) while it compares and writes, so two processes cannot both pass the check. A lock older
// than LOCK_STALE_MS is taken to be left by a process that died, and is removed.

// The connector is written as Effects over VentureFs (EE-125): connectEffects(options) gives the connector
// whose five methods return Effects, for code that composes them; connect(options) gives the same
// connector with each method run as a Promise, the contract every caller and app uses.

import { basename, dirname, join } from "node:path";
import { Effect } from "effect";
import { blobSha, checkWriteEffect, isText, matches, safePathEffect } from "./contract.mjs";
import { Refused } from "../../core/effect/errors.ts";
import { VentureFs } from "../../core/effect/fs.ts";
import { runPromise, runSync } from "../../core/effect/run.ts";
import { layoutOf, logicalFiles, ventureFile } from "../../core/venture-paths.mjs";
import { git as runGit } from "../../core/runtime.mjs";

/** @typedef {import("../../core/effect/errors.ts").NaiveError} NaiveError */
/** @typedef {{ path: string, version: string }} Listed */
/** @typedef {{ path: string, content: string, version: string, commit?: string }} Item */
/** @typedef {{ base?: string | null, append?: boolean, message?: string, title?: string }} WriteOptions */
/**
 * The filesystem connector with Effect methods. Each needs VentureFs and fails with a tagged error.
 * @typedef {{
 *   id: string, kind: "filesystem", writes: string, root: string,
 *   list: (prefix?: string) => Effect.Effect<Listed[], NaiveError, "naive/VentureFs">,
 *   read: (p: string) => Effect.Effect<Item | null, NaiveError, "naive/VentureFs">,
 *   version: (p: string) => Effect.Effect<string | null, NaiveError, "naive/VentureFs">,
 *   search: (query: string, opts?: { limit?: number }) => Effect.Effect<Listed[], NaiveError, "naive/VentureFs">,
 *   write: (p: string, content: string | Buffer, opts?: WriteOptions) => Effect.Effect<Listed, NaiveError, "naive/VentureFs">,
 * }} EffectConnector
 */

const SKIP = new Set(["node_modules"]);
const LOCK_STALE_MS = 30_000;
const LOCK_TRIES = 200;

/**
 * Runs an Effect while holding an exclusive lock file for the item f it writes.
 * @template A, E
 * @param {string} f @param {Effect.Effect<A, E, "naive/VentureFs">} use
 * @returns {Effect.Effect<A, E | NaiveError, "naive/VentureFs">}
 */
const withLock = (f, use) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const lock = join(dirname(f), `.${basename(f)}.lock`);
  for (let i = 0; ; i++) {
    if (yield* fs.createExclusive(lock)) break;
    const st = yield* fs.stat(lock);
    if (!st) continue;
    if (Date.now() - st.mtimeMs > LOCK_STALE_MS) { yield* fs.remove(lock); continue; }
    if (i >= LOCK_TRIES) return yield* Effect.fail(new Refused({ rule: "locked", message: `${f} is locked by another writer` }));
    yield* Effect.sleep("10 millis");
  }
  return yield* Effect.ensuring(use, Effect.ignore(fs.remove(lock)));
});

/**
 * The filesystem connector, its methods written as Effects.
 * @param {{ id?: string, root?: string, writes?: string, venture?: boolean }} [opts]
 * @returns {Effect.Effect<EffectConnector, Refused>}
 */
export const connectEffects = ({ id = "venture", root, writes = "direct", venture = false } = {}) => Effect.suspend(() => {
  if (!root) return Effect.fail(new Refused({ rule: "filesystem-options", message: "the filesystem connector needs a root folder" }));
  if (writes === "pull-request") return Effect.fail(new Refused({ rule: "filesystem-options", message: "the filesystem connector writes direct or none" }));
  const top = root;

  /** @param {string} d @param {string} [rel] @returns {Effect.Effect<string[], NaiveError, "naive/VentureFs">} */
  const walk = (d, rel = "") => Effect.gen(function* () {
    const fs = yield* VentureFs;
    if (!(yield* fs.exists(d))) return [];
    /** @type {string[]} */
    const out = [];
    for (const name of yield* fs.list(d)) {
      if (name.startsWith(".") || SKIP.has(name)) continue;
      const r = rel ? `${rel}/${name}` : name;
      const st = yield* fs.stat(join(d, name));
      if (!st) continue;
      if (st.isDirectory) {
        if (venture && ((yield* fs.exists(join(d, name, "venture.json"))) || (!rel && name.startsWith("_")))) continue;
        out.push(...(yield* walk(join(d, name), r)));
      } else out.push(r);
    }
    return out;
  });
  // A venture in the structured layout (EE-086) keeps its records in knowledge/ and meta/: read and write them
  // by their logical paths, and list them that way, so routes never see the layout.
  const structured = venture && layoutOf(top) !== "flat"; // structured (EE-086) or src (EE-118 step 8)
  /** @param {string} p */
  const file = (p) => Effect.map(safePathEffect(p), (safe) => (structured ? ventureFile(top, safe) : join(top, safe)));
  /** @returns {Effect.Effect<string[], NaiveError, "naive/VentureFs">} */
  const listed = () => structured
    ? Effect.sync(() => logicalFiles(top).filter((r) => !r.split("/").some((s) => s.startsWith(".")) && !r.startsWith("_") && !r.startsWith("node_modules/")))
    : walk(top);
  /** @param {...string} args */
  const git = (...args) => runGit("reading a record's last commit", ["-C", top, ...args], { encoding: "utf8" });
  /** @param {string} p @param {string} content */
  const lastCommit = (p, content) => Effect.sync(() => {
    const tracked = git("ls-files", "-s", "--", p);
    if (tracked.status !== 0 || !tracked.stdout) return null;
    if (String(tracked.stdout).split(/\s+/)[1] !== blobSha(content) || git("diff", "--quiet", "HEAD", "--", p).status !== 0) return null;
    return String(git("log", "-1", "--format=%H", "--", p).stdout).trim() || null;
  });
  /** The file's bytes when it is a file, else null. @param {string} f */
  const bytesOf = (f) => Effect.gen(function* () {
    const fs = yield* VentureFs;
    const st = yield* fs.stat(f);
    return st && !st.isDirectory ? yield* fs.readBytes(f) : null;
  });

  /** @type {EffectConnector} */
  const c = {
    id, kind: "filesystem", writes, root: top,
    list: (prefix = "") => Effect.gen(function* () {
      const fs = yield* VentureFs;
      const pre = prefix ? yield* safePathEffect(prefix) : "";
      const paths = (yield* listed()).filter((p) => !pre || p === pre || p.startsWith(`${pre}/`)).sort();
      /** @type {Listed[]} */
      const out = [];
      for (const path of paths) out.push({ path, version: blobSha(yield* fs.readBytes(yield* file(path))) });
      return out;
    }),
    read: (p) => Effect.gen(function* () {
      // One read: the version is the hash of exactly the content returned, even while another process appends.
      const bytes = yield* bytesOf(yield* file(p));
      if (!bytes) return null;
      const path = yield* safePathEffect(p);
      const content = bytes.toString("utf8");
      const commit = yield* lastCommit(path, content);
      return { path, content, version: blobSha(bytes), ...(commit ? { commit } : {}) };
    }),
    version: (p) => Effect.gen(function* () {
      const bytes = yield* bytesOf(yield* file(p));
      return bytes ? blobSha(bytes) : null;
    }),
    search: (query, { limit = 50 } = {}) => Effect.gen(function* () {
      const fs = yield* VentureFs;
      /** @type {Listed[]} */
      const out = [];
      for (const path of (yield* listed()).sort()) {
        if (out.length >= limit) break;
        const content = yield* fs.readText(yield* file(path));
        if (isText(path, content) && matches(`${path}\n${content}`, query)) out.push({ path, version: blobSha(content) });
      }
      return out;
    }),
    write: (p, content, opts = {}) => Effect.gen(function* () {
      if (writes === "none") return yield* Effect.fail(new Refused({ rule: "read-only", message: `${id} is read-only` }));
      const fs = yield* VentureFs;
      const f = yield* file(p);
      const path = yield* safePathEffect(p);
      const replace = Effect.gen(function* () {
        const tmp = `${f}.tmp-${process.pid}`;
        yield* fs.writeText(tmp, content);
        yield* fs.rename(tmp, f);
        return { path, version: blobSha(content) };
      });
      if (opts.base === undefined && !opts.append) return yield* replace;
      return yield* withLock(f, Effect.gen(function* () {
        const stored = yield* bytesOf(f);
        yield* checkWriteEffect(path, stored ? blobSha(stored) : null, stored ? stored.toString("utf8") : null, content, opts);
        if (!opts.append) return yield* replace;
        yield* fs.append(f, content);
        return { path, version: blobSha(yield* fs.readBytes(f)) };
      }));
    }),
  };
  return Effect.succeed(c);
});

/**
 * The filesystem connector as the contract has it: each method returns a Promise.
 * @param {{ id?: string, root?: string, writes?: string, venture?: boolean }} [opts]
 */
export function connect(opts = {}) {
  const c = runSync(connectEffects(opts));
  return {
    id: c.id, kind: c.kind, writes: c.writes, root: c.root,
    /** @param {string} [prefix] */
    list: (prefix) => runPromise(c.list(prefix)),
    /** @param {string} p */
    read: (p) => runPromise(c.read(p)),
    /** @param {string} p */
    version: (p) => runPromise(c.version(p)),
    /** @param {string} query @param {{ limit?: number }} [o] */
    search: (query, o) => runPromise(c.search(query, o)),
    /** @param {string} p @param {string | Buffer} content @param {WriteOptions} [o] */
    write: (p, content, o) => runPromise(c.write(p, content, o)),
  };
}
