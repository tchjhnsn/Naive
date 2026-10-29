#!/usr/bin/env node
// The framework CLI (EE-072). mentura stays for platform commands and as an alias,
// so `mentura typegen` and `mentura upgrade` run these same commands.
//
//   naive typegen                                   write .naive/types/ from the route table and the MCP tools
//   naive upgrade <venture dir>                     move a venture onto the next Naive layout (EE-076)
//   naive port --from <project> --venture <dir>     plan bringing a project in with its files as they are
//   naive port --venture <dir> --apply --confirm port
//                                                   carry out that plan (EE-076)

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { TOOLS } from "../mcp/server.mjs";
import { routes } from "../router.mjs";

const repo = new URL("../..", import.meta.url).pathname;
const [cmd, ...rest] = process.argv.slice(2);
const run = (script, args) => process.exit(spawnSync("node", [join(repo, script), ...args], { stdio: "inherit" }).status ?? 1);

if (cmd === "upgrade") run("schema/upgrade-venture.mjs", rest);
else if (cmd === "port") run("schema/port-venture.mjs", rest);
else if (cmd === "typegen") {
  const out = join(repo, ".naive/types");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "tools.json"), JSON.stringify(TOOLS, null, 2) + "\n");
  writeFileSync(join(out, "routes.json"), JSON.stringify(routes().map((r) => ({ route: r.route, actions: r.actions, kind: r.kind })), null, 2) + "\n");
  console.log(`wrote ${out}`);
} else {
  console.error("usage: node interface/cli/naive.mjs typegen | upgrade <venture dir> | port --from <project> --venture <dir> [--apply --confirm port]");
  process.exit(cmd ? 1 : 2);
}
