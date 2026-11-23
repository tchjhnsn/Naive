import type { MetadataRoute } from "next";
import { isGatedPath } from "@/lib/waitlist-gate";
import { listPages } from "@/lib/pages";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return listPages()
    .filter((page) => !isGatedPath(page.url))
    .map((page) => ({
      url: new URL(page.url, siteUrl).toString(),
      lastModified: page.lastReviewed,
    }));
}
