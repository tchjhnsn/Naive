// Tests for the publishing gate: field visibility and the leak check. A canary planted in an internal
// field must never reach the site's generated facts; a field a person approved as public does, until its
// wording changes; an approved public variant stands in for a variant field.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hash, visibilityOf } from "./visibility.mjs";
import { leaks } from "./check-leaks.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };

const v = mkdtempSync(join(tmpdir(), "leaks-"));
const w = (rel, x) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), typeof x === "string" ? x : JSON.stringify(x, null, 2)); };
const CANARY = "CANARY-7f3a internal wording (Torian, 2026-10-28)";
w("venture.json", { id: "canary", name: "Canary", type: "software-startup", phase: "discovery", core: { promise: "We help founders decide what is next." } });
w("foundation/problem.json", { venture: "canary", statement: CANARY, segment: "Solo founders (EE-045)", evidence: [] });

const facts = () => {
  const p = spawnSync("node", [join(repo, "site/scripts/venture-facts.mjs")], { env: { ...process.env, NAIVE_VENTURE: v }, encoding: "utf8" });
  if (p.status !== 0) throw new Error(p.stderr);
  return readFileSync(join(repo, "site/generated/venture-facts.json"), "utf8");
};

try {
  expect("every field is internal by default", visibilityOf(v, "foundation/problem.json", "statement").visibility === "internal");
  let out = facts();
  expect("a canary in an internal field never reaches the site", !out.includes("CANARY-7f3a") && !out.includes("EE-045"), out);

  w("venture.visibility.json", { fields: { "core.promise": { visibility: "public", sha256: hash("We help founders decide what is next."), approved_by: "Founder" } } });
  out = facts();
  expect("a field a person approved as public reaches the site as written", JSON.parse(out).promise?.value === "We help founders decide what is next.", out);

  w("venture.json", { id: "canary", name: "Canary", type: "software-startup", phase: "discovery", core: { promise: "We help founders decide what is next, and more." } });
  expect("changing approved wording demotes the field to variant", visibilityOf(v, "venture.json", "core.promise").visibility === "variant");
  out = facts();
  expect("changed wording does not reach the site until re-approved", !JSON.parse(out).promise, out);

  w("foundation/problem.visibility.json", { fields: { statement: { visibility: "variant" } } });
  w("marketing/content/problem.mdx", "---\nvariant_of: foundation/problem.json#statement\npublish: true\napproved_by: Founder\n---\nBuilding is easy now. Knowing what to decide next is not.\n");
  out = facts();
  expect("a variant field reaches the site only as its approved public variant", JSON.parse(out).problem?.value === "Building is easy now. Knowing what to decide next is not." && !out.includes("CANARY"), out);

  w("leak.mdx", "---\ntitle: x\n---\n{/* DRAFT: agent-written, needs Torian */}\nClean text.\n");
  expect("MDX comments and frontmatter are not public text", leaks([join(v, "leak.mdx")]).length === 0);
  w("leak2.mdx", "Founders lose traction (Torian, 2026-10-28). See EE-045 and foundation/problem.json.\n");
  const found = leaks([join(v, "leak2.mdx")]).map((l) => l.pattern).sort();
  expect("the leak check names attributions, decision ids and record paths", ["dated-attribution", "decision-id", "record-path"].every((p) => found.includes(p)), found);
} finally {
  rmSync(v, { recursive: true, force: true });
  spawnSync("node", [join(repo, "site/scripts/venture-facts.mjs")], { encoding: "utf8" });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nthe publishing gate holds");
