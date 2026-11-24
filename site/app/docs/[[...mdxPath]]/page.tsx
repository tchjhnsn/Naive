import { importPage } from "nextra/pages";
import { notFound } from "next/navigation";
import { contentPath, pageUrl, paramsFor } from "@/lib/mdx-params";
import { useMDXComponents } from "@/mdx-components";

export const dynamicParams = false;

export function generateStaticParams() {
  return paramsFor("docs");
}

type PageProps = { params: Promise<{ mdxPath?: string[] }> };

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function generateMetadata({ params }: PageProps) {
  const slug = (await params).mdxPath;
  const { metadata } = await importPage(contentPath("docs", slug));
  const url = pageUrl("docs", slug);
  const title = text(metadata.title);
  const description = text(metadata.description);
  if (!title) notFound();
  return {
    title,
    description,
    alternates: { types: { "text/markdown": `${url}.md` } },
    openGraph: { images: [url === "/docs" ? "/og/docs" : `/og${url}`] },
  };
}

export default async function Page({ params }: PageProps) {
  const slug = (await params).mdxPath;
  const { default: MDXContent, toc, metadata, sourceCode } = await importPage(contentPath("docs", slug));
  const Wrapper = useMDXComponents().wrapper;
  if (!Wrapper) notFound();
  const url = pageUrl("docs", slug);
  const title = text(metadata.title);
  const description = text(metadata.description);
  const status = text((metadata as { status?: unknown }).status);
  return (
    <Wrapper toc={toc} metadata={metadata} sourceCode={sourceCode.replace(/\{\/\*[\s\S]*?\*\/\}\n?/g, "")}>
      <header className="docs-heading">
        {status ? <p className="docs-status">{status}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="docs-description">{description}</p> : null}
        <p className="docs-markdown">
          <a href={`${url}.md`}>View Markdown</a>
        </p>
      </header>
      <MDXContent />
    </Wrapper>
  );
}
