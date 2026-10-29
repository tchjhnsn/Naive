#!/usr/bin/env node
// The Naive agent harness (EE-054, EE-058, EE-059): takes a founder's idea dump through Discovery with
// a real agent, start to end. The dump is not a prompt: it is every idea the founder has about the
// venture, kept verbatim. Naive maps it onto its conventions (the idea map), asks its own product
// questions first and fails closed on them, and decides what the agent sees and may do: need-now
// picks the kit, the router gates every write, the agent's proposals wait for the founder, and routes
// an open decision unlocks stay closed. The agent is one the founder already has (Claude Code,
// headless); Naive holds no model key. Platform tools are handed to the agent beside Naive's own MCP
// server, or spawned by path, never imported: Jev tags the ideas when TYPESAFE_API_KEY is set, and
// Firecrawl researches the market when FIRECRAWL_API_KEY is set. With --money, the founder's money source
// (Rho; its sandbox by default) fills the venture's money package, and the agent sees only its summary.
//
//   node interface/harness/run.mjs discovery --dump <ideas.md> [--id <slug>] [--name <name>] [--founder <name>]
//        [--workspace <dir>] [--board] [--yes] [--steps <n>] [--money sandbox|live|<fixture.json>]
//
//   --board   serves the decision board at http://127.0.0.1:4331/ and the idea map at /map
//   --yes     the founder settles the top-ranked decisions as worded (rehearsals and tests)
//   --steps   how many decisions the founder settles between the agent's passes (default 3)
//   --money   syncs money/ from Rho (sandbox, live with RHO_API_TOKEN, or a saved fixture) before pass 1
//
// 1. Naive maps the dump (Jev, else the agent tags it with the same conventions), then structures the
//    map as an idea graph: a Merkle DAG with signal and lanes (EE-060).
// 2. Pass 1: the agent reads the idea map, drafts answers to Naive's product questions and the problem
//    record from the founder's own ideas, researches the market, and proposes the decisions the founder
//    owes.
// 3. The founder settles the top-ranked decisions, one at a time, in the order Naive ranks them.
// 4. Pass 2: the agent assesses the accepted problem, does the work the decisions unlocked, and reports
//    what comes next.
// 5. Naive writes the venture package view: the packages open now, each record confirmed, to review or
//    to write, what moves now and what waits (EE-067, EE-069). The founder confirms Mentura's
//    understanding of the ideas between the graph and the agent's first pass (Understand, EE-069).

import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { decisions } from "../../schema/decisions.mjs";
import { docket } from "../../schema/docket.mjs";
import { CONVENTIONS, DUMP, MAP, parse, render, split, summary, clean, request, fromAnswers } from "../../purpose/frameworks/idea-map/ideamap.mjs";
import { GRAPH, build as buildGraph, request as graphRequest } from "../../purpose/frameworks/idea-map/graph.mjs";
import { understood } from "../../purpose/frameworks/idea-map/route.mjs";
import { createHash } from "node:crypto";
import { agentFromEnv, record as prov } from "../provenance.mjs";
import { evaluate } from "./evals.mjs";

const repo = new URL("../../", import.meta.url).pathname;
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (n) => argv.includes(`--${n}`);
const phase = argv[0];
const dumpFile = opt("dump");
if (phase !== "discovery" || !dumpFile || !existsSync(dumpFile)) {
  console.error("usage: node interface/harness/run.mjs discovery --dump <ideas.md> [--id <slug>] [--name <name>] [--founder <name>] [--workspace <dir>] [--board] [--yes] [--steps <n>]");
  process.exit(2);
}
const id = opt("id") ?? basename(dumpFile).replace(/\..*$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const founder = opt("founder") ?? process.env.MENTURA_PERSON ?? "Founder";
const ws = resolve(opt("workspace") ?? join(mkdtempSync(join(tmpdir(), "naive-run-")), "workspace"));
const dir = join(ws, "ventures", id);
const steps = Number(opt("steps") ?? 3);
const jev = Boolean(process.env.TYPESAFE_API_KEY ?? process.env.TYPESAFEAI_API_KEY);
const research = Boolean(process.env.FIRECRAWL_API_KEY);
const t0 = Date.now();
const laps = [];
const lap = (what) => { const s = (Date.now() - t0) / 1000; laps.push({ at: s, what }); console.log(`\n[${s.toFixed(1)}s] ${what}`); };
const cli = (...args) => spawnSync("node", [join(repo, "interface/cli/mentura.mjs"), ...args], { env: { ...process.env, MENTURA_WORKSPACE: ws }, encoding: "utf8" });

// The venture, scaffolded by Naive, and the founder's dump, kept as they wrote it.
if (!existsSync(join(dir, "venture.json"))) {
  const p = spawnSync("node", [join(repo, "schema/init-venture.mjs"), dir, id, "--phase", phase], { encoding: "utf8" });
  if (p.status !== 0) { console.error(p.stderr || p.stdout); process.exit(1); }
  if (opt("name")) { const v = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")); v.name = opt("name"); writeFileSync(join(dir, "venture.json"), JSON.stringify(v, null, 2) + "\n"); }
}
mkdirSync(join(dir, "purpose/ideas"), { recursive: true });
copyFileSync(dumpFile, join(dir, DUMP));
prov(dir, { entity: DUMP, route: "purpose/idea-dump", activity: "create", agent: agentFromEnv("person", "harness", { id: founder }), note: "the founder's idea dump, verbatim" });
lap(`venture ${id} scaffolded in ${ws}; idea dump saved (${readFileSync(dumpFile, "utf8").length} characters)`);

// Money (EE-070): the money source stays the system of record. Naive syncs pointers and a summary into
// the money data package; transactions stay in a sensitive stream that neither the agent nor the trace sees.
let money = null;
if (opt("money")) {
  const m = opt("money");
  const src = m === "live" ? ["--live"] : m === "sandbox" ? [] : ["--fixture", resolve(m)];
  const p = spawnSync("node", [join(repo, "platform/integrations/rho.mjs"), "sync", "--venture", dir, ...src], { encoding: "utf8" });
  if (p.status === 0 && existsSync(join(dir, "money/summary.json"))) {
    money = JSON.parse(readFileSync(join(dir, "money/summary.json"), "utf8"));
    prov(dir, { entity: "money/summary.json", route: "money/summary", activity: "create", agent: agentFromEnv("agent", "harness", { id: "naive-money" }), note: `synced from ${money.source}; ${money.transactions} transactions kept as pointers in a sensitive stream` });
    lap(`money synced from ${money.source}${money.business ? ` (${money.business})` : ""}: cash ${(money.cash.amount / 100).toFixed(2)} ${money.cash.currency}, monthly net ${(money.monthly_net.amount / 100).toFixed(2)}, runway ${money.runway_months ?? "not limited by burn"}, as of ${money.as_of}`);
  } else console.log(`   money sync failed, so the run goes on without it: ${(p.stderr || p.stdout).trim().slice(0, 300)}`);
}

const servers = { naive: { command: "node", args: [join(repo, "interface/mcp/server.mjs")], env: { MENTURA_WORKSPACE: ws, MENTURA_PERSON: founder } } };
if (research) servers.research = { command: "node", args: [join(repo, "platform/mcp/research.mjs")], env: { FIRECRAWL_API_KEY: process.env.FIRECRAWL_API_KEY } };
const mcp = join(ws, ".mcp-harness.json");
writeFileSync(mcp, JSON.stringify({ mcpServers: servers }));

let board = null;
if (flag("board")) { process.env.MENTURA_WORKSPACE = ws; board = (await import("../demo/board.mjs")).serve(4331, id); console.log("Decision board: http://127.0.0.1:4331/   Idea map: http://127.0.0.1:4331/map"); }

// The trace (EE-058): every step and every tool call the agent made, with timings, for LangSmith.
const iso = () => new Date().toISOString();
const trace = { name: `naive discovery: ${id}`, run_type: "chain", start: iso(), inputs: { dump: DUMP, ideas: readFileSync(join(dir, DUMP), "utf8"), founder, phase }, children: [], metadata: {
  venture: id, venture_id: id, pipeline_step: phase, money: money?.source ?? null,
  // LangSmith groups a founder's runs into one thread by thread_id: one session per venture per day.
  thread_id: process.env.NAIVE_SESSION ?? `${id}-${new Date().toISOString().slice(0, 10)}`,
  harness_version: spawnSync("git", ["rev-parse", "--short", "HEAD"], { cwd: repo, encoding: "utf8" }).stdout.trim() || null,
} };
const researched = [];
if (money) trace.children.push({ name: "money: sync", run_type: "tool", start: iso(), end: iso(), inputs: { source: money.source }, outputs: { summary: money } });

// The agent runs headless and streams what it does; each tool call becomes a child run.
async function agent(prompt, label, { tools = "mcp__naive__*,mcp__research__*", quiet = false } = {}) {
  lap(`agent: ${label}`);
  const node = { name: label, run_type: "chain", start: iso(), inputs: { prompt }, children: [] };
  trace.children.push(node);
  // No built-in tools (no shell, no file access): the agent works only through the MCP servers it is handed.
  const args = ["-p", prompt, "--output-format", "stream-json", "--verbose", "--tools", "", ...(tools ? ["--mcp-config", mcp, "--strict-mcp-config", "--allowedTools", tools] : ["--strict-mcp-config"])];
  const child = spawn("claude", args, { stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, MENTURA_WORKSPACE: ws } });
  const open = new Map();
  let result = null, buf = "";
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl); buf = buf.slice(nl + 1);
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      for (const c of ev.message?.content ?? []) {
        if (c.type === "tool_use") {
          const t = { name: c.name.replace(/^mcp__/, ""), run_type: "tool", start: iso(), inputs: c.input ?? {}, children: [] };
          open.set(c.id, t); node.children.push(t);
          if (!quiet) console.log(`   > ${t.name}${c.input?.route ? ` ${c.input.route}` : c.input?.queries ? ` ${JSON.stringify(c.input.queries)}` : c.input?.id ? ` ${c.input.id}` : ""}`);
        } else if (c.type === "tool_result" && open.has(c.tool_use_id)) {
          const t = open.get(c.tool_use_id);
          const text = Array.isArray(c.content) ? c.content.map((x) => x.text ?? "").join("") : String(c.content ?? "");
          Object.assign(t, { end: iso(), outputs: { result: text.slice(0, 20000) }, ...(c.is_error ? { error: text.slice(0, 2000) } : {}) });
          if (t.name.startsWith("research__")) for (const m of text.matchAll(/"url":\s*"([^"]+)"/g)) researched.push(m[1]);
        }
      }
      if (ev.type === "result") result = ev;
    }
  });
  const code = await new Promise((r) => child.on("close", r));
  if (code !== 0 || !result || result.is_error) {
    // Say why: the reason is in the agent's own result (an expired login, a refused tool), not in its exit code.
    const why = (result?.result ?? "").trim();
    node.error = `the agent stopped with status ${code}${why ? `: ${why}` : ""}${/log ?in|\/login|authenticat/i.test(why) ? " (run claude, then /login, and start again)" : ""}`;
    console.error(node.error); finish(1); if (!board) process.exit(1); await new Promise(() => {});
  }
  Object.assign(node, { end: iso(), outputs: { report: result.result }, metadata: { cost_usd: result.total_cost_usd, turns: result.num_turns, usage: result.usage } });
  if (!quiet) console.log(result.result.trim().split("\n").map((l) => `   ${l}`).join("\n"));
  return result.result;
}

// The run's evals and trace: written beside the workspace, and sent to LangSmith when a key is set.
function finish(code = 0) {
  trace.end = iso();
  const evals = existsSync(join(dir, DUMP)) ? evaluate(dir, { researched, settled }) : [];
  trace.feedback = evals;
  // What the run drafted, so a judge reading only the root run (LangSmith's online evaluators, Jev)
  // sees the problem record and the agent's reports beside the founder's dump in the inputs.
  const problem = join(dir, "purpose/validation/problem.json");
  const drafted = { problem: existsSync(problem) ? JSON.parse(readFileSync(problem, "utf8")) : null, reports: trace.children.filter((c) => c.outputs?.report).map((c) => ({ pass: c.name, report: c.outputs.report })) };
  trace.outputs = { settled, docket: { steps: docketSteps, now: compact(docket(dir)) }, drafted, evals: Object.fromEntries(evals.map((e) => [e.key, e.score])), laps };
  writeFileSync(join(ws, "trace.json"), JSON.stringify(trace, null, 2) + "\n");
  console.log(`\nEvals:\n${evals.map((e) => `   ${e.score === 1 ? "pass" : e.score === 0 ? "FAIL" : "part"}  ${e.key.padEnd(26)} ${e.score}  ${e.comment}`).join("\n")}`);
  if (process.env.LANGSMITH_API_KEY) {
    const p = spawnSync("node", [join(repo, "platform/integrations/langsmith.mjs"), join(ws, "trace.json")], { encoding: "utf8" });
    console.log(p.status === 0 ? `LangSmith: ${p.stdout.trim()}` : `LangSmith upload failed: ${(p.stderr || p.stdout).trim()}`);
  }
  // The board keeps serving the finished run, or the stopped one, so the founder can see where it got to.
  if (board) { console.log(`\nThe board keeps serving${code ? " what the run got to" : ""}: http://127.0.0.1:4331/ and /map. Ctrl-C to stop. Workspace: ${ws}`); return; }
  board?.close();
  process.exit(code);
}
const settled = [];
const docketSteps = [];
const compact = (k) => ({ leading: k.functions[0]?.function ?? null, functions: k.functions.map((f) => ({ function: f.function, attention: f.attention,
  decisions: f.decisions.slice(0, 3).map((d) => ({ id: d.id, question: d.question, value: d.value, dominant: d.dominant, why: d.why })) })) });

// 1. The idea map: Jev tags each idea with Naive's conventions; without Jev, the agent does, with the
//    same vocabulary. Either way the ideas stay verbatim and unknown tags are dropped.
const ideas = split(readFileSync(join(dir, DUMP), "utf8"));
const venture = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
let tags, tagger;
const mapNode = { name: "idea map", run_type: "tool", start: iso(), inputs: { ideas: ideas.length }, children: [] };
if (jev) {
  const p = spawnSync("node", [join(repo, "platform/integrations/jev.mjs")], { input: JSON.stringify(request(ideas, venture)), encoding: "utf8", maxBuffer: 1 << 26 });
  if (p.status !== 0) { console.error(p.stderr); process.exit(1); }
  const out = JSON.parse(p.stdout);
  tags = fromAnswers(out.answers);
  tagger = out.model ?? "jev";
  console.log(`   Jev answered ${Object.keys(out.answers).length} typed questions in ${out.ms} ms (${out.requests} requests)`);
} else {
  const text = await agent(`Tag each idea below with Naive's conventions. Answer with JSON only, no prose: {"<idea id>": {"departments": [...], "records": [...], "exists": true|false}}.
departments (at most ${CONVENTIONS.max.departments}, the ones the idea is mainly about): ${JSON.stringify(CONVENTIONS.departments)}
records (at most ${CONVENTIONS.max.records}, the ones it mainly feeds): ${JSON.stringify(Object.fromEntries(Object.entries(CONVENTIONS.records).map(([k, v]) => [k, v.about])))}
exists: true only if ${CONVENTIONS.exists}.
Ideas: ${JSON.stringify(Object.fromEntries(ideas.map((i) => [i.id, i.section ? `[${i.section}] ${i.text}` : i.text])))}`, "tagging the ideas (no Jev key)", { tools: null, quiet: true });
  tags = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  tagger = "claude-code";
}
writeFileSync(join(dir, MAP), render(ideas, clean(tags), { venture: id, tagger }));
prov(dir, { entity: MAP, route: "purpose/idea-map", activity: "create", derived_from: [DUMP], agent: agentFromEnv("agent", "harness", { id: tagger }), note: `${ideas.length} ideas tagged with Naive's conventions` });
const sum = summary(parse(readFileSync(join(dir, MAP), "utf8")), phase);
trace.children.push(Object.assign(mapNode, { end: iso(), outputs: { tagger, summary: sum }, metadata: { tagger } }));
lap(`idea map: ${sum.ideas} ideas; ${Object.entries(sum.by_pillar).map(([k, v]) => `${k} ${v}`).join(", ")}; clusters ${sum.strengths.map((s) => s.department).join(", ")}; ${sum.product.reading}`);

// 1b. The idea graph: the map's structured form. Jev judges which ideas build on which; without Jev,
//     Naive's record order does. Signal, lanes and layout follow in code.
const graphNode = { name: "idea graph", run_type: "tool", start: iso(), inputs: { ideas: ideas.length }, children: [] };
const mapIdeas = parse(readFileSync(join(dir, MAP), "utf8")).ideas;
let graphAnswers = null;
if (jev) {
  const p = spawnSync("node", [join(repo, "platform/integrations/jev.mjs")], { input: JSON.stringify(graphRequest(mapIdeas, venture)), encoding: "utf8", maxBuffer: 1 << 26 });
  if (p.status === 0) { const out = JSON.parse(p.stdout); graphAnswers = out.answers; console.log(`   Jev answered ${Object.keys(out.answers).length} dependency and concreteness questions in ${out.ms} ms`); }
  else console.log(`   Jev could not judge the dependencies (${p.stderr.trim().slice(0, 200)}); using Naive's record order`);
}
const g = buildGraph(mapIdeas, { answers: graphAnswers, phase, venture: id, source: `${MAP}@${createHash("sha256").update(readFileSync(join(dir, MAP))).digest("hex").slice(0, 16)}` });
writeFileSync(join(dir, GRAPH), JSON.stringify(g, null, 2) + "\n");
prov(dir, { entity: GRAPH, route: "purpose/idea-graph", activity: "create", derived_from: [MAP], agent: agentFromEnv("agent", "harness", { id: g.judged_by }), note: `Merkle root ${g.root}` });
trace.children.push(Object.assign(graphNode, { end: iso(), outputs: { root: g.root, edges: g.edges.length, lanes: g.lanes.map((l) => ({ mode: l.mode, ideas: l.ideas.length })), next: g.next } }));
lap(`idea graph: ${g.edges.length} dependencies (${g.judged_by}); ${g.lanes.filter((l) => l.mode === "sync").length} lane(s) in order, ${g.lanes.filter((l) => l.mode === "async").length} on their own; develop next: ${g.next.join(", ")}; root ${g.root}`);

// 1c. Understand (EE-069): the founder confirms Mentura read their ideas right, after correcting the
//     map or the graph, before anything is routed.
if (flag("yes")) {
  const u = cli("understand", "--venture", id, "--confirm", "ideas", "--note", "rehearsal: confirmed as mapped");
  if (u.status !== 0) { console.error(u.stderr || u.stdout); process.exit(1); }
} else {
  lap("waiting for the founder to confirm the understanding of their ideas (mentura understand)");
  while (!understood(dir)) await new Promise((r) => setTimeout(r, 1000));
}
trace.children.push({ name: "founder: understand", run_type: "chain", start: iso(), end: iso(), inputs: { map: MAP, graph: GRAPH }, outputs: { understood: true } });
lap("the founder confirmed Mentura's understanding of the ideas; routing them");

const rules = `You are the builder agent (agent_id builder) for the venture ${id}. Work only through the naive MCP tools${research ? " and the research tools" : ""}; pass agent_id "builder" on every naive call.
Rules: the founder's idea dump is theirs. Quote it, cite ideas by id (i-01...), never put words in their mouth. Never invent evidence: every evidence item cites a URL a research result gave you${research ? "" : " (you have no research tool in this run, so leave evidence empty and say so)"}. Records Naive treats as the founder's are written as drafts for the founder to accept; that is expected. You never decide; you propose. knowledge/venture-profile cannot be written over MCP; skip it.${money ? `
Money: Naive synced the venture's money summary from ${money.source}, the system of record (money/summary.json): ${JSON.stringify(money)}. Amounts are in minor units (cents). Any proposal or record that touches money (pricing, spend, hiring, runway, fundraising) cites "money/summary.json as of ${money.as_of}" and uses only the figures the summary gives; never estimate the founder's finances.` : ""}`;

await agent(`${rules}
The founder has just submitted an idea dump. Naive mapped it onto its conventions.
1. mentura_run purpose/ideas: read every idea, where they cluster and what the dump never mentions. mentura_run purpose/ideas/graph: which ideas build on which, the lanes that move in order and the ones that can move on their own, and the highest-signal ideas to develop next. mentura_run purpose/ideas/routes: where each idea goes in the framework, each destination's stage and its next step. Then mentura_decisions: Naive's own product questions come first (product-exists, then core-product, then flagship) and fail closed.
2. Propose an answer to product-exists with mentura_propose_decision (id "product-exists", at "products", name "product.exists", same question), worded from the ideas tagged exists and citing them by id. Do not change its parent, boundary or unlocks.
2b. If the dump says anything about a team or cofounders, propose wording for founding-team (id "founding-team", at "", name "venture.team", same question), starting with Solo, Cofounders or Looking and quoting the idea; if it says nothing, leave it for the founder.
3. Write the problem record (purpose/validation/problem) from the founder's ideas: the problem in their words, who has it, and the assumptions to test. Read mentura_layout first.${research ? `
4. Research the market with research_search: existing alternatives and competitors the dump names or implies, prices, and people describing the problem. Add what you find to the problem record as evidence with URLs.` : ""}
5. Propose two or three more decisions the founder owes from what the dump leaves open (at "purpose/validation", name "problem.<topic>"), each with your proposed answer, the ids of the ideas it comes from in "ideas", a due time within 72 hours if urgent, one or two projected outcomes, and unlocks for ["builder"].
6. mentura_decisions and report, in at most eight lines: what the idea map shows (clusters and gaps), your answer to product-exists, what the evidence supports, and the founder's decisions in rank order.`, "pass 1: idea map, product questions, problem, research, proposals");

// 3. The founder settles what the docket ranks first, one decision at a time (EE-074): the function that
//    needs attention most, then its highest-value decision the founder can settle now. Each step's docket
//    goes in the trace, so a judge can check that the ranking was the right next step.
for (let n = 0; n < steps; n++) {
  const r = decisions(dir);
  const k = docket(dir);
  const pick = k.functions.flatMap((f) => f.decisions).find((d) => d.action && ["decide", "accept", "confirm"].includes(d.action.kind) && !settled.includes(d.id));
  const next = pick && r.decisions.find((d) => d.id === pick.id);
  if (!next) break;
  next.why = pick.why;
  docketSteps.push({ step: n + 1, ...compact(k), chose: pick.id });
  trace.children.push({ name: `docket: step ${n + 1}`, run_type: "chain", start: iso(), end: iso(), inputs: { venture: id }, outputs: docketSteps.at(-1) });
  lap(`docket: ${k.functions.map((f) => `${f.function} ${f.attention}`).join(" · ")}; next ${pick.id} (${pick.function}, value ${pick.value}${pick.dominant ? ", outweighs every other function" : ""})`);
  console.log(`\nFOUNDER #${n + 1}: ${next.id}: ${next.question}\n         Why now: ${(next.why ?? []).join("; ")}${next.answer ? `\n         Proposed: ${next.answer}` : ""}\n         ${next.action.command.replace(/^mentura /, `MENTURA_WORKSPACE=${ws} node ${join(repo, "interface/cli/mentura.mjs")} `)}`);
  const before = JSON.stringify(r.decisions.find((d) => d.id === next.id));
  if (flag("yes")) {
    const a = next.action;
    const p = a.kind === "decide" ? cli("decide", next.id, "--venture", id, "--by", founder, ...(next.answer ? [] : ["--answer", "Not yet: it is still an idea"]), "--confirm", a.confirm)
      : a.kind === "accept" ? cli("accept", a.route, "--venture", id, "--confirm", a.confirm) : cli("confirm", a.statement, "--venture", id, "--confirm", a.confirm);
    if (p.status !== 0) { console.error(`   could not settle ${next.id}: ${(p.stderr || p.stdout).trim()}`); settled.push(next.id); continue; }
  } else {
    lap(`waiting for the founder to settle ${next.id}`);
    while (JSON.stringify(decisions(dir).decisions.find((d) => d.id === next.id)) === before) await new Promise((r) => setTimeout(r, 1000));
  }
  settled.push(next.id);
  const now = decisions(dir).decisions.find((d) => d.id === next.id);
  trace.children.push({ name: `founder: ${next.id}`, run_type: "chain", start: iso(), end: iso(), inputs: { question: next.question, why: next.why, proposed: next.answer ?? null, action: next.action.kind }, outputs: { status: now?.status, provenance: now?.provenance ?? null } });
  lap(`${next.id} settled${now?.provenance?.approved_by ? ` by ${now.provenance.approved_by} (${now.provenance.wording} the wording)` : ""}`);
}
if (!settled.length) { lap("nothing for the founder to settle; stopping"); finish(1); process.exit(1); }

// 4. The work the founder's decisions unlocked.
await agent(`${rules}
The founder settled: ${settled.join(", ")}. mentura_decisions shows what that unlocked. First, if the founder accepted the problem record, mentura_run purpose/validation/assess with as_is true and note what the evidence supports. Then do the work the decisions unlock for you: if product-exists is decided, write product cards (purpose/product/<id>) for what exists or is planned, from the founder's ideas, citing them; then propose wording for core-product with mentura_propose_decision (id "core-product", at "products", name "product.core", the same question; mentura_decisions shows it), from the ideas tagged venture-core, citing them. Then mentura_run purpose/ideas/routes and draft the highest-signal destination still in Routed that moves in order and has no record yet (not the problem, not products), from its ideas, citing them. Then mentura_decisions again and report in at most six lines: what the assessment says, what you did, and the founder's next decision with why it ranks first.`, "pass 2: the work the decisions unlocked");

// 5. The venture package (EE-067, EE-069): the question matrix settles which packages are open (Jev
//    answers what the records leave open), and the view shows each package's state, what moves now and
//    what waits. The sitemap is a marketing record: it is planned only once the marketing package is open.
let pkgArgs = [];
if (jev) {
  const rq = spawnSync("node", [join(repo, "schema/packages.mjs"), "request", dir], { encoding: "utf8" });
  const q = rq.status === 0 ? JSON.parse(rq.stdout) : null;
  if (q && Object.keys(q.questions).length) {
    const p = spawnSync("node", [join(repo, "platform/integrations/jev.mjs")], { input: JSON.stringify(q), encoding: "utf8" });
    if (p.status === 0) { writeFileSync(join(ws, "package-answers.json"), p.stdout); pkgArgs = ["--answers", join(ws, "package-answers.json")]; console.log(`   Jev answered ${Object.keys(q.questions).length} of the question matrix's questions`); }
  }
}
let pk = spawnSync("node", [join(repo, "schema/packages.mjs"), dir, ...pkgArgs, "--json"], { encoding: "utf8" });
if (pk.status === 0 && JSON.parse(pk.stdout).core.some((x) => x.id === "marketing" && x.in === "now")) {
  const sp = spawnSync("node", [join(repo, "operations/marketing/site/plan.mjs"), dir, "--write"], { encoding: "utf8" });
  if (sp.status === 0) prov(dir, { entity: "operations/marketing/sitemap.json", route: "operations/marketing/sitemap", activity: "create", derived_from: ["purpose/icp.json", "products/"], agent: agentFromEnv("agent", "harness", { id: "naive-planner" }), note: "the site planned from the venture's records: the marketing package is open" });
}
pk = spawnSync("node", [join(repo, "schema/packages.mjs"), dir, ...pkgArgs, "--write", "--json"], { encoding: "utf8" });
if (pk.status === 0) {
  const r = JSON.parse(pk.stdout);
  const open = r.core.filter((x) => x.in === "now");
  trace.children.push({ name: "venture package", run_type: "tool", start: iso(), end: iso(), inputs: { phase: r.phase }, outputs: { progress: r.progress, open: open.map((x) => ({ id: x.id, state: x.state, progress: x.progress, moving: x.moving, missing: x.missing })), questions_open: r.situation.questions.filter((x) => x.value == null).map((x) => x.id) } });
  lap(`venture package: ${Math.round(r.progress * 100)}% across ${open.map((x) => `${x.title} (${x.state}, ${Math.round(x.progress * 100)}%)`).join(", ")}; next phase: ${r.core.filter((x) => x.in === "next").map((x) => x.title).join(", ") || "none"}; view in ${join(dir, "package")}`);
} else console.log(`   the venture package failed: ${pk.stderr.trim().slice(0, 300)}`);

const end = decisions(dir);
lap(`done. ${end.decisions.filter((d) => d.source === "file").length} decision records, ${end.decisions.filter((d) => d.rank != null).length} ranked for the founder, ${settled.length} settled; workspace ${ws}`);
finish(0);
