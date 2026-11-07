// The levels terms are defined at, each with its facts and a seeded case generator. A term is cross-run only
// against terms at its own level; a relation across levels needs a lift (a session part_of a relationship),
// which is named, not guessed.

import { rng, type Base } from "./engine.ts";
import { namesBetween, type Target } from "./relations.ts";

/** One person's relationship to one venture. */
export type Membership = Base & {
  human: boolean; joined: number; firstOutside: number | null;
  contributions: { kind: "idea" | "secret" | "ethos" | "mission" | "technical" | "capital" | "network"; evidenced: boolean }[];
  stake: boolean; decisions: number; otherFounders: number;
};

/** A relationship between a helper and the person helped, over time. */
export type Relationship = Base & {
  livedPath: boolean;             // the helper walked the path the other is on, and draws on it
  wholePerson: boolean;           // success is the other's growth, not one fixed target
  trust: boolean;                 // sacred trust T1 to T5 all hold
  spendsStanding: boolean;        // the helper put their network, name or position at stake for the other
  dependenceFalls: boolean;       // the other's dependence falls over time
  agreement: boolean;             // an explicit agreement: goal, success, duration
  goalSetBy: "client" | "helper" | "both";
  questionShare: number;          // share of the helper's turns that are questions or reflections
  commitmentsReviewed: boolean;
  goodwill: boolean;              // each acts for the other's good beyond any exchange
  mutualKnown: boolean;           // both hold it and know the other does
  sharedHistory: boolean;         // a history of shared time and trust
  contractOnly: boolean;          // it exists only under a contract
  authority: boolean;             // one side holds authority over the other by role
};

/** One encounter, or one crossing into a new world (a field, a phase, a role). */
export type Encounter = Base & {
  framedAsCandour: boolean; aboutOthersPath: boolean; standing: boolean; inquiredFirst: boolean; consented: boolean;
  atCrossing: boolean; phaseExit: boolean; resists: boolean; helpsOutright: boolean; opposesJourney: boolean;
  passableWithoutDestruction: boolean; endsAfterCrossing: boolean; person: boolean;
};

/** An arrangement of parts and what each part depends on. Whether a part is a layer depends on the whole
 *  arrangement, so the facts describe the whole. Parts are numbered 0 to parts - 1; names stay out of the facts. */
export type Arrangement = Base & {
  parts: number;
  dependsOn: [number, number][];  // [a, b]: part a depends on part b (uses it, builds on it, or follows its rules)
  byConcern: boolean;             // each part was drawn around one concern: one subject or one job
};

/** Categories joined by broader links: the top categories and the nouns under them. Whether a category is a top
 *  category depends on the whole hierarchy, so the facts describe the whole. Nodes are numbered 0 to nodes - 1;
 *  names stay out of the facts. */
export type Hierarchy = Base & {
  nodes: number;
  tops: number[];                 // the nodes that are top categories
  broader: [number, number][];    // [a, b]: b is broader than a (a is a kind of b)
};

/** Records joined by typed links: ideas, and the scopes an idea can attach to. Whether a link is well typed depends
 *  on the whole graph (an ordering relation must not close a cycle), so the facts describe the whole. Ideas and
 *  scopes are numbered from 0; names stay out of the facts. A link's type is the relation it states, not a label. */
export type LinkGraph = Base & {
  ideas: number;
  scopes: number;                 // the scopes a link can name: the catalog's, and shared
  links: { type: string; target: Target; from: number; to: number }[];  // from an idea; to is -1 when the target names nothing
};

/** One detector record (docs/design/SIGNAL_DETECTION_2026-11-07.md): what it asks, what scores it, where its line
 *  is, what each outcome costs and who settles the truth. Names stay out of the facts. */
export type Detector = Base & {
  yesNo: boolean;                 // the question it asks has a yes or no answer
  sensorNamed: boolean;           // it names the sensor that scores the question
  runsSensor: boolean;            // it runs that sensor itself instead of reading its score
  criteria: number;               // how many lines it draws on the score scale: one, or two for an unsure band
  onScale: boolean;               // its lines are on the sensor's score scale
  costs: number;                  // how many of the four outcomes (hit, miss, false alarm, correct rejection) it gives a cost
  baseRate: number | null;        // how often the answer is yes, stated or computed; null when it has none
  resolverNamed: boolean;         // it names who settles the true answer
};

/** One call a detector made: the score, the criterion in force, the call, and the true answer once it is settled.
 *  A field is null when the record does not hold it. */
export type Trial = Base & {
  score: number | null;
  criterion: number | null;
  call: "yes" | "no" | null;
  truth: "yes" | "no" | null;     // null until the call is resolved
};

/** What one signal says about itself (everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md): an element of
 *  one signal type, immutable, dated and rated. A field is null when the signal does not hold it. */
export type SignalFacts = {
  addressed: boolean;             // its id is the first 24 hex characters of sha256 over the canonical JSON of every other field
  type: string | null;            // its signal type as id@major.minor
  parts: string[];                // the types of the parts it composes, as id@major
  producer: string | null;        // who produced it
  dated: boolean;                 // it says when the thing happened
  rating: { reliability: string; credibility: number } | null;  // Admiralty code: reliability A to F, credibility 1 to 6
  withdraws: number;              // how many of retracts and supersedes it carries
};

/** What one listener asks: the consumer it serves, the type range it hears, its criterion's bounds and what happens. */
export type ListenerFacts = {
  consumer: boolean;              // it names one consumer: a record route, a frame or a decision
  hears: string | null;           // the type range it hears, as id@major
  reliability: string | null;     // the worst source reliability it accepts; null accepts any
  credibility: number | null;     // the worst information credibility it accepts; null accepts any
  producers: string[];            // accepted producer prefixes; none listed accepts any producer
  then: "project" | "propose" | "revalidate" | null;  // project is level and reads no clock; propose and revalidate are edge
  maxAge: number | null;          // an age bound in days; null when it judges no age
};

/** One signal arriving at one listener: the signal's facts, the listener's, the signal's age where the listener
 *  judges age, and how many of the listener's predicates fail on the signal, read with the venture's facts. Names
 *  stay out of the facts. */
export type Reception = Base & {
  signal: SignalFacts;
  listener: ListenerFacts;
  age: number;                    // days from the signal's time to now
  failed: number;                 // the listener's predicates that fail on this signal
};

const N = 20000;
export function membershipCases(seed = 11): Membership[] {
  const r = rng(seed);
  const kinds = ["idea", "secret", "ethos", "mission", "technical", "capital", "network"] as const;
  return Array.from({ length: N }, () => ({
    confirmed: r() < 0.9, label: ["founder", "co-founder", "sub-founder", undefined][Math.floor(r() * 4)],
    human: r() < 0.95, joined: Math.floor(r() * 400), firstOutside: r() < 0.2 ? null : Math.floor(r() * 400),
    contributions: kinds.filter(() => r() < 0.25).map((kind) => ({ kind, evidenced: r() < 0.7 })),
    stake: r() < 0.7, decisions: Math.floor(r() * 4), otherFounders: Math.floor(r() * 3),
  }));
}
export function relationshipCases(seed = 13): Relationship[] {
  const r = rng(seed);
  const b = (p = 0.5) => r() < p;
  return Array.from({ length: N }, () => ({
    confirmed: b(0.9), label: ["mentor", "coach", "friend", undefined][Math.floor(r() * 4)],
    livedPath: b(), wholePerson: b(), trust: b(0.8), spendsStanding: b(), dependenceFalls: b(),
    agreement: b(), goalSetBy: (["client", "helper", "both"] as const)[Math.floor(r() * 3)], questionShare: r(), commitmentsReviewed: b(),
    goodwill: b(), mutualKnown: b(), sharedHistory: b(), contractOnly: b(0.3), authority: b(0.3),
  }));
}
export function encounterCases(seed = 17): Encounter[] {
  const r = rng(seed);
  const b = (p = 0.5) => r() < p;
  return Array.from({ length: N }, () => {
    const phaseExit = b(0.2);
    return {
      confirmed: b(0.9), label: ["guardian", "gate", "candour", undefined][Math.floor(r() * 4)],
      framedAsCandour: b(), aboutOthersPath: b(), standing: b(), inquiredFirst: b(), consented: b(),
      atCrossing: phaseExit || b(), phaseExit, resists: b(), helpsOutright: b(0.3), opposesJourney: b(0.2),
      passableWithoutDestruction: b(0.7), endsAfterCrossing: b(0.7), person: phaseExit ? b(0.1) : b(0.8),
    };
  });
}

/** Half the cases are stacks (a random order with each part depending on the one beneath, plus some skips),
 *  so layered arrangements are common; the other half draw dependencies at random and often hold a cycle. */
export function arrangementCases(seed = 19): Arrangement[] {
  const r = rng(seed);
  const b = (p = 0.5) => r() < p;
  return Array.from({ length: N }, () => {
    const parts = 1 + Math.floor(r() * 8);
    const dependsOn: [number, number][] = [];
    if (b()) {
      const order = Array.from({ length: parts }, (_, i) => i);
      for (let i = parts - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      for (let i = 1; i < parts; i++) {
        if (b(0.9)) dependsOn.push([order[i], order[i - 1]]);
        for (let j = 0; j < i - 1; j++) if (b(0.15)) dependsOn.push([order[i], order[j]]);
      }
    } else {
      for (let a = 0; a < parts; a++) for (let c = 0; c < parts; c++) if (a !== c && b(0.25)) dependsOn.push([a, c]);
    }
    return { confirmed: b(0.9), label: ["layer", "area", "tier", undefined][Math.floor(r() * 4)], parts, dependsOn, byConcern: b(0.6) };
  });
}

/** Half the cases are forests: one to three top categories, and every other node takes a broader node placed
 *  before it, now and then a second one, now and then none. The other half draw tops and links at random and
 *  often hold a cycle, an orphan or a node under two top categories. */
export function hierarchyCases(seed = 23): Hierarchy[] {
  const r = rng(seed);
  const b = (p = 0.5) => r() < p;
  return Array.from({ length: N }, () => {
    const nodes = 1 + Math.floor(r() * 8);
    const broader: [number, number][] = [];
    const order = Array.from({ length: nodes }, (_, i) => i);
    let tops: number[];
    if (b()) {
      for (let i = nodes - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const k = 1 + Math.floor(r() * Math.min(3, nodes));
      tops = order.slice(0, k);
      for (let i = k; i < nodes; i++) {
        if (b(0.95)) broader.push([order[i], order[Math.floor(r() * i)]]);
        if (b(0.1)) broader.push([order[i], order[Math.floor(r() * i)]]);
      }
    } else {
      tops = order.filter(() => b(0.3));
      for (let a = 0; a < nodes; a++) for (let c = 0; c < nodes; c++) if (a !== c && b(0.2)) broader.push([a, c]);
    }
    return { confirmed: b(0.9), label: ["top category", "category", "root", undefined][Math.floor(r() * 4)], nodes, tops, broader };
  });
}

/** Half the cases are well typed: ordering relations run one way along a random order of the ideas, each idea
 *  attaches to at most one scope, and every target exists unless the idea creates it. The other half draw types,
 *  ends and targets at random, with names outside the closed set and names inherited from Object among them. */
export function linkCases(seed = 29): LinkGraph[] {
  const r = rng(seed);
  const b = (p = 0.5) => r() < p;
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
  const between = namesBetween("idea"), attach = namesBetween("scope");
  const unknown = ["rebuts", "isPartOf", "constructor", "toString", ""];
  return Array.from({ length: N }, () => {
    const ideas = 1 + Math.floor(r() * 7), scopes = Math.floor(r() * 4);
    const links: LinkGraph["links"] = [];
    if (b()) {
      const order = Array.from({ length: ideas }, (_, i) => i);
      for (let i = ideas - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      for (let i = 1; i < ideas; i++) for (let j = 0; j < i; j++) if (b(0.3)) {
        const type = pick(between);
        links.push(type === "narrower" ? { type, target: "idea", from: order[j], to: order[i] } : { type, target: "idea", from: order[i], to: order[j] });
      }
      for (let i = 0; i < ideas; i++) if (b(0.4)) {
        const type = pick(attach);
        if (scopes > 0) links.push({ type, target: "scope", from: i, to: Math.floor(r() * scopes) });
        else if (type === "creates") links.push({ type, target: "scope", from: i, to: -1 });
      }
    } else {
      for (let k = Math.floor(r() * 6); k > 0; k--) {
        const target: Target = b(0.75) ? "idea" : "scope";
        const type = b(0.15) ? pick(unknown) : pick(b(0.8) ? (target === "idea" ? between : attach) : [...between, ...attach]);
        const ends = Math.min(ideas, 3);
        links.push({ type, target, from: Math.floor(r() * ends), to: b(0.1) ? -1 : Math.floor(r() * ((target === "idea" ? ends : scopes) + 1)) });
      }
    }
    return { confirmed: b(0.9), label: ["typed link", "edge", "relation", undefined][Math.floor(r() * 4)], ideas, scopes, links };
  });
}


/** Most cases are well formed detectors with one or two flaws drawn at random, so each property fails on its own. */
export function detectorCases(seed = 31): Detector[] {
  const r = rng(seed);
  const b = (p = 0.5) => r() < p;
  return Array.from({ length: N }, () => ({
    confirmed: b(0.9), label: ["detector", "threshold", "gate", undefined][Math.floor(r() * 4)],
    yesNo: b(0.85), sensorNamed: b(0.85), runsSensor: b(0.15),
    criteria: b(0.8) ? 1 + Math.floor(r() * 2) : Math.floor(r() * 5), onScale: b(0.85),
    costs: b(0.8) ? 4 : Math.floor(r() * 5), baseRate: b(0.1) ? null : b(0.9) ? r() : 1 + r(),
    resolverNamed: b(0.85),
  }));
}

/** Most calls follow their line; some do not, some miss a field, and about half are resolved. */
export function trialCases(seed = 37): Trial[] {
  const r = rng(seed);
  const b = (p = 0.5) => r() < p;
  return Array.from({ length: N }, () => {
    const score = b(0.95) ? Math.round(r() * 100) / 100 : null;
    const criterion = b(0.95) ? Math.round(r() * 100) / 100 : null;
    const follows: "yes" | "no" | null = score === null || criterion === null ? null : score >= criterion ? "yes" : "no";
    const call: "yes" | "no" | null = b(0.85) && follows !== null ? follows : b(0.1) ? null : b() ? "yes" : "no";
    const truth: "yes" | "no" | null = b(0.5) ? null : b() ? "yes" : "no";
    return { confirmed: b(0.9), label: ["hit", "miss", "false alarm", "trial", undefined][Math.floor(r() * 5)], score, criterion, call, truth };
  });
}

const SIGNAL_TYPES = ["competitor-funding@1.2", "competitor-launch@1.0", "market-report@2.1", "hire@1.0"];
const PARTS = ["organization@1", "funding-event@1", "product@1"];
const PRODUCERS = ["mentura/research", "mentura/watch", "local/person", "third-party/feed"];
const LETTERS = "ABCDEF";

/** Signals and listeners are drawn from pools, so one signal reaches many listeners and one listener hears many
 *  signals; most are well formed, with one flaw drawn at random now and then, so each property fails on its own. */
export function receptionCases(seed = 41): Reception[] {
  const r = rng(seed);
  const b = (p = 0.5) => r() < p;
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
  const signals: SignalFacts[] = Array.from({ length: 400 }, () => {
    const type = b(0.97) ? pick(SIGNAL_TYPES) : b() ? null : "competitor-funding";
    return {
      addressed: b(0.97), type,
      parts: type?.startsWith("competitor-") ? PARTS.filter(() => b(0.7)) : [],
      producer: b(0.97) ? pick(PRODUCERS) : null, dated: b(0.97),
      rating: b(0.03) ? null : b(0.97) ? { reliability: pick([...LETTERS]), credibility: 1 + Math.floor(r() * 6) } : { reliability: "G", credibility: Math.floor(r() * 8) },
      withdraws: b(0.9) ? 0 : b(0.8) ? 1 : 2,
    };
  });
  const listeners: ListenerFacts[] = Array.from({ length: 400 }, () => {
    const then = b(0.97) ? pick(["project", "propose", "revalidate"] as const) : null;
    return {
      consumer: b(0.97),
      hears: b(0.97) ? pick([...SIGNAL_TYPES.map((t) => t.split(".")[0]), ...PARTS]) : b() ? null : "competitor-funding",
      reliability: b(0.5) ? null : b(0.97) ? pick([...LETTERS]) : "Z",
      credibility: b(0.5) ? null : b(0.97) ? 1 + Math.floor(r() * 6) : 9,
      producers: b(0.6) ? [] : [pick(["mentura/", "local/", "third-party/"])],
      then,
      maxAge: then === "project" ? (b(0.97) ? null : 30) : b(0.5) ? null : 7 + Math.floor(r() * 180),
    };
  });
  return Array.from({ length: N }, () => ({
    confirmed: b(0.9), label: ["signal", "noise", "salient", "listener", undefined][Math.floor(r() * 5)],
    signal: pick(signals), listener: pick(listeners),
    age: Math.floor(r() * 365), failed: b(0.7) ? 0 : 1 + Math.floor(r() * 3),
  }));
}
