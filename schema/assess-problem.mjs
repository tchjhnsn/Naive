#!/usr/bin/env node
// Assesses a venture's problem from its evidence (EE-050), the lean validation suite. No single
// score: the problem splits into four assumptions, each labelled from its evidence, and the
// labels say which commitment the evidence is strong enough for. Behaviors it must keep are in
// purpose/kits/validation/features/problem-assessment.feature.
//
//   node schema/assess-problem.mjs <venture dir> [--json] [--preflight] [--as-is]
//
// Assumptions: exists (the problem is real), segment (our segment has it), hurts (it costs
//   enough that people already spend time or money on it), why-now (something has changed).
// Labels: demonstrated, inferred, assumed, unknown, contradicted.
//   An item demonstrates when it is behavior or commitment from the target segment, first-hand
//   (a file in the venture folder, or origin first-hand), five or more people, under 18 months
//   old. Any other item from a target, adjacent or unknown audience infers; the wrong audience
//   counts for nothing. Competitors with paying customers are behavior from an adjacent audience:
//   they infer the problem, never count against it.
//   Contradicted needs evidence against from the target segment at least as strong as the best
//   evidence for. Missing evidence is unknown, never a verdict.
// Ladder: explore, prototype, charge, raise. The result names the rung the evidence supports and
//   the cheapest test for each assumption that blocks the next rung. It never says "not viable".
// Forms: a root problem may take several forms (forms[]), each with its own evidence (evidence
//   form); each open form is labelled from its own items, which also count for the root.
// Preflight: before assessing, it lists what is missing from the record and what running as is
//   would mean, and stops with needs_input unless --as-is is given. The router, CLI, MCP server
//   and API pass the same choice on (input as_is).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "./venture-paths.mjs";

export const ASSUMPTIONS = [
  { id: "exists", says: "the problem is real", field: "statement", test: "Find people already paying for or building a workaround (search, forums, competitors' customers)" },
  { id: "segment", says: "our segment has it", field: "segment", test: "Five problem interviews with people in the segment, asking about the last time it happened" },
  { id: "hurts", says: "it costs enough that people already spend time or money on it", field: "cost or workarounds", test: "Ask in those interviews what they spent on it last month, in hours or money, and look for a workaround they pay for" },
  { id: "why-now", says: "something has changed that makes it solvable or urgent now", field: "why_now", test: "Cite the change: a trend, a new technology, a rule, with a source" },
];
export const LADDER = [
  { rung: "explore", unlocks: "keep researching the problem" },
  { rung: "prototype", unlocks: "build something cheap to test a solution", needs: { exists: 1, hurts: 1 } },
  { rung: "charge", unlocks: "ask people in the segment to pay", needs: { exists: 1, segment: 2, hurts: 2 } },
  { rung: "raise", unlocks: "ask investors for money on the problem's strength (the problem alone is never enough)", needs: { exists: 2, segment: 2, hurts: 2, "why-now": 1 } },
];
const LABEL = { 2: "demonstrated", 1: "inferred" };
const MIN_SAMPLE = 5, MAX_AGE_MONTHS = 18;

const months = (from, to) => (to - +new Date(from)) / (1000 * 60 * 60 * 24 * 30.44);
export const originOf = (e) => e.origin ?? (e.source?.path && !e.source?.url ? "first-hand" : "reported");

/** How strongly one item bears on its assumption: 2 demonstrates, 1 infers, 0 counts for nothing. */
export function strength(e, today = new Date()) {
  if (e.audience === "wrong") return 0;
  const shows = ["behavior", "commitment"].includes(e.kind) && e.audience === "target" && originOf(e) === "first-hand"
    && (e.sample?.n ?? 0) >= MIN_SAMPLE && months(e.collected, today) <= MAX_AGE_MONTHS;
  return shows ? 2 : 1;
}

const stated = (rec, a) => a.id === "hurts" ? !!(rec.cost || rec.workarounds?.length) : a.id === "why-now" ? !!rec.why_now : !!rec[a.field];

/** The label for each assumption, with the items behind it. */
export function label(rec, today = new Date()) {
  const ev = rec?.evidence ?? [];
  return ASSUMPTIONS.map((a) => {
    const on = ev.filter((e) => (e.assumption ?? "exists") === a.id).map((e) => ({ id: e.id, supports: e.supports !== false, s: strength(e, today), target: e.audience === "target" }));
    const best = Math.max(0, ...on.filter((x) => x.supports).map((x) => x.s));
    const against = Math.max(0, ...on.filter((x) => !x.supports && x.target).map((x) => x.s));
    const level = against > 0 && against >= best ? 0 : best;
    const name = against > 0 && against >= best ? "contradicted" : LABEL[best] ?? (rec && stated(rec, a) ? "assumed" : "unknown");
    return { assumption: a.id, says: a.says, label: name, level, for: on.filter((x) => x.supports && x.s > 0).map((x) => x.id), against: on.filter((x) => !x.supports).map((x) => x.id), ignored: on.filter((x) => x.s === 0).map((x) => x.id) };
  });
}

/** The highest rung the labels support, and what blocks the next one. */
export function ladder(labels) {
  const lv = Object.fromEntries(labels.map((l) => [l.assumption, l.level]));
  const contradicted = labels.filter((l) => l.label === "contradicted").map((l) => l.assumption);
  let i = 0;
  while (i + 1 < LADDER.length && !contradicted.length && Object.entries(LADDER[i + 1].needs).every(([a, n]) => lv[a] >= n)) i++;
  const next = LADDER[i + 1];
  const blocking = next ? Object.entries(next.needs).filter(([a, n]) => lv[a] < n || contradicted.includes(a)).map(([a, n]) => ({ assumption: a, needs: LABEL[n], has: labels.find((l) => l.assumption === a).label, test: ASSUMPTIONS.find((x) => x.id === a).test })) : [];
  return { supports: LADDER[i].rung, unlocks: LADDER[i].unlocks, next: next?.rung ?? null, blocking, contradicted };
}

/** What is missing from the record before assessing it, and what running as is would mean. */
export function preflight(rec) {
  if (!rec) return [{ field: "purpose/validation/problem.json", why: "there is no problem record", as_is: "every assumption is unknown; the evidence supports exploring only" }];
  const m = [];
  for (const a of ASSUMPTIONS) if (!stated(rec, a)) m.push({ field: a.field, why: `says whether ${a.says}`, as_is: `${a.id} is unknown unless evidence bears on it` });
  const untagged = (rec.evidence ?? []).filter((e) => !e.assumption).map((e) => e.id);
  if (untagged.length) m.push({ field: "evidence[].assumption", items: untagged, why: "which assumption each item bears on (exists, segment, hurts, why-now)", as_is: "these items count toward exists only" });
  const thin = (rec.evidence ?? []).filter((e) => ["behavior", "commitment", "stated"].includes(e.kind) && !e.sample).map((e) => e.id);
  if (thin.length) m.push({ field: "evidence[].sample", items: thin, why: "how many people the item comes from", as_is: "these items can infer but not demonstrate" });
  const bare = ASSUMPTIONS.filter((a) => !(rec.evidence ?? []).some((e) => (e.assumption ?? "exists") === a.id)).map((a) => a.id);
  if (bare.length) m.push({ field: "evidence", items: bare, why: "no evidence bears on these assumptions yet", as_is: "they stay assumed or unknown" });
  return m;
}

export const ASK = "Some things the assessment reads are missing. Fill them in first, or run it as is?";

/** @typedef {{ field: string, items?: string[], why: string, as_is: string }} Missing */
/** @typedef {ReturnType<typeof ladder>} Rung */
/**
 * @typedef {{ needs_input?: { ask: string, missing: Missing[], options: { choice: string, how: string }[] } } & Partial<Rung & { venture: string | null, ran_as_is: boolean, missing: Missing[], assumptions: ReturnType<typeof label>,
 *   forms: ({ form: string, statement: string, assumptions: ReturnType<typeof label> } & Pick<Rung, "supports" | "next" | "blocking">)[] }>} Assessment
 */

/** The whole run: preflight first, then the assessment unless input is missing and as_is is not set. @returns {Assessment} */
export function assess(dir, { as_is = false, today = new Date() } = {}) {
  const f = join(ventureFile(dir, "purpose/validation/problem.json"));
  const rec = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
  const missing = preflight(rec);
  if (missing.length && !as_is) return { needs_input: { ask: ASK, missing, options: [
    { choice: "fill-in", how: "write the missing fields to purpose/validation/problem.json (template: purpose/kits/validation/templates/problem.md), then run again" },
    { choice: "run-as-is", how: "run again with as_is (CLI --as-is; MCP and API as_is: true)" }] } };
  const labels = label(rec, today);
  // Each open form is assessed from its own evidence; its evidence also counts for the root.
  const forms = (rec?.forms ?? []).filter((f) => f.status !== "dropped").map((f) => {
    const own = label({ ...rec, statement: f.statement, segment: f.segment ?? rec.segment, evidence: (rec.evidence ?? []).filter((e) => e.form === f.id) }, today);
    const { supports, next, blocking } = ladder(own);
    return { form: f.id, statement: f.statement, assumptions: own, supports, next, blocking };
  });
  return { venture: rec?.venture ?? null, ran_as_is: missing.length > 0, missing, assumptions: labels, ...ladder(labels), forms };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dir = process.argv[2];
  if (!dir) { console.error("usage: node schema/assess-problem.mjs <venture dir> [--json] [--preflight] [--as-is]"); process.exit(2); }
  const flag = (f) => process.argv.includes(f);
  /** @type {Assessment} */
  const out = flag("--preflight") ? { missing: preflight(existsSync(join(ventureFile(dir, "purpose/validation/problem.json"))) ? JSON.parse(readFileSync(join(ventureFile(dir, "purpose/validation/problem.json")), "utf8")) : null) } : assess(dir, { as_is: flag("--as-is") });
  if (flag("--json")) { console.log(JSON.stringify(out, null, 2)); process.exit(0); }
  const list = (m) => m.map((x) => `  - ${x.field}${x.items ? ` (${x.items.join(", ")})` : ""}: ${x.why}. As is: ${x.as_is}`).join("\n");
  if (out.needs_input) { console.log(`${out.needs_input.ask}\n${list(out.needs_input.missing)}\nFill in: ${out.needs_input.options[0].how}\nRun as is: ${out.needs_input.options[1].how}`); process.exit(0); }
  if (!out.assumptions) { console.log(out.missing.length ? list(out.missing) : "nothing missing"); process.exit(0); }
  for (const a of out.assumptions) console.log(`${a.assumption.padEnd(8)} ${a.label.padEnd(13)} ${a.says}${a.for.length ? `  [for: ${a.for.join(", ")}]` : ""}${a.against.length ? `  [against: ${a.against.join(", ")}]` : ""}`);
  console.log(`\nThe evidence supports: ${out.supports} (${out.unlocks}).`);
  if (out.contradicted.length) console.log(`Evidence from the segment contradicts ${out.contradicted.join(", ")}: reframe the problem or the segment and test again.`);
  if (out.next) console.log(`To reach ${out.next}:\n${out.blocking.map((b) => `  - ${b.assumption}: ${b.has}, needs ${b.needs}. ${b.test}`).join("\n")}`);
  for (const f of out.forms) console.log(`\nForm ${f.form}: supports ${f.supports}. ${f.assumptions.map((a) => `${a.assumption} ${a.label}`).join(", ")}`);
  if (out.ran_as_is) console.log(`\nRan as is; missing:\n${list(out.missing)}`);
}
