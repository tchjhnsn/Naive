import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { PostIndex } from "@/components/blog/post-index";
import { allTags, postsByTag, tagLabel } from "@/lib/blog/posts";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return allTags().map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }): Promise<Metadata> {
  const { tag } = await params;
  const label = tagLabel(tag);
  return {
    title: label,
    description: `Naive blog posts tagged ${label}.`,
  };
}

export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const posts = postsByTag(tag);
  if (posts.length === 0) notFound();
  return <PostIndex posts={posts} activeTag={tag} />;
}
