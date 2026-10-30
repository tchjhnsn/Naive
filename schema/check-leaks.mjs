#!/usr/bin/env node
// The leak check (publishing gate): public output must carry no internal text. Matches every pattern in
// schema/internal-terms.json, plus a venture's own governance/internal-terms.json, against the files given.
// MDX comments ({/* ... */}) and frontmatter are not public, so they are skipped.
//
//   node schema/check-leaks.mjs <file or folder>... [--venture <dir>] [--json]
// Exit 1 when anything matches.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "./venture-paths.mjs";

const repo = new URL("..", import.meta.url).pathname;
const load = (f) => JSON.parse(readFileSync(f, "utf8"));

export function patterns(venture) {
  const own = venture && existsSync(ventureFile(venture, "governance/internal-terms.json")) ? load(ventureFile(venture, "governance/internal-terms.json")).patterns ?? [] : [];
  return [...load(join(repo, "schema/internal-terms.json")).patterns, ...own].map((p) => ({ ...p, re: new RegExp(p.regex, "g") }));
}

// The text a reader can see: MDX comments and frontmatter removed.
const visible = (file, text) => file.endsWith(".mdx") || file.endsWith(".md") ? text.replace(/^---\n[\s\S]*?\n---\n?/, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "") : text;

const walk = (p) => statSync(p).isDirectory() ? readdirSync(p).flatMap((n) => walk(join(p, n))) : [p];

/** Each match: { file, pattern, text, why }. @param {string[]} paths @param {{ venture?: string }} [opts] */
export function leaks(paths, { venture } = {}) {
  const ps = patterns(venture), out = [];
  for (const file of paths.filter(existsSync).flatMap(walk).filter((f) => /\.(mdx?|json|html|txt)$/.test(f) && !f.endsWith("meta.json"))) {
    const text = visible(file, readFileSync(file, "utf8"));
    for (const p of ps) for (const m of text.matchAll(p.re)) out.push({ file, pattern: p.id, text: m[0], why: p.why });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const argv = process.argv.slice(2);
  const vi = argv.indexOf("--venture");
  const venture = vi >= 0 ? argv[vi + 1] : undefined;
  const paths = argv.filter((a, i) => !a.startsWith("--") && argv[i - 1] !== "--venture");
  if (!paths.length) { console.error("usage: node schema/check-leaks.mjs <file or folder>... [--venture <dir>] [--json]"); process.exit(2); }
  const found = leaks(paths, { venture });
  if (argv.includes("--json")) console.log(JSON.stringify(found, null, 2));
  else { for (const l of found) console.error(`FAIL  ${l.file}: ${l.pattern} "${l.text}" (${l.why})`); if (!found.length) console.log(`no internal text in ${paths.join(", ")}`); }
  process.exit(found.length ? 1 : 0);
}
