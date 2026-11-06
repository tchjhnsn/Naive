#!/usr/bin/env node
// The MCP server over the router (EE-030): stdio, newline-delimited JSON-RPC 2.0, no dependencies.
// Tools are the router's actions; resources are the route table and each venture's records.
// Every caller here is an agent: write never takes an actor, so a gated record (ownership, board,
// founder agreement, exit, telos, decision rights, publication policy) is always written as a
// draft for a person to accept. Nothing an agent sends through this server can approve itself.
//
//   claude mcp add mentura -- node <repo>/interface/mcp/server.mjs
//   MENTURA_WORKSPACE=<dir> sets the workspace; the default is the current directory.

import { createInterface } from "node:readline";
import { call, routes, routesMd, ventureDir, ventures } from "../../router/router.mjs";
import { runStreaming } from "../../router/context.mjs";
import { propose } from "../../engine/decisions.mjs";

const PROTOCOL = "2025-06-18";
const venture = { type: "string", description: "The venture's id, or its folder path for a nested venture (see mentura_ventures)" };
const route = { type: "string", description: "A route from mentura_routes, such as purpose/validation/problem" };
export const TOOLS = [
  { name: "mentura_routes", description: "The route table: every record and command a venture has, with its actions, decision classes and groups. A collection item is <route>/<id>, such as purpose/product/kettle.", inputSchema: { type: "object", properties: { group: { type: "string", description: "Only the routes need-now suggests in this phase: discovery, validation, beachhead, scale or platform" } } } },
  { name: "mentura_layout", description: "The context for a route before you act on it: the system, layer and kit purpose, skills and references, the schema and template, the gate, and what need-now says about the record.", inputSchema: { type: "object", properties: { venture, route }, required: ["route"] } },
  { name: "mentura_view", description: "A route as a Markdown page for a person. system/overview shows the venture at a glance.", inputSchema: { type: "object", properties: { venture, route }, required: ["venture", "route"] } },
  { name: "mentura_ventures", description: "The ventures in the workspace, with their phase.", inputSchema: { type: "object", properties: {} } },
  { name: "mentura_read", description: "Read one record of a venture, header first: the header (what it is, its state, owner and size in tokens), the budget, the layout (in a session, only the parts you have not seen), the template (need-now and open decisions, fresh), the record as result (null when the venture has no such record yet), and prefetch: short summaries of the routes you are likely to need next. Pass header_only to stop after the header. A list returns only the items your role may read.", inputSchema: { type: "object", properties: { venture, route,
    session: { type: "string", description: "Your session id: the layout is sent once per session, then only the parts that changed" },
    task: { type: "string", description: "What you are doing; a route it names is prefetched in full" },
    prefetch: { description: "false turns prefetch off; a list of routes prefetches those in full", oneOf: [{ type: "boolean" }, { type: "array", items: { type: "string" } }] },
    header_only: { type: "boolean", description: "Return only the header, to decide whether to read on" },
    where: { type: "object", description: "For a list: keep only records whose fields match these values" },
    agent_id: { type: "string", description: "Your role in the team plan, so its read routes apply" } }, required: ["venture", "route"] } },
  { name: "mentura_write", description: "Write one record of a venture. The record must match its schema. A gated record is written as a draft under _drafts/ for a person to accept. Every write is logged in the venture's provenance log: say what the content came from and the decision it acts under.", inputSchema: { type: "object", properties: { venture, route, record: { type: "object", description: "The whole record" },
    derived_from: { type: "array", items: { type: "string" }, description: "What the content came from: venture-relative paths, URLs or decision ids" },
    decision: { type: "string", description: "The decision the write acts under, such as EE-026" },
    model: { type: "string", description: "Your model, for the provenance log" }, note: { type: "string" },
    agent_id: { type: "string", description: "Your role in the team plan, so its routes and unlocks apply" },
    // Gate group hook (X-4): a score computed before the write; the gate's confidence rules read it and never compute one.
    confidence: { type: "number", description: "Your confidence in this record, 0 to 1, if you computed one. Below the venture's threshold, a gate rule may send the write to its function owner" } }, required: ["venture", "route", "record"] } },
  { name: "mentura_decisions", description: "The decisions a venture owes (EE-054): each with its parent, boundary, phase, due time and whether it renders now, is overdue, waits, comes later, is stale or deferred. Work on what renders now or overdue; a decision that waits is held by an open fail-closed decision above it. A route a pending decision unlocks is refused until a person decides it.", inputSchema: { type: "object", properties: { venture,
    render: { type: "array", items: { type: "string" }, description: "Only these states, such as [\"overdue\", \"now\"]" } }, required: ["venture"] } },
  { name: "mentura_propose_decision", description: "Propose a decision, or new wording for an open one. It stays open until a person approves it in the CLI (mentura decide); you can never mark a decision decided. Put it beside what it decides with at (a venture folder such as operations) and name (<record>[.<topic>]).", inputSchema: { type: "object", properties: { venture,
    decision: { type: "object", description: "id, question, and optionally answer (your proposed wording), decides, layer, parent, needed_in, due, outcomes, unlocks, note, plus at and name for where it goes" },
    agent_id: { type: "string", description: "Your role in the team plan" }, model: { type: "string" } }, required: ["venture", "decision"] } },
  // Setup (EE-083, interface/skills/naive-setup): the questions that establish a new venture, in order, and an artifact of the progress.
  { name: "mentura_setup", description: "Where a new venture's setup stands: its people and hats, the source of truth for each function, the foundation and first decisions (the docket), the goal for discovery, and which steps are done. artifact is that state as one self-contained HTML page: render it as an artifact where your harness has artifacts, and again after every answer. Ask the founder the next open question, one at a time, in order.", inputSchema: { type: "object", properties: { venture }, required: ["venture"] } },
  { name: "mentura_setup_answer", description: "Write down the founder's answer to one setup question (a docket id from mentura_setup, or discovery-goal), exactly in their words. It is proposed with their words as its wording and stays open until the founder confirms it at the keyboard (naive setup confirm): you never decide for them.", inputSchema: { type: "object", properties: { venture,
    id: { type: "string", description: "The question's id from mentura_setup's docket, or discovery-goal" },
    answer: { type: "string", description: "The founder's answer, verbatim" },
    agent_id: { type: "string", description: "Your role in the team plan" }, model: { type: "string" } }, required: ["venture", "id", "answer"] } },
  { name: "mentura_setup_point", description: "Point one function of the venture at the system that holds its truth (from mentura_setup's catalog), as the founder said, such as finance at rho or products at github with address acme/app. Naive keeps a pointer, never a copy; Rho is synced at once.", inputSchema: { type: "object", properties: { venture,
    function: { type: "string", description: "A function, such as products, finance or legal" },
    system: { type: "string", description: "A system the catalog offers for that function" },
    address: { type: "string", description: "Where in that system, such as acme/app" },
    agent_id: { type: "string", description: "Your role in the team plan" } }, required: ["venture", "function", "system"] } },
  // The decision library (packages/naive/src/engine/frames.mjs): a founder's problem matched to a frame, its premises judged, its decisions proposed.
  { name: "mentura_frame", description: "When the founder states a problem in their own words (\"I need investors to scale but I don't want to give up control\"), match it to a frame in the decision library, judge the premises their sentence assumes against the venture's records, and propose the decisions hidden in it, open, with options. The result says which premises hold, whether the trade is false, real or a sequence, and the better question to ask. Never pick an option for the founder, and never name an instrument as the answer: options for how to do something come from a dated, cited lookup.", inputSchema: { type: "object", properties: { venture,
    text: { type: "string", description: "The founder's words, verbatim" },
    frame: { type: "string", description: "A frame id, when you already know it; otherwise the founder's words pick one" },
    lookup: { type: "object", description: "Options a lookup found: { options: [{ option, source, as_of }] }; only dated, cited options within the frame's freshness are kept" },
    agent_id: { type: "string", description: "Your role in the team plan" }, model: { type: "string" } } } },
  { name: "mentura_check", description: "Run the checks for one record of a venture.", inputSchema: { type: "object", properties: { venture, route }, required: ["venture", "route"] } },
  { name: "mentura_template", description: "The fill-in template for a record, where its kit has one.", inputSchema: { type: "object", properties: { route }, required: ["route"] } },
  { name: "mentura_run", description: "Run a command route for a venture: system/need-now (what to work on now), system/time-to-ready, purpose/validation/assess (what the problem's evidence is strong enough for), governance/payouts, knowledge/catalog (index every source the venture keeps records in), knowledge/search (find items in any of them). A result with needs_input lists what is missing: ask the person whether to fill it in or run as is, and only then call again with as_is.", inputSchema: { type: "object", properties: { venture, route, value: { type: ["number", "string"], description: "governance/payouts: a sale value; knowledge/search: the query" },
    as_is: { type: "boolean", description: "purpose/validation/assess: run even though the record is incomplete. Set it only after the person chose to run as is" },
    agent_id: { type: "string", description: "Your role in the team plan" } }, required: ["venture", "route"] } },
];

let client = null; // the harness, as it named itself at initialize

// notify sends a notification to the client; progress for a call that carries _meta.progressToken (N-5).
/** @param {*} msg @param {(m: *) => void} [notify] */
export async function handle(msg, notify = () => {}) {
  const { id, method, params = {} } = msg;
  const reply = (result) => ({ jsonrpc: "2.0", id, result });
  const fail = (code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
  switch (method) {
    case "initialize":
      client = params.clientInfo ? [params.clientInfo.name, params.clientInfo.version].filter(Boolean).join(" ") : null;
      return reply({ protocolVersion: PROTOCOL, capabilities: { tools: {}, resources: {} }, serverInfo: { name: "mentura", version: "0.1.0" },
        instructions: "Start with mentura_decisions to see which decisions are due and what is held, then mentura_run on system/need-now to see what a venture needs now, so you build only that. Read before you write. Gated records are drafts until a person accepts them." });
    case "notifications/initialized": case "notifications/cancelled": return null;
    case "ping": return reply({});
    case "tools/list": return reply({ tools: TOOLS });
    case "tools/call": {
      const a = params.arguments ?? {};
      const token = params._meta?.progressToken;
      let step = 0;
      const progress = token === undefined ? null : /** @type {(p: { progress?: number, total?: number, message: string }) => void} */ (({ progress: p, total, message }) => notify({ jsonrpc: "2.0", method: "notifications/progress", params: { progressToken: token, progress: Math.max(p ?? 0, ++step), ...(total ? { total } : {}), message } }));
      let r;
      switch (params.name) {
        case "mentura_routes": r = { ok: true, result: a.group ? routes().filter((x) => x.groups.includes(`(${a.group})`)) : routes() }; break;
        case "mentura_ventures": r = { ok: true, result: ventures().map(({ id, name, phase, path }) => ({ id, name, phase, path })) }; break;
        case "mentura_layout": r = await call({ venture: a.venture, route: a.route, action: "layout" }); break;
        case "mentura_view": r = await call({ venture: a.venture, route: a.route, action: "view" }); break;
        // Context hook (packages/naive/src/router/context.mjs): a read is a navigation, header first, its parts streamed as progress.
        // A filtered list (where) is a plain read (packages/naive/src/router/writes.mjs); anything else is a navigation.
        case "mentura_read": r = a.where ? await call({ venture: a.venture, route: a.route, action: "read", actor_id: a.agent_id, via: "mcp", input: { where: a.where } }) : await call({ venture: a.venture, route: a.route, action: "navigate", actor_id: a.agent_id, via: "mcp",
          input: { session: a.session, task: a.task, prefetch: a.prefetch, header_only: a.header_only, ...(progress ? { onPart: ({ part, data }) => progress({ message: `${part}: ${JSON.stringify(data)}` }) } : {}) } }); break;
        case "mentura_write": r = await call({ venture: a.venture, route: a.route, action: "write", input: a.record, actor: "agent", actor_id: a.agent_id, via: "mcp",
          provenance: { derived_from: a.derived_from, decision: a.decision, note: a.note, confidence: a.confidence, agent: Object.fromEntries(Object.entries({ harness: client, model: a.model }).filter(([, v]) => v)) } }); break;
        // Setup (EE-083): packages/naive/src/router/orchestration/setup.mjs holds the questions; answers are proposals the founder confirms.
        case "mentura_setup": { const m = await import("../../router/orchestration/setup.mjs"); const dir = ventureDir(a.venture); r = { ok: true, result: { state: await m.state(dir), artifact: await m.artifact(dir) } }; break; }
        case "mentura_setup_answer": r = await (await import("../../router/orchestration/setup.mjs")).relay(ventureDir(a.venture), { id: a.id, answer: a.answer, agentId: a.agent_id, harness: client, model: a.model }); break;
        case "mentura_setup_point": r = await (await import("../../router/orchestration/setup.mjs")).point(ventureDir(a.venture), { fn: a.function, system: a.system, address: a.address, via: "mcp", actor: "agent", agentId: a.agent_id }); break;
        case "mentura_frame": r = await (await import("../../engine/frames.mjs")).run(ventureDir(a.venture), { id: a.frame, text: a.text, lookup: a.lookup, agentId: a.agent_id ?? "frames", harness: client, model: a.model }); break;
        case "mentura_decisions": {
          r = await call({ venture: a.venture, route: "governance/decisions", action: "run", actor_id: a.agent_id });
          if (r.ok && a.render?.length) r.result = { ...r.result, decisions: r.result.decisions.filter((d) => a.render.includes(d.render)) };
          break;
        }
        case "mentura_propose_decision": {
          const dir = ventureDir(a.venture);
          r = dir ? propose(dir, a.decision, { agentId: a.agent_id, via: "mcp", harness: client, model: a.model }) : { ok: false, error: `no venture ${a.venture}` };
          break;
        }
        case "mentura_check": r = await call({ venture: a.venture, route: a.route, action: "check" }); break;
        case "mentura_template": r = await call({ route: a.route, action: "template" }); break;
        case "mentura_run": r = progress && a.route !== "system/overview" && a.route !== "system/robots"
          ? await runStreaming({ venture: a.venture, route: a.route, input: { value: a.value, as_is: a.as_is }, actor_id: a.agent_id }, progress)
          : await call({ venture: a.venture, route: a.route, action: "run", actor_id: a.agent_id, input: a.value !== undefined || a.as_is ? { ...(a.value !== undefined ? { value: a.value } : {}), ...(a.as_is ? { as_is: true } : {}) } : undefined }); break;
        default: return fail(-32602, `unknown tool ${params.name}`);
      }
      if (r.ok && r.needs_input) return reply({ content: [{ type: "text", text: `Ask the person before running. ${r.needs_input.ask}\n${JSON.stringify(r.needs_input, null, 2)}` }], isError: false });
      const extra = ["not_found", "pending_draft", "fix", "deprecated"].some((k) => r[k]);
      const text = r.ok ? (typeof r.result === "string" && !extra ? r.result : JSON.stringify(extra ? r : r.result, null, 2)) : JSON.stringify({ error: r.error, ...(r.fix ? { fix: r.fix } : {}), ...(r.result ? { result: r.result } : {}) }, null, 2);
      return reply({ content: [{ type: "text", text }], isError: !r.ok });
    }
    case "resources/list":
      return reply({ resources: [
        { uri: "mentura://routes", name: "Route table", mimeType: "text/markdown" },
        ...ventures().map((v) => ({ uri: `mentura://${v.id}`, name: `${v.id}: overview`, mimeType: "text/markdown" })),
        ...ventures().flatMap((v) => routes().filter((x) => x.kind === "record" && !x.route.endsWith("[id]")).map((x) => ({ uri: `mentura://${v.id}/${x.route}`, name: `${v.id}: ${x.route}`, mimeType: "application/json" }))),
      ] });
    case "resources/read": {
      const uri = params.uri ?? "";
      if (uri === "mentura://routes") return reply({ contents: [{ uri, mimeType: "text/markdown", text: routesMd() }] });
      const o = uri.match(/^mentura:\/\/([^/]+)$/);
      if (o) { const r = await call({ venture: o[1], route: "system/overview", action: "view" }); return r.ok ? reply({ contents: [{ uri, mimeType: "text/markdown", text: r.result }] }) : fail(-32602, r.error); }
      const m = uri.match(/^mentura:\/\/([^/]+)\/(.+)$/);
      if (!m) return fail(-32602, `unknown resource ${uri}`);
      const r = await call({ venture: m[1], route: m[2], action: "read" });
      if (!r.ok) return fail(-32602, r.error);
      return reply({ contents: [{ uri, mimeType: "application/json", text: JSON.stringify(r.result, null, 2) }] });
    }
    default:
      return id === undefined ? null : fail(-32601, `method not found: ${method}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rl = createInterface({ input: process.stdin });
  // Answers go out in the order requests came in: each line waits for the one before.
  let queue = Promise.resolve();
  rl.on("line", (line) => {
    if (!line.trim()) return;
    queue = queue.then(async () => {
      let msg;
      try { msg = JSON.parse(line); } catch { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + "\n"); return; }
      let res;
      try { res = await handle(msg, (n) => process.stdout.write(JSON.stringify(n) + "\n")); } catch (e) { res = { jsonrpc: "2.0", id: msg.id ?? null, error: { code: -32603, message: String(e.message ?? e) } }; }
      if (res) process.stdout.write(JSON.stringify(res) + "\n");
    });
  });
}
