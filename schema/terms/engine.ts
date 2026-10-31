// The term engine (Torian, 2026-10-31): a contested definition is settled by running checks and proofs,
// never by asking how it was defined. A term is a set of necessary properties, each a pure check over the
// FACTS of one record at one level (a relationship, an encounter, a person in a venture). The label anyone
// uses is a field of the facts that no check may read. Relations between terms are read off pass sets.
//
// Every term goes through the same admission, run by schema/terms/admit.ts:
//   define -> freeze (hash) -> verify (deterministic, label-blind, non-vacuous, unconfirmed never passes)
//   -> cross-run against every admitted term at its level -> Lean theorems named and built (lean/) -> record as proposed.

import { createHash } from "node:crypto";

export type Base = { confirmed: boolean; label?: string };
export type Prop<F> = { id: string; says: string; check: (f: F) => boolean; permission?: true };
export type Term<F extends Base> = {
  id: string;
  label: string;
  level: string;
  kind: "role" | "act";
  meaning: string;
  props: Prop<F>[];
  /** How the properties combine; default: every property holds. P7 (confirmed) is always required on top. */
  rule?: (held: Record<string, boolean>) => boolean;
  ruleSays?: string;
  sources: string[];
  /** Lean theorems that prove claims about this term, by full name; admit checks they exist in lean/. */
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
export function freeze<F extends Base>(t: Term<F>): string {
  const body = JSON.stringify({ id: t.id, level: t.level, props: t.props.map((p) => [p.id, p.check.toString(), Boolean(p.permission)]), rule: t.rule?.toString() ?? "all" });
  return createHash("sha256").update(body).digest("hex").slice(0, 16);
}

/** "Is this a valid test?" The same engine checks its own tests before their verdicts count. */
export function validTest<F extends Base>(t: Term<F>, cases: F[]): string[] {
  const out: string[] = [];
  const ids = t.props.map((p) => p.id);
  if (new Set(ids).size !== ids.length) out.push(`${t.id}: property ids repeat`);
  for (const c of cases.slice(0, 2000)) {
    const a = JSON.stringify(run(t, c));
    if (a !== JSON.stringify(run(t, structuredClone(c)))) { out.push(`${t.id}: not deterministic`); break; }
    if (["", "founder", "mentor", "friend", "nonsense"].some((label) => JSON.stringify(run(t, { ...c, label })) !== a)) { out.push(`${t.id}: the label changes a verdict`); break; }
  }
  if (cases.some((c) => !c.confirmed && run(t, c).pass)) out.push(`${t.id}: unconfirmed facts pass`);
  if (!cases.some((c) => run(t, c).pass)) out.push(`${t.id}: never passes (vacuous)`);
  if (!cases.some((c) => c.confirmed && !run(t, c).pass)) out.push(`${t.id}: never fails on confirmed facts (vacuous)`);
  for (const p of t.props.filter((x) => !x.permission)) if (!cases.some((c) => !p.check(c))) out.push(`${t.id}: ${p.id} never fails`);
  return out;
}

export function passSet<F extends Base>(t: Term<F>, cases: F[]): Set<number> {
  return new Set(cases.flatMap((c, i) => (run(t, c).pass ? [i] : [])));
}

/** A seeded generator, so a result reproduces. */
export function rng(seed: number): () => number {
  let s = seed;
  return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
}
