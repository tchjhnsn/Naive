// Tests for the decision queue (EE-127): the owning-function rule, the cross-function score, themes, the context read
// through VentureFs, and the queue decision-index.ts adds to its output with its old fields unchanged.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSync } from "../core/effect/run.ts";
import { byCross, crossScore, GATE_LIFT, MEASURE_LIFT, measuresOf, ownerOf, rankingContextEffect, rankItems, themesOf, VENTURE } from "./decision-queue.ts";
import type { Item, RankingContext } from "./decision-queue.ts";
import { rebuild } from "./decision-index.ts";
import { propose } from "./decisions.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail?: unknown): void => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

// ---- ownerOf: class, then record, then venture ----
const octx = { functions: ["finance", "products", "marketing-and-sales"], classes: { "spend-register-upkeep": "finance" }, recordFunctions: { product: "products", customer: "marketing-and-sales", account: null } };
expect("a decision's class owner names its function", ownerOf({ class: "spend-register-upkeep", record: "product" }, octx).function === "finance");
expect("with no mapped class, the record it decides names its function", ownerOf({ class: "domain-fact", record: "product" }, octx).function === "products");
expect("else the first record it changes that has a function", ownerOf({ record: "account", records: [null, "customer", "product"] }, octx).function === "marketing-and-sales");
const none = ownerOf({ record: "account", records: [] }, octx);
expect("a decision no rule assigns goes to the venture", none.function === VENTURE && none.by === "none", none);

// ---- crossScore and the order ----
const weights = { products: 0.3, "marketing-and-sales": 0.1, finance: 0.2 };
const p = crossScore({ score: 100, function: "products" }, { weights, bound: {} });
const m = crossScore({ score: 100, function: "marketing-and-sales" }, { weights, bound: {} });
const v = crossScore({ score: 100, function: VENTURE }, { weights, bound: {} });
expect("a heavier-weighted function's decision outranks an equal-scored one", p.cross > m.cross && p.multiplier === 1.5 && m.multiplier === 0.5, { p, m });
expect("the venture counts at the mean weight", v.multiplier === 1 && v.cross === 100, v);
const lifted = crossScore({ score: 100, function: "marketing-and-sales", measures: ["weekly-active", "unbound"] }, { weights, bound: { "weekly-active": "growth-lead" } });
expect("bearing on a measure a lead plan binds raises it", lifted.measure_lift === MEASURE_LIFT && lifted.measures.join() === "weekly-active" && lifted.cross === 75, lifted);
expect("no weights leave the score as it is", crossScore({ score: 7, function: "x" }, { weights: {}, bound: {} }).cross === 7);
const tied = [{ id: "b", score: 5, cross: 10 }, { id: "a", score: 5, cross: 10 }, { id: "c", score: 9, cross: 10 }].sort(byCross).map((x) => x.id).join();
expect("ties break by score, then id", tied === "c,a,b", tied);
const gated = crossScore({ score: 100, function: VENTURE, record: "validation-problem" }, { weights: {}, bound: {}, gate: ["validation-problem", "icp"] });
expect("settling a record the phase's gate asks for raises it (EE-155)", gated.gate_lift === GATE_LIFT && gated.cross === 200, gated);
expect("a record the gate does not ask for is not raised", crossScore({ score: 100, function: VENTURE, record: "product" }, { weights: {}, bound: {}, gate: ["icp"] }).gate_lift === 1);
const gateTie = [{ id: "a-icp", score: 5, cross: 10, gate_rank: 1 }, { id: "z-problem", score: 5, cross: 10, gate_rank: 0 }, { id: "b", score: 9, cross: 10 }].sort(byCross).map((x) => x.id).join();
expect("equal cross scores follow the gate's own order of its evidence", gateTie === "z-problem,a-icp,b", gateTie);
expect("measures come from outcomes and changed goal files", measuresOf({ outcomes: [{ measure: "growth/weekly-active" }, { measure: "How we will check it" }] }, ["foundation/goals/g.json"], { "foundation/goals/g.json": ["revenue"] }).join() === "revenue,weekly-active");

// ---- themes ----
const th = themesOf([
  { id: "d1", keys: ["record:product/shop.json"] },
  { id: "d2", keys: ["record:marketing/notes.json"] },
  { id: "d3", keys: ["record:product/shop.json", "handoff:h1"] },
  { id: "d4", keys: ["handoff:h1"] },
  { id: "d5", keys: [] },
]);
expect("two decisions on the same record become one theme, and a shared handoff joins a third", th.length === 3 && th[0].id === "d1" && th[0].members.join() === "d1,d3,d4" && th[0].keys.join() === "handoff:h1,record:product/shop.json", th);
expect("a decision sharing nothing is its own theme", th[1].members.join() === "d2" && th[1].keys.length === 0 && th[2].id === "d5", th);

// ---- the context, read through VentureFs from a venture folder, and the queue over real phase weights ----
const ws = mkdtempSync(join(tmpdir(), "dqueue-"));
const dir = join(ws, "q");
const put = (rel: string, o: unknown): void => { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), JSON.stringify(o, null, 2) + "\n"); };
const venture = (phase: string): void => put("venture.json", { id: "q", name: "Q", type: "software-startup", parent: null, phase, owner: "self", status: "active", layers: { purpose: true, knowledge: true, operations: false, evidence: false, governance: true, interface: false } });
try {
  venture("discovery");
  put("product/shop.json", { id: "shop" });
  put("customers/acme.json", { id: "acme" });
  put("operations/leads/growth-lead.json", { lead: "growth-lead", portfolio: ["marketing-and-sales"], measures: ["weekly-active"] });
  put("operations/handoffs/h1.json", { id: "h1", governed_by: ["dq-a"] });

  const ctxAt = (phase: string): RankingContext => runSync(rankingContextEffect(dir, phase));
  const disc = ctxAt("discovery");
  expect("the context reads the phase's weights", disc.weights.products === 0.25 && disc.weights["marketing-and-sales"] === 0.15, disc.weights);
  expect("the context reads lead plans, handoffs and the class owners", disc.bound["weekly-active"] === "growth-lead" && disc.handoffs["dq-a"]?.join() === "h1" && disc.classes["spend-register-upkeep"] === "finance", { bound: disc.bound, handoffs: disc.handoffs });
  expect("leads come from role templates with a portfolio", disc.leads.some((l) => l.id === "growth-lead" && l.portfolio.includes("marketing-and-sales")));

  const items: Item[] = [
    { entry: { id: "price", score: 40, impact: { changed: ["product/shop.json"] } }, decision: { decides: { record: "product" } }, raw: {} },
    { entry: { id: "pitch", score: 40, impact: { changed: ["customers/acme.json"] } }, decision: { decides: { record: "customer" } }, raw: {} },
  ];
  const q1 = rankItems(items, disc).queue.map((x) => x.id).join();
  const q2 = rankItems(items, ctxAt("beachhead")).queue.map((x) => x.id).join();
  expect("a phase change reorders the queue", q1 === "price,pitch" && q2 === "pitch,price", { q1, q2 });
  const r = rankItems(items, disc);
  expect("the queue names the function, its lead and the score parts", r.queue[1].function === "marketing-and-sales" && r.queue[1].lead === "growth-lead" && r.queue[1].parts.multiplier === 1.95 && r.queue[0].lead === "product-lead", r.queue);
  expect("the per-function index ranks within each function", r.by_function.products?.[0]?.id === "price" && r.by_function["marketing-and-sales"]?.[0]?.id === "pitch", r.by_function);

  // ---- end to end: decision-index adds by_function, themes and queue and keeps its old fields ----
  propose(dir, { at: "product", id: "dq-a", question: "What does Shop cost?", applies_to: [{ file: "product/shop.json", field: "price" }] }, { agentId: "cos" });
  propose(dir, { at: "product", id: "dq-b", question: "Monthly or yearly?", applies_to: [{ file: "product/shop.json", field: "billing" }] }, { agentId: "cos" });
  propose(dir, { at: "customers", id: "dq-c", question: "Who signs for Acme?", applies_to: [{ file: "customers/acme.json", field: "signer" }] }, { agentId: "cos" });
  const idx = rebuild(dir) as { entries: Record<string, unknown>[], queue: { id: string, members: string[], function: string }[], themes: { members: string[] }[], by_function: Record<string, unknown[]> };
  const oldKeys = "id,question,render,status,needed_in,docket_rank,score,weight,impact,requirements,flags,why,note,rank";
  expect("index entries keep exactly their old fields", idx.entries.every((e) => Object.keys(e).join() === oldKeys), Object.keys(idx.entries[0] ?? {}));
  const shop = idx.themes.find((t) => t.members.includes("dq-a"));
  expect("two decisions on the same record become one theme in the index", !!shop && shop.members.includes("dq-b"), idx.themes);
  const heads = idx.queue.map((x) => x.id);
  expect("the queue shows one item per theme, at most ten", idx.queue.length === Math.min(10, idx.themes.length) && idx.queue.every((x) => x.members[0] === x.id) && new Set(idx.queue.flatMap((x) => x.members)).size === idx.queue.reduce((n, x) => n + x.members.length, 0), heads);
  const full = rankItems(idx.entries.map((e) => ({ entry: e as unknown as Item["entry"], decision: { decides: { record: e.id === "dq-c" ? "customer" : "product" } }, raw: {} })), disc, { size: 100 }).queue;
  expect("with room, the theme's members show under one item", full.filter((x) => ["dq-a", "dq-b"].includes(x.id)).length === 1 && full.some((x) => x.id === "dq-c"), full.map((x) => x.id));
  expect("the index has a per-function index", Array.isArray(idx.by_function.products), Object.keys(idx.by_function));

  const cli = spawnSync(process.execPath, ["packages/naive/src/engine/decision-index.ts", dir, "read", "--json"], { encoding: "utf8", cwd: new URL("../../../..", import.meta.url).pathname });
  const brief = cli.status === 0 ? JSON.parse(cli.stdout) as Record<string, unknown> : {};
  expect("--json keeps its keys and adds by_function, themes and queue", Object.keys(brief).join() === "venture,phase,updated_at,last_update,flagged,entries,by_function,themes,queue", cli.stderr || Object.keys(brief));

  venture("beachhead");
  const later = rebuild(dir) as { phase: string, queue: { parts: { function_weight: number }, function: string }[] };
  const mkt = later.queue.find((x) => x.function === "marketing-and-sales");
  expect("the queue reads the venture's current phase", later.phase === "beachhead" && mkt?.parts.function_weight === 0.22, later.queue);
} finally {
  rmSync(ws, { recursive: true, force: true });
}

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
