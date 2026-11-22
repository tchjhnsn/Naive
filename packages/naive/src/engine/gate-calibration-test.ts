// Tests for gate calibration (EE-157): interview counts from the market's reach, items raised for a high cost of
// error, commitment evidence for a big deal, lapsed cells counted as unknown, unknown cells as assumptions with lower
// confidence, the proposed decision filed once, the phase gate honoring count_levels and staleness_months from
// naive.config.json, the CLI and the route.

import { spawnSync } from "node:child_process";
import { Effect } from "effect";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { calibrate, calibration, cellAt, decisionId, isIsoDate, parsePreset, parseRules, proposeCalibration, RULES } from "./gate-calibration.ts";
import type { IsoDate, Rules } from "./gate-calibration.ts";
import type { AnatomyCellEnumCell, AnatomyCellNumberCell, IndustryAnatomy, MarketAnatomy, PhaseGatePolicies } from "../records/types/records.d.ts";
import { runSync } from "../core/effect/run.ts";
import { gradeItem } from "./evidence-grade.ts";
import { phaseGate, POLICIES } from "./phase-gate.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { validateFile, validateValue } from "../records/validate.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail?: unknown): void => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

const repo = new URL("../../../..", import.meta.url).pathname;
const node = (args: string[]) => spawnSync("node", args, { cwd: repo, encoding: "utf8" });
const policies = JSON.parse(readFileSync(join(repo, POLICIES), "utf8")) as PhaseGatePolicies;
const rules: Rules = runSync(parseRules(JSON.parse(readFileSync(join(repo, RULES), "utf8"))));
const date = (s: string): IsoDate => { if (!isIsoDate(s)) throw new Error(`not a date: ${s}`); return s; };
const standard = runSync(parsePreset(policies, "discovery"));
type Window = { valid_from?: string, valid_to?: string };
const known = (value: string, extra: Window = {}): AnatomyCellEnumCell => ({ status: "known", value, ...extra });
const count = (value: number, extra: Window = {}): AnatomyCellNumberCell => ({ status: "known", value, ...extra });
const market = (cells: MarketAnatomy["cells"]): MarketAnatomy => ({ venture: "v", id: "m", segment: "s", primary: true, industry: "i", cells });
const industry = (cells: IndustryAnatomy["cells"]): IndustryAnatomy => ({ venture: "v", id: "i", name: "n", cells });
const validAt = date("2026-11-01");
const cal = (m: MarketAnatomy | null, i: IndustryAnatomy | null) => calibrate(m, i, policies, rules, "discovery", { validAt, preset: standard });

// ---- Every threshold is marked a prior ----
const typo = JSON.parse(readFileSync(join(repo, RULES), "utf8")) as Rules;
typo.rules[0]?.when.push({ cell: "market.reachable_buyer", gt: 1 });
const typoErr = runSync(Effect.flip(parseRules(typo)));
expect("a rule that reads a cell no anatomy schema defines fails at the boundary", typoErr._tag === "SchemaInvalid" && /market\.reachable_buyer,/.test(typoErr.message), typoErr.message);
const ruleFile = validateFile("gate-calibration.schema.json", join(repo, RULES));
expect("the rules file matches packages/naive/src/records/gate-calibration.schema.json", ruleFile.status === 0, ruleFile.stdout + ruleFile.stderr);
expect("every rule names its cells, a reason and that it is an unvalidated prior",
  [rules.count_levels, ...rules.rules, rules.override, rules.problem_confirmation].every((r) => r.id && r.reads.length && r.reason && (r as { prior?: string }).prior === "unvalidated"));

// ---- Count levels ----
const ent40 = cal(market({ customer_type: known("business"), reachable_buyers: count(40) }), null);
expect("40 enterprise buyers give moderate 3 and high 6", ent40.count_levels.moderate === 3 && ent40.count_levels.high === 6 && ent40.count_levels.low === 1, ent40.count_levels);
const ent1000 = cal(market({ customer_type: known("business"), reachable_buyers: count(1000) }), null);
expect("1000 buyers give moderate 10 and high 20", ent1000.count_levels.moderate === 10 && ent1000.count_levels.high === 20, ent1000.count_levels);
const consumer = cal(market({ customer_type: known("consumer"), reachable_buyers: count(40) }), null);
expect("a consumer market keeps 5 and 10", consumer.count_levels.moderate === 5 && consumer.count_levels.high === 10, consumer.count_levels);
expect("consumers confirm the problem through observed workarounds", /workaround/.test(consumer.problem_confirmation.rule) && /own words/.test(ent40.problem_confirmation.rule));
const noReach = cal(market({ customer_type: known("business") }), null);
expect("unknown reachable buyers keep 5 and 10", noReach.count_levels.moderate === 5 && noReach.count_levels.high === 10, noReach.count_levels);

// ---- Item rules ----
const safety = cal(null, industry({ cost_of_error: known("safety-critical") }));
expect("safety-critical raises problem one level and makes it fail-closed", safety.items.problem?.min === "high" && safety.items.problem.boundary === "fail-closed", safety.items.problem);
expect("safety-critical raises solution-fit one level and makes it fail-closed", safety.items["solution-fit"]?.min === "moderate" && safety.items["solution-fit"].boundary === "fail-closed" && safety.items["solution-fit"].because.includes("high-cost-of-error"), safety.items["solution-fit"]);
expect("safety-critical needs a second named person to override", safety.override_policy.second_person && safety.override_policy.reason_required, safety.override_policy);
const regulated = cal(null, industry({ regulation: known("licensed") }));
expect("a licensed industry raises problem too, but needs no second person", regulated.items.problem?.min === "high" && !regulated.override_policy.second_person, regulated.items.problem);
const big = cal(market({ deal_size_usd: count(50000) }), null);
expect("a big deal makes economic-signal fail-closed at moderate", big.items["economic-signal"]?.min === "moderate" && big.items["economic-signal"].boundary === "fail-closed", big.items["economic-signal"]);
const long = cal(market({ sales_cycle_days: count(120) }), null);
expect("a long sales cycle does the same", long.items["economic-signal"]?.boundary === "fail-closed", long.items["economic-signal"]);
const net = cal(market({ network_effects: known("direct") }), null);
expect("direct network effects make channel fail-closed", net.items.channel?.boundary === "fail-closed", net.items.channel);
const roles = cal(market({ buying_roles: count(4) }), null);
expect("three or more buying roles add a note that interviews must span roles", roles.notes.some((n) => n.rule === "several-buying-roles" && /span/.test(n.text)), roles.notes);
const fast = cal(market({ maturity: known("emerging") }), null);
expect("an emerging market drops evidence older than 9 months", fast.staleness_months === 9 && cal(null, null).staleness_months === 18, fast.staleness_months);
expect("a proposed phase_gates carries only the changed items", JSON.stringify(big.phase_gates.items) === JSON.stringify({ discovery: { "economic-signal": { min: "moderate", boundary: "fail-closed" } } }), big.phase_gates);
expect("each adjustment names its rule and reason", big.adjustments.some((a) => a.rule === "big-deal-or-long-cycle" && /letter of intent/.test(a.reason)), big.adjustments);

// ---- Validity and unknowns ----
expect("a cell whose valid_to has passed counts as unknown", cellAt(count(50000, { valid_to: "2026-01-01" }), validAt).status === "unknown");
const lapsed = cal(market({ deal_size_usd: count(50000, { valid_to: "2026-01-01" }) }), null);
expect("a lapsed big deal adjusts nothing and becomes an assumption", lapsed.items["economic-signal"]?.boundary === "fail-open" && lapsed.assumptions.some((a) => a.cell === "market.deal_size_usd"), lapsed.items["economic-signal"]);
const lapsedRead = lapsed.reads.find((r) => r.cell === "market.deal_size_usd");
expect("the lapsed read says why", lapsedRead?.status === "unknown" && lapsedRead.expired === "valid_to 2026-01-01 has passed", lapsedRead);
const future = calibrate(market({ deal_size_usd: count(50000, { valid_to: "2026-01-01" }) }), null, policies, rules, "discovery", { validAt: date("2025-12-01"), preset: standard });
expect("validAt lets an earlier date see the cell as valid", future.items["economic-signal"]?.boundary === "fail-closed");
const full = cal(
  market({ customer_type: known("business"), reachable_buyers: count(40), deal_size_usd: count(1000), sales_cycle_days: count(30), network_effects: known("none"), buying_roles: count(1), maturity: known("mature") }),
  industry({ cost_of_error: known("reversible"), regulation: known("none"), clockspeed: known("slow") }),
);
const sparse = cal(market({ customer_type: known("business") }), null);
expect("a fully known anatomy has no assumptions and high confidence", full.assumptions.length === 0 && full.confidence.score === 1 && full.confidence.label === "high", full.confidence);
expect("unknown cells add assumptions in the plan's words and lower confidence", sparse.assumptions.length > 5 && sparse.assumptions.some((a) => a.text === "know the market's reachable_buyers") && sparse.confidence.score < full.confidence.score, sparse.confidence);
const est = cal(market({ customer_type: { status: "estimated", value: "business" } }), null);
expect("an estimated cell counts with half the confidence of a known one", est.confidence.score < sparse.confidence.score && est.confidence.score > 0, [est.confidence, sparse.confidence]);
expect("the gradeItem default stays 18 months, a shorter window drops a level", (() => {
  const e = { kind: "desk-research", audience: "target", collected: "2025-11-01" } as const;
  const t = new Date("2026-11-01");
  return gradeItem(e, t).level === "low" && gradeItem(e, t, 9).level === "very low";
})());

// ---- A venture: read, propose, config, CLI and route ----
const ws = mkdtempSync(join(tmpdir(), "gate-calibration-"));
const dir = join(ws, "acme");
const init = node(["packages/naive/src/engine/init-venture.ts", dir, "acme", "--type", "software-startup"]);
expect("a software startup venture starts", init.status === 0, init.stderr);
const put = (rel: string, value: unknown): void => {
  const f = ventureFile(dir, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, JSON.stringify(value, null, 2) + "\n");
};
put("markets/other.json", { venture: "acme", id: "other", segment: "Hobbyists", cells: { customer_type: known("consumer") } });
put("markets/clinics.json", { venture: "acme", id: "clinics", segment: "Small clinics", primary: true, industry: "naics-621111", cells: { customer_type: known("business"), reachable_buyers: count(40), deal_size_usd: count(30000) } });
put("industries/naics-621111.json", { venture: "acme", id: "naics-621111", name: "Offices of physicians", cells: { cost_of_error: known("harmful") } });
const c = calibration(dir, { validAt });
expect("the venture's primary market and the industry it names are read", c.market === "markets/clinics.json" && c.industry === "industries/naics-621111.json" && c.count_levels.moderate === 3, [c.market, c.industry]);
expect("a harmful industry and a big deal both adjust the venture's gate", c.items.problem?.min === "high" && c.items["economic-signal"]?.boundary === "fail-closed" && c.override_policy.second_person);
const p1 = proposeCalibration(dir, c);
expect("propose files one open decision", p1.kind === "proposed" && p1.id === decisionId("discovery"), p1);
const file = ventureFile(dir, p1.file);
const d = JSON.parse(readFileSync(file, "utf8")) as { status: string, note: string, provenance: { drafted_by: { id: string } } };
expect("the decision is open, drafted by gate-calibration, with the proposed phase_gates in its note", d.status === "open" && d.provenance.drafted_by.id === "gate-calibration" && d.note.includes('"count_levels":{"low":1,"moderate":3,"high":6}'), d);
const p2 = proposeCalibration(dir, calibration(dir, { validAt }));
expect("a rerun files none and keeps the open one", p2.kind === "kept" && p2.id === decisionId("discovery") && p2.status === "open", p2);
writeFileSync(file, JSON.stringify({ ...JSON.parse(readFileSync(file, "utf8")), status: "decided", answer: "adopt the calibrated gate", decided_by: "Torian" }, null, 2));
const p3 = proposeCalibration(dir, calibration(dir, { validAt }));
expect("a rerun leaves a decided one alone", p3.kind === "kept" && p3.status === "decided" && JSON.parse(readFileSync(file, "utf8")).answer === "adopt the calibrated gate", p3);

// The phase gate honors count_levels and staleness_months from naive.config.json.
put("foundation/icp/clinic-owner.json", { id: "clinic-owner", who: "Owners of small clinics", where_to_find: "State medical association", primary: true });
const interview = (id: string) => ({ id, icp: "clinic-owner", consent: { given: true } });
for (const id of ["a", "b", "c"]) put(`validation/interviews/${id}.json`, interview(id));
const customer = () => phaseGate(dir).items.find((r) => r.id === "customer");
const before = customer();
const cfgFile = ventureFile(dir, "naive.config.json");
const cfg = (existsSync(cfgFile) ? JSON.parse(readFileSync(cfgFile, "utf8")) : {}) as Record<string, unknown>;
writeFileSync(cfgFile, JSON.stringify({ ...cfg, phase_gates: { count_levels: { low: 1, moderate: 3, high: 6 }, staleness_months: 9 } }, null, 2));
const after = customer();
expect("config count_levels changes the phase gate's customer level", before?.level === "low" && after?.level === "moderate", [before, after]);
const validated = validateFile("naive-config.schema.json", cfgFile);
expect("naive.config.json with count_levels and staleness_months validates", validated.status === 0, validated.stdout + validated.stderr);
expect("a count level that is not a whole number does not", validateValue("naive-config.schema.json", { phase_gates: { count_levels: { moderate: "five" } } }).status === 1);
const fixtures = [["market-anatomy.schema.json", "markets/clinics.json"], ["market-anatomy.schema.json", "markets/other.json"], ["industry-anatomy.schema.json", "industries/naics-621111.json"]];
expect("the market and industry fixtures match their schemas", fixtures.every(([schema, rel]) => validateFile(schema, ventureFile(dir, rel)).status === 0), fixtures.map(([schema, rel]) => validateFile(schema, ventureFile(dir, rel)).stdout));

const text = node(["packages/naive/src/engine/gate-calibration.ts", dir, "--valid-at", validAt]);
expect("the CLI shows each adjustment with its reason", text.status === 0 && /high-cost-of-error/.test(text.stdout) && /because/.test(text.stdout) && /know the market's network_effects/.test(text.stdout), text.stdout + text.stderr);
const json = node(["packages/naive/src/engine/gate-calibration.ts", dir, "--json", "--valid-at", "2026-11-01"]);
const parsed = JSON.parse(json.stdout || "{}") as { count_levels?: { moderate: number }, venture?: string };
expect("the CLI prints JSON", json.status === 0 && parsed.venture === "acme" && parsed.count_levels?.moderate === 3, json.stderr);
const bad = node(["packages/naive/src/engine/gate-calibration.ts", dir, "--valid-at", "soon"]);
expect("a bad --valid-at exits 2", bad.status === 2, bad.status);
const route = spawnSync("node", ["packages/naive/src/interfaces/cli/mentura.ts", "system/phase-gate/calibrate", "run", "--venture", "acme"], { cwd: repo, encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: ws } });
let routed: { venture?: string, count_levels?: { moderate: number }, items?: Record<string, { boundary: string }> } = {};
try { routed = JSON.parse(route.stdout); } catch { routed = {}; }
expect("the route system/phase-gate/calibrate runs the calibration as a command route", route.status === 0 && routed.venture === "acme" && routed.count_levels?.moderate === 3 && routed.items?.["economic-signal"]?.boundary === "fail-closed", route.stdout.slice(0, 400) + route.stderr);

put("markets/broken.json", { venture: "acme", id: "broken", segment: "x", cells: { reachable_buyers: { status: "known", value: "many" } } });
const broken = node(["packages/naive/src/engine/gate-calibration.ts", dir]);
expect("a market file that does not match its schema is refused at the boundary (exit 1)", broken.status === 1 && /market-anatomy\.schema\.json/.test(broken.stderr), broken.stderr);

rmSync(ws, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("gate calibration tests passed");
