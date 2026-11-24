export type Post = {
  slug: string;
  title: string;
  date: string;
  authors: string[];
  summary: string;
  tags: string[];
  draft: boolean;
  approved: boolean;
  image?: string;
  content: string;
};

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "link"; text: string; href: string };

export type Block =
  | { type: "heading"; level: 2 | 3 | 4; inlines: Inline[]; id: string }
  | { type: "paragraph"; inlines: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "code"; lang: string; code: string }
  | { type: "quote"; inlines: Inline[] };
