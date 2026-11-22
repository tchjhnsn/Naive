#!/usr/bin/env node
// Validation alignment lint: claims, evidence and decisions held to the validation records.
//
//   node packages/naive/src/checks/lint-validation.ts <venture dir> [--json] [--now <iso>]
//
// Rules are fail-open (warn) by default. naive.config.json validation_lint.rules.<id>.mode
// set to "fail-closed" makes a rule's findings fail the run (exit 1). Every venture record
// is read through ventureFile. A missing or malformed record is skipped.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { grade, gradeRecord } from "./check-validation.ts";
import { label } from "../engine/assess-problem.mjs";
import { logicalFiles, ventureFile } from "../core/venture-paths.ts";
import type { Graded, SubScoreRecord } from "./check-validation.ts";

// The records here may be malformed, so they are read as loose objects and each field is narrowed where it is used.
type Loose = { readonly [key: string]: unknown };
type Move = Loose & { readonly at: string };
type Shelf = { expire: number, perPhase: boolean };
type Claim = { name: string, rel: string, rec: Loose };
/** One lint finding. */
export type Finding = { rule: string, mode: string, file: string, message: string, suggestion: string };

const isLoose = (v: unknown): v is Loose => !!v && typeof v === "object" && !Array.isArray(v);
// v?.[key] for a value read from JSON: undefined unless v is an object.
const get = (v: unknown, key: string): unknown => isLoose(v) ? v[key] : undefined;

const DAY = 86400000;
const UNITS: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400, w: 604800 };
const KINDS = new Set(["behavior", "commitment", "stated", "desk-research", "opinion"]);

export const RULES = [
  { id: "claim-no-evidence", description: "A claim with no evidence", severity: "warn", mode: "fail-open" },
  { id: "stale-evidence", description: "Evidence older than its shelf life", severity: "warn", mode: "fail-open" },
  { id: "agent-only-grade", description: "An assumption graded only by agents", severity: "warn", mode: "fail-open" },
  { id: "discovery-grade-decision", description: "A decision made in Validation on Discovery-grade evidence", severity: "warn", mode: "fail-open" },
];

// Package path first, then the pre-migration path. The first file that exists is the record.
const PLACES: [string, string[]][] = [
  ["problem", ["foundation/problem.json", "purpose/validation/problem.json"]],
  ["solution", ["validation/solution.json", "purpose/validation/solution.json"]],
  ["product-market-fit", ["validation/product-market-fit.json", "purpose/validation/product-market-fit.json"]],
  ["pricing", ["validation/pricing.json", "purpose/validation/pricing.json"]],
  ["go-to-market", ["validation/go-to-market.json", "purpose/validation/go-to-market.json"]],
  ["team", ["people/team.json", "purpose/validation/team.json"]],
  ["operations-readiness", ["validation/operations-readiness.json", "purpose/validation/operations-readiness.json"]],
];
const BY_RECORD: Record<string, string> = {
  "validation-problem": "problem",
  "validation-solution": "solution",
  "validation-product-market-fit": "product-market-fit",
  "validation-pricing": "pricing",
  "validation-go-to-market": "go-to-market",
  "validation-team": "team",
  "validation-operations-readiness": "operations-readiness",
};

const load = (f: string): unknown => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const read = (dir: string, rel: string): unknown => { const f = ventureFile(dir, rel); return existsSync(f) ? load(f) : null; };
const known = (rel: string): string | null => PLACES.find(([, paths]) => paths.includes(rel))?.[0] ?? null;
const skipped = (rel: string) => rel.split("/").some((s) => !s || /^[._]/.test(s) || ["node_modules", "repo", "codebase"].includes(s));
const usable = (e: unknown): e is Loose => isLoose(e) && Boolean(e.id || e.kind || e.summary || e.collected);
const gradeable = (e: unknown): e is Loose => usable(e) && typeof e.kind === "string" && KINDS.has(e.kind) && typeof e.collected === "string" && !!e.source && typeof e.source === "object";

function durationMs(d: unknown): number | null {
  if (typeof d === "number" && Number.isInteger(d) && d >= 0) return d * 1000;
  const m = typeof d === "string" ? d.match(/^(\d+)(s|m|h|d|w)$/) : null;
  return m ? Number(m[1]) * UNITS[m[2]] * 1000 : null;
}
const human = (ms: number) => { const s = ms / 1000; return s % 604800 === 0 && s ? `${s / 604800}w` : s % 86400 === 0 && s ? `${s / 86400}d` : `${s}s`; };

// The assumption profile (packages/naive/src/engine/freshness.json): expire is the shelf, per_phase restarts it
// when the venture changes phase. A venture may override it under freshness in naive.config.json.
function shelfOf(dir: string): Shelf {
  let expire = 365 * DAY, perPhase = true;
  try {
    const raw: unknown = JSON.parse(readFileSync(new URL("../engine/freshness.json", import.meta.url), "utf8"));
    const a = get(get(raw, "profiles"), "assumption") ?? {};
    const ms = durationMs(get(a, "expire"));
    if (ms != null) expire = ms;
    const per = get(a, "per_phase");
    if (typeof per === "boolean") perPhase = per;
  } catch { /* the 365d per-phase default stands */ }
  const over = get(get(get(read(dir, "naive.config.json"), "freshness"), "profiles"), "assumption");
  if (isLoose(over)) {
    if (over.expire !== undefined) { const ms = durationMs(over.expire); if (ms != null) expire = ms; }
    if (typeof over.per_phase === "boolean") perPhase = over.per_phase;
  }
  return { expire, perPhase };
}

function phaseMoves(dir: string): Move[] {
  const f = ventureFile(dir, "knowledge/freshness.jsonl");
  if (!existsSync(f)) return [];
  let text = "";
  try { text = readFileSync(f, "utf8"); } catch { return []; }
  const out: Move[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const e: unknown = JSON.parse(line);
      const at = get(e, "at");
      if (get(e, "event") === "phase" && typeof at === "string" && !Number.isNaN(Date.parse(at))) out.push(e as Move);
    } catch { /* one bad line does not drop the rest */ }
  }
  return out;
}

function pastShelf(collected: string, now: number, moves: Move[], shelf: Shelf): string[] {
  const t = Date.parse(collected);
  if (Number.isNaN(t)) return [];
  const reasons: string[] = [];
  if (now - t >= shelf.expire) reasons.push(`collected ${collected}, past the assumption shelf life of ${human(shelf.expire)}`);
  if (shelf.perPhase) {
    const moved = moves.find((e) => Date.parse(e.at) > t);
    if (moved) reasons.push(`the venture moved from ${moved.from ?? "an earlier phase"} to ${moved.to ?? "a later phase"} on ${String(moved.at).slice(0, 10)} after it was collected`);
  }
  return reasons;
}

function claims(dir: string): Claim[] {
  const out: Claim[] = [];
  for (const [name, paths] of PLACES) {
    const rel = paths.find((p) => existsSync(ventureFile(dir, p)));
    if (!rel) continue;
    const rec = read(dir, rel);
    if (!isLoose(rec)) continue;
    out.push({ name, rel, rec });
  }
  return out;
}

function safeGrade(name: string | null, rec: Loose, now: Date): Graded | null {
  try {
    const items = (Array.isArray(rec.evidence) ? rec.evidence as unknown[] : []).filter(gradeable);
    if (name !== "operations-readiness") return gradeRecord({ evidence: items }, now) as Graded;
    const tiers = (Array.isArray(rec.tiers) ? rec.tiers as unknown[] : []).filter((t): t is Loose => !!t && typeof t === "object" && !!(t as Loose).tier)
      .map((t) => ({ tier: t.tier, evidence: (Array.isArray(t.evidence) ? t.evidence as unknown[] : []).filter(gradeable) }));
    if (!tiers.length) return gradeRecord({ evidence: items }, now) as Graded;
    // Only the gradeable items reach the grader, the same subset grade() reads from a well-formed record.
    return grade(name, { tiers, evidence: items } as unknown as SubScoreRecord, now);
  } catch { return null; }
}

function claimPath(dir: string, rel: string, d: Loose): string | null {
  const path = get(d.decides, "path"), record = get(d.decides, "record");
  if (typeof path === "string" && known(path)) return path;
  const name = typeof record === "string" ? BY_RECORD[record] : null;
  if (name) {
    const hit = PLACES.find(([n]) => n === name)?.[1].find((p) => existsSync(ventureFile(dir, p)));
    if (hit) return hit;
  }
  const m = typeof rel === "string" ? rel.match(/^(.*)\/decisions\/([a-z0-9-]+?)(?:\.[a-z0-9-]+)*\.decision\.json$/) : null;
  if (!m) return null;
  const file = `${m[1]}/${m[2]}.json`;
  return known(file) ? file : null;
}

function evidenceOf(rec: Loose): Loose[] {
  return Array.isArray(rec.evidence) ? (rec.evidence as unknown[]).filter(usable) : [];
}

export function lint(dir: string, { now = new Date() }: { now?: Date | string | number } = {}): { ok: boolean, rules: typeof RULES, findings: Finding[] } {
  const today = now instanceof Date ? now : new Date(now);
  const t = Number.isNaN(today.getTime()) ? new Date() : today;
  const nowMs = t.getTime();
  const cfg = get(get(read(dir, "naive.config.json"), "validation_lint"), "rules") ?? {};
  const rules = RULES.map((r) => {
    const set = get(get(cfg, r.id), "mode");
    return { ...r, mode: typeof set === "string" && ["fail-open", "fail-closed"].includes(set) ? set : r.mode };
  });
  const mode = Object.fromEntries(rules.map((r) => [r.id, r.mode]));
  const findings: Finding[] = [];
  const add = (rule: string, file: string, message: string, suggestion: string) => findings.push({ rule, mode: mode[rule], file, message, suggestion });
  const shelf = shelfOf(dir);
  const moves = phaseMoves(dir);
  const found = claims(dir);

  for (const { name, rel, rec } of found) {
    const evidence = evidenceOf(rec);
    const forms: unknown[] = Array.isArray(rec.forms) ? rec.forms : [];
    if (typeof rec.statement === "string" && rec.statement.trim() && evidence.length === 0)
      add("claim-no-evidence", rel, "the claim cites no evidence", "cite the evidence the claim rests on");
    else if (typeof rec.statement !== "string" && evidence.length === 0 && forms.length === 0 && !(name === "operations-readiness" && Array.isArray(rec.tiers) && rec.tiers.length))
      add("claim-no-evidence", rel, "the record cites no evidence", "cite the evidence the record rests on");
    for (const f of forms) {
      if (!isLoose(f) || typeof f.statement !== "string" || !f.statement.trim()) continue;
      if (!evidence.some((e) => e.form === f.id)) add("claim-no-evidence", rel, `form ${f.id ?? "unknown"} cites no evidence`, "cite evidence for this form, or drop the form");
    }
    if (name === "operations-readiness" && Array.isArray(rec.tiers)) {
      for (const item of rec.tiers as unknown[]) {
        if (!item || typeof item !== "object") continue;
        const tier = item as Loose;
        const ev = Array.isArray(tier.evidence) ? (tier.evidence as unknown[]).filter(usable) : [];
        if (!ev.length) add("claim-no-evidence", rel, `tier ${tier.tier ?? "unknown"} cites no evidence`, "cite evidence for this tier");
      }
    }
    const lists = name === "operations-readiness" && Array.isArray(rec.tiers)
      ? [evidence, ...(rec.tiers as unknown[]).map((tier) => { const ev = get(tier, "evidence"); return Array.isArray(ev) ? (ev as unknown[]).filter(usable) : []; })]
      : [evidence];
    for (const list of lists) for (const e of list) {
      if (typeof e.collected !== "string") continue;
      const reasons = pastShelf(e.collected, nowMs, moves, shelf);
      if (reasons.length) add("stale-evidence", rel, `${e.id ?? "an item"} is past its shelf life: ${reasons.join("; ")}`, "collect the evidence again in this phase");
    }
  }

  const problem = found.find((c) => c.name === "problem");
  const gradedBy = problem ? get(problem.rec.probability, "by") : undefined;
  if (problem && typeof gradedBy === "string" && gradedBy !== "owner") {
    try {
      const rec = { ...problem.rec, evidence: evidenceOf(problem.rec) };
      for (const a of label(rec, t)) if (a.label !== "unknown")
        add("agent-only-grade", problem.rel, `assumption ${a.assumption} (${a.label}) was graded only by an agent (${gradedBy})`, "have the owner grade it, and set probability.by to owner");
    } catch { /* a record that will not label is not an agent grade */ }
  }

  let rels: string[] = [];
  try { rels = logicalFiles(dir); } catch { rels = []; }
  for (const rel of [...new Set(rels)].filter((r) => !skipped(r) && r.endsWith(".decision.json") && r.split("/").at(-2) === "decisions").sort()) {
    const d = read(dir, rel);
    if (!isLoose(d) || d.status !== "decided" || get(d.provenance, "phase") !== "validation") continue;
    const file = claimPath(dir, rel, d);
    if (!file) continue;
    const rec = read(dir, file);
    if (!isLoose(rec)) continue;
    const g = safeGrade(known(file), rec, t);
    if (g?.level === "very low") add("discovery-grade-decision", rel, `decided in Validation on ${file}, which grades very low`, "gather evidence that grades above very low before relying on this decision");
  }

  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, rules, findings };
}

export { validationCommands } from "../records/routes/commands.ts";

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const nowAt = args.indexOf("--now");
  const nowArg = nowAt >= 0 ? args[nowAt + 1] : null;
  const dir = args.find((a, i) => !a.startsWith("--") && !(nowAt >= 0 && i === nowAt + 1));
  if (!dir || !existsSync(ventureFile(dir, "venture.json"))) { console.error("usage: node packages/naive/src/checks/lint-validation.ts <venture dir> [--json] [--now <iso>]"); process.exit(2); }
  const r = lint(dir, nowArg ? { now: new Date(nowArg) } : {});
  if (args.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}
