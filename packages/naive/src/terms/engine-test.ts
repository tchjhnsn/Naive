// Tests the term engine: it rejects bad tests (label-reading, vacuous, unconfirmed passing), relations are
// total, freezing notices a change (to a check or a helper it lists), layer and area decide hand-built
// arrangements, the detection terms decide hand-built trials and detectors, labels hold the cap, the adopted quote and one referent per proper name, and the admitted terms
// check against a fresh run.
//
//   node packages/naive/src/terms/engine-test.ts

import { freeze, relation, rng, run, validTest, type Term } from "./engine.ts";
import { arrangementCases, detectorCases, encounterCases, membershipCases, relationshipCases, trialCases, type Arrangement, type Detector, type Relationship, type Trial } from "./levels.ts";
import { area, capShare, coach, correctRejection, detector, falseAlarm, friend, hit, labelProblems, layer, miss, TERMS, trial, type Labels } from "./terms.ts";
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
const helper = (f: Relationship) => f.goodwill;
const withHelper = (h: (f: Relationship) => boolean): Term<Relationship> => ({ ...friend, props: [{ id: "H1", says: "via a helper", check: (f) => h(f), uses: [h] }] });
expect("freezing notices a changed helper the check lists in uses", freeze(withHelper(helper)) !== freeze(withHelper((f) => f.mutualKnown)));
const arr = (parts: number, dependsOn: [number, number][]): Arrangement => ({ confirmed: true, parts, dependsOn, byConcern: true });
expect("a stack where each part depends on the one beneath passes layer", run(layer, arr(3, [[1, 0], [2, 1]])).pass);
expect("a loop fails layer on no cycle (L2)", run(layer, arr(3, [[1, 0], [2, 1], [0, 2]])).failed.includes("L2"));
expect("two parts that depend on nothing fail layer on one stack (L3) only", JSON.stringify(run(layer, arr(2, [])).failed) === '["L3"]');
expect("a loop drawn by concern passes area", run(area, arr(3, [[1, 0], [2, 1], [0, 2]])).pass);
const call = (score: number, criterion: number, callMade: Trial["call"], truth: Trial["truth"]): Trial => ({ confirmed: true, score, criterion, call: callMade, truth });
expect("a yes at or above the line that resolves yes is a hit and a trial", run(hit, call(0.7, 0.7, "yes", "yes")).pass && run(trial, call(0.7, 0.7, "yes", "yes")).pass);
expect("a call against its line is not a trial (T3)", JSON.stringify(run(trial, call(0.2, 0.7, "yes", null)).failed) === '["T3"]');
expect("an unresolved call is a trial but no outcome", run(trial, call(0.2, 0.7, "no", null)).pass && [hit, miss, falseAlarm, correctRejection].every((t) => !run(t, call(0.2, 0.7, "no", null)).pass));
expect("each resolved call is exactly one outcome", (["yes", "no"] as const).every((truth) => [call(0.9, 0.5, "yes", truth), call(0.1, 0.5, "no", truth)].every((c) => [hit, miss, falseAlarm, correctRejection].filter((t) => run(t, c).pass).length === 1)));
const det: Detector = { confirmed: true, yesNo: true, sensorNamed: true, runsSensor: false, criteria: 2, onScale: true, costs: 4, baseRate: 0.1, resolverNamed: true };
expect("a detector with an unsure band passes", run(detector, det).pass);
expect("a detector that runs its sensor fails D3 only", JSON.stringify(run(detector, { ...det, runsSensor: true }).failed) === '["D3"]');
expect("a detector with no base rate fails D6 only", JSON.stringify(run(detector, { ...det, baseRate: null }).failed) === '["D6"]');
const selfNamer: Term<Relationship> = { ...friend, id: "self-namer", label: "self-namer", props: [...friend.props, { id: "X2", says: "goodwill, if it calls itself by name", check: (f) => f.label !== "self-namer" || f.goodwill }] };
expect("a test that reads its own label in rare cases is caught", validTest(selfNamer, cases).some((p) => /label changes a verdict/.test(p)));
{ const r = rng(11); const seen = new Set<number>(); for (let i = 0; i < 1_000_000; i++) seen.add(r());
  expect("the generator does not cycle within a million draws", seen.size > 999_000, `${seen.size} distinct`); }
for (const [name, gen] of [["membership", membershipCases], ["relationship", relationshipCases], ["encounter", encounterCases], ["arrangement", arrangementCases], ["detector", detectorCases], ["trial", trialCases]] as const) {
  const c = gen(); const distinct = new Set(c.map((x) => JSON.stringify(x))).size;
  expect(`${name} cases are mostly distinct (not repeats of a short cycle)`, distinct > c.length / 2, `${distinct} of ${c.length}`);
}
const term = (id: string, labels: unknown) => ({ id, label: id, labels });
const plain = (kind: string) => ({ designation: "term", scope: "shared", origin: { kind }, grade: "none" });
const named = (designation: string, referent: unknown) => ({ designation, scope: "shared", origin: { kind: "adapted" }, grade: "none", referent, instanceOf: "venture" });
const glossary = (coined: number, rest: number, extra: unknown[] = []) => [
  ...Array.from({ length: coined }, (_, i) => term(`c${i}`, plain(i % 2 ? "borrowed" : "operationally-coined"))),
  ...Array.from({ length: rest }, (_, i) => term(`a${i}`, plain("adapted"))),
  ...extra.map((l, i) => term(`n${i}`, l)),
];
const capProblem = (ts: { id: string; label: string; labels: unknown }[]) => labelProblems(ts, new Set()).find((p) => p.startsWith("the 10 percent cap"));
const share = capShare(TERMS.map((t) => t.labels));
console.log(`      cap share of the admitted terms: ${share.counted} of ${share.of} (${((100 * share.counted) / share.of).toFixed(1)}%)`);
expect("the admitted terms are under the 10 percent cap", 10 * share.counted <= share.of);
expect("1 coined or borrowed term in 10 is at the cap and passes", capProblem(glossary(1, 9)) === undefined);
const over = capProblem(glossary(2, 17));
console.log(`      ${over ?? "no cap problem"}`);
expect("2 in 19 is over the cap, and the problem prints the share", over?.includes("2 of 19 terms (10.5%)") === true, String(over));
const names = Array.from({ length: 30 }, (_, i) => named(i % 2 ? "appellation" : "proper-name", `r${i}`));
expect("proper names and appellations neither count toward the cap nor dilute it", capProblem(glossary(2, 17, names))?.includes("2 of 19 terms") === true && capProblem(glossary(1, 9, names.map((n) => ({ ...n, origin: { kind: "operationally-coined" } })))) === undefined);
const adoptedAs = (origin: unknown) => labelProblems([term("t", { ...plain("adopted"), origin })], new Set());
expect("adopted with no quote fails (N-054)", adoptedAs({ kind: "adopted" }).some((p) => /adopted needs the source's definition quoted/.test(p)));
expect("adopted with an empty quote fails", adoptedAs({ kind: "adopted", quote: "  " }).some((p) => /adopted needs/.test(p)));
expect("adopted with a quote passes", adoptedAs({ kind: "adopted", quote: "<the source's definition>" }).length === 0);
const twoReferents = labelProblems([term("ee-a", named("proper-name", "the framework")), { ...term("ee-b", named("proper-name", "the repository")), label: "ee-a" }], new Set());
expect("a proper name with two referents fails (N-052)", twoReferents.some((p) => /name "ee-a" has 2 referents/.test(p)), twoReferents.join("; "));
expect("a proper name given a list of two referents fails", labelProblems([term("pa", named("proper-name", ["a", "b"]))], new Set()).some((p) => /has 2 referents; it needs exactly one/.test(p)));
expect("one proper name on two terms with the same referent passes", labelProblems([term("x", named("appellation", "r")), { ...term("y", named("appellation", "r")), label: "x" }], new Set()).length === 0);
expect("symbol is reserved", labelProblems([term("s", { ...plain("adapted"), designation: "symbol" })], new Set()).some((p) => /symbol is reserved/.test(p)));
const scoped: Labels = { designation: "term", scope: "naive@finance", origin: { kind: "adapted" }, grade: "standard" };
expect("a scope must be in the catalog", labelProblems([term("f", scoped)], new Set()).some((p) => /naive@finance is not shared and not in/.test(p)) && labelProblems([term("f", scoped)], new Set(["naive@finance"])).length === 0);
const { problems } = admitAll();
expect("every admitted term passes admission", problems.length === 0, problems.join("; "));

console.log(failed ? `${failed} failed` : "term engine: all pass");
process.exit(failed ? 1 : 0);
