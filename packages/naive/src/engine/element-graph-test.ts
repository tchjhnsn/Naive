// Tests the element graph (EE-188): the edges built from a small fixture, the derived feeds and their evidence,
// upstream and downstream, unfed and unread routes, determinism over input order, the shipped function modules, and
// the command.
import { spawnSync } from "node:child_process";
import { runSync } from "../core/effect/run.ts";
import { buildGraph, downstream, elementOf, functionMermaid, shippedInput, toJson, unfed, unread, upstream } from "./element-graph.ts";
import type { GraphInput, GraphWorkflow } from "./element-graph.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 800)}`}`); if (!ok) failed++; };

const step = (id: string, extra: Partial<GraphWorkflow["steps"][number]> = {}): GraphWorkflow["steps"][number] => ({ id, do: id, ...extra });
const fixture: GraphInput = {
  elements: [
    { id: "1.0", name: "Plan", level: 1, parent: null },
    { id: "1.1", name: "Plan group", level: 2, parent: "1.0" },
    { id: "1.1.1", name: "Plan process", level: 3, parent: "1.1" },
    { id: "1.1.1.1", name: "Set goals", level: 4, parent: "1.1.1" },
    { id: "1.1.1.2", name: "Unused", level: 4, parent: "1.1.1" },
    { id: "2.0", name: "Sell", level: 1, parent: null },
    { id: "2.1", name: "Sell group", level: 2, parent: "2.0" },
    { id: "2.1.1", name: "Sell process", level: 3, parent: "2.1" },
    { id: "2.1.1.1", name: "Work the pipeline", level: 4, parent: "2.1.1" },
    { id: "2.1.1.2", name: "Close deals", level: 4, parent: "2.1.1" },
    { id: "call-buyers", name: "Call buyers.", level: 3, parent: "2.1" },
    { id: "3.0", name: "Serve", level: 1, parent: null },
  ],
  functions: [{ id: "plan", category: "1.0" }, { id: "sell", category: "2.0" }, { id: "serve", category: "3.0" }],
  workflows: [
    { id: "goals", function: "plan", title: "Goals", trigger: { kind: "schedule", cadence: "monthly" }, reads: ["goals", "inbox"],
      steps: [step("set", { activity: "1.1.1.1", writes: ["goals/[id]"] }), step("note", { writes: ["notes/[id]"] })] },
    { id: "pipeline", function: "sell", title: "Pipeline", trigger: { kind: "schedule", cadence: "weekly" }, reads: ["goals", "deals"],
      steps: [step("work", { activity: "2.1.1.1", writes: ["deals/[id]"] }), step("close", { activity: "2.1.1.2" }), step("call", { activity: "call-buyers" })] },
    { id: "won", function: "serve", title: "Won deals", trigger: { kind: "event", route: "deals/[id]" }, reads: [], steps: [step("start")] },
  ],
  records: { "goals": ["goal"], "goals/[id]": ["goal"], "deals": ["deal"], "deals/[id]": ["deal"], "notes/[id]": ["note"] },
};
const g = buildGraph(fixture);
const json = toJson(g);
const has = (from: string, to: string, kind: string) => json.edges.some((e) => e.from === from && e.to === to && e.kind === kind);

expect("only functions, the activities steps name and their ancestors become element nodes", json.nodes.filter((n) => n.kind === "element").map((n) => n.id).join() === "1.0,1.1,1.1.1,1.1.1.1,2.0,2.1,2.1.1,2.1.1.1,2.1.1.2,3.0,call-buyers", json.nodes.map((n) => n.key));
expect("the PCF hierarchy and a catalog activity under its process group are contains edges", has("element:1.1.1", "element:1.1.1.1", "contains") && has("element:2.1", "element:call-buyers", "contains") && has("element:1.0", "element:1.1", "contains"));
expect("a workflow belongs to its function's category and performs its steps' activities, naming the step", has("workflow:sell/pipeline", "element:2.0", "belongs-to") && json.edges.some((e) => e.kind === "performs" && e.from === "workflow:sell/pipeline" && e.to === "element:call-buyers" && e.step === "call"));
expect("steps write, workflows read, an event trigger listens, and a route resolves to its record type", json.edges.some((e) => e.kind === "writes" && e.from === "workflow:plan/goals" && e.to === "route:goals/[id]" && e.step === "set") && has("workflow:sell/pipeline", "route:goals", "reads") && has("workflow:serve/won", "route:deals/[id]", "listens") && has("route:goals", "record:goal", "resolves") && has("route:goals/[id]", "record:goal", "resolves"));

const planDown = downstream(g, "plan");
expect("a function feeds another when what it writes resolves to a record type the other reads, with the evidence", planDown.length === 1 && planDown[0].element.id === "2.0" && planDown[0].evidence.length === 1
  && JSON.stringify(planDown[0].evidence[0]) === JSON.stringify({ writer: "plan/goals", step: "set", wrote: "goals/[id]", reader: "sell/pipeline", read: "goals", via: "read", record: "goal" }), planDown);
const serveUp = upstream(g, "3.0");
expect("an event trigger on a written route is a feed by trigger", serveUp.length === 1 && serveUp[0].element.id === "2.0" && serveUp[0].evidence[0].via === "trigger" && serveUp[0].evidence[0].step === "work", serveUp);
expect("feeds join elements of the same level: activity to activity, and no activity to a function", downstream(g, "1.1.1.1").map((n) => n.element.id).join() === "2.1.1.1,2.1.1.2" && upstream(g, "2.1.1.1").map((n) => n.element.id).join() === "1.1.1.1" && upstream(g, "2.0").map((n) => n.element.id).join() === "1.0");
expect("a workflow reading what it wrote itself is not a feed, even between two of its activities", !json.edges.some((e) => e.kind === "feeds" && e.from === e.to) && upstream(g, "plan").length === 0 && upstream(g, "2.1.1.2").map((n) => n.element.id).join() === "1.1.1.1" && upstream(g, "call-buyers").map((n) => n.element.id).join() === "1.1.1", upstream(g, "call-buyers"));
expect("a function id names its category, and an unknown id names nothing", elementOf(g, "sell")?.id === "2.0" && elementOf(g, "1.1.1.2") === undefined && upstream(g, "nope").length === 0);
expect("a route read that no workflow writes is unfed, with its readers", JSON.stringify(unfed(g)) === JSON.stringify([{ route: "inbox", records: [], by: ["plan/goals"] }]), unfed(g));
expect("a route written that no workflow reads is unread, with its writing steps", JSON.stringify(unread(g)) === JSON.stringify([{ route: "notes/[id]", records: ["note"], by: ["plan/goals#note"] }]), unread(g));

const shuffled: GraphInput = { ...fixture, elements: [...fixture.elements].reverse(), functions: [...fixture.functions].reverse(), workflows: [...fixture.workflows].reverse() };
expect("the same input in another order gives the same graph", JSON.stringify(toJson(buildGraph(shuffled))) === JSON.stringify(json));
expect("the function feeds graph prints as Mermaid, left to right, labelled with the record types", (() => { const m = functionMermaid(g); return m.startsWith("flowchart LR") && m.includes('"plan"') && m.includes('-->|"goal"|') && m.includes('-->|"deal"|'); })(), functionMermaid(g));

// The shipped function modules.
const input = runSync(shippedInput());
const shipped = buildGraph(input);
expect("the shipped graph builds the same twice", JSON.stringify(toJson(buildGraph(input))) === JSON.stringify(toJson(shipped)) && JSON.stringify(toJson(buildGraph(runSync(shippedInput())))) === JSON.stringify(toJson(shipped)));
expect("every one of the 13 functions is an element node", toJson(shipped).nodes.filter((n) => n.kind === "element" && n.level === 1).length === 13);
const toPipeline = upstream(shipped, "3.5.1.6").find((n) => n.element.id === "1.1.1.1");
expect("identifying competitors (1.1.1.1) feeds managing the pipeline (3.5.1.6) through the competitor record", toPipeline !== undefined && toPipeline.evidence.some((f) => f.writer === "strategy/competitor-review" && f.step === "identify-competitors" && f.reader === "marketing-and-sales/weekly-pipeline-review" && f.record === "competitor"), toPipeline);
expect("strategy feeds marketing and sales, and finance feeds it through spend", downstream(shipped, "strategy").some((n) => n.element.function === "marketing-and-sales") && upstream(shipped, "it").some((n) => n.element.function === "finance" && n.evidence.some((f) => f.record === "spend-register")));
expect("venture.json is read by every intake and written by no workflow", unfed(shipped).find((r) => r.route === "venture")?.by.filter((w) => String(w).endsWith("/intake")).length === 13);

// The command.
const naive = (...args: string[]) => spawnSync("node", ["packages/naive/src/interfaces/cli/naive.ts", "graph", ...args], { encoding: "utf8" });
const out = naive("--element", "3.5.1.6", "--json");
expect("naive graph --element --json gives the element with its upstream and downstream", out.status === 0 && JSON.parse(out.stdout).element.id === "3.5.1.6" && JSON.parse(out.stdout).upstream.length > 0, out.stderr);
const fnOut = naive("--function", "it", "--json");
expect("naive graph --function adds the function's unfed reads", fnOut.status === 0 && JSON.parse(fnOut.stdout).unfed.some((r: { route: string }) => r.route === "venture"), fnOut.stderr);
expect("naive graph --mermaid prints the function feeds graph", naive("--mermaid").stdout.startsWith("flowchart LR"));
expect("an unknown function or element cannot run", naive("--function", "nope").status === 2 && naive("--element", "99.9").status === 2 && naive("stray").status === 2);

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("element graph: all passed");
