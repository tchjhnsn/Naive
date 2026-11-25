// Breaks check-pcf on copies (EE-165). Each case copies pcf.json, the tool catalog and the references files into a
// small EE_ROOT, breaks one rule, and expects the check to name it. The repository passes, element ids that APQC repeats
// included, and a tool catalog whose process groups drift from the PCF fails.
//
//   node packages/naive/src/checks/check-pcf-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Pcf, ToolCatalog } from "../records/types/records.d.ts";

const repo = new URL("../../../../", import.meta.url).pathname;
const CHECK = join(repo, "packages/naive/src/checks/check-pcf.ts");
const PCF = "packages/naive/src/functions/pcf.json";
const TOOLS = "packages/naive/src/functions/tools.json";
const LAYERS = "packages/naive/src/records/layers";
const REFERENCES = readdirSync(join(repo, LAYERS)).map((l) => `${LAYERS}/${l}/references/references.json`).filter((f) => existsSync(join(repo, f)));
const COPIED = [PCF, TOOLS, ...REFERENCES];
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-pcf-test-"));
const run = (env: Record<string, string> = {}, args: string[] = []) => {
  const r = spawnSync(process.execPath, [CHECK, ...args], { encoding: "utf8", env: { ...process.env, ...env } });
  return { status: r.status, out: r.stdout + r.stderr };
};
const original = JSON.parse(readFileSync(join(repo, PCF), "utf8")) as Pcf;
const tools = JSON.parse(readFileSync(join(repo, TOOLS), "utf8")) as ToolCatalog;

let n = 0;
/** A copy of the repository's files with pcf.json (and, if given, tools.json) changed, run through the check. */
function broken(change: (_p: Pcf) => void, changeTools?: (_t: ToolCatalog) => void, args: string[] = []) {
  const root = join(tmp, `r-${++n}`);
  for (const f of COPIED) { mkdirSync(dirname(join(root, f)), { recursive: true }); cpSync(join(repo, f), join(root, f)); }
  const p = structuredClone(original); change(p);
  writeFileSync(join(root, PCF), JSON.stringify(p, null, 2) + "\n");
  if (changeTools) { const c = structuredClone(tools); changeTools(c); writeFileSync(join(root, TOOLS), JSON.stringify(c, null, 2) + "\n"); }
  return run({ EE_ROOT: root }, args);
}
const el = (p: Pcf, id: string) => {
  const e = p.elements.find((x) => x.id === id);
  if (!e) throw new Error(`no element ${id} in pcf.json`);
  return e;
};
const without = (p: Pcf, keep: (_e: Pcf["elements"][number]) => boolean) => { p.elements = p.elements.filter(keep); };
const fails = (name: string, change: (_p: Pcf) => void, says: RegExp) => {
  const r = broken(change);
  t(name, r.status === 1 && says.test(r.out), r);
};
// A level 4 element with no children and a later sibling, so removing it leaves a gap and orphans nothing.
const leaf = original.elements.find((e) => e.level === 4 && !original.elements.some((x) => x.id.startsWith(`${e.id}.`))
  && original.elements.some((x) => x.id === e.id.replace(/\d+$/, (k) => String(Number(k) + 1))));
if (!leaf) throw new Error("no level 4 leaf with a later sibling in pcf.json");

const clean = run();
t("the repository's PCF passes", clean.status === 0 && /13 categories, 74 process groups, 363 processes, 1352 activities, 215 tasks/.test(clean.out), clean);
const repeated = original.elements.filter((e, i) => original.elements.some((x, j) => j !== i && x.pcf === e.pcf)).map((e) => e.pcf);
t("element ids APQC files at two hierarchy ids are allowed (19950, 19951, 14197, 10530)", clean.status === 0 && [19950, 19951, 14197, 10530].every((k) => repeated.includes(k)), repeated);

fails("an unknown field fails the schema", (p) => { Object.assign(el(p, "1.1"), { definition: "x" }); }, /additional|definition/i);
fails("a category id that does not end in .0 fails the schema", (p) => { el(p, "1.0").id = "1"; }, /id: .*does not match/);
fails("a name with a space at its end fails the schema", (p) => { el(p, "1.1").name += " "; }, /name: .*does not match/);
fails("a level outside 1 to 5 fails the schema", (p) => { Object.assign(el(p, "1.1"), { level: 6 }); }, /level: /);
fails("an empty attribution fails the schema", (p) => { p.attribution = ""; }, /attribution: /);
fails("an attribution of only spaces", (p) => { p.attribution = "   "; }, /attribution is empty/);
fails("an attribution that does not name APQC", (p) => { p.attribution = "The PCF is an open standard."; }, /attribution does not name APQC/);
fails("a source that is not a reference id", (p) => { p.source = "made-up-source"; }, /source made-up-source is not a reference id/);
fails("a hierarchy id listed twice", (p) => { p.elements.push({ ...el(p, "1.1.1"), name: "Another name" }); }, /hierarchy id 1\.1\.1 is listed twice/);
fails("a level that does not agree with the hierarchy id", (p) => { el(p, "1.1.1").level = 2; }, /1\.1\.1 is level 2, but its hierarchy id is level 3/);
fails("an element whose parent is missing", (p) => { el(p, "1.1").id = "1.99"; }, /1\.1\.1 has no parent: 1\.1 is not in the file/);
fails("a gap in sibling numbering", (p) => { without(p, (e) => e.id !== leaf.id); }, new RegExp(`the children of ${leaf.id.replace(/\.\d+$/, "").replace(/\./g, "\\.")} skip ${leaf.id.split(".").at(-1)}`));
fails("twelve categories", (p) => { without(p, (e) => e.id.split(".")[0] !== "13"); }, /there are 12 categories; the PCF has 13/);
fails("fourteen categories", (p) => { p.elements.push({ id: "14.0", name: "Another category", pcf: 99999, level: 1 }); }, /there are 14 categories; the PCF has 13/);
t("pcf.json that cannot be read exits 2", (() => { const root = join(tmp, "missing"); mkdirSync(root); return run({ EE_ROOT: root }).status === 2; })());

type Report = { ok: boolean; levels: Record<string, number>; categories: { id: string }[]; tool_catalog_drift: { id: string; kind: string; fields?: string[] }[] };
const parse = (out: string): Report | null => { try { return JSON.parse(out) as Report; } catch { return null; } };
const j = parse(run({}, ["--json"]).out);
t("--json counts each level and each of the 13 categories", j?.ok === true && j.levels.categories === 13 && j.levels.tasks === 215 && j.categories.length === 13, j?.levels);
t("--json reports no tool catalog drift for the repository", j?.tool_catalog_drift.length === 0, j?.tool_catalog_drift.slice(0, 5));
const drifts = (name: string, change: (_c: ToolCatalog) => void, says: RegExp, kind: string) => {
  const r = broken(() => {}, change);
  const report = parse(broken(() => {}, change, ["--json"]).out);
  t(name, r.status === 1 && says.test(r.out) && report?.ok === false && report.tool_catalog_drift.some((d) => d.kind === kind), r);
};
drifts("a tool catalog group the PCF lacks", (c) => { c.process_groups[0].id = "1.9"; }, /tools\.json: process group 1\.9 .* is not a level 2 element/, "missing");
drifts("a tool catalog group named differently from APQC", (c) => { c.process_groups[0].name = "Define the vision"; }, /tools\.json: process group 1\.1 differs from .*pcf\.json in name/, "differs");
drifts("a tool catalog group with another element id", (c) => { c.process_groups[0].pcf = 1; }, /process group 1\.1 differs from .* in pcf/, "differs");
drifts("a tool catalog group with no element id", (c) => { delete c.process_groups[0].pcf; }, /process group 1\.1 differs from .* in pcf/, "differs");
drifts("a PCF process group the tool catalog lacks", (c) => { c.process_groups = c.process_groups.filter((g) => g.id !== "13.10"); for (const x of c.tools) x.process_groups = x.process_groups.filter((g) => g !== "13.10"); }, /process group 13\.10 \(Manage sustainability\) of .*pcf\.json is missing/, "not-in-tools");

rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("check-pcf: every rule fails on a copy that breaks it");
