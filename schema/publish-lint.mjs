#!/usr/bin/env node
// The publish lint (publishing gate, pipeline): every check a page must pass before it is public, run in
// order over the files given. Stages: copy distance (operations/marketing/check-public.mjs, when a venture
// with marketing content is named), leaks (schema/check-leaks.mjs), brand (schema/brand-lint.mjs, when it
// exists and a venture is named), claims (a sentence asserting a number or customers needs a source in the
// file's frontmatter sources list), marks (other companies' marks), personal data (emails, phone numbers)
// and secrets (API key shapes).
//
// Each rule is set like an ESLint rule, off | warn | error, under publish_lint.rules in the venture's
// naive.config.json. Defaults: leaks, claims and secrets are error; the rest warn. Exit 1 on any error.
//
// The feedback loop: every run appends its findings to .naive/lint-findings.jsonl (the venture's, else the
// working directory's). A finding is waived by listing it under publish_lint.waived ({ rule, file, text? }).
//
//   node schema/publish-lint.mjs check <file or folder>... [--venture <dir>] [--json] [--log <file>]
//   node schema/publish-lint.mjs check --report [--venture <dir>] [--json] [--log <file>]
//       the rules most often waived, and the leaks found in files already published

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { leaks } from "./check-leaks.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

export const LEVELS = ["off", "warn", "error"];
export const RULES = [
  { id: "copy-distance", level: "warn", description: "Marketing content copies a run of words from the internal record it is a variant of" },
  { id: "leaks", level: "error", description: "Public text carries an internal term (schema/internal-terms.json)" },
  { id: "brand", level: "warn", description: "The brand lint (schema/brand-lint.mjs) found something" },
  { id: "claims", level: "error", description: "A sentence asserts a number or customers and the file cites no source" },
  { id: "marks", level: "warn", description: "Text uses another company's mark" },
  { id: "personal-data", level: "warn", description: "Text carries an email address or phone number" },
  { id: "secrets", level: "error", description: "Text carries something shaped like an API key or token" },
];
export const MARKS = ["Nike", "Just Do It", "Apple", "Amazon"];

const SECRETS = [
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

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const walk = (p) => statSync(p).isDirectory() ? readdirSync(p).filter((n) => !n.startsWith(".")).flatMap((n) => walk(join(p, n))) : [p];
const mask = (s) => s.length <= 8 ? "****" : `${s.slice(0, 4)}...${"*".repeat(4)}`;

/** Frontmatter with list support: { meta, body }. sources may be `[a, b]` or a block of `- a` lines. */
export function frontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {}; let key = null;
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([A-Za-z_]+):\s*(.*)$/), item = line.match(/^\s+-\s+(.*)$/);
    if (kv) {
      key = kv[1]; const v = kv[2].trim();
      meta[key] = v.startsWith("[") ? v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean)
        : v === "" ? [] : v.replace(/^["']|["']$/g, "");
    } else if (item && key && Array.isArray(meta[key])) meta[key].push(item[1].trim().replace(/^["']|["']$/g, ""));
  }
  if (typeof meta.publish === "string") meta.publish = meta.publish === "true";
  return { meta, body: m[2] };
}

/** The publish_lint section of the venture's naive.config.json, with the defaults filled in. */
export function configFor(venture) {
  const pl = (venture && load(join(venture, "naive.config.json"))?.publish_lint) || {};
  const rules = Object.fromEntries(RULES.map((r) => [r.id, LEVELS.includes(pl.rules?.[r.id]) ? pl.rules[r.id] : r.level]));
  return { rules, marks: pl.marks ?? MARKS, waived: pl.waived ?? [] };
}

const visible = (body) => body.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/<!--[\s\S]*?-->/g, "");
const lineOf = (text, idx) => text.slice(0, idx).split("\n").length;

// A source counts when it is a URL or a file in the venture (or next to the page).
function sourceOk(src, file, venture) {
  if (/^https?:\/\//.test(src)) return true;
  return [venture && join(venture, src), join(dirname(file), src), resolve(src)].some((p) => p && existsSync(p));
}

function textStages(file, text, cfg, venture) {
  const out = [], { meta, body } = frontmatter(text), vis = visible(body);
  const add = (rule, idx, found, message) => out.push({ rule, file, line: lineOf(text, text.length - body.length + Math.max(0, body.indexOf(found))), text: found, message, published: meta.publish === true });

  // claims
  const sources = Array.isArray(meta.sources) ? meta.sources : meta.sources ? [meta.sources] : [];
  const good = sources.filter((s) => sourceOk(s, file, venture));
  if (!good.length) {
    for (const sentence of vis.replace(/^#+.*$/gm, "").split(/(?<=[.!?])\s+|\n/).map((s) => s.replace(/<[^>]+>|\|/g, " ")).map((s) => s.trim()).filter(Boolean)) {
      if (CLAIM_NUMBER.test(sentence) || CLAIM_CUSTOMER.test(sentence))
        add("claims", 0, sentence.slice(0, 80), sources.length ? `asserts a number or customers, and none of its sources (${sources.join(", ")}) is a URL or a record that exists` : "asserts a number or customers without a source: list the record or URL under sources in the frontmatter");
    }
  }
  // marks
  for (const mark of cfg.marks) for (const m of vis.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${esc(mark)}(?![\\p{L}\\p{N}])`, "gu")))
    add("marks", m.index, m[0], `uses "${mark}", another company's mark: say it plainly or have legal clear it`);
  // personal data
  for (const m of vis.matchAll(EMAIL)) add("personal-data", m.index, m[0], "carries an email address");
  for (const m of vis.matchAll(PHONE)) add("personal-data", m.index, m[0], "carries a phone number");
  // secrets: on the whole file, frontmatter included, and never echoed
  for (const [kind, re] of SECRETS) for (const m of text.matchAll(re))
    out.push({ rule: "secrets", file, line: lineOf(text, m.index), text: mask(m[0]), message: `carries something shaped like a ${kind}: remove it and rotate it`, published: meta.publish === true });
  return out;
}

/** @typedef {{ rule: string, file: string, line?: number, text: string, message: string, published: boolean, severity?: string, term_severity?: string, waived?: boolean }} Finding */

/**
 * Runs every stage in order. Returns { ok, findings, stages }.
 * @param {string[]} paths
 * @param {{ venture?: string }} [opts]
 */
export async function check(paths, { venture } = {}) {
  const cfg = configFor(venture), findings = /** @type {Finding[]} */ ([]), stages = [];
  const on = (r) => cfg.rules[r] !== "off";
  const files = paths.filter(existsSync).flatMap(walk).filter((f) => /\.(mdx?|html|txt)$/.test(f));
  const publishedOf = new Map(files.map((f) => [resolve(f), frontmatter(readFileSync(f, "utf8")).meta.publish === true]));

  // 1. copy distance
  if (on("copy-distance") && venture && existsSync(join(repo, "operations/marketing/check-public.mjs"))) {
    const { check: pub, CONTENT } = await import("../operations/marketing/check-public.mjs");
    if (existsSync(join(venture, CONTENT))) {
      stages.push("copy-distance");
      const given = new Set(files.map((f) => resolve(f)));
      for (const r of pub(venture).errors.filter((r) => given.has(resolve(venture, r.file)))) for (const e of r.errors.filter((e) => e.startsWith("copies")))
        findings.push({ rule: "copy-distance", file: join(venture, r.file), text: "", message: e, published: r.publish === true });
    }
  }
  // 2. leaks
  if (on("leaks")) {
    stages.push("leaks");
    for (const l of leaks(files, { venture })) findings.push({ rule: "leaks", file: l.file, text: l.text, message: `internal term ${l.pattern}: ${l.why}`, ...(l.severity === "warn" ? { term_severity: "warn" } : {}), published: publishedOf.get(resolve(l.file)) ?? false });
  }
  // 3. brand
  if (on("brand") && venture && existsSync(join(repo, "schema/brand-lint.mjs"))) {
    stages.push("brand");
    const { lint } = await import("./brand-lint.mjs");
    for (const f of lint(venture).findings) findings.push({ rule: "brand", file: join(venture, f.file ?? ""), text: f.rule, message: f.message, published: false });
  }
  // 4-7. claims, marks, personal data, secrets
  stages.push("claims", "marks", "personal-data", "secrets");
  for (const f of files) for (const x of textStages(f, readFileSync(f, "utf8"), cfg, venture)) if (on(x.rule)) findings.push(x);

  const base = venture ?? process.cwd();
  for (const f of findings) {
    f.file = relative(base, resolve(f.file)) || f.file;
    // A term the founder marked warn (governance/internal-terms.json) is reported, never an error.
    f.severity = f.term_severity === "warn" && cfg.rules[f.rule] === "error" ? "warn" : cfg.rules[f.rule];
    delete f.term_severity;
    f.waived = cfg.waived.some((w) => w.rule === f.rule && (!w.file || w.file === f.file) && (!w.text || w.text === f.text));
  }
  return { ok: !findings.some((f) => f.severity === "error" && !f.waived), stages, findings };
}

export const logFile = (venture, log) => log ?? join(venture ?? process.cwd(), ".naive", "lint-findings.jsonl");

export function append(file, findings, at = new Date().toISOString()) {
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, findings.map((f) => JSON.stringify({ at, ...f }) + "\n").join(""));
}

/**
 * The loop: which rules are waived most often, and leaks found in files already published.
 * @param {string} file
 * @param {{ venture?: string }} [opts]
 */
export function report(file, { venture } = {}) {
  const rows = existsSync(file) ? readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
  const { waived } = configFor(venture);
  const isWaived = (f) => f.waived || waived.some((w) => w.rule === f.rule && (!w.file || w.file === f.file) && (!w.text || w.text === f.text));
  const counts = {};
  for (const f of rows) { const c = counts[f.rule] ??= { rule: f.rule, findings: 0, waived: 0 }; c.findings++; if (isWaived(f)) c.waived++; }
  const seen = new Set();
  const afterPublish = rows.filter((f) => ["leaks", "secrets"].includes(f.rule) && f.published).filter((f) => { const k = `${f.rule}|${f.file}|${f.text}`; return !seen.has(k) && seen.add(k); });
  return { runs: new Set(rows.map((r) => r.at)).size, findings: rows.length, most_waived: Object.values(counts).filter((c) => c.waived).sort((a, b) => b.waived - a.waived || a.rule.localeCompare(b.rule)), leaks_after_publish: afterPublish };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const val = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const venture = val("venture") ? resolve(val("venture")) : undefined;
  const json = argv.includes("--json"), log = logFile(venture, val("log") && resolve(val("log")));
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
    for (const f of r.findings.filter((f) => f.severity !== "off")) console.error(`${f.waived ? "WAIVED" : f.severity === "error" ? "ERROR " : "WARN  "} ${f.rule}  ${f.file}${f.line ? `:${f.line}` : ""}  ${f.message}${f.text && f.rule !== "claims" ? ` ("${f.text}")` : ""}`);
    console.log(`${r.stages.join(" > ")}: ${r.findings.filter((f) => f.severity === "error" && !f.waived).length} error(s), ${r.findings.filter((f) => f.severity === "warn" && !f.waived).length} warning(s)`);
  }
  process.exit(r.ok ? 0 : 1);
}
