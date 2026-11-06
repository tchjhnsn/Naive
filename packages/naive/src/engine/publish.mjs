#!/usr/bin/env node
// Publishing (EE-025): artifacts are what get published, records never are. A channel's public MDX
// variants compile into an artifact; the gate writes a publish decision (class public-commitment) and
// refuses unless a person approved; the manifest (governance/publications.json) keeps what is live,
// its sha256 and the versions before it.
//
//   naive publish build <channel> [--artifact <id>]
//       Compiles the channel's public MDX variants (marketing/content/**/*.mdx with publish: true,
//       approved_by, and channel: <channel>) into .release/publish/<channel>/<artifact>.md, runs the
//       leak check on that output, and writes artifacts/<artifact>.json built from the MDX files and
//       the records they are variants of.
//   naive publish <channel> --by <person> [--as <role>] [--door one-way|two-way]
//       [--exposure low|medium|high] [--who competitor,investor,...] [--reversibility "<how>"] [--url <url>]
//       Writes decisions/publications.<channel>-<stamp>.decision.json and, when the approver may approve
//       this door, updates the manifest and logs a publish in provenance. One-way doors: the founder only.
//       Two-way doors: the founder, or a role governance/delegation.json delegates (low or medium exposure).
//       An agent never approves (MENTURA_ACTOR=agent is refused). Refused before an entry's not_before.
//   naive publish rollback <channel> --by <person> [--as <role>]
//       Restores the previous version in the manifest, under the same gate (a two-way door).
//   naive publish status [<channel>]    each entry: live sha, approver, and fresh or stale
//
// governance/delegation.json (required to publish: with no founder list, no one may approve as founder): { "founder": ["Torian"], "delegations": [{ "class": "public-commitment",
//   "door": "two-way", "role": "marketing", "people": ["Ana"], "max_exposure": "medium" }] }

import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";
import { artifacts } from "./check-artifacts.mjs";
import { leaks } from "./check-leaks.mjs";
import { check, frontmatter } from "./publish-lint.mjs";
import { record } from "../core/provenance.mjs";

const load = (f) => JSON.parse(readFileSync(f, "utf8"));
const save = (f, x) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, JSON.stringify(x, null, 2) + "\n"); };
const shaFile = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const CONTENT = ["marketing/content", "operations/marketing/content"];
const ONE_WAY_KINDS = new Set(["social", "newsletter", "email", "app-store", "press", "launch"]);
const EXPOSURE = ["low", "medium", "high"];

export class Refused extends Error {}
const refuse = (m) => { throw new Refused(m); };

export const policy = (dir) => { const f = ventureFile(dir, "governance/publication-policy.json"); return existsSync(f) ? load(f) : null; };
export const manifestPath = (dir) => ventureFile(dir, "governance/publications.json");
export const manifest = (dir) => existsSync(manifestPath(dir)) ? load(manifestPath(dir)) : { entries: [] };
const channelOf = (dir, id) => policy(dir)?.channels?.find((c) => c.id === id) ?? refuse(`no channel ${id} in governance/publication-policy.json`);

/** The approved public MDX variants for a channel, in path order: { file, meta, body }. */
export function sources(dir, channel) {
  const out = [];
  for (const d of CONTENT) {
    const root = ventureFile(dir, d);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root, { recursive: true }).map(String).filter((n) => n.endsWith(".mdx")).sort()) {
      const fm = frontmatter(readFileSync(join(root, name), "utf8"));
      if (fm.meta.publish !== true || !fm.meta.approved_by?.length) continue;
      const channels = fm.meta.channel ?? [];
      if (!(Array.isArray(channels) ? channels : channels.split(",").map((s) => s.trim())).includes(channel)) continue;
      out.push({ file: `${d}/${name}`, ...fm });
    }
  }
  return out;
}

/**
 * naive publish build: compile the channel's MDX into one artifact output and leak-check it.
 * @param {string} dir
 * @param {string} channel
 * @param {{ artifact?: string }} [opts]
 */
export function build(dir, channel, { artifact } = {}) {
  const ch = channelOf(dir, channel);
  const id = artifact ?? manifest(dir).entries.find((e) => e.channel === channel)?.artifact ?? channel;
  const srcs = sources(dir, channel);
  if (!srcs.length) refuse(`no approved public MDX for channel ${channel}: a variant needs publish: true, approved_by and channel: ${channel}`);
  const text = srcs.map((s) => s.body.replace(/\{\/\*[\s\S]*?\*\/\}/g, "").trim()).join("\n\n") + "\n";
  const rel = `.release/publish/${channel}/${id}.md`;
  const out = ventureFile(dir, rel);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, text);
  const found = leaks([out], { venture: dir });
  const sha = shaFile(out);
  // Built from the MDX variants and the records they vary, so a changed record marks this artifact stale.
  const from = new Map();
  for (const s of srcs) {
    from.set(s.file, shaFile(ventureFile(dir, s.file)));
    const rec = s.meta.variant_of?.split("#")[0];
    if (rec && existsSync(ventureFile(dir, rec))) from.set(rec, shaFile(ventureFile(dir, rec)));
  }
  const aFile = ventureFile(dir, `artifacts/${id}.json`);
  const prior = existsSync(aFile) ? load(aFile) : {};
  const a = { ...prior, id, kind: prior.kind ?? (ch.kind === "docs-site" || ch.kind === "site" ? "site" : "page"), title: prior.title ?? ch.name ?? id,
    built_at: new Date().toISOString(), built_from: [...from].map(([r, s]) => ({ record: r, sha256: s })), output: { path: rel, sha256: sha, channel } };
  save(aFile, a);
  return { artifact: id, output: rel, sha256: sha, sources: srcs.map((s) => s.file), leaks: found };
}

function delegation(dir) { const f = ventureFile(dir, "governance/delegation.json"); return existsSync(f) ? load(f) : null; }

/** Whether this person, acting as this role, may approve this door at this exposure. */
export function mayApprove(dir, { by, as = "founder", door, exposure }) {
  if (!by) return { ok: false, why: "a person must approve: pass --by <name>" };
  if ((process.env.MENTURA_ACTOR ?? "person") === "agent") return { ok: false, why: "an agent never approves a publication" };
  const d = delegation(dir);
  const founders = d?.founder ?? [];
  if (as === "founder") {
    if (!founders.length) return { ok: false, why: "no founder named in governance/delegation.json, so no one may approve as founder" };
    if (!founders.includes(by)) return { ok: false, why: `${by} is not a founder in governance/delegation.json` };
    return { ok: true, role: "founder" };
  }
  if (door === "one-way") return { ok: false, why: "a one-way door is decided by the founder only" };
  const g = (d?.delegations ?? []).find((x) => x.role === as && (x.class ?? "public-commitment") === "public-commitment" && (x.door ?? "two-way") === "two-way");
  if (!g) return { ok: false, why: `no delegation of two-way publications to ${as} in governance/delegation.json; the founder decides` };
  if (g.people && !g.people.includes(by)) return { ok: false, why: `${by} does not hold the ${as} role in governance/delegation.json` };
  if (EXPOSURE.indexOf(exposure) > EXPOSURE.indexOf(g.max_exposure ?? "low")) return { ok: false, why: `exposure ${exposure} is above what ${as} may approve (${g.max_exposure ?? "low"}); the founder decides` };
  return { ok: true, role: as };
}

const stamp = (t) => t.replace(/[-:.]/g, "").toLowerCase();

/**
 * @param {string} dir
 * @param {{ channel: string, artifact: string, sha256: string, url?: string, action: string, door: string, exposure: string, who?: string[],
 *   reversibility: { how: string, takes?: string }, as: string, by?: string, ok: boolean, why?: string, not_before?: string }} d
 */
function decide(dir, { channel, artifact, sha256, url, action, door, exposure, who, reversibility, as, by, ok, why, not_before }) {
  const at = new Date().toISOString();
  const v = load(ventureFile(dir, "venture.json"));
  const file = `decisions/publications.${channel}-${stamp(at)}.decision.json`;
  const rec = {
    id: `publish-${channel}-${stamp(at)}`,
    question: `${action === "rollback" ? "Roll back" : "Publish"} ${artifact} (${sha256.slice(0, 12)}) on ${channel}?`,
    decides: { record: "publications", path: "governance/publications.json" },
    boundary: "fail-closed",
    status: ok ? "decided" : "open",
    options: ["publish", "hold"],
    answer: ok ? "publish" : null,
    decided_by: ok ? by : null,
    decided_at: ok ? at : null,
    note: ok ? undefined : `refused: ${why}`,
    provenance: { drafted_by: { kind: "framework" }, ...(ok ? { approved_by: by, approved_at: at, phase: v.phase, wording: "approved", authority: "public-commitment", via: "naive publish" } : {}) },
    publish: { channel, artifact, sha256, url, action, door, exposure: { level: exposure, ...(who?.length ? { who } : {}) }, reversibility, approver_role: as, not_before },
  };
  save(ventureFile(dir, file), JSON.parse(JSON.stringify(rec)));
  return file;
}

function defaults(ch, door, reversibility) {
  const d = door ?? (ONE_WAY_KINDS.has(ch.kind) ? "one-way" : "two-way");
  return { door: d, reversibility: reversibility ? { how: reversibility } : d === "one-way"
    ? { how: "a correction or retraction; copies, caches and indexes may keep the old version", takes: "cannot be fully undone" }
    : { how: "naive publish rollback restores the previous version", takes: "minutes" } };
}

/** naive publish <channel>: the gate. Returns { decision, entry } or throws Refused (the decision is still written).
 *  @param {string} dir @param {string} channel @param {{ by?: string, as?: string, door?: string, exposure?: string, who?: string[], reversibility?: string, url?: string, now?: Date }} [opts] */
export async function publish(dir, channel, { by, as = "founder", door, exposure = "low", who = [], reversibility, url, now = new Date() } = {}) {
  const ch = channelOf(dir, channel);
  if (!EXPOSURE.includes(exposure)) refuse(`exposure is low, medium or high, not ${exposure}`);
  const m = manifest(dir);
  let entry = m.entries.find((e) => e.channel === channel);
  const id = entry?.artifact ?? channel;
  const aFile = ventureFile(dir, `artifacts/${id}.json`);
  if (!existsSync(aFile)) refuse(`nothing built for ${channel}: run naive publish build ${channel} first`);
  const a = load(aFile);
  const out = a.output && ventureFile(dir, a.output.path);
  if (!out || !existsSync(out)) refuse(`artifact ${id} has no built output: run naive publish build ${channel}`);
  const sha = shaFile(out);
  if (sha !== a.output.sha256) refuse(`the output of ${id} changed after it was built: rebuild it`);
  const state = artifacts(dir).find((x) => x.id === id)?.state;
  if (state !== "fresh") refuse(`artifact ${id} is ${state}: a record it was built from changed; rebuild and re-lint it`);
  const found = leaks([out], { venture: dir });
  if (found.length) refuse(`the output carries internal text (${found.map((l) => l.pattern).join(", ")})`);
  // The publish lint on the MDX the output was built from, where each file's sources still sit in its frontmatter.
  const lint = await check(a.built_from.map((b) => b.record).filter((r) => r.endsWith(".mdx")).map((r) => ventureFile(dir, r)), { venture: dir });
  const errors = lint.findings.filter((f) => f.severity === "error" && !f.waived);
  if (errors.length) refuse(`the publish lint found ${errors.map((f) => `${f.rule} in ${f.file}`).join(", ")}: run naive publish check`);
  if (entry?.not_before && now < new Date(entry.not_before)) refuse(`embargoed until ${entry.not_before}`);
  const d = defaults(ch, door, reversibility);
  const gate = mayApprove(dir, { by, as, door: d.door, exposure });
  const decision = decide(dir, { channel, artifact: id, sha256: sha, url: url ?? entry?.url, action: "publish", ...d, exposure, who, as, by, ok: gate.ok, why: gate.why, not_before: entry?.not_before });
  if (!gate.ok) refuse(`${gate.why} (the decision waits open in ${decision})`);
  // Keep the version going live, so rollback can restore it later.
  const kept = `.release/publish/${channel}/versions/${sha}.md`;
  mkdirSync(dirname(ventureFile(dir, kept)), { recursive: true });
  copyFileSync(out, ventureFile(dir, kept));
  const at = new Date().toISOString();
  if (!entry) { entry = { channel, artifact: id }; m.entries.push(entry); }
  if (entry.sha256 && entry.sha256 !== sha) entry.previous = [{ sha256: entry.sha256, output: `.release/publish/${channel}/versions/${entry.sha256}.md`, approved_by: entry.approved_by, at: entry.at, decision: entry.decision }, ...(entry.previous ?? [])];
  Object.assign(entry, { url: url ?? entry.url, kind: entry.kind ?? kindOf(ch), sources: a.built_from.map((b) => b.record).filter((r) => r.endsWith(".mdx")), output: kept, sha256: sha, approved_by: by, at, decision, door: d.door });
  delete entry.stale;
  save(manifestPath(dir), m);
  save(aFile, { ...a, published: true, ...(entry.url ? { url: entry.url } : {}) });
  record(dir, /** @type {Parameters<typeof record>[1]} */ ({ entity: kept, activity: "publish", agent: { kind: "person", via: "cli", id: by }, derived_from: [a.output.path], decision, sha256: sha, note: `published ${id} on ${channel}${entry.url ? ` at ${entry.url}` : ""} (${d.door} door)` }));
  return { decision, entry };
}

function kindOf(ch) {
  return { "docs-site": "docs", site: "site", blog: "site", social: "social", newsletter: "newsletter", email: "email", "app-store": "app-store", "claude-artifact": "claude-artifact" }[ch.kind] ?? "other";
}

/**
 * naive publish rollback: restore the previous version (a two-way door).
 * @param {string} dir
 * @param {string} channel
 * @param {{ by?: string, as?: string }} [opts]
 */
export function rollback(dir, channel, { by, as = "founder" } = {}) {
  channelOf(dir, channel);
  const m = manifest(dir);
  const entry = m.entries.find((e) => e.channel === channel);
  const prev = entry?.previous?.[0];
  if (!prev) refuse(`nothing to roll back to on ${channel}`);
  if (!existsSync(ventureFile(dir, prev.output ?? ""))) refuse(`the previous version's output ${prev.output} is gone`);
  const gate = mayApprove(dir, { by, as, door: "two-way", exposure: "low" });
  const decision = decide(dir, { channel, artifact: entry.artifact, sha256: prev.sha256, url: entry.url, action: "rollback", door: "two-way", exposure: "low",
    reversibility: { how: "naive publish of the newer version again", takes: "minutes" }, as, by, ok: gate.ok, why: gate.why });
  if (!gate.ok) refuse(`${gate.why} (the decision waits open in ${decision})`);
  const undone = { sha256: entry.sha256, output: entry.output, approved_by: entry.approved_by, at: entry.at, decision: entry.decision };
  Object.assign(entry, { sha256: prev.sha256, output: prev.output, approved_by: by, at: new Date().toISOString(), decision });
  entry.previous = [undone, ...entry.previous.slice(1)];
  save(manifestPath(dir), m);
  record(dir, /** @type {Parameters<typeof record>[1]} */ ({ entity: prev.output, activity: "rollback", agent: { kind: "person", via: "cli", id: by }, decision, sha256: prev.sha256, note: `rolled ${channel} back from ${undone.sha256.slice(0, 12)} to ${prev.sha256.slice(0, 12)}` }));
  return { decision, entry };
}

/** Republish on change: every manifest entry whose artifact went stale is marked stale and listed. */
export function stale(dir, { mark = true } = {}) {
  const states = new Map(artifacts(dir).map((a) => [a.id, a]));
  const m = manifest(dir);
  const out = [];
  for (const e of m.entries) {
    const a = states.get(e.artifact);
    const isStale = a?.state === "stale" || a?.state === "broken";
    if (isStale) out.push({ channel: e.channel, artifact: e.artifact, changed: [...(a.changed ?? []), ...(a.missing ?? [])] });
    if (mark && isStale !== !!e.stale) { if (isStale) e.stale = true; else delete e.stale; }
  }
  if (mark && existsSync(manifestPath(dir))) save(manifestPath(dir), m);
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, sub, ...rest] = process.argv.slice(2);
  const opt = (n) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
  const pos = rest.filter((a, i) => !a.startsWith("--") && !(rest[i - 1] ?? "").startsWith("--"));
  const who = opt("who")?.split(",").map((s) => s.trim()).filter(Boolean);
  try {
    if (!dir || !sub) { console.error("usage: node packages/naive/src/engine/publish.mjs <venture dir> build|publish|rollback|status <channel> [options]"); process.exit(2); }
    if (sub === "build") {
      const r = build(dir, pos[0], { artifact: opt("artifact") });
      for (const l of r.leaks) console.error(`FAIL  ${l.file}: ${l.pattern} "${l.text}" (${l.why})`);
      console.log(`built ${r.artifact} for ${pos[0]}: ${r.output} (${r.sha256.slice(0, 12)}) from ${r.sources.length} MDX file${r.sources.length === 1 ? "" : "s"}${r.leaks.length ? `; ${r.leaks.length} leak${r.leaks.length === 1 ? "" : "s"}, so it cannot be published` : ""}`);
      process.exit(r.leaks.length ? 1 : 0);
    } else if (sub === "publish" || sub === "rollback") {
      const f = sub === "publish" ? publish : rollback;
      const r = await f(dir, pos[0], { by: opt("by"), as: opt("as"), door: opt("door"), exposure: opt("exposure"), who, reversibility: opt("reversibility"), url: opt("url") });
      console.log(`${sub === "publish" ? "published" : "rolled back"} ${r.entry.artifact} on ${r.entry.channel} (${r.entry.sha256.slice(0, 12)}), approved by ${r.entry.approved_by}; decision ${r.decision}`);
    } else if (sub === "status") {
      const s = new Set(stale(dir).map((x) => x.channel));
      for (const e of manifest(dir).entries.filter((e) => !pos[0] || e.channel === pos[0]))
        console.log(`${e.channel.padEnd(16)} ${e.artifact.padEnd(16)} ${(e.sha256 ?? "unpublished").slice(0, 12).padEnd(12)} ${e.approved_by ?? "-"}  ${s.has(e.channel) ? "stale: rebuild and republish" : "fresh"}${e.not_before ? `  not before ${e.not_before}` : ""}`);
    } else { console.error(`unknown: ${sub}`); process.exit(2); }
  } catch (e) {
    if (e instanceof Refused) { console.error(`refused: ${e.message}`); process.exit(1); }
    throw e;
  }
}
