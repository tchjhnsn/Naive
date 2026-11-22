#!/usr/bin/env node
// The idea map (EE-059): a founder's raw idea dump, mapped onto Naive's conventions. The dump is not
// a prompt; it is every idea the founder has about the venture, kept verbatim in
// purpose/ideas/dump.md. Naive splits it into ideas, a tagger (Jev, or the founder's own agent) tags
// each with the departments it bears on, the records it feeds and whether it already exists
// (conventions.json), and the result is purpose/ideas/map.mdx: one <Idea> per idea, its text
// unchanged. The canvas (packages/naive/src/interfaces/demo/board.ts, /map) draws it as a mind map; the summary says
// where the founder's ideas cluster, what the venture's phase needs that the dump never mentions,
// and what the dump says about whether a product exists.
//
//   node ideamap.ts <venture> [--json]               summary of purpose/ideas/map.mdx
//   node ideamap.ts split <dump.md>                   the ideas Naive reads in a dump
//   node ideamap.ts request <venture>                 the Jev request for the venture's dump
//   node ideamap.ts answers <venture> <answers.json>  Jev's answers to tags (prints tags JSON)
//   node ideamap.ts write <venture> <tags.json> --tagger <name>   writes map.mdx
//
// The tagger never rewrites an idea and never adds one; tags outside conventions.json are dropped.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { answersFor, configFor, questionsFor, threshold } from "../../../../engine/naive-config.ts";
import type { DepartmentCatalog, Venture } from "../../../../records/types/records.d.ts";

/** Naive's tagging conventions (conventions.json): the departments, records and pillars an idea can be tagged with. */
export type Conventions = {
  version: string; note: string; threshold: number; exists: string;
  pillars: Record<string, string[]>;
  departments: Record<string, string>;
  records: Record<string, { title: string; route: string; about: string; decisions?: string[] }>;
  max: { departments: number; records: number };
  guidelines: Record<string, unknown>;
};
/** One idea as split from the dump. */
export type DumpIdea = { id: string; line: number; section?: string; text: string };
/** One idea read back from map.mdx: its text and the props it was written with. A stated idea record may add typed relations and a scope. */
export type MapIdea = {
  id: string; text: string; line?: number; section?: string; pillar?: string | null; departments?: string[]; records?: string[];
  exists?: boolean; tentative?: boolean; relations?: unknown; scope?: { scope: string; via: string };
};
/** Jev's answers, by question id. */
export type JevAnswers = Record<string, { noul?: number | boolean; score?: number }>;
/** One idea's tags as Jev's answers give them. */
export type Tag = { departments: string[]; records: string[]; exists: boolean; scores: Record<string, number>; tentative?: boolean };
/** One idea's tags limited to the conventions, with its pillar. */
type CleanTag = { departments: string[]; records: string[]; exists: boolean; pillar: string | null; tentative?: true };

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "../../../../../../..");
const load = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
export const CONVENTIONS = load(join(here, "conventions.json")) as Conventions;
const DEPARTMENTS = (load(join(repo, "packages/naive/src/functions/departments.json")) as DepartmentCatalog).departments;
export const DUMP = "purpose/ideas/dump.md", MAP = "purpose/ideas/map.mdx";
const pillarOf = Object.fromEntries(Object.entries(CONVENTIONS.pillars).flatMap(([p, ds]) => ds.map((d) => [d, p])));

/** The ideas in a raw dump:  each bullet or numbered line is one idea; any other line is its
 *  own idea too, unless it continues a hard-wrapped line, and a long one splits into sentences. Headings name the section that follows. */
export function split(text: string): DumpIdea[] {
  const ideas: DumpIdea[] = [];
  let section: string | null = null, para: { text: string, line: number, last: string } | null = null;
  const push = (t: string, line: number) => {
    const clean = t.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const parts = clean.length > 200 ? (clean.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g) as RegExpMatchArray).reduce((acc: string[], s) => {
      if (acc.length && (acc.at(-1) + s).length < 160) acc[acc.length - 1] += s; else acc.push(s);
      return acc;
    }, []) : [clean];
    for (const p of parts.map((x) => x.trim()).filter(Boolean)) ideas.push({ id: `i-${String(ideas.length + 1).padStart(2, "0")}`, line, ...(section ? { section } : {}), text: p });
  };
  const flush = () => { if (para) push(para.text, para.line); para = null; };
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line) return flush();
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) { flush(); section = h[1].trim(); return; }
    const b = line.match(/^(?:[-*+•]|\d+[.)])\s+(.*)$/);
    if (b) { flush(); push(b[1], i + 1); return; }
    // A line is its own idea unless it continues a hard-wrapped one: the line before ran long with no
    // closing punctuation and this one starts in lower case.
    if (para && para.last.length > 60 && !/[.!?:;)"']$/.test(para.last) && /^[a-z]/.test(line)) { para.text += ` ${line}`; para.last = line; return; }
    flush(); para = { text: line, line: i + 1, last: line };
  });
  flush();
  return ideas;
}

/** One typed request for Jev: for each idea, a yes-no-unknown judgment per department, per record,
 *  and whether it already exists. Jev answers each with a probability. */
export function request(ideas: DumpIdea[], venture: Partial<Venture> = {}) {
  const questions: Record<string, { type: "noul", instructions: string, criteria: { true: string, false: string } }> = {};
  const ask = (key: string, id: string, about: string) => { questions[`${key}:${id}`] = { type: "noul", instructions: `Is the idea in \`ideas.${id}\` mainly about ${about}?`, criteria: { true: "Yes: this is one of the one or two things the idea is mainly about", false: "No: it is about this only in passing, or not at all" } }; };
  for (const i of ideas) {
    for (const [d, about] of Object.entries(CONVENTIONS.departments)) ask(`dept.${d}`, i.id, about);
    for (const [r, { about }] of Object.entries(CONVENTIONS.records)) ask(`rec.${r}`, i.id, about);
    questions[`exists:${i.id}`] = { type: "noul", instructions: `Does the idea in \`ideas.${i.id}\` say that ${CONVENTIONS.exists}?`, criteria: { true: "Yes: it says this exists now", false: "No: it is planned, wished for or unclear" } };
  }
  return { state: { venture: { id: venture.id, phase: venture.phase }, guidelines: { dump: CONVENTIONS.guidelines.dump, tags: CONVENTIONS.guidelines.tags }, ideas: Object.fromEntries(ideas.map((i) => [i.id, i.section ? `[${i.section}] ${i.text}` : i.text])) }, model: "jev-latest", questions };
}

/** Jev's answers as tags: every judgment at or above the threshold, with the weakest one kept as confidence. */
export function fromAnswers(answers: JevAnswers, threshold: number = CONVENTIONS.threshold): Record<string, Tag> {
  const tags: Record<string, Tag> = {};
  for (const [key, a] of Object.entries(answers)) {
    const [q, id] = key.split(":");
    const p = typeof a.noul === "number" ? a.noul : a.noul === true ? 1 : 0;
    const t = (tags[id] ??= { departments: [], records: [], exists: false, scores: {} });
    t.scores[q] = Math.round(p * 100) / 100;
    if (p < threshold) continue;
    if (q.startsWith("dept.")) t.departments.push(q.slice(5));
    else if (q.startsWith("rec.")) t.records.push(q.slice(4));
    else if (q === "exists") t.exists = true;
  }
  for (const t of Object.values(tags)) {
    const strongest = (prefix: string) => Object.entries(t.scores).filter(([k]) => k.startsWith(prefix)).sort((a, b) => b[1] - a[1]);
    // An idea always sits somewhere on the map: below the threshold it takes its likeliest department.
    if (!t.departments.length) { const [k] = strongest("dept.")[0] ?? []; if (k) { t.departments.push(k.slice(5)); t.tentative = true; } }
    t.departments = t.departments.sort((a, b) => t.scores[`dept.${b}`] - t.scores[`dept.${a}`]).slice(0, CONVENTIONS.max.departments);
    t.records = t.records.sort((a, b) => t.scores[`rec.${b}`] - t.scores[`rec.${a}`]).slice(0, CONVENTIONS.max.records);
  }
  return tags;
}

/** Tags limited to the conventions, with each idea's pillar from its first department. */
export function clean(tags: Record<string, Partial<Tag>> | null | undefined): Record<string, CleanTag> {
  const out: Record<string, CleanTag> = {};
  for (const [id, t] of Object.entries(tags ?? {})) {
    const departments = (t.departments ?? []).filter((d) => d in CONVENTIONS.departments);
    const records = (t.records ?? []).filter((r) => r in CONVENTIONS.records);
    out[id] = { departments, records, exists: t.exists === true, pillar: pillarOf[departments[0]] ?? null, ...(t.tentative ? { tentative: true } : {}) };
  }
  return out;
}

const attr = (v: unknown) => typeof v === "string" ? JSON.stringify(v) : `{${JSON.stringify(v)}}`;
const esc = (s: string) => s.replace(/[{}<>]/g, (c) => ({ "{": "&#123;", "}": "&#125;", "<": "&lt;", ">": "&gt;" } as Record<string, string>)[c]);
const unesc = (s: string) => s.replace(/&#123;|&#125;|&lt;|&gt;/g, (c) => ({ "&#123;": "{", "&#125;": "}", "&lt;": "<", "&gt;": ">" } as Record<string, string>)[c]);

/** map.mdx: frontmatter, then one <Idea> per idea, text verbatim, tags as props. */
export function render(ideas: DumpIdea[], tags: Record<string, Partial<Tag>> | null | undefined, { venture, tagger, created = new Date().toISOString().replace(/\.\d+Z$/, "Z") }: { venture: string, tagger: string, created?: string }) {
  const t = clean(tags);
  const head = ["---", "type: idea-map", `venture: ${venture}`, `created: ${created}`, `source: ${DUMP}`, `tagged_by: ${tagger}`, `conventions: packages/naive/src/functions/strategy/frameworks/idea-map/conventions.json@${CONVENTIONS.version}`, "---", "",
    `{/* Generated by Naive from ${DUMP}. Each idea is the founder's text, unchanged; the props are tags from Naive's conventions. */}`, ""];
  const body = ideas.map((i) => {
    const x: CleanTag = t[i.id] ?? { departments: [], records: [], exists: false, pillar: null };
    const props = { id: i.id, line: i.line, ...(i.section ? { section: i.section } : {}), pillar: x.pillar ?? "unmapped", departments: x.departments, records: x.records, exists: x.exists, ...(x.tentative ? { tentative: true } : {}) };
    return `<Idea ${Object.entries(props).map(([k, v]) => `${k}=${attr(v)}`).join(" ")}>\n${esc(i.text)}\n</Idea>\n`;
  });
  return head.join("\n") + body.join("\n");
}

/** The ideas and their tags back out of map.mdx. */
export function parse(mdx: string): { meta: Record<string, string>, ideas: MapIdea[] } {
  const meta = Object.fromEntries((mdx.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "").split("\n").map((l) => l.split(/:\s(.*)/s).slice(0, 2)).filter((x) => x.length === 2));
  const ideas = [...mdx.matchAll(/<Idea ([^>]*)>\n([\s\S]*?)\n<\/Idea>/g)].map(([, props, text]) => {
    const o: Record<string, unknown> = { text: unesc(text) };
    for (const [, k, s, j] of props.matchAll(/(\w+)=(?:("(?:[^"\\]|\\.)*")|\{([^}]*)\})/g)) o[k] = JSON.parse(s ?? j);
    return o as MapIdea;
  });
  return { meta, ideas };
}

/** Where the ideas cluster, what the phase needs that the dump never mentions, and what it says about products. */
export function summary(map: { ideas: MapIdea[] }, phase = "discovery") {
  const { ideas } = map;
  const count = (f: string[]): Record<string, number> => Object.fromEntries(f.map((k) => [k, 0]));
  const byPillar = count(Object.keys(CONVENTIONS.pillars)), byDept = count(Object.keys(CONVENTIONS.departments)), byRecord = count(Object.keys(CONVENTIONS.records));
  for (const i of ideas) {
    if (i.pillar != null && i.pillar in byPillar) byPillar[i.pillar]++;
    for (const d of i.departments ?? []) byDept[d]++;
    for (const r of i.records ?? []) byRecord[r]++;
  }
  const n = ideas.length || 1;
  const strengths = Object.entries(byDept).filter(([, c]) => c).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d, c]) => ({ department: d, ideas: c, share: Math.round((c / n) * 100) / 100 }));
  const prior = (d: string) => { const x = DEPARTMENTS.find((y) => y.id === d); return x?.base?.[phase] ?? 0; };
  const gaps = Object.entries(byDept).filter(([d, c]) => !c && prior(d) >= 0.4).map(([d]) => ({ department: d, need_now: prior(d), why: DEPARTMENTS.find((y) => y.id === d)?.why ?? null }));
  const founderRecords = ["validation-problem", "icp", "product", "venture-core"];
  const unasked = founderRecords.filter((r) => !byRecord[r]).map((r) => ({ record: r, about: CONVENTIONS.records[r].about }));
  const products = ideas.filter((i) => (i.records ?? []).includes("product"));
  const existing = ideas.filter((i) => i.exists);
  return { ideas: ideas.length, by_pillar: byPillar, by_department: byDept, by_record: byRecord, strengths, gaps, unasked,
    product: { ideas: products.map((i) => i.id), exists: existing.map((i) => ({ id: i.id, text: i.text })), reading: existing.length ? "the dump says something already exists; confirm it in product-exists" : products.length ? "product ideas, none described as existing yet" : "no product ideas in the dump" } };
}

const ventureOf = (dir: string) => load(join(dir, "venture.json")) as Venture;

if (import.meta.url === `file://${process.argv[1]}`) {
  const [a, b, c] = process.argv.slice(2);
  const opt = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
  const json = (x: unknown) => console.log(JSON.stringify(x, null, 2));
  if (a === "split") json(split(readFileSync(b, "utf8")));
  // Gate group hook (P-2): the venture's naive.config.json says which System 1 questions run and the tag threshold.
  else if (a === "request") json(questionsFor(request(split(readFileSync(join(b, DUMP), "utf8")), ventureOf(b)), configFor(b), "idea-map"));
  else if (a === "answers") { const cfg = configFor(b); json(fromAnswers(answersFor((load(c) as { answers?: JevAnswers }).answers ?? load(c), cfg, "idea-map"), threshold(cfg, "idea-map", CONVENTIONS.threshold))); }
  else if (a === "write") {
    const ideas = split(readFileSync(join(b, DUMP), "utf8"));
    mkdirSync(join(b, dirname(MAP)), { recursive: true });
    writeFileSync(join(b, MAP), render(ideas, load(c) as Record<string, Partial<Tag>>, { venture: ventureOf(b).id, tagger: opt("tagger") ?? "unknown" }));
    console.log(`wrote ${MAP}: ${ideas.length} ideas`);
  } else if (a && existsSync(join(a, "venture.json"))) {
    if (!existsSync(join(a, MAP))) { console.error(`${MAP} does not exist yet: the founder submits an idea dump first (node packages/naive/src/interfaces/harness/run.ts discovery --dump <file>)`); process.exit(1); }
    const s = summary(parse(readFileSync(join(a, MAP), "utf8")), ventureOf(a).phase);
    if (process.argv.includes("--json")) json({ ...s, ideas_list: parse(readFileSync(join(a, MAP), "utf8")).ideas });
    else console.log(`${s.ideas} ideas. Pillars: ${Object.entries(s.by_pillar).map(([k, v]) => `${k} ${v}`).join(", ")}.\nStrengths: ${s.strengths.map((x) => `${x.department} (${x.ideas})`).join(", ")}.\nGaps for this phase: ${s.gaps.map((x) => x.department).join(", ") || "none"}.\nNever mentioned: ${s.unasked.map((x) => x.record).join(", ") || "none"}.\nProduct: ${s.product.reading}.`);
  } else { console.error("usage: node ideamap.ts <venture> [--json] | split <dump.md> | request <venture> | answers <venture> <answers.json> | write <venture> <tags.json> --tagger <name>"); process.exit(2); }
}
