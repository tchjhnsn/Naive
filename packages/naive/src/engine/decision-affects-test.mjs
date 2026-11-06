// Tests the affects grammar in decision.schema.json (EE-089): each malformed entry below must be rejected by
// validate.py, and each well-formed one accepted, so a later edit to the schema's allOf cannot drop a rule silently
// (review of #142 at 9958f75, finding 4).
//
//   node packages/naive/src/engine/decision-affects-test.mjs

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("../../../..", import.meta.url).pathname;
if (spawnSync("python3", ["-I", "-c", "import jsonschema, referencing"]).status !== 0) {
  console.error("decision-affects-test needs the jsonschema package: pip install jsonschema");
  process.exit(2);
}
const base = JSON.parse(readFileSync(join(repo, "docs/decisions/decisions.json"), "utf8"));
const record = { ...base.decisions.find((d) => d.affects), affects: [] };
const dir = mkdtempSync(join(tmpdir(), "affects-test-"));
let failed = 0, n = 0;
const valid = (entry) => {
  const f = join(dir, `${n++}.json`);
  writeFileSync(f, JSON.stringify({ ...base, decisions: [{ ...record, affects: [entry] }] }));
  return spawnSync("python3", ["-I", join(repo, "packages/naive/src/records/validate.py"), "--schema", "decision.schema.json", "--file", f], { encoding: "utf8" }).status === 0;
};
const expect = (name, want, entry) => {
  const ok = valid(entry) === want;
  console.log(`${ok ? "pass" : "FAIL"}  ${want ? "accepts" : "rejects"} ${name}${ok ? "" : `  ${JSON.stringify(entry)}`}`);
  if (!ok) failed++;
};

expect("a repo path", true, { kind: "path", target: "packages/naive/src/terms/stale.ts", root: "repo", expect: "exists" });
expect("a workspace path", true, { kind: "path", target: "founders/*/drafts/**", root: "workspace", expect: "exists" });
expect("a venture path", true, { kind: "path", target: "functions/*/", root: "venture", expect: "exists" });
expect("a scoped term", true, { kind: "term", target: "function@finance", expect: "defined" });
expect("a record field", true, { kind: "record", target: "venture.departments", expect: "absent" });
expect("a decision", true, { kind: "decision", target: "EE-048", expect: "narrowed" });

expect("a bare string", false, "packages/naive/src/terms/**");
expect("a path with no root", false, { kind: "path", target: "knowledge/**", expect: "exists" });
expect("a path with a term's expect", false, { kind: "path", target: "knowledge/**", root: "repo", expect: "defined" });
expect("a root on a term", false, { kind: "term", target: "glossary", root: "repo", expect: "defined" });
expect("an unknown root", false, { kind: "path", target: "x/**", root: "home", expect: "exists" });
expect("an absolute path", false, { kind: "path", target: "/etc/passwd", root: "venture", expect: "exists" });
expect("a path that climbs out", false, { kind: "path", target: "../../etc/**", root: "repo", expect: "exists" });
expect("a .. segment inside a path", false, { kind: "path", target: "a/../b", root: "repo", expect: "exists" });
expect("changed, which needs a baseline", false, { kind: "record", target: "venture.functions", expect: "changed" });
expect("a term id with capitals", false, { kind: "term", target: "Glossary", expect: "defined" });
expect("a decision id that is not one", false, { kind: "decision", target: "EE-48", expect: "superseded" });
expect("an unknown field", false, { kind: "term", target: "glossary", expect: "defined", note: "x" });

rmSync(dir, { recursive: true, force: true });
console.log(failed ? `${failed} failed` : "decision affects: all pass");
process.exit(failed ? 1 : 0);
