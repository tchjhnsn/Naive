#!/usr/bin/env node
// Decision impact. When a decided version of a decision is merged into the records it decides
// (applies_to), every function of the venture that depends on those records is shown what follows:
//
//   1. deterministic: the records that depend on the changed files are found from what is already
//      recorded (provenance derived_from and the where-used list, through stale.mjs notify(); and the
//      refs in schema/data-model.json: a record whose type refers to a changed record's type), and
//      marked stale through the existing revalidation marks;
//   2. the map is written to <decision folder>/<id>.impact.json (schema/decision-impact.schema.json);
//   3. each function with affected records gets an open follow-up decision through propose(). Naive
//      proposes; a person decides (EE-058). The note is an agent's draft, null until one writes it.
//
// merge() runs it at the end and returns the summary.
//
//   node schema/impact.mjs <venture dir> <decision id> [--json]
//   mentura impact <decision> --venture <id>

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { decisionFile, propose, recordOf } from "./decisions.mjs";
import { HOME } from "./packages.mjs";
import { entries as provenance } from "../packages/core/provenance.mjs";
import { mark, notify } from "./stale.mjs";
import { layoutOf, logicalFiles, ventureFile } from "../packages/core/venture-paths.mjs";
import { readDataModel } from "../packages/records/index.mjs";

const MODEL = readDataModel();
const load = (p) => JSON.parse(readFileSync(p, "utf8"));
const stamp = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

/** Every venture function, in the order the impact map lists them. */
export const FUNCTIONS = ["foundation", "validation", "product", "marketing", "finance", "people", "customers", "investors", "money", "operations"];
// A record type's function: its core package, with legal records under foundation, relationships under
// customers, and the money and fund records named here.
const EXTRA = { account: "customers", deal: "investors", "fund-thesis": "investors", "fund-terms": "investors", "money-summary": "money", venture: "foundation", "venture-profile": "foundation", founder: "people", people: "people" };
const PKG = { legal: "foundation", relationships: "customers" };
export function functionOf(file) {
  const t = recordOf(file);
  const byType = t && (EXTRA[t] ?? PKG[HOME[t]] ?? HOME[t]);
  if (byType) return byType;
  const top = file.split("/")[0];
  return FUNCTIONS.includes(top) ? top : PKG[top] ?? null;
}

export { files as ventureRecords };
// Every JSON record in the venture, venture-relative, outside hidden and draft folders and nested ventures.
function files(dir, sub = "") {
  if (!sub && layoutOf(dir) === "structured") return logicalFiles(dir).filter((f) => f.endsWith(".json") && !f.split("/").some((s) => s.startsWith(".") || s.startsWith("_")));
  return readdirSync(join(dir, sub), { withFileTypes: true }).flatMap((e) => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) return e.name.startsWith(".") || e.name.startsWith("_") || e.name === "node_modules" || existsSync(join(dir, rel, "venture.json")) ? [] : files(dir, rel);
    return e.name.endsWith(".json") ? [rel] : [];
  });
}

/** The records that refer, by a data-model ref, to the record types of the changed files. */
function byRefs(dir, changed, list) {
  const types = new Set(changed.map(recordOf).filter(Boolean));
  const dependents = new Set(MODEL.records.filter((r) => r.level === "venture" && (r.refs ?? []).some((x) => types.has(x.to))).map((r) => r.id));
  if (!dependents.size) return [];
  return (list ?? files(dir)).filter((f) => !changed.includes(f) && !f.endsWith(".decision.json") && !f.endsWith(".impact.json") && dependents.has(recordOf(f)));
}

/** The structural impact of any decision, open or decided, without side effects: nothing is marked stale,
 *  nothing proposed, nothing written. The records it would change (applies_to, or the record it decides),
 *  the records that read them (provenance derived_from) or refer to their type (data-model refs), and
 *  the functions those fall in. schema/decision-index.mjs scores open decisions with it.
 * @param {string} dir
 * @param {*} d
 * @param {{ all?: { provenance?: *[], files?: string[] } }} [opts]
 */
export function structural(dir, d, { all } = {}) {
  const changed = [...new Set([...(d.merged?.files ?? []), ...(d.applies_to ?? []).map((t) => t.file), ...(d.decides?.path ? [d.decides.path] : [])])];
  if (!changed.length) return { changed, records: [], functions: [] };
  const log = all?.provenance ?? provenance(dir);
  const readers = log.filter((e) => (e.derived_from ?? []).some((x) => changed.includes(x))).map((e) => e.entity).filter((f) => !changed.includes(f) && !f.includes("://"));
  const records = [...new Set([...readers, ...byRefs(dir, changed, all?.files)])].sort();
  const functions = [...new Set([...changed, ...records].map(functionOf).filter(Boolean))].sort((a, b) => FUNCTIONS.indexOf(a) - FUNCTIONS.indexOf(b));
  return { changed, records, functions };
}

/** Builds, writes and returns the impact map of a decision's merged version. */
export function impact(dir, id, { via = "framework", proposeFollowUps = true } = {}) {
  const file = decisionFile(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  const d = load(ventureFile(dir, file));
  if (!d.merged) return { ok: false, error: `${id} was never merged: nothing changed yet (schema/impact.mjs structural() shows what a merge would touch)` };
  const { version, files: changed = [] } = d.merged;
  if (!changed.length) return { ok: false, error: `${id} names no applies_to: nothing changed` };
  const at = join(dirname(file), `${id}.impact.json`);
  const prior = existsSync(ventureFile(dir, at)) ? load(ventureFile(dir, at)) : null;
  // The map of this merged version is already built and its records marked: a rerun returns it unchanged.
  if (prior?.version === version) return { ok: true, result: summary(at, prior.functions) };
  const why = `decision ${id} version ${version}`;
  // Readers by provenance and the where-used list, marked by notify(); readers by data-model refs, marked here.
  const readers = notify(dir, { source: "venture", paths: changed, version: String(version), via }).stale;
  const refs = byRefs(dir, changed);
  const marked = new Set([...readers, ...mark(dir, refs.filter((f) => !readers.includes(f)), { paths: changed, version: String(version), reads: why, via })]);
  const affected = [...new Set([...readers, ...refs])].filter((f) => !f.includes("://")).sort();
  const functions = FUNCTIONS.map((fn) => {
    const recs = affected.filter((f) => functionOf(f) === fn);
    const proposed = [];
    if (recs.length && proposeFollowUps) {
      const fid = `revise-${fn}-after-${id}-v${version}`.slice(0, 80).replace(/-+$/, "");
      const p = propose(dir, { at: fn, id: fid, question: `Revise ${recs.join(", ")} after ${id} version ${version}?`, decides: { path: recs[0] } }, /** @type {Parameters<typeof propose>[2]} */ ({ agentId: "naive-impact", via }));
      if (p.ok) proposed.push(fid);
    }
    return { function: fn, affected_records: recs, stale: recs.filter((f) => marked.has(f)), note: null, proposed_decisions: proposed };
  });
  const out = { decision: id, version, changed, functions, built_at: stamp() };
  writeFileSync(ventureFile(dir, at), JSON.stringify(out, null, 2) + "\n");
  return { ok: true, result: summary(at, functions, affected.length) };
}

const summary = (file, functions, affected = functions.reduce((n, f) => n + f.affected_records.length, 0)) => ({ file, affected, functions: functions.filter((f) => f.affected_records.length).map((f) => ({ function: f.function, affected: f.affected_records.length, proposed: f.proposed_decisions })) });

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, id] = process.argv.slice(2);
  if (!dir || !id || !existsSync(join(dir, "venture.json"))) { console.error("usage: node schema/impact.mjs <venture dir> <decision id> [--json]"); process.exit(2); }
  const r = impact(dir, id, { via: "cli" });
  if (!r.ok) { console.error(r.error); process.exit(1); }
  if (process.argv.includes("--json")) console.log(JSON.stringify(r.result, null, 2));
  else console.log(r.result.functions.length ? r.result.functions.map((f) => `${f.function.padEnd(11)} ${f.affected} affected${f.proposed.length ? `; proposed ${f.proposed.join(", ")}` : ""}`).join("\n") + `\nwritten to ${r.result.file}` : `nothing depends on what ${id} changed; written to ${r.result.file}`);
}
