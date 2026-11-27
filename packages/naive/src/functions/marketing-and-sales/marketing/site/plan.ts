#!/usr/bin/env node
// The sitemap planner (EE-064): site presence in reverse. Site presence reads a site and rates it;
// the planner reads the venture's records and plans the site: which information is shown where,
// how (the MDX component), when (while raising, hiring...) and for whom, with the reason for each.
// The product decides the audience: the people a product is offered_to are the site's customers,
// even when they are partners serving customers of their own (B2B2C). Their customer types set what
// they look for (matrix.json customer_types); the venture's facts weigh the other audiences.
//
// Pages follow topics, not audiences (audience-based navigation tends to hurt usability, NN/g), with
// one exception: an audience with content of its own (candidates, investors, contributors) gets its
// own page, labelled for it. The plan is a marketing record (operations/marketing/sitemap.json). It
// names, for each section, the internal record it draws on and the public variant a marketing agent
// writes (marketing/content/<page>/<item>.mdx, through the route marketing/content/<page>/<item>), so nothing internal is published as is
// (packages/naive/src/engine/check-public.ts). Planning the sitemap and designing the site are separate agents: this plan is
// part of the marketing package handed to engineering, which builds the site (EE-065).
//
//   node plan.ts <venture> [--raising] [--hiring] [--contributors] [--write] [--json]

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { customerNeeds, factsOf, MATRIX, needs, typesOf, weights } from "./presence.ts";
import type { JevAnswers } from "./presence.ts";
import { ventureFile } from "../../../../core/venture-paths.ts";
import { filesOf, icpProfiles } from "../../../../engine/foundation.ts";
import type { IcpProfile, MarketingSitemap, Product, Venture } from "../../../../records/types/records.d.ts";
import { now as clockNow } from "../../../../core/clock.ts";

/** A page of the planned sitemap. */
type Page = MarketingSitemap["pages"][number];

const load = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));
export const SITEMAP = "operations/marketing/sitemap.json";
export const CONTENT = "marketing/content";
const LABELS = MATRIX.page_labels;
const RANK = Object.fromEntries(Object.entries(MATRIX.prominence).map(([k, v]) => [k, v.rank]));

// A venture's business models are fields of its product cards, not a record of their own.
const RECORD_TYPE: Record<string, string> = { "business-models": "product" };

/** The internal record an item draws on: the first file of its record type in the venture, in any layout
 *  and at the data model's newer or older paths; or, when there is none, where the first path would put it. */
export function sourceOf(dir: string, record: string): { record: string; file: string | null; exists: boolean } {
  const type = RECORD_TYPE[record] ?? record;
  const files = type === "icp" ? [...new Set(icpProfiles(dir).map((p) => p.file))] : filesOf(dir, type);
  const found = files.find((f) => existsSync(ventureFile(dir, f)));
  if (found) return { record, file: found, exists: true };
  const first = filesOf(dir, type)[0];
  return { record, file: first ? first.split("*")[0] : null, exists: false };
}

/** The offerings: each product, what kind of offering it is, whom it is offered to and whom it serves through them. */
export function offeringsOf(dir: string) {
  const icp = { profiles: icpProfiles(dir) as IcpProfile[] };
  const profiles = new Map(icp.profiles.map((p) => [p.id, p]));
  const primary = icp.profiles.find((p) => p.primary) ?? icp.profiles[0];
  const products = filesOf(dir, "product").filter((f) => existsSync(ventureFile(dir, f))).map((f) => ({ ...(load(ventureFile(dir, f)) as Product), file: f })).filter((p) => !["retired", "archived", "idea"].includes(p.status ?? ""));
  return { profiles, files: new Map(products.map((p) => [p.id, p.file])), products: products.map((p) => {
    // Who it is offered to: the product says so; otherwise the profiles others are reached through
    // (partners, in a B2B2C venture); otherwise the primary profile.
    const channel = icp.profiles.filter((x) => icp.profiles.some((y) => y.reached_through?.includes(x.id)));
    const to: string[] = p.offered_to ?? (channel.length ? channel.map((x) => x.id) : primary ? [primary.id] : []);
    const serves = p.serves ?? icp.profiles.filter((y) => y.reached_through?.some((r) => to.includes(r))).map((y) => y.id);
    return { id: p.id, name: p.name, offering: p.offering ?? "product", status: p.status ?? null, offered_to: to, serves, from: p.offered_to ? "product record" : channel.length ? "icp reached_through" : primary ? "primary ICP profile" : "nothing: no ICP yet" };
  }) };
}

export function plan(dir: string, { flags = {}, answers = null }: { flags?: Record<string, unknown>; answers?: JevAnswers | null } = {}) {
  const venture = load(join(dir, "venture.json")) as Venture;
  const facts = factsOf(dir, flags);
  const { profiles, files, products } = offeringsOf(dir);
  // The site's customers are the people the products are offered to. Their customer types come from
  // the profile when the founder set one, else from Jev's answers, else from the matrix's keywords.
  const toIds = [...new Set(products.flatMap((p) => p.offered_to))];
  const to = toIds.map((id) => profiles.get(id)).filter((p): p is IcpProfile => Boolean(p));
  const text = to.map((p) => [p.who, p.short, ...(p.traits ?? [])].filter(Boolean).join(". ")).join(" | ");
  const set = to.map((p) => p.customer_type).filter((t): t is string => Boolean(t && MATRIX.customer_types.types[t]));
  const types = set.length ? set.map((id) => ({ id, label: MATRIX.customer_types.types[id].label, p: 1 })) : typesOf({ text }, answers);
  const partnerLed = to.some((p) => profiles.size && [...profiles.values()].some((y) => y.reached_through?.includes(p.id)));
  const w = weights(facts), need = needs(w, customerNeeds(types));

  const pages = new Map<string, Page>();
  const page = (type: string, level: Page["level"], extra = {}): Page => {
    const path = type === "home" ? "/" : `/${type}`;
    if (!pages.has(path)) pages.set(path, { path, parent: type === "home" ? null : "/", label: LABELS[type] ?? type, type, level, sections: [], ...extra });
    const pg = pages.get(path);
    if (!pg) throw new TypeError(`no page ${path}`);
    if (RANK[level] > RANK[pg.level]) pg.level = level;
    return pg;
  };
  page("home", "home");
  const omitted: { item: string; label: string; why: string; when?: string }[] = [];
  for (const [id, it] of Object.entries(MATRIX.items)) {
    const n = need[id];
    const top = n.evidence[0];
    const when = Object.entries(MATRIX.when).find(([k]) => (((wt) => typeof wt === "object" && wt[k] != null)(MATRIX.audiences[top.audience].weight)))?.[1] ?? null;
    if (n.need < MATRIX.prominence.linked.at_least) { omitted.push({ item: id, label: it.label, why: `${MATRIX.audiences[top.audience].label} are not a priority now (need ${n.need})`, ...(when ? { when: `show it ${when}` } : {}) }); continue; }
    // Where: the home page when the need says so and the item belongs there; else its own page,
    // in the navigation or the footer as the need says.
    const own = it.belongs.find((b) => b !== "home");
    const target = n.required === "home" && it.belongs.includes("home") ? page("home", "home") : page(own ?? "about", n.required === "home" ? "nav" : n.required === "anywhere" ? "linked" : n.required as Page["level"]);
    const record = it.record;
    target.sections.push({ item: id, label: it.label, component: it.component, need: n.need, required: n.required, for: n.for.length ? n.for : [top.audience],
      why: n.evidence.filter((e, k) => k === 0 || e.need >= 0.2).map((e) => `${MATRIX.audiences[e.audience].label}: ${e.why}`),
      source: sourceOf(dir, record),
      variant: `${CONTENT}/${target.type}/${id}.mdx`, ...(when && !n.evidence.some((e) => e.audience !== top.audience && e.need >= MATRIX.prominence.linked.at_least) ? { when } : {}) });
  }
  // A product page for each product beyond the first, under /product, when there are several.
  if (products.length > 1) for (const p of products) pages.set(`/product/${p.id}`, { path: `/product/${p.id}`, parent: pages.has("/product") ? "/product" : "/", label: p.name, type: "product", level: "anywhere", sections: [
    { item: "how", label: `How ${p.name} works`, component: "HowItWorks", need: need.how.need, required: "anywhere", for: ["customers"], why: [`${p.offering} offered to ${p.offered_to.join(", ")}`], source: { record: "product", file: files.get(p.id) ?? null, exists: true }, variant: `${CONTENT}/product/${p.id}.mdx` }] });
  for (const pg of pages.values()) pg.sections.sort((a, b) => b.need - a.need);
  const list = [...pages.values()].sort((a, b) => RANK[b.level] - RANK[a.level] || b.sections.reduce((s, x) => s + x.need, 0) - a.sections.reduce((s, x) => s + x.need, 0));
  return { version: MATRIX.version, venture: venture.id, name: venture.name, phase: venture.phase, planned_at: clockNow().toISOString().replace(/\.\d+Z$/, "Z"), planned_by: answers ? "jev" : "conventions", facts,
    offerings: products, audience: { offered_to: to.map((p) => ({ id: p.id, who: p.who })), partner_led: partnerLed, types, weights: w,
      note: partnerLed ? "The products are offered to partners who serve customers of their own: the partners are this site's customers, and their customers appear as who it ultimately serves." : "The site's customers are the profiles the products are offered to." },
    pages: list, omitted,
    handoff: { to: "engineering", note: "Part of the marketing package: engineering builds the site from this plan, the content variants and the brand; it does not decide what goes where (EE-065).", variants: list.flatMap((p) => p.sections.map((s) => s.variant)) } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node plan.ts <venture> [--raising] [--hiring] [--contributors] [--write] [--json]"); process.exit(2); }
  const has = (n: string) => process.argv.includes(`--${n}`);
  const r = plan(dir, { flags: Object.fromEntries(["raising", "hiring", "contributors"].filter(has).map((k) => [k, true])) });
  if (has("write")) { mkdirSync(dirname(ventureFile(dir, SITEMAP)), { recursive: true }); writeFileSync(ventureFile(dir, SITEMAP), JSON.stringify(r, null, 2) + "\n"); }
  if (has("json")) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(`${r.name}: site planned for ${r.audience.offered_to.map((p) => p.id).join(", ") || "no ICP yet"} (${r.audience.types.map((t) => t.label).join(", ") || "customers in general"})${r.audience.partner_led ? "; partner-led" : ""}`);
    for (const p of r.pages) {
      console.log(`${p.path.padEnd(14)} ${p.level.padEnd(8)} ${p.label}`);
      for (const s of p.sections) console.log(`    <${s.component}> ${s.label} (need ${s.need}${s.when ? `, ${s.when}` : ""}) from ${s.source.record}${s.source.exists ? "" : " (not written yet)"}`);
    }
    if (r.omitted.length) console.log(`Not now: ${r.omitted.map((o) => `${o.label}${o.when ? ` (${o.when})` : ""}`).join("; ")}`);
  }
}
