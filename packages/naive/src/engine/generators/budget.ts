// Record generator for a budget (EE-099; APQC 9.1.1, planning, budgeting and forecasting). The agent asks for the
// title, currency, scenario, the months covered, the opening cash with the record it comes from, and the planned
// lines, each with a category, a month, revenue or spend, an amount and its source. The generator derives the id from
// the title unless one is given and starts the scenario at base. projectRunway gives ending cash month by month and the
// months of runway; runway is projected from the budget and never stored in it. The draft goes to the write chain for
// finance/budget/<id>.json, which only the finance agent (finance-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { Budget } from "../../records/types/records.d.ts";

export const record = "budget";
const DERIVED = ["id", "scenario"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the title unless given", scenario: "base unless given" } });

export function draft(a: Partial<Budget>) {
  if (!a.title || !a.currency || !a.start || !a.end || !a.opening_cash || !a.lines) {
    return { ok: false, record, errors: ["a budget needs a title, a currency, its first and last month, the opening cash with its source, and its lines"] };
  }
  const id = slug(a.id ?? a.title);
  const rec = drop({ id, title: a.title, currency: a.currency, scenario: a.scenario ?? "base", start: a.start, end: a.end,
    opening_cash: a.opening_cash, lines: a.lines, note: a.note }) as Budget;
  const v = validate(record, rec);
  const outside = rec.lines.filter((l) => l.period < rec.start || l.period > rec.end).map((l) => `line ${l.category} ${l.period} falls outside ${rec.start} to ${rec.end}`);
  return { ok: v.ok && !outside.length, record, route: `finance/budget/${id}`, draft: rec, errors: [...v.errors, ...outside] };
}

const months = (start: string, end: string): string[] => {
  const out: string[] = [];
  let [y, m] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  while (y < ey || (y === ey && m <= em)) { out.push(`${y}-${String(m).padStart(2, "0")}`); m += 1; if (m > 12) { m = 1; y += 1; } }
  return out;
};

/** Ending cash for each month of the budget, and runway: the number of whole months before ending cash first falls
 *  below zero, or null when it never does inside the budget. */
export function projectRunway(b: Budget) {
  let cash = b.opening_cash.amount;
  let runway: number | null = null;
  const by = months(b.start, b.end).map((period, i) => {
    const lines = b.lines.filter((l) => l.period === period);
    const revenue = lines.filter((l) => l.kind === "revenue").reduce((s, l) => s + l.amount, 0);
    const spend = lines.filter((l) => l.kind === "spend").reduce((s, l) => s + l.amount, 0);
    cash += revenue - spend;
    if (cash < 0 && runway === null) runway = i;
    return { period, revenue, spend, net: revenue - spend, ending_cash: cash };
  });
  return { currency: b.currency, months: by, runway_months: runway };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
