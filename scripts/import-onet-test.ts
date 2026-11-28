// Tests scripts/import-onet.ts (EE-232) on a tiny O*NET release written in the test, never a download: the release
// writes exactly the expected bytes, sorted and one entry per line, and the same bytes on a rerun and from its rows in
// another order; a release before 30.1, whose DWA titles are in DWA Reference.txt, gives the same reference; and a
// release the script cannot use is refused. The committed packages/naive/src/functions/onet.json is checked against
// its schema by packages/naive/src/records/validate.ts.
//
//   node scripts/import-onet-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Onet } from "../packages/naive/src/records/types/records.d.ts";

const repo = new URL("..", import.meta.url).pathname;
const SCRIPT = join(repo, "scripts/import-onet.ts");
const FILE = "packages/naive/src/functions/onet.json";
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "import-onet-test-"));
let n = 0;

type Files = Record<string, string[][]>;
const tsv = (rows: string[][]) => rows.map((r) => r.join("\t")).join("\r\n") + "\r\n";
const occupations = [["O*NET-SOC Code", "Title", "Description"], ["15-1252.00", "Software Developers", "Research, design, and develop software."], ["11-3031.00", "Financial Managers", "Plan, direct, or coordinate accounting."], ["11-1011.00", "Chief Executives", "Determine and formulate policies."]];
const tasks = [["O*NET-SOC Code", "Task ID", "DWA Element ID", "Date", "Domain Source"], ["15-1252.00", "1", "4.A.3.b.1.b.1", "07/2014", "Analyst"], ["11-3031.00", "2", "4.A.2.a.4.g.9", "07/2014", "Analyst"], ["11-1011.00", "3", "4.A.2.a.4.g.9", "07/2014", "Analyst"], ["11-1011.00", "4", "4.A.2.b.4.a.1", "07/2014", "Analyst"], ["11-1011.00", "5", "4.A.2.a.4.g.9", "07/2014", "Analyst"]];
const gwas = [["GWA Element ID", "IWA Element ID", "DWA Element ID", "DWA Element Name"], ["4.A.3.b.1", "4.A.3.b.1.b", "4.A.3.b.1.b.1", "Develop computer or online applications."], ["4.A.2.b.4", "4.A.2.b.4.a", "4.A.2.b.4.a.1", "Direct organizational operations, projects, or services."], ["4.A.2.a.4", "4.A.2.a.4.g", "4.A.2.a.4.g.9", "Analyze financial records or reports."]];
const release: Files = { "Occupation Data.txt": occupations, "Tasks to DWAs.txt": tasks, "GWAs to IWAs to DWAs.txt": gwas };
const readme = "O*NET 31.0 Database\r\nAugust 2026 Release\r\n-------------------\r\n";

/** A root and an O*NET folder holding `files`, run through the script with `extra` arguments. */
function run(files: Files, extra: string[] = ["--release", "31.0"], withReadme = true) {
  const root = join(tmp, `r-${++n}`), db = join(root, "db");
  mkdirSync(db, { recursive: true });
  mkdirSync(dirname(join(root, FILE)), { recursive: true });
  for (const [name, rows] of Object.entries(files)) writeFileSync(join(db, name), tsv(rows));
  if (withReadme) writeFileSync(join(db, "Read Me.txt"), readme);
  const go = () => spawnSync(process.execPath, [SCRIPT, db, ...extra, "--root", root], { encoding: "utf8" });
  const r = go();
  return { status: r.status, out: r.stdout + r.stderr, again: go, written: () => readFileSync(join(root, FILE), "utf8") };
}

const ATTRIBUTION = "This file includes information from the O*NET 31.0 Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is a trademark of USDOL/ETA. Naive has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.";
const first = run(release);
const body = first.status === 0 ? first.written() : "";
const expectedTail = `  "dwas": [
    {"id": "4.A.2.a.4.g.9", "title": "Analyze financial records or reports."},
    {"id": "4.A.2.b.4.a.1", "title": "Direct organizational operations, projects, or services."},
    {"id": "4.A.3.b.1.b.1", "title": "Develop computer or online applications."}
  ],
  "occupations": [
    {"code": "11-1011.00", "title": "Chief Executives", "dwas": ["4.A.2.a.4.g.9","4.A.2.b.4.a.1"]},
    {"code": "11-3031.00", "title": "Financial Managers", "dwas": ["4.A.2.a.4.g.9"]},
    {"code": "15-1252.00", "title": "Software Developers", "dwas": ["4.A.3.b.1.b.1"]}
  ]
}
`;
t("a tiny release writes its activities and occupations sorted, one per line, with no description", first.status === 0 && body.endsWith(expectedTail) && !body.includes("Research, design"), { out: first.out, body });
const parsed = first.status === 0 ? JSON.parse(body) as Onet : null;
t("the header names the release, the month from Read Me.txt, the source and O*NET's attribution", parsed?.release === "31.0" && parsed.published === "2026-08" && parsed.source === "onet-database" && parsed.attribution === ATTRIBUTION, parsed);
const rerun = first.again();
t("a rerun on the same release writes the same bytes", rerun.status === 0 && first.written() === body, rerun.stderr);
const shuffled = run({ "Occupation Data.txt": [occupations[0], ...occupations.slice(1).reverse()], "Tasks to DWAs.txt": [tasks[0], ...tasks.slice(1).reverse()], "GWAs to IWAs to DWAs.txt": [gwas[0], ...gwas.slice(1).reverse()] });
t("the same release with its rows in another order writes the same bytes", shuffled.status === 0 && shuffled.written() === body, shuffled.out);
const reordered = run({ ...release, "Occupation Data.txt": occupations.map(([c, ti, d]) => [ti, d, c]) });
t("columns are read by their header, so another column order writes the same bytes", reordered.status === 0 && reordered.written() === body, reordered.out);
const older = run({ "Occupation Data.txt": occupations, "Tasks to DWAs.txt": tasks, "DWA Reference.txt": [["Element ID", "IWA ID", "DWA ID", "DWA Title"], ...gwas.slice(1)] });
t("a release before 30.1 reads the DWA titles from DWA Reference.txt and writes the same bytes", older.status === 0 && older.written() === body, older.out);
const noReadme = run(release, undefined, false);
t("with no Read Me.txt the reference has no published month and is still valid", noReadme.status === 0 && !("published" in (JSON.parse(noReadme.written()) as Onet)), noReadme.out);

const missing = run({ "Occupation Data.txt": occupations, "GWAs to IWAs to DWAs.txt": gwas });
t("a folder missing Tasks to DWAs.txt is refused", missing.status === 1 && /Tasks to DWAs.txt: missing/.test(missing.out), missing.out);
const noColumn = run({ ...release, "Occupation Data.txt": occupations.map(([c, , d]) => [c, d]) });
t("a file missing a column it needs is refused", noColumn.status === 1 && /Occupation Data.txt: has no column Title/.test(noColumn.out), noColumn.out);
const unknownDwa = run({ ...release, "Tasks to DWAs.txt": [...tasks, ["15-1252.00", "6", "4.A.9.z.9.z.9", "07/2014", "Analyst"]] });
t("a link to a work activity the release does not name is refused", unknownDwa.status === 1 && /15-1252.00 links work activity 4.A.9.z.9.z.9, which the release does not have/.test(unknownDwa.out), unknownDwa.out);
const unknownOcc = run({ ...release, "Tasks to DWAs.txt": [...tasks, ["99-9999.00", "7", "4.A.2.a.4.g.9", "07/2014", "Analyst"]] });
t("a link from an occupation the release does not have is refused", unknownOcc.status === 1 && /links occupation 99-9999.00/.test(unknownOcc.out), unknownOcc.out);
const badCode = run({ ...release, "Occupation Data.txt": [...occupations, ["151252", "Bad code", "x"]] });
t("an occupation code that is not an O*NET-SOC code fails the schema", badCode.status === 1 && /code: .*does not match/.test(badCode.out), badCode.out);
const noRelease = run(release, []);
t("no --release is a usage error", noRelease.status === 2 && /usage/.test(noRelease.out), noRelease.out);

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("import-onet: the same release always writes the same bytes, and a release it cannot use is refused");
