#!/usr/bin/env node
// Product alignment lint: product cards held to the foundation they inherit.
//
//   node packages/naive/src/checks/lint-product.mjs <venture dir> [--json]
//
// Rules are fail-open (warn) by default. naive.config.json product_lint.rules.<id>.mode set to
// "fail-closed" makes that rule's findings fail the run (exit 1).
//
// Every input is read through ventureFile. ICP profiles are read by key (icp:<id>) and a pricing
// record by key (pricing:<product id>). This module never copies those records onto the product.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";

const load = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const read = (dir, rel) => { const f = ventureFile(dir, rel); return existsSync(f) ? load(f) : null; };

export const RULES = [
  { id: "product-no-icp", description: "A product with no ICP it is offered to", severity: "warn", mode: "fail-open" },
  { id: "feature-no-job", description: "A feature that serves no job", severity: "warn", mode: "fail-open" },
  { id: "business-model-no-pricing", description: "A business model with no pricing record", severity: "warn", mode: "fail-open" },
];

function listJson(dir, rel) {
  const d = ventureFile(dir, rel);
  if (!existsSync(d)) return [];
  try {
    return readdirSync(d, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith(".json")).map((e) => e.name).sort();
  } catch { return []; }
}

const profilesOf = (rec) => {
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) return [];
  if (Array.isArray(rec.profiles)) return rec.profiles.filter((p) => p && typeof p === "object" && !Array.isArray(p));
  return typeof rec.id === "string" ? [rec] : [];
};

/** Foundation ICP profiles and pricing records, keyed. Missing or unreadable files add no keys. */
export function inputs(dir) {
  const out = {};
  const folder = listJson(dir, "foundation/icp");
  const profiles = folder.length
    ? folder.flatMap((name) => profilesOf(read(dir, `foundation/icp/${name}`)))
    : profilesOf(read(dir, "foundation/icp.json") ?? read(dir, "purpose/icp.json"));
  for (const p of profiles) {
    if (typeof p.id !== "string" || !p.id || p.status === "retired") continue;
    const jobs = Array.isArray(p.jobs) ? p.jobs.filter((j) => typeof j === "string" && j) : [];
    out[`icp:${p.id}`] = { jobs, route: folder.length ? `foundation/icp/${p.id}` : "foundation/icp" };
  }
  for (const rel of ["validation/pricing.json", "purpose/validation/pricing.json"]) {
    const p = read(dir, rel);
    if (!p || typeof p !== "object" || Array.isArray(p) || typeof p.product !== "string" || !p.product) continue;
    const key = `pricing:${p.product}`;
    if (!out[key]) out[key] = { route: "validation/pricing", file: rel };
  }
  return out;
}

function productFiles(dir) {
  const out = [];
  for (const folder of ["product", "products"]) {
    for (const name of listJson(dir, folder)) {
      if (name.startsWith("anatomy")) continue;
      const rel = `${folder}/${name}`;
      const rec = read(dir, rel);
      if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
      if (typeof rec.id !== "string" && typeof rec.name !== "string") continue;
      out.push({ rel, rec });
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

function ruleModes(dir) {
  const raw = read(dir, "naive.config.json");
  const block = raw && typeof raw === "object" && !Array.isArray(raw) ? raw.product_lint : null;
  const rules = block && typeof block === "object" && !Array.isArray(block) ? block.rules : null;
  const cfg = rules && typeof rules === "object" && !Array.isArray(rules) ? rules : {};
  return RULES.map((r) => ({ ...r, mode: ["fail-open", "fail-closed"].includes(cfg[r.id]?.mode) ? cfg[r.id].mode : r.mode }));
}

const strings = (v) => Array.isArray(v) ? v.filter((x) => typeof x === "string" && x) : [];

/** Findings for one venture. A missing or malformed record is skipped; it never throws. */
export function lint(dir) {
  const rules = ruleModes(dir);
  const mode = Object.fromEntries(rules.map((r) => [r.id, r.mode]));
  const found = inputs(dir);
  const findings = [];
  const add = (rule, file, message, suggestion) => findings.push({ rule, mode: mode[rule], file, message, suggestion });

  for (const { rel, rec } of productFiles(dir)) {
    if (rec.status === "retired") continue;
    const offered = strings(rec.offered_to).filter((id) => found[`icp:${id}`]);
    const jobs = new Set(offered.flatMap((id) => found[`icp:${id}`].jobs));
    if (!offered.length) add("product-no-icp", rel, "offered to no ICP profile", "set offered_to to an id from foundation/icp");
    for (const feature of Array.isArray(rec.features) ? rec.features : []) {
      if (!feature || typeof feature !== "object" || Array.isArray(feature)) continue;
      const name = typeof feature.name === "string" && feature.name ? feature.name : (typeof feature.id === "string" ? feature.id : "feature");
      const job = typeof feature.job === "string" ? feature.job : "";
      if (!job || !jobs.has(job)) add("feature-no-job", rel, `feature "${name}" serves no job of an ICP it is offered to`, "set its job to a job on one of those ICP profiles");
    }
    const id = typeof rec.id === "string" ? rec.id : "";
    if (strings(rec.business_model).length && !(id && found[`pricing:${id}`])) {
      for (const model of strings(rec.business_model)) add("business-model-no-pricing", rel, `business model "${model}" has no pricing record`, "write validation/pricing for this product");
    }
  }
  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, rules, findings };
}

export { productCommands } from "../records/routes/commands.mjs";

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/checks/lint-product.mjs <venture dir> [--json]"); process.exit(2); }
  const r = lint(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}
