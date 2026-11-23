import Link from "next/link";
import { allTags, tagLabel } from "@/lib/blog/posts";
import type { Post } from "@/lib/blog/types";
import { PostCard } from "./post-card";

export function PostIndex({ posts, activeTag }: { posts: Post[]; activeTag?: string }) {
  const tags = allTags();
  return (
    <>
      <h1 className="text-4xl font-semibold tracking-tight">Blog</h1>
      <p className="naive-blog-muted mt-3 text-lg leading-7">
        Notes from the repository: releases, the docs site, and the decision ledger.{" "}
        <Link className="underline underline-offset-2" href="/blog/feed.xml">
          RSS
        </Link>
      </p>
      <nav aria-label="Tags" className="mt-6 flex flex-wrap gap-2">
        <Link className={activeTag ? "naive-blog-tag" : "naive-blog-tag-active"} href="/blog">
          All
        </Link>
        {tags.map((tag) => (
          <Link
            key={tag}
            className={tag === activeTag ? "naive-blog-tag-active" : "naive-blog-tag"}
            href={`/blog/tag/${tag}`}
          >
            {tagLabel(tag)}
          </Link>
        ))}
      </nav>
      <ul className="mt-8 flex list-none flex-col gap-5 p-0">
        {posts.map((post, index) => (
          <li key={post.slug}>
            <PostCard post={post} featured={!activeTag && index === 0} />
          </li>
        ))}
      </ul>
    </>
  );
}
