import { notFound } from "next/navigation";
import { findPage, listPages, markdownFor } from "@/lib/pages";

export const dynamicParams = false;

export function generateStaticParams() {
  return listPages()
    .filter((page) => page.collection === "docs")
    .map((page) => ({ slug: page.url === "/docs" ? [] : page.url.slice("/docs/".length).split("/") }));
}

export function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  return params.then(({ slug }) => {
    const url = slug?.length ? `/docs/${slug.join("/")}` : "/docs";
    const page = findPage(url);
    if (!page) notFound();
    return new Response(markdownFor(page), {
      headers: { "Content-Type": "text/markdown; charset=utf-8", Vary: "Accept" },
    });
  });
}
