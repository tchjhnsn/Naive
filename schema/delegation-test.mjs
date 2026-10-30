#!/usr/bin/env node
// Tests for delegation and the verification substrate on made-up ventures in a temp folder: the
// template passes; a grant wider than its grantor's, a broken chain, a re-delegated money class, a
// one-way door, an expired grant and a self-verifying role each fail; and verify.mjs keeps the
// builder from verifying its own work. Never writes into the repo.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { independent, reviewIsIndependent, verificationErrors } from "./verify.mjs";

const repo = new URL("..", import.meta.url).pathname;
const template = join(repo, "governance/venture-template");
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const base = JSON.parse(readFileSync(join(template, "delegation.json"), "utf8"));
const tmp = mkdtempSync(join(tmpdir(), "delegation-"));

// A venture with the template's delegation, changed by edit(d, roles dir); returns the check's result.
let n = 0;
function venture(edit = () => {}, today = "2026-10-29") {
  const dir = join(tmp, `v${n++}`), gov = join(dir, "governance");
  mkdirSync(gov, { recursive: true });
  cpSync(join(template, "roles"), join(gov, "roles"), { recursive: true });
  const d = structuredClone(base);
  edit(d, join(gov, "roles"));
  writeFileSync(join(gov, "delegation.json"), JSON.stringify(d, null, 2));
  const r = spawnSync("node", [join(repo, "schema/check-delegation.mjs"), dir, "--today", today], { encoding: "utf8" });
  return { ok: r.status === 0, out: r.stdout + r.stderr };
}
const grant = (d, id) => d.grants.find((g) => g.id === id);
const fails = (name, edit, re, today) => { const r = venture(edit, today); expect(name, !r.ok && re.test(r.out), r.out); };

const t = spawnSync("node", [join(repo, "schema/check-delegation.mjs")], { encoding: "utf8" });
expect("the template passes", t.status === 0, t.stdout + t.stderr);
expect("a copy of the template passes", venture().ok);

fails("a grant wider than its grantor's fails", (d) => grant(d, "chief-of-staff-to-architect").classes.push("experience-design"), /exceeds its grantor/);
fails("a grant passed on without may_redelegate fails", (d) => { grant(d, "founder-to-chief-of-staff").may_redelegate = false; }, /chief-of-staff-to-architect: exceeds/);
fails("a grant from a role nobody granted fails (the chain must reach the founder)", (d) =>
  d.grants.push({ id: "stray", from: "people-lead", to: "builder", classes: ["implementation-detail"], scope: "venture", may_redelegate: false, may_merge: false, expires: null }), /stray: exceeds/);
fails("a scope wider than the grantor's fails", (d) => { grant(d, "architect-to-builder").scope = "venture"; grant(d, "chief-of-staff-to-architect").scope = "engineering/"; }, /architect-to-builder: exceeds/);
fails("may_merge beyond the grantor's fails", (d) => { grant(d, "architect-to-builder").may_merge = true; }, /architect-to-builder: exceeds/);
fails("a money class is never re-delegated", (d) => {
  grant(d, "founder-to-finance-lead").may_redelegate = true;
  d.grants.push({ id: "money-on", from: "finance-lead", to: "chief-of-staff", classes: ["spend-register-upkeep"], scope: "finance/", may_redelegate: false, may_merge: false, expires: null });
}, /money-on: .*never re-delegated/);
fails("a one-way door is never delegated", (d) => grant(d, "founder-to-chief-of-staff").classes.push("change-direction"), /one-way door/);
fails("an expired grant fails", (d) => { grant(d, "founder-to-product-design-lead").expires = "2026-10-01"; }, /expired/);
fails("a grant outliving its grantor's fails", (d) => { grant(d, "founder-to-chief-of-staff").expires = "2026-12-31"; }, /chief-of-staff-to-architect: exceeds/);
fails("the template expires nothing, but a later day makes a dated grant fail", (d) => { grant(d, "founder-to-product-design-lead").expires = "2026-11-30"; }, /expired/, "2026-12-01");
fails("a cycle never reaches the founder", (d) => {
  d.grants.push({ id: "a", from: "people-lead", to: "counsel", classes: ["domain-fact"], scope: "venture", may_redelegate: true, may_merge: false, expires: null },
    { id: "b", from: "counsel", to: "people-lead", classes: ["domain-fact"], scope: "venture", may_redelegate: true, may_merge: false, expires: null });
}, /grant\/a: exceeds/);
fails("a class not grantable to the role fails", (d) => grant(d, "architect-to-builder").classes.push("new-structure"), /not grantable to builder/);
fails("a role that verifies itself fails", (_, roles) => {
  const p = join(roles, "builder.json"), r = JSON.parse(readFileSync(p, "utf8"));
  writeFileSync(p, JSON.stringify({ ...r, verified_by: "builder" }));
}, /role\/builder: may not verify its own work/);
fails("only the chief delegator goes unverified", (_, roles) => {
  const p = join(roles, "counsel.json"), r = JSON.parse(readFileSync(p, "utf8"));
  writeFileSync(p, JSON.stringify({ ...r, verified_by: null }));
}, /only the chief delegator/);

// The verification substrate.
expect("a verifier other than the builder is independent", independent("builder", "architect"));
expect("the builder is not its own verifier", !independent("builder", "builder"));
expect("no verifier is not independent", !independent("builder", undefined) && !independent("builder", ""));
expect("a conformance check needs no verifier", !verificationErrors({ kind: "conformance", target: "tests" }, "builder").length);
expect("a person check by the builder fails", verificationErrors({ kind: "person", verifier: "builder", target: "x" }, "builder").length === 1);
expect("a model check with no verifier fails", verificationErrors({ kind: "model", target: "x" }, "builder").length === 1);
const roles = new Set(["builder", "architect"]);
expect("a review by another known role is independent", reviewIsIndependent({ id: "r", reviewer: "architect" }, "builder", roles));
expect("a review by the holder is not", !reviewIsIndependent({ id: "r", reviewer: "builder" }, "builder", roles));
expect("a review by an unknown role is not", !reviewIsIndependent({ id: "r", reviewer: "ghost" }, "builder", roles));

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
