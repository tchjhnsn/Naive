// Where a venture's files physically are (EE-086). Code names a file by its logical path, the path a
// record has always had (foundation/problem.json, provenance.jsonl, knowledge/sources.json), and `at`
// says where it sits on disk under the venture's layout:
//
//   flat (no layout in venture.json, every venture made before EE-086): the logical path, unchanged
//   structured (venture.json layout: "structured"):
//     venture.json, AGENTS.md, README.md, package.json   at the top (profile.md is README.md)
//     provenance.jsonl, sources.json, naive.config.json   in meta/; .release/ is meta/releases/
//     every package (foundation/, people/, _drafts/ ...)  in knowledge/, or in knowledge/(group)/ when the
//                                                         founder mirrors a function as a folder
//
// `logical` goes the other way, for code that walks the disk and matches files against the data model.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const TOP = new Set(["venture.json", "AGENTS.md", "README.md", "package.json", "package-lock.json", ".gitignore"]);
const META = { "provenance.jsonl": "meta/provenance.jsonl", "knowledge/sources.json": "meta/sources.json", "sources.json": "meta/sources.json", "naive.config.json": "meta/naive.config.json" };
const cache = new Map();

/** The venture's layout: "structured" (EE-086) or "flat". Read once per venture.json change. */
export function layoutOf(dir) {
  const f = join(dir, "venture.json");
  let m = 0;
  try { m = statSync(f).mtimeMs; } catch { return "flat"; }
  const hit = cache.get(dir);
  if (hit && hit.m === m) return hit.layout;
  let layout = "flat";
  try { layout = JSON.parse(readFileSync(f, "utf8")).layout === "structured" ? "structured" : "flat"; } catch {}
  cache.set(dir, { m, layout });
  return layout;
}

// The (group)/ folder a package sits in, when the founder mirrors functions on disk.
function groupOf(dir, pkg) {
  const kb = join(dir, "knowledge");
  if (!pkg || existsSync(join(kb, pkg)) || !existsSync(kb)) return null;
  for (const g of readdirSync(kb)) if (/^\(.+\)$/.test(g) && existsSync(join(kb, g, pkg))) return g;
  return null;
}

/** The venture-relative physical path of a logical path. */
export function physical(dir, rel) {
  const r = String(rel).split(sep).join("/").replace(/^\.\//, "");
  if (layoutOf(dir) !== "structured") return r;
  if (TOP.has(r)) return r;
  if (r === "profile.md") return "README.md";
  if (META[r]) return META[r];
  if (r === ".release" || r.startsWith(".release/")) return "meta/releases" + r.slice(".release".length);
  if (r.startsWith(".naive/") || r === ".naive" || r.startsWith("node_modules") || r.startsWith(".git")) return r;
  if (r.startsWith("knowledge/") || r.startsWith("meta/") || r.startsWith("repo/")) return r;
  const pkg = r.split("/")[0];
  const g = groupOf(dir, pkg);
  return `knowledge/${g ? `${g}/` : ""}${r}`;
}

/** The absolute path of a logical path in a venture. */
export const ventureFile = (dir, rel) => join(dir, physical(dir, rel));

/** The logical path of a venture-relative physical path: the inverse of `physical`. */
export function logical(dir, rel) {
  const r = String(rel).split(sep).join("/");
  if (layoutOf(dir) !== "structured") return r;
  if (r === "README.md") return "profile.md";
  for (const [l, p] of Object.entries(META)) if (r === p) return l === "sources.json" ? "knowledge/sources.json" : l;
  if (r === "meta/releases" || r.startsWith("meta/releases/")) return ".release" + r.slice("meta/releases".length);
  if (r.startsWith("knowledge/")) return r.slice("knowledge/".length).replace(/^\([^/]+\)\//, "");
  return r;
}

/** Every file of a venture by its logical path, skipping what is never a record. */
export function logicalFiles(dir) {
  const out = [];
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const e of readdirSync(d, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".git") continue;
      const p = join(d, e.name);
      if (e.isDirectory()) { if (!existsSync(join(p, "venture.json"))) walk(p); }
      else out.push(logical(dir, relative(dir, p)));
    }
  };
  walk(dir);
  return out;
}
