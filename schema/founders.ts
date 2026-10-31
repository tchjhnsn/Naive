// Founders before ventures (Torian, 2026-10-31): a founder is a person of the workspace, with a folder of
// their own above every venture. The founder owns their ideas, the references that form them, the people who
// inspire them and their secrets; a venture links to its founder by role instead of owning any of it.
//
//   founders/<handle>/founder.json          id (opaque p-xxxx), handle, verification, ventures by role, profile
//   founders/<handle>/ideas/<id>.json       the founder's ideas, verbatim; ventures cite the one they grew from
//   founders/<handle>/references/<id>.json  books, podcasts, films, essays (CSL-JSON field names) and why they matter
//   founders/<handle>/inspirations/<id>.json people who inspire the founder, and what invokes their zeal
//   founders/<handle>/_private/             real name, contact, the founder puzzle, secrets: never a model, never a release
//
//   node schema/founders.ts init <workspace> --handle <h> [--verification self]
//   node schema/founders.ts link <workspace> --handle <h> --venture <folder> --role founder|co-founder|general-partner [--since <date>] [--idea <id>]
//   node schema/founders.ts idea <workspace> --handle <h> --text <words> [--source <where>]
//   node schema/founders.ts reference <workspace> --handle <h> --type <csl type> --title <t> [--author "Given Family"]... [--issued <yyyy>] [--container <show>] [--url <u>] [--why <words>]
//   node schema/founders.ts inspiration <workspace> --handle <h> --zeal <words> [--name <public figure>] [--known-for <words>]
//   node schema/founders.ts show <workspace> --handle <h>
//   node schema/founders.ts check <workspace>
//
// An agent may draft a profile, an idea's tags or a reference it found; only the founder confirms the profile,
// and check fails a profile confirmed by anyone else. show never reads _private/.

import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { FounderIdea, FounderInspiration, FounderReference, WorkspaceFounder } from "./types/records.d.ts";

export const FOUNDERS = "founders";
const PRIVATE = "_private";
const readJson = <T>(f: string): T => JSON.parse(readFileSync(f, "utf8")) as T;
const writeJson = (f: string, o: unknown): void => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(o, null, 2) + "\n"); };
const today = (now: Date = new Date()): string => now.toISOString().slice(0, 10);
const slug = (s: string): string => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "item";
const folder = (ws: string, handle: string): string => join(ws, FOUNDERS, handle);
const founderFile = (ws: string, handle: string): string => join(folder(ws, handle), "founder.json");

function list<T>(d: string): { file: string; record: T }[] {
  return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, record: readJson<T>(join(d, f)) })) : [];
}
function uniqueId(d: string, base: string): string {
  let id = base, n = 2;
  while (existsSync(join(d, `${id}.json`))) id = `${base}-${n++}`;
  return id;
}
function load(ws: string, handle: string): WorkspaceFounder {
  const f = founderFile(ws, handle);
  if (!existsSync(f)) throw new Error(`no founder ${handle}: run init first (${relative(ws, f)})`);
  return readJson<WorkspaceFounder>(f);
}

/** Make founders/<handle>/ and point workspace.json at it when it names no founder yet. */
export function init(ws: string, o: { handle: string; verification?: WorkspaceFounder["verification"]; now?: Date }): WorkspaceFounder {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(o.handle)) throw new Error(`handle ${o.handle}: lowercase letters, digits and hyphens`);
  const f = founderFile(ws, o.handle);
  if (existsSync(f)) throw new Error(`${relative(ws, f)} already exists`);
  const taken = new Set(founderDirs(ws).map((h) => readJson<WorkspaceFounder>(founderFile(ws, h)).id));
  let id: string;
  do id = `p-${randomBytes(4).toString("hex")}`; while (taken.has(id));
  const rec: WorkspaceFounder = { id, handle: o.handle, created: today(o.now), verification: o.verification ?? "self", ventures: [] };
  writeJson(f, rec);
  writeJson(join(folder(ws, o.handle), PRIVATE, "person.json"), { private: true, id, name: "", note: "The founder's real name and contact details. Never reaches a model or a release." });
  const wsFile = join(ws, "workspace.json");
  if (existsSync(wsFile)) {
    const w = readJson<Record<string, unknown>>(wsFile);
    if (!w.founder) writeJson(wsFile, { ...w, founder: `${FOUNDERS}/${o.handle}/founder.json` });
  }
  return rec;
}

/** Link a venture to the founder by role. */
export function link(ws: string, o: { handle: string; venture: string; role: "founder" | "co-founder" | "general-partner"; since?: string; idea?: string; now?: Date }): WorkspaceFounder {
  const rec = load(ws, o.handle);
  if (!existsSync(join(ws, o.venture))) throw new Error(`no venture folder ${o.venture}`);
  const ventures = (rec.ventures ?? []).filter((v) => v.venture !== o.venture);
  ventures.push({ venture: o.venture, role: o.role, since: o.since ?? today(o.now), ...(o.idea ? { from_idea: o.idea } : {}) });
  const next: WorkspaceFounder = { ...rec, ventures };
  writeJson(founderFile(ws, o.handle), next);
  if (o.idea) {
    const f = join(folder(ws, o.handle), "ideas", `${o.idea}.json`);
    if (!existsSync(f)) throw new Error(`no idea ${o.idea}`);
    const idea = readJson<FounderIdea>(f);
    writeJson(f, { ...idea, status: "in-venture", ventures: [...new Set([...(idea.ventures ?? []), o.venture])] });
  }
  return next;
}

export function addIdea(ws: string, o: { handle: string; text: string; source?: string; now?: Date }): FounderIdea {
  load(ws, o.handle);
  const d = join(folder(ws, o.handle), "ideas");
  const rec: FounderIdea = { id: uniqueId(d, slug(o.text.split(/\s+/).slice(0, 6).join(" "))), text: o.text, captured: today(o.now), status: "open", ...(o.source ? { source: o.source } : {}) };
  writeJson(join(d, `${rec.id}.json`), rec);
  return rec;
}

/** "Given Family" or "Family, Given" to a CSL name; one word, or an organization, stays literal. */
export function cslName(s: string): NonNullable<FounderReference["author"]>[number] {
  const t = s.trim();
  if (t.includes(",")) { const [family, given] = t.split(",").map((x) => x.trim()); return { family, given }; }
  const parts = t.split(/\s+/);
  return parts.length < 2 ? { literal: t } : { given: parts.slice(0, -1).join(" "), family: parts[parts.length - 1] };
}

export function addReference(ws: string, o: { handle: string; type: FounderReference["type"]; title: string; authors?: string[]; issued?: string; container?: string; url?: string; why?: string; by?: { kind: "person" | "agent"; id: string } }): FounderReference {
  const f = load(ws, o.handle);
  const d = join(folder(ws, o.handle), "references");
  const rec: FounderReference = {
    id: uniqueId(d, slug(o.title)), type: o.type, title: o.title,
    ...(o.authors?.length ? { author: o.authors.map(cslName) } : {}),
    ...(o.issued ? { issued: o.issued } : {}), ...(o.container ? { "container-title": o.container } : {}),
    ...(o.url ? { URL: o.url } : {}), ...(o.why ? { why: o.why } : {}),
    added_by: o.by ?? { kind: "person", id: f.id },
  };
  writeJson(join(d, `${rec.id}.json`), rec);
  return rec;
}

export function addInspiration(ws: string, o: { handle: string; zeal: string; name?: string; knownFor?: string }): FounderInspiration {
  load(ws, o.handle);
  const d = join(folder(ws, o.handle), "inspirations");
  const base = o.name ? slug(o.name) : `i-${randomBytes(3).toString("hex")}`;
  const rec: FounderInspiration = { id: uniqueId(d, base), zeal: o.zeal, public: Boolean(o.name), ...(o.name ? { name: o.name } : {}), ...(o.knownFor ? { known_for: o.knownFor } : {}) };
  writeJson(join(d, `${rec.id}.json`), rec);
  return rec;
}

function founderDirs(ws: string): string[] {
  const d = join(ws, FOUNDERS);
  return existsSync(d) ? readdirSync(d).filter((h) => statSync(join(d, h)).isDirectory() && existsSync(join(d, h, "founder.json"))).sort() : [];
}

function walk(d: string): string[] {
  return existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]) : [];
}

/** Problems with the founders folder; empty means it passes. A venture may have several founders (Torian, 2026-10-31). */
export function check(ws: string): string[] {
  const out: string[] = [];
  const root = join(ws, FOUNDERS);
  if (!existsSync(root)) return out;
  const ids = new Map<string, string>();
  const records = new Map<string, WorkspaceFounder>();
  for (const h of readdirSync(root).filter((x) => statSync(join(root, x)).isDirectory())) {
    if (!existsSync(join(root, h, "founder.json"))) { out.push(`founders/${h}: no founder.json`); continue; }
    const f = readJson<WorkspaceFounder>(join(root, h, "founder.json"));
    records.set(h, f);
    const at = `founders/${h}/founder.json`;
    if (f.handle !== h) out.push(`${at}: handle ${f.handle} does not match its folder`);
    if (!/^p-[a-z0-9]{6,}$/.test(f.id ?? "")) out.push(`${at}: id must be an opaque person id (p-xxxxxx)`);
    if (ids.has(f.id)) out.push(`${at}: id ${f.id} is also founders/${ids.get(f.id)}`); else ids.set(f.id, h);
    if (f.confirmed_by && (f.confirmed_by.kind !== "person" || f.confirmed_by.id !== f.id)) out.push(`${at}: the profile is confirmed only by the founder (${f.id}), not ${f.confirmed_by.kind} ${f.confirmed_by.id}`);
    if (f.profile?.confirmed && !f.confirmed_by) out.push(`${at}: profile.confirmed needs confirmed_by (the founder)`);
    if (f.drafted_by && f.confirmed_by && f.drafted_by.kind === f.confirmed_by.kind && f.drafted_by.id === f.confirmed_by.id && f.drafted_by.kind === "agent") out.push(`${at}: the drafter cannot confirm its own draft`);
    const seenV = new Set<string>();
    for (const v of f.ventures ?? []) {
      if (seenV.has(v.venture)) out.push(`${at}: venture ${v.venture} is linked twice`);
      seenV.add(v.venture);
      if (!existsSync(join(ws, v.venture))) out.push(`${at}: venture ${v.venture} does not exist`);
      if (v.from_idea && !existsSync(join(root, h, "ideas", `${v.from_idea}.json`))) out.push(`${at}: venture ${v.venture} cites idea ${v.from_idea}, which is not in ideas/`);
    }

    const refs = new Set(list<FounderReference>(join(root, h, "references")).map((r) => r.record.id));
    for (const { file, record: r } of list<FounderReference>(join(root, h, "references"))) {
      if (`${r.id}.json` !== file) out.push(`founders/${h}/references/${file}: id ${r.id} does not match the file name`);
      for (const q of r.quotes ?? []) if (!q.text.trim()) out.push(`founders/${h}/references/${file}: an empty quote`);
    }
    for (const { file, record: i } of list<FounderIdea>(join(root, h, "ideas"))) {
      const p = `founders/${h}/ideas/${file}`;
      if (`${i.id}.json` !== file) out.push(`${p}: id ${i.id} does not match the file name`);
      if (i.status === "dropped" && !i.note) out.push(`${p}: a dropped idea needs a note`);
      for (const r of i.references ?? []) if (!refs.has(r)) out.push(`${p}: cites reference ${r}, which is not in references/`);
      for (const v of i.ventures ?? []) if (!seenV.has(v)) out.push(`${p}: cites venture ${v}, which founder.json does not link`);
    }
    for (const { file, record: x } of list<FounderInspiration>(join(root, h, "inspirations"))) {
      const p = `founders/${h}/inspirations/${file}`;
      if (`${x.id}.json` !== file) out.push(`${p}: id ${x.id} does not match the file name`);
      if (x.name && x.public !== true) out.push(`${p}: only a public figure is named here; a private person's name goes in _private/`);
      for (const r of x.references ?? []) if (!refs.has(r)) out.push(`${p}: cites reference ${r}, which is not in references/`);
    }

    // Secrets, the puzzle and the real name live only in _private/; anything there is marked private.
    for (const file of walk(join(root, h))) {
      const rel = relative(join(root, h), file);
      const inPrivate = rel.split("/")[0] === PRIVATE;
      if (!inPrivate && /(^|\/)(secrets?|puzzles?)(\/|$)/i.test(rel)) out.push(`founders/${h}/${rel}: secrets and the founder puzzle go in founders/${h}/_private/`);
      if (inPrivate && file.endsWith(".json")) {
        try { if (readJson<{ private?: boolean }>(file).private !== true) out.push(`founders/${h}/${rel}: a _private/ record says private: true`); }
        catch { out.push(`founders/${h}/${rel}: not valid JSON`); }
      }
    }
  }

  const wsFile = join(ws, "workspace.json");
  if (existsSync(wsFile)) {
    const p = readJson<{ founder?: string }>(wsFile).founder;
    if (p && !existsSync(join(ws, p))) out.push(`workspace.json: founder ${p} does not exist`);
  }
  return out;
}

/** The founder suite as a page for the founder. Never reads _private/. */
export function show(ws: string, handle: string): string {
  const f = load(ws, handle);
  const base = folder(ws, handle);
  const lines: string[] = [`# ${f.handle}`, "", `Founder ${f.id}, since ${f.created}. Verification: ${f.verification ?? "self"}.`, ""];
  lines.push("## Ventures", "");
  for (const v of f.ventures ?? []) lines.push(`- ${v.venture}: ${v.role} since ${v.since}${v.until ? ` until ${v.until}` : ""}${v.from_idea ? ` (from idea ${v.from_idea})` : ""}`);
  if (!f.ventures?.length) lines.push("- none yet");
  lines.push("", "## Profile", "");
  if (f.profile?.summary) lines.push(f.profile.summary, "");
  for (const [k, entries] of Object.entries(f.profile?.attributes ?? {})) lines.push(`- **${k}:** ${entries.map((e) => e.text).join("; ")}`);
  lines.push("", f.confirmed_by ? `Confirmed by the founder on ${f.confirmed_by.at}.` : "Not confirmed by the founder yet.");
  lines.push("", "## Ideas", "");
  for (const { record: i } of list<FounderIdea>(join(base, "ideas"))) lines.push(`- ${i.text} (${i.status ?? "open"}, ${i.captured})`);
  lines.push("", "## References", "");
  for (const { record: r } of list<FounderReference>(join(base, "references"))) {
    const who = (r.author ?? []).map((a) => a.literal ?? [a.given, a.family].filter(Boolean).join(" ")).join(", ");
    lines.push(`- ${who ? `${who}, ` : ""}*${r.title}*${r.issued ? ` (${r.issued.slice(0, 4)})` : ""}${r.why ? `: ${r.why}` : ""}`);
  }
  lines.push("", "## Inspirations", "");
  for (const { record: x } of list<FounderInspiration>(join(base, "inspirations"))) lines.push(`- ${x.name ?? x.id}: ${x.zeal}`);
  return lines.join("\n") + "\n";
}

function flag(args: string[], name: string): string | undefined { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; }
function flags(args: string[], name: string): string[] { return args.flatMap((a, i) => a === `--${name}` && args[i + 1] ? [args[i + 1]] : []); }
function need(args: string[], name: string): string { const v = flag(args, name); if (!v) throw new Error(`--${name} is required`); return v; }

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ws, ...rest] = process.argv.slice(2);
  try {
    if (!cmd || !ws) throw new Error("usage: node schema/founders.ts init|link|idea|reference|inspiration|show|check <workspace> ...");
    const handle = (): string => need(rest, "handle");
    if (cmd === "init") console.log(JSON.stringify(init(ws, { handle: handle(), verification: flag(rest, "verification") as WorkspaceFounder["verification"] }), null, 2));
    else if (cmd === "link") console.log(JSON.stringify(link(ws, { handle: handle(), venture: need(rest, "venture"), role: need(rest, "role") as "founder", since: flag(rest, "since"), idea: flag(rest, "idea") }), null, 2));
    else if (cmd === "idea") console.log(JSON.stringify(addIdea(ws, { handle: handle(), text: need(rest, "text"), source: flag(rest, "source") }), null, 2));
    else if (cmd === "reference") console.log(JSON.stringify(addReference(ws, { handle: handle(), type: need(rest, "type") as FounderReference["type"], title: need(rest, "title"), authors: flags(rest, "author"), issued: flag(rest, "issued"), container: flag(rest, "container"), url: flag(rest, "url"), why: flag(rest, "why") }), null, 2));
    else if (cmd === "inspiration") console.log(JSON.stringify(addInspiration(ws, { handle: handle(), zeal: need(rest, "zeal"), name: flag(rest, "name"), knownFor: flag(rest, "known-for") }), null, 2));
    else if (cmd === "show") process.stdout.write(show(ws, handle()));
    else if (cmd === "check") {
      const problems = check(ws);
      for (const p of problems) console.log(p.startsWith("warn:") ? p : `FAIL ${p}`);
      const fails = problems.filter((p) => !p.startsWith("warn:")).length;
      console.log(fails ? `${fails} problem(s)` : "founders: ok");
      process.exit(fails ? 1 : 0);
    } else throw new Error(`unknown command ${cmd}`);
  } catch (e) { console.error((e as Error).message); process.exit(2); }
}
