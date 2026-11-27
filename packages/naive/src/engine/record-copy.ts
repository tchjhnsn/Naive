// The copy a record shows the public (publishing gate, EE-214): the strings a public page renders straight out of a
// record, gathered so the publish lint reads them exactly as it reads a page. A page's words are linted because they
// sit in an .mdx file; the same words held in a JSON record were never linted, so a leak, an uncited number or a
// private name reached a record field with nothing in its way.
//
// Two places hold copy:
//
//   a public field    the record's visibility sidecar approves the field as public (packages/naive/src/engine/visibility.ts), so a
//                     public component renders its wording as it is (publicValue, from: "field")
//   drafted copy      the marketing sitemap's pages[].sections[].draft_copy: the words a marketing agent drafts in
//                     the record it owns, before they become the section's MDX variant
//
// An internal field is not copy and is never read here: an internal record is meant to carry internal terms.

import { existsSync, readFileSync } from "node:fs";
import { ventureFile } from "../core/venture-paths.ts";
import { sidecar, visibilityOf } from "./visibility.ts";
import type { MarketingSitemap } from "../records/types/records.d.ts";

/** One run of copy in a record: the field it sits in, its words, the sources that back a number in them, and
 *  whether it is public already (an approved public field, or drafted copy whose status says published). */
export type Copy = { field: string; text: string; sources: string[]; published: boolean };

/** The marketing sitemap's logical path, under either the marketing package or the older operations/ one. */
const SITEMAP = /(^|\/)marketing\/sitemap\.json$/;

const strings = (x: unknown, at: string): Copy[] =>
  typeof x === "string" ? (x.trim() ? [{ field: at, text: x, sources: [], published: true }] : [])
    : Array.isArray(x) ? x.flatMap((v, i) => strings(v, `${at}[${i}]`))
      : x && typeof x === "object" ? Object.entries(x).flatMap(([k, v]) => strings(v, `${at}.${k}`)) : [];

/** The drafted copy of a marketing sitemap: each section's draft_copy, with the sources it cites. */
export function draftedCopy(record: unknown): Copy[] {
  const pages = (record as MarketingSitemap | null)?.pages;
  if (!Array.isArray(pages)) return [];
  return pages.flatMap((p, i) => (Array.isArray(p?.sections) ? p.sections : []).flatMap((s, j) => {
    const d = s?.draft_copy;
    if (!d || typeof d.text !== "string" || !d.text.trim()) return [];
    return [{ field: `pages[${i}].sections[${j}].draft_copy.text`, text: d.text, published: d.status === "published",
      sources: Array.isArray(d.sources) ? d.sources.filter((x): x is string => typeof x === "string") : [] }];
  }));
}

/**
 * The copy one record shows the public: its drafted copy when it is the marketing sitemap, plus every string under a
 * field a person approved as public. `rel` is the record's logical path (marketing/sitemap.json); the record is read
 * from the venture when it is not given.
 */
export function recordCopy(dir: string, rel: string, record?: unknown): Copy[] {
  const file = ventureFile(dir, rel);
  let rec = record;
  if (rec === undefined) {
    if (!existsSync(file)) return [];
    try { rec = JSON.parse(readFileSync(file, "utf8")); } catch { return []; }
  }
  const out: Copy[] = SITEMAP.test(rel) ? draftedCopy(rec) : [];
  for (const field of Object.keys(sidecar(dir, rel))) {
    if (visibilityOf(dir, rel, field).visibility !== "public") continue;
    const value = field.split(".").reduce<unknown>((x, k) => (x == null ? undefined : (x as Record<string, unknown>)[k]), rec);
    out.push(...strings(value, field));
  }
  return out;
}
