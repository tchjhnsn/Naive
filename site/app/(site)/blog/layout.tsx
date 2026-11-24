import "@/components/blog/blog.css";
import type { Metadata } from "next";
import { siteUrl } from "@/lib/blog/site";

export const metadata: Metadata = {
  title: {
    default: "Blog",
    template: "%s · Naive",
  },
  description: "Notes from the Naive repository: releases, the docs site, and the decision ledger.",
  robots: { index: false, follow: false },
  alternates: {
    types: { "application/rss+xml": "/blog/feed.xml" },
  },
  openGraph: {
    title: "Blog",
    description: "Notes from the Naive repository: releases, the docs site, and the decision ledger.",
    url: `${siteUrl}/blog`,
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="naive-blog">
      <p className="naive-blog-draft">Draft. Agent-written, needs Torian.</p>
      <div className="mx-auto w-full max-w-3xl px-6 py-12">{children}</div>
    </div>
  );
}
