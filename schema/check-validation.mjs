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
// Data checks: product-market fit's Ellis share (very disappointed / asked; 40% is the usual bar)
// and whether retention levels off; team gaps (skills needed with no holder); operations
// readiness grades as its weakest MAD tier.
// Score (--score): V = sum(w p e) / sum(w), weights and floors from purpose/kits/validation/weights.json
// by go-to-market path and venture kind; a missing sub-score counts 0 and is listed.
// Errors: duplicate evidence ids, a URL with no checked date, a source file that does not exist
// (paths are relative to the venture folder), a date in the future.
//
//   node schema/check-validation.mjs <workspace or venture dir> [--json] [--score]

import { ventureFile } from "../packages/core/venture-paths.mjs";
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
  const months = (+today - +new Date(e.collected)) / (30.44 * 864e5);
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

export const SUBSCORES = ["problem", "solution", "product-market-fit", "pricing", "go-to-market", "team", "operations-readiness"];

// Operations readiness grades as its weakest tier; every other record from its own evidence.
export function grade(name, rec, today = new Date()) {
  if (name !== "operations-readiness") return gradeRecord(rec, today);
  const tiers = rec.tiers.map((t) => ({ tier: t.tier, ...gradeRecord(t, today) }));
  const worst = tiers.reduce((a, b) => (LEVELS.indexOf(b.level) < LEVELS.indexOf(a.level) ? b : a));
  return { level: worst.level, weight: WEIGHT[worst.level], why: [`weakest tier: ${worst.tier}`], items: tiers.flatMap((t) => t.items), tiers: tiers.map((t) => ({ tier: t.tier, grade: t.level })) };
}

// Facts the records' data shows, beside the grade.
export function facts(name, rec) {
  const f = {};
  if (name === "product-market-fit") {
    if (rec.ellis) f.ellis_share = +(rec.ellis.very_disappointed / rec.ellis.asked).toFixed(2);
    const c = (rec.retention?.cohorts ?? []).filter((x) => x.active.length >= 4);
    if (c.length) f.retention_levels_off = c.every((x) => { const a = x.active.slice(-3); return Math.abs(a[0] - a[2]) / x.size <= 0.05 && a[2] > 0; });
  }
  if (name === "team") f.gaps = rec.needed.filter((n) => !rec.held.some((h) => h.skill === n.skill)).map((n) => `${n.skill} (by ${n.by_phase})`);
  return f;
}

export function kindOf(products) {
  if (products.some((p) => p.software)) return "software";
  if (products.some((p) => p.offering === "service")) return "service";
  if (products.some((p) => p.offering === "content")) return "content";
  return products.length ? "physical" : "software";
}

export function score(records, W, { path = "build-first", kind = "software" } = {}) {
  const parts = SUBSCORES.map((id) => {
    const w = Math.max(0, (W.base[id] ?? 0) + (W.by_path[path]?.[id] ?? 0) + (W.by_kind[kind]?.[id] ?? 0));
    const r = records[id];
    const pe = r ? (r.probability ?? 0) * r.weight : 0;
    const floor = W.floors_by_path[path]?.[id] ?? W.floors[id] ?? 0;
    return { id, w, p: r?.probability ?? null, e: r?.weight ?? null, pe: +pe.toFixed(3), floor, stated: !!r, below_floor: w > 0 && pe < floor };
  });
  const total = parts.reduce((n, x) => n + x.w, 0);
  const V = +(parts.reduce((n, x) => n + x.w * x.pe, 0) / total).toFixed(3);
  const gain = [...parts].sort((a, b) => b.w * (1 - b.pe) - a.w * (1 - a.pe))[0];
  const held = parts.filter((x) => x.below_floor).map((x) => x.id);
  return { path, kind, V, threshold: W.threshold, recommends_validated: V >= W.threshold && !held.length, below_floor: held, not_stated: parts.filter((x) => !x.stated).map((x) => x.id), most_to_gain: gain.id, parts };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node schema/check-validation.mjs <workspace or venture dir> [--json] [--score]"); process.exit(2); }
  const load = (p) => JSON.parse(readFileSync(p, "utf8"));
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? []
    : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);
  const W = load(new URL("../purpose/kits/validation/weights.json", import.meta.url));
  const errors = [], out = [], scores = [];
  const today = new Date();
  for (const root of walk(dir)) {
    const v = load(ventureFile(root, "venture.json"));
    const places = [["foundation/problem.json", "problem"], ["validation", null], ["purpose/validation", null]].flatMap(([rel, name]) => {
      const p = ventureFile(root, rel);
      if (name) return existsSync(p) ? [[name, p, `${v.id}/${rel}`]] : [];
      if (!existsSync(p)) return [];
      return readdirSync(p).filter((x) => x.endsWith(".json")).sort().map((f) => [f.replace(/\.json$/, ""), join(p, f), `${v.id}/${rel}/${f}`]);
    });
    if (!places.length) continue;
    const graded = {};
    let path;
    const seen = new Set();
    for (const [name, file, at] of places) {
      if (seen.has(name)) continue;
      seen.add(name);
      const rec = load(file);
      if (!SUBSCORES.includes(name)) { errors.push(`${at}: not a validation sub-score (${SUBSCORES.join(", ")})`); continue; }
      const all = name === "operations-readiness" ? rec.tiers.flatMap((t) => t.evidence) : rec.evidence ?? [];
      const ids = all.map((e) => e.id);
      if (new Set(ids).size !== ids.length) errors.push(`${at}: duplicate evidence ids`);
      for (const e of all) {
        if (e.source.url && !e.source.checked) errors.push(`${at}: ${e.id} cites a url with no checked date`);
        if (e.source.path && !existsSync(ventureFile(root, e.source.path))) errors.push(`${at}: ${e.id} source ${e.source.path} not found (paths are relative to the venture folder)`);
        if (new Date(e.collected) > today) errors.push(`${at}: ${e.id} was collected in the future`);
      }
      if (name === "product-market-fit") {
        if (rec.ellis && rec.ellis.very_disappointed > rec.ellis.asked) errors.push(`${at}: more very disappointed than asked`);
        for (const c of rec.retention?.cohorts ?? []) if (c.active.some((a) => a > c.size)) errors.push(`${at}: cohort ${c.start} has more active users than its size`);
      }
      if (name === "go-to-market") path = rec.path;
      const r = grade(name, rec, today);
      graded[name] = { probability: rec.probability?.p ?? 0, weight: r.weight };
      out.push({ venture: v.id, record: name, grade: r.level, weight: r.weight, why: r.why, probability: rec.probability?.p ?? null, facts: facts(name, rec), tiers: r.tiers,
        items: r.items.map((i) => ({ id: i.e.id, kind: i.e.kind, grade: i.level, why: i.why, supports: i.e.supports !== false })) });
    }
    const products = ["product", "products"].flatMap((d) => existsSync(ventureFile(root, d)) ? readdirSync(ventureFile(root, d)).filter((f) => f.endsWith(".json")).map((f) => load(ventureFile(root, `${d}/${f}`))) : []);
    scores.push({ venture: v.id, ...score(graded, W, { path: path ?? "build-first", kind: kindOf(products) }) });
  }
  const wantScore = process.argv.includes("--score");
  if (process.argv.includes("--json")) console.log(JSON.stringify(wantScore ? { records: out, scores } : out, null, 2));
  else {
    for (const o of out) {
      const f = Object.entries(o.facts).map(([k, x]) => `${k} ${Array.isArray(x) ? x.join(", ") || "none" : x}`).join("; ");
      console.log(`${o.venture}/${o.record}: ${o.grade} (weight ${o.weight})${o.why.length ? ` — ${o.why.join("; ")}` : ""}${f ? ` [${f}]` : ""}`);
      for (const i of o.items) console.log(`    ${i.supports ? "+" : "-"} ${i.id.padEnd(24)} ${i.kind.padEnd(14)} ${i.grade}${i.why.length ? ` (${i.why.join(", ")})` : ""}`);
    }
    if (wantScore) for (const s of scores) {
      console.log(`\n${s.venture}: validation score ${s.V} (threshold ${s.threshold}; path ${s.path}, kind ${s.kind})${s.recommends_validated ? " — recommends Validation; the owner decides" : ""}`);
      for (const p of s.parts) console.log(`    ${p.id.padEnd(22)} w ${p.w}  p ${p.p ?? "-"}  e ${p.e ?? "-"}  p*e ${p.pe}${p.below_floor ? `  below floor ${p.floor}` : ""}${p.stated ? "" : "  not stated"}`);
      console.log(`    most to gain: ${s.most_to_gain}`);
    }
  }
  if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
  if (!process.argv.includes("--json")) console.log(`${out.length} validation records graded from their evidence.`);
}
