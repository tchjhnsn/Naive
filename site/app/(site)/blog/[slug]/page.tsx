import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Authors } from "@/components/blog/post-card";
import { Markdown } from "@/components/blog/markdown";
import { Pager } from "@/components/blog/pager";
import { formatDate, getPost, getPosts, neighbors, postImage, tagLabel, tagSlug } from "@/lib/blog/posts";
import { siteUrl } from "@/lib/blog/site";
import Link from "next/link";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary,
    authors: post.authors.map((name) => ({ name })),
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      publishedTime: `${post.date}T00:00:00.000Z`,
      authors: post.authors,
      url: `${siteUrl}/blog/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.summary,
    },
  };
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const { newer, older } = neighbors(slug);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    datePublished: `${post.date}T00:00:00.000Z`,
    author: post.authors.map((name) => ({ "@type": "Person", name })),
    description: post.summary,
    image: new URL(postImage(post), siteUrl).toString(),
    mainEntityOfPage: `${siteUrl}/blog/${post.slug}`,
  };
  return (
    <article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <p className="flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <Link key={tag} className="naive-blog-tag" href={`/blog/tag/${tagSlug(tag)}`}>
            {tagLabel(tag)}
          </Link>
        ))}
      </p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance">{post.title}</h1>
      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <Authors names={post.authors} />
        <span className="naive-blog-muted" aria-hidden="true">
          ·
        </span>
        <time className="naive-blog-muted" dateTime={post.date}>
          {formatDate(post.date)}
        </time>
      </p>
      <img className="naive-blog-hero" src={postImage(post)} alt="" width={1200} height={630} />
      <div className="mt-8">
        <Markdown source={post.content} />
      </div>
      <Pager newer={newer} older={older} />
    </article>
  );
}
