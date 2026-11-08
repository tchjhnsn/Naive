// Checks delegation: who has handed which decision classes to whom, and who verifies whose work.
// Rules:
//   roles: each role template's verified_by is another known role (never itself); only the chief
//     delegator, the root, has none; its grantable classes exist in decision rights; its function is an
//     id in packages/naive/src/functions/departments.json, or all for the chief delegator and for a lead.
//   leads (lead agents design, 2026-11-08): a role with a portfolio is a lead; its function is all, its
//     portfolio names departments.json ids, and it lists no one-way door or never-redelegated class as
//     grantable and is granted none; together the leads' portfolios cover every function exactly once.
//   grants: from and to are known roles and differ; every class exists, is grantable to the grantee
//     and is not a one-way door; an expired grant fails.
//   chains: a grant from anyone but the root is backed by a live grant to its grantor that holds
//     each class with may_redelegate, a scope at least as wide, may_merge if it gives may_merge and
//     an expiry no earlier; a never-redelegated class is passed on by nobody; every chain reaches
//     the root without a cycle.
//   extends: the template's never_redelegated and one_way_doors bind too; one it cannot read fails.
//
//   node packages/naive/src/checks/check-delegation.mjs [venture dir | delegation.json] [--today YYYY-MM-DD]
//
// With no argument it checks the template (packages/naive/template/governance/delegation.json).

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { grantBacked, liveGrant, readDelegation } from "../core/venture-paths.mjs";
import { independent } from "./verify.mjs";
import { readSchema } from "../records/index.mjs";

const root = new URL("../../../..", import.meta.url).pathname;
const template = join(root, "packages/naive/template/governance");
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const opt = (n) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined;
const today = opt("--today") ?? new Date().toISOString().slice(0, 10);

const arg = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const venture = arg && statSync(arg).isDirectory() ? arg : null;
const file = !arg ? join(template, "delegation.json") : venture ? join(venture, "governance/delegation.json") : arg;
if (!existsSync(file)) { console.log(`no delegation record at ${file}: nothing to check`); process.exit(0); }
const own = (rel) => { const p = venture && join(venture, "governance", rel); return p && existsSync(p) ? p : null; };

let d;
try { d = readDelegation(file); } catch (e) { console.log(`FAIL  ${e.message}`); process.exit(1); }
// A venture's own classes and roles overlay the template's, by id, as check-ready.mjs and router.mjs do.
const classes = new Set(load(join(template, "decision-rights.json")).classes.map((c) => c.id));
if (own("decision-rights.json")) for (const c of load(own("decision-rights.json")).classes) classes.add(c.id);
const functions = new Set(load(join(root, "packages/naive/src/functions/departments.json")).departments.map((f) => f.id));
const errors = [];
// Every file in roles/ is one role template, except the indexes, which list roles in a roles array.
// A template missing its id or verified_by is reported, never skipped.
const roles = new Map();
for (const dir of [join(template, "roles"), own("roles")].filter(Boolean)) for (const f of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const r = load(join(dir, f));
  if (Array.isArray(r.roles)) continue;
  if (!r.id) errors.push(`role file ${f}: has no id`);
  else if (r.verified_by === undefined) errors.push(`role/${r.id}: has no verified_by (null only for the chief delegator)`);
  else roles.set(r.id, r);
}

// Roles: never their own verifier.
for (const r of roles.values()) {
  const at = `role/${r.id}`;
  if (r.verified_by === null) { if (!r.chief_delegator) errors.push(`${at}: only the chief delegator has no verifier`); }
  else if (!roles.has(r.verified_by)) errors.push(`${at}: verifier ${r.verified_by} is not a role`);
  else if (!independent(r.id, r.verified_by)) errors.push(`${at}: may not verify its own work`);
  for (const v of r.also_verified_by ?? []) if (!roles.has(v) || !independent(r.id, v)) errors.push(`${at}: also_verified_by ${v} is not another role`);
  for (const c of r.grantable_classes) if (!classes.has(c)) errors.push(`${at}: grantable class ${c} is not a decision class`);
  if (r.function === "all") { if (!r.chief_delegator && !r.portfolio) errors.push(`${at}: function all is for the chief delegator and for a lead (a role with a portfolio) only`); }
  else if (!functions.has(r.function)) errors.push(`${at}: function ${r.function} is not an id in packages/naive/src/functions/departments.json`);
  if (r.portfolio) {
    if (r.function !== "all") errors.push(`${at}: has a portfolio, so it is a lead and its function is all, not ${r.function}`);
    for (const f of r.portfolio) if (!functions.has(f)) errors.push(`${at}: portfolio function ${f} is not an id in packages/naive/src/functions/departments.json`);
  }
  if (!existsSync(join(root, r.skill))) errors.push(`${at}: skill ${r.skill} not found`);
}
const delegators = [...roles.values()].filter((r) => r.chief_delegator).map((r) => r.id);
if (delegators.length !== 1 || delegators[0] !== d.root) errors.push(`root ${d.root} must be the one chief delegator (found ${delegators.join(", ") || "none"})`);

const oneWay = new Set(d.one_way_doors ?? []);
const never = new Set(d.never_redelegated ?? []);

// Leads: no one-way door or never-redelegated class is grantable to one, and the portfolios cover every function once.
const leads = [...roles.values()].filter((r) => r.portfolio);
for (const r of leads) for (const c of r.grantable_classes) {
  if (oneWay.has(c)) errors.push(`role/${r.id}: is a lead and lists ${c}, a one-way door, as grantable; a person decides it`);
  if (never.has(c)) errors.push(`role/${r.id}: is a lead and lists ${c}, which is never re-delegated, as grantable; it comes straight from ${d.root} to a function agent or a person`);
}
if (leads.length) {
  const holders = new Map([...functions].map((f) => [f, leads.filter((r) => r.portfolio.includes(f)).map((r) => r.id)]));
  for (const [f, by] of holders) {
    if (by.length === 0) errors.push(`portfolios: function ${f} is in no lead's portfolio`);
    if (by.length > 1) errors.push(`portfolios: function ${f} is in more than one lead's portfolio (${by.join(", ")})`);
  }
}
const live = (g) => liveGrant(g, today);
const SCOPE = new RegExp(readSchema("delegation").properties.grants.items.properties.scope.pattern);
const name = (g, i) => `grant/${g.id ?? i}`;

d.grants.forEach((g, i) => {
  const at = name(g, i);
  for (const r of [g.from, g.to]) if (!roles.has(r)) errors.push(`${at}: ${r} is not a role`);
  if (g.from === g.to) errors.push(`${at}: grants to itself`);
  if (g.to === d.root) errors.push(`${at}: grants to the root, which holds everything`);
  if (!live(g)) errors.push(`${at}: expired ${g.expires}`);
  if (!SCOPE.test(g.scope)) errors.push(`${at}: scope ${JSON.stringify(g.scope)} is not "venture" or a plain path`);
  for (const c of g.classes) {
    if (!classes.has(c)) errors.push(`${at}: ${c} is not a decision class`);
    if (oneWay.has(c)) errors.push(`${at}: ${c} is a one-way door and stays with ${d.root}`);
    const to = roles.get(g.to);
    if (to && !to.grantable_classes.includes(c)) errors.push(`${at}: ${c} is not grantable to ${g.to}`);
    if (to?.portfolio && never.has(c)) errors.push(`${at}: ${c} is never re-delegated, and ${g.to} is a lead`);
  }
  const b = grantBacked(d, g, today);
  if (!b.ok) errors.push(`${at}: exceeds its grantor's authority: ${b.why}`);
});

const where = file.startsWith(root) ? file.slice(root.length) : file;
if (errors.length) { console.log(errors.map((e) => `FAIL  ${e}`).join("\n")); console.log(`${where}: ${errors.length} error(s)`); process.exit(1); }
console.log(`${where}: ${d.grants.length} grants, ${roles.size} roles: every chain reaches ${d.root}, no role verifies itself${leads.length ? `; ${leads.length} leads cover the ${functions.size} functions once each` : ""}`);
