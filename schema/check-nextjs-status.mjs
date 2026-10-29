#!/usr/bin/env node
// Checks docs/design/naive-nextjs-status.json against the Next.js translation ledger and the code: every
// concept row in the ledger has exactly one status; a built or partial row cites files that exist and a
// docs page that exists; and the generated "What's built" page matches the data.
//
//   node schema/check-nextjs-status.mjs            check, and print the counts
//   node schema/check-nextjs-status.mjs --write    write site/content/docs/get-started/whats-built.mdx

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
const LEDGER = "docs/design/NAIVE_NEXTJS_TRANSLATION_2026-10-28.md";
const STATUS = "docs/design/naive-nextjs-status.json";
const PAGE = "site/content/docs/get-started/whats-built.mdx";
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
    if (!r.evidence?.length) errors.push(`${r.id} is ${r.status} but cites no file`);
    for (const f of r.evidence ?? []) if (!existsSync(join(repo, f))) errors.push(`${r.id} cites ${f}, which does not exist`);
    if (!r.page) errors.push(`${r.id} is ${r.status} but names no docs page`);
    else if (!existsSync(join(repo, "site/content/docs", `${r.page}.mdx`))) errors.push(`${r.id} names page ${r.page}, which does not exist`);
  }
}
for (const id of ids) if (!seen.has(id)) errors.push(`${id} is in the ledger but has no status`);

const count = (s) => data.rows.filter((r) => r.status === s).length;
const counts = Object.fromEntries(STATES.map((s) => [s, count(s)]));

function page() {
  const chapters = [...new Set(data.rows.map((r) => r.chapter))];
  const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");
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

if (process.argv.includes("--write")) { writeFileSync(join(repo, PAGE), page()); console.log(`wrote ${PAGE}`); }
else if (!existsSync(join(repo, PAGE)) || readFileSync(join(repo, PAGE), "utf8") !== page()) errors.push(`${PAGE} is out of date: run node schema/check-nextjs-status.mjs --write`);

if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${data.rows.length} concepts: ${STATES.map((s) => `${counts[s]} ${s}`).join(", ")}`);
