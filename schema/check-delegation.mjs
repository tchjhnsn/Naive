// Checks delegation: who has handed which decision classes to whom, and who verifies whose work.
// Rules:
//   roles: each role template's verified_by is another known role (never itself); only the chief
//     delegator, the root, has none; its grantable classes exist in decision rights.
//   grants: from and to are known roles and differ; every class exists, is grantable to the grantee
//     and is not a one-way door; an expired grant fails.
//   chains: a grant from anyone but the root is backed by a live grant to its grantor that holds
//     each class with may_redelegate, a scope at least as wide, may_merge if it gives may_merge and
//     an expiry no earlier; a never-redelegated class is passed on by nobody; every chain reaches
//     the root without a cycle.
//
//   node schema/check-delegation.mjs [venture dir | delegation.json] [--today YYYY-MM-DD]
//
// With no argument it checks the template (governance/venture-template/delegation.json).

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { independent } from "./verify.mjs";

const root = new URL("..", import.meta.url).pathname;
const template = join(root, "governance/venture-template");
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const opt = (n) => process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : undefined;
const today = opt("--today") ?? new Date().toISOString().slice(0, 10);

const arg = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const venture = arg && statSync(arg).isDirectory() ? arg : null;
const file = !arg ? join(template, "delegation.json") : venture ? join(venture, "governance/delegation.json") : arg;
if (!existsSync(file)) { console.log(`no delegation record at ${file}: nothing to check`); process.exit(0); }
// A venture's own roles and decision rights win; the template's fill the gaps.
const pick = (rel) => venture && existsSync(join(venture, "governance", rel)) ? join(venture, "governance", rel) : join(template, rel);

const d = load(file);
const rolesDir = pick("roles");
const classes = new Set(load(pick("decision-rights.json")).classes.map((c) => c.id));
const errors = [];
// Every file in roles/ is one role template, except the indexes, which list roles in a roles array.
// A template missing its id or verified_by is reported, never skipped.
const roles = new Map();
for (const f of readdirSync(rolesDir).filter((f) => f.endsWith(".json"))) {
  const r = load(join(rolesDir, f));
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
  if (!existsSync(join(root, r.skill))) errors.push(`${at}: skill ${r.skill} not found`);
}
const delegators = [...roles.values()].filter((r) => r.chief_delegator).map((r) => r.id);
if (delegators.length !== 1 || delegators[0] !== d.root) errors.push(`root ${d.root} must be the one chief delegator (found ${delegators.join(", ") || "none"})`);

const oneWay = new Set(d.one_way_doors ?? []), fixed = new Set(d.never_redelegated ?? []);
const live = (g) => g.expires === null || g.expires >= today;
// Scopes are paths compared by whole segments: engineering/ holds engineering/api, never engineering-secrets/.
const segments = (scope) => scope.split("/").filter(Boolean);
const within = (inner, outer) => outer === "venture" || (inner !== "venture"
  && segments(outer).every((s, i) => segments(inner)[i] === s));
const later = (a, b) => b === null || (a !== null && a <= b); // a ends no later than b
const name = (g, i) => `grant/${g.id ?? i}`;

// Is grant g backed all the way to the root? seen guards against cycles.
const backed = (g, seen = new Set()) => {
  if (g.from === d.root) return { ok: true };
  if (seen.has(g)) return { ok: false, why: "its chain loops" };
  seen.add(g);
  for (const c of g.classes) {
    if (fixed.has(c)) return { ok: false, why: `${c} is never re-delegated` };
    const up = d.grants.filter((h) => h.to === g.from && h.classes.includes(c) && h.may_redelegate && live(h)
      && within(g.scope, h.scope) && (!g.may_merge || h.may_merge) && later(g.expires, h.expires) && backed(h, new Set(seen)).ok);
    if (!up.length) return { ok: false, why: `${g.from} holds no live, re-delegable grant of ${c} at least this wide that reaches ${d.root}` };
  }
  return { ok: true };
};

d.grants.forEach((g, i) => {
  const at = name(g, i);
  for (const r of [g.from, g.to]) if (!roles.has(r)) errors.push(`${at}: ${r} is not a role`);
  if (g.from === g.to) errors.push(`${at}: grants to itself`);
  if (g.to === d.root) errors.push(`${at}: grants to the root, which holds everything`);
  if (!live(g)) errors.push(`${at}: expired ${g.expires}`);
  for (const c of g.classes) {
    if (!classes.has(c)) errors.push(`${at}: ${c} is not a decision class`);
    if (oneWay.has(c)) errors.push(`${at}: ${c} is a one-way door and stays with ${d.root}`);
    const to = roles.get(g.to);
    if (to && !to.grantable_classes.includes(c)) errors.push(`${at}: ${c} is not grantable to ${g.to}`);
  }
  const b = backed(g);
  if (!b.ok) errors.push(`${at}: exceeds its grantor's authority: ${b.why}`);
});

const where = file.startsWith(root) ? file.slice(root.length) : file;
if (errors.length) { console.log(errors.map((e) => `FAIL  ${e}`).join("\n")); console.log(`${where}: ${errors.length} error(s)`); process.exit(1); }
console.log(`${where}: ${d.grants.length} grants, ${roles.size} roles: every chain reaches ${d.root}, no role verifies itself`);
