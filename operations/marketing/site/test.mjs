#!/usr/bin/env node
// Tests for site presence (EE-062): audience weights follow the venture's facts, need sets prominence,
// and the score credits what a page says where the matrix says it belongs. No network: the site and
// Jev's answers are fixtures.
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { plan, offeringsOf } from "./plan.mjs";
import { check } from "../../../packages/naive/src/engine/check-public.mjs";
import { weights, needs, score, request, pageType, typesOf, customerNeeds, icpOf, MATRIX } from "./presence.mjs";

let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m); };

const site = { site: "https://kept.example", via: "fetch", read_at: "2026-10-28T20:00:00Z", pages: [
  { path: "/", title: "Kept", depth: 0, in_nav: true, label: "", text: "Kept fills the gaps no-shows leave in a solo PT clinic. Book a demo." },
  { path: "/pricing", title: "Pricing", depth: 1, in_nav: true, label: "Pricing", text: "$49 per month per clinic." },
  { path: "/about", title: "About", depth: 1, in_nav: false, label: "About", text: "Founded by Sam, a PT's spouse." },
] };

t("investors only weigh when the venture is raising", () => {
  ok(weights({}).investors < 0.5 && weights({ raising: true }).investors === 1, JSON.stringify(weights({ raising: true })));
});

t("need sets prominence; an item with its own page needs that page one click away, not the home page", () => {
  const n = needs(weights({}));
  ok(n.what.required === "home" && n.pricing.required === "nav" && n.raising.required === "anywhere", JSON.stringify(n));
  ok(needs(weights({ raising: true })).raising.required === "nav", "raising");
});

t("the score credits what the judge says each page states, and buries what sits too deep", () => {
  const answers = { "has:what:p0": { noul: 0.95 }, "has:next-step:p0": { noul: 0.9 }, "has:pricing:p1": { noul: 0.97 }, "has:team:p2": { noul: 0.9 } };
  const r = score(site, { answers, facts: { raising: true } });
  const by = Object.fromEntries(r.items.map((x) => [x.id, x]));
  ok(by.what.score === 1 && by.pricing.score === 1 && by["next-step"].score === 1, JSON.stringify(by.pricing));
  ok(by.team.score === 0.5 && by.team.at === "linked", JSON.stringify(by.team));
  ok(by.raising.score === 0 && r.fix_first.includes("raising") && r.judged_by === "jev", JSON.stringify(r.fix_first));
});

t("a missing item no audience needs now is not held against the site", () => {
  const r = score(site, { answers: {}, facts: {} });
  const hiring = r.items.find((x) => x.id === "hiring");
  ok(hiring.score === 0 && /fine while/.test(hiring.note) && !r.fix_first.includes("hiring"), hiring.note);
});

t("the Jev request asks one question per page and item, and one per customer type", () => {
  const q = request(site, { text: "solo PT clinic owners", source: "founder" });
  ok(Object.keys(q.questions).length === 3 * 15 + Object.keys(MATRIX.customer_types.types).length && q.state.icp === "solo PT clinic owners" && q.state.pages.p2.startsWith("[/about]"), Object.keys(q.questions).length);
  ok(pageType({ depth: 1, path: "/careers", title: "", label: "" }) === "careers", "page type");
});

t("who is behind it matters to a clinic owner and barely to a consumer, and the reason says why", () => {
  const clinic = needs(weights({}), customerNeeds(typesOf({ text: "physical therapists who own their clinic" }, { "type:regulated-professional": { noul: 0.96 }, "type:smb-owner": { noul: 0.88 } })));
  const shoppers = needs(weights({}), customerNeeds(typesOf({ text: "shoppers" }, { "type:consumer": { noul: 0.9 } })));
  ok(clinic.team.need === 0.6 && clinic.team.required === "nav" && /clients' data/.test(clinic.team.evidence[0].why), JSON.stringify(clinic.team));
  ok(shoppers.team.need < 0.2 && /rarely look up who founded it/.test(shoppers.team.evidence.find((e) => e.audience === "customers").why), JSON.stringify(shoppers.team));
});

t("Jev's conservative answers still place the ICP: the strongest types within reach of the top count", () => {
  const ts = typesOf({ text: "x" }, { "type:developer": { noul: 0.36 }, "type:enterprise-buyer": { noul: 0.29 }, "type:consumer": { noul: 0.03 } });
  ok(JSON.stringify(ts.map((t) => t.id)) === JSON.stringify(["developer", "enterprise-buyer"]), JSON.stringify(ts));
});

t("the sitemap rates each read route on what belongs there and suggests the pages priorities call for", () => {
  const r = score({ ...site, links: [{ path: "/pricing", label: "Pricing", in_nav: true }, { path: "/about", label: "About", in_nav: false }] }, { answers: { "has:pricing:p1": { noul: 0.9 } }, facts: { raising: true } });
  const by = Object.fromEntries(r.sitemap.map((n) => [n.path, n]));
  ok(by["/pricing"].rating === 100 && by["/pricing"].parent === "/" && by["/pricing"].level === "nav", JSON.stringify(by["/pricing"]));
  ok(by["/about"].missing.includes("team") && by["/investors"]?.ghost && by["/investors"].missing.includes("raising"), JSON.stringify(r.sitemap.map((n) => [n.path, n.missing])));
  ok(r.icp.source === "inferred" && /inferred/.test(r.icp.cite), JSON.stringify(r.icp));
});

t("the ICP is read from the site: what it says outright first, and the records' ICP is kept aside for a clarity check", () => {
  const s2 = { site: "https://x.test", pages: [{ path: "/", depth: 0, text: "Scheduling built for solo physical therapy clinics. Trusted by 400 owners." }, { path: "/customers", depth: 1, text: "Used by clinics in Texas" }] };
  const v = mkdtempSync(join(tmpdir(), "icp-"));
  writeFileSync(join(v, "venture.json"), "{}"); mkdirSync(join(v, "purpose")); writeFileSync(join(v, "purpose/icp.json"), JSON.stringify({ profiles: [{ who: "billing partners" }] }));
  const i = icpOf(v, s2);
  ok(i.source === "site" && i.says.some((x) => /built for solo physical therapy clinics/.test(x)) && i.says.some((x) => /Used by clinics/.test(x)) && i.stated[0] === "billing partners", JSON.stringify(i));
});

// The planner (EE-064): a partner-led venture whose product is offered to clinics' billing partners.
const venture = (() => {
  const v = mkdtempSync(join(tmpdir(), "plan-"));
  const w = (f, x) => { mkdirSync(join(v, f, ".."), { recursive: true }); writeFileSync(join(v, f), typeof x === "string" ? x : JSON.stringify(x)); };
  w("venture.json", { id: "relay", name: "Relay", phase: "validation", brand: { tagline: "Fewer empty slots" } });
  w("purpose/icp.json", { venture: "relay", profiles: [
    { id: "billing-partners", who: "medical billing companies that run the front office for small physical therapy clinics", primary: true, customer: "b2b", buying_roles: ["decider", "buyer"] },
    { id: "clinics", who: "solo physical therapy clinics", customer: "b2b", reached_through: ["billing-partners"] }] });
  w("products/relay.json", { id: "relay", name: "Relay", description: "No-show recovery for billing partners", offering: "service", status: "live" });
  w("purpose/validation/problem.json", { statement: "Solo clinics lose four to six visits a week to no-shows and nobody at the clinic has time to fill the slots again" });
  return v;
})();

t("the product decides the audience: offered to the partners others are reached through, serving their clients", () => {
  const o = offeringsOf(venture).products[0];
  ok(JSON.stringify(o.offered_to) === JSON.stringify(["billing-partners"]) && JSON.stringify(o.serves) === JSON.stringify(["clinics"]) && o.offering === "service", JSON.stringify(o));
  const p = plan(venture);
  ok(p.audience.partner_led && p.audience.offered_to[0].id === "billing-partners", JSON.stringify(p.audience));
});

t("the plan puts what customers need on the home page, with components, reasons and the variant to write", () => {
  const p = plan(venture);
  const home = p.pages.find((x) => x.path === "/");
  const hero = home.sections.find((s) => s.item === "what");
  ok(hero.component === "Hero" && hero.why.length && hero.variant === "operations/marketing/content/home/what.mdx", JSON.stringify(hero));
  ok(home.sections[0].need >= home.sections.at(-1).need, "sections ordered by need");
  ok(home.sections.find((s) => s.item === "problem").source.exists, "problem record found");
});

t("an audience that is not a priority gets no page, only a note on when it would", () => {
  const quiet = plan(venture), raising = plan(venture, { flags: { raising: true } });
  ok(!quiet.pages.some((x) => x.type === "investors") && quiet.omitted.some((o) => o.item === "raising" && /raising/.test(o.when)), JSON.stringify(quiet.omitted));
  ok(raising.pages.find((x) => x.type === "investors")?.level === "nav", JSON.stringify(raising.pages.map((x) => [x.path, x.level])));
});

t("the public gate blocks content that copies its internal record or is published unapproved", () => {
  const dir = join(venture, "operations/marketing/content/home");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "problem.mdx"), "---\nvariant_of: purpose/validation/problem.json\naudience: customers\npublish: true\n---\n<Problem>Solo clinics lose four to six visits a week to no-shows and nobody at the clinic has time</Problem>\n");
  writeFileSync(join(dir, "what.mdx"), "---\nvariant_of: venture.json\naudience: customers\npublish: true\napproved_by: Sam\n---\n<Hero>Relay. Fewer empty slots, for the partners who run clinics' front offices.</Hero>\n");
  const r = check(venture);
  const bad = r.errors.find((x) => x.file.endsWith("problem.mdx"));
  ok(r.files === 2 && r.errors.length === 1 && bad.errors.some((e) => /approval/.test(e)) && bad.errors.some((e) => /copies/.test(e)), JSON.stringify(r.errors));
});

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
