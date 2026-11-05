// Setup in the model's harness (EE-083, interface/skills/naive-setup): the state and its artifact over MCP,
// the founder's answers relayed as open proposals with their words, and only the founder confirming them.

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ventureFile } from "../packages/core/venture-paths.mjs";

const repo = new URL("..", import.meta.url).pathname;
const base = mkdtempSync(join(tmpdir(), "setup-skill-test-"));
const dir = join(base, "acme");
const env = { ...process.env, HOME: base };
for (const k of ["MENTURA_WORKSPACE", "TYPESAFE_API_KEY", "TYPESAFEAI_API_KEY", "MENTURA_TYPE_CMD"]) delete env[k];
const made = spawnSync("node", [join(repo, "interface/create-venture/index.mjs"), dir, "--type", "software-startup", "--name", "Pat Doe", "--source", "finance=rho", "--rho-fixture", "--yes", "--skip-install", "--no-git"], { env, encoding: "utf8" });
if (made.status !== 0) { console.log(`FAIL create-venture: ${made.stderr}`); process.exit(1); }
process.env.MENTURA_WORKSPACE = base;
const { handle } = await import("../interface/mcp/server.mjs");
const { decisions } = await import("./decisions.mjs");

let failed = 0, n = 0;
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
const t = async (name, fn) => { try { await fn(); console.log(`ok   ${name}`); } catch (e) { failed++; console.log(`FAIL ${name}: ${e.message}`); } };
const tool = async (name, args) => { const r = await handle({ jsonrpc: "2.0", id: ++n, method: "tools/call", params: { name, arguments: args } }); const text = r.result.content[0].text; let result; try { result = JSON.parse(text); } catch { result = text; } return { ok: !r.result.isError, result }; };
const setup = (...a) => spawnSync("node", [join(repo, "schema/setup.mjs"), dir, ...a], { env, encoding: "utf8" });
const find = (id) => decisions(dir).decisions.find((d) => d.id === id);

await handle({ jsonrpc: "2.0", id: 0, method: "initialize", params: { clientInfo: { name: "Claude", version: "test" } } });

await t("mentura_setup returns the state and a self-contained artifact of it", async () => {
  const r = await tool("mentura_setup", { venture: "acme" });
  ok(r.ok && r.result.state.steps.people && r.result.state.steps.truth && !r.result.state.done, JSON.stringify(r.result?.state?.steps));
  const html = r.result.artifact;
  ok(html.startsWith("<!doctype html>") && html.includes('"acme"') && !html.includes("__NAIVE_SETUP_STATE__"), "the state is not in the artifact");
  ok(!/fetch\(|XMLHttpRequest|<script src=/.test(html), "the artifact reaches the network");
});

await t("an answer the model relays is open, with the founder's words as its wording, drafted by an agent", async () => {
  const r = await tool("mentura_setup_answer", { venture: "acme", id: "product-exists", answer: "A prototype that three clinics use" });
  ok(r.ok, JSON.stringify(r));
  const d = find("product-exists");
  ok(d.status === "open" && d.answer === "A prototype that three clinics use" && d.provenance.drafted_by.kind === "agent", JSON.stringify(d));
  const s = (await tool("mentura_setup", { venture: "acme" })).result.state;
  ok(s.waiting.some((w) => w.id === "product-exists") && s.counts.settled === 0, JSON.stringify(s.waiting));
});

await t("a foundation answer becomes the statement's proposal, and the goal is proposed too", async () => {
  ok((await tool("mentura_setup_answer", { venture: "acme", id: "foundation-problem", answer: "Clinics lose hours a week to scheduling" })).ok);
  ok(find("statement-problem")?.answer === "Clinics lose hours a week to scheduling" && !find("foundation-problem"));
  ok((await tool("mentura_setup_answer", { venture: "acme", id: "discovery-goal", answer: "Ten clinic owners confirm the problem by December" })).ok);
  ok(find("discovery-goal")?.status === "open");
});

await t("an empty answer or an unknown question is refused", async () => {
  ok(!(await tool("mentura_setup_answer", { venture: "acme", id: "product-exists", answer: "  " })).ok);
  ok(!(await tool("mentura_setup_answer", { venture: "acme", id: "no-such-question", answer: "x" })).ok);
});

await t("pointing a function through MCP writes knowledge/sources.json as the agent, with provenance", async () => {
  const r = await tool("mentura_setup_point", { venture: "acme", function: "legal", system: "local-folder", address: "~/acme-legal" });
  ok(r.ok && r.result.status === "pointed", JSON.stringify(r));
  ok(JSON.parse(readFileSync(ventureFile(dir, "knowledge/sources.json"), "utf8")).functions.legal.systems[0].address === "~/acme-legal");
  ok(!(await tool("mentura_setup_point", { venture: "acme", function: "legal", system: "stripe" })).ok, "a system the catalog does not offer for legal was accepted");
});

await t("confirming needs the founder: without yes nothing is decided; with it, each relayed answer is theirs", async () => {
  const no = spawnSync("node", [join(repo, "schema/setup.mjs"), dir, "confirm"], { env, encoding: "utf8", input: "no\n" });
  ok(no.status === 1 && find("product-exists").status === "open", no.stdout + no.stderr);
  const yes = setup("confirm", "--yes");
  ok(yes.status === 0, yes.stdout + yes.stderr);
  const d = find("product-exists");
  ok(d.status === "decided" && d.provenance.approved_by === "Pat Doe" && d.provenance.wording === "approved" && d.provenance.drafted_by.kind === "agent", JSON.stringify(d.provenance));
  ok(find("statement-problem").status === "decided" && find("discovery-goal").status === "decided");
  ok(readFileSync(ventureFile(dir, "provenance.jsonl"), "utf8").includes("relayed by the model"));
});

await t("the artifact shows the progress after each answer", async () => {
  const html = setup("artifact").stdout;
  const state = JSON.parse(html.match(/<script id="naive-setup-state" type="application\/json">([\s\S]*?)<\/script>/)[1]);
  ok(state.goal.status === "decided" && state.counts.settled >= 2 && state.waiting.length === 0, JSON.stringify(state.counts));
});

console.log(failed ? `\n${failed} failing` : "\nall setup skill checks pass");
process.exit(failed ? 1 : 0);
