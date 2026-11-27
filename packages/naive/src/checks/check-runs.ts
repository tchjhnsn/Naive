#!/usr/bin/env node
// Checks that a venture's workflow runs prove what they claim (EE-227, packages/naive/src/engine/run-proof.ts). For
// each workflow the venture's run log names, the latest finished run must verify: every step proven by provenance
// lines it wrote under its own session, in its window, through the router, with its bytes in the blob store, or
// considered or reasoned where the step allows it. An older run that does not verify is reported and does not fail,
// because a later run has replaced it. A venture with no run log passes.
//
//   node packages/naive/src/checks/check-runs.ts <venture dir> [--json]
//
// Exit 0 when every latest run verifies, 1 when one does not, 2 when the logs cannot be read.

import { Effect } from "effect";
import { runMain } from "../core/effect/run.ts";
import { runText, verifyRuns, type RunCheck } from "../engine/run-proof.ts";

/** The latest finished run of each workflow, and the older ones. Pure. */
export function latestRuns(all: readonly RunCheck[]): { latest: RunCheck[]; older: RunCheck[] } {
  const done = all.filter((r) => r.verdict !== "not-finished");
  const last = new Map<string, RunCheck>();
  for (const r of done) last.set(r.workflow, r);
  const latest = [...last.values()];
  return { latest, older: done.filter((r) => !latest.includes(r)) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) { console.error("usage: node packages/naive/src/checks/check-runs.ts <venture dir> [--json]"); process.exit(2); }
  await runMain(Effect.map(verifyRuns(dir), (all) => {
    const { latest, older } = latestRuns(all);
    const failing = latest.filter((r) => r.verdict !== "verified");
    if (args.includes("--json")) console.log(JSON.stringify({ ok: !failing.length, latest, older: older.map((r) => ({ run: r.run, workflow: r.workflow, verdict: r.verdict })) }, null, 2));
    else {
      for (const r of failing) console.log(runText(r));
      const stale = older.filter((r) => r.verdict !== "verified").length;
      console.log(failing.length
        ? `${failing.length} of ${latest.length} workflows' latest runs do not prove what they claim`
        : `${latest.length} workflows' latest runs prove what they claim${stale ? ` (${stale} older runs do not, and later runs replaced them)` : ""}`);
    }
    if (failing.length) process.exitCode = 1;
  }));
}
