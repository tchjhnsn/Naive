// Tests role programs (EE-237, packages/naive/src/checks/role-program.ts and role-check.ts). Over an in-memory VentureFs:
// the default program derived from a role.json (artifact types, reads, lint suites) with and without a venture, the
// architect's and the product and design lead's role.ts on a venture that passes and on one that breaks each rule, a
// check that fails or throws reported under its own id while the next still runs, a protocol finding kept an error,
// programProblems refusing an export that is not a RoleProgram for its role, and every logged line against the
// lint-finding schema. Then on disk: check-roles refusing a bad library role.ts and any venture role.ts, and
// naive role check on a copy of the software example, exiting 1 once an ADR cites no decision.
//
//   node packages/naive/src/checks/role-program-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { MemoryFs, VentureFs } from "../core/effect/fs.ts";
import { CannotRun } from "../core/effect/errors.ts";
import { loadRoles, type Role } from "../engine/agents/roles.ts";
import { catalog } from "../engine/documents.ts";
import { adapters } from "../engine/adapters.ts";
import { readDataModel } from "../records/index.ts";
import { validateValue } from "../records/validate.ts";
import { levels, type LintContext, type LintInput } from "./artifact-lint.ts";
import { checkRoles, DEFAULT_CHECKS, defaultProgram, importProgram, loadProgram, programFile, programProblems, runProgram, type RoleProgram, type RunInput, type SuiteFinding } from "./role-program.ts";
import { programFileProblems } from "./check-roles.ts";
import type { DataModel, LintFinding } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
const AT = "2026-11-28T10:00:00.000Z";
const V = "/role-program-test/v";
const lint: LintContext = { model: readDataModel() as DataModel, catalog: catalog(), adapters: adapters(), style: new Map(), voice: [], documents: [] };
const run = <A, E>(effect: Effect.Effect<A, E, "naive/VentureFs">, files: Record<string, string> = {}) => Effect.runPromise(Effect.provide(effect, MemoryFs(files)));
const input = (over: Partial<RunInput> = {}): RunInput => ({ venture: null, lint, levels: levels({}), artifacts: [], ...over });
const has = (lines: LintFinding[], rule: string, severity: string, says?: RegExp) => lines.some((l) => l.rule === rule && l.severity === severity && (!says || says.test(l.message)));
const valid = (lines: LintFinding[]) => lines.every((l) => validateValue("lint-finding.schema.json", l).status === 0);
const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

const stub = (over: Partial<Role> = {}): Role => ({ id: "stub-role", name: "Stub", kind: "agent", description: "A role for the test.", ...over } as Role);
const roles = loadRoles();
const architect = roles.get("architect") as Role;
const pdl = roles.get("product-design-lead") as Role;

// The default program, with no venture.
const clean = await run(runProgram(defaultProgram(stub({ artifacts: [{ document_kind: "adr" }, { record_type: "product-capability" }], reads: ["goal"], lint_suites: ["product/lint"] })), stub(), input(), AT));
t("a role whose artifacts, reads and suites all exist has no findings with no venture", clean.length === 0, clean);
const broken = stub({ artifacts: [{ document_kind: "memoir" }, { record_type: "memo" }], reads: ["gaol"], lint_suites: ["product/lnit"] });
const bad = await run(runProgram(defaultProgram(broken), broken, input(), AT));
t("kind-exists: an artifact that is no document kind is a protocol error", has(bad, "kind-exists", "error", /memoir/), bad);
t("kind-exists: an artifact that is no record type is a protocol error", has(bad, "kind-exists", "error", /memo in/), bad);
t("reads-known: a record type the data model lacks is a protocol error", has(bad, "reads-known", "error", /gaol/), bad);
t("suite-known: a lint suite that is no command route is a protocol error", has(bad, "suite-known", "error", /product\/lnit/), bad);
t("every finding is a role line naming the role, and matches the schema", bad.every((l) => l.lint === "role" && l.role === "stub-role" && l.family === "protocol") && valid(bad), bad);

// The default program in a venture: reads present, suites run, the venture's artifacts linted.
const suites = (out: SuiteFinding[]) => () => Effect.succeed(out);
const reader = stub({ reads: ["goal"], lint_suites: ["product/lint"] });
const empty = await run(runProgram(defaultProgram(reader), reader, input({ venture: V, runSuite: suites([{ rule: "product-no-icp", mode: "fail-open", file: "products/cli.json", message: "offered to no ICP profile" }, { rule: "feature-no-job", mode: "fail-closed", file: "products/cli.json", message: "a feature serves no job" }]) }), AT));
t("reads-present: a record type the venture holds none of is a design warning", has(empty, "reads-present", "warn", /goal/), empty);
t("a suite's fail-open finding is a design warning naming the suite and file", empty.some((l) => l.rule === "product-no-icp" && l.family === "design" && l.severity === "warn" && l.message === "product/lint: products/cli.json offered to no ICP profile" && l.artifact === "products/cli.json"), empty);
t("a suite's fail-closed finding is an error", has(empty, "feature-no-job", "error"), empty);
const held = await run(runProgram(defaultProgram(reader), reader, input({ venture: V, runSuite: suites([]) }), AT), { [`${V}/foundation/goals/scale.json`]: json({ id: "scale" }) });
t("a venture holding a record of each type it reads, and a clean suite, give no findings", held.length === 0, held);
const adrInput: LintInput = { path: "artifacts/adr-reading-copy.json", ref: { document_kind: "adr" }, format: "pptx" };
const writer = stub({ artifacts: [{ document_kind: "adr" }] });
const linted = await run(runProgram(defaultProgram(writer), writer, input({ venture: V, artifacts: [adrInput, { ...adrInput, path: "artifacts/other.json", role: "builder" }, { ...adrInput, path: "artifacts/memo.json", ref: { document_kind: "memo" } }] }), AT));
t("the artifact lint runs on the venture's artifacts of a kind the role names, with its rule's family", linted.some((l) => l.rule === "format-allowed" && l.family === "protocol" && l.severity === "error" && l.artifact === "artifacts/adr-reading-copy.json"), linted);
t("an artifact another role made, or of a kind the role does not name, is left to that role", !linted.some((l) => l.artifact === "artifacts/other.json" || l.artifact === "artifacts/memo.json"), linted);

// A check that fails or throws, and a protocol finding marked warn.
const odd: RoleProgram = { id: "stub-role", checks: [
  { id: "fails", description: "fails", run: () => Effect.fail(new CannotRun({ message: "no tool" })) },
  { id: "throws", description: "throws", run: () => { throw new Error("boom"); } },
  { id: "lies", description: "marks a protocol finding warn", run: () => Effect.succeed([{ rule: "lies", family: "protocol", severity: "warn", message: "m" }]) },
] };
const oddLines = await run(runProgram(odd, stub(), input(), AT));
t("a check that fails is a protocol error under its own id", has(oddLines, "fails", "error", /could not run/), oddLines);
t("a check that throws is a protocol error under its own id, and the checks after it still run", has(oddLines, "throws", "error", /could not run/) && oddLines.some((l) => l.rule === "lies"), oddLines);
t("a protocol finding is always an error, whatever severity the check gave it", has(oddLines, "lies", "error"), oddLines);

// programProblems.
const fn = () => Effect.succeed([]);
t("a valid program for its role has no problems", programProblems({ id: "x", checks: [{ id: "c", description: "d", run: fn }] }, "x").length === 0);
t("a program whose id is another role's is refused", programProblems({ id: "y", checks: [] }, "x").some((p) => /not the role's id x/.test(p)));
t("a program that repeats a default check is refused: role.ts extends, never replaces", programProblems({ id: "x", checks: [{ id: DEFAULT_CHECKS[0].id, description: "d", run: fn }] }, "x").some((p) => /default check/.test(p)));
t("a check with no run function or description is refused", programProblems({ id: "x", checks: [{ id: "c" }] }, "x").length === 2);
t("an export that is not an object is refused", programProblems(undefined, "x").length === 1);

// The library programs load and extend the default.
const loaded = await run(loadProgram("architect"));
t("the architect's program is the default checks then its role.ts's", loaded.program.checks.map((c) => c.id).join(",") === "artifact-types,reads,lint-suites,adr-cites-decision" && loaded.source === "packages/naive/src/roles/architect/role.ts", loaded);
t("a role with no role.ts has the default program", programFile("founder") === null && (await run(loadProgram("founder"))).program.checks.length === DEFAULT_CHECKS.length);
t("an unknown role is NotFound", await run(loadProgram("nobody")).then(() => false, (e) => e?._tag === "NotFound"));

// The architect's role.ts: every adr artifact is built from a decision record that exists.
const archProgram = await Effect.runPromise(importProgram(programFile("architect") as string, "architect"));
const adr = (built: string[]) => json({ id: "adr-reading-copy", kind: "document", title: "ADR", document_kind: "adr", format: "md", built_at: AT, built_from: built.map((record) => ({ record })) });
const adrOk: LintInput = { path: "artifacts/adr-reading-copy.json", ref: { document_kind: "adr" }, format: "md" };
const arch = (files: Record<string, string>) => run(runProgram(archProgram, architect, input({ venture: V, artifacts: [adrOk], runSuite: suites([]) }), AT), { [`${V}/decisions/release.decision.json`]: json({ id: "release" }), ...files });
const archOk = await arch({ [`${V}/artifacts/adr-reading-copy.json`]: adr(["decisions/release.decision.json"]) });
t("architect: an ADR built from a decision record the venture has passes", !archOk.some((l) => l.rule === "adr-cites-decision"), archOk);
const archNone = await arch({ [`${V}/artifacts/adr-reading-copy.json`]: adr(["foundation/problem.json"]) });
t("architect: an ADR built from no decision record is a protocol error", has(archNone, "adr-cites-decision", "error", /no decision record/), archNone);
const archGone = await arch({ [`${V}/artifacts/adr-reading-copy.json`]: adr(["decisions/gone.decision.json"]) });
t("architect: an ADR built from a decision the venture does not have is a protocol error", has(archGone, "adr-cites-decision", "error", /gone\.decision\.json/), archGone);

// The product and design lead's role.ts: every live or building capability names a goal that exists.
const pdlProgram = await Effect.runPromise(importProgram(programFile("product-design-lead") as string, "product-design-lead"));
const cap = (id: string, over: Record<string, unknown> = {}) => [`${V}/product/capabilities/${id}.json`, json({ id, name: id, product: "cli", kind: "capability", parent: null, owner: "x", status: "live", ...over })];
const pdlLines = await run(runProgram(pdlProgram, pdl, input({ venture: V, runSuite: suites([]) }), AT), Object.fromEntries([
  [`${V}/foundation/goals/scale.json`, json({ id: "scale" })],
  cap("served", { goals: ["scale/weekly-users"] }), cap("unserved"), cap("dangling", { goals: ["growth"] }),
  cap("group", { kind: "category" }), cap("old", { status: "retired" }),
]));
const about = (rule: string) => pdlLines.filter((l) => l.rule === rule).map((l) => l.artifact).join(",");
t("product-design-lead: a capability with no goal is a design warning", about("capability-names-goal") === "product/capabilities/unserved.json" && has(pdlLines, "capability-names-goal", "warn"), pdlLines);
t("product-design-lead: a goal the venture lacks is a protocol error", about("capability-goal-exists") === "product/capabilities/dangling.json" && has(pdlLines, "capability-goal-exists", "error", /growth/), pdlLines);
t("product-design-lead: a goal/measure resolves by its goal, and a category or retired capability is not asked", !pdlLines.some((l) => /\/(served|group|old)\.json$/.test(l.artifact ?? "")), pdlLines);

// checkRoles appends every line to the venture's log, against the schema.
const files = { [`${V}/venture.json`]: json({ id: "v" }), [`${V}/artifacts/adr-reading-copy.json`]: adr(["foundation/problem.json"]) };
const logged = await Effect.runPromise(Effect.provide(Effect.gen(function* () {
  const r = yield* checkRoles(["architect", "founder"], { venture: V, at: AT, config: {}, runSuite: suites([]) });
  const text = yield* (yield* VentureFs).readText(`${V}/.naive/lint-findings.jsonl`);
  return { r, lines: text.split("\n").filter(Boolean).map((l) => JSON.parse(l) as LintFinding) };
}), MemoryFs(files)));
t("checkRoles logs every finding as a role line that matches the schema", logged.lines.length === logged.r.findings.length && logged.lines.length > 0 && valid(logged.lines) && logged.lines.every((l) => l.lint === "role"), logged);
t("checkRoles counts the errors (an ADR with no decision)", logged.r.errors >= 1 && has(logged.lines, "adr-cites-decision", "error"), logged.r);

// On disk: check-roles and naive role check.
const tmp = mkdtempSync(join(tmpdir(), "role-program-test-"));
try {
  const root = join(tmp, "root");
  const role = (id: string, ts: string | null) => { mkdirSync(join(root, "packages/naive/src/roles", id), { recursive: true }); writeFileSync(join(root, "packages/naive/src/roles", id, "role.json"), json({ id })); if (ts !== null) writeFileSync(join(root, "packages/naive/src/roles", id, "role.ts"), ts); };
  role("good", `export default { id: "good", checks: [{ id: "c", description: "d", run: () => null }] };\n`);
  role("wrong-id", `export default { id: "other", checks: [] };\n`);
  role("no-export", `export const x = 1;\n`);
  role("plain", null);
  const venture = join(tmp, "venture");
  mkdirSync(join(venture, "governance/roles/local"), { recursive: true });
  writeFileSync(join(venture, "governance/roles/local/role.ts"), "export default {};\n");
  const problems = await programFileProblems(root, venture);
  t("check-roles passes a valid library role.ts and a role with none", !problems.some((p) => /\/good\/|\/plain\//.test(p)), problems);
  t("check-roles refuses a role.ts whose id is not its role's", problems.some((p) => p.startsWith("packages/naive/src/roles/wrong-id/role.ts") && /not the role's id wrong-id/.test(p)), problems);
  t("check-roles refuses a role.ts with no default export", problems.some((p) => p.startsWith("packages/naive/src/roles/no-export/role.ts")), problems);
  t("check-roles refuses any role.ts in a venture", problems.some((p) => p.startsWith("governance/roles/local/role.ts") && /never loads code/.test(p)), problems);
  t("check-roles passes Naive's own library", (await programFileProblems(repo)).length === 0, await programFileProblems(repo));

  const relay = join(tmp, "relay");
  cpSync(join(repo, "packages/naive/src/records/examples/software/ventures/relay"), relay, { recursive: true });
  spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/render-document.ts"), relay, "adr"], { encoding: "utf8" });
  const cli = (...args: string[]) => spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/naive.ts"), "role", "check", ...args], { encoding: "utf8" });
  const okRun = cli("architect", "--venture", relay, "--json");
  t("naive role check passes the architect on a rendered ADR built from decisions", okRun.status === 0 && JSON.parse(okRun.stdout).errors === 0, okRun.stdout + okRun.stderr);
  const artifact = join(relay, "artifacts/adr-reading-copy.json");
  writeFileSync(artifact, readFileSync(artifact, "utf8").replace(/"record": "decisions\/[^"]+"/g, '"record": "foundation/problem.json"'));
  const badRun = cli("architect", "--venture", relay);
  t("naive role check exits 1 once the ADR cites no decision, and says so", badRun.status === 1 && /adr-cites-decision/.test(badRun.stdout), badRun.stdout + badRun.stderr);
  const log = readFileSync(join(relay, ".naive/lint-findings.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as LintFinding);
  t("its findings are in the venture's lint findings log", log.some((l) => l.lint === "role" && l.rule === "adr-cites-decision") && valid(log), log.slice(-3));
  const report = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/lint-findings.ts"), relay, "--by", "role", "--json"], { encoding: "utf8" });
  t("naive lint report counts the role lint's findings by role", report.status === 0 && JSON.parse(report.stdout).groups.some((g: { key: string }) => g.key === "architect"), report.stdout);
  const allRun = cli("--all", "--venture", relay, "--json");
  t("naive role check --all runs every library role", allRun.status === 1 && JSON.parse(allRun.stdout).roles.length === roles.size, allRun.stdout.slice(0, 300));
  t("naive role check needs one role or --all", cli().status === 2 && cli("architect", "--all").status === 2);
} finally { rmSync(tmp, { recursive: true, force: true }); }

console.log(failed ? `${failed} failed` : "role programs: all passed");
process.exit(failed ? 1 : 0);
