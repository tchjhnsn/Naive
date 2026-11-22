// Tests for the Lean Canvas as the venture's shared kernel (EE-155): nine boxes, each owned by the function of the
// record type it references; a roadmap that puts the current gate's evidence first; unlocks from the gates, the
// workflows and the data model; a box that reads its record without copying it; and each box at its own route.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CANVAS, canvasBox, leanCanvas, problems, roadmapOrder, unlocksOf } from "./lean-canvas.ts";
import { readDataModel } from "../records/index.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail?: unknown): void => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail)}`}`);
  if (!ok) failed++;
};

const repo = new URL("../../../..", import.meta.url).pathname;
const node = (args: string[], env: Record<string, string> = {}) => spawnSync("node", args, { cwd: repo, encoding: "utf8", env: { ...process.env, ...env } });
const ws = mkdtempSync(join(tmpdir(), "lean-canvas-"));
const dir = join(ws, "acme");
const made = node(["packages/naive/src/engine/init-venture.ts", dir, "acme", "--type", "software-startup"]);
expect("a software startup venture starts", made.status === 0, made.stderr);

// ---- The definition ----
expect("the canvas definition names only record types the data model has", problems().length === 0, problems());
expect("the canvas has Maurya's nine boxes", CANVAS.boxes.length === 9, CANVAS.boxes.map((b) => b.id));

// ---- Owners and the roadmap ----
const c = leanCanvas(dir);
const model = readDataModel() as { records: { id: string, function?: string | null }[] };
expect("each box's owner is the function of the record type it references",
  c.boxes.every((b) => b.owner === (model.records.find((r) => r.id === b.record)?.function ?? "venture")), c.boxes.map((b) => [b.id, b.owner]));
expect("the canvas itself belongs to strategy and copies nothing", c.kernel.owner === "strategy");
expect("in discovery the roadmap starts with what the gate asks for, in the gate's order", c.roadmap[0].box === "problem" && c.roadmap[1].box === "customer-segments", c.roadmap.map((r) => r.box));
expect("the next box is the first one not confirmed", c.next === "problem", c.next);
const order = roadmapOrder([{ id: "a", record: "x" }, { id: "b", record: "y" }, { id: "c", record: "z" }], ["z"], ["y"]).map((r) => r.box).join();
expect("the roadmap puts the current gate, then the next gate, then canvas order", order === "c,b,a", order);

// ---- Unlocks ----
const segments = c.boxes.find((b) => b.id === "customer-segments");
const kinds = new Set((segments?.unlocks ?? []).map((u) => u.kind));
expect("filling customer segments unlocks the discovery gate, workflows and the records that reference it", kinds.has("gate") && kinds.has("workflow") && kinds.has("record"), segments?.unlocks);
const lone = unlocksOf({ id: "q", label: "Q", ask: "?", record: "r", attribute: "." }, { phases: [], workflows: [], model: { records: [{ id: "s", refs: [{ field: "r_id", to: "r" }] }] } });
expect("a record whose refs point at the box's record is an unlock", lone.length === 1 && lone[0].kind === "record", lone);

// ---- Reading, not copying ----
const before = (d: string): string[] => readdirSync(d, { recursive: true }).map(String).filter((f) => !f.startsWith(".naive")).sort();
const files0 = before(dir);
const input = join(ws, "problem.json");
writeFileSync(input, JSON.stringify({ venture: "acme", statement: "Small landlords lose a month of rent each year to slow turnover.", segment: "Landlords with two to ten units", evidence: [] }));
const w = node(["packages/naive/src/interfaces/cli/mentura.mjs", "foundation/problem", "write", "--venture", "acme", "--as", "person", "--input", input], { MENTURA_WORKSPACE: ws });
expect("a person writes the problem record through the router", w.status === 0, w.stderr || w.stdout);
const files1 = before(dir);
const problem = canvasBox(dir, "problem");
expect("the problem box reads the record its owner wrote, confirmed", problem?.status === "confirmed" && problem?.value === "Small landlords lose a month of rent each year to slow turnover.", problem);
expect("reading the canvas writes no file", JSON.stringify(before(dir)) === JSON.stringify(files1) && files1.length > files0.length);
expect("after the problem is confirmed, the next box is customer segments", leanCanvas(dir).next === "customer-segments");
expect("an unknown box is null", canvasBox(dir, "nope") === null);

// ---- Each box at its own route ----
const r = node(["packages/naive/src/interfaces/cli/mentura.mjs", "identity/lean-canvas/problem", "run", "--venture", "acme"], { MENTURA_WORKSPACE: ws });
let routed: { id?: string, status?: string } = {};
try { routed = JSON.parse(r.stdout); } catch { routed = {}; }
expect("identity/lean-canvas/<box> returns that one box", routed.id === "problem" && routed.status === "confirmed", r.stdout.slice(0, 300) || r.stderr);
const whole = node(["packages/naive/src/engine/lean-canvas.ts", dir]);
expect("the command prints the roadmap", whole.status === 0 && whole.stdout.includes("Gate: Problem-solution fit"), whole.stdout || whole.stderr);
expect("the venture folder still exists", statSync(dir).isDirectory());

rmSync(ws, { recursive: true, force: true });
if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("lean canvas: all pass");
