// Open maker, named maker and org link (EE-187). The checks read these facts, never a label.
// A maker is the in-venture decision-maker. An org link is one person's reports_to.

import { run, type Base, type Term } from "./engine.ts";

/** Facts for one in-venture decision-maker. `confirmed` is P7. */
export type MakerFacts = Base & {
  unknown: boolean;
  named: boolean;
  resolves: boolean;
  isActor: boolean;
  guessed: boolean;
};

/** Facts for one reports_to link. `confirmed` is P7. */
export type OrgFacts = Base & {
  absent: boolean;
  fromKnown: boolean;
  toKnown: boolean;
  cycle: boolean;
};

const narrowed = (grade: "none" | "convention"): Term<MakerFacts>["labels"] => ({
  designation: "term", scope: "shared", origin: { kind: "narrowed" }, grade,
});

export const openMaker: Term<MakerFacts> = {
  id: "open-maker", form: "compound", label: "Open maker", level: "maker", kind: "role",
  labels: narrowed("none"),
  meaning: "The in-venture decision-maker is unknown, and it was not guessed.",
  props: [
    { id: "U1", says: "the maker is unknown", check: (f) => f.unknown },
    { id: "U2", says: "the maker is not named", check: (f) => !f.named },
    { id: "U3", says: "the maker was not guessed", check: (f) => !f.guessed },
  ],
  sources: ["EE-187"],
  lean: ["guessed_not_open"],
  predicts: { "named-maker": "disjoint" },
};

export const namedMaker: Term<MakerFacts> = {
  id: "named-maker", form: "compound", label: "Named maker", level: "maker", kind: "role",
  labels: narrowed("none"),
  meaning: "The maker names a person or a role in the venture, is not the acting agent, and was not guessed.",
  props: [
    { id: "N1", says: "the maker is named", check: (f) => f.named },
    { id: "N2", says: "the name resolves to a person or a role", check: (f) => f.resolves },
    { id: "N3", says: "the maker is not the acting agent", check: (f) => !f.isActor },
    { id: "N4", says: "the maker was not guessed", check: (f) => !f.guessed },
    { id: "N5", says: "the maker is not unknown", check: (f) => !f.unknown },
  ],
  sources: ["EE-187"],
  lean: ["guessed_not_named", "open_disjoint_named"],
  predicts: { "open-maker": "disjoint" },
};

export const orgLink: Term<OrgFacts> = {
  id: "org-link", form: "compound", label: "Org link", level: "org", kind: "role",
  labels: narrowed("convention"),
  meaning: "reports_to is absent or null, or both ends are known, and the link is not a cycle.",
  props: [
    { id: "O1", says: "absent, or both ends known", check: (f) => f.absent || (f.fromKnown && f.toKnown) },
    { id: "O2", says: "not a cycle", check: (f) => !f.cycle },
  ],
  sources: ["EE-187"],
  lean: ["cycle_not_org_link"],
};

/** Facts for one decision_maker value. Absent and null are unknown. A guess that copies the actor sets `guessed`. */
export function makerFacts(decisionMaker: unknown, opts: { resolves: boolean; isActor: boolean; guessed?: boolean }): MakerFacts {
  const unknown = decisionMaker === undefined || decisionMaker === null;
  const named = typeof decisionMaker === "string" && decisionMaker.length > 0;
  const isActor = named && opts.isActor;
  return {
    confirmed: true,
    unknown,
    named,
    resolves: named && opts.resolves,
    isActor,
    guessed: opts.guessed ?? isActor,
  };
}

/** The person ids whose reports_to chain revisits someone. Empty when no chain cycles. */
export function reportingCycle(people: readonly { id: string; reports_to?: string | null }[]): ReadonlySet<string> {
  const next = new Map<string, string>();
  for (const p of people) if (typeof p.reports_to === "string" && p.reports_to !== "") next.set(p.id, p.reports_to);
  const bad = new Set<string>();
  for (const start of next.keys()) {
    const path: string[] = [];
    const index = new Map<string, number>();
    let at: string | undefined = start;
    while (at && next.has(at) && !index.has(at)) {
      index.set(at, path.length);
      path.push(at);
      at = next.get(at);
    }
    if (at && index.has(at)) for (const id of path) bad.add(id);
  }
  return bad;
}

/** Facts for one person's reports_to. Null and absent are the same: the link is not known. */
export function orgFacts(id: string, reportsTo: unknown, known: ReadonlySet<string>, onCycle: boolean): OrgFacts {
  const absent = reportsTo === undefined || reportsTo === null;
  const target = typeof reportsTo === "string" ? reportsTo : null;
  return {
    confirmed: true,
    absent,
    fromKnown: known.has(id),
    toKnown: target !== null && target !== "" && known.has(target),
    cycle: !absent && onCycle,
  };
}

/** Open maker or named maker. Neither means the value was guessed, does not resolve, or is the actor. */
export function judgeMaker(facts: MakerFacts): { pass: boolean; failed: string[] } {
  const open = run(openMaker, facts);
  const named = run(namedMaker, facts);
  if (open.pass || named.pass) return { pass: true, failed: [] };
  return { pass: false, failed: [...new Set([...open.failed, ...named.failed])] };
}

/** Whether one reports_to value is an org link. */
export function judgeOrg(facts: OrgFacts): { pass: boolean; failed: string[] } {
  return run(orgLink, facts);
}
