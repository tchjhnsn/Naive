#!/usr/bin/env node
// Checks each venture's publications manifest (governance/publications.json, schema/publications.schema.json).
// Errors: an artifact that is live (published: true) with no manifest entry; an entry whose sha256 does not
// match its built output; an entry that is live with no approver, or approved by an agent; an entry naming a
// channel the publication policy does not hold or an artifact that does not exist; a live entry published
// before its not_before. Warning: an entry whose artifact went stale (a record it was built from changed),
// which has to be rebuilt, re-linted and republished.
//
//   node schema/check-publications.mjs <workspace or venture dir>

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../packages/core/venture-paths.mjs";
import { artifacts } from "./check-artifacts.mjs";

const load = (f) => JSON.parse(readFileSync(f, "utf8"));
const sha = (f) => createHash("sha256").update(readFileSync(f)).digest("hex");
const ventures = (d) => existsSync(join(d, "venture.json")) ? [d, ...sub(d)] : sub(d);
const sub = (d) => { try { return readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules").flatMap((e) => ventures(join(d, e.name))); } catch { return []; } };
const agentRoles = new Set(load(new URL("../governance/venture-template/roles/agent-roles.json", import.meta.url)).roles.filter((r) => r.tier && r.tier !== "person").map((r) => r.id));

/** { errors, warnings } for one venture. */
export function checkVenture(dir) {
  const errors = [], warnings = [];
  const mFile = ventureFile(dir, "governance/publications.json");
  const m = existsSync(mFile) ? load(mFile) : { entries: [] };
  const pFile = ventureFile(dir, "governance/publication-policy.json");
  const channels = new Set(existsSync(pFile) ? load(pFile).channels.map((c) => c.id) : []);
  const arts = new Map(artifacts(dir).map((a) => [a.id, a]));
  const at = "governance/publications.json";
  for (const a of arts.values()) {
    const raw = load(ventureFile(dir, a.file));
    if (raw.published && !m.entries.some((e) => e.artifact === a.id && e.sha256)) errors.push(`${a.file}: live (published) with no entry in ${at}`);
  }
  for (const e of m.entries) {
    const where = `${at} ${e.channel}/${e.artifact}`;
    if (!channels.has(e.channel)) errors.push(`${where}: channel ${e.channel} is not in governance/publication-policy.json`);
    if (!arts.has(e.artifact)) errors.push(`${where}: no artifact ${e.artifact} in artifacts/`);
    if (!e.sha256) continue;
    if (!e.approved_by) errors.push(`${where}: live with no approver`);
    else if (agentRoles.has(e.approved_by) || /agent/i.test(e.approved_by)) errors.push(`${where}: approved by ${e.approved_by}, an agent; a person approves`);
    if (!e.output || !existsSync(ventureFile(dir, e.output))) errors.push(`${where}: its built output ${e.output ?? "(none named)"} is missing, so its sha256 cannot be checked`);
    else if (sha(ventureFile(dir, e.output)) !== e.sha256) errors.push(`${where}: sha256 does not match ${e.output}; what is live is not what was approved`);
    if (e.not_before && e.at && new Date(e.at) < new Date(e.not_before)) errors.push(`${where}: published ${e.at}, before its embargo ${e.not_before}`);
    const a = arts.get(e.artifact);
    if (a && a.state !== "fresh") warnings.push(`${where}: stale, ${[...a.changed, ...a.missing].join(", ")} changed since it was built; rebuild, re-lint and republish`);
    for (const p of e.previous ?? []) if (!p.approved_by) errors.push(`${where}: a previous version ${p.sha256.slice(0, 12)} has no approver`);
  }
  return { errors, warnings, entries: m.entries.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2];
  if (!root) { console.error("usage: node schema/check-publications.mjs <workspace or venture dir>"); process.exit(2); }
  let errors = [], warnings = [], n = 0;
  for (const v of ventures(root)) { const r = checkVenture(v); errors.push(...r.errors.map((x) => `${v}: ${x}`)); warnings.push(...r.warnings.map((x) => `${v}: ${x}`)); n += r.entries; }
  for (const w of warnings) console.log(`warning: ${w}`);
  for (const e of errors) console.error(e);
  console.log(errors.length ? `${errors.length} publication error${errors.length === 1 ? "" : "s"}` : `${n} publication${n === 1 ? "" : "s"}: each live one has an entry, an approver and the sha256 of what went out.`);
  process.exit(errors.length ? 1 : 0);
}
