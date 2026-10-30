// Finance lint (schema/lint-finance.mjs, route finance/lint).
// One venture breaks every rule. The other cases replay the model: a clean venture stays silent,
// phase changes the metric rule, finance_lint.rules.<id>.mode decides the exit code, and missing
// or malformed records (including a missing price or cost) do not throw. Reads go through ventureFile.
//
//   node schema/lint-finance-test.mjs

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { call } from "../interface/router.mjs";

const root = new URL("..", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "lint-finance-"));
const script = join(root, "schema/lint-finance.mjs");
let failed = 0;
const expect = (name, ok) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failed++; };

const run = (dir, extra = []) => spawnSync("node", [script, dir, ...extra], { encoding: "utf8" });
const json = (dir) => { const r = run(dir, ["--json"]); let body = null; try { body = JSON.parse(r.stdout); } catch { body = null; } return { ...r, body }; };
const ids = (r) => (r.body?.findings ?? []).map((f) => f.rule);

function write(dir, rel, body) {
  const p = join(dir, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, typeof body === "string" ? body : JSON.stringify(body, null, 2));
}

/**
 * @param {string} name
 * @param {Record<string, unknown>} files
 * @param {{ phase?: string, layout?: string, config?: object, configAt?: string }} [options]
 */
function venture(name, files, { phase = "validation", layout, config, configAt } = {}) {
  const dir = join(tmp, name);
  mkdirSync(dir, { recursive: true });
  const v = { id: name, name, phase };
  if (layout) v.layout = layout;
  write(dir, "venture.json", v);
  if (config) write(dir, configAt ?? "naive.config.json", config);
  for (const [rel, body] of Object.entries(files)) write(dir, rel, body);
  return dir;
}

const spend = (extra = {}) => ({ id: "spend-ads", question: "Spend 5000 on ads this month?", status: "open", ...extra });
const price = (amount, cost, extra = {}) => ({ venture: "v", product: "app", model: "subscription", buyer: "the buyer", evidence: [], points: [{ name: "Pro", amount, currency: "USD", ...(cost == null ? {} : { cost }), ...extra }] });
const metric = (targets) => ({ metrics: [{ id: "gross-margin", targets }] });

// The one fixture that must fail each rule.
const broke = venture("broke", {
  "decisions/spend-ads.decision.json": spend({ answer: "Yes, buy the ads." }),
  "validation/pricing.json": price(40, 55),
  "finance/metrics.json": metric({ discovery: 0.4 }),
});
const brokeRun = json(broke);
expect("one fixture fails each rule", brokeRun.status === 0 && brokeRun.body?.ok === true
  && ["spend-no-runway", "price-below-cost", "metric-no-target"].every((id) => ids(brokeRun).includes(id))
  && brokeRun.body.findings.every((f) => f.mode === "fail-open" && f.file && f.message && f.suggestion));

const clean = venture("clean", {
  "decisions/spend-ads.decision.json": spend({ answer: "Yes. Runway goes from 14 months to 11 (money/_summary.json)." }),
  "validation/pricing.json": price(80, 55),
  "finance/metrics.json": metric({ discovery: 0.4, validation: 0.5, beachhead: 0.6, scale: 0.7, platform: 0.8 }),
});
expect("a clean venture stays silent", json(clean).status === 0 && ids(json(clean)).length === 0);

const empty = venture("empty", {});
expect("a venture with none of these records stays silent", json(empty).status === 0 && ids(json(empty)).length === 0);

// Phase: the same metric is silent in a phase it targets and fires after the phase changes.
const phased = venture("phased", { "finance/metrics.json": metric({ validation: 0.5 }) }, { phase: "validation" });
expect("a metric with a target for the current phase stays silent", json(phased).status === 0 && !ids(json(phased)).includes("metric-no-target"));
for (const phase of ["discovery", "beachhead", "scale", "platform"]) {
  write(phased, "venture.json", { id: "phased", name: "phased", phase });
  const r = json(phased);
  expect(`phase ${phase} with no target fires metric-no-target`, r.status === 0 && ids(r).includes("metric-no-target") && r.body.phase === phase);
}
write(phased, "venture.json", { id: "phased", name: "phased", phase: "validation" });
expect("moving back to a phase that has a target clears the finding", !ids(json(phased)).includes("metric-no-target"));
write(phased, "finance/metrics.json", metric({ validation: 0 }));
expect("a target of zero counts for the current phase", !ids(json(phased)).includes("metric-no-target"));

// Exit code: 1 if and only if a fail-closed rule has findings.
const priced = venture("priced", { "validation/pricing.json": price(40, 55) });
expect("fail-open findings exit 0", run(priced).status === 0 && /ok/.test(run(priced).stdout));
write(priced, "naive.config.json", { finance_lint: { rules: { "price-below-cost": { mode: "fail-closed" } } } });
const closed = json(priced);
expect("fail-closed with a finding exits 1", closed.status === 1 && closed.body?.ok === false && closed.body?.findings?.[0]?.mode === "fail-closed");
write(priced, "naive.config.json", { finance_lint: { rules: { "spend-no-runway": { mode: "fail-closed" } } } });
expect("fail-closed on a rule with no finding exits 0", json(priced).status === 0 && ids(json(priced)).includes("price-below-cost"));
write(priced, "naive.config.json", { finance_lint: { rules: { "price-below-cost": { mode: "fail-closed" }, "spend-no-runway": { mode: "fail-closed" } } } });
expect("two fail-closed rules exit 1 when one of them has a finding", json(priced).status === 1);
write(priced, "validation/pricing.json", price(80, 55));
expect("fail-closed with no findings exits 0", json(priced).status === 0 && ids(json(priced)).length === 0);
write(priced, "naive.config.json", { finance_lint: { rules: { "price-below-cost": { mode: "sometimes" } } } });
write(priced, "validation/pricing.json", price(40, 55));
expect("a mode that is not fail-open or fail-closed stays fail-open", json(priced).status === 0 && json(priced).body?.findings?.[0]?.mode === "fail-open");

// Missing and malformed records, including missing price or cost, do not throw.
const messy = venture("messy", {
  "venture.json": { id: "messy", name: "messy" },
  "naive.config.json": "{",
  "validation/pricing.json": "{",
  "purpose/validation/pricing.json": { points: "nope" },
  "finance/costs.json": { costs: [{ name: "Pro" }, "nope", { amount: "80" }] },
  "finance/metrics.json": { metrics: ["nope", { targets: { validation: 1 } }, { id: "gross-margin", targets: { validation: "high" } }] },
  "decisions/spend-ads.decision.json": "{",
  "decisions/not-json.decision.json": "spend",
});
const messyRun = json(messy);
expect("malformed records and a missing phase do not crash", messyRun.status === 0 && messyRun.body && messyRun.body.phase === null && ids(messyRun).length === 0);
const wordy = venture("wordy", { "finance/metrics.json": metric({ validation: "high" }) });
expect("a non-numeric target fires metric-no-target", ids(json(wordy)).includes("metric-no-target"));

const missingPrice = venture("missing-price", {
  "validation/pricing.json": { venture: "v", product: "app", model: "subscription", buyer: "the buyer", evidence: [], points: [{ name: "Pro", currency: "USD", cost: 10 }, { name: "Free", amount: null, cost: 5 }, "nope"] },
  "finance/costs.json": { costs: [{ name: "Pro", amount: 99 }] },
});
expect("a missing price does not crash and does not fire", json(missingPrice).status === 0 && !ids(json(missingPrice)).includes("price-below-cost"));

const missingCost = venture("missing-cost", {
  "validation/pricing.json": price(40, null),
  "finance/costs.json": { costs: [{ name: "Other", amount: 90 }, { name: "Pro", amount: "lots" }] },
});
expect("a missing cost does not crash and does not fire", json(missingCost).status === 0 && ids(json(missingCost)).length === 0);

const fromFile = venture("from-file", {
  "validation/pricing.json": price(40, null),
  "finance/costs.json": { costs: [{ name: "Pro", amount: 90, currency: "USD" }] },
});
expect("a cost named in finance/costs.json fires when the price is below it", ids(json(fromFile)).includes("price-below-cost"));
write(fromFile, "finance/costs.json", { costs: [{ name: "Pro", amount: 90, currency: "EUR" }] });
expect("a cost in another currency stays silent", !ids(json(fromFile)).includes("price-below-cost"));
write(fromFile, "validation/pricing.json", price(40, 10));
write(fromFile, "finance/costs.json", { costs: [{ name: "Pro", amount: 90 }] });
expect("a cost on the price point wins over finance/costs.json", !ids(json(fromFile)).includes("price-below-cost"));

const equal = venture("equal", { "validation/pricing.json": price(40, 40) });
expect("a price equal to cost stays silent", ids(json(equal)).length === 0);

const withdrawn = venture("withdrawn", { "decisions/spend-ads.decision.json": spend({ status: "withdrawn", answer: "Buy the ads." }) });
expect("a withdrawn spend decision stays silent", ids(json(withdrawn)).length === 0);
const asked = venture("asked", { "decisions/budget.decision.json": { id: "budget", question: "What does runway allow us to spend?", status: "open", answer: "5000 on ads." } });
expect("runway named only in the question does not count as the impact", ids(json(asked)).includes("spend-no-runway"));

// Structured layout: the bytes are the ones ventureFile resolves, not a same-named file at the flat path.
const structured = venture("structured", {
  "validation/pricing.json": price(1, 100),
  "k-base/validation/pricing.json": price(80, 10),
  "decisions/spend-ads.decision.json": spend({ answer: "Buy the ads." }),
  "k-base/decisions/spend-ads.decision.json": spend({ answer: "Runway stays 14 months." }),
  "naive.config.json": { finance_lint: { rules: { "price-below-cost": { mode: "fail-open" } } } },
  "meta/naive.config.json": { finance_lint: { rules: { "price-below-cost": { mode: "fail-closed" } } } },
  "k-base/finance/metrics.json": metric({}),
}, { layout: "structured", phase: "beachhead" });
const structuredRun = json(structured);
expect("structured layout reads pricing and decisions through ventureFile", structuredRun.status === 0 && !ids(structuredRun).includes("price-below-cost") && !ids(structuredRun).includes("spend-no-runway"));
expect("structured layout reads the metric and its phase through ventureFile", ids(structuredRun).includes("metric-no-target") && structuredRun.body.phase === "beachhead");
write(structured, "k-base/validation/pricing.json", price(1, 100));
expect("structured layout reads finance_lint mode through ventureFile", json(structured).status === 1 && json(structured).body.findings.some((f) => f.rule === "price-below-cost" && f.mode === "fail-closed"));

expect("usage without a venture exits 2", run(join(tmp, "missing")).status === 2);
const cfgDir = venture("cfg", {}, { config: { finance_lint: { rules: { "spend-no-runway": { mode: "fail-closed" } } } } });
const cfg = spawnSync("node", [join(root, "schema/check-config.mjs"), cfgDir], { encoding: "utf8" });
expect("finance_lint in naive.config.json passes check-config", cfg.status === 0 && /valid/.test(cfg.stdout));

const ws = join(tmp, "ws");
write(ws, "ventures/kettle/venture.json", {
  id: "kettle", name: "kettle", parent: null, phase: "validation", owner: "self", status: "active", profile: "profile.md",
  layers: { purpose: false, knowledge: false, operations: false, evidence: false, governance: false, interface: false },
});
write(ws, "ventures/kettle/validation/pricing.json", price(40, 55));
const routed = await call({ venture: "kettle", route: "finance/lint", action: "run", workspace: ws });
expect("route finance/lint returns the findings", routed.ok && routed.result?.findings?.some((f) => f.rule === "price-below-cost"));

function venturesUnder(dir) {
  const out = [];
  const walkDir = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    if (entries.some((e) => e.name === "venture.json")) out.push(d);
    for (const e of entries) if (e.isDirectory() && e.name !== "node_modules" && !e.name.startsWith(".")) walkDir(join(d, e.name));
  };
  walkDir(dir);
  return out;
}
for (const dir of [...venturesUnder(join(root, "instance")), ...venturesUnder(join(root, "schema/examples/workspace"))]) {
  const r = json(dir);
  expect(`no false findings in ${dir.slice(root.length)}`, r.status === 0 && r.body?.ok === true && ids(r).length === 0);
}

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
