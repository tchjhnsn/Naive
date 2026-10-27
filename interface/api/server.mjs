#!/usr/bin/env node
// The HTTP API over the router (EE-030). Local by default: it binds to 127.0.0.1 and has no
// authentication, so it is for one builder's machine, not the internet. Every caller is treated as
// an agent, so gated records are written as drafts for a person to accept.
//
//   node interface/api/server.mjs [--port 4330]
//
//   GET  /routes                                    the route table
//   GET  /ventures                                  ventures in the workspace
//   GET  /templates/<route>                         a record's template
//   GET  /ventures/<id>/<route>                     read a record
//   PUT  /ventures/<id>/<route>                     write a record (JSON body); provenance from the
//        headers x-mentura-derived-from (comma-separated), x-mentura-decision, x-mentura-model
//   POST /ventures/<id>/<route>/check               run its checks
//   POST /ventures/<id>/<route>/run                 run a command route (optional JSON body {value})

import { createServer } from "node:http";
import { call, routes, ventures } from "../router.mjs";

const status = (r) => r.ok ? 200 : /^no (route|venture)/.test(r.error ?? "") ? 404 : /has no action/.test(r.error ?? "") ? 405 : 422;

export function route(method, url, body, headers = {}) {
  const path = decodeURIComponent(new URL(url, "http://x").pathname).replace(/\/+$/, "");
  if (method === "GET" && path === "/routes") return [200, routes()];
  if (method === "GET" && path === "/ventures") return [200, ventures().map(({ id, name, phase }) => ({ id, name, phase }))];
  let m = path.match(/^\/templates\/(.+)$/);
  if (method === "GET" && m) { const r = call({ route: m[1], action: "template" }); return [status(r), r]; }
  m = path.match(/^\/ventures\/([^/]+)\/(.+?)(?:\/(check|run))?$/);
  if (!m) return [404, { ok: false, error: `no endpoint ${method} ${path}` }];
  const [, venture, rt, verb] = m;
  const action = verb ?? (method === "GET" ? "read" : method === "PUT" ? "write" : null);
  if (!action || (verb && method !== "POST")) return [405, { ok: false, error: `${method} is not allowed on ${path}` }];
  const h = (k) => headers[k] || undefined;
  const r = call({ venture, route: rt, action, input: body, actor: "agent", via: "api",
    provenance: { derived_from: h("x-mentura-derived-from")?.split(",").map((x) => x.trim()).filter(Boolean), decision: h("x-mentura-decision"),
      agent: Object.fromEntries(Object.entries({ model: h("x-mentura-model"), harness: h("user-agent") }).filter(([, v]) => v)) } });
  return [status(r), r];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf("--port");
  const port = i >= 0 ? Number(process.argv[i + 1]) : 4330;
  createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on("end", () => {
      let body;
      try { body = raw ? JSON.parse(raw) : undefined; } catch { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, error: "body is not JSON" })); return; }
      const [code, out] = route(req.method, req.url, body, req.headers);
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(out, null, 2));
    });
  }).listen(port, "127.0.0.1", () => console.log(`mentura API on http://127.0.0.1:${port}`));
}
