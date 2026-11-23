import Link from "next/link";
import { formatDate, postImage, tagLabel, tagSlug } from "@/lib/blog/posts";
import type { Post } from "@/lib/blog/types";

export function Authors({ names }: { names: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      {names.map((name) => (
        <span key={name} className="inline-flex items-center gap-2">
          <span className="naive-blog-avatar" aria-hidden="true">
            {name.slice(0, 1)}
          </span>
          <span>{name}</span>
        </span>
      ))}
    </span>
  );
}

export function PostCard({ post, featured = false }: { post: Post; featured?: boolean }) {
  return (
    <article className="naive-blog-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Link key={tag} className="naive-blog-tag" href={`/blog/tag/${tagSlug(tag)}`}>
              {tagLabel(tag)}
            </Link>
          ))}
        </span>
        <time className="naive-blog-muted text-sm" dateTime={post.date}>
          {formatDate(post.date)}
        </time>
      </div>
      <h2 className={featured ? "mt-3 text-3xl font-semibold tracking-tight" : "mt-3 text-xl font-semibold tracking-tight"}>
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      </h2>
      <p className="naive-blog-muted mt-2 text-sm leading-6">{post.summary}</p>
      {featured ? (
        <img
          className="naive-blog-hero"
          src={postImage(post)}
          alt=""
          width={1200}
          height={630}
        />
      ) : null}
      <p className="mt-4 text-sm">
        <Authors names={post.authors} />
      </p>
    </article>
  );
}
