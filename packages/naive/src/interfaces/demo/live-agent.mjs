#!/usr/bin/env node
// The decision harness with a real agent (EE-054, EE-058): Claude Code, headless, works on a copy of
// the example venture through Naive's MCP server and nothing else. It proposes the decision its
// change needs, is refused, and stops; this script waits until a person decides in another
// terminal, then sends the agent back to finish. Needs the claude CLI, signed in.
//
//   node packages/naive/src/interfaces/demo/live-agent.mjs [--board]
//     --board  serves the live decision board at http://127.0.0.1:4331/

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("../../../../../", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "naive-live-"));
const ws = join(tmp, "workspace");
cpSync(join(repo, "packages/naive/src/records/examples/workspace"), ws, { recursive: true });
const venture = "tandem", id = "reposition-shop-app";
const decisionFile = join(ws, "ventures", venture, "products/decisions/shop-app.reposition.decision.json");
const mcp = join(tmp, "mcp.json");
writeFileSync(mcp, JSON.stringify({ mcpServers: { naive: { command: "node", args: [join(repo, "packages/naive/src/interfaces/mcp/server.mjs")], env: { MENTURA_WORKSPACE: ws } } } }));

let board = null;
if (process.argv.includes("--board")) { process.env.MENTURA_WORKSPACE = ws; board = (await import("./board.mjs")).serve(4331, venture); console.log("Decision board: http://127.0.0.1:4331/"); }

const agent = (prompt) => {
  console.log("\nAGENT  working through Naive's MCP server...");
  const p = spawnSync("claude", ["-p", prompt, "--tools", "", "--mcp-config", mcp, "--strict-mcp-config", "--allowedTools", "mcp__naive__*", "--output-format", "text"], { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] });
  if (p.error) { console.error(`could not run claude: ${p.error.message}`); process.exit(1); }
  console.log(p.stdout.trim().split("\n").map((l) => `       ${l}`).join("\n"));
};

const role = `You are the builder agent (agent_id builder) for the venture ${venture}. Work only through the naive MCP tools.`;
agent(`${role} Task: reposition the shop-app product card (route purpose/product/shop-app) to lead with payroll. Call mentura_decisions first. Before changing the card, propose the decision the change needs with mentura_propose_decision: id ${id}, at "products", name "shop-app.reposition", parent "venture", with your proposed answer, one projected outcome, and unlocks [{"activity": "Reposition the shop-app product card", "routes": ["purpose/product/*"], "for": ["builder"]}]. Then try the write. If it is refused, stop and tell the founder, in two lines, what to approve and the exact command.`);

console.log(`\nFOUNDER In another terminal, review and decide:\n         MENTURA_WORKSPACE=${ws} node ${join(repo, "packages/naive/src/interfaces/cli/mentura.mjs")} decide ${id} --venture ${venture} --by <your name>\nNAIVE   Waiting for the decision...`);
const decided = () => existsSync(decisionFile) && JSON.parse(readFileSync(decisionFile, "utf8")).status === "decided";
while (!decided()) await new Promise((r) => setTimeout(r, 1000));
const d = JSON.parse(readFileSync(decisionFile, "utf8"));
console.log(`\nNAIVE   ${id} decided by ${d.provenance.approved_by} in ${d.provenance.phase} (${d.provenance.wording} the agent's wording).`);

agent(`${role} You proposed decision ${id} and your write to purpose/product/shop-app was refused as locked. Check mentura_decisions; it is now decided. Read the card and write it to match the decided answer, citing decision ${id}. Report in two lines.`);

const log = readFileSync(join(ws, "ventures", venture, "provenance.jsonl"), "utf8").trim().split("\n").slice(-3).map((l) => JSON.parse(l));
console.log(`\nNAIVE   Provenance, last three entries:\n${log.map((e) => `        ${e.activity.padEnd(7)} ${e.entity.padEnd(52)} by ${e.agent.kind}${e.agent.id ? ` ${e.agent.id}` : ""} via ${e.agent.via}`).join("\n")}`);
console.log(`\nThe run's workspace stays at ${ws} for questions.${board ? " The board keeps serving it; Ctrl-C to stop." : ""}`);
