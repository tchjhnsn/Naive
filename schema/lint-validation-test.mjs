#!/usr/bin/env node
// Behavior of validation/lint: each rule fires on its fixture, a clean venture is silent,
// the config mode sets the exit code, and a missing or malformed record does not crash.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../interface/router.mjs";

const repo = new URL("..", import.meta.url).pathname;
const NOW = "2026-10-29T00:00:00Z";
let failed = 0;
const expect = (name, ok, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

const put = (dir, rel, body) => {
  const p = join(dir, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body, null, 2) + "\n");
};
/**
 * @param {Record<string, unknown>} files
 * @param {{ phase?: string, layout?: string }} [options]
 */
function venture(files, { phase = "validation", layout } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "lint-validation-"));
  put(dir, "venture.json", { id: "lintv", name: "Lint", phase, status: "active", ...(layout ? { layout } : {}) });
  for (const [rel, body] of Object.entries(files)) put(dir, rel, body);
  return dir;
}
const run = (dir, extra = []) => spawnSync("node", [join(repo, "schema/lint-validation.mjs"), dir, "--json", "--now", NOW, ...extra], { encoding: "utf8" });
const out = (r) => { try { return JSON.parse(r.stdout); } catch { return null; } };
const ids = (json) => (json?.findings ?? []).map((f) => f.rule);
const only = (json, rule) => ids(json).length > 0 && ids(json).every((id) => id === rule);

const fresh = {
  id: "interviews", kind: "behavior", summary: "12 owners paid for a workaround last month",
  source: { path: "notes/interviews.md" }, audience: "target", sample: { n: 12 },
  collected: "2026-10-20", assumption: "exists", origin: "first-hand",
};
const weak = {
  id: "friend", kind: "opinion", summary: "A friend said the idea sounds useful",
  source: { path: "notes/friend.md" }, audience: "wrong", specificity: "general", collected: "2026-10-20",
};
const problem = (evidence, by = "owner") => ({
  venture: "lintv", statement: "Booking and payroll live in separate tools",
  segment: "Owners of two-to-ten-person shops", cost: "Five hours a week", why_now: "The tools stopped exporting",
  evidence, probability: { p: 0.7, by, scored: "2026-10-20" },
});
const decision = (phase) => ({
  id: "problem-real", question: "Is the problem real enough to decide in this phase?", status: "decided",
  decides: { path: "foundation/problem.json" },
  provenance: { drafted_by: { kind: "agent", id: "builder" }, approved_by: "Founder", approved_at: "2026-10-28T00:00:00Z", phase },
});

// ---- Clean: fresh evidence, owner grade, phase change before the evidence, decision on strong evidence.
{
  const dir = venture({
    "foundation/problem.json": problem([fresh]),
    "foundation/decisions/problem.decision.json": decision("validation"),
    "knowledge/freshness.jsonl": JSON.stringify({ at: "2026-10-01T00:00:00Z", event: "phase", from: "discovery", to: "validation" }) + "\n",
  });
  const r = run(dir), j = out(r);
  expect("a clean venture exits 0 with no findings", r.status === 0 && j?.ok === true && j.findings.length === 0, r.stdout + r.stderr);
}

// ---- Each rule on its own fixture.
{
  const dir = venture({ "foundation/problem.json": { ...problem([]), evidence: [] } });
  const r = run(dir), j = out(r);
  expect("a claim with no evidence fires claim-no-evidence and exits 0", r.status === 0 && only(j, "claim-no-evidence"), j?.findings);
}
{
  const old = { ...fresh, id: "old-interviews", collected: "2025-09-01" };
  const dir = venture({ "foundation/problem.json": problem([old]) });
  const r = run(dir), j = out(r);
  expect("evidence past 365 days fires stale-evidence", r.status === 0 && only(j, "stale-evidence") && /365d/.test(j.findings[0].message), j?.findings);
}
{
  const dir = venture({
    "foundation/problem.json": problem([fresh]),
    "knowledge/freshness.jsonl": JSON.stringify({ at: "2026-10-28T00:00:00Z", event: "phase", from: "discovery", to: "validation" }) + "\nnot json\n",
  });
  const r = run(dir), j = out(r);
  expect("a phase change after the evidence fires stale-evidence, and a bad log line does not crash", r.status === 0 && only(j, "stale-evidence") && /moved from/.test(j.findings[0].message), j?.findings ?? r.stderr);
}
{
  const young = { ...fresh, collected: "2026-10-28" };
  const dir = venture({
    "foundation/problem.json": problem([young]),
    "knowledge/freshness.jsonl": JSON.stringify({ at: "2026-10-01T00:00:00Z", event: "phase", from: "discovery", to: "validation" }) + "\n",
  });
  const r = run(dir), j = out(r);
  expect("a phase change before the evidence was collected stays silent", r.status === 0 && j.findings.length === 0, j?.findings);
}
{
  const dir = venture({ "foundation/problem.json": problem([fresh], "jev") });
  const r = run(dir), j = out(r);
  expect("an assumption graded by jev fires agent-only-grade", r.status === 0 && only(j, "agent-only-grade") && j.findings.some((f) => /exists/.test(f.message)), j?.findings);
}
{
  const dir = venture({
    "foundation/problem.json": problem([weak]),
    "foundation/decisions/problem.decision.json": decision("validation"),
  });
  const r = run(dir), j = out(r);
  expect("a Validation decision on very-low evidence fires discovery-grade-decision", r.status === 0 && only(j, "discovery-grade-decision"), j?.findings);
}
{
  const dir = venture({
    "foundation/problem.json": problem([weak]),
    "foundation/decisions/problem.decision.json": decision("discovery"),
  });
  const r = run(dir), j = out(r);
  expect("the same decision made in Discovery stays silent", r.status === 0 && j.findings.length === 0, j?.findings);
}
{
  const dir = venture({
    "foundation/problem.json": { ...problem([]), evidence: [] },
    "foundation/decisions/problem.decision.json": decision("validation"),
  });
  const r = run(dir), j = out(r);
  expect("a Validation decision on a claim with no evidence fires both rules", r.status === 0 && ids(j).includes("claim-no-evidence") && ids(j).includes("discovery-grade-decision"), ids(j));
}
{
  const dir = venture({ "foundation/problem.json": { ...problem([]), evidence: [], probability: { p: 0.4, by: "jev", scored: "2026-10-20" } } });
  const r = run(dir), j = out(r);
  expect("a stated assumption graded by an agent, with no evidence, fires both claim and agent rules", r.status === 0 && ids(j).includes("claim-no-evidence") && ids(j).includes("agent-only-grade"), ids(j));
}

// ---- Shelf override, and the exit code follows the per-rule mode.
{
  const recent = { ...fresh, collected: "2026-10-01" };
  const dir = venture({
    "foundation/problem.json": problem([recent]),
    "naive.config.json": { freshness: { profiles: { assumption: { expire: "10d", per_phase: true } } } },
  });
  const r = run(dir), j = out(r);
  expect("a shorter shelf in naive.config.json fires stale-evidence", r.status === 0 && only(j, "stale-evidence") && /10d/.test(j.findings[0].message), j?.findings);
}
{
  const dir = venture({
    "foundation/problem.json": { ...problem([]), evidence: [] },
    "naive.config.json": { validation_lint: { rules: { "claim-no-evidence": { mode: "fail-closed" }, "stale-evidence": { mode: "fail-closed" } } } },
  });
  const r = run(dir), j = out(r);
  expect("exit 1 when a fail-closed rule has a finding", r.status === 1 && j?.ok === false && ids(j).includes("claim-no-evidence") && j.findings.every((f) => f.rule !== "claim-no-evidence" || f.mode === "fail-closed"), j);
}
{
  const dir = venture({
    "foundation/problem.json": { ...problem([]), evidence: [] },
    "naive.config.json": { validation_lint: { rules: { "stale-evidence": { mode: "fail-closed" }, "claim-no-evidence": { mode: "nope" } } } },
  });
  const r = run(dir), j = out(r);
  expect("exit 0 when the fail-closed rule has no finding, and a bad mode stays fail-open", r.status === 0 && j?.ok === true && only(j, "claim-no-evidence") && j.rules.find((x) => x.id === "claim-no-evidence").mode === "fail-open" && j.rules.find((x) => x.id === "stale-evidence").mode === "fail-closed", j);
}

// ---- Missing and malformed records, and a structured layout read through ventureFile.
{
  const dir = venture({});
  const r = run(dir), j = out(r);
  expect("a venture with no validation records exits 0", r.status === 0 && j.findings.length === 0, r.stderr);
}
{
  const dir = venture({
    "foundation/problem.json": "{",
    "validation/solution.json": [],
    "foundation/decisions/problem.decision.json": "not json",
    "naive.config.json": "{",
    "knowledge/freshness.jsonl": "{\n",
  });
  const r = run(dir), j = out(r);
  expect("malformed records do not crash", r.status === 0 && j && Array.isArray(j.findings), r.stderr || r.stdout);
}
{
  const dir = venture({
    "foundation/problem.json": { ...problem([]), evidence: [null, "x", true] },
  });
  const r = run(dir), j = out(r);
  expect("malformed evidence items do not crash, and a claim with none usable fires", r.status === 0 && only(j, "claim-no-evidence"), r.stderr || ids(j));
}
{
  const dir = venture({
    "foundation/problem.json": { venture: "lintv", statement: "The claim", segment: "Shops", evidence: [] },
    "k-base/foundation/problem.json": problem([fresh]),
  }, { layout: "structured" });
  const r = run(dir), j = out(r);
  expect("a structured venture reads the record through its layout path, not a stray copy", r.status === 0 && j.findings.length === 0, j?.findings ?? r.stderr);
}
{
  const dir = venture({
    "foundation/problem.json": problem([fresh]),
    "foundation/problem-forms.json": null,
  });
  put(dir, "foundation/problem.json", {
    ...problem([fresh]),
    forms: [{ id: "payroll", statement: "Payroll takes the whole Friday" }],
  });
  const r = run(dir), j = out(r);
  expect("a form with no evidence fires claim-no-evidence, and the root claim does not", r.status === 0 && only(j, "claim-no-evidence") && j.findings.length === 1 && /payroll/.test(j.findings[0].message), j?.findings);
}

// ---- The route, and usage.
{
  const ws = mkdtempSync(join(tmpdir(), "lint-ws-"));
  const dir = join(ws, "ventures", "lintv");
  put(dir, "venture.json", {
    id: "lintv", name: "Lint", parent: null, phase: "validation", owner: "founder", status: "active",
    layers: { purpose: false, knowledge: false, operations: false, evidence: false },
  });
  put(dir, "foundation/problem.json", { ...problem([]), evidence: [] });
  const open = await call({ venture: "lintv", route: "validation/lint", action: "run", workspace: ws });
  expect("route validation/lint returns the finding", open.ok && ids(open.result).includes("claim-no-evidence"), open.error ?? open.result);
  put(dir, "naive.config.json", { validation_lint: { rules: { "claim-no-evidence": { mode: "fail-closed" } } } });
  const shut = await call({ venture: "lintv", route: "validation/lint", action: "run", workspace: ws });
  expect("the route fails when the fail-closed rule has a finding", shut.ok === false && /claim-no-evidence/.test(shut.error ?? ""), shut.error);
}
{
  const dir = venture({ "foundation/problem.json": { ...problem([]), evidence: [] } });
  const plain = spawnSync("node", [join(repo, "schema/lint-validation.mjs"), dir, "--json"], { encoding: "utf8" });
  expect("the route's arguments, with no --now, still see the venture", plain.status === 0 && ids(out(plain)).includes("claim-no-evidence"), plain.stderr || plain.stdout);
}
{
  const usage = spawnSync("node", [join(repo, "schema/lint-validation.mjs")], { encoding: "utf8" });
  expect("no venture dir exits 2", usage.status === 2, usage.stderr);
}
{
  const dir = venture({});
  const bad = spawnSync("node", [join(repo, "schema/lint-validation.mjs"), dir, "--json", "--now", "not-a-date"], { encoding: "utf8" });
  expect("a bad --now does not crash", bad.status === 0 && out(bad)?.findings, bad.stderr);
}

{
  const dir = venture({ "naive.config.json": { validation_lint: { rules: { "stale-evidence": { mode: "fail-closed" } } } } });
  const r = spawnSync("node", [join(repo, "schema/check-config.mjs"), dir], { encoding: "utf8" });
  expect("naive.config.json accepts validation_lint", r.status === 0, r.stdout + r.stderr);
}

process.exit(failed ? 1 : 0);
