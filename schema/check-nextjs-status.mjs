#!/usr/bin/env node
// Checks docs/design/naive-nextjs-status.json against the Next.js translation ledger and the code: every
// concept row in the ledger has exactly one status, and a built or partial row cites files that exist (or,
// in evidence_elsewhere, files in everything-ecosystem, which are not checked here) and names a docs page. The docs pages live with the docs site, outside this repository: given --docs <dir>
// (the site's MDX content folder), each named page must exist there and the generated "What's built" page,
// <dir>/get-started/whats-built.mdx, must match the data.
//
//   node schema/check-nextjs-status.mjs                          check, and print the counts
//   node schema/check-nextjs-status.mjs --docs <dir>             also check the pages and the What's built page
//   node schema/check-nextjs-status.mjs --docs <dir> --write     write <dir>/get-started/whats-built.mdx
//   node schema/check-nextjs-status.mjs --docs <dir> --pages-only
//       from an app that installs Naive: skip the evidence check (the package leaves its tests out, and
//       Naive's own CI runs it), check the pages and the What's built page, and check each
//       evidence_elsewhere file against the current directory, the app's repository

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
const LEDGER = "docs/design/NAIVE_NEXTJS_TRANSLATION_2026-10-28.md";
const STATUS = "docs/design/naive-nextjs-status.json";
const di = process.argv.indexOf("--docs");
const DOCS = di >= 0 ? resolve(process.argv[di + 1]) : null;
const PAGE = DOCS && join(DOCS, "get-started/whats-built.mdx");
if (process.argv.includes("--write") && !DOCS) { console.error("--write needs --docs <dir>, the docs site's MDX content folder"); process.exit(2); }
const PAGES_ONLY = process.argv.includes("--pages-only");
if (PAGES_ONLY && !DOCS) { console.error("--pages-only needs --docs <dir>, the docs site's MDX content folder"); process.exit(2); }
const STATES = ["built", "partial", "not built", "n/a"];

const ids = [...readFileSync(join(repo, LEDGER), "utf8").matchAll(/^\| ([A-Z]-\d+) \|/gm)].map((m) => m[1]);
const data = JSON.parse(readFileSync(join(repo, STATUS), "utf8"));
const errors = [];
const seen = new Map();
for (const r of data.rows) {
  if (seen.has(r.id)) errors.push(`${r.id} has two entries`);
  seen.set(r.id, r);
  if (!ids.includes(r.id)) errors.push(`${r.id} is not a row of the ledger`);
  if (!STATES.includes(r.status)) errors.push(`${r.id}: status ${r.status} is not one of ${STATES.join(", ")}`);
  if (r.status === "built" || r.status === "partial") {
    // evidence is checked here; evidence_elsewhere names files in everything-ecosystem, which this repository cannot check.
    if (!r.evidence?.length && !r.evidence_elsewhere?.length) errors.push(`${r.id} is ${r.status} but cites no file`);
    if (!PAGES_ONLY) for (const f of r.evidence ?? []) if (!existsSync(join(repo, f))) errors.push(`${r.id} cites ${f}, which does not exist`);
    if (PAGES_ONLY) for (const f of r.evidence_elsewhere ?? []) if (!existsSync(resolve(f))) errors.push(`${r.id} cites ${f} in this repository, which does not exist`);
    if (!r.page) errors.push(`${r.id} is ${r.status} but names no docs page`);
    else if (DOCS && !existsSync(join(DOCS, `${r.page}.mdx`))) errors.push(`${r.id} names page ${r.page}, which does not exist`);
  }
}
for (const id of ids) if (!seen.has(id)) errors.push(`${id} is in the ledger but has no status`);

const count = (s) => data.rows.filter((r) => r.status === s).length;
const counts = Object.fromEntries(STATES.map((s) => [s, count(s)]));

function page() {
  const chapters = [...new Set(data.rows.map((r) => r.chapter))];
  // MDX reads { and < as code outside backticks, so they are escaped there.
  const mdx = (t) => t.split(/(`[^`]*`)/).map((x, i) => i % 2 ? x : x.replace(/[{}]/g, (c) => `\\${c}`).replace(/</g, "&lt;").replace(/>/g, "&gt;")).join("");
  const cell = (s) => mdx(String(s ?? "")).replace(/\|/g, "\\|");
  const lines = [
    "---",
    "title: What's built",
    "description: Which of the 234 concepts translated from Next.js work today, which partly work, and which are design only.",
    "type: reference",
    "status: draft",
    `lastReviewed: ${data.checked}`,
    "owner: builder",
    "---",
    "",
    `Use this page to tell what you can run today from what is designed but not built. Every concept in the Next.js translation ledger is listed, in the ledger's chapter order. It is generated from \`${STATUS}\` by \`node schema/check-nextjs-status.mjs --write\`, and the test suite fails when the two disagree.`,
    "",
    "## Summary",
    "",
    "| Status | Concepts | Meaning |",
    "| --- | --- | --- |",
    `| built | ${counts.built} | Works end to end and is tested |`,
    `| partial | ${counts.partial} | Some of it works; the note says what is missing |`,
    `| not built | ${counts["not built"]} | Designed in the ledger, not in the code yet |`,
    `| n/a | ${counts["n/a"]} | The ledger marks it as not converting from Next.js |`,
    "",
  ];
  for (const c of chapters) {
    const rows = data.rows.filter((r) => r.chapter === c);
    lines.push(`## ${c.replace(/^Chapter \d+: /, "")}`, "", "| Concept | Status | Explained in | Note |", "| --- | --- | --- | --- |");
    for (const r of rows) lines.push(`| ${r.id} | ${r.status} | ${r.page && r.page !== "get-started/whats-built" ? `[${r.page.split("/").at(-1)}](/docs/${r.page})` : ""} | ${cell(r.note)} |`);
    lines.push("");
  }
  return lines.join("\n");
}

if (PAGE && process.argv.includes("--write")) { writeFileSync(PAGE, page()); console.log(`wrote ${PAGE}`); }
else if (PAGE && (!existsSync(PAGE) || readFileSync(PAGE, "utf8") !== page())) errors.push(`${PAGE} is out of date: run node schema/check-nextjs-status.mjs --docs <dir> --write`);

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${data.rows.length} concepts: ${STATES.map((s) => `${counts[s]} ${s}`).join(", ")}`);
