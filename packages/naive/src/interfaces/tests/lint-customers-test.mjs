#!/usr/bin/env node
// Customers lint, on made-up ventures in a temp folder. Each rule has a fixture that fires it,
// a clean venture stays quiet, a product edit after a promise is what the next run sees, and
// naive.config.json customers_lint.rules.<id>.mode decides the exit code. Missing and unreadable
// records do not crash. Structured ventures are read through ventureFile.

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, routes } from "../../router/router.mjs";

const repo = new URL("../../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};
const write = (dir, rel, body) => {
  const path = join(dir, rel);
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, typeof body === "string" ? body : JSON.stringify(body, null, 2) + "\n");
};
const cli = (dir, args = []) => spawnSync("node", [join(repo, "packages/naive/src/checks/lint-customers.mjs"), dir, ...args], { encoding: "utf8" });
const run = (dir) => {
  const r = cli(dir, ["--json"]);
  let body = null;
  try { body = JSON.parse(r.stdout); } catch { /* stdout is not JSON when the process crashes before printing */ }
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, body };
};
const rulesOf = (body, id) => (body?.findings ?? []).filter((x) => x.rule === id);
const shape = (x) => x && ["rule", "mode", "file", "message", "suggestion"].every((k) => typeof x[k] === "string");

const icp = { venture: "shop", profiles: [{ id: "shop-owners", who: "Owners of two-to-ten-person shops", primary: true }] };
const product = { id: "desk", name: "Desk", description: "A booking desk for shops.", job: "Book a table and take next-day pickup", status: "building", offered_to: ["shop-owners"] };
const cleanCustomer = { id: "ada", name: "Ada", icp: "shop-owners", promises: [{ product: "desk", text: "next-day pickup" }] };

function venture(layout = "flat") {
  const root = mkdtempSync(join(tmpdir(), "lint-customers-"));
  const dir = join(root, "shop");
  mkdirSync(dir, { recursive: true });
  const record = {
    id: "shop", name: "Shop", parent: null, phase: "discovery", owner: "self", status: "active", profile: "profile.md",
    layers: { purpose: false, knowledge: false, operations: false, evidence: false, governance: false, interface: false },
    ...(layout === "structured" ? { layout: "structured" } : {}),
  };
  write(dir, "venture.json", record);
  return { root, dir, drop: () => rmSync(root, { recursive: true, force: true }) };
}

{
  const v = venture();
  write(v.dir, "foundation/icp.json", icp);
  write(v.dir, "product/desk.json", product);
  write(v.dir, "customers/ada.json", cleanCustomer);
  const r = run(v.dir);
  expect("a clean venture is silent", r.status === 0 && r.body?.ok === true && r.body.findings.length === 0, r.stderr || r.stdout);
  expect("both rules ship fail-open", r.body?.rules?.every((x) => x.severity === "warn" && x.mode === "fail-open") && r.body.rules.map((x) => x.id).join(",") === "no-icp-match,promise-not-kept");
  v.drop();
}

{
  const v = venture();
  write(v.dir, "foundation/icp.json", icp);
  write(v.dir, "product/desk.json", product);
  write(v.dir, "customers/bev.json", { id: "bev", name: "Bev", icp: "clinics" });
  const r = run(v.dir);
  const hits = rulesOf(r.body, "no-icp-match");
  expect("no-icp-match fires when the named profile is not an ICP", r.status === 0 && hits.length === 1 && hits[0].file === "customers/bev.json" && /clinics/.test(hits[0].message) && shape(hits[0]), r.stdout);
  expect("the promise rule stays silent on that fixture", rulesOf(r.body, "promise-not-kept").length === 0);
  write(v.dir, "customers/bev.json", { id: "bev", name: "Bev" });
  const unnamed = run(v.dir);
  expect("no-icp-match fires when no profile is named", unnamed.status === 0 && rulesOf(unnamed.body, "no-icp-match").length === 1 && /no icp profile is named/.test(rulesOf(unnamed.body, "no-icp-match")[0].message));
  write(v.dir, "customers/bev.json", { id: "bev", name: "Bev", icp: "icp:shop-owners" });
  expect("an icp: prefix still matches the profile", run(v.dir).body.findings.length === 0);
  v.drop();
}

{
  const v = venture();
  write(v.dir, "foundation/icp.json", icp);
  write(v.dir, "product/desk.json", product);
  write(v.dir, "customers/ada.json", { id: "ada", name: "Ada", icp: "shop-owners", promises: [{ product: "desk", text: "same-day delivery" }] });
  const r = run(v.dir);
  const hits = rulesOf(r.body, "promise-not-kept");
  expect("promise-not-kept fires when the product record does not keep the words", r.status === 0 && hits.length === 1 && hits[0].file === "customers/ada.json" && /same-day delivery/.test(hits[0].message) && /product\/desk.json/.test(hits[0].message) && shape(hits[0]), r.stdout);
  expect("the ICP rule stays silent on that fixture", rulesOf(r.body, "no-icp-match").length === 0);
  v.drop();
}

{
  const v = venture();
  write(v.dir, "foundation/icp.json", icp);
  write(v.dir, "product/desk.json", product);
  write(v.dir, "customers/ada.json", cleanCustomer);
  expect("the promise is quiet while the product keeps it", run(v.dir).body.findings.length === 0);
  write(v.dir, "product/desk.json", { ...product, job: "Book a table", description: "A booking desk for shops." });
  const dropped = run(v.dir);
  expect("after the product drops the words, the next run reports the promise", dropped.status === 0 && rulesOf(dropped.body, "promise-not-kept").length === 1 && /does not keep/.test(rulesOf(dropped.body, "promise-not-kept")[0].message));
  write(v.dir, "product/desk.json", { ...product, status: "retired" });
  const retired = run(v.dir);
  expect("a retired product does not keep a promise, even when the words remain", retired.status === 0 && /retired/.test(rulesOf(retired.body, "promise-not-kept")[0]?.message ?? ""));
  write(v.dir, "product/desk.json", "");
  rmSync(join(v.dir, "product/desk.json"));
  const gone = run(v.dir);
  expect("a removed product record does not keep the promise", gone.status === 0 && /no product record has the key desk/.test(rulesOf(gone.body, "promise-not-kept")[0]?.message ?? ""));
  write(v.dir, "product/desk.json", "{");
  const broken = run(v.dir);
  expect("an unreadable product record does not crash, and the promise is not kept", broken.status === 0 && broken.body && /not readable/.test(rulesOf(broken.body, "promise-not-kept")[0]?.message ?? ""), broken.stderr);
  write(v.dir, "products/desk.json", product);
  expect("a broken product/<id>.json is not hidden by products/<id>.json", /not readable/.test(rulesOf(run(v.dir).body, "promise-not-kept")[0]?.message ?? ""));
  rmSync(join(v.dir, "product/desk.json"));
  const legacy = run(v.dir);
  expect("products/<id>.json answers the key when product/<id>.json is absent", legacy.status === 0 && legacy.body.findings.length === 0, legacy.stdout);
  write(v.dir, "products/desk.json", { ...product, job: "Book a table", description: "Same-day is not here, but NEXT-DAY PICKUP is." });
  expect("the promise text matches job or description without case", run(v.dir).body.findings.length === 0);
  v.drop();
}

{
  const v = venture();
  write(v.dir, "foundation/icp.json", icp);
  write(v.dir, "product/desk.json", product);
  write(v.dir, "customers/bev.json", { id: "bev", name: "Bev" });
  const open = run(v.dir);
  expect("fail-open with a finding exits 0", open.status === 0 && open.body.ok === true && open.body.findings[0].mode === "fail-open");
  write(v.dir, "naive.config.json", { customers_lint: { rules: { "no-icp-match": { mode: "fail-closed" } } } });
  const closed = run(v.dir);
  expect("fail-closed with a finding exits 1", closed.status === 1 && closed.body.ok === false && closed.body.findings[0].mode === "fail-closed" && closed.body.findings[0].rule === "no-icp-match");
  write(v.dir, "customers/bev.json", { id: "bev", name: "Bev", icp: "shop-owners" });
  const closedQuiet = run(v.dir);
  expect("fail-closed with no finding exits 0", closedQuiet.status === 0 && closedQuiet.body.ok === true && closedQuiet.body.findings.length === 0);
  write(v.dir, "customers/ada.json", { id: "ada", name: "Ada", icp: "shop-owners", promises: [{ product: "desk", text: "same-day delivery" }] });
  write(v.dir, "naive.config.json", { customers_lint: { rules: { "promise-not-kept": { mode: "fail-closed" }, "no-icp-match": { mode: "fail-open" } } } });
  const onlyPromise = run(v.dir);
  expect("exit 1 only when the fail-closed rule is the one with findings", onlyPromise.status === 1 && rulesOf(onlyPromise.body, "promise-not-kept")[0].mode === "fail-closed" && rulesOf(onlyPromise.body, "no-icp-match").length === 0);
  write(v.dir, "customers/bev.json", { id: "bev", name: "Bev", icp: "shop-owners" });
  write(v.dir, "naive.config.json", { customers_lint: { rules: { "no-icp-match": { mode: "fail-closed" }, "promise-not-kept": { mode: "fail-open" } } } });
  const openPromise = run(v.dir);
  expect("a fail-open finding exits 0 when the fail-closed rule has none", openPromise.status === 0 && openPromise.body.ok === true && rulesOf(openPromise.body, "promise-not-kept").length === 1 && rulesOf(openPromise.body, "no-icp-match").length === 0 && rulesOf(openPromise.body, "promise-not-kept")[0].mode === "fail-open", openPromise.stdout);
  write(v.dir, "customers/cy.json", { id: "cy", name: "Cy" });
  write(v.dir, "naive.config.json", { customers_lint: { rules: { "no-icp-match": { mode: "closed" }, "promise-not-kept": { mode: "fail-closed" } } } });
  const badMode = run(v.dir);
  expect("a mode that is not fail-open or fail-closed keeps the default", badMode.status === 1 && rulesOf(badMode.body, "no-icp-match")[0].mode === "fail-open" && rulesOf(badMode.body, "promise-not-kept")[0].mode === "fail-closed");
  const text = cli(v.dir);
  expect("without --json a fail-closed finding prints FAIL and exits 1", text.status === 1 && /FAIL {2}\[promise-not-kept\]/.test(text.stdout) && /WARN {2}\[no-icp-match\]/.test(text.stdout));
  v.drop();
}

{
  const v = venture();
  write(v.dir, "foundation/icp.json", icp);
  write(v.dir, "product/desk.json", product);
  write(v.dir, "customers/ada.json", cleanCustomer);
  write(v.dir, "customers/bad.json", "{");
  write(v.dir, "customers/notes.txt", "not a record");
  const r = run(v.dir);
  expect("an unreadable customer is skipped and the readable one still lints", r.status === 0 && r.body.findings.length === 0, r.stderr);
  write(v.dir, "customers/ada.json", { id: "ada", name: "Ada", icp: "shop-owners", promises: "same-day delivery" });
  expect("a promise that is not a record is skipped, and the run does not crash", run(v.dir).status === 0 && run(v.dir).body.findings.length === 0);
  write(v.dir, "customers/ada.json", { id: "ada", name: "Ada", icp: "shop-owners", promises: [{ product: "../etc/passwd", text: "next-day pickup" }] });
  const escaped = run(v.dir);
  expect("a product key that is not an id is a finding and does not escape the venture", escaped.status === 0 && /not a product id/.test(rulesOf(escaped.body, "promise-not-kept")[0]?.message ?? ""), escaped.stderr);
  write(v.dir, "foundation/icp.json", "{");
  write(v.dir, "customers/ada.json", cleanCustomer);
  const badIcp = run(v.dir);
  expect("an unreadable ICP record does not crash, and the customer matches no profile", badIcp.status === 0 && badIcp.body && rulesOf(badIcp.body, "no-icp-match").length === 1, badIcp.stderr);
  rmSync(join(v.dir, "foundation/icp.json"));
  expect("a missing ICP record does not crash", run(v.dir).status === 0 && rulesOf(run(v.dir).body, "no-icp-match").length === 1);
  write(v.dir, "foundation/icp.json", icp);
  write(v.dir, "naive.config.json", "{");
  const badCfg = run(v.dir);
  expect("an unreadable naive.config.json does not crash and stays fail-open", badCfg.status === 0 && badCfg.body?.ok === true && badCfg.body.rules.every((x) => x.mode === "fail-open"), badCfg.stderr);
  write(v.dir, "naive.config.json", { customers_lint: { rules: "nope" } });
  expect("customers_lint.rules that is not an object keeps the defaults", run(v.dir).status === 0 && run(v.dir).body.rules.every((x) => x.mode === "fail-open"));
  rmSync(join(v.dir, "customers"), { recursive: true, force: true });
  write(v.dir, "customers", "not a directory");
  expect("a customers path that is not a directory does not crash", run(v.dir).status === 0 && run(v.dir).body.findings.length === 0);
  v.drop();
}

{
  const v = venture();
  write(v.dir, "purpose/icp.json", icp);
  write(v.dir, "product/desk.json", product);
  write(v.dir, "customers/ada.json", cleanCustomer);
  expect("purpose/icp.json answers when foundation/icp.json is absent", run(v.dir).body.findings.length === 0);
  write(v.dir, "foundation/icp.json", { venture: "shop", profiles: [{ id: "shop-owners", who: "Owners", status: "retired" }] });
  expect("a retired profile does not match", rulesOf(run(v.dir).body, "no-icp-match").length === 1);
  rmSync(join(v.dir, "foundation/icp.json"));
  rmSync(join(v.dir, "purpose/icp.json"));
  write(v.dir, "foundation/icp/shop-owners.json", { id: "shop-owners", who: "Owners of two-to-ten-person shops", primary: true });
  expect("one file per profile in foundation/icp matches", run(v.dir).body.findings.length === 0);
  v.drop();
}

{
  const v = venture("structured");
  write(v.dir, "k-base/foundation/icp.json", icp);
  write(v.dir, "k-base/product/desk.json", product);
  write(v.dir, "k-base/customers/ada.json", cleanCustomer);
  write(v.dir, "customers/ada.json", { id: "ada", name: "Ada", icp: "not-a-profile" });
  const quiet = run(v.dir);
  expect("a structured venture is read through its logical paths, not a file left at the root", quiet.status === 0 && quiet.body.findings.length === 0, quiet.stdout);
  write(v.dir, "meta/naive.config.json", { customers_lint: { rules: { "no-icp-match": { mode: "fail-closed" } } } });
  write(v.dir, "k-base/customers/ada.json", { id: "ada", name: "Ada" });
  const closed = run(v.dir);
  expect("the mode override in a structured venture's meta/naive.config.json exits 1", closed.status === 1 && closed.body.findings[0]?.mode === "fail-closed" && closed.body.findings[0]?.file === "customers/ada.json", closed.stdout);
  v.drop();
}

{
  const v = venture();
  const cfg = { customers_lint: { rules: { "no-icp-match": { mode: "fail-closed" }, "promise-not-kept": { mode: "fail-open" } } } };
  write(v.dir, "naive.config.json", cfg);
  const scratch = join(v.root, "cfg.json");
  writeFileSync(scratch, JSON.stringify(cfg));
  const valid = spawnSync(process.execPath, [join(repo, "packages/naive/src/records/validate.mjs"), "--schema", "naive-config.schema.json", "--file", scratch], { encoding: "utf8" });
  expect("customers_lint.rules.<id>.mode is valid in naive.config.json", valid.status === 0, valid.stdout + valid.stderr);
  v.drop();
}

{
  const usage = spawnSync("node", [join(repo, "packages/naive/src/checks/lint-customers.mjs")], { encoding: "utf8" });
  const missing = run(join(tmpdir(), "lint-customers-no-such-venture"));
  expect("no venture directory exits 2", usage.status === 2 && missing.status === 2);
  const table = routes().find((r) => r.route === "customers/lint");
  expect("customers/lint is a command route on packages/naive/src/checks/lint-customers.mjs", table?.kind === "command" && table.script === "packages/naive/src/checks/lint-customers.mjs" && table.actions.includes("run"));
}

{
  const v = venture();
  write(v.dir, "foundation/icp.json", icp);
  write(v.dir, "product/desk.json", product);
  write(v.dir, "customers/bev.json", { id: "bev", name: "Bev", icp: "clinics" });
  const answered = await call({ venture: "shop", route: "customers/lint", action: "run", workspace: v.root, via: "cli" });
  expect("the route runs the lint and returns the finding", answered.ok === true && answered.result.findings.some((x) => x.rule === "no-icp-match" && x.mode === "fail-open"), answered.error ?? answered.result);
  v.drop();
}

{
  const relay = join(repo, "packages/naive/src/records/examples/software/ventures/relay");
  const r = run(relay);
  expect("the software example lints without crashing", r.status === 0 && r.body?.ok === true, r.stderr || r.stdout);
}

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
