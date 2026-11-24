import { OgCard, ogContentType, ogResponse, ogSize } from "@/components/blog/og-card";
import { formatDate, getPost, tagLabel } from "@/lib/blog/posts";

export const alt = "Naive blog post";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPost(slug);
  const title = post?.title ?? "Naive";
  const kicker = post?.tags[0] ? tagLabel(post.tags[0]) : "Blog";
  const footer = post ? `${formatDate(post.date)}  ·  ${post.authors.join(", ")}` : "Blog";
  return ogResponse(OgCard({ kicker, title, footer }));
}
