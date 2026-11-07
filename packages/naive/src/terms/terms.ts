// The admitted and proposed terms. Each is defined from its own sources, then run through packages/naive/src/terms/admit.ts.
// Definitions: founder suite doc and mentor/coach and unearned-candour docs (2026-10-31); status proposed until Torian decides.

import type { Term } from "./engine.ts";
import type { Arrangement, Detector, Encounter, EvalPlan, Experiment, Hierarchy, LinkGraph, Membership, Reception, Relationship, Settlement, Trial } from "./levels.ts";
import { known, mayBeNew, RELATIONS, relationTable, type RelationName } from "./relations.ts";

// The four labels every term carries (N-051 to N-055, docs/design/TERM_LABELS_2026-11-02.md). They sit on the term,
// never on the facts, so no check reads them. packages/naive/src/terms/admit.ts --check enforces what the types cannot.

export const GRADES = ["standard", "regulatory", "codified", "convention", "seminal", "none"] as const;
/** Source authority: standard with its siblings regulatory and codified, convention with its sibling seminal, or none. */
export type Grade = (typeof GRADES)[number];
const UNQUOTED = ["adapted", "narrowed", "broadened", "borrowed", "operationally-coined"] as const;
/** From the mapping to the source. Adopted only when the source's definition is quoted, otherwise adapted (N-054). */
export type Origin = { kind: "adopted"; quote: string } | { kind: (typeof UNQUOTED)[number] };
/** A name@function scope listed in packages/naive/src/terms/ontology-catalog.json, or shared: function null, visible to every scope. */
export type Scope = `naive@${string}` | "shared";
type Common = { scope: Scope; origin: Origin; grade: Grade };
/** Designation per ISO 1087:2019. Symbol is reserved and cannot be built. A proper name or an appellation has
 *  exactly one referent, linked by instanceOf, and stays out of the 10 percent cap (N-052, N-053, N-055). */
export type Labels =
  | (Common & { designation: "term" })
  | (Common & { designation: "proper-name" | "appellation"; referent: string; instanceOf: string });

/** Labels of a shared term whose source is not quoted, so its origin cannot be adopted. */
const sharedTerm = (origin: (typeof UNQUOTED)[number], grade: Grade): Labels => ({ designation: "term", scope: "shared", origin: { kind: origin }, grade });

const COUNTED: readonly string[] = ["operationally-coined", "borrowed"];

/** The cap is taken over designation term only: proper names and appellations are neither counted nor counted against. */
export function capShare(labels: readonly Labels[]): { counted: number; of: number } {
  const inCap = labels.filter((l) => l.designation === "term");
  return { counted: inCap.filter((l) => COUNTED.includes(l.origin.kind)).length, of: inCap.length };
}

/** What the types cannot hold, checked on every term at admission. A term written without type checking reaches
 *  here as it is, so each label is read as untrusted. `scopes` are the scopes in packages/naive/src/terms/ontology-catalog.json. */
export function labelProblems(terms: readonly { id: string; label: string; labels?: unknown }[], scopes: ReadonlySet<string>): string[] {
  const out: string[] = [];
  const wellFormed: Labels[] = [];
  const referents = new Map<string, Set<string>>();
  const filled = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
  for (const { id, label, labels } of terms) {
    const l = (labels ?? {}) as Record<string, unknown>;
    const origin = (l.origin ?? {}) as Record<string, unknown>;
    const before = out.length;
    if (l.scope !== "shared" && !scopes.has(String(l.scope))) out.push(`${id}: scope ${String(l.scope)} is not shared and not in packages/naive/src/terms/ontology-catalog.json`);
    if (!(GRADES as readonly unknown[]).includes(l.grade)) out.push(`${id}: grade ${String(l.grade)} is not one of ${GRADES.join(", ")}`);
    if (origin.kind === "adopted" && !filled(origin.quote)) out.push(`${id}: origin adopted needs the source's definition quoted (N-054); without a quote it is adapted`);
    else if (origin.kind !== "adopted" && !(UNQUOTED as readonly unknown[]).includes(origin.kind)) out.push(`${id}: origin ${String(origin.kind)} is not adopted or one of ${UNQUOTED.join(", ")}`);
    if (l.designation === "proper-name" || l.designation === "appellation") {
      const r = l.referent;
      if (!filled(r)) out.push(`${id}: ${l.designation} "${label}" has ${Array.isArray(r) ? r.length : 0} referents; it needs exactly one (N-052)`);
      else referents.set(label, (referents.get(label) ?? new Set()).add(r));
      if (!filled(l.instanceOf)) out.push(`${id}: ${l.designation} "${label}" names no instanceOf (N-052)`);
    } else if (l.designation !== "term") out.push(`${id}: designation ${String(l.designation)} is not term, proper-name or appellation (symbol is reserved)`);
    if (out.length === before) wellFormed.push(l as Labels);
  }
  for (const [name, rs] of referents) if (rs.size > 1) out.push(`name "${name}" has ${rs.size} referents (${[...rs].join(", ")}); it needs exactly one (N-052)`);
  const { counted, of } = capShare(wellFormed);
  if (10 * counted > of) out.push(`the 10 percent cap: ${counted} of ${of} terms (${((100 * counted) / of).toFixed(1)}%) are operationally coined or borrowed; proper names and appellations are left out (N-055)`);
  return out;
}

const evidenced = (f: Membership) => f.contributions.some((c) => c.evidenced);

export const founder: Term<Membership> = {
  id: "founder", form: "word", label: "Founder", level: "membership", kind: "role",
  labels: sharedTerm("adapted", "convention"),
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
  labels: sharedTerm("adapted", "convention"),
  meaning: "A founder of a venture that has at least one other founder.",
  props: [...founder.props, { id: "CF1", says: "another founder on the same venture", check: (f) => f.otherFounders >= 1 }],
  lean: ["coFounder_isA_founder"],
  predicts: { founder: "is_a" },
};

export const earlyEmployee: Term<Membership> = {
  id: "early-employee", form: "compound", label: "Early employee", level: "membership", kind: "role",
  labels: sharedTerm("adapted", "none"),
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
  labels: sharedTerm("adapted", "seminal"),
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
  labels: sharedTerm("adapted", "codified"),
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
  labels: sharedTerm("adapted", "seminal"),
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
  labels: sharedTerm("operationally-coined", "none"),
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
  labels: sharedTerm("adapted", "convention"),
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
  labels: sharedTerm("adapted", "none"),
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
  labels: sharedTerm("adapted", "standard"),
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
  labels: sharedTerm("adapted", "seminal"),
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
  labels: sharedTerm("adapted", "standard"),
  meaning: "A category at the top of a hierarchy of categories joined by broader links, as in an upper ontology. Whether a category is a top category depends on the whole hierarchy, so the test runs on the whole: broader holds no cycle, a top category has nothing broader, every other category has something broader, and none reaches two top categories. packages/naive/lean/Naive/Upper.lean proves that on any finite hierarchy no cycle, no orphan and no category reaching two top categories give every category exactly one top category (upper_one_top_of_checks); that these checks state those hypotheses is read off the code, not proved. Naive's top categories are listed in packages/naive/src/terms/ontology.json, each mapped to a class of BFO (N-049).",
  props: [
    { id: "U1", says: "no category is broader than itself, directly or through others (no cycle)", check: (f) => below(f).every((row, a) => !row[a]), uses: [below] },
    { id: "U2", says: "a top category has nothing broader", check: (f) => f.broader.every(([a]) => !f.tops.includes(a)) },
    { id: "U3", says: "every category that is not a top category has something broader (no orphan)", check: (f) => hasBroader(f).every(Boolean), uses: [hasBroader] },
    { id: "U4", says: "no category reaches two top categories", check: (f) => topsReached(f).every((ts) => ts.length <= 1), uses: [topsReached, below] },
  ],
  sources: ["ISO/IEC 21838-2:2021, Basic Formal Ontology", "W3C SKOS Reference (2009): skos:broader, skos:hasTopConcept", "Ledger N-049 (2026-11-02): own top categories, each mapped to BFO; every noun traces to exactly one through broader", "docs/design/ONTOLOGY_CORE_2026-11-04.md, part 2"],
  lean: ["upper_no_cycle", "upper_rank_of_no_cycle", "upper_top_only_itself", "upper_reaches_top", "upper_top_unique", "upper_one_top", "upper_cat_of_u4", "upper_one_top_of_u4", "upper_one_top_of_checks", "upper_isA_top"],
};

/** Whether a link names a target that exists. A scope the idea creates may be one the catalog does not list yet. */
export const resolves = (f: LinkGraph, l: LinkGraph["links"][number]): boolean =>
  (l.to >= 0 && l.to < (l.target === "idea" ? f.ideas : f.scopes)) || (l.target === "scope" && l.to === -1 && mayBeNew(l.type));

/** For each order (relations no cycle may run through), the ideas that reach themselves through its links. A link
 *  whose type is not its order is read backwards (a narrower b is b broader a). Self links and links that name no
 *  idea are left to T2 and T3. */
export const onCycle = (f: LinkGraph): Record<string, number[]> => {
  const out: Record<string, number[]> = {};
  for (const l of f.links) {
    const order = Object.hasOwn(RELATIONS, l.type) ? RELATIONS[l.type as RelationName].order : null;
    if (order && l.target === "idea") out[order] ??= [];
  }
  for (const order of Object.keys(out)) {
    const next = Array.from({ length: f.ideas }, () => [] as number[]);
    for (const l of f.links) {
      if (l.target !== "idea" || !Object.hasOwn(RELATIONS, l.type) || RELATIONS[l.type as RelationName].order !== order) continue;
      if (l.from === l.to || l.to < 0 || l.to >= f.ideas || l.from < 0 || l.from >= f.ideas) continue;
      const [a, c] = l.type === order ? [l.from, l.to] : [l.to, l.from];
      next[a].push(c);
    }
    out[order] = next.flatMap((_, v) => {
      const seen = new Set<number>(), stack = [...next[v]];
      while (stack.length) { const x = stack.pop()!; if (x === v) return [v]; if (!seen.has(x)) { seen.add(x); stack.push(...next[x]); } }
      return [];
    });
  }
  return out;
};

export const typedLink: Term<LinkGraph> = {
  id: "typed-link", form: "compound", label: "Typed link", level: "link", kind: "role",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "A link from one record to another whose type names how they relate, drawn from a closed set of standard relations: between ideas, broader, narrower, related, part-of, derived-from, builds-on, supports and contradicts; from an idea to its scope, creates, amends, appends-to and derives-from (packages/naive/src/terms/relations.ts, each mapped to SKOS, PROV-O, DCMI Terms, AIF and IBIS). Whether a link is well typed depends on the whole graph, since an ordering relation must not close a cycle, so the test runs on the whole: every type is in the closed set for its target, no idea links to itself, every target exists (a scope the idea creates may be new), and no cycle runs through broader (narrower read backwards), part-of or builds_on.",
  props: [
    { id: "T1", says: "every link's type is in the closed set for its target: an idea relation to an idea, a scope attachment to a scope", check: (f) => f.links.every((l) => known(l.type, l.target)), uses: [known, relationTable] },
    { id: "T2", says: "no idea links to itself", check: (f) => f.links.every((l) => l.target !== "idea" || l.from !== l.to) },
    { id: "T3", says: "every link names a target that exists, except a scope the idea creates", check: (f) => f.links.every((l) => resolves(f, l)), uses: [resolves, mayBeNew] },
    { id: "T4", says: "no cycle runs through broader (narrower read backwards), part-of or builds-on", check: (f) => Object.values(onCycle(f)).every((vs) => vs.length === 0), uses: [onCycle, relationTable] },
  ],
  sources: [
    "Trigg, A Network-Based Approach to Text Handling for the Online Scientific Community (1983): typed links",
    "W3C SKOS Reference (2009): broader, narrower, related", "W3C PROV-O (2013): wasDerivedFrom", "DCMI Metadata Terms: isPartOf, source, requires, relation",
    "Chesnevar et al., Towards an argument interchange format (2006): inference and conflict nodes",
    "Kunz and Rittel, Issues as elements of information systems (1970); Conklin and Begeman, gIBIS (1988): supports, objects-to, specializes, generalizes",
    "Preserved PR 157 (EE-103): the noun relations broader, narrower, related, part-of and derived-from",
  ],
  lean: ["idea_inverse_involutive", "idea_inverse_same_order", "idea_order_canonical"],
};

// Signal detection (docs/design/SIGNAL_DETECTION_2026-11-07.md, build plan item 1). The theorems are in
// packages/naive/lean/Naive/Detection.lean. Sensor, criterion, sensitivity, base rate and ROC curve are ontology nouns
// without a term of their own: each is a quantity or a part of a detector, not something a record's facts pass or fail.
const GREEN_SWETS = "Green and Swets, Signal Detection Theory and Psychophysics (1966)";
const MACMILLAN = "Macmillan and Creelman, Detection Theory: A User's Guide, 2nd ed. (2004)";
const DETECTION_DESIGN = "docs/design/SIGNAL_DETECTION_2026-11-07.md";

export const detector: Term<Detector> = {
  id: "detector", form: "word", label: "Detector", level: "detector", kind: "role",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "The record of one yes or no call on evidence: its question, the sensor that scores it, the criterion above which the call is yes, the cost of each of the four outcomes, the base rate and who resolves the true answer. It names its sensor and never runs it. Adapted from the observer of signal detection theory, whose decision stage turns a score into a call.",
  props: [
    { id: "D1", says: "asks a question with a yes or no answer", check: (f) => f.yesNo },
    { id: "D2", says: "names the sensor that scores the question", check: (f) => f.sensorNamed },
    { id: "D3", says: "never runs its sensor: it reads the score", check: (f) => !f.runsSensor },
    { id: "D4", says: "one criterion, or two for an unsure band, on the sensor's score scale", check: (f) => (f.criteria === 1 || f.criteria === 2) && f.onScale },
    { id: "D5", says: "a cost for each of the four outcomes", check: (f) => f.costs === 4 },
    { id: "D6", says: "a base rate between 0 and 1", check: (f) => f.baseRate !== null && f.baseRate >= 0 && f.baseRate <= 1 },
    { id: "D7", says: "names who resolves the true answer", check: (f) => f.resolverNamed },
  ],
  sources: [GREEN_SWETS, MACMILLAN, DETECTION_DESIGN],
  lean: ["criterion_monotone", "best_criterion_observed"],
};

export const trial: Term<Trial> = {
  id: "trial", form: "word", label: "Trial", level: "trial", kind: "act",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "One call a detector made and, later, its resolution: the score, the criterion in force and the call, which is yes exactly when the score is at or above the criterion. The true answer may still be unknown.",
  props: [
    { id: "T1", says: "holds the score", check: (f) => f.score !== null },
    { id: "T2", says: "holds the criterion in force", check: (f) => f.criterion !== null },
    { id: "T3", says: "the call is yes exactly when the score is at or above the criterion", check: (f) => f.score !== null && f.criterion !== null && f.call === (f.score >= f.criterion ? "yes" : "no") },
  ],
  sources: [GREEN_SWETS, "Fechner, Elemente der Psychophysik (1860): the trial as the unit of a psychophysical experiment", DETECTION_DESIGN],
  lean: ["roc_monotone", "auc_eq_2afc"],
};

/** One of the four outcomes of a resolved trial: the trial's properties, the true answer and the call. */
const outcome = (id: string, label: string, truth: "yes" | "no", call: "yes" | "no", meaning: string, others: string[]): Term<Trial> => ({
  ...trial, id, label, form: /\s/.test(label) ? "compound" : "word",
  labels: sharedTerm("adapted", "seminal"),
  meaning,
  props: [...trial.props,
    truth === "yes" ? { id: "R1", says: "resolved: the true answer is yes", check: (f) => f.truth === "yes" } : { id: "R0", says: "resolved: the true answer is no", check: (f) => f.truth === "no" },
    call === "yes" ? { id: "C1", says: "the call is yes", check: (f) => f.call === "yes" } : { id: "C0", says: "the call is no", check: (f) => f.call === "no" }],
  sources: [GREEN_SWETS, MACMILLAN],
  lean: [truth === "yes" ? "outcomes_partition_signal" : "outcomes_partition_noise", "roc_monotone"],
  predicts: { trial: "is_a", ...Object.fromEntries(others.map((o) => [o, "disjoint" as const])) },
});

export const hit = outcome("hit", "Hit", "yes", "yes", "A resolved trial whose call was yes and whose true answer was yes.", ["miss", "false-alarm", "correct-rejection"]);
export const miss = outcome("miss", "Miss", "yes", "no", "A resolved trial whose call was no and whose true answer was yes.", ["hit", "false-alarm", "correct-rejection"]);
export const falseAlarm = outcome("false-alarm", "False alarm", "no", "yes", "A resolved trial whose call was yes and whose true answer was no.", ["hit", "miss", "correct-rejection"]);
export const correctRejection = outcome("correct-rejection", "Correct rejection", "no", "no", "A resolved trial whose call was no and whose true answer was no. Noise in its standard sense is the no case; a call below the line is noise only once it resolves as a correct rejection.", ["hit", "miss", "false-alarm"]);

// Signal library (everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md, build plan item 1). Every term here
// is at the reception level: one signal arriving at one listener. Signal reads only the signal's facts and listener
// only the listener's; salient reception and noise read the pair. The theorems are in packages/naive/lean/Naive/Signals.lean.
// Signal type, signal library, projection, Admiralty rating and competitor are ontology nouns without a term of
// their own: each is a definition, a source, a fold, a code or a party, not something a reception passes or fails.
// Criterion is a listener's bounds and predicates here and a detector's line in Detection.lean; it has no term.
const CLOUDEVENTS = "CloudEvents 1.0 (CNCF, 2019): id, source, type, time and data, with source named producer and data named props";
const SHANNON = "Shannon, A Mathematical Theory of Communication (1948)";
const STANAG = "NATO STANAG 2511, Intelligence Reports (Admiralty code): source reliability A to F, information credibility 1 to 6";
const DOM_EVENTS = "W3C DOM Standard (WHATWG): an event listener has a type, a callback and options";
const SIGNAL_DESIGN = "everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md";

const ADMIRALTY_LETTERS = "ABCDEF";
/** An Admiralty code: reliability one letter A to F, credibility a whole number 1 to 6. */
const admiralty = (reliability: unknown, credibility: unknown): boolean =>
  typeof reliability === "string" && reliability.length === 1 && ADMIRALTY_LETTERS.includes(reliability) &&
  typeof credibility === "number" && Number.isInteger(credibility) && credibility >= 1 && credibility <= 6;
/** id@major: the major of a type range or a part. */
const major = (t: string): string => t.split(".")[0];
/** The listener names the signal's type (by major) or the type of one of its parts. */
const hearsIt = (f: Reception): boolean => f.listener.hears !== null && f.signal.type !== null &&
  (major(f.signal.type) === f.listener.hears || f.signal.parts.includes(f.listener.hears));
/** The rating is within the listener's bounds; a missing bound accepts any rating (A is best, 1 is best). */
const inBounds = (f: Reception): boolean => f.signal.rating !== null &&
  (f.listener.reliability === null || f.signal.rating.reliability <= f.listener.reliability) &&
  (f.listener.credibility === null || f.signal.rating.credibility <= f.listener.credibility);
/** The listener lists no producer prefixes, or the signal's producer starts with one of them. */
const producerAccepted = (f: Reception): boolean => {
  const producer = f.signal.producer;
  return f.listener.producers.length === 0 || (producer !== null && f.listener.producers.some((p) => producer.startsWith(p)));
};
/** Only an edge listener judges age; a projecting listener reads no clock. */
const fresh = (f: Reception): boolean => f.listener.then === "project" || f.listener.maxAge === null || f.age <= f.listener.maxAge;
/** The listener's criterion holds on the signal: rating bounds, producer, age at an edge listener, then every predicate. */
const criterionHolds = (f: Reception): boolean => inBounds(f) && producerAccepted(f) && fresh(f) && f.failed === 0;

export const signal: Term<Reception> = {
  id: "signal", form: "word", label: "Signal", level: "reception", kind: "act",
  labels: sharedTerm("adapted", "standard"),
  meaning: "An immutable, content-addressed, dated statement that something happened outside the venture, an element of one signal type, rated with the Admiralty code. It reads the same at every listener: whether it matters is the reception's question, never the signal's.",
  props: [
    { id: "S1", says: "content-addressed: its id is the hash of every other field", check: (f) => f.signal.addressed },
    { id: "S2", says: "names one signal type as id@major.minor", check: (f) => f.signal.type !== null && /^[a-z0-9-]+@\d+\.\d+$/.test(f.signal.type) },
    { id: "S3", says: "names its producer", check: (f) => f.signal.producer !== null },
    { id: "S4", says: "dated: says when the thing happened", check: (f) => f.signal.dated },
    { id: "S5", says: "rated with an Admiralty code: reliability A to F, credibility 1 to 6", check: (f) => f.signal.rating !== null && admiralty(f.signal.rating.reliability, f.signal.rating.credibility), uses: [admiralty] },
    { id: "S6", says: "withdraws at most one signal: at most one of retracts or supersedes", check: (f) => f.signal.withdraws <= 1 },
  ],
  sources: [SHANNON, CLOUDEVENTS, STANAG, SIGNAL_DESIGN],
  lean: ["withdraw_monotone", "live_shrinks"],
  predicts: { listener: "overlap" },
};

export const listener: Term<Reception> = {
  id: "listener", form: "word", label: "Listener", level: "reception", kind: "role",
  labels: sharedTerm("adapted", "standard"),
  meaning: "The edge between a signal type and one consumer (a record route, a frame or a decision): the type range it hears, the consumer's criterion, and what happens to a salient signal. A projecting listener reads no clock; only an edge listener, one that proposes or revalidates, judges age.",
  props: [
    { id: "L1", says: "names one consumer", check: (f) => f.listener.consumer },
    { id: "L2", says: "names the type range it hears, as id@major", check: (f) => f.listener.hears !== null && /^[a-z0-9-]+@\d+$/.test(f.listener.hears) },
    { id: "L3", says: "its rating bounds, where it has them, are Admiralty codes", check: (f) => admiralty(f.listener.reliability ?? "A", f.listener.credibility ?? 1), uses: [admiralty] },
    { id: "L4", says: "says what happens: project, propose or revalidate", check: (f) => f.listener.then !== null },
    { id: "L5", says: "reads no clock when it projects: only an edge listener has an age bound", check: (f) => f.listener.then !== "project" || f.listener.maxAge === null },
  ],
  sources: [DOM_EVENTS, SIGNAL_DESIGN],
  lean: ["part_heard", "heard_iff", "noise_salient_partition"],
  predicts: { signal: "overlap" },
};

export const reception: Term<Reception> = {
  id: "reception", form: "word", label: "Reception", level: "reception", kind: "act",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "One signal arriving at one listener that hears it: the listener names the signal's type, or the type of one of its parts. Every reception is salient or noise for that listener's consumer, never both.",
  props: [...signal.props, ...listener.props,
    { id: "H1", says: "the listener hears the signal's type or the type of one of its parts", check: hearsIt, uses: [major] }],
  sources: [SHANNON, "Green and Swets, Signal Detection Theory and Psychophysics (1966): the observer receives a stimulus and decides", SIGNAL_DESIGN],
  lean: ["part_heard", "noise_salient_partition", "noise_salient_count"],
  predicts: { signal: "is_a", listener: "is_a" },
};

export const salientReception: Term<Reception> = {
  ...reception, id: "salient-reception", label: "Salient reception", form: "compound",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "A reception whose listener's criterion holds: the rating within the listener's bounds, an accepted producer, within an edge listener's age bound, and every predicate true on the venture's facts. The same signal may be noise at another listener.",
  props: [...reception.props,
    { id: "C1", says: "the rating is within the listener's bounds", check: inBounds },
    { id: "C2", says: "the producer is one the listener accepts", check: producerAccepted },
    { id: "C3", says: "within an edge listener's age bound; a projecting listener judges no age", check: fresh },
    { id: "C4", says: "every predicate of the listener holds on the signal", check: (f) => f.failed === 0 }],
  sources: [GREEN_SWETS, SIGNAL_DESIGN],
  lean: ["noise_salient_partition", "noise_relative"],
  predicts: { reception: "is_a", noise: "disjoint", signal: "is_a", listener: "is_a" },
};

export const noise: Term<Reception> = {
  ...reception, id: "noise", label: "Noise", form: "word",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "A reception whose listener's criterion fails: a relation between one signal and one consumer, never a property of the signal, so the same signal can be noise at one listener and salient at another. In signal detection's standard sense noise is the no case of one question; here the question is the consumer's, and its criterion answers it at once, where a detector's no is noise only once it resolves as a correct rejection.",
  props: [...reception.props,
    { id: "N1", says: "the criterion fails: the rating is out of bounds, the producer is not accepted, an edge listener's age bound is passed, or a predicate fails", check: (f) => !criterionHolds(f), uses: [criterionHolds, inBounds, producerAccepted, fresh] }],
  sources: [GREEN_SWETS, SIGNAL_DESIGN],
  lean: ["noise_relative", "noise_undefinable", "noise_relative_facts", "noise_salient_partition"],
  predicts: { reception: "is_a", "salient-reception": "disjoint", signal: "is_a", listener: "is_a" },
};

// Autoresearch over venture records (everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, build plan
// item 1). The theorems are in packages/naive/lean/Naive/Recipes.lean. Recipe, experiment log, eval window, as-of
// view, hindsight label and research program are ontology nouns without a term of their own: each is code, a log,
// a part of a plan, a read, a value or instructions, not a record whose facts pass or fail. A recipe's contract (its
// exports, no imports, no literal ids) is for the sandbox lint, which is not built.
const FISHER = "Fisher, The Design of Experiments (1935)";
const AUTORESEARCH = "Karpathy, autoresearch (2026): an agent edits train.py, each run is scored on a fixed budget and kept or reset, and results.tsv logs every run";
const NOSEK = "Nosek, Ebersole, DeHaven and Mellor, The preregistration revolution, PNAS (2018)";
const LOPEZ = "Lopez de Prado, Advances in Financial Machine Learning (2018): purged and embargoed cross-validation";
const LADDER = "Blum and Hardt, The Ladder: a reliable leaderboard for machine learning competitions (2015)";
const SNODGRASS = "Snodgrass, Developing Time-Oriented Database Applications in SQL (1999): valid time and transaction time";
const AUTORESEARCH_DESIGN = "everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md";

/** The keep rule: every row ran, the check found no noise disagreement, and the gain beats the margin, or the
 *  candidate is no worse and strictly smaller. */
const keeps = (f: Experiment): boolean => f.rowsOk && f.noiseDisagreements === 0 && f.gain !== null && (f.gain > f.margin || (f.smaller && f.gain >= 0));

export const experiment: Term<Experiment> = {
  id: "experiment", form: "word", label: "Experiment", level: "experiment", kind: "act",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "One write of a recipe, scored in code inside the router against a frozen eval plan version and logged whether it is kept or discarded. The writer never supplies the score.",
  props: [
    { id: "E1", says: "edited from the recipe's tip: its base sha is the tip's", check: (f) => f.baseIsTip },
    { id: "E2", says: "names the eval plan version it was scored under", check: (f) => f.planNamed },
    { id: "E3", says: "the verdict was computed inside the write, not supplied by the writer", check: (f) => f.scoredInWrite },
    { id: "E4", says: "its line is in the recipe's experiment log", check: (f) => f.logged },
  ],
  sources: [FISHER, AUTORESEARCH, AUTORESEARCH_DESIGN],
  lean: ["verdict_deterministic", "retry_spends_nothing"],
};

export const keptExperiment: Term<Experiment> = {
  ...experiment, id: "kept-experiment", label: "Kept experiment", form: "compound",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "An experiment whose candidate is kept: every row ran, no signal it called noise changed the record when removed, and its dev gain beats max(min_gain, 2 x standard error), or it is no worse and strictly smaller. An agent's kept write lands as a held draft that becomes the new tip.",
  props: [...experiment.props,
    { id: "K1", says: "every row ran: no throw, timeout or invalid output", check: (f) => f.rowsOk },
    { id: "K2", says: "no signal it called noise changed the record when removed", check: (f) => f.noiseDisagreements === 0 },
    { id: "K3", says: "its dev gain beats the margin, or it is no worse and strictly smaller", check: (f) => f.gain !== null && (f.gain > f.margin || (f.smaller && f.gain >= 0)) }],
  sources: [AUTORESEARCH, LADDER, AUTORESEARCH_DESIGN],
  lean: ["verdict_deterministic", "noise_inert", "failed_row_discards"],
  predicts: { experiment: "is_a", "discarded-experiment": "disjoint" },
};

export const discardedExperiment: Term<Experiment> = {
  ...experiment, id: "discarded-experiment", label: "Discarded experiment", form: "compound",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "An experiment whose candidate fails the keep rule: a row failed, a signal it called noise changed the record, or its gain does not beat the margin. The write is refused with its verdict, and the line stays in the log.",
  props: [...experiment.props,
    { id: "X1", says: "fails the keep rule", check: (f) => !keeps(f), uses: [keeps] }],
  sources: [AUTORESEARCH, AUTORESEARCH_DESIGN],
  lean: ["verdict_deterministic", "failed_row_discards"],
  predicts: { experiment: "is_a", "kept-experiment": "disjoint" },
};

const lowest = (xs: number[]): number => Math.min(...xs);
const highest = (xs: number[]): number => Math.max(...xs);

export const evalPlan: Term<EvalPlan> = {
  id: "eval-plan", form: "compound", label: "Eval plan", level: "plan", kind: "act",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "A frozen version of the as-of points, windows, horizon and budgets one recipe is scored against, made by a person. Training, dev and holdout points are separated by the horizon, the researcher reads only as of the read cut, and the holdout is answered one bit at a time and never reused.",
  props: [
    { id: "V1", says: "made by a person", check: (f) => f.madeByPerson },
    { id: "V2", says: "its eval set is frozen in a folder the router never serves", check: (f) => f.frozen },
    { id: "V3", says: "a horizon of at least one day", check: (f) => f.horizon >= 1 },
    { id: "V4", says: "training, dev and holdout each hold an as-of point", check: (f) => f.training.length > 0 && f.dev.length > 0 && f.holdout.length > 0 },
    { id: "V5", says: "purged: every training point a horizon before every dev point, and every dev point a horizon before every holdout point", check: (f) => highest(f.training) + f.horizon < lowest(f.dev) && highest(f.dev) + f.horizon < lowest(f.holdout), uses: [highest, lowest] },
    { id: "V6", says: "every holdout point settled by the time the plan was made", check: (f) => highest(f.holdout) + f.horizon <= f.made, uses: [highest] },
    { id: "V7", says: "the read cut falls before every dev and holdout point", check: (f) => f.readCut < lowest(f.dev) && f.readCut < lowest(f.holdout), uses: [lowest] },
    { id: "V8", says: "its holdout starts after the previous version's ended", check: (f) => f.priorHoldoutEnd === null || f.priorHoldoutEnd < lowest(f.holdout), uses: [lowest] },
    { id: "V9", says: "a fixed, positive number of holdout checks", check: (f) => Number.isInteger(f.holdoutChecks) && f.holdoutChecks >= 1 },
  ],
  sources: [NOSEK, LOPEZ, LADDER, AUTORESEARCH_DESIGN],
  lean: ["windows_purged", "holdout_unread", "as_of_no_lookahead"],
};

export const settledRecord: Term<Settlement> = {
  id: "settled-record", form: "compound", label: "Settled record", level: "settlement", kind: "act",
  labels: sharedTerm("adapted", "seminal"),
  meaning: "What people and producers established about valid times up to one as-of point once the horizon has passed, folded by Naive's reference fold. An outcome counts once a person states it or two distinct producers confirm it; an agent's write never resolves anything, so no agent labels its own work.",
  props: [
    { id: "R1", says: "the horizon has passed since its as-of point", check: (f) => f.horizonPassed },
    { id: "R2", says: "it folds only valid times up to its as-of point", check: (f) => f.validUpToAsOf },
    { id: "R3", says: "made by Naive's reference fold, not by a recipe", check: (f) => f.referenceFold },
    { id: "R4", says: "every outcome is stated by a person or confirmed by two distinct producers", check: (f) => f.outcomes.every((o) => o.person || o.producers >= 2) },
  ],
  sources: [SNODGRASS, "Murphy and Winkler, A general framework for forecast verification (1987)", AUTORESEARCH_DESIGN],
  lean: ["agent_never_resolves", "agent_alone_settles_nothing"],
};

export const TERMS = [founder, coFounder, earlyEmployee, mentor, coach, friend, unearnedCandour, thresholdGuardian, phaseGate, layer, area, topCategory, typedLink, detector, trial, hit, miss, falseAlarm, correctRejection, signal, listener, reception, salientReception, noise, experiment, keptExperiment, discardedExperiment, evalPlan, settledRecord];
