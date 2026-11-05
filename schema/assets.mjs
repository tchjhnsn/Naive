#!/usr/bin/env node
// Assets in public/ (I-23, J-2, J-3, J-4): the files a venture ships as they are, each with a source,
// a license and a credit, the way raw sources answer where they came from. The register is
// public/assets.json (schema/public-assets.schema.json). Rendering work (sizes, lazy loading) is the
// interface's; the framework's part is rights and facts.
//
//   J-2  every file in public/ has a register entry naming its source and license
//   J-3  a remote image is a link with a note in raw/sources/<id>/; a full copy in public/ needs a
//        license that allows copying. remote_hosts is the list of hosts an agent may fetch from
//        (an app's fetcher enforces it and records what it fetched through interface/brand.mjs addRemote)
//   J-4  facts (type, width, height, bytes, sha256) are read from the file by code, never guessed:
//        the check fails when recorded facts differ from the file. Alt text an agent wrote carries
//        agent provenance until a person confirms it (a confirm entry in provenance.jsonl, bound
//        to the exact text); a missing credit fails the check
//
// No model is called and nothing here reaches the network.
//
//   node schema/assets.mjs <venture dir> facts [--json]       the facts code reads from each file in public/
//   node schema/assets.mjs <venture dir> check [--json]       the register check (also schema/check-assets.mjs)

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { entries } from "../packages/core/provenance.mjs";
import { ventureFile } from "../packages/core/venture-paths.mjs";

export const REGISTER = "public/assets.json";
const load = (p) => JSON.parse(readFileSync(p, "utf8"));

// ---------------------------------------------------------------------------------------------
// Facts read from the bytes. The type comes from the file's signature, not its name.

const EXT = { png: ["png"], gif: ["gif"], jpeg: ["jpg", "jpeg"], webp: ["webp"], ico: ["ico"], svg: ["svg"], pdf: ["pdf"], woff2: ["woff2"], woff: ["woff"], ttf: ["ttf"], otf: ["otf"] };
export const IMAGE = new Set(["png", "gif", "jpeg", "webp", "ico", "svg"]);
export const FONT = new Set(["woff2", "woff", "ttf", "otf"]);
export const MIME = { png: "image/png", gif: "image/gif", jpeg: "image/jpeg", webp: "image/webp", ico: "image/x-icon", svg: "image/svg+xml", pdf: "application/pdf", woff2: "font/woff2", woff: "font/woff", ttf: "font/ttf", otf: "font/otf" };

const ascii = (b, s, n) => b.subarray(s, s + n).toString("latin1");

function jpegSize(b) {
  let i = 2;
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    i += 2 + b.readUInt16BE(i + 2);
  }
  return {};
}

function webpSize(b) {
  const chunk = ascii(b, 12, 4);
  if (chunk === "VP8 " && b.length >= 30) return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L" && b.length >= 25) {
    const [b0, b1, b2, b3] = [b[21], b[22], b[23], b[24]];
    return { width: 1 + (((b1 & 0x3f) << 8) | b0), height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)) };
  }
  if (chunk === "VP8X" && b.length >= 30) return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
  return {};
}

function svgSize(text) {
  const tag = text.match(/<svg\b[^>]*>/i)?.[0] ?? "";
  const attr = (n) => tag.match(new RegExp(`\\s${n}\\s*=\\s*["']\\s*([0-9.]+)(px)?\\s*["']`, "i"));
  const w = attr("width"), h = attr("height");
  if (w && h) return { width: Math.round(Number(w[1])), height: Math.round(Number(h[1])) };
  const vb = tag.match(/viewBox\s*=\s*["']\s*[-0-9.]+[\s,]+[-0-9.]+[\s,]+([0-9.]+)[\s,]+([0-9.]+)\s*["']/i);
  return vb ? { width: Math.round(Number(vb[1])), height: Math.round(Number(vb[2])) } : {};
}

/** What the bytes say: type, width and height for images, the sizes an icon holds, bytes and sha256. */
export function factsOf(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  let type = "unknown", dims = {}, sizes;
  if (b.length >= 24 && b[0] === 0x89 && ascii(b, 1, 3) === "PNG") { type = "png"; dims = { width: b.readUInt32BE(16), height: b.readUInt32BE(20) }; }
  else if (b.length >= 10 && /^GIF8[79]a$/.test(ascii(b, 0, 6))) { type = "gif"; dims = { width: b.readUInt16LE(6), height: b.readUInt16LE(8) }; }
  else if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) { type = "jpeg"; dims = jpegSize(b); }
  else if (b.length >= 16 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") { type = "webp"; dims = webpSize(b); }
  else if (b.length >= 6 && b.readUInt16LE(0) === 0 && b.readUInt16LE(2) === 1 && b.readUInt16LE(4) > 0) {
    type = "ico";
    const n = b.readUInt16LE(4);
    sizes = [];
    for (let k = 0; k < n && 6 + 16 * k + 1 < b.length; k++) { const w = b[6 + 16 * k] || 256, h = b[7 + 16 * k] || 256; sizes.push(`${w}x${h}`); }
    const big = sizes.map((s) => s.split("x").map(Number)).sort((x, y) => y[0] * y[1] - x[0] * x[1])[0];
    if (big) dims = { width: big[0], height: big[1] };
  }
  else if (ascii(b, 0, 5) === "%PDF-") type = "pdf";
  else if (ascii(b, 0, 4) === "wOF2") type = "woff2";
  else if (ascii(b, 0, 4) === "wOFF") type = "woff";
  else if (ascii(b, 0, 4) === "OTTO") type = "otf";
  else if (b.length >= 4 && b.readUInt32BE(0) === 0x00010000) type = "ttf";
  else {
    const head = b.subarray(0, 4096).toString("utf8");
    if (/<svg\b/i.test(head)) { type = "svg"; dims = svgSize(b.toString("utf8")); }
  }
  return { type, ...(dims.width ? { width: dims.width, height: dims.height } : {}), ...(sizes ? { sizes } : {}), bytes: b.length, sha256: createHash("sha256").update(b).digest("hex") };
}

/** The file's extension agrees with what its bytes are. */
export const extensionFits = (path, type) => (EXT[type] ?? []).includes(extname(path).slice(1).toLowerCase());

// ---------------------------------------------------------------------------------------------
// Licenses. Copying a work into public/ (so a release ships it) needs a license that allows it.

const COPYABLE = ["cc0-1.0", "cc-by-4.0", "cc-by-3.0", "cc-by-sa-4.0", "cc-by-sa-3.0", "mit", "apache-2.0", "ofl-1.1", "bsd-2-clause", "bsd-3-clause", "isc", "unlicense", "public-domain", "owned", "licensed"];
/** Whether a license lets the venture keep and ship a full copy. Unknown, all-rights-reserved and editorial-only do not. */
export const allowsCopy = (license) => COPYABLE.includes(String(license ?? "").trim().toLowerCase());
export const LICENSES_THAT_COPY = COPYABLE;

/** A host allowlist entry matches a host exactly, or "*.example.com" matches any subdomain of it. */
export const hostAllowed = (host, hosts = []) => hosts.some((h) => h === host || (h.startsWith("*.") && host.endsWith(h.slice(1))));

/** The hash a person's confirmation of one alt text is bound to: the statement id in provenance. */
export const altStatement = (path, text) => `alt-${createHash("sha256").update(`${path}\n${text}`).digest("hex").slice(0, 16)}`;

// ---------------------------------------------------------------------------------------------
// The register and its check.

/** The files in public/, relative to the venture folder, without the register itself. */
export function publicFiles(dir) {
  const root = join(dir, "public");
  const walk = (d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name.startsWith(".") ? [] : e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]) : [];
  return walk(root).map((f) => f.slice(dir.length + 1)).filter((f) => f !== REGISTER).sort();
}

export const registerOf = (dir) => existsSync(ventureFile(dir, REGISTER)) ? load(ventureFile(dir, REGISTER)) : null;

/** The facts code reads from every file in public/. */
export function facts(dir) {
  return publicFiles(dir).map((path) => ({ path, ...factsOf(readFileSync(ventureFile(dir, path))) }));
}

/** Which alt texts a person has confirmed, from the provenance log. */
export function confirmedAlts(dir) {
  return new Set(entries(dir).filter((e) => e.activity === "confirm" && e.agent?.kind === "person" && e.statement?.startsWith("alt-")).map((e) => e.statement));
}

/**
 * The register check. errors fail it; pending lists alt text an agent wrote that no person has
 * confirmed yet (not an error: it ships with agent provenance until then).
 */
export function checkAssets(dir) {
  const errors = [], warnings = [], pending = [];
  const reg = registerOf(dir);
  const files = publicFiles(dir);
  if (!reg) {
    for (const f of files) errors.push(`${f}: no entry in ${REGISTER}, so nothing says where it came from or whether the venture may ship it (J-2)`);
    return { ok: !errors.length, errors, warnings, pending, assets: 0, remote: 0 };
  }
  const listed = new Map((reg.assets ?? []).map((a) => [a.path, a]));
  const confirmed = confirmedAlts(dir);
  const remoteByUrl = new Map((reg.remote ?? []).map((r) => [r.url, r]));
  for (const f of files) if (!listed.has(f)) errors.push(`${f}: no entry in ${REGISTER}, so nothing says where it came from or whether the venture may ship it (J-2)`);
  const seen = new Set();
  for (const a of reg.assets ?? []) {
    if (seen.has(a.path)) errors.push(`${a.path}: listed twice`);
    seen.add(a.path);
    if (!existsSync(ventureFile(dir, a.path))) { errors.push(`${a.path}: listed in ${REGISTER} but the file is not there`); continue; }
    const real = factsOf(readFileSync(ventureFile(dir, a.path)));
    if (String(a.license).trim().toLowerCase() === "unknown") errors.push(`${a.path}: the license is unknown; find it before the venture ships the file (J-2)`);
    if (!a.credit || !String(a.credit).trim()) errors.push(`${a.path}: no credit; say who made it (J-4)`);
    if (real.type !== "unknown" && !extensionFits(a.path, real.type)) errors.push(`${a.path}: the bytes are ${real.type}, the name says otherwise`);
    // Facts are code's: recorded facts must equal what the file says now.
    if (!a.facts) errors.push(`${a.path}: no facts yet; run mentura assets fill so code records them (J-4)`);
    else for (const k of ["type", "width", "height", "bytes", "sha256"]) if ((a.facts[k] ?? null) !== (real[k] ?? null)) { errors.push(`${a.path}: recorded ${k} ${a.facts[k] ?? "none"} is not the file's ${real[k] ?? "none"}; facts are filled by code, run mentura assets fill (J-4)`); break; }
    // Alt text: an image needs it unless it is decorative; an agent's stays pending until a person confirms it.
    if (IMAGE.has(real.type)) {
      if (!a.alt?.text && !a.decorative) errors.push(`${a.path}: an image with no alt text; write it, or mark it decorative (J-4)`);
      if (a.alt?.text) {
        const ok = confirmed.has(altStatement(a.path, a.alt.text));
        if (a.alt.by === "person" && !ok) errors.push(`${a.path}: alt text says a person wrote it, but provenance has no person's confirmation of this text (J-4)`);
        if (a.alt.by !== "person" && !ok) pending.push({ path: a.path, alt: a.alt.text, by: a.alt.by ?? "agent", confirm: `mentura assets confirm ${a.path} --by <name> --confirm ${a.path}` });
      }
    }
    // A copy of a remote work (J-3): its link must be in the register, and its license must allow a copy.
    if (a.origin_url) {
      const r = remoteByUrl.get(a.origin_url);
      if (!r) errors.push(`${a.path}: copied from ${a.origin_url}, which has no remote entry with a note in raw/ (J-3)`);
      if (!allowsCopy(a.license)) errors.push(`${a.path}: a full copy of ${a.origin_url} under license ${a.license}; keep it private (raw/sources/*/original.*) unless the license allows a copy (J-3)`);
    }
  }
  for (const r of reg.remote ?? []) {
    const src = join(ventureFile(dir, "raw/sources"), r.id, "source.json");
    if (!existsSync(src)) errors.push(`remote ${r.url}: no note in raw/sources/${r.id}/ (J-3)`);
    else if (load(src).origin !== r.url) errors.push(`remote ${r.url}: raw/sources/${r.id}/source.json names another origin`);
    let host = null;
    try { host = new URL(r.url).host; } catch { errors.push(`remote ${r.url}: not a URL`); }
    if (r.fetched && host && !hostAllowed(host, reg.remote_hosts ?? [])) errors.push(`remote ${r.url}: fetched from ${host}, which is not in remote_hosts, the hosts an agent may fetch from (J-3)`);
    if (!r.credit) errors.push(`remote ${r.url}: no credit; say who made it (J-4)`);
    if (r.copy && !allowsCopy(r.license)) errors.push(`remote ${r.url}: copied to ${r.copy} under license ${r.license}, which does not allow a copy (J-3)`);
    if (r.copy && !listed.has(r.copy)) errors.push(`remote ${r.url}: copied to ${r.copy}, which is not in the register`);
  }
  return { ok: !errors.length, errors, warnings, pending, assets: (reg.assets ?? []).length, remote: (reg.remote ?? []).length };
}

// ---------------------------------------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, mode = "check"] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const json = process.argv.includes("--json");
  if (!dir || !existsSync(join(dir, "venture.json")) || !statSync(dir).isDirectory()) { console.error("usage: node schema/assets.mjs <venture dir> facts|check [--json]"); process.exit(2); }
  if (mode === "facts") { const f = facts(dir); console.log(json ? JSON.stringify({ facts: f }, null, 2) : f.map((x) => `${x.path}  ${x.type}${x.width ? ` ${x.width}x${x.height}` : ""}  ${x.bytes} bytes`).join("\n") || "public/ is empty"); process.exit(0); }
  const r = checkAssets(dir);
  if (json) console.log(JSON.stringify(r, null, 2));
  else {
    for (const e of r.errors) console.log(`error  ${e}`);
    for (const p of r.pending) console.log(`pending  ${p.path}: alt text by ${p.by}, not confirmed by a person`);
    console.log(r.ok ? `assets: ${r.assets} files and ${r.remote} remote links have a source, license, credit and facts` : `assets: ${r.errors.length} errors`);
  }
  process.exit(r.ok ? 0 : 1);
}
