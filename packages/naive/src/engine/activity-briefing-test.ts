// Tests the briefing a person reads (EE-180): per function its APQC category and process groups, what each needs
// from a person by the venture's assignment or by default, and how many activities are left to the agent. It reads
// the shipped catalog and framework, and one venture folder made here, then reads the same briefing through its routes.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runSync } from "../core/effect/run.ts";
import { briefing, briefingFor } from "./activity-briefing.ts";
import { readCatalog, readGroups, readPcf } from "./activity-proposals.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const catalog = runSync(readCatalog()), groups = runSync(readGroups()), pcf = runSync(readPcf());
const name = (id: string) => pcf.elements.find((e) => e.id === id)?.name ?? "";
const level4 = (group: string) => pcf.elements.filter((e) => e.level === 4 && e.id.startsWith(`${group}.`)).length + catalog.activities.filter((a) => a.process_group === group).length;

const [sales, finance] = briefing(catalog, groups, pcf, ["marketing-and-sales", "finance"], null);
expect("one entry per function, in the order given, with its APQC category", sales.function === "marketing-and-sales" && sales.category?.id === "3.0" && sales.category.name === name("3.0") && finance.category?.id === "9.0", [sales.category, finance.category]);
expect("each of the function's process groups, in the framework's order, with APQC's name", sales.process_groups.map((g) => g.id).join() === [...groups].filter(([, f]) => f === "marketing-and-sales").map(([id]) => id).join() && sales.process_groups.every((g) => g.name === name(g.id)), sales.process_groups.map((g) => g.id));
const g35 = sales.process_groups.find((g) => g.id === "3.5");
expect("with nothing assigned, a person performs the activities whose kind says so, marked default", g35?.performs.map((a) => `${a.id} ${a.source} ${a.kind}`).join("; ") === "3.5.2.1 default decision; 3.5.2.4 default relationship" && g35.approves.length === 0, g35?.performs);
expect("the rest of the group is the agent's, so the three counts add up to the group's activities", sales.process_groups.every((g) => g.performs.length + g.approves.length + g.agent === level4(g.id)), sales.process_groups.map((g) => [g.id, g.agent, level4(g.id)]));
expect("the function's total is the sum over its groups", sales.needs_person === sales.process_groups.reduce((n, g) => n + g.performs.length + g.approves.length, 0) && sales.needs_person > 0);

const record = { activities: { "3.5.2.4": { performer: "agent", approval: "person" }, "3.5.1.6": { performer: "person" }, "3.5.1.2": { performer: "agent" } } };
const [own] = briefing(catalog, groups, pcf, ["marketing-and-sales"], record);
const o35 = own.process_groups.find((g) => g.id === "3.5");
expect("the venture's assignment moves an activity: a person approves what an agent performs", o35?.approves.map((a) => `${a.id} ${a.source}`).join() === "3.5.2.4 assigned" && !o35.performs.some((a) => a.id === "3.5.2.4"), o35);
expect("an activity the venture gave a person is listed as assigned, with no kind", o35?.performs.some((a) => a.id === "3.5.1.6" && a.source === "assigned" && a.kind === undefined) === true, o35?.performs);
expect("an activity assigned to an agent with no approval is counted with the agent's", !o35?.performs.some((a) => a.id === "3.5.1.2") && !o35?.approves.some((a) => a.id === "3.5.1.2") && (o35?.performs.length ?? 0) + (o35?.approves.length ?? 0) + (o35?.agent ?? 0) === level4("3.5"));
expect("a function with no process group has no category and nothing to need", (() => { const [x] = briefing(catalog, groups, pcf, ["no-such-function"], null); return x.category === null && x.process_groups.length === 0 && x.needs_person === 0; })());

const dir = mkdtempSync(join(tmpdir(), "naive-briefing-"));
try {
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t", name: "T", phase: "discovery", departments: ["finance", "marketing-and-sales"] }));
  mkdirSync(join(dir, "operations"), { recursive: true });
  writeFileSync(join(dir, "operations", "activity-assignments.json"), JSON.stringify(record));
  const forVenture = runSync(briefingFor(dir));
  expect("a venture is briefed on the functions it lists, with its own assignments", forVenture.length === 2 && forVenture.find((f) => f.function === "marketing-and-sales")?.process_groups.find((g) => g.id === "3.5")?.approves[0]?.id === "3.5.2.4", forVenture.map((f) => f.function));
  expect("one function can be asked for", runSync(briefingFor(dir, "finance")).map((f) => f.function).join() === "finance");
  const cli = (...args: string[]) => spawnSync(process.execPath, [new URL("./activity-briefing.ts", import.meta.url).pathname, ...args], { encoding: "utf8" });
  const text = cli(dir, "--function", "marketing-and-sales");
  expect("the command prints the category, each group's counts and each activity a person performs or approves", text.status === 0 && text.stdout.includes(`3.0 ${name("3.0")}`) && /3\.5 .*: you perform \d+, you approve 1, the agent does \d+/.test(text.stdout) && text.stdout.includes(`approve 3.5.2.4  ${name("3.5.2.4")}  (assigned)`) && /default for a decision/.test(text.stdout) && /Nothing written/.test(text.stdout), text.stdout.slice(0, 500) + text.stderr);
  const asJson = cli(dir, "--json");
  expect("--json prints the same briefing", asJson.status === 0 && JSON.stringify((JSON.parse(asJson.stdout) as { briefing: unknown }).briefing) === JSON.stringify(forVenture));
  expect("a function the venture does not list is refused", cli(dir, "--function", "assets").status === 2 && cli().status === 2);
} finally { rmSync(dir, { recursive: true, force: true }); }

// ---- Through the router: the whole briefing, and each function's at its own route ----
const ws = mkdtempSync(join(tmpdir(), "naive-briefing-ws-"));
try {
  const repo = new URL("../../../../", import.meta.url).pathname;
  const node = (...args: string[]) => spawnSync(process.execPath, args, { cwd: repo, encoding: "utf8", env: { ...process.env, MENTURA_WORKSPACE: ws } });
  const acme = join(ws, "acme");
  const made = node("packages/naive/src/engine/init-venture.ts", acme, "acme", "--type", "software-startup");
  expect("a venture is made for the route", made.status === 0, made.stderr || made.stdout);
  const direct = runSync(briefingFor(acme));
  const route = (r: string) => node("packages/naive/src/interfaces/cli/mentura.ts", r, "run", "--venture", "acme");
  const read = (out: string): unknown => { try { return (JSON.parse(out) as { briefing?: unknown }).briefing; } catch { return null; } };
  const whole = route("operations/activity-briefing");
  expect("operations/activity-briefing returns the briefing for every function the venture lists", whole.status === 0 && direct.length > 1 && JSON.stringify(read(whole.stdout)) === JSON.stringify(direct), whole.stderr || whole.stdout.slice(0, 300));
  const one = route("operations/activity-briefing/strategy");
  expect("operations/activity-briefing/<function> returns that one function", one.status === 0 && JSON.stringify(read(one.stdout)) === JSON.stringify(direct.filter((b) => b.function === "strategy")), one.stderr || one.stdout.slice(0, 300));
  const unlisted = route("operations/activity-briefing/assets");
  expect("a function the venture does not list is refused through the route, naming the ones it lists", unlisted.status !== 0 && /does not list the function assets/.test(unlisted.stdout + unlisted.stderr), [unlisted.status, unlisted.stdout.slice(0, 300), unlisted.stderr.slice(0, 300)]);
  expect("a function Naive does not have has no route", /no route/.test((() => { const x = route("operations/activity-briefing/nope"); return x.stdout + x.stderr; })()));
} finally { rmSync(ws, { recursive: true, force: true }); }

console.log(failed ? `${failed} failed` : "all passed");
process.exit(failed ? 1 : 0);
