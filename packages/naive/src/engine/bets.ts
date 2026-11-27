// Bets: the venture's strategic claims, written the way requirements are written (EE-221,
// docs/design/BETS_2026-11-26.md). Pure: no I/O, no model, no clock. The router calls it on every write of the
// type (packages/naive/src/router/bets.ts), the commands call it before a person registers or resolves one
// (packages/naive/src/router/orchestration/bets.ts) and the check calls it against the version in the blob store
// (packages/naive/src/checks/check-bets.ts), so one list of rules answers for all three.
//
//   statementForm(bet)                  the fixed sentence for the bet's kind, rendered from the claim's parts
//   claimGaps(bet)                      which parts of the claim or the rule are missing for that kind
//   registrationGaps(bet)               what is missing before a person may register it
//   transitionRefusal(from, to)         why a bet does not move from one status to the other
//   betWriteRefusal({ stored, input, person, frozenBy })   why this write is refused, or null
//   claimKey(bet), bothCanHold(a, b)    whether two lines over the same population, measure and date can both hold
//   brierOf(bet)                        the prior against what happened, scored by Brier, or null
//   calibration(bets)                   the mean Brier over the resolved forecasts, and what is left out
//
// Two things are never an agent's: the wording a person confirmed, and any number that stands for a judgment. A
// write that sets a probability, resolves a bet or moves its status is refused for an agent and named as the
// person's command instead. Naive ships no threshold and no probability, so nothing here supplies one.
//
// A registered claim is frozen for everyone, a person included, and a pre-registration that tests the bet freezes
// the claim when it is registered (EE-220). The way on is always open: a new bet that supersedes this one, with a
// reason, so the old claim and its outcome stay readable.

import { brier } from "./recipes/scoring.ts";
import type { Bet } from "../records/types/records.d.ts";

/** The status of a bet, as the schema's enum gives it. */
export type BetStatus = NonNullable<Bet["status"]>;
/** The kind of claim a bet makes. */
export type BetKind = Bet["kind"];
/** A bet's claim, as the schema gives it. */
export type Claim = NonNullable<Bet["claim"]>;

/** Every status, in lifecycle order. */
export const STATUSES: readonly BetStatus[] = ["proposed", "registered", "supported", "weakened", "refuted", "superseded", "withdrawn"];
/** The statuses from which the claim is fixed. */
export const REGISTERED: readonly BetStatus[] = ["registered", "supported", "weakened", "refuted", "superseded"];
/** The statuses that are a person's verdict after the evidence. A selection rule never takes one. */
export const VERDICTS: readonly BetStatus[] = ["supported", "weakened", "refuted"];
/** The kinds whose claim is a population, a measure, a comparator, a threshold and a date. */
export const NUMERIC: readonly BetKind[] = ["empirical", "forecast", "causal", "premise"];

/** The fields that hold the claim itself. A registered pre-registration that tests the bet fixes these. */
export const CLAIM_FROZEN: readonly (keyof Bet)[] = Object.freeze(["kind", "statement", "claim", "rule", "falsified_by", "premises", "intends_to_cause"]);
/** Every field a registration fixes: the claim, and the registration itself. */
export const FROZEN: readonly (keyof Bet)[] = Object.freeze([...CLAIM_FROZEN, "id", "venture", "supersedes", "supersede_reason", "registered_at", "registered_by"]);
/** The fields a write may only add to once the claim is frozen: an entry already written never changes. */
export const APPEND_ONLY: readonly (keyof Bet)[] = Object.freeze(["confidence", "evidence", "rivals"]);
/** The fields only a person writes: the odds, the outcome and where the bet stands. */
export const PERSON_ONLY: readonly (keyof Bet)[] = Object.freeze(["status", "status_by", "status_at", "confidence", "resolution", "registered_at", "registered_by", "superseded_by"]);
/** The statuses a write may move to from each status; a status may always stay as it is. */
export const LIFECYCLE: Readonly<Record<BetStatus, readonly BetStatus[]>> = Object.freeze({
  proposed: ["registered", "withdrawn"],
  registered: ["supported", "weakened", "refuted", "superseded", "withdrawn"],
  supported: ["registered", "weakened", "refuted", "superseded"],
  weakened: ["registered", "supported", "refuted", "superseded"],
  refuted: ["registered", "supported", "weakened", "superseded"],
  superseded: [],
  withdrawn: ["proposed"],
});

/** How a comparator reads in a sentence, so the fixed form is one plain English line. */
const COMPARATOR: Readonly<Record<string, string>> = Object.freeze({ ">=": "at least", ">": "more than", "<=": "at most", "<": "under", "==": "exactly", "!=": "anything but" });

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
/** Where a bet stands. A record with no status is proposed. */
export const statusOf = (b: Pick<Bet, "status">): BetStatus => b.status ?? "proposed";
/** Whether a value is one of the statuses. A record reaches the write rule before its schema, so this is a real check. */
export const isStatus = (s: unknown): s is BetStatus => STATUSES.some((x) => x === s);
/** Is this bet registered, so that its claim is fixed? */
export const isRegistered = (b: { status?: string } | null | undefined): boolean => !!b?.status && (REGISTERED as readonly string[]).includes(b.status);
/** The line a measure must pass, as it reads: "at least 30 %". */
const line = (c: Claim): string => `${COMPARATOR[c.comparator ?? ""] ?? c.comparator ?? ""} ${String(c.threshold?.value ?? "")}${c.threshold?.unit ? ` ${c.threshold.unit}` : ""}`.trim();

/**
 * The fixed sentence for the bet's kind, rendered from the claim's parts, or null when a part it needs is missing.
 * The forms are adapted from EARS (Mavin, Wilkinson, Harwood and Novak, 2009), which fixes a template per kind of
 * requirement so that two people reading one cannot read it differently. It is what a person confirms the written
 * statement against; it is never written into the record, because the statement is the person's own wording.
 */
export function statementForm(bet: Partial<Bet>): string | null {
  if (claimGaps(bet).length) return null;
  if (bet.kind === "selection-rule") {
    const r = bet.rule;
    return `We back ${r?.back}, and we do not back ${r?.do_not_back}, told apart by ${r?.observable_test}.`;
  }
  const c = bet.claim as Claim;
  const source = c.source ? `, according to ${c.source}` : "";
  if (bet.kind === "forecast") return `By ${c.resolves_by}, among ${c.population}, ${c.measure} will be ${line(c)}${source}.`;
  if (bet.kind === "causal") return `Among ${c.population}, ${c.measure} changes by ${line(c)} against ${c.compared_with}, by ${c.resolves_by}${source}.`;
  return `As of ${c.resolves_by}, among ${c.population}, ${c.measure} is ${line(c)}${source}.`;
}

/**
 * Which parts of the claim, or of the rule, the bet's kind needs and does not have. A claim that names a
 * population, a measure, a comparator, a threshold and a date is verifiable; one without is not, whatever its
 * sentence says (ISO/IEC/IEEE 29148:2018, verifiable and unambiguous).
 */
export function claimGaps(bet: Partial<Bet>): string[] {
  const gaps: string[] = [];
  if (bet.kind === "selection-rule") {
    const r = bet.rule;
    if (!r?.back) gaps.push("the rule does not say whom or what the venture backs");
    if (!r?.do_not_back) gaps.push("the rule does not say whom or what it does not back, so it rules nothing out");
    if (!r?.observable_test) gaps.push("the rule has no observable test, so nobody else could say which side a case falls on");
    return gaps;
  }
  const c = bet.claim;
  if (!c) return ["it has no claim: a bet names the population, the measure, the comparator, the threshold and the date it is judged on"];
  if (!c.population) gaps.push("the claim names no population");
  if (!c.measure) gaps.push("the claim names no measure");
  if (!c.comparator || c.threshold?.value === undefined) gaps.push("the claim has no line to pass: the comparator and the threshold are the venture's own, and Naive ships none");
  if (!c.threshold?.set_by) gaps.push("the threshold names nobody who chose it: a line an agent picked is a line nobody is bound by");
  if (!c.resolves_by) gaps.push("the claim has no date it is judged on, so its window could be extended until it holds");
  if (!c.source) gaps.push("the claim names no source the value will be read from, which has to be fixed before the search");
  if (bet.kind === "causal" && !c.compared_with) gaps.push("a causal claim names the group the change is measured against");
  return gaps;
}

/**
 * What is missing before a person may register the bet: the claim's parts for its kind, the observation that would
 * show it wrong, and a probability a person set before the search. The schema requires the fields to be there; this
 * reads the ones a proposed bet is allowed to leave empty and says what a person would be fixing with a hole in it.
 */
export function registrationGaps(bet: Partial<Bet> | null | undefined): string[] {
  if (!bet) return ["there is no bet to register"];
  const gaps = [...claimGaps(bet)];
  if (!bet.statement) gaps.push("it says nothing");
  if (bet.kind !== "selection-rule" && !bet.falsified_by) gaps.push("it does not say what would show it wrong, so no observation can count against it");
  if (!bet.confidence?.length) gaps.push("nobody has put odds on it: a person sets the prior before the search (naive bets confidence <id> --p <0..1> --by <person> --data-seen <answer>)");
  if (!bet.owner) gaps.push("it has no owner, so nobody answers for it");
  return gaps;
}

/** Why a bet cannot go from one status to another, or null. Staying where it is is always allowed. Pure. */
export function transitionRefusal(from: BetStatus, to: BetStatus): string | null {
  if (from === to) return null;
  if (!isStatus(to)) return `${String(to)} is not a bet status: one of ${STATUSES.join(", ")}`;
  if (LIFECYCLE[from].includes(to)) return null;
  const onward = LIFECYCLE[from].join(", ") || "nothing";
  return `a ${from} bet does not become ${to}: from ${from} it goes to ${onward}`;
}

/** The ways on from a frozen claim, so a refusal never leaves a caller stuck. */
const WAYS = "write a new bet whose supersedes names this one and whose supersede_reason says why, and have a person supersede this one";

/**
 * Why one write of a bet is refused, or null when it may go on. `stored` is the bet as it stands (null for a new
 * one), `input` the whole record being written, `person` true for a person's own write, and `frozenBy` the
 * registered pre-registrations that test this bet (EE-220), whose registration fixes the claim even when the bet
 * itself is not registered yet.
 *
 * Nobody breaks the lifecycle, a person included: a mis-set status is corrected by moving the bet back, which the
 * provenance log keeps. An agent may draft a bet and gather evidence for and against it; it never puts odds on one,
 * resolves one or moves one on, because those are the judgments the register exists to hold a person to.
 */
export function betWriteRefusal({ stored, input, person, frozenBy = [] }: {
  stored: Partial<Bet> | null; input: Partial<Bet>; person: boolean; frozenBy?: readonly string[];
}): string | null {
  const id = input.id ?? stored?.id ?? "this bet";
  const to = statusOf(input);
  if (!isStatus(to)) return `${String(input.status)} is not a bet status: one of ${STATUSES.join(", ")}`;

  // An agent never writes the odds, the outcome or where the bet stands, whatever the gate says.
  if (!person) {
    const touched = PERSON_ONLY.filter((f) => f === "status" ? to !== statusOf(stored ?? {}) : !same(input[f], stored?.[f]));
    if (touched.length) {
      return `only a person writes ${touched.join(", ")} on a bet, and this write is an agent's: put odds on ${id} with naive bets confidence, resolve it with naive bets resolve, and raise the verdict you would recommend as a continue-or-stop decision`;
    }
  }

  if (VERDICTS.includes(to) && input.kind === "selection-rule") {
    return `${id} is a selection rule, so it is never ${to}: a rule about whom to back is a value, not a claim evidence can settle. What can be tested is whether its observable test works and whether the bets under it hold`;
  }
  if (VERDICTS.includes(to) && !input.resolution) return `${id} cannot be ${to} with nothing observed: record what happened first (naive bets resolve ${id} <outcome> --by <person>)`;
  if (to === "superseded" && !input.superseded_by) return `${id} is superseded by nothing: name the bet that replaces it in superseded_by`;
  if (input.supersedes === id) return `${id} cannot supersede itself`;
  if ((input.premises ?? []).includes(id)) return `${id} cannot be a premise of itself`;

  if (!stored) {
    if (isRegistered({ status: to })) {
      const gaps = registrationGaps(input);
      if (gaps.length) return `a new bet cannot be written ${to}: ${gaps.join("; ")}`;
      if (!input.registered_by) return `${id} is ${to} and names no registered_by: only a person registers a bet`;
    } else if (input.resolution) {
      return `${id} is new and already carries a resolution: a bet is registered before it is resolved, or there is nothing the outcome was measured against`;
    }
    return null;
  }

  const from = statusOf(stored);
  const why = transitionRefusal(from, to);
  if (why) return `${id} is ${from}: ${why}`;

  const frozen = isRegistered(stored);
  if (!frozen && !frozenBy.length) {
    // Still proposed and no registered pre-registration tests it: the claim is written freely, except that
    // registering it closes the gaps and names a person.
    if (isRegistered({ status: to })) {
      const gaps = registrationGaps(input);
      if (gaps.length) return `${id} is not ready to register: ${gaps.join("; ")}`;
      if (!input.registered_by) return `${id} cannot be registered without registered_by: only a person registers a bet (naive bets register ${id} --by <person>)`;
      if (!input.registered_at) return `${id} cannot be registered without registered_at`;
    }
    return null;
  }

  // The claim is fixed: by the bet's own registration, or by a registered pre-registration that tests it.
  const fields = frozen ? FROZEN : CLAIM_FROZEN;
  const moved = fields.filter((k) => !same(stored[k], input[k]));
  if (moved.length) {
    const held = frozen
      ? `${id} was registered at ${stored.registered_at} by ${stored.registered_by}`
      : `${id} is tested by ${frozenBy.join(", ")}, which a person registered, so its claim is fixed as that plan was written against it`;
    return `${held}, so ${moved.join(", ")} ${moved.length > 1 ? "do" : "does"} not change: ${WAYS}`;
  }
  for (const k of APPEND_ONLY) {
    const was = (stored[k] ?? []) as unknown[];
    const now = (input[k] ?? []) as unknown[];
    if (now.length < was.length) return `${id} is frozen, so ${k} is append-only: it holds ${was.length} entr${was.length === 1 ? "y" : "ies"} and this write leaves ${now.length}. Evidence that told against the bet is not removed`;
    const edited = was.findIndex((e, i) => !same(e, now[i]));
    if (edited >= 0) return `${id} is frozen, so ${k} is append-only: entry ${edited + 1} of ${was.length} would change. Append a new entry instead`;
  }
  if (stored.resolution && !same(stored.resolution, input.resolution)) {
    return `${id} was resolved by ${stored.resolution.by} at ${stored.resolution.at}, and an outcome is written once: ${WAYS}`;
  }
  return null;
}

/**
 * What two bets have to share before their lines can be compared at all: the same population, the same measure, the
 * same unit and the same date. Two numbers about different populations never contradict each other, however the
 * sentences read, so a key that is missing any part is null and nothing is compared. null for a kind with no claim.
 */
export function claimKey(bet: Partial<Bet>): string | null {
  const c = bet.claim;
  if (!c?.population || !c.measure || !c.resolves_by) return null;
  return JSON.stringify([c.population.trim().toLowerCase(), c.measure.trim().toLowerCase(), c.threshold?.unit ?? "", c.resolves_by]);
}

type Range = { lo: number | null; loOpen: boolean; hi: number | null; hiOpen: boolean; eq: number | null; not: number[] };
const rangeOf = (comparator: string, v: number): Range => {
  const r: Range = { lo: null, loOpen: false, hi: null, hiOpen: false, eq: null, not: [] };
  if (comparator === ">=") { r.lo = v; }
  else if (comparator === ">") { r.lo = v; r.loOpen = true; }
  else if (comparator === "<=") { r.hi = v; }
  else if (comparator === "<") { r.hi = v; r.hiOpen = true; }
  else if (comparator === "==") { r.eq = v; }
  else if (comparator === "!=") { r.not = [v]; }
  return r;
};
const holds = (r: Range, x: number): boolean =>
  (r.eq === null || r.eq === x) && !r.not.includes(x)
  && (r.lo === null || (r.loOpen ? x > r.lo : x >= r.lo)) && (r.hi === null || (r.hiOpen ? x < r.hi : x <= r.hi));

/**
 * Whether two bets over the same population, measure, unit and date could both hold: interval arithmetic over the
 * comparator and the threshold, which is the one contradiction a machine can settle. "At least 30 %" and "under
 * 20 %" cannot both hold, and a machine can say so; whether two bets in ordinary language disagree is a question for
 * a person, and `naive lint premises` asks it rather than ruling on it. True whenever the lines cannot be compared,
 * because the honest answer is then that nothing was checked.
 */
export function bothCanHold(a: Partial<Bet>, b: Partial<Bet>): boolean {
  const x = a.claim, y = b.claim;
  if (!x?.comparator || !y?.comparator || x.threshold?.value === undefined || y.threshold?.value === undefined) return true;
  if (typeof x.threshold.value === "string" || typeof y.threshold.value === "string") {
    // Worded lines compare only for equality: two different values asked for exactly cannot both hold.
    if (x.comparator === "==" && y.comparator === "==") return String(x.threshold.value) === String(y.threshold.value);
    if (x.comparator === "==" && y.comparator === "!=") return String(x.threshold.value) !== String(y.threshold.value);
    if (x.comparator === "!=" && y.comparator === "==") return String(x.threshold.value) !== String(y.threshold.value);
    return true;
  }
  const p = rangeOf(x.comparator, x.threshold.value), q = rangeOf(y.comparator, y.threshold.value);
  if (p.eq !== null) return holds(q, p.eq);
  if (q.eq !== null) return holds(p, q.eq);
  const lo = p.lo === null ? q.lo : q.lo === null ? p.lo : Math.max(p.lo, q.lo);
  const hi = p.hi === null ? q.hi : q.hi === null ? p.hi : Math.min(p.hi, q.hi);
  if (lo === null || hi === null) return true;
  if (lo < hi) return true;
  // One point left: it is in both only when neither side excludes it.
  return lo === hi && holds(p, lo) && holds(q, lo);
}

/** A bet's prior against what happened: the probability a person set before the search, and the Brier score of it. */
export type BetScore = { readonly bet: string; readonly p: number; readonly outcome: 0 | 1; readonly brier: number; readonly intends_to_cause: boolean };

/**
 * The bet's prior scored against what happened, or null when it cannot be scored. The prior is the first
 * confidence entry, the one set before the search, so the score says how well the forecast was made rather than
 * how well it was revised. A mixed or unresolvable outcome is left out rather than guessed at, and a selection rule
 * is never scored. Brier, 1950: the squared difference between the stated probability and the outcome, where 0 is
 * perfect and lower is better.
 */
export function brierOf(bet: Partial<Bet>): BetScore | null {
  if (bet.kind === "selection-rule") return null;
  const prior = bet.confidence?.[0];
  const outcome = bet.resolution?.outcome;
  if (!prior || typeof prior.p !== "number") return null;
  if (outcome !== "happened" && outcome !== "did-not-happen") return null;
  const o: 0 | 1 = outcome === "happened" ? 1 : 0;
  return { bet: bet.id ?? "", p: prior.p, outcome: o, brier: brier(prior.p, o), intends_to_cause: bet.intends_to_cause === true };
}

/** The calibration of a set of bets: the scored ones, the mean, and each one left out with why. */
export type Calibration = {
  readonly scored: readonly BetScore[];
  readonly brier: number | null;
  readonly caused: readonly BetScore[];
  readonly caused_brier: number | null;
  readonly unscored: readonly { readonly bet: string; readonly why: string }[];
};

const mean = (xs: readonly number[]): number | null => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;

/**
 * The mean Brier score over the bets that resolved, with the ones the venture worked to make true reported apart
 * and never folded into the same number: a forecast a founder set out to cause is not foresight, whatever it
 * scores. Nothing here is a threshold or a verdict. A score is a number about the forecasting, and what to do
 * about it is a person's.
 */
export function calibration(bets: readonly Partial<Bet>[]): Calibration {
  const scored: BetScore[] = [];
  const caused: BetScore[] = [];
  const unscored: { bet: string; why: string }[] = [];
  for (const bet of bets) {
    const id = bet.id ?? "";
    const score = brierOf(bet);
    if (!score) {
      const why = bet.kind === "selection-rule" ? "it is a selection rule, which evidence never settles"
        : !bet.confidence?.length ? "nobody put odds on it before the search"
        : !bet.resolution ? "it has not been resolved"
        : "its outcome was mixed or unresolvable, which is not scored";
      unscored.push({ bet: id, why });
      continue;
    }
    (score.intends_to_cause ? caused : scored).push(score);
  }
  return { scored, brier: mean(scored.map((s) => s.brier)), caused, caused_brier: mean(caused.map((s) => s.brier)), unscored };
}
