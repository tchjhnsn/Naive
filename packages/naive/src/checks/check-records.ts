#!/usr/bin/env node
// Validates one business's records against their schemas: every file in the venture whose logical path a venture
// record type's paths match (the most specific glob wins), checked with Naive's validator. It is the done criterion
// records-valid that the function workflows name. Before it, they ran `node packages/naive/src/records/validate.ts`,
// which validates the records in Naive's own checkout (its examples), so a business with a broken record passed.
//
// Held drafts (_drafts/), hidden folders, _eval/ and _private/ are not records and are skipped, and so is a nested
// venture. A record type whose form is not JSON (prose, markdown, TypeScript) is not checked here.
//
//   node packages/naive/src/checks/check-records.ts <venture dir> [--json]
//
// Exit 0 when every record is valid, 1 on a finding, 2 when the check cannot run (no venture.json).
import { Effect } from "effect";
import { join } from "node:path";
import { CannotRun } from "../core/effect/errors.ts";
import { VentureFs } from "../core/effect/fs.ts";
import { runMain } from "../core/effect/run.ts";
import { logicalFiles, ventureFile } from "../core/venture-paths.ts";
import { globRegExp, readDataModel, schemaNameOf, venturePaths } from "../records/index.ts";
import { validateValue } from "../records/validate.ts";

/** One record that failed: its logical path, its schema and the validator's lines. */
export type RecordFinding = { file: string, schema: string, errors: string[] };

const SKIP = /(^|\/)(\.[^/]*|_drafts|_eval|_private|node_modules)(\/|$)/;
const FORMS = new Set(["json", "json-list", "json-lines"]);

/** The schema that governs a logical path, or null: the most specific venture glob of a JSON record type wins. */
export function governing(): (file: string) => { schema: string, form: string } | null {
  const rules = readDataModel().records
    .filter((r) => r.schema && FORMS.has(r.form ?? "json"))
    .flatMap((r) => venturePaths(r).map((g) => ({ re: globRegExp(g), weight: g.replace(/\*\*\//g, "").replace(/\*/g, "").length, schema: String(r.schema), form: r.form ?? "json" })));
  return (file) => rules.filter((r) => r.re.test(file)).sort((a, b) => b.weight - a.weight)[0] ?? null;
}

/** Validates every record of the venture at dir and returns the findings and how many records it checked. */
export const checkRecords = (dir: string) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  if (!(yield* fs.exists(join(dir, "venture.json")))) return yield* Effect.fail(new CannotRun({ message: `${dir} has no venture.json` }));
  const schemaOf = governing();
  const findings: RecordFinding[] = [];
  let checked = 0;
  for (const file of logicalFiles(dir).filter((f) => !SKIP.test(f)).sort()) {
    const g = schemaOf(file);
    if (!g) continue;
    const name = schemaNameOf(g.schema);
    const text = yield* fs.readText(ventureFile(dir, file)).pipe(Effect.orElseSucceed(() => null));
    if (text === null) { findings.push({ file, schema: name, errors: ["cannot be read"] }); continue; }
    let docs: unknown[];
    try {
      docs = g.form === "json-lines" ? text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l) as unknown) : [JSON.parse(text) as unknown];
      if (g.form === "json-list" && Array.isArray(docs[0])) docs = docs[0];
    } catch (e) { findings.push({ file, schema: name, errors: [`(root): ${e instanceof Error ? e.message : String(e)}`] }); continue; }
    for (const d of docs) {
      checked++;
      const v = validateValue(name, d);
      if (v.status !== 0) findings.push({ file, schema: name, errors: (v.stdout + v.stderr).trim().split("\n").filter(Boolean) });
    }
  }
  return { checked, findings };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const dir = args.find((a) => !a.startsWith("--"));
  if (!dir) { console.error("usage: node packages/naive/src/checks/check-records.ts <venture dir> [--json]"); process.exit(2); }
  await runMain(Effect.map(checkRecords(dir), ({ checked, findings }) => {
    if (args.includes("--json")) console.log(JSON.stringify({ ok: findings.length === 0, checked, findings }, null, 2));
    else {
      for (const f of findings) for (const e of f.errors) console.log(`FAIL  ${f.file} (${f.schema}): ${e}`);
      console.log(`${checked} records in ${dir} checked against their schemas: ${findings.length ? `${findings.length} invalid` : "all valid"}.`);
    }
    process.exitCode = findings.length ? 1 : 0;
  }));
}
