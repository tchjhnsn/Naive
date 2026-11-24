// The PR review agent's design pass (handoff 2026-10-29, item 7): one headless browser pass over each changed page,
// reading the DOM and computed styles. No screenshots unless the screenshot mode says so.
//
//   node site/pr-review/design.mjs --preview <url> [--base origin/main] [--screenshots off|on-demand|always]
//                                     [--labels a,b] [--out findings.json] [--shots <dir>]
//
// Checks: one h1; no skipped or duplicate headings; no horizontal overflow at 375px; every img has alt;
// text contrast at least 4.5:1 from computed colors. Needs playwright (npx playwright install chromium);
// without it the pass reports that it was skipped.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pagesFromFiles } from "./content.mjs";

const root = new URL("../../", import.meta.url).pathname;

// pr_review.screenshots in naive.config.json: "off" (default), "on-demand" (the PR's `screenshots` label) or "always".
/** @param {{ labels?: string[], config?: { pr_review?: { screenshots?: string } } }} [opts] */
export function screenshotMode({ labels = [], config } = {}) {
  let setting = config?.pr_review?.screenshots;
  if (setting === undefined && existsSync(join(root, "naive.config.json"))) {
    try { setting = JSON.parse(readFileSync(join(root, "naive.config.json"), "utf8")).pr_review?.screenshots; } catch { /* unreadable config is "off" */ }
  }
  if (setting === "always") return true;
  return labels.includes("screenshots");
}

// WCAG relative luminance and contrast, on [r, g, b] in 0..255.
export function contrast(a, b) {
  const lum = ([r, g, bl]) => {
    const c = [r, g, bl].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// Runs in the page. A finding gives the rule and the element's position, never page text or a src: the report is
// public and page text may be a secret. Returns findings; kept self-contained so it can be passed to page.evaluate.
export function inspectPage() {
  const { document, getComputedStyle, NodeFilter } = /** @type {*} */ (globalThis);
  const findings = [];
  const heads = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter((h) => h.offsetParent !== null || h.getClientRects().length);
  const h1s = heads.filter((h) => h.tagName === "H1").length;
  if (h1s !== 1) findings.push({ rule: "one-h1", detail: `${h1s} h1 elements` });
  let prev = 0;
  const seen = new Map();
  for (const [i, h] of heads.entries()) {
    const level = Number(h.tagName[1]);
    if (prev && level > prev + 1) findings.push({ rule: "heading-skip", detail: `h${prev} to h${level} at heading ${i + 1}` });
    prev = level;
    const key = `${level}:${h.textContent.trim().toLowerCase()}`;
    if (seen.has(key)) findings.push({ rule: "heading-duplicate", detail: `h${level} at heading ${i + 1}` });
    seen.set(key, true);
  }
  for (const [i, img] of [...document.querySelectorAll("img")].entries()) if (!img.hasAttribute("alt")) findings.push({ rule: "img-alt", detail: `image ${i + 1}` });
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { rgb: p.slice(0, 3), a: p[3] ?? 1 }; };
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.5) return c.rgb; }
    return [255, 255, 255];
  };
  const lum = (rgb) => { const c = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  let low = 0;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const done = new Set();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const el = n.parentElement;
    if (!el || done.has(el) || !n.textContent.trim()) continue;
    done.add(el);
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none" || !el.getClientRects().length) continue;
    const fg = parse(s.color);
    if (!fg || fg.a < 0.5) continue;
    const size = parseFloat(s.fontSize), bold = Number(s.fontWeight) >= 700;
    const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const r = ratio(fg.rgb, bgOf(el));
    if (r < need && low++ < 10) findings.push({ rule: "contrast", detail: `${r.toFixed(2)}:1 (needs ${need}) at text element ${done.size}` });
  }
  return findings;
}

/** @param {{ path: string, findings: { rule: string, detail: string }[], error?: string }[]} pages @param {{ skipped?: string, screenshots?: boolean }} [opts] */
export function report(pages, { skipped, screenshots } = {}) {
  const out = ["### Design", ""];
  if (skipped) return [...out, `Skipped: ${skipped}.`].join("\n");
  out.push(`Screenshots: ${screenshots ? "uploaded with this run's pr-review artifact" : "off"}.`, "");
  const hits = pages.filter((p) => p.error || p.findings.length);
  if (!pages.length) out.push("No changed site pages.");
  else if (!hits.length) out.push(`${pages.length} page(s) checked, nothing found.`);
  for (const p of hits) {
    out.push(`- \`${p.path}\`${p.error ? `: could not load (${p.error})` : ""}`);
    for (const f of p.findings) out.push(`  - \`${f.rule}\` ${f.detail}`);
  }
  return out.join("\n");
}

/** @param {{ preview?: string, base?: string, labels?: string[], files?: string[], shotsDir?: string }} [opts] */
export async function run({ preview, base = "origin/main", labels = [], files, shotsDir = "pr-review-out/screenshots" } = {}) {
  const changed = files ?? execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
  const paths = pagesFromFiles(changed);
  const screenshots = screenshotMode({ labels });
  let chromium;
  try { ({ chromium } = await import("playwright")); } catch { return { pages: [], markdown: report([], { skipped: "playwright is not installed" }) }; }
  const browser = await chromium.launch();
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const shots = screenshots ? (mkdirSync(shotsDir, { recursive: true }), shotsDir) : null;
  const pages = [];
  for (const path of paths) {
    const url = new URL(path, preview).toString();
    try {
      const page = await desktop.newPage();
      await page.goto(url, { waitUntil: "networkidle" });
      const findings = await page.evaluate(inspectPage);
      if (shots) await page.screenshot({ path: join(shots, path.replace(/\W+/g, "_") + ".png"), fullPage: true });
      await page.close();
      const small = await mobile.newPage();
      await small.goto(url, { waitUntil: "networkidle" });
      const over = await small.evaluate(() => { const { documentElement: e } = /** @type {*} */ (globalThis).document; return e.scrollWidth - e.clientWidth; });
      if (over > 1) findings.push({ rule: "overflow-375", detail: `${over}px wider than the viewport` });
      await small.close();
      pages.push({ path, findings });
    } catch (e) { pages.push({ path, findings: [], error: e.message.split("\n")[0] }); }
  }
  await browser.close();
  return { pages, screenshots: shots, markdown: report(pages, { screenshots }) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const preview = arg("preview") ?? process.env.PREVIEW_URL;
  if (!preview) { console.error("usage: design.mjs --preview <url>"); process.exit(2); }
  const labels = (arg("labels") ?? process.env.PR_LABELS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const result = await run({ preview, base: arg("base"), labels, shotsDir: arg("shots") });
  if (arg("out")) writeFileSync(arg("out"), JSON.stringify(result, null, 2));
  console.log(result.markdown);
}
