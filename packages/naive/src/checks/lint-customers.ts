#!/usr/bin/env node
// Customers lint: customer records held to the ICP profiles they match and to the product
// records their promises name.
//
//   node packages/naive/src/checks/lint-customers.ts <venture dir> [--json]
//
// Rules are fail-open (warn) by default. naive.config.json customers_lint.rules.<id>.mode set to
// "fail-closed" makes a rule's findings fail the run (exit 1).
//
// A customer matches an ICP when its icp is a profile id in foundation/icp (one file per profile,
// or foundation/icp.json, or the older purpose/icp.json). A promise is { product, text } on the
// customer (promises, or one promise). The product record is read by that key, product/<id>.json
// then products/<id>.json, through ventureFile, on this run. It keeps the promise when its job or
// description still contains the text and its status is not retired. A later edit to the product
// is what the next run sees. The lint does not copy the product onto the customer.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";

const PRODUCT_ID = /^[a-z0-9-]+$/;

// A JSON object from a record that may be malformed: every field is unknown until checked. The generated record
// types describe valid records, and this lint reads any.
type Loose = { readonly [key: string]: unknown };
const isLoose = (v: unknown): v is Loose => !!v && typeof v === "object" && !Array.isArray(v);
/** A JSON file read, or why it was not. */
type Read = { status: "ok", record: unknown } | { status: "malformed" } | { status: "missing" };
/** One lint finding. */
export type Finding = { rule: string, mode: string, file: string, message: string, suggestion: string };

export const RULES = [
  { id: "no-icp-match", description: "A customer that matches no ICP", severity: "warn", mode: "fail-open" },
  { id: "promise-not-kept", description: "A promise to a customer the product does not keep", severity: "warn", mode: "fail-open" },
];

function readJson(dir: string, rel: string): Read {
  const p = ventureFile(dir, rel);
  try {
    if (!existsSync(p) || !statSync(p).isFile()) return existsSync(p) ? { status: "malformed" } : { status: "missing" };
    return { status: "ok", record: JSON.parse(readFileSync(p, "utf8")) };
  } catch {
    return { status: "malformed" };
  }
}

function listJson(dir: string, rel: string): string[] {
  const p = ventureFile(dir, rel);
  try {
    if (!existsSync(p) || !statSync(p).isDirectory()) return [];
    return readdirSync(p).filter((name) => name.endsWith(".json") && !name.startsWith(".") && !name.startsWith("_")).sort();
  } catch {
    return [];
  }
}

function addProfile(ids: Set<string>, value: unknown) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const p of value as unknown[]) addProfile(ids, p); return; }
  const rec = value as Loose;
  if (Array.isArray(rec.profiles)) { for (const p of rec.profiles as unknown[]) addProfile(ids, p); return; }
  if (typeof rec.id === "string" && rec.status !== "retired") ids.add(rec.id.trim().replace(/^icp:/i, ""));
}

/** Profile ids the venture still has. A missing or unreadable record contributes none. */
function profileIds(dir: string) {
  const ids = new Set<string>();
  const files = listJson(dir, "foundation/icp");
  if (files.length) {
    for (const f of files) {
      const got = readJson(dir, `foundation/icp/${f}`);
      if (got.status === "ok") addProfile(ids, got.record);
    }
    return ids;
  }
  for (const rel of ["foundation/icp.json", "purpose/icp.json"]) {
    const got = readJson(dir, rel);
    if (got.status === "missing") continue;
    if (got.status === "ok") addProfile(ids, got.record);
    return ids;
  }
  return ids;
}

function modesOf(dir: string) {
  const got = readJson(dir, "naive.config.json");
  const block = got.status === "ok" && isLoose(got.record) ? got.record.customers_lint : null;
  const rules: Loose = isLoose(block) && isLoose(block.rules) ? block.rules : {};
  return RULES.map((r) => {
    const entry = rules[r.id];
    const mode = entry && typeof entry === "object" ? (entry as { mode?: unknown }).mode : undefined;
    return { ...r, mode: mode === "fail-open" || mode === "fail-closed" ? mode : r.mode };
  });
}

function namedIcp(customer: Loose) {
  if (typeof customer.icp !== "string") return null;
  const id = customer.icp.trim().replace(/^icp:/i, "");
  return id || null;
}

function promisesOf(customer: Loose) {
  const raw = Object.hasOwn(customer, "promises") ? customer.promises : Object.hasOwn(customer, "promise") ? [customer.promise] : [];
  if (!Array.isArray(raw)) return [];
  const out: { product: string, text: string }[] = [];
  for (const p of raw as unknown[]) {
    if (!isLoose(p) || typeof p.product !== "string" || typeof p.text !== "string") continue;
    const product = p.product.trim();
    const text = p.text.trim();
    if (product && text) out.push({ product, text });
  }
  return out;
}

function productByKey(dir: string, id: string): { status: "missing" } | (Exclude<Read, { status: "missing" }> & { file: string }) {
  for (const rel of [`product/${id}.json`, `products/${id}.json`]) {
    const got = readJson(dir, rel);
    if (got.status !== "missing") return { ...got, file: rel };
  }
  return { status: "missing" };
}

function keeps(record: unknown, text: string) {
  if (!isLoose(record) || record.status === "retired") return false;
  const hay = [record.job, record.description].filter((x) => typeof x === "string").join("\n").toLowerCase();
  return hay.includes(text.toLowerCase());
}

function promiseProblem(dir: string, { product, text }: { product: string, text: string }) {
  if (!PRODUCT_ID.test(product)) {
    return { message: `promises "${text}" of product key "${product}", which is not a product id`, suggestion: "name the product's id, a record at product/<id>.json" };
  }
  const got = productByKey(dir, product);
  if (got.status === "missing") {
    return { message: `promises "${text}", and no product record has the key ${product}`, suggestion: `add product/${product}.json, or take the promise off the customer` };
  }
  if (got.status !== "ok" || !isLoose(got.record)) {
    return { message: `promises "${text}" of ${product}, and ${got.file} is not readable`, suggestion: `fix ${got.file} so it is a JSON product record` };
  }
  if (got.record.status === "retired") {
    return { message: `promises "${text}", and ${got.file} is retired so the product does not keep it`, suggestion: "point the promise at a product that is not retired, or take the promise off the customer" };
  }
  if (!keeps(got.record, text)) {
    return { message: `promises "${text}", which ${got.file} does not keep`, suggestion: `put "${text}" in that product's job or description, or take the promise off the customer` };
  }
  return null;
}

export function lint(dir: string) {
  const rules = modesOf(dir);
  const mode = Object.fromEntries(rules.map((r) => [r.id, r.mode]));
  const findings: Finding[] = [];
  const add = (rule: string, file: string, message: string, suggestion: string) => findings.push({ rule, mode: mode[rule], file, message, suggestion });
  const ids = profileIds(dir);
  for (const name of listJson(dir, "customers")) {
    const rel = `customers/${name}`;
    const got = readJson(dir, rel);
    if (got.status !== "ok" || !isLoose(got.record)) continue;
    const icp = namedIcp(got.record);
    if (!icp || !ids.has(icp)) add("no-icp-match", rel, icp ? `matches no ICP: "${icp}" is not a profile` : "matches no ICP: no icp profile is named", "set icp to a profile id from foundation/icp");
    for (const promise of promisesOf(got.record)) {
      const problem = promiseProblem(dir, promise);
      if (problem) add("promise-not-kept", rel, problem.message, problem.suggestion);
    }
  }
  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, rules, findings };
}

export { customersLintCommands } from "../records/routes/commands.ts";

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(ventureFile(dir, "venture.json"))) { console.error("usage: node packages/naive/src/checks/lint-customers.ts <venture dir> [--json]"); process.exit(2); }
  const r = lint(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}
