#!/usr/bin/env node
// Data packages and raw (EE-070). customers, investors and money hold [id].json master
// records plus append-only _streams/<id>/. A stream.json declares sensitive. A sensitive
// stream may version only stream.json and summary.md. raw/ is immutable: sources/<id>/
// holds source.json and text.md, and original.* stays out of git. An idea map cites raw
// ids once the venture has raw material.
//
//   node schema/check-data-packages.mjs <workspace or venture dir>

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "./venture-paths.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-data-packages.mjs <workspace or venture dir>"); process.exit(2); }

const PACKS = ["customers", "investors", "money"];
const KEEP = new Set(["stream.json", "summary.md"]);
const walk = (d) => existsSync(d) ? readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []) : [];
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const tracked = (root, rel) => {
  const g = spawnSync("git", ["ls-files", "--error-unmatch", "--", rel], { cwd: root, encoding: "utf8" });
  return g.status === 0;
};
const inGit = (root) => spawnSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, encoding: "utf8" }).status === 0;

const errors = [];
let n = 0;
for (const v of walk(dir)) {
  n++;
  const id = load(join(v, "venture.json")).id;
  const git = inGit(v);
  for (const pack of PACKS) {
    const base = ventureFile(v, pack);
    if (!existsSync(base)) continue;
    for (const name of readdirSync(base)) {
      if (name.startsWith("_") || name.startsWith(".")) continue;
      const p = join(base, name);
      if (!statSync(p).isFile() || !name.endsWith(".json")) errors.push(`${id}/${pack}/${name}: a master record is <id>.json`);
    }
    const streams = join(base, "_streams");
    if (!existsSync(streams)) continue;
    for (const s of readdirSync(streams)) {
      const sd = join(streams, s);
      if (!statSync(sd).isDirectory()) { errors.push(`${id}/${pack}/_streams/${s}: a stream is a folder`); continue; }
      const meta = join(sd, "stream.json");
      if (!existsSync(meta)) { errors.push(`${id}/${pack}/_streams/${s}: missing stream.json`); continue; }
      const rec = load(meta);
      if (typeof rec.sensitive !== "boolean") errors.push(`${id}/${pack}/_streams/${s}: stream.json must declare sensitive`);
      if (rec.sensitive !== true) continue;
      for (const f of readdirSync(sd)) {
        if (KEEP.has(f)) continue;
        const rel = join(pack, "_streams", s, f);
        if (!git || tracked(v, rel)) errors.push(`${id}/${rel}: a sensitive stream versions only stream.json and summary.md`);
      }
    }
  }
  const sources = join(ventureFile(v, "raw/sources"));
  if (existsSync(sources)) for (const s of readdirSync(sources)) {
    const sd = join(sources, s);
    if (!statSync(sd).isDirectory() || s.startsWith(".")) continue;
    if (!existsSync(join(sd, "source.json"))) errors.push(`${id}/raw/sources/${s}: missing source.json`);
    if (!existsSync(join(sd, "text.md"))) errors.push(`${id}/raw/sources/${s}: missing text.md`);
    for (const f of readdirSync(sd)) if (f.startsWith("original.") && (!git || tracked(v, join("raw/sources", s, f)))) errors.push(`${id}/raw/sources/${s}/${f}: original.* stays out of git`);
  }
  const map = ["ideas/map.mdx", "purpose/ideas/map.mdx"].map((f) => ventureFile(v, f)).find((p) => existsSync(p));
  const rawIds = new Set();
  const dump = join(ventureFile(v, "raw/dump"));
  if (existsSync(dump)) for (const f of readdirSync(dump)) if (f !== ".gitkeep") rawIds.add(f.replace(/\.[^.]+$/, ""));
  if (existsSync(sources)) for (const s of readdirSync(sources)) if (!s.startsWith(".")) rawIds.add(s);
  if (map && rawIds.size) {
    const text = readFileSync(map, "utf8");
    for (const m of text.matchAll(/<Idea ([^>]*)>/g)) {
      const raw = m[1].match(/\braw="([^"]*)"/);
      const ids = raw ? raw[1].split(",").map((x) => x.trim()).filter(Boolean) : [];
      if (!ids.length) errors.push(`${id}: an idea map node cites no raw id`);
      for (const rid of ids) if (!rawIds.has(rid)) errors.push(`${id}: idea map cites raw id ${rid}, which is not in raw/`);
    }
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${n} ventures: data packages and raw hold.`);
