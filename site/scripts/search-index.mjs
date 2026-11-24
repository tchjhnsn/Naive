// Builds the Pagefind index from prerendered HTML after `next build`.
// A plain build writes pages to .next/server/app/<path>.html. On Vercel, Next's
// build adapter writes them under .next/server/route-cache, so a Pagefind scan of
// only `.next/server/app` indexes nothing. This reads both. The page path is the
// text after the route-cache `$/` separator. Keeping the slash that follows `$`
// would turn `/docs` into `//docs`, and the gated-page skip would miss it.
//
//   node scripts/search-index.mjs

import { createIndex, close } from "pagefind";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { isGatedPath } from "../lib/waitlist-gate.ts";
import { pagePath } from "./gate-pages.ts";

const server = new URL("../.next/server/", import.meta.url).pathname;

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return name.endsWith(".html") ? [path] : [];
  });
}

function toUrl(path) {
  const parts = path.split("/").filter((part) => part && !(/^\(.*\)$/.test(part) || part.includes("[[") || part.startsWith("_")));
  const cleaned = parts.join("/").replace(/\.html$/, "").replace(/(^|\/)index$/, "");
  return cleaned ? `/${cleaned}` : "/";
}

function hidden(page) {
  return page === "_not-found.html" || page.startsWith("_not-found/") || page === "_global-error.html" || page.startsWith("_global-error/") || page.startsWith("_not-found.") || page.startsWith("_global-error.");
}

// The public URL of one prerendered HTML file, from either output tree.
export function prerenderUrl(rel) {
  const page = pagePath(rel);
  if (hidden(page)) return null;
  return toUrl(page);
}

function addPages(pages) {
  for (const file of walk(join(server, "app"))) {
    const rel = relative(join(server, "app"), file).split(sep).join("/");
    const url = prerenderUrl(rel);
    if (!url || pages.has(url)) continue;
    pages.set(url, file);
  }
  for (const file of walk(join(server, "route-cache"))) {
    const normalized = file.split(sep).join("/");
    if (!normalized.includes("$/")) continue;
    const url = prerenderUrl(normalized);
    if (!url || pages.has(url)) continue;
    pages.set(url, file);
  }
  return pages;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pages = addPages(new Map());
  const { index } = await createIndex();
  let indexed = 0;
  let skipped = 0;
  for (const [url, file] of pages) {
    if (url.includes("_not-found") || url === "/404") continue;
    if (isGatedPath(url)) { skipped++; continue; }
    const { file: written } = await index.addHTMLFile({ url, content: readFileSync(file, "utf8") });
    if (written) indexed++;
  }
  await index.writeFiles({ outputPath: new URL("../public/_pagefind", import.meta.url).pathname });
  await close();
  console.log(`indexed ${indexed} of ${pages.size} prerendered pages; skipped ${skipped} gated`);
  if (!indexed) {
    console.error("no prerendered HTML found under .next/server");
    process.exit(1);
  }
}
