// Checks the validation study's records across files: each interview's ICP profile exists and its consent
// was given; each feedback record names a capability and checkpoint in beta/capabilities.json; a fixed bug
// says what fixed it.
//
//   node schema/check-validation-study.mjs <dir> [--json]
//
// <dir> is a venture or a folder of ventures. Exits 1 on a failure.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { manifest } from "./beta-gate.mjs";
import { ventureFile } from "../packages/core/venture-paths.mjs";

const list = (d) => existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).map((f) => ({ f, r: JSON.parse(readFileSync(join(d, f), "utf8")) })) : [];
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === "node_modules" || e.name.startsWith(".") ? [] : e.isDirectory() ? walk(join(d, e.name)) : e.name === "venture.json" ? [d] : []);

export function check(dir) {
  const problems = [];
  const m = manifest();
  for (const { f, r } of list(ventureFile(dir, "validation/interviews"))) {
    if (r.id !== f.replace(/\.json$/, "")) problems.push(`validation/interviews/${f}: id ${r.id} is not the file name`);
    if (!r.consent?.given) problems.push(`validation/interviews/${f}: no consent given; keep only the raw source until there is`);
    if (r.icp && !existsSync(ventureFile(dir, `foundation/icp/${r.icp}.json`))) problems.push(`validation/interviews/${f}: no ICP profile ${r.icp} (foundation/icp/${r.icp}.json)`);
    if (r.follow_up?.outcome_vs_prediction && !r.prediction) problems.push(`validation/interviews/${f}: a follow-up outcome without a prediction to compare it to`);
  }
  for (const { f, r } of list(ventureFile(dir, "validation/feedback"))) {
    const cap = m.capabilities.find((c) => c.id === r.capability);
    if (!cap) problems.push(`validation/feedback/${f}: no beta capability ${r.capability}`);
    else if (cap.checkpoint.id !== r.checkpoint) problems.push(`validation/feedback/${f}: ${r.capability}'s checkpoint is ${cap.checkpoint.id}, not ${r.checkpoint}`);
  }
  for (const { f, r } of list(ventureFile(dir, "product/bugs")))
    if (r.status === "fixed" && !r.fixed_in) problems.push(`product/bugs/${f}: fixed, but fixed_in is missing`);
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = process.argv[2];
  if (!root) { console.error("usage: node schema/check-validation-study.mjs <dir> [--json]"); process.exit(2); }
  const dirs = existsSync(join(root, "venture.json")) ? [root] : walk(root);
  const problems = dirs.flatMap(check);
  if (process.argv.includes("--json")) console.log(JSON.stringify({ ok: !problems.length, problems }, null, 2));
  else console.log(problems.length ? problems.map((p) => `FAIL  ${p}`).join("\n") : `validation study records: ${dirs.length} venture(s) checked`);
  process.exit(problems.length ? 1 : 0);
}
