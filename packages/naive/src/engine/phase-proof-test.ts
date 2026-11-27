// Tests the proof a phase needs before a venture leaves it (EE-227): a gate record is proven only when its bytes are the
// ones the provenance log last recorded, a record written or changed outside the router does not count, the phase's
// latest runs must verify, and an intake needs a verified run or a meeting closed with its goal reached. Runs on a
// copy of the Tandem example venture, which is in Validation.
//
//   node packages/naive/src/engine/phase-proof-test.ts

import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Entry } from "../core/provenance.ts";
import { meet } from "./lifecycle.ts";
import { judgePhase, phaseProofSync, proofOfFile } from "./phase-proof.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 900)}`}`); if (!ok) failed++; };

// ---- Pure.
const line = (over: Partial<Entry>): Entry => ({ at: "2026-11-27T10:00:00.000Z", entity: "a.json", activity: "write", agent: { kind: "person", via: "cli", id: "maya" }, sha256: "s1", prev: "genesis", hash: "h", ...over } as Entry);
expect("a file whose bytes match its last recorded write is proven", proofOfFile("t", "a.json", "s1", [line({})]).state === "proven");
expect("a file a person adopted with these bytes is adopted", proofOfFile("t", "a.json", "s1", [line({ activity: "baseline" })]).state === "adopted");
expect("a file with no line was written outside the router", proofOfFile("t", "a.json", "s1", []).state === "unrecorded");
expect("a file changed since its last recorded write does not count", proofOfFile("t", "a.json", "s2", [line({})]).state === "changed");
expect("a held draft does not settle a file's bytes", proofOfFile("t", "a.json", "s1", [line({ activity: "draft" })]).state === "unrecorded");
expect("the last settling line decides", proofOfFile("t", "a.json", "s2", [line({}), line({ sha256: "s2", hash: "h2" })]).state === "proven");
const judged = judgePhase("validation", [[proofOfFile("t", "a.json", "s2", [line({})]), proofOfFile("t", "b.json", "s1", [line({ entity: "b.json" })])]], [{ workflow: "f/intake", intake: true, run: null, verdict: "none", meeting: false, ok: false, why: "no meeting" }]);
expect("a record type is proven when one of its files is, and a failing intake blocks", judged.records[0].file === "b.json" && !judged.proven && judged.blocking.length === 1 && /f\/intake/.test(judged.blocking[0]), judged);

// ---- On Tandem.
const tmp = mkdtempSync(join(tmpdir(), "phase-proof-"));
const dir = join(tmp, "tandem");
cpSync(join(repo, "packages/naive/src/records/examples/workspace/ventures/tandem"), dir, { recursive: true });
try {
  let p = phaseProofSync(dir);
  // The shipped example's telos was edited after its baseline, which this catches; a person meeting a criterion
  // through the lifecycle writes it through provenance again.
  expect("a telos changed after its recorded baseline does not count", p.records.find((r) => r.type === "exit-criteria")?.state === "changed", p.records);
  meet(dir, "retention", { evidence: "cohort", by: { kind: "person", via: "cli", id: "maya" } });
  p = phaseProofSync(dir);
  expect("Tandem's adopted validation records and its telos, confirmed by a person, count", p.records.every((r) => r.state === "adopted" || r.state === "proven"), p.records);
  expect("the finance intake, which Tandem lists, holds the phase until it is walked", !p.proven && p.blocking.some((b) => /^finance\/intake: the intake has no verified run and no meeting/.test(b)), p.blocking);
  mkdirSync(join(dir, "operations/meetings"), { recursive: true });
  writeFileSync(join(dir, "operations/meetings/finance-intake.json"), JSON.stringify({ id: "finance-intake", title: "Finance intake", goal: "g", outcome_expected: ["x"], workflow: "finance/intake", called_by: "maya", attendees: [{ id: "maya", kind: "person" }], status: "closed", agenda: [{ id: "a", title: "a", status: "done" }], outcome: { reached: "yes", summary: "done" } }));
  p = phaseProofSync(dir);
  expect("a meeting closed with its goal reached settles the intake, and the phase is proven", p.proven, p.blocking);

  const pricing = join(dir, "purpose/validation/pricing.json");
  writeFileSync(pricing, readFileSync(pricing, "utf8").replace(/\}\s*$/, ', "note": "edited by hand"}\n'));
  p = phaseProofSync(dir);
  expect("a gate record edited by hand after it was recorded holds the phase", !p.proven && p.blocking.some((b) => /^validation-pricing: .*changed outside the router/.test(b)), p.blocking);
  cpSync(join(repo, "packages/naive/src/records/examples/workspace/ventures/tandem/purpose/validation/pricing.json"), pricing);

  // A run of a phase workflow whose claim the log does not bear out holds the phase.
  const flow = JSON.parse(readFileSync(join(repo, "packages/naive/src/functions/finance/workflows/intake.json"), "utf8")) as { steps: { id: string }[] };
  mkdirSync(join(dir, ".naive"), { recursive: true });
  appendFileSync(join(dir, ".naive/workflow-runs.jsonl"), JSON.stringify({ workflow: "finance/intake", at: "2026-11-27T10:00:00.000Z", outcome: "done", by: "finance-agent", run: "r9", started: "2026-11-27T09:00:00.000Z", results: flow.steps.map((s) => ({ step: s.id, status: "done", evidence: [] })) }) + "\n");
  p = phaseProofSync(dir);
  expect("a finished intake run that proves nothing holds the phase even with the meeting", !p.proven && p.blocking.some((b) => /^finance\/intake: its latest run \(r9\) does not verify/.test(b)), p.blocking);
  const cli = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/phase-proof.ts"), dir], { encoding: "utf8" });
  expect("the CLI says NOT PROVEN and exits 1", cli.status === 1 && /NOT PROVEN/.test(cli.stdout), cli.stdout + cli.stderr);
  const check = spawnSync(process.execPath, [join(repo, "packages/naive/src/checks/check-runs.ts"), dir], { encoding: "utf8" });
  expect("check-runs fails on the latest run that does not verify", check.status === 1 && /do not prove what they claim/.test(check.stdout), check.stdout + check.stderr);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("phase-proof: all passed");
