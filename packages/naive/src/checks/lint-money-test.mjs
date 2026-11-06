#!/usr/bin/env node
// Money lint (packages/naive/src/checks/lint-money.mjs, route money/lint) on made-up ventures in a temp folder.
// The CLI is the interface under test. Nothing here reads or writes a real account.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";
import { routes } from "../records/routes/routes.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
const cli = join(repo, "packages/naive/src/checks/lint-money.mjs");
let failed = 0;
const expect = (name, ok, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

/**
 * @param {Record<string, unknown>} files
 * @param {{ layout?: string }} [options]
 */
function venture(files, { layout } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "money-lint-"));
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "fixture", name: "Fixture", phase: "discovery", ...(layout ? { layout } : {}) }));
  for (const [rel, body] of Object.entries(files)) put(dir, rel, body);
  return dir;
}
function put(dir, rel, body) {
  const p = ventureFile(dir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, typeof body === "string" ? body : `${JSON.stringify(body, null, 2)}\n`);
}
function run(dir, extra = []) {
  return spawnSync("node", [cli, dir, ...extra], { encoding: "utf8" });
}
function json(dir) {
  const r = run(dir, ["--json"]);
  let body = null;
  try { body = JSON.parse(r.stdout); } catch { body = null; }
  return { ...r, body };
}
const ids = (body) => (body?.findings ?? []).map((f) => f.rule);
const byRule = (body, rule) => (body?.findings ?? []).filter((f) => f.rule === rule);

const transfer = (over = {}) => ({
  id: "operating-transfer",
  question: "Move operating cash to reserve?",
  status: "open",
  decides: { record: "money-account", path: "money/operating.json" },
  ...over,
});
const owned = { id: "operating", name: "Operating", owner: "Ada Lovelace", balance: { amount: 424242, currency: "USD" }, last_4: "0106" };
const secret = { id: "txn", amount: { amount: 919191, currency: "USD" }, note: "do-not-print-919191" };

// ---- Each rule fires on a fixture, and a clean venture is silent.
{
  const bad = venture({
    "money/operating.json": { id: "operating", name: "Operating", balance: { amount: 424242, currency: "USD" }, last_4: "0106" },
    "money/decisions/operating.transfer.decision.json": transfer({ status: "executed" }),
    "decisions/founding-team.decision.json": { id: "founding-team", question: "Who is founding this?", status: "open" },
    "money/_summary.json": { cash: { amount: 424242, currency: "USD" } },
    "money/_streams/transactions/2026/10/2026-10-01-txn.json": secret,
  });
  const r = json(bad);
  expect("each rule fires on the fixture", r.status === 0 && r.body?.ok === true && ids(r.body).includes("transfer-no-approver") && ids(r.body).includes("account-no-owner"), r.stdout + r.stderr);
  const t = byRule(r.body, "transfer-no-approver")[0];
  const a = byRule(r.body, "account-no-owner")[0];
  expect("the executed transfer with no approver is the transfer finding", t?.mode === "fail-open" && t.file === "money/decisions/operating.transfer.decision.json" && /executed/.test(t.message) && t.suggestion.length > 0, t);
  expect("the account with no owner is the account finding", a?.file === "money/operating.json" && /Operating/.test(a.message) && a.mode === "fail-open", a);
  expect("findings leave out balances, last-4 and stream text", !/424242|0106|919191|do-not-print/.test(r.stdout), r.stdout);
  expect("a summary, a stream and a non-transfer decision are not findings", (r.body?.findings ?? []).every((f) => f.file.startsWith("money/operating") || f.file.includes("transfer")), r.body?.findings);
  rmSync(bad, { recursive: true, force: true });

  const clean = venture({
    "money/operating.json": owned,
    "money/decisions/operating.transfer.decision.json": transfer({
      status: "decided",
      decided_by: "Ada Lovelace",
      provenance: { drafted_by: { kind: "person", id: "Ada Lovelace" }, approved_by: "Ada Lovelace", approved_at: "2026-10-29T00:00:00Z", phase: "discovery", wording: "own" },
      outcomes: [{ id: "executed", projected: "The cash has moved.", result: "met" }],
    }),
    "money/_summary.json": { cash: { amount: 424242, currency: "USD" } },
    "money/_streams/transactions/not-json.json": "{",
  });
  const c = json(clean);
  expect("a clean venture stays silent", c.status === 0 && c.body?.ok === true && c.body.findings.length === 0, c.stdout + c.stderr);
  rmSync(clean, { recursive: true, force: true });

  const empty = venture({});
  const e = json(empty);
  expect("a venture with no money records stays silent", e.status === 0 && e.body?.findings?.length === 0, e.stdout);
  rmSync(empty, { recursive: true, force: true });
}

// ---- Lifecycle replay: proposed, name the approver, approve, execute, drop the name.
{
  const dir = venture({});
  const file = "money/decisions/operating.transfer.decision.json";
  let r = json(dir);
  expect("replay start: nothing to flag", r.status === 0 && r.body.findings.length === 0, r.stdout);
  put(dir, file, transfer({ status: "open" }));
  r = json(dir);
  expect("replay propose: a proposal with no approver is flagged", r.status === 0 && byRule(r.body, "transfer-no-approver")[0]?.message.includes("proposed"), r.stdout);
  put(dir, file, transfer({ status: "open", decided_by: "Ada Lovelace" }));
  r = json(dir);
  expect("replay name the approver: the proposal goes quiet", r.status === 0 && r.body.findings.length === 0, r.stdout);
  put(dir, file, transfer({
    status: "decided",
    decided_by: "Ada Lovelace",
    provenance: { drafted_by: { kind: "person", id: "Ada Lovelace" }, approved_by: "Ada Lovelace", approved_at: "2026-10-29T00:00:00Z", phase: "discovery", wording: "own" },
  }));
  r = json(dir);
  expect("replay approve: a named approval stays quiet", r.status === 0 && r.body.findings.length === 0, r.stdout);
  put(dir, file, transfer({
    status: "decided",
    decided_by: "Ada Lovelace",
    provenance: { drafted_by: { kind: "person", id: "Ada Lovelace" }, approved_by: "Ada Lovelace", approved_at: "2026-10-29T00:00:00Z", phase: "discovery", wording: "own" },
    outcomes: [{ id: "executed", projected: "The cash has moved.", result: "met" }],
  }));
  r = json(dir);
  expect("replay execute with a named approver: still quiet", r.status === 0 && r.body.findings.length === 0, r.stdout);
  put(dir, file, transfer({
    status: "executed",
    outcomes: [{ id: "executed", projected: "The cash has moved.", result: "met" }],
  }));
  r = json(dir);
  expect("replay execute after the name is removed: flagged, and the phase is executed", r.status === 0 && /executed/.test(byRule(r.body, "transfer-no-approver")[0]?.message ?? ""), r.stdout);
  put(dir, file, "{");
  r = json(dir);
  expect("replay unreadable transfer: no crash and no finding", r.status === 0 && r.body.findings.length === 0, r.stderr + r.stdout);
  rmSync(dir, { recursive: true, force: true });
}

// ---- An outcome marks executed even when status is still the schema's decided.
{
  const dir = venture({
    "money/decisions/operating.transfer.decision.json": transfer({
      status: "decided",
      outcomes: [{ id: "executed", projected: "The cash has moved.", result: "met" }],
    }),
  });
  const r = json(dir);
  expect("decided with an executed outcome and no approver is executed", /executed/.test(byRule(r.body, "transfer-no-approver")[0]?.message ?? ""), r.stdout);
  rmSync(dir, { recursive: true, force: true });
}

// ---- approved_by "agent" is not a named person.
{
  const dir = venture({
    "money/decisions/operating.transfer.decision.json": transfer({
      status: "decided",
      provenance: { drafted_by: { kind: "agent", id: "clerk" }, approved_by: "agent", approved_at: "2026-10-29T00:00:00Z", phase: "discovery", wording: "approved" },
    }),
  });
  const r = json(dir);
  expect("approved_by agent is not a named approver", r.body.findings.some((f) => f.rule === "transfer-no-approver"), r.stdout);
  rmSync(dir, { recursive: true, force: true });
}

// ---- Exit 1 if and only if a fail-closed rule has findings.
{
  const files = {
    "money/operating.json": { id: "operating", name: "Operating" },
    "money/decisions/operating.transfer.decision.json": transfer({ status: "executed" }),
  };
  const open = json(venture({ ...files, "naive.config.json": { money_lint: { rules: { "account-no-owner": { mode: "fail-open" }, "transfer-no-approver": { mode: "fail-open" } } } } }));
  expect("fail-open findings exit 0", open.status === 0 && open.body.ok === true && open.body.findings.length === 2, open.stdout);
  const acct = json(venture({ ...files, "naive.config.json": { money_lint: { rules: { "account-no-owner": { mode: "fail-closed" } } } } }));
  expect("a fail-closed account rule with a finding exits 1", acct.status === 1 && acct.body.ok === false && byRule(acct.body, "account-no-owner")[0].mode === "fail-closed" && byRule(acct.body, "transfer-no-approver")[0].mode === "fail-open", acct.stdout);
  const onlyTransfer = json(venture({
    "money/operating.json": owned,
    "money/decisions/operating.transfer.decision.json": transfer({ status: "executed" }),
    "naive.config.json": { money_lint: { rules: { "account-no-owner": { mode: "fail-closed" }, "transfer-no-approver": { mode: "fail-open" } } } },
  }));
  expect("fail-closed on a rule with no finding stays exit 0", onlyTransfer.status === 0 && onlyTransfer.body.ok === true && ids(onlyTransfer.body).join() === "transfer-no-approver", onlyTransfer.stdout);
  const closedQuiet = json(venture({
    "money/operating.json": owned,
    "naive.config.json": { money_lint: { rules: { "account-no-owner": { mode: "fail-closed" }, "transfer-no-approver": { mode: "fail-closed" } } } },
  }));
  expect("fail-closed with no findings exits 0", closedQuiet.status === 0 && closedQuiet.body.findings.length === 0, closedQuiet.stdout);
  const unknown = json(venture({ ...files, "naive.config.json": { money_lint: { rules: { "account-no-owner": { mode: "loud" } } } } }));
  expect("an unknown mode stays fail-open and exits 0", unknown.status === 0 && byRule(unknown.body, "account-no-owner")[0].mode === "fail-open", unknown.stdout);
}

// ---- Missing and malformed records never crash. Inputs come through ventureFile.
{
  const dir = venture({
    "money/operating.json": "{",
    "money/list.json": "[1,2]",
    "money/empty.json": "null",
    "money/decisions/operating.transfer.decision.json": "not json",
    "naive.config.json": "not json",
    "money/_streams/transactions/broken.json": "{",
  });
  const r = json(dir);
  expect("malformed account, decision, config and stream do not crash", r.status === 0 && r.body && r.body.findings.length === 0, r.stderr + r.stdout);
  rmSync(dir, { recursive: true, force: true });

  const structured = venture({
    "money/operating.json": { id: "operating", name: "Operating", owner: "Ada Lovelace" },
  }, { layout: "structured" });
  mkdirSync(join(structured, "money"), { recursive: true });
  writeFileSync(join(structured, "money/decoy.json"), JSON.stringify({ id: "decoy", name: "Decoy" }));
  const seen = json(structured);
  expect("structured layout reads the owned account through ventureFile and ignores a flat-path decoy", seen.status === 0 && seen.body.findings.length === 0 && ventureFile(structured, "money/operating.json").includes(`${join("k-base", "money")}`), seen.stdout);
  const child = join(structured, "nested");
  mkdirSync(join(child, "money"), { recursive: true });
  writeFileSync(join(child, "venture.json"), JSON.stringify({ id: "child", name: "Child", phase: "discovery" }));
  writeFileSync(join(child, "money/secret.json"), JSON.stringify({ id: "secret", name: "Secret" }));
  const nested = json(structured);
  expect("a nested venture's account is not linted with the parent", nested.body.findings.length === 0, nested.stdout);
  rmSync(structured, { recursive: true, force: true });
}

// ---- Human output and usage.
{
  const dir = venture({ "money/operating.json": { id: "operating", name: "Operating" } });
  const r = run(dir);
  expect("human output names the warning and exits 0", r.status === 0 && /WARN\s+\[account-no-owner\]/.test(r.stdout) && /1 finding\(s\); ok/.test(r.stdout), r.stdout);
  rmSync(dir, { recursive: true, force: true });
  const usage = spawnSync("node", [cli], { encoding: "utf8" });
  const nope = spawnSync("node", [cli, tmpdir()], { encoding: "utf8" });
  expect("usage with no venture exits 2", usage.status === 2 && /usage:/.test(usage.stderr), usage.stderr);
  expect("a directory with no venture.json exits 2", nope.status === 2, nope.stderr);
}

// ---- The route, and naive check runs this lint.
{
  const route = routes().find((x) => x.route === "money/lint");
  expect("money/lint is a command route on packages/naive/src/checks/lint-money.mjs", route?.kind === "command" && route.script === "packages/naive/src/checks/lint-money.mjs" && route.actions.includes("run"), route);
  const ws = mkdtempSync(join(tmpdir(), "money-lint-ws-"));
  const dir = join(ws, "fixture");
  mkdirSync(dir);
  writeFileSync(join(dir, "venture.json"), JSON.stringify({
    id: "fixture", name: "Fixture", parent: null, phase: "discovery", owner: "self", status: "active",
    layers: { purpose: false, knowledge: false, operations: false, evidence: false, governance: false, interface: false },
  }));
  const okRun = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), "money/lint", "run", "--venture", "fixture", "--workspace", ws, "--json"], { encoding: "utf8" });
  let parsed = null;
  try { parsed = JSON.parse(okRun.stdout); } catch { parsed = null; }
  expect("mentura money/lint run on a clean venture exits 0", okRun.status === 0 && parsed?.ok === true && parsed.result?.findings?.length === 0, okRun.stdout + okRun.stderr);
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ money_lint: { rules: { "account-no-owner": { mode: "fail-closed" } } } }));
  mkdirSync(join(dir, "money"));
  writeFileSync(join(dir, "money/operating.json"), JSON.stringify({ id: "operating", name: "Operating" }));
  const closed = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), "money/lint", "run", "--venture", "fixture", "--workspace", ws, "--json"], { encoding: "utf8" });
  expect("mentura money/lint run exits 1 when a fail-closed rule has a finding", closed.status === 1 && /account-no-owner/.test(closed.stderr + closed.stdout), closed.stdout + closed.stderr);
  const check = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/naive.mjs"), "check"], { cwd: dir, encoding: "utf8" });
  expect("naive check runs money lint and a fail-closed finding fails it", /FAIL\s+lint-money:/.test(check.stdout) && check.status !== 0, check.stdout);
  writeFileSync(join(dir, "money/operating.json"), JSON.stringify({ id: "operating", name: "Operating", owner: "Ada Lovelace" }));
  const checkOk = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/naive.mjs"), "check"], { cwd: dir, encoding: "utf8" });
  expect("naive check reports money lint passing when the account has an owner", /pass\s+lint-money:/.test(checkOk.stdout), checkOk.stdout);
  rmSync(ws, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
