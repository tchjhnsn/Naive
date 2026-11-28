#!/usr/bin/env node
// The postbuild page gate.

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gatedMatchers, gatedMentions, isGatedPath, matcherCovers, WAITLIST_PATH } from "../lib/waitlist-gate.ts";
import { gateRoots, loadGate, marketingGate, marketingUrls, pagePath, scan, urlFromBuiltPage } from "./gate-pages.ts";
import { prerenderUrl } from "./search-index.mjs";

let failed = 0;
const expect = (name: string, ok: boolean) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}`); if (!ok) failed++; };
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };

// A made-up gate, shaped like site/gate, so the tests name no real internal wording.
const secret = "the unannounced plan for the made-up venture";
const venture = mkdtempSync(join(tmpdir(), "gate-fixture-"));
const writeGate = (dir: string, wording: unknown, terms: unknown) => {
  mkdirSync(join(dir, "governance"), { recursive: true });
  if (wording !== undefined) writeFileSync(join(dir, "internal-wording.json"), JSON.stringify(wording));
  if (terms !== undefined) writeFileSync(join(dir, "governance/internal-terms.json"), JSON.stringify(terms));
};
const fixtureTerms = { patterns: [{ id: "codename-zephyr", regex: "\\bZephyr\\b", severity: "warn" }] };
writeGate(venture, [{ rel: "foundation/plan.json", field: "summary", text: secret }], fixtureTerms);

expect("the committed gate loads", !throws(() => loadGate()) && loadGate().wording.length > 0);
const broken = mkdtempSync(join(tmpdir(), "gate-broken-"));
try {
  expect("a gate with no files fails closed", throws(() => loadGate(broken)));
  writeGate(broken, [{ rel: "a", field: "b", text: secret }], undefined);
  expect("a gate with no internal-terms list fails closed", throws(() => loadGate(broken)));
  writeGate(broken, [], fixtureTerms);
  expect("a gate with empty wording fails closed", throws(() => loadGate(broken)));
  writeGate(broken, [{ text: 3 }], fixtureTerms);
  expect("a gate with malformed wording fails closed", throws(() => loadGate(broken)));
  writeGate(broken, [{ rel: "a", field: "b", text: secret }], { patterns: [] });
  expect("a gate with no patterns fails closed", throws(() => loadGate(broken)));
  const empty = mkdtempSync(join(tmpdir(), "gate-pages-empty-"));
  expect("scan fails closed on a broken gate", throws(() => scan(empty, join(broken, "missing"))));
  rmSync(empty, { recursive: true, force: true });
} finally {
  rmSync(broken, { recursive: true, force: true });
}

const root = mkdtempSync(join(tmpdir(), "gate-pages-"));
const page = (rel: string, text: string) => { const f = join(root, rel); mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); };
try {
  page("clean.html", "<p>hello</p>");
  expect("a clean page passes", scan(root, venture).failures.length === 0);
  page("templates/x.html", `<p>${secret}</p>`);
  expect("internal wording fails on any page", scan(root, venture).failures.length > 0);
  rmSync(join(root, "templates"), { recursive: true });
  page("docs/x.html", "<p>see EE-001</p>");
  const docs = scan(root, venture);
  expect("an internal term in docs is counted, not failed", docs.failures.length === 0 && docs.counted === 1);
} finally {
  rmSync(root, { recursive: true, force: true });
}

const linkRoot = mkdtempSync(join(tmpdir(), "gate-links-"));
try {
  const write = (rel: string, text: string) => { const f = join(linkRoot, rel); mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); };
  write("index.html", '<a href="/docs/get-started/install">Install</a>');
  const bad = marketingGate(linkRoot);
  for (const finding of bad.failures) console.log(`FAIL  ${finding.page}: ${finding.what}`);
  expect("a marketing page that links to a gated route fails", bad.failures.some((f) => f.what === 'gated route "/docs/get-started/install"'));
  write("index.html", '<a href="/waitlist">Waitlist</a>');
  write("why.html", "<p>A public page with no docs link.</p>");
  write("docs/x.html", '<a href="/docs">Docs</a>');
  const clean = marketingGate(linkRoot);
  expect("a waitlist link on a marketing page passes", clean.failures.length === 0);
  expect("a docs page is not scanned as marketing", !clean.seen.has("/docs/x"));
} finally {
  rmSync(linkRoot, { recursive: true, force: true });
}

expect("the home file maps to /", urlFromBuiltPage("index.html") === "/");
expect("a route group maps to the public URL", urlFromBuiltPage("(site)/why.html") === "/why");
expect("a docs file keeps its URL", urlFromBuiltPage("docs/get-started.html") === "/docs/get-started");
expect("the not-found file is not the home page", urlFromBuiltPage("_not-found.html") === null);

const hash = "a".repeat(64);
const cacheHome = `APP_PAGE/${hash}/$/index.html`;
const cacheDocs = `APP_PAGE/${hash}/$/docs/get-started.html`;
const cacheSegment = `APP_PAGE/${hash}/$/templates/kit.segments/templates/$d$slug/__PAGE__.segment.rsc`;
expect("a route-cache home file maps to /", urlFromBuiltPage(cacheHome) === "/");
expect("a route-cache docs file keeps its URL", urlFromBuiltPage(cacheDocs) === "/docs/get-started");
expect("a route-cache segment is not a page", urlFromBuiltPage(cacheSegment) === null);
expect("pagePath keeps the path after the route-cache separator", pagePath(cacheDocs) === "docs/get-started.html");
expect("pagePath keeps a later dollar in a segment", pagePath(cacheSegment) === "templates/kit.segments/templates/$d$slug/__PAGE__.segment.rsc");
const indexedDocs = prerenderUrl(cacheDocs);
expect("the search index keeps a route-cache docs URL gated", indexedDocs === "/docs/get-started" && isGatedPath(indexedDocs));
expect("the search index maps a route-cache home file to /", prerenderUrl(`APP_PAGE/${hash}/$/index.html`) === "/");
expect("the search index does not turn the not-found file into the home page", prerenderUrl(`APP_PAGE/${hash}/$/_not-found.html`) === null);

const cacheRoot = mkdtempSync(join(tmpdir(), "gate-cache-"));
const emptyApp = mkdtempSync(join(tmpdir(), "gate-app-"));
try {
  const write = (rel: string, text: string) => { const f = join(cacheRoot, rel); mkdirSync(join(f, ".."), { recursive: true }); writeFileSync(f, text); };
  for (const url of marketingUrls()) {
    const name = url === "/" ? "index.html" : `${url.slice(1)}.html`;
    const text = url === "/" ? '<a href="/docs/get-started/install">Install</a>' : "<p>A public page.</p>";
    write(`APP_PAGE/${hash}/$/${name}`, text);
  }
  const linked = gateRoots([emptyApp, cacheRoot], { expectAll: true });
  expect("a route-cache marketing page that links to a gated route fails", linked.failures.some((f) => f.what === 'gated route "/docs/get-started/install"'));
  expect("route-cache pages are not reported missing", !linked.failures.some((f) => f.what === "marketing page was not in the build"));
  write(`APP_PAGE/${hash}/$/index.html`, "<p>A public page.</p>");
  const held = gateRoots([emptyApp, cacheRoot], { expectAll: true });
  expect("marketing pages that exist only in route-cache pass", held.failures.length === 0 && held.seen.size === marketingUrls().size);
  write(`APP_PAGE/${hash}/$/why.html`, "<p>see EE-001</p>");
  const strict = scan(cacheRoot, venture);
  expect("an internal term on a route-cache marketing page fails", strict.failures.some((f) => f.what.includes("EE-001")));
  write(`APP_PAGE/${hash}/$/why.html`, "<p>A public page.</p>");
  write(`APP_PAGE/${hash}/$/docs/x.html`, "<p>see EE-001</p>");
  const docsCache = scan(cacheRoot, venture);
  expect("an internal term in route-cache docs is counted, not failed", docsCache.failures.length === 0 && docsCache.counted === 1);
} finally {
  rmSync(cacheRoot, { recursive: true, force: true });
  rmSync(emptyApp, { recursive: true, force: true });
}

expect("/docs is gated", isGatedPath("/docs"));
expect("/docs.md is gated", isGatedPath("/docs.md"));
expect("/docs/get-started/install.md is gated", isGatedPath("/docs/get-started/install.md"));
expect("/templates/a-kit is gated", isGatedPath("/templates/a-kit"));
expect("/llms.txt is gated", isGatedPath("/llms.txt"));
expect("/llms-full.txt is gated", isGatedPath("/llms-full.txt"));
expect("/md/docs is gated", isGatedPath("/md/docs"));
expect("/og/docs/concepts/provenance is gated", isGatedPath("/og/docs/concepts/provenance"));
expect("the waitlist is not gated", !isGatedPath(WAITLIST_PATH));
expect("the home page is not gated", !isGatedPath("/"));
expect("/og/home is not gated", !isGatedPath("/og/home"));
expect("/documentary is not a docs route", !isGatedPath("/documentary"));
expect("a docs href is a gated mention", gatedMentions('<a href="/docs">Docs</a>').join(",") === "/docs");
expect("a waitlist href is not a gated mention", gatedMentions('<a href="/waitlist">Waitlist</a>').length === 0);
expect("the word documentary is not a gated mention", gatedMentions("see /documentary today").length === 0);
expect("an escaped docs path is a gated mention", gatedMentions(String.raw`\u002Fdocs\u002Fget-started`).join(",") === "/docs/get-started");

const proxySource = readFileSync(new URL("../proxy.ts", import.meta.url), "utf8");
expect("proxy.ts lists every gated matcher", gatedMatchers.every((matcher) => proxySource.includes(`"${matcher}"`)));
const samples = [
  "/docs",
  "/docs.md",
  "/docs/get-started/install",
  "/docs/get-started/install.md",
  "/templates",
  "/templates/a-kit",
  "/llms.txt",
  "/llms-full.txt",
  "/md/docs",
  "/md/docs/concepts/provenance",
  "/og/docs",
  "/og/docs/get-started",
];
expect(
  "every sample gated path is covered by a matcher",
  samples.every((sample) => isGatedPath(sample) && gatedMatchers.some((matcher) => matcherCovers(matcher, sample))),
);

rmSync(venture, { recursive: true, force: true });

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nthe page gate holds");
