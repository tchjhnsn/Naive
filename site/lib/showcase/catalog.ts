import { showcaseData as raw } from "../../content/showcase/entries";

export type PieceKind = "package" | "docket" | "frame" | "anatomy";

export type Piece = {
  kind: PieceKind;
  id: string;
  name: string;
  detail: string;
  source: string;
};

export type ShowcaseLink = {
  label: string;
  href: string;
};

export type Citation = {
  path: string;
  note: string;
};

export type ShowcaseEntry = {
  id: string;
  name: string;
  example: boolean;
  featured: boolean;
  phase: string;
  type: string | null;
  industry: string | null;
  parent: string | null;
  description: string;
  source: string;
  directory: string | null;
  frames: string;
  links: ShowcaseLink[];
  citations: Citation[];
  pieces: Piece[];
};

export type Filter =
  | { kind: "all" }
  | { kind: "examples" }
  | { kind: "recorded" }
  | { kind: "phase"; phase: string }
  | { kind: "piece"; id: string };

const PIECE_ORDER = [
  "foundation",
  "product",
  "validation",
  "people",
  "money",
  "fund",
  "deals",
  "legal",
  "operations",
  "relationships",
  "product-anatomy",
  "docket",
];

const PHASE_ORDER = ["discovery", "validation", "beachhead", "scale", "platform"];

export const PHASE_LABEL: Record<string, string> = {
  discovery: "Discovery",
  validation: "Validation",
  beachhead: "Beachhead",
  scale: "Scale",
  platform: "Platform",
};

const PIECE_KINDS: readonly PieceKind[] = ["package", "docket", "frame", "anatomy"];

function isPieceKind(value: string): value is PieceKind {
  return PIECE_KINDS.some((kind) => kind === value);
}

function loadEntries(): ShowcaseEntry[] {
  return raw.entries.map((entry) => ({
    ...entry,
    pieces: entry.pieces.map((piece) => {
      if (!isPieceKind(piece.kind)) throw new Error(`showcase piece ${entry.id}/${piece.id} has kind ${piece.kind}`);
      return { ...piece, kind: piece.kind };
    }),
  }));
}

export const showcaseMeta = {
  note: raw.note,
  readOn: raw.readOn,
};

export const showcaseEntries: ShowcaseEntry[] = loadEntries();

export function repoUrl(path: string): string {
  const leaf = path.split("/").pop() ?? path;
  const mode = leaf.includes(".") ? "blob" : "tree";
  // Every showcase source is a Naive file (its example ventures, frames and frameworks), so it links to Naive's repository.
  return `https://github.com/tchjhnsn/naive/${mode}/main/${path}`;
}

export function imageSrc(entry: ShowcaseEntry): string {
  return `/showcase/${entry.id}.svg`;
}

export function imageAlt(entry: ShowcaseEntry): string {
  return `Record board for ${entry.name}. Source: ${entry.source}.`;
}

export function parentName(entry: ShowcaseEntry): string | null {
  if (!entry.parent) return null;
  return showcaseEntries.find((item) => item.id === entry.parent)?.name ?? entry.parent;
}

export function filterEntries(entries: ShowcaseEntry[], filter: Filter): ShowcaseEntry[] {
  if (filter.kind === "all") return entries;
  if (filter.kind === "examples") return entries.filter((entry) => entry.example);
  if (filter.kind === "recorded") return entries.filter((entry) => !entry.example);
  if (filter.kind === "phase") return entries.filter((entry) => entry.phase === filter.phase);
  return entries.filter((entry) => entry.pieces.some((piece) => piece.id === filter.id));
}

export function phaseFilters(entries: ShowcaseEntry[]): string[] {
  const present = new Set(entries.map((entry) => entry.phase));
  return PHASE_ORDER.filter((phase) => present.has(phase));
}

export function pieceFilters(entries: ShowcaseEntry[]): { id: string; name: string }[] {
  const names = new Map<string, string>();
  for (const entry of entries) {
    for (const piece of entry.pieces) {
      if (!names.has(piece.id)) names.set(piece.id, piece.name);
    }
  }
  return PIECE_ORDER.filter((id) => names.has(id)).map((id) => ({ id, name: names.get(id) ?? id }));
}

const ISSUES = "https://github.com/tchjhnsn/everything-ecosystem/issues";
const FRAME = "packages/naive/library/packages/finance/frames/fund-without-ceding-control.frame.json";

export const showcaseLinks = {
  issues: ISSUES,
  frameFile: FRAME,
  frameHref: repoUrl(FRAME),
  packagesDocs: "/docs/concepts/layers-and-kits",
  docketDocs: "/docs/get-started/decisions",
  frameDocs: "/docs/get-started/decision-library",
};
