#!/usr/bin/env node
// Postbuild gate: the prerendered site is scanned the way publish-build.mjs scans a channel's output.
// No page may carry a record's internal wording or a draft marker, and the marketing pages
// also fail on any internal term. Docs and Templates describe Naive's own file layout, so their
// record paths and decision ids are counted, not failed, until Torian sets a policy for them.
// A rendered marketing page also fails when it links to or names a route that proxy.ts sends to /waitlist.
// A plain build writes prerendered files under .next/server/app. A build adapter, which is what
// Vercel runs, writes them under .next/server/route-cache as <kind>/<hash>$/<path>. The gate reads both.
// What it looks for is frozen in site/gate/ (scripts/export-gate.ts writes it from a venture folder), so the
// build needs no venture records. A missing, malformed or empty gate file stops the gate: it fails closed.
//
//   node scripts/gate-pages.ts [<built app dir>]

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { patterns } from "naive-framework/src/engine/check-leaks.mjs";
import { gatedMentions } from "../lib/waitlist-gate.ts";

type Finding = { page: string; what: string };

const repo = new URL("../../", import.meta.url).pathname;
const GATE = join(repo, "site/gate");
const marketing: string[] = JSON.parse(readFileSync(new URL("../content/marketing/meta.json", import.meta.url), "utf8")).pages;
const STRICT = new Set([...marketing, "_not-found"]);
const PUBLIC_REPO = "https://github.com/tchjhnsn/everything-ecosystem";

const walk = (p: string): string[] => statSync(p).isDirectory() ? readdirSync(p).flatMap((n) => walk(join(p, n))) : [p];
const visible = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");

// The page path inside a prerendered file. Route-cache keys look like
// APP_PAGE/<hash>$/docs/get-started.html. A later `$` inside a segment
// (`$d$slug`) is part of the page path, so the separator is the first `$/`.
export function pagePath(rel: string): string {
  const normalized = rel.split(/[/\\]/).join("/");
  const at = normalized.indexOf("$/");
  const file = at === -1 ? normalized : normalized.slice(at + 2);
  return file.replace(/^\/+/, "");
}

type Wording = { text: string; rel: string; field: string };
const isWording = (x: unknown): x is Wording => !!x && typeof x === "object"
  && "text" in x && typeof x.text === "string" && "rel" in x && typeof x.rel === "string" && "field" in x && typeof x.field === "string";

// The frozen gate: the record wording that must never render, and the founder's internal-terms list.
export function loadGate(gate = GATE): { wording: Wording[] } {
  const wordingFile = join(gate, "internal-wording.json");
  const termsFile = join(gate, "governance/internal-terms.json");
  for (const f of [wordingFile, termsFile]) if (!existsSync(f)) throw new Error(`the page gate has no ${f}; run scripts/export-gate.ts`);
  const wording: unknown = JSON.parse(readFileSync(wordingFile, "utf8"));
  if (!Array.isArray(wording) || !wording.length || !wording.every(isWording)) throw new Error(`${wordingFile} must be a non-empty list of { text, rel, field }`);
  const terms: unknown = JSON.parse(readFileSync(termsFile, "utf8"));
  if (!terms || typeof terms !== "object" || !("patterns" in terms) || !Array.isArray(terms.patterns) || !terms.patterns.length) throw new Error(`${termsFile} must hold a non-empty patterns list`);
  return { wording };
}

export function scan(root: string, gate = GATE) {
  const wording = loadGate(gate).wording.map((w) => ({ ...w, text: w.text.replace(/\s+/g, " ") })).filter((w) => w.text !== PUBLIC_REPO);
  const terms = patterns(gate).filter((p: { severity?: string }) => (p.severity ?? "fail") !== "warn");
  const failures: Finding[] = [];
  let counted = 0;
  for (const file of walk(root).filter((f) => /\.(html|rsc|body|md|txt|xml)$/.test(f))) {
    const page = relative(root, file);
    const section = pagePath(page).split(/[/.]/)[0];
    const text = visible(readFileSync(file, "utf8"));
    for (const w of wording) if (text.includes(w.text)) failures.push({ page, what: `internal wording of ${w.rel}#${w.field}` });
    for (const p of terms) for (const m of text.matchAll(p.re)) {
      if (STRICT.has(section) || p.id === "draft-marker") failures.push({ page, what: `${p.id} "${m[0]}"` });
      else counted++;
    }
  }
  return { failures, counted };
}

const marketingPages: string[] = JSON.parse(readFileSync(new URL("../content/marketing/meta.json", import.meta.url), "utf8")).pages;

export function marketingUrls() {
  return new Set(marketingPages.map((page) => (page === "index" ? "/" : `/${page}`)));
}

// A prerendered file's public URL. Route groups, optional catch-alls, and
// Next's internal segment files are not pages. `_not-found` is not the home page.
export function urlFromBuiltPage(rel: string): string | null {
  const normalized = rel.split(/[/\\]/).join("/");
  if (normalized.includes("_not-found") || normalized.includes(".segments")) return null;
  const parts = pagePath(rel).split("/").filter((part) => {
    if (!part) return false;
    if (part.startsWith("(") && part.endsWith(")")) return false;
    if (part.includes("[[") || part.startsWith("_")) return false;
    return true;
  });
  if (!parts.length) return null;
  const last = parts[parts.length - 1] ?? "";
  const stripped = last.replace(/\.(html|rsc|body|md|txt|xml)$/, "");
  if (stripped === last) return null;
  parts[parts.length - 1] = stripped;
  if (parts.some((part) => part.includes("."))) return null;
  if (parts[parts.length - 1] === "index") parts.pop();
  return parts.length ? `/${parts.join("/")}` : "/";
}

export function marketingGate(root: string, options?: { expectAll?: boolean }) {
  const urls = marketingUrls();
  const failures: Finding[] = [];
  const seen = new Set<string>();
  if (!existsSync(root)) return { failures: [{ page: root, what: "no built site" }], seen };
  for (const file of walk(root).filter((f) => /\.(html|rsc|body|md|txt|xml)$/.test(f))) {
    const page = relative(root, file);
    const url = urlFromBuiltPage(page);
    if (!url || !urls.has(url)) continue;
    seen.add(url);
    for (const path of gatedMentions(readFileSync(file, "utf8"))) {
      failures.push({ page, what: `gated route "${path}"` });
    }
  }
  if (options?.expectAll) {
    for (const url of urls) if (!seen.has(url)) failures.push({ page: url, what: "marketing page was not in the build" });
  }
  return { failures, seen };
}

// One verdict for every prerender directory from a build. expectAll is across
// the union, so a page that the adapter wrote only under route-cache still counts.
export function gateRoots(roots: string[], options?: { expectAll?: boolean }) {
  const present = roots.filter((root) => existsSync(root));
  if (!present.length) return { failures: [{ page: roots[0] ?? "", what: "no built site" }], counted: 0, seen: new Set<string>() };
  const failures: Finding[] = [];
  const seen = new Set<string>();
  let counted = 0;
  for (const root of present) {
    const scanned = scan(root);
    failures.push(...scanned.failures);
    counted += scanned.counted;
    const gated = marketingGate(root);
    failures.push(...gated.failures);
    for (const url of gated.seen) seen.add(url);
  }
  if (options?.expectAll) {
    for (const url of marketingUrls()) if (!seen.has(url)) failures.push({ page: url, what: "marketing page was not in the build" });
  }
  return { failures, counted, seen };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = join(repo, "site/.next/server");
  const roots = process.argv[2] ? [process.argv[2]] : [join(server, "app"), join(server, "route-cache")];
  const present = roots.filter((root) => existsSync(root));
  if (!present.length) { console.error(`no built site at ${roots.join(" or ")}`); process.exit(2); }
  const { failures, counted } = gateRoots(present, { expectAll: true });
  for (const f of failures) console.error(`FAIL  ${f.page}: ${f.what}`);
  console.log(`${failures.length} gate failure(s); ${counted} internal term(s) in Docs and Templates await a policy`);
  process.exit(failures.length ? 1 : 0);
}
