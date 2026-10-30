// Checks each venture's provenance log (<venture>/provenance.jsonl, EE-031).
//   errors: a line that is not JSON; a broken chain (a line's prev is not the hash of the line
//     before, or its hash does not match its content), which means a line was edited, removed or
//     reordered; an entity outside the venture folder (a record in another source is logged by
//     its address, <source>://<path>, and carries the source's version; EE-037).
//   warnings: a logged file that has changed since its last entry, or is gone, so its later
//     history is only in git; a derived_from path (not a URL or a decision id) that is not in the
//     venture folder; time going backwards.
// The schema of each line is checked by schema/validate.py.
//
//   node schema/check-provenance.mjs <workspace or venture dir>

import { ventureFile } from "./venture-paths.mjs";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { contentHash, lineHash, LOG } from "../interface/provenance.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-provenance.mjs <workspace or venture dir>"); process.exit(2); }
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
const errors = [], warnings = [];
let logs = 0, lines = 0;

for (const root of walk(dir)) {
  const f = ventureFile(root, LOG);
  if (!existsSync(f)) continue;
  logs++;
  const id = JSON.parse(readFileSync(join(root, "venture.json"), "utf8")).id;
  let prev = "genesis", at = "";
  const last = new Map();
  readFileSync(f, "utf8").split("\n").forEach((l, i) => {
    if (!l.trim()) return;
    const where = `${id}/${LOG}:${i + 1}`;
    let e;
    try { e = JSON.parse(l); } catch { errors.push(`${where}: not JSON`); prev = null; return; }
    lines++;
    if (prev !== null && e.prev !== prev) errors.push(`${where}: chain broken: prev does not match the line before (a line was edited, removed or reordered)`);
    if (e.hash !== lineHash(e.prev, e)) errors.push(`${where}: hash does not match the line's content (the line was edited)`);
    if (/^\/|(^|\/)\.\.(\/|$)/.test(e.entity ?? "") || (/^[a-z][a-z0-9+.-]*:\/\//.test(e.entity ?? "") && !e.source)) errors.push(`${where}: entity ${e.entity} is outside the venture folder`);
    if (e.at < at) warnings.push(`${where}: time goes backwards`);
    at = e.at; prev = e.hash;
    if (typeof e.entity !== "string") { errors.push(`${where}: no entity`); return; }
    if (!e.source) last.set(e.entity, e);
    for (const d of e.derived_from ?? []) if (!/^[a-z][a-z0-9+.-]*:\/\//.test(d) && !/^[A-Z]+-\d+$/.test(d) && !d.startsWith("_drafts/") && !existsSync(ventureFile(root, d))) warnings.push(`${where}: derived from ${d}, which is not in the venture folder`);
  });
  for (const [entity, e] of last) {
    const p = ventureFile(root, entity);
    if (!existsSync(p)) { if (e.activity !== "draft") warnings.push(`${id}: ${entity} is in the log but gone; git holds what happened`); continue; }
    if (contentHash(p) !== e.sha256) warnings.push(`${id}: ${entity} changed outside the router since ${e.at}; git holds that history`);
  }
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${logs} provenance logs, ${lines} entries: every chain holds.`);
