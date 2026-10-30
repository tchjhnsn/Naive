// Tests for decision versions: a decided decision changes by a new version, every version is kept,
// merging is a separate step that writes the answer into applies_to, and rollback restores an earlier
// version as a new one so history is never rewritten.

import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approve, merge, propose, rollback } from "./decisions.mjs";

let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const v = mkdtempSync(join(tmpdir(), "versions-"));
const json = (rel) => JSON.parse(readFileSync(join(v, rel), "utf8"));
mkdirSync(join(v, "marketing/decisions"), { recursive: true });
writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "vers", name: "Vers", type: "software-startup", phase: "discovery" }, null, 2));
const F = "marketing/decisions/mission.decision.json";

try {
  const p = propose(v, { at: "marketing", id: "mission", question: "What is the mission?", answer: "We help founders.", applies_to: [{ file: "venture.json", field: "core.promise" }] }, { agentId: "cos" });
  expect("an agent proposes the first version", p.ok && json(F).status === "open", p);
  const a1 = approve(v, "mission", { by: "Founder" });
  expect("a person approves it", a1.ok && json(F).status === "decided", a1);
  expect("approving does not merge: the venture is unchanged", !json("venture.json").core, json("venture.json"));
  const m1 = merge(v, "mission", { by: "Founder" });
  expect("merging writes the answer into applies_to", m1.ok && json("venture.json").core?.promise === "We help founders.", m1);
  expect("a version cannot be merged twice", !merge(v, "mission", { by: "Founder" }).ok);

  expect("re-approving the same wording is refused", !approve(v, "mission", { by: "Founder" }).ok);
  const a2 = approve(v, "mission", { by: "Founder", answer: "We help solo founders and small founding teams." });
  const d2 = json(F);
  expect("a new answer on a decided decision makes version 2 and keeps version 1", a2.ok && d2.version === 2 && d2.versions?.[0]?.version === 1 && d2.versions[0].answer === "We help founders.", d2);
  expect("version 2 is not live until it is merged", json("venture.json").core.promise === "We help founders.");
  merge(v, "mission", { by: "Founder" });
  expect("merging version 2 replaces the answer", json("venture.json").core.promise === "We help solo founders and small founding teams.");

  const p3 = propose(v, { id: "mission", question: "What is the mission?", answer: "An agent's new wording.", status: "open" }, { agentId: "rogue" });
  const d3 = json(F);
  expect("an agent's new wording never un-decides: version 2 stays decided and current", p3.ok && d3.status === "decided" && d3.version === 2 && d3.answer === "We help solo founders and small founding teams.", d3);
  expect("the agent's wording waits as a draft of the next version", d3.proposed?.answer === "An agent's new wording." && d3.proposed.drafted_by?.id === "rogue", d3.proposed);
  const a3 = approve(v, "mission", { by: "Founder" });
  const d3b = json(F);
  expect("a person approving promotes the draft to version 3, drafted by the agent", a3.ok && a3.result.wording === "approved" && d3b.version === 3 && d3b.answer === "An agent's new wording." && !d3b.proposed && d3b.provenance.drafted_by.id === "rogue" && d3b.versions.length === 2, d3b);

  const r = rollback(v, "mission", 1, { by: "Founder" });
  const d4 = json(F);
  expect("rollback restores version 1 as a new version 4", r.ok && d4.version === 4 && d4.answer === "We help founders." && d4.rolled_back_from === 1 && d4.versions.length === 3, d4);
  expect("rollback is not live until merged", json("venture.json").core.promise === "We help solo founders and small founding teams.");
  merge(v, "mission", { by: "Founder" });
  expect("merging the rollback restores the earlier answer", json("venture.json").core.promise === "We help founders.");

  const a5 = approve(v, "mission", { by: "Founder", answer: "A fifth wording." });
  expect("a new version after a rollback carries no stale rolled_back_from or merged", a5.ok && json(F).version === 5 && !("rolled_back_from" in json(F)) && !("merged" in json(F)), json(F));

  expect("an agent cannot name an applies_to outside the venture", !propose(v, { at: "marketing", id: "escape", question: "Where?", answer: "out", applies_to: [{ file: "../escaped.json", field: "x" }] }, { agentId: "rogue" }).ok);
  writeFileSync(join(v, "marketing/decisions/escape.decision.json"), JSON.stringify({ id: "escape", question: "Where?", status: "decided", answer: "out", applies_to: [{ file: "../escaped.json", field: "x" }] }));
  const mx = merge(v, "escape", { by: "Founder" });
  expect("merge refuses an applies_to outside the venture and writes nothing there", !mx.ok && !existsSync(join(v, "../escaped.json")), mx);

  const forged = propose(v, { at: "marketing", id: "forged", question: "Forged?", answer: "x", merged: { version: 1, at: "2026-01-01T00:00:00Z", by: "Founder" }, version: 9, versions: [{ version: 1, status: "decided", answer: "y" }], rolled_back_from: 3, proposed: "x" }, { agentId: "rogue" });
  const fj = forged.ok ? json("marketing/decisions/forged.decision.json") : {};
  expect("an agent's propose() drops forged merged, version, versions, rolled_back_from and proposed", forged.ok && !["merged", "version", "versions", "rolled_back_from", "proposed"].some((k) => k in fj), forged.ok ? fj : forged);

  const log = readFileSync(join(v, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  expect("each merge is a merge line in provenance", log.filter((e) => e.activity === "merge").length === 3, log.map((e) => e.activity));
} finally {
  rmSync(v, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\ndecision versions hold");
