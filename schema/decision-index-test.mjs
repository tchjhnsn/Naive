// Tests for the live decision index: structural impact for open decisions, phase weight and the
// requirement lift, violations flagged now, updates that re-score every decision (equal to a
// rebuild), rank history, the route and the mentura index command.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { decisions, propose } from "./decisions.mjs";
import { phaseWeight, rankHistory, read, rebuild, update } from "./decision-index.mjs";
import { record } from "../interface/provenance.mjs";
import { call } from "../interface/router.mjs";

let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const repo = new URL("..", import.meta.url).pathname;
const ws = mkdtempSync(join(tmpdir(), "dindex-"));
const v = join(ws, "idx");
const put = (rel, o) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), JSON.stringify(o, null, 2) + "\n"); };
const agent = { kind: "person", id: "Founder", via: "cli" };
const entryOf = (idx, id) => idx.entries.find((e) => e.id === id);

put("venture.json", { id: "idx", name: "Idx", type: "software-startup", parent: null, phase: "discovery", owner: "self", status: "active", layers: { purpose: true, knowledge: true, operations: false, evidence: false, governance: true, interface: false } });
put("product/shop.json", { id: "shop", name: "Shop" });
put("accounts/acme/account.json", { id: "acme", product: "shop" });
put("people/team-plan.json", { roles: ["engineer"] });
put("marketing/notes.json", { unrelated: true });

try {
  for (const f of ["product/shop.json", "accounts/acme/account.json", "marketing/notes.json"]) record(v, /** @type {Parameters<typeof record>[1]} */ ({ entity: f, route: "x", activity: "write", agent }));
  record(v, /** @type {Parameters<typeof record>[1]} */ ({ entity: "people/team-plan.json", route: "x", activity: "write", agent, derived_from: ["product/shop.json"] }));

  propose(v, { at: "product", id: "shop-price", question: "What does Shop cost?", applies_to: [{ file: "product/shop.json", field: "price" }] }, { agentId: "cos" });
  propose(v, { at: "product", id: "shop-billing", question: "Monthly or yearly?", parent: "shop-price", applies_to: [{ file: "product/shop.json", field: "billing" }] }, { agentId: "cos" });
  propose(v, { at: "marketing", id: "shop-copy", question: "How do we describe the price?", parent: "shop-price" }, { agentId: "cos" });
  propose(v, { at: "product", id: "shop-scale", question: "Which database?", needed_in: "scale", answer: "a single SQLite file", applies_to: [{ file: "product/shop.json", field: "store" }] }, { agentId: "cos" });
  propose(v, { at: "marketing", id: "tagline", question: "What is the tagline?", needed_in: "beachhead", applies_to: [{ file: "marketing/notes.json", field: "tagline" }] }, { agentId: "cos" });

  // (a) impact for open decisions, with no index yet and no requirements
  let idx = rebuild(v);
  const price = entryOf(idx, "shop-price");
  expect("an open decision has structural impact: records that read or refer to what it changes", price.impact.records.join() === "accounts/acme/account.json,people/team-plan.json", price.impact);
  expect("its functions span the venture", ["product", "customers", "people"].every((f) => price.impact.functions.includes(f)), price.impact.functions);
  expect("linked decisions are listed (child, shared record)", price.impact.decisions.some((d) => d.id === "shop-billing"), price.impact.decisions);
  expect("nothing is marked stale or proposed for an open decision", !decisions(v).decisions.some((d) => d.id.startsWith("revise-")));
  expect("the docket's rank is kept and wrapped", price.docket_rank === decisions(v).decisions.find((d) => d.id === "shop-price").rank, price);
  expect("the index lives in .naive/ as a cache", JSON.parse(readFileSync(join(v, ".naive/decision-index.json"), "utf8")).entries.length === idx.entries.length);

  // (c) phase weight
  expect("phase weight: 1 now, halved per phase further out", phaseWeight("discovery", "discovery") === 1 && phaseWeight("beachhead", "discovery") === 0.25 && phaseWeight(null, "validation") === 1);
  expect("a later-phase decision is a draft at reduced weight", entryOf(idx, "shop-scale").weight.phase === 0.125 && entryOf(idx, "shop-scale").weight.lifted_by === null);

  // (d) rank history
  expect("a rebuild appends a rank for every active decision", rankHistory(v).length === idx.entries.length && rankHistory(v, "shop-price")[0].rank === price.rank && Array.isArray(rankHistory(v, "shop-price")[0].why));

  // (b) update: nothing new, nothing moves; every update re-scores every decision, so it equals a rebuild.
  idx = update(v);
  expect("an update with no new events moves nothing", idx.last_update.mode === "update" && idx.last_update.events === 0 && idx.last_update.touched.length === 0, idx.last_update);
  record(v, { entity: "accounts/acme/account.json", route: "x", activity: "write", agent });
  idx = update(v);
  expect("an update counts the events since its cursor", idx.last_update.events === 1, idx.last_update);

  // A due time passing with no provenance event re-ranks the decision: update matches rebuild.
  propose(v, { at: "marketing", id: "launch-date", question: "When do we launch?", due: "2099-11-05T00:00:00Z" }, { agentId: "cos" });
  rebuild(v, { now: Date.parse("2099-11-01T00:00:00Z") });
  idx = update(v, { now: Date.parse("2099-11-06T00:00:00Z") });
  const ld = entryOf(idx, "launch-date");
  expect("a decision whose due time passed is overdue and ranks first after an update", ld.render === "overdue" && idx.entries[0].id === "launch-date", idx.entries.map((e) => [e.id, e.score, e.render]));
  const fresh = rebuild(v, { now: Date.parse("2099-11-06T00:00:00Z") });
  expect("update and rebuild give the same ranking", JSON.stringify(idx.entries.map((e) => [e.id, e.score])) === JSON.stringify(fresh.entries.map((e) => [e.id, e.score])));
  expect("history records the move", rankHistory(v, "launch-date").some((r) => r.cause === "rank moved" && r.rank === 1));
  propose(v, { at: "marketing", id: "launch-date", question: "When do we launch?", status: "withdrawn" }, { agentId: "cos" });
  rebuild(v);

  // (c) requirements: a heavy one lifts a later decision into this phase; a violation is flagged now
  put("foundation/requirements/scale-to-millions.json", { id: "scale-to-millions", statement: "Serve hundreds of millions of users", derives_from: { ambition: "platform" }, phase: "scale", functions: ["product"], verified_by: "load test evidence", weight: 0.9, check: { answer_must_not_match: "sqlite" } });
  record(v, /** @type {Parameters<typeof record>[1]} */ ({ entity: "foundation/requirements/scale-to-millions.json", route: "x", activity: "write", agent }));
  propose(v, { at: "product", id: "shop-scale", question: "Which database?", needed_in: "scale", answer: "a single SQLite file", requirements: [{ id: "scale-to-millions", relation: "constrains" }], applies_to: [{ file: "product/shop.json", field: "store" }] }, { agentId: "cos" });
  idx = update(v);
  const sc = entryOf(idx, "shop-scale");
  expect("a heavy requirement lifts a later-phase decision into the current phase", sc.weight.phase === 1 && sc.weight.lifted_by === "scale-to-millions", sc.weight);
  expect("an answer that breaks a later requirement is flagged now", sc.flags.length === 1 && sc.flags[0].requirement === "scale-to-millions" && sc.flags[0].holds_in === "scale", sc.flags);
  expect("the lifted, flagged decision now ranks first", idx.entries[0].id === "shop-scale", idx.entries.map((e) => e.id));
  const s = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "decision-record.schema.json", "--file", join(v, "product/decisions/shop-scale.decision.json")], { encoding: "utf8" });
  expect("the requirements field matches the decision-record schema", s.status === 0, s.stdout + s.stderr);

  // --since counts events from a time.
  idx = update(v, { since: "2000-01-01T00:00:00Z" });
  expect("--since counts every event since a time", idx.last_update.events > 5, idx.last_update);

  // (e) the route and the command
  const r = await call({ venture: "idx", route: "system/decision-index", action: "run", input: { value: "read" }, workspace: ws, actor: "person", actor_id: "Founder" });
  expect("route system/decision-index runs", r.ok && r.result.entries[0].id === "shop-scale", r);
  const vw = await call({ venture: "idx", route: "system/decision-index", action: "view", workspace: ws, actor: "person", actor_id: "Founder" });
  expect("route system/decision-index has a view", vw.ok, vw);
  const c = spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), "index", "--venture", "idx", "--workspace", ws], { encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: ws } });
  expect("mentura index updates and reports the ranking", c.status === 0 && JSON.parse(c.stdout).ranked[0].id === "shop-scale", c.stdout + c.stderr);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
