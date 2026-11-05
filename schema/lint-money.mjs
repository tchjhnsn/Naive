#!/usr/bin/env node
// Money lint: transfer decisions and account records, read through ventureFile.
//
//   node schema/lint-money.mjs <venture dir> [--json]
//
// Rules are fail-open (warn) by default. naive.config.json money_lint.rules.<id>.mode set to
// "fail-closed" makes a rule's findings fail the run (exit 1). Exit 1 only in that case.
//
// This never moves money, never reads a transaction stream, and never prints a balance or an
// account number. A missing or malformed record is skipped.
//
// A transfer decision is a *.decision.json in a decisions/ folder whose file names a transfer
// (transfer.decision.json, <record>.transfer.decision.json) or whose id is transfer or transfer-*.
// Its phase is proposed, then approved, then executed. Any of those with no person named in
// provenance.approved_by or decided_by is a finding, so executed is never silent about a missing
// approver. An account is money/<id>.json, and it needs an owner string.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { logicalFiles, ventureFile } from "../packages/core/venture-paths.mjs";

const read = (dir, rel) => {
  try { return JSON.parse(readFileSync(ventureFile(dir, rel), "utf8")); } catch { return null; }
};

export const RULES = [
  { id: "transfer-no-approver", description: "A transfer decision with no named approver", severity: "warn", mode: "fail-open" },
  { id: "account-no-owner", description: "An account with no owner", severity: "warn", mode: "fail-open" },
];

const SKIP = new Set(["node_modules", "repo", "codebase"]);
const MODES = new Set(["fail-open", "fail-closed"]);

// Proposed, approved, or executed. Schema status open/decided maps onto the first two.
// status "executed", or an outcome whose id is "executed" and whose result is not pending, is executed.
export function phaseOf(d) {
  const status = typeof d?.status === "string" ? d.status : "";
  const executed = status === "executed" || (Array.isArray(d?.outcomes) && d.outcomes.some((o) =>
    o && typeof o === "object" && o.id === "executed" && typeof o.result === "string" && o.result !== "pending"));
  if (executed) return "executed";
  if (status === "decided" || status === "approved") return "approved";
  return "proposed";
}

// A person named on the decision. "agent" is not a person (decision-record.schema.json).
export function namedApprover(d) {
  for (const a of [d?.provenance?.approved_by, d?.decided_by]) {
    if (typeof a !== "string") continue;
    const name = a.trim();
    if (name && !/^(agent|nobody|none)$/i.test(name)) return name;
  }
  return null;
}

function consider(rel) {
  const parts = rel.split("/");
  if (parts.some((s) => !s || s.startsWith(".") || s.startsWith("_") || SKIP.has(s))) return false;
  return /^money\/[^/]+\.json$/.test(rel) || (parts.at(-2) === "decisions" && rel.endsWith(".decision.json"));
}

function isTransfer(rel, d) {
  const base = rel.split("/").at(-1).slice(0, -".decision.json".length);
  const segs = base.split(".");
  const topic = segs.slice(1).join(".");
  if (segs[0] === "transfer" || topic === "transfer" || topic.startsWith("transfer-")) return true;
  return typeof d.id === "string" && (d.id === "transfer" || d.id.startsWith("transfer-"));
}

function rulesConfig(raw) {
  const rules = raw && typeof raw === "object" && !Array.isArray(raw) && raw.money_lint && typeof raw.money_lint === "object" && !Array.isArray(raw.money_lint)
    ? raw.money_lint.rules : null;
  return rules && typeof rules === "object" && !Array.isArray(rules) ? rules : {};
}

function accountLabel(rel, a) {
  if (typeof a.name === "string" && a.name.trim()) return a.name.trim();
  if (typeof a.id === "string" && a.id.trim()) return a.id.trim();
  return rel.split("/").at(-1).replace(/\.json$/, "");
}

export function lint(dir) {
  const cfg = rulesConfig(read(dir, "naive.config.json"));
  const rules = RULES.map((r) => ({ ...r, mode: MODES.has(cfg[r.id]?.mode) ? cfg[r.id].mode : r.mode }));
  const mode = Object.fromEntries(rules.map((r) => [r.id, r.mode]));
  const findings = [];
  const add = (rule, file, message, suggestion) => findings.push({ rule, mode: mode[rule], file, message, suggestion });
  let files = [];
  try { files = logicalFiles(dir); } catch { files = []; }
  for (const rel of files.filter(consider).sort()) {
    const data = read(dir, rel);
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;
    if (rel.endsWith(".decision.json")) {
      if (!isTransfer(rel, data) || namedApprover(data)) continue;
      const id = typeof data.id === "string" && data.id.trim() ? data.id.trim() : rel.split("/").at(-1).replace(/\.decision\.json$/, "");
      add("transfer-no-approver", rel, `transfer ${id} is ${phaseOf(data)} and names no approver`, "Name the person who approves this transfer in provenance.approved_by or decided_by.");
    } else if (typeof data.owner !== "string" || !data.owner.trim()) {
      add("account-no-owner", rel, `account ${accountLabel(rel, data)} has no owner`, "Name the person who owns this account in owner.");
    }
  }
  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, rules, findings };
}

export { moneyCommands } from "../packages/routes/commands.mjs";

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || dir.startsWith("--") || !existsSync(join(dir, "venture.json"))) {
    console.error("usage: node schema/lint-money.mjs <venture dir> [--json]");
    process.exit(2);
  }
  const r = lint(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}
