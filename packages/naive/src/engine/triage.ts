// Raw triage (raw capture and triage design, docs/design/RAW_TRIAGE_2026-11-09.md, "The questions" and "Deciding"):
// the questions Jev (TypeSafe System 1) is asked about one raw entry, and the code that decides from its answers.
//
//   request(entry, context)       the Jev request: { state, model, questions }, in the shape platform/integrations/jev.mjs sends
//   decide(entry, answers, line)  pure: no I/O and no model; which labels are sure, what is filed, what is held, and
//                                 whether the routed work goes to a person
//   lineFor(dir)                  the triage-accept detector's line for a venture, else 0.95
//
// Jev answers only Noul (yes or no, with a probability) and Score questions; a choice among options is one Noul per
// option, and code takes the strongest, as the idea map does. A label is sure when its probability is at or above
// the line, or at or below one minus it. Everything sure files; anything not sure is held for a person. A Score is
// never a filing decision. The one-way-door Noul at or above one minus the line (not sure the step is two-way) sends
// the routed work to a person whatever else holds. Nothing here calls a model or the network: the platform sends the
// request and passes the answers back.

import { line } from "./detectors.mjs";
import { split, terms } from "./workspace.mjs";

export const MODEL = "jev-latest";
export const ACCEPT = 0.95;
export const MAX_CANDIDATES = 5;

/** One raw entry: a capture in the founder's own words, or a reference's text with where it came from. */
export type Entry = {
  /** The venture path: raw/dump/<id>.md or raw/sources/<id>/text.md. */
  path: string;
  text: string;
  /** A reference's title, origin and the founder's note, when the entry is a source. */
  source?: { title?: string; origin?: string; note?: string };
};
export type Venture = { id: string; about?: string };
export type Idea = { id: string; text: string };
export type Context = {
  ventures: readonly Venture[];
  /** The function ids, in departments.json order. */
  functions: readonly string[];
  /** The person's existing ideas, the pool duplicate candidates are drawn from. */
  ideas?: readonly Idea[];
  /** Whether a source's full text may be sent (triage.send in naive.config.json). Off, only its title, origin and note go. */
  send?: boolean;
};
export type Question = { type: "noul"; instructions: string; criteria: { true: string; false: string } } | { type: "score"; instructions: string; criteria: { low: string; high: string } };
export type Request = { state: Record<string, unknown>; model: string; questions: Record<string, Question> };
/** Jev's answers by question key: a Noul's probability of yes (or a boolean), or a Score. */
export type Answers = Record<string, { noul?: number | boolean; score?: number } | number | boolean | null | undefined>;
export type Label = { key: string; kind: "noul" | "score"; p: number | null; sure: boolean };
export type Fragment = { id: string; text: string; venture: string | null; functions: string[]; duplicate_of: string | null };
export type Decision = {
  kind: { idea: boolean; reference: boolean };
  fragments: Fragment[];
  labels: Label[];
  /** What to file now: one idea per fragment, and the reference when the entry is one. Empty while anything is held. */
  filings: { kind: "idea" | "reference"; fragment?: string; venture?: string | null; functions?: string[]; builds_on?: string | null }[];
  /** The keys of labels held for a person. */
  held: string[];
  /** Whether the routed work goes to a person because the entry may be a one-way door. */
  toPerson: boolean;
  urgency: number | null;
};

const noul = (instructions: string, yes: string, no: string): Question => ({ type: "noul", instructions, criteria: { true: yes, false: no } });

/** The fragments of an entry, ids f1, f2, ... in order. */
export function fragments(entry: Entry): { id: string; text: string }[] {
  return (split(entry.text) as string[]).map((text, i) => ({ id: `f${i + 1}`, text }));
}

/** The closest existing ideas to a fragment by shared terms, at most MAX_CANDIDATES, none that share nothing. */
export function candidates(text: string, ideas: readonly Idea[]): Idea[] {
  const mine = terms(text) as Set<string>;
  return ideas.map((idea) => ({ idea, n: [...(terms(idea.text) as Set<string>)].filter((w) => mine.has(w)).length }))
    .filter((x) => x.n > 0).sort((a, b) => b.n - a.n || a.idea.id.localeCompare(b.idea.id)).slice(0, MAX_CANDIDATES).map((x) => x.idea);
}

/** The Jev request for one entry. */
export function request(entry: Entry, context: Context): Request {
  const frags = fragments(entry);
  const isSource = !!entry.source;
  const text = isSource && !context.send ? null : entry.text;
  const questions: Record<string, Question> = {
    "kind:idea": noul("Does `entry` state an idea of the founder's own: something they want to make, test or change?", "Yes: it is the founder's own idea", "No: it only reports or quotes someone else's work"),
    "kind:reference": noul("Does `entry` refer to someone else's work: a book, article, podcast, video, talk or post?", "Yes: it names or draws on someone else's work", "No: it names no outside work"),
    "door:one-way": noul("Would acting on `entry` commit the venture in a way that cannot be undone: signing, paying, publishing, hiring, or a promise to someone outside?", "Yes: acting on it cannot be undone", "No: acting on it can be undone"),
    urgency: { type: "score", instructions: "How urgent is acting on `entry`?", criteria: { low: "It can wait months without loss", high: "Waiting even days loses something" } },
  };
  const cands: Record<string, Record<string, string>> = {};
  for (const f of frags) {
    for (const v of context.ventures) questions[`venture:${f.id}:${v.id}`] = noul(`Is \`fragments.${f.id}\` mainly about the venture \`ventures.${v.id}\`?`, "Yes: it is mainly about this venture", "No: it is about another venture, or none");
    for (const fn of context.functions) questions[`function:${f.id}:${fn}`] = noul(`Does acting on \`fragments.${f.id}\` touch the ${fn} function?`, `Yes: it is work for ${fn}`, `No: ${fn} has no part in it`);
    const cs = candidates(f.text, context.ideas ?? []);
    if (cs.length) cands[f.id] = Object.fromEntries(cs.map((c) => [c.id, c.text]));
    for (const c of cs) questions[`duplicate:${f.id}:${c.id}`] = noul(`Does \`fragments.${f.id}\` say the same thing as \`ideas.${f.id}.${c.id}\`?`, "Yes: the same idea, perhaps in other words", "No: a different idea, even if related");
  }
  const state: Record<string, unknown> = {
    entry: { path: entry.path, ...(text === null ? {} : { text }), ...(entry.source ? { source: entry.source } : {}) },
    fragments: Object.fromEntries(frags.map((f) => [f.id, text === null ? (entry.source?.note ?? entry.source?.title ?? "") : f.text])),
    ventures: Object.fromEntries(context.ventures.map((v) => [v.id, v.about ?? v.id])),
    ideas: cands,
  };
  return { state, model: MODEL, questions };
}

/** A Noul's probability of yes, or a Score, from one answer; null when it is missing or not a number. */
export function probability(a: Answers[string]): number | null {
  if (typeof a === "number") return a;
  if (typeof a === "boolean") return a ? 1 : 0;
  if (a && typeof a === "object") {
    const v = a.noul ?? a.score;
    return typeof v === "number" ? v : typeof v === "boolean" ? (v ? 1 : 0) : null;
  }
  return null;
}

/** Sure: at or above the line, or at or below one minus it. A missing answer is never sure. */
export const isSure = (p: number | null, l: number): boolean => p !== null && (p >= l || p <= 1 - l);

/** What the answers decide for one entry. Pure: the caller asked request(entry, context) and passes what Jev answered. */
export function decide(entry: Entry, answers: Answers, l: number, context?: Pick<Context, "ventures" | "functions" | "ideas">): Decision {
  const keys = Object.keys(answers);
  const labels: Label[] = keys.map((key) => {
    const p = probability(answers[key]);
    const kind = key === "urgency" ? "score" : "noul";
    return { key, kind, p, sure: kind === "score" ? true : isSure(p, l) };
  });
  const p = (key: string) => probability(answers[key]);
  const yes = (key: string) => (p(key) ?? 0) >= 0.5;
  const strongest = (prefix: string): string | null => {
    const best = keys.filter((k) => k.startsWith(prefix)).map((k) => [k.slice(prefix.length), p(k) ?? 0] as const).sort((a, b) => b[1] - a[1])[0];
    return best && best[1] >= 0.5 ? best[0] : null;
  };
  const frags = fragments(entry);
  const fragmentsOut: Fragment[] = frags.map((f) => ({
    id: f.id, text: f.text,
    venture: strongest(`venture:${f.id}:`),
    functions: (context?.functions ?? keys.filter((k) => k.startsWith(`function:${f.id}:`)).map((k) => k.split(":")[2] ?? "")).filter((fn) => yes(`function:${f.id}:${fn}`)),
    duplicate_of: strongest(`duplicate:${f.id}:`),
  }));
  const kind = { idea: yes("kind:idea"), reference: yes("kind:reference") || !!entry.source };
  // A missing one-way-door answer is never sure, so it holds the entry and sends the work to a person.
  const door = p("door:one-way");
  const toPerson = door === null || door > 1 - l;
  const held = labels.filter((x) => !x.sure).map((x) => x.key);
  if (door === null) held.push("door:one-way");
  const filings: Decision["filings"] = held.length ? [] : [
    ...(kind.idea ? fragmentsOut.map((f) => ({ kind: "idea" as const, fragment: f.id, venture: f.venture, functions: f.functions, builds_on: f.duplicate_of })) : []),
    ...(kind.reference ? [{ kind: "reference" as const }] : []),
  ];
  return { kind, fragments: fragmentsOut, labels, filings, held, toPerson, urgency: p("urgency") };
}

/** The triage-accept line in force for a venture (governance/detectors/triage-accept.json), else ACCEPT. */
export const lineFor = (dir?: string): number => line(dir, "triage-accept", ACCEPT);
