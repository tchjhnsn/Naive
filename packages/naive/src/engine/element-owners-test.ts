// Tests who is accountable for each element of APQC's framework (EE-187): the default per function, inheritance, an
// owner the venture names, the delegation root for an activity a person performs or approves, and the problems the
// check fails on. The pure tests use a small framework written here; the command runs on a venture folder made here.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runSync } from "../core/effect/run.ts";
import { ownerInputs, ownerProblems, parentOf, resolveOwners, responsibleFor } from "./element-owners.ts";
import type { OwnerInputs, RoleInfo } from "./element-owners.ts";
import type { ActivityCatalog, Pcf } from "../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const el = (id: string, level: number, name = `Element ${id}`) => ({ id, name, pcf: 1, level });
const pcf: Pcf = {
  version: "8.0", edition: "cross-industry", published: "2024-01", source: "apqc-pcf-8", attribution: "APQC", note: "test",
  elements: [
    el("3.0", 1), el("3.1", 2), el("3.1.1", 3), el("3.1.1.1", 4, "Conduct research"), el("3.1.1.1.1", 5),
    el("3.1.1.2", 4, "Select key accounts"), el("3.1.1.2.1", 5),
    el("3.2", 2), el("3.2.1", 3), el("3.2.1.1", 4, "Select partners"),
    el("9.0", 1), el("9.1", 2),
  ],
} as Pcf;
const roles = new Map<string, RoleInfo>([
  ["marketing-and-sales-agent", { kind: "agent", reach: ["marketing-and-sales"] }],
  ["finance-agent", { kind: "agent", reach: ["finance"] }],
  ["growth-lead", { kind: "agent", reach: ["marketing-and-sales", "customer-service"] }],
  ["founder", { kind: "person", reach: "all" }],
]);
const base: OwnerInputs = {
  pcf, categories: new Map([["3.0", "marketing-and-sales"], ["9.0", "finance"]]), functions: ["marketing-and-sales"],
  owners: {}, roles, root: "founder",
  responsible: new Map([["3.1.1.1", { performer: "agent" }], ["3.1.1.2", { performer: "person" }], ["3.2.1.1", { performer: "agent", approval: "person" }]]),
};
const by = (i: OwnerInputs) => new Map(resolveOwners(i).map((e) => [e.id, e]));

expect("a parent is the id less its last part, and a process group's parent is its category", parentOf("3.1.1.2", 4) === "3.1.1" && parentOf("3.1", 2) === "3.0" && parentOf("3.0", 1) === null);

const d = by(base);
expect("a category the venture lists is owned by its function's agent, by default", d.get("3.0")?.owner?.role === "marketing-and-sales-agent" && d.get("3.0")?.kind === "agent" && d.get("3.0")?.source === "default", d.get("3.0"));
expect("every element below inherits it, naming the category it came from", d.get("3.1.1")?.owner?.role === "marketing-and-sales-agent" && d.get("3.1.1")?.source === "inherited" && d.get("3.1.1")?.from === "3.0" && d.get("3.1.1.1.1")?.from === "3.0", d.get("3.1.1.1.1"));
expect("an activity a person performs is owned by the delegation root, a person, and its task inherits from the activity", d.get("3.1.1.2")?.owner?.role === "founder" && d.get("3.1.1.2")?.kind === "person" && d.get("3.1.1.2")?.source === "root" && d.get("3.1.1.2.1")?.owner?.role === "founder" && d.get("3.1.1.2.1")?.from === "3.1.1.2", [d.get("3.1.1.2"), d.get("3.1.1.2.1")]);
expect("an activity an agent performs and a person approves is the root's too", d.get("3.2.1.1")?.owner?.role === "founder" && d.get("3.2.1.1")?.approval === "person", d.get("3.2.1.1"));
expect("an activity shows who performs it beside who answers for it", d.get("3.1.1.1")?.performer === "agent" && d.get("3.1.1.1")?.owner?.role === "marketing-and-sales-agent" && d.get("3.1.1.2")?.performer === "person");
expect("a category the venture does not list has no owner, and neither do its elements", d.get("9.0")?.owner === null && d.get("9.1")?.owner === null && d.get("9.1")?.source === null);

const named = by({ ...base, owners: { "3.1": { role: "growth-lead" }, "3.2": { person: "Ana Ruiz" }, "3.1.1.2": { role: "growth-lead" } } });
expect("an owner the venture names wins and passes down from there", named.get("3.1")?.source === "explicit" && named.get("3.1.1.1")?.owner?.role === "growth-lead" && named.get("3.1.1.1")?.from === "3.1", named.get("3.1.1.1"));
expect("a named person passes down to an activity a person approves, since a person already answers for it", named.get("3.2.1.1")?.owner?.person === "Ana Ruiz" && named.get("3.2.1.1")?.kind === "person" && named.get("3.2.1.1")?.source === "inherited", named.get("3.2.1.1"));
expect("an agent the venture names for an activity a person performs stands: the venture's word wins over the root", named.get("3.1.1.2")?.owner?.role === "growth-lead" && named.get("3.1.1.2")?.source === "explicit", named.get("3.1.1.2"));
expect("an element of the other category keeps its own default", named.get("3.0")?.source === "default");

const catalog = { kinds: [{ id: "decision", performer: "person", when: [{ verbs: ["select"] }], basis: "test" }], activities: [], scales: [] } as unknown as ActivityCatalog;
const r = responsibleFor(pcf, catalog, { activities: { "3.1.1.2": { performer: "agent" }, "3.1.1.1": { approval: "person" } } });
expect("the venture's assignment says who performs an activity, else its kind, else an agent", r.get("3.1.1.2")?.performer === "agent" && r.get("3.2.1.1")?.performer === "person" && r.get("3.1.1.1")?.performer === "agent" && r.get("3.1.1.1")?.approval === "person", [...r]);

const problems = (i: OwnerInputs) => ownerProblems(i, resolveOwners(i));
expect("good owners have no problems", problems({ ...base, owners: { "3.1": { role: "growth-lead" }, "3.2": { person: "Ana" } } }).length === 0, problems(base));
const p1 = problems({ ...base, owners: { "3.1": { role: "growth-agent" } } });
expect("an owner naming a role that does not exist is a problem", p1.length === 1 && p1[0].includes("growth-agent") && p1[0].includes("not a role"), p1);
const p2 = problems({ ...base, functions: ["marketing-and-sales", "finance"], owners: { "9.1": { role: "growth-lead" }, "3.1": { role: "finance-agent" } } });
expect("a lead outside its portfolio and a function agent outside its function are problems", p2.length === 2 && p2.every((p) => p.includes("answers only for")), p2);
const p3 = problems({ ...base, owners: { "7.7": { role: "founder" }, "9.1": { role: "founder" } } });
expect("an element APQC lacks, and one under a function the venture does not list, are problems", p3.some((p) => p.includes("7.7 is not an element")) && p3.some((p) => p.includes("9.1 is under finance")), p3);
const p4 = problems({ ...base, root: "nobody" });
expect("a delegation root that is not a role is a problem when an activity needs it", p4.some((p) => p.includes("delegation root nobody")), p4);
const p5 = ownerProblems(base, resolveOwners(base).map((e) => (e.id === "3.1.1" ? { ...e, owner: null, kind: null, source: null } : e)));
expect("an element of a listed function with no owner is a problem", p5.some((p) => p.startsWith("3.1.1 ") && p.endsWith("no owner")), p5);

const dir = mkdtempSync(join(tmpdir(), "naive-owners-"));
try {
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t", name: "T", phase: "discovery", departments: ["marketing-and-sales", "finance"] }));
  mkdirSync(join(dir, "operations"), { recursive: true });
  writeFileSync(join(dir, "operations", "element-owners.json"), JSON.stringify({ owners: { "3.5": { role: "growth-lead" }, "9.0": { person: "Ana Ruiz" } } }));
  const inputs = runSync(ownerInputs(dir));
  expect("a venture's inputs read its functions, its owners, Naive's roles and the template's delegation root", inputs.functions.join() === "marketing-and-sales,finance" && inputs.owners["3.5"]?.role === "growth-lead" && inputs.roles.get("growth-lead")?.kind === "agent" && inputs.roles.get("founder")?.kind === "person" && inputs.roles.get("risk-and-compliance-agent")?.kind === "agent" && inputs.root === "founder");
  const real = new Map(resolveOwners(inputs).map((e) => [e.id, e]));
  expect("on the shipped framework, every element of a listed function is owned and the problems are none", ownerProblems(inputs, [...real.values()]).length === 0 && [...real.values()].filter((e) => ["marketing-and-sales", "finance"].includes(e.function)).every((e) => e.owner));
  expect("on the shipped framework, an activity a person performs by its kind goes to the root even under a lead the venture named", real.get("3.5.2.1")?.source === "root" && real.get("3.5.2.1")?.owner?.role === "founder" && real.get("3.5.2.2")?.owner?.role === "growth-lead" && real.get("3.5.2.2")?.from === "3.5", [real.get("3.5.2.1"), real.get("3.5.2.2")]);
  const cli = (...args: string[]) => spawnSync(process.execPath, [new URL("./element-owners.ts", import.meta.url).pathname, ...args], { encoding: "utf8" });
  const top = cli(dir, "--level", "1");
  expect("the command lists each category the venture runs with its owner, kind and source", top.status === 0 && /^3\.0 .*: marketing-and-sales-agent \(agent, default\)$/m.test(top.stdout) && /^9\.0 .*: Ana Ruiz \(person, explicit\)$/m.test(top.stdout) && !/^1\.0 /m.test(top.stdout), top.stdout + top.stderr);
  const asJson = cli(dir, "--function", "marketing-and-sales", "--level", "2", "--json");
  const groups = JSON.parse(asJson.stdout || "{}").owners ?? [];
  expect("--json with --function and --level gives just those elements", asJson.status === 0 && groups.length > 0 && groups.every((e: { level: number, function: string }) => e.level === 2 && e.function === "marketing-and-sales") && groups.find((e: { id: string }) => e.id === "3.5")?.source === "explicit", asJson.stdout.slice(0, 300) + asJson.stderr);
  const off = cli(dir, "--function", "strategy");
  expect("a function the venture does not list is refused", off.status === 2 && off.stderr.includes("does not list the function strategy"), off.stderr);
  const naive = spawnSync(process.execPath, [new URL("../interfaces/cli/naive.ts", import.meta.url).pathname, "owners", "--venture", dir, "--level", "1"], { encoding: "utf8" });
  expect("naive owners runs the same command for a venture", naive.status === 0 && naive.stdout === top.stdout, naive.stdout + naive.stderr);
} finally { rmSync(dir, { recursive: true, force: true }); }

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log("\nall passed");
