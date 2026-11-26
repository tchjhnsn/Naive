// The modeled-venture term (EE-187), the conduct slice this branch needs for the people lint.
// Another slice may admit it. This judge only runs it. It does not write Conduct.lean.

import { run, type Base, type Term } from "./engine.ts";

/** Facts for whether a venture is modeled or run. Absent mode is neither. `confirmed` is P7. */
export type ConductFacts = Base & { modeled: boolean; run: boolean };

export const modeledVenture: Term<ConductFacts> = {
  id: "modeled-venture", form: "compound", label: "Modeled venture", level: "conduct", kind: "act",
  labels: { designation: "term", scope: "shared", origin: { kind: "narrowed" }, grade: "none" },
  meaning: "Agents are modeling the venture: its mode is modeled, and it is not run.",
  props: [
    { id: "M1", says: "modeled", check: (f) => f.modeled },
    { id: "M2", says: "not run", check: (f) => !f.run },
  ],
  sources: ["EE-187"],
};

/** Facts read off venture.json `mode`. The term decides. A string compare here only fills the facts. */
export function conductFacts(mode: unknown): ConductFacts {
  return { confirmed: true, modeled: mode === "modeled", run: mode === "run" };
}

/** Whether the modeled-venture term passes for this mode. */
export function ventureModeled(mode: unknown): boolean {
  return run(modeledVenture, conductFacts(mode)).pass;
}
