import { PostIndex } from "@/components/blog/post-index";
import { getPosts } from "@/lib/blog/posts";

export const dynamic = "force-static";

export default function BlogPage() {
  return <PostIndex posts={getPosts()} />;
}
