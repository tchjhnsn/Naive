// Where the term engine and the Lean proofs disagree about which terms and theorems exist. An app imports
// disagreements(root) and readLean(root) from here; packages/naive/src/terms/lean-agreement-test.ts runs them as a test.
//
// Two rules, read from packages/naive/src/terms/admitted.json and every .lean file under packages/naive/lean/Naive, subfolders included.
//
//   1. Every theorem an admitted term cites in its `lean` list is declared in packages/naive/lean/Naive. Declared means a line
//      that starts with `theorem <name>` once Lean comments are removed, so a name in a docstring, a `--` line
//      or a `/- -/` block does not count.
//   2. Every Lean concept has an admitted term. A Lean concept is a top-level `def` or `abbrev` whose declared
//      type is the engine's `Concept <facts>` (Naive/Concept.lean): a term written as its list of named,
//      decidable properties, which is how a glossary term is encoded in Lean. Its admitted id is its name in
//      kebab case, so `coFounder` is `co-founder` and `phaseGate` is `phase-gate`. Everything else is a helper
//      and is told apart by its type, not by a list: fact structures (`FounderFacts`), witnesses (`jobs`),
//      property pairs (`confirmedProp`), relations (`PointsDown`) and functions (`relationOf`) are not of type
//      `Concept`.
//      One file is exempt: packages/naive/lean/Naive/Generated/Ontology.lean, which packages/naive/src/terms/gen-concepts.ts writes with one
//      concept per noun in packages/naive/src/terms/ontology.json. Those are ontology nouns (EE-014), not glossary terms (EE-095): each
//      checks only the noun's recorded placement, and the file is pinned to the ontology by `gen-concepts.ts
//      --check`, not written by hand. Any other file, in Generated/ or elsewhere, is held to the rule.
//
// What this does not prove: that a theorem proves what the term means, or that the Lean properties match the
// TypeScript ones. The lean workflow builds the proofs; this only ties the names together.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OUTPUT as GENERATED } from "./gen-concepts.ts";

export { GENERATED };

type Cited = { term: string; theorem: string };
type LeanConcept = { name: string; file: string; term: string };
type Lean = { theorems: Set<string>; concepts: LeanConcept[] };

export const ADMITTED = "packages/naive/src/terms/admitted.json";
export const LEAN_DIR = "packages/naive/lean/Naive";

export function stripLeanComments(src: string): string {
  let out = "";
  let depth = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const two = src.slice(i, i + 2);
    if (depth > 0) {
      if (two === "/-") { depth++; out += "  "; i++; } else if (two === "-/") { depth--; out += "  "; i++; } else out += c === "\n" ? "\n" : " ";
    } else if (two === "/-") { depth = 1; out += "  "; i++; } else if (two === "--") {
      while (i < src.length && src[i] !== "\n") { out += " "; i++; }
      if (i < src.length) out += "\n";
    } else if (c === "\"") {
      out += c;
      for (i++; i < src.length && src[i] !== "\""; i++) { if (src[i] === "\\") { out += src[i]; i++; } out += src[i]; }
      if (i < src.length) out += "\"";
    } else out += c;
  }
  return out;
}

// A name is plain (founder) or in Lean's «» quotes («sorry», which gen-concepts.ts writes for every noun), and may be
// dotted. The quotes are not part of the name: «capTable» and capTable are one name.
const NAME = String.raw`((?:«[^»\n]+»|[A-Za-z_][\w']*)(?:\.(?:«[^»\n]+»|[A-Za-z_][\w']*))*)`;
const THEOREM = new RegExp(String.raw`^theorem\s+${NAME}`, "gm");
const DEFINITION = new RegExp(String.raw`^(?:noncomputable\s+)?(?:private\s+|protected\s+)?(?:def|abbrev)\s+${NAME}`, "gm");
const unquote = (name: string): string => name.replaceAll(/[«»]/g, "");
const OPEN = "([{⟨⦃";
const CLOSE = ")]}⟩⦄";

// The declared type of a definition: the text after the last colon outside brackets, before `:=` or a `|` arm.
function declaredType(header: string): string {
  let level = 0;
  let colon = -1;
  for (let i = 0; i < header.length; i++) {
    const c = header[i];
    if (OPEN.includes(c)) level++;
    else if (CLOSE.includes(c)) level--;
    else if (level === 0 && c === ":" && header[i + 1] === "=") return colon < 0 ? "" : header.slice(colon + 1, i).trim();
    else if (level === 0 && c === ":") colon = i;
    else if (level === 0 && c === "\n" && /^\s*\|/.test(header.slice(i + 1))) break;
  }
  return colon < 0 ? "" : header.slice(colon + 1).trim();
}

const kebab = (name: string): string => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

export function readLean(root: string): Lean {
  const dir = join(root, LEAN_DIR);
  const theorems = new Set<string>();
  const concepts: LeanConcept[] = [];
  if (!existsSync(dir)) return { theorems, concepts };
  for (const file of readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((f) => f.endsWith(".lean")).sort()) {
    const src = stripLeanComments(readFileSync(join(dir, file), "utf8"));
    for (const m of src.matchAll(THEOREM)) theorems.add(unquote(m[1]));
    for (const m of src.matchAll(DEFINITION)) {
      const start = (m.index ?? 0) + m[0].length;
      const next = src.slice(start).search(/\n\S/);
      const header = src.slice(start, next < 0 ? undefined : start + next + 1);
      const name = unquote(m[1]);
      if (/^Concept\b/.test(declaredType(header))) concepts.push({ name, file: `${LEAN_DIR}/${file}`, term: kebab(name) });
    }
  }
  return { theorems, concepts };
}

export function readAdmitted(root: string): { ids: Set<string>; cited: Cited[] } {
  const record: unknown = JSON.parse(readFileSync(join(root, ADMITTED), "utf8"));
  const terms = typeof record === "object" && record !== null && "terms" in record && Array.isArray(record.terms) ? record.terms : [];
  const ids = new Set<string>();
  const cited: Cited[] = [];
  for (const t of terms as unknown[]) {
    if (typeof t !== "object" || t === null || !("id" in t) || typeof t.id !== "string") continue;
    ids.add(t.id);
    const lean = "lean" in t && Array.isArray(t.lean) ? (t.lean as unknown[]) : [];
    for (const theorem of lean) if (typeof theorem === "string") cited.push({ term: t.id, theorem });
  }
  return { ids, cited };
}

export function disagreements(root: string): string[] {
  const lean = readLean(root);
  const admitted = readAdmitted(root);
  return [
    ...admitted.cited.filter((c) => !lean.theorems.has(c.theorem))
      .map((c) => `${c.term} cites Lean theorem ${c.theorem}, which no .lean file under ${LEAN_DIR} declares`),
    ...lean.concepts.filter((c) => c.file !== GENERATED && !admitted.ids.has(c.term))
      .map((c) => `Lean concept ${c.name} (${c.file}) has no admitted term ${c.term} in ${ADMITTED}`),
  ];
}
