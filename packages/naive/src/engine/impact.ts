#!/usr/bin/env node
// Decision impact. When a decided version of a decision is merged into the records it decides
// (applies_to), every function of the venture that depends on those records is shown what follows:
//
//   1. deterministic: the records that depend on the changed files are found from what is already
//      recorded (provenance derived_from and the where-used list, through stale.mjs notify(); and the
//      refs in packages/naive/src/records/data-model.json: a record whose type refers to a changed record's type), and
//      marked stale through the existing revalidation marks;
//   2. the map is written to <decision folder>/<id>.impact.json (packages/naive/src/records/decision-impact.schema.json);
//   3. each function with affected records gets an open follow-up decision through propose(). Naive
//      proposes; a person decides (EE-058). The note is an agent's draft, null until one writes it.
//
// merge() runs it at the end and returns the summary.
//
//   node packages/naive/src/engine/impact.ts <venture dir> <decision id> [--json]
//   mentura impact <decision> --venture <id>

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { decisionFile, propose, recordOf } from "./decisions.ts";
import { HOME } from "./packages.ts";
import { entries as provenance } from "../core/provenance.ts";
import { mark, notify } from "./stale.mjs";
import { layoutOf, logicalFiles, ventureFile } from "../core/venture-paths.ts";
import { readDataModel } from "../records/index.ts";

import type { DataModel, DecisionImpact, DecisionRecord, ProvenanceEntry } from "../records/types/records.d.ts";

/** What a merge of a decision touches, as impact() returns it. */
export type ImpactSummary = { file: string; affected: number; functions: { function: string; affected: number; proposed: string[] }[] };
type FunctionImpact = { function: string; affected_records: string[]; stale: string[]; note: string | null; proposed_decisions: string[] };

const MODEL: DataModel = readDataModel();
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const stamp = () => new Date().toISOString().replace(/\.\d+Z$/, "Z");

/** Every venture function, in the order the impact map lists them. */
export const FUNCTIONS: string[] = ["foundation", "validation", "product", "marketing", "finance", "people", "customers", "investors", "money", "operations"];
// A record type's function: its core package, with legal records under foundation, relationships under
// customers, and the money and fund records named here.
const EXTRA: Record<string, string | undefined> = { account: "customers", deal: "investors", "fund-thesis": "investors", "fund-terms": "investors", "money-summary": "money", venture: "foundation", "venture-profile": "foundation", founder: "people", people: "people" };
const PKG: Record<string, string | undefined> = { legal: "foundation", relationships: "customers" };
export function functionOf(file: string): string | null {
  const t: string | null = recordOf(file);
  const byType = t && (EXTRA[t] ?? PKG[String(HOME[t])] ?? HOME[t]);
  if (byType) return byType;
  const top = file.split("/")[0];
  return FUNCTIONS.includes(top) ? top : PKG[top] ?? null;
}

export { files as ventureRecords };
// Every JSON record in the venture, venture-relative, outside hidden and draft folders and nested ventures.
function files(dir: string, sub = ""): string[] {
  if (!sub && layoutOf(dir) !== "flat") return logicalFiles(dir).filter((f: string) => f.endsWith(".json") && !f.split("/").some((s) => s.startsWith(".") || s.startsWith("_")));
  return readdirSync(join(dir, sub), { withFileTypes: true }).flatMap((e): string[] => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    if (e.isDirectory()) return e.name.startsWith(".") || e.name.startsWith("_") || e.name === "node_modules" || existsSync(join(dir, rel, "venture.json")) ? [] : files(dir, rel);
    return e.name.endsWith(".json") ? [rel] : [];
  });
}

/** The records that refer, by a data-model ref, to the record types of the changed files. */
function byRefs(dir: string, changed: string[], list?: string[]): string[] {
  const types = new Set(changed.map((f) => recordOf(f)).filter(Boolean));
  const dependents = new Set(MODEL.records.filter((r) => r.level === "venture" && (r.refs ?? []).some((x) => types.has(x.to))).map((r) => r.id));
  if (!dependents.size) return [];
  return (list ?? files(dir)).filter((f) => !changed.includes(f) && !f.endsWith(".decision.json") && !f.endsWith(".impact.json") && dependents.has(recordOf(f)));
}

/** The structural impact of any decision, open or decided, without side effects: nothing is marked stale,
 *  nothing proposed, nothing written. The records it would change (applies_to, or the record it decides),
 *  the records that read them (provenance derived_from) or refer to their type (data-model refs), and
 *  the functions those fall in. packages/naive/src/engine/decision-index.ts scores open decisions with it.
 */
export function structural(dir: string, d: Pick<DecisionRecord, "merged" | "applies_to" | "decides">, { all }: { all?: { provenance?: ProvenanceEntry[]; files?: string[] } } = {}) {
  const changed = [...new Set([...(d.merged?.files ?? []), ...(d.applies_to ?? []).map((t) => t.file), ...(d.decides?.path ? [d.decides.path] : [])])];
  if (!changed.length) return { changed, records: [], functions: [] };
  const log: ProvenanceEntry[] = all?.provenance ?? provenance(dir);
  const readers = log.filter((e) => (e.derived_from ?? []).some((x) => changed.includes(x))).map((e) => e.entity).filter((f) => !changed.includes(f) && !f.includes("://"));
  const records = [...new Set([...readers, ...byRefs(dir, changed, all?.files)])].sort();
  const functions = [...new Set([...changed, ...records].map(functionOf).filter((f) => f !== null))].sort((a, b) => FUNCTIONS.indexOf(a) - FUNCTIONS.indexOf(b));
  return { changed, records, functions };
}

/** Builds, writes and returns the impact map of a decision's merged version. */
export function impact(dir: string, id: string, { via = "framework", proposeFollowUps = true } = {}): { ok: false; error: string; result?: undefined } | { ok: true; result: ImpactSummary; error?: undefined } {
  const file: string | undefined = decisionFile(dir, id);
  if (!file) return { ok: false, error: `no decision ${id}` };
  const d: DecisionRecord = load(ventureFile(dir, file));
  if (!d.merged) return { ok: false, error: `${id} was never merged: nothing changed yet (packages/naive/src/engine/impact.ts structural() shows what a merge would touch)` };
  const { version, files: changed = [] } = d.merged;
  if (!changed.length) return { ok: false, error: `${id} names no applies_to: nothing changed` };
  const at = join(dirname(file), `${id}.impact.json`);
  const prior: DecisionImpact | null = existsSync(ventureFile(dir, at)) ? load(ventureFile(dir, at)) : null;
  // The map of this merged version is already built and its records marked: a rerun returns it unchanged.
  if (prior?.version === version) return { ok: true, result: summary(at, prior.functions) };
  const why = `decision ${id} version ${version}`;
  // Readers by provenance and the where-used list, marked by notify(); readers by data-model refs, marked here.
  const readers: string[] = notify(dir, { source: "venture", paths: changed, version: String(version), via }).stale;
  const refs = byRefs(dir, changed);
  const marked = new Set<string>([...readers, ...mark(dir, refs.filter((f) => !readers.includes(f)), { paths: changed, version: String(version), reads: why, via })]);
  const affected = [...new Set([...readers, ...refs])].filter((f) => !f.includes("://")).sort();
  const functions = FUNCTIONS.map((fn): FunctionImpact => {
    const recs = affected.filter((f) => functionOf(f) === fn);
    const proposed: string[] = [];
    if (recs.length && proposeFollowUps) {
      const fid = `revise-${fn}-after-${id}-v${version}`.slice(0, 80).replace(/-+$/, "");
      const p = propose(dir, { at: fn, id: fid, question: `Revise ${recs.join(", ")} after ${id} version ${version}?`, decides: { path: recs[0] } }, { agentId: "naive-impact", via });
      if (p.ok) proposed.push(fid);
    }
    return { function: fn, affected_records: recs, stale: recs.filter((f) => marked.has(f)), note: null, proposed_decisions: proposed };
  });
  const out = { decision: id, version, changed, functions, built_at: stamp() };
  writeFileSync(ventureFile(dir, at), JSON.stringify(out, null, 2) + "\n");
  return { ok: true, result: summary(at, functions, affected.length) };
}

const summary = (file: string, functions: FunctionImpact[], affected = functions.reduce((n, f) => n + f.affected_records.length, 0)): ImpactSummary => ({ file, affected, functions: functions.filter((f) => f.affected_records.length).map((f) => ({ function: f.function, affected: f.affected_records.length, proposed: f.proposed_decisions })) });

if (import.meta.url === `file://${process.argv[1]}`) {
  const [dir, id] = process.argv.slice(2);
  if (!dir || !id || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/engine/impact.ts <venture dir> <decision id> [--json]"); process.exit(2); }
  const r = impact(dir, id, { via: "cli" });
  if (!r.ok) { console.error(r.error); process.exit(1); }
  const result = r.result;
  if (process.argv.includes("--json")) console.log(JSON.stringify(result, null, 2));
  else console.log(result.functions.length ? result.functions.map((f) => `${f.function.padEnd(11)} ${f.affected} affected${f.proposed.length ? `; proposed ${f.proposed.join(", ")}` : ""}`).join("\n") + `\nwritten to ${result.file}` : `nothing depends on what ${id} changed; written to ${result.file}`);
}
