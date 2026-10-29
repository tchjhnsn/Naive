#!/usr/bin/env node
// Reports a venture's strategic foundation (EE-051, EE-052): for each question of the Five Ws and How plus
// whether (purpose/strategic-foundation.json), the record attributes that answer it, and whether
// each is confirmed, drafted by an agent, waiting as a draft, or missing. This is what a founder
// keeps in front of them; a platform renders it always visible. Behaviors:
// purpose/kits/validation/features/strategic-foundation.feature.
//
//   node schema/foundation.mjs <venture dir> [--json]
//
// Status: confirmed (the last write was a person's, or a person accepted it), agent (an agent
//   wrote it and no person has confirmed it), draft (a draft waits in _drafts/), missing, planned
//   (no record type yet). A statement an agent drafted is not the founder's until confirmed.
// Exit 1 when the frame names a record type the data model lacks, or an ICP names a problem form
// the problem record lacks.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
const load = (f) => JSON.parse(readFileSync(f, "utf8"));
export const FRAME = load(join(repo, "purpose/strategic-foundation.json"));
const MODEL = load(join(repo, "schema/data-model.json"));

const get = (o, path) => path.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
const filled = (v) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length);

/** Venture-relative files of a record type: one file, or every item of a collection. */
export function filesOf(dir, type) {
  const r = MODEL.records.find((x) => x.id === type);
  const gs = (r?.paths ?? []).filter((p) => p.startsWith("instance/**/")).map((p) => p.slice("instance/**/".length));
  const found = [];
  for (const g of gs) {
    if (!g.includes("*")) { if (existsSync(join(dir, g))) found.push(g); continue; }
    const star = g.indexOf("*");
    const folder = g.slice(0, star), rest = g.slice(star + 1);
    if (rest.includes("*")) continue;
    const d = join(dir, folder);
    if (existsSync(d)) for (const f of readdirSync(d)) if (f.endsWith(rest)) found.push(folder + f);
  }
  if (found.length) return found;
  const drafted = gs.filter((g) => !g.includes("*") && existsSync(join(dir, `_drafts/${g.replace(/\//g, "__")}.draft`)));
  return drafted.length ? drafted : gs.slice(0, 1);
}

/** Whether a person confirmed one statement in a file: their write or accept of the file, or a
 *  confirm of that statement, after the last write by anyone else. */
export function confirmedIn(dir, file, id, seen = new Set()) {
  if (seen.has(file)) return false;
  seen.add(file);
  const log = join(dir, "provenance.jsonl");
  if (!existsSync(log)) return false;
  const draft = `_drafts/${file.replace(/\//g, "__")}.draft`;
  const es = readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((e) => e.entity === file || e.entity === draft);
  const lastAgentWrite = es.findLastIndex((e) => e.entity === file && e.activity !== "confirm" && e.activity !== "move" && e.activity !== "release" && e.agent?.kind !== "person" && e.activity !== "accept");
  const direct = es.some((e, i) => i > lastAgentWrite && e.entity === file && (e.activity === "accept" || (e.agent?.kind === "person" && e.activity !== "confirm" && e.activity !== "move") || (e.activity === "confirm" && e.statement === id)));
  if (direct) return true;
  return es.filter((e) => e.activity === "move" && e.entity === file).flatMap((e) => e.derived_from ?? []).some((p) => confirmedIn(dir, p, id, seen));
}

/** Each foundation statement of a venture, with its status and value. */
export function foundation(dir) {
  const report = FRAME.questions.map((q) => ({ question: q.id, ask: q.ask, statements: q.statements.map((s) => {
    if (s.derived_from) return s;
    if (!s.record) return { id: s.id, status: "planned", note: s.note ?? null };
    const files = filesOf(dir, s.record);
    // A retired product no longer answers for the venture.
    const values = files.filter((f) => existsSync(join(dir, f)) && load(join(dir, f)).status !== "retired").map((f) => ({ f, v: get(load(join(dir, f)), s.attribute) })).filter((x) => filled(x.v));
    const drafts = files.filter((f) => existsSync(join(dir, `_drafts/${f.replace(/\//g, "__")}.draft`)));
    if (!values.length) return { id: s.id, record: s.record, attribute: s.attribute, status: drafts.length ? "draft" : "missing" };
    // A record with no log entry existed before the log; a person's baseline or write confirms it.
    const confirmed = values.every(({ f }) => confirmedIn(dir, f, s.id));
    return { id: s.id, record: s.record, attribute: s.attribute, status: drafts.length ? "draft" : confirmed ? "confirmed" : "agent",
      value: values.length === 1 && !files[0].includes("products/") ? values[0].v : Object.fromEntries(values.map(({ f, v }) => [f, v])) };
  }) }));
  // A derived statement takes its source's status and shows the primary ICP profile's short form.
  const all = report.flatMap((q) => q.statements);
  for (const q of report) q.statements = q.statements.map((s) => {
    if (!s.derived_from) return s;
    const src = all.find((x) => x.id === s.derived_from) ?? { status: "missing" };
    const out = { id: s.id, record: s.record, attribute: s.attribute, derived_from: s.derived_from, status: src.status };
    const primary = Array.isArray(src.value) ? (src.value.find((p) => p.primary) ?? src.value[0]) : null;
    if (primary) out.value = primary.short ?? primary.who;
    return out;
  });
  return report;
}

export function problems(dir) {
  const out = FRAME.questions.flatMap((q) => q.statements).filter((s) => s.record && !MODEL.records.some((r) => r.id === s.record)).map((s) => `frame: ${s.id} names record type ${s.record}, which the data model lacks`);
  const there = (...fs) => fs.map((f) => join(dir, f)).find((p) => existsSync(p));
  const icp = there("foundation/icp.json", "purpose/icp.json"), prob = there("foundation/problem.json", "purpose/validation/problem.json");
  if (icp) {
    const forms = new Set(existsSync(prob) ? (load(prob).forms ?? []).map((f) => f.id) : []);
    for (const p of load(icp).profiles) for (const f of p.problem_forms ?? []) if (!forms.has(f)) out.push(`icp ${p.id}: problem form ${f} is not in the problem record`);
    const primaries = load(icp).profiles.filter((p) => p.primary).length;
    if (load(icp).profiles.length > 1 && primaries !== 1) out.push(`icp: ${primaries} primary profiles; exactly one is primary`);
    // promised-to is derived from the ICP; a hand-written one that differs has drifted.
    const p = load(icp).profiles.find((x) => x.primary) ?? load(icp).profiles[0];
    const said = existsSync(join(dir, "venture.json")) ? load(join(dir, "venture.json")).core?.promised_to : undefined;
    if (p && filled(said) && said !== (p.short ?? p.who)) out.push(`venture core.promised_to differs from the ICP's short form ("${p.short ?? p.who}"); it is derived from the ICP`);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (!arg) { console.error("usage: node schema/foundation.mjs <venture or workspace dir> [--json]"); process.exit(2); }
  const walk = (d) => existsSync(join(d, "venture.json")) ? [d] : readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith(".") && !e.name.startsWith("_")).flatMap((e) => walk(join(d, e.name)));
  const dirs = walk(arg);
  const errs = dirs.flatMap((d) => problems(d).map((p) => `${d}: ${p}`));
  if (process.argv.includes("--json")) console.log(JSON.stringify(dirs.length === 1 ? foundation(dirs[0]) : Object.fromEntries(dirs.map((d) => [d, foundation(d)])), null, 2));
  else for (const d of dirs) {
    if (dirs.length > 1) console.log(`\n${d}`);
    for (const q of foundation(d)) console.log(`${q.question.padEnd(8)} ${q.ask}\n${q.statements.map((s) => `         ${s.id.padEnd(16)} ${s.status}${s.value !== undefined ? `: ${JSON.stringify(s.value).slice(0, 90)}` : ""}`).join("\n")}`);
  }
  for (const e of errs) console.error(`FAIL  ${e}`);
  process.exit(errs.length ? 1 : 0);
}
