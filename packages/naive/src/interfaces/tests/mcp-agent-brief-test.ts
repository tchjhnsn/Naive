// The agent tools over MCP (EE-124): the server started over stdio lists mentura_agent_brief and mentura_route_task;
// the brief for finance-agent carries its agent.md text, workflows, decision matrix and MENTURA_ACTOR_ID with no
// machine path; a lead's brief carries its spec; an unknown role is an error naming the roles; and a task across
// finance and risk and compliance routes to finance-lead. The example software workspace stands in for a venture.
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { join } from "node:path";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 600)}`}`); if (!ok) failed++; };

const env: Record<string, string | undefined> = { ...process.env, MENTURA_WORKSPACE: join(repo, "packages/naive/src/records/examples/software") };
delete env.MENTURA_ACTOR_ID;
const child = spawn("node", [join(repo, "packages/naive/src/interfaces/mcp/server.mjs")], { env, stdio: ["pipe", "pipe", "inherit"] });
const waiting = new Map<number, (m: Record<string, unknown>) => void>();
createInterface({ input: child.stdout }).on("line", (line) => {
  const m = JSON.parse(line) as Record<string, unknown>;
  const done = typeof m.id === "number" ? waiting.get(m.id) : undefined;
  if (done) { waiting.delete(m.id as number); done(m); }
});
let n = 0;
const send = (method: string, params: unknown = {}): Promise<Record<string, unknown>> => new Promise((resolve) => {
  const id = ++n;
  waiting.set(id, resolve);
  child.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
});
interface ToolAnswer { isError: boolean, text: string }
const tool = async (name: string, args: unknown): Promise<ToolAnswer> => {
  const r = (await send("tools/call", { name, arguments: args })).result as { isError: boolean, content: { text: string }[] };
  return { isError: r.isError, text: r.content[0].text };
};

try {
  await send("initialize", { clientInfo: { name: "test" } });
  const tools = ((await send("tools/list")).result as { tools: { name: string }[] }).tools.map((t) => t.name);
  expect("tools/list has mentura_agent_brief and mentura_route_task", tools.includes("mentura_agent_brief") && tools.includes("mentura_route_task"), tools);

  const fa = await tool("mentura_agent_brief", { role: "finance-agent" });
  const b = JSON.parse(fa.text) as { kind: string, env: Record<string, string>, instructions: { path: string, text: string }, workflows: { id: string, path: string, content: { steps?: unknown[] } }[], decisions: { path: string, content: unknown }, spec: { module: string, writes: string[] } };
  expect("finance-agent: a function agent brief", !fa.isError && b.kind === "function-agent", fa.text.slice(0, 300));
  expect("finance-agent: the full text of its agent.md", b.instructions?.path === "packages/naive/src/functions/finance/agent.md" && b.instructions.text.length > 100, b.instructions?.path);
  expect("finance-agent: its workflows with their steps, intake among them", b.workflows.some((w) => w.id === "intake" && Array.isArray(w.content.steps)), b.workflows.map((w) => w.id));
  expect("finance-agent: its decision matrix contents", b.decisions?.path === "packages/naive/src/functions/finance/decisions.json" && !!b.decisions.content, b.decisions?.path);
  expect("finance-agent: acts under MENTURA_ACTOR_ID=finance-agent", b.env.MENTURA_ACTOR_ID === "finance-agent", b.env);
  expect("finance-agent: no absolute machine path anywhere in the brief", !fa.text.includes(repo) && b.spec.module === "packages/naive/src/functions/finance", b.spec.module);

  const staffed = JSON.parse((await tool("mentura_agent_brief", { role: "finance-agent", venture: "relay" })).text) as { staffed?: boolean, team_plan_entry: { id: string } };
  expect("with a venture: staffed says the team plan has no finance agent, and the entry to add names it", staffed.staffed === false && staffed.team_plan_entry.id === "finance-agent", staffed);

  const lead = await tool("mentura_agent_brief", { role: "finance-lead" });
  const lb = JSON.parse(lead.text) as { kind: string, spec: { portfolio: string[] }, env: Record<string, string> };
  expect("finance-lead: the lead spec with its portfolio", !lead.isError && lb.kind === "lead" && lb.spec.portfolio.includes("finance") && lb.env.MENTURA_ACTOR_ID === "finance-lead" && !lead.text.includes(repo), lb);

  const bad = await tool("mentura_agent_brief", { role: "chef" });
  expect("an unknown role is an error naming the valid roles", bad.isError && /no agent chef/.test(bad.text) && /finance-agent/.test(bad.text) && /finance-lead/.test(bad.text), bad.text);
  const noVenture = await tool("mentura_agent_brief", { role: "finance-agent", venture: "nobody" });
  expect("an unknown venture is an error", noVenture.isError, noVenture.text);

  const rt = await tool("mentura_route_task", { functions: ["finance", "risk-and-compliance"] });
  const ra = JSON.parse(rt.text) as { to: string, role: string, tool: string, staffed: boolean, why: string };
  expect("finance and risk and compliance route to finance-lead", !rt.isError && ra.to === "lead" && ra.role === "finance-lead" && ra.tool === "lead_finance-lead" && ra.staffed === true && !!ra.why, ra);
  const door = JSON.parse((await tool("mentura_route_task", { functions: ["finance"], classes: ["legal-or-terms"] })).text) as { to: string, tool: string | null };
  const one = JSON.parse((await tool("mentura_route_task", { functions: ["finance"] })).text) as { to: string, role: string };
  expect("one function goes to its agent", one.to === "function-agent" && one.role === "finance-agent", one);
  expect("a task needing a one-way door goes to a person, with no tool", door.to === "person" && door.tool === null, door);
  const empty = await tool("mentura_route_task", { functions: [] });
  expect("no functions is an error", empty.isError, empty.text);
} finally {
  child.stdin.end();
  child.kill();
}

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("all passed");
