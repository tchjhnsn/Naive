#!/usr/bin/env node
// The framework CLI (EE-072). mentura stays for platform commands and as an alias,
// so `mentura typegen` runs this same command.
//
//   naive typegen     write .naive/types/ from the route table and the MCP tools

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TOOLS } from "../mcp/server.mjs";
import { routes } from "../router.mjs";

const repo = new URL("../..", import.meta.url).pathname;
const cmd = process.argv[2];
if (cmd !== "typegen") {
  console.error("usage: node interface/cli/naive.mjs typegen");
  process.exit(cmd ? 1 : 2);
}
const out = join(repo, ".naive/types");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "tools.json"), JSON.stringify(TOOLS, null, 2) + "\n");
writeFileSync(join(out, "routes.json"), JSON.stringify(routes().map((r) => ({ route: r.route, actions: r.actions, kind: r.kind })), null, 2) + "\n");
console.log(`wrote ${out}`);
