// The site's facts builder (site/scripts/venture-facts.mjs) goes through Naive's publishing gate: a canary planted
// in an internal field never reaches site/generated/venture-facts.json; a field a person approved as public does,
// until its wording changes; an approved public variant stands in for a variant field. These were the site half of
// Naive's schema/leaks-test.mjs before EE-118; Naive now tests the gate with its own stand-in builders.
//
//   node site/scripts/venture-facts-test.mjs

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { hash } from "naive-framework/src/engine/visibility.mjs";

const builder = new URL("./venture-facts.mjs", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail) => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`); if (!ok) failed++; };

const ws = mkdtempSync(join(tmpdir(), "venture-facts-"));
const v = join(ws, "canary");
const out = join(ws, "out");
mkdirSync(v);
const w = (rel, x) => { mkdirSync(join(v, rel, ".."), { recursive: true }); writeFileSync(join(v, rel), typeof x === "string" ? x : JSON.stringify(x, null, 2)); };
const CANARY = "CANARY-7f3a internal wording (Torian, 2026-10-28)";
w("venture.json", { id: "canary", name: "Canary", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery", core: { promise: "We help founders decide what is next." } });
w("people/people.json", { venture: "canary", mode: "solo", people: [{ id: "founder", name: "Founder", role: "founder" }] });
w("foundation/problem.json", { venture: "canary", statement: CANARY, segment: "Solo founders (EE-045)", evidence: [] });

// NAIVE_PUBLISH_OUT keeps the site's own generated/ untouched.
const facts = () => {
  const p = spawnSync("node", [builder], { env: { ...process.env, NAIVE_VENTURE: v, NAIVE_PUBLISH_OUT: out }, encoding: "utf8" });
  if (p.status !== 0) throw new Error(p.stderr);
  return readFileSync(join(out, "generated/venture-facts.json"), "utf8");
};

try {
  let text = facts();
  expect("a canary in an internal field never reaches the site", !text.includes("CANARY-7f3a") && !text.includes("EE-045"), text);

  w("venture.visibility.json", { fields: { "core.promise": { visibility: "public", sha256: hash("We help founders decide what is next."), approved_by: "Founder" } } });
  text = facts();
  expect("a field a person approved as public reaches the site as written", JSON.parse(text).promise?.value === "We help founders decide what is next.", text);

  w("venture.json", { id: "canary", name: "Canary", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery", core: { promise: "We help founders decide what is next, and more." } });
  text = facts();
  expect("changed wording does not reach the site until re-approved", !JSON.parse(text).promise, text);

  w("foundation/problem.visibility.json", { fields: { statement: { visibility: "variant" } } });
  w("marketing/content/problem.mdx", "---\nvariant_of: foundation/problem.json#statement\npublish: true\napproved_by: Founder\n---\nBuilding is easy now. Knowing what to decide next is not.\n");
  text = facts();
  expect("a variant field reaches the site only as its approved public variant", JSON.parse(text).problem?.value === "Building is easy now. Knowing what to decide next is not." && !text.includes("CANARY"), text);

  // Without NAIVE_VENTURE the build copies the committed snapshot and adds Naive's phases.
  const env = { ...process.env, NAIVE_PUBLISH_OUT: out };
  delete env.NAIVE_VENTURE;
  const snap = spawnSync("node", [builder], { env, encoding: "utf8" });
  const copied = snap.status === 0 ? JSON.parse(readFileSync(join(out, "generated/venture-facts.json"), "utf8")) : null;
  const snapshot = JSON.parse(readFileSync(new URL("../facts/venture-facts.json", import.meta.url), "utf8"));
  expect("without a venture, the build writes the snapshot's facts plus Naive's phases", !!copied && copied.venture === snapshot.venture && copied.phases?.value?.length === 5, snap.stderr);
  expect("the snapshot holds no phases, so they never go stale", !("phases" in snapshot));
  const refused = spawnSync("node", [builder, "--freeze"], { env, encoding: "utf8" });
  expect("--freeze without a venture is refused", refused.status !== 0 && /needs NAIVE_VENTURE/.test(refused.stderr));
  // --freeze rewrites the snapshot; the committed one is put back after.
  const committed = readFileSync(new URL("../facts/venture-facts.json", import.meta.url), "utf8");
  try {
    const frozen = spawnSync("node", [builder, "--freeze"], { env: { ...env, NAIVE_VENTURE: v }, encoding: "utf8" });
    const written = JSON.parse(readFileSync(new URL("../facts/venture-facts.json", import.meta.url), "utf8"));
    expect("--freeze writes the venture's public facts to the snapshot, without phases", frozen.status === 0 && written.venture === "canary" && !("phases" in written) && !JSON.stringify(written).includes("CANARY"), frozen.stderr);
  } finally { writeFileSync(new URL("../facts/venture-facts.json", import.meta.url), committed); }
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("\nthe site's facts go through the gate");
