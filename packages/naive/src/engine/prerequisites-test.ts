// Tests prerequisites (EE-217): the pure verdict over facts, the override rule, the check the function modules are
// held to, the shipped chain, and the lock end to end over venture folders made here, through `naive blocked`, what is
// due, the loop's plan, `naive agent run` and a write through the router, for an agent and for a person alike.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { runSync } from "../core/effect/run.ts";
import { due } from "./due.ts";
import type { DueWorkflow } from "./due.ts";
import { plan } from "./loop.ts";
import { resolve as resolveRoute } from "../records/routes/routes.ts";
import {
  allFlows, blockedForEffect, blockedList, blockedWrite, judge, overrideProblem, PRE_REGISTRATION, prerequisiteProblems,
  prerequisitesOf, requireProblems, requirementsIn, routeKey, writersOf,
} from "./prerequisites.ts";
import type { Facts, Flow, Requirement } from "./prerequisites.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };

// ---------------------------------------------------------------------------------------------------------------
// The verdict, over facts given as plain data.

const facts = (over: Partial<Facts> = {}): Facts => ({
  live: new Set(["foundation/problem"]), known: new Set(["foundation/problem", "foundation/icp"]),
  workflows: new Set(["strategy/intake", "products/intake"]), meetings: [], decisions: [], unresolved: new Map(), ...over,
});
const req = (kind: Requirement["kind"], ref: string): Requirement => ({ kind, ref });

expect("entries are read in kind order, records then meetings then decisions", requirementsIn({ decisions: ["d"], meetings: ["f/w"], records: ["r"] }).map((r) => r.kind).join() === "record,meeting,decision");
expect("no entries is met", judge([], facts()).met && judge(requirementsIn(undefined), facts()).met);
expect("a live record is met", judge([req("record", "foundation/problem")], facts()).met);

const noIcp = judge([req("record", "foundation/icp")], facts());
expect("a record that is not live blocks, and says to write it", !noIcp.met && noIcp.missing[0].state === "missing" && /no record is live at foundation\/icp/.test(noIcp.missing[0].why), noIcp);
const unknownRoute = judge([req("record", "foundation/nowhere")], facts());
expect("a record route this install does not serve is unresolved, so it fails closed", !unknownRoute.met && unknownRoute.missing[0].state === "unresolved", unknownRoute);

const noMeeting = judge([req("meeting", "strategy/intake")], facts());
expect("a meeting nobody held blocks, and says to hold it and close it", !noMeeting.met && /no meeting has walked strategy\/intake/.test(noMeeting.missing[0].why), noMeeting);
expect("a meeting still open blocks", !judge([req("meeting", "strategy/intake")], facts({ meetings: [{ workflow: "strategy/intake", status: "open" }] })).met);
expect("a meeting closed without its goal reached blocks", !judge([req("meeting", "strategy/intake")], facts({ meetings: [{ workflow: "strategy/intake", status: "closed", outcome: { reached: "partly" } }] })).met);
expect("a meeting closed with its goal reached is met", judge([req("meeting", "strategy/intake")], facts({ meetings: [{ workflow: "strategy/intake", status: "closed", outcome: { reached: "yes" } }] })).met);
expect("a meeting entry naming no workflow is unresolved", judge([req("meeting", "strategy/nothing")], facts()).missing[0].state === "unresolved");
const unread = judge([req("meeting", "strategy/intake")], facts({ unresolved: new Map([["meeting", "a meeting file cannot be read"]]) }));
expect("a meeting this cannot resolve fails closed, whatever the meetings say", !unread.met && unread.missing[0].state === "unresolved", unread);

expect("a decided decision is met", judge([req("decision", "d-1")], facts({ decisions: [{ id: "d-1", status: "decided" }] })).met);
expect("an open decision blocks, and says only a person decides it", /only a person decides it/.test(judge([req("decision", "d-1")], facts({ decisions: [{ id: "d-1", status: "open" }] })).missing[0].why));
expect("a decision the venture does not have blocks", !judge([req("decision", "d-1")], facts()).met);

const off = judge([req("record", "foundation/icp"), req("meeting", "strategy/intake")], facts(), new Set(["foundation/icp", "meeting strategy/intake"]));
expect("an entry a person turned off does not block, by ref or by kind and ref", off.met, off);
expect("the same entry named twice is one entry", judge([req("record", "foundation/icp"), req("record", "foundation/icp")], facts()).missing.length === 1);
expect("every entry that blocks is reported, not just the first", judge([req("record", "foundation/icp"), req("meeting", "strategy/intake")], facts()).missing.length === 2);

// ---------------------------------------------------------------------------------------------------------------
// Who may override.

expect("a person who says who they are and why may override", overrideProblem({ actor: "person", override: { by: "Torian", why: "the meeting is on the calendar" } }) === null);
expect("an agent never overrides", /never overrides/.test(String(overrideProblem({ actor: "agent", override: { by: "strategy-agent", why: "it is fine" } }))));
expect("a person's call made while an agent is acting never overrides", /never overrides/.test(String(overrideProblem({ actor: "person", acting: true, override: { by: "Torian", why: "x" } }))));
expect("an override names the person", /names the person/.test(String(overrideProblem({ actor: "person", override: { why: "x" } }))));
expect("an override says why", /says why/.test(String(overrideProblem({ actor: "person", override: { by: "Torian" } }))));
expect("no override is no override", overrideProblem({ actor: "person" }) === "no override was named");

// ---------------------------------------------------------------------------------------------------------------
// The check the function modules are held to.

const flow = (id: string, over: Partial<Flow> = {}): [string, Flow] => [id, { id: id.split("/")[1], function: id.split("/")[0], ...over }];
const modules = new Map<string, Flow>([
  flow("a/intake", { steps: [{ id: "write", writes: ["foundation/problem"] }] }),
  flow("b/intake", { requires: { records: ["foundation/problem"], meetings: ["a/intake"] }, steps: [{ id: "write", writes: ["product/[id]"] }] }),
]);
const ok = { recordRoute: (ref: string) => ["foundation/problem", "product"].includes(ref), hasWorkflow: (id: string) => modules.has(id) };
expect("a chain that resolves has no findings", requireProblems(modules, ok).length === 0, requireProblems(modules, ok));
expect("a record entry that is no route is a finding", requireProblems(new Map([flow("b/x", { requires: { records: ["nowhere"] } })]), ok).some((p) => /is no record route/.test(p.error)));
expect("a meeting entry that is no workflow is a finding", requireProblems(new Map([flow("b/x", { requires: { meetings: ["a/gone"] } })]), ok).some((p) => /is no function workflow/.test(p.error)));
expect("a shipped workflow naming a decision is a finding", requireProblems(new Map([flow("b/x", { requires: { decisions: ["d-1"] } })]), ok).some((p) => /cannot know a venture's decision ids/.test(p.error)));
expect("a step's requires is checked too", requireProblems(new Map([flow("b/x", { steps: [{ id: "s", requires: { records: ["nowhere"] } }] })]), ok).some((p) => /step s names record nowhere/.test(p.error)));
const cycle = new Map<string, Flow>([
  flow("a/x", { requires: { records: ["product"] }, steps: [{ id: "s", writes: ["foundation/problem"] }] }),
  flow("b/y", { requires: { records: ["foundation/problem"] }, steps: [{ id: "s", writes: ["product/[id]"] }] }),
]);
expect("two workflows waiting on each other is a cycle, which would lock both for good", requireProblems(cycle, ok).some((p) => /requires is a cycle/.test(p.error)), requireProblems(cycle, ok));
expect("a workflow that requires a record it writes itself is not a cycle", requireProblems(new Map([flow("a/x", { requires: { records: ["foundation/problem"] }, steps: [{ id: "s", writes: ["foundation/problem"] }] })]), ok).length === 0);

expect("a collection route and its item route are one place", routeKey("foundation/goals/[id]") === "foundation/goals" && routeKey("product/*") === "product" && routeKey("foundation/problem") === "foundation/problem");

// The pre-registration tier (EE-220) turns itself on when its route lands, so the entry cannot be forgotten.
const writesFoundation = new Map([flow("a/intake", { steps: [{ id: "s", writes: ["foundation/goals/[id]"] }] })]);
const noRoute = { ...ok, recordRoute: (ref: string) => ref !== PRE_REGISTRATION && ok.recordRoute(ref) };
const withRoute = { ...ok, recordRoute: (ref: string) => ref === PRE_REGISTRATION || ok.recordRoute(ref) };
expect("while the pre-registration route does not exist, nothing is asked of a workflow that writes a foundation record", requireProblems(writesFoundation, noRoute).length === 0);
expect("once it exists, a workflow that writes a foundation record must require it", requireProblems(writesFoundation, withRoute).some((p) => /must require the record foundation\/pre-registration/.test(p.error)), requireProblems(writesFoundation, withRoute));
expect("and one that requires it passes", requireProblems(new Map([flow("a/intake", { requires: { records: [PRE_REGISTRATION] }, steps: [{ id: "s", writes: ["foundation/goals/[id]"] }] })]), withRoute).length === 0);
expect("the chain Naive ships is clean under the rule the modules are checked by today", requireProblems(allFlows(), { recordRoute: (ref) => resolveRoute(ref).r?.kind === "record", hasWorkflow: (id) => allFlows().has(id) }).length === 0);

// ---------------------------------------------------------------------------------------------------------------
// The chain Naive ships, read from the modules themselves.

expect("strategy intake is the root: it requires nothing", !allFlows().get("strategy/intake")?.requires);
expect("products intake waits on the strategy foundation and the strategy meeting", JSON.stringify(allFlows().get("products/intake")?.requires) === JSON.stringify({ records: ["foundation/problem", "foundation/icp", "foundation/goals"], meetings: ["strategy/intake"] }));
expect("the product card is written by the products intake alone, so the chain really locks it", writersOf("product/kettle", "product/[id]").join() === "products/intake");
expect("the strategy foundation is written by the strategy intake, so the lock can always be opened", writersOf("foundation/problem").includes("strategy/intake"));

// ---------------------------------------------------------------------------------------------------------------
// A venture folder, end to end.

const repo = new URL("../../../..", import.meta.url).pathname;
// A command's output, both streams: a refusal is printed on stderr and an answer on stdout.
const node = (args: string[], env: Record<string, string> = {}) => { const p = spawnSync("node", args, { encoding: "utf8", env: { ...process.env, ...env } }); return { ...p, out: p.stdout + p.stderr }; };
const ws = mkdtempSync(join(tmpdir(), "naive-prereq-"));
const dir = join(ws, "ventures", "acme");
mkdirSync(join(dir, "foundation"), { recursive: true });
const write = (rel: string, body: unknown) => { mkdirSync(join(dir, rel.split("/").slice(0, -1).join("/")), { recursive: true }); writeFileSync(join(dir, rel), typeof body === "string" ? body : JSON.stringify(body, null, 2) + "\n"); };
write("venture.json", { id: "acme", name: "Acme", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery", departments: ["strategy", "products"] });

const blocked = () => runSync(blockedForEffect(dir));
expect("with no foundation, every workflow that waits on one is blocked and the root is not", blocked().get("strategy/intake")?.met === true && blocked().get("products/intake")?.met === false && blocked().get("strategy/strategy-review")?.met === false, [...blocked()].map(([k, v]) => [k, v.met]));
expect("prerequisitesOf answers the one shape every caller reads", (() => { const p = prerequisitesOf(dir, "products/intake"); return p.met === false && p.missing.every((m) => m.kind && m.ref && m.why && m.state); })(), prerequisitesOf(dir, "products/intake"));
expect("a step inherits its workflow's entries", prerequisitesOf(dir, "products/intake", "ask-products").missing.length === prerequisitesOf(dir, "products/intake").missing.length);
expect("a step the workflow does not have cannot be asked about", (() => { try { prerequisitesOf(dir, "products/intake", "nope"); return false; } catch { return true; } })());

write("foundation/problem.json", { venture: "acme", problem: "Nobody can tell what is blocked." });
write("foundation/icp/primary.json", { venture: "acme", id: "primary", name: "Solo founder" });
write("foundation/goals/telos.json", { venture: "acme", id: "telos", goal: "Know what is blocked." });
const withFoundation = blocked();
expect("the records being live settles the record entries", withFoundation.get("products/intake")?.missing.every((m) => m.kind === "meeting") === true, withFoundation.get("products/intake"));
expect("the meeting a person must hold still blocks, and says to hold it and close it", withFoundation.get("products/intake")?.met === false && /no meeting has walked strategy\/intake/.test(withFoundation.get("products/intake")?.missing[0].why ?? ""), withFoundation.get("products/intake"));

// A meeting (EE-200) that walked the workflow but is not closed with its goal reached does not settle it.
const meeting = (over: Record<string, unknown>) => write("operations/meetings/founding-strategy.json", {
  venture: "acme", id: "founding-strategy", title: "Founding strategy", goal: "Settle what Acme is for and for whom.",
  outcome_expected: ["a problem record", "a primary customer profile"], workflow: "strategy/intake", called_by: "Torian",
  attendees: [{ id: "Torian", kind: "person" }, { id: "strategy-agent", kind: "agent" }], status: "open", opened_at: "2026-11-26T18:00:00Z",
  agenda: [{ id: "telos", title: "What is Acme for?", status: "done" }], ...over,
});
meeting({});
expect("a meeting still open does not settle the entry", blocked().get("products/intake")?.met === false);
meeting({ status: "closed", closed_at: "2026-11-26T19:00:00Z", outcome: { reached: "partly", summary: "The customer is still open." } });
expect("a meeting closed without its goal reached does not settle it either", blocked().get("products/intake")?.met === false);
meeting({ status: "closed", closed_at: "2026-11-26T19:00:00Z", outcome: { reached: "yes", summary: "Problem and customer settled, and drafted." } });
expect("the meeting closed with its goal reached unblocks the work that waited on it", blocked().get("products/intake")?.met === true, blocked().get("products/intake"));
expect("a workflow that waits on a record still missing stays blocked", blocked().get("marketing-and-sales/intake") === undefined && blocked().get("products/weekly-product-review")?.met === false);
rmSync(join(dir, "operations/meetings/founding-strategy.json"));

// The meeting entry is the one a person opens. A venture turns it off under prerequisites, naming the person.
write("naive.config.json", { prerequisites: { set_by: { person: "Torian", at: "2026-11-26T20:20:00Z" }, workflows: { "products/intake": { off: ["meeting strategy/intake"] } } } });
expect("a person's naive.config.json entry opens that lock and nothing else", blocked().get("products/intake")?.met === true && blocked().get("strategy/strategy-review")?.met === false, [...blocked()].map(([k, v]) => [k, v.met]));
expect("check-config takes an off that names an entry the workflow has", node([join(repo, "packages/naive/src/checks/check-config.ts"), dir]).status === 0);
write("naive.config.json", { prerequisites: { set_by: { person: "Torian", at: "2026-11-26T20:20:00Z" }, workflows: { "products/intake": { off: ["foundation/nothing"] } } } });
const badOff = node([join(repo, "packages/naive/src/checks/check-config.ts"), dir]);
expect("check-config fails an off that names no entry of that workflow, which would open nothing", badOff.status === 1 && /turns off foundation\/nothing/.test(badOff.out), badOff.out);
expect("prerequisiteProblems fails a workflow the venture does not have", prerequisiteProblems({ set_by: { person: "T", at: "x" }, workflows: { "finance/intake": {} } }, ["strategy/intake"]).some((p) => /not a workflow of a function this venture lists/.test(p)));
rmSync(join(dir, "naive.config.json"));

// naive blocked: hierarchical order, and what unblocks each one first.
const rows = runSync(blockedList(dir));
expect("naive blocked lists every workflow of the venture's functions, in phase then function then workflow order", rows.length === blocked().size && rows.every((r) => ["strategy", "products"].includes(r.function)), rows.map((r) => `${r.phase} ${r.workflow}`));
expect("each row says what unblocks it first", rows.filter((r) => !r.met).every((r) => r.first !== null && r.first.why.length > 0));
const cli = node([join(repo, "packages/naive/src/engine/prerequisites.ts"), dir, "--json"]);
const cliRows = JSON.parse(cli.stdout) as { blocked: number; workflows: { workflow: string; met: boolean }[] };
expect("the command answers the same, and counts what is blocked", cli.status === 0 && cliRows.blocked === rows.filter((r) => !r.met).length, cli.stderr);

// What is due, and what the loop would do: blocked, never started.
const flows: DueWorkflow[] = [{ id: "intake", function: "products", title: "Learn the venture's products", trigger: { kind: "intake" } }];
const entries = due(flows, [], [], "2026-11-26T00:00:00.000Z", new Set(["products/intake"]), [], blocked());
expect("a blocked workflow is blocked, not due, whatever its trigger says", entries[0].status === "blocked" && entries[0].missing.length > 0, entries[0]);
const steps = plan(entries, { mode: "auto", set_by: { person: "Torian", at: "x" } }, new Map(), true);
expect("the loop plans a blocked workflow as blocked and starts nothing, even in auto", steps.length === 1 && steps[0].action === "blocked" && /not met/.test(steps[0].why), steps);
expect("what is due says nothing is startable while it is blocked", due(flows, [], [], "2026-11-26T00:00:00.000Z", new Set(), [], blocked()).every((e) => e.status !== "due"));

// naive agent run refuses a blocked workflow by name.
const agent = node([join(repo, "packages/naive/src/engine/agents/run.ts"), "run", "products-agent", "Run it", "--venture", dir, "--workflow", "products/intake", "--print"]);
expect("naive agent run refuses a blocked workflow and says what is missing", agent.status === 1 && /is blocked, so it was not run/.test(agent.stderr), agent.stderr || agent.stdout.slice(0, 200));
const open = node([join(repo, "packages/naive/src/engine/agents/run.ts"), "run", "strategy-agent", "Run it", "--venture", dir, "--workflow", "strategy/intake", "--print"]);
expect("and runs one whose ground is there", open.status === 0, open.stderr);

// The router: a write to a route only blocked workflows write is refused, for an agent and for a person alike.
const lock = blockedWrite(dir, { route: "product/kettle", table: "product/[id]" });
expect("the lock on a write names the workflows that write the route and what they are missing", lock !== null && lock.workflows.join() === "products/intake" && lock.missing.length > 0, lock);
expect("a decision is never locked, so the question that opens a lock always gets through", blockedWrite(dir, { route: "decisions/x", table: "decisions/[id]" }) === null && blockedWrite(dir, { route: "operations/handoff/h1", table: "operations/handoff/[id]" }) === null);
expect("a route no workflow writes is not locked", blockedWrite(dir, { route: "foundation/alignment", table: "foundation/alignment" }) === null);

const mentura = (args: string[]) => node([join(repo, "packages/naive/src/interfaces/cli/mentura.ts"), ...args], { MENTURA_WORKSPACE: ws });
const card = join(ws, "card.json");
writeFileSync(card, JSON.stringify({ id: "kettle", name: "Kettle", description: "A kettle that knows when the water is right.", status: "idea" }) + "\n");
const asAgent = mentura(["product/kettle", "write", "--venture", "acme", "--input", card, "--json"]);
expect("an agent's write to a locked route is refused, naming the workflow that writes it and what it waits on", asAgent.status === 1 && /written by products\/intake, and it is blocked/.test(asAgent.out) && /no meeting has walked strategy\/intake/.test(asAgent.out), asAgent.out.slice(0, 400));
const asPerson = mentura(["product/kettle", "write", "--venture", "acme", "--as", "person", "--input", card, "--json"]);
expect("a person's write is refused too, and told how to pass or open the lock", asPerson.status === 1 && /and it is blocked/.test(asPerson.out) && /--override --by/.test(asPerson.out) && /naive blocked/.test(asPerson.out), asPerson.out.slice(0, 400));
const agentOverride = mentura(["product/kettle", "write", "--venture", "acme", "--input", card, "--override", "--by", "products-agent", "--why", "it is fine", "--json"]);
expect("an agent's override does not count", agentOverride.status === 1 && /never overrides/.test(agentOverride.out), agentOverride.out.slice(0, 400));
const noWhy = mentura(["product/kettle", "write", "--venture", "acme", "--as", "person", "--input", card, "--override", "--by", "Torian", "--json"]);
expect("a person's override with no reason does not count", noWhy.status === 1 && /says why/.test(noWhy.out), noWhy.out.slice(0, 400));
const passed = mentura(["product/kettle", "write", "--venture", "acme", "--as", "person", "--input", card, "--override", "--by", "Torian", "--why", "the meeting is on the calendar", "--json"]);
expect("a person's override with who and why writes the record", /"ok": true/.test(passed.out), passed.out.slice(0, 400));
const line = readFileSync(join(dir, "provenance.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { entity: string; override?: { by: string; why: string; missing: string[] } }).at(-1);
expect("the provenance line keeps who overrode what and why", line?.override?.by === "Torian" && /meeting is on the calendar/.test(line?.override?.why ?? "") && (line?.override?.missing ?? []).some((m) => m.startsWith("meeting ")), line);
const again = mentura(["product/kettle", "write", "--venture", "acme", "--as", "person", "--input", card, "--json"]);
expect("the lock stays shut for the next write: an override is one write, not a setting", again.status === 1 && /and it is blocked/.test(again.out), again.out.slice(0, 300));

rmSync(ws, { recursive: true, force: true });

console.log(failed ? `\n${failed} failing` : "\nprerequisites: all pass");
process.exitCode = failed ? 1 : 0;
