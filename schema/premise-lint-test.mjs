#!/usr/bin/env node
// Tests the premise-attack linter: fixture records that must trigger each aspect, rule levels from
// naive.config.json, drafts, route filtering, records never edited, and --propose writing open decisions.

import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { lint, proposeFindings, ASPECTS } from "./premise-lint.mjs";
import { approve } from "./decisions.mjs";

let failed = 0;
const ok = (cond, name) => { console.log(`${cond ? "ok  " : "FAIL"}  ${name}`); if (!cond) failed++; };
const put = (dir, rel, o) => { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), typeof o === "string" ? o : JSON.stringify(o, null, 2)); };

const dir = mkdtempSync(join(tmpdir(), "premise-lint-"));
put(dir, "venture.json", { id: "fixture", phase: "discovery", functions: { product: {}, validation: {}, marketing: {} } });
put(dir, "foundation/goals/grow.json", { id: "grow", statement: "Grow a good business.", kind: "venture", why: "Torian said so", owner: "Torian", measures: [{ id: "paying-customers", statement: "Paying customers", target: 10, unit: "customers" }] });
put(dir, "foundation/goals/ownerless.json", { id: "ownerless", statement: "Ship the product.", kind: "product" });
put(dir, "foundation/requirements/validate.json", { id: "validate", statement: "The problem is graded moderate or better from interviews with at least five ICP founders before any product card goes live.", derives_from: ["default-convention"], must_hold_by: "validation", constrains: ["validation", "product"], verified_by: { kind: "evidence", ref: "foundation/problem" }, weight: 3 });
put(dir, "foundation/requirements/unverified.json", { id: "unverified", statement: "Records stay portable.", derives_from: ["grow", "nowhere"], constrains: ["legal"], weight: 2 });
put(dir, "foundation/requirements/loop-a.json", { id: "loop-a", statement: "A holds.", derives_from: ["loop-b"], must_hold_by: "discovery", verified_by: { kind: "check", ref: "x" } });
put(dir, "foundation/requirements/loop-b.json", { id: "loop-b", statement: "B holds.", derives_from: ["loop-a"], must_hold_by: "discovery", verified_by: { kind: "check", ref: "x" } });
put(dir, "foundation/exit-criteria/discovery.json", { phase: "discovery", criteria: [
  { id: "problem-graded-moderate", statement: "Problem record grades moderate or better from interviews with at least five ICP founders", serves: ["validated-before-build"] },
  { id: "no-parent", statement: "Ten paying customers", evidence: "invoices" },
] });
put(dir, "foundation/constraints.json", { must_not: [{ id: "bare", statement: "Sell user data" }] });
put(dir, "decisions/pick.decision.json", { id: "pick", question: "Which pricing?", status: "decided", answer: "flat", parent: "missing-parent" });
// A draft stands for the record it would become.
put(dir, "_drafts/foundation__goals__drafted.json.draft", { id: "drafted", statement: "Be stable enough.", kind: "venture", why: "x", owner: "T" });

const before = readdirSync(join(dir, "foundation/goals")).map((f) => readFileSync(join(dir, "foundation/goals", f), "utf8")).join();
const all = lint(dir, { config: {} });
const has = (aspect, record, field) => all.some((f) => f.aspect === aspect && f.record === record && (!field || f.field === field));

const crit = "foundation/exit-criteria/discovery#problem-graded-moderate";
ok(all.some((f) => f.record === crit && f.aspect === "undefined-term" && /"moderate"/.test(f.question)), "'problem graded moderate or better' is an undefined term");
ok(has("unmeasurable", crit, "statement"), "'problem graded moderate or better' is unmeasurable");
ok(has("conflict", crit, "serves.validated-before-build"), "criterion serving a measure no goal has is a conflict");
ok(has("phase-mismatch", crit, "phase"), "discovery criterion relying on a validation requirement is a phase mismatch");
ok(has("orphan", "foundation/exit-criteria/discovery#no-parent", "serves"), "criterion serving nothing is an orphan");
ok(has("orphan", "foundation/requirements/validate", "derives_from"), "requirement deriving from no goal is an orphan");
ok(has("unsupported-premise", "foundation/requirements/validate", "statement"), "requirement with no resolvable parent is an unsupported premise");
ok(has("conflict", "foundation/requirements/validate", "constrains.validation"), "weight 3 requirement constraining a function no goal names is a conflict");
ok(has("unmeasurable", "foundation/requirements/unverified", "verified_by"), "requirement without verified_by is unmeasurable");
ok(has("dependency", "foundation/requirements/unverified", "derives_from"), "missing derives_from target is a missing dependency");
ok(has("dependency", "foundation/requirements/unverified", "constrains.legal"), "constraining an unknown function is a missing dependency");
ok(has("dependency", "foundation/requirements/loop-a", "derives_from") && all.some((f) => /itself/.test(f.question)), "requirement cycle is a circular dependency");
ok(has("no-owner", "foundation/goals/ownerless", "owner"), "goal without owner is flagged");
ok(has("unsupported-premise", "foundation/goals/ownerless", "statement"), "goal with no why is an unsupported premise");
ok(has("unmeasurable", "foundation/goals/ownerless", "measures"), "goal with no measures is unmeasurable");
ok(has("undefined-term", "foundation/goals/grow", "statement"), "'good' with no definition is an undefined term");
ok(has("unsupported-premise", "foundation/constraints#bare", "statement"), "constraint with no why or source is unsupported");
ok(has("no-owner", "decisions/pick", "decided_by") && has("unsupported-premise", "decisions/pick", "answer") && has("dependency", "decisions/pick", "parent"), "decided decision with no decider, reasons or real parent");
ok(Object.keys(ASPECTS).every((a) => all.some((f) => f.aspect === a)), "every aspect is triggered");
ok(all.every((f) => f.question && f.severity === "warn" && Array.isArray(f.links)), "findings carry question, links and default warn severity");
ok(!all.some((f) => f.record === "foundation/goals/drafted"), "drafts are left out by default");
ok(lint(dir, { config: {}, includeDrafts: true }).some((f) => f.record === "foundation/goals/drafted" && f.draft), "--drafts includes drafts");
ok(lint(dir, { config: {}, route: "foundation/goals" }).every((f) => f.record.startsWith("foundation/goals/")), "a route filters findings");
const lv = lint(dir, { config: { premise_lint: { rules: { "undefined-term": "off", orphan: "error" } } } });
ok(!lv.some((f) => f.aspect === "undefined-term") && lv.filter((f) => f.aspect === "orphan").every((f) => f.severity === "error"), "rules are off|warn|error from config");

// A defined term is not flagged: a number beside it in the record or a parent.
const d2 = mkdtempSync(join(tmpdir(), "premise-lint-"));
put(d2, "venture.json", { id: "f2" });
put(d2, "foundation/goals/g.json", { id: "g", statement: "Keep churn moderate.", kind: "venture", why: "x", owner: "T", note: undefined, end_state: "moderate means: 5% monthly churn or less", measures: [{ id: "churn", statement: "churn", target: 5 }] });
ok(!lint(d2, { config: {} }).some((f) => f.aspect === "undefined-term"), "a term defined with a threshold is not flagged");

// The CLI exits 1 on an error-level finding and never edits records.
put(dir, "naive.config.json", { premise_lint: { rules: { orphan: "error" } } });
const r = spawnSync("node", [new URL("./premise-lint.mjs", import.meta.url).pathname, dir, "--json"], { encoding: "utf8" });
ok(r.status === 1 && JSON.parse(r.stdout).findings.length > 0, "an error-level rule fails the run");
const after = readdirSync(join(dir, "foundation/goals")).map((f) => readFileSync(join(dir, "foundation/goals", f), "utf8")).join();
ok(before === after, "records are never edited");

// --propose writes open decisions only.
const p = await proposeFindings(dir, all.filter((f) => f.record === crit));
const files = readdirSync(join(dir, "decisions")).filter((f) => f.startsWith("premise-"));
ok(p.every((x) => x.ok) && files.length === p.length && files.every((f) => JSON.parse(readFileSync(join(dir, "decisions", f), "utf8")).status === "open"), "--propose writes each finding as an open decision");

// Rerunning --propose never reopens a decision a person decided, and files nothing twice.
const [first] = p;
const decided = approve(dir, first.result.proposed, { by: "Torian", answer: "moderate means a 3 of 5 on the problem rubric", reasons: [{ kind: "for", claim: "the rubric already grades problems" }] });
const again = await proposeFindings(dir, all.filter((f) => f.record === crit));
const rec = JSON.parse(readFileSync(join(dir, first.result.file), "utf8"));
ok(decided.ok && rec.status === "decided" && !rec.versions && again.every((x) => x.ok && x.result.kept), "rerunning --propose keeps decided and already-filed decisions as they are");
ok(readdirSync(join(dir, "decisions")).filter((f) => f.startsWith("premise-")).length === files.length, "rerunning --propose files no duplicates");

// Measure ids are scoped by goal: two goals with the same measure id do not overwrite each other.
const d3 = mkdtempSync(join(tmpdir(), "premise-lint-"));
put(d3, "venture.json", { id: "f3" });
put(d3, "foundation/goals/a.json", { id: "a", statement: "Sell.", kind: "venture", why: "x", owner: "T", measures: [{ id: "count", statement: "customers", target: 10 }] });
put(d3, "foundation/goals/b.json", { id: "b", statement: "Hire.", kind: "venture", why: "x", owner: "T", measures: [{ id: "count", statement: "hires" }] });
put(d3, "foundation/exit-criteria/discovery.json", { phase: "discovery", criteria: [{ id: "sold", statement: "Ten customers", serves: ["a/count"] }, { id: "vague", statement: "Ten of them", serves: ["count"] }] });
const f3 = lint(d3, { config: {} });
ok(!f3.some((f) => f.record === "foundation/exit-criteria/discovery#sold" && f.aspect === "unmeasurable"), "a criterion serving <goal>/<measure> uses that goal's target, not another goal's same-named measure");
ok(f3.some((f) => f.record === "foundation/exit-criteria/discovery#vague" && f.aspect === "conflict" && /a and b/.test(f.question)), "a bare measure id two goals share is flagged as ambiguous");

// Measure references compare by <goal>/<measure>, however they are spelled.
put(d3, "foundation/goals/c.json", { id: "c", statement: "Keep.", kind: "venture", why: "x", owner: "T", measures: [{ id: "kept", statement: "kept", target: 3 }] });
put(d3, "foundation/requirements/shared.json", { id: "shared", statement: "Shared.", derives_from: ["count"], must_hold_by: "discovery", verified_by: { kind: "check", ref: "x" } });
put(d3, "foundation/requirements/later.json", { id: "later", statement: "Later.", derives_from: ["c/kept"], must_hold_by: "scale", verified_by: { kind: "check", ref: "x" } });
put(d3, "foundation/exit-criteria/validation.json", { phase: "validation", criteria: [{ id: "bare", statement: "Kept three", serves: ["kept"] }] });
put(d3, "foundation/exit-criteria/bogus.json", { phase: "bogus", criteria: [{ id: "odd", statement: "Kept three again", serves: ["c/kept"] }] });
const f4 = lint(d3, { config: {} });
ok(f4.some((f) => f.record === "foundation/requirements/shared" && f.aspect === "conflict" && /a and b share/.test(f.question)), "a requirement deriving from a bare measure two goals share is flagged as ambiguous");
ok(f4.some((f) => f.record === "foundation/exit-criteria/validation#bare" && f.aspect === "phase-mismatch"), "phase-mismatch matches c/kept against a unique bare kept");
ok(!f4.some((f) => f.record === "foundation/exit-criteria/bogus#odd" && f.aspect === "phase-mismatch"), "an unknown phase is not a phase mismatch");
ok(!f4.some((f) => f.record === "foundation/exit-criteria/discovery#vague" && f.aspect === "unmeasurable"), "an ambiguous measure gets its conflict, not a false unmeasurable");

// Repeated real CLI runs on fresh state.
const linterPath = new URL("./premise-lint.mjs", import.meta.url).pathname;
const run = (d, ...a) => spawnSync("node", [linterPath, d, "--propose", ...a], { encoding: "utf8" });
const premiseFiles = (d) => existsSync(join(d, "decisions")) ? readdirSync(join(d, "decisions")).filter((f) => f.startsWith("premise-")) : [];
const fresh = (statement) => { const d = mkdtempSync(join(tmpdir(), "premise-lint-")); put(d, "venture.json", { id: "fresh", phase: "discovery" }); put(d, "foundation/goals/g.json", { id: "g", statement, kind: "venture", why: "x", owner: "T", measures: [{ id: "m", statement: "m", target: 1 }] }); return d; };
const d4 = fresh("Grow a good business.");
const counts = [1, 2, 3, 4].map(() => { run(d4); return premiseFiles(d4).length; });
const events = () => existsSync(join(d4, "provenance.jsonl")) ? readFileSync(join(d4, "provenance.jsonl"), "utf8") : "";
const log = events();
run(d4);
ok(counts.every((n) => n === 1) && events() === log, "repeated --propose runs file one decision and write no new provenance");

// A person's approval counts as a decider, and approving does not grow the findings.
const only = premiseFiles(d4)[0].replace(".decision.json", "");
approve(d4, only, { by: "Torian", answer: "good means ten customers", reasons: [{ kind: "for", claim: "a number" }] });
put(d4, "decisions/own.decision.json", { id: "own", question: "Which plan?", status: "decided", answer: "flat", reasons: [{ kind: "for", claim: "simple" }], provenance: { approved_by: "Torian" } });
run(d4); run(d4);
ok(premiseFiles(d4).length === 1 && JSON.parse(readFileSync(join(d4, "decisions", `${only}.decision.json`), "utf8")).status === "decided", "an approved decision stays decided across reruns");
ok(!lint(d4, { config: {} }).some((f) => f.aspect === "no-owner"), "provenance.approved_by counts as the decider");

// Two vague words in one field are two decisions.
const d5 = fresh("Grow a good and strong business.");
run(d5); run(d5);
const qs = premiseFiles(d5).map((f) => JSON.parse(readFileSync(join(d5, "decisions", f), "utf8")).question);
ok(qs.length === 2 && qs.some((q) => /"good"/.test(q)) && qs.some((q) => /"strong"/.test(q)), "each vague word gets its own decision");

// An open decision with other wording is refreshed, in place.
const openFile = join(d5, "decisions", premiseFiles(d5)[0]);
const openRec = JSON.parse(readFileSync(openFile, "utf8"));
writeFileSync(openFile, JSON.stringify({ ...openRec, question: "older wording" }, null, 2));
run(d5);
ok(premiseFiles(d5).length === 2 && JSON.parse(readFileSync(openFile, "utf8")).question === openRec.question, "a still-open decision with other wording is updated");

// A failed proposal prints why and exits non-zero.
const d6 = fresh("Grow a good business.");
const fakeBin = join(d6, "bin");
mkdirSync(fakeBin);
writeFileSync(join(fakeBin, "python3"), "#!/bin/sh\necho refused by the validator\nexit 1\n", { mode: 0o755 });
const bad = spawnSync(process.execPath, [linterPath, d6, "--propose"], { encoding: "utf8", env: { ...process.env, PATH: fakeBin } });
ok(bad.status === 1 && /refused/.test(bad.stderr), "a failed proposal prints the failure and exits non-zero");

for (const d of [d4, d5, d6]) rmSync(d, { recursive: true, force: true });
rmSync(d3, { recursive: true, force: true });
rmSync(dir, { recursive: true, force: true }); rmSync(d2, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
