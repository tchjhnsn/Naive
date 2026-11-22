#!/usr/bin/env node
// Brand alignment lint: decision records and marketing content held to the design system.
//
//   node packages/naive/src/engine/brand-lint.ts <venture dir> [--json]
//
// Rules are fail-open (warn) by default. naive.config.json brand_lint.rules.<id>.mode set to
// "fail-closed" makes a rule's findings fail the run (exit 1).

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { DESIGN_SYSTEM } from "./design-system.ts";
import { contentFiles } from "./brand.ts";
import type { DecisionRecord, MarketingDesignSystem } from "../records/types/records.d.ts";

const load = (f: string) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (text: string, term: string) => new RegExp(`(^|[^\\p{L}\\p{N}])${esc(term)}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);

export const JARGON = ["synergy", "leverage", "paradigm", "best-in-class", "world-class", "disrupt", "game-changer", "cutting-edge", "holistic", "seamless", "robust", "next-gen"];

export const RULES = [
  { id: "avoid-words", description: "A decision's question, answer or options mention an ethos.avoid term", severity: "warn", mode: "fail-open" },
  { id: "voice-jargon", description: "Decision or content text uses built-in jargon", severity: "warn", mode: "fail-open" },
  { id: "audience-unknown", description: "A decision names an icp id that is not a design-system audience", severity: "warn", mode: "fail-open" },
  { id: "unsourced-brand-choice", description: "A design-system choice has no from", severity: "warn", mode: "fail-open" },
];

// Every */decisions/*.decision.json under the venture, skipping hidden, _drafts, code and nested ventures.
function decisionFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string, depth: number) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) {
        if (/^[._]/.test(e.name) || ["node_modules", "repo", "codebase"].includes(e.name)) continue;
        if (depth > 0 && existsSync(join(p, "venture.json"))) continue;
        walk(p, depth + 1);
      } else if (e.name.endsWith(".decision.json") && d.split("/").at(-1) === "decisions") out.push(p);
    }
  };
  walk(dir, 0);
  return out.sort();
}

// The schema says options are strings; an option written as an object is read by its label, id, description and value.
const textOf = (d: DecisionRecord) => [d.question, typeof d.answer === "string" ? d.answer : JSON.stringify(d.answer ?? ""),
  ...(d.options ?? []).map((o: unknown) => (typeof o === "string" ? o : ["label", "id", "description", "value"].map((k) => (o as Record<string, unknown>)[k]).filter(Boolean).join(" ")))].filter(Boolean).join("\n");

function icpsOf(d: object): string[] {
  const ids = new Set<string>();
  for (const m of JSON.stringify(d).matchAll(/icp:([a-z0-9][\w-]*)/gi)) ids.add(m[1]);
  for (const k of ["icp", "icps", "audience", "audiences"]) for (const v of ([] as unknown[]).concat((d as Record<string, unknown>)[k] ?? [])) if (typeof v === "string") ids.add(v.replace(/^icp:/, ""));
  return [...ids];
}

/** One finding: the rule, its mode, the file, what is wrong and what to do. */
export type Finding = { rule: string; mode: string; file: string; message: string; suggestion: string };

export function lint(dir: string) {
  const ds: MarketingDesignSystem | null = load(ventureFile(dir, DESIGN_SYSTEM));
  const cfg: Record<string, { mode?: string } | undefined> = load(ventureFile(dir, "naive.config.json"))?.brand_lint?.rules ?? {};
  const rules = RULES.map((r) => { const m = cfg[r.id]?.mode; return { ...r, mode: m !== undefined && ["fail-open", "fail-closed"].includes(m) ? m : r.mode }; });
  const mode = Object.fromEntries(rules.map((r) => [r.id, r.mode]));
  const findings: Finding[] = [];
  const add = (rule: string, file: string, message: string, suggestion: string) => findings.push({ rule, mode: mode[rule], file, message, suggestion });
  const avoid = ds?.ethos?.avoid ?? [];
  const audiences = new Set(ds?.audiences ?? []);
  const dsRel = relative(dir, ventureFile(dir, DESIGN_SYSTEM));

  for (const f of decisionFiles(dir)) {
    const d: DecisionRecord | null = load(f); if (!d) continue;
    const rel = relative(dir, f), text = textOf(d);
    for (const a of avoid) if (has(text, a)) add("avoid-words", rel, `mentions "${a}", which the ethos says to avoid`, `reword without "${a}"`);
    for (const j of JARGON) if (has(text, j)) add("voice-jargon", rel, `uses jargon "${j}"`, "say it plainly");
    if (ds) for (const i of icpsOf(d)) if (!audiences.has(i)) add("audience-unknown", rel, `names icp ${i}, not a design-system audience`, `add ${i} to audiences in ${dsRel} or name a known audience`);
  }
  for (const f of contentFiles(dir)) {
    const text = readFileSync(ventureFile(dir, f), "utf8");
    for (const a of avoid) if (has(text, a)) add("avoid-words", f, `content mentions "${a}", which the ethos says to avoid`, `reword without "${a}"`);
    for (const j of JARGON) if (has(text, j)) add("voice-jargon", f, `content uses jargon "${j}"`, "say it plainly");
  }
  for (const c of ds?.choices ?? []) if (!c.from?.length) add("unsourced-brand-choice", dsRel, `${c.area} choice "${c.choice}" has no from`, "name the inputs it rests on (marketing/design-system/inputs)");
  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, design_system: !!ds, rules, findings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/engine/brand-lint.ts <venture dir> [--json]"); process.exit(2); }
  const r = lint(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}
