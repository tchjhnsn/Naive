#!/usr/bin/env node
// The MCP server over the router (EE-030): stdio, newline-delimited JSON-RPC 2.0, no dependencies.
// Tools are the router's actions; resources are the route table and each venture's records.
// Every caller here is an agent: write never takes an actor, so a gated record (ownership, board,
// founder agreement, exit, telos, decision rights, publication policy) is always written as a
// draft for a person to accept. Nothing an agent sends through this server can approve itself.
//
//   claude mcp add mentura -- node <repo>/interface/mcp/server.mjs
//   MENTURA_WORKSPACE=<dir> sets the workspace; the default is this repository's instance/.

import { createInterface } from "node:readline";
import { call, routes, routesMd, ventures } from "../router.mjs";

const PROTOCOL = "2025-06-18";
const venture = { type: "string", description: "The venture's id (see mentura_ventures)" };
const route = { type: "string", description: "A route from mentura_routes, such as purpose/validation/problem" };
export const TOOLS = [
  { name: "mentura_routes", description: "The route table: every record and command a venture has, with its actions and gates.", inputSchema: { type: "object", properties: {} } },
  { name: "mentura_ventures", description: "The ventures in the workspace, with their phase.", inputSchema: { type: "object", properties: {} } },
  { name: "mentura_read", description: "Read one record of a venture. Returns null when the venture has no such record yet.", inputSchema: { type: "object", properties: { venture, route }, required: ["venture", "route"] } },
  { name: "mentura_write", description: "Write one record of a venture. The record must match its schema. A gated record is written as a draft under _drafts/ for a person to accept.", inputSchema: { type: "object", properties: { venture, route, record: { type: "object", description: "The whole record" } }, required: ["venture", "route", "record"] } },
  { name: "mentura_check", description: "Run the checks for one record of a venture.", inputSchema: { type: "object", properties: { venture, route }, required: ["venture", "route"] } },
  { name: "mentura_template", description: "The fill-in template for a record, where its kit has one.", inputSchema: { type: "object", properties: { route }, required: ["route"] } },
  { name: "mentura_run", description: "Run a command route for a venture: system/need-now (what to work on now), system/time-to-ready, purpose/validation/score, governance/payouts.", inputSchema: { type: "object", properties: { venture, route, value: { type: "number", description: "governance/payouts only: a sale value" } }, required: ["venture", "route"] } },
];

export function handle(msg) {
  const { id, method, params = {} } = msg;
  const reply = (result) => ({ jsonrpc: "2.0", id, result });
  const fail = (code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });
  switch (method) {
    case "initialize":
      return reply({ protocolVersion: PROTOCOL, capabilities: { tools: {}, resources: {} }, serverInfo: { name: "mentura", version: "0.1.0" },
        instructions: "Start with mentura_run on system/need-now to see what a venture needs now, so you build only that. Read before you write. Gated records are drafts until a person accepts them." });
    case "notifications/initialized": case "notifications/cancelled": return null;
    case "ping": return reply({});
    case "tools/list": return reply({ tools: TOOLS });
    case "tools/call": {
      const a = params.arguments ?? {};
      let r;
      switch (params.name) {
        case "mentura_routes": r = { ok: true, result: routes() }; break;
        case "mentura_ventures": r = { ok: true, result: ventures().map(({ id, name, phase }) => ({ id, name, phase })) }; break;
        case "mentura_read": r = call({ venture: a.venture, route: a.route, action: "read" }); break;
        case "mentura_write": r = call({ venture: a.venture, route: a.route, action: "write", input: a.record, actor: "agent" }); break;
        case "mentura_check": r = call({ venture: a.venture, route: a.route, action: "check" }); break;
        case "mentura_template": r = call({ route: a.route, action: "template" }); break;
        case "mentura_run": r = call({ venture: a.venture, route: a.route, action: "run", input: a.value !== undefined ? { value: a.value } : undefined }); break;
        default: return fail(-32602, `unknown tool ${params.name}`);
      }
      const text = r.ok ? (typeof r.result === "string" ? r.result : JSON.stringify(r.note ? { note: r.note, result: r.result } : r.result, null, 2)) : (r.error ?? JSON.stringify(r.result, null, 2));
      return reply({ content: [{ type: "text", text }], isError: !r.ok });
    }
    case "resources/list":
      return reply({ resources: [
        { uri: "mentura://routes", name: "Route table", mimeType: "text/markdown" },
        ...ventures().flatMap((v) => routes().filter((x) => x.kind === "record").map((x) => ({ uri: `mentura://${v.id}/${x.route}`, name: `${v.id}: ${x.route}`, mimeType: "application/json" }))),
      ] });
    case "resources/read": {
      const uri = params.uri ?? "";
      if (uri === "mentura://routes") return reply({ contents: [{ uri, mimeType: "text/markdown", text: routesMd() }] });
      const m = uri.match(/^mentura:\/\/([^/]+)\/(.+)$/);
      if (!m) return fail(-32602, `unknown resource ${uri}`);
      const r = call({ venture: m[1], route: m[2], action: "read" });
      if (!r.ok) return fail(-32602, r.error);
      return reply({ contents: [{ uri, mimeType: "application/json", text: JSON.stringify(r.result, null, 2) }] });
    }
    default:
      return id === undefined ? null : fail(-32601, `method not found: ${method}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const rl = createInterface({ input: process.stdin });
  rl.on("line", (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }) + "\n"); return; }
    let res;
    try { res = handle(msg); } catch (e) { res = { jsonrpc: "2.0", id: msg.id ?? null, error: { code: -32603, message: String(e.message ?? e) } }; }
    if (res) process.stdout.write(JSON.stringify(res) + "\n");
  });
}
