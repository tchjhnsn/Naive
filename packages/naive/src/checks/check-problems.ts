// Checks each venture's customer problem tree (EE-219).
//
//   node packages/naive/src/checks/check-problems.ts <workspace or venture dir> [--json]
//
// The tree is foundation/problem.json (or purpose/validation/problem.json): its statement is the root problem and
// its forms are the problems below it, held together by parent (a narrower case, Torres's opportunity solution tree)
// and cause_of (a problem behind it, the Logical Framework Approach's problem tree).
// packages/naive/src/engine/problems.ts reads and ranks it; this check fails on:
//
//   - two forms with one id, a form named root, a parent or a cause no form has, a loop through either, a form that
//     is both a narrower case of another and a cause of it, and a live narrower case under a dropped form;
//   - more than one form with status target, since one problem is the target at a time;
//   - an ICP profile whose core_problem names no form, names a dropped one, or is outside its problem_forms;
//   - a target that is not a problem the primary profile has;
//   - an interview that codes a problem no form has, or ranks two problems first;
//   - a solution that names a problem no form has, or a dropped one;
//   - the fail-closed rule: a solution, offer or public content is already written while the primary profile has no
//     core problem or no form is the target (packages/naive/src/functions/strategy/problem-priority.json
//     requires_target). A venture that has written none of them is told what is missing and passes.
//
// A record with no forms stays valid: it is a one-problem tree, and the check says what naming the core problem and
// the target would unlock. Findings exit 1; a venture whose files cannot be read exits 2. --json prints
// { ok, ventures }. The customer's problems are checked here; the business's own problems are decisions, seams and
// handoffs, and this check never reads them.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { prerequisite, problemInputs, treeFindings } from "../engine/problems.ts";

/** The ventures under a folder: the folder itself when it holds a venture.json. */
export function venturesUnder(dir: string): string[] {
  if (existsSync(ventureFile(dir, "venture.json"))) return [dir];
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.name.startsWith(".") || e.name === "node_modules" ? [] : e.isDirectory() ? venturesUnder(join(dir, e.name)) : []);
}

/** One venture's findings: the tree's, then the fail-closed rule's. */
export const checkProblems = (dir: string) => Effect.map(problemInputs(dir), (i) => {
  const pre = prerequisite(i);
  const errors = [...treeFindings(i)];
  if (!pre.ok) for (const w of pre.written) for (const m of pre.missing)
    errors.push(`${w.file} is written while ${m}${pre.why ? `. ${pre.why}` : ""}`);
  return { venture: i.venture ?? dir, forms: i.nodes.length, target: i.nodes.find((n) => n.status === "target")?.id ?? null, errors, next: [...(pre.ok ? pre.missing : []), ...pre.advice] };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const [dir] = args.filter((a) => !a.startsWith("--"));
  if (!dir || !existsSync(dir)) { console.error("usage: node packages/naive/src/checks/check-problems.ts <workspace or venture dir> [--json]"); process.exit(2); }
  await runMain(Effect.gen(function* () {
    const ventures = [];
    for (const v of venturesUnder(dir)) ventures.push(yield* checkProblems(v).pipe(Effect.mapError((e) => new CannotRun({ message: `${v}: ${describe(e)}`, cause: e }))));
    const failed = ventures.flatMap((v) => v.errors);
    if (json) { console.log(JSON.stringify({ ok: !failed.length, ventures }, null, 2)); process.exitCode = failed.length ? 1 : 0; return; }
    for (const v of ventures) {
      for (const e of v.errors) console.error(`FAIL  ${v.venture}: ${e}`);
      for (const n of v.next) console.log(`next  ${v.venture}: ${n}`);
    }
    if (failed.length) { process.exitCode = 1; return; }
    console.log(`ok  ${ventures.length} venture(s); ${ventures.filter((v) => v.target).length} with a target problem.`);
  }));
}
