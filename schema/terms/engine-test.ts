// Tests the term engine: it rejects bad tests (label-reading, vacuous, unconfirmed passing), relations are
// total, freezing notices a change, and the admitted terms check against a fresh run.
//
//   node schema/terms/engine-test.ts

import { freeze, relation, rng, run, validTest, type Term } from "./engine.ts";
import { encounterCases, membershipCases, relationshipCases, type Relationship } from "./levels.ts";
import { coach, friend } from "./terms.ts";
import { admitAll } from "./admit.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const cases = relationshipCases(5);
const S = (xs: number[]) => new Set(xs);

expect("relation: equal", relation(S([1, 2]), S([1, 2])) === "equal");
expect("relation: is_a", relation(S([1]), S([1, 2])) === "is_a");
expect("relation: has_a_kind", relation(S([1, 2]), S([1])) === "has_a_kind");
expect("relation: overlap", relation(S([1, 2]), S([2, 3])) === "overlap");
expect("relation: disjoint", relation(S([1]), S([2])) === "disjoint");
expect("relation: inconclusive on an empty set", relation(S([]), S([2])) === "inconclusive");

const readsLabel: Term<Relationship> = { ...friend, id: "label-reader", props: [{ id: "X1", says: "called a friend", check: (f) => f.label === "friend" }] };
expect("a test that reads the label is not valid", validTest(readsLabel, cases).some((p) => /label changes a verdict/.test(p)));
const vacuous: Term<Relationship> = { ...friend, id: "vacuous", props: [{ id: "V1", says: "always", check: () => true }] };
expect("a property that never fails is caught", validTest(vacuous, cases).some((p) => /V1 never fails/.test(p)));
const never: Term<Relationship> = { ...friend, id: "never", props: [{ id: "N1", says: "never", check: () => false }] };
expect("a term that never passes is caught", validTest(never, cases).some((p) => /never passes/.test(p)));
expect("the admitted friend test is valid", validTest(friend, cases).length === 0, validTest(friend, cases).join("; "));
expect("unconfirmed facts never pass", cases.every((c) => c.confirmed || !run(coach, c).pass));
expect("run says which properties failed", JSON.stringify(run(friend, { ...cases[0], confirmed: true, goodwill: false, mutualKnown: true, sharedHistory: true, contractOnly: false, authority: false }).failed) === '["FR1"]');
expect("freezing notices a changed test", freeze(friend) !== freeze({ ...friend, props: friend.props.slice(1) }));
const selfNamer: Term<Relationship> = { ...friend, id: "self-namer", label: "self-namer", props: [...friend.props, { id: "X2", says: "goodwill, if it calls itself by name", check: (f) => f.label !== "self-namer" || f.goodwill }] };
expect("a test that reads its own label in rare cases is caught", validTest(selfNamer, cases).some((p) => /label changes a verdict/.test(p)));
{ const r = rng(11); const seen = new Set<number>(); for (let i = 0; i < 1_000_000; i++) seen.add(r());
  expect("the generator does not cycle within a million draws", seen.size > 999_000, `${seen.size} distinct`); }
for (const [name, gen] of [["membership", membershipCases], ["relationship", relationshipCases], ["encounter", encounterCases]] as const) {
  const c = gen(); const distinct = new Set(c.map((x) => JSON.stringify(x))).size;
  expect(`${name} cases are mostly distinct (not repeats of a short cycle)`, distinct > c.length / 2, `${distinct} of ${c.length}`);
}
const { problems } = admitAll();
expect("every admitted term passes admission", problems.length === 0, problems.join("; "));

console.log(failed ? `${failed} failed` : "term engine: all pass");
process.exit(failed ? 1 : 0);
