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

import { spawnSync } from "node:child_process";
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { blobSha, checkWrite, isText, matches, safePath } from "./contract.mjs";
import { layoutOf, logicalFiles, ventureFile } from "../../core/venture-paths.mjs";

const SKIP = new Set(["node_modules"]);
const LOCK_STALE_MS = 30_000;
const LOCK_TRIES = 200;

/** Runs f while holding an exclusive lock file for the item f writes. */
function withLock(f, fn) {
  const lock = join(dirname(f), `.${basename(f)}.lock`);
  for (let i = 0; ; i++) {
    try { closeSync(openSync(lock, "wx")); break; } catch (e) {
      if (/** @type {NodeJS.ErrnoException} */ (e).code !== "EEXIST") throw e;
      try { if (Date.now() - statSync(lock).mtimeMs > LOCK_STALE_MS) { rmSync(lock, { force: true }); continue; } } catch { continue; }
      if (i >= LOCK_TRIES) throw new Error(`${f} is locked by another writer`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try { return fn(); } finally { rmSync(lock, { force: true }); }
}

/** @param {{ id?: string, root?: string, writes?: string, venture?: boolean }} [opts] */
export function connect({ id = "venture", root, writes = "direct", venture = false } = {}) {
  if (!root) throw new Error("the filesystem connector needs a root folder");
  if (writes === "pull-request") throw new Error("the filesystem connector writes direct or none");

  const walk = (d, rel = "") => !existsSync(d) ? [] : readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith(".") || SKIP.has(e.name)) return [];
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (venture && (existsSync(join(d, e.name, "venture.json")) || (!rel && e.name.startsWith("_")))) return [];
      return walk(join(d, e.name), r);
    }
    return e.isFile() ? [r] : [];
  });
  // A venture in the structured layout (EE-086) keeps its records in knowledge/ and meta/: read and write them
  // by their logical paths, and list them that way, so routes never see the layout.
  const structured = venture && layoutOf(root) !== "flat"; // structured (EE-086) or src (EE-118 step 8)
  const file = (p) => (structured ? ventureFile(root, safePath(p)) : join(root, safePath(p)));
  const listed = () => structured ? logicalFiles(root).filter((r) => !r.split("/").some((s) => s.startsWith(".")) && !r.startsWith("_") && !r.startsWith("node_modules/")) : walk(root);
  const git = (...args) => spawnSync("git", ["-C", root, ...args], { encoding: "utf8" });
  const lastCommit = (p, content) => {
    const tracked = git("ls-files", "-s", "--", p);
    if (tracked.status !== 0 || !tracked.stdout) return null;
    if (tracked.stdout.split(/\s+/)[1] !== blobSha(content) || git("diff", "--quiet", "HEAD", "--", p).status !== 0) return null;
    return git("log", "-1", "--format=%H", "--", p).stdout.trim() || null;
  };

  const c = {
    id, kind: "filesystem", writes, root,
    async list(prefix = "") {
      const pre = prefix ? safePath(prefix) : "";
      return listed().filter((p) => !pre || p === pre || p.startsWith(`${pre}/`)).sort()
        .map((path) => ({ path, version: blobSha(readFileSync(file(path))) }));
    },
    async read(p) {
      const f = file(p);
      if (!existsSync(f) || !statSync(f).isFile()) return null;
      const content = readFileSync(f, "utf8");
      const commit = lastCommit(safePath(p), content);
      return { path: safePath(p), content, version: blobSha(readFileSync(f)), ...(commit ? { commit } : {}) };
    },
    async version(p) {
      const f = file(p);
      return existsSync(f) && statSync(f).isFile() ? blobSha(readFileSync(f)) : null;
    },
    async search(query, { limit = 50 } = {}) {
      const out = [];
      for (const path of listed().sort()) {
        if (out.length >= limit) break;
        const content = readFileSync(file(path), "utf8");
        if (isText(path, content) && matches(`${path}\n${content}`, query)) out.push({ path, version: blobSha(content) });
      }
      return out;
    },
    /** @param {string} p @param {string | Buffer} content @param {{ base?: string | null, append?: boolean, message?: string, title?: string }} [opts] */
    async write(p, content, opts = {}) {
      if (writes === "none") throw new Error(`${id} is read-only`);
      const f = file(p);
      const path = safePath(p);
      mkdirSync(dirname(f), { recursive: true });
      const replace = () => {
        const tmp = `${f}.tmp-${process.pid}`;
        writeFileSync(tmp, content);
        renameSync(tmp, f);
        return { path, version: blobSha(content) };
      };
      if (opts.base === undefined && !opts.append) return replace();
      return withLock(f, () => {
        const here = existsSync(f) && statSync(f).isFile();
        const stored = here ? readFileSync(f) : null;
        checkWrite(path, stored ? blobSha(stored) : null, stored ? stored.toString("utf8") : null, content, opts);
        if (!opts.append) return replace();
        appendFileSync(f, content);
        return { path, version: blobSha(readFileSync(f)) };
      });
    },
  };
  return c;
}
