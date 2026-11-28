// Tests the artifact lint (EE-231, packages/naive/src/checks/artifact-lint.ts) on a copy of the software example:
// naive render writes real reading copies, the lint passes them, then each rule is broken on a copy of the input and
// must name itself with its family and severity. The design levels come from artifact_lint.rules, a protocol rule
// stays an error whatever the config says, check-config refuses an unknown rule or level, every finding lands in
// .naive/lint-findings.jsonl against its schema with the artifact's role and harness, and naive lint report counts it.
//
//   node packages/naive/src/checks/artifact-lint-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { catalog } from "../engine/documents.ts";
import { adapters } from "../engine/adapters.ts";
import { readDataModel, schemaFile } from "../records/index.ts";
import { validateValue } from "../records/validate.ts";
import { configProblems, DESIGN_RULES, levels, lintArtifact, type Finding, type LintContext, type LintInput } from "./artifact-lint.ts";
import type { DataModel } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const EXAMPLE = join(repo, "packages/naive/src/records/examples/software/ventures/relay");
const node = (script: string, args: string[]) => {
  const r = spawnSync(process.execPath, [join(repo, script), ...args], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr };
};
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };

const tmp = mkdtempSync(join(tmpdir(), "artifact-lint-test-"));
const v = join(tmp, "relay");
cpSync(EXAMPLE, v, { recursive: true });
for (const k of ["one-pager", "adr"]) node("packages/naive/src/engine/render-document.ts", [v, k]);
const onePager = readFileSync(join(v, "artifacts/one-pager-reading-copy.md"), "utf8");
const adr = readFileSync(join(v, "artifacts/adr-reading-copy.md"), "utf8");

const c = catalog();
const ctx: LintContext = { model: readDataModel() as DataModel, catalog: c, adapters: adapters(), style: new Map(), voice: [], documents: [] };
const brand = { path: "marketing/brand.json", body: { name: "Relay", voice: { tone: ["plain"], rules: [] }, fonts: { body: { family: "Inter" } }, typefaces: [{ family: "Inter" }], colors: { ink: "#111" }, marks: [{ id: "logo" }] } };
const branded: LintContext = { ...ctx, style: new Map([["marketing-brand", brand]]) };
const warnAll = levels({});
const doc = (over: Partial<LintInput> = {}): LintInput => ({ path: "artifacts/one-pager-reading-copy.json", ref: { document_kind: "one-pager" }, format: "md", text: onePager, output: "artifacts/one-pager-reading-copy.md", ...over });
const run = (input: LintInput, context: LintContext = branded, lv = warnAll) => lintArtifact(input, context, lv);
const has = (fs: Finding[], rule: string, family: string, severity: string, says?: RegExp) => fs.some((f) => f.rule === rule && f.family === family && f.severity === severity && (!says || says.test(f.message)));

// A real reading copy passes.
t("a rendered one-pager with its brand filled has no findings", run(doc()).length === 0, run(doc()));
t("a rendered adr (one declared hole) has no findings", run(doc({ path: "artifacts/adr-reading-copy.json", ref: { document_kind: "adr" }, text: adr })).length === 0, run(doc({ ref: { document_kind: "adr" }, text: adr })));

// Protocol rules: always errors.
t("kind-exists: a document kind the catalog lacks", has(run(doc({ ref: { document_kind: "memoir" } })), "kind-exists", "protocol", "error", /memoir/));
t("kind-exists: a record type the data model lacks", has(run({ path: "x.json", ref: { record_type: "memo" } }), "kind-exists", "protocol", "error", /memo/));
t("kind-exists: a record type the data model has passes", run({ path: "foundation/problem.json", ref: { record_type: "validation-problem" } }).length === 0, run({ path: "foundation/problem.json", ref: { record_type: "validation-problem" } }));
t("format-allowed: a format the kind is not made as", has(run(doc({ format: "pptx", text: undefined })), "format-allowed", "protocol", "error", /not made as/));
t("format-allowed: a harness no adapter names", has(run(doc({ harness: "notepad" })), "format-allowed", "protocol", "error", /notepad/));
t("format-allowed: a harness whose artifacts list does not yield the format", has(run(doc({ format: "pdf", text: undefined, harness: "codex" })), "format-allowed", "protocol", "error", /codex lists no artifact/));
t("format-allowed: a harness that yields the format passes", !run(doc({ format: "pdf", text: undefined, harness: "claude-code" })).some((f) => f.rule === "format-allowed"));
t("sections-present: a Markdown artifact with no rendered copy", has(run(doc({ text: null })), "sections-present", "protocol", "error", /no rendered copy/));
t("sections-present: a required section missing", has(run(doc({ text: onePager.replace(/## Why now\n\n[^\n]*\n\nSource: [^\n]*\n\n/, "") })), "sections-present", "protocol", "error", /Why now/));
t("section-cited: a fact with no Source line", has(run(doc({ text: onePager.replace("Source: `foundation/problem.json` (`cost`)", "") })), "section-cited", "protocol", "error", /cites no record/));
t("section-cited: a Source naming a record the section does not read", has(run(doc({ text: onePager.replace("Source: `foundation/problem.json` (`cost`)", "Source: `foundation/goals.json` (`cost`)") })), "section-cited", "protocol", "error", /not a record it reads/));
t("section-cited: a Source naming another field", has(run(doc({ text: onePager.replace("Source: `foundation/problem.json` (`cost`)", "Source: `foundation/problem.json` (`statement`)") })), "section-cited", "protocol", "error", /not cost/));
t("section-cited: a declared hole filled in with a fact", has(run(doc({ ref: { document_kind: "adr" }, text: adr.replace(/(## Consequences\n\n)_Not recorded:[^\n]*/, "$1It will be fine.") })), "section-cited", "protocol", "error", /declared hole/));
t("section-cited: a section the kind does not define", has(run(doc({ text: onePager.replace("## Why now", "## Our secret sauce\n\nWe are the best.\n\n## Why now") })), "section-cited", "protocol", "error", /does not define/));
const ladderCtx = (approved?: string): LintContext => ({ ...branded, documents: [{ file: "artifacts/site-copy-reading-copy.json", kind: "site-copy", format: "md", approved_by: approved }] });
const html = doc({ path: "artifacts/site-copy-interactive.json", ref: { document_kind: "site-copy" }, format: "html", text: undefined });
t("ladder: an interactive page with no reading copy", has(run(html), "ladder", "protocol", "error", /no reading-copy/));
t("ladder: an interactive page over a reading copy no person approved", has(run(html, ladderCtx()), "ladder", "protocol", "error", /no approved_by/));
t("ladder: an interactive page over an approved reading copy passes", !run(html, ladderCtx("torian")).some((f) => f.rule === "ladder"));

// Design rules: warn by default, set by artifact_lint.rules.
t("style-filled: the venture has no brand record", has(run(doc(), ctx), "style-filled", "design", "warn", /does not have/));
t("style-filled: a brand field is empty", has(run(doc(), { ...ctx, style: new Map([["marketing-brand", { ...brand, body: { ...brand.body, colors: {} } }]]) }), "style-filled", "design", "warn", /colors, which is empty/));
t("voice-terms: a phrase the voice avoids", has(run(doc(), { ...branded, voice: [{ id: "no-ship", avoid: "ship", use: "release" }] }), "voice-terms", "design", "warn", /"ship".*use release/));
t("heading-levels: two titles", has(run(doc({ text: onePager + "\n# Again\n" })), "heading-levels", "design", "warn", /has 2/));
t("heading-levels: a skipped level", has(run(doc({ text: onePager.replace("## Why now", "#### Why now") })), "heading-levels", "design", "warn", /level 4 heading under a level 2/));
t("length: over words_per_page times pages", has(run(doc({ text: onePager.replace("## Why now\n\n", `## Why now\n\n${"word ".repeat(500)}\n\n`) })), "length", "design", "warn", /over the 400/));
const off = levels({ artifact_lint: { rules: { "style-filled": "off", length: "error" } } });
t("levels: a design rule set off writes nothing, one set error is an error", !run(doc(), ctx, off).some((f) => f.rule === "style-filled")
  && has(run(doc({ text: onePager + "word ".repeat(500) }), branded, off), "length", "design", "error"));
t("levels: a protocol rule stays an error whatever the config says", has(run(doc({ text: null }), branded, off), "sections-present", "protocol", "error"));

// The config.
t("configProblems: a protocol rule, an unknown rule and a bad level are each refused",
  configProblems({ "kind-exists": "off", nope: "warn", length: "loud" }).length === 3 && configProblems({ length: "error" }).length === 0);
const schema = JSON.parse(readFileSync(schemaFile("naive-config"), "utf8"));
const schemaRules = Object.keys(schema.properties.artifact_lint.properties.rules.properties);
t("the config schema lists exactly the design rules", schemaRules.join() === [...DESIGN_RULES].join(), schemaRules);
writeFileSync(join(v, "naive.config.json"), JSON.stringify({ artifact_lint: { rules: { ladder: "off", length: "loud" } } }));
const cc = node("packages/naive/src/checks/check-config.ts", [v]);
t("check-config refuses a protocol rule and a bad level", cc.status === 1 && /ladder: a protocol rule/.test(cc.out) && /length: "loud"/.test(cc.out), cc);
rmSync(join(v, "naive.config.json"));

// The venture run: every finding logged against the schema, with role and harness; an error exits 1.
const record = JSON.parse(readFileSync(join(v, "artifacts/one-pager-reading-copy.json"), "utf8"));
writeFileSync(join(v, "artifacts/one-pager-reading-copy.json"), JSON.stringify({ ...record, role: "product-manager", harness: "claude-code" }));
writeFileSync(join(v, "artifacts/one-pager-reading-copy.md"), onePager.replace("Source: `foundation/problem.json` (`cost`)", ""));
mkdirSync(join(v, "artifacts"), { recursive: true });
writeFileSync(join(v, "artifacts/dashboard.json"), JSON.stringify({ id: "dashboard", kind: "dashboard", title: "D", built_from: [{ record: "venture.json" }], built_at: "2026-11-28T00:00:00Z" }));
const lint = node("packages/naive/src/checks/artifact-lint.ts", [v, "--json"]);
const out = JSON.parse(lint.out.slice(lint.out.indexOf("{")));
t("lint artifacts exits 1 on an error and skips an artifact with no declared type", lint.status === 1 && out.artifacts === 2 && out.skipped === 1, out);
const lines = readFileSync(join(v, ".naive/lint-findings.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
t("every finding is logged, warns included, and each line matches lint-finding.schema.json",
  lines.length === out.findings.length && lines.some((l) => l.severity === "warn") && lines.every((l) => validateValue("lint-finding.schema.json", l).status === 0), lines);
t("a logged line carries the artifact's kind, role and harness", lines.some((l) => l.rule === "section-cited" && l.kind === "one-pager" && l.role === "product-manager" && l.harness === "claude-code"), lines);
const report = node("packages/naive/src/interfaces/cli/naive.ts", ["lint", "report", "--venture", v, "--by", "role", "--json"]);
const r = JSON.parse(report.out);
t("naive lint report counts by role", report.status === 0 && r.groups.some((g: { key: string; errors: number }) => g.key === "product-manager" && g.errors >= 1), r);
const viaCli = node("packages/naive/src/interfaces/cli/naive.ts", ["lint", "artifacts", v]);
t("naive lint artifacts takes the venture directory", viaCli.status === 1 && /section-cited/.test(viaCli.out), viaCli);

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `${failed} failed` : "artifact lint: all pass");
process.exit(failed ? 1 : 0);
