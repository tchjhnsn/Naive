// Business time comes from one clock (EE-224, packages/naive/src/core/clock.ts). Code reads `now()`, `nowMs()` or
// `nowIso()` for when something happened or is due, and `wallClock()` only for elapsed time, timeouts, lock
// staleness and unique names. This check fails on a module under packages/naive/src that reads the system clock
// any other way (`new Date()` with no arguments, or `Date.now()`), because a simulation that sets NAIVE_NOW would
// see that module run on the wall clock and write wrong times into its records.
//
//   node packages/naive/src/checks/check-clock.ts [--json]     exit 1 on a finding
//
// Tests and fixtures are not checked: a test may read the system clock to compare with. Comment lines are skipped.

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export type Finding = { readonly file: string; readonly line: number; readonly text: string };

/** Files that read the system clock on purpose, each with its reason. */
export const ALLOW: Readonly<Record<string, string>> = {
  "packages/naive/src/core/clock.ts": "the one clock: wallClock() is the only place Naive reads the system clock",
  "packages/naive/src/engine/recipes/sandbox.ts": "the recipe sandbox names Date() and Date.now() in the code it injects to make them throw",
  "packages/naive/src/interfaces/demo/board.ts": "browser code inside a page template: the time shown is the viewer's own",
};

const CODE = /\.(mjs|ts)$/;
const TEST = /(-test\.|\/tests\/|\/fixtures\/|\.steps\.)/;
const COMMENT = /^\s*(\/\/|\/\*|\*)/;
const READ = /new Date\(\s*\)|\bDate\.now\(\s*\)/;

/** The findings in one file's text. */
export function findings(file: string, text: string): Finding[] {
  if (ALLOW[file] || TEST.test(file) || !CODE.test(file)) return [];
  const out: Finding[] = [];
  text.split("\n").forEach((line, i) => { if (!COMMENT.test(line) && READ.test(line)) out.push({ file, line: i + 1, text: line.trim().slice(0, 160) }); });
  return out;
}

/** Checks every tracked module under packages/naive/src in the repository at root. */
export function check(root: string): Finding[] {
  const listed = spawnSync("git", ["ls-files", "packages/naive/src"], { cwd: root, encoding: "utf8" });
  if (listed.status !== 0) throw new Error(`git ls-files failed: ${listed.stderr}`);
  return listed.stdout.split("\n").filter(Boolean).flatMap((f) => findings(f, readFileSync(join(root, f), "utf8")));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = join(fileURLToPath(new URL(".", import.meta.url)), "../../../..");
  let found: Finding[];
  try { found = check(root); } catch (e) { console.error(String(e)); process.exit(2); }
  if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: found.length === 0, findings: found }, null, 2));
  else if (found.length === 0) console.log("pass  every module reads business time from the one clock (core/clock.ts)");
  else for (const f of found) console.log(`FAIL  ${f.file}:${f.line}  reads the system clock; use now(), nowMs() or nowIso() for business time, wallClock() for elapsed time: ${f.text}`);
  process.exit(found.length === 0 ? 0 : 1);
}
