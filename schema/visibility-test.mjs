// Tests for field visibility beyond the leak canaries (schema/leaks-test.mjs): only a person sets public,
// an agent only proposes, the router's public reader sees only public fields, and the publish check
// (schema/check-visibility.mjs) refuses a page that uses a fact no person approved.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hash, visibilityOf } from "./visibility.mjs";
import { refusals } from "./check-visibility.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "visibility-"));
const v = join(ws, "vis");
const w = (rel, x) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), typeof x === "string" ? x : JSON.stringify(x, null, 2)); };
const cli = (args, env = {}) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...args, "--venture", "vis"], { env: { ...process.env, MENTURA_WORKSPACE: ws, ...env }, encoding: "utf8" });
const STATEMENT = "Building is easy now. Knowing what to decide next is not.";

try {
  w("venture.json", { id: "vis", name: "Vis", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery" });
  w("foundation/problem.json", { venture: "vis", statement: STATEMENT, segment: "INTERNAL-SEGMENT-9c1", evidence: [] });

  w("foundation/problem.visibility.json", { fields: { statement: { visibility: "public", sha256: hash(STATEMENT) } } });
  expect("a public field no person approved stays internal", visibilityOf(v, "foundation/problem.json", "statement").visibility === "internal");
  w("foundation/problem.visibility.json", { fields: { statement: { visibility: "public", sha256: hash(STATEMENT), approved_by: "chief-of-staff" } } });
  expect("a public field a role approved stays internal", visibilityOf(v, "foundation/problem.json", "statement").visibility === "internal");
  rmSync(join(v, "foundation/problem.visibility.json"));

  const byRole = cli(["visibility", "foundation/problem", "statement", "--public", "--by", "chief-of-staff"]);
  expect("a role cannot approve a field as public", byRole.status !== 0 && /only a person/.test(byRole.stderr), byRole.stderr);
  const prop = cli(["visibility", "foundation/problem", "statement", "--propose"], { MENTURA_ACTOR_ID: "marketing-lead" });
  expect("an agent proposes public, and the field stays internal", prop.status === 0 && visibilityOf(v, "foundation/problem.json", "statement").visibility === "internal", prop.stdout + prop.stderr);
  const ok = cli(["visibility", "foundation/problem", "statement", "--public", "--by", "Founder"]);
  const side = JSON.parse(readFileSync(join(v, "foundation/problem.visibility.json"), "utf8")).fields.statement;
  expect("a person approves it: the wording is pinned by sha256", ok.status === 0 && side.visibility === "public" && side.sha256 === hash(STATEMENT) && side.approved_by === "Founder", side);
  expect("the approval is a line in provenance", readFileSync(join(v, "provenance.jsonl"), "utf8").includes("approved foundation/problem.json#statement as public"));

  const pub = cli(["foundation/problem", "read", "--as", "public", "--json"]);
  const seen = JSON.parse(pub.stdout).result;
  expect("the router's public reader sees the public field and nothing internal", seen?.statement === STATEMENT && !pub.stdout.includes("INTERNAL-SEGMENT"), pub.stdout.slice(0, 400) + pub.stderr);
  expect("the router's public reader cannot write", cli(["foundation/problem", "write", "--as", "public", "--input", join(v, "foundation/problem.json")]).status !== 0);

  w("site/why.mdx", '<Section>\n  <Fact name="problem" />\n  <Fact name="segment" />\n</Section>\n');
  w("facts.json", { venture: "vis", problem: { value: STATEMENT, status: "confirmed", source: "foundation/problem.json#statement" } });
  const r = refusals(v, { content: join(v, "site"), facts: join(v, "facts.json") });
  expect("the publish check refuses a page using an internal field and names it", r.length === 1 && r[0].name === "segment" && r[0].visibility === "internal", r);
  w("foundation/problem.json", { venture: "vis", statement: STATEMENT + " Edited.", segment: "INTERNAL-SEGMENT-9c1", evidence: [] });
  const r2 = refusals(v, { content: join(v, "site"), facts: join(v, "facts.json") });
  expect("after an edit the approved field is refused until re-approved", r2.some((x) => x.name === "problem" && x.visibility === "variant"), r2);
  const real = spawnSync("node", [join(repo, "schema/check-visibility.mjs")], { encoding: "utf8" });
  expect("the publish check refuses the in-repo venture's pages until a person approves their fields", real.status === 1 && /REFUSED/.test(real.stderr), real.stdout + real.stderr);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nfield visibility holds");
