import { notFound } from "next/navigation";
import { Detail } from "@/components/templates/detail";
import { loadCatalog } from "@/lib/templates/catalog.mjs";
import type { DetailItem } from "@/components/templates/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return loadCatalog().items.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = loadCatalog().items.find((entry) => entry.slug === slug);
  if (!item) return { title: "Not found", robots: { index: false, follow: false } };
  return {
    title: item.title,
    description: item.description.slice(0, 160),
    robots: { index: false, follow: false },
  };
}

export default async function TemplateDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = loadCatalog().items.find((entry) => entry.slug === slug) as DetailItem | undefined;
  if (!item) notFound();
  return <Detail item={item} />;
}
