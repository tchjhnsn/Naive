// Runs a handoff's done-criteria and writes the result as evidence (EE-017).
//
//   node schema/run-handoff.mjs <venture dir> <handoff id> [--runner <session or job id>]
//
// Each conformance and self-proof criterion's `check` is run as a shell command from the
// repository root; exit code 0 passes. A review criterion is recorded only when its reviewer
// gives a verdict: --review <criterion>=pass|fail --by <role> --note "<what was judged>". The
// result goes to <venture>/evidence/results/<handoff>-<timestamp>.json and is appended to
// the handoff's `evidence`; nothing else in the handoff changes, so its status stays the
// holder's call (and check-execution.mjs holds them to it).

import { execSync, spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const [dir, id] = process.argv.slice(2);
if (!dir || !id) { console.error("usage: node schema/run-handoff.mjs <venture dir> <handoff id> [--runner <id>]"); process.exit(2); }
const opt = (k) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined;
const runner = opt("--runner") ?? "local";
const [reviewId, verdict] = (opt("--review") ?? "").split("=");
const root = new URL("..", import.meta.url).pathname;
const hPath = join(dir, "operations/handoffs", `${id}.json`);
const h = JSON.parse(readFileSync(hPath, "utf8"));
const dirty = execSync("git status --porcelain", { cwd: root, encoding: "utf8" }).trim() ? "+uncommitted" : "";
const version = execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim() + dirty;
const trim = (s) => s.trim().split("\n").slice(-12).join("\n");

const results = [];
for (const c of h.done_criteria.filter((d) => d.kind === "review" && d.id === reviewId)) {
  if (!["pass", "fail"].includes(verdict) || !opt("--by") || !opt("--note")) { console.error("a review needs --review <id>=pass|fail, --by <role> and --note"); process.exit(2); }
  results.push({ criterion: c.id, kind: "review", passed: verdict === "pass", by: opt("--by"), command: c.check, output: opt("--note") });
  console.log(`${verdict === "pass" ? "pass" : "FAIL"} ${c.id} (review by ${opt("--by")})`);
}
for (const c of h.done_criteria.filter((d) => d.kind !== "review")) {
  const run = spawnSync("/bin/bash", ["-c", c.check], { cwd: root, encoding: "utf8" });
  const passed = run.status === 0, output = `${run.stdout}${run.stderr}`;
  results.push({ criterion: c.id, kind: c.kind, passed, command: c.check, output: trim(output) });
  console.log(`${passed ? "pass" : "FAIL"} ${c.id}`);
}

const at = new Date().toISOString().replace(/\.\d+Z$/, "Z");
const eid = `${h.id}-${at.replace(/[-:TZ]/g, "").slice(0, 14)}`;
const ev = { id: eid, subject: { kind: "handoff", id: h.id, version }, ran_at: at, runner, results, passed: results.every((r) => r.passed) };
mkdirSync(join(dir, "evidence/results"), { recursive: true });
const ePath = join(dir, "evidence/results", `${eid}.json`);
writeFileSync(ePath, JSON.stringify(ev, null, 2) + "\n");
h.evidence = [...(h.evidence ?? []), relative(join(dir, "operations/handoffs"), ePath)];
writeFileSync(hPath, JSON.stringify(h, null, 2) + "\n");
const pending = h.done_criteria.filter((d) => d.kind === "review" && d.id !== reviewId).map((d) => `${d.id} (${d.reviewer})`);
console.log(`${ev.passed ? "every criterion run passed" : "some criteria failed"}${pending.length ? `; review still owed: ${pending.join(", ")}` : ""}: ${relative(process.cwd(), ePath)}`);
process.exit(ev.passed ? 0 : 1);
