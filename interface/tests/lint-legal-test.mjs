#!/usr/bin/env node
// Legal lint, through the CLI and the legal/lint route. Fixtures are temp ventures.
// This is a lint, not legal advice. The tests check what a caller can see: exit code,
// finding fields, and which files the lint reads (a structured venture's real paths).

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, routes } from "../router.mjs";

const repo = new URL("../..", import.meta.url).pathname;
const bin = join(repo, "schema/lint-legal.mjs");
let failed = 0;
const expect = (name, ok, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

const put = (dir, rel, body) => {
  mkdirSync(join(dir, rel, ".."), { recursive: true });
  writeFileSync(join(dir, rel), body);
};
const venture = (files, ventureJson = { id: "acme", name: "Acme", phase: "discovery" }) => {
  const dir = mkdtempSync(join(tmpdir(), "legal-lint-"));
  put(dir, "venture.json", JSON.stringify(ventureJson) + "\n");
  for (const [rel, body] of Object.entries(files)) put(dir, rel, body);
  return dir;
};
const run = (dir, args = ["--json"]) => spawnSync(process.execPath, [bin, dir, ...args], { encoding: "utf8" });
const json = (r) => { try { return JSON.parse(r.stdout); } catch { return null; } };
const rulesOf = (body) => (body?.findings ?? []).map((f) => f.rule);

const claim = (text, extra = "") => `---\npublish: true\nclaim: ${text}\nvariant_of: foundation/problem.json\naudience: founders\n${extra}---\n\n${text}\n`;
const agreement = (holders) => JSON.stringify({
  signed: null,
  document: "governance/founder-agreement.md",
  founders: holders.map((holder) => ({ holder, role: "founder", commitment: "full-time", ip_assigned: true })),
}, null, 2) + "\n";
const founder = (id) => JSON.stringify({ id, name: id, role: "founder", joined: "2026-01-01" }) + "\n";

// One fixture that fails each rule. Modes stay fail-open, so the run exits 0.
{
  const dir = venture({
    "marketing/content/hours.mdx": claim("Customers save 10 hours a week"),
    "governance/founder-agreement.json": agreement(["ghost"]),
  });
  const r = run(dir);
  const body = json(r);
  expect("each rule fires on the fixture", r.status === 0 && body?.ok === true && rulesOf(body).includes("unsourced-public-claim") && rulesOf(body).includes("agreement-no-counterparty"), r.stdout + r.stderr);
  expect("this is a lint, not legal advice", body?.notice === "This is a lint, not legal advice.");
  const finding = body?.findings?.find((f) => f.rule === "unsourced-public-claim");
  expect("a finding has rule, mode, file, message, suggestion", finding && finding.mode === "fail-open" && finding.file === "marketing/content/hours.mdx" && /no source/.test(finding.message) && finding.suggestion && Object.keys(finding).sort().join() === "file,message,mode,rule,suggestion", finding);
  rmSync(dir, { recursive: true, force: true });
}

// The same two problems, with the claim under the operations content path.
{
  const dir = venture({ "operations/marketing/content/hours.mdx": claim("We are the fastest") });
  const r = run(dir);
  const body = json(r);
  expect("a public claim under operations/marketing/content fires", r.status === 0 && rulesOf(body).join() === "unsourced-public-claim", rulesOf(body));
  rmSync(dir, { recursive: true, force: true });
}

// A clean venture: sourced public claim, draft with no source, agreement whose holder is on file.
{
  const dir = venture({
    "marketing/content/sourced.mdx": claim("The study measured 12 teams", "source: https://example.com/study\n"),
    "marketing/content/draft.mdx": "---\npublish: false\nclaim: A draft with no source\n---\n\nA draft with no source\n",
    "marketing/content/page.mdx": "---\npublish: true\naudience: founders\n---\n\nA page that is not a claim.\n",
    "governance/founder-agreement.json": agreement(["ada"]),
    "people/founders/ada.json": founder("ada"),
  });
  const r = run(dir);
  const body = json(r);
  expect("a clean venture is silent", r.status === 0 && body?.ok === true && body.findings.length === 0, r.stdout);
  rmSync(dir, { recursive: true, force: true });
}

// Counterparty records the agreement may name.
{
  /** @type {[string, Record<string, string>][]} */
  const cases = [
    ["ownership holder", { "governance/ownership.json": JSON.stringify({ holders: [{ id: "ada", name: "Ada", kind: "founder" }] }) }],
    ["founder file", { "people/founders/ada.json": founder("ada") }],
    ["account", { "accounts/ada/account.json": JSON.stringify({ id: "ada", name: "Ada", relationship: "partner", status: "active" }) }],
    ["customer", { "customers/ada.json": JSON.stringify({ id: "ada", name: "Ada" }) }],
    ["investor", { "investors/ada.json": JSON.stringify({ id: "ada", name: "Ada" }) }],
  ];
  for (const [name, files] of cases) {
    const dir = venture({ "governance/founder-agreement.json": agreement(["ada"]), ...files });
    const r = run(dir);
    expect(`an agreement whose counterparty is ${name} is silent`, r.status === 0 && json(r)?.findings.length === 0, r.stdout);
    rmSync(dir, { recursive: true, force: true });
  }
}

// Exit 1 if and only if a fail-closed rule has findings.
{
  const files = {
    "marketing/content/hours.mdx": claim("Customers save 10 hours a week"),
    "governance/founder-agreement.json": agreement(["ghost"]),
  };
  const withMode = (modes) => venture({
    ...files,
    "naive.config.json": JSON.stringify({ legal_lint: { rules: modes } }) + "\n",
  });
  const closed = (id) => ({ mode: "fail-closed" });
  let dir = withMode({ "unsourced-public-claim": closed(), "agreement-no-counterparty": { mode: "fail-open" } });
  let r = run(dir);
  let body = json(r);
  expect("fail-closed on a rule with findings exits 1", r.status === 1 && body?.ok === false && body.findings.find((f) => f.rule === "unsourced-public-claim").mode === "fail-closed" && body.findings.find((f) => f.rule === "agreement-no-counterparty").mode === "fail-open", r.stdout);
  rmSync(dir, { recursive: true, force: true });

  dir = withMode({ "agreement-no-counterparty": closed() });
  r = run(dir);
  expect("fail-closed on the agreement rule exits 1", r.status === 1 && json(r)?.findings.some((f) => f.rule === "agreement-no-counterparty" && f.mode === "fail-closed"));
  rmSync(dir, { recursive: true, force: true });

  dir = venture({
    "marketing/content/sourced.mdx": claim("Measured", "source: the study\n"),
    "governance/founder-agreement.json": agreement(["ada"]),
    "people/founders/ada.json": founder("ada"),
    "naive.config.json": JSON.stringify({ legal_lint: { rules: { "unsourced-public-claim": closed(), "agreement-no-counterparty": closed() } } }) + "\n",
  });
  r = run(dir);
  expect("fail-closed with no findings exits 0", r.status === 0 && json(r)?.ok === true && json(r).findings.length === 0, r.stdout);
  rmSync(dir, { recursive: true, force: true });

  dir = venture({
    "marketing/content/hours.mdx": claim("Customers save 10 hours a week"),
    "governance/founder-agreement.json": agreement(["ada"]),
    "people/founders/ada.json": founder("ada"),
    "naive.config.json": JSON.stringify({ legal_lint: { rules: { "agreement-no-counterparty": closed() } } }) + "\n",
  });
  r = run(dir);
  body = json(r);
  expect("fail-closed on a silent rule does not fail the run", r.status === 0 && body?.ok === true && rulesOf(body).join() === "unsourced-public-claim" && body.findings[0].mode === "fail-open", r.stdout);
  rmSync(dir, { recursive: true, force: true });

  dir = venture({
    "marketing/content/hours.mdx": claim("Customers save 10 hours a week"),
    "naive.config.json": JSON.stringify({ legal_lint: { rules: { "unsourced-public-claim": { mode: "closed" } } } }) + "\n",
  });
  r = run(dir);
  expect("a mode that is not fail-open or fail-closed stays fail-open", r.status === 0 && json(r)?.findings[0]?.mode === "fail-open", r.stdout);
  rmSync(dir, { recursive: true, force: true });
}

// Missing and malformed records never crash. They add no finding of their own.
{
  const dir = venture({});
  let r = run(dir);
  expect("a venture with no claim and no agreement is silent", r.status === 0 && json(r)?.findings.length === 0, r.stdout + r.stderr);
  rmSync(dir, { recursive: true, force: true });

  const broken = venture({
    "naive.config.json": "{",
    "governance/founder-agreement.json": "{",
    "governance/ownership.json": "{",
    "marketing/content/broken.mdx": "---\nclaim: no closing fence\n",
    "marketing/content/not-a-claim.mdx": "just words\n",
    "marketing/content/_drafts/hidden.mdx": claim("Hidden claim"),
  });
  put(broken, "marketing/content/child/venture.json", "{\"id\":\"child\"}\n");
  put(broken, "marketing/content/child/secret.mdx", claim("Nested venture claim"));
  r = run(broken);
  const body = json(r);
  expect("malformed records do not crash", r.status === 0 && body && Array.isArray(body.findings) && body.findings.length === 0, r.stdout + r.stderr);
  rmSync(broken, { recursive: true, force: true });

  const shaped = venture({
    "governance/founder-agreement.json": JSON.stringify({ founders: "ada", signed: null, document: "x" }) + "\n",
  });
  r = run(shaped);
  expect("an agreement that names no holder fires, and does not crash", r.status === 0 && rulesOf(json(r)).join() === "agreement-no-counterparty", r.stdout);
  rmSync(shaped, { recursive: true, force: true });

  const odd = venture({
    "governance/founder-agreement.json": JSON.stringify({ founders: [{ holder: "../etc/passwd" }, { holder: "" }, 3], signed: null, document: "x" }) + "\n",
  });
  r = run(odd);
  expect("a holder id that is not a record id is not a counterparty, and the run stays up", r.status === 0 && rulesOf(json(r)).join() === "agreement-no-counterparty", r.stderr + r.stdout);
  rmSync(odd, { recursive: true, force: true });
}

// Inputs come through ventureFile: a structured venture keeps files under k-base/ and meta/.
{
  const dir = venture({
    "k-base/marketing/content/hours.mdx": claim("Customers save 10 hours a week"),
    "k-base/governance/founder-agreement.json": agreement(["ada"]),
    "k-base/people/founders/ada.json": founder("ada"),
    "meta/naive.config.json": JSON.stringify({ legal_lint: { rules: { "unsourced-public-claim": { mode: "fail-closed" } } } }) + "\n",
    "marketing/content/decoy.mdx": claim("This flat file is not the record"),
    "naive.config.json": JSON.stringify({ legal_lint: { rules: { "unsourced-public-claim": { mode: "fail-open" } } } }) + "\n",
  }, { id: "acme", name: "Acme", phase: "discovery", layout: "structured" });
  const r = run(dir);
  const body = json(r);
  const text = JSON.stringify(body);
  expect("structured layout: the real claim is read and the flat decoy is not", r.status === 1 && rulesOf(body).join() === "unsourced-public-claim" && body.findings[0].file === "marketing/content/hours.mdx" && !/flat file/.test(text) && body.findings[0].mode === "fail-closed", r.stdout);
  rmSync(dir, { recursive: true, force: true });
}

// Human output and usage.
{
  const dir = venture({ "marketing/content/hours.mdx": claim("Customers save 10 hours a week") });
  const r = run(dir, []);
  expect("human output names the lint and a warning, and exits 0", r.status === 0 && /This is a lint, not legal advice/.test(r.stdout) && /WARN\s+\[unsourced-public-claim\]/.test(r.stdout) && /ok/.test(r.stdout.split("\n").at(-2) ?? ""), r.stdout);
  rmSync(dir, { recursive: true, force: true });
  const usage = spawnSync(process.execPath, [bin], { encoding: "utf8" });
  expect("no venture dir exits 2", usage.status === 2 && /usage/.test(usage.stderr));
  const empty = mkdtempSync(join(tmpdir(), "legal-lint-empty-"));
  const missing = run(empty);
  expect("a directory with no venture.json exits 2", missing.status === 2);
  rmSync(empty, { recursive: true, force: true });
}

// The example venture's founder agreement names holders who are on the cap table.
{
  const tandem = join(repo, "schema/examples/workspace/ventures/tandem");
  const r = run(tandem);
  expect("the tandem example stays silent", r.status === 0 && json(r)?.findings.length === 0, r.stdout);
  const instance = join(repo, "instance/ventures/everything-ecosystem");
  const i = run(instance);
  expect("the instance venture stays silent", i.status === 0 && json(i)?.findings.length === 0, i.stdout + i.stderr);
}

// The route is legal/lint, and it runs this script.
{
  const hit = routes().find((r) => r.route === "legal/lint");
  expect("legal/lint is a command route", hit?.kind === "command" && hit.script === "schema/lint-legal.mjs" && hit.actions.includes("run") && /not legal advice/.test(hit.note), hit);

  const ws = mkdtempSync(join(tmpdir(), "legal-lint-ws-"));
  const env = { ...process.env, MENTURA_WORKSPACE: ws };
  const init = spawnSync(process.execPath, [join(repo, "interface/cli/mentura.mjs"), "init", join(ws, "acme"), "--id", "acme", "--layers", "purpose"], { encoding: "utf8", env });
  expect("a venture the route can open", init.status === 0, init.stderr);
  const dir = join(ws, "acme");
  put(dir, "marketing/content/hours.mdx", claim("Customers save 10 hours a week"));
  const open = await call({ venture: "acme", route: "legal/lint", action: "run", workspace: ws, via: "cli" });
  expect("the route returns the findings when the rule is fail-open", open.ok === true && open.result?.findings?.some((f) => f.rule === "unsourced-public-claim") && open.result.notice === "This is a lint, not legal advice.", open.error ?? open.result);

  put(dir, "naive.config.json", JSON.stringify({ legal_lint: { rules: { "unsourced-public-claim": { mode: "fail-closed" } } } }) + "\n");
  const shut = await call({ venture: "acme", route: "legal/lint", action: "run", workspace: ws, via: "cli" });
  expect("the route fails when a fail-closed rule has findings", shut.ok === false && /unsourced-public-claim/.test(shut.error ?? ""), shut.error);
  rmSync(ws, { recursive: true, force: true });
}

{
  const ws = mkdtempSync(join(tmpdir(), "legal-config-"));
  put(ws, "venture.json", JSON.stringify({ id: "acme", name: "Acme", phase: "discovery" }));
  put(ws, "naive.config.json", JSON.stringify({ legal_lint: { rules: { "unsourced-public-claim": { mode: "fail-closed" } } } }));
  const r = spawnSync(process.execPath, [join(repo, "schema/check-config.mjs"), ws], { encoding: "utf8" });
  expect("naive.config.json accepts legal_lint", r.status === 0, r.stdout + r.stderr);
  rmSync(ws, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
