// Suggests O*NET occupations for an element of APQC's framework (EE-232). It is pure: it reads nothing and writes
// nothing, and check-roles.ts --complete calls it for each element a business runs that no role is responsible or
// accountable for.
//
// The match is word overlap and nothing more. The element's text is its own name and the names of every element
// under it; an occupation's text is its title, counted twice, and the titles of the detailed work activities its task
// statements link to (packages/naive/src/functions/onet.json). Both are reduced to words (lower case, no stop words,
// a plain suffix cut), weighted by TF-IDF over the occupations, and ranked by cosine similarity. Occupations O*NET
// files as "All Other" are residual groups, so they are never suggested. A suggestion is a lead for a person who names
// a role, never a match: a role's onet field records an occupation only with who matched it and on what basis.

import type { Onet, Pcf } from "../records/types/records.d.ts";

/** One suggested occupation with its similarity, 0 to 1. */
export interface Suggestion { readonly code: string, readonly title: string, readonly score: number }
/** The occupations as weighted word vectors, built once per reference. */
export interface OccupationIndex { readonly occupations: readonly { code: string, title: string, vector: Map<string, number> }[], readonly idf: Map<string, number> }

const STOP = new Set(["and", "or", "of", "the", "a", "an", "to", "for", "with", "in", "on", "by", "from", "its", "their", "into", "as", "at", "be", "other", "all"]);
const SUFFIXES = ["ies", "ing", "es", "s", "ed"] as const;

/** The words of a text: lower case, three letters or more, no stop words, with one plain suffix cut. */
export function words(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().match(/[a-z]+/g) ?? []) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    let w = raw;
    for (const s of SUFFIXES) if (w.endsWith(s) && w.length - s.length >= 4) { w = w.slice(0, -s.length) + (s === "ies" ? "y" : ""); break; }
    out.push(w);
  }
  return out;
}

const counts = (ws: readonly string[]): Map<string, number> => { const m = new Map<string, number>(); for (const w of ws) m.set(w, (m.get(w) ?? 0) + 1); return m; };
/** A unit vector of log-scaled counts times idf; words the occupations never use are dropped. */
function weigh(c: Map<string, number>, idf: Map<string, number>): Map<string, number> {
  const v = new Map<string, number>();
  for (const [w, n] of c) { const i = idf.get(w); if (i !== undefined && i > 0) v.set(w, (1 + Math.log(n)) * i); }
  const norm = Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0)) || 1;
  for (const [w, x] of v) v.set(w, x / norm);
  return v;
}

/** The index of an O*NET reference: each occupation's title twice and its work activities' titles, as a vector. */
export function occupationIndex(onet: Onet): OccupationIndex {
  const dwa = new Map(onet.dwas.map((d) => [d.id, d.title]));
  const docs = onet.occupations.map((o) => ({ code: o.code, title: o.title, c: counts([...words(o.title), ...words(o.title), ...o.dwas.flatMap((id) => words(dwa.get(id) ?? ""))]) }));
  const df = new Map<string, number>();
  for (const d of docs) for (const w of d.c.keys()) df.set(w, (df.get(w) ?? 0) + 1);
  const idf = new Map([...df].map(([w, n]) => [w, Math.log(docs.length / n)]));
  return { idf, occupations: docs.map((d) => ({ code: d.code, title: d.title, vector: weigh(d.c, idf) })) };
}

/** The text an element stands for: its own name and the name of every element under it. */
export function elementTexts(pcf: Pcf, id: string): string[] {
  const own = pcf.elements.find((e) => e.id === id);
  if (!own) return [];
  const prefix = /^\d+\.0$/.test(id) ? `${id.split(".")[0]}.` : `${id}.`;
  return [own.name, ...pcf.elements.filter((e) => e.id.startsWith(prefix)).map((e) => e.name)];
}

/** The n occupations most like the texts, best first, ties by code; none when nothing overlaps. */
export function suggestOccupations(index: OccupationIndex, texts: readonly string[], n = 3): Suggestion[] {
  const q = weigh(counts(texts.flatMap(words)), index.idf);
  const scored: Suggestion[] = [];
  for (const o of index.occupations) {
    if (/\bAll Other\b/.test(o.title)) continue;
    let s = 0;
    for (const [w, x] of q) s += x * (o.vector.get(w) ?? 0);
    if (s > 0) scored.push({ code: o.code, title: o.title, score: Math.round(s * 1000) / 1000 });
  }
  return scored.sort((a, b) => b.score - a.score || (a.code < b.code ? -1 : 1)).slice(0, n);
}
