#!/usr/bin/env node
// The decision harness demo (EE-054, EE-058): an agent works on a venture through Naive's MCP
// server, is stopped by a decision only a person can make, and goes on once the founder decides.
// Runs on a copy of the example workspace, so nothing real changes. No model is called: the agent's
// moves are scripted, so any harness (Claude Code, LangGraph, the Claude Agent SDK) can replay them.
//
//   node interface/demo/decision-harness.mjs          the founder types the decision at the prompt
//   node interface/demo/decision-harness.mjs --auto   the founder's step is taken for them (tests)
//   node interface/demo/decision-harness.mjs --board  also serves the live decision board for the run
//                                                     at http://127.0.0.1:4331/ and paces the steps

import { spawn, spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { ventureFile } from "../../schema/venture-paths.mjs";

const repo = new URL("../../", import.meta.url).pathname;
const auto = process.argv.includes("--auto");
const tmp = mkdtempSync(join(tmpdir(), "naive-demo-"));
const ws = join(tmp, "workspace");
cpSync(join(repo, "schema/examples/workspace"), ws, { recursive: true });
const venture = "tandem", dir = join(ws, "ventures", venture);
const env = { ...process.env, MENTURA_WORKSPACE: ws };
const board = process.argv.includes("--board");
let boardServer = null;
if (board) { process.env.MENTURA_WORKSPACE = ws; boardServer = (await import("./board.mjs")).serve(4331, venture); console.log("Decision board: http://127.0.0.1:4331/"); }
const say = async (who, text) => {
  if (board) await new Promise((r) => setTimeout(r, 2500));
  console.log(`\n${who === "agent" ? "AGENT  " : who === "naive" ? "NAIVE  " : "FOUNDER"} ${text}`);
};

// The agent's side: an MCP client over stdio.
const server = spawn("node", [join(repo, "interface/mcp/server.mjs")], { env, stdio: ["pipe", "pipe", "inherit"] });
const pending = new Map();
let next = 1;
createInterface({ input: server.stdout }).on("line", (l) => { const m = JSON.parse(l); pending.get(m.id)?.(m); pending.delete(m.id); });
const rpc = (method, params) => new Promise((res) => { const id = next++; pending.set(id, res); server.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n"); });
const tool = async (name, args) => { const r = (await rpc("tools/call", { name, arguments: args })).result; return { error: r.isError, body: (() => { try { return JSON.parse(r.content[0].text); } catch { return r.content[0].text; } })() }; };

let failed = false;
const expect = (cond, what) => { if (!cond) { failed = true; console.error(`\nDEMO FAILED: ${what}`); } };
try {
  await rpc("initialize", { protocolVersion: "2025-06-18", clientInfo: { name: "demo-agent", version: "0.1" } });
  const tools = (await rpc("tools/list", {})).result.tools.map((t) => t.name);
  await say("agent", `Connected to Naive over MCP: ${tools.length} tools.`);

  const before = await tool("mentura_decisions", { venture, render: ["overdue", "now"] });
  await say("naive", `${before.body.decisions.length} decisions render now for ${venture} (${before.body.phase}). The agent works only on those.`);

  await say("agent", "I want to change the product card. First I propose the decision that change needs.");
  const p = await tool("mentura_propose_decision", { venture, agent_id: "builder", model: "scripted", decision: {
    id: "reposition-shop-app", question: "Do we reposition the shop app around payroll first?", at: "products", name: "shop-app.reposition",
    answer: "Yes: lead with payroll, which owners named as the worst admin job.", due: new Date(Date.now() + 864e5).toISOString().replace(/\.\d+Z$/, "Z"),
    outcomes: [{ id: "trial-signups", projected: "Ten shops start a trial within two weeks of the change", measure: "Trial sign-ups" }],
    unlocks: [{ activity: "Rewrite the product card", routes: ["purpose/product/*"], for: ["builder"] }] } });
  expect(!p.error && p.body.awaiting === "approval", `propose: ${JSON.stringify(p.body)}`);
  await say("naive", `Proposed ${p.body.proposed}. It waits for a person: an agent cannot decide it.`);

  const card = JSON.parse(readFileSync(join(ventureFile(dir, "products/shop-app.json")), "utf8"));
  const changed = { ...card, description: "Payroll first, then bookings and stock, for small service shops" };
  const w1 = await tool("mentura_write", { venture, route: "purpose/product/shop-app", record: changed, agent_id: "builder", note: "reposition around payroll" });
  expect(w1.error && /locked until decision reposition-shop-app/.test(w1.body.error), `first write: ${JSON.stringify(w1.body)}`);
  await say("naive", `Refused: ${w1.body.error}`);
  await say("agent", "Paused. I'll go on when the founder decides.");

  // The founder's step, outside the agent's reach: the CLI, with a typed confirm.
  let typed = "reposition-shop-app";
  if (!auto && process.stdin.isTTY) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    typed = await new Promise((res) => rl.question(`\nFOUNDER Type reposition-shop-app to approve the agent's wording (anything else declines): `, (a) => { rl.close(); res(a.trim()); }));
  } else await say("founder", "(--auto) types reposition-shop-app");
  const d = spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), "decide", "reposition-shop-app", "--venture", venture, "--by", "Founder", "--confirm", typed], { env, encoding: "utf8" });
  if (d.status !== 0) { await say("naive", `Not decided: ${(d.stderr || d.stdout).trim()}. The agent stays paused.`); process.exitCode = 0; }
  else {
    const r = JSON.parse(d.stdout);
    await say("naive", `Decided by Founder in ${r.phase} (${r.wording} the agent's wording). Unlocked: ${r.unlocks.join(", ")}.`);
    const w2 = await tool("mentura_write", { venture, route: "purpose/product/shop-app", record: changed, agent_id: "builder", decision: "reposition-shop-app", note: "reposition around payroll" });
    expect(!w2.error, `second write: ${JSON.stringify(w2.body)}`);
    await say("agent", `Resumed: wrote ${w2.body.written}.`);
    const log = readFileSync(join(ventureFile(dir, "provenance.jsonl")), "utf8").trim().split("\n").slice(-3).map((l) => JSON.parse(l));
    await say("naive", `Provenance, last three entries:\n${log.map((e) => `        ${e.activity.padEnd(7)} ${e.entity.padEnd(48)} by ${e.agent.kind}${e.agent.id ? ` ${e.agent.id}` : ""} via ${e.agent.via}`).join("\n")}`);
    const dec = JSON.parse(readFileSync(join(ventureFile(dir, "products/decisions/shop-app.reposition.decision.json")), "utf8"));
    await say("naive", `The decision carries its outcome to test later: "${dec.outcomes[0].projected}" (${dec.outcomes[0].result ?? "pending"}).`);
  }
} finally {
  server.kill();
  boardServer?.close();
  rmSync(tmp, { recursive: true, force: true });
}
if (failed) process.exit(1);
