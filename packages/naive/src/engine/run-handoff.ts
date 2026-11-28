// Runs a handoff's done-criteria and writes the result as evidence (EE-017).
//
//   node packages/naive/src/engine/run-handoff.ts <venture dir> <handoff id> [--runner <session or job id>]
//
// Each conformance and self-proof criterion's `check` is run as a shell command from the
// repository root; exit code 0 passes. A review criterion is recorded only when its reviewer
// gives a verdict: --review <criterion>=pass|fail --by <role> --note "<what was judged>". The
// result goes to <venture>/evidence/results/<handoff>-<timestamp>.json and is appended to
// the handoff's `evidence`; nothing else in the handoff changes, so its status stays the
// holder's call (and check-execution.ts holds them to it).
//
// A criterion with `runs: "effect"` names a venture program (a path in the venture) as its `check`, and it runs on the
// venture runtime (venture-program.ts, EE-161): it passes when the program succeeds and returns neither false nor
// { passed: false }.
//
// Hosted (NAIVE_RUNTIME=hosted, packages/naive/src/core/runtime.ts), Naive never runs a tenant's shell on the
// host: each bash check goes to the host's sandbox hook, and with none registered the run is refused. An effect
// criterion needs no sandbox: it runs on the venture runtime with the host's services.

import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { HostedRefusal, git, hostHook, isHosted, missingHook } from "../core/runtime.ts";
import type { Evidence, Handoff } from "../records/types/records.d.ts";
import { outputOf, passes, runProgram } from "./venture-program.ts";
import { agentFromEnv } from "../core/provenance.ts";
import { writeRecord } from "../store/record-write.ts";

const root = new URL("../../../..", import.meta.url).pathname;
const trim = (s: string) => s.trim().split("\n").slice(-12).join("\n");

// The Naive the criteria ran against: its commit, marked when uncommitted. Hosted without a git working copy,
// the package version.
export function naiveVersion() {
  if (!isHosted()) {
    const dirty = execSync("git status --porcelain", { cwd: root, encoding: "utf8" }).trim() ? "+uncommitted" : "";
    return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim() + dirty;
  }
  const feature = "recording the Naive commit a handoff ran against";
  const head = git(feature, ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" });
  if (head.status !== 0) return `naive-framework@${JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version}`;
  return String(head.stdout).trim() + (String(git(feature, ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout).trim() ? "+uncommitted" : "");
}

/** One done-criterion of a handoff. */
export type Criterion = Handoff["done_criteria"][number];
/** One criterion's result, as the evidence keeps it. */
export type CriterionResult = Evidence["results"][number];

/** Whether a criterion runs as a shell command: not a review, and not a venture program. */
export const isBash = (c: Criterion) => c.kind !== "review" && c.runs !== "effect";

/**
 * Runs one conformance or self-proof criterion: a venture program on the venture runtime when it runs effect, else its
 * shell command through the sandbox hook, or bash from the repository root on a laptop, with NAIVE_VENTURE set to the
 * business folder.
 */
export async function runCriterion(dir: string, c: Criterion, sandbox = hostHook("sandbox")): Promise<CriterionResult> {
  if (c.runs === "effect") {
    const result = await runProgram(dir, c.check);
    return { criterion: c.id, kind: c.kind, passed: passes(result), command: c.check, output: trim(outputOf(result)) };
  }
  // A criterion checks the business, not Naive: NAIVE_VENTURE names the business folder, as in
  // `node packages/naive/src/checks/check-records.ts "$NAIVE_VENTURE"`.
  const env = { NAIVE_VENTURE: resolve(dir) };
  const run = sandbox ? await sandbox(c.check, { cwd: root, env }) : spawnSync("/bin/bash", ["-c", c.check], { cwd: root, encoding: "utf8", env: { ...process.env, ...env } });
  return { criterion: c.id, kind: c.kind, passed: run.status === 0, command: c.check, output: trim(`${run.stdout}${run.stderr}`) };
}

/** The evidence for a run of a handoff's criteria at a time (ISO, seconds), and its id. */
export function evidenceOf(h: Handoff, results: CriterionResult[], { at, runner, version }: { at: string, runner: string, version: string }): Evidence {
  const id = `${h.id}-${at.replace(/[-:TZ]/g, "").slice(0, 14)}`;
  return { id, subject: { kind: "handoff", id: h.id, version }, ran_at: at, runner, results, passed: results.every((r) => r.passed) };
}

/** Reads a handoff by id. */
export const readHandoff = (dir: string, id: string): Handoff => JSON.parse(readFileSync(join(ventureFile(dir, "operations/handoffs"), `${id}.json`), "utf8"));

/**
 * Runs one handoff's done-criteria and writes the evidence. Throws a HostedRefusal when hosted with bash
 * criteria and no sandbox hook (effect criteria need none), and an Error when a review verdict lacks its reviewer or note.
 */
export async function runHandoff(dir: string, id: string, { runner = "local", review, by, note, log = console.log }: { runner?: string, review?: string, by?: string, note?: string, log?: (_line: string) => void } = {}) {
  const [reviewId, verdict] = (review ?? "").split("=");
  const hPath = join(ventureFile(dir, "operations/handoffs"), `${id}.json`);
  const h: Handoff = JSON.parse(readFileSync(hPath, "utf8"));
  const sandbox = hostHook("sandbox");
  if (isHosted() && !sandbox && h.done_criteria.some(isBash)) {
    throw missingHook("running a handoff's bash done-criteria", "sandbox", "Naive never runs a tenant's shell on the host");
  }
  const version = naiveVersion();

  const results: Evidence["results"] = [];
  for (const c of h.done_criteria.filter((d) => d.kind === "review" && d.id === reviewId)) {
    if (!["pass", "fail"].includes(verdict) || !by || !note) throw new Error("a review needs --review <id>=pass|fail, --by <role> and --note");
    results.push({ criterion: c.id, kind: "review", passed: verdict === "pass", by, command: c.check, output: note });
    log(`${verdict === "pass" ? "pass" : "FAIL"} ${c.id} (review by ${by})`);
  }
  for (const c of h.done_criteria.filter((d) => d.kind !== "review")) {
    const r = await runCriterion(dir, c, sandbox);
    results.push(r);
    log(`${r.passed ? "pass" : "FAIL"} ${c.id}`);
  }

  const at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const ev = evidenceOf(h, results, { at, runner, version });
  const eid = ev.id;
  // The runner wrote the evidence: a program, named by its runner id, so the line says agent and never a person.
  const agent = agentFromEnv("agent", "cli", { id: runner });
  const ePath = join(ventureFile(dir, "evidence/results"), `${eid}.json`);
  writeRecord(dir, `evidence/results/${eid}.json`, ev, { agent, activity: "create", derived_from: [`operations/handoffs/${id}.json`], note: `ran the done-criteria of handoff ${h.id}` });
  h.evidence = [...(h.evidence ?? []), relative(join(ventureFile(dir, "operations/handoffs")), ePath)];
  writeRecord(dir, `operations/handoffs/${id}.json`, h, { agent, note: `named evidence ${eid} on handoff ${h.id}` });
  const pending = h.done_criteria.filter((d) => d.kind === "review" && d.id !== reviewId).map((d) => `${d.id} (${d.reviewer})`);
  return { evidence: ev, path: ePath, pending };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, id] = process.argv.slice(2);
  if (!dir || !id) { console.error("usage: node packages/naive/src/engine/run-handoff.ts <venture dir> <handoff id> [--runner <id>]"); process.exit(2); }
  const opt = (k: string) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined;
  try {
    const { evidence: ev, path: ePath, pending } = await runHandoff(dir, id, { runner: opt("--runner"), review: opt("--review"), by: opt("--by"), note: opt("--note") });
    console.log(`${ev.passed ? "every criterion run passed" : "some criteria failed"}${pending.length ? `; review still owed: ${pending.join(", ")}` : ""}: ${relative(process.cwd(), ePath)}`);
    process.exit(ev.passed ? 0 : 1);
  } catch (e) {
    if (!(e instanceof HostedRefusal) && !String((e as Error | undefined)?.message).startsWith("a review needs")) throw e;
    console.error((e as Error).message);
    process.exit(2);
  }
}
