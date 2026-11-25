// The kind of an activity, and who performs it by default (EE-179).
//
//   node packages/naive/src/engine/activity-kinds.ts [--function <id>] [--json]
//   naive activities defaults [--function <id>] [--json]
//
// A person performs four kinds of activity at any APQC level: a decision, a value, a commitment and a relationship.
// Agents perform the rest. The activity catalog (packages/naive/src/functions/activities.json) holds the kinds as
// data. A kind is told from the words of an activity's statement, or of an APQC level 4 activity's name: the first
// word is its verb and the words after it are its terms. A clause names verbs, terms or both, and a statement meets
// it when its verb is one of the verbs and one of its terms is one of the terms. The first kind with a clause the
// statement meets is the activity's kind.
//
// A kind is an unvalidated prior and it can be wrong, because it reads words and nothing else. A venture's own
// assignment for the activity (operations/activity-assignments.json) replaces it. The command prints every
// activity that has a kind, by function, and writes nothing.

import { Effect } from "effect";
import { runMain } from "../core/effect/run.ts";
import { isApqcId, readCatalog, readGroups, readPcf } from "./activity-proposals.ts";
import type { ActivityCatalog, Pcf } from "../records/types/records.d.ts";

export type Kind = NonNullable<ActivityCatalog["kinds"]>[number];
/** An activity that has a kind: where it is defined, the function that owns its process group, and the kind. */
export type Kinded = { id: string; from: "pcf" | "catalog"; function: string; process_group: string; statement: string; kind: string; performer: Kind["performer"] };

/** A statement's words in lower case: the first is its verb and the rest are its terms. Pure. */
export const wordsOf = (statement: string): string[] => statement.toLowerCase().split(/[^a-z]+/).filter(Boolean);

/** The first kind with a clause the statement meets, or null when it meets none. Pure. */
export function kindOf(kinds: readonly Kind[], statement: string): Kind | null {
  const [verb, ...terms] = wordsOf(statement);
  if (!verb) return null;
  return kinds.find((k) => k.when.some((c) => (!c.verbs || c.verbs.includes(verb)) && (!c.terms || terms.some((t) => c.terms?.includes(t))))) ?? null;
}

/** What is wrong with the kinds beyond their schema: a kind listed twice, or a clause that an earlier clause already covers. Pure. */
export function kindProblems(kinds: readonly Kind[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const verbOnly = new Map<string, string>();
  for (const k of kinds) {
    if (seen.has(k.id)) out.push(`kind ${k.id} is listed twice`);
    seen.add(k.id);
    for (const c of k.when) {
      for (const v of c.verbs ?? []) {
        const first = verbOnly.get(v);
        if (first !== undefined) out.push(`kind ${k.id} names the verb ${v}, which kind ${first} already takes with no terms, so the clause can never apply`);
      }
      if (!c.terms) for (const v of c.verbs ?? []) if (!verbOnly.has(v)) verbOnly.set(v, k.id);
    }
  }
  return out;
}

/** Every activity with a kind: APQC's level 4 activities in the framework's order, then the catalog's. Pure. */
export function kinded(catalog: ActivityCatalog, groups: Map<string, string>, pcf: Pcf): Kinded[] {
  const kinds = catalog.kinds ?? [];
  const one = (id: string, from: Kinded["from"], group: string, statement: string): Kinded[] => {
    const fn = groups.get(group), k = kindOf(kinds, statement);
    return fn && k ? [{ id, from, function: fn, process_group: group, statement, kind: k.id, performer: k.performer }] : [];
  };
  return [
    ...pcf.elements.flatMap((e) => (e.level === 4 && isApqcId(e.id) ? one(e.id, "pcf", e.id.split(".").slice(0, 2).join("."), e.name) : [])),
    ...catalog.activities.flatMap((a) => one(a.id, "catalog", a.process_group, a.statement)),
  ];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const at = args.indexOf("--function");
  const only = at < 0 ? undefined : args[at + 1];
  await runMain(Effect.gen(function* () {
    const groups = yield* readGroups();
    if (only !== undefined && ![...groups.values()].includes(only)) {
      console.error(`no function ${only}: the functions are ${[...new Set(groups.values())].join(", ")}`);
      process.exitCode = 2;
      return;
    }
    const found = kinded(yield* readCatalog(), groups, yield* readPcf()).filter((k) => only === undefined || k.function === only);
    if (json) { console.log(JSON.stringify({ defaults: found }, null, 2)); return; }
    for (const fn of [...new Set(found.map((k) => k.function))]) {
      console.log(`\n${fn}`);
      for (const k of found.filter((x) => x.function === fn)) console.log(`  ${k.id}  ${k.statement}  (${k.kind}: a ${k.performer} performs it)`);
    }
    console.log(`\n${found.length} activities have a kind, so a person performs them by default. The words that mark a kind are unvalidated priors, and a business's own assignment replaces a default. Nothing written.`);
  }));
}
