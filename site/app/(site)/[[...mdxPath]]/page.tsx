import { importPage } from "nextra/pages";
import { notFound } from "next/navigation";
import { contentPath, pageUrl, paramsFor } from "@/lib/mdx-params";

export const dynamicParams = false;

export function generateStaticParams() {
  return paramsFor("marketing");
}

type PageProps = { params: Promise<{ mdxPath?: string[] }> };

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function generateMetadata({ params }: PageProps) {
  const slug = (await params).mdxPath;
  const { metadata } = await importPage(contentPath("marketing", slug));
  const url = pageUrl("marketing", slug);
  const title = text(metadata.title);
  const description = text(metadata.description);
  if (!title) notFound();
  return {
    title: url === "/" ? { absolute: title } : title,
    description,
    openGraph: { images: [url === "/" ? "/og/home" : `/og/home${url}`] },
  };
}

export default async function Page({ params }: PageProps) {
  const slug = (await params).mdxPath;
  const { default: MDXContent, metadata } = await importPage(contentPath("marketing", slug));
  // The home page's hero carries its own h1.
  const home = pageUrl("marketing", slug) === "/";
  return (
    <article className={home ? "naive-home" : "site-article"} data-pagefind-body>
      {home ? null : <h1>{text(metadata.title)}</h1>}
      <MDXContent />
    </article>
  );
}
