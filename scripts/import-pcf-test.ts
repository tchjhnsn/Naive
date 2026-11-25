// Tests scripts/import-pcf.ts (EE-165): a small hierarchy, given out of order, writes exactly the expected bytes and
// writes them again on a rerun; the committed packages/naive/src/functions/pcf.json is what the script writes from its
// own elements; and input the script cannot use is refused.
//
//   node scripts/import-pcf-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Pcf } from "../packages/naive/src/records/types/records.d.ts";

const repo = new URL("..", import.meta.url).pathname;
const SCRIPT = join(repo, "scripts/import-pcf.ts");
const FILE = "packages/naive/src/functions/pcf.json";
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "import-pcf-test-"));
let n = 0;
/** A root whose pcf.json holds `header` (or no pcf.json), and the input file holding `input`, run through the script. */
const run = (header: object | null, input: unknown) => {
  const root = join(tmp, `r-${++n}`);
  mkdirSync(dirname(join(root, FILE)), { recursive: true });
  if (header) writeFileSync(join(root, FILE), JSON.stringify(header, null, 2) + "\n");
  const file = join(root, "hierarchy.json");
  writeFileSync(file, JSON.stringify(input));
  const r = spawnSync(process.execPath, [SCRIPT, file, "--root", root], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr, root, file, written: () => readFileSync(join(root, FILE), "utf8") };
};

const header = { version: "8.0", edition: "cross-industry", published: "2026-03", source: "apqc-pcf-cross-industry", attribution: "APQC’s Process Classification Framework® (PCF) is an open standard.", elements: [] };
const small = [
  { id: "10.0", name: "Acquire, Construct, and Manage Assets", pcf: 19188, level: 1 },
  { id: "1.1.1", name: "Assess the external environment", pcf: 10017, level: 3 },
  { id: "1.2", name: "Develop business strategy", pcf: 10015, level: 2 },
  { id: "1.0", name: "Develop Vision and Strategy", pcf: 10002, level: 1 },
  { id: "1.1.10", name: "A tenth process", pcf: 10099, level: 3 },
  { id: "1.1", name: "Define the business concept and long-term vision", pcf: 17040, level: 2 },
  { id: "1.1.2", name: "Survey market and determine customer needs and wants", pcf: 10018, level: 3 },
];
const expected = `{
  "version": "8.0",
  "edition": "cross-industry",
  "published": "2026-03",
  "source": "apqc-pcf-cross-industry",
  "attribution": "APQC’s Process Classification Framework® (PCF) is an open standard.",
  "elements": [
    {"id": "1.0", "name": "Develop Vision and Strategy", "pcf": 10002, "level": 1},
    {"id": "1.1", "name": "Define the business concept and long-term vision", "pcf": 17040, "level": 2},
    {"id": "1.1.1", "name": "Assess the external environment", "pcf": 10017, "level": 3},
    {"id": "1.1.2", "name": "Survey market and determine customer needs and wants", "pcf": 10018, "level": 3},
    {"id": "1.1.10", "name": "A tenth process", "pcf": 10099, "level": 3},
    {"id": "1.2", "name": "Develop business strategy", "pcf": 10015, "level": 2},
    {"id": "10.0", "name": "Acquire, Construct, and Manage Assets", "pcf": 19188, "level": 1}
  ]
}
`;

const first = run(header, small);
t("a small hierarchy out of order writes the expected bytes, sorted by hierarchy id part by part", first.status === 0 && first.written() === expected, { r: first, got: first.status === 0 ? first.written() : "" });
const again = spawnSync(process.execPath, [SCRIPT, first.file, "--root", first.root], { encoding: "utf8" });
t("a rerun on the same hierarchy writes the same bytes", again.status === 0 && first.written() === expected, again.stderr);
const reversed = run(header, [...small].reverse());
t("the same hierarchy in another order writes the same bytes", reversed.status === 0 && reversed.written() === expected, reversed);

const committed = readFileSync(join(repo, FILE), "utf8");
const pcf = JSON.parse(committed) as Pcf;
const own = run(null, [...pcf.elements].reverse());
cpSync(join(repo, FILE), join(own.root, FILE));
const rerun = spawnSync(process.execPath, [SCRIPT, own.file, "--root", own.root], { encoding: "utf8" });
t(`the committed ${FILE} is what the script writes from its own elements, byte for byte`, rerun.status === 0 && own.written() === committed, rerun.stdout + rerun.stderr);

const noHeader = run(null, small);
t("a pcf.json with no header is refused", noHeader.status === 1 && /write its header/.test(noHeader.out), noHeader);
const notArray = run(header, { elements: small });
t("input that is not an array of elements is refused", notArray.status === 1 && /not an array of \{id, name, pcf, level\}/.test(notArray.out), notArray);
const padded = run(header, [{ ...small[3], name: "Develop Vision and Strategy " }]);
t("a name with a space at its end fails the schema", padded.status === 1 && /name: .*does not match/.test(padded.out), padded);
const badCategory = run(header, [{ ...small[3], id: "1" }]);
t("a category id that does not end in .0 fails the schema", badCategory.status === 1 && /id: .*does not match/.test(badCategory.out), badCategory);

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("import-pcf: the same hierarchy always writes the same bytes, and the committed file is its output");
