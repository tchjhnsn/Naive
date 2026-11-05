#!/usr/bin/env node
// The site build through the publishing gate: compile a venture's public words for one of the site's
// channels (the marketing pages' facts and the two one-pagers) and write what a publish may read. Publishing
// reads only this output, never a venture record. naive publish build (schema/publish.mjs) compiles a
// channel's approved MDX into .release/publish/; this does the same for what site/scripts/ render.
//
//   node operations/marketing/publish-build.mjs <channel> <venture dir> [--out <dir>] [--json]
//
// Channels and what each writes under <out> (default site/):
//   site        generated/venture-facts.json, the facts the marketing pages' <Fact> reads
//   artifact    generated/venture-facts.json and artifact/index.html, the one-page marketing artifact
//   foundation  artifact/foundation.html, the strategic foundation one-pager
//
// In order, and any failure stops the build:
//   1. gate     schema/check-public.mjs (EE-064): every public variant names its source,
//               audience and approver, and copies no ten-word run of its source
//   2. compile  each field reaches the output only through schema/visibility.mjs publicValue: the field
//               when a person approved its wording as public, or its approved MDX variant
//   3. build    the channel's builder, reading only the compiled output
//   4. verify   the output carries no internal field's own wording (a field not approved as public) and
//               nothing schema/check-leaks.mjs matches
//   5. record   generated/publish-build.<channel>.json: each output's sha256, the approved variants it
//               drew on, and the drafts still waiting for a person (for the publish manifest, item 1)

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { check, CONTENT, frontmatter } from "../../schema/check-public.mjs";
import { leaks } from "../../schema/check-leaks.mjs";
import { visibilityOf } from "../../schema/visibility.mjs";
import { ventureFile } from "../../packages/core/venture-paths.mjs";

const repo = new URL("../../", import.meta.url).pathname;
const sha = (s) => createHash("sha256").update(s).digest("hex");

export const CHANNELS = {
  site: { outputs: ["generated/venture-facts.json"], scripts: ["site/scripts/venture-facts.mjs"] },
  artifact: { outputs: ["generated/venture-facts.json", "artifact/index.html"], scripts: ["site/scripts/venture-facts.mjs", "site/scripts/artifact.mjs"] },
  foundation: { outputs: ["artifact/foundation.html"], scripts: ["site/scripts/foundation.mjs"] },
};

// Every MDX variant in the venture's public content, approved or not.
function variants(dir) {
  const out = [];
  for (const d of ["marketing/content", CONTENT]) {
    const root = ventureFile(dir, d);
    if (!existsSync(root)) continue;
    for (const name of readdirSync(root, { recursive: true }).map(String).filter((n) => n.endsWith(".mdx"))) {
      const text = readFileSync(join(root, name), "utf8");
      const { meta } = frontmatter(text);
      if (meta.variant_of) out.push({ file: `${d}/${name}`, variant_of: meta.variant_of, approved: meta.publish === true && !!meta.approved_by, approved_by: meta.approved_by ?? null, sha256: sha(text) });
    }
  }
  return out;
}

// The wording of every record field that is not approved as public: strings of 24 characters or more in
// foundation/*, products/* and venture.json. None of them may appear in public output as written.
export function internalWording(dir) {
  const found = [];
  const walk = (rel, x, path) => {
    if (typeof x === "string") { if (x.length >= 24 && visibilityOf(dir, rel, path).visibility !== "public") found.push({ rel, field: path, text: x }); }
    else if (Array.isArray(x)) x.forEach((y, i) => walk(rel, y, path ? `${path}.${i}` : String(i)));
    else if (x && typeof x === "object") for (const [k, y] of Object.entries(x)) walk(rel, y, path ? `${path}.${k}` : k);
  };
  const files = ["venture.json"];
  for (const d of ["foundation", "products"]) {
    const root = ventureFile(dir, d);
    if (existsSync(root)) files.push(...readdirSync(root, { recursive: true }).map(String).filter((n) => n.endsWith(".json") && !n.endsWith(".visibility.json")).map((n) => `${d}/${n}`));
  }
  for (const rel of files) {
    const f = ventureFile(dir, rel);
    if (!existsSync(f)) continue;
    try { walk(rel, JSON.parse(readFileSync(f, "utf8")), ""); } catch { /* a record that does not parse has its own check */ }
  }
  // The venture's name and tagline are public by definition (check-public.mjs allows them too).
  const v = existsSync(join(dir, "venture.json")) ? JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) : {};
  const allowed = new Set([v.name, v.brand?.tagline].filter(Boolean));
  return found.filter((x) => !allowed.has(x.text));
}

const unescape = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/**
 * @param {string} channel @param {string} dir
 * @param {{ out?: string, channels?: Record<string, { outputs: string[], scripts: string[] }> }} [opts]
 * @returns {{ ok: boolean, channel: string, stage?: string, errors?: string[], venture?: string, built_at?: string, outputs?: { path: string, sha256: string }[], sources?: { file: string, variant_of?: string, approved_by?: string, sha256: string }[], pending?: { file: string, variant_of?: string }[] }}
 */
export function build(channel, dir, { out = join(repo, "site"), channels = CHANNELS } = {}) {
  const ch = channels[channel];
  if (!ch) return { ok: false, channel, errors: [`no channel ${channel}: one of ${Object.keys(channels).join(", ")}`] };
  dir = resolve(dir);
  out = resolve(out);
  // 1. gate
  const gate = check(dir);
  if (gate.errors.length) return { ok: false, channel, stage: "gate", errors: gate.errors.flatMap((x) => x.errors.map((e) => `${x.file}: ${e}`)) };
  // 2 and 3. compile and build: each script reads the venture only through publicValue, and writes under out.
  const env = { ...process.env, NAIVE_VENTURE: dir, FOUNDATION_VENTURE: dir, NAIVE_PUBLISH_OUT: out };
  for (const s of ch.scripts) {
    const r = spawnSync("node", [resolve(repo, s)], { env, encoding: "utf8" });
    if (r.status !== 0) return { ok: false, channel, stage: "build", errors: [`${s}: ${(r.stderr || r.stdout).trim()}`] };
  }
  // 4. verify
  const outputs = ch.outputs.map((p) => ({ path: p, file: join(out, p) }));
  const errors = [];
  const wording = internalWording(dir);
  for (const o of outputs) {
    const text = unescape(readFileSync(o.file, "utf8"));
    for (const w of wording) if (text.includes(w.text)) errors.push(`${o.path} carries the internal wording of ${w.rel}#${w.field}: publish it through an approved variant`);
  }
  for (const l of leaks(outputs.map((o) => o.file), { venture: dir })) errors.push(`${relative(out, l.file)} matches ${l.pattern}: "${l.text}"`);
  if (errors.length) return { ok: false, channel, stage: "verify", errors };
  // 5. record
  const all = variants(dir);
  const record = {
    channel,
    venture: JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).id ?? null,
    built_at: new Date().toISOString(),
    outputs: outputs.map((o) => ({ path: o.path, sha256: sha(readFileSync(o.file)) })),
    sources: all.filter((v) => v.approved).map(({ file, variant_of, approved_by, sha256 }) => ({ file, variant_of, approved_by, sha256 })),
    pending: all.filter((v) => !v.approved).map(({ file, variant_of }) => ({ file, variant_of })),
  };
  mkdirSync(join(out, "generated"), { recursive: true });
  writeFileSync(join(out, `generated/publish-build.${channel}.json`), JSON.stringify(record, null, 2) + "\n");
  return { ok: true, ...record };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const oi = argv.indexOf("--out");
  const [channel, dir] = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--out");
  if (!channel || !dir) { console.error(`usage: node operations/marketing/publish-build.mjs <${Object.keys(CHANNELS).join("|")}> <venture dir> [--out <dir>] [--json]`); process.exit(2); }
  const r = build(channel, dir, oi >= 0 ? { out: argv[oi + 1] } : {});
  if (argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else if (r.ok) {
    console.log(`built ${channel} for ${r.venture}: ${r.outputs.map((o) => o.path).join(", ")}`);
    console.log(`  ${r.sources.length} approved public variant(s); ${r.pending.length} draft(s) waiting for a person's approval`);
    for (const p of r.pending) console.log(`    ${p.file} (variant of ${p.variant_of})`);
  } else {
    console.log(`refused to build ${channel}${r.stage ? ` at the ${r.stage} stage` : ""}`);
    for (const e of r.errors) console.log(`  ${e}`);
  }
  process.exit(r.ok ? 0 : 1);
}
