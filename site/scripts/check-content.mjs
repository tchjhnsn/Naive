// Content contract for site/content. Run with: npm run check:content
//
// Checks frontmatter, no import/export, the component allowlist, no body H1, heading levels,
// a language on every code fence, alt text on every image, every page listed in a meta.json,
// and internal links and anchors.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "yaml";
import { z } from "zod";

const root = new URL("../content/", import.meta.url).pathname;
const status = z.enum(["draft", "beta", "stable", "deprecated"]);
const reviewed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const shared = {
  title: z.string().min(1),
  description: z.string().min(40).max(160),
  status,
  lastReviewed: reviewed,
  owner: z.string().min(1),
  sources: z.array(z.string().url()).optional(),
};
const schemas = {
  docs: z.object({ ...shared, type: z.enum(["tutorial", "how-to", "reference", "explanation"]) }).strict(),
  marketing: z.object({ ...shared, audience: z.string().optional() }).strict(),
};
const allow = new Set([
  "Callout", "Cards", "Card", "Steps", "Step", "Tabs", "Tab", "Accordions", "Accordion",
  "Files", "Folder", "File", "TypeTable", "RouteTable", "Groups", "Glossary", "Kits",
  "Decisions", "Hero", "Statement", "Section", "Features", "Feature", "Closing", "CTA", "Fact",
  "FactList", "Lifecycle", "WaitlistForm",
]);
const extraRoutes = new Set(["/llms.txt", "/llms-full.txt"]);
const errors = [];
const fail = (where, message) => errors.push(`${where}: ${message}`);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function splitFrontmatter(text, where) {
  if (!text.startsWith("---\n")) { fail(where, "missing frontmatter"); return null; }
  const end = text.indexOf("\n---\n", 4);
  if (end < 0) { fail(where, "frontmatter is not closed"); return null; }
  let data;
  try { data = parse(text.slice(4, end)) ?? {}; }
  catch (e) { fail(where, `frontmatter YAML: ${e.message}`); return null; }
  if (!data || typeof data !== "object" || Array.isArray(data)) { fail(where, "frontmatter is not a mapping"); return null; }
  return { data, body: text.slice(end + 5) };
}

function slugify(text) {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-");
}

function headings(body) {
  const counts = new Map();
  const slugs = new Set();
  const levels = [];
  let fence = null;
  for (const line of body.split("\n")) {
    if (line.startsWith("```")) { fence = fence ? null : line; continue; }
    if (fence) continue;
    const match = line.match(/^(#{1,6})\s+(.*)$/);
    if (!match) continue;
    const level = match[1].length;
    levels.push(level);
    let slug = slugify(match[2].replace(/`/g, ""));
    const seen = counts.get(slug) ?? 0;
    counts.set(slug, seen + 1);
    if (seen) slug = `${slug}-${seen}`;
    slugs.add(slug);
  }
  return { levels, slugs };
}

function withoutFences(body) {
  return body.split("\n").reduce((acc, line) => {
    if (line.startsWith("```")) acc.fence = !acc.fence;
    else if (!acc.fence) acc.lines.push(line);
    return acc;
  }, { fence: false, lines: [] }).lines.join("\n");
}

const pages = [];
for (const file of walk(root).filter((f) => f.endsWith(".mdx"))) {
  const rel = relative(root, file);
  const collection = rel.startsWith("docs/") ? "docs" : rel.startsWith("marketing/") ? "marketing" : null;
  if (!collection) { fail(rel, "outside docs/ and marketing/"); continue; }
  const text = readFileSync(file, "utf8");
  const split = splitFrontmatter(text, rel);
  if (!split) continue;
  const parsed = schemas[collection].safeParse(split.data);
  if (!parsed.success) fail(rel, parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  const body = split.body;
  let fence = null;
  const fenceLines = body.split("\n");
  for (const line of fenceLines) {
    if (!line.startsWith("```")) continue;
    if (fence) { fence = null; continue; }
    const info = line.slice(3).trim();
    if (!info || !/^[A-Za-z0-9_+-]+/.test(info)) fail(rel, "code fence has no language");
    fence = line;
  }
  if (fence) fail(rel, "code fence is not closed");
  const prose = withoutFences(body);
  if (/^\s*(import|export)\s/m.test(prose)) fail(rel, "import or export in content");
  for (const match of prose.matchAll(/<([A-Z][A-Za-z0-9.]*)\b/g)) {
    const name = match[1].split(".")[0];
    if (!allow.has(name)) fail(rel, `component ${match[1]} is not allowlisted`);
  }
  const { levels, slugs } = headings(body);
  if (levels.some((level) => level === 1)) fail(rel, "body has an H1");
  // Hero renders the page h1, and the template drops its own only on the home page.
  if (/<Hero\b/.test(prose) && rel !== join("marketing", "index.mdx")) fail(rel, "Hero is only for the home page");
  let previous = 1;
  for (const level of levels) {
    if (level > previous + 1) fail(rel, `heading skips from h${previous} to h${level}`);
    previous = level;
  }
  for (const match of prose.matchAll(/!\[([^\]]*)\]\([^)]*\)/g)) {
    if (!match[1].trim()) fail(rel, "image has no alt text");
  }
  if (/<img\b(?![^>]*\balt=)/.test(prose)) fail(rel, "img has no alt text");
  const inside = rel.slice(collection.length + 1).replace(/\.mdx$/, "");
  const parts = inside.split("/");
  if (parts.at(-1) === "index") parts.pop();
  const url = collection === "docs" ? `/${["docs", ...parts].filter(Boolean).join("/")}` : `/${parts.join("/")}`;
  pages.push({ rel, collection, inside, url: url === "/" ? "/" : url.replace(/\/$/, ""), slugs, body: prose, owner: split.data.owner });
}

const byUrl = new Map(pages.map((p) => [p.url, p]));
const indexUrls = new Set(pages.filter((p) => p.inside.endsWith("index") || p.inside === "index").map((p) => p.url));

function resolveLink(from, href) {
  const hashAt = href.indexOf("#");
  const path = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const hash = hashAt >= 0 ? href.slice(hashAt + 1) : "";
  if (!path) return { url: from.url, hash };
  if (/^[a-z]+:/i.test(path)) return null;
  if (path.startsWith("/")) return { url: path.replace(/\/$/, "") || "/", hash };
  const dir = indexUrls.has(from.url) ? (from.url === "/" ? "/" : `${from.url}/`) : from.url.replace(/\/[^/]*$/, "/") || "/";
  const url = new URL(path, `http://local${dir}`).pathname.replace(/\/$/, "") || "/";
  return { url, hash };
}

for (const page of pages) {
  const hrefs = [...page.body.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g), ...page.body.matchAll(/\bhref="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    const target = resolveLink(page, href);
    if (!target) continue;
    if (extraRoutes.has(target.url)) continue;
    const found = byUrl.get(target.url);
    if (!found) { fail(page.rel, `link not found: ${href}`); continue; }
    if (target.hash && !found.slugs.has(target.hash)) fail(page.rel, `anchor not found: ${href}`);
  }
}

for (const collection of ["docs", "marketing"]) {
  const base = join(root, collection);
  const metas = walk(base).filter((f) => f.endsWith("meta.json"));
  const listed = new Set();
  for (const metaPath of metas) {
    const dir = relative(base, metaPath).replace(/\/?meta\.json$/, "");
    let meta;
    try { meta = JSON.parse(readFileSync(metaPath, "utf8")); } catch (e) { fail(relative(root, metaPath), e.message); continue; }
    if (!Array.isArray(meta.pages)) { fail(relative(root, metaPath), "pages array is missing"); continue; }
    for (const entry of meta.pages) {
      if (typeof entry !== "string" || entry.startsWith("---")) { fail(relative(root, metaPath), `bad pages entry ${entry}`); continue; }
      const stem = join(dir, entry);
      const asFile = join(base, `${stem}.mdx`);
      const asDir = join(base, stem);
      if (statSync(asFile, { throwIfNoEntry: false })?.isFile()) listed.add(relative(root, asFile));
      else if (statSync(asDir, { throwIfNoEntry: false })?.isDirectory()) listed.add(`dir:${relative(root, asDir)}`);
      else fail(relative(root, metaPath), `pages entry not found: ${entry}`);
    }
  }
  for (const file of walk(base).filter((f) => f.endsWith(".mdx"))) {
    if (!listed.has(relative(root, file))) fail(relative(root, file), "not listed in a meta.json");
  }
}

// Page owners: every page's owner is the site owner, and every page has contributors whose
// roles are in Naive's role library (packages/naive/src/roles/<id>/).
const owners = JSON.parse(readFileSync(join(root, "owners.json"), "utf8"));
const rolesDir = new URL("../../packages/naive/src/roles/", import.meta.url).pathname;
const roles = new Set(readdirSync(rolesDir).filter((name) => statSync(join(rolesDir, name)).isDirectory()));
for (const [key, list] of Object.entries(owners.contributors ?? {})) {
  if (!Array.isArray(list) || list.length === 0) fail("owners.json", `${key}: lists no role that sends notes`);
  for (const role of list) if (!roles.has(role)) fail("owners.json", `${key}: ${role} is not a role in the role library`);
}
const contributorsOf = (rel) => {
  const keys = Object.keys(owners.contributors ?? {}).filter((key) => rel === key || rel.startsWith(`${key}/`));
  keys.sort((a, b) => b.length - a.length);
  return keys.length ? owners.contributors[keys[0]] : null;
};
for (const page of pages) {
  if (page.owner !== owners.site_owner) fail(page.rel, `owner is ${page.owner}, not the site owner ${owners.site_owner}`);
  if (!contributorsOf(page.rel)) fail(page.rel, "no contributors in owners.json");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`content contract holds (${pages.length} pages)`);
