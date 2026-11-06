// Decision analytics (EE-072): counts by function and type, open against decided, wording and outcomes.
// Builds a small venture in a temp folder; no network.

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analytics } from "./decision-analytics.mjs";

let failed = 0;
const t = (name, fn) => { try { fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
const venture = (files) => {
  const v = mkdtempSync(join(tmpdir(), "dan-"));
  for (const [f, x] of Object.entries(files)) { mkdirSync(join(v, f, ".."), { recursive: true }); writeFileSync(join(v, f), typeof x === "string" ? x : JSON.stringify(x)); }
  return v;
};
const decided = (extra = {}) => ({ status: "decided", answer: "yes", decided_by: "Founder",
  provenance: { drafted_by: { kind: "agent", id: "builder" }, approved_by: "Founder", approved_at: "2026-10-28T21:41:26Z", phase: "discovery", wording: "approved" }, ...extra });
const v = venture({
  "venture.json": { id: "kept", name: "Kept", phase: "discovery" },
  "purpose/validation/problem.json": { statement: "Solo clinics lose visits to no-shows" },
  "purpose/validation/decisions/problem.first-test.decision.json": { id: "first-test", question: "Which idea first?", ...decided(), outcomes: [{ id: "a", projected: "paid", result: "met", actual: "3 of 5 paid" }, { id: "b", projected: "refused" }] },
  "purpose/validation/decisions/problem.health-data.decision.json": { id: "health-data", question: "How will you handle health data?", status: "open" },
  "products/decisions/product.flagship.decision.json": { id: "flagship", question: "Which product is the flagship?", status: "open", type: "Portfolio" },
});
const a = analytics(v, Date.parse("2026-10-28T22:00:00Z"));
const fn = (f) => a.functions.find((x) => x.function === f);

t("each decision is counted under the function that holds what it decides, by type, decided or open", () => {
  const f = fn("Foundation");
  ok(f && f.types.some((x) => x.type === "Problem" && x.n >= 2 && x.decided === 1), JSON.stringify(a.functions));
  ok(a.decided >= 1 && a.open >= 2 && a.total === a.decisions.length, JSON.stringify([a.decided, a.open, a.total]));
});

t("foundation statements belong to the foundation, and a decision record's own type wins", () => {
  ok(a.decisions.filter((d) => d.kind === "foundation statement").every((d) => d.function === "Foundation"), "statements outside the foundation");
  ok(a.decisions.find((d) => d.id === "flagship")?.type === "Portfolio", "type override ignored");
});

t("decided decisions report whose words they are, who decided, the phase, the day and their outcomes", () => {
  ok(a.wording.some((w) => w.key === "approved" && w.n === 1) && a.by[0]?.key === "Founder" && a.phases[0]?.key === "discovery", JSON.stringify([a.wording, a.by, a.phases]));
  ok(a.over_time[0]?.day === "2026-10-28" && a.outcomes.met === 1 && a.outcomes.pending === 1, JSON.stringify([a.over_time, a.outcomes]));
  ok(a.next.length && a.next[0].includes("impact"), "impact ranking is listed as next, not computed");
});

if (failed) { console.log(`${failed} failed`); process.exit(1); }
