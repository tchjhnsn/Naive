#!/usr/bin/env node
// Tests for delegation and the verification substrate on made-up ventures in a temp folder: the
// template passes; a grant wider than its grantor's, a broken chain, a re-delegated money class, a
// one-way door, an expired grant and a self-verifying role each fail; and verify.mjs keeps the
// builder from verifying its own work. Never writes into the repo.

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { approve, decisions, mayMerge, merge, propose, rollback } from "../../schema/decisions.mjs";
import { decide } from "../orchestration/setup.mjs";
import { independent, reviewIsIndependent, verificationErrors } from "../../schema/verify.mjs";

const repo = new URL("../..", import.meta.url).pathname;
const template = join(repo, "governance/venture-template");
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const base = JSON.parse(readFileSync(join(template, "delegation.json"), "utf8"));
const tmp = mkdtempSync(join(tmpdir(), "delegation-"));

// A venture with the template's delegation, changed by edit(d, roles dir); returns the check's result.
let n = 0;
function venture(/** @type {(d: *, roles: string) => void} */ edit = () => {}, today = "2026-10-29") {
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

const schemaCheck = (d) => { const f = join(tmp, `schema-${n++}.json`); writeFileSync(f, JSON.stringify(d)); return spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", "delegation.schema.json", "--file", f], { encoding: "utf8" }); };
expect("a delegation naming its founders matches the schema", schemaCheck({ ...base, founder: ["Torian"] }).status === 0);
expect("a founder list with no names does not", schemaCheck({ ...base, founder: [] }).status !== 0);
expect("a bare founder list with no root or grants does not", schemaCheck({ founder: ["Torian"] }).status !== 0);

fails("a grant wider than its grantor's fails", (d) => grant(d, "chief-of-staff-to-architect").classes.push("experience-design"), /exceeds its grantor/);
fails("a grant passed on without may_redelegate fails", (d) => { grant(d, "founder-to-chief-of-staff").may_redelegate = false; }, /chief-of-staff-to-architect: exceeds/);
fails("a grant from a role nobody granted fails (the chain must reach the founder)", (d) =>
  d.grants.push({ id: "stray", from: "people-lead", to: "builder", classes: ["implementation-detail"], scope: "venture", may_redelegate: false, may_merge: false, expires: null }), /stray: exceeds/);
fails("a scope wider than the grantor's fails", (d) => { grant(d, "architect-to-builder").scope = "venture"; grant(d, "chief-of-staff-to-architect").scope = "engineering/"; }, /architect-to-builder: exceeds/);
fails("a scope that only shares a prefix with the grantor's fails (whole segments)", (d) => { grant(d, "chief-of-staff-to-architect").scope = "engineering"; grant(d, "architect-to-builder").scope = "engineering-secrets/"; }, /architect-to-builder: exceeds/);
expect("a scope one segment deeper than the grantor's passes", venture((d) => { grant(d, "chief-of-staff-to-architect").scope = "engineering"; grant(d, "architect-to-builder").scope = "engineering/api/"; }).ok);
fails("a role template missing verified_by is reported, not dropped", (_, roles) => {
  const p = join(roles, "counsel.json"), r = JSON.parse(readFileSync(p, "utf8"));
  delete r.verified_by; writeFileSync(p, JSON.stringify(r));
}, /role\/counsel: has no verified_by/);
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

for (const scope of ["engineering/../finance/", "", "/", "./engineering/"]) fails(`scope ${JSON.stringify(scope)} is refused`, (d) => { grant(d, "architect-to-builder").scope = scope; }, /not "venture" or a plain path/);
expect("the schema refuses a scope with ..", schemaCheck({ ...base, grants: [{ ...grant(base, "architect-to-builder"), scope: "engineering/../finance/" }] }).status !== 0);

// A venture's own files overlay the template's: a partial register or a single role adds, never replaces.
function overlaid(write) {
  const dir = join(tmp, `v${n++}`), gov = join(dir, "governance");
  mkdirSync(join(gov, "roles"), { recursive: true });
  writeFileSync(join(gov, "delegation.json"), JSON.stringify(base));
  write(gov);
  const r = spawnSync("node", [join(repo, "schema/check-delegation.mjs"), dir, "--today", "2026-10-29"], { encoding: "utf8" });
  return { ok: r.status === 0, out: r.stdout + r.stderr };
}
const partial = overlaid((gov) => writeFileSync(join(gov, "decision-rights.json"), JSON.stringify({ classes: [{ id: "implementation-detail", level: "act" }] })));
expect("a venture's partial decision rights overlay the template's classes", partial.ok, partial.out);
const oneRole = overlaid((gov) => cpSync(join(template, "roles/builder.json"), join(gov, "roles/builder.json")));
expect("a venture with one role file keeps the template's other roles", oneRole.ok, oneRole.out);

// extends fails closed: the template's lists bind, and a record that cannot honor extends is refused.
const EXT = "governance/venture-template/delegation.json";
const extending = (d) => { d.extends = EXT; delete d.never_redelegated; delete d.one_way_doors; };
expect("a record extending the template passes", venture(extending).ok);
fails("a class the template never re-delegates stays so through extends", (d) => {
  extending(d);
  grant(d, "founder-to-finance-lead").may_redelegate = true;
  d.grants.push({ id: "money-on", from: "finance-lead", to: "chief-of-staff", classes: ["spend-register-upkeep"], scope: "finance/", may_redelegate: false, may_merge: false, expires: null });
}, /money-on: .*never re-delegated/);
fails("a one-way door in the template stays one through extends", (d) => { extending(d); grant(d, "founder-to-chief-of-staff").classes.push("contradicts-ledger"); }, /one-way door/);
fails("an extends that does not exist is refused", (d) => { d.extends = "governance/venture-template/gone.json"; }, /does not exist/);
fails("an extends of another kind of record is refused", (d) => { d.extends = "governance/venture-template/decision-rights.json"; }, /not a base delegation record/);

function merger(record) {
  const dir = join(tmp, `v${n++}`);
  mkdirSync(join(dir, "governance"), { recursive: true });
  writeFileSync(join(dir, "venture.json"), "{}");
  writeFileSync(join(dir, "governance/delegation.json"), JSON.stringify({ register: "delegation", root: "founder", founder: ["Torian"], ...record }));
  return dir;
}
const mergeGrant = (cls) => ({ from: "founder", to: "builder", classes: [cls], scope: "venture", may_redelegate: false, may_merge: true, expires: null });
const decision = (cls) => ({ id: "D-1", class: cls });
// A class only the template's list names, so the refusal can only come from reading extends.
const onlyInList = "custom-door";
const customBase = join(tmp, "custom-base.json");
writeFileSync(customBase, JSON.stringify({ register: "delegation", root: "founder", one_way_doors: [onlyInList], grants: [] }));
const extendsPath = relative(repo, customBase);
expect("mayMerge merges a class a grant names", mayMerge(merger({ grants: [mergeGrant(onlyInList)] }), decision(onlyInList), { role: "builder" }).ok);
expect("mayMerge refuses a one-way door that comes only from extends", /one-way door/.test(mayMerge(merger({ extends: extendsPath, grants: [mergeGrant(onlyInList)] }), decision(onlyInList), { role: "builder" }).error ?? ""));
const broken = merger({ extends: "governance/venture-template/gone.json", grants: [mergeGrant("implementation-detail")] });
expect("mayMerge refuses a role when extends cannot be honored", !mayMerge(broken, decision("implementation-detail"), { role: "builder" }).ok);
expect("mayMerge refuses the founder too when extends cannot be honored", !mayMerge(broken, decision("implementation-detail"), { by: "Torian" }).ok);

// Merge authority: a role stays inside its grant's scope and chain; only a founder merges a one-way door.
const inScope = { ...decision("implementation-detail"), applies_to: [{ file: "engineering/x.json", field: "a" }] };
const scoped = merger({ grants: [{ ...mergeGrant("implementation-detail"), id: "g", scope: "engineering/" }] });
expect("mayMerge lets a role merge inside its grant's scope", mayMerge(scoped, inScope, { role: "builder" }).ok);
expect("mayMerge refuses a role outside its grant's scope", /outside the scope/.test(mayMerge(scoped, { ...inScope, applies_to: [{ file: "engineering-secrets/x.json", field: "a" }] }, { role: "builder" }).error ?? ""));
expect("mayMerge refuses a role when any one target is outside its scope", !mayMerge(scoped, { ...inScope, applies_to: [...inScope.applies_to, { file: "finance/x.json", field: "a" }] }, { role: "builder" }).ok);
const stray = merger({ grants: [{ ...mergeGrant("implementation-detail"), from: "people-lead" }] });
expect("mayMerge refuses a grant the chain check rejects", /exceeds its grantor's authority/.test(mayMerge(stray, inScope, { role: "builder" }).error ?? ""));
const peopled = (grants = []) => { const dir = merger({ grants }); mkdirSync(join(dir, "people")); writeFileSync(join(dir, "people/people.json"), JSON.stringify({ people: [{ id: "ana", name: "Ana" }] })); return dir; };
const door = decision("production-ship");
expect("a non-founder person merges an ordinary class", mayMerge(peopled(), decision("implementation-detail"), { by: "Ana" }).ok);
expect("a non-founder person never merges a one-way door", /one-way door/.test(mayMerge(peopled(), door, { by: "Ana" }).error ?? ""));
expect("a founder merges a one-way door", mayMerge(peopled(), door, { by: "Torian" }).ok);

// An agent cannot name a person. The check reads the environment, so it is restored after each case.
const asActor = (vars, fn) => { Object.assign(process.env, vars); try { return fn(); } finally { for (const k of Object.keys(vars)) delete process.env[k]; } };
for (const [what, vars] of [["MENTURA_ACTOR=agent", { MENTURA_ACTOR: "agent" }], ["MENTURA_MODEL", { MENTURA_MODEL: "m" }], ["another MENTURA_ACTOR_ID", { MENTURA_ACTOR_ID: "chief-of-staff" }]])
  expect(`an agent (${what}) cannot merge as the founder`, /is acting/.test(asActor(vars, () => mayMerge(peopled(), door, { by: "Torian" })).error ?? ""));
expect("a person whose MENTURA_ACTOR_ID is their own name still merges", asActor({ MENTURA_ACTOR_ID: "Torian" }, () => mayMerge(peopled(), door, { by: "Torian" })).ok);

// Provenance after the refusal: nothing is recorded as person/Torian.
const pv = peopled();
mkdirSync(join(pv, "operations"));
writeFileSync(join(pv, "venture.json"), JSON.stringify({ id: "pv", name: "Pv", type: "software-startup", phase: "discovery" }));
propose(pv, { id: "d-a", question: "A?", answer: "a", class: "implementation-detail", applies_to: [{ file: "operations/a.json", field: "a" }] }, { agentId: "cos" });
const decided = approve(pv, "d-a", { by: "Torian" });
const provBefore = readFileSync(join(pv, "provenance.jsonl"), "utf8");
expect("an agent's merge as the founder is refused and logs nothing", decided.ok && !asActor({ MENTURA_ACTOR: "agent" }, () => merge(pv, "d-a", { by: "Torian" })).ok && readFileSync(join(pv, "provenance.jsonl"), "utf8") === provBefore, /** @type {*} */ (decided));

// approve checks by the same way, and a raw agent write cannot reopen a decided decision.
propose(pv, { id: "d-b", question: "B?", answer: "b" }, { agentId: "cos" });
expect("approve refuses a name not on the venture's list", /Mallory is not a person/.test(approve(pv, "d-b", { by: "Mallory" }).error ?? ""));
expect("approve refuses a role named as a person", /role, not a person/.test(approve(pv, "d-b", { by: "chief-of-staff" }).error ?? ""));
expect("approve refuses an agent naming the founder", /is acting/.test(asActor({ MENTURA_ACTOR: "agent" }, () => approve(pv, "d-b", { by: "Torian" })).error ?? ""));
expect("the refused approvals leave the decision open", decisions(pv).decisions.find((x) => x.id === "d-b").status === "open");
expect("approve accepts a person on the list", approve(pv, "d-b", { by: "Ana" }).ok);

// Founding roles count from the roles register, and a venture created as a fund has someone who can merge a door.
const rostered = (role) => { const dir = merger({ grants: [] }); mkdirSync(join(dir, "people")); writeFileSync(join(dir, "people/people.json"), JSON.stringify({ people: [{ id: "cole", name: "Cole", role }] })); return dir; };
expect("a co-founder merges a one-way door", mayMerge(rostered("co-founder"), door, { by: "Cole" }).ok);
expect("a general partner merges a one-way door", mayMerge(rostered("general-partner"), door, { by: "Cole" }).ok);
expect("a non-founding role does not", /one-way door/.test(mayMerge(rostered("operator"), door, { by: "Cole" }).error ?? ""));
const fund = join(tmp, "fund");
const made = spawnSync("node", [join(repo, "interface/create-venture/index.mjs"), fund, "--type", "vc-fund", "--name", "Gia Moss", "--yes", "--skip-install", "--no-git"], { encoding: "utf8", input: "", env: { ...process.env, HOME: tmp } });
expect("a vc-fund from create-venture has someone who merges a one-way door", made.status === 0 && mayMerge(fund, door, { by: "Gia Moss" }).ok, made.stderr);

// Setup acts as the founder a venture names, also when it names one only in delegation.json.
const noRoster = merger({ grants: [] });
writeFileSync(join(noRoster, "venture.json"), JSON.stringify({ id: "nr", name: "Nr", type: "software-startup", phase: "discovery" }));
const answered = await decide(noRoster, { id: "discovery-goal", answer: "Ten paying customers" });
expect("setup answers as the founder delegation.json names", answered.ok, JSON.stringify(answered));

// Rollback is a person's act, checked as approve checks it.
propose(pv, { id: "d-r", question: "R?", answer: "one" }, { agentId: "cos" });
approve(pv, "d-r", { by: "Torian" });
approve(pv, "d-r", { by: "Torian", answer: "two" });
expect("rollback refuses a name not on the venture's list", /Mallory is not a person/.test(rollback(pv, "d-r", 1, { by: "Mallory" }).error ?? ""));
expect("rollback refuses a role named as a person", /role, not a person/.test(rollback(pv, "d-r", 1, { by: "chief-of-staff" }).error ?? ""));
expect("rollback refuses an agent naming the founder", /is acting/.test(asActor({ MENTURA_ACTOR: "agent" }, () => rollback(pv, "d-r", 1, { by: "Torian" })).error ?? ""));
expect("the refused rollbacks leave the answer", decisions(pv).decisions.find((x) => x.id === "d-r").answer === "two");
expect("rollback accepts a person on the list", rollback(pv, "d-r", 1, { by: "Torian" }).ok);

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
