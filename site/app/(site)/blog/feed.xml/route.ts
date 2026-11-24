import { escapeXml, getPosts } from "@/lib/blog/posts";
import { siteUrl } from "@/lib/blog/site";

export const dynamic = "force-static";

export function GET() {
  const posts = getPosts();
  const items = posts
    .map((post) => {
      const url = `${siteUrl}/blog/${post.slug}`;
      const categories = post.tags.map((tag) => `<category>${escapeXml(tag)}</category>`).join("");
      const creators = post.authors.map((name) => `<dc:creator>${escapeXml(name)}</dc:creator>`).join("");
      return `<item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${new Date(`${post.date}T00:00:00.000Z`).toUTCString()}</pubDate>
      <description>${escapeXml(post.summary)}</description>
      ${categories}
      ${creators}
    </item>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Naive</title>
    <link>${escapeXml(`${siteUrl}/blog`)}</link>
    <description>Notes from the Naive repository: releases, the docs site, and the decision ledger.</description>
    <language>en</language>
    <lastBuildDate>${new Date(`${posts[0]?.date ?? "2026-10-29"}T00:00:00.000Z`).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(`${siteUrl}/blog/feed.xml`)}" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
