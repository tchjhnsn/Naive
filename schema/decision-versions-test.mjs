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
mkdirSync(join(v, "people"), { recursive: true });
writeFileSync(join(v, "people/people.json"), JSON.stringify({ venture: "vers", mode: "solo", people: [{ id: "founder", name: "Founder", role: "founder" }] }, null, 2));

try {
  const p = propose(v, { at: "marketing", id: "mission", question: "What is the mission?", answer: "We help founders.", applies_to: [{ file: "venture.json", field: "core.promise" }] }, { agentId: "cos" });
  expect("an agent proposes the first version", p.ok && json(F).status === "open", p);
  const a1 = approve(v, "mission", { by: "Founder" });
  expect("a person approves it", a1.ok && json(F).status === "decided", a1);
  expect("approving does not merge: the venture is unchanged", !json("venture.json").core, json("venture.json"));
  expect("a name the venture does not record cannot merge", /not a person/.test(merge(v, "mission", { by: "Mallory" }).error ?? "") && !json("venture.json").core);
  expect("--by and --role together are refused", /not both/.test(merge(v, "mission", { by: "Founder", role: "chief-of-staff" }).error ?? ""));
  const m1 = merge(v, "mission", { by: "Founder" });
  expect("merging writes the answer into applies_to", m1.ok && json("venture.json").core?.promise === "We help founders.", m1);
  expect("a version cannot be merged twice", !merge(v, "mission", { by: "Founder" }).ok);

  const u = mkdtempSync(join(tmpdir(), "unverified-"));
  mkdirSync(join(u, "marketing/decisions"), { recursive: true });
  writeFileSync(join(u, "venture.json"), readFileSync(join(v, "venture.json")));
  propose(u, { at: "marketing", id: "mission", question: "What is the mission?", answer: "We help founders." }, { agentId: "cos" });
  const au = approve(u, "mission", { by: "Founder", via: "console", unverified: true });
  const du = JSON.parse(readFileSync(join(u, F), "utf8"));
  expect("an approval with no sign-in says the signer is unverified and claims no wording", au.ok && du.provenance.signer === "unverified" && !du.provenance.wording && du.provenance.via === "console", du.provenance);
  const au2 = approve(u, "mission", { by: "Founder", answer: "We help solo founders." });
  const du2 = JSON.parse(readFileSync(join(u, F), "utf8"));
  expect("a signed-in approval after an unverified one drops the mark", au2.ok && !du2.provenance.signer && du2.provenance.wording === "own", du2.provenance);
  const ru = rollback(u, "mission", 1, { by: "Founder" });
  const dru = JSON.parse(readFileSync(join(u, F), "utf8"));
  expect("a signed-in rollback to an unverified version drops the mark", ru.ok && !dru.provenance.signer, dru.provenance);
  rmSync(u, { recursive: true, force: true });
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

  propose(v, { at: "marketing", id: "stage", question: "Which phase are we in?", answer: "growth", applies_to: [{ file: "venture.json", field: "phase" }] }, { agentId: "cos" });
  approve(v, "stage", { by: "Founder" });
  const before = readFileSync(join(v, "venture.json"), "utf8");
  const bad = merge(v, "stage", { by: "Founder" });
  expect("a merge whose answer breaks the target's schema is refused", !bad.ok && /venture\.schema\.json/.test(bad.error) && /phase/.test(bad.error), bad);
  expect("a refused merge writes nothing: the record and the decision are unchanged", readFileSync(join(v, "venture.json"), "utf8") === before && !json("marketing/decisions/stage.decision.json").merged);
  for (const file of ["./venture.json", ".//venture.json", "marketing/./x.json"]) {
    const sp = propose(v, { at: "marketing", id: `spelled-${file.length}`, question: "Which phase?", answer: "growth", applies_to: [{ file, field: "phase" }] }, { agentId: "cos" });
    expect(`propose refuses the spelling ${file}, which would skip the schema check`, !sp.ok && /not a path inside/.test(sp.error), sp);
  }
  // Merging into a record that does not exist: it has no earlier gaps, so it must pass whole.
  propose(v, { at: "marketing", id: "new-product", question: "How is it described?", answer: "Desc", applies_to: [{ file: "product/new.json", field: "description" }] }, { agentId: "cos" });
  approve(v, "new-product", { by: "Founder" });
  mkdirSync(join(v, "product"), { recursive: true });
  const nw = merge(v, "new-product", { by: "Founder" });
  expect("a merge cannot create a record missing its required fields", !nw.ok && /product\.schema\.json/.test(nw.error) && !existsSync(join(v, "product/new.json")), nw);
  // A validator that cannot run says nothing about the record: the merge is refused.
  const brokenBin = mkdtempSync(join(tmpdir(), "no-validator-"));
  writeFileSync(join(brokenBin, "python3"), "#!/bin/sh\necho 'validate.py needs jsonschema' >&2\nexit 1\n", { mode: 0o755 });
  const path = process.env.PATH;
  process.env.PATH = `${brokenBin}:${path}`;
  const nv = merge(v, "stage", { by: "Founder" });
  process.env.PATH = path;
  rmSync(brokenBin, { recursive: true, force: true });
  expect("a merge is refused when the validator cannot run", !nv.ok && /could not check venture\.json/.test(nv.error) && readFileSync(join(v, "venture.json"), "utf8") === before, nv);

  writeFileSync(join(v, "marketing/why.json"), JSON.stringify({ n: 1 }));
  propose(v, { at: "marketing", id: "tone", question: "What tone?", answer: "Plain.", reasons: [{ claim: "Readers skim", kind: "for", citations: [{ ref: "marketing/why.json" }] }] }, { agentId: "cos" });
  approve(v, "tone", { by: "Founder" });
  approve(v, "tone", { by: "Founder", answer: "Warm.", reasons: [{ claim: "Warmth converts", kind: "for" }] });
  rollback(v, "tone", 1, { by: "Founder" });
  const t = json("marketing/decisions/tone.decision.json");
  expect("rollback restores the version's reasons, in step with provenance.reasons", JSON.stringify(t.reasons) === JSON.stringify(t.provenance.reasons) && t.reasons.length === 1 && t.reasons[0].claim === "Readers skim", t);

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
  // Every class the decision-rights register escalates is a one-way door, even when the venture's own
  // one_way_doors leaves it out: a grant naming it never lets a role merge.
  for (const cls of ["spend-money", "public-commitment", "strategy-or-constitution"]) {
    const id = `esc-${cls}`;
    propose(v, { at: "marketing", id, question: `Escalated ${cls}?`, answer: "Yes.", applies_to: [{ file: "marketing/esc.json", field: cls }] }, { agentId: "cos" });
    const ef = `marketing/decisions/${id}.decision.json`;
    writeFileSync(join(v, ef), JSON.stringify({ ...json(ef), class: cls }, null, 2));
    approve(v, id, { by: "Founder" });
    grants(true, [cls]);
    expect(`an escalate class (${cls}) is a one-way door a grant cannot merge`, /one-way door/.test(merge(v, id, { role: "chief-of-staff" }).error ?? ""));
  }

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
