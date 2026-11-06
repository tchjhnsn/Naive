#!/usr/bin/env node
// Replays the Bessemer SaaS metrics playbook against the router.
//   node packages/naive/test/verification/playbook-bessemer-saas-metrics/replay.mjs
//
// Fixture ventures live under a temp directory. Nothing here is a founder's venture.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { call, routes } from "../../../src/router/router.mjs";
import { propose } from "../../../src/engine/decisions.mjs";

const repo = join(dirname(fileURLToPath(import.meta.url)), "../../../../..");
const playbookPath = join(repo, "packages/naive/library/packages/finance/playbooks/bessemer-saas-metrics.md");
const playbook = readFileSync(playbookPath, "utf8");
const PHRASE = "no published Bessemer target";
const PHASES = ["discovery", "validation", "beachhead", "scale", "platform"];
const LATER = ["beachhead", "scale", "platform"];
const BANDS = ["$1-10MM", "$10-25MM", "$25-50MM", "$50-100MM", "$100MM+"];
const SCALING = "bessemer-scaling-100m";
const S2023 = "bessemer-state-of-the-cloud-2023";

const row = (value, source, condition, extra = {}) => ({
  value, source, condition,
  phases: extra.phases ?? LATER,
  arr: extra.arr ?? null,
  segment: extra.segment ?? null,
  stage: extra.stage ?? null,
});

const bandRows = (band, pairs, condition) => pairs.map(([value]) => row(value, SCALING, condition, { arr: [band] }));

export const PUBLISHED = [
  ...bandRows("$1-10MM", [["165% ARR growth"], ["125% net retention"], ["72% gross margin"], ["-167% FCF margin"]], "$1-10MM ARR median"),
  ...bandRows("$10-25MM", [["87% ARR growth"], ["117% net retention"], ["70% gross margin"], ["-75% FCF margin"]], "$10-25MM ARR median"),
  ...bandRows("$25-50MM", [["77% ARR growth"], ["120% net retention"], ["65% gross margin"], ["-62% FCF margin"]], "$25-50MM ARR median"),
  ...bandRows("$50-100MM", [["60% ARR growth"], ["120% net retention"], ["70% gross margin"], ["-37%+ FCF margin"]], "$50-100MM ARR median"),
  ...bandRows("$100MM+", [["57% ARR growth"], ["115% net retention"], ["70% gross margin"], ["-35%+ FCF margin"]], "$100MM+ ARR median"),

  ...["$1-10MM", "$10-25MM", "$25-50MM", "$50-100MM", "$100MM+"].map((band, i) => row(
    ["200% average growth", "115% average growth", "95% average growth", "60% average growth", "60% average growth"][i],
    SCALING, `${band} ARR average growth`, { arr: [band] })),
  ...["$1-10MM", "$10-25MM", "$25-50MM", "$50-100MM", "$100MM+"].map((band, i) => row(
    ["70% average gross margin", "70% average gross margin", "65% average gross margin", "65% average gross margin", "70% average gross margin"][i],
    SCALING, `${band} ARR average gross margin`, { arr: [band] })),

  ...bandRows("$1-10MM", [["230%+ ARR growth"], ["145%+ net retention"], ["85%+ gross margin"], ["-65%+ FCF margin"]], "$1-10MM ARR top performer"),
  ...bandRows("$10-25MM", [["135%+ ARR growth"], ["135%+ net retention"], ["80% gross margin"], ["-35%+ FCF margin"]], "$10-25MM ARR top performer"),
  ...bandRows("$25-50MM", [["110%+ ARR growth"], ["130%+ net retention"], ["75%+ gross margin"], ["-35%+ FCF margin"]], "$25-50MM ARR top performer"),
  ...bandRows("$50-100MM", [["80%+ ARR growth"], ["135%+ net retention"], ["80%+ gross margin"], ["-25%+ FCF margin"]], "$50-100MM ARR top performer"),
  ...bandRows("$100MM+", [["80%+ ARR growth"], ["125%+ net retention"], ["80%+ gross margin"], ["-20%+ FCF margin"]], "$100MM+ ARR top performer"),

  row("85-90% gross retention", SCALING, "gross retention across the 2021 ARR bands", { arr: BANDS }),
  row("140% average net retention", SCALING, "$1-10MM ARR average net retention", { arr: ["$1-10MM"] }),
  row("120% average net retention", SCALING, "$10MM and above average net retention", { arr: ["$10-25MM", "$25-50MM", "$50-100MM", "$100MM+"] }),
  row("15 months average CAC payback", SCALING, "$1-10MM ARR average CAC payback", { arr: ["$1-10MM"] }),
  row("CAC payback under 12 months", SCALING, "SMB CAC payback", { segment: "smb" }),
  row("CAC payback under 18 months", SCALING, "mid-market CAC payback", { segment: "mid-market" }),
  row("CAC payback under 24 months", SCALING, "enterprise CAC payback", { segment: "enterprise" }),
  row("70% efficiency score", SCALING, "$25-50MM ARR efficiency score (FCF margin plus growth)", { arr: ["$25-50MM"] }),
  row("50% efficiency score", SCALING, "$100MM+ ARR efficiency score (FCF margin plus growth)", { arr: ["$100MM+"] }),
  row("about 0.5x cash conversion score", SCALING, "$1-10MM ARR cash conversion score", { arr: ["$1-10MM"] }),
  row("about 1x cash conversion score", SCALING, "$100MM+ ARR cash conversion score", { arr: ["$100MM+"] }),
  row("1x+ cash conversion score", SCALING, "best-in-class cash conversion score", { arr: BANDS }),

  ...[
    "12-18 months CAC payback (good)", "6-12 months CAC payback (better)", "0-6 months CAC payback (best)",
    "under 0.5x operational efficiency (good)", "0.5x to 1.5x operational efficiency (better)", "1.5x or higher operational efficiency (best)",
    "100% net revenue retention (good)", "110% net revenue retention (better)", "120% or higher net revenue retention (best)",
    "12 months of runway (good)", "18 months of runway (better)", "24 months or more of runway (best)",
    "75% or higher revenue growth (good)", "100% or higher revenue growth (better)", "125% or higher revenue growth (best)",
    "logo retention above 85% (good)", "logo retention above 90% (better)", "logo retention 95% or higher (best)",
  ].map((value) => row(value, S2023, "Series B or C enterprise software", { stage: "Series B or C enterprise software" })),

  ...[
    "65% LTM revenue growth at IPO", "120% net retention at IPO", "70% gross margin at IPO",
    "30% R&D of revenue at IPO", "55% S&M of revenue at IPO", "20% G&A of revenue at IPO", "-20% FCF margin at IPO",
    "$100MM+ GAAP revenue before the public markets", "free cash flow positive within 1 to 2 years",
  ].map((value) => row(value, SCALING, "public playbook", { phases: ["platform"], arr: ["$100MM+"], stage: "public playbook" })),
];

const evidenceItem = (id) => ({
  id, kind: "desk-research", summary: "Fixture evidence so the pricing and fit records validate. Not a Bessemer figure.",
  source: { path: "validation/pricing.json" }, audience: "unknown", collected: "2026-10-29",
});

const telosBody = (id) => ({
  statement: "The fixture venture has an end a person already wrote.",
  end_state: "The fixture is still running.",
  measures: [{ id: "recurring-revenue", statement: "Annual recurring revenue", target: "unset until the founder sets it", kind: "revenue", primary: true }],
  owner_outcome: { path: "hold", why: "The fixture has no sale in mind." },
  phases: [{ phase: "beachhead", exit_criteria: [{ id: "still-here", statement: "The fixture is still the subject of the playbook", serves: ["recurring-revenue"] }] }],
});

function blankTargets() {
  return Object.fromEntries(PHASES.map((p) => [p, { value: PHRASE }]));
}

function metricsNote(over = {}) {
  return {
    playbook: "bessemer-saas-metrics",
    phase: over.phase ?? "beachhead",
    product: over.product === undefined ? "ledger" : over.product,
    arr_band: over.arr_band ?? "not in the venture",
    segment: over.segment ?? null,
    stage_note: over.stage_note ?? null,
    actuals: over.actuals ?? {
      runway_months: "not in the venture", cash: "not in the venture",
      monthly_inflow: "not in the venture", monthly_outflow: "not in the venture", monthly_net: "not in the venture",
    },
    targets: over.targets ?? blankTargets(),
  };
}

// The metrics record the checks read: the person's answer once decided, the agent's note while open.
export function metricsOf(decision) {
  try {
    return JSON.parse(decision?.status === "decided" ? decision.answer : decision?.note);
  } catch {
    return null;
  }
}

export function grade(metrics, ctx) {
  const note = metrics ?? {};
  const findings = [];
  const fail = (rule, message) => findings.push({ rule, message });
  const product = ctx.product;
  const pricing = ctx.pricing;
  const models = new Set(product?.business_model ?? []);
  const fit = product && (models.has("subscription") || models.has("freemium")
    || ["subscription", "freemium", "usage"].includes(pricing?.model));
  if (!fit) fail("cloud-fit", product ? "product and pricing are not a recurring software model this playbook applies" : "no product card");
  const early = new Set(["discovery", "validation"]);
  for (const phase of PHASES) {
    const t = note.targets?.[phase];
    if (!t || typeof t.value !== "string") { fail("targets-sourced", `${phase} has no target value`); continue; }
    if (t.value === PHRASE) {
      if (t.source || t.condition) fail("targets-sourced", `${phase} names a source on a target Bessemer did not publish`);
      continue;
    }
    if (early.has(phase)) fail("no-early-number", `${phase} has ${t.value}`);
    const hit = PUBLISHED.find((e) => e.value === t.value && e.condition === t.condition && e.source === t.source);
    if (!hit) fail("targets-sourced", `${phase} target ${JSON.stringify(t.value)} is not a published Bessemer string for that source and condition`);
    else {
      if (!hit.phases.includes(phase)) fail("targets-sourced", `${phase} cannot carry ${hit.condition}`);
      if (hit.arr && !hit.arr.includes(note.arr_band)) fail("targets-sourced", `${phase} needs arr_band ${hit.arr.join(" or ")}, note has ${note.arr_band}`);
      if (hit.segment && note.segment !== hit.segment) fail("targets-sourced", `${phase} needs segment ${hit.segment}`);
      if (hit.stage && note.stage_note !== hit.stage) fail("targets-sourced", `${phase} needs stage_note ${hit.stage}`);
      if (!ctx.sources?.has(hit.source)) fail("targets-sourced", `raw/sources/${hit.source} is not filed`);
    }
  }
  const money = ctx.money;
  const keys = ["runway_months", "cash", "monthly_inflow", "monthly_outflow", "monthly_net"];
  for (const k of keys) {
    const got = note.actuals?.[k];
    if (!money) {
      if (got !== "not in the venture") fail("actuals-from-records", `${k} is filled but purpose/money/summary was not found`);
    } else if (JSON.stringify(got) !== JSON.stringify(money[k] ?? null)) {
      fail("actuals-from-records", `${k} does not match purpose/money/summary`);
    }
  }
  const decided = ctx.decision?.status === "decided";
  if (ctx.decision && ctx.decision.status !== "open" && !(decided && ctx.decision.provenance?.approved_by)) {
    fail("decision-open", "decision is not open and has no approver");
  }
  if (!ctx.decision) fail("decision-open", "no metrics decision");
  if (!decided) {
    if (ctx.telosWrittenByPlaybook) fail("telos-when-decided", "telos was written before the founder decided");
  } else if (!ctx.telosExisted) {
    if (ctx.telosWrittenByPlaybook) fail("telos-when-decided", "this playbook created a telos");
  } else {
    const numeric = PHASES.filter((p) => note.targets?.[p]?.value !== PHRASE && p === note.phase);
    const criteria = ctx.telosCriteria ?? [];
    for (const p of numeric) {
      const t = note.targets[p];
      if (!criteria.some((c) => c.statement === t.value && c.evidence === t.source)) {
        fail("telos-when-decided", `accepted target ${t.value} is not an exit criterion citing ${t.source}`);
      }
    }
  }
  const rules = ["cloud-fit", "targets-sourced", "no-early-number", "actuals-from-records", "decision-open", "telos-when-decided"];
  const byRule = Object.fromEntries(rules.map((r) => [r, findings.filter((f) => f.rule === r)]));
  return { passed: findings.length === 0, findings, byRule };
}

function assert(cond, message) {
  if (!cond) throw new Error(message);
}

async function read(workspace, venture, route) {
  return call({ venture, route, action: "read", workspace, actor: "agent", via: "replay" });
}

async function write(workspace, venture, route, input, actor = "person") {
  return call({ venture, route, action: "write", input, workspace, actor, via: "replay", provenance: { note: "bessemer playbook replay fixture" } });
}

function initVenture(workspace, id, phase) {
  const dir = join(workspace, "ventures", id);
  const made = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.mjs"), dir, id, "--phase", phase], { encoding: "utf8" });
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  return dir;
}

const SOURCES = [
  ["bessemer-scaling-100m", "https://www.bvp.com/atlas/scaling-to-100-million", "2026-10-29", "Scaling to $100 Million"],
  ["bessemer-state-of-the-cloud-2023", "https://www.bvp.com/atlas/state-of-the-cloud-2023", "2026-10-29", "State of the Cloud 2023"],
  ["bessemer-state-of-the-cloud-2024", "https://www.bvp.com/atlas/state-of-the-cloud-2024", "2026-10-29", "State of the Cloud 2024"],
  ["bessemer-cloud-100-benchmarks-2025", "https://www.bvp.com/atlas/the-cloud-100-benchmarks-report", "2026-10-29", "The Cloud 100 Benchmarks Report 2025"],
];

async function fileSources(workspace, venture) {
  for (const [id, origin, fetched, title] of SOURCES) {
    const w = await write(workspace, venture, `raw/sources/${id}`, { id, origin, title, fetched });
    assert(w.ok, `raw/sources/${id}: ${w.error}`);
  }
}

function moneyRecord() {
  return {
    source: "replay-fixture", synced_at: "2026-10-29T00:00:00Z", as_of: "2026-10-29T00:00:00Z",
    cash: { amount: 10000000, currency: "USD" },
    monthly_inflow: { amount: 0, currency: "USD" },
    monthly_outflow: { amount: 500000, currency: "USD" },
    monthly_net: { amount: -500000, currency: "USD" },
    runway_months: 20,
  };
}

function actualsFrom(money) {
  return {
    runway_months: money.runway_months, cash: money.cash, monthly_inflow: money.monthly_inflow,
    monthly_outflow: money.monthly_outflow, monthly_net: money.monthly_net,
  };
}

async function main() {
  const missingInPlaybook = [...new Set(PUBLISHED.map((e) => e.value))].filter((v) => !playbook.includes(v));
  assert(missingInPlaybook.length === 0, `playbook is missing published strings:\n${missingInPlaybook.join("\n")}`);
  assert(playbook.includes(PHRASE), "playbook is missing the unpublished-target phrase");

  const table = routes();
  const wanted = [
    "product/[id]", "validation/pricing", "purpose/money/summary", "validation/product-market-fit",
    "foundation/telos", "raw/sources/[id]", "decisions/[id]", "evidence/[id]",
  ];
  for (const route of wanted) assert(table.some((r) => r.route === route), `router table has no ${route}`);
  assert(!table.some((r) => r.route === "finance/metrics" || r.route === "venture"), "venture and finance/metrics are not generated table rows");

  const workspace = mkdtempSync(join(tmpdir(), "bessemer-replay-"));
  const results = [];
  const record = (rule, pass, replay) => results.push({ rule, pass, replay });

  // Route probe: finance/metrics does not exist. venture does, through the package route.
  const ghost = await call({ venture: "none", route: "finance/metrics", action: "read", workspace, via: "replay" });
  record("EveryStepUsesARealRoute", ghost.ok === false && /no route finance\/metrics/.test(ghost.error ?? ""), `call finance/metrics -> ${ghost.error}`);

  const passId = "saas-pass";
  initVenture(workspace, passId, "beachhead");
  const ventureRead = await read(workspace, passId, "venture");
  assert(ventureRead.ok && ventureRead.result?.phase === "beachhead", `venture read: ${JSON.stringify(ventureRead).slice(0, 400)}`);
  record("venture route answers phase", true, `venture read phase=${ventureRead.result.phase} via packages/naive/src/router/package-routes.mjs specialCall`);

  const product = { id: "ledger", name: "Ledger", description: "Fixture product for the Bessemer replay.", business_model: ["subscription"] };
  const productWrite = await write(workspace, passId, "product/ledger", product);
  assert(productWrite.ok && productWrite.result?.draft !== true, `product write: ${productWrite.error ?? JSON.stringify(productWrite.result)}`);
  const pricing = { venture: passId, product: "ledger", model: "subscription", buyer: "the customer who pays", evidence: [evidenceItem("desk")] };
  assert((await write(workspace, passId, "validation/pricing", pricing)).ok, "pricing write failed");
  const money = moneyRecord();
  assert((await write(workspace, passId, "purpose/money/summary", money)).ok, "money summary write failed");
  const fit = { venture: passId, product: "ledger", segment: "fixture segment", evidence: [evidenceItem("fit")] };
  assert((await write(workspace, passId, "validation/product-market-fit", fit)).ok, "fit write failed");
  assert((await write(workspace, passId, "foundation/telos", telosBody(passId))).ok, "telos write failed");
  await fileSources(workspace, passId);

  const reads = {};
  for (const route of ["product/ledger", "validation/pricing", "purpose/money/summary", "validation/product-market-fit", "foundation/telos"]) {
    const r = await read(workspace, passId, route);
    assert(r.ok && r.result, `${route} did not return a record: ${r.error ?? r.not_found?.note}`);
    reads[route] = r.result;
  }
  assert(reads["purpose/money/summary"].runway_months === 20, "money summary runway was not the fixture");
  assert(!reads["purpose/money/summary"].arr, "money summary must not be treated as having ARR");

  const note = metricsNote({ phase: "beachhead", actuals: actualsFrom(money) });
  const proposed = propose(join(workspace, "ventures", passId), {
    id: "finance-saas-metrics",
    question: "Which published Bessemer benchmarks, if any, are the targets for each phase?",
    needed_in: "beachhead",
    boundary: "fail-open",
    decides: { record: "telos", path: "foundation/telos.json" },
    note: JSON.stringify(note),
  }, { agentId: "replay", via: "replay" });
  assert(proposed.ok, `propose: ${proposed.error}`);
  const decisionRead = await read(workspace, passId, "decisions/finance-saas-metrics");
  assert(decisionRead.ok && decisionRead.result?.status === "open", `decision read: ${JSON.stringify(decisionRead).slice(0, 300)}`);

  const refused = propose(join(workspace, "ventures", passId), {
    id: "finance-saas-metrics-settled", question: "Settle the targets now?", status: "decided", answer: "125% net retention",
  }, { agentId: "replay", via: "replay" });
  assert(!refused.ok && /open/.test(refused.error ?? ""), `propose decided should fail: ${refused.error}`);
  record("decision-open", true, `propose of status decided refused: ${refused.error}`);

  const sourceIds = new Set(SOURCES.map(([id]) => id));
  const ctx = {
    product: reads["product/ledger"], pricing: reads["validation/pricing"], money: reads["purpose/money/summary"],
    sources: sourceIds, decision: decisionRead.result, telosExisted: true, telosWrittenByPlaybook: false,
  };
  const graded = grade(note, ctx);
  assert(graded.passed, `happy path should pass: ${JSON.stringify(graded.findings)}`);
  const evidence = {
    id: "bessemer-saas-metrics",
    subject: { kind: "venture", id: passId },
    ran_at: "2026-10-29T22:40:00Z",
    runner: "replay",
    results: ["cloud-fit", "targets-sourced", "no-early-number", "actuals-from-records", "decision-open", "telos-when-decided"].map((criterion) => ({
      criterion, kind: "conformance", passed: graded.byRule[criterion].length === 0,
      output: graded.byRule[criterion].map((f) => f.message).join("; ") || "passed",
    })),
    passed: graded.passed,
  };
  const evidenceWrite = await write(workspace, passId, "evidence/bessemer-saas-metrics", evidence);
  assert(evidenceWrite.ok, `evidence write: ${evidenceWrite.error}`);
  const evidenceRead = await read(workspace, passId, "evidence/bessemer-saas-metrics");
  assert(evidenceRead.result?.passed === true, "evidence read was not passed");
  record("CheckMatches pass", true, "beachhead fixture with a subscription product, money summary, filed sources, and every phase target 'no published Bessemer target' wrote evidence passed true");

  // Missing product: the check fails, and the failure is written.
  const failId = "saas-fail";
  initVenture(workspace, failId, "discovery");
  await fileSources(workspace, failId);
  const failNote = metricsNote({ phase: "discovery", product: null });
  const failProposed = propose(join(workspace, "ventures", failId), {
    id: "finance-saas-metrics",
    question: "Which published Bessemer benchmarks, if any, are the targets for each phase?",
    needed_in: "discovery",
    boundary: "fail-open",
    note: JSON.stringify(failNote),
  }, { agentId: "replay", via: "replay" });
  assert(failProposed.ok, failProposed.error);
  const missingProduct = await read(workspace, failId, "product/ledger");
  assert(missingProduct.ok && missingProduct.result === null && missingProduct.not_found, "missing product should be not_found, not an error");
  const missingMoney = await read(workspace, failId, "purpose/money/summary");
  assert(missingMoney.result === null, "missing money summary should be not_found");
  const failDecision = (await read(workspace, failId, "decisions/finance-saas-metrics")).result;
  const failGrade = grade(failNote, { product: null, pricing: null, money: null, sources: sourceIds, decision: failDecision, telosExisted: false, telosWrittenByPlaybook: false });
  assert(!failGrade.passed && failGrade.byRule["cloud-fit"].length === 1, JSON.stringify(failGrade.findings));
  assert(failGrade.byRule["no-early-number"].length === 0, "the phrase on discovery is not an early number");
  const failEvidence = {
    id: "bessemer-saas-metrics",
    subject: { kind: "venture", id: failId },
    ran_at: "2026-10-29T22:41:00Z",
    runner: "replay",
    results: [{ criterion: "cloud-fit", kind: "conformance", passed: false, output: failGrade.byRule["cloud-fit"][0].message }],
    passed: false,
  };
  assert((await write(workspace, failId, "evidence/bessemer-saas-metrics", failEvidence)).ok, "fail evidence write");
  assert((await read(workspace, failId, "evidence/bessemer-saas-metrics")).result.passed === false, "fail evidence did not stay false");
  record("CheckMatches fail", true, "discovery fixture with no product card: evidence passed false, cloud-fit failed, other phase targets stayed the unpublished phrase");

  // A cited median is allowed only when the band matches. An invented number is not. An early phase cannot cite.
  const cited = metricsNote({
    phase: "scale", arr_band: "$1-10MM", actuals: actualsFrom(money),
    targets: { ...blankTargets(), scale: { value: "125% net retention", metric: "net_retention", condition: "$1-10MM ARR median", source: SCALING } },
  });
  const citedGrade = grade(cited, { ...ctx, decision: decisionRead.result });
  assert(citedGrade.passed, `cited median should pass: ${JSON.stringify(citedGrade.findings)}`);
  record("NoUseBeforeProvided cited median", true, "scale, arr_band $1-10MM, value 125% net retention, source bessemer-scaling-100m: grade passed");

  const invented = metricsNote({
    phase: "scale", arr_band: "$1-10MM", actuals: actualsFrom(money),
    targets: { ...blankTargets(), scale: { value: "130% net retention", condition: "$1-10MM ARR median", source: SCALING } },
  });
  const inventedGrade = grade(invented, { ...ctx, decision: decisionRead.result });
  assert(!inventedGrade.passed && inventedGrade.byRule["targets-sourced"].length, `invented number should fail: ${JSON.stringify(inventedGrade.findings)}`);
  record("targets-sourced rejects an invented number", true, `130% net retention is not on the 2021 page: ${inventedGrade.byRule["targets-sourced"][0].message}`);

  const early = metricsNote({
    phase: "discovery", arr_band: "$1-10MM",
    targets: { ...blankTargets(), discovery: { value: "125% net retention", condition: "$1-10MM ARR median", source: SCALING } },
  });
  const earlyGrade = grade(early, { ...ctx, decision: failDecision, money: null, telosExisted: false });
  assert(earlyGrade.byRule["no-early-number"].length === 1, JSON.stringify(earlyGrade.findings));
  record("NoUseBeforeProvided no early number", true, earlyGrade.byRule["no-early-number"][0].message);

  const cohort = metricsNote({
    phase: "scale", arr_band: "$1-10MM", actuals: actualsFrom(money),
    targets: { ...blankTargets(), scale: { value: "400% year-over-year", condition: "vertical AI", source: "bessemer-state-of-the-cloud-2024" } },
  });
  const cohortGrade = grade(cohort, { ...ctx, decision: decisionRead.result });
  assert(cohortGrade.byRule["targets-sourced"].length, "2024 cohort figure should not be a target");
  record("2024 cohort is not a target", true, cohortGrade.byRule["targets-sourced"][0].message);

  const filled = metricsNote({ phase: "discovery", actuals: { ...metricsNote().actuals, runway_months: 20 } });
  const filledGrade = grade(filled, { product: null, pricing: null, money: null, sources: sourceIds, decision: failDecision, telosExisted: false, telosWrittenByPlaybook: false });
  assert(filledGrade.byRule["actuals-from-records"].length, JSON.stringify(filledGrade.findings));
  record("NoUseBeforeProvided withheld actuals", true, filledGrade.byRule["actuals-from-records"][0].message);

  // Agent drafts telos only after a person decides, and the live record stays put.
  const withNumber = metricsNote({
    phase: "beachhead", arr_band: "$1-10MM", actuals: actualsFrom(money),
    targets: { ...blankTargets(), beachhead: { value: "125% net retention", metric: "net_retention", condition: "$1-10MM ARR median", source: SCALING } },
  });
  const decide = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), "decide", "finance-saas-metrics", "--venture", passId, "--workspace", workspace, "--by", "Fixture Founder", "--confirm", "finance-saas-metrics", "--answer", JSON.stringify(withNumber)], { encoding: "utf8" });
  assert(decide.status === 0, `decide: ${decide.stderr || decide.stdout}`);
  const decided = (await read(workspace, passId, "decisions/finance-saas-metrics")).result;
  assert(decided.status === "decided" && decided.provenance.approved_by === "Fixture Founder", "decide did not record the person");
  assert(decided.note === decisionRead.result.note, "the proposed note should not change");
  assert(JSON.stringify(metricsOf(decided)) === JSON.stringify(withNumber), "the checks should read the person's answer");
  const badAnswer = grade(metricsOf({ ...decided, answer: JSON.stringify(invented) }), { ...ctx, decision: decided });
  assert(badAnswer.byRule["targets-sourced"].length, "an invented number in the answer should fail");
  const proseAnswer = grade(metricsOf({ ...decided, answer: "We will aim for good retention." }), { ...ctx, decision: decided });
  assert(proseAnswer.byRule["targets-sourced"].length, "an answer that is not the metrics record should fail");
  record("targets-sourced reads the decided answer", true, "decide --answer carried the target; an invented number and a prose answer both failed");
  const liveBefore = readFileSync(join(workspace, "ventures", passId, "foundation/telos.json"), "utf8");
  const draftedTelos = JSON.parse(liveBefore);
  draftedTelos.phases[0].exit_criteria.push({
    id: "net-retention", statement: "125% net retention", serves: ["recurring-revenue"], evidence: SCALING,
  });
  const agentTelos = await write(workspace, passId, "foundation/telos", draftedTelos, "agent");
  assert(agentTelos.ok && agentTelos.result?.draft === true, `agent telos write should be a draft: ${JSON.stringify(agentTelos).slice(0, 500)}`);
  const liveAfter = readFileSync(join(workspace, "ventures", passId, "foundation/telos.json"), "utf8");
  assert(liveAfter === liveBefore, "agent write changed the live telos");
  assert(existsSync(join(workspace, "ventures", passId, "_drafts/foundation__telos.json.draft")), "draft file missing");
  const telosGrade = grade(metricsOf(decided), {
    ...ctx, decision: decided, telosWrittenByPlaybook: true,
    telosCriteria: draftedTelos.phases[0].exit_criteria,
  });
  assert(telosGrade.passed, `telos draft path: ${JSON.stringify(telosGrade.findings)}`);
  record("telos draft after a person decides", true, `agent write of foundation/telos returned draft true; live file unchanged; approved_by ${decided.provenance.approved_by}`);

  // The main chart path, in order, on the pass venture. Each call is the route the model names.
  const path = [];
  for (const route of ["venture", "product/ledger", "validation/pricing", "purpose/money/summary", "validation/product-market-fit", "foundation/telos", "raw/sources/bessemer-scaling-100m", "decisions/finance-saas-metrics", "evidence/bessemer-saas-metrics"]) {
    const r = await read(workspace, passId, route);
    assert(r.ok, `${route}: ${r.error}`);
    path.push(`${route} ${r.result ? "record" : r.not_found?.note ?? "ok"}`);
  }
  record("main chart path", true, path.join("; "));

  const rules = [
    ["EveryStepUsesARealRoute", results.find((r) => r.rule === "EveryStepUsesARealRoute")],
    ["NoUseBeforeProvided", results.filter((r) => r.rule.startsWith("NoUseBeforeProvided")).every((r) => r.pass)],
    ["CheckMatches", results.filter((r) => r.rule.startsWith("CheckMatches")).every((r) => r.pass)],
  ];
  console.log(JSON.stringify({ workspace, results, rules: rules.map(([name, ok]) => ({ rule: name, pass: ok === true || ok?.pass === true })) }, null, 2));
  if (results.some((r) => !r.pass) || rules.some(([, ok]) => !(ok === true || ok?.pass === true))) process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
