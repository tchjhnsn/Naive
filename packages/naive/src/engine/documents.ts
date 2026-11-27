// The document catalog (EE-218): which documents a venture makes, in which format, from which records, and in what
// order. A record is the source of truth; a document is an artifact rendered from records and never the record.
//
//   catalog()                       the catalog, packages/naive/src/functions/documents.json
//   kind(c, "one-pager")            one document kind, or null
//   climbTo(c, "live")              the rungs from the first rung up to that one, in order
//   rungBelow(c, "interactive")     the rung a rung comes after, or null for the first
//   prerequisites(c, "site-copy", "live")   what that rung needs before it is built, in the shape EE-217 reads
//   renderMarkdown(c, kind, read)   the reading copy, with every section citing the record it came from
//
// Everything here but catalog() is pure: it takes the catalog and, for the render, a function that reads a record.
// The I/O is packages/naive/src/engine/render-document.ts, the naive render command.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { DocumentCatalog } from "../records/types/records.d.ts";

const root = new URL("../../../..", import.meta.url).pathname;
export const CATALOG = "packages/naive/src/functions/documents.json";

export type Kind = DocumentCatalog["kinds"][number];
export type Rung = DocumentCatalog["ladder"]["rungs"][number];
export type Format = DocumentCatalog["formats"][number];
export type Section = Kind["sections"][number];
/** What a rung needs before it is built, in the shape packages/naive/src/engine/prerequisites.ts reads (EE-217). */
export type Requires = { records: string[]; meetings: string[]; decisions: string[] };

/** The catalog Naive ships. */
export const catalog = (at: string = root): DocumentCatalog => JSON.parse(readFileSync(join(at, CATALOG), "utf8"));

export const kind = (c: DocumentCatalog, id: string): Kind | null => c.kinds.find((k) => k.id === id) ?? null;
export const rung = (c: DocumentCatalog, id: string): Rung | null => c.ladder.rungs.find((r) => r.id === id) ?? null;
export const format = (c: DocumentCatalog, id: string): Format | null => c.formats.find((f) => f.id === id) ?? null;
/** The one rung with no rung below it, or null when the ladder has none or several. */
export const firstRung = (c: DocumentCatalog): Rung | null => {
  const roots = c.ladder.rungs.filter((r) => r.after === null);
  return roots.length === 1 ? roots[0] : null;
};
export const rungBelow = (c: DocumentCatalog, id: string): Rung | null => {
  const r = rung(c, id);
  return r?.after ? rung(c, r.after) : null;
};

/**
 * The rungs a document climbs to reach `to`, first rung first, `to` last. Empty when `to` is not a rung or the chain
 * does not reach a first rung, which check-documents reports as a broken ladder.
 */
export function climbTo(c: DocumentCatalog, to: string): Rung[] {
  const chain: Rung[] = [];
  const seen = new Set<string>();
  let at = rung(c, to);
  while (at) {
    if (seen.has(at.id)) return [];
    seen.add(at.id);
    chain.unshift(at);
    if (at.after === null) return chain;
    at = rung(c, at.after);
  }
  return [];
}

/**
 * What a rung of one document kind needs before it is built: the rung below it as a live artifact a person approved
 * (the ladder's own requirement, fail closed), plus whatever that rung's `requires` adds. The artifact path is the one
 * render-document.ts writes, artifacts/<kind>-<rung>.json.
 */
export function prerequisites(c: DocumentCatalog, kindId: string, rungId: string): Requires {
  const r = rung(c, rungId);
  const below = rungBelow(c, rungId);
  const extra = r?.requires ?? {};
  return {
    records: [...(below ? [artifactPath(kindId, below.id)] : []), ...(extra.records ?? [])],
    meetings: [...(extra.meetings ?? [])],
    decisions: [...(extra.decisions ?? [])],
  };
}

/** Where the artifact record of one kind at one rung lives, as a logical path. */
export const artifactPath = (kindId: string, rungId: string): string => `artifacts/${kindId}-${rungId}.json`;
/** Where the reading copy itself lives, beside its artifact record. */
export const outputPath = (kindId: string, rungId: string, ext: string): string => `artifacts/${kindId}-${rungId}.${ext}`;

/** A record as the render reads it: its logical path and its parsed body, or null when the record is missing. */
export type Read = (_path: string) => { path: string; body: unknown }[];

const field = (body: unknown, path: string): unknown =>
  path.split(".").reduce<unknown>((at, key) => (at !== null && typeof at === "object" && !Array.isArray(at) ? (at as Record<string, unknown>)[key] : undefined), body);

/**
 * One section's lines: the value when it is a string or a list of strings, else what is missing, and the citation.
 * A hole is shown, never filled in. An optional section leaves the hole out, and goes out itself when every record
 * it reads is a hole.
 */
function block(s: Section, found: { path: string; body: unknown }[]): string[] {
  const body: string[] = [];
  if (!found.length) {
    if (s.optional) return [];
    body.push(`_Not recorded: no ${s.from} in this venture. Write the record before this document._`, "");
  }
  for (const { path, body: record } of found) {
    if (!s.field) {
      body.push(`_The writer fills this from \`${path}\`, which the catalog names as its source._`, "");
      continue;
    }
    const value = field(record, s.field);
    if (typeof value === "string" && value.trim()) body.push(value.trim(), "");
    else if (Array.isArray(value) && value.every((v) => typeof v === "string") && value.length) body.push(...value.map((v) => `- ${v}`), "");
    else { if (!s.optional) body.push(`_Not recorded: \`${path}\` has no \`${s.field}\` to quote._`, ""); continue; }
    body.push(`Source: \`${path}\` (\`${s.field}\`)`, "");
  }
  return body.length ? [`## ${s.title}`, "", ...body] : [];
}

/**
 * The reading copy of one document kind, as Markdown. Every section cites the record it came from, a record that is
 * missing is shown as missing and never filled in, and the header says the document is rendered from records and is
 * not itself a record. `read` returns every record matching a section's `from` (one for a plain path, any number for
 * a path with *).
 */
export function renderMarkdown(c: DocumentCatalog, kindId: string, read: Read, { at }: { at: string }): string {
  const k = kind(c, kindId);
  if (!k) throw new Error(`no document kind ${kindId} in ${CATALOG}: ${c.kinds.map((x) => x.id).join(", ")}`);
  const lines = [
    `# ${k.title}`,
    "",
    `${k.purpose}.`,
    "",
    `Audience: ${k.audience.join(", ")}. Rendered ${at} from the records cited below, by \`naive render ${k.id}\`.`,
    "",
    "> This is a view of the records, not a record. Change a fact in its record and render again; never edit a fact here.",
    "",
  ];
  for (const s of k.sections) lines.push(...block(s, read(s.from)));
  const highest = k.highest_rung;
  lines.push("---", "", `Next rung: ${highest === "reading-copy" ? "none, this kind stops at the reading copy" : `${highest}, once a person has approved this copy`}.`, "");
  return lines.join("\n");
}
