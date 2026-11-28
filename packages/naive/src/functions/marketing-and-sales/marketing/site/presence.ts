#!/usr/bin/env node
// Site presence (EE-062, EE-063): how present a venture's public records are on its marketing site,
// weighed by who the site has to speak to now, with the evidence for every weight. The marketing
// matrix (matrix.json) names the audiences, what each needs to learn and why, and the record each
// piece of information comes from. What customers look for depends on who they are: Jev places the
// venture's ICP into customer types (consumers, small-business owners, enterprise buyers, developers,
// regulated professionals...), and each type says how much each item matters to it and why. The ICP
// comes from the venture's ICP record, from the founder's own sentence, or, failing both, is inferred
// from the home page and marked so. The venture's facts (raising, hiring, inviting contributors) weigh
// the other audiences. Each item's need sets how prominent it must be: on the home page, in the
// navigation, linked from the home page, or anywhere. The site is shown as its sitemap, each route
// rated on the items that belong there, with the pages the venture's priorities call for and the site
// lacks. Ours, version 0.x and unevaluated: the reasons are claims to test with real customers.
//
// Whether a page says something, and which customer types the ICP is, are judged by Jev when the
// platform hands over its answers; otherwise by the matrix's keywords, which is rougher.
//
//   node presence.ts request <site.json>   the Jev request
//   node presence.ts score <site.json> [--answers <jev.json>] [--venture <dir>] [--raising] [--hiring] [--contributors]
//   node presence.ts <venture> [--json]                                      the saved result

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ventureFile } from "../../../../core/venture-paths.ts";
import { icpProfiles } from "../../../../engine/foundation.ts";
import { writeRecord, programWriter } from "../../../../store/record-write.ts";
import type { SitePresence, Venture } from "../../../../records/types/records.d.ts";

/** A prominence level: where on the site an item sits. */
export type Level = "home" | "nav" | "linked" | "anywhere";
/** A customer type's reasons: for each item, how much it matters (0 to 1) and why. */
type CustomerType = { label: string; why: Record<string, [number, string]> };
/** The marketing matrix (matrix.json). */
export type Matrix = {
  version: string; note: string;
  audiences: Record<string, { label: string; weight: number | Record<string, number>; why: string }>;
  facts: Record<string, string>;
  prominence: Record<string, { at_least: number; means: string; rank: number }>;
  threshold: number;
  pages: Record<string, string>;
  items: Record<string, { label: string; question: string; record: string; audiences: Record<string, number>; belongs: string[]; keywords: string[]; why?: Record<string, string>; component: string }>;
  /** The words each page shows, as records (EE-216): the kind of each item's words, and the chrome no section covers. */
  copy: { note: string; chrome: { item: string; kind: string; label: string; from: string[]; why: string }[]; kinds: Record<string, string | undefined> };
  customer_types: { note: string; floor: number; default: CustomerType; types: Record<string, CustomerType & { about: string; match: string }> };
  page_labels: Record<string, string>;
  when: Record<string, string>;
};
/** One page the site reader read (packages/naive/src/interfaces/harness/site.ts). */
export type SitePage = { path: string; title?: string; label?: string; text?: string; depth: number; in_nav?: boolean; error?: unknown };
/** The site as the reader read it. */
export type Site = { site: string; via?: "firecrawl" | "fetch"; read_at?: string; pages: SitePage[]; links?: { path: string; label: string; in_nav: boolean }[] };
/** Jev's answers, by question id. */
export type JevAnswers = Record<string, { noul?: number } | undefined>;
/** The venture's facts that weigh the audiences other than customers: raising, hiring, contributors. */
export type Facts = Record<string, boolean>;
/** Who the site is for: the text Jev classifies, where it comes from, and the ICP the records state. */
export type Icp = { text: string; source?: SitePresence["icp"]["source"]; says?: string[]; cite?: string; stated?: string[] };
/** A customer type the ICP is, and how sure. */
type TypeOfIcp = { id: string; label: string; p: number };
/** One audience's claim on an item. */
type Evidence = { audience: string; weight: number; importance: number; need: number; why: string; source: "customer types" | "matrix" };
/** How much the site needs an item now. */
type Need = { need: number; required: string; for: string[]; evidence: Evidence[] };
/** What one customer type says about one item. */
type PerType = { type: string; p: number; importance: number; why: string };
/** A read page with its index, page type and level. */
type ReadPage = SitePage & { i: number; type: string; level: string };
/** One rated item of the score. */
type Item = { id: string; label: string; record: string; need: number; required: string; for: string[]; at: string | null; score: number; found: { path: string; type: string }[]; note: string; evidence: Evidence[] };
/** One route of the sitemap, or a page the site lacks (ghost). */
type Route = { path: string; parent: string | null; label: string; type: string; level: string; read: boolean; rating: number | null; expected: string[]; found: string[]; missing: string[]; ghost?: boolean };

const here = dirname(fileURLToPath(import.meta.url));
const load = (p: string | number): unknown => JSON.parse(readFileSync(p, "utf8"));
export const MATRIX = load(join(here, "matrix.json")) as Matrix;
export const PRESENCE = "operations/marketing/site-presence.json";
const LEVELS = Object.entries(MATRIX.prominence).sort(([, a], [, b]) => b.at_least - a.at_least);
const TYPES = MATRIX.customer_types;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** The venture's facts: flags the founder gave, else what its ICP record says about who it courts. */
export function factsOf(dir: string | null | undefined, flags: Record<string, unknown> = {}) {
  const f: Facts = { raising: false, hiring: false, contributors: false };
  const profiles = dir ? icpProfiles(dir) : [];
  if (profiles.length) {
    const said = JSON.stringify(profiles).toLowerCase();
    if (/investor|angel|\bvc\b/.test(said)) f.raising = true;
    if (/candidate|hire|recruit/.test(said)) f.hiring = true;
    if (/contributor|open source|volunteer/.test(said)) f.contributors = true;
  }
  for (const k of ["raising", "hiring", "contributors"]) if (flags[k] != null) f[k] = !!flags[k];
  return f;
}

/** Who the customers are, and where that comes from: the founder's words, the ICP record, or the home page. */
// Who the site is for, read from the site itself (2026-10-28): what it says outright ("for clinics",
// "built for teams", "trusted by") and, failing that, what its opening implies. The founder does not
// type it. The ICP the venture's records state is kept beside it, unscored, for a later clarity check
// (stated versus seen).
const SAYS = /\b(?:built for|made for|designed for|for (?:teams|companies|businesses|developers|founders|clinics|owners|people|creators|agencies|startups|enterprises|schools|families)|trusted by|helps?|serving|used by|loved by)\b[^.\n]{0,140}/gi;
export function icpOf(dir: string | null | undefined, site: Site | null | undefined): Icp {
  const ok = (site?.pages ?? []).filter((p) => !p.error);
  const home = ok.find((p) => p.depth === 0);
  const who = ok.filter((p) => /customer|solution|who|industr|use-case|about|for-/i.test(p.path));
  const says = [...new Set([home, ...who].filter((p): p is SitePage => Boolean(p)).flatMap((p) => (p.text ?? "").match(SAYS) ?? []).map((x) => x.trim()))].slice(0, 8);
  const opening = (home?.text ?? "").slice(0, 500);
  const stated = dir ? (icpProfiles(dir) as { who?: string; description?: string; name?: string }[]).map((p) => p.who ?? p.description ?? p.name).filter((x): x is string => Boolean(x)) : null;
  return { text: [says.join(" | "), opening].filter(Boolean).join(" || "), source: says.length ? "site" : "inferred", says,
    cite: says.length ? `what the site says about who it is for (${says.length} phrase${says.length > 1 ? "s" : ""}), with the home page's opening` : "the home page's opening text (inferred: the site does not say outright who it is for)",
    ...(stated?.length ? { stated } : {}) };
}

/** Which customer types the ICP is: Jev's answers when given, else the matrix's keywords. */
export function typesOf(icp: Icp, answers: JevAnswers | null | undefined): TypeOfIcp[] {
  const out = Object.entries(TYPES.types).map(([id, t]): TypeOfIcp => ({ id, label: t.label,
    p: answers ? r2(answers[`type:${id}`]?.noul ?? 0) : new RegExp(`\\b(?:${t.match})`, "i").test(icp.text) ? 1 : 0 }));
  // Jev answers "mainly" conservatively: a type counts at the floor or above and within 0.6 of the strongest.
  const top = Math.max(0, ...out.map((t) => t.p));
  return out.filter((t) => t.p >= TYPES.floor && t.p >= 0.6 * top).sort((a, b) => b.p - a.p);
}

/** How much each item matters to the venture's customers, and why: the strongest of its customer types. */
export function customerNeeds(types: TypeOfIcp[]): Record<string, { importance: number; per: PerType[] }> {
  const rows: TypeOfIcp[] = types.length ? types : [{ id: "default", label: TYPES.default.label, p: 1 }];
  return Object.fromEntries(Object.keys(TYPES.default.why).map((item) => {
    const per = rows.map((t): PerType => { const [imp, why] = (t.id !== "default" && TYPES.types[t.id].why[item]) || TYPES.default.why[item]; return { type: t.label, p: t.p, importance: imp, why }; });
    // A customer who is several types at once (a clinic owner is a small-business owner and a regulated
    // professional) needs what the most demanding of them needs.
    return [item, { importance: Math.max(...per.map((x) => x.importance)), per }];
  }));
}

// One reason per distinct claim: types that share the general reason are named together.
const whyOf = (per: PerType[]) => [...per.reduce((m, x) => m.set(x.why, [...(m.get(x.why) ?? []), `${x.type} (${x.importance})`]), new Map<string, string[]>())].map(([why, ts]) => `${ts.join(", ")}: ${why}`).join("; ");

/** Each audience's weight from the facts: the ICP priority matrix in its simplest form. */
export function weights(facts: Facts): Record<string, number> {
  return Object.fromEntries(Object.entries(MATRIX.audiences).map(([a, x]) => {
    const w = typeof x.weight === "number" ? x.weight : (Object.entries(x.weight).find(([k]) => k !== "default" && facts[k])?.[1] ?? x.weight.default);
    return [a, w];
  }));
}

/** How much the site needs each item now, how prominent it must be, and the evidence: who needs it and why. */
export function needs(w: Record<string, number>, cust: Record<string, { importance: number; per: PerType[] }> = customerNeeds([])): Record<string, Need> {
  return Object.fromEntries(Object.entries(MATRIX.items).map(([id, it]) => {
    const evidence = Object.entries(it.audiences).map(([a, imp]): Evidence => {
      const c = a === "customers" && cust[id];
      const importance = c ? c.importance : imp;
      return { audience: a, weight: w[a], importance, need: r2(w[a] * importance),
        why: c ? whyOf(c.per) : it.why?.[a] ?? MATRIX.audiences[a].why, source: c ? "customer types" : "matrix" };
    }).sort((x, y) => y.need - x.need);
    const need = evidence[0]?.need ?? 0;
    // An item whose place is its own page (pricing, careers) needs that page in the navigation at most.
    const level = LEVELS.find(([, l]) => need >= l.at_least);
    if (!level) throw new TypeError(`no prominence level holds need ${need}`);
    let required = level[0];
    if (required === "home" && !it.belongs.includes("home")) required = "nav";
    return [id, { need, required, for: evidence.filter((e) => e.need >= 0.3).map((e) => e.audience), evidence }];
  }));
}

export function pageType(p: { depth: number; path: string; title?: string; label?: string }): string {
  if (p.depth === 0 || p.path === "/") return "home";
  const s = `${p.path} ${p.title ?? ""} ${p.label ?? ""}`.toLowerCase();
  return Object.entries(MATRIX.pages).find(([k, re]) => k !== "home" && new RegExp(re, "i").test(s))?.[0] ?? "other";
}

const pageText = (p: SitePage) => `[${p.path}] ${p.title}\n${(p.text ?? "").slice(0, 3000)}`;

/** The Jev request: does each page tell a visitor each item, and which customer types the ICP is. */
export function request(site: Site, icp: Icp = icpOf(null, site)) {
  const pages = site.pages.filter((p) => !p.error);
  const questions: Record<string, { type: "noul"; instructions: string; criteria: { true: string; false: string } }> = {};
  pages.forEach((p, i) => { for (const [id, it] of Object.entries(MATRIX.items))
    questions[`has:${id}:p${i}`] = { type: "noul", instructions: `Does the web page in \`pages.p${i}\` tell a visitor ${it.question}? Judge what the page itself states, not what the venture might do.`,
      criteria: { true: "Yes: the page states it", false: "No: the page does not state it" } }; });
  for (const [id, t] of Object.entries(TYPES.types))
    questions[`type:${id}`] = { type: "noul", instructions: `Are the customers described in \`icp\` mainly ${t.label.toLowerCase()} (${t.about})?`, criteria: { true: `Yes: they are ${t.label.toLowerCase()}`, false: "No" } };
  return { state: { site: site.site, icp: icp.text, guidelines: "Each page is a venture's public marketing page. Answer from the page's own words only.", pages: Object.fromEntries(pages.map((p, i) => [`p${i}`, pageText(p)])) }, model: "jev-latest", questions };
}

// Without a judge: the matrix's keywords, matched in the page's text.
function byKeywords(p: SitePage, id: string, it: Matrix["items"][string]) {
  if (id === "what") return p.depth === 0 && (p.text ?? "").length > 80;
  const t = `${p.path} ${p.title} ${p.text ?? ""}`.toLowerCase();
  const hits = it.keywords.filter((k) => t.includes(k.toLowerCase())).length;
  return hits >= (it.keywords.length >= 5 ? 2 : 1);
}

const norm = (path: string) => path.replace(/\/$/, "") || "/";

/** The sitemap as a tree of routes, each rated on the items that belong there, with the missing pages. */
export function sitemap(site: Site, pages: ReadPage[], items: Item[]): Route[] {
  type Node = { path: string; label: string; in_nav: boolean; read: boolean; title?: string };
  const byPath = new Map<string, Node>();
  const add = (path: string, x: Partial<Node>) => {
    const k = norm(path);
    const known = byPath.get(k);
    if (!known) byPath.set(k, { path: k, label: "", in_nav: false, read: false, ...x });
    else Object.assign(known, Object.fromEntries(Object.entries(x).filter(([, v]) => v)));
  };
  add("/", { label: "Home", in_nav: true });
  for (const l of site.links ?? []) add(l.path, { label: l.label, in_nav: l.in_nav });
  for (const p of pages) add(p.path, { title: p.title, read: true, label: p.label || p.title });
  const need = Object.fromEntries(items.map((x) => [x.id, x.need]));
  const nodes = [...byPath.values()].map((n): Route => {
    const segs = n.path.split("/").filter(Boolean);
    let parent: string | null = n.path === "/" ? null : "/";
    for (let k = segs.length - 1; k >= 1; k--) { const up = "/" + segs.slice(0, k).join("/"); if (byPath.has(up)) { parent = up; break; } }
    const type = pageType({ depth: n.path === "/" ? 0 : 1, path: n.path, title: n.title, label: n.label });
    const level = n.path === "/" ? "home" : segs.length === 1 && n.in_nav ? "nav" : segs.length === 1 ? "linked" : "anywhere";
    const found = n.read ? items.filter((x) => x.found.some((f) => norm(f.path) === n.path)).map((x) => x.id) : [];
    // What belongs on this route: on the home page, what must be there; elsewhere, the items whose place is this page type.
    const expected = items.filter((x) => x.need >= 0.2 && (type === "home" ? x.required === "home" : MATRIX.items[x.id].belongs.includes(type))).map((x) => x.id);
    const total = expected.reduce((a, id) => a + need[id], 0);
    const rating = n.read && total ? Math.round((100 * expected.filter((id) => found.includes(id)).reduce((a, id) => a + need[id], 0)) / total) : null;
    // A short name: the page's title before its site name, a short link text, or the path's last segment.
    const seg = segs.at(-1)?.replace(/[-_]+/g, " ") ?? "Home";
    const titled = n.title?.split(/\s[–|·-]\s/)[0]?.trim();
    const name = n.path === "/" ? "Home" : titled && titled.length <= 32 ? titled : n.label && n.label.length <= 24 ? n.label : seg[0].toUpperCase() + seg.slice(1);
    return { path: n.path, parent, label: name, type, level, read: n.read, rating, expected, found, missing: n.read ? expected.filter((id) => !found.includes(id)) : [] };
  });
  // Pages the venture's priorities call for that the site lacks: an item needed one click away or
  // closer, missing everywhere, whose place is a page type the site has no route for.
  const types = new Set(nodes.map((n) => n.type));
  const ghosts = new Map<string, Route>();
  for (const x of items) {
    if (x.score > 0 || x.need < 0.4) continue;
    const t = MATRIX.items[x.id].belongs.find((b) => b !== "home");
    if (!t || types.has(t)) continue;
    const g: Route = ghosts.get(t) ?? { path: `/${t}`, parent: "/", label: `${t[0].toUpperCase()}${t.slice(1)} (suggested)`, type: t, level: x.required === "nav" ? "nav" : "linked", read: false, rating: 0, expected: [], found: [], missing: [], ghost: true };
    g.expected.push(x.id); g.missing.push(x.id); ghosts.set(t, g);
  }
  return [...nodes, ...ghosts.values()];
}

/** What score takes beside the site: Jev's answers, the venture's facts, its id and the ICP (icpOf's when omitted). */
export type ScoreOptions = { answers?: JevAnswers | null; facts?: Facts; venture?: string | null; icp?: Icp | null };
export function score(site: Site, { answers = null, facts = {}, venture = null, icp = null }: ScoreOptions = {}) {
  icp ??= icpOf(null, site);
  const types = typesOf(icp, answers);
  const w = weights(facts), need = needs(w, customerNeeds(types));
  const pages = site.pages.filter((p) => !p.error).map((p, i): ReadPage => ({ ...p, i, type: pageType(p), level: p.depth === 0 ? "home" : p.in_nav ? "nav" : p.depth === 1 ? "linked" : "anywhere" }));
  const rankOf = (l: string) => MATRIX.prominence[l]?.rank ?? 0;
  const siteTypes = new Set(pages.map((p) => p.type));
  const label = (a: string) => MATRIX.audiences[a].label.toLowerCase();
  const list = (xs: string[]) => xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0];
  const items = Object.entries(MATRIX.items).map(([id, it]): Item => {
    const n = need[id];
    const found = pages.filter((p) => answers ? (answers[`has:${id}:p${p.i}`]?.noul ?? 0) >= MATRIX.threshold : byKeywords(p, id, it));
    const at = found.map((p) => p.level).sort((a, b) => rankOf(b) - rankOf(a))[0] ?? null;
    const s = !at ? 0 : rankOf(at) >= rankOf(n.required) ? 1 : 0.5;
    const who = list(n.for.map(label));
    const req = MATRIX.prominence[n.required].means;
    const page = it.belongs.find((b) => b !== "home");
    const note = !at && !n.for.length ? `Not on the pages read, which is fine while ${list(Object.keys(it.audiences).map(label))} are not a priority.`
      : !at ? `Not on the pages read. ${who[0].toUpperCase() + who.slice(1)} need it ${req}${page && !siteTypes.has(page) ? `; there is no ${page} page` : ""}.`
      : s < 1 ? `Found on ${found.map((p) => p.path).slice(0, 2).join(", ")}, but ${who} need it ${req}.`
      : n.need < 0.4 && at === "home" ? `On the home page, though ${list(Object.keys(it.audiences).map(label))} are not a priority now.`
      : `Present ${MATRIX.prominence[at].means}.`;
    return { id, label: it.label, record: it.record, need: n.need, required: n.required, for: n.for, at, score: s, found: found.map((p) => ({ path: p.path, type: p.type })), note,
      evidence: n.evidence.filter((e, k) => k === 0 || e.need >= 0.1) };
  });
  const total = items.reduce((a, x) => a + x.need, 0);
  const audiences = Object.fromEntries(Object.keys(MATRIX.audiences).map((a) => {
    const xs = items.map((x): [Item, number] => [x, MATRIX.items[x.id].audiences[a] == null ? 0 : (need[x.id].evidence.find((e) => e.audience === a)?.importance ?? 0)]).filter(([, imp]) => imp);
    const t = xs.reduce((s, [, imp]) => s + imp, 0);
    return [a, { weight: w[a], score: t ? Math.round((100 * xs.reduce((s, [x, imp]) => s + imp * x.score, 0)) / t) : null }];
  }));
  const fix = items.filter((x) => x.score < 1 && x.need >= 0.4).sort((a, b) => b.need * (1 - b.score) - a.need * (1 - a.score)).slice(0, 3).map((x) => x.id);
  return { version: MATRIX.version, site: site.site, venture, read_via: site.via, read_at: site.read_at, judged_by: answers ? "jev" : "keywords", facts,
    icp: { ...icp, types: types.length ? types : [{ id: "default", label: TYPES.default.label, p: null }] },
    score: Math.round((100 * items.reduce((a, x) => a + x.need * x.score, 0)) / total), audiences,
    pages: pages.map((p) => ({ path: p.path, title: p.title, type: p.type, level: p.level })),
    sitemap: sitemap(site, pages, items),
    items: items.sort((a, b) => b.need * (1 - b.score) - a.need * (1 - a.score) || b.need - a.need),
    fix_first: fix };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [a, b] = process.argv.slice(2);
  const opt = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
  const has = (n: string) => process.argv.includes(`--${n}`);
  const siteOf = (p: string) => load(p === "-" ? 0 : p) as Site;
  if (a === "request") { const site = siteOf(b); console.log(JSON.stringify(request(site, icpOf(opt("venture"), site)))); }
  else if (a === "score") {
    const dir = opt("venture"), site = siteOf(b);
    const answersFile = opt("answers");
    const answers = answersFile ? ((load(answersFile) as { answers?: JevAnswers }).answers ?? load(answersFile)) as JevAnswers : null;
    const facts = factsOf(dir, Object.fromEntries(["raising", "hiring", "contributors"].filter(has).map((k) => [k, true])));
    const r = score(site, { answers, facts, icp: icpOf(dir, site), venture: dir ? (load(join(dir, "venture.json")) as Venture).id : null });
    if (dir) writeRecord(dir, PRESENCE, r, { agent: programWriter("naive-site-presence"), activity: existsSync(ventureFile(dir, PRESENCE)) ? "write" : "create", note: `scored the site presence of ${r.site} (${r.judged_by})` });
    console.log(JSON.stringify(r, null, 2));
  } else if (a && existsSync(join(a, "venture.json"))) {
    if (!existsSync(ventureFile(a, PRESENCE))) { console.error(`${PRESENCE} does not exist yet: read the site first (node packages/naive/src/interfaces/harness/site.ts <url> --venture <dir>)`); process.exit(1); }
    const r = load(ventureFile(a, PRESENCE)) as SitePresence;
    if (has("json")) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`${r.site}: site presence ${r.score}/100 (${r.judged_by}); customers: ${r.icp.types.map((t) => t.label).join(", ")} (ICP ${r.icp.source})`);
      for (const n of r.sitemap) console.log(`  ${n.ghost ? "+" : " "} ${n.path.padEnd(28)} ${n.type.padEnd(9)} ${n.rating == null ? (n.read ? "-" : "not read") : n.rating}${n.missing.length ? `  missing: ${n.missing.join(", ")}` : ""}`);
      for (const x of r.items) console.log(`${x.score === 1 ? "ok  " : x.score ? "low " : "miss"} ${x.label.padEnd(28)} ${x.note}`);
    }
  } else { console.error("usage: node presence.ts request <site.json> | score <site.json> [--answers f] [--venture d] [--raising] [--hiring] [--contributors] | <venture> [--json]"); process.exit(2); }
}
