#!/usr/bin/env node
// Checks each venture's artifacts (artifacts/*.json, packages/naive/src/records/artifact.schema.json): every artifact names
// records that exist, and one built from a record that has changed since is stale and must be rebuilt.
// Records are the source of truth; artifacts are views of them, and the views are what get published.
//
//   node packages/naive/src/engine/check-artifacts.mjs <workspace or venture dir>    exit 1 on a missing record; stale is a warning

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";

const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const ventures = (d) => existsSync(join(d, "venture.json")) ? [d, ...sub(d)] : sub(d);
const sub = (d) => { try { return readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules").flatMap((e) => ventures(join(d, e.name))); } catch { return []; } };

/** The state of every artifact in a venture: fresh, stale (a record changed) or broken (a record is gone). */
export function artifacts(dir) {
  const folder = ventureFile(dir, "artifacts");
  if (!existsSync(folder)) return [];
  return readdirSync(folder).filter((f) => f.endsWith(".json")).sort().map((f) => {
    const a = JSON.parse(readFileSync(join(folder, f), "utf8"));
    const missing = [], changed = [];
    for (const s of a.built_from ?? []) {
      const p = ventureFile(dir, s.record);
      if (!existsSync(p)) missing.push(s.record);
      else if (s.sha256 && sha(p) !== s.sha256) changed.push(s.record);
    }
    return { id: a.id, file: `artifacts/${f}`, published: !!a.published, state: missing.length ? "broken" : changed.length ? "stale" : "fresh", missing, changed };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2];
  if (!root) { console.error("usage: node packages/naive/src/engine/check-artifacts.mjs <workspace or venture dir>"); process.exit(2); }
  const errors = [], warnings = [];
  let n = 0;
  for (const v of ventures(root)) for (const a of artifacts(v)) {
    n++;
    if (a.state === "broken") errors.push(`${a.file}: built from ${a.missing.join(", ")}, which no longer exist`);
    if (a.state === "stale") warnings.push(`${a.file}: ${a.changed.join(", ")} changed since it was built; rebuild it${a.published ? " (it is published, so its audience sees the old version)" : ""}`);
  }
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.error(e);
  console.log(errors.length ? `${errors.length} broken artifact${errors.length === 1 ? "" : "s"}` : `${n} artifact${n === 1 ? "" : "s"}: each names records that exist${warnings.length ? `; ${warnings.length} stale` : ""}.`);
  process.exit(errors.length ? 1 : 0);
}
