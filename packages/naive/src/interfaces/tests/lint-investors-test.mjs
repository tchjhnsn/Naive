#!/usr/bin/env node
// Investors lint, driven the way a founder runs it: the CLI exit code and the findings.
// One venture trips each rule. A clean venture stays silent. naive.config.json decides the
// exit code. Missing and malformed records do not crash. Records are read from where
// ventureFile puts them, including a structured venture's k-base and meta/.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, routes } from "../../router/router.mjs";
import { ventureFile } from "../../core/venture-paths.mjs";
import { lint } from "../../checks/lint-investors.mjs";

const repo = new URL("../../../../..", import.meta.url).pathname;
const script = new URL("../../checks/lint-investors.mjs", import.meta.url).pathname;
let failed = 0;
/** @type {(name: string, ok: unknown, detail?: unknown) => void} */
const expect = (name, ok, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};
const dirs = [];
const venture = (layout) => {
  const dir = mkdtempSync(join(tmpdir(), "lint-investors-"));
  dirs.push(dir);
  const body = { id: "acme", name: "Acme", phase: "validation" };
  if (layout) body.layout = layout;
  writeFileSync(join(dir, "venture.json"), JSON.stringify(body));
  return dir;
};
const put = (dir, rel, body) => {
  const p = ventureFile(dir, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, typeof body === "string" ? body : `${JSON.stringify(body, null, 2)}\n`);
};
const run = (dir, extra = []) => spawnSync(process.execPath, [script, dir, ...extra], { encoding: "utf8" });
const rulesOf = (body) => (body?.findings ?? []).map((f) => f.rule).sort();

const alignment = {
  venture: "acme",
  principles: [{ id: "no-full-ratchet", statement: "Never accept a full-ratchet anti-dilution right.", source: "founder, 2026-10-29" }],
};
const raise = (answer) => ({
  id: "seed-raise",
  question: "Should we raise a seed round?",
  status: "decided",
  answer,
  provenance: { drafted_by: { kind: "person", id: "Ada" } },
});
const investor = (extra) => ({ id: "north", name: "North", ...extra });

// ---- Each rule fires, and a clean venture stays silent.
{
  const bad = venture();
  put(bad, "foundation/alignment.json", alignment);
  put(bad, "investors/decisions/seed-raise.decision.json", raise("Yes, we will raise now."));
  put(bad, "investors/north.json", investor({
    terms: "The round gives North a full-ratchet anti-dilution right.",
    updates: [{ id: "october", status: "sent", numbers: [{ name: "arr", value: 120000, confirmed: false }, { name: "runway", value: "14 months", confirmed: true }] }],
  }));
  const cli = run(bad, ["--json"]);
  const body = JSON.parse(cli.stdout);
  expect("each rule fires on the fixture", rulesOf(body).join() === "raise-no-use-of-funds,terms-conflict-alignment,update-unconfirmed-numbers", rulesOf(body));
  expect("findings carry rule, mode, file, message and suggestion", body.findings.every((f) => f.rule && f.mode === "fail-open" && f.file && f.message && f.suggestion));
  expect("the sent update names the unconfirmed figure", body.findings.some((f) => f.rule === "update-unconfirmed-numbers" && f.file === "investors/north.json" && /october is sent/.test(f.message) && /arr/.test(f.message) && !/runway/.test(f.message)));
  expect("fail-open findings exit 0", cli.status === 0 && body.ok === true, cli.status);
  expect("the CLI JSON matches lint()", JSON.stringify(body) === JSON.stringify(lint(bad)));

  const clean = venture();
  put(clean, "foundation/alignment.json", alignment);
  put(clean, "investors/decisions/seed-raise.decision.json", raise("Yes. Use of funds: eighteen months of runway and one engineer."));
  put(clean, "investors/north.json", investor({
    terms: "A post-money SAFE with a valuation cap and no discount.",
    updates: [{ id: "october", status: "sent", numbers: [{ name: "arr", value: 120000, confirmed: true }] }],
  }));
  put(clean, "decisions/funding.decision.json", { id: "funding", question: "How will the venture be funded?", status: "open", answer: "Not decided." });
  put(clean, "fund/decisions/terms.decision.json", { id: "fund-terms", question: "What are the fund's terms: target size, management fee, carry and term?", status: "open", provenance: { drafted_by: { kind: "framework", id: "naive" } } });
  const quiet = run(clean, ["--json"]);
  expect("a clean venture stays silent", quiet.status === 0 && JSON.parse(quiet.stdout).findings.length === 0, quiet.stdout);
}

// ---- The words that count as a conflict, and the words that do not.
{
  const dir = venture();
  put(dir, "foundation/alignment.json", alignment);
  put(dir, "investors/north.json", investor({ terms: "Never accept a full-ratchet anti-dilution right." }));
  expect("quoting the principle's whole statement stays silent", lint(dir).findings.length === 0, lint(dir).findings);
  put(dir, "investors/north.json", investor({ terms: "Standard broad-based protection." }));
  put(dir, "governance/ownership.json", {
    updated: "2026-10-29", unit: "shares", classes: [{ id: "seed", kind: "preferred", rights: ["anti-dilution-broad-based", "pro-rata"] }], holders: [], grants: [],
  });
  expect("a broad-based right does not trip a full-ratchet principle", lint(dir).findings.length === 0, lint(dir).findings);
  put(dir, "governance/ownership.json", {
    updated: "2026-10-29", unit: "shares", classes: [{ id: "seed", kind: "preferred", rights: ["anti-dilution-full-ratchet"] }], holders: [], grants: [],
  });
  const own = lint(dir);
  expect("a full-ratchet ownership right conflicts", own.findings.length === 1 && own.findings[0].file === "governance/ownership.json" && own.findings[0].rule === "terms-conflict-alignment", own.findings);
  put(dir, "investors/decisions/round-terms.decision.json", {
    id: "round-terms", question: "What terms do we offer?", status: "decided", answer: "The note carries a full-ratchet anti-dilution right.",
  });
  expect("a terms decision's answer can conflict too", lint(dir).findings.some((f) => f.file === "investors/decisions/round-terms.decision.json"));
  put(dir, "foundation/alignment.json", { venture: "acme", principles: [{ id: "short", statement: "Never rush.", source: "founder" }] });
  put(dir, "investors/north.json", investor({ terms: "We will not rush the round, and the right is full-ratchet anti-dilution." }));
  expect("a principle with no distinctive words stays silent", !lint(dir).findings.some((f) => f.rule === "terms-conflict-alignment"));
}

// ---- Draft and sent, confirmed and not. No sent update with an unconfirmed number goes unflagged.
{
  const dir = venture();
  const update = (status, confirmed) => investor({ updates: [{ id: "october", status, numbers: [{ name: "arr", value: 120000, confirmed }] }] });
  put(dir, "investors/north.json", update("draft", false));
  expect("a draft with an unconfirmed number is flagged", lint(dir).findings.some((f) => /is draft/.test(f.message)));
  put(dir, "investors/north.json", update("draft", true));
  expect("confirming the number clears the flag", lint(dir).findings.length === 0);
  put(dir, "investors/north.json", update("sent", true));
  expect("a sent update with confirmed numbers stays silent", lint(dir).findings.length === 0);
  put(dir, "investors/north.json", update("sent", false));
  expect("a sent update with an unconfirmed number is flagged", lint(dir).findings.some((f) => f.rule === "update-unconfirmed-numbers" && /is sent/.test(f.message)));
  put(dir, "investors/north.json", investor({ updates: [{ id: "october", status: "sent", numbers: [{ name: "arr", value: 1, confirmed: "yes" }] }] }));
  expect("confirmed must be true, not a string", lint(dir).findings.some((f) => f.rule === "update-unconfirmed-numbers"));
  put(dir, "investors/north.json", investor({ updates: [{ status: "sent" }] }));
  expect("an update with no numbers stays silent", lint(dir).findings.length === 0);
}

// ---- naive.config.json mode: exit 1 if and only if a fail-closed rule has findings.
{
  const dir = venture();
  put(dir, "foundation/alignment.json", alignment);
  put(dir, "investors/decisions/seed-raise.decision.json", raise("Yes, we will raise now."));
  put(dir, "investors/north.json", investor({
    terms: "The round gives North a full-ratchet anti-dilution right.",
    updates: [{ id: "october", status: "sent", numbers: [{ name: "arr", value: 120000, confirmed: false }] }],
  }));
  const close = (id) => put(dir, "naive.config.json", { investors_lint: { rules: { [id]: { mode: "fail-closed" } } } });
  const saw = (id) => {
    const cli = run(dir, ["--json"]);
    const body = JSON.parse(cli.stdout);
    const failClosedHit = body.findings.some((f) => f.mode === "fail-closed");
    return cli.status === (failClosedHit ? 1 : 0) && body.ok === !failClosedHit && body.findings.some((f) => f.rule === id && f.mode === "fail-closed");
  };
  expect("closing the raise rule fails the run", (close("raise-no-use-of-funds"), saw("raise-no-use-of-funds")));
  expect("closing the terms rule fails the run", (close("terms-conflict-alignment"), saw("terms-conflict-alignment")));
  expect("closing the update rule fails the run", (close("update-unconfirmed-numbers"), saw("update-unconfirmed-numbers")));
  put(dir, "naive.config.json", { investors_lint: { rules: { "raise-no-use-of-funds": { mode: "strict" } } } });
  const ignored = run(dir, ["--json"]);
  expect("a mode that is not fail-open or fail-closed stays fail-open", ignored.status === 0 && JSON.parse(ignored.stdout).rules.every((r) => r.mode === "fail-open"));

  const clean = venture();
  put(clean, "investors/decisions/seed-raise.decision.json", raise("Use of funds: runway."));
  put(clean, "naive.config.json", { investors_lint: { rules: { "update-unconfirmed-numbers": { mode: "fail-closed" }, "raise-no-use-of-funds": { mode: "fail-closed" } } } });
  const closedQuiet = run(clean, ["--json"]);
  expect("fail-closed with no findings exits 0", closedQuiet.status === 0 && JSON.parse(closedQuiet.stdout).ok === true && JSON.parse(closedQuiet.stdout).findings.length === 0, closedQuiet.stdout);

  const onlyRaise = venture();
  put(onlyRaise, "investors/decisions/seed-raise.decision.json", raise("Yes, we will raise now."));
  put(onlyRaise, "naive.config.json", { investors_lint: { rules: { "terms-conflict-alignment": { mode: "fail-closed" } } } });
  const other = run(onlyRaise, ["--json"]);
  const otherBody = JSON.parse(other.stdout);
  expect("a fail-closed rule with no finding does not fail the run", other.status === 0 && otherBody.findings.length === 1 && otherBody.findings[0].mode === "fail-open", other.stdout);
}

// ---- Missing and malformed records never crash, and a broken raise file is skipped.
{
  const empty = venture();
  let threw = false;
  let result;
  try { result = lint(empty); } catch { threw = true; }
  const emptyCli = run(empty, ["--json"]);
  expect("a venture with no investors records does not crash", !threw && emptyCli.status === 0 && result.findings.length === 0, emptyCli.stderr);

  const dir = venture();
  put(dir, "foundation/alignment.json", "{");
  put(dir, "investors/north.json", "{not json");
  put(dir, "investors/decisions/seed-raise.decision.json", "[]");
  put(dir, "governance/ownership.json", "null");
  put(dir, "naive.config.json", "{");
  put(dir, "investors/east.json", { id: "east", updates: "nope", terms: 3 });
  put(dir, "investors/west.json", { id: "west", updates: [{ numbers: { value: 1 } }, { numbers: [1] }, null] });
  threw = false;
  try { result = lint(dir); } catch { threw = true; }
  const badCli = run(dir, ["--json"]);
  expect("malformed records do not crash and add no finding", !threw && badCli.status === 0 && result.ok && result.findings.length === 0, badCli.stderr + badCli.stdout);

  put(dir, "investors/decisions/seed-raise.decision.json", raise("Yes, we will raise now."));
  expect("repairing the raise file brings the finding back", lint(dir).findings.some((f) => f.rule === "raise-no-use-of-funds"));
  put(dir, "investors/decisions/seed-raise.decision.json", "{");
  expect("garbled again, the raise file is skipped", !lint(dir).findings.some((f) => f.rule === "raise-no-use-of-funds"));

  const legacy = venture();
  put(legacy, "purpose/alignment.json", alignment);
  put(legacy, "investors/north.json", investor({ terms: "The round gives North a full-ratchet anti-dilution right." }));
  expect("purpose/alignment.json is read when foundation/alignment.json is absent", lint(legacy).findings.some((f) => f.rule === "terms-conflict-alignment"));
  put(legacy, "foundation/alignment.json", { venture: "acme", principles: [{ id: "plain", statement: "Always tell the founder the truth.", source: "founder" }] });
  expect("foundation alignment wins when both files exist", !lint(legacy).findings.some((f) => f.rule === "terms-conflict-alignment"));
}

// ---- Inputs come through ventureFile: a structured venture, and nothing under _private or _drafts.
{
  const dir = venture("structured");
  put(dir, "foundation/alignment.json", alignment);
  put(dir, "investors/decisions/seed-raise.decision.json", raise("Yes, we will raise now."));
  put(dir, "investors/north.json", investor({
    terms: "The round gives North a full-ratchet anti-dilution right.",
    updates: [{ id: "october", status: "sent", numbers: [{ name: "arr", value: 120000, confirmed: false }] }],
  }));
  put(dir, "naive.config.json", { investors_lint: { rules: { "update-unconfirmed-numbers": { mode: "fail-closed" } } } });
  writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ investors_lint: { rules: { "update-unconfirmed-numbers": { mode: "fail-open" } } } }));
  const cli = run(dir, ["--json"]);
  const body = JSON.parse(cli.stdout);
  expect("structured records are linted by their logical paths", body.findings.map((f) => f.file).sort().join() === "investors/decisions/seed-raise.decision.json,investors/north.json,investors/north.json", body.findings.map((f) => f.file));
  expect("the mode is read from meta/naive.config.json, not a root decoy", cli.status === 1 && body.findings.some((f) => f.rule === "update-unconfirmed-numbers" && f.mode === "fail-closed"), body);

  const hidden = venture();
  put(hidden, "_private/investors/north.json", investor({ updates: [{ id: "october", status: "sent", numbers: [{ name: "arr", value: 1, confirmed: false }] }] }));
  put(hidden, "_drafts/investors/decisions/seed-raise.decision.json", raise("Yes, we will raise now."));
  expect("private and draft records are not linted", lint(hidden).findings.length === 0, lint(hidden).findings);
}

// ---- The route, and the ventures already in the repo.
{
  const listed = routes().find((r) => r.route === "investors/lint");
  expect("investors/lint is a command on packages/naive/src/checks/lint-investors.mjs", listed?.kind === "command" && listed.script === "packages/naive/src/checks/lint-investors.mjs" && listed.actions.includes("run"), listed);

  const ws = mkdtempSync(join(tmpdir(), "lint-investors-ws-"));
  dirs.push(ws);
  const dir = join(ws, "acme");
  mkdirSync(dir);
  writeFileSync(join(dir, "venture.json"), JSON.stringify({
    id: "acme", name: "Acme", parent: null, phase: "validation", owner: "self", status: "active",
    layers: { purpose: false, knowledge: false, operations: false, evidence: false },
  }));
  put(dir, "investors/north.json", investor({ updates: [{ id: "october", status: "sent", numbers: [{ name: "arr", value: 120000, confirmed: false }] }] }));
  const open = await call({ venture: "acme", route: "investors/lint", action: "run", workspace: ws, via: "cli" });
  expect("the route returns the finding while the rule is fail-open", open.ok && open.result.findings.some((f) => f.rule === "update-unconfirmed-numbers"), open.error ?? open.result);
  put(dir, "naive.config.json", { investors_lint: { rules: { "update-unconfirmed-numbers": { mode: "fail-closed" } } } });
  const shut = await call({ venture: "acme", route: "investors/lint", action: "run", workspace: ws, via: "cli" });
  expect("the route fails when a fail-closed rule has a finding", shut.ok === false && /update-unconfirmed-numbers/.test(shut.error ?? ""), shut.error ?? shut);

  for (const rel of ["packages/naive/src/records/examples/software/ventures/relay", "packages/naive/src/records/examples/workspace/ventures/northstar", "packages/naive/src/records/examples/workspace/ventures/acme-labs", "packages/naive/src/records/examples/workspace/ventures/tandem"]) {
    const v = join(repo, rel);
    const cli = run(v, ["--json"]);
    let body = null;
    try { body = JSON.parse(cli.stdout); } catch { /* leave null */ }
    expect(`${rel} lints without crashing`, cli.status === 0 && body?.ok === true && Array.isArray(body.findings), cli.stderr || cli.stdout);
  }
}

const usage = run(join(tmpdir(), "no-such-venture"), ["--json"]);
expect("a path with no venture.json exits 2", usage.status === 2 && /usage:/.test(usage.stderr), usage.stderr);

for (const d of dirs) rmSync(d, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
