// Leak canaries (publishing gate item 9): prove no internal record text reaches public output.
// Copies the in-repo venture, plants a unique canary in the prose fields of every internal record (one
// canary per record, so a hit names the record), then builds what the public sees: the site's facts
// (site/scripts/venture-facts.mjs, which the <Fact> components render), the marketing artifact
// (site/scripts/artifact.mjs) and the foundation one-pager (site/scripts/foundation.mjs). Any canary in
// the output is a leak. Today's leaks are listed in schema/known-leaks.json: a leak not listed fails, and
// a listed leak that no longer happens fails too, so the list shrinks to empty as the fixes land.

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const walk = (p) => !existsSync(p) ? [] : statSync(p).isDirectory() ? readdirSync(p).flatMap((n) => walk(join(p, n))) : [p];

// Prose fields only: ids, enums and derived short forms are left alone so the records still check.
const PROSE = new Set(["statement", "who", "why", "description", "summary", "answer", "promise", "note", "text", "rationale", "title", "question", "jobs", "forms", "segment"]);
const ws = mkdtempSync(join(tmpdir(), "canaries-"));
const v = join(ws, "everything-ecosystem");
cpSync(join(repo, "instance/ventures/everything-ecosystem"), v, { recursive: true });
const seeded = {};
for (const f of walk(v).filter((f) => f.endsWith(".json") && !f.endsWith(".visibility.json"))) {
  const rel = relative(v, f);
  const tag = `CANARY-${rel.replace(/[^a-z0-9]+/gi, "-").replace(/-json$/, "")}`;
  let n = 0;
  const seed = (x, k) => typeof x === "string" ? (PROSE.has(k) && x.includes(" ") && x.length > 15 ? (n++, `${x} ${tag}`) : x)
    : Array.isArray(x) ? x.map((y) => seed(y, k)) : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).map(([kk, y]) => [kk, seed(y, kk)])) : x;
  let j;
  try { j = JSON.parse(readFileSync(f, "utf8")); } catch { continue; }
  const out = seed(j);
  if (n) { writeFileSync(f, JSON.stringify(out, null, 2) + "\n"); seeded[tag] = rel; }
}

const outputs = ["site/generated/venture-facts.json", "site/artifact/index.html", "site/artifact/foundation.html"];
const before = Object.fromEntries(outputs.map((o) => [o, existsSync(join(repo, o)) ? readFileSync(join(repo, o)) : null]));
const env = { ...process.env, NAIVE_VENTURE: v, MENTURA_WORKSPACE: ws, FOUNDATION_VENTURE: "everything-ecosystem" };
try {
  expect("a canary is planted in every internal record type with prose", Object.keys(seeded).length >= 20, Object.keys(seeded).length);
  for (const s of ["venture-facts.mjs", "artifact.mjs", "foundation.mjs"]) {
    const r = spawnSync("node", [join(repo, "site/scripts", s)], { env, encoding: "utf8" });
    expect(`${s} builds from the seeded venture`, r.status === 0, r.stderr.slice(0, 400));
  }
  const found = [];
  for (const o of outputs) {
    if (!existsSync(join(repo, o))) continue;
    for (const tag of new Set(readFileSync(join(repo, o), "utf8").match(/CANARY-[A-Za-z0-9-]+/g) ?? [])) found.push({ output: o, record: seeded[tag] ?? tag });
  }
  const known = JSON.parse(readFileSync(join(repo, "schema/known-leaks.json"), "utf8")).leaks;
  const key = (l) => `${l.output} <- ${l.record}`;
  const knownKeys = new Set(known.map(key)), foundKeys = new Set(found.map(key));
  const fresh = found.filter((l) => !knownKeys.has(key(l)));
  const fixed = known.filter((l) => !foundKeys.has(key(l)));
  expect("no new leak: every canary in public output is a known leak", fresh.length === 0, fresh.map(key));
  expect("every known leak still happens (remove the fixed ones from schema/known-leaks.json)", fixed.length === 0, fixed.map(key));
  expect("the site's facts (what <Fact> renders) carry no canary", !found.some((l) => l.output === "site/generated/venture-facts.json"), found);
  console.log(`  known leaks today: ${known.length}${known.length ? ` (${[...new Set(known.map((l) => l.output))].join(", ")})` : ""}`);
} finally {
  // Put back what was built before, so no canary is left in the site's outputs.
  for (const o of outputs) { if (before[o]) writeFileSync(join(repo, o), before[o]); else rmSync(join(repo, o), { force: true }); }
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nno new leak: the canaries hold");
