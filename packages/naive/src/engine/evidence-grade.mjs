// Evidence grading, adapted from GRADE (the GRADE Working Group's method for rating certainty of evidence). It
// moved here from packages/naive/src/checks/check-validation.mjs, which re-exports it, so that engine code (the phase
// gate, EE-156) can grade evidence without importing a checker. The rules are unchanged:
//
//   item grade: starts by kind (behavior high, commitment moderate, stated and desk research low, opinion very low),
//     then drops one level for each of: an adjacent or unknown audience (two for the wrong audience); a sample under 5
//     for behavior, commitment or stated evidence; general rather than specific answers to stated or opinion
//     evidence; collected more than 18 months ago (a caller may pass fewer months: the gate calibration does, EE-157).
//   record grade: the best supporting item's grade; up one when three or more supporting items from distinct sources
//     grade low or better; down one when an item at that grade or better contradicts the claim. No evidence: very low.

export const LEVELS = ["very low", "low", "moderate", "high"];
export const WEIGHT = { "very low": 0.1, low: 0.4, moderate: 0.7, high: 1 };
export const START = { behavior: 3, commitment: 2, stated: 1, "desk-research": 1, opinion: 0 };
export const STALE_MONTHS = 18, MIN_SAMPLE = 5;

export function gradeItem(e, today = new Date(), staleMonths = STALE_MONTHS) {
  let g = START[e.kind];
  const why = [];
  const down = (n, reason) => { g -= n; why.push(reason); };
  if (e.audience === "wrong") down(2, "wrong audience");
  else if (e.audience !== "target") down(1, `${e.audience} audience`);
  if (["behavior", "commitment", "stated"].includes(e.kind) && (e.sample?.n ?? 0) < MIN_SAMPLE) down(1, `sample under ${MIN_SAMPLE}`);
  if (["stated", "opinion"].includes(e.kind) && e.specificity !== "specific") down(1, "general, not specific");
  const months = (+today - +new Date(e.collected)) / (30.44 * 864e5);
  if (months > staleMonths) down(1, `older than ${staleMonths} months`);
  return { level: LEVELS[Math.max(0, g)], why };
}

export function gradeRecord(rec, today = new Date(), staleMonths = STALE_MONTHS) {
  const items = (rec.evidence ?? []).map((e) => ({ e, ...gradeItem(e, today, staleMonths) }));
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
