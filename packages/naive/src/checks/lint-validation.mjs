#!/usr/bin/env node
// Validation alignment lint: claims, evidence and decisions held to the validation records.
//
//   node packages/naive/src/checks/lint-validation.mjs <venture dir> [--json] [--now <iso>]
//
// Rules are fail-open (warn) by default. naive.config.json validation_lint.rules.<id>.mode
// set to "fail-closed" makes a rule's findings fail the run (exit 1). Every venture record
// is read through ventureFile. A missing or malformed record is skipped.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { grade, gradeRecord } from "./check-validation.mjs";
import { label } from "../engine/assess-problem.mjs";
import { logicalFiles, ventureFile } from "../core/venture-paths.mjs";

const DAY = 86400000;
const UNITS = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
const KINDS = new Set(["behavior", "commitment", "stated", "desk-research", "opinion"]);

export const RULES = [
  { id: "claim-no-evidence", description: "A claim with no evidence", severity: "warn", mode: "fail-open" },
  { id: "stale-evidence", description: "Evidence older than its shelf life", severity: "warn", mode: "fail-open" },
  { id: "agent-only-grade", description: "An assumption graded only by agents", severity: "warn", mode: "fail-open" },
  { id: "discovery-grade-decision", description: "A decision made in Validation on Discovery-grade evidence", severity: "warn", mode: "fail-open" },
];

// Package path first, then the pre-migration path. The first file that exists is the record.
/** @type {[string, string[]][]} */
const PLACES = [
  ["problem", ["foundation/problem.json", "purpose/validation/problem.json"]],
  ["solution", ["validation/solution.json", "purpose/validation/solution.json"]],
  ["product-market-fit", ["validation/product-market-fit.json", "purpose/validation/product-market-fit.json"]],
  ["pricing", ["validation/pricing.json", "purpose/validation/pricing.json"]],
  ["go-to-market", ["validation/go-to-market.json", "purpose/validation/go-to-market.json"]],
  ["team", ["people/team.json", "purpose/validation/team.json"]],
  ["operations-readiness", ["validation/operations-readiness.json", "purpose/validation/operations-readiness.json"]],
];
const BY_RECORD = {
  "validation-problem": "problem",
  "validation-solution": "solution",
  "validation-product-market-fit": "product-market-fit",
  "validation-pricing": "pricing",
  "validation-go-to-market": "go-to-market",
  "validation-team": "team",
  "validation-operations-readiness": "operations-readiness",
};

const load = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const read = (dir, rel) => { const f = ventureFile(dir, rel); return existsSync(f) ? load(f) : null; };
const known = (rel) => PLACES.find(([, paths]) => paths.includes(rel))?.[0] ?? null;
const skipped = (rel) => rel.split("/").some((s) => !s || /^[._]/.test(s) || ["node_modules", "repo", "codebase"].includes(s));
const usable = (e) => e && typeof e === "object" && !Array.isArray(e) && (e.id || e.kind || e.summary || e.collected);
const gradeable = (e) => usable(e) && KINDS.has(e.kind) && typeof e.collected === "string" && e.source && typeof e.source === "object";

function durationMs(d) {
  if (typeof d === "number" && Number.isInteger(d) && d >= 0) return d * 1000;
  const m = typeof d === "string" ? d.match(/^(\d+)(s|m|h|d|w)$/) : null;
  return m ? Number(m[1]) * UNITS[m[2]] * 1000 : null;
}
const human = (ms) => { const s = ms / 1000; return s % 604800 === 0 && s ? `${s / 604800}w` : s % 86400 === 0 && s ? `${s / 86400}d` : `${s}s`; };

// The assumption profile (packages/naive/src/engine/freshness.json): expire is the shelf, per_phase restarts it
// when the venture changes phase. A venture may override it under freshness in naive.config.json.
function shelfOf(dir) {
  let expire = 365 * DAY, perPhase = true;
  try {
    const a = JSON.parse(readFileSync(new URL("../engine/freshness.json", import.meta.url), "utf8"))?.profiles?.assumption ?? {};
    const ms = durationMs(a.expire);
    if (ms != null) expire = ms;
    if (typeof a.per_phase === "boolean") perPhase = a.per_phase;
  } catch { /* the 365d per-phase default stands */ }
  const over = read(dir, "naive.config.json")?.freshness?.profiles?.assumption;
  if (over && typeof over === "object") {
    if (over.expire !== undefined) { const ms = durationMs(over.expire); if (ms != null) expire = ms; }
    if (typeof over.per_phase === "boolean") perPhase = over.per_phase;
  }
  return { expire, perPhase };
}

function phaseMoves(dir) {
  const f = ventureFile(dir, "knowledge/freshness.jsonl");
  if (!existsSync(f)) return [];
  let text = "";
  try { text = readFileSync(f, "utf8"); } catch { return []; }
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e = JSON.parse(line);
      if (e?.event === "phase" && typeof e.at === "string" && !Number.isNaN(Date.parse(e.at))) out.push(e);
    } catch { /* one bad line does not drop the rest */ }
  }
  return out;
}

function pastShelf(collected, now, moves, shelf) {
  const t = Date.parse(collected);
  if (Number.isNaN(t)) return [];
  const reasons = [];
  if (now - t >= shelf.expire) reasons.push(`collected ${collected}, past the assumption shelf life of ${human(shelf.expire)}`);
  if (shelf.perPhase) {
    const moved = moves.find((e) => Date.parse(e.at) > t);
    if (moved) reasons.push(`the venture moved from ${moved.from ?? "an earlier phase"} to ${moved.to ?? "a later phase"} on ${String(moved.at).slice(0, 10)} after it was collected`);
  }
  return reasons;
}

function claims(dir) {
  const out = [];
  for (const [name, paths] of PLACES) {
    const rel = paths.find((p) => existsSync(ventureFile(dir, p)));
    if (!rel) continue;
    const rec = read(dir, rel);
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
    out.push({ name, rel, rec });
  }
  return out;
}

function safeGrade(name, rec, now) {
  try {
    const items = (Array.isArray(rec.evidence) ? rec.evidence : []).filter(gradeable);
    if (name !== "operations-readiness") return gradeRecord({ evidence: items }, now);
    const tiers = (Array.isArray(rec.tiers) ? rec.tiers : []).filter((t) => t && typeof t === "object" && t.tier)
      .map((t) => ({ tier: t.tier, evidence: (Array.isArray(t.evidence) ? t.evidence : []).filter(gradeable) }));
    if (!tiers.length) return gradeRecord({ evidence: items }, now);
    return grade(name, { tiers, evidence: items }, now);
  } catch { return null; }
}

function claimPath(dir, rel, d) {
  if (typeof d?.decides?.path === "string" && known(d.decides.path)) return d.decides.path;
  const name = typeof d?.decides?.record === "string" ? BY_RECORD[d.decides.record] : null;
  if (name) {
    const hit = PLACES.find(([n]) => n === name)[1].find((p) => existsSync(ventureFile(dir, p)));
    if (hit) return hit;
  }
  const m = typeof rel === "string" ? rel.match(/^(.*)\/decisions\/([a-z0-9-]+?)(?:\.[a-z0-9-]+)*\.decision\.json$/) : null;
  if (!m) return null;
  const file = `${m[1]}/${m[2]}.json`;
  return known(file) ? file : null;
}

function evidenceOf(rec) {
  return Array.isArray(rec?.evidence) ? rec.evidence.filter(usable) : [];
}

export function lint(dir, { now = new Date() } = {}) {
  const today = now instanceof Date ? now : new Date(now);
  const t = Number.isNaN(today.getTime()) ? new Date() : today;
  const nowMs = t.getTime();
  const cfg = read(dir, "naive.config.json")?.validation_lint?.rules ?? {};
  const rules = RULES.map((r) => ({ ...r, mode: ["fail-open", "fail-closed"].includes(cfg[r.id]?.mode) ? cfg[r.id].mode : r.mode }));
  const mode = Object.fromEntries(rules.map((r) => [r.id, r.mode]));
  const findings = [];
  const add = (rule, file, message, suggestion) => findings.push({ rule, mode: mode[rule], file, message, suggestion });
  const shelf = shelfOf(dir);
  const moves = phaseMoves(dir);
  const found = claims(dir);

  for (const { name, rel, rec } of found) {
    const evidence = evidenceOf(rec);
    const forms = Array.isArray(rec.forms) ? rec.forms : [];
    if (typeof rec.statement === "string" && rec.statement.trim() && evidence.length === 0)
      add("claim-no-evidence", rel, "the claim cites no evidence", "cite the evidence the claim rests on");
    else if (typeof rec.statement !== "string" && evidence.length === 0 && forms.length === 0 && !(name === "operations-readiness" && Array.isArray(rec.tiers) && rec.tiers.length))
      add("claim-no-evidence", rel, "the record cites no evidence", "cite the evidence the record rests on");
    for (const f of forms) {
      if (!f || typeof f !== "object" || typeof f.statement !== "string" || !f.statement.trim()) continue;
      if (!evidence.some((e) => e.form === f.id)) add("claim-no-evidence", rel, `form ${f.id ?? "unknown"} cites no evidence`, "cite evidence for this form, or drop the form");
    }
    if (name === "operations-readiness" && Array.isArray(rec.tiers)) {
      for (const tier of rec.tiers) {
        if (!tier || typeof tier !== "object") continue;
        const ev = Array.isArray(tier.evidence) ? tier.evidence.filter(usable) : [];
        if (!ev.length) add("claim-no-evidence", rel, `tier ${tier.tier ?? "unknown"} cites no evidence`, "cite evidence for this tier");
      }
    }
    const lists = name === "operations-readiness" && Array.isArray(rec.tiers)
      ? [evidence, ...rec.tiers.map((tier) => Array.isArray(tier?.evidence) ? tier.evidence.filter(usable) : [])]
      : [evidence];
    for (const list of lists) for (const e of list) {
      if (typeof e.collected !== "string") continue;
      const reasons = pastShelf(e.collected, nowMs, moves, shelf);
      if (reasons.length) add("stale-evidence", rel, `${e.id ?? "an item"} is past its shelf life: ${reasons.join("; ")}`, "collect the evidence again in this phase");
    }
  }

  const problem = found.find((c) => c.name === "problem");
  if (problem && typeof problem.rec.probability?.by === "string" && problem.rec.probability.by !== "owner") {
    try {
      const rec = { ...problem.rec, evidence: evidenceOf(problem.rec) };
      for (const a of label(rec, t)) if (a.label !== "unknown")
        add("agent-only-grade", problem.rel, `assumption ${a.assumption} (${a.label}) was graded only by an agent (${problem.rec.probability.by})`, "have the owner grade it, and set probability.by to owner");
    } catch { /* a record that will not label is not an agent grade */ }
  }

  let rels = [];
  try { rels = logicalFiles(dir); } catch { rels = []; }
  for (const rel of [...new Set(rels)].filter((r) => !skipped(r) && r.endsWith(".decision.json") && r.split("/").at(-2) === "decisions").sort()) {
    const d = read(dir, rel);
    if (!d || typeof d !== "object" || d.status !== "decided" || d.provenance?.phase !== "validation") continue;
    const file = claimPath(dir, rel, d);
    if (!file) continue;
    const rec = read(dir, file);
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
    const g = safeGrade(known(file), rec, t);
    if (g?.level === "very low") add("discovery-grade-decision", rel, `decided in Validation on ${file}, which grades very low`, "gather evidence that grades above very low before relying on this decision");
  }

  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, rules, findings };
}

export { validationCommands } from "../records/routes/commands.mjs";

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const nowAt = args.indexOf("--now");
  const nowArg = nowAt >= 0 ? args[nowAt + 1] : null;
  const dir = args.find((a, i) => !a.startsWith("--") && !(nowAt >= 0 && i === nowAt + 1));
  if (!dir || !existsSync(ventureFile(dir, "venture.json"))) { console.error("usage: node packages/naive/src/checks/lint-validation.mjs <venture dir> [--json] [--now <iso>]"); process.exit(2); }
  const r = lint(dir, nowArg ? { now: new Date(nowArg) } : {});
  if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}
