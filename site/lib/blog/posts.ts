// Post loading follows the Vercel Portfolio Blog Starter
// (vercel/examples, solutions/blog): one Markdown file per post, frontmatter
// beside the body, newest first. Rendering stays in this route so the blog
// does not take a dependency on next-mdx-remote, and package.json stays put
// for the docs migration. Posts are .md because site/scripts/check-content.mjs
// rejects any .mdx outside content/docs and content/marketing. .mdx is still
// read, as Markdown, if a later change allows it.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import type { Post } from "./types";

const postsDir = path.join(process.cwd(), "content", "blog");

function fail(file: string, message: string): never {
  throw new Error(`${file}: ${message}`);
}

function stringList(value: unknown, key: string, file: string): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? [value] : null;
  if (!list || list.some((item) => typeof item !== "string" || !item.trim())) {
    fail(file, `${key} must be a list of strings`);
  }
  const items = list.map((item) => item.trim());
  if (items.length === 0) fail(file, `${key} must name at least one value`);
  return items;
}

function readPost(file: string): Post {
  const raw = readFileSync(path.join(postsDir, file), "utf8");
  if (!raw.startsWith("---\n")) fail(file, "missing frontmatter");
  const end = raw.indexOf("\n---\n", 4);
  if (end < 0) fail(file, "frontmatter is not closed");
  const data = parse(raw.slice(4, end));
  if (!data || typeof data !== "object" || Array.isArray(data)) fail(file, "frontmatter is not a mapping");
  const record = data as Record<string, unknown>;
  const title = record.title;
  const summary = record.summary;
  const date = record.date;
  if (typeof title !== "string" || !title.trim()) fail(file, "title must be a non-empty string");
  if (typeof summary !== "string" || !summary.trim()) fail(file, "summary must be a non-empty string");
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(file, "date must be YYYY-MM-DD");
  if ("draft" in record && typeof record.draft !== "boolean") fail(file, "draft must be true or false");
  const draft = record.draft === true;
  const approved = record.publish === true && typeof record.approved_by === "string" && record.approved_by.trim() !== "";
  let image: string | undefined;
  if (typeof record.image === "string" && record.image.trim()) {
    image = record.image.trim();
    if (!image.startsWith("/") || image.includes("..")) fail(file, "image must be a site path");
  }
  const slug = path.basename(file, path.extname(file));
  return {
    slug,
    title: title.trim(),
    date,
    authors: stringList(record.authors, "authors", file),
    summary: summary.trim(),
    tags: stringList(record.tags, "tags", file),
    draft,
    approved,
    image,
    content: raw.slice(end + 5).trim(),
  };
}

/** UTC day the build treats as today. BLOG_AS_OF overrides it for a replay. */
export function asOfDay(): string {
  const fromEnv = process.env.BLOG_AS_OF;
  if (fromEnv !== undefined && fromEnv !== "") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromEnv)) throw new Error("BLOG_AS_OF must be YYYY-MM-DD");
    return fromEnv;
  }
  return new Date().toISOString().slice(0, 10);
}

/** A post stays off the index, the feed, and the routes until a person approves it (publish: true and approved_by, as for every public variant), and while it is a draft or dated after the build day. */
export function isListed(post: Post, today = asOfDay()): boolean {
  return post.approved && !post.draft && post.date <= today;
}

function compare(a: Post, b: Post) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  return a.title < b.title ? -1 : a.title > b.title ? 1 : 0;
}

export function getPosts(): Post[] {
  const today = asOfDay();
  const files = readdirSync(postsDir).filter((file) => file.endsWith(".md") || file.endsWith(".mdx"));
  return files
    .map(readPost)
    .filter((post) => isListed(post, today))
    .sort(compare);
}

export function getPost(slug: string): Post | undefined {
  return getPosts().find((post) => post.slug === slug);
}

export function neighbors(slug: string): { newer: Post | null; older: Post | null } {
  const posts = getPosts();
  const index = posts.findIndex((post) => post.slug === slug);
  if (index < 0) return { newer: null, older: null };
  return { newer: posts[index - 1] ?? null, older: posts[index + 1] ?? null };
}

export function tagSlug(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

export function tagLabel(tag: string): string {
  const slug = tagSlug(tag);
  return slug.slice(0, 1).toUpperCase() + slug.slice(1);
}

export function allTags(): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const post of getPosts()) {
    for (const tag of post.tags) {
      const slug = tagSlug(tag);
      if (seen.has(slug)) continue;
      seen.add(slug);
      tags.push(slug);
    }
  }
  return tags;
}

export function postsByTag(tag: string): Post[] {
  return getPosts().filter((post) => post.tags.some((item) => tagSlug(item) === tag));
}

export function postImage(post: Post): string {
  return post.image ?? `/blog/${post.slug}/image`;
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
