// The brand and asset verbs of the CLI (mentura brand ..., mentura assets ...). Every write goes
// through the router, so it is checked against its schema and logged in provenance; the logic lives
// in schema/brand.mjs and schema/assets.mjs.
//
//   mentura assets add <public/file> --venture <id> --source <who or url> --license <id> --credit <who>
//                                     [--alt <text>] [--decorative] [--as person]
//                                     register a file in public/; code fills its facts (J-2, J-4)
//   mentura assets fill --venture <id>          refill every entry's facts from its file, by code (J-4)
//   mentura assets alt <public/file> --text <alt> --venture <id> [--as person]
//                                     write alt text; an agent's waits for a person to confirm it
//   mentura assets confirm <public/file> --venture <id> --by <name> [--confirm <public/file>]
//                                     a person confirms the alt text as it stands (J-4)
//   mentura assets remote <url> --venture <id> --license <id> --credit <who> [--id <raw id>] [--alt <text>] [--note <text>]
//                                     record a remote image as a link with a note in raw/ (J-3)
//   mentura assets hosts <host,host> --venture <id>   set the hosts an agent may fetch from (J-3)
//   mentura assets check|facts --venture <id>
//   mentura brand tokens|css|head|check|voice --venture <id> [--json]
//   mentura brand resolve <route> --venture <id>      the brand at a route, nearer context winning (Y-5, T-2)
//   mentura brand terms <package> --venture <id>      the terms a package sees (Y-2)
//   mentura brand sitemap --venture <id> --base <url> [--out <file>]   sitemap.xml from the marketing sitemap (P-26)

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { call, ventureDir } from "./router.mjs";
import { agentFromEnv, record as prov } from "../packages/core/provenance.mjs";
import { altStatement, checkAssets, facts as allFacts, factsOf, REGISTER, registerOf } from "../schema/assets.mjs";
import { brandOf, checkBrand, resolveBrand, sitemapOf, sitemapXml, termsFor, tokens, voice } from "../schema/brand.mjs";
import { ventureFile } from "../packages/core/venture-paths.mjs";

const VERSION = "0.1.0";
const today = () => new Date().toISOString();

/** The facts code reads, in the register's shape. */
export const factsFor = (dir, path) => {
  const f = factsOf(readFileSync(ventureFile(dir, path)));
  return Object.fromEntries(Object.entries({ type: f.type, width: f.width, height: f.height, sizes: f.sizes, bytes: f.bytes, sha256: f.sha256, filled_at: today() }).filter(([, v]) => v !== undefined));
};

const emptyRegister = () => ({ version: VERSION, assets: [] });

/**
 * Writes the register through the router: schema first, then provenance.
 * @param {string} venture @param {string | undefined} workspace @param {*} reg @param {{ actor?: string, note?: string }} [opts]
 */
export async function writeRegister(venture, workspace, reg, { actor = "agent", note } = {}) {
  return call({ venture, route: "public/assets", action: "write", input: reg, actor, workspace, via: "cli", provenance: { note } });
}

/** Registers one file in public/ with its source, license and credit; code fills its facts. */
export async function addAsset({ venture, workspace, path, source, license, credit, alt, decorative, origin_url, design_system, actor = "agent" }) {
  const dir = ventureDir(venture, workspace);
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  if (!path?.startsWith("public/")) return { ok: false, error: `${path} is not in public/` };
  if (!existsSync(ventureFile(dir, path))) return { ok: false, error: `${path} is not in ${venture}` };
  const reg = registerOf(dir) ?? emptyRegister();
  const entry = Object.fromEntries(Object.entries({ path, source, license, credit, alt: alt ? { text: alt, by: actor === "person" ? "person" : "agent" } : undefined, decorative: decorative || undefined, origin_url, design_system, facts: factsFor(dir, path) }).filter(([, v]) => v !== undefined));
  reg.assets = [...reg.assets.filter((a) => a.path !== path), entry].sort((a, b) => a.path.localeCompare(b.path));
  const w = await writeRegister(venture, workspace, reg, { actor, note: `registered ${path}; facts read by code` });
  if (w.ok && alt && actor === "person") prov(dir, { entity: REGISTER, route: "public/assets", activity: "confirm", statement: altStatement(path, alt), agent: agentFromEnv("person", "cli"), note: `alt text of ${path} written by a person` });
  return w.ok ? { ok: true, result: { registered: path, facts: entry.facts, alt: entry.alt ?? null } } : w;
}

/** Refills every entry's facts from its file. Only code writes facts. */
export async function fill({ venture, workspace }) {
  const dir = ventureDir(venture, workspace);
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  const reg = registerOf(dir);
  if (!reg) return { ok: false, error: `${venture} has no ${REGISTER}; register a file first: mentura assets add public/<file> ...` };
  const changed = [], missing = [];
  for (const a of reg.assets) {
    if (!existsSync(ventureFile(dir, a.path))) { missing.push(a.path); continue; }
    const f = factsFor(dir, a.path);
    if (!a.facts || ["type", "width", "height", "bytes", "sha256"].some((k) => (a.facts[k] ?? null) !== (f[k] ?? null))) { a.facts = f; changed.push(a.path); }
  }
  const listed = new Set(reg.assets.map((a) => a.path));
  const unregistered = allFacts(dir).map((x) => x.path).filter((p) => !listed.has(p));
  if (changed.length) { const w = await writeRegister(venture, workspace, reg, { note: `facts filled by code: ${changed.join(", ")}` }); if (!w.ok) return w; }
  return { ok: true, result: { filled: changed, missing, unregistered } };
}

/** Writes alt text. An agent's carries agent provenance until a person confirms it; a person's is confirmed as written. */
export async function setAlt({ venture, workspace, path, text, actor = "agent" }) {
  const dir = ventureDir(venture, workspace);
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  const reg = registerOf(dir);
  const a = reg?.assets.find((x) => x.path === path);
  if (!a) return { ok: false, error: `${path} is not registered; mentura assets add ${path} first` };
  a.alt = { text, by: actor === "person" ? "person" : "agent" };
  const w = await writeRegister(venture, workspace, reg, { actor, note: `alt text of ${path} by ${a.alt.by}` });
  if (!w.ok) return w;
  if (actor === "person") prov(dir, { entity: REGISTER, route: "public/assets", activity: "confirm", statement: altStatement(path, text), agent: agentFromEnv("person", "cli"), note: `alt text of ${path} written by a person` });
  return { ok: true, result: { path, alt: a.alt, confirmed: actor === "person" } };
}

/** A person confirms an alt text exactly as it stands. The confirmation is bound to the text: change it and it is pending again. */
export function confirmAlt({ venture, workspace, path, by }) {
  const dir = ventureDir(venture, workspace);
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  if (!by) return { ok: false, error: "say who is confirming: --by <name>" };
  const a = registerOf(dir)?.assets.find((x) => x.path === path);
  if (!a?.alt?.text) return { ok: false, error: `${path} has no alt text to confirm` };
  const e = prov(dir, { entity: REGISTER, route: "public/assets", activity: "confirm", statement: altStatement(path, a.alt.text), agent: agentFromEnv("person", "cli", { id: by }), note: `${by} confirmed the alt text of ${path}: ${a.alt.text}` });
  return { ok: true, result: { path, alt: a.alt.text, confirmed_by: by, provenance: e.hash } };
}

const rawId = (url) => {
  const u = new URL(url);
  const slug = `${u.host}-${u.pathname.split("/").filter(Boolean).pop() ?? "image"}`.toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug.slice(0, 60) || "remote-image";
};

/**
 * A remote image as a link with a note in raw/ (J-3): raw/sources/<id>/source.json says where it is,
 * text.md is the note, and the register lists it under remote. Nothing is fetched here. The platform
 * fetcher passes `fetched` (facts of the private original) and `copy` when it kept a public copy.
 * @param {{ venture: string, workspace?: string, url: string, license?: string, credit?: string, id?: string, alt?: string, note?: string, fetched?: { type?: string, width?: number, height?: number, bytes?: number, sha256?: string }, copy?: string, actor?: string }} opts
 */
export async function addRemote({ venture, workspace, url, license, credit, id, alt, note, fetched, copy, actor = "agent" }) {
  const dir = ventureDir(venture, workspace);
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  try { new URL(url); } catch { return { ok: false, error: `${url} is not a URL` }; }
  const rid = id ?? rawId(url);
  const reg = registerOf(dir) ?? emptyRegister();
  if (!existsSync(join(ventureFile(dir, "raw/sources"), rid, "source.json"))) {
    const w = await call({ venture, route: `raw/sources/${rid}`, action: "write", input: { id: rid, origin: url, title: `Remote image at ${new URL(url).host}`, fetched: today().slice(0, 10) }, actor, workspace, via: "cli", provenance: { note: "a remote image, kept as a link (J-3)" } });
    if (!w.ok) return w;
    const text = [`# Remote image`, "", `- Link: ${url}`, `- Host: ${new URL(url).host}`, `- License: ${license}`, `- Credit: ${credit ?? "(missing)"}`, ...(fetched ? [`- Fetched: ${fetched.type}${fetched.width ? `, ${fetched.width}x${fetched.height}` : ""}, ${fetched.bytes} bytes, sha256 ${fetched.sha256}`] : []), "",
      copy ? `A copy is kept at ${copy}: the license allows it.` : "The venture links to this image. A full copy stays private (raw/sources/<id>/original.*, out of git) unless the license allows one.", ...(note ? ["", note] : []), ""].join("\n");
    writeFileSync(join(ventureFile(dir, "raw/sources"), rid, "text.md"), text);
    prov(dir, { entity: `raw/sources/${rid}/text.md`, route: `raw/sources/${rid}`, activity: "write", agent: agentFromEnv(actor === "person" ? "person" : "agent", "cli"), note: "the note beside a remote image (J-3)" });
  }
  const entry = Object.fromEntries(Object.entries({ id: rid, url, license, credit, alt: alt ? { text: alt, by: actor === "person" ? "person" : "agent" } : undefined, fetched, copy }).filter(([, v]) => v !== undefined));
  reg.remote = [...(reg.remote ?? []).filter((r) => r.url !== url), entry];
  const w = await writeRegister(venture, workspace, reg, { actor, note: `remote image ${url}` });
  return w.ok ? { ok: true, result: { remote: url, raw: `raw/sources/${rid}/`, copy: copy ?? null } } : w;
}

/** The hosts an agent may fetch from, a setting the platform fetcher enforces (J-3). */
export async function setHosts({ venture, workspace, hosts, actor = "agent" }) {
  const dir = ventureDir(venture, workspace);
  if (!dir) return { ok: false, error: `no venture ${venture}` };
  const reg = registerOf(dir) ?? emptyRegister();
  reg.remote_hosts = hosts;
  const w = await writeRegister(venture, workspace, reg, { actor, note: `hosts an agent may fetch from: ${hosts.join(", ") || "none"}` });
  return w.ok ? { ok: true, result: { remote_hosts: hosts } } : w;
}

/** mentura brand ... and mentura assets ...: returns the exit code. @param {string[]} argv @param {{ workspace?: string }} [opts] */
export async function main(argv, { workspace } = {}) {
  const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
  const flag = (n) => argv.includes(`--${n}`);
  const pos = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--") && !["json", "decorative"].includes(argv[i - 1].slice(2))));
  const [group, verb, arg] = pos;
  const venture = opt("venture");
  const actor = opt("as") === "person" ? "person" : "agent";
  const show = (r, text) => {
    if (!r.ok) { console.error(r.error ?? JSON.stringify(r, null, 2)); return 1; }
    console.log(flag("json") || text === undefined ? JSON.stringify(r.result, null, 2) : text);
    return 0;
  };
  if (!venture) { console.error(`mentura ${group} ${verb ?? ""}: --venture <id> is required`); return 2; }
  const dir = ventureDir(venture, workspace);
  if (!dir) { console.error(`no venture ${venture}`); return 1; }

  if (group === "assets") {
    if (verb === "add") return show(await addAsset({ venture, workspace, path: arg, source: opt("source"), license: opt("license"), credit: opt("credit"), alt: opt("alt"), decorative: flag("decorative"), origin_url: opt("origin-url"), design_system: opt("design-system"), actor }), `registered: ${arg}`);
    if (verb === "fill") { const r = await fill({ venture, workspace }); return show(r, r.ok ? `filled: ${r.result.filled.length ? r.result.filled.join(", ") : "nothing changed"}${r.result.unregistered.length ? `\nnot registered: ${r.result.unregistered.join(", ")}` : ""}` : undefined); }
    if (verb === "alt") return show(await setAlt({ venture, workspace, path: arg, text: opt("text"), actor }), `alt text of ${arg} written by ${actor}${actor === "agent" ? "; a person confirms it with mentura assets confirm" : ""}`);
    if (verb === "confirm") {
      // The person types the path to confirm, as with foundation statements (EE-051).
      if (opt("confirm") !== arg) { console.error(`not confirmed: pass --confirm ${arg} to confirm the alt text of ${arg} as it stands`); return 1; }
      return show(confirmAlt({ venture, workspace, path: arg, by: opt("by") ?? process.env.MENTURA_PERSON }), `confirmed: alt text of ${arg}`);
    }
    if (verb === "remote") return show(await addRemote({ venture, workspace, url: arg, license: opt("license"), credit: opt("credit"), id: opt("id"), alt: opt("alt"), note: opt("note"), actor }), `linked: ${arg}`);
    if (verb === "hosts") return show(await setHosts({ venture, workspace, hosts: (arg ?? "").split(",").map((h) => h.trim()).filter(Boolean), actor }), `remote_hosts: ${arg ?? "none"}`);
    if (verb === "facts") return show({ ok: true, result: allFacts(dir) }, allFacts(dir).map((x) => `${x.path}  ${x.type}${x.width ? ` ${x.width}x${x.height}` : ""}  ${x.bytes} bytes`).join("\n") || "public/ is empty");
    if (verb === "check") {
      const r = checkAssets(dir);
      if (flag("json")) console.log(JSON.stringify(r, null, 2));
      else { for (const e of r.errors) console.log(`error    ${e}`); for (const p of r.pending) console.log(`pending  ${p.path}: alt text by ${p.by}, not confirmed by a person`); console.log(r.ok ? `assets: ${r.assets} files, ${r.remote} remote links, ${r.pending.length} alt texts pending` : `assets: ${r.errors.length} errors`); }
      return r.ok ? 0 : 1;
    }
  }

  if (group === "brand") {
    const brand = brandOf(dir);
    const need = () => { console.error(`${venture} has no brand yet: write marketing/brand.json (mentura marketing/brand template)`); return 1; };
    if (verb === "tokens" || verb === "css" || verb === "head") {
      if (!brand) return need();
      const t = tokens(dir, brand);
      return show({ ok: true, result: verb === "tokens" ? t.tokens : verb === "head" ? t.head : t.css }, verb === "css" ? t.css.trimEnd() : undefined);
    }
    if (verb === "resolve") { if (!brand) return need(); return show({ ok: true, result: resolveBrand(brand, arg ?? "") }); }
    if (verb === "terms") { const t = termsFor(dir, arg); return show({ ok: true, result: t }, t.terms.map((x) => `${x.term}  (${x.from}): ${x.meaning}`).join("\n") || `no terms reach ${arg}`); }
    if (verb === "voice") {
      const v = opt("text") !== undefined ? { violations: (await import("../schema/brand.mjs")).voiceCheck(opt("text"), brand ? resolveBrand(brand, opt("for") ?? "").voice.rules : []) } : voice(dir, brand);
      const lines = v.violations.map((x) => `${x.file ? `${x.file}:` : "line "}${x.line}  "${x.found}" breaks ${x.rule}${x.use ? `; use "${x.use}"` : ""}`);
      if (flag("json")) console.log(JSON.stringify(v, null, 2)); else console.log(lines.join("\n") || "keeps to the voice rules");
      return v.violations.length ? 1 : 0;
    }
    if (verb === "check") {
      const r = checkBrand(dir);
      if (flag("json")) console.log(JSON.stringify(r, null, 2));
      else { for (const e of r.errors) console.log(`error  ${e}`); for (const w of r.warnings) console.log(`warn   ${w}`); console.log(r.ok ? "brand: ok" : `brand: ${r.errors.length} errors`); }
      return r.ok ? 0 : 1;
    }
    if (verb === "sitemap") {
      const s = sitemapOf(dir);
      if (!s) { console.error(`${venture} has no marketing sitemap yet: mentura operations/marketing/sitemap run, then write it to marketing/sitemap`); return 1; }
      let xml;
      try { xml = sitemapXml(s.record, opt("base") ?? ""); } catch (e) { console.error(`${e.message}; pass --base https://<your site>`); return 1; }
      if (opt("out")) { const f = resolvePath(opt("out")); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, xml); console.log(`wrote ${opt("out")}: ${s.record.pages.length} pages from ${s.file}`); return 0; }
      process.stdout.write(xml);
      return 0;
    }
  }
  console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   mentura")).map((l) => l.slice(5)).join("\n"));
  return 2;
}
