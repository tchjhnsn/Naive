#!/usr/bin/env node
// The venture's brand (Next.js CSS, Fonts and file-based metadata, translated): brand tokens in the
// marketing package, read by every view and every agent. Styling itself stays with the interface;
// what converts is the brand.
//
//   Y-3  brand tokens (colors, typefaces, voice rules) live in marketing/brand.json, the global
//        stylesheet. Voice rules are the global stylesheet for words: every agent's layout carries
//        them, and the voice check holds marketing content to them
//   Y-5  nearer context wins. brand.json scopes override the venture brand for a route prefix,
//   T-2  a package's scope under an item's; a typeface is defined once and assigned to a role at
//        the root (everywhere) or in a scope (only there), like next/font
//   T-1  typefaces are brand tokens recorded with their license, self-hosted from public/ so a
//        browser makes no outside request
//   Y-4  an outside design system is a reference: linked, with its version and license, not copied
//   Y-2  a package's own terms stay local: glossary/<package>.json terms reach other packages
//        only when the glossary exports them
//   P-24 the venture's logo and marks (logo, icon, apple-icon, favicon) are brand marks pointing at
//        registered assets in public/, checked for type and size
//   P-26 the sitemap is a marketing record (marketing/sitemap.json); sitemap.xml is rendered from
//        it for a release, never from the framework's routes
//
// No model is called and nothing here reaches the network.
//
//   node schema/brand.mjs <venture dir> tokens [--json]            DTCG tokens, CSS and head links for the venture
//   node schema/brand.mjs <venture dir> --for <route> [--json]     the brand resolved at a route (nearer wins)
//   node schema/brand.mjs <venture dir> voice [--json]             marketing content against the voice rules
//   node schema/brand.mjs <venture dir> --package <id> [--json]    the terms a package sees (its own and exported ones)
//   node schema/brand.mjs <venture dir> --base <url> [--json]      sitemap.xml from the marketing sitemap
//   node schema/brand.mjs <venture dir> check [--json]             the brand check (also schema/check-brand.mjs)

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { allowsCopy, factsOf, registerOf, REGISTER } from "./assets.mjs";
import { ventureFile } from "../packages/core/venture-paths.mjs";

export const BRAND = "marketing/brand.json";
export const SITEMAPS = ["marketing/sitemap.json", "operations/marketing/sitemap.json"];
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
export const brandOf = (dir) => dir && existsSync(ventureFile(dir, BRAND)) ? load(ventureFile(dir, BRAND)) : null;

// ---------------------------------------------------------------------------------------------
// Router hooks. The route table (packages/routes/routes.mjs) lists these command routes from packages/routes/commands.mjs, re-exported here; this module never imports the router.

/** Where the new record types route (package folder layout, EE-070). */
export { BRAND_ROUTES } from "../packages/routes/commands.mjs";

export { brandCommands } from "../packages/routes/commands.mjs";

/** What a layout adds for an agent: the brand and voice at this route, and the terms its package sees. */
export function brandLayout(dir, route) {
  if (!dir) return null;
  const brand = brandOf(dir);
  const pkg = route.split("/")[0];
  const terms = glossaries(dir).size ? termsFor(dir, pkg) : null;
  if (!brand && !terms) return null;
  const at = brand ? resolveBrand(brand, route) : null;
  return {
    ...(at ? { name: at.name, tone: at.voice.tone, voice: at.voice.rules.map((r) => ({ id: r.id, avoid: r.avoid, use: r.use ?? null, why: r.why ?? null })), fonts: Object.fromEntries(Object.entries(at.fonts).map(([role, t]) => [role, t.family])), colors: at.colors, scopes: at.scopes } : {}),
    ...(terms ? { terms: terms.terms.map((t) => ({ term: t.term, meaning: t.meaning, from: t.from })) } : {}),
  };
}

// ---------------------------------------------------------------------------------------------
// Resolution: nearer context wins (Y-5, T-2).

const covers = (scope, route) => route === scope || route.startsWith(`${scope}/`);
const depth = (s) => s.split("/").filter(Boolean).length;

/**
 * The brand at a route: the venture's colors, font roles and voice rules, then each scope whose
 * `for` covers the route, shallowest first, so the nearest scope wins. set_by says which scope set
 * each value (the venture brand is "venture").
 */
export function resolveBrand(brand, route = "") {
  const faces = new Map((brand.typefaces ?? []).map((t) => [t.id, t]));
  const colors = { ...(brand.colors ?? {}) };
  const roles = { ...(brand.fonts ?? {}) };
  const rules = new Map((brand.voice?.rules ?? []).map((r) => [r.id, r]));
  let tone = brand.voice?.tone ?? [];
  const set_by = {};
  for (const k of Object.keys(colors)) set_by[`color.${k}`] = "venture";
  for (const k of Object.keys(roles)) set_by[`font.${k}`] = "venture";
  for (const k of rules.keys()) set_by[`voice.${k}`] = "venture";
  const scopes = (brand.scopes ?? []).filter((s) => covers(s.for, route)).sort((a, b) => depth(a.for) - depth(b.for));
  for (const s of scopes) {
    for (const [k, v] of Object.entries(s.colors ?? {})) { colors[k] = v; set_by[`color.${k}`] = s.for; }
    for (const [k, v] of Object.entries(s.fonts ?? {})) { roles[k] = v; set_by[`font.${k}`] = s.for; }
    for (const r of s.voice?.rules ?? []) { rules.set(r.id, r); set_by[`voice.${r.id}`] = s.for; }
    if (s.voice?.tone) tone = s.voice.tone;
  }
  const fonts = Object.fromEntries(Object.entries(roles).filter(([, id]) => faces.has(id)).map(([role, id]) => [role, faces.get(id)]));
  return { route, name: brand.name ?? null, colors, fonts, voice: { tone, rules: [...rules.values()] }, scopes: scopes.map((s) => s.for), set_by };
}

// ---------------------------------------------------------------------------------------------
// Tokens: W3C design tokens (DTCG), CSS custom properties and head links.

const cssName = (s) => String(s).toLowerCase().replace(/[^a-z0-9-]+/g, "-");
const familyList = (t) => [JSON.stringify(t.family), ...(t.fallback ?? [])].join(", ");
const FORMAT = { woff2: "woff2", woff: "woff", ttf: "truetype", otf: "opentype" };
const url = (path) => `/${path.replace(/^public\//, "")}`;

/** The marks as head links: the file-based icons Next.js turns into <link> tags. */
export function headLinks(dir, brand) {
  const reg = registerOf(dir);
  const factsFor = (p) => reg?.assets?.find((a) => a.path === p)?.facts ?? (existsSync(ventureFile(dir, p)) ? factsOf(readFileSync(ventureFile(dir, p))) : null);
  const out = [];
  for (const m of brand.marks ?? []) {
    if (m.kind === "logo") continue;
    const f = factsFor(m.asset);
    const sizes = m.kind === "favicon" ? "any" : f?.width ? `${f.width}x${f.height}` : undefined;
    const type = { png: "image/png", svg: "image/svg+xml", ico: "image/x-icon" }[f?.type];
    out.push(Object.fromEntries(Object.entries({ rel: m.kind === "apple-icon" ? "apple-touch-icon" : "icon", href: url(m.asset), type, sizes }).filter(([, v]) => v)));
  }
  return out;
}

/** DTCG tokens, CSS (custom properties, @font-face, one selector per scope) and head links. */
export function tokens(dir, brand = brandOf(dir)) {
  if (!brand) return null;
  const at = resolveBrand(brand, "");
  const dtcg = { color: {}, font: {} };
  for (const [k, v] of Object.entries(at.colors)) dtcg.color[k] = { $type: "color", $value: v };
  for (const [role, t] of Object.entries(at.fonts)) dtcg.font[role] = { $type: "fontFamily", $value: [t.family, ...(t.fallback ?? [])], $description: `${t.family}, ${t.license}` };
  const faces = (brand.typefaces ?? []).filter((t) => t.source === "self-hosted").flatMap((t) => (t.files ?? []).map((f) => {
    const ext = f.split(".").pop().toLowerCase();
    return `@font-face {\n  font-family: ${JSON.stringify(t.family)};\n  src: url("${url(f)}") format("${FORMAT[ext] ?? ext}");\n  font-display: swap;\n}`;
  }));
  const decl = (colors, fonts) => [...Object.entries(colors).map(([k, v]) => `  --color-${cssName(k)}: ${v};`), ...Object.entries(fonts).map(([role, t]) => `  --font-${cssName(role)}: ${familyList(t)};`)].join("\n");
  const blocks = [...faces, `:root {\n${decl(at.colors, at.fonts)}\n}`];
  const faceById = new Map((brand.typefaces ?? []).map((t) => [t.id, t]));
  for (const s of [...(brand.scopes ?? [])].sort((a, b) => depth(a.for) - depth(b.for))) {
    const f = Object.fromEntries(Object.entries(s.fonts ?? {}).filter(([, id]) => faceById.has(id)).map(([role, id]) => [role, faceById.get(id)]));
    const d = decl(s.colors ?? {}, f);
    if (d) blocks.push(`[data-naive-scope="${s.for}"] {\n${d}\n}`);
  }
  return { name: brand.name ?? null, tokens: dtcg, css: blocks.join("\n\n") + "\n", head: headLinks(dir, brand), voice: brand.voice ?? null, design_systems: brand.design_systems ?? [] };
}

// ---------------------------------------------------------------------------------------------
// Glossaries (Y-2): a package's terms stay local unless it exports them.

/** Every package glossary in the venture (glossary/<package>.json): package -> record. */
export function glossaries(dir) {
  const out = new Map();
  const g = dir ? join(dir, "glossary") : null;
  if (!g || !existsSync(g)) return out;
  for (const f of readdirSync(g).filter((n) => n.endsWith(".json")).sort()) out.set(f.slice(0, -5), load(join(g, f)));
  return out;
}

/** The terms a package sees: its own (all of them), then other packages' exported ones. Its own win. */
export function termsFor(dir, pkg) {
  const all = glossaries(dir);
  const own = (all.get(pkg)?.terms ?? []).map((t) => ({ ...t, from: pkg }));
  const names = new Set(own.map((t) => t.term.toLowerCase()));
  const imported = [], shadows = [];
  let hidden = 0;
  for (const [p, g] of all) {
    if (p === pkg) continue;
    for (const t of g.terms ?? []) {
      if (!t.export) { hidden++; continue; }
      if (names.has(t.term.toLowerCase())) { shadows.push({ term: t.term, from: p, kept: pkg }); continue; }
      imported.push({ ...t, from: p });
    }
  }
  return { package: pkg, terms: [...own, ...imported], shadows, hidden };
}

function checkGlossaries(dir) {
  const errors = [], warnings = [];
  const exported = new Map();
  for (const [p, g] of glossaries(dir)) {
    if (g.package !== p) errors.push(`glossary/${p}.json: names package ${g.package}; the file for ${g.package} is glossary/${g.package}.json (Y-2)`);
    const seen = new Set();
    for (const t of g.terms ?? []) {
      const k = t.term.toLowerCase();
      if (seen.has(k)) errors.push(`glossary/${p}.json: ${t.term} is defined twice`);
      seen.add(k);
      if (!t.export) continue;
      const prior = exported.get(k);
      if (prior && prior.meaning !== t.meaning) errors.push(`${t.term}: exported by ${prior.from} and ${p} with different meanings; one of them keeps it local or they agree (Y-2)`);
      else exported.set(k, { ...t, from: p });
    }
  }
  return { errors, warnings };
}

// ---------------------------------------------------------------------------------------------
// Voice (Y-3): the global stylesheet for words.

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const phrase = (p) => new RegExp(`(^|[^\\p{L}\\p{N}])(${escape(p)})(?=$|[^\\p{L}\\p{N}])`, "giu");

/** Text held to voice rules: every phrase to avoid, by line, with what to use instead. Frontmatter and code are skipped. */
export function voiceCheck(text, rules) {
  const out = [];
  let fence = false, front = false;
  text.split("\n").forEach((line, i) => {
    if (i === 0 && line.trim() === "---") { front = true; return; }
    if (front) { if (line.trim() === "---") front = false; return; }
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; return; }
    if (fence) return;
    const plain = line.replace(/`[^`]*`/g, "");
    for (const r of rules) for (const a of [].concat(r.avoid ?? [])) for (const m of plain.matchAll(phrase(a))) out.push({ rule: r.id, line: i + 1, found: m[2], use: r.use ?? null, why: r.why ?? null });
  });
  return out;
}

/** The venture's marketing content files, venture-relative. */
export function contentFiles(dir) {
  const walk = (d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : /\.(mdx?|txt)$/.test(e.name) ? [join(d, e.name)] : []) : [];
  return ["marketing/content", "operations/marketing/content"].flatMap((p) => walk(ventureFile(dir, p))).map((f) => f.slice(dir.length + 1)).sort();
}

/** Every marketing content file held to the voice rules in force at its path, and to other packages' local terms (warnings). */
export function voice(dir, brand = brandOf(dir)) {
  const violations = [], leaks = [];
  const local = [...glossaries(dir)].filter(([p]) => p !== "marketing").flatMap(([p, g]) => (g.terms ?? []).filter((t) => !t.export).map((t) => ({ ...t, from: p })));
  for (const f of contentFiles(dir)) {
    const text = readFileSync(ventureFile(dir, f), "utf8");
    const route = f.replace(/^operations\//, "").replace(/\.(mdx?|txt)$/, "");
    if (brand) for (const v of voiceCheck(text, resolveBrand(brand, route).voice.rules)) violations.push({ file: f, ...v });
    for (const t of local) for (const v of voiceCheck(text, [{ id: t.term, avoid: t.term }])) leaks.push({ file: f, line: v.line, term: t.term, local_to: t.from });
  }
  return { ok: !violations.length, files: contentFiles(dir).length, violations, local_terms: leaks };
}

// ---------------------------------------------------------------------------------------------
// The brand check.

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function checkBrand(dir) {
  const errors = [], warnings = [];
  const brand = brandOf(dir);
  const g = checkGlossaries(dir);
  errors.push(...g.errors); warnings.push(...g.warnings);
  if (!brand) return { ok: !errors.length, errors, warnings, brand: false };
  const reg = registerOf(dir);
  const asset = (p) => reg?.assets?.find((a) => a.path === p);
  const faces = new Map((brand.typefaces ?? []).map((t) => [t.id, t]));
  // Colors (Y-3).
  const colorsOk = (cs, where) => { for (const [k, v] of Object.entries(cs ?? {})) if (!HEX.test(v)) errors.push(`${where}: color ${k} is ${v}, not a hex color`); };
  colorsOk(brand.colors, BRAND);
  // Typefaces (T-1): licensed, self-hosted from registered files, never fetched from another host by the browser.
  for (const t of brand.typefaces ?? []) {
    if (t.source !== "system" && !String(t.license ?? "").trim()) errors.push(`typeface ${t.id}: no license (T-1)`);
    if (t.source === "remote") errors.push(`typeface ${t.id}: served from ${t.url ?? "another host"}, so every reader's browser makes an outside request; self-host its files in public/ (T-1)`);
    if (t.source === "self-hosted") {
      if (!(t.files ?? []).length) errors.push(`typeface ${t.id}: self-hosted but names no files in public/ (T-1)`);
      for (const f of t.files ?? []) {
        if (!f.startsWith("public/")) { errors.push(`typeface ${t.id}: ${f} is not in public/ (T-1)`); continue; }
        if (!existsSync(ventureFile(dir, f))) { errors.push(`typeface ${t.id}: ${f} is not there (T-1)`); continue; }
        const a = asset(f);
        if (!a) errors.push(`typeface ${t.id}: ${f} has no entry in ${REGISTER} (T-1, J-2)`);
        else if (String(a.license).toLowerCase() !== String(t.license).toLowerCase()) errors.push(`typeface ${t.id}: licensed ${t.license}, but ${REGISTER} says ${f} is ${a.license} (T-1)`);
        const type = factsOf(readFileSync(ventureFile(dir, f))).type;
        if (!["woff2", "woff", "ttf", "otf"].includes(type)) errors.push(`typeface ${t.id}: ${f} is ${type}, not a font file (T-1)`);
      }
    }
  }
  // Font roles, at the root and in scopes (T-2).
  for (const [role, id] of Object.entries(brand.fonts ?? {})) if (!faces.has(id)) errors.push(`fonts.${role}: no typeface ${id} (T-2)`);
  for (const s of brand.scopes ?? []) {
    colorsOk(s.colors, `scope ${s.for}`);
    for (const [role, id] of Object.entries(s.fonts ?? {})) if (!faces.has(id)) errors.push(`scope ${s.for}: fonts.${role} names no typeface ${id} (T-2)`);
  }
  const fors = (brand.scopes ?? []).map((s) => s.for);
  for (const f of new Set(fors.filter((x, i) => fors.indexOf(x) !== i))) errors.push(`scope ${f} is declared twice; merge them (Y-5)`);
  // Voice rules (Y-3).
  const ids = (brand.voice?.rules ?? []).map((r) => r.id);
  for (const id of new Set(ids.filter((x, i) => ids.indexOf(x) !== i))) errors.push(`voice rule ${id} is declared twice`);
  // Marks (P-24): registered assets of the right type and size.
  const KINDS = { favicon: ["ico"], icon: ["png", "svg", "ico"], "apple-icon": ["png"], logo: ["png", "svg", "jpeg", "webp"] };
  for (const m of brand.marks ?? []) {
    if (!existsSync(ventureFile(dir, m.asset))) { errors.push(`mark ${m.kind}: ${m.asset} is not there (P-24)`); continue; }
    if (!asset(m.asset)) errors.push(`mark ${m.kind}: ${m.asset} has no entry in ${REGISTER}, so its source and license are unknown (P-24, J-2)`);
    const f = factsOf(readFileSync(ventureFile(dir, m.asset)));
    if (!KINDS[m.kind].includes(f.type)) errors.push(`mark ${m.kind}: ${m.asset} is ${f.type}; a ${m.kind} is ${KINDS[m.kind].join(" or ")} (P-24)`);
    if (m.kind === "apple-icon" && f.type === "png" && (f.width !== 180 || f.height !== 180)) errors.push(`mark apple-icon: ${m.asset} is ${f.width}x${f.height}; an apple-icon is 180x180 (P-24)`);
    if (m.kind === "icon" && f.width && f.width !== f.height) errors.push(`mark icon: ${m.asset} is ${f.width}x${f.height}; an icon is square (P-24)`);
  }
  const kinds = (brand.marks ?? []).map((m) => m.kind).filter((k) => k !== "icon");
  for (const k of new Set(kinds.filter((x, i) => kinds.indexOf(x) !== i))) errors.push(`mark ${k} is declared twice (P-24)`);
  // Design systems (Y-4): linked, not copied.
  const systems = new Map((brand.design_systems ?? []).map((d) => [d.id, d]));
  for (const d of brand.design_systems ?? []) if (!/^https?:\/\//.test(d.url ?? "")) errors.push(`design system ${d.id}: ${d.url ?? "no url"} is not a link; a design system is referenced, not copied (Y-4)`);
  for (const a of reg?.assets ?? []) if (a.design_system) {
    const d = systems.get(a.design_system);
    if (!d) errors.push(`${a.path}: from design system ${a.design_system}, which the brand does not reference (Y-4)`);
    else if (!allowsCopy(d.license)) errors.push(`${a.path}: a copy from design system ${d.id} (license ${d.license}); link to it at ${d.url} instead (Y-4)`);
  }
  // Content held to the voice.
  const v = voice(dir, brand);
  for (const x of v.violations) errors.push(`${x.file}:${x.line}: "${x.found}" breaks voice rule ${x.rule}${x.use ? `; use "${x.use}"` : ""} (Y-3)`);
  for (const x of v.local_terms) warnings.push(`${x.file}:${x.line}: "${x.term}" is a term local to ${x.local_to}; export it from glossary/${x.local_to}.json or say it plainly (Y-2)`);
  return { ok: !errors.length, errors, warnings, brand: true };
}

// ---------------------------------------------------------------------------------------------
// The sitemap (P-26): rendered from the marketing record, for a release.

const xmlEscape = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

export function sitemapOf(dir) {
  const f = SITEMAPS.find((p) => existsSync(ventureFile(dir, p)));
  return f ? { file: f, record: load(ventureFile(dir, f)) } : null;
}

/** sitemaps.org XML from a marketing sitemap record: one <url> per planned page, home first. */
export function sitemapXml(record, base) {
  let root;
  try { root = new URL(base); } catch { throw new Error(`${base} is not a URL`); }
  if (!/^https?:$/.test(root.protocol)) throw new Error(`${base} is not an http or https URL`);
  const origin = base.replace(/\/+$/, "");
  const lastmod = /^\d{4}-\d{2}-\d{2}/.test(record.planned_at ?? "") ? record.planned_at.slice(0, 10) : null;
  const pages = [...record.pages].sort((a, b) => (a.level === "home" ? -1 : b.level === "home" ? 1 : 0));
  const urls = pages.map((p) => {
    const path = p.path.startsWith("/") ? p.path : `/${p.path}`;
    return `  <url>\n    <loc>${xmlEscape(origin + (path === "/" ? "/" : path))}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ""}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}

// ---------------------------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const json = argv.includes("--json");
  const dir = argv[0];
  const mode = argv[1] && !argv[1].startsWith("--") ? argv[1] : null;
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node schema/brand.mjs <venture dir> tokens|voice|check | --for <route> | --package <id> | --base <url> [--json]"); process.exit(2); }
  const print = (x, text) => console.log(json ? JSON.stringify(x, null, 2) : text ?? JSON.stringify(x, null, 2));
  if (opt("for") !== undefined) {
    const brand = brandOf(dir);
    if (!brand) { console.error(`no brand yet: write ${BRAND} (mentura marketing/brand template)`); process.exit(1); }
    print(resolveBrand(brand, opt("for")));
  } else if (opt("package") !== undefined) {
    const t = termsFor(dir, opt("package"));
    print(t, t.terms.map((x) => `${x.term.padEnd(24)} ${x.from.padEnd(12)} ${x.meaning}`).join("\n") || `no terms reach ${opt("package")}`);
  } else if (opt("base") !== undefined) {
    const s = sitemapOf(dir);
    if (!s) { console.error("no marketing sitemap yet: plan it (mentura operations/marketing/sitemap run) and write marketing/sitemap.json"); process.exit(1); }
    let xml;
    try { xml = sitemapXml(s.record, opt("base")); } catch (e) { console.error(e.message); process.exit(1); }
    print({ from: s.file, pages: s.record.pages.length, xml }, xml);
  } else if (mode === "tokens") {
    const t = tokens(dir);
    if (!t) { console.error(`no brand yet: write ${BRAND}`); process.exit(1); }
    print(t, t.css);
  } else if (mode === "voice") {
    const v = voice(dir);
    print(v, v.violations.map((x) => `${x.file}:${x.line}  "${x.found}" (${x.rule})${x.use ? ` -> ${x.use}` : ""}`).join("\n") || `voice: ${v.files} files keep to the voice rules`);
  } else {
    const r = checkBrand(dir);
    if (json) console.log(JSON.stringify(r, null, 2));
    else {
      for (const e of r.errors) console.log(`error  ${e}`);
      for (const w of r.warnings) console.log(`warn   ${w}`);
      console.log(r.ok ? `brand: ${r.brand ? "tokens, typefaces, marks, design systems and voice check out" : "no brand record yet; glossaries check out"}` : `brand: ${r.errors.length} errors`);
    }
    process.exit(r.ok ? 0 : 1);
  }
}
