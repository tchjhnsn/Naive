#!/usr/bin/env node
// Tests for site presence (EE-062): audience weights follow the venture's facts, need sets prominence,
// and the score credits what a page says where the matrix says it belongs. No network: the site and
// Jev's answers are fixtures.
import { weights, needs, score, request, pageType, typesOf, customerNeeds, MATRIX } from "./presence.mjs";

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

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
