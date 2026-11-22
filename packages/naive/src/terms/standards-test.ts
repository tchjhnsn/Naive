// Checks the catalog of standards (EE-150): packages/naive/src/terms/standards/<id>.json holds one outside standard per
// file, with what we take from it, its status, the nouns and record types that use it and the gaps found in it.
//
//   node packages/naive/src/terms/standards-test.ts               fixture cases, then the repository
//   node packages/naive/src/terms/standards-test.ts --root <dir>  one tree only, exit 1 on any problem
//
// The schema (packages/naive/src/records/standard.schema.json) is checked by packages/naive/src/records/validate.mjs.
// This checks what crosses files:
//   S1 every file parses and its id is its file name;
//   S2 every noun it names is a noun in packages/naive/src/terms/ontology.json that is not retired;
//   S3 every record type it names is a record type in packages/naive/src/records/data-model.json;
//   S4 an adopted or mapped standard names at least one noun or record type that uses it;
//   S5 a standard not yet confirmed at its url (checked is null) says why in note.
// Fails closed: a file that cannot be read or parsed is a failure, never a pass. It decides references and shape,
// never whether a thing falls under a term, so it does not reach the EE-095 engine.

import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DataModel, OntologyMetamodel, Standard } from "../records/types/records.d.ts";

const STANDARDS = "packages/naive/src/terms/standards";
const ONTOLOGY = "packages/naive/src/terms/ontology.json";
const DATA_MODEL = "packages/naive/src/records/data-model.json";

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, "utf8"));

/** Every problem in one tree, as lines; an empty list is a pass. */
export function check(root: string): string[] {
  const problems: string[] = [];
  let nouns: Set<string>;
  let types: Set<string>;
  try {
    const ontology = readJson(join(root, ONTOLOGY)) as OntologyMetamodel;
    nouns = new Set(ontology.nouns.filter((n) => n.status !== "retired").map((n) => n.noun));
    const model = readJson(join(root, DATA_MODEL)) as DataModel;
    types = new Set(model.records.map((r) => r.id));
  } catch (error) {
    return [`cannot read the ontology or the data model: ${error instanceof Error ? error.message : String(error)}`];
  }
  let files: string[];
  try {
    files = readdirSync(join(root, STANDARDS)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [`${STANDARDS} cannot be read`];
  }
  if (files.length === 0) problems.push(`${STANDARDS} holds no standard`);
  for (const file of files) {
    const where = `${STANDARDS}/${file}`;
    let s: Standard;
    try {
      s = readJson(join(root, where)) as Standard;
    } catch (error) {
      problems.push(`${where}: does not parse (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    if (s.id !== file.replace(/\.json$/, "")) problems.push(`S1 ${where}: id ${JSON.stringify(s.id)} is not its file name`);
    const used = s.used_by ?? { nouns: [], record_types: [] };
    for (const noun of used.nouns ?? []) {
      if (!nouns.has(noun)) problems.push(`S2 ${where}: names noun ${JSON.stringify(noun)}, which is not a live noun in ${ONTOLOGY}`);
    }
    for (const type of used.record_types ?? []) {
      if (!types.has(type)) problems.push(`S3 ${where}: names record type ${JSON.stringify(type)}, which is not in ${DATA_MODEL}`);
    }
    if ((s.status === "adopted" || s.status === "mapped") && (used.nouns ?? []).length + (used.record_types ?? []).length === 0) {
      problems.push(`S4 ${where}: is ${s.status} but names no noun or record type that uses it`);
    }
    if (s.checked === null && !s.note) problems.push(`S5 ${where}: is not confirmed at its url and its note does not say why`);
  }
  return problems;
}

/** A copy of the three inputs in a temporary tree, with one standard replaced or added. */
function fixture(repo: string, name: string, record: unknown): string {
  const dir = mkdtempSync(join(tmpdir(), "standards-"));
  for (const path of [ONTOLOGY, DATA_MODEL]) {
    mkdirSync(join(dir, path, ".."), { recursive: true });
    writeFileSync(join(dir, path), readFileSync(join(repo, path)));
  }
  mkdirSync(join(dir, STANDARDS), { recursive: true });
  for (const file of readdirSync(join(repo, STANDARDS)).filter((f) => f.endsWith(".json"))) {
    writeFileSync(join(dir, STANDARDS, file), readFileSync(join(repo, STANDARDS, file)));
  }
  writeFileSync(join(dir, STANDARDS, name), typeof record === "string" ? record : JSON.stringify(record));
  return dir;
}

function main(): void {
  const args = process.argv.slice(2);
  const at = args.indexOf("--root");
  if (at >= 0) {
    const problems = check(args[at + 1] ?? ".");
    for (const p of problems) console.log(p);
    process.exit(problems.length === 0 ? 0 : 1);
  }
  const repo = process.cwd();
  const base = readJson(join(repo, STANDARDS, "prov-o.json")) as Standard;
  const cases: [string, string, unknown, string][] = [
    ["S1 an id that is not the file name fails", "other.json", { ...base, id: "not-other" }, "S1"],
    ["S2 a noun that does not exist fails", "prov-o.json", { ...base, used_by: { nouns: ["no-such-noun"], record_types: [] } }, "S2"],
    ["S3 a record type that does not exist fails", "prov-o.json", { ...base, used_by: { nouns: [], record_types: ["no-such-type"] } }, "S3"],
    ["S4 a mapped standard with no user fails", "prov-o.json", { ...base, used_by: { nouns: [], record_types: [] } }, "S4"],
    ["S5 an unconfirmed standard with no note fails", "prov-o.json", { ...base, checked: null, note: undefined }, "S5"],
    ["a file that does not parse fails", "broken.json", "{ not json", "does not parse"],
  ];
  let failed = 0;
  for (const [title, name, record, expect] of cases) {
    const dir = fixture(repo, name, record);
    try {
      const problems = check(dir);
      const ok = problems.some((p) => p.includes(expect));
      console.log(`${ok ? "ok" : "FAIL"} fixture: ${title}`);
      if (!ok) failed++;
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
  const problems = check(repo);
  for (const p of problems) console.log(`FAIL ${p}`);
  console.log(`${problems.length === 0 ? "ok" : "FAIL"} repository: ${STANDARDS}`);
  if (failed > 0 || problems.length > 0) process.exit(1);
}

main();
