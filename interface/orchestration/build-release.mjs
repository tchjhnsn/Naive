#!/usr/bin/env node
// naive build (I-17, C-13): checks every open package can be released, then writes the release to
// <venture>/.release/: release.json (the manifest: confirmed records frozen in, named live holes, the
// route table as the release holds it), records/ (the frozen copies) and card.json (the release card).
// It refuses, exit 1, when a record in an open package is unconfirmed or a check fails, and names each
// one with the command that settles it. The rules are in interface/orchestration/releases.mjs.
//
//   node interface/orchestration/build-release.mjs <venture dir> [--now <iso time>] [--json] [--dry-run]
//   node interface/orchestration/build-release.mjs <venture dir> --add <route>       add one new item without rebuilding (C-18)
//   node interface/orchestration/build-release.mjs <venture dir> --export <out dir>  the release as plain files, no holes (Z-3)
//
// --port is accepted and ignored, so naive build and naive start can pass the same arguments.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { add, build, exportRelease } from "./releases.mjs";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const has = (n) => args.includes(`--${n}`);
const values = new Set(["now", "add", "export", "port"].flatMap((n) => (opt(n) !== undefined ? [opt(n)] : [])));
const dir = args.find((a) => !a.startsWith("--") && !values.has(a));
if (!dir || !existsSync(join(dir, "venture.json"))) {
  console.error("usage: node interface/orchestration/build-release.mjs <venture dir> [--now <iso>] [--json] [--dry-run] | --add <route> | --export <out dir>");
  process.exit(2);
}
const actor = process.env.MENTURA_ACTOR === "agent" ? "agent" : "person";
const now = opt("now") ?? new Date().toISOString();
if (opt("now") && Number.isNaN(Date.parse(opt("now")))) { console.error(`--now ${opt("now")} is not a time`); process.exit(2); }

if (opt("export")) {
  const r = exportRelease(dir, opt("export"));
  if (!r.ok) { console.error(r.error); process.exit(1); }
  console.log(has("json") ? JSON.stringify(r, null, 2) : `exported ${r.records} records to ${r.out}; ${r.left_out_live} live items left out`);
  process.exit(0);
}

if (opt("add")) {
  /** @type {{ ok: boolean, error?: string, fix?: string, manifest?: *, added?: { route: string, file: string, from: string } }} */
  const r = await add(dir, opt("add"), { now, actor });
  if (!r.ok) { console.error(r.error + (r.fix ? `\n  fix: ${r.fix}` : "")); process.exit(1); }
  console.log(has("json") ? JSON.stringify(r.manifest, null, 2) : `added ${r.added.route} to release ${r.added.from}: now release ${r.manifest.release}; nothing else was rebuilt`);
  process.exit(0);
}

const r = await build(dir, { now, actor, dryRun: has("dry-run") });
if (!r.ok) {
  if (r.error) { console.error(r.error); process.exit(1); }
  if (has("json")) console.log(JSON.stringify(r, null, 2));
  console.error("naive build: no release written.");
  for (const p of r.packages.filter((x) => !x.releasable)) console.error(`  package ${p.id} cannot be released:`);
  for (const b of r.blockers) console.error(`    ${b.file}: ${b.why}\n      fix: ${b.fix}`);
  for (const c of r.failed_checks) console.error(`  check ${c.check} failed:\n    ${c.output.replace(/\n/g, "\n    ")}`);
  process.exit(1);
}
const m = r.manifest;
if (has("json")) { console.log(JSON.stringify(m, null, 2)); process.exit(0); }
console.log(`${r.dry_run ? "would write" : "wrote"} release ${m.release} for ${m.venture} (${m.phase}) as of ${m.now}`);
console.log(`  ${m.records.length} records frozen, ${m.holes.length} live holes, ${m.left_out.length} files left out`);
for (const p of m.packages) console.log(`  package ${p.id.padEnd(12)} ${p.releasable ? "released" : "blocked"}  shell ${p.shell ?? "empty"}${p.gaps.length ? `  not written yet: ${p.gaps.join(", ")}` : ""}`);
for (const h of m.holes) console.log(`  hole ${h.kind.padEnd(9)} ${h.name}: ${h.why}`);
console.log(`  cache: ${m.cache.hits} hits, ${m.cache.misses} misses${m.cache.fresh ? " (started fresh: new framework, packages or model)" : ""}`);
