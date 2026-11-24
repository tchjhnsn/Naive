export type CatalogCommand = {
  label: string;
  text: string;
  source: string;
  note?: string;
};

export type CatalogPrompt = {
  label: string;
  text: string;
  source: string;
};

export type CatalogUseCase = {
  id: string;
  label: string;
  group: string;
};

export type CatalogLink = {
  href: string;
  title: string;
};

export type CardItem = {
  slug: string;
  kind: string;
  kinds: string[];
  category: string;
  title: string;
  description: string;
  framework: string | null;
  useCases: CatalogUseCase[];
  source: string;
  commands: CatalogCommand[];
  prompts: CatalogPrompt[];
  badges: string[];
  docs: CatalogLink[];
  diagram: string[];
};

export type DetailItem = CardItem & {
  sources: { path: string; note: string }[];
  facts: { label: string; value: string }[];
  sections: { heading: string; text: string }[];
  body: string | null;
  related: { slug: string; label: string }[];
};
