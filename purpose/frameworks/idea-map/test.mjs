#!/usr/bin/env node
// Tests for the idea map (EE-059): ideas stay verbatim, tags stay within the conventions, and the
// .mdx round-trips. No network: Jev's answers are a fixture.
import { split, render, parse, clean, fromAnswers, summary, request, CONVENTIONS } from "./ideamap.mjs";

let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m); };

const dump = `no shows are killing my clinic
I already built a google sheet that texts patients
- a $25 deposit {when} they book
- a waitlist <that> auto-texts

# marketing
facebook groups for PTs, there are huge ones and this sentence runs on long enough
that it wraps onto a second line in the dump`;

t("each bullet and line is one idea; a wrapped line joins its idea; headings name the section", () => {
  const ideas = split(dump);
  ok(ideas.length === 5, `got ${ideas.length}: ${JSON.stringify(ideas)}`);
  ok(ideas[4].section === "marketing" && ideas[4].text.endsWith("second line in the dump"), JSON.stringify(ideas[4]));
});

t("tags outside the conventions are dropped, and the pillar follows the first department", () => {
  const c = clean({ "i-01": { departments: ["products", "astrology"], records: ["product", "horoscope"], exists: true } });
  ok(JSON.stringify(c["i-01"]) === JSON.stringify({ departments: ["products"], records: ["product"], exists: true, pillar: "product" }), JSON.stringify(c));
});

t("the map round-trips, and every idea's text is unchanged, braces and angle brackets included", () => {
  const ideas = split(dump);
  const tags = { "i-03": { departments: ["finance"], records: ["validation-pricing"] } };
  const back = parse(render(ideas, tags, { venture: "kept", tagger: "fixture", created: "2026-10-28T00:00:00Z" }));
  ok(back.meta.tagged_by === "fixture" && back.ideas.length === ideas.length, JSON.stringify(back.meta));
  ideas.forEach((i, k) => ok(back.ideas[k].text === i.text, `${i.id}: ${back.ideas[k].text}`));
  ok(back.ideas[2].pillar === "business" && back.ideas[2].departments[0] === "finance", JSON.stringify(back.ideas[2]));
});

t("Jev's answers become tags at the threshold, at most two departments, strongest first", () => {
  const a = { "dept.finance:i-01": { noul: 0.95 }, "dept.strategy:i-01": { noul: 0.85 }, "dept.products:i-01": { noul: 0.9 }, "rec.product:i-01": { noul: 0.4 }, "exists:i-01": { noul: 0.9 } };
  const x = fromAnswers(a)["i-01"];
  ok(JSON.stringify(x.departments) === JSON.stringify(["finance", "products"]) && !x.records.length && x.exists, JSON.stringify(x));
});

t("an idea below the threshold still lands on its likeliest department, marked tentative", () => {
  const x = fromAnswers({ "dept.it:i-02": { noul: 0.6 }, "dept.finance:i-02": { noul: 0.3 } })["i-02"];
  ok(x.departments[0] === "it" && x.tentative, JSON.stringify(x));
});

t("the request asks every department, every record and exists, for every idea", () => {
  const r = request(split(dump), { id: "kept", phase: "discovery" });
  const per = Object.keys(CONVENTIONS.departments).length + Object.keys(CONVENTIONS.records).length + 1;
  ok(Object.keys(r.questions).length === 5 * per, `${Object.keys(r.questions).length}`);
});

t("the summary says what exists and which founder records the dump never mentions", () => {
  const s = summary({ ideas: [{ id: "i-01", text: "built it", pillar: "product", departments: ["products"], records: ["product"], exists: true }] });
  ok(s.product.exists.length === 1 && s.unasked.some((u) => u.record === "icp"), JSON.stringify(s));
});

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nall passing");
