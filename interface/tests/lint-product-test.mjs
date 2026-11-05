#!/usr/bin/env node
// Product lint on made-up ventures in a temp folder. Each rule fires on one fixture, a clean
// venture stays silent, and naive.config.json product_lint.rules.<id>.mode is what fails the run.
// Never writes into the repo.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../router.mjs";
import { ventureFile } from "../../packages/core/venture-paths.mjs";

const repo = new URL("../..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); if (!ok) failed++; };

const JOB = "Run the shop without a back office";
const icp = () => ({ venture: "acme", profiles: [{ id: "shop-owners", who: "Owners of small shops", primary: true, jobs: [JOB] }] });
const pricing = (product = "shop") => ({ venture: "acme", product, model: "subscription", buyer: "The shop owner", evidence: [] });
const card = (over = {}) => ({ id: "shop", name: "Shop", description: "Bookings for a small shop", offered_to: ["shop-owners"], features: [{ id: "bookings", name: "Bookings", job: JOB }], business_model: ["subscription"], ...over });

function venture(layout) {
  const root = mkdtempSync(join(tmpdir(), "lint-product-"));
  const dir = join(root, "acme");
  mkdirSync(dir, { recursive: true });
  const body = {
    id: "acme", name: "Acme", parent: null, phase: "validation", owner: "self", status: "active",
    layers: { purpose: false, knowledge: false, operations: false, evidence: false, governance: false, interface: false },
  };
  if (layout === "structured") body.layout = "structured";
  writeFileSync(join(dir, "venture.json"), JSON.stringify(body, null, 2) + "\n");
  return { root, dir };
}
const put = (dir, rel, obj) => {
  const f = ventureFile(dir, rel);
  mkdirSync(join(f, ".."), { recursive: true });
  writeFileSync(f, typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) + "\n");
  return f;
};
const run = (dir, ...extra) => spawnSync("node", [join(repo, "schema/lint-product.mjs"), dir, ...extra], { encoding: "utf8" });
const json = (r) => { try { return JSON.parse(r.stdout); } catch { return null; } };
const rules = (r) => new Set((json(r)?.findings ?? []).map((x) => x.rule));

// One fixture: one product that breaks every rule. Fail-open, so the run exits 0.
{
  const { dir } = venture();
  put(dir, "product/shop.json", card({ offered_to: [], features: [{ id: "bookings", name: "Bookings" }], business_model: ["subscription"] }));
  const r = run(dir, "--json");
  const got = rules(r);
  expect("one fixture fires each rule", r.status === 0 && got.size === 3 && ["product-no-icp", "feature-no-job", "business-model-no-pricing"].every((id) => got.has(id)), r.stdout + r.stderr);
  expect("findings name the file, the mode and a suggestion", json(r).findings.every((x) => x.file === "product/shop.json" && x.mode === "fail-open" && x.message && x.suggestion), json(r));
}

// A clean venture: the ICP job is read by key, the feature serves it, and pricing names the product.
{
  const { dir } = venture();
  const file = put(dir, "product/shop.json", card());
  const before = readFileSync(file, "utf8");
  put(dir, "foundation/icp.json", icp());
  put(dir, "validation/pricing.json", pricing());
  const r = run(dir, "--json");
  expect("a clean venture is silent", r.status === 0 && json(r).findings.length === 0 && json(r).ok === true, r.stdout + r.stderr);
  expect("lint does not copy foundation records onto the product", readFileSync(file, "utf8") === before);
  put(dir, "foundation/icp.json", { venture: "acme", profiles: [{ id: "shop-owners", who: "Owners of small shops", primary: true, jobs: ["A different job"] }] });
  const again = run(dir, "--json");
  expect("changing the ICP job, not the product, makes the feature rule fire", again.status === 0 && [...rules(again)].join() === "feature-no-job", again.stdout);
  expect("the product file still has no copy of the ICP", readFileSync(file, "utf8") === before);
}

// The mode override is the only thing that fails the run.
{
  const { dir } = venture();
  put(dir, "foundation/icp.json", icp());
  put(dir, "product/shop.json", card({ features: [{ id: "payroll", name: "Payroll", job: "Not a job they have" }] }));
  put(dir, "validation/pricing.json", pricing());
  put(dir, "naive.config.json", { product_lint: { rules: { "product-no-icp": { mode: "fail-closed" }, "feature-no-job": { mode: "fail-open" } } } });
  const open = run(dir, "--json");
  expect("a fail-closed rule with no finding stays exit 0", open.status === 0 && json(open).ok && [...rules(open)].join() === "feature-no-job", open.stdout + open.stderr);
  put(dir, "naive.config.json", { product_lint: { rules: { "feature-no-job": { mode: "fail-closed" } } } });
  const shut = run(dir, "--json");
  expect("exit 1 only when a fail-closed rule has a finding", shut.status === 1 && json(shut).ok === false && json(shut).findings[0].mode === "fail-closed", shut.stdout + shut.stderr);
  const schema = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "naive-config.schema.json", "--file", ventureFile(dir, "naive.config.json")], { encoding: "utf8" });
  expect("product_lint.rules is a valid naive.config.json key", schema.status === 0, schema.stdout + schema.stderr);
  put(dir, "naive.config.json", { product_lint: { rules: { "feature-no-job": { mode: "strict" } } } });
  const ignored = run(dir, "--json");
  expect("a mode other than fail-open or fail-closed keeps the default", ignored.status === 0 && json(ignored).findings[0].mode === "fail-open", ignored.stdout);
}

// Missing and malformed records never crash, and a sibling card is still judged.
{
  const { dir } = venture();
  const empty = run(dir, "--json");
  expect("a venture with no product records is silent", empty.status === 0 && json(empty).findings.length === 0, empty.stdout + empty.stderr);
  put(dir, "product/broken.json", "{");
  put(dir, "foundation/icp.json", "{");
  put(dir, "validation/pricing.json", "[");
  put(dir, "naive.config.json", "not json");
  put(dir, "product/shop.json", card({ offered_to: ["shop-owners"], features: [], business_model: ["subscription"] }));
  const bad = run(dir, "--json");
  expect("malformed ICP, pricing, config and a broken card do not crash", bad.status === 0 && json(bad) && [...rules(bad)].sort().join() === "business-model-no-pricing,product-no-icp", bad.stdout + bad.stderr);
  expect("usage fails closed when the directory is not a venture", run(join(dir, "nope")).status === 2);
}

// Inherited records are read by key from wherever the venture keeps them.
{
  const { dir } = venture("structured");
  put(dir, "foundation/icp/shop-owners.json", { id: "shop-owners", who: "Owners of small shops", jobs: [JOB] });
  put(dir, "products/shop.json", card({ business_model: ["subscription", "add-on"] }));
  put(dir, "purpose/validation/pricing.json", pricing());
  const r = run(dir, "--json");
  expect("a structured venture is read through ventureFile and stays silent", r.status === 0 && json(r).findings.length === 0, r.stdout + r.stderr);
  put(dir, "foundation/icp/shop-owners.json", { id: "shop-owners", who: "Owners of small shops", jobs: [JOB], status: "retired" });
  const retired = run(dir, "--json");
  expect("a product offered only to a retired ICP has no ICP", [...rules(retired)].includes("product-no-icp"), retired.stdout);
}

// The product's own job string is not a feature. A feature with no job field is.
{
  const { dir } = venture();
  put(dir, "foundation/icp.json", icp());
  put(dir, "validation/pricing.json", pricing());
  put(dir, "product/shop.json", card({ job: "Some other wording", features: [{ id: "payroll", name: "Payroll" }] }));
  const r = run(dir, "--json");
  expect("a feature with no job fires, and the product job string does not", [...rules(r)].join() === "feature-no-job", r.stdout);
  const valid = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "product.schema.json", "--file", ventureFile(dir, "product/shop.json")], { encoding: "utf8" });
  expect("a product card with features still matches the product schema", valid.status === 0, valid.stdout + valid.stderr);
}

// The route runs the same lint.
{
  const { root, dir } = venture();
  put(dir, "foundation/icp.json", icp());
  put(dir, "product/shop.json", card({ business_model: [] }));
  const ok = await call({ venture: "acme", route: "product/lint", action: "run", workspace: root });
  expect("route product/lint returns no findings when the venture is clean", ok.ok && ok.result.findings.length === 0, ok);
  put(dir, "naive.config.json", { product_lint: { rules: { "product-no-icp": { mode: "fail-closed" } } } });
  put(dir, "product/shop.json", card({ offered_to: [], business_model: [], features: [] }));
  const shut = await call({ venture: "acme", route: "product/lint", action: "run", workspace: root });
  expect("route product/lint fails when a fail-closed rule has a finding", shut.ok === false && /product-no-icp/.test(shut.error ?? ""), shut);
}

{
  const { dir } = venture();
  put(dir, "product/old.json", card({ id: "old", status: "retired", offered_to: [], features: [{ id: "bookings", name: "Bookings" }], business_model: ["subscription"] }));
  const r = JSON.parse(run(dir, "--json").stdout);
  expect("a retired product is not linted", r.findings.length === 0, r.findings);
}

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
