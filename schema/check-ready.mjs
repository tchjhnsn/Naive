// Checks that a handoff is ready to execute before anyone starts on it (EE-019): its
// definition of ready. An agent that claims a handoff runs this first; a gap it finds is a
// question for the handoff's author, asked before work starts, not an ambiguity discovered
// halfway through. Every item is objective; judging whether the brief says enough is the
// holder's first act, recorded with --record.
//
//   node schema/check-ready.mjs <venture dir> <handoff id>
//   node schema/check-ready.mjs <venture dir> <handoff id> --record --by <role or session>
//
// --record writes `ready_check` into the handoff (and moves a draft to ready) only when
// every item passes. check-execution.mjs refuses an in-progress handoff without one.

import { execSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [dir, id] = process.argv.slice(2);
if (!dir || !id) { console.error("usage: node schema/check-ready.mjs <venture dir> <handoff id> [--record --by <who>]"); process.exit(2); }
const opt = (k) => process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : undefined;
const root = new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const hPath = join(dir, "operations/handoffs", `${id}.json`);
const h = load(hPath);
const items = [];
const item = (name, ok, why = "") => items.push({ name, ok, why });

// 1. The brief says what done looks like and what to do, with no placeholders left.
const bPath = join(dir, "operations/handoffs", h.brief);
const brief = existsSync(bPath) ? readFileSync(bPath, "utf8") : "";
item("brief exists", !!brief, bPath);
const section = (name) => { const m = brief.match(new RegExp(`^##\\s+(?:\\d+\\.\\s*)?${name}\\b[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))`, "mi")); return m ? m[1].trim() : null; };
for (const s of ["Outcome", "Work"]) { const t = section(s); item(`brief has its ${s} section, with text`, !!t, t === null ? "missing" : "empty"); }
const holes = brief.match(/\b(TBD|TODO|FIXME)\b|\?\?\?|<(?:title|role|entity|outcome|id|date)[^>]*>/gi) ?? [];
item("brief has no placeholders left", !holes.length, holes.slice(0, 3).join(", "));

// 2. Everything it names exists.
const products = new Set(existsSync(join(dir, "products")) ? readdirSync(join(dir, "products")).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : []);
const missingProducts = (h.products ?? []).filter((p) => !products.has(p));
item("every product it serves exists", !missingProducts.length, missingProducts.join(", "));
const logs = [join(root, "docs/decisions/decisions.json"), join(dir, "knowledge/decisions.json")].filter(existsSync).flatMap((f) => load(f).decisions);
const decisions = new Map(logs.map((d) => [d.id, d]));
const badDecisions = (h.governed_by ?? []).filter((d) => !decisions.has(d) || ["withdrawn", "superseded"].includes(decisions.get(d).status));
item("every governing decision exists and is in force or proposed", !badDecisions.length, badDecisions.join(", "));
// A method assignment (such as a MAD A-NNN) belongs to the build method a venture uses, which is
// not part of Mentura (EE-038); a handoff may cite one, and this does not check it.
const missingInputs = (h.inputs ?? []).filter((p) => !existsSync(join(root, p)));
item("every input it needs exists", !missingInputs.length, missingInputs.join(", "));

// 3. The holder can act inside its rights.
const roles = new Set(load(join(root, "governance/venture-template/roles/agent-roles.json")).roles.map((r) => r.id));
const classes = new Map(load(join(root, "governance/venture-template/decision-rights.json")).classes.map((c) => [c.id, c]));
const own = join(dir, "governance/decision-rights.json");
if (existsSync(own)) for (const c of load(own).classes) classes.set(c.id, { ...classes.get(c.id), ...c });
item(`role ${h.role} exists`, roles.has(h.role));
const foreign = h.decision_classes.filter((c) => classes.get(c)?.owner !== h.role);
item("every decision class it carries belongs to its role", !foreign.length, foreign.join(", "));
const open = (h.escalations ?? []).filter((e) => !e.answer);
item("no escalation is waiting for an answer", !open.length, open.map((e) => `${e.class} to ${e.to}`).join(", "));
item("attempts remain", h.attempts < h.max_attempts, `${h.attempts} of ${h.max_attempts}`);

// 4. Done can be proved: the criteria exist and the scripts they call are there.
const kinds = new Set(h.done_criteria.map((d) => d.kind));
item("has a conformance and a self-proof criterion", kinds.has("conformance") && kinds.has("self-proof"));
const scripts = h.done_criteria.filter((d) => d.kind !== "review").flatMap((d) => {
  let cwd = root;
  return d.check.split(/&&|\|/).flatMap((part) => {
    const words = part.trim().split(/\s+/);
    if (words[0] === "cd") { cwd = join(cwd, words[1]); return []; }
    return words.filter((w) => /\.(mjs|js|py|sh)$/.test(w)).map((w) => ({ d: d.id, path: join(cwd, w) }));
  });
});
const lost = scripts.filter((s) => !existsSync(s.path));
item("every script a criterion runs exists", !lost.length, lost.map((s) => `${s.d}: ${s.path.slice(root.length)}`).join(", "));
const badReview = h.done_criteria.filter((d) => d.kind === "review" && (!roles.has(d.reviewer) || d.reviewer === h.role));
item("every review names a reviewer other than the holder", !badReview.length, badReview.map((d) => d.id).join(", "));

for (const i of items) console.log(`${i.ok ? "pass" : "FAIL"}  ${i.name}${!i.ok && i.why ? `: ${i.why}` : ""}`);
const ready = items.every((i) => i.ok);
console.log(ready ? `${h.id} is ready to execute.` : `${h.id} is not ready: ask its author before starting.`);
if (process.argv.includes("--record")) {
  if (!ready) process.exit(1);
  if (!opt("--by")) { console.error("--record needs --by <role or session>"); process.exit(2); }
  const version = execSync("git rev-parse --short HEAD", { cwd: root, encoding: "utf8" }).trim();
  h.ready_check = { at: new Date().toISOString().replace(/\.\d+Z$/, "Z"), by: opt("--by"), version, items: items.length };
  if (h.status === "draft") h.status = "ready";
  writeFileSync(hPath, JSON.stringify(h, null, 2) + "\n");
  console.log(`recorded in ${hPath}`);
}
process.exit(ready ? 0 : 1);
