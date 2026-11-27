#!/usr/bin/env node
// The pure rules over bets (EE-221, docs/design/BETS_2026-11-26.md): the fixed sentence form per kind, which parts
// of a claim are missing, the lifecycle, the two lines that cannot both hold, and the Brier score. No I/O, no
// venture, no clock: every answer here is a function of its arguments.
//
//   node packages/naive/src/engine/bets-test.ts

import { LIFECYCLE, betWriteRefusal, bothCanHold, brierOf, calibration, claimGaps, claimKey, registrationGaps, statementForm, transitionRefusal } from "./bets.ts";
import type { Bet } from "../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 400)}`}`); if (!ok) failed++; };

/** A forecast with every part filled in, as a person would have it before registering. */
const forecast = (over: Partial<Bet> = {}): Bet => ({
  id: "small-teams", kind: "forecast", status: "proposed", owner: "Torian",
  statement: "Small teams will reach a million in revenue more often than they do today.",
  claim: { population: "software companies founded in or after 2024", measure: "the share that reached a million in annual revenue with five or fewer people",
    comparator: ">=", threshold: { value: 10, unit: "%", set_by: "Torian" }, resolves_by: "2027-06-30", source: "the company's own statement or a filing", denominator: "every company founded in that window" },
  falsified_by: "Under 10 % of them did, as of 2027-06-30.",
  confidence: [{ p: 0.3, set_by: "Torian", at: "2026-11-26T00:00:00Z", data_seen: "after-analysis", why: "two examples prompted the bet, so the odds are not from a search" }],
  ...over,
} as Bet);

const rule = (over: Partial<Bet> = {}): Bet => ({
  id: "who-to-back", kind: "selection-rule", status: "proposed", owner: "Torian",
  statement: "We back founders who ship and not founders who only talk.",
  rule: { back: "a founder with something running a stranger can use", do_not_back: "a founder with nothing running after a year", observable_test: "a working thing a stranger can reach" },
  ...over,
} as Bet);

// The fixed form per kind, rendered from the parts and never from the sentence.
expect("a forecast renders the forecast form", statementForm(forecast()) === "By 2027-06-30, among software companies founded in or after 2024, the share that reached a million in annual revenue with five or fewer people will be at least 10 %, according to the company's own statement or a filing.", statementForm(forecast()));
expect("an empirical claim renders as of its date", (statementForm(forecast({ kind: "empirical" })) ?? "").startsWith("As of 2027-06-30, among"));
expect("a causal claim names the group it is measured against", (statementForm(forecast({ kind: "causal", claim: { ...forecast().claim, compared_with: "companies that did not adopt it" } })) ?? "").includes("against companies that did not adopt it"));
expect("a selection rule renders its two sides and its test", statementForm(rule()) === "We back a founder with something running a stranger can use, and we do not back a founder with nothing running after a year, told apart by a working thing a stranger can reach.");
expect("a claim with a part missing has no form at all", statementForm(forecast({ claim: { population: "founders" } })) === null);

// What is missing, said as a list a person can read before registering.
expect("a claim with no line says the line is the venture's own", claimGaps(forecast({ claim: { ...forecast().claim, comparator: undefined } })).some((g) => /ships none/.test(g)));
expect("a threshold nobody chose is a gap", claimGaps(forecast({ claim: { ...forecast().claim, threshold: { value: 10 } } })).some((g) => /names nobody who chose it/.test(g)));
expect("a forecast with no date is a gap", claimGaps(forecast({ claim: { ...forecast().claim, resolves_by: undefined } })).some((g) => /no date it is judged on/.test(g)));
expect("a rule with no observable test is a gap", claimGaps(rule({ rule: { back: "a", do_not_back: "b" } })).some((g) => /no observable test/.test(g)));
expect("a bet nobody put odds on is not ready to register", registrationGaps(forecast({ confidence: [] })).some((g) => /put odds on it/.test(g)));
expect("a bet that says nothing would show it wrong is not ready", registrationGaps(forecast({ falsified_by: undefined })).some((g) => /show it wrong/.test(g)));
expect("a complete forecast has no gaps", registrationGaps(forecast()).length === 0, registrationGaps(forecast()));
expect("a complete selection rule has no gaps, and is never asked for a date", registrationGaps(rule({ confidence: [{ p: 0.5, set_by: "Torian", at: "x", data_seen: "before-access" }] })).length === 0);

// The lifecycle. Nobody breaks it, a person included, and a withdrawn bet goes back on the table.
expect("a proposed bet is registered or withdrawn, never resolved", LIFECYCLE.proposed.join() === "registered,withdrawn");
expect("a withdrawn bet goes back to proposed", transitionRefusal("withdrawn", "proposed") === null);
expect("a superseded bet goes nowhere", /goes to nothing/.test(transitionRefusal("superseded", "registered") ?? ""));
expect("a proposed bet does not become supported", /does not become supported/.test(transitionRefusal("proposed", "supported") ?? ""));

// Who may write what. An agent drafts and gathers; it never puts odds on a bet or resolves one.
const agentOdds = betWriteRefusal({ stored: forecast({ confidence: [] }), input: forecast(), person: false });
expect("an agent writing a confidence entry is refused, with the person's command named", /only a person writes confidence/.test(agentOdds ?? "") && /naive bets confidence/.test(agentOdds ?? ""), agentOdds);
expect("a person writing the same entry may", betWriteRefusal({ stored: forecast({ confidence: [] }), input: forecast(), person: true }) === null);
const agentVerdict = betWriteRefusal({ stored: forecast({ status: "registered", registered_at: "x", registered_by: "T" }), input: forecast({ status: "refuted", registered_at: "x", registered_by: "T", resolution: { outcome: "did-not-happen", at: "y", by: "someone" } }), person: false });
expect("an agent resolving a bet is refused and told to raise a decision", /continue-or-stop/.test(agentVerdict ?? ""), agentVerdict);
const ruleVerdict = betWriteRefusal({ stored: rule({ status: "registered", registered_at: "x", registered_by: "T" }), input: rule({ status: "supported", registered_at: "x", registered_by: "T", resolution: { outcome: "happened", at: "y", by: "Torian" } }), person: true });
expect("a selection rule is never supported, even by a person", /never supported/.test(ruleVerdict ?? ""), ruleVerdict);
const noWitness = betWriteRefusal({ stored: forecast({ status: "registered", registered_at: "x", registered_by: "T" }), input: forecast({ status: "refuted", registered_at: "x", registered_by: "T" }), person: true });
expect("a verdict with nothing observed is refused", /nothing observed/.test(noWitness ?? ""), noWitness);

// The freeze, by the bet's own registration and by a pre-registration that tests it.
const registered = forecast({ status: "registered", registered_at: "2026-11-26T00:00:00Z", registered_by: "Torian", evidence: [{ ref: "evidence/one-filing", supports: false }] });
const lowered = betWriteRefusal({ stored: registered, input: { ...registered, claim: { ...registered.claim, threshold: { value: 2, unit: "%", set_by: "Torian" } } }, person: true });
expect("a person lowering a registered line is refused, and told the way on", /claim does not change/.test(lowered ?? "") && /supersedes/.test(lowered ?? ""), lowered);
const byPlan = betWriteRefusal({ stored: forecast(), input: forecast({ statement: "Something else entirely." }), person: true, frozenBy: ["price"] });
expect("a plan a person registered against the claim freezes the claim, though the bet is still proposed", /tested by price/.test(byPlan ?? "") && /statement/.test(byPlan ?? ""), byPlan);
expect("a plan still being drafted freezes nothing", betWriteRefusal({ stored: forecast(), input: forecast({ statement: "Something else entirely." }), person: true }) === null);
const dropped = betWriteRefusal({ stored: registered, input: { ...registered, evidence: [] }, person: true });
expect("evidence already written is never removed", /append-only/.test(dropped ?? ""), dropped);
const unregistered = betWriteRefusal({ stored: null, input: forecast({ status: "registered" }), person: true });
expect("a new bet cannot be born registered without naming who registered it", /registered_by|registered_at/.test(unregistered ?? ""), unregistered);
expect("a bet cannot be its own premise", /premise of itself/.test(betWriteRefusal({ stored: null, input: forecast({ premises: ["small-teams"] }), person: true }) ?? ""));

// Two lines that cannot both hold: the one contradiction a machine can settle.
const key = claimKey(forecast());
expect("two claims are compared only over the same population, measure, unit and date", key !== null && claimKey(forecast({ claim: { ...forecast().claim, population: "somebody else" } })) !== key);
expect("a claim missing a part is compared with nothing", claimKey(forecast({ claim: { population: "a", measure: "b" } })) === null);
const under = forecast({ id: "few", claim: { ...forecast().claim, comparator: "<", threshold: { value: 5, unit: "%", set_by: "Torian" } } });
expect("at least 10 % and under 5 % cannot both hold", bothCanHold(forecast(), under) === false);
expect("at least 10 % and at least 5 % can both hold", bothCanHold(forecast(), forecast({ claim: { ...forecast().claim, threshold: { value: 5, unit: "%", set_by: "T" } } })) === true);
expect("at least 10 % and at most 10 % both hold at the point", bothCanHold(forecast(), forecast({ claim: { ...forecast().claim, comparator: "<=" } })) === true);
expect("at least 10 % and under 10 % do not", bothCanHold(forecast(), forecast({ claim: { ...forecast().claim, comparator: "<" } })) === false);
expect("exactly 4 % fails a line of at least 10 %", bothCanHold(forecast(), forecast({ claim: { ...forecast().claim, comparator: "==", threshold: { value: 4, unit: "%", set_by: "T" } } })) === false);
expect("a worded line is compared only for equality", bothCanHold(forecast({ claim: { ...forecast().claim, comparator: "==", threshold: { value: "yes", set_by: "T" } } }), forecast({ claim: { ...forecast().claim, comparator: "==", threshold: { value: "no", set_by: "T" } } })) === false);
expect("nothing is claimed when the lines cannot be compared", bothCanHold(forecast({ claim: { population: "a" } }), forecast()) === true);

// The score. The prior is what is scored, because the later entries saw the evidence.
const happened = forecast({ status: "supported", registered_at: "x", registered_by: "T", resolution: { outcome: "happened", at: "y", by: "Torian" } });
const updated = brierOf({ ...happened, confidence: [...happened.confidence!, { p: 0.9, set_by: "Torian", at: "z", data_seen: "after-analysis" }] });
expect("the prior is scored, not the latest entry", updated?.p === 0.3 && Math.abs((updated?.brier ?? 0) - 0.49) < 1e-9, updated);
expect("a forecast given 0.3 that happened scores 0.49", Math.abs((brierOf(happened)?.brier ?? 0) - 0.49) < 1e-9, brierOf(happened));
expect("the same forecast that did not happen scores 0.09", Math.abs((brierOf({ ...happened, resolution: { outcome: "did-not-happen", at: "y", by: "T" } })?.brier ?? 0) - 0.09) < 1e-9);
expect("an unresolved bet is not scored", brierOf(forecast()) === null);
expect("a mixed outcome is not scored rather than guessed at", brierOf({ ...happened, resolution: { outcome: "mixed", at: "y", by: "T" } }) === null);
expect("a selection rule is never scored", brierOf(rule({ resolution: { outcome: "happened", at: "y", by: "T" } })) === null);

const set = calibration([happened, { ...happened, id: "caused", intends_to_cause: true }, forecast({ id: "open" }), rule({ id: "value" })]);
expect("the mean is over the resolved bets only", set.scored.length === 1 && Math.abs((set.brier ?? 0) - 0.49) < 1e-9, set);
expect("a bet the venture worked to make true is kept apart", set.caused.length === 1 && set.caused_brier !== null, set);
expect("every bet left out says why", set.unscored.length === 2 && set.unscored.some((u) => /selection rule/.test(u.why)) && set.unscored.some((u) => /not been resolved/.test(u.why)), set.unscored);

if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("bets: all passed");
