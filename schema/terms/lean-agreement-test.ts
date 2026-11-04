// Fails the suite when the term engine and the Lean proofs disagree about which terms and theorems exist.
//
//   node schema/terms/lean-agreement-test.ts               fixture cases, then the repository
//   node schema/terms/lean-agreement-test.ts --root <dir>  one tree only, exit 1 on any disagreement
//
// Two rules, read from schema/terms/admitted.json and lean/Naive/*.lean.
//
//   1. Every theorem an admitted term cites in its `lean` list is declared in lean/Naive. Declared means a line
//      that starts with `theorem <name>` once Lean comments are removed, so a name in a docstring, a `--` line
//      or a `/- -/` block does not count.
//   2. Every Lean concept has an admitted term. A Lean concept is a top-level `def` or `abbrev` whose declared
//      type is the engine's `Concept <facts>` (Naive/Concept.lean): a term written as its list of named,
//      decidable properties, which is how a glossary term is encoded in Lean. Its admitted id is its name in
//      kebab case, so `coFounder` is `co-founder` and `phaseGate` is `phase-gate`. Everything else is a helper
//      and is told apart by its type, not by a list: fact structures (`FounderFacts`), witnesses (`jobs`),
//      property pairs (`confirmedProp`), relations (`PointsDown`) and functions (`relationOf`) are not of type
//      `Concept`.
//
// What this does not prove: that a theorem proves what the term means, or that the Lean properties match the
// TypeScript ones. The lean workflow builds the proofs; this only ties the names together.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

type Cited = { term: string; theorem: string };
type LeanConcept = { name: string; file: string; term: string };
type Lean = { theorems: Set<string>; concepts: LeanConcept[] };

const ADMITTED = "schema/terms/admitted.json";
const LEAN_DIR = "lean/Naive";

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

const THEOREM = /^theorem\s+([A-Za-z_][\w'.]*)/gm;
const DEFINITION = /^(?:noncomputable\s+)?(?:private\s+|protected\s+)?(?:def|abbrev)\s+([A-Za-z_][\w'.]*)/gm;
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
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".lean")).sort()) {
    const src = stripLeanComments(readFileSync(join(dir, file), "utf8"));
    for (const m of src.matchAll(THEOREM)) theorems.add(m[1]);
    for (const m of src.matchAll(DEFINITION)) {
      const start = (m.index ?? 0) + m[0].length;
      const next = src.slice(start).search(/\n\S/);
      const header = src.slice(start, next < 0 ? undefined : start + next + 1);
      if (/^Concept\b/.test(declaredType(header))) concepts.push({ name: m[1], file: `${LEAN_DIR}/${file}`, term: kebab(m[1]) });
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
      .map((c) => `${c.term} cites Lean theorem ${c.theorem}, which ${LEAN_DIR}/*.lean does not declare`),
    ...lean.concepts.filter((c) => !admitted.ids.has(c.term))
      .map((c) => `Lean concept ${c.name} (${c.file}) has no admitted term ${c.term} in ${ADMITTED}`),
  ];
}

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const self = new URL(import.meta.url).pathname;

const ENGINE_LEAN = "structure Concept (α : Type) where\n  props : List (String × (α → Bool))\n";
const FIXTURE_LEAN = `import Naive.Concept

/- theorem only_in_a_block : True := trivial -/
-- theorem only_in_a_line : True := trivial
structure Facts where
  ok : Bool

/-- [D] A helper, not a concept: a witness of the facts. -/
def sample : Facts := ⟨true⟩

def confirmedProp : String × (Facts → Bool) := ("P7 confirmed", (·.ok))

def fixtureTerm : Concept Facts := ⟨[confirmedProp]⟩

/-- A concept family with binders before its type still counts. -/
def gatedTerm (n : Nat)
    : Concept Facts := ⟨[("G1 -- not a comment", fun f => f.ok && n == n)]⟩

theorem fixture_holds : True := trivial
`;

function fixtureCases(): void {
  const root = mkdtempSync(join(tmpdir(), "lean-agreement-"));
  const put = (path: string, text: string): void => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
  const admit = (terms: { id: string; lean: string[] }[]): void => put(ADMITTED, JSON.stringify({ terms }));
  const run = (): { status: number | null; out: string } => {
    const r = spawnSync(process.execPath, [self, "--root", root], { encoding: "utf8" });
    return { status: r.status, out: `${r.stdout}${r.stderr}` };
  };
  try {
    put(`${LEAN_DIR}/Concept.lean`, ENGINE_LEAN);
    put(`${LEAN_DIR}/Fixture.lean`, FIXTURE_LEAN);
    const lean = readLean(root);
    expect("fixture: a theorem at a line start is declared", lean.theorems.has("fixture_holds"));
    expect("fixture: a theorem inside a comment is not declared", !lean.theorems.has("only_in_a_block") && !lean.theorems.has("only_in_a_line"));
    expect("fixture: exactly the defs of type Concept are concepts", JSON.stringify(lean.concepts.map((c) => c.term)) === '["fixture-term","gated-term"]', lean.concepts.map((c) => c.name).join(", "));

    admit([{ id: "fixture-term", lean: ["fixture_holds"] }, { id: "gated-term", lean: [] }]);
    const green = run();
    expect("fixture: names that agree exit 0", green.status === 0, green.out);

    admit([{ id: "fixture-term", lean: ["fixture_holds", "fixture_renamed"] }, { id: "gated-term", lean: [] }]);
    const missing = run();
    expect("fixture: a cited theorem lean/Naive does not declare exits 1, named", missing.status === 1 && missing.out.includes("fixture-term cites Lean theorem fixture_renamed"), missing.out);

    admit([{ id: "fixture-term", lean: ["only_in_a_block"] }, { id: "gated-term", lean: [] }]);
    const commented = run();
    expect("fixture: a cited theorem that is only in a comment exits 1, named", commented.status === 1 && commented.out.includes("only_in_a_block"), commented.out);

    admit([{ id: "fixture-term", lean: ["fixture_holds"] }]);
    const orphan = run();
    expect("fixture: a Lean concept with no admitted term exits 1, named", orphan.status === 1 && orphan.out.includes("Lean concept gatedTerm") && !orphan.out.includes("Lean concept fixtureTerm"), orphan.out);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function report(root: string): void {
  const found = disagreements(root);
  for (const d of found) console.log(`FAIL  ${d}`);
  const lean = readLean(root);
  expect(`admitted terms and ${LEAN_DIR} agree (${lean.concepts.length} concepts, ${readAdmitted(root).cited.length} cited theorems)`, found.length === 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf("--root");
  if (at > 0) report(process.argv[at + 1]);
  else {
    fixtureCases();
    report(join(dirname(self), "../.."));
  }
  console.log(failed ? `${failed} failed` : "Lean agreement: all pass");
  process.exit(failed ? 1 : 0);
}
