// Tests the kind of an activity (EE-179): how a statement's words meet a kind's clauses, the shipped kinds against
// APQC's own activity names, and what the check refuses. Pure, apart from reading the shipped catalog and framework.
import { runSync } from "../core/effect/run.ts";
import { kinded, kindOf, kindProblems, wordsOf } from "./activity-kinds.ts";
import type { Kind } from "./activity-kinds.ts";
import { readCatalog, readGroups, readPcf } from "./activity-proposals.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const kinds: Kind[] = [
  { id: "decision", performer: "person", when: [{ verbs: ["approve"] }, { verbs: ["set"], terms: ["budget"] }], basis: "test" },
  { id: "relationship", performer: "person", when: [{ verbs: ["manage"], terms: ["relationships"] }, { terms: ["partnership"] }], basis: "test" },
];
expect("words are lower case, split on anything that is not a letter", wordsOf("Approve/Change credit limits, daily.").join(" ") === "approve change credit limits daily");
expect("a verb clause reads the first word only", kindOf(kinds, "Approve payments")?.id === "decision" && kindOf(kinds, "Report what to approve") === null);
expect("a clause with verbs and terms needs both", kindOf(kinds, "Set the budget")?.id === "decision" && kindOf(kinds, "Set up storage") === null && kindOf(kinds, "Review the budget") === null);
expect("a term is a word after the first", kindOf(kinds, "Manage customer relationships")?.id === "relationship" && kindOf(kinds, "Relationships review") === null);
expect("a clause with terms alone takes any verb", kindOf(kinds, "Review the partnership")?.id === "relationship");
expect("the first kind that matches wins", kindOf(kinds, "Approve the partnership")?.id === "decision");
expect("a statement with no words, or no kinds, has no kind", kindOf(kinds, " 12. ") === null && kindOf([], "Approve payments") === null);

expect("a kind listed twice is refused", kindProblems([kinds[0], kinds[0]]).some((p) => /decision is listed twice/.test(p)));
expect("a verb an earlier kind takes with no terms is refused", kindProblems([kinds[0], { id: "commitment", performer: "person", when: [{ verbs: ["approve"], terms: ["contract"] }], basis: "t" }]).some((p) => /verb approve, which kind decision already takes/.test(p)));
expect("the same verb with terms in two kinds is allowed", kindProblems([{ id: "a", performer: "person", when: [{ verbs: ["set"], terms: ["x"] }], basis: "t" }, { id: "b", performer: "person", when: [{ verbs: ["set"], terms: ["y"] }], basis: "t" }]).length === 0);

const catalog = runSync(readCatalog()), groups = runSync(readGroups()), pcf = runSync(readPcf());
const shipped = catalog.kinds ?? [];
expect("the catalog ships the four kinds a person performs, with no problem", shipped.map((k) => k.id).join() === "decision,value,commitment,relationship" && shipped.every((k) => k.performer === "person") && kindProblems(shipped).length === 0, kindProblems(shipped));
const name = (id: string) => pcf.elements.find((e) => e.id === id)?.name ?? "";
const of = (id: string) => kindOf(shipped, name(id))?.id ?? null;
expect("APQC's own names: one activity of each kind", [of("7.2.4.3"), of("1.1.4.1"), of("4.2.3.3"), of("3.5.2.4")].join() === "decision,value,commitment,relationship", [of("7.2.4.3"), of("1.1.4.1"), of("4.2.3.3"), of("3.5.2.4")]);
expect("APQC's own names: activities of no kind are left to agents", [of("1.1.1.1"), of("3.5.1.6"), of("13.6.4.1"), of("6.3.2.7")].every((k) => k === null), [of("1.1.1.1"), of("3.5.1.6"), of("13.6.4.1"), of("6.3.2.7")]);
const found = kinded(catalog, groups, pcf);
const level4 = pcf.elements.filter((e) => e.level === 4).length;
expect("a small share of APQC's level 4 activities has a kind, each under a function", found.length > 0 && found.length < level4 / 10 && found.every((k) => k.function && k.performer === "person" && groups.get(k.process_group) === k.function), `${found.length} of ${level4}`);
expect("APQC's activities come first, in the framework's order", found.filter((k) => k.from === "pcf").map((k) => k.id).join() === pcf.elements.filter((e) => found.some((k) => k.from === "pcf" && k.id === e.id)).map((e) => e.id).join());

console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
