// Tests for decision versions: a decided decision changes by a new version, every version is kept,
// merging is a separate step that writes the answer into applies_to, and rollback restores an earlier
// version as a new one so history is never rewritten.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { approve, merge, propose, rollback } from "./decisions.mjs";
import { staleOf } from "./stale.mjs";

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

  const log = readFileSync(join(v, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  expect("each merge is a merge line in provenance", log.filter((e) => e.activity === "merge").length === 3, log.map((e) => e.activity));
  // Merge is its own permission, and delegable (governance/delegation.json, may_merge); one-way doors never.
  const D = "marketing/decisions/headline.decision.json";
  propose(v, { at: "marketing", id: "headline", question: "What is the headline?", answer: "Decide what is next.", applies_to: [{ file: "marketing/site.json", field: "headline" }] }, { agentId: "cos" });
  approve(v, "headline", { by: "Founder" });
  expect("a role cannot merge by naming itself as the person", !merge(v, "headline", { by: "chief-of-staff" }).ok);
  expect("with no delegation record a role cannot merge", /only the founder merges/.test(merge(v, "headline", { role: "chief-of-staff" }).error ?? ""));
  const grants = (may_merge, classes = ["experience-design"], expires = null) => writeFileSync(join(v, "governance/delegation.json"), JSON.stringify({ register: "delegation", root: "founder", one_way_doors: ["production-ship"], grants: [{ id: "founder-to-cos", from: "founder", to: "chief-of-staff", classes, scope: "venture", may_redelegate: false, may_merge, expires }] }, null, 2));
  mkdirSync(join(v, "governance"), { recursive: true });
  grants(true);
  expect("a decision with no class is merged only by the founder", /names no decision class/.test(merge(v, "headline", { role: "chief-of-staff" }).error ?? ""));
  writeFileSync(join(v, D), JSON.stringify({ ...json(D), class: "experience-design" }, null, 2));
  grants(false);
  expect("a grant without may_merge does not let a role merge", !merge(v, "headline", { role: "chief-of-staff" }).ok);
  grants(true, ["experience-design"], "2026-01-01");
  expect("an expired grant does not let a role merge", !merge(v, "headline", { role: "chief-of-staff", today: "2026-10-30" }).ok);
  mkdirSync(join(v, "marketing/content"), { recursive: true });
  writeFileSync(join(v, "marketing/content/headline.mdx"), "---\nvariant_of: marketing/site.json#headline\npublish: true\napproved_by: Founder\n---\nKnow what to decide next.\n");
  grants(true);
  const md = merge(v, "headline", { role: "chief-of-staff" });
  expect("a live grant with may_merge for the class lets the role merge", md.ok && md.result.grant === "founder-to-cos" && json("marketing/site.json").headline === "Decide what is next.", md);
  expect("a merge marks the public variants of the merged field stale", md.result?.variants_stale?.includes("marketing/content/headline.mdx") && !!staleOf(v, "marketing/content/headline.mdx"), md.result);
  const log2 = readFileSync(join(v, "provenance.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  expect("a delegated merge is logged as the role, naming the grant", log2.some((e) => e.activity === "merge" && e.agent?.kind === "agent" && /under grant founder-to-cos/.test(e.note ?? "")), log2.filter((e) => e.activity === "merge").at(-1));
  writeFileSync(join(v, D), JSON.stringify({ ...json(D), class: "production-ship" }, null, 2));
  approve(v, "headline", { by: "Founder", answer: "Ship it." });
  grants(true, ["production-ship"]);
  expect("a one-way door is never merged by a role, even with a grant", /one-way door/.test(merge(v, "headline", { role: "chief-of-staff" }).error ?? ""));
  expect("the founder merges a one-way door", merge(v, "headline", { by: "Founder" }).ok);

  // Known gap A, through the router: a decided decision is never written without who decided it.
  const ws = mkdtempSync(join(tmpdir(), "gapa-"));
  mkdirSync(join(ws, "gapa"));
  writeFileSync(join(ws, "gapa/venture.json"), JSON.stringify({ id: "gapa", name: "Gap A", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery" }, null, 2));
  const input = join(ws, "in.json");
  writeFileSync(input, JSON.stringify({ id: "x", question: "Q?", status: "decided", answer: "A.", decides: { path: "operations/x.json" }, layer: "operations", needed_in: "discovery" }));
  const cli = (...a) => spawnSync("node", [join(new URL("..", import.meta.url).pathname, "interface/cli/mentura.mjs"), "decisions/x", "write", "--venture", "gapa", "--input", input, ...a], { env: { ...process.env, MENTURA_WORKSPACE: ws }, encoding: "utf8" });
  const pw = cli("--as", "person");
  expect("a person's write of a decided decision naming no approver is refused", pw.status !== 0 && /approved_by/.test(pw.stderr + pw.stdout) && !existsSync(join(ws, "gapa/decisions/x.decision.json")), pw.stdout + pw.stderr);
  const aw = cli();
  expect("an agent's write of a decided decision is held as a draft, never decided", aw.status === 0 && /"draft": true/.test(aw.stdout) && !existsSync(join(ws, "gapa/decisions/x.decision.json")), aw.stdout + aw.stderr);
  writeFileSync(input, JSON.stringify({ id: "x", question: "Q?", status: "open", answer: "A.", decides: { path: "operations/x.json" }, layer: "operations", needed_in: "discovery", provenance: { drafted_by: { kind: "agent", id: "cos" }, approved_by: "Torian" } }));
  const fw = cli();
  expect("an agent's write naming an approver in provenance is held as a draft", fw.status === 0 && /"draft": true/.test(fw.stdout), fw.stdout + fw.stderr);
  rmSync(ws, { recursive: true, force: true });
} finally {
  rmSync(v, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\ndecision versions hold");
