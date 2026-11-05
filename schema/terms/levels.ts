// The levels terms are defined at, each with its facts and a seeded case generator. A term is cross-run only
// against terms at its own level; a relation across levels needs a lift (a session part_of a relationship),
// which is named, not guessed.

import { rng, type Base } from "./engine.ts";

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
