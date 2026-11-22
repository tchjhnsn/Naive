// Tests for the Venture Anatomy Matrix (EE-157): a new venture starts with every cell unknown and confidence 0;
// writing a market through the router raises confidence; a read as of system time before the write shows the old
// state; a read at an application time before a cell's valid_from shows it unknown; Regulation S-K coverage lists the
// items covered; the Lean Canvas view is the Lean Canvas; the definition agrees with the data model; and the matrix and
// each sub-matrix answer at their routes.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCounts, type ApplicationDate, cellStatuses, isApplicationDate, confidenceOf, countOf, coverageOf, problems, problemsOf, statusAt, submatrix, ventureAnatomy, viewOf } from "./venture-anatomy.ts";
import { leanCanvas } from "./lean-canvas.mjs";
import { CannotRun } from "../core/effect/errors.mjs";
import { draft as draftMarket } from "./generators/market-anatomy.ts";
import type { VentureAnatomy } from "../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail?: unknown): void => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

const repo = new URL("../../../..", import.meta.url).pathname;
const node = (args: string[], env: Record<string, string> = {}) => spawnSync("node", args, { cwd: repo, encoding: "utf8", env: { ...process.env, ...env } });
const ws = mkdtempSync(join(tmpdir(), "venture-anatomy-"));
const dir = join(ws, "acme");
const made = node(["packages/naive/src/engine/init-venture.mjs", dir, "acme", "--type", "software-startup"]);
expect("a software startup venture starts", made.status === 0, made.stderr);

// ---- The definition ----
expect("the definition names only record types the data model has, with their owners", problems().length === 0, problems());
const fake = { version: "0", coverage: { source: "x", items: [{ id: "101", label: "Business" }, { id: "105", label: "Risk" }] },
  submatrices: [{ id: "a", label: "A", concern: "?", record: "nope", status: "built", owner: "strategy", covers: ["101", "999"], from_phase: "discovery" }],
  viewpoints: [{ id: "v", label: "V", concerns: "?", reads: ["b"], kind: "submatrices" }] } satisfies VentureAnatomy;
const found = problemsOf(fake, { records: [] }, []);
expect("a bad definition is caught: unknown record type, coverage item, uncovered item and viewpoint read",
  ["lacks", "999", "no sub-matrix covers 105", "reads b"].every((k) => found.some((f) => f.includes(k))), found);

// ---- Pure rules ----
const day = (s: string): ApplicationDate => { if (!isApplicationDate(s)) throw new Error(`${s} is not a date`); return s; };
expect("only a calendar day is an application date", isApplicationDate("2026-11-01") && !isApplicationDate("soon") && !isApplicationDate("2026-11-01T00:00:00Z"));
expect("a cell outside its application period is unknown at that time", statusAt({ status: "known", valid_from: "2026-11-01" }, day("2026-10-31")) === "unknown"
  && statusAt({ status: "known", valid_from: "2026-11-01" }, day("2026-11-01")) === "known" && statusAt({ status: "estimated", valid_to: "2026-12-01" }, day("2026-12-01")) === "unknown");
expect("a missing cell is unknown, never null", cellStatuses({}, ["a"]).a === "unknown");
const c2 = addCounts([countOf(["known", "unknown"]), countOf(["estimated", "unknown"])]);
expect("confidence is known plus estimated over all cells", confidenceOf(c2) === 0.5 && confidenceOf(countOf([])) === 0, c2);

// ---- A new venture ----
const m0 = ventureAnatomy(dir);
expect("a new venture has the eleven sub-matrices", m0.submatrices.length === 11, m0.submatrices.map((s) => s.id));
expect("a new venture has every cell unknown and confidence 0", m0.cells.total > 0 && m0.cells.unknown === m0.cells.total && m0.confidence === 0, m0.cells);
const market0 = m0.submatrices.find((s) => s.id === "market");
expect("init writes the primary market and industry, nested", market0?.files.includes("markets/primary.json") === true
  && market0?.nesting?.links?.some((l) => l.field === "industry" && l.to === "primary" && l.resolved) === true, market0);
expect("each sub-matrix's owner is its record type's function", m0.submatrices.find((s) => s.id === "team")?.owner === "human-capital" && m0.kernel.owner === "strategy");

// ---- A write through the router raises confidence ----
await new Promise((r) => setTimeout(r, 20));
const before = new Date().toISOString();
await new Promise((r) => setTimeout(r, 20));
const rec = draftMarket({ segment: "Landlords with two to ten units", industry: "primary", cells: {
  customer_type: { status: "known", value: "business", valid_from: "2026-09-01" },
  reachable_buyers: { status: "estimated", value: 3000, valid_from: "2026-11-01" },
  buying_roles: { status: "known", value: 1, valid_from: "2026-11-01" } } }, { venture: dir });
expect("the generator drafts the market whole", rec.ok && Object.keys(rec.draft.cells).length === 11, rec.errors);
const input = join(ws, "market.json");
writeFileSync(input, JSON.stringify(rec.draft));
const w = node(["packages/naive/src/interfaces/cli/mentura.mjs", "markets/primary", "write", "--venture", "acme", "--as", "person", "--input", input], { MENTURA_WORKSPACE: ws });
expect("a person writes the market through the router at markets/primary", w.status === 0, w.stderr || w.stdout);
const m1 = ventureAnatomy(dir);
const market1 = m1.submatrices.find((s) => s.id === "market");
expect("writing the market raises confidence", m1.confidence > 0 && market1?.cells.known === 2 && market1?.cells.estimated === 1, market1?.cells);

// ---- Time travel ----
const old = ventureAnatomy(dir, { asOf: before });
expect("--as-of before the write shows the old state: every cell unknown", old.confidence === 0 && old.as_of === before, old.cells);
const now = ventureAnatomy(dir, { asOf: new Date().toISOString() });
expect("--as-of after the write reads the written market from the blob store", now.submatrices.find((s) => s.id === "market")?.cells.known === 2, now.submatrices.find((s) => s.id === "market")?.cells);
const early = submatrix(dir, "market", { validAt: "2026-10-15" });
expect("--valid-at before a cell's valid_from shows it unknown", early?.cells.known === 1 && early?.cells.estimated === 0 && early?.detail[0].cells.buying_roles === "unknown", early?.detail);

// ---- S-K coverage ----
expect("S-K coverage lists the items a sub-matrix with a record covers", m1.covered.includes("101") && m1.covered.includes("105") && m1.covered.includes("303") && m1.uncovered.includes("403"), m1.coverage);
const cov = coverageOf({ ...fake, submatrices: [{ ...fake.submatrices[0], covers: ["101"] }] }, new Set(["a"]));
expect("an item is covered only through a sub-matrix with a record", cov[0].covered && !cov[1].covered, cov);

// ---- Views ----
const lv = viewOf(dir, "lean-canvas");
expect("the lean-canvas view is the Lean Canvas", lv?.kind === "canvas" && JSON.stringify(lv.canvas) === JSON.stringify(leanCanvas(dir)), lv);
const s1 = viewOf(dir, "s1-outline");
expect("the S-1 outline is ordered by S-K item", s1?.kind === "outline" && s1.sections.map((x) => x.item).join() === "101,105,303,401,403,S-X", s1);
expect("an unknown viewpoint is null", viewOf(dir, "nope") === null);
let refused: unknown = null;
try { ventureAnatomy(dir, { validAt: "soon" }); } catch (e) { refused = e; }
expect("a bad application date is refused at the boundary as CannotRun", refused instanceof CannotRun, String(refused));

// ---- Routes ----
const r = node(["packages/naive/src/interfaces/cli/mentura.mjs", "identity/venture-anatomy/market", "run", "--venture", "acme"], { MENTURA_WORKSPACE: ws });
let routed: { id?: string, cells?: { known?: number } } = {};
try { routed = JSON.parse(r.stdout); } catch { routed = {}; }
expect("identity/venture-anatomy/<sub> returns that sub-matrix", routed.id === "market" && routed.cells?.known === 2, r.stdout.slice(0, 300) || r.stderr);
const whole = node(["packages/naive/src/interfaces/cli/mentura.mjs", "identity/venture-anatomy", "run", "--venture", "acme"], { MENTURA_WORKSPACE: ws });
let all: { submatrices?: unknown[] } = {};
try { all = JSON.parse(whole.stdout); } catch { all = {}; }
expect("identity/venture-anatomy returns the whole matrix", all.submatrices?.length === 11, whole.stdout.slice(0, 300) || whole.stderr);
const text = node(["packages/naive/src/engine/venture-anatomy.ts", dir, "--valid-at", "2026-10-15"]);
expect("the command prints the matrix and its coverage", text.status === 0 && text.stdout.includes("S-K coverage") && text.stdout.includes("valid at 2026-10-15"), text.stdout || text.stderr);
const bad = node(["packages/naive/src/engine/venture-anatomy.ts", dir, "--valid-at", "soon"]);
expect("a bad --valid-at is a bad call", bad.status === 2, bad.stderr);

rmSync(ws, { recursive: true, force: true });
if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("venture anatomy: all pass");
