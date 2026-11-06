#!/usr/bin/env node
// Investors lint: the investors function's decisions and records, held to what it inherits
// from foundation alignment and to its own records.
//
//   node packages/naive/src/checks/lint-investors.mjs <venture dir> [--json]
//
// Rules are fail-open (warn) by default. naive.config.json investors_lint.rules.<id>.mode set to
// "fail-closed" makes that rule's findings fail the run (exit 1). Every record is read through
// ventureFile (packages/naive/src/core/venture-paths.mjs). A missing file or a file that is not JSON is skipped.
//
// A raise decision is a decision whose id or question says raise, raising, fundraise or
// fundraising. It has a use of funds when the answer, the note, an option or an outcome says
// "use of funds".
//
// Terms are the terms text on an investor record, the answer of a decision whose id or question
// says term or terms, and the rights and instruments on governance/ownership. An alignment
// principle (foundation/alignment.json, or purpose/alignment.json when the foundation file is
// absent) conflicts when its statement says "never" or "must not" and the terms contain the
// distinctive words of that clause: every hyphenated word of 10 or more characters, or, when
// the clause has none, every other word of 12 or more characters. Terms that quote the
// principle's whole statement do not conflict.
//
// An investor update is an item of updates on investors/<id>.json, with status and numbers.
// A number with a value is unconfirmed unless confirmed is true. Draft and sent updates are
// both flagged. Sending does not clear the flag.

import { existsSync, readFileSync } from "node:fs";
import { logicalFiles, ventureFile } from "../core/venture-paths.mjs";

const load = (dir, rel) => {
  try { return JSON.parse(readFileSync(ventureFile(dir, rel), "utf8")); } catch { return null; }
};

const RAISE = /\b(raise|raising|fundraise|fundraising)\b/i;
const USE = /\buse of funds\b/i;
const TERM = /\bterms?\b/i;
const STOP = new Set(["accept", "right", "rights", "investor", "investors", "never", "must", "with", "from", "that", "this", "their", "venture", "founder", "founders", "decision", "present", "because", "without", "before", "should", "always", "about", "would", "could", "there", "which", "where"]);

export const RULES = [
  { id: "raise-no-use-of-funds", description: "A raise decision with no use of funds", severity: "warn", mode: "fail-open" },
  { id: "terms-conflict-alignment", description: "Terms that conflict with an alignment principle", severity: "warn", mode: "fail-open" },
  { id: "update-unconfirmed-numbers", description: "An investor update with unconfirmed numbers", severity: "warn", mode: "fail-open" },
];

const kept = (rel) => {
  const parts = rel.split("/");
  if (parts.some((p) => p.startsWith(".") || p.startsWith("_"))) return false;
  return parts[0] !== "codebase" && parts[0] !== "repo" && parts[0] !== "node_modules";
};

function decisionPaths(dir) {
  return logicalFiles(dir).filter((rel) => kept(rel) && rel.endsWith(".decision.json") && rel.split("/").at(-2) === "decisions").sort();
}

function investorPaths(dir) {
  return logicalFiles(dir).filter((rel) => kept(rel) && /^investors\/[^/]+\.json$/.test(rel)).sort();
}

const record = (v) => v && typeof v === "object" && !Array.isArray(v);

function prose(d) {
  const parts = [];
  if (typeof d.answer === "string") parts.push(d.answer);
  if (typeof d.note === "string") parts.push(d.note);
  if (Array.isArray(d.options)) for (const o of d.options) if (typeof o === "string") parts.push(o);
  if (Array.isArray(d.outcomes)) for (const o of d.outcomes) {
    if (!record(o)) continue;
    if (typeof o.id === "string") parts.push(o.id);
    if (typeof o.projected === "string") parts.push(o.projected);
  }
  return parts.join("\n");
}

function principlesOf(dir) {
  for (const rel of ["foundation/alignment.json", "purpose/alignment.json"]) {
    const rec = load(dir, rel);
    if (!record(rec) || !("principles" in rec)) continue;
    const principles = (Array.isArray(rec.principles) ? rec.principles : []).filter((p) => record(p) && typeof p.id === "string" && typeof p.statement === "string");
    return principles;
  }
  return [];
}

function forbiddenClause(statement) {
  const m = statement.match(/\b(?:never|must not)\b\s+([^.]{12,})/i);
  return m ? m[1].trim() : null;
}

// Hyphenated words of 10 or more characters, or plain words of 12 or more when there is no hyphenated word.
function distinctive(clause) {
  const words = clause.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? [];
  const tokens = [...new Set(words.filter((w) => !STOP.has(w)))];
  const hyphenated = tokens.filter((w) => w.includes("-") && w.length >= 10);
  if (hyphenated.length) return hyphenated;
  return tokens.filter((w) => w.length >= 12);
}

function conflictingWords(statement, terms) {
  const whole = statement.trim().toLowerCase();
  if (whole && terms.toLowerCase().includes(whole)) return null;
  const clause = forbiddenClause(statement);
  if (!clause) return null;
  const need = distinctive(clause);
  if (!need.length) return null;
  const text = terms.toLowerCase();
  const hit = need.filter((w) => text.includes(w));
  return hit.length === need.length ? hit.join(", ") : null;
}

function termsField(t) {
  if (typeof t === "string") return t.trim();
  if (!record(t)) return "";
  return ["text", "summary", "instrument", "note"].map((k) => (typeof t[k] === "string" ? t[k] : "")).filter(Boolean).join("\n").trim();
}

function ownershipText(o) {
  const bits = [];
  if (Array.isArray(o.classes)) for (const c of o.classes) {
    if (!record(c) || !Array.isArray(c.rights)) continue;
    for (const r of c.rights) if (typeof r === "string") bits.push(r, r.replace(/-/g, " "));
  }
  if (Array.isArray(o.instruments)) for (const i of o.instruments) {
    if (!record(i) || typeof i.kind !== "string") continue;
    bits.push(i.kind, i.kind.replace(/-/g, " "));
  }
  return bits.join("\n").trim();
}

function hasFigure(n) {
  if (typeof n.value === "number") return Number.isFinite(n.value);
  return typeof n.value === "string" && n.value.trim() !== "";
}

const figureName = (n) => (typeof n.name === "string" && n.name.trim() ? n.name.trim() : typeof n.label === "string" && n.label.trim() ? n.label.trim() : "a number");

export { investorsLintCommands } from "../records/routes/commands.mjs";

export function lint(dir) {
  const cfg = load(dir, "naive.config.json");
  const overrides = record(cfg) && record(cfg.investors_lint) && record(cfg.investors_lint.rules) ? cfg.investors_lint.rules : {};
  const rules = RULES.map((r) => ({ ...r, mode: overrides[r.id]?.mode === "fail-open" || overrides[r.id]?.mode === "fail-closed" ? overrides[r.id].mode : r.mode }));
  const mode = Object.fromEntries(rules.map((r) => [r.id, r.mode]));
  const findings = [];
  const add = (rule, file, message, suggestion) => findings.push({ rule, mode: mode[rule], file, message, suggestion });

  for (const rel of decisionPaths(dir)) {
    const d = load(dir, rel);
    if (!record(d)) continue;
    if (RAISE.test(`${d.id ?? ""} ${typeof d.question === "string" ? d.question : ""}`) && !USE.test(prose(d))) {
      add("raise-no-use-of-funds", rel, "raise decision states no use of funds", 'Say how the money will be used, including the words "use of funds", in the answer, the note, an option or an outcome');
    }
  }

  const principles = principlesOf(dir);
  const sources = [];
  for (const rel of investorPaths(dir)) {
    const rec = load(dir, rel);
    if (!record(rec)) continue;
    const text = termsField(rec.terms);
    if (text) sources.push({ file: rel, text });
  }
  for (const rel of decisionPaths(dir)) {
    const d = load(dir, rel);
    if (!record(d) || !TERM.test(`${d.id ?? ""} ${typeof d.question === "string" ? d.question : ""}`)) continue;
    const text = prose(d);
    if (text) sources.push({ file: rel, text });
  }
  const ownership = load(dir, "governance/ownership.json");
  if (record(ownership)) {
    const text = ownershipText(ownership);
    if (text) sources.push({ file: "governance/ownership.json", text });
  }
  for (const src of sources) for (const p of principles) {
    const words = conflictingWords(p.statement, src.text);
    if (words) add("terms-conflict-alignment", src.file, `terms include ${words}, which alignment principle ${p.id} forbids`, `change the terms, or change principle ${p.id} in foundation/alignment if the founder meant to allow this`);
  }

  for (const rel of investorPaths(dir)) {
    const rec = load(dir, rel);
    if (!record(rec) || !Array.isArray(rec.updates)) continue;
    rec.updates.forEach((u, i) => {
      if (!record(u) || !Array.isArray(u.numbers)) return;
      const bad = u.numbers.filter((n) => record(n) && hasFigure(n) && n.confirmed !== true);
      if (!bad.length) return;
      const status = typeof u.status === "string" && u.status.trim() ? u.status.trim() : "draft";
      const id = typeof u.id === "string" && u.id.trim() ? u.id.trim() : `update ${i + 1}`;
      add("update-unconfirmed-numbers", rel, `investor update ${id} is ${status} and cites ${bad.map(figureName).join(", ")} without confirmed: true`, status === "sent" ? "confirm the numbers, or mark the update draft until a person confirms them" : "confirm each number before you send the update");
    });
  }

  findings.sort((a, b) => a.rule.localeCompare(b.rule) || a.file.localeCompare(b.file) || a.message.localeCompare(b.message));
  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, rules, findings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(ventureFile(dir, "venture.json"))) {
    console.error("usage: node packages/naive/src/checks/lint-investors.mjs <venture dir> [--json]");
    process.exit(2);
  }
  const r = lint(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}
