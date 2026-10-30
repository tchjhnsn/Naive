// Tests for decision impact: merging a decided version maps what depends on the changed records across
// the venture's functions, marks them stale, writes decisions/<id>.impact.json and proposes one open
// follow-up decision per affected function, never deciding it.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approve, decisions, merge, propose } from "./decisions.mjs";
import { impact } from "./impact.mjs";
import { record } from "../interface/provenance.mjs";
import { stale } from "./stale.mjs";

let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const repo = new URL("..", import.meta.url).pathname;
const v = mkdtempSync(join(tmpdir(), "impact-"));
const put = (rel, o) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), JSON.stringify(o, null, 2) + "\n"); };
const json = (rel) => JSON.parse(readFileSync(join(v, rel), "utf8"));
const agent = { kind: "person", id: "Founder", via: "cli" };
put("venture.json", { id: "imp", name: "Imp", type: "software-startup", phase: "discovery" });
put("product/shop.json", { id: "shop", name: "Shop", description: "A shop." });
put("accounts/acme/account.json", { id: "acme", product: "shop" });
put("people/team-plan.json", { roles: ["engineer"] });
put("marketing/notes.json", { unrelated: true });

try {
  for (const f of ["product/shop.json", "accounts/acme/account.json", "marketing/notes.json"]) record(v, { entity: f, route: "x", activity: "write", agent });
  // The team plan was written from the product: provenance says it reads it.
  record(v, { entity: "people/team-plan.json", route: "x", activity: "write", agent, derived_from: ["product/shop.json"] });

  propose(v, { at: "product", id: "shop-price", question: "What does Shop sell?", answer: "A shop for makers.", applies_to: [{ file: "product/shop.json", field: "description" }] }, { agentId: "cos" });
  approve(v, "shop-price", { by: "Founder" });
  const m = merge(v, "shop-price", { by: "Founder" });
  expect("merge returns the impact summary", m.ok && m.result.impact?.affected === 2, m);

  const im = json("product/decisions/shop-price.impact.json");
  const fn = (id) => im.functions.find((f) => f.function === id);
  expect("the impact record lists every function", im.functions.length === 10 && im.decision === "shop-price" && im.version === 1, im);
  expect("a provenance reader lands in its function (people)", fn("people").affected_records.includes("people/team-plan.json"), fn("people"));
  expect("a data-model ref lands in its function (customers)", fn("customers").affected_records.includes("accounts/acme/account.json"), fn("customers"));
  expect("an unrelated record is not affected", !im.functions.some((f) => f.affected_records.includes("marketing/notes.json")));
  expect("affected records are marked stale", stale(v).map((s) => s.file).sort().join() === "accounts/acme/account.json,people/team-plan.json", stale(v));
  expect("the note waits for an agent's draft", im.functions.every((f) => f.note === null));

  const ds = decisions(v).decisions;
  const follow = ds.find((d) => d.id === "revise-people-after-shop-price-v1");
  expect("a follow-up decision is proposed for each affected function", fn("people").proposed_decisions[0] === follow?.id && fn("customers").proposed_decisions.length === 1 && fn("marketing").proposed_decisions.length === 0, im);
  expect("follow-ups are open, never decided", ["revise-people-after-shop-price-v1", "revise-customers-after-shop-price-v1"].every((id) => json(`${id.split("-")[1]}/decisions/${id}.decision.json`).status === "open"));

  const s = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "decision-impact.schema.json", "--file", join(v, "product/decisions/shop-price.impact.json")], { encoding: "utf8" });
  expect("the impact record matches schema/decision-impact.schema.json", s.status === 0, s.stdout + s.stderr);

  const marks = () => json(".naive/stale.json").marks.length;
  const n = marks();
  const again = impact(v, "shop-price");
  expect("rebuilding the map is idempotent: same follow-ups, no duplicates", again.ok && again.result.affected === 2 && decisions(v).decisions.filter((d) => d.id.startsWith("revise-")).length === 2, again);
  expect("rerunning impact adds no duplicate stale marks", marks() === n, json(".naive/stale.json").marks);

  propose(v, { at: "product", id: "shop-name", question: "What is Shop called?", answer: "Shoppe", applies_to: [{ file: "product/shop.json", field: "name" }] }, { agentId: "cos" });
  approve(v, "shop-name", { by: "Founder" });
  const never = impact(v, "shop-name");
  expect("impact on a decision never merged is refused and marks nothing", !never.ok && /never merged/.test(never.error) && marks() === n, never);
  expect("an unknown decision is refused", !impact(v, "nope").ok);
} finally {
  rmSync(v, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\ndecision impact holds");
