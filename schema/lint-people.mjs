#!/usr/bin/env node
// People alignment lint: roles, hires and decisions held to the team plan and the org chart.
//
//   node schema/lint-people.mjs <venture dir> [--json]
//
// Rules are fail-open (warn) by default. naive.config.json people_lint.rules.<id>.mode set to
// "fail-closed" makes that rule's findings fail the run (exit 1). Every record body is read
// through ventureFile. A missing or unreadable record is skipped.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { logical, ventureFile } from "../packages/core/venture-paths.mjs";
import { roles as roleRegistry } from "./venture-type.mjs";

const asArray = (x) => Array.isArray(x) ? x : [];
const registry = () => {
  try { return new Map(roleRegistry().map((r) => [r.id, r])); } catch { return new Map(); }
};

export const RULES = [
  { id: "role-no-function", description: "A role with no owner function", severity: "warn", mode: "fail-open" },
  { id: "hire-before-plan", description: "A hire before the team plan names the role", severity: "warn", mode: "fail-open" },
  { id: "decision-no-person", description: "A decision owned by no person", severity: "warn", mode: "fail-open" },
];

const PLAN_FILES = ["people/team-plan.json", "operations/team-plan.json"];

// Missing, malformed, or a parsed object. Arrays and other JSON are malformed. Never throws.
function loadRecord(dir, rel) {
  const f = ventureFile(dir, rel);
  if (!existsSync(f)) return { status: "missing" };
  try {
    const value = JSON.parse(readFileSync(f, "utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) return { status: "malformed" };
    return { status: "ok", value };
  } catch { return { status: "malformed" }; }
}

function decisionRels(dir) {
  const out = [];
  const walk = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "codebase" || e.name === "repo" || /^[._]/.test(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (existsSync(join(p, "venture.json"))) continue;
        walk(p);
      } else if (e.name.endsWith(".decision.json") && d.split("/").at(-1) === "decisions") out.push(logical(dir, relative(dir, p)));
    }
  };
  walk(dir);
  return [...new Set(out)].sort();
}

function teamPlan(dir) {
  for (const rel of PLAN_FILES) {
    const rec = loadRecord(dir, rel);
    if (rec.status !== "missing") return { rel, ...rec };
  }
  return { rel: PLAN_FILES[0], status: "missing" };
}

function ownersOf(venture) {
  const out = new Set();
  const fns = venture?.functions;
  if (!fns || typeof fns !== "object" || Array.isArray(fns)) return out;
  for (const f of Object.values(fns)) if (f && typeof f.owner === "string" && f.owner.trim()) out.add(f.owner.trim());
  return out;
}

// Structured layout: venture.json functions say who owns each one. Flat layout: hats do.
function personOwns(p, venture) {
  if (!p || typeof p !== "object") return false;
  if (venture?.layout === "structured") {
    const owners = ownersOf(venture);
    return [p.id, p.role, p.name].some((x) => typeof x === "string" && owners.has(x.trim()));
  }
  const hats = asArray(p.hats).filter((h) => typeof h === "string" && h);
  if (!hats.length) return false;
  const departments = asArray(venture?.departments).filter((d) => typeof d === "string");
  return departments.length ? hats.some((h) => departments.includes(h)) : true;
}

function mustOwn(roleId, reg) {
  if (typeof roleId !== "string" || !roleId) return false;
  const role = reg.get(roleId);
  return !(role && role.owns_when_solo === false);
}

// A hire is a recruiting entry of kind hire, or a person who is not a founder.
// Advisors, board members and limited partners are not hires. An unknown role is.
function isHireRole(roleId, reg) {
  const role = reg.get(roleId);
  if (!role) return true;
  return !role.founder && role.kind === "operator";
}

function namedRoles(plan) {
  const ids = new Set();
  for (const r of asArray(plan?.roles)) if (r && typeof r.id === "string" && r.id) ids.add(r.id);
  return ids;
}

function decisionHasPerson(d, names, checkRoster) {
  const agent = d?.provenance?.drafted_by?.kind === "agent" && typeof d.provenance.drafted_by.id === "string" ? d.provenance.drafted_by.id : null;
  return [d?.provenance?.approved_by, d?.decided_by].some((name) => {
    if (typeof name !== "string" || !name.trim() || name.trim() === agent) return false;
    return checkRoster ? names.has(name.trim()) : true;
  });
}

export const peopleLintCommands = (cmd) => [
  cmd("people/lint", "schema/lint-people.mjs", "People alignment lint: a role with no function it owns, a hire before the team plan names the role, and a decision owned by no person. Fail-open unless naive.config.json people_lint.rules.<id>.mode is fail-closed", { args: [] }),
];

export function lint(dir) {
  const reg = registry();
  const cfg = loadRecord(dir, "naive.config.json");
  const raw = cfg.status === "ok" ? cfg.value?.people_lint?.rules : null;
  const rulesCfg = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const rules = RULES.map((r) => {
    const mode = rulesCfg[r.id] && typeof rulesCfg[r.id] === "object" ? rulesCfg[r.id].mode : undefined;
    return { ...r, mode: mode === "fail-open" || mode === "fail-closed" ? mode : r.mode };
  });
  const modeOf = Object.fromEntries(rules.map((r) => [r.id, r.mode]));
  const findings = [];
  const add = (rule, file, message, suggestion) => findings.push({ rule, mode: modeOf[rule], file, message, suggestion });

  const ventureRec = loadRecord(dir, "venture.json");
  const venture = ventureRec.status === "ok" ? ventureRec.value : null;
  const roster = loadRecord(dir, "people/people.json");
  const people = roster.status === "ok" ? asArray(roster.value.people).filter((p) => p && typeof p === "object") : [];
  const names = new Set(people.flatMap((p) => [p.id, typeof p.name === "string" ? p.name.trim() : ""].filter((x) => typeof x === "string" && x)));
  const plan = teamPlan(dir);
  const named = plan.status === "ok" ? namedRoles(plan.value) : new Set();
  const reported = new Set();

  if (roster.status === "ok") for (const p of people) {
    if (!mustOwn(p.role, reg) || personOwns(p, venture)) continue;
    reported.add(p.role);
    const who = p.name || p.id || p.role;
    add("role-no-function", "people/people.json", `${who} is a ${p.role} and owns no function`, `name ${p.id || p.role} as the owner of a function in venture.json, or give them a hat the venture imports`);
  }
  if (plan.status === "ok") for (const r of asArray(plan.value.roles)) {
    if (!r || r.occupant !== "person" || typeof r.id !== "string" || !mustOwn(r.id, reg) || reported.has(r.id)) continue;
    const held = people.some((p) => p.role === r.id && personOwns(p, venture));
    const byId = venture?.layout === "structured" && ownersOf(venture).has(r.id);
    const soleOwner = r.id === "founder" && typeof venture?.owner === "string" && venture.owner.trim() && !ownersOf(venture).size;
    if (held || byId || soleOwner) continue;
    add("role-no-function", plan.rel, `role ${r.id} owns no function`, `name ${r.id} as a function owner in venture.json, or give the person who holds it a hat`);
  }

  if (plan.status === "ok") for (const rec of asArray(plan.value.recruiting)) {
    if (!rec || typeof rec !== "object" || rec.kind !== "hire" || typeof rec.role !== "string" || !rec.role || named.has(rec.role)) continue;
    add("hire-before-plan", plan.rel, `a hire for ${rec.role} is on the books and the team plan does not name that role`, `add ${rec.role} to the team plan before hiring`);
  }
  if (roster.status === "ok") for (const p of people) {
    if (typeof p.role !== "string" || !isHireRole(p.role, reg) || named.has(p.role)) continue;
    const who = p.name || p.id || p.role;
    add("hire-before-plan", "people/people.json", `${who} was hired as ${p.role} before the team plan names that role`, `add ${p.role} to the team plan, then keep the hire`);
  }

  for (const rel of decisionRels(dir)) {
    const rec = loadRecord(dir, rel);
    if (rec.status !== "ok" || rec.value.status !== "decided" || decisionHasPerson(rec.value, names, roster.status === "ok")) continue;
    add("decision-no-person", rel, "decided, and no person owns it", "set provenance.approved_by to the person who decided");
  }

  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, rules, findings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node schema/lint-people.mjs <venture dir> [--json]"); process.exit(2); }
  const r = lint(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}
