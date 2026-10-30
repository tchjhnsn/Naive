// Tests for decision versions: a decided decision changes by a new version, every version is kept,
// merging is a separate step that writes the answer into applies_to, and rollback restores an earlier
// version as a new one so history is never rewritten.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

  const p3 = propose(v, { id: "mission", question: "What is the mission?", answer: "An agent's new wording." }, { agentId: "cos" });
  expect("an agent's new wording on a decided decision opens the next version, open", p3.ok && json(F).status === "open" && json(F).version === 3 && json(F).versions.length === 2, json(F));
  approve(v, "mission", { by: "Founder" });

  const r = rollback(v, "mission", 1, { by: "Founder" });
  const d4 = json(F);
  expect("rollback restores version 1 as a new version 4", r.ok && d4.version === 4 && d4.answer === "We help founders." && d4.rolled_back_from === 1 && d4.versions.length === 3, d4);
  expect("rollback is not live until merged", json("venture.json").core.promise === "We help solo founders and small founding teams.");
  merge(v, "mission", { by: "Founder" });
  expect("merging the rollback restores the earlier answer", json("venture.json").core.promise === "We help founders.");

  propose(v, { at: "marketing", id: "stage", question: "Which phase are we in?", answer: "growth", applies_to: [{ file: "venture.json", field: "phase" }] }, { agentId: "cos" });
  approve(v, "stage", { by: "Founder" });
  const before = readFileSync(join(v, "venture.json"), "utf8");
  const bad = merge(v, "stage", { by: "Founder" });
  expect("a merge whose answer breaks the target's schema is refused", !bad.ok && /venture\.schema\.json/.test(bad.error) && /phase/.test(bad.error), bad);
  expect("a refused merge writes nothing: the record and the decision are unchanged", readFileSync(join(v, "venture.json"), "utf8") === before && !json("marketing/decisions/stage.decision.json").merged);

  writeFileSync(join(v, "marketing/why.json"), JSON.stringify({ n: 1 }));
  propose(v, { at: "marketing", id: "tone", question: "What tone?", answer: "Plain.", reasons: [{ claim: "Readers skim", kind: "for", citations: [{ ref: "marketing/why.json" }] }] }, { agentId: "cos" });
  approve(v, "tone", { by: "Founder" });
  approve(v, "tone", { by: "Founder", answer: "Warm.", reasons: [{ claim: "Warmth converts", kind: "for" }] });
  rollback(v, "tone", 1, { by: "Founder" });
  const t = json("marketing/decisions/tone.decision.json");
  expect("rollback restores the version's reasons, in step with provenance.reasons", JSON.stringify(t.reasons) === JSON.stringify(t.provenance.reasons) && t.reasons.length === 1 && t.reasons[0].claim === "Readers skim", t);

  const log = readFileSync(join(v, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  expect("each merge is a merge line in provenance", log.filter((e) => e.activity === "merge").length === 3, log.map((e) => e.activity));
} finally {
  rmSync(v, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\ndecision versions hold");
