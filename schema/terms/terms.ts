// The admitted and proposed terms. Each is defined from its own sources, then run through schema/terms/admit.ts.
// Definitions: founder suite doc and mentor/coach and unearned-candour docs (2026-10-31); status proposed until Torian decides.

import type { Term } from "./engine.ts";
import type { Arrangement, Encounter, Hierarchy, Membership, Relationship } from "./levels.ts";

const evidenced = (f: Membership) => f.contributions.some((c) => c.evidenced);

export const founder: Term<Membership> = {
  id: "founder", form: "word", label: "Founder", level: "membership", kind: "role",
  meaning: "A person who brought a founding contribution to a venture at its founding, has a stake in it, and shows up in its record. A venture may have several.",
  props: [
    { id: "F1", says: "a person, or an entity whose owners trace to people", check: (f) => f.human },
    { id: "F2", says: "there before the first hire, investment or paying customer", check: (f) => f.firstOutside === null || f.joined <= f.firstOutside },
    { id: "F3", says: "brought a founding contribution, evidenced in provenance", check: evidenced },
    { id: "F4", says: "has a stake: equity or a signed founder agreement", check: (f) => f.stake },
    { id: "F5", says: "shows up in provenance through decisions or work", check: (f) => f.decisions >= 1 },
  ],
  sources: ["Founder suite doc, 2026-10-31", "Paul Graham, The 18 Mistakes That Kill Startups (2006)"],
  lean: ["unconfirmed_not_founder", "unevidenced_not_founder"],
};

export const coFounder: Term<Membership> = {
  ...founder, id: "co-founder", form: "word", label: "Co-founder",
  meaning: "A founder of a venture that has at least one other founder.",
  props: [...founder.props, { id: "CF1", says: "another founder on the same venture", check: (f) => f.otherFounders >= 1 }],
  lean: ["coFounder_isA_founder"],
  predicts: { founder: "is_a" },
};

export const earlyEmployee: Term<Membership> = {
  id: "early-employee", form: "compound", label: "Early employee", level: "membership", kind: "role",
  meaning: "Someone with a stake and work in the venture who brought no idea, secret, ethos, mission or capital to its founding.",
  props: [
    { id: "F1", says: "a person", check: (f) => f.human },
    { id: "F4", says: "has a stake", check: (f) => f.stake },
    { id: "F5", says: "shows up in provenance", check: (f) => f.decisions >= 1 },
    { id: "EE1", says: "brought no idea, secret, ethos, mission or capital", check: (f) => !f.contributions.some((c) => c.evidenced && !["technical", "network"].includes(c.kind)) },
  ],
  sources: ["Founder suite doc, 2026-10-31"],
  predicts: { founder: "overlap" },
};

export const mentor: Term<Relationship> = {
  id: "mentor", form: "word", label: "Mentor", level: "relationship", kind: "role",
  meaning: "Someone who has walked the path the other is on, helps the whole person over a long horizon under sacred trust, spends their own standing for them, and aims at their release.",
  props: [
    { id: "M1", says: "lived experience of the other's path, drawn on", check: (f) => f.livedPath },
    { id: "M2", says: "whole-person, long horizon", check: (f) => f.wholePerson },
    { id: "M3", says: "sacred trust T1 to T5 hold", check: (f) => f.trust },
    { id: "M4", says: "directive allowed (a permission, never fails)", check: () => true, permission: true },
    { id: "M5", says: "spends standing for the other at least once", check: (f) => f.spendsStanding },
    { id: "M6", says: "aims at release: dependence falls", check: (f) => f.dependenceFalls },
  ],
  sources: ["Mentor and coach doc, 2026-10-31", "Kram, Mentoring at Work (1985)"],
  predicts: { friend: "overlap" },
};

export const coach: Term<Relationship> = {
  id: "coach", form: "word", label: "Coach", level: "relationship", kind: "role",
  meaning: "Someone who, under an explicit agreement, helps the client reach the client's own goal mostly by asking, with an accountability loop and sacred trust.",
  props: [
    { id: "C1", says: "explicit agreement: goal, success, duration", check: (f) => f.agreement && f.goalSetBy !== "helper" },
    { id: "C2", says: "elicitive: most turns are questions or reflections", check: (f) => f.questionShare >= 0.5 },
    { id: "C3", says: "process, not path (a permission, never fails)", check: () => true, permission: true },
    { id: "C4", says: "commitments made and reviewed", check: (f) => f.commitmentsReviewed },
    { id: "C5", says: "the client owns the goal and actions", check: (f) => f.goalSetBy !== "helper" },
    { id: "C6", says: "sacred trust T1 to T5 hold", check: (f) => f.trust },
  ],
  sources: ["Mentor and coach doc, 2026-10-31", "ICF core competencies"],
  predicts: { friend: "overlap", mentor: "overlap" }, // Torian 2026-10-31: a friend can also be a coach
};

export const friend: Term<Relationship> = {
  id: "friend", form: "word", label: "Friend", level: "relationship", kind: "role",
  meaning: "Two people who each wish the other well for the other's own sake, know it, and share life over time, as peers. Kind (utility, pleasure, character) is a facet, not a test.",
  props: [
    { id: "FR1", says: "goodwill for the other's sake, beyond exchange", check: (f) => f.goodwill },
    { id: "FR2", says: "mutual and known", check: (f) => f.mutualKnown },
    { id: "FR3", says: "time together: a shared history", check: (f) => f.sharedHistory },
    { id: "FR4", says: "not only under a contract", check: (f) => !f.contractOnly },
    { id: "FR5", says: "peers: neither holds authority by role", check: (f) => !f.authority },
  ],
  sources: ["Aristotle, Nicomachean Ethics VIII-IX (from memory, to check)"],
  predicts: { mentor: "overlap", coach: "overlap" },
};

export const unearnedCandour: Term<Encounter> = {
  id: "unearned-candour", form: "compound", label: "Unearned candour", level: "encounter", kind: "act",
  meaning: "Advice or judgement offered as candour about another person's path, when the speaker lacks standing, context or consent. An act in one encounter, not a role.",
  props: [
    { id: "U1", says: "framed as candour", check: (f) => f.framedAsCandour },
    { id: "U2", says: "about the other's path", check: (f) => f.aboutOthersPath },
    { id: "U3", says: "missing standing", check: (f) => !f.standing },
    { id: "U4", says: "missing context: no inquiry first", check: (f) => !f.inquiredFirst },
    { id: "U5", says: "missing consent", check: (f) => !f.consented },
  ],
  rule: (h) => h.U1 && h.U2 && (h.U3 || h.U4 || h.U5),
  ruleSays: "U1 and U2, and any of U3, U4, U5",
  sources: ["Unearned candour doc, 2026-10-31", "Schaerer et al. 2018, Advice Giving: A Subtle Pathway to Power"],
  predicts: { "threshold-guardian": "overlap" },
};

export const thresholdGuardian: Term<Encounter> = {
  id: "threshold-guardian", form: "compound", label: "Threshold guardian", level: "encounter", kind: "role",
  meaning: "Whoever or whatever stands where someone crosses into a new world and tests whether they are ready. A role relative to one crossing; need not be a person.",
  props: [
    { id: "G1", says: "at a crossing into a new world", check: (f) => f.atCrossing },
    { id: "G2", says: "tests or blocks, not helping outright", check: (f) => f.resists && !f.helpsOutright },
    { id: "G3", says: "not the main opponent of the whole journey", check: (f) => !f.opposesJourney },
    { id: "G4", says: "passable without destroying it", check: (f) => f.passableWithoutDestruction },
    { id: "G5", says: "the role ends once the crossing is made", check: (f) => f.endsAfterCrossing },
  ],
  sources: ["Vogler, The Writer's Journey (secondary summaries)"],
};

export const phaseGate: Term<Encounter> = {
  ...thresholdGuardian, id: "phase-gate", form: "compound", label: "Phase gate",
  meaning: "The exit of a venture phase: it tests readiness through exit criteria, is passed by meeting them, and is not a person.",
  props: [...thresholdGuardian.props,
    { id: "PG1", says: "the crossing is a phase exit", check: (f) => f.phaseExit },
    { id: "PG2", says: "not a person", check: (f) => !f.person }],
  sources: ["Naive lifecycle gate (naive phase)", "Unearned candour doc, 2026-10-31 (prediction)"],
  lean: ["phaseGate_isA_thresholdGuardian"],
  predicts: { "threshold-guardian": "is_a" },
};

/** reach[a][b]: part a depends on part b, directly or through other parts (Warshall's transitive closure). */
const reach = (f: Arrangement): boolean[][] => {
  const r = Array.from({ length: f.parts }, (_, a) => Array.from({ length: f.parts }, (_, b) => f.dependsOn.some(([x, y]) => x === a && y === b)));
  for (let k = 0; k < f.parts; k++) for (let i = 0; i < f.parts; i++) for (let j = 0; j < f.parts; j++) if (r[i][k] && r[k][j]) r[i][j] = true;
  return r;
};

export const layer: Term<Arrangement> = {
  id: "layer", form: "word", label: "Layer", level: "arrangement", kind: "role",
  meaning: "A part of an ordered arrangement in which each part depends only on the parts beneath it, the standard technical sense (the OSI model, a layered software architecture). Whether a part is a layer depends on the whole arrangement, so the test runs on the whole: its dependencies hold no cycle and put every part in one stack, and beneath means depended on. The ontology's three layers pass. Naive's groupings fail, both the seven EE-001 decided (a loop) and the seven manifests as built (their reads form cycles), so for them \"layer\" is the system's name for its parts, not this term.",
  props: [
    { id: "L1", says: "an arrangement of at least two parts", check: (f) => f.parts >= 2 },
    { id: "L2", says: "no part depends on itself, directly or through other parts (no cycle)", check: (f) => reach(f).every((row, a) => !row[a]), uses: [reach] },
    { id: "L3", says: "one stack: of any two parts, one depends on the other, directly or through other parts", check: (f) => { const r = reach(f); return r.every((row, a) => row.every((x, b) => a === b || x || r[b][a])); }, uses: [reach] },
  ],
  sources: ["ISO/IEC 7498-1:1994, the OSI basic reference model", "Buschmann et al., Pattern-Oriented Software Architecture, vol. 1 (1996), the Layers pattern", "Dijkstra, The structure of the THE multiprogramming system (1968)", "Ledger N-096 and C-086 (2026-10-31): layer reserved for the technical sense"],
  lean: ["downward_order_no_cycle", "cycle_no_downward_order", "ee001_loop_no_downward_order"],
  predicts: { area: "overlap" },
};

export const area: Term<Arrangement> = {
  id: "area", form: "word", label: "Area", level: "arrangement", kind: "role",
  meaning: "A part of an arrangement drawn around one concern, with nothing required of the order among the parts: dependencies may run any way, loops included. The contrast to layer, and the word C-086 proposed for Naive's groupings. A layer need not be an area, and an area need not be a layer.",
  props: [
    { id: "A1", says: "an arrangement of at least two parts", check: (f) => f.parts >= 2 },
    { id: "A2", says: "each part drawn around one concern", check: (f) => f.byConcern },
  ],
  sources: ["Dijkstra, On the role of scientific thought (EWD447, 1974): separation of concerns", "Parnas, On the criteria to be used in decomposing systems into modules (1972)", "Ledger C-086 (2026-10-31): Naive's groupings proposed as areas"],
  predicts: { layer: "overlap" },
};

/** below[a][b]: b is broader than a, directly or through other nodes (Warshall's transitive closure). */
export const below = (f: Hierarchy): boolean[][] => {
  const r = Array.from({ length: f.nodes }, () => new Array<boolean>(f.nodes).fill(false));
  for (const [a, b] of f.broader) r[a][b] = true;
  for (let k = 0; k < f.nodes; k++) for (let i = 0; i < f.nodes; i++) if (r[i][k]) for (let j = 0; j < f.nodes; j++) if (r[k][j]) r[i][j] = true;
  return r;
};

/** For each node, the top categories it reaches through zero or more broader links. */
export const topsReached = (f: Hierarchy): number[][] => {
  const r = below(f);
  return r.map((row, a) => f.tops.filter((t) => t === a || row[t]));
};

/** For each node, whether it is a top category or has something broader. */
export const hasBroader = (f: Hierarchy): boolean[] => Array.from({ length: f.nodes }, (_, a) => f.tops.includes(a) || f.broader.some(([x]) => x === a));

export const topCategory: Term<Hierarchy> = {
  id: "top-category", form: "compound", label: "Top category", level: "hierarchy", kind: "role",
  meaning: "A category at the top of a hierarchy of categories joined by broader links, as in an upper ontology. Whether a category is a top category depends on the whole hierarchy, so the test runs on the whole: broader holds no cycle, a top category has nothing broader, every other category has something broader, and none reaches two top categories. Then every category reaches exactly one top category, which lean/Naive/Upper.lean proves. Naive's top categories are listed in docs/ontology.json, each mapped to a class of BFO (N-049).",
  props: [
    { id: "U1", says: "no category is broader than itself, directly or through others (no cycle)", check: (f) => below(f).every((row, a) => !row[a]), uses: [below] },
    { id: "U2", says: "a top category has nothing broader", check: (f) => f.broader.every(([a]) => !f.tops.includes(a)) },
    { id: "U3", says: "every category that is not a top category has something broader (no orphan)", check: (f) => hasBroader(f).every(Boolean), uses: [hasBroader] },
    { id: "U4", says: "no category reaches two top categories", check: (f) => topsReached(f).every((ts) => ts.length <= 1), uses: [topsReached, below] },
  ],
  sources: ["ISO/IEC 21838-2:2021, Basic Formal Ontology", "W3C SKOS Reference (2009): skos:broader, skos:hasTopConcept", "Ledger N-049 (2026-11-02): own top categories, each mapped to BFO; every noun traces to exactly one through broader", "docs/design/ONTOLOGY_CORE_2026-11-04.md, part 2"],
  lean: ["upper_no_cycle", "upper_top_only_itself", "upper_reaches_top", "upper_top_unique", "upper_one_top", "upper_isA_top"],
};

export const TERMS = [founder, coFounder, earlyEmployee, mentor, coach, friend, unearnedCandour, thresholdGuardian, phaseGate, layer, area, topCategory];
