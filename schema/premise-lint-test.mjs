#!/usr/bin/env node
// Tests the premise-attack linter: fixture records that must trigger each aspect, rule levels from
// naive.config.json, drafts, route filtering, records never edited, and --propose writing open decisions.

import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { lint, proposeFindings, ASPECTS } from "./premise-lint.mjs";

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

rmSync(dir, { recursive: true, force: true }); rmSync(d2, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
