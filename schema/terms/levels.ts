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
