// Open maker, named maker and org link (EE-189). The checks read these facts, never a label.
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
  sources: ["EE-189"],
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
  sources: ["EE-189"],
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
  sources: ["EE-189"],
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

/** Facts for a join date. Unknown is null. A date needs a source. The run date is a guess. */
export type JoinFacts = Base & {
  unknown: boolean;
  dated: boolean;
  sourced: boolean;
  guessed: boolean;
};

/** Facts for who owns an observed workspace. The named subject is not the owner. */
export type SeatFacts = Base & {
  unknown: boolean;
  principal: boolean;
  subject: boolean;
};

export const knownJoin: Term<JoinFacts> = {
  id: "known-join", form: "compound", label: "Known join", level: "join", kind: "role",
  labels: narrowed("none"),
  meaning: "The join date is unknown, or it was supplied with a source and was not the run date.",
  props: [
    { id: "J1", says: "unknown, or a date with a source", check: (f) => f.unknown || (f.dated && f.sourced) },
    { id: "J2", says: "not the run date guessed in", check: (f) => !f.guessed },
  ],
  sources: ["EE-189"],
  lean: ["guessed_not_known_join"],
};

export const workspaceOwner: Term<SeatFacts> = {
  id: "workspace-owner", form: "compound", label: "Workspace owner", level: "seat", kind: "role",
  labels: narrowed("none"),
  meaning: "The workspace owner is the writing actor's principal, or unknown. The named subject is not the owner.",
  props: [
    { id: "W1", says: "unknown or the principal", check: (f) => f.unknown || f.principal },
    { id: "W2", says: "not the named subject", check: (f) => !f.subject },
  ],
  sources: ["EE-189"],
  lean: ["subject_not_workspace_owner"],
};

/** Facts read off a founder record's joined and joined_source. `guessed` is the writer saying it used the run date. */
export function joinFacts(joined: unknown, source: unknown, guessed = false): JoinFacts {
  const unknown = joined === undefined || joined === null;
  const dated = typeof joined === "string" && joined.length > 0;
  const sourced = typeof source === "string" && source.length > 0;
  return { confirmed: true, unknown, dated, sourced, guessed };
}

/** Facts for a workspace owner id. `principal` is the writing actor's person id. `subjectId` is the named person. */
export function seatFacts(owner: unknown, principal: string | null, subjectId: string | null): SeatFacts {
  const unknown = owner === undefined || owner === null || owner === "";
  const id = typeof owner === "string" ? owner : null;
  return {
    confirmed: true,
    unknown,
    principal: id !== null && principal !== null && id === principal,
    subject: id !== null && subjectId !== null && id === subjectId,
  };
}

/** Whether a join date is known. Unknown passes. A date without a source, or the run date, fails. */
export function judgeJoin(facts: JoinFacts): { pass: boolean; failed: string[] } {
  return run(knownJoin, facts);
}

/** Whether an observed workspace owner is the principal or unknown, and not the named subject. */
export function judgeSeat(facts: SeatFacts): { pass: boolean; failed: string[] } {
  return run(workspaceOwner, facts);
}
