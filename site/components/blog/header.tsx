import Link from "next/link";

export function BlogHeader() {
  return (
    <header className="naive-blog-header">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          Naive
        </Link>
        <nav aria-label="Blog" className="flex items-center gap-5 text-sm">
          <Link href="/blog">Blog</Link>
          <Link href="/waitlist">Waitlist</Link>
          <Link href="/blog/feed.xml">RSS</Link>
        </nav>
      </div>
    </header>
  );
}
