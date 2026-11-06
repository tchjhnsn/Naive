// Regenerates the Lean ontology concepts from small fixtures and checks what packages/naive/src/terms/gen-concepts.ts does.
//
//   node packages/naive/src/terms/gen-concepts-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { OUTPUT, identifier } from "./gen-concepts.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const generator = join(dirname(new URL(import.meta.url).pathname), "gen-concepts.ts");

const noun = (name: string, level: string, fn: string | null) =>
  ({ noun: name, level, meaning: `The ${name}`, standard: "ours", status: "new", function: fn, handoff_type: false });

const root = mkdtempSync(join(tmpdir(), "gen-concepts-"));
const ontology = (nouns: unknown[]): void => {
  mkdirSync(join(root, "packages/naive/src/terms"), { recursive: true });
  writeFileSync(join(root, "packages/naive/src/terms/ontology.json"), JSON.stringify({ nouns }));
};
const run = (...args: string[]): { status: number | null; out: string } => {
  const r = spawnSync(process.execPath, [generator, "--root", root, ...args], { encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
};

try {
  ontology([noun("cap table", "governance", null), noun("customer@finance", "venture", "finance")]);
  const wrote = run();
  const lean = readFileSync(join(root, OUTPUT), "utf8");
  expect("two nouns: the generator exits 0", wrote.status === 0, wrote.out);
  expect("two nouns: both concepts appear", /^def «capTable» : Concept Placement :=/m.test(lean) && /^def «customer_finance» : Concept Placement :=/m.test(lean), lean);
  expect("two nouns: exactly two concepts", (lean.match(/: Concept Placement :=/g) ?? []).length === 2);
  expect("a shared noun checks its level only", lean.includes('def «capTable» : Concept Placement := ⟨[\n  ("level governance", fun f => Decidable.decide (f.level = Level.«governance»))]⟩'), lean);
  expect("a noun with a function checks it too", lean.includes('("function finance", fun f => Decidable.decide (f.department = Option.some Department.«finance»))'), lean);
  expect("the header states the same-placement limit", lean.includes("two nouns with the same placement pass the same facts"), lean);

  const fresh = run("--check");
  expect("--check exits 0 on a fresh file", fresh.status === 0, fresh.out);
  expect("a second run changes nothing", run().status === 0 && readFileSync(join(root, OUTPUT), "utf8") === lean);

  ontology([noun("cap table", "governance", null), { ...noun("customer@finance", "venture", "finance"), meaning: "Edited" }]);
  const stale = run("--check");
  expect("--check exits 1 once one noun is edited", stale.status === 1 && stale.out.includes("regenerate"), stale.out);

  for (const [field, value] of [["handoff_type", true], ["references", ["abell-1980"]], ["replaced_by", "venture"], ["capabilities", ["customer@finance"]], ["a_field_added_later", 1]] as const) {
    ontology([noun("cap table", "governance", null), { ...noun("customer@finance", "venture", "finance"), [field]: value }]);
    const edited = run("--check");
    expect(`--check exits 1 when only ${field} changes`, edited.status === 1, edited.out);
  }
  ontology([noun("cap table", "governance", null), { ...noun("customer@finance", "venture", "finance"), handoff_type: true, required_touches: ["finance"] }]);
  run();
  expect("the other fields are written into the docstring, sorted", readFileSync(join(root, OUTPUT), "utf8").includes('Fields: handoff_type true; required_touches ["finance"]. -/'));

  ontology([]);
  const empty = run();
  expect("an ontology with no nouns exits 2, named, and writes nothing", empty.status === 2 && empty.out.includes("lists no nouns") && readFileSync(join(root, OUTPUT), "utf8").includes("required_touches"), empty.out);
  expect("--check on an ontology with no nouns exits 2", run("--check").status === 2);

  const keywords = ["attribute", "prefix", "notation", "macro", "syntax", "include", "using", "break", "catch", "sorry", "termination@by", "set@option", "decide", "some", "at", "3d model"];
  ontology([...keywords.map((k) => noun(k, "syntax", "macro")), noun("level", "sorry", null)]);
  const quoted = run();
  const kw = readFileSync(join(root, OUTPUT), "utf8");
  const defs = kw.match(/^def .*$/gm) ?? [];
  expect("Lean keywords and digit-led nouns: the generator exits 0", quoted.status === 0, quoted.out);
  expect("Lean keywords: every concept name is in «» quotes", defs.length === keywords.length + 1 && defs.every((d) => /^def «[A-Za-z0-9_]+» : Concept Placement :=/.test(d)), defs.join("\n"));
  expect("Lean keywords: the names are the nouns', not renamed", ["«sorry»", "«termination_by»", "«set_option»", "«decide»", "«3dModel»", "«at»"].every((n) => defs.some((d) => d.startsWith(`def ${n} :`))), defs.join("\n"));
  expect("Lean keywords: Level and Department constructors are quoted too", kw.includes("inductive Level | «sorry» | «syntax»") && kw.includes("inductive Department | «macro»") && kw.includes("Level.«syntax»") && kw.includes("Department.«macro»"), kw);
  expect("Lean keywords: decide and some are called by full name", (kw.match(/fun f => .*$/gm) ?? []).every((c) => c.startsWith("fun f => Decidable.decide (f.level = Level.«") || c.startsWith("fun f => Decidable.decide (f.department = Option.some Department.«")), kw);

  ontology([noun("cap table", "governance", null), noun("Cap-Table", "venture", null)]);
  const clash = run();
  expect("two nouns with one Lean name exit 2, named", clash.status === 2 && clash.out.includes('"cap table" and "Cap-Table"'), clash.out);

  ontology([noun("cap table", "big-level", null), noun("ledger", "Big Level", null)]);
  const levelClash = run();
  expect("two levels with one constructor name exit 2, named", levelClash.status === 2 && levelClash.out.includes('"Big Level" and "big-level" both become constructor bigLevel'), levelClash.out);

  expect("identifier rule: scope, digits, keywords and punctuation",
    identifier("need-now score") === "needNowScore" && identifier("repository (repo)") === "repositoryRepo" &&
    identifier("customer@marketing-and-sales") === "customer_marketingAndSales" && identifier("3d model") === "3dModel" &&
    identifier("at") === "at" && identifier("AI harness") === "aiHarness");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log(failed ? `${failed} failed` : "gen-concepts: all pass");
process.exit(failed ? 1 : 0);
