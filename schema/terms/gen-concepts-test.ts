// Regenerates the Lean ontology concepts from small fixtures and checks what schema/terms/gen-concepts.ts does.
//
//   node schema/terms/gen-concepts-test.ts

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
  mkdirSync(join(root, "docs"), { recursive: true });
  writeFileSync(join(root, "docs/ontology.json"), JSON.stringify({ nouns }));
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
  expect("two nouns: both concepts appear", /^def capTable : Concept Placement :=/m.test(lean) && /^def customer_finance : Concept Placement :=/m.test(lean), lean);
  expect("two nouns: exactly two concepts", (lean.match(/: Concept Placement :=/g) ?? []).length === 2);
  expect("a shared noun checks its level only", lean.includes('def capTable : Concept Placement := ⟨[\n  ("level governance", fun f => decide (f.level = Level.governance))]⟩'), lean);
  expect("a noun with a function checks it too", lean.includes('("function finance", fun f => decide (f.department = some Department.finance))'), lean);

  const fresh = run("--check");
  expect("--check exits 0 on a fresh file", fresh.status === 0, fresh.out);
  expect("a second run changes nothing", run().status === 0 && readFileSync(join(root, OUTPUT), "utf8") === lean);

  ontology([noun("cap table", "governance", null), { ...noun("customer@finance", "venture", "finance"), meaning: "Edited" }]);
  const stale = run("--check");
  expect("--check exits 1 once one noun is edited", stale.status === 1 && stale.out.includes("regenerate"), stale.out);

  ontology([noun("cap table", "governance", null), noun("Cap-Table", "venture", null)]);
  const clash = run();
  expect("two nouns with one Lean name exit 2, named", clash.status === 2 && clash.out.includes('"cap table" and "Cap-Table"'), clash.out);

  expect("identifier rule: scope, digits, keywords and punctuation",
    identifier("need-now score") === "needNowScore" && identifier("repository (repo)") === "repositoryRepo" &&
    identifier("customer@marketing-and-sales") === "customer_marketingAndSales" && identifier("3d model") === "n3dModel" &&
    identifier("at") === "at_" && identifier("AI harness") === "aiHarness");
} finally {
  rmSync(root, { recursive: true, force: true });
}

console.log(failed ? `${failed} failed` : "gen-concepts: all pass");
process.exit(failed ? 1 : 0);
