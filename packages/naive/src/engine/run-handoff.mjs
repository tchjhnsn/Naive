// Runs a handoff's done-criteria and writes the result as evidence (EE-017).
//
//   node packages/naive/src/engine/run-handoff.mjs <venture dir> <handoff id> [--runner <session or job id>]
//
// Each conformance and self-proof criterion's `check` is run as a shell command from the
// repository root; exit code 0 passes. A review criterion is recorded only when its reviewer
// gives a verdict: --review <criterion>=pass|fail --by <role> --note "<what was judged>". The
// result goes to <venture>/evidence/results/<handoff>-<timestamp>.json and is appended to
// the handoff's `evidence`; nothing else in the handoff changes, so its status stays the
// holder's call (and check-execution.mjs holds them to it).
//
// Hosted (NAIVE_RUNTIME=hosted, packages/naive/src/core/runtime.mjs), Naive never runs a tenant's shell on the
// host: each check goes to the host's sandbox hook, and with none registered the run is refused.

import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";
import { HostedRefusal, git, hostHook, isHosted, missingHook } from "../core/runtime.mjs";

const root = new URL("../../../..", import.meta.url).pathname;
const trim = (s) => s.trim().split("\n").slice(-12).join("\n");

// The Naive the criteria ran against: its commit, marked when uncommitted. Hosted without a git working copy,
// the package version.
function naiveVersion() {
  if (!isHosted()) {
    const dirty = execSync("git status --porcelain", { cwd: root, encoding: "utf8" }).trim() ? "+uncommitted" : "";
    return execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim() + dirty;
  }
  const feature = "recording the Naive commit a handoff ran against";
  const head = git(feature, ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" });
  if (head.status !== 0) return `naive-framework@${JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version}`;
  return String(head.stdout).trim() + (String(git(feature, ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout).trim() ? "+uncommitted" : "");
}

/**
 * Runs one handoff's done-criteria and writes the evidence. Throws a HostedRefusal when hosted with bash
 * criteria and no sandbox hook, and an Error when a review verdict lacks its reviewer or note.
 * @param {string} dir @param {string} id
 * @param {{ runner?: string, review?: string, by?: string, note?: string, log?: (line: string) => void }} [opts]
 */
export async function runHandoff(dir, id, { runner = "local", review, by, note, log = console.log } = {}) {
  const [reviewId, verdict] = (review ?? "").split("=");
  const hPath = join(ventureFile(dir, "operations/handoffs"), `${id}.json`);
  const h = JSON.parse(readFileSync(hPath, "utf8"));
  const sandbox = hostHook("sandbox");
  if (isHosted() && !sandbox && h.done_criteria.some((d) => d.kind !== "review")) {
    throw missingHook("running a handoff's bash done-criteria", "sandbox", "Naive never runs a tenant's shell on the host");
  }
  const version = naiveVersion();

  const results = [];
  for (const c of h.done_criteria.filter((d) => d.kind === "review" && d.id === reviewId)) {
    if (!["pass", "fail"].includes(verdict) || !by || !note) throw new Error("a review needs --review <id>=pass|fail, --by <role> and --note");
    results.push({ criterion: c.id, kind: "review", passed: verdict === "pass", by, command: c.check, output: note });
    log(`${verdict === "pass" ? "pass" : "FAIL"} ${c.id} (review by ${by})`);
  }
  for (const c of h.done_criteria.filter((d) => d.kind !== "review")) {
    const run = sandbox ? await sandbox(c.check, { cwd: root }) : spawnSync("/bin/bash", ["-c", c.check], { cwd: root, encoding: "utf8" });
    const passed = run.status === 0, output = `${run.stdout}${run.stderr}`;
    results.push({ criterion: c.id, kind: c.kind, passed, command: c.check, output: trim(output) });
    log(`${passed ? "pass" : "FAIL"} ${c.id}`);
  }

  const at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const eid = `${h.id}-${at.replace(/[-:TZ]/g, "").slice(0, 14)}`;
  const ev = { id: eid, subject: { kind: "handoff", id: h.id, version }, ran_at: at, runner, results, passed: results.every((r) => r.passed) };
  mkdirSync(join(ventureFile(dir, "evidence/results")), { recursive: true });
  const ePath = join(ventureFile(dir, "evidence/results"), `${eid}.json`);
  writeFileSync(ePath, JSON.stringify(ev, null, 2) + "\n");
  h.evidence = [...(h.evidence ?? []), relative(join(ventureFile(dir, "operations/handoffs")), ePath)];
  writeFileSync(hPath, JSON.stringify(h, null, 2) + "\n");
  const pending = h.done_criteria.filter((d) => d.kind === "review" && d.id !== reviewId).map((d) => `${d.id} (${d.reviewer})`);
  return { evidence: ev, path: ePath, pending };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, id] = process.argv.slice(2);
  if (!dir || !id) { console.error("usage: node packages/naive/src/engine/run-handoff.mjs <venture dir> <handoff id> [--runner <id>]"); process.exit(2); }
  const opt = (k) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined;
  try {
    const { evidence: ev, path: ePath, pending } = await runHandoff(dir, id, { runner: opt("--runner"), review: opt("--review"), by: opt("--by"), note: opt("--note") });
    console.log(`${ev.passed ? "every criterion run passed" : "some criteria failed"}${pending.length ? `; review still owed: ${pending.join(", ")}` : ""}: ${relative(process.cwd(), ePath)}`);
    process.exit(ev.passed ? 0 : 1);
  } catch (e) {
    if (!(e instanceof HostedRefusal) && !String(e?.message).startsWith("a review needs")) throw e;
    console.error(e.message);
    process.exit(2);
  }
}
