// Writes one Lean `Concept` per noun in packages/naive/src/terms/ontology.json to packages/naive/lean/Naive/Generated/Ontology.lean.
//
//   node packages/naive/src/terms/gen-concepts.ts                write the Lean file
//   node packages/naive/src/terms/gen-concepts.ts --check        exit 1 when the committed file differs from a fresh run
//   node packages/naive/src/terms/gen-concepts.ts --root <dir>   read and write under another copy of the repository
//
// What a generated concept contains. The ontology records a noun's meaning as prose, so there is no decidable
// test of what it means to copy. What it does record as data is where the noun sits: its level, and the function
// that owns it (null when the word is shared). Each concept is that placement as necessary properties over
// `Placement` facts: "level <level>" always, and "function <id>" when the noun names a function. The facts carry
// no label, so no check reads the noun's name (R2). Two nouns with the same placement pass the same facts; telling
// them apart takes an admitted term (EE-095). The noun, its meaning, standard and status go in the docstring, and
// so does every other field the noun carries (handoff_type, references, replaced_by and the rest), so editing any
// field of a noun makes --check fail. An ontology with no nouns stops the run with exit 2.
//
// These are ontology nouns (EE-014), not glossary terms (EE-095). packages/naive/src/terms/lean-agreement-test.ts exempts this
// one file from its rule that every Lean concept has an admitted term, because this file is pinned to
// packages/naive/src/terms/ontology.json by --check rather than written by hand.
//
// The identifier rule. Split the noun at "@" into a word and an optional scope. Each part becomes lower camel case
// from its ASCII letter and digit runs ("need-now score" is needNowScore, "repository (repo)" is repositoryRepo).
// A scope is joined with "_", which the camel case never produces ("customer@finance" is customer_finance). Any two
// nouns that end up with one name, or a noun with no letters or digits, stop the run with exit 2. Every name, the
// Level and Department constructors included, is written in Lean's «» quotes, so a name that is a Lean keyword
// (sorry, syntax, at) or starts with a digit still parses, and no keyword list is needed. The checks inside the
// concepts call Decidable.decide and Option.some by their full names, so a noun named decide or some cannot shadow
// them.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const OUTPUT = "packages/naive/lean/Naive/Generated/Ontology.lean";
const ONTOLOGY = "packages/naive/src/terms/ontology.json";

export type Noun = {
  noun: string;
  level: string;
  meaning: string;
  standard: string;
  status: string;
  function: string | null;
  others: [string, string][];
};

const PLACED = new Set(["noun", "level", "meaning", "standard", "status", "function"]);

const camel = (text: string): string => {
  const words = text.match(/[A-Za-z0-9]+/g) ?? [];
  return words.map((w, i) => i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase()).join("");
};

export function identifier(noun: string): string {
  const at = noun.indexOf("@");
  const parts = at < 0 ? [noun] : [noun.slice(0, at), noun.slice(at + 1)];
  const camels = parts.map(camel);
  if (camels.some((c) => c === "")) throw new Error(`noun "${noun}" has no letters or digits to name it in Lean`);
  return camels.join("_");
}

export function parseNouns(record: unknown): Noun[] {
  const nouns = typeof record === "object" && record !== null && "nouns" in record ? record.nouns : undefined;
  if (!Array.isArray(nouns)) throw new Error(`${ONTOLOGY} has no nouns list`);
  if (nouns.length === 0) throw new Error(`${ONTOLOGY} lists no nouns, so there is no Level to generate`);
  return nouns.map((n: unknown, i) => {
    const o = typeof n === "object" && n !== null ? n as Record<string, unknown> : {};
    const text = (key: string): string => {
      const v = o[key];
      if (typeof v !== "string") throw new Error(`${ONTOLOGY} noun ${i}: ${key} is not a string`);
      return v;
    };
    const fn = o.function === null ? null : text("function");
    const others = Object.keys(o).filter((k) => !PLACED.has(k)).sort().map((k): [string, string] => [k, JSON.stringify(o[k])]);
    return { noun: text("noun"), level: text("level"), meaning: text("meaning"), standard: text("standard"), status: text("status"), function: fn, others };
  });
}

const sorted = (values: string[]): string[] => [...new Set(values)].sort();
const doc = (text: string): string => text.replaceAll("-/", "- /").replaceAll("/-", "/ -").replace(/\.$/, "");
const str = (text: string): string => JSON.stringify(text);
const quote = (name: string): string => `«${name}»`;

function constructors(values: string[]): Map<string, string> {
  const names = new Map(values.map((v) => [v, identifier(v)]));
  const seen = new Map<string, string>();
  for (const [v, c] of names) {
    const other = seen.get(c);
    if (other !== undefined) throw new Error(`"${other}" and "${v}" both become constructor ${c}`);
    seen.set(c, v);
  }
  return new Map([...names].map(([v, c]) => [v, quote(c)]));
}

export function render(nouns: Noun[]): string {
  const levels = constructors(sorted(nouns.map((n) => n.level)));
  const departments = constructors(sorted(nouns.flatMap((n) => n.function === null ? [] : [n.function])));
  const named = new Map<string, string>();
  const concepts = nouns.map((n) => {
    const name = identifier(n.noun);
    const other = named.get(name);
    if (other !== undefined) throw new Error(`nouns "${other}" and "${n.noun}" both become ${name}`);
    named.set(name, n.noun);
    const props = [`(${str(`level ${n.level}`)}, fun f => Decidable.decide (f.level = Level.${levels.get(n.level)}))`];
    if (n.function !== null) props.push(`(${str(`function ${n.function}`)}, fun f => Decidable.decide (f.department = Option.some Department.${departments.get(n.function)}))`);
    const others = n.others.length === 0 ? "" : ` Fields: ${doc(n.others.map(([k, v]) => `${k} ${v}`).join("; "))}.`;
    return `/-- [D] ${doc(n.noun)} (${doc(n.status)}). ${doc(n.meaning)}. Standard: ${doc(n.standard)}.${others} -/\n` +
      `def ${quote(name)} : Concept Placement := ⟨[\n  ${props.join(",\n  ")}]⟩\n`;
  });
  const department = departments.size === 0 ? [] : [
    "/-- [D] The functions (ids in operations/departments.json) that own a noun. -/",
    `inductive Department | ${[...departments.values()].join(" | ")}`,
    "  deriving DecidableEq, Repr",
    "",
  ];
  return [
    "import Naive.Concept",
    "",
    "/-",
    "  Generated by packages/naive/src/terms/gen-concepts.ts from packages/naive/src/terms/ontology.json. Do not edit: change the ontology and rerun",
    "  the generator. One concept per noun (EE-014). The ontology records each noun's meaning as prose and its",
    "  placement as data, so each concept checks placement only: its level, and its function when it names one.",
    "  These are ontology nouns, not admitted glossary terms (EE-095); a term's own properties live in its own file.",
    "  The limit that follows: two nouns with the same placement pass the same facts, so each IsA the other and no",
    "  theorem here can tell them apart. Telling them apart takes an admitted term. Every other field of a noun is",
    "  written into its docstring, so editing any field of a noun changes this file.",
    "-/",
    "",
    "namespace Ontology",
    "",
    "/-- [D] The levels the ontology places a noun at. -/",
    `inductive Level | ${[...levels.values()].join(" | ")}`,
    "  deriving DecidableEq, Repr",
    "",
    ...department,
    "/-- [D] Where a thing sits: its level, and the function that owns it (none when shared). No label field. -/",
    "structure Placement where",
    "  level      : Level",
    ...(departments.size === 0 ? [] : ["  department : Option Department"]),
    "",
    concepts.join("\n"),
    "end Ontology",
    "",
  ].join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf("--root");
  const root = at > 0 ? process.argv[at + 1] : join(new URL(".", import.meta.url).pathname, "../../../..");
  const out = join(root, OUTPUT);
  let text: string;
  try {
    text = render(parseNouns(JSON.parse(readFileSync(join(root, ONTOLOGY), "utf8"))));
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(2);
  }
  if (process.argv.includes("--check")) {
    let committed = "";
    try { committed = readFileSync(out, "utf8"); } catch { committed = ""; }
    if (committed !== text) {
      console.error(`${OUTPUT} differs from ${ONTOLOGY}: regenerate with node packages/naive/src/terms/gen-concepts.ts`);
      process.exit(1);
    }
    console.log(`${OUTPUT} matches ${ONTOLOGY}`);
  } else {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, text);
    console.log(`wrote ${OUTPUT}`);
  }
}
