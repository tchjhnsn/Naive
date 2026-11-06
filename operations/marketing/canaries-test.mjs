// Leak canaries (publishing gate item 9): prove no internal record text reaches public output.
// Copies a fixture venture, plants a unique canary in the prose fields of every internal record (one
// canary per record, so a hit names the record), then builds what the public sees through the publish
// build (operations/marketing/publish-build.mjs): the facts, a one-page artifact and the foundation
// one-pager, with Naive's stand-in builders (operations/marketing/fixtures/) named in the copy's
// naive.config.json the way an app names its own. Any canary in the output is a leak. Known leaks are
// listed in packages/naive/src/engine/known-leaks.json: a leak not listed fails, and a listed leak that no longer happens
// fails too, so the list shrinks to empty as the fixes land.

import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { build } from "./publish-build.mjs";

const repo = new URL("../..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const walk = (p) => !existsSync(p) ? [] : statSync(p).isDirectory() ? readdirSync(p).flatMap((n) => walk(join(p, n))) : [p];

// Prose fields only: ids, enums and derived short forms are left alone so the records still check.
const PROSE = new Set(["statement", "who", "why", "description", "summary", "answer", "promise", "note", "text", "rationale", "title", "question", "jobs", "forms", "segment"]);
// The fixture venture: Naive's example software venture, with records across functions.
const FIXTURE = "packages/naive/src/records/examples/software/ventures/relay";
const ws = mkdtempSync(join(tmpdir(), "canaries-"));
const v = join(ws, "venture");
cpSync(join(repo, FIXTURE), v, { recursive: true });
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

const fx = (f) => join(repo, "operations/marketing/fixtures", f);
const channels = {
  facts: { outputs: ["generated/venture-facts.json"], builders: [fx("facts.ts")] },
  artifact: { outputs: ["generated/venture-facts.json", "artifact/index.html"], builders: [fx("facts.ts"), fx("page.ts")] },
  foundation: { outputs: ["artifact/foundation.html"], builders: [fx("foundation.ts")] },
};
const out = join(ws, "out");
writeFileSync(join(v, "naive.config.json"), JSON.stringify({ publish_build: { channels, out } }, null, 2) + "\n");
const outputs = ["generated/venture-facts.json", "artifact/index.html", "artifact/foundation.html"];
try {
  expect("a canary is planted in every internal record type with prose", Object.keys(seeded).length >= 20, Object.keys(seeded).length);
  for (const c of Object.keys(channels)) {
    const r = build(c, v);
    expect(`${c} builds from the seeded venture through the gate`, r.ok, r.errors?.join("; ").slice(0, 400));
  }
  const found = [];
  for (const o of outputs) {
    if (!existsSync(join(out, o))) continue;
    for (const tag of new Set(readFileSync(join(out, o), "utf8").match(/CANARY-[A-Za-z0-9-]+/g) ?? [])) found.push({ output: o, record: seeded[tag] ?? tag });
  }
  const known = JSON.parse(readFileSync(join(repo, "packages/naive/src/engine/known-leaks.json"), "utf8")).leaks;
  const key = (l) => `${l.output} <- ${l.record}`;
  const knownKeys = new Set(known.map(key)), foundKeys = new Set(found.map(key));
  const fresh = found.filter((l) => !knownKeys.has(key(l)));
  const fixed = known.filter((l) => !foundKeys.has(key(l)));
  expect("no new leak: every canary in public output is a known leak", fresh.length === 0, fresh.map(key));
  expect("every known leak still happens (remove the fixed ones from packages/naive/src/engine/known-leaks.json)", fixed.length === 0, fixed.map(key));
  expect("the facts carry no canary", !found.some((l) => l.output === "generated/venture-facts.json"), found);
  console.log(`  known leaks today: ${known.length}${known.length ? ` (${[...new Set(known.map((l) => l.output))].join(", ")})` : ""}`);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nno new leak: the canaries hold");
