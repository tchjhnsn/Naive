// Checks each venture's provenance log (<venture>/provenance.jsonl, EE-031).
//   errors: a line that is not JSON; a broken chain (a line's prev is not the hash of the line
//     before, or its hash does not match its content), which means a line was edited, removed or
//     reordered; an entity outside the venture folder (a record in another source is logged by
//     its address, <source>://<path>, and carries the source's version; EE-037).
//   warnings: a logged file that has changed since its last entry, or is gone, so its later
//     history is only in git; a derived_from path (not a URL or a decision id) that is not in the
//     venture folder; time going backwards.
// The schema of each line is checked by packages/naive/src/records/validate.py.
//
//   node packages/naive/src/checks/check-provenance.mjs <workspace or venture dir>
//   node packages/naive/src/checks/check-provenance.mjs --package <handoff.json>
//
// --package checks the membership-gate sidecar <id>.provenance.jsonl beside that file.
// A gate line is about the package body's sha256, not about its position, so any gate may be
// the first line. Two identical lines for the same gate and the same body are an error.

import { ventureFile } from "../core/venture-paths.mjs";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { contentHash, gateLineKey, gateSidecar, lineHash, LOG, packageForSidecar } from "../core/provenance.mjs";

const errors = [], warnings = [];
let logs = 0, lines = 0;

// One sidecar. The chain still detects an edited line. Nothing here requires one gate to precede another.
function checkSidecar(packageFile) {
  const log = gateSidecar(packageFile);
  if (!existsSync(log)) return;
  logs++;
  const label = log;
  let prev = "genesis";
  const seen = new Set();
  /** @type {any} */
  let last = null;
  readFileSync(log, "utf8").split("\n").forEach((l, i) => {
    if (!l.trim()) return;
    const where = `${label}:${i + 1}`;
    let e;
    try { e = JSON.parse(l); } catch { errors.push(`${where}: not JSON`); prev = null; return; }
    lines++;
    if (e.activity !== "gate") errors.push(`${where}: a package sidecar holds gate lines only`);
    if (prev !== null && e.prev !== prev) errors.push(`${where}: chain broken: prev does not match the line before (a line was edited, removed or reordered)`);
    if (e.hash !== lineHash(e.prev, e)) errors.push(`${where}: hash does not match the line's content (the line was edited)`);
    if (!/^[0-9a-f]{64}$/.test(e.sha256 ?? "")) errors.push(`${where}: sha256 is not the package body's hash`);
    if (!e.judgment || !e.gate) errors.push(`${where}: a gate line names the function and the verdict`);
    const key = e.judgment ? gateLineKey(e) : "";
    if (key && seen.has(key)) errors.push(`${where}: the same gate on the same body is recorded twice`);
    if (key) seen.add(key);
    prev = e.hash;
    last = e;
  });
  if (existsSync(packageFile) && last && last.sha256 !== contentHash(packageFile)) warnings.push(`${label}: the last line is for a different body; the package changed after that gate`);
}

const packageFlag = process.argv.indexOf("--package");
if (packageFlag !== -1) {
  const file = process.argv[packageFlag + 1];
  if (!file) { console.error("usage: node packages/naive/src/checks/check-provenance.mjs --package <handoff.json>"); process.exit(2); }
  const abs = resolve(file);
  if (!abs.endsWith(".json")) { console.error("a handoff package is a .json file"); process.exit(2); }
  if (!existsSync(gateSidecar(abs))) { console.error(`no sidecar beside ${abs}`); process.exit(1); }
  checkSidecar(abs);
  for (const w of warnings) console.warn(`warning: ${w}`);
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  console.log(`${logs} provenance logs, ${lines} entries: every chain holds.`);
  process.exit(0);
}

const dir = process.argv[2];
if (!dir) { console.error("usage: node packages/naive/src/checks/check-provenance.mjs <workspace or venture dir>"); process.exit(2); }
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
const sidecars = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
  : e.isDirectory() ? sidecars(join(d, e.name)) : e.name.endsWith(".provenance.jsonl") && e.name !== LOG ? [join(d, e.name)] : []);

for (const root of walk(dir)) {
  const f = ventureFile(root, LOG);
  if (!existsSync(f)) {
    for (const side of sidecars(root)) checkSidecar(packageForSidecar(side));
    continue;
  }
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
  for (const side of sidecars(root)) checkSidecar(packageForSidecar(side));
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${logs} provenance logs, ${lines} entries: every chain holds.`);
