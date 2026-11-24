import Link from "next/link";
import type { Post } from "@/lib/blog/types";

function PagerLink({ post, label, next = false }: { post: Post; label: string; next?: boolean }) {
  return (
    <Link className={next ? "naive-blog-pager-next" : undefined} href={`/blog/${post.slug}`} rel={next ? "next" : "prev"}>
      <span className="naive-blog-muted text-xs font-semibold tracking-wide uppercase">{label}</span>
      <span className="font-medium">{post.title}</span>
    </Link>
  );
}

export function Pager({ newer, older }: { newer: Post | null; older: Post | null }) {
  if (!newer && !older) return null;
  return (
    <nav aria-label="More posts" className="naive-blog-pager">
      {older ? <PagerLink post={older} label="Previous" /> : <span className="hidden sm:block" />}
      {newer ? <PagerLink post={newer} label="Next" next /> : null}
    </nav>
  );
}
