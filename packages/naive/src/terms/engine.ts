// The term engine (EE-095; Torian, 2026-10-31): a contested definition is settled by running checks and proofs,
// never by asking how it was defined. A term is a set of necessary properties, each a pure check over the
// FACTS of one record at one level (a relationship, an encounter, a person in a venture). The label anyone
// uses is a field of the facts that no check may read. Relations between terms are read off pass sets.
//
// Every term goes through the same admission, run by packages/naive/src/terms/admit.ts:
//   define -> freeze (hash) -> verify (deterministic, label-blind, non-vacuous, unconfirmed never passes)
//   -> cross-run against every admitted term at its level -> Lean theorems named and built (packages/naive/lean/) -> record as proposed.

import { createHash } from "node:crypto";
import type { Labels } from "./terms.ts";

export type Base = { confirmed: boolean; label?: string };
/** `uses` lists the helpers a check calls, so freezing hashes their source too (R1). */
export type Prop<F> = { id: string; says: string; check: (f: F) => boolean; permission?: true; uses?: ((...args: never[]) => unknown)[] };
export type Term<F extends Base> = {
  id: string;
  label: string;
  level: string;
  kind: "role" | "act";
  /** Linguistic form of the label: one word, a compound (one concept, several words: "threshold guardian"),
   *  a phrase (a free combination), or an idiom (meaning not built from its parts). The id is kebab-case for
   *  machines only; prose always uses the label. */
  form: "word" | "compound" | "phrase" | "idiom";
  meaning: string;
  /** Scope, origin, grade and designation (packages/naive/src/terms/terms.ts). On the term, not the facts, and not frozen:
   *  relabelling a term does not change what its test is. */
  labels: Labels;
  props: Prop<F>[];
  /** How the properties combine; default: every property holds. P7 (confirmed) is always required on top. */
  rule?: (held: Record<string, boolean>) => boolean;
  ruleSays?: string;
  sources: string[];
  /** Lean theorems that prove claims about this term, by full name; admit checks they exist in packages/naive/lean/. */
  lean?: string[];
  /** What the term's authors expect the cross-run to find, so a result can confirm or refute it. */
  predicts?: Record<string, Relation>;
};

export type Result = { pass: boolean; failed: string[] };
export function run<F extends Base>(t: Term<F>, f: F): Result {
  const held = Object.fromEntries(t.props.map((p) => [p.id, p.permission ? true : p.check(f)]));
  const failed = [...(f.confirmed ? [] : ["P7"]), ...t.props.filter((p) => !held[p.id]).map((p) => p.id)];
  const ok = f.confirmed && (t.rule ? t.rule(held) : failed.length === 0);
  return { pass: ok, failed };
}

export type Relation = "equal" | "is_a" | "has_a_kind" | "overlap" | "disjoint" | "inconclusive";
/** Total: every pair of sets gets exactly one relation. is_a = every a passes b. */
export function relation(a: Set<number>, b: Set<number>): Relation {
  if (a.size === 0 || b.size === 0) return "inconclusive";
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  if (inter === 0) return "disjoint";
  if (inter === a.size && inter === b.size) return "equal";
  if (inter === a.size) return "is_a";
  if (inter === b.size) return "has_a_kind";
  return "overlap";
}

/** Hash of what the test is: its properties' ids and code, and its rule. Changing a test changes its hash (R1). */
// The hash covers each check's own source and the source of every helper it lists in `uses`. A check that calls
// a helper it does not list leaves the hash the same when the helper changes, and R1 stops holding.
export function freeze<F extends Base>(t: Term<F>): string {
  const props = t.props.map((p) => [p.id, p.check.toString(), Boolean(p.permission), ...(p.uses ? [p.uses.map(String)] : [])]);
  const body = JSON.stringify({ id: t.id, level: t.level, props, rule: t.rule?.toString() ?? "all" });
  return createHash("sha256").update(body).digest("hex").slice(0, 16);
}

/** "Is this a valid test?" The same engine checks its own tests before their verdicts count. */
export function validTest<F extends Base>(t: Term<F>, cases: F[]): string[] {
  const out: string[] = [];
  const ids = t.props.map((p) => p.id);
  if (new Set(ids).size !== ids.length) out.push(`${t.id}: property ids repeat`);
  // every case, not a prefix: a verdict that reads the label only in rare cases is still label-reading.
  // The term's own label and id are among the labels tried, so a test that checks its own name is caught.
  const labels = ["", "founder", "mentor", "friend", "nonsense", t.label, t.id];
  for (const c of cases) {
    const a = JSON.stringify(run(t, c));
    if (a !== JSON.stringify(run(t, structuredClone(c)))) { out.push(`${t.id}: not deterministic`); break; }
    if (labels.some((label) => JSON.stringify(run(t, { ...c, label })) !== a)) { out.push(`${t.id}: the label changes a verdict`); break; }
  }
  // Guards run() itself: run forces pass to false without confirmed facts, so this cannot fail for any
  // term today. It stays so a change to run that lets unconfirmed facts through is caught here.
  if (cases.some((c) => !c.confirmed && run(t, c).pass)) out.push(`${t.id}: unconfirmed facts pass`);
  if (!cases.some((c) => run(t, c).pass)) out.push(`${t.id}: never passes (vacuous)`);
  if (!cases.some((c) => c.confirmed && !run(t, c).pass)) out.push(`${t.id}: never fails on confirmed facts (vacuous)`);
  for (const p of t.props.filter((x) => !x.permission)) if (!cases.some((c) => !p.check(c))) out.push(`${t.id}: ${p.id} never fails`);
  return out;
}

export function passSet<F extends Base>(t: Term<F>, cases: F[]): Set<number> {
  return new Set(cases.flatMap((c, i) => (run(t, c).pass ? [i] : [])));
}

/** A seeded generator, so a result reproduces (mulberry32, 32-bit integer arithmetic throughout).
 *  The first version multiplied in floating point past 2^53, lost precision and fell into a cycle after
 *  about 15,000 draws, so a 20,000-case run held as few as 875 distinct cases. engine-test checks this. */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}
