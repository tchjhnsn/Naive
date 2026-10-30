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

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { blobSha, isText, matches, safePath } from "./contract.mjs";
import { layoutOf, logicalFiles, ventureFile } from "../../schema/venture-paths.mjs";

const SKIP = new Set(["node_modules"]);

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
  const structured = venture && layoutOf(root) === "structured";
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
    async write(p, content, _opts = {}) {
      if (writes === "none") throw new Error(`${id} is read-only`);
      const f = file(p);
      mkdirSync(dirname(f), { recursive: true });
      const tmp = `${f}.tmp-${process.pid}`;
      writeFileSync(tmp, content);
      renameSync(tmp, f);
      return { path: safePath(p), version: blobSha(content) };
    },
  };
  return c;
}
