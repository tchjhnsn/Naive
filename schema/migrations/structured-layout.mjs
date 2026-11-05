// Moves a flat venture onto the structured layout (EE-086). Ported from PR #41 and brought up to the
// k-base/ rename. Only the files move: every record keeps its logical path (foundation/problem.json stays
// foundation/problem.json to the router, the provenance log and every citation), because
// packages/core/venture-paths.mjs resolves it into k-base/ or meta/ once venture.json says the layout is structured.
//
//   k-base/    every package folder and record file at the top; the old knowledge/ layer folder
//              becomes k-base/knowledge/, so its logical paths are unchanged
//   meta/      provenance.jsonl, naive.config.json, operating-rules.json and knowledge/sources.json, and .release/ as meta/releases/
//   README.md  profile.md, when there is no README.md yet
//
// venture.json gains layout: structured. Its functions are left as they are; hats leave people/. Files git tracks move with
// git mv. A structured venture is left alone.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { CODEBASE, KBASE, TOP as TOP_FILES, layoutOf } from "../../packages/core/venture-paths.mjs";

export const id = "structured-layout";
export const describe = "Moves a flat venture onto the structured layout: the knowledge base into k-base/, provenance, config, sources and releases into meta/, and profile.md to README.md (EE-086)";

const TOP = new Set([...TOP_FILES, ".git", ".naive", "node_modules", KBASE, "meta", CODEBASE, "repo"]);

export function apply(dir, ctx) {
  if (layoutOf(dir) === "structured") return;
  const tracked = (p) => spawnSync("git", ["ls-files", "--error-unmatch", p], { cwd: dir, stdio: "pipe" }).status === 0;
  const movedPaths = [], gone = new Set();
  const move = (from, to) => {
    if (!existsSync(join(dir, from))) return;
    if (existsSync(join(dir, to))) { ctx.escalate(`${to} already exists, so ${from} stayed where it is; move it yourself`); return; }
    if (!ctx.dry) {
      mkdirSync(dirname(join(dir, to)), { recursive: true });
      if (!(tracked(from) && spawnSync("git", ["mv", from, to], { cwd: dir, stdio: "pipe" }).status === 0)) renameSync(join(dir, from), join(dir, to));
    }
    movedPaths.push(`${from} -> ${to}`);
    gone.add(from);
  };
  // meta/ first, so knowledge/sources.json leaves the old layer folder before that folder moves.
  move("provenance.jsonl", "meta/provenance.jsonl");
  move("naive.config.json", "meta/naive.config.json");
  move("operating-rules.json", "meta/operating-rules.json");
  move("knowledge/sources.json", "meta/sources.json");
  move(".release", "meta/releases");
  if (!existsSync(join(dir, "README.md"))) move("profile.md", "README.md");
  else if (existsSync(join(dir, "profile.md"))) ctx.escalate("README.md already exists, so profile.md moved into k-base/; merge the two yourself");
  // The knowledge base: everything else at the top, the old knowledge/ layer folder included.
  for (const name of readdirSync(dir).sort()) {
    // A --check run moves nothing, so skip what the steps above already said they would move.
    if (TOP.has(name) || gone.has(name)) continue;
    move(name, `${KBASE}/${name}`);
  }
  const vfile = join(dir, "venture.json");
  const v = JSON.parse(readFileSync(vfile, "utf8"));
  v.layout = "structured";
  if (v.profile === "profile.md" && gone.has("profile.md")) v.profile = "README.md";
  if (!ctx.dry) { writeFileSync(vfile, JSON.stringify(v, null, 2) + "\n"); mkdirSync(join(dir, "meta"), { recursive: true }); }
  // Hats are read from venture.json functions in the structured layout (EE-086), so people/ stops storing them.
  if (!ctx.dry) {
    const rosterFile = join(dir, KBASE, "people/people.json");
    if (existsSync(rosterFile)) {
      const roster = JSON.parse(readFileSync(rosterFile, "utf8"));
      if ((roster.people ?? []).some((p) => "hats" in p)) { for (const p of roster.people) delete p.hats; writeFileSync(rosterFile, JSON.stringify(roster, null, 2) + "\n"); }
    }
    const fdir = join(dir, KBASE, "people/founders");
    if (existsSync(fdir)) for (const f of readdirSync(fdir).filter((n) => n.endsWith(".json"))) {
      const rec = JSON.parse(readFileSync(join(fdir, f), "utf8"));
      if ("hats" in rec) { delete rec.hats; writeFileSync(join(fdir, f), JSON.stringify(rec, null, 2) + "\n"); ctx.escalate(`people/founders/${f} stored hats; name each function's owner in venture.json functions instead`); }
    }
  }
  ctx.note(`moved ${movedPaths.length} entries into ${KBASE}/ and meta/: ${movedPaths.join(", ")}`);
  ctx.note("venture.json: layout structured");
}
