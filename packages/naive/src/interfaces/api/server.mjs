#!/usr/bin/env node
// The HTTP API over the router (EE-030). Local by default: it binds to 127.0.0.1 and has no
// authentication, so it is for one builder's machine, not the internet. Every caller is treated as
// an agent, so gated records are written as drafts for a person to accept.
//
//   node packages/naive/src/interfaces/api/server.mjs [--port 4330]
//
//   GET  /routes, /groups                           the route table; route groups by phase
//   GET  /ventures                                  ventures in the workspace
//   GET  /templates/<route>                         a record's template
//   GET  /ventures/<venture>                        the venture overview (system/overview)
//   GET  /ventures/<venture>/<route>                read a record (a collection item: <route>/<id>)
//   GET  /ventures/<venture>/<route>/view           the route as a Markdown page
//   GET  /ventures/<venture>/<route>/layout         the layout an agent gets before acting
//   PUT  /ventures/<venture>/<route>                write a record (JSON body); provenance from the
//        headers x-mentura-derived-from (comma-separated), x-mentura-decision, x-mentura-model;
//        the role acting from x-mentura-actor (checked against the team plan's routes); a confidence
//        score computed before the write from x-mentura-confidence
//   POST /ventures/<venture>/<route>/check          run its checks
//   POST /ventures/<venture>/<route>/run            run a command route (optional JSON body {value})
//
// <venture> is an id or, for a nested venture, its folder path (studio/print).

import { createServer } from "node:http";
import { call, groups, resolve, routes, ventureDir, ventures } from "../../router/router.mjs";

const status = (r) => r.ok ? 200 : /^no (route|venture)/.test(r.error ?? "") ? 404 : /has no action/.test(r.error ?? "") ? 405 : / may not /.test(r.error ?? "") ? 403 : 422;
const VERBS = { check: "POST", run: "POST", view: "GET", layout: "GET" };

export async function route(method, url, body, headers = {}) {
  const path = decodeURIComponent(new URL(url, "http://x").pathname).replace(/\/+$/, "");
  if (method === "GET" && path === "/routes") return [200, routes()];
  if (method === "GET" && path === "/ventures") return [200, ventures().map(({ id, name, phase }) => ({ id, name, phase }))];
  let m = path.match(/^\/templates\/(.+)$/);
  if (method === "GET" && m) { const r = await call({ route: m[1], action: "template" }); return [status(r), r]; }
  if (method === "GET" && path === "/groups") return [200, groups()];
  m = path.match(/^\/ventures\/(.+)$/);
  if (!m) return [404, { ok: false, error: `no endpoint ${method} ${path}` }];
  // [...venture]: the longest leading run of segments that names a venture; the rest is the route.
  const parts = m[1].split("/");
  let venture, rest;
  for (let i = parts.length; i >= 1; i--) if (ventureDir(parts.slice(0, i).join("/"))) { venture = parts.slice(0, i).join("/"); rest = parts.slice(i); break; }
  if (!venture) return [404, { ok: false, error: `no venture in ${path}` }];
  if (!rest.length) { if (method !== "GET") return [405, { ok: false, error: `${method} is not allowed on ${path}` }]; const r = await call({ venture, route: "system/overview", action: "run", via: "api" }); return [status(r), r]; }
  let verb = VERBS[rest.at(-1)] && resolve(rest.slice(0, -1).join("/")).r ? rest.pop() : null;
  const rt = rest.join("/");
  const action = verb ?? (method === "GET" ? "read" : method === "PUT" ? "write" : null);
  if (!action || (verb && VERBS[verb] !== method)) return [405, { ok: false, error: `${method} is not allowed on ${path}` }];
  const h = (k) => headers[k] || undefined;
  const r = await call({ venture, route: rt, action, input: body, actor: "agent", actor_id: h("x-mentura-actor"), via: "api",
    // Gate group hook (X-4): x-mentura-confidence carries a score computed before the write, for the gate's confidence rules.
    provenance: { derived_from: h("x-mentura-derived-from")?.split(",").map((x) => x.trim()).filter(Boolean), decision: h("x-mentura-decision"), confidence: h("x-mentura-confidence"),
      agent: Object.fromEntries(Object.entries({ model: h("x-mentura-model"), harness: h("user-agent") }).filter(([, v]) => v)) } });
  return [status(r), r];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf("--port");
  const port = i >= 0 ? Number(process.argv[i + 1]) : 4330;
  createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on("end", async () => {
      let body;
      try { body = raw ? JSON.parse(raw) : undefined; } catch { res.writeHead(400, { "content-type": "application/json" }); res.end(JSON.stringify({ ok: false, error: "body is not JSON" })); return; }
      const [code, out] = await route(req.method, req.url, body, req.headers);
      res.writeHead(code, { "content-type": "application/json" });
      res.end(JSON.stringify(out, null, 2));
    });
  }).listen(port, "127.0.0.1", () => console.log(`mentura API on http://127.0.0.1:${port}`));
}
