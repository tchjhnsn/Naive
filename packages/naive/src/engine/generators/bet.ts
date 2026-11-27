// Record generator for a bet (EE-221). The agent asks what the claim is, what sort of claim it is, whom or what it
// is about, what is measured, against what line and by what date, what would show it wrong, and which bets it rests
// on. It derives the id from the statement unless one is given and starts the status at proposed: a person registers
// it, never the generator (naive bets register <id> --by <person>).
//
// Two fields it never fills. The threshold's value and who set it are the venture's own, so a draft that has no line
// yet is a draft with a gap in it and says so, rather than a draft with an invented number. The confidence entries
// are a person's too: the generator drops any it is handed, because a probability nobody chose is a number nobody is
// bound by. The draft goes to the write chain for foundation/bets/<id>.json (route foundation/bets/[id]).
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import { claimGaps, registrationGaps } from "../bets.ts";
import type { Bet } from "../../records/types/records.d.ts";

export const record = "bet";
const DERIVED = ["id", "status", "status_by", "status_at", "registered_at", "registered_by", "confidence", "resolution", "superseded_by"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the statement unless given", status: "proposed, until a person registers it",
    confidence: "a person's only: the prior is set with naive bets confidence before the search",
    resolution: "a person's only: naive bets resolve, once the date arrives" } });

export function draft(a: Partial<Bet>) {
  if (!a.statement || !a.kind) {
    return { ok: false, record, errors: ["a bet starts from one claim and the kind of claim it is: empirical, forecast, causal, premise or selection-rule"] };
  }
  const id = slug(a.id ?? a.statement);
  // Everything a person alone writes is dropped, whoever handed it over.
  const rec = drop({ id, venture: a.venture, kind: a.kind, statement: a.statement, status: "proposed", claim: a.claim, rule: a.rule,
    falsified_by: a.falsified_by, premises: a.premises, rivals: a.rivals, evidence: a.evidence, intends_to_cause: a.intends_to_cause,
    used_by: a.used_by, owner: a.owner, supersedes: a.supersedes, supersede_reason: a.supersede_reason, framework: a.framework,
    decision: a.decision, note: a.note, conversation: a.conversation }) as Bet;
  const v = validate(record, rec);
  // What is still missing before a person could register it, so the agent knows what to ask for next and nobody is
  // surprised at registration. These are not errors: a proposed bet is allowed to have them.
  const gaps = registrationGaps(rec);
  return { ok: v.ok, record, route: `foundation/bets/${id}`, draft: rec, errors: v.errors,
    ...(gaps.length ? { gaps } : {}), ...(claimGaps(rec).length ? { form: null } : {}) };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
