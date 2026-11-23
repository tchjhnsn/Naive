import { OgCard, ogResponse } from "@/components/blog/og-card";
import { formatDate, getPost, getPosts, tagLabel } from "@/lib/blog/posts";

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return getPosts().map((post) => ({ slug: post.slug }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return new Response("Not found", { status: 404 });
  return ogResponse(
    OgCard({
      kicker: tagLabel(post.tags[0] ?? "Blog"),
      title: post.title,
      footer: `${formatDate(post.date)}  ·  ${post.authors.join(", ")}`,
    }),
  );
}
