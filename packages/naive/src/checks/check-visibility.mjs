#!/usr/bin/env node
// The publish check for field visibility: every fact a public page uses must come through the gate.
// A page's <Fact name="..."/> or <FactList name="..."/> reads a facts file (generated/venture-facts.json), which
// the app's facts builder writes through packages/naive/src/engine/visibility.mjs, in the publish build
// (packages/naive/src/functions/marketing-and-sales/marketing/publish-build.mjs). The pages and the facts file belong to the app that publishes
// them, so both are named on the command line. A name the gate refused (the field
// is internal, its approved wording changed, or no person approved it) is missing there: the page would
// silently drop it, so this check fails and names the field a person must approve. A fact present in the
// file whose source field is no longer public, or whose variant is not approved, fails too.
//
//   node packages/naive/src/checks/check-visibility.mjs <venture dir> --content <pages dir> --facts <venture-facts.json> [--json]
// Exit 1 when a page uses a refused fact.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { publicValue, visibilityOf } from "../engine/visibility.mjs";

// Which record field each fact name stands for (the fields a facts builder asks for).
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

/**
 * Each refusal: { name, record, field, visibility, why, pages }.
 * @param {string} dir the venture
 * @param {{ content: string, facts: string }} where the app's pages (MDX) and its facts file
 */
export function refusals(dir, { content, facts }) {
  const have = existsSync(facts) ? JSON.parse(readFileSync(facts, "utf8")) : {};
  const out = [];
  for (const [name, pages] of Object.entries(factsUsed(content))) {
    const at = FACT_FIELDS[name];
    if (!at) continue; // not a record field (phases come from the method, terms from the docs)
    const [rel, field] = at;
    const ok = publicValue(dir, rel, field);
    const v = visibilityOf(dir, rel, field);
    if (!ok) out.push({ name, record: rel, field, visibility: v.visibility, why: v.stale ?? (v.visibility === "variant" ? "a variant field with no approved public variant" : "internal: no person approved it as public"), pages });
    else if (!have[name]) out.push({ name, record: rel, field, visibility: v.visibility, why: "approved, but the facts file is stale: rebuild it through the publish build", pages });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const opt = (n) => argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : undefined;
  if (!argv[0] || argv[0].startsWith("--") || !opt("content") || !opt("facts")) { console.error("usage: node packages/naive/src/checks/check-visibility.mjs <venture dir> --content <pages dir> --facts <venture-facts.json> [--json]"); process.exit(2); }
  const dir = resolve(argv[0]);
  const r = refusals(dir, { content: resolve(opt("content")), facts: resolve(opt("facts")) });
  if (argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    for (const x of r) console.error(`REFUSED  <Fact name="${x.name}"> on ${x.pages.join(", ")}: ${x.record}#${x.field} is ${x.visibility} (${x.why}). A person approves it: mentura visibility ${x.record.replace(/\.json$/, "")} ${x.field} --venture <id> --public --by <name>, or writes an approved variant (variant_of: ${x.record}#${x.field})`);
    if (!r.length) console.log("every fact the public pages use is public or an approved variant");
  }
  process.exit(r.length ? 1 : 0);
}
