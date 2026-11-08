// Record generator for a lead plan (EE-099; lead agents design, "Who writes what"). The agent asks for the lead and the
// telos measure ids it is bound to. The generator takes the portfolio from the lead's role template
// (packages/naive/template/governance/roles/<lead>.json) unless one is given, starts with no bets and a monthly review,
// and refuses a role that has no portfolio, since only a lead has a plan. The draft goes to the write chain for
// operations/leads/<lead>.json (route operations/lead/[id]).
import { existsSync, readFileSync } from "node:fs";
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { LeadPlan } from "../../records/types/records.d.ts";

export const record = "lead-plan";
const repo = new URL("../../../../..", import.meta.url).pathname;
const DERIVED = ["portfolio", "bets", "review_cadence"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { portfolio: "the lead's role template portfolio unless given", bets: "none unless given", review_cadence: "monthly unless given" } });

/** The portfolio a role template names, or null when the role is not a lead or has no template. */
export function templatePortfolio(lead: string): string[] | null {
  const p = `${repo}packages/naive/template/governance/roles/${lead}.json`;
  if (!existsSync(p)) return null;
  const r: unknown = JSON.parse(readFileSync(p, "utf8"));
  const portfolio = r && typeof r === "object" && "portfolio" in r ? r.portfolio : null;
  return Array.isArray(portfolio) && portfolio.every((f) => typeof f === "string") ? portfolio : null;
}

export function draft(a: Partial<LeadPlan>) {
  if (!a.lead || !a.measures?.length) return { ok: false, record, errors: ["a lead plan needs the lead's role id and at least one telos measure id it is bound to"] };
  const lead = slug(a.lead);
  const portfolio = a.portfolio ?? templatePortfolio(lead);
  if (!portfolio) return { ok: false, record, errors: [`${lead} has no portfolio in its role template, so it is not a lead; give the portfolio or name a lead`] };
  const rec = drop({ lead, portfolio, measures: a.measures, bets: a.bets ?? [], review_cadence: a.review_cadence ?? "monthly", next_review: a.next_review }) as LeadPlan;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `operations/lead/${lead}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
