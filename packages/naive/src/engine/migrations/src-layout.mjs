// Moves a venture onto the src layout (EE-118 step 8): each package folder a function owns goes to
// src/<function>/<package>/, and everything else stays at the top beside src/ and public/. Only the files
// move: every record keeps its logical path (foundation/problem.json stays foundation/problem.json to the
// router, the provenance log and every citation), because packages/naive/src/core/venture-paths.mjs
// resolves it into src/<function>/ once venture.json says the layout is src. So the old routes and paths
// keep working with no alias table: a route names a logical path, never a folder on disk.
//
// It works from either earlier layout. A flat venture's package folders move into src/. A structured
// venture's k-base/ and meta/ empty out: each file goes from where the structured layout put it to where
// the src layout puts it (provenance.jsonl back to the top, foundation/ into src/strategy/), and profile.md
// keeps its README.md. Files git tracks move with git mv. A venture already on the src layout is left alone.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { FUNCTIONS, PACKAGE_FUNCTION, SRC, layoutOf, logical, logicalFiles, physical, srcPath } from "../../core/venture-paths.mjs";

export const id = "src-layout";
export const describe = "Moves a venture onto the src layout: each package folder into src/<function>/, everything else at the top beside src/ and public/ (EE-118 step 8)";

/** Remove the folders a move emptied, deepest first, never the venture folder itself. */
function prune(dir, sub) {
  const d = join(dir, sub);
  if (!existsSync(d) || !statSync(d).isDirectory()) return;
  for (const e of readdirSync(d)) prune(dir, join(sub, e));
  if (!readdirSync(d).length) rmdirSync(d);
}

export function apply(dir, ctx) {
  if (layoutOf(dir) === "src") return;
  const from = layoutOf(dir);
  const tracked = (p) => spawnSync("git", ["ls-files", "--error-unmatch", p], { cwd: dir, stdio: "pipe" }).status === 0;
  // Where each file is now, by its logical path, read before venture.json changes the layout.
  const files = logicalFiles(dir).filter((l) => l !== "venture.json" && !l.startsWith(".naive/") && !l.startsWith(".git/"));
  const before = new Map(files.map((l) => [l, physical(dir, l)]));
  // A nested venture (a folder with its own venture.json, such as portfolio/kilnworks) moves whole, by its logical path.
  const nested = [];
  const walk = (sub) => {
    for (const e of readdirSync(join(dir, sub), { withFileTypes: true })) {
      if (!e.isDirectory() || e.name === ".git" || e.name === "node_modules" || e.name === ".naive") continue;
      const rel = sub ? `${sub}/${e.name}` : e.name;
      if (existsSync(join(dir, rel, "venture.json"))) nested.push(rel); else walk(rel);
    }
  };
  walk("");
  const moves = [];
  for (const was of nested) {
    const to = srcPath(logical(dir, was));
    if (to !== was) { if (existsSync(join(dir, to))) ctx.escalate(`${to} already exists, so ${was} stayed where it is; move it yourself`); else moves.push([was, to]); }
  }
  for (const [l, was] of before) {
    const to = srcPath(l);
    if (to === was) continue;
    if (l === "profile.md" && was === "README.md") continue; // a structured venture's profile stays README.md, as venture.json says
    if (existsSync(join(dir, to))) { ctx.escalate(`${to} already exists, so ${was} stayed where it is; move it yourself`); continue; }
    moves.push([was, to]);
  }
  if (!ctx.dry) {
    for (const [was, to] of moves) {
      mkdirSync(dirname(join(dir, to)), { recursive: true });
      if (!(tracked(was) && spawnSync("git", ["mv", was, to], { cwd: dir, stdio: "pipe" }).status === 0)) renameSync(join(dir, was), join(dir, to));
    }
    for (const top of [...new Set(moves.map(([was]) => was.split("/")[0]))]) prune(dir, top);
    // A package folder with no files yet moves too, so the founder finds it where the src layout puts it.
    for (const pkg of Object.keys(PACKAGE_FUNCTION)) {
      if (!existsSync(join(dir, pkg)) || !statSync(join(dir, pkg)).isDirectory()) continue;
      prune(dir, pkg);
      if (!existsSync(join(dir, pkg))) mkdirSync(join(dir, srcPath(pkg)), { recursive: true });
    }
    for (const f of FUNCTIONS) mkdirSync(join(dir, SRC, f), { recursive: true });
    mkdirSync(join(dir, "public"), { recursive: true });
    const vfile = join(dir, "venture.json");
    const v = JSON.parse(readFileSync(vfile, "utf8"));
    v.layout = "src";
    // A structured venture keeps its org chart in venture.json functions (EE-086), so the src layout reads it there too.
    if (from === "structured" && v.functions === undefined) v.functions = {};
    writeFileSync(vfile, JSON.stringify(v, null, 2) + "\n");
  }
  const folders = [...new Set(moves.map(([, to]) => `${to.startsWith(`${SRC}/`) ? to.split("/").slice(0, 3).join("/") : to.split("/")[0]}/`))].sort();
  ctx.note(`moved ${moves.length} entries from the ${from} layout into ${folders.join(", ") || "nothing"}`);
  ctx.note("venture.json: layout src");
}
