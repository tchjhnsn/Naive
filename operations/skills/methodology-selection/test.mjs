// Fixture tests for `ee validate` (slice 1). Run: node test.mjs
import { validate, list, report, recommend, saveRecommendation, propose, evidence, answersFile } from "./ee.mjs";
import { rmSync, existsSync, readFileSync, writeFileSync, cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
const F = join(dirname(new URL(import.meta.url).pathname), "fixtures");
const cases = [
  ["valid", null, null],
  ["missing-unfit-when", null, /unfit-when: needs at least 1/],
  ["unknown-artifact", null, /artifact type 'bpmn' is not in the catalog/],
  ["illegal-lifecycle", "valid", /lifecycle cannot move from listed to candidate/],
  ["edited-ratified", "valid", /ratified assignment's fields were edited/],
  ["proposed-with-ratifier", null, /proposed assignment cannot name a ratifier/],
];
let failed = 0;
for (const [name, prev, expect] of cases) {
  const r = validate(join(F, name), join(F, prev ?? name));
  const msgs = r.errors.map((e) => e.msg).join("\n");
  const pass = expect ? !r.ok && expect.test(msgs) : r.ok;
  if (!pass) failed++;
  console.log(`${pass ? "✓" : "✗"} ${name}${pass ? "" : `\n    ${msgs || "no errors"}`}`);
}
// list and report (slice 3)
const ok = (name, cond) => { if (!cond) failed++; console.log(`${cond ? "✓" : "✗"} ${name}`); };
const V = join(F, "valid");
ok("list filters by kind", list(V, { kind: "artifact-type" }).every((r) => r.kind === "artifact-type") && list(V, { kind: "artifact-type" }).length === 1);
ok("list filters by family", list(V, { family: "test-first" }).map((r) => r.data.id).join() === "tdd");
const rep = report(V, { staleDays: 180, today: new Date("2026-10-11") });
ok("report: ratified assignment without evidence", rep.noEvidence.some((r) => r.id === "A-900"));
ok("report: mostly-assumed entries", rep.assumedHeavy.some((r) => r.id === "spec-as-source"));
ok("report: research trigger on high cost + assumed", rep.researchTriggers.some((r) => r.id === "tdd"));
ok("report: nothing stale at 1 day", rep.stale.length === 0);
ok("report: stale after 400 days", report(V, { staleDays: 180, today: new Date("2027-11-15") }).stale.length === 3);
// recommend and propose (slice 4), with a fake judge: no network, no cost
const fake = async (state, qs) => ({ answers: Object.fromEntries(Object.keys(qs).map((k) => {
  const name = qs[k].instructions;
  const p = k.startsWith("unfit") ? 0.1 : name.includes("Test-driven") ? 0.9 : name.includes("Spec-as-source") ? 0.8 : 0.3;
  return [k, { noul: p }];
})), usage: { input_tokens: 0 } });
const rec = await recommend(V, join(V, "register/_systems/example-system.md"), fake);
ok("recommend ranks by score", rec.ranked[0].id === "tdd" && rec.ranked[1].id === "spec-as-source");
ok("recommend ties scores within 0.1 into one band", rec.ranked.every((r) => r.band === 1) && rec.ranked[0].score - rec.ranked[1].score < 0.1);
ok("recommend flags research triggers (M4 high, assumed answers)", rec.research_triggers.map((t) => t.question).join() === "M1,M3,M7,M8,M10");
ok("recommend records inputs and catalog version", rec.inputs.decision_question_answers.includes("M4") && rec.catalog_version.length === 12);
const saved = saveRecommendation(V, rec);
const prop = propose(V, saved, null);
const text = readFileSync(join(V, prop.file), "utf8");
ok("propose writes a proposed assignment, never ratified", prop.id === "A-901" && /status: proposed/.test(text) && !/^ratified-by:/m.test(text.split("\n---")[0]));
ok("proposed assignment validates", validate(V, V).ok);
let refused = false; try { propose(V, saved, ["not-a-method"]); } catch { refused = true; }
ok("propose refuses a methodology outside the catalog", refused);
rmSync(join(V, prop.file)); rmSync(join(V, "register/_recommendations"), { recursive: true });
// evidence (slice 5), on a scratch copy of the valid fixture
const W = mkdtempSync(join(tmpdir(), "ee-")); cpSync(V, W, { recursive: true });
evidence(W, "A-900", { title: "First build", note: "Tests caught two counting errors.", tested: ["tdd:M2"], date: "2026-10-11" });
const a900 = readFileSync(join(W, "register/A-900-fixture.md"), "utf8"), tddNow = readFileSync(join(W, "catalog/methodologies/tdd.md"), "utf8");
ok("evidence appends a dated block", /### 2026-10-11 — First build/.test(a900));
ok("evidence moves the methodology to evidenced and records the assignment", /lifecycle: evidenced/.test(tddNow) && /evidence: \[A-900\]/.test(tddNow));
ok("evidence marks the named catalog answer tested", /M2: \{ value: knowable, basis: tested \}/.test(tddNow));
ok("ratified assignment still validates after evidence (body append is allowed)", validate(W, V).ok);
const W2 = mkdtempSync(join(tmpdir(), "ee-")); cpSync(W, W2, { recursive: true });
writeFileSync(join(W2, "register/A-900-fixture.md"), a900.replace("two counting errors", "no errors"));
ok("editing past evidence is rejected (I6)", validate(W2, W).errors.some((e) => /append-only/.test(e.msg)));
const W3 = mkdtempSync(join(tmpdir(), "ee-")); cpSync(V, W3, { recursive: true });
const qdir = join(W3, "catalog/questions"); cpSync(join(F, "..", "..", "..", "catalog/questions/M1.md"), join(qdir, "M1.md"));
const W4 = mkdtempSync(join(tmpdir(), "ee-")); cpSync(W3, W4, { recursive: true });
writeFileSync(join(W4, "catalog/questions/M1.md"), readFileSync(join(W3, "catalog/questions/M1.md"), "utf8").replace(/^text: .*$/m, 'text: "Changed without a version"'));
ok("changing a question without a new version is rejected", validate(W4, W3).errors.some((e) => /without a new version/.test(e.msg)));
// domain filter (slice 7): a physical system is judged only against physical methodologies
const W5 = mkdtempSync(join(tmpdir(), "ee-")); cpSync(V, W5, { recursive: true });
cpSync(join(F, "..", "..", "..", "catalog/methodologies/mbse.md"), join(W5, "catalog/methodologies/mbse.md"));
cpSync(join(F, "..", "..", "..", "catalog/artifact-types/sysml-block.md"), join(W5, "catalog/artifact-types/sysml-block.md"));
writeFileSync(join(W5, "register/_systems/house.md"), readFileSync(join(V, "register/_systems/example-system.md"), "utf8").replace(/^system: .*$/m, 'system: "A house"\ndomain: physical/built-environment/buildings'));
const recP = await recommend(W5, join(W5, "register/_systems/house.md"), fake);
ok("recommend considers only the system's development domain", recP.ranked.map((r) => r.id).join() === "mbse");
ok("recommend flags a domain with only candidates as unresearched", recP.unresearched === true && recP.ranked[0].candidate === true);
const recS = await recommend(W5, join(V, "register/_systems/example-system.md"), fake);
ok("a system with no domain defaults to software", !recS.ranked.some((r) => r.id === "mbse"));
for (const d of [W, W2, W3, W4, W5]) rmSync(d, { recursive: true });
// --answers: a hand-written answers file stands in for Jev and is named as the scorer
{
  const names = [];
  await recommend(V, join(V, "register/_systems/example-system.md"), async (st, qs) => { names.push([qs.whole.instructions.match(/Methodology "([^"]+)"/)[1], Object.keys(qs)]); return { answers: Object.fromEntries(Object.keys(qs).map((k) => [k, { noul: 0.5 }])) }; });
  const tmp = mkdtempSync(join(tmpdir(), "ee-answers-"));
  const file = join(tmp, "a.json");
  writeFileSync(file, JSON.stringify({ scorer: "reasoning model (test)", answers: Object.fromEntries(names.map(([n, ks]) => [n, Object.fromEntries(ks.map((k) => [k, k.startsWith("unfit") ? 0.1 : n.includes("Test-driven") ? 0.9 : 0.3]))])) }));
  const recA = await recommend(V, join(V, "register/_systems/example-system.md"), answersFile(file));
  ok("answers file: its scorer is recorded as the model", recA.model === "reasoning model (test)");
  ok("answers file: its answers decide the ranking", recA.ranked[0].id === "tdd");
  writeFileSync(file, JSON.stringify({ scorer: "x", answers: {} }));
  ok("answers file: a missing methodology fails loudly", await recommend(V, join(V, "register/_systems/example-system.md"), answersFile(file)).then(() => false, (e) => /no entry/.test(e.message)));
  rmSync(tmp, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
