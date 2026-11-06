// Checks a venture's handoffs (operations, EE-038) and evidence records against its decision rights (EE-017).
// Validate each file against its schema first; this checks how they fit together.
//
//   node packages/naive/src/checks/check-execution.mjs <venture dir>
//
// Rules: a venture's decision rights only tighten the template unless a decision is named;
// every handoff names a known role, carries only classes that role owns, has a brief, at
// least one conformance and one self-proof criterion (EE-006), stays within max_attempts
// or is escalated, has passed its readiness check before going in progress (EE-019), and is escalated with an open question when its status says so. A done
// handoff has a PR and passing evidence for every done-criterion; a review passes only from
// its named reviewer, who is never the holder's role. Every evidence file's
// passed flag matches its results.

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";
import { independent, reviewIsIndependent } from "./verify.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node packages/naive/src/checks/check-execution.mjs <venture dir>"); process.exit(2); }
const root = new URL("../../../..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const jsonIn = (d) => existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => join(d, f)) : [];
const RANK = { decide: 0, "decide-inform": 1, "recommend-approve": 2, escalate: 3 };

const venture = load(join(dir, "venture.json"));
const roles = new Set(load(join(root, "governance/venture-template/roles/agent-roles.json")).roles.map((r) => r.id));
const template = load(join(root, "governance/venture-template/decision-rights.json"));
const errors = [];

const classes = new Map(template.classes.map((c) => [c.id, c]));
const own = join(ventureFile(dir, "governance/decision-rights.json"));
if (existsSync(own)) for (const c of load(own).classes) {
  const t = classes.get(c.id);
  if (t && RANK[c.level] < RANK[t.level] && !c.decision) errors.push(`decision-rights/${c.id}: loosens ${t.level} to ${c.level} without naming a decision`);
  classes.set(c.id, { ...t, ...c });
}
for (const c of classes.values()) if (!roles.has(c.owner)) errors.push(`decision-rights/${c.id}: owner ${c.owner} is not a role`);

const results = new Map();
for (const f of jsonIn(join(ventureFile(dir, "evidence/results")))) {
  const e = load(f);
  if (e.passed !== e.results.every((r) => r.passed)) errors.push(`evidence/${e.id}: passed says ${e.passed} but its results disagree`);
  results.set(resolve(f), e);
}

let count = 0;
for (const f of jsonIn(join(ventureFile(dir, "operations/handoffs")))) {
  const h = load(f), at = `handoff/${h.id}`;
  count++;
  if (h.venture !== venture.id) errors.push(`${at}: venture ${h.venture} is not ${venture.id}`);
  if (!roles.has(h.role)) errors.push(`${at}: role ${h.role} is not a role`);
  if (!existsSync(join(dirname(f), h.brief))) errors.push(`${at}: brief ${h.brief} not found`);
  for (const id of h.decision_classes) {
    const c = classes.get(id);
    if (!c) errors.push(`${at}: unknown decision class ${id}`);
    else if (c.owner !== h.role) errors.push(`${at}: class ${id} belongs to ${c.owner}, not ${h.role}`);
  }
  const kinds = new Set(h.done_criteria.map((d) => d.kind));
  if (!kinds.has("conformance")) errors.push(`${at}: no conformance criterion`);
  if (!kinds.has("self-proof")) errors.push(`${at}: no self-proof criterion (EE-006)`);
  for (const d of h.done_criteria) if (d.kind === "review" && !reviewIsIndependent(d, h.role, roles)) errors.push(`${at}/${d.id}: review needs a reviewer role other than the holder's`);
  if (h.attempts > h.max_attempts) errors.push(`${at}: ${h.attempts} attempts exceed max_attempts ${h.max_attempts}`);
  if (h.attempts === h.max_attempts && !["done", "escalated"].includes(h.status)) errors.push(`${at}: attempts used up, so it is done or escalated`);
  const open = (h.escalations ?? []).filter((e) => !e.answer);
  if (h.status === "escalated" && !open.length) errors.push(`${at}: escalated with no open question`);
  if (h.status === "in-progress" && !h.ready_check) errors.push(`${at}: in progress without a recorded readiness check (node packages/naive/src/checks/check-ready.mjs --record)`);
  if (!["draft", "ready"].includes(h.status) && !h.claimed_by) errors.push(`${at}: ${h.status} but not claimed`);
  if (h.status === "done") {
    if (!h.pr) errors.push(`${at}: done without a PR`);
    const proved = new Set();
    for (const p of h.evidence ?? []) {
      const e = results.get(resolve(dirname(f), p));
      if (!e) { errors.push(`${at}: evidence ${p} not found under evidence/results`); continue; }
      if (e.subject.kind !== "handoff" || e.subject.id !== h.id) errors.push(`${at}: evidence ${e.id} is about ${e.subject.kind} ${e.subject.id}`);
      for (const r of e.results.filter((x) => x.passed)) {
        const c = h.done_criteria.find((d) => d.id === r.criterion);
        if (c?.kind === "review" && (r.by !== c.reviewer || !independent(h.role, r.by))) { errors.push(`${at}: review ${c.id} must be passed by ${c.reviewer}, not ${r.by ?? "nobody named"}`); continue; }
        proved.add(r.criterion);
      }
    }
    for (const d of h.done_criteria) if (!proved.has(d.id)) errors.push(`${at}: done, but criterion ${d.id} has no passing evidence`);
  }
}

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${venture.id}: ${classes.size} decision classes, ${count} handoffs, ${results.size} evidence files: all execution rules hold.`);
