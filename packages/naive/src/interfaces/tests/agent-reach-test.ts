// Tests a function agent's write reach through the router (packages/naive/src/engine/agents/reach.ts, reachOfWrite
// in packages/naive/src/router/gate-hooks.ts): an agent acting as <function>-agent writes only decisions/* and the
// routes of the record types the data model gives its function. finance-agent writing a customer is refused before
// the schema and nothing lands; its decision write is not refused for reach; a person, a lead and plain agent are not
// checked; and the spec's writes are the list the router enforces. The venture lives in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/agent-reach-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call } from "../../router/router.ts";
import { functionOfAgent, functionWrites, reachRefusal } from "../../engine/agents/reach.ts";
import { functionAgent } from "../../engine/agents/function-spec.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "agent-reach-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_READS_AS_OF", "MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_MODEL"]) { delete process.env[k]; delete env[k]; }

interface Reply { ok: boolean, error?: string, gate_rule?: string, may_write?: string[], result?: { written?: string, draft?: boolean } }
const ask = async (a: { route: string, action?: string, input?: unknown, actor?: string, actor_id?: string }): Promise<Reply> =>
  await call({ venture: "lab", workspace: ws, action: "read", ...a }) as Reply;

try {
  // The rule without a venture.
  expect("finance-agent is the finance function's agent", functionOfAgent("finance-agent") === "finance");
  expect("a lead, a researcher, the chief of staff and plain agent are no function's agent",
    ["finance-lead", "finance-researcher", "chief-of-staff", "agent", "nope-agent", undefined].every((r) => functionOfAgent(r) === null));
  expect("functionAgent's writes are functionWrites", JSON.stringify(functionAgent("finance").writes) === JSON.stringify(functionWrites("finance")));
  expect("finance-agent's reach holds decisions/* and finance/budget/*", functionWrites("finance").includes("decisions/*") && functionWrites("finance").includes("finance/budget/*"), functionWrites("finance").join(", "));
  const refused = reachRefusal({ role: "finance-agent", route: "customers/acme", table: "customers/[id]" });
  expect("reachRefusal refuses finance-agent on customers/acme, naming the agent, the route and its patterns",
    refused?.rule === "agent-reach" && refused.why.includes("finance-agent") && refused.why.includes("customers/acme") && refused.why.includes("finance/budget/*"), JSON.stringify(refused));
  expect("reachRefusal passes finance-agent on decisions/pick", reachRefusal({ role: "finance-agent", route: "decisions/pick", table: "decisions/[id]" }) === null);
  expect("reachRefusal passes marketing-and-sales-agent on customers/acme", reachRefusal({ role: "marketing-and-sales-agent", route: "customers/acme", table: "customers/[id]" }) === null);
  expect("reachRefusal leaves a lead unchecked", reachRefusal({ role: "finance-lead", route: "customers/acme" }) === null);

  // Through the router.
  const made = spawnSync(process.execPath, [join(repo, "packages/naive/src/engine/init-venture.ts"), join(ws, "ventures/lab"), "lab", "--type", "software-startup"], { encoding: "utf8", env });
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  const dir = join(ws, "ventures/lab");
  // The customer routes are written by workflows that wait on the strategy foundation (EE-217), so the venture gets
  // its ICP and nothing here is blocked on its prerequisites; packages/naive/src/engine/prerequisites-test.ts tests
  // that lock itself. Reach is what this file tests.
  mkdirSync(join(dir, "foundation/icp"), { recursive: true });
  writeFileSync(join(dir, "foundation/icp/primary.json"), JSON.stringify({ venture: "lab", id: "primary", name: "Solo founder" }, null, 2) + "\n");
  const customer = { id: "acme", name: "Acme" };
  const file = join(dir, "customers/acme.json");

  const out = await ask({ route: "customers/acme", action: "write", input: customer, actor: "agent", actor_id: "finance-agent" });
  expect("finance-agent writing customers/acme is refused for reach", !out.ok && out.gate_rule === "agent-reach" && !!out.may_write?.includes("decisions/*"), JSON.stringify(out));
  expect("the refusal names the agent, the route and the patterns it may write",
    !!out.error && out.error.includes("finance-agent") && out.error.includes("customers/acme") && out.error.includes("finance/budget/*"), out.error);
  expect("nothing is written, not even a draft", !existsSync(file) && !existsSync(join(dir, "_drafts/customers/acme.json")));
  const bad = await ask({ route: "customers/acme", action: "write", input: { nonsense: true }, actor: "agent", actor_id: "finance-agent" });
  expect("the reach refusal comes before the schema", !bad.ok && bad.gate_rule === "agent-reach", JSON.stringify(bad));

  // A person's call made while the process says finance-agent is acting counts as the agent's.
  process.env.MENTURA_ACTOR_ID = "finance-agent";
  const disguised = await ask({ route: "customers/acme", action: "write", input: customer, actor: "person", actor_id: "finance-agent" });
  delete process.env.MENTURA_ACTOR_ID;
  expect("a person's call while finance-agent is acting is refused too", !disguised.ok && disguised.gate_rule === "agent-reach" && !existsSync(file), JSON.stringify(disguised));

  const decision = await ask({ route: "decisions/pick", action: "write", input: { id: "pick", question: "Which bank?", answer: "the credit union", status: "open" }, actor: "agent", actor_id: "finance-agent" });
  expect("finance-agent writing decisions/pick is not refused for reach", decision.ok && decision.gate_rule !== "agent-reach", JSON.stringify(decision));

  const person = await ask({ route: "customers/acme", action: "write", input: customer, actor: "person" });
  expect("a person writing customers/acme is allowed and the record lands", person.ok && existsSync(file), JSON.stringify(person));

  const lead = await ask({ route: "customers/beta", action: "write", input: { id: "beta", name: "Beta" }, actor: "agent", actor_id: "finance-lead" });
  expect("a lead is not checked for function reach", lead.gate_rule !== "agent-reach", JSON.stringify(lead));
  const plain = await ask({ route: "customers/gamma", action: "write", input: { id: "gamma", name: "Gamma" }, actor: "agent" });
  expect("an agent acting in no role is not checked for function reach", plain.gate_rule !== "agent-reach", JSON.stringify(plain));

  // The CLI path the gap was found on: MENTURA_ACTOR_ID=finance-agent mentura customers/<id> write.
  const input = join(ws, "x.json");
  writeFileSync(input, JSON.stringify({ id: "delta", name: "Delta" }));
  const cli = spawnSync(process.execPath, [join(repo, "packages/naive/src/interfaces/cli/mentura.ts"), "customers/delta", "write", "--venture", "lab", "--input", input],
    { encoding: "utf8", env: { ...env, MENTURA_ACTOR_ID: "finance-agent" } });
  expect("the CLI refuses finance-agent writing customers/delta and writes nothing", cli.status !== 0 && /agent-reach|may not write customers\/delta/.test(cli.stdout + cli.stderr) && !existsSync(join(dir, "customers/delta.json")), cli.stdout + cli.stderr);
}
catch (e) { expect("the test ran", false, e instanceof Error ? e.stack ?? e.message : String(e)); }
finally { rmSync(ws, { recursive: true, force: true }); }

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
