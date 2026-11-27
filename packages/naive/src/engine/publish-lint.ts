#!/usr/bin/env node
// The publish lint (publishing gate, pipeline): every check a page must pass before it is public, run in
// order over the files given. Stages: copy distance (packages/naive/src/engine/check-public.ts, when a venture
// with marketing content is named), leaks (packages/naive/src/engine/check-leaks.ts), brand (packages/naive/src/engine/brand-lint.ts, when it
// exists and a venture is named), claims (a sentence asserting a number or customers needs a source in the
// file's frontmatter sources list), marks (other companies' marks), personal data (emails, phone numbers)
// and secrets (API key shapes).
//
// Each rule is set like an ESLint rule, off | warn | error, under publish_lint.rules in the venture's
// naive.config.json. Defaults: leaks, claims and secrets are error; the rest warn. Exit 1 on any error.
//
// Copy a page renders out of a JSON record is linted too (EE-214): packages/naive/src/engine/record-copy.ts gathers the
// strings a public reader may see from a record, a field a person approved as public and the marketing sitemap's
// drafted copy, and every text stage runs over them as it runs over a page.
//
// A mark is matched case-insensitively and on whole words. A mark the venture marks private is a name it never makes
// public, and it is an error whatever level the marks rule has. The names come from publish_lint.marks and from
// marketing/publish-terms.json, the record the function that writes the words owns; the levels stay in the config.
//
// The feedback loop: every run appends its findings to .naive/lint-findings.jsonl (the venture's, else the
// working directory's). A finding is waived by listing it under publish_lint.waived ({ rule, file, text? }).
//
//   node packages/naive/src/engine/publish-lint.ts check <file or folder>... [--venture <dir>] [--json] [--log <file>]
//   node packages/naive/src/engine/publish-lint.ts check --report [--venture <dir>] [--json] [--log <file>]
//       the rules most often waived, and the leaks found in files already published

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { configFile, logical, ventureFile } from "../core/venture-paths.ts";
import { frontmatter } from "./frontmatter.ts";
import { leaks, patterns } from "./check-leaks.ts";
import type { NaiveConfig, PublishTerms } from "../records/types/records.d.ts";

export { frontmatter } from "./frontmatter.ts";
export type { Meta } from "./frontmatter.ts";

type PublishLint = NonNullable<NaiveConfig["publish_lint"]>;
export type Level = "off" | "warn" | "error";
/** A name the lint flags: another company's mark, or a name the venture never makes public. */
export type Mark = { name: string, private?: boolean };
export type LintConfig = { rules: Record<string, Level>, marks: Mark[], waived: NonNullable<PublishLint["waived"]> };

const repo = new URL("../../../..", import.meta.url).pathname;
const load = (f: string) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

export const LEVELS: Level[] = ["off", "warn", "error"];
export const RULES: { id: string, level: Level, description: string }[] = [
  { id: "copy-distance", level: "warn", description: "Marketing content copies a run of words from the internal record it is a variant of" },
  { id: "leaks", level: "error", description: "Public text carries an internal term (packages/naive/src/engine/internal-terms.json)" },
  { id: "brand", level: "warn", description: "The brand lint (packages/naive/src/engine/brand-lint.ts) found something" },
  { id: "claims", level: "error", description: "A sentence asserts a number or customers and the file cites no source" },
  { id: "marks", level: "warn", description: "Text uses another company's mark" },
  { id: "personal-data", level: "warn", description: "Text carries an email address or phone number" },
  { id: "secrets", level: "error", description: "Text carries something shaped like an API key or token" },
];
export const MARKS = ["Nike", "Just Do It", "Apple", "Amazon"];

const SECRETS: [string, RegExp][] = [
  ["aws-access-key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["openai-or-anthropic-key", /\bsk-(?:ant-)?[A-Za-z0-9_-]{20,}\b/g],
  ["github-token", /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g],
  ["slack-token", /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g],
  ["stripe-key", /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g],
  ["google-api-key", /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ["private-key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/g],
];
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE = /(?<![\w.])(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}(?![\w])/g;
const CLAIM_NUMBER = /(\$\s?\d|\d[\d,.]*\s?(%|x\b|percent|k\b|m\b|million|billion|thousand|times|customers|users|clients|teams|companies|founders|people))/i;
const CLAIM_CUSTOMER = /\b(customers?|trusted by|used by|loved by|chosen by)\b/i;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const walk = (p: string): string[] => statSync(p).isDirectory() ? readdirSync(p).filter((n) => !n.startsWith(".")).flatMap((n) => walk(join(p, n))) : [p];
const mask = (s: string) => s.length <= 8 ? "****" : `${s.slice(0, 4)}...${"*".repeat(4)}`;

/** The record the function that writes the words owns: the names it wants flagged, and which are never public. */
export const TERMS = "marketing/publish-terms.json";

/**
 * The publish_lint section of the venture's naive.config.json, with the defaults filled in. The config is read where
 * the router reads it (configFile), so a structured venture's meta/naive.config.json counts.
 *
 * The marks are the config's list, else Naive's default list, plus every name in marketing/publish-terms.json. That
 * record holds names only, so the role that owns the copy can tighten the gate on itself without reaching the config.
 */
export function configFor(venture?: string): LintConfig {
  const pl: PublishLint & { rules?: Record<string, Level> } = (venture && load(configFile(venture))?.publish_lint) || {};
  const rules = Object.fromEntries(RULES.map((r): [string, Level] => { const set = pl.rules?.[r.id]; return [r.id, set && LEVELS.includes(set) ? set : r.level]; }));
  const own: PublishTerms["marks"] = (venture && load(ventureFile(venture, TERMS))?.marks) || [];
  const marks = new Map<string, Mark>();
  for (const m of [...(pl.marks ?? MARKS), ...own]) {
    const mark: Mark = typeof m === "string" ? { name: m } : { name: m.name, ...(m.private ? { private: true } : {}) };
    if (!mark.name) continue;
    const had = marks.get(mark.name.toLowerCase());
    marks.set(mark.name.toLowerCase(), { ...mark, ...(had?.private || mark.private ? { private: true } : {}) });
  }
  return { rules, marks: [...marks.values()], waived: pl.waived ?? [] };
}

/** A mark matches whole words, whatever its case: "nightjar" and "NIGHTJAR" are both the mark Nightjar. */
export const markRe = (name: string) => new RegExp(`(?<![\\p{L}\\p{N}])${esc(name)}(?![\\p{L}\\p{N}])`, "giu");

const visible = (body: string) => body.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/<!--[\s\S]*?-->/g, "");
const lineOf = (text: string, idx: number) => text.slice(0, idx).split("\n").length;

// A source counts when it is a URL or a file in the venture (or next to the page).
function sourceOk(src: string, file: string, venture: string | undefined) {
  if (/^https?:\/\//.test(src)) return true;
  return [venture && join(venture, src), join(dirname(file), src), resolve(src)].some((p) => p && existsSync(p));
}

/** A run of public text the stages read: a page's visible body, or one run of copy out of a record. */
export type Text = {
  /** The file it sits in. */ file: string,
  /** The words a reader sees. */ text: string,
  /** The whole file, for the secrets scan; the text itself when there is nothing more. */ whole?: string,
  /** The sources that back a number in it. */ sources: string[],
  /** Whether what holds it is published. */ published: boolean,
  /** The record field it came from, for a record's copy. */ field?: string,
  /** The line a found string is on, when the text has lines of its own. */ lineOfFound?: (found: string) => number,
  /** The sources list to name in a claims message. */ where?: string,
};

function textStages(t: Text, cfg: LintConfig, venture: string | undefined) {
  const out: Finding[] = [], vis = t.text, whole = t.whole ?? t.text;
  const where = t.where ?? "sources in the frontmatter";
  const add = (rule: string, found: string, message: string, extra: Partial<Finding> = {}) => out.push({ rule, file: t.file, ...(t.field ? { field: t.field } : {}),
    ...(t.lineOfFound ? { line: t.lineOfFound(found) } : {}), text: found, message, published: t.published, ...extra });

  // claims
  const good = t.sources.filter((s) => sourceOk(s, t.file, venture));
  if (!good.length) {
    for (const sentence of vis.replace(/^#+.*$/gm, "").split(/(?<=[.!?])\s+|\n/).map((s) => s.replace(/<[^>]+>|\|/g, " ")).map((s) => s.trim()).filter(Boolean)) {
      if (CLAIM_NUMBER.test(sentence) || CLAIM_CUSTOMER.test(sentence))
        add("claims", sentence.slice(0, 80), t.sources.length ? `asserts a number or customers, and none of its sources (${t.sources.join(", ")}) is a URL or a record that exists` : `asserts a number or customers without a source: list the record or URL under ${where}`);
    }
  }
  // marks: whole words, any case; a name the venture keeps private is an error whatever the rule's level
  for (const mark of cfg.marks) for (const m of vis.matchAll(markRe(mark.name)))
    add("marks", m[0], mark.private ? `uses "${mark.name}", a name this venture never makes public (${TERMS}): take it out` : `uses "${mark.name}", another company's mark: say it plainly or have legal clear it`,
      mark.private ? { at_least: "error" } : {});
  // personal data
  for (const m of vis.matchAll(EMAIL)) add("personal-data", m[0], "carries an email address");
  for (const m of vis.matchAll(PHONE)) add("personal-data", m[0], "carries a phone number");
  // secrets: on the whole file, frontmatter included, and never echoed
  for (const [kind, re] of SECRETS) for (const m of whole.matchAll(re))
    out.push({ rule: "secrets", file: t.file, ...(t.field ? { field: t.field } : {}), line: lineOf(whole, m.index ?? 0), text: mask(m[0]), message: `carries something shaped like a ${kind}: remove it and rotate it`, published: t.published });
  return out;
}

/** One page as the stages read it: its visible body, its frontmatter sources, and the whole file for secrets. */
function pageText(file: string, text: string): Text {
  const { meta, body } = frontmatter(text);
  const sources = Array.isArray(meta.sources) ? meta.sources : typeof meta.sources === "string" && meta.sources ? [meta.sources] : [];
  return { file, text: visible(body), whole: text, sources, published: meta.publish === true,
    lineOfFound: (found) => lineOf(text, text.length - body.length + Math.max(0, body.indexOf(found))) };
}

export type Finding = { rule: string, file: string, field?: string, line?: number, text: string, message: string, published: boolean, severity?: string, term_severity?: string, at_least?: Level, waived?: boolean };

/** Runs every stage in order. Returns { ok, findings, stages }. */
export async function check(paths: string[], { venture }: { venture?: string } = {}) {
  const cfg = configFor(venture), findings = ([]) as Finding[], stages: string[] = [];
  const on = (r: string) => cfg.rules[r] !== "off";
  const given = paths.filter(existsSync).flatMap(walk);
  const files = given.filter((f) => /\.(mdx?|html|txt)$/.test(f));
  const publishedOf = new Map(files.map((f) => [resolve(f), frontmatter(readFileSync(f, "utf8")).meta.publish === true]));
  // The copy a record shows the public (EE-214): one Text per run of copy, read as a page's body is read.
  const copy: Text[] = [];
  if (venture) {
    const { recordCopy } = await import("./record-copy.ts");
    for (const f of given.filter((f) => f.endsWith(".json") && !f.endsWith(".visibility.json"))) {
      const rel = logical(venture, relative(venture, resolve(f)));
      if (rel.startsWith("..")) continue; // a JSON file outside the venture has no record copy
      for (const c of recordCopy(venture, rel)) copy.push({ file: f, text: c.text, sources: c.sources, published: c.published, field: c.field,
        where: "sources beside the copy in the record" });
    }
  }

  // 1. copy distance
  if (on("copy-distance") && venture) {
    const { check: pub, CONTENT_ROOTS } = await import("./check-public.ts");
    if (CONTENT_ROOTS.some((root) => existsSync(join(venture, root)))) {
      stages.push("copy-distance");
      const given = new Set(files.map((f) => resolve(f)));
      for (const r of pub(venture).errors.filter((r: { file: string }) => given.has(resolve(venture, r.file)))) for (const e of r.errors.filter((e: string) => e.startsWith("copies")))
        findings.push({ rule: "copy-distance", file: join(venture, r.file), text: "", message: e, published: r.publish === true });
    }
  }
  // 2. leaks, over the pages given and over each run of a record's copy (never the whole record)
  if (on("leaks")) {
    stages.push("leaks");
    for (const l of leaks(files, { venture })) findings.push({ rule: "leaks", file: l.file, text: l.text, message: `internal term ${l.pattern}: ${l.why}`, ...(l.severity === "warn" ? { term_severity: "warn" } : {}), published: publishedOf.get(resolve(l.file)) ?? false });
    const ps = copy.length ? patterns(venture) : [];
    for (const c of copy) for (const p of ps) for (const m of c.text.matchAll(p.re))
      findings.push({ rule: "leaks", file: c.file, field: c.field, text: m[0], message: `internal term ${p.id}: ${p.why}`, ...(p.severity === "warn" ? { term_severity: "warn" } : {}), published: c.published });
  }
  // 3. brand
  if (on("brand") && venture && existsSync(join(repo, "packages/naive/src/engine/brand-lint.ts"))) {
    stages.push("brand");
    const { lint } = await import("./brand-lint.ts");
    for (const f of lint(venture).findings) findings.push({ rule: "brand", file: join(venture, f.file ?? ""), text: f.rule, message: f.message, published: false });
  }
  // 4-7. claims, marks, personal data, secrets, over every page and every run of a record's copy
  stages.push("claims", "marks", "personal-data", "secrets");
  for (const t of [...files.map((f) => pageText(f, readFileSync(f, "utf8"))), ...copy])
    for (const x of textStages(t, cfg, venture)) if (on(x.rule)) findings.push(x);

  const base = venture ?? process.cwd();
  for (const f of findings) {
    f.file = relative(base, resolve(f.file)) || f.file;
    // A term the founder marked warn (governance/internal-terms.json) is reported, never an error.
    const level = f.term_severity === "warn" && cfg.rules[f.rule] === "error" ? "warn" : cfg.rules[f.rule];
    // A name the venture keeps private is an error even where its rule only warns (at_least).
    f.severity = f.at_least && LEVELS.indexOf(f.at_least) > LEVELS.indexOf(level) ? f.at_least : level;
    delete f.term_severity;
    delete f.at_least;
    f.waived = cfg.waived.some((w) => w.rule === f.rule && (!w.file || w.file === f.file) && (!w.text || w.text === f.text));
  }
  return { ok: !findings.some((f) => f.severity === "error" && !f.waived), stages, findings };
}

export const logFile = (venture: string | undefined, log: string | undefined) => log ?? join(venture ?? process.cwd(), ".naive", "lint-findings.jsonl");

export function append(file: string, findings: Finding[], at = new Date().toISOString()) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, findings.map((f) => JSON.stringify({ at, ...f }) + "\n").join(""));
}

/** The loop: which rules are waived most often, and leaks found in files already published. */
export function report(file: string, { venture }: { venture?: string } = {}) {
  const rows: (Finding & { at: string })[] = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
  const { waived } = configFor(venture);
  const isWaived = (f: Finding) => f.waived || waived.some((w) => w.rule === f.rule && (!w.file || w.file === f.file) && (!w.text || w.text === f.text));
  const counts: Record<string, { rule: string, findings: number, waived: number }> = {};
  for (const f of rows) { const c = counts[f.rule] ??= { rule: f.rule, findings: 0, waived: 0 }; c.findings++; if (isWaived(f)) c.waived++; }
  const seen = new Set<string>();
  const afterPublish = rows.filter((f) => ["leaks", "secrets"].includes(f.rule) && f.published).filter((f) => { const k = `${f.rule}|${f.file}|${f.text}`; return !seen.has(k) && seen.add(k); });
  return { runs: new Set(rows.map((r) => r.at)).size, findings: rows.length, most_waived: Object.values(counts).filter((c) => c.waived).sort((a, b) => b.waived - a.waived || a.rule.localeCompare(b.rule)), leaks_after_publish: afterPublish };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const val = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const ventureArg = val("venture"), logArg = val("log");
  const venture = ventureArg ? resolve(ventureArg) : undefined;
  const json = argv.includes("--json"), log = logFile(venture, logArg && resolve(logArg));
  const args = argv.filter((a, i) => !a.startsWith("--") && !["--venture", "--log"].includes(argv[i - 1]));
  if (args[0] === "check") args.shift();
  if (argv.includes("--report")) {
    const r = report(log, { venture });
    if (json) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`${r.findings} finding(s) over ${r.runs} run(s) in ${log}`);
      console.log(r.most_waived.length ? "most waived:\n" + r.most_waived.map((c) => `  ${c.rule}: ${c.waived} of ${c.findings} waived`).join("\n") : "no rule waived");
      console.log(r.leaks_after_publish.length ? "found after publish:\n" + r.leaks_after_publish.map((f) => `  ${f.rule} ${f.file}: "${f.text}"`).join("\n") : "nothing found after publish");
    }
    process.exit(0);
  }
  if (!args.length) { console.error("usage: naive publish check <file or folder>... [--venture <dir>] [--json] | naive publish check --report"); process.exit(2); }
  const r = await check(args, { venture });
  append(log, r.findings);
  if (json) console.log(JSON.stringify(r, null, 2));
  else {
    for (const f of r.findings.filter((f) => f.severity !== "off")) console.error(`${f.waived ? "WAIVED" : f.severity === "error" ? "ERROR " : "WARN  "} ${f.rule}  ${f.file}${f.line ? `:${f.line}` : ""}${f.field ? ` ${f.field}` : ""}  ${f.message}${f.text && f.rule !== "claims" ? ` ("${f.text}")` : ""}`);
    console.log(`${r.stages.join(" > ")}: ${r.findings.filter((f) => f.severity === "error" && !f.waived).length} error(s), ${r.findings.filter((f) => f.severity === "warn" && !f.waived).length} warning(s)`);
  }
  process.exit(r.ok ? 0 : 1);
}
