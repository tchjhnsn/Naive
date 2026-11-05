#!/usr/bin/env node
// Stale summaries (V-9). In Next.js, content from a CMS is cached for a long time, and the CMS calls a
// webhook that revalidates its tag when the content changes. In Naive a system of record (a CRM, a bank
// such as Rho) notifies the venture that something it holds changed, and every summary that reads it is
// marked stale until it is written again. What reads what is already recorded:
//
//   - provenance: a record whose latest write was derived from the changed item (derived_from names its
//     path or its <source>://<path> address, or a folder that holds it) reads it;
//   - the where-used list (knowledge/where-used.json, V-4): every child of a fact whose parent route is
//     the changed record repeats it.
//
// Receiving the notification over the network is the app's (Mentura's webhooks); this is
// the framework part, offline: notify() marks, staleOf() answers for one file (the router adds it to a
// read), and a summary is fresh again once it is written after the mark. Marks live in
// <venture>/.naive/stale.json, never in the records.
//
//   node schema/stale.mjs <venture dir> [--json]                                   what is stale now
//   node schema/stale.mjs <venture dir> --notify --source <id> --path <p> [--path <q>] [--version <v>]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { entries } from "../packages/core/provenance.mjs";
import { resolve as resolveRoute } from "../packages/routes/routes.mjs";
import { address } from "../knowledge/connectors/contract.mjs";
import { LOCAL, sourcesOf } from "../knowledge/connectors/index.mjs";
import { ventureFile } from "../packages/core/venture-paths.mjs";

export const MARKS = ".naive/stale.json";
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const now = () => new Date().toISOString();
const WRITES = new Set(["write", "accept", "baseline"]);

const readMarks = (dir) => (existsSync(ventureFile(dir, MARKS)) ? load(ventureFile(dir, MARKS)) : { marks: [] });

// The latest write of each file in the log.
function lastWrites(dir) {
  const last = new Map();
  for (const e of entries(dir)) if (WRITES.has(e.activity) && !e.source) last.set(e.entity, e);
  return last;
}

const covers = (d, item) => d === item || (d.endsWith("/") ? item.startsWith(d) : item.startsWith(`${d}/`));

/**
 * A system of record says items changed. Marks every summary that reads them stale and returns what it
 * marked. source: a source id from knowledge/sources.json (venture for the venture's own folder);
 * paths: the changed items, as paths inside that source.
 */
export function notify(dir, { source, paths, version, at = now(), via = "framework" }) {
  const map = sourcesOf(dir);
  if (!source || !map.sources.some((s) => s.id === source)) throw new Error(`no source ${source} in ${dir}'s knowledge/sources.json: one of ${map.sources.map((s) => s.id).join(", ")}`);
  paths = [paths].flat().filter(Boolean);
  if (!paths.length) throw new Error("a notification names at least one changed path");
  // The changed items as the venture refers to them: the address always, and the bare path for its own folder
  // or for a source whose records the venture keeps a local copy of at the same path.
  const items = paths.flatMap((p) => [address(source, p), ...(source === LOCAL || existsSync(ventureFile(dir, p)) ? [p] : [])]);
  const readers = new Map();
  for (const [file, e] of lastWrites(dir)) {
    if (items.includes(file)) continue;
    const hit = (e.derived_from ?? []).find((d) => items.some((i) => covers(d, i)));
    if (hit) readers.set(file, { via: "provenance", reads: hit });
  }
  const wu = join(ventureFile(dir, "knowledge/where-used.json"));
  if (existsSync(wu)) {
    for (const fact of load(wu).facts ?? []) {
      const { r, params } = resolveRoute(fact.parent.route);
      if (!r || r.kind !== "record") continue;
      const files = (r.collection === "item" ? r.files.map((f) => f.replace("*", params.id)) : r.files).filter((f) => !f.includes("*"));
      if (!files.some((f) => items.includes(f) || items.includes(address(source, f)))) continue;
      for (const c of fact.children) readers.set(c.source === LOCAL ? c.path : address(c.source, c.path), { via: "where-used", reads: fact.parent.route, fact: fact.id });
    }
  }
  const state = readMarks(dir);
  const because = { source, paths, ...(version ? { version } : {}), at, via };
  for (const [file, how] of readers) state.marks.push({ file, ...how, because, marked_at: now() });
  state.notifications = [...(state.notifications ?? []), { ...because, marked: readers.size, received_at: now() }].slice(-100);
  mkdirSync(join(dir, ".naive"), { recursive: true });
  writeFileSync(ventureFile(dir, MARKS), JSON.stringify(state, null, 2) + "\n");
  return { source, paths, stale: [...readers.keys()].sort() };
}

/** Marks named files stale for a reason the caller already worked out (a merged decision's impact map,
 *  schema/impact.mjs), through the same marks notify() writes; returns the files marked.
 * @param {string} dir
 * @param {string[]} files
 * @param {{ source?: string, paths?: string[], version?: string, reads?: string, via?: string, at?: string }} [opts]
 */
export function mark(dir, files, { source = LOCAL, paths = [], version, reads, via = "framework", at = now() } = {}) {
  files = [...new Set(files)].filter(Boolean);
  if (!files.length) return [];
  const state = readMarks(dir);
  const because = { source, paths, ...(version ? { version } : {}), at, via };
  for (const file of files) state.marks.push({ file, via: "decision", reads: reads ?? paths[0] ?? null, because, marked_at: now() });
  state.notifications = [...(state.notifications ?? []), { ...because, marked: files.length, received_at: now() }].slice(-100);
  mkdirSync(join(dir, ".naive"), { recursive: true });
  writeFileSync(ventureFile(dir, MARKS), JSON.stringify(state, null, 2) + "\n");
  return files.sort();
}

/** Whether one file is stale: the marks made after its latest write, or null when it is fresh. */
export function staleOf(dir, file) {
  if (!existsSync(ventureFile(dir, MARKS))) return null;
  const written = lastWrites(dir).get(file)?.at ?? "";
  const live = readMarks(dir).marks.filter((m) => m.file === file && m.marked_at > written);
  return live.length ? { since: live[0].marked_at, because: live.map((m) => ({ ...m.because, reads: m.reads, via: m.via })), fix: `write ${file} again from the changed source; it is fresh once written` } : null;
}

/** Every stale file in the venture now. */
export function stale(dir) {
  const files = [...new Set(readMarks(dir).marks.map((m) => m.file))];
  return files.map((f) => ({ file: f, ...staleOf(dir, f) })).filter((x) => x.since).sort((a, b) => a.file.localeCompare(b.file));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const a = process.argv.slice(2);
  const dir = a[0];
  const all = (n) => a.flatMap((x, i) => (x === `--${n}` ? [a[i + 1]] : []));
  if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node schema/stale.mjs <venture dir> [--json] | --notify --source <id> --path <p> [--version <v>]"); process.exit(2); }
  try {
    if (a.includes("--notify")) {
      const r = notify(dir, { source: all("source")[0], paths: all("path"), version: all("version")[0], via: "cli" });
      if (a.includes("--json")) console.log(JSON.stringify(r, null, 2));
      else console.log(r.stale.length ? `${r.stale.length} stale: ${r.stale.join(", ")}` : "nothing reads what changed, so nothing is stale");
    } else {
      const s = stale(dir);
      if (a.includes("--json")) console.log(JSON.stringify(s, null, 2));
      else console.log(s.length ? s.map((x) => `stale  ${x.file}  since ${x.since}: ${x.because.map((b) => `${b.source} changed ${b.paths.join(", ")}`).join("; ")}`).join("\n") : "nothing is stale");
    }
  } catch (e) { console.error(e.message); process.exit(1); }
}
