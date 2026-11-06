#!/usr/bin/env node
// Tests for the brand and assets (Y-2, Y-3, Y-4, J-2, J-3, J-4, T-1, T-2, P-24, P-26) on made-up
// ventures in a temp folder: brand tokens read by layouts and rendered for interfaces, nearer context
// winning, voice rules over content, package glossaries, licensed self-hosted typefaces, marks,
// design systems by reference, the public/ register with facts read by code and alt text confirmed
// by a person, remote images as links with a note in raw/ (recorded through addAsset and addRemote, the
// calls an app's fetcher makes), and sitemap.xml from the marketing sitemap. Never writes into the repo.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { call } from "../../router/router.mjs";
import { addAsset, addRemote } from "../../router/brand.mjs";
import { entries } from "../../core/provenance.mjs";
import { allowsCopy, checkAssets, factsOf, hostAllowed } from "../../engine/assets.mjs";
import { checkBrand, resolveBrand, sitemapXml, termsFor, tokens, voiceCheck } from "../../engine/brand.mjs";

const repo = new URL("../../../../..", import.meta.url).pathname;
let failed = 0;
/** @param {string} name @param {unknown} ok @param {unknown} [detail] */
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${typeof detail === "string" ? detail : JSON.stringify(detail)}`}`); if (!ok) failed++; };
const has = (list, re) => list.some((x) => re.test(x));

// ---- Image bytes, built here so the parser is tested against real encodings.
const CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, "latin1"), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); };
function png(w, h) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
const gif = (w, h) => { const b = Buffer.alloc(13); b.write("GIF89a", 0, "latin1"); b.writeUInt16LE(w, 6); b.writeUInt16LE(h, 8); return Buffer.concat([b, Buffer.from([0x3b])]); };
function jpeg(w, h) {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]);
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, sof, Buffer.from([0xff, 0xd9])]);
}
function webpX(w, h) { const b = Buffer.alloc(30); b.write("RIFF", 0, "latin1"); b.writeUInt32LE(22, 4); b.write("WEBPVP8X", 8, "latin1"); b.writeUInt32LE(10, 16); b.writeUIntLE(w - 1, 24, 3); b.writeUIntLE(h - 1, 27, 3); return b; }
function webpL(w, h) {
  const b = Buffer.alloc(26); b.write("RIFF", 0, "latin1"); b.write("WEBPVP8L", 8, "latin1"); b[20] = 0x2f;
  const bits = (w - 1) | ((h - 1) << 14); b.writeUInt32LE(bits >>> 0, 21); return b;
}
function ico(sizes) {
  const head = Buffer.alloc(6 + 16 * sizes.length); head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(sizes.length, 4);
  sizes.forEach((s, i) => { head[6 + 16 * i] = s >= 256 ? 0 : s; head[7 + 16 * i] = s >= 256 ? 0 : s; });
  return head;
}
const woff2 = () => Buffer.concat([Buffer.from("wOF2", "latin1"), Buffer.alloc(44)]);
const svg = (attrs) => Buffer.from(`<?xml version="1.0"?>\n<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect width="10" height="10"/></svg>\n`);

// ---- J-4: facts are read from bytes.
{
  const p = factsOf(png(120, 80));
  expect("J-4 facts: a PNG's type and size come from its IHDR", p.type === "png" && p.width === 120 && p.height === 80 && /^[0-9a-f]{64}$/.test(p.sha256), p);
  expect("J-4 facts: GIF", JSON.stringify([factsOf(gif(33, 44)).type, factsOf(gif(33, 44)).width, factsOf(gif(33, 44)).height]) === '["gif",33,44]');
  const j = factsOf(jpeg(640, 480));
  expect("J-4 facts: JPEG, from its SOF marker after APP0", j.type === "jpeg" && j.width === 640 && j.height === 480, j);
  const x = factsOf(webpX(1000, 700)), l = factsOf(webpL(300, 200));
  expect("J-4 facts: WebP extended and lossless", x.type === "webp" && x.width === 1000 && x.height === 700 && l.width === 300 && l.height === 200, [x, l]);
  const i = factsOf(ico([16, 32, 48]));
  expect("J-4 facts: an ICO's sizes, the largest as its size", i.type === "ico" && i.width === 48 && i.sizes.join(",") === "16x16,32x32,48x48", i);
  expect("J-4 facts: SVG width and height, else its viewBox", factsOf(svg('width="64px" height="32"')).width === 64 && factsOf(svg('viewBox="0 0 24 12"')).height === 12);
  expect("J-4 facts: fonts and PDFs by signature", factsOf(woff2()).type === "woff2" && factsOf(Buffer.from("%PDF-1.7\n")).type === "pdf" && factsOf(Buffer.from("hello")).type === "unknown");
  expect("J-3 licenses: CC-BY and owned allow a copy; all-rights-reserved and unknown do not", allowsCopy("CC-BY-4.0") && allowsCopy("owned") && !allowsCopy("all-rights-reserved") && !allowsCopy("unknown") && !allowsCopy(undefined));
  expect("J-3 hosts: exact and *.domain entries", hostAllowed("images.example.com", ["*.example.com"]) && hostAllowed("127.0.0.1:80", ["127.0.0.1:80"]) && !hostAllowed("evil.com", ["*.example.com"]));
}

// ---- A workspace with a venture.
const ws = mkdtempSync(join(tmpdir(), "brand-test-"));
const W = join(ws, "ventures");
const env = /** @type {NodeJS.ProcessEnv} */ ({ ...process.env, MENTURA_WORKSPACE: W });
delete env.MENTURA_ACTOR_ID;
const mentura = (...a) => spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/mentura.mjs"), ...a], { encoding: "utf8", env });
const init = mentura("init", join(W, "acme"), "--id", "acme", "--layers", "purpose");
expect("a venture to brand", init.status === 0, init.stderr);
const dir = join(W, "acme");
const put = (rel, buf) => { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), buf); };
const R = (route, action, input, extra = {}) => call({ venture: "acme", route, action, input, workspace: W, via: "cli", ...extra });
const reg = () => JSON.parse(readFileSync(join(dir, "public/assets.json"), "utf8"));

// ---- J-2: every file in public/ has a source and license.
put("public/logo.svg", svg('width="200" height="60"'));
put("public/icon.png", png(32, 32));
put("public/apple-icon.png", png(180, 180));
put("public/favicon.ico", ico([16, 32]));
put("public/fonts/inter.woff2", woff2());
expect("J-2: a file in public/ with no register entry fails", has(checkAssets(dir).errors, /public\/logo\.svg: no entry/));
let r = mentura("assets", "add", "public/logo.svg", "--venture", "acme", "--source", "Acme design", "--license", "owned", "--credit", "Acme", "--alt", "Acme wordmark");
expect("J-2: mentura assets add registers a file through the router", r.status === 0 && reg().assets[0].path === "public/logo.svg", r.stderr);
expect("J-4: code filled the facts on add", reg().assets[0].facts.width === 200 && reg().assets[0].facts.type === "svg");
expect("J-4: the write is in provenance, attributed to an agent", entries(dir).some((e) => e.entity === "public/assets.json" && e.agent.kind === "agent" && e.route === "public/assets"));
for (const [p, extra] of /** @type {[string, string[]][]} */ ([["public/icon.png", []], ["public/apple-icon.png", []], ["public/favicon.ico", ["--decorative"]], ["public/fonts/inter.woff2", []]]))
  mentura("assets", "add", p, "--venture", "acme", "--source", p.includes("fonts") ? "https://rsms.me/inter/" : "Acme design", "--license", p.includes("fonts") ? "OFL-1.1" : "owned", "--credit", p.includes("fonts") ? "Rasmus Andersson" : "Acme", ...(p.endsWith(".png") ? ["--alt", "Acme mark"] : []), ...extra);
let a = checkAssets(dir);
expect("J-2: with every file registered the check has no errors", a.ok, a.errors);
expect("J-4: an agent's alt text is pending until a person confirms it", a.pending.length === 3 && a.pending.every((p) => p.by === "agent"), a.pending);
r = mentura("assets", "confirm", "public/logo.svg", "--venture", "acme", "--by", "Torian");
expect("J-4: confirming needs the path typed", r.status === 1 && /--confirm public\/logo\.svg/.test(r.stderr));
r = mentura("assets", "confirm", "public/logo.svg", "--venture", "acme", "--by", "Torian", "--confirm", "public/logo.svg");
expect("J-4: a person confirms the alt text; provenance records it", r.status === 0 && entries(dir).some((e) => e.activity === "confirm" && e.agent.kind === "person" && e.agent.id === "Torian" && /^alt-/.test(e.statement)), r.stderr);
expect("J-4: the confirmed alt is no longer pending", !checkAssets(dir).pending.some((p) => p.path === "public/logo.svg"));
mentura("assets", "alt", "public/logo.svg", "--text", "Acme wordmark in blue", "--venture", "acme");
expect("J-4: changing the text makes it pending again (the confirmation is bound to the text)", checkAssets(dir).pending.some((p) => p.path === "public/logo.svg" && p.alt === "Acme wordmark in blue"));
r = mentura("assets", "alt", "public/icon.png", "--text", "Acme mark, square", "--venture", "acme", "--as", "person");
expect("J-4: alt text a person writes is confirmed as written", r.status === 0 && !checkAssets(dir).pending.some((p) => p.path === "public/icon.png"), r.stderr);
// An agent claims a person wrote it: provenance does not back the claim.
{
  const x = reg(); x.assets.find((y) => y.path === "public/apple-icon.png").alt = { text: "Made up", by: "person" };
  const w = await R("public/assets", "write", x);
  expect("J-4: an agent may write the register directly", w.ok, w.error);
  expect("J-4: alt text claiming a person, with no person's confirmation in provenance, fails", has(checkAssets(dir).errors, /apple-icon\.png: alt text says a person wrote it/));
  x.assets.find((y) => y.path === "public/apple-icon.png").alt = { text: "Acme mark", by: "agent" };
  // A guessed width.
  x.assets.find((y) => y.path === "public/icon.png").facts.width = 64;
  await R("public/assets", "write", x);
  expect("J-4: a guessed width fails: facts are code's", has(checkAssets(dir).errors, /icon\.png: recorded width 64 is not the file's 32/));
  r = mentura("assets", "fill", "--venture", "acme");
  expect("J-4: mentura assets fill puts the facts back from the file", r.status === 0 && /icon\.png/.test(r.stdout) && checkAssets(dir).ok, r.stdout + r.stderr);
  put("public/icon.png", png(48, 48));
  expect("J-4: a file that changed after its facts were filled fails", has(checkAssets(dir).errors, /icon\.png: recorded/));
  mentura("assets", "fill", "--venture", "acme");
  put("public/icon.png", png(32, 32));
  mentura("assets", "fill", "--venture", "acme");
  const y = reg(); delete y.assets.find((z) => z.path === "public/logo.svg").credit; y.assets.find((z) => z.path === "public/apple-icon.png").license = "unknown";
  delete y.assets.find((z) => z.path === "public/icon.png").alt;
  await R("public/assets", "write", y);
  const e = checkAssets(dir).errors;
  expect("J-4: a missing credit fails", has(e, /logo\.svg: no credit/));
  expect("J-2: an unknown license fails", has(e, /apple-icon\.png: the license is unknown/));
  expect("J-4: an image with no alt text fails unless decorative", has(e, /icon\.png: an image with no alt text/) && !has(e, /favicon\.ico: an image with no alt/));
  const c = await R("public/assets", "check");
  expect("J-2: the public/assets route's check runs packages/naive/src/checks/check-assets.mjs and fails", !c.ok && c.result[0].check === "packages/naive/src/checks/check-assets.mjs");
  y.assets.find((z) => z.path === "public/logo.svg").credit = "Acme"; y.assets.find((z) => z.path === "public/apple-icon.png").license = "owned";
  y.assets.find((z) => z.path === "public/icon.png").alt = { text: "Acme mark, square", by: "agent" };
  await R("public/assets", "write", y);
  expect("J-2: fixed, the route's check passes", (await R("public/assets", "check")).ok);
  put("public/stray.txt", Buffer.from("x"));
  expect("J-2: a stray file fails until registered", has(checkAssets(dir).errors, /stray\.txt: no entry/));
  mentura("assets", "add", "public/stray.txt", "--venture", "acme", "--source", "Acme", "--license", "owned", "--credit", "Acme");
  const f = await R("public/assets/facts", "run");
  expect("J-4: public/assets/facts gives agents the facts to copy", f.ok && f.result.facts.find((q) => q.path === "public/apple-icon.png").width === 180, f.error);
}

// ---- Y-3, T-1, T-2, Y-5, P-24, Y-4: the brand.
const brand = {
  version: "0.1.0", venture: "acme", name: "Acme",
  colors: { accent: "#1d4e89", ink: "#111111", paper: "#ffffff" },
  typefaces: [
    { id: "inter", family: "Inter", source: "self-hosted", license: "OFL-1.1", files: ["public/fonts/inter.woff2"], fallback: ["system-ui", "sans-serif"] },
    { id: "mono", family: "ui-monospace", source: "system", fallback: ["monospace"] },
  ],
  fonts: { body: "inter", heading: "inter" },
  voice: { tone: ["plain", "warm"], rules: [{ id: "no-jargon", avoid: ["synergy", "leverage"], use: "work with", why: "clinic owners do not talk like this" }] },
  marks: [{ kind: "logo", asset: "public/logo.svg" }, { kind: "icon", asset: "public/icon.png" }, { kind: "apple-icon", asset: "public/apple-icon.png" }, { kind: "favicon", asset: "public/favicon.ico" }],
  design_systems: [{ id: "radix", name: "Radix Colors", url: "https://www.radix-ui.com/colors", version: "3.0.0", license: "MIT", uses: ["the blue scale"] }],
  scopes: [
    { for: "investors", fonts: { body: "mono" }, colors: { accent: "#000000" }, voice: { tone: ["direct"] } },
    { for: "investors/deck", colors: { accent: "#ff0000" } },
    { for: "marketing/content/press", voice: { rules: [{ id: "press-terms", avoid: "cheap", use: "affordable" }] } },
  ],
};
{
  const held = await R("marketing/brand", "write", brand, { actor: "agent" });
  expect("an agent's brand is a draft for a person: the brand is a public commitment", held.ok && held.result.draft && held.result.gate === "public-commitment", JSON.stringify(held.result ?? held.error));
  const w = await R("marketing/brand", "write", brand, { actor: "person" });
  expect("Y-3: the brand is a marketing record written through the router", w.ok && w.result.written === "marketing/brand.json" && w.result.gate === "public-commitment", w.error);
  const c = checkBrand(dir);
  expect("Y-3, T-1, P-24, Y-4: a well-formed brand checks out", c.ok, c.errors);
  expect("Y-3: the marketing/brand route's check runs packages/naive/src/checks/check-brand.mjs", (await R("marketing/brand", "check")).ok);
  const t = await R("marketing/brand/tokens", "run");
  expect("Y-3: tokens as W3C design tokens", t.ok && t.result.tokens.color.accent.$value === "#1d4e89" && t.result.tokens.font.body.$value[0] === "Inter", t.error);
  expect("Y-3: CSS custom properties on :root", /:root \{[\s\S]*--color-accent: #1d4e89;[\s\S]*--font-body: "Inter", system-ui, sans-serif;/.test(t.result.css), t.result.css);
  expect("T-1: a self-hosted @font-face from public/, so no outside request", /@font-face \{\s*font-family: "Inter";\s*src: url\("\/fonts\/inter\.woff2"\) format\("woff2"\);/.test(t.result.css) && !/https?:/.test(t.result.css));
  expect("T-2: a scope's font is applied only under its selector", /\[data-naive-scope="investors"\] \{[\s\S]*--font-body: "ui-monospace", monospace;/.test(t.result.css));
  expect("P-24: the marks become head links with sizes", JSON.stringify(t.result.head) === JSON.stringify([{ rel: "icon", href: "/icon.png", type: "image/png", sizes: "32x32" }, { rel: "apple-touch-icon", href: "/apple-icon.png", type: "image/png", sizes: "180x180" }, { rel: "icon", href: "/favicon.ico", type: "image/x-icon", sizes: "any" }]), t.result.head);
  const at = await R("marketing/brand/resolve", "run", { value: "investors/deck" });
  expect("Y-5: nearer context wins: the item's scope over the package's over the venture", at.ok && at.result.colors.accent === "#ff0000" && at.result.set_by["color.accent"] === "investors/deck" && at.result.colors.ink === "#111111" && at.result.set_by["color.ink"] === "venture", at.result);
  expect("T-2: the package's font applies to its items; the root's everywhere else", at.result.fonts.body.id === "mono" && at.result.fonts.heading.id === "inter" && resolveBrand(brand, "foundation/problem").fonts.body.id === "inter");
  expect("Y-5: a scope's tone replaces the venture's under it", at.result.voice.tone[0] === "direct" && resolveBrand(brand, "investorsx").voice.tone[0] === "plain");
  const lay = await R("marketing/sitemap", "layout");
  expect("Y-3: every agent's layout carries the brand voice and fonts", lay.ok && lay.result.brand.voice[0].id === "no-jargon" && lay.result.brand.tone.join() === "plain,warm" && lay.result.brand.fonts.body === "Inter", lay.result.brand);
  const lay2 = await R("investors", "layout");
  expect("Y-5: an investors route's layout gets the investors scope", lay2.ok && lay2.result.brand.scopes.includes("investors") && lay2.result.brand.fonts.body === "ui-monospace", lay2.result?.brand);
  const v = await R("marketing/brand", "view");
  expect("Y-3: the brand has a view", v.ok && /^# marketing\/brand/.test(v.result) && /accent/.test(v.result));
}
// Y-3 voice: the global stylesheet for words.
{
  put("marketing/content/home/hero.mdx", Buffer.from("---\nrecord: venture\naudience: customers\n---\nWe help clinics work together.\n\n```text\nleverage is fine in code\n```\n"));
  put("marketing/content/press/release.mdx", Buffer.from("---\nrecord: venture\n---\nA cheap way to book.\n"));
  expect("Y-3: content that keeps to the voice passes; frontmatter and code are skipped", !(await R("marketing/voice", "run")).result.violations.some((x) => x.file.includes("hero")));
  expect("Y-3: a scope's voice rule applies under its prefix only", (await R("marketing/voice", "run")).result.violations.some((x) => x.rule === "press-terms" && x.file.endsWith("press/release.mdx")));
  put("marketing/content/home/hero.mdx", Buffer.from("---\nrecord: venture\n---\nWe Leverage synergy for clinics.\n"));
  const v = await R("marketing/voice", "run");
  expect("Y-3: phrases to avoid are found as whole words, ignoring case, with what to use", v.ok && v.result.violations.filter((x) => x.file.endsWith("hero.mdx")).map((x) => x.found).sort().join() === "Leverage,synergy" && v.result.violations[0].use === "work with", v.result);
  expect("Y-3: content against the voice fails the brand check", has(checkBrand(dir).errors, /hero\.mdx:4: "Leverage" breaks voice rule no-jargon/));
  expect("Y-3: whole words only", voiceCheck("leveraged synergies", brand.voice.rules).length === 0);
  r = mentura("brand", "voice", "--venture", "acme", "--text", "Pure synergy");
  expect("Y-3: mentura brand voice --text checks a draft before it is written", r.status === 1 && /synergy/.test(r.stdout));
  put("marketing/content/home/hero.mdx", Buffer.from("---\nrecord: venture\n---\nWe help clinics.\n"));
  put("marketing/content/press/release.mdx", Buffer.from("---\nrecord: venture\n---\nAn affordable way to book.\n"));
  expect("Y-3: fixed content passes", checkBrand(dir).ok, checkBrand(dir).errors);
}
// T-1: typefaces with their license, self-hosted.
{
  const b = JSON.parse(JSON.stringify(brand));
  b.typefaces[0].license = "Apache-2.0";
  b.typefaces.push({ id: "remote", family: "Roboto", source: "remote", url: "https://fonts.googleapis.com/css2?family=Roboto", license: "OFL-1.1" }, { id: "nolicense", family: "Mystery", source: "self-hosted", files: ["public/fonts/missing.woff2"] });
  await R("marketing/brand", "write", b, { actor: "person" });
  const e = checkBrand(dir).errors;
  expect("T-1: a typeface's license must match its registered files", has(e, /typeface inter: licensed Apache-2.0, but public\/assets\.json says public\/fonts\/inter\.woff2 is OFL-1.1/));
  expect("T-1: a remote typeface fails: the browser would make an outside request", has(e, /typeface remote: served from https:\/\/fonts\.googleapis\.com/));
  expect("T-1: a typeface with no license fails, and so does a missing file", has(e, /typeface nolicense: no license/) && has(e, /missing\.woff2 is not there/));
  b.typefaces = brand.typefaces; b.fonts = { body: "ghost" }; b.scopes = [{ for: "investors", fonts: { body: "phantom" } }, { for: "investors" }];
  await R("marketing/brand", "write", b, { actor: "person" });
  const e2 = checkBrand(dir).errors;
  expect("T-2: a font role naming no typeface fails, at the root and in a scope", has(e2, /fonts\.body: no typeface ghost/) && has(e2, /scope investors: fonts\.body names no typeface phantom/));
  expect("Y-5: a scope declared twice fails", has(e2, /scope investors is declared twice/));
}
// P-24: marks.
{
  const b = JSON.parse(JSON.stringify(brand));
  put("public/big.png", png(200, 100));
  mentura("assets", "add", "public/big.png", "--venture", "acme", "--source", "Acme", "--license", "owned", "--credit", "Acme", "--decorative");
  put("public/unlisted.svg", svg('width="10" height="10"'));
  b.marks = [{ kind: "apple-icon", asset: "public/big.png" }, { kind: "icon", asset: "public/big.png" }, { kind: "favicon", asset: "public/icon.png" }, { kind: "logo", asset: "public/unlisted.svg" }];
  await R("marketing/brand", "write", b, { actor: "person" });
  const e = checkBrand(dir).errors;
  expect("P-24: an apple-icon is 180x180", has(e, /apple-icon: public\/big\.png is 200x100/));
  expect("P-24: an icon is square", has(e, /mark icon: public\/big\.png is 200x100; an icon is square/));
  expect("P-24: a favicon is an ICO", has(e, /mark favicon: public\/icon\.png is png/));
  expect("P-24: a mark must be a registered asset", has(e, /mark logo: public\/unlisted\.svg has no entry/));
  rmSync(join(dir, "public/unlisted.svg"));
}
// Y-4: design systems are linked, not copied.
{
  const b = JSON.parse(JSON.stringify(brand));
  b.design_systems = [{ id: "acme-ds", name: "Big Corp DS", url: "vendor/bigcorp", license: "proprietary" }, { id: "radix", name: "Radix Colors", url: "https://www.radix-ui.com/colors", license: "MIT" }];
  await R("marketing/brand", "write", b, { actor: "person" });
  put("public/ds-button.svg", svg('width="10" height="10"'));
  put("public/radix.svg", svg('width="10" height="10"'));
  mentura("assets", "add", "public/ds-button.svg", "--venture", "acme", "--source", "Big Corp", "--license", "proprietary", "--credit", "Big Corp", "--decorative", "--design-system", "acme-ds");
  mentura("assets", "add", "public/radix.svg", "--venture", "acme", "--source", "Radix", "--license", "MIT", "--credit", "WorkOS", "--decorative", "--design-system", "radix");
  const e = checkBrand(dir).errors;
  expect("Y-4: a design system must be a link", has(e, /design system acme-ds: vendor\/bigcorp is not a link/));
  expect("Y-4: a file copied from a design system whose license does not allow it fails", has(e, /public\/ds-button\.svg: a copy from design system acme-ds/) && !has(e, /radix\.svg/));
  await R("marketing/brand", "write", brand, { actor: "person" });
  const x = reg(); x.assets = x.assets.filter((q) => !["public/ds-button.svg", "public/radix.svg"].includes(q.path)); await R("public/assets", "write", x);
  rmSync(join(dir, "public/ds-button.svg")); rmSync(join(dir, "public/radix.svg"));
}
// Y-2: package glossaries.
{
  const g = (pkg, terms) => R(`glossary/${pkg}`, "write", { package: pkg, terms }, { actor: "person" });
  let w = await g("finance", [{ term: "burn multiple", meaning: "net burn divided by net new ARR" }, { term: "runway", meaning: "months of cash at the current burn", export: true }]);
  expect("Y-2: a package glossary is written at glossary/<package>.json", w.ok && w.result.written === "glossary/finance.json", w.error);
  await g("marketing", [{ term: "hero", meaning: "the first section of a page" }, { term: "runway", meaning: "the strip models walk on" }]);
  const m = termsFor(dir, "marketing");
  expect("Y-2: a package sees its own terms and exported ones, not other packages' local terms", m.terms.some((t) => t.term === "hero") && !m.terms.some((t) => t.term === "burn multiple") && m.hidden === 1);
  expect("Y-2: its own term wins over an exported one of the same name", m.terms.find((t) => t.term === "runway").from === "marketing" && m.shadows[0].from === "finance");
  const t = await R("glossary/terms", "run", { value: "investors" });
  expect("Y-2: glossary/terms shows what another package sees", t.ok && t.result.terms.map((x) => x.term).join() === "runway", t.result);
  await g("investors", [{ term: "pro rata", meaning: "an investor's right to keep their share in the next round" }]);
  const lay = await R("investors", "layout");
  expect("Y-2: a layout carries the package's own terms", lay.ok && lay.result.brand.terms.some((x) => x.term === "pro rata") && lay.result.brand.terms.some((x) => x.term === "runway" && x.from === "finance"), lay.result?.brand);
  const lay2 = await R("marketing/sitemap", "layout");
  expect("Y-2: another package's layout does not", !lay2.result.brand.terms.some((x) => x.term === "pro rata" || x.term === "burn multiple"));
  put("marketing/content/home/hero.mdx", Buffer.from("---\nrecord: venture\n---\nOur burn multiple is low.\n"));
  expect("Y-2: public content using another package's local term is flagged", has(checkBrand(dir).warnings, /burn multiple" is a term local to finance/) && checkBrand(dir).ok);
  put("marketing/content/home/hero.mdx", Buffer.from("---\nrecord: venture\n---\nWe help clinics.\n"));
  await g("people", [{ term: "runway", meaning: "time until the next hire", export: true }]);
  expect("Y-2: two packages exporting one term with different meanings fail", has(checkBrand(dir).errors, /runway: exported by finance and people with different meanings/));
  writeFileSync(join(dir, "glossary/people.json"), JSON.stringify({ package: "finance", terms: [] }));
  expect("Y-2: a glossary names the package its file is for", has(checkBrand(dir).errors, /glossary\/people\.json: names package finance/));
  writeFileSync(join(dir, "glossary/people.json"), JSON.stringify({ package: "people", terms: [] }));
  expect("Y-2: fixed, the glossaries check out", checkBrand(dir).ok, checkBrand(dir).errors);
}

// ---- J-3: remote images.
{
  r = mentura("assets", "remote", "https://images.example.com/photos/clinic.jpg", "--venture", "acme", "--license", "all-rights-reserved", "--credit", "Ana Photo", "--alt", "A clinic waiting room");
  const id = "images-example-com-clinic";
  expect("J-3: a remote image becomes a raw source with its link", r.status === 0 && JSON.parse(readFileSync(join(dir, "raw/sources", id, "source.json"), "utf8")).origin === "https://images.example.com/photos/clinic.jpg", r.stderr);
  expect("J-3: with a note beside it, saying a full copy stays private", /A full copy stays private/.test(readFileSync(join(dir, "raw/sources", id, "text.md"), "utf8")));
  expect("J-3: the register lists it under remote; nothing was fetched", reg().remote[0].id === id && !reg().remote[0].fetched && checkAssets(dir).ok, checkAssets(dir).errors);
  const again = await R(`raw/sources/${id}`, "write", { id, origin: "https://elsewhere.example/x.jpg" });
  expect("J-3: the raw source is immutable", !again.ok && /immutable/.test(again.error));
  // A copy in public/ under a license that does not allow it.
  put("public/clinic.jpg", jpeg(800, 600));
  mentura("assets", "add", "public/clinic.jpg", "--venture", "acme", "--source", "https://images.example.com/photos/clinic.jpg", "--license", "all-rights-reserved", "--credit", "Ana Photo", "--alt", "A clinic waiting room", "--origin-url", "https://images.example.com/photos/clinic.jpg");
  expect("J-3: a full copy under all-rights-reserved fails the check", has(checkAssets(dir).errors, /public\/clinic\.jpg: a full copy of https:\/\/images\.example\.com\/photos\/clinic\.jpg under license all-rights-reserved/));
  const x = reg(); x.assets = x.assets.filter((q) => q.path !== "public/clinic.jpg"); await R("public/assets", "write", x);
  rmSync(join(dir, "public/clinic.jpg"));
  expect("J-3: removed, the check passes", checkAssets(dir).ok, checkAssets(dir).errors);
}
// J-3: what a fetcher records. Fetching is not Naive's (an app's fetcher runs outside it); a fetcher hands its
// result to Naive's addAsset and addRemote, which this test calls directly, as a fetcher would.
{
  const photo = png(640, 360);
  const host = "images.example.net";
  const base = `https://${host}`;
  r = mentura("assets", "hosts", host, "--venture", "acme", "--as", "person");
  expect("J-3: remote_hosts is set as a setting in the register", r.status === 0 && reg().remote_hosts[0] === host, r.stderr);
  const ignored = spawnSync("git", ["check-ignore", "-q", "--no-index", "ventures/x/raw/sources/hero-photo/original.png"], { cwd: repo });
  expect("J-3: raw originals are ignored by git", ignored.status === 0);
  const facts = factsOf(photo);
  const fetched = { type: facts.type, width: facts.width, height: facts.height, bytes: facts.bytes, sha256: facts.sha256, filled_at: "2026-11-05T00:00:00.000Z" };
  put("public/photo.png", photo);
  const a = await addAsset(/** @type {Parameters<typeof addAsset>[0]} */ ({ venture: "acme", workspace: W, path: "public/photo.png", source: `${base}/a.png`, license: "CC-BY-4.0", credit: "Ana Photo", alt: "Clinic front desk", origin_url: `${base}/a.png` }));
  const rem = await addRemote({ venture: "acme", workspace: W, url: `${base}/a.png`, license: "CC-BY-4.0", credit: "Ana Photo", id: "cc-photo", alt: "Clinic front desk", fetched, copy: "public/photo.png" });
  expect("J-3: a license that allows a copy keeps one in public/, registered with its origin", a.ok && rem.ok && reg().assets.find((q) => q.path === "public/photo.png")?.origin_url === `${base}/a.png` && reg().remote.find((q) => q.id === "cc-photo").copy === "public/photo.png", a.error ?? rem.error);
  expect("J-4: the fetched image's facts are kept in the register", reg().remote.find((q) => q.id === "cc-photo").fetched.sha256 === factsOf(photo).sha256);
  const c = checkAssets(dir);
  expect("J-3: the register checks out with fetched and copied images", c.ok, c.errors);
  const y = reg(); y.remote_hosts = []; await R("public/assets", "write", y);
  expect("J-3: a fetched image from a host no longer allowed fails the check", has(checkAssets(dir).errors, /fetched from images\.example\.net, which is not in remote_hosts/));
  y.remote_hosts = [host]; await R("public/assets", "write", y);
  const z = reg(); z.remote = z.remote.map((q) => q.id === "cc-photo" ? { ...q, license: "all-rights-reserved" } : q); await R("public/assets", "write", z);
  expect("J-3: a copy under a license that does not allow one fails the check", has(checkAssets(dir).errors, /copied to public\/photo\.png under license all-rights-reserved/));
  z.remote = z.remote.map((q) => q.id === "cc-photo" ? { ...q, license: "CC-BY-4.0" } : q); await R("public/assets", "write", z);
}

// ---- P-26: the sitemap is a marketing record; sitemap.xml comes from it.
{
  const none = await R("marketing/sitemap/xml", "run", { value: "https://acme.example" });
  expect("P-26: with no marketing sitemap there is no sitemap.xml", !none.ok && /no marketing sitemap yet/.test(none.error));
  const plan = await R("operations/marketing/sitemap", "run");
  expect("P-26: the planner plans the site from the records", plan.ok && plan.result.pages.length > 0, plan.error);
  const w = await R("marketing/sitemap", "write", plan.result);
  expect("P-26: the plan is written as the marketing sitemap record", w.ok && w.result.written === "marketing/sitemap.json", w.error);
  const x = await R("marketing/sitemap/xml", "run", { value: "https://acme.example/" });
  const locs = [...(x.result?.xml ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  expect("P-26: sitemap.xml lists the planned pages, home first", x.ok && locs[0] === "https://acme.example/" && locs.length === plan.result.pages.length && /xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"/.test(x.result.xml), x.result ?? x.error);
  expect("P-26: from the record, not the framework's routes", !locs.some((l) => /marketing\/sitemap|public\/assets|system\//.test(l)));
  const bad = await R("marketing/sitemap/xml", "run", { value: "acme.example" });
  expect("P-26: a base that is not a URL fails", !bad.ok && /not a URL/.test(bad.error));
  r = mentura("brand", "sitemap", "--venture", "acme", "--base", "https://acme.example", "--out", join(ws, "out/sitemap.xml"));
  expect("P-26: mentura brand sitemap --out writes the file for a release", r.status === 0 && /<urlset/.test(readFileSync(join(ws, "out/sitemap.xml"), "utf8")), r.stderr);
  expect("P-26: escaping", /&amp;/.test(sitemapXml({ pages: [{ path: "/a&b", level: "nav" }] }, "https://x.example")));
}

// ---- The same routes over MCP, as an agent reaches them.
{
  process.env.MENTURA_WORKSPACE = W;
  const { handle } = await import("../mcp/server.mjs");
  const mcp = async (name, args) => (await handle({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } })).result;
  const t = await mcp("mentura_run", { venture: "acme", route: "marketing/brand/tokens" });
  expect("Y-3 over MCP: an agent reads the brand tokens", !t.isError && /--color-accent: #1d4e89/.test(JSON.parse(t.content[0].text).css), t.content?.[0]?.text?.slice(0, 200));
  const l = await mcp("mentura_layout", { venture: "acme", route: "marketing/content" });
  expect("Y-3 over MCP: an agent's layout carries the voice rules", !l.isError && JSON.parse(l.content[0].text).brand.voice[0].avoid.includes("synergy"));
  const f = await mcp("mentura_run", { venture: "acme", route: "public/assets/facts" });
  expect("J-4 over MCP: an agent reads facts from code", !f.isError && JSON.parse(f.content[0].text).facts.some((x) => x.path === "public/photo.png" && x.width === 640));
  delete process.env.MENTURA_WORKSPACE;
}

// ---- The whole venture: brand, assets and provenance hold together.
{
  expect("the brand check passes on the finished venture", checkBrand(dir).ok, checkBrand(dir).errors);
  expect("the assets check passes on the finished venture", checkAssets(dir).ok, checkAssets(dir).errors);
  const p = spawnSync("node", [join(repo, "packages/naive/src/checks/check-provenance.mjs"), dir], { encoding: "utf8" });
  expect("every write and confirmation kept the provenance chain", p.status === 0, p.stdout + p.stderr);
  for (const f of ["marketing/brand.json", "public/assets.json", "glossary/finance.json", "raw/sources/cc-photo/source.json", "marketing/sitemap.json"]) {
    const map = { "marketing/brand.json": "marketing-brand.schema.json", "public/assets.json": "public-assets.schema.json", "glossary/finance.json": "glossary.schema.json", "raw/sources/cc-photo/source.json": "raw-source.schema.json", "marketing/sitemap.json": "marketing-sitemap.schema.json" };
    const v = spawnSync("python3", [join(repo, "packages/naive/src/records/validate.py"), "--schema", map[f], "--file", join(dir, f)], { encoding: "utf8" });
    expect(`${f} validates against its schema`, v.status === 0, v.stdout + v.stderr);
  }
  expect("tokens() is null without a brand", tokens(join(ws, "nowhere"), null) === null);
}

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
