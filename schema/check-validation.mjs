// Grades each venture's validation records (purpose/validation/*.json, EE-026) from their cited
// evidence, adapting GRADE (the GRADE Working Group's method for rating certainty of evidence).
//
//   item grade: starts by kind (behavior high, commitment moderate, stated and desk research low,
//     opinion very low), then drops one level for each of: an adjacent or unknown audience (two
//     for the wrong audience: indirectness); a sample under 5 for behavior, commitment or stated
//     evidence (imprecision); general rather than specific answers to stated or opinion evidence;
//     collected more than 18 months ago.
//   record grade: the best supporting item's grade; up one when three or more supporting items
//     from distinct sources grade low or better (consistency); down one when an item at that grade
//     or better contradicts the claim (inconsistency). No evidence: very low ("claim only").
//   weight: high 1, moderate 0.7, low 0.4, very low 0.1. The validation score multiplies each
//     sub-score's Jev probability by this weight.
// Errors: duplicate evidence ids, a URL with no checked date, a source file that does not exist
// (paths are relative to the venture folder), a date in the future.
//
//   node schema/check-validation.mjs <workspace or venture dir> [--json]

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const LEVELS = ["very low", "low", "moderate", "high"];
const WEIGHT = { "very low": 0.1, low: 0.4, moderate: 0.7, high: 1 };
const START = { behavior: 3, commitment: 2, stated: 1, "desk-research": 1, opinion: 0 };
const STALE_MONTHS = 18, MIN_SAMPLE = 5;

export function gradeItem(e, today = new Date()) {
  let g = START[e.kind];
  const why = [];
  const down = (n, reason) => { g -= n; why.push(reason); };
  if (e.audience === "wrong") down(2, "wrong audience");
  else if (e.audience !== "target") down(1, `${e.audience} audience`);
  if (["behavior", "commitment", "stated"].includes(e.kind) && (e.sample?.n ?? 0) < MIN_SAMPLE) down(1, `sample under ${MIN_SAMPLE}`);
  if (["stated", "opinion"].includes(e.kind) && e.specificity !== "specific") down(1, "general, not specific");
  const months = (today - new Date(e.collected)) / (30.44 * 864e5);
  if (months > STALE_MONTHS) down(1, `older than ${STALE_MONTHS} months`);
  return { level: LEVELS[Math.max(0, g)], why };
}

export function gradeRecord(rec, today = new Date()) {
  const items = (rec.evidence ?? []).map((e) => ({ e, ...gradeItem(e, today) }));
  const sup = items.filter((i) => i.e.supports !== false);
  if (!sup.length) return { level: "very low", weight: WEIGHT["very low"], why: [items.length ? "no supporting evidence" : "claim only: no evidence cited"], items };
  let g = Math.max(...sup.map((i) => LEVELS.indexOf(i.level)));
  const why = [];
  const sources = new Set(sup.filter((i) => LEVELS.indexOf(i.level) >= 1).map((i) => i.e.source.url ?? i.e.source.path ?? i.e.source.title));
  if (sources.size >= 3 && g < 3) { g++; why.push("consistent across 3 or more sources"); }
  if (items.some((i) => i.e.supports === false && LEVELS.indexOf(i.level) >= g)) { g = Math.max(0, g - 1); why.push("contradicted by evidence as strong"); }
  const level = LEVELS[g];
  return { level, weight: WEIGHT[level], why, items };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node schema/check-validation.mjs <workspace or venture dir> [--json]"); process.exit(2); }
  const load = (p) => JSON.parse(readFileSync(p, "utf8"));
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
    : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
  const errors = [], out = [];
  const today = new Date();
  for (const root of walk(dir)) {
    const v = load(join(root, "venture.json"));
    const vDir = join(root, "purpose/validation");
    if (!existsSync(vDir)) continue;
    for (const f of readdirSync(vDir).filter((x) => x.endsWith(".json")).sort()) {
      const rec = load(join(vDir, f)), at = `${v.id}/purpose/validation/${f}`;
      const ids = (rec.evidence ?? []).map((e) => e.id);
      if (new Set(ids).size !== ids.length) errors.push(`${at}: duplicate evidence ids`);
      for (const e of rec.evidence ?? []) {
        if (e.source.url && !e.source.checked) errors.push(`${at}: ${e.id} cites a url with no checked date`);
        if (e.source.path && !existsSync(join(root, e.source.path))) errors.push(`${at}: ${e.id} source ${e.source.path} not found (paths are relative to the venture folder)`);
        if (new Date(e.collected) > today) errors.push(`${at}: ${e.id} was collected in the future`);
      }
      const r = gradeRecord(rec, today);
      out.push({ venture: v.id, record: f.replace(/\.json$/, ""), grade: r.level, weight: r.weight, why: r.why, probability: rec.probability?.p ?? null,
        items: r.items.map((i) => ({ id: i.e.id, kind: i.e.kind, grade: i.level, why: i.why, supports: i.e.supports !== false })) });
    }
  }
  if (process.argv.includes("--json")) console.log(JSON.stringify(out, null, 2));
  else for (const o of out) {
    console.log(`${o.venture}/${o.record}: ${o.grade} (weight ${o.weight})${o.why.length ? ` — ${o.why.join("; ")}` : ""}`);
    for (const i of o.items) console.log(`    ${i.supports ? "+" : "-"} ${i.id.padEnd(24)} ${i.kind.padEnd(14)} ${i.grade}${i.why.length ? ` (${i.why.join(", ")})` : ""}`);
  }
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  if (!process.argv.includes("--json")) console.log(`${out.length} validation records graded from their evidence.`);
}
