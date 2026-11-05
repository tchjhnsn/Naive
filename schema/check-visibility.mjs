#!/usr/bin/env node
// The publish check for field visibility: every fact a public page uses must come through the gate.
// A page's <Fact name="..."/> or <FactList name="..."/> reads site/generated/venture-facts.json, which
// site/scripts/venture-facts.mjs writes through schema/visibility.mjs. A name the gate refused (the field
// is internal, its approved wording changed, or no person approved it) is missing there: the page would
// silently drop it, so this check fails and names the field a person must approve. A fact present in the
// file whose source field is no longer public, or whose variant is not approved, fails too.
//
//   node schema/check-visibility.mjs <venture dir> [--content site/content/marketing] [--facts site/generated/venture-facts.json] [--json]
// Exit 1 when a page uses a refused fact.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { publicValue, visibilityOf } from "./visibility.mjs";

const repo = new URL("..", import.meta.url).pathname;
// Which record field each fact name stands for (the fields site/scripts/venture-facts.mjs asks for).
export const FACT_FIELDS = {
  problem: ["foundation/problem.json", "statement"],
  segment: ["foundation/problem.json", "segment"],
  forms: ["foundation/problem.json", "forms"],
  promise: ["venture.json", "core.promise"],
  tagline: ["marketing/decisions/tagline.decision.json", "answer"],
};

/** The fact names the pages use: { name: [page, ...] }. */
export function factsUsed(content) {
  const used = {};
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith(".mdx") ? [join(d, e.name)] : []);
  for (const f of existsSync(content) ? walk(content) : []) {
    const text = readFileSync(f, "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    for (const m of text.matchAll(/<(?:Fact|FactList)\s+name="([^"]+)"/g)) (used[m[1]] ??= []).push(f.slice(content.length + 1));
  }
  return used;
}

/** Each refusal: { name, record, field, visibility, why, pages }. */
export function refusals(dir, { content = join(repo, "site/content/marketing"), facts = join(repo, "site/generated/venture-facts.json") } = {}) {
  const have = existsSync(facts) ? JSON.parse(readFileSync(facts, "utf8")) : {};
  const out = [];
  for (const [name, pages] of Object.entries(factsUsed(content))) {
    const at = FACT_FIELDS[name];
    if (!at) continue; // not a record field (phases come from the method, terms from the docs)
    const [rel, field] = at;
    const ok = publicValue(dir, rel, field);
    const v = visibilityOf(dir, rel, field);
    if (!ok) out.push({ name, record: rel, field, visibility: v.visibility, why: v.stale ?? (v.visibility === "variant" ? "a variant field with no approved public variant" : "internal: no person approved it as public"), pages });
    else if (!have[name]) out.push({ name, record: rel, field, visibility: v.visibility, why: "approved, but site/generated/venture-facts.json is stale: run npm --prefix site run data", pages });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n) => argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : undefined;
  if (!argv[0] || argv[0].startsWith("--")) { console.error("usage: node schema/check-visibility.mjs <venture dir> [--content <dir>] [--facts <file>] [--json]"); process.exit(2); }
  const dir = resolve(argv[0]);
  const r = refusals(dir, { ...(opt("content") ? { content: resolve(opt("content")) } : {}), ...(opt("facts") ? { facts: resolve(opt("facts")) } : {}) });
  if (argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r) console.error(`REFUSED  <Fact name="${x.name}"> on ${x.pages.join(", ")}: ${x.record}#${x.field} is ${x.visibility} (${x.why}). A person approves it: mentura visibility ${x.record.replace(/\.json$/, "")} ${x.field} --venture <id> --public --by <name>, or writes an approved variant (variant_of: ${x.record}#${x.field})`);
    if (!r.length) console.log("every fact the public pages use is public or an approved variant");
  }
  process.exit(r.length ? 1 : 0);
}
