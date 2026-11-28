// Tests the lint findings log (EE-231, packages/naive/src/engine/lint-findings.ts): lines append and read back through an
// in-memory VentureFs, a broken line is skipped, aggregate counts by rule, role and harness from a point in time, and
// the line schema takes the publish lint's lines and the artifact lint's, refusing an artifact line with no family.
//
//   node packages/naive/src/engine/lint-findings-test.ts

import { Effect, Layer } from "effect";
import { MemoryFs, memoryFs, VentureFs } from "../core/effect/fs.ts";
import { validateValue } from "../records/validate.ts";
import { aggregate, appendFindings, readFindings, type LintFinding } from "./lint-findings.ts";

let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 500)}`}`); if (!ok) failed++; };
const valid = (line: unknown) => validateValue("lint-finding.schema.json", line).status === 0;

const a1: LintFinding = { at: "2026-11-28T10:00:00.000Z", lint: "artifact", rule: "section-cited", family: "protocol", severity: "error", message: "m", artifact: "artifacts/one-pager-reading-copy.md", kind: "one-pager", role: "product-manager", harness: "claude-code" };
const a2: LintFinding = { ...a1, rule: "length", family: "design", severity: "warn", role: undefined, artifact: "artifacts/memo-reading-copy.md", kind: "memo" };
const a3: LintFinding = { ...a1, at: "2026-11-28T12:00:00.000Z" };
const p1: LintFinding = { at: "2026-11-27T09:00:00.000Z", rule: "leaks", severity: "error", message: "a leak", file: "pages/a.mdx", text: "x", published: false };

t("an artifact line matches the schema", valid(a1));
t("a publish line written before the lint field matches the schema", valid(p1));
t("an artifact line with no family is refused", !valid({ ...a1, family: undefined }));
t("an artifact line with no kind is refused", !valid({ ...a1, kind: undefined }));
t("a severity of off is refused: a rule set off writes nothing", !valid({ ...a1, severity: "off" }));

const fs = memoryFs({ "/v/.naive/lint-findings.jsonl": JSON.stringify(p1) + "\n{not json\n" });
const layer = Layer.succeed(VentureFs, fs);
const read = Effect.runSync(Effect.provide(Effect.gen(function* () {
  yield* appendFindings("/v/.naive/lint-findings.jsonl", [a1, a2]);
  yield* appendFindings("/v/.naive/lint-findings.jsonl", [a3]);
  return yield* readFindings("/v/.naive/lint-findings.jsonl");
}), layer));
t("appended lines read back after the old ones, and a broken line is skipped", read.length === 4 && read[0].rule === "leaks" && read[3].at === a3.at, read);
t("no log reads as no findings", Effect.runSync(Effect.provide(readFindings("/none.jsonl"), MemoryFs())).length === 0);
t("an empty run still creates the log", Effect.runSync(Effect.provide(Effect.gen(function* () {
  yield* appendFindings("/w/log.jsonl", []);
  return yield* (yield* VentureFs).exists("/w/log.jsonl");
}), MemoryFs())));

const byRule = aggregate(read);
t("by rule: keyed lint:rule, most findings first, a line with no lint is the publish lint's",
  byRule.groups[0].key === "artifact:section-cited" && byRule.groups[0].findings === 2 && byRule.groups[0].errors === 2 && byRule.groups[0].artifacts === 1
  && byRule.groups.some((g) => g.key === "publish:leaks"), byRule);
const byRole = aggregate(read, { by: "role" });
t("by role: a line with no role counts under (unknown)", byRole.groups.find((g) => g.key === "product-manager")?.findings === 2 && byRole.groups.find((g) => g.key === "(unknown)")?.findings === 2, byRole);
const byHarness = aggregate(read, { by: "harness", since: "2026-11-28T00:00:00.000Z" });
t("by harness since a point: older lines are left out", byHarness.findings === 3 && byHarness.groups.length === 1 && byHarness.groups[0].key === "claude-code" && byHarness.groups[0].warns === 1 && byHarness.groups[0].last === a3.at, byHarness);

console.log(failed ? `${failed} failed` : "lint findings: all pass");
process.exit(failed ? 1 : 0);
