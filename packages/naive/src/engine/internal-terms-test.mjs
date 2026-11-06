// Tests for the internal-terms dictionary (publishing gate item 8): Naive's list and a venture's
// founder-edited governance/internal-terms.json both match packages/naive/src/records/internal-terms.schema.json, every
// pattern compiles, a venture's own terms apply with --venture, and a warn term reports without failing.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { leaks } from "./check-leaks.mjs";
import { readSchema } from "../records/index.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const schema = readSchema("internal-terms");
const item = schema.properties.patterns.items;

// The schema's shape, checked without a validator: required keys, known keys, enums, compiling regexes.
function problems(doc) {
  const out = [];
  for (const k of schema.required) if (!(k in doc)) out.push(`missing ${k}`);
  for (const k of Object.keys(doc)) if (!schema.properties[k]) out.push(`unknown key ${k}`);
  const ids = new Set();
  for (const p of doc.patterns ?? []) {
    for (const k of item.required) if (!(k in p)) out.push(`${p.id}: missing ${k}`);
    for (const k of Object.keys(p)) if (!item.properties[k]) out.push(`${p.id}: unknown key ${k}`);
    if (!new RegExp(item.properties.id.pattern).test(p.id)) out.push(`${p.id}: bad id`);
    if (ids.has(p.id)) out.push(`${p.id}: duplicate id`); ids.add(p.id);
    for (const k of ["kind", "severity"]) if (p[k] !== undefined && !item.properties[k].enum.includes(p[k])) out.push(`${p.id}: ${k} ${p[k]}`);
    try { new RegExp(p.regex, "g"); } catch (e) { out.push(`${p.id}: ${e.message}`); }
  }
  return out;
}

for (const f of ["packages/naive/src/engine/internal-terms.json", "packages/naive/src/records/examples/software/ventures/relay/governance/internal-terms.json"]) {
  const bad = problems(JSON.parse(readFileSync(join(repo, f), "utf8")));
  expect(`${f} matches packages/naive/src/records/internal-terms.schema.json`, bad.length === 0, bad);
}

const ws = mkdtempSync(join(tmpdir(), "terms-"));
try {
  const v = join(ws, "v");
  mkdirSync(join(v, "governance"), { recursive: true });
  writeFileSync(join(v, "venture.json"), JSON.stringify({ id: "v" }));
  writeFileSync(join(v, "governance/internal-terms.json"), JSON.stringify({ patterns: [
    { id: "codename-orchid", kind: "codename", regex: "\\bOrchid\\b", why: "unannounced codename" },
    { id: "jargon-precog", kind: "phase-jargon", regex: "\\bprecog\\b", why: "internal word", severity: "warn" },
  ] }));
  writeFileSync(join(ws, "page.mdx"), "Orchid ships soon, with precog.\n");
  expect("Naive's own patterns do not know a venture's codename", !leaks([join(ws, "page.mdx")]).some((l) => l.pattern === "codename-orchid"));
  const found = leaks([join(ws, "page.mdx")], { venture: v });
  expect("a venture's founder-edited terms apply with --venture", found.some((l) => l.pattern === "codename-orchid" && l.severity === "fail") && found.some((l) => l.pattern === "jargon-precog" && l.severity === "warn"), found);
  const cli = (file) => spawnSync("node", [join(repo, "packages/naive/src/engine/check-leaks.mjs"), file, "--venture", v], { encoding: "utf8" });
  expect("a fail term fails the check", cli(join(ws, "page.mdx")).status === 1);
  writeFileSync(join(ws, "warn.mdx"), "Now with precog.\n");
  const w = cli(join(ws, "warn.mdx"));
  expect("a warn term is reported and does not fail", w.status === 0 && /WARN/.test(w.stderr), w.stdout + w.stderr);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nthe internal-terms dictionary holds");
