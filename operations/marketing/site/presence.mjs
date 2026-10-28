#!/usr/bin/env node
// Site presence (EE-062): how present a venture's public records are on its marketing site, weighed
// by who the site has to speak to now. The marketing matrix (matrix.json) names the audiences, what
// each needs to learn, and the record each piece of information comes from; a venture's facts
// (raising, hiring, inviting contributors) and its ICPs set each audience's weight. From the weights
// each item gets a need, and the need sets how prominent it must be: on the home page, one click
// away, or anywhere. The score is the share of that need the site meets. It is ours, version 0.x and
// unevaluated: where information belongs differs by startup type, product and industry.
//
// Whether a page says something is judged by Jev (one typed question per page and item) when the
// platform hands over its answers; otherwise by the matrix's keywords, which is rougher.
//
//   node presence.mjs request <site.json>                                   the Jev request
//   node presence.mjs score <site.json> [--answers <jev.json>] [--venture <dir>] [--raising] [--hiring] [--contributors]
//   node presence.mjs <venture> [--json]                                    the saved result

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const MATRIX = load(join(here, "matrix.json"));
export const PRESENCE = "operations/marketing/site-presence.json";
const LEVELS = Object.entries(MATRIX.prominence).sort(([, a], [, b]) => b.at_least - a.at_least);

/** The venture's facts: flags the founder gave, else what its ICP records say about who it courts. */
export function factsOf(dir, flags = {}) {
  const f = { raising: false, hiring: false, contributors: false, icps: [] };
  const icpFile = dir && join(dir, "purpose/icp.json");
  if (icpFile && existsSync(icpFile)) {
    const icp = load(icpFile);
    const profiles = icp.profiles ?? icp.icps ?? [];
    f.icps = profiles.map((p) => p.name ?? p.id ?? p.segment ?? "").filter(Boolean);
    const said = JSON.stringify(profiles).toLowerCase();
    if (/investor|angel|\bvc\b/.test(said)) f.raising = true;
    if (/candidate|hire|recruit/.test(said)) f.hiring = true;
    if (/contributor|open source|volunteer|creator/.test(said)) f.contributors = true;
  }
  for (const k of ["raising", "hiring", "contributors"]) if (flags[k] != null) f[k] = !!flags[k];
  return f;
}

/** Each audience's weight from the facts: the ICP priority matrix in its simplest form. */
export function weights(facts) {
  return Object.fromEntries(Object.entries(MATRIX.audiences).map(([a, x]) => {
    const w = typeof x.weight === "number" ? x.weight : (Object.entries(x.weight).find(([k]) => k !== "default" && facts[k])?.[1] ?? x.weight.default);
    return [a, w];
  }));
}

/** How much the site needs an item now, and so how prominent it must be. */
export function needs(w) {
  return Object.fromEntries(Object.entries(MATRIX.items).map(([id, it]) => {
    const parts = Object.entries(it.audiences).map(([a, imp]) => [a, Math.round(w[a] * imp * 100) / 100]).sort((x, y) => y[1] - x[1]);
    const need = parts[0]?.[1] ?? 0;
    // An item whose place is its own page (pricing, careers) needs that page one click away at most.
    let required = LEVELS.find(([, l]) => need >= l.at_least)[0];
    if (required === "home" && !it.belongs.includes("home")) required = "nav";
    return [id, { need, required, for: parts.filter(([, v]) => v >= 0.3).map(([a]) => a) }];
  }));
}

export function pageType(p) {
  if (p.depth === 0) return "home";
  const s = `${p.path} ${p.title} ${p.label}`.toLowerCase();
  return Object.entries(MATRIX.pages).find(([k, re]) => k !== "home" && new RegExp(re, "i").test(s))?.[0] ?? "other";
}

const pageText = (p) => `[${p.path}] ${p.title}\n${(p.text ?? "").slice(0, 3000)}`;

/** The Jev request: does each page tell a visitor each item? */
export function request(site) {
  const pages = site.pages.filter((p) => !p.error);
  const questions = {};
  pages.forEach((p, i) => { for (const [id, it] of Object.entries(MATRIX.items))
    questions[`has:${id}:p${i}`] = { type: "noul", instructions: `Does the web page in \`pages.p${i}\` tell a visitor ${it.question}? Judge what the page itself states, not what the venture might do.`,
      criteria: { true: "Yes: the page states it", false: "No: the page does not state it" } }; });
  return { state: { site: site.site, guidelines: "Each page is a venture's public marketing page. Answer from the page's own words only.", pages: Object.fromEntries(pages.map((p, i) => [`p${i}`, pageText(p)])) }, model: "jev-latest", questions };
}

// Without a judge: the matrix's keywords, matched in the page's text.
function byKeywords(p, id, it) {
  if (id === "what") return p.depth === 0 && (p.text ?? "").length > 80;
  const t = `${p.path} ${p.title} ${p.text ?? ""}`.toLowerCase();
  const hits = it.keywords.filter((k) => t.includes(k.toLowerCase())).length;
  return hits >= (it.keywords.length >= 5 ? 2 : 1);
}

export function score(site, { answers = null, facts = {}, venture = null } = {}) {
  const w = weights(facts), need = needs(w);
  const pages = site.pages.filter((p) => !p.error).map((p, i) => ({ ...p, i, type: pageType(p), level: p.depth === 0 ? "home" : p.in_nav ? "nav" : p.depth === 1 ? "linked" : "anywhere" }));
  const rankOf = (l) => MATRIX.prominence[l]?.rank ?? 0;
  const types = new Set(pages.map((p) => p.type));
  const label = (a) => MATRIX.audiences[a].label.toLowerCase();
  const items = Object.entries(MATRIX.items).map(([id, it]) => {
    const n = need[id];
    const found = pages.filter((p) => answers ? (answers[`has:${id}:p${p.i}`]?.noul ?? 0) >= MATRIX.threshold : byKeywords(p, id, it));
    const at = found.map((p) => p.level).sort((a, b) => rankOf(b) - rankOf(a))[0] ?? null;
    const s = !at ? 0 : rankOf(at) >= rankOf(n.required) ? 1 : 0.5;
    const list = (xs) => xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}` : xs[0];
    const who = list(n.for.map(label));
    const nobody = !n.for.length;
    const req = MATRIX.prominence[n.required].means;
    const home = it.belongs.find((b) => b !== "home");
    const note = !at && nobody ? `Not on the pages read, which is fine while ${list(Object.keys(it.audiences).map(label))} are not a priority.`
      : !at ? `Not on the pages read. ${who[0].toUpperCase() + who.slice(1)} need it ${req}${home && !types.has(home) ? `; there is no ${home} page` : ""}.`
      : s < 1 ? `Found on ${found.map((p) => p.path).slice(0, 2).join(", ")}, but ${who} need it ${req}.`
      : n.need < 0.4 && at === "home" ? `On the home page, though ${list(Object.keys(it.audiences).map(label))} are not a priority now.`
      : `Present ${MATRIX.prominence[at].means}.`;
    return { id, label: it.label, record: it.record, need: n.need, required: n.required, for: n.for, at, score: s, found: found.map((p) => ({ path: p.path, type: p.type })), note };
  });
  const total = items.reduce((a, x) => a + x.need, 0);
  const audiences = Object.fromEntries(Object.keys(MATRIX.audiences).map((a) => {
    const xs = items.filter((x) => MATRIX.items[x.id].audiences[a]);
    const t = xs.reduce((s, x) => s + MATRIX.items[x.id].audiences[a], 0);
    return [a, { weight: w[a], score: t ? Math.round((100 * xs.reduce((s, x) => s + MATRIX.items[x.id].audiences[a] * x.score, 0)) / t) : null }];
  }));
  return { version: MATRIX.version, site: site.site, venture, read_via: site.via, read_at: site.read_at, judged_by: answers ? "jev" : "keywords", facts,
    score: Math.round((100 * items.reduce((a, x) => a + x.need * x.score, 0)) / total), audiences,
    pages: pages.map((p) => ({ path: p.path, title: p.title, type: p.type, level: p.level })),
    items: items.sort((a, b) => b.need * (1 - b.score) - a.need * (1 - a.score) || b.need - a.need),
    fix_first: items.filter((x) => x.score < 1 && x.need >= 0.4).slice(0, 3).map((x) => x.id) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [a, b] = process.argv.slice(2);
  const opt = (n) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : null; };
  const has = (n) => process.argv.includes(`--${n}`);
  const siteOf = (p) => load(p === "-" ? 0 : p);
  if (a === "request") console.log(JSON.stringify(request(siteOf(b))));
  else if (a === "score") {
    const dir = opt("venture");
    const answers = opt("answers") ? (load(opt("answers")).answers ?? load(opt("answers"))) : null;
    const facts = factsOf(dir, Object.fromEntries(["raising", "hiring", "contributors"].filter(has).map((k) => [k, true])));
    const r = score(siteOf(b), { answers, facts, venture: dir ? load(join(dir, "venture.json")).id : null });
    if (dir) { mkdirSync(join(dir, dirname(PRESENCE)), { recursive: true }); writeFileSync(join(dir, PRESENCE), JSON.stringify(r, null, 2) + "\n"); }
    console.log(JSON.stringify(r, null, 2));
  } else if (a && existsSync(join(a, "venture.json"))) {
    if (!existsSync(join(a, PRESENCE))) { console.error(`${PRESENCE} does not exist yet: read the site first (node interface/harness/site.mjs <url> --venture <dir>)`); process.exit(1); }
    const r = load(join(a, PRESENCE));
    if (has("json")) console.log(JSON.stringify(r, null, 2));
    else {
      console.log(`${r.site}: site presence ${r.score}/100 (${r.judged_by}); ${Object.entries(r.audiences).map(([k, v]) => `${k} ${v.score} (w ${v.weight})`).join(", ")}`);
      for (const x of r.items) console.log(`${x.score === 1 ? "ok  " : x.score ? "low " : "miss"} ${x.label.padEnd(28)} ${x.note}`);
    }
  } else { console.error("usage: node presence.mjs request <site.json> | score <site.json> [--answers f] [--venture d] [--raising] [--hiring] [--contributors] | <venture> [--json]"); process.exit(2); }
}
