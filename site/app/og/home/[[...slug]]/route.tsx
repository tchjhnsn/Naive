import { findPage, listPages } from "@/lib/pages";
import { ogImage } from "@/lib/og";

export const dynamicParams = false;

export function generateStaticParams() {
  return listPages()
    .filter((page) => page.collection === "marketing")
    .map((page) => ({ slug: page.url === "/" ? [] : page.url.slice(1).split("/") }));
}

export function GET(_request: Request, { params }: { params: Promise<{ slug?: string[] }> }) {
  return params.then(({ slug }) => {
    const url = slug?.length ? `/${slug.join("/")}` : "/";
    const page = findPage(url);
    if (!page) return new Response("Not found", { status: 404 });
    return ogImage(page.title, page.description);
  });
}
