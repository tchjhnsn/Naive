// The PR review agent's content pass (handoff 2026-10-29, item 7): fetch the markdown of each changed site page
// from the preview and look for text that must never be public.
//
//   node site/pr-review/content.mjs --preview <url> [--base origin/main] [--out findings.json]
//   node site/pr-review/content.mjs --fixtures <dir>        (offline: every .md file in <dir> is a page)
//
// A page's markdown comes from `Accept: text/markdown`, then from the `.md` route. The patterns come from the
// internal-terms dictionaries (Naive's and the venture's, see loadPatterns) plus the fallback list below. It only reports: findings go in the PR comment, nothing is merged or blocked.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("../../", import.meta.url).pathname;

// Always run, so the secret shapes apply with or without a dictionary. Severity `error` is a leak; `warn` asks a person to look.
export const FALLBACK_PATTERNS = [
  { id: "codename", severity: "error", pattern: "\\bmentura\\b", flags: "i", reason: "internal codename" },
  { id: "repo-name", severity: "warn", pattern: "\\beverything[- ]ecosystem\\b", flags: "i", reason: "internal repository name" },
  { id: "ledger-id", severity: "warn", pattern: "\\b(?:G|EE|D)-\\d{3}\\b", flags: "", reason: "internal decision ledger id" },
  { id: "private-path", severity: "error", pattern: "(?:^|/)_(?:private|internal)/", flags: "m", reason: "private folder path" },
  { id: "local-path", severity: "error", pattern: "/Users/[A-Za-z0-9._-]+/", flags: "", reason: "local machine path" },
  { id: "todo", severity: "warn", pattern: "\\b(?:TODO|FIXME|XXX)\\b", flags: "", reason: "unfinished marker" },
  { id: "secret-aws", severity: "error", pattern: "\\bAKIA[0-9A-Z]{16}\\b", flags: "", reason: "AWS access key shape" },
  { id: "secret-github", severity: "error", pattern: "\\bgh[pousr]_[A-Za-z0-9]{30,}\\b", flags: "", reason: "GitHub token shape" },
  { id: "secret-stripe", severity: "error", pattern: "\\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\\b", flags: "", reason: "Stripe key shape" },
  { id: "secret-private-key", severity: "error", pattern: "-----BEGIN [A-Z ]*PRIVATE KEY-----", flags: "", reason: "private key block" },
  { id: "email", severity: "warn", pattern: "\\b[A-Za-z0-9._%+-]+@(?!example\\.(?:com|org))[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b", flags: "", reason: "personal email address" },
];

// Naive's list (in this checkout: the agent sits in Naive's repository, beside the site), then the founder's list
// frozen in site/gate, as packages/naive/src/engine/check-leaks.ts reads them. The fallback patterns always run.
const NAIVE_DICTIONARY = "packages/naive/src/engine/internal-terms.json";
const naiveRoot = existsSync(join(root, NAIVE_DICTIONARY)) ? root : null;
const VENTURE_DICTIONARY = "site/gate/governance/internal-terms.json";

// Accepts { terms: [...] }, { patterns: [...] } or an array; each entry a string (a literal term) or { regex|pattern|term, ... }.
// Dictionaries add to the fallback list, so the secret shapes always run. The report is public, and a founder's rule id
// or reason can name the unannounced term, so those rules go out under a neutral id and reason.
//   dir    the repository whose venture list is read (default: this one)
//   naive  the Naive checkout whose list is read (default: this repository)
export function loadPatterns(dir = root, naive = naiveRoot) {
  const sources = [];
  const patterns = [];
  const skipped = naive ? [] : [`Naive's list skipped (no Naive checkout)`];
  for (const [rel, base, label] of [[NAIVE_DICTIONARY, naive, `naive-framework/${NAIVE_DICTIONARY}`], [VENTURE_DICTIONARY, dir, VENTURE_DICTIONARY]]) {
    if (!base) continue;
    const file = join(base, rel);
    if (!existsSync(file)) continue;
    sources.push(label);
    const data = JSON.parse(readFileSync(file, "utf8"));
    const list = Array.isArray(data) ? data : data.terms ?? data.patterns ?? [];
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const own = list.map((t, i) => typeof t === "string"
      ? { id: `term-${i + 1}`, severity: "error", pattern: `\\b${escape(t)}\\b`, flags: "i", reason: "internal term" }
      : { id: t.id ?? `term-${i + 1}`, severity: t.severity === "warn" ? "warn" : "error", pattern: t.regex ?? t.pattern ?? `\\b${escape(t.term)}\\b`, flags: t.flags ?? "", reason: t.why ?? t.reason ?? "internal term" });
    patterns.push(...(rel === VENTURE_DICTIONARY ? own.map((p, i) => ({ ...p, id: `venture-term-${i + 1}`, reason: "term on the founder's internal list" })) : own));
  }
  if (!sources.length) return { source: skipped.length ? `fallback; ${skipped[0]}` : "fallback", patterns: FALLBACK_PATTERNS };
  const ids = new Set(patterns.map((p) => p.id));
  return { source: [...sources, ...skipped].join(", "), patterns: [...patterns, ...FALLBACK_PATTERNS.filter((p) => !ids.has(p.id))] };
}

// A finding records the rule and where it matched, never the matched text: the report is public and the match may be
// a secret or the internal term itself.
export function checkMarkdown(text, patterns) {
  const findings = [];
  const lines = text.split("\n");
  for (const p of patterns) {
    const re = new RegExp(p.pattern, p.flags.includes("g") ? p.flags : p.flags + "g");
    lines.forEach((line, i) => {
      for (const m of line.matchAll(re)) findings.push({ rule: p.id, severity: p.severity, line: i + 1, column: m.index + 1, reason: p.reason });
    });
  }
  return findings;
}

// site/content/docs/a/index.mdx -> /docs/a ; site/content/(collection)/x.mdx -> /x. Only content pages have markdown.
export function pagesFromFiles(files) {
  const urls = new Set();
  for (const f of files) {
    const m = f.match(/^site\/content\/([^/]+)\/(.+)\.mdx?$/);
    if (!m) continue;
    const parts = m[2].split("/");
    if (parts.at(-1) === "index") parts.pop();
    urls.add(m[1] === "docs" ? "/" + ["docs", ...parts].join("/") : "/" + parts.join("/"));
  }
  return [...urls].sort();
}

/** @param {string} base @param {string} path @param {(url: string, init: { headers: Record<string, string> }) => Promise<{ ok: boolean, status: number, headers: { get(name: string): string | null | undefined }, text(): Promise<string> }>} [fetchImpl] */
export async function fetchMarkdown(base, path, fetchImpl = fetch) {
  const url = new URL(path, base).toString();
  const first = await fetchImpl(url, { headers: { accept: "text/markdown" } });
  if (first.ok && /markdown|text\/plain/.test(first.headers.get("content-type") ?? "")) return first.text();
  const second = await fetchImpl(url.replace(/\/$/, "") + ".md", { headers: {} });
  if (second.ok) return second.text();
  throw new Error(`no markdown for ${path} (${first.status}, .md ${second.status})`);
}

export function report(pages, source) {
  const out = [`### Content`, ``, `Patterns: ${source === "fallback" ? "built-in fallback list" : source.startsWith("fallback; ") ? `built-in fallback list; ${source.slice(10)}` : source}.`, ``];
  const hits = pages.filter((p) => p.error || p.findings.length);
  if (!pages.length) out.push("No changed site pages.");
  else if (!hits.length) out.push(`${pages.length} page(s) checked, nothing found.`);
  for (const p of hits) {
    out.push(`- \`${p.path}\`${p.error ? `: could not read (${p.error})` : ""}`);
    for (const f of p.findings) out.push(`  - ${f.severity} \`${f.rule}\` line ${f.line}, column ${f.column}: ${f.reason}`);
  }
  return out.join("\n");
}

/** @param {{ preview?: string, base?: string, fixtures?: string, files?: string[] }} [opts] */
export async function run({ preview, base = "origin/main", fixtures, files } = {}) {
  const { source, patterns } = loadPatterns();
  let inputs;
  if (fixtures) {
    inputs = readdirSync(fixtures).filter((f) => f.endsWith(".md")).sort()
      .map((f) => ({ path: relative(root, join(fixtures, f)), text: () => readFileSync(join(fixtures, f), "utf8") }));
  } else {
    const changed = files ?? execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
    inputs = pagesFromFiles(changed).map((path) => ({ path, text: () => fetchMarkdown(preview, path) }));
  }
  const pages = [];
  for (const input of inputs) {
    try { pages.push({ path: input.path, findings: checkMarkdown(await input.text(), patterns) }); }
    catch (e) { pages.push({ path: input.path, findings: [], error: e.message }); }
  }
  return { source, pages, markdown: report(pages, source) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const preview = arg("preview") ?? process.env.PREVIEW_URL;
  const fixtures = arg("fixtures");
  if (!preview && !fixtures) { console.error("usage: content.mjs --preview <url> | --fixtures <dir>"); process.exit(2); }
  const result = await run({ preview, fixtures, base: arg("base") });
  if (arg("out")) writeFileSync(arg("out"), JSON.stringify(result, null, 2));
  console.log(result.markdown);
}
