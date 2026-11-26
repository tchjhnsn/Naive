// Facts for one eval item, and the two terms that judge them (EE-198). The terms live in terms.ts.
// The label text and the item id are not facts. splitIsHeldOut and authorIsPerson build the booleans.

import { run, type Result } from "./engine.ts";
import type { HeldOutFacts, PersonLabelFacts } from "./levels.ts";
import { authorIsPerson, heldOutItem, personLabel, splitIsHeldOut } from "./terms.ts";

export function heldOutFacts(split: string, inExemplar: boolean, inPromptFixture: boolean): HeldOutFacts {
  return { confirmed: true, splitHeldOut: splitIsHeldOut(split), inExemplar, inPromptFixture };
}

export function judgeHeldOut(facts: HeldOutFacts): Result {
  return run(heldOutItem, facts);
}

export function personLabelFacts(labelSet: boolean, kind: string | null): PersonLabelFacts {
  return { confirmed: true, labelSet, byPerson: authorIsPerson(kind) };
}

export function judgePersonLabel(facts: PersonLabelFacts): Result {
  return run(personLabel, facts);
}
