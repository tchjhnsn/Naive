// Checks that every element of APQC's framework a venture runs has one accountable owner (EE-187).
//
//   node packages/naive/src/checks/check-owners.ts <venture dir> [--json]
//
// The owners come from packages/naive/src/engine/element-owners.ts: the venture's operations/element-owners.json,
// inheritance from the parent, the delegation root for an activity a person performs or approves, and the function's
// agent for a category the venture lists in venture.json departments. It fails when:
//   - operations/element-owners.json does not match element-owners.schema.json;
//   - the record names an element that is not in packages/naive/src/functions/pcf.json, or one under a function the
//     venture does not list;
//   - an owner names a role that no role template has and that is not a function agent (<function>-agent);
//   - an owner names a role outside its reach: a lead outside its portfolio, a role of one function outside it;
//   - the delegation root is not a role while an activity needs it;
//   - an element under a function the venture lists has no owner.
// A person named by name is not checked against a register: Naive keeps none of people by name.
//
// Findings exit 1; a venture whose files cannot be read exits 2. --json prints { ok, errors, owned }.

import { existsSync } from "node:fs";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { validateValue } from "../records/validate.ts";
import { OWNERS, ownerInputs, ownerProblems, resolveOwners } from "../engine/element-owners.ts";

/** The findings for one venture, and how many of its elements are owned. */
export const checkOwners = (dir: string) => Effect.gen(function* () {
  const file = ventureFile(dir, OWNERS);
  const record = existsSync(file) ? yield* readJson(file).pipe(Effect.mapError((e) => new CannotRun({ message: `${OWNERS}: ${describe(e)}`, cause: e }))) : null;
  const schema = record === null ? { status: 0, stdout: "", stderr: "" } : validateValue("element-owners.schema.json", record);
  if (schema.status !== 0) return { errors: `${schema.stdout}${schema.stderr}`.trim().split("\n").map((e) => `${OWNERS}: ${e}`), owned: 0 };
  const inputs = yield* ownerInputs(dir);
  const resolved = resolveOwners(inputs);
  const listed = new Set(inputs.functions);
  return { errors: ownerProblems(inputs, resolved), owned: resolved.filter((e) => listed.has(e.function) && e.owner).length };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const [dir] = args.filter((a) => !a.startsWith("--"));
  if (!dir) { console.error("usage: node packages/naive/src/checks/check-owners.ts <venture dir> [--json]"); process.exit(2); }
  await runMain(Effect.map(checkOwners(dir), ({ errors, owned }) => {
    if (json) console.log(JSON.stringify({ ok: !errors.length, errors, owned }, null, 2));
    else for (const e of errors) console.error(`FAIL  ${e}`);
    if (errors.length) { process.exitCode = 1; return; }
    if (!json) console.log(`ok  ${owned} elements, each with one accountable owner.`);
  }));
}
