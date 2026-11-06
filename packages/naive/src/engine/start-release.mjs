#!/usr/bin/env node
// naive start (I-17, C-12): serves a venture's release read-only over local HTTP. No router: it reads
// <venture>/.release/ and nothing else (packages/naive/src/engine/release-read.mjs), as a CDN serves a static shell. It
// reads the manifest on each request, so an item added with build-release --add shows at once (C-18).
// It listens on 127.0.0.1 only. The paths are listed in packages/naive/src/engine/release-read.mjs; /card.svg is the
// release card drawn by packages/naive/src/engine/release-card.mjs.
//
//   node packages/naive/src/engine/start-release.mjs <venture dir> [--port n]     serve; --port 0 picks a free port (default 4330)
//   node packages/naive/src/engine/start-release.mjs <venture dir> --get <path>   answer one path and exit, without a server

import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { svg } from "./release-card.mjs";
import { answer, readRelease } from "./release-read.mjs";

const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const values = new Set(["port", "get", "now"].flatMap((n) => (opt(n) !== undefined ? [opt(n)] : [])));
const dir = args.find((a) => !a.startsWith("--") && !values.has(a));
if (!dir || !existsSync(join(dir, "venture.json"))) { console.error("usage: node packages/naive/src/engine/start-release.mjs <venture dir> [--port n] | --get <path>"); process.exit(2); }
if (!readRelease(dir)) { console.error(`no release in ${dir}: run node packages/naive/src/router/orchestration/build-release.mjs ${dir} first`); process.exit(1); }

if (opt("get") !== undefined) {
  const a = answer(dir, "GET", opt("get"), { draw: svg });
  process.stdout.write(a.body);
  process.exit(a.status < 400 ? 0 : 1);
}

const port = opt("port") === undefined ? 4330 : Number(opt("port"));
if (!Number.isInteger(port) || port < 0 || port > 65535) { console.error(`--port ${opt("port")} is not a port`); process.exit(2); }
const server = createServer((req, res) => {
  const a = answer(dir, req.method, req.url ?? "/", { draw: svg });
  res.writeHead(a.status, { "content-type": a.type, "cache-control": "no-cache", ...(a.allow ? { allow: a.allow } : {}) });
  res.end(req.method === "HEAD" ? undefined : a.body);
});
server.listen(port, "127.0.0.1", () => {
  const m = readRelease(dir);
  console.log(`serving release ${m.release} of ${m.venture} read-only at http://127.0.0.1:${/** @type {import("node:net").AddressInfo} */ (server.address()).port}/`);
});
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => server.close(() => process.exit(0)));
