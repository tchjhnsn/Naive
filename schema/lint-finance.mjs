#!/usr/bin/env node
// Finance lint: spend decisions, prices and metrics held to the records finance reads.
//
//   node schema/lint-finance.mjs <venture dir> [--json]
//
// Route: finance/lint. Rules are fail-open (warn) by default. naive.config.json
// finance_lint.rules.<id>.mode set to "fail-closed" makes that rule's findings fail the run (exit 1).
// Every record is read through ventureFile. A missing or malformed record adds no finding and does not throw.
//
// Records:
//   venture.json                         phase (discovery, validation, beachhead, scale, platform)
//   naive.config.json                    finance_lint.rules.<id>.mode
//   **/decisions/*.decision.json         a spend decision: id or question says spend
//   validation/pricing.json              price points (amount). purpose/validation/pricing.json is the older path
//   finance/costs.json                   optional cost by point name, when the point has no cost of its own
//   finance/metrics.json                 metrics and a numeric target per phase

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { logical, ventureFile } from "../packages/core/venture-paths.mjs";

const PHASES = ["discovery", "validation", "beachhead", "scale", "platform"];
const PRICING = ["validation/pricing.json", "purpose/validation/pricing.json"];
const COSTS = "finance/costs.json";
const METRICS = "finance/metrics.json";

const load = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const asText = (v) => (typeof v === "string" ? v : Array.isArray(v) ? v.filter((x) => typeof x === "string").join("\n") : "");

export const RULES = [
  { id: "spend-no-runway", description: "A spend decision with no runway impact", severity: "warn", mode: "fail-open" },
  { id: "price-below-cost", description: "A price below cost", severity: "warn", mode: "fail-open" },
  { id: "metric-no-target", description: "A metric with no target for the current phase", severity: "warn", mode: "fail-open" },
];

const SPEND_ID = /(^|[.-])spend([.-]|$)/i;
const SPEND_WORD = /\b(spend|spending)\b/i;

// Every decisions/*.decision.json under the venture, skipping hidden folders, drafts, code and nested ventures.
function decisionFiles(dir) {
  const out = [];
  const walk = (d, depth) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (/^[._]/.test(e.name) || ["node_modules", "repo", "codebase"].includes(e.name)) continue;
        if (depth > 0 && existsSync(join(p, "venture.json"))) continue;
        walk(p, depth + 1);
      } else if (e.name.endsWith(".decision.json") && d.split("/").at(-1) === "decisions") out.push(p);
    }
  };
  walk(dir, 0);
  return out.sort();
}

function phaseOf(venture) {
  const phase = venture && typeof venture === "object" ? venture.phase : undefined;
  return PHASES.includes(phase) ? phase : null;
}

function modesOf(config) {
  const cfg = config && typeof config === "object" ? config.finance_lint?.rules : undefined;
  const rules = RULES.map((r) => {
    const mode = cfg && typeof cfg === "object" ? cfg[r.id]?.mode : undefined;
    return { ...r, mode: mode === "fail-open" || mode === "fail-closed" ? mode : r.mode };
  });
  return { rules, mode: Object.fromEntries(rules.map((r) => [r.id, r.mode])) };
}

// A spend decision names spend in its id or question. Withdrawn decisions are closed and are not checked.
function isSpend(d) {
  if (!d || typeof d !== "object" || Array.isArray(d) || d.status === "withdrawn") return false;
  const id = typeof d.id === "string" ? d.id : "";
  const question = typeof d.question === "string" ? d.question : "";
  return SPEND_ID.test(id) || SPEND_WORD.test(id) || SPEND_WORD.test(question);
}

// Runway impact is said in the answer, the note or an option: the word runway, or a citation of the money summary.
function hasRunwayImpact(d) {
  const text = [asText(d.answer), asText(d.note), asText(d.options)].join("\n");
  return /\brunway\b/i.test(text) || /money\/_summary\.json/.test(text) || /purpose\/money\/summary/.test(text);
}

function costList(record) {
  if (Array.isArray(record)) return record;
  if (record && typeof record === "object" && Array.isArray(record.costs)) return record.costs;
  if (record && typeof record === "object" && Array.isArray(record.points)) return record.points;
  return [];
}

function costsByName(record) {
  const map = new Map();
  for (const item of costList(record)) {
    if (!item || typeof item !== "object" || typeof item.name !== "string") continue;
    const amount = num(item.amount ?? item.cost);
    if (amount == null) continue;
    map.set(item.name, { amount, currency: typeof item.currency === "string" ? item.currency : null });
  }
  return map;
}

function priceFindings(dir, add) {
  const costs = costsByName(load(ventureFile(dir, COSTS)));
  const seen = new Set();
  for (const rel of PRICING) {
    const record = load(ventureFile(dir, rel));
    if (!record || typeof record !== "object" || seen.has(rel)) continue;
    seen.add(rel);
    const points = Array.isArray(record.points) ? record.points : [];
    for (const pt of points) {
      if (!pt || typeof pt !== "object") continue;
      const price = num(pt.amount);
      let cost = num(pt.cost);
      let costCurrency = typeof pt.currency === "string" ? pt.currency : null;
      if (cost == null && typeof pt.name === "string" && costs.has(pt.name)) {
        const c = costs.get(pt.name);
        cost = c.amount;
        costCurrency = c.currency ?? costCurrency;
      }
      if (price == null || cost == null) continue;
      const priceCurrency = typeof pt.currency === "string" ? pt.currency : null;
      if (priceCurrency && costCurrency && priceCurrency !== costCurrency) continue;
      if (price < cost) {
        const name = typeof pt.name === "string" && pt.name ? pt.name : "a point";
        add("price-below-cost", rel, `${name} is priced at ${price}, below its cost of ${cost}`, "Raise the price to the cost, or correct the cost");
      }
    }
  }
}

function metricFindings(dir, phase, add) {
  if (!phase) return;
  const record = load(ventureFile(dir, METRICS));
  if (!record || typeof record !== "object" || Array.isArray(record)) return;
  const list = Array.isArray(record.metrics) ? record.metrics : [];
  for (const metric of list) {
    if (!metric || typeof metric !== "object" || typeof metric.id !== "string" || !metric.id) continue;
    const targets = metric.targets && typeof metric.targets === "object" && !Array.isArray(metric.targets) ? metric.targets : {};
    const target = targets[phase];
    if (typeof target === "number" && Number.isFinite(target)) continue;
    add("metric-no-target", METRICS, `${metric.id} has no numeric target for ${phase}`, `Set targets.${phase} to the number ${metric.id} should hit in ${phase}`);
  }
}

export function lint(dir) {
  const { rules, mode } = modesOf(load(ventureFile(dir, "naive.config.json")));
  const phase = phaseOf(load(ventureFile(dir, "venture.json")));
  const findings = [];
  const add = (rule, file, message, suggestion) => findings.push({ rule, mode: mode[rule], file, message, suggestion });

  const seen = new Set();
  for (const abs of decisionFiles(dir)) {
    const rel = logical(dir, relative(dir, abs)).split(sep).join("/");
    if (!rel || seen.has(rel)) continue;
    seen.add(rel);
    const d = load(ventureFile(dir, rel));
    if (!isSpend(d)) continue;
    if (!hasRunwayImpact(d)) add("spend-no-runway", rel, "spend decision does not say what it does to runway", "Say the runway impact in the answer, and cite money/_summary.json");
  }
  priceFindings(dir, add);
  metricFindings(dir, phase, add);

  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, phase, rules, findings };
}

export { financeCommands } from "../packages/routes/commands.mjs";

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(ventureFile(dir, "venture.json"))) {
    console.error("usage: node schema/lint-finance.mjs <venture dir> [--json]");
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
