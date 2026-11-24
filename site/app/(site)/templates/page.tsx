import { Suspense } from "react";
import { Gallery } from "@/components/templates/gallery";
import { loadCatalog } from "@/lib/templates/catalog.mjs";
import type { CardItem } from "@/components/templates/types";

export default function TemplatesPage() {
  const cards: CardItem[] = loadCatalog().items.map((item) => ({
    slug: item.slug,
    kind: item.kind,
    kinds: item.kinds,
    category: item.category,
    title: item.title,
    description: item.description,
    framework: item.framework,
    useCases: item.useCases,
    source: item.source,
    commands: item.commands,
    prompts: item.prompts,
    badges: item.badges,
    docs: item.docs,
    diagram: item.diagram,
  }));

  return (
    <Suspense fallback={<p className="tpl-main">Loading the catalog.</p>}>
      <Gallery items={cards} />
    </Suspense>
  );
}
