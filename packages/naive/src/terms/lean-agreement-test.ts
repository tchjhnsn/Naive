// Fails the suite when the term engine and the Lean proofs disagree about which terms and theorems exist. The rules
// and the reading are in packages/naive/src/terms/lean-agreement.ts.
//
//   node packages/naive/src/terms/lean-agreement-test.ts               fixture cases, then the repository
//   node packages/naive/src/terms/lean-agreement-test.ts --root <dir>  one tree only, exit 1 on any disagreement

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { ADMITTED, disagreements, GENERATED, LEAN_DIR, readAdmitted, readLean } from "./lean-agreement.ts";

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
    expect("fixture: a cited theorem packages/naive/lean/Naive does not declare exits 1, named", missing.status === 1 && missing.out.includes("fixture-term cites Lean theorem fixture_renamed"), missing.out);

    admit([{ id: "fixture-term", lean: ["only_in_a_block"] }, { id: "gated-term", lean: [] }]);
    const commented = run();
    expect("fixture: a cited theorem that is only in a comment exits 1, named", commented.status === 1 && commented.out.includes("only_in_a_block"), commented.out);

    admit([{ id: "fixture-term", lean: ["fixture_holds"] }]);
    const orphan = run();
    expect("fixture: a Lean concept with no admitted term exits 1, named", orphan.status === 1 && orphan.out.includes("Lean concept gatedTerm") && !orphan.out.includes("Lean concept fixtureTerm"), orphan.out);

    admit([{ id: "fixture-term", lean: ["fixture_holds"] }, { id: "gated-term", lean: [] }]);
    put(GENERATED, "import Naive.Concept\n\nnamespace Ontology\n\ndef «someNoun» : Concept Facts := ⟨[]⟩\n\nend Ontology\n");
    const nouns = run();
    expect("fixture: a concept in the generated ontology file needs no admitted term", nouns.status === 0 && readLean(root).concepts.some((c) => c.name === "someNoun"), nouns.out);

    put(`${LEAN_DIR}/Generated/Hand.lean`, "import Naive.Concept\n\ndef handTerm : Concept Facts := ⟨[]⟩\n\ndef «quotedTerm» : Concept Facts := ⟨[]⟩\n");
    const nested = run();
    expect("fixture: a concept in any other file under packages/naive/lean/Naive, subfolders included, still needs one", nested.status === 1 && nested.out.includes("Lean concept handTerm") && !nested.out.includes("someNoun"), nested.out);
    expect("fixture: a concept named in «» quotes still needs one, under its unquoted name", nested.out.includes("Lean concept quotedTerm (") && nested.out.includes("admitted term quoted-term"), nested.out);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

function report(root: string): void {
  const found = disagreements(root);
  for (const d of found) console.log(`FAIL  ${d}`);
  const lean = readLean(root);
  const nouns = lean.concepts.filter((c) => c.file === GENERATED).length;
  expect(`admitted terms and ${LEAN_DIR} agree (${lean.concepts.length - nouns} concepts, ${nouns} generated ontology nouns exempt, ${readAdmitted(root).cited.length} cited theorems)`, found.length === 0);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf("--root");
  if (at > 0) report(process.argv[at + 1]);
  else {
    fixtureCases();
    report(join(dirname(self), "../../../.."));
  }
  console.log(failed ? `${failed} failed` : "Lean agreement: all pass");
  process.exit(failed ? 1 : 0);
}
