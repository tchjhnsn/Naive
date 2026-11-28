// Writes a compact O*NET reference into packages/naive/src/functions/onet.json (EE-232).
//
//   node scripts/import-onet.ts <onet db dir> --release <tag> [--root <dir>]
//
// <onet db dir> is the folder of one O*NET database release in its text form (the tab-delimited files in
// db_<release>_text.zip from https://www.onetcenter.org/database.html, CC BY 4.0). O*NET's files are not kept in this
// repository. The script reads, by their header names, so a column order change does not move a value:
//   - Occupation Data.txt: O*NET-SOC Code and Title of every occupation;
//   - Tasks to DWAs.txt: which detailed work activity (DWA Element ID) each occupation's tasks link to;
//   - the DWA titles: GWAs to IWAs to DWAs.txt (DWA Element ID, DWA Element Name) from release 30.1 on, else
//     DWA Reference.txt (DWA ID, DWA Title) in earlier releases;
//   - Read Me.txt, when present, for the month the release was published ("August 2026 Release").
// --release names the release, such as 31.0, and goes into the attribution O*NET's licence asks for. The script keeps
// each occupation's code and title, every DWA's id and title and each occupation's DWA links, and nothing else (no
// descriptions, task statements or ratings). Everything is sorted and written one entry per line, so a rerun on the
// same release writes the same bytes. It refuses a folder missing a file it needs, a file missing a column it needs, a
// link to a DWA the release does not name, and a result that fails onet.schema.json. --root writes into another copy
// of the repository (used by scripts/import-onet-test.ts).

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { draft, FILE, format, type OnetDwa, type OnetOccupation } from "../packages/naive/src/engine/generators/onet.ts";

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

const args = process.argv.slice(2);
const opt = (n: string) => { const i = args.indexOf(`--${n}`); return i < 0 ? undefined : args[i + 1]; };
const root = opt("root") ?? new URL("..", import.meta.url).pathname;
const release = opt("release");
const dir = args.find((a, i) => !a.startsWith("--") && !["--root", "--release"].includes(args[i - 1] ?? ""));
const fail = (msg: string, code = 1): never => { console.error(msg); process.exit(code); };
if (!dir || !release) fail("usage: node scripts/import-onet.ts <onet db dir> --release <tag> [--root <dir>]", 2);

/** A tab-delimited O*NET file as rows keyed by header name. O*NET's text files use CRLF and no quoting. */
function table(name: string, columns: string[]): Record<string, string>[] {
  const file = join(dir as string, name);
  if (!existsSync(file)) fail(`${file}: missing; <onet db dir> must be an O*NET database release in its text form`);
  const [head, ...lines] = readFileSync(file, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/).filter((l) => l.length);
  const header = (head ?? "").split("\t").map((h) => h.trim());
  for (const c of columns) if (!header.includes(c)) fail(`${file}: has no column ${c}`);
  return lines.map((l) => { const cells = l.split("\t"); return Object.fromEntries(header.map((h, i) => [h, (cells[i] ?? "").trim()])); });
}

const occupations = table("Occupation Data.txt", ["O*NET-SOC Code", "Title"]).map((r) => ({ code: r["O*NET-SOC Code"], title: r.Title }));
const dwas: OnetDwa[] = existsSync(join(dir as string, "GWAs to IWAs to DWAs.txt"))
  ? table("GWAs to IWAs to DWAs.txt", ["DWA Element ID", "DWA Element Name"]).map((r) => ({ id: r["DWA Element ID"], title: r["DWA Element Name"] }))
  : table("DWA Reference.txt", ["DWA ID", "DWA Title"]).map((r) => ({ id: r["DWA ID"], title: r["DWA Title"] }));
const links = new Map<string, Set<string>>();
for (const r of table("Tasks to DWAs.txt", ["O*NET-SOC Code", "DWA Element ID"])) {
  const code = r["O*NET-SOC Code"];
  if (!links.has(code)) links.set(code, new Set());
  links.get(code)?.add(r["DWA Element ID"]);
}
const codes = new Set(occupations.map((o) => o.code));
for (const code of links.keys()) if (!codes.has(code)) fail(`Tasks to DWAs.txt links occupation ${code}, which Occupation Data.txt does not have`);
const unique = [...new Map(dwas.map((d) => [d.id, d])).values()];

let published: string | undefined;
const readme = join(dir as string, "Read Me.txt");
if (existsSync(readme)) {
  const m = /\b([A-Za-z]+) (\d{4}) Release\b/.exec(readFileSync(readme, "utf8"));
  const month = m ? MONTHS.indexOf(m[1].toLowerCase()) : -1;
  if (m && month >= 0) published = `${m[2]}-${String(month + 1).padStart(2, "0")}`;
}

const d = draft({ release, published, dwas: unique, occupations: occupations.map((o): OnetOccupation => ({ ...o, dwas: [...(links.get(o.code) ?? [])] })) });
if (!d.ok || !("draft" in d) || !d.draft) {
  for (const e of d.errors) console.error(`FAIL  ${e}`);
  process.exit(1);
}
writeFileSync(join(root, FILE), format(d.draft));
console.log(`wrote ${FILE}: O*NET ${release}, ${d.draft.occupations.length} occupations, ${d.draft.dwas.length} work activities, ${d.draft.occupations.reduce((n, o) => n + o.dwas.length, 0)} links`);
