#!/usr/bin/env node
// Legal lint. This is a lint, not legal advice.
//
//   node schema/lint-legal.mjs <venture dir> [--json]
//
// Two rules, both fail-open (warn) by default. naive.config.json legal_lint.rules.<id>.mode
// set to "fail-closed" makes that rule's findings fail the run (exit 1). Exit 1 if and only if
// a fail-closed rule has findings. Every input is read through ventureFile.
//
// A public claim is a marketing content file (marketing/content or operations/marketing/content,
// *.mdx) whose frontmatter has a non-empty claim and publish: true. It has a source when source
// or sources is a non-empty string. A draft (publish is not true) is not a public claim.
//
// An agreement is governance/founder-agreement.json. Each founders[].holder is a counterparty.
// A counterparty record is an ownership holder, people/founders/<id>.json, accounts/<id>/account.json,
// customers/<id>.json, or investors/<id>.json. A file that is missing or does not parse is skipped.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { ventureFile } from "../packages/core/venture-paths.mjs";

const NOTICE = "This is a lint, not legal advice.";
const ID = /^[a-z0-9][a-z0-9-]*$/;
const CONTENT = ["marketing/content", "operations/marketing/content"];

export const RULES = [
  { id: "unsourced-public-claim", description: "A public claim with no source", severity: "warn", mode: "fail-open" },
  { id: "agreement-no-counterparty", description: "An agreement with no counterparty record", severity: "warn", mode: "fail-open" },
];

const readText = (dir, rel) => {
  try { return readFileSync(ventureFile(dir, rel), "utf8"); } catch { return null; }
};

// absent: no file. malformed: the bytes are not JSON. ok: a parsed value.
function readJson(dir, rel) {
  const text = readText(dir, rel);
  if (text === null) return { status: "absent" };
  try { return { status: "ok", value: JSON.parse(text) }; } catch { return { status: "malformed" }; }
}

const plain = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

function modesOf(dir) {
  const loaded = readJson(dir, "naive.config.json");
  const root = loaded.status === "ok" && plain(loaded.value) ? loaded.value.legal_lint : undefined;
  const table = plain(root) ? root.rules : undefined;
  return (id, fallback) => {
    const row = plain(table) ? table[id] : undefined;
    const mode = plain(row) ? row.mode : undefined;
    return mode === "fail-open" || mode === "fail-closed" ? mode : fallback;
  };
}

function walkMdx(dir, logical) {
  let entries;
  try { entries = readdirSync(ventureFile(dir, logical), { withFileTypes: true }); } catch { return []; }
  const out = [];
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name.startsWith("_") || e.name === "node_modules") continue;
    const rel = `${logical}/${e.name}`;
    if (e.isDirectory()) {
      if (["repo", "codebase"].includes(e.name)) continue;
      try { if (existsSync(ventureFile(dir, `${rel}/venture.json`))) continue; } catch { continue; }
      out.push(...walkMdx(dir, rel));
    } else if (e.name.endsWith(".mdx")) out.push(rel);
  }
  return out;
}

// Frontmatter only. A file that does not open and close a block is not a claim.
function claimOf(text) {
  if (typeof text !== "string") return null;
  const block = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!block) return null;
  const meta = {};
  for (const line of block[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"') && v.length >= 2) || (v.startsWith("'") && v.endsWith("'") && v.length >= 2)) v = v.slice(1, -1).trim();
    meta[kv[1]] = v;
  }
  const claim = (meta.claim ?? "").trim();
  if (!claim) return null;
  if (meta.publish !== "true") return { public: false };
  const source = (meta.source ?? meta.sources ?? "").trim();
  return { public: true, claim, source };
}

function holderIds(dir) {
  const loaded = readJson(dir, "governance/ownership.json");
  const ids = new Set();
  if (loaded.status !== "ok" || !plain(loaded.value) || !Array.isArray(loaded.value.holders)) return ids;
  for (const h of loaded.value.holders) if (plain(h) && typeof h.id === "string" && ID.test(h.id)) ids.add(h.id);
  return ids;
}

function counterpartyExists(dir, id, holders) {
  if (!ID.test(id)) return false;
  const paths = [
    `people/founders/${id}.json`,
    `accounts/${id}/account.json`,
    `customers/${id}.json`,
    `investors/${id}.json`,
  ];
  for (const p of paths) {
    try { if (existsSync(ventureFile(dir, p))) return true; } catch { /* skip this path */ }
  }
  return holders.has(id);
}

// null when the file is missing or does not parse. [] when it parses and names no holder.
function partiesOf(dir) {
  const loaded = readJson(dir, "governance/founder-agreement.json");
  if (loaded.status !== "ok" || !plain(loaded.value)) return null;
  const founders = loaded.value.founders;
  if (!Array.isArray(founders)) return [];
  const ids = [];
  for (const f of founders) if (plain(f) && typeof f.holder === "string" && ID.test(f.holder)) ids.push(f.holder);
  return ids;
}

export function lint(dir) {
  const mode = modesOf(dir);
  const rules = RULES.map((r) => ({ ...r, mode: mode(r.id, r.mode) }));
  const byId = Object.fromEntries(rules.map((r) => [r.id, r.mode]));
  const findings = [];
  const add = (rule, file, message, suggestion) => findings.push({ rule, mode: byId[rule], file, message, suggestion });

  const files = CONTENT.flatMap((d) => walkMdx(dir, d)).sort();
  for (const file of files) {
    const claim = claimOf(readText(dir, file));
    if (!claim?.public) continue;
    if (!claim.source) add("unsourced-public-claim", file, `public claim "${claim.claim}" has no source`, "name the source this claim rests on (source: in the file's frontmatter)");
  }

  const parties = partiesOf(dir);
  if (parties) {
    const holders = holderIds(dir);
    if (parties.length === 0) add("agreement-no-counterparty", "governance/founder-agreement.json", "agreement names no counterparty", "name each party and add their record (an ownership holder, founder, account, customer, or investor)");
    for (const id of parties) if (!counterpartyExists(dir, id, holders)) add("agreement-no-counterparty", "governance/founder-agreement.json", `agreement names ${id}, and no counterparty record exists for them`, `add a record for ${id}: an ownership holder, people/founders/${id}.json, accounts/${id}/account.json, customers/${id}.json, or investors/${id}.json`);
  }

  const failed = findings.some((x) => x.mode === "fail-closed");
  return { ok: !failed, notice: NOTICE, rules, findings };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir || !existsSync(ventureFile(dir, "venture.json"))) {
    console.error("usage: node schema/lint-legal.mjs <venture dir> [--json]");
    process.exit(2);
  }
  const r = lint(dir);
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(r.notice);
    for (const x of r.findings) console.log(`${x.mode === "fail-closed" ? "FAIL" : "WARN"}  [${x.rule}] ${x.file}: ${x.message} -> ${x.suggestion}`);
    console.log(`${r.findings.length} finding(s); ${r.ok ? "ok" : "failed (fail-closed rule)"}`);
  }
  process.exit(r.ok ? 0 : 1);
}

/** Command route legal/lint. interface/router.mjs spreads this into the route table. */
export const legalCommands = (cmd) => [
  cmd("legal/lint", "schema/lint-legal.mjs", "Legal lint, not legal advice: a public claim with no source, and an agreement with no counterparty record. Fail-open unless naive.config.json legal_lint.rules.<id>.mode is fail-closed", { args: [] }),
];
