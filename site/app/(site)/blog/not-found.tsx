import Link from "next/link";

export default function BlogNotFound() {
  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight">Post not found</h1>
      <p className="mt-4">
        <Link className="underline underline-offset-2" href="/blog">
          Back to the blog
        </Link>
      </p>
    </main>
  );
}
