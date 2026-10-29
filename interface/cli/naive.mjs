#!/usr/bin/env node
// The framework CLI (EE-072), the way `next` is Next.js's: run it inside a venture and it finds the
// venture.json in the current directory or its parents. mentura stays for platform commands and as an
// alias, so `mentura typegen` and `mentura upgrade` run these same commands.
//
//   naive dev [--port 4331]                         the board, live: edit a record and it updates; each saved
//                                                   record is checked against its schema as you go (I-17, I-24)
//   naive build                                     check every package and write a release (I-17)
//   naive start                                     serve the latest release read-only (I-17)
//   naive check                                     run every check that applies to the venture (I-9)
//   naive info                                      versions, the venture, and which agents are connected (I-6)
//   naive mcp                                       serve the venture to an agent over MCP (stdio)
//   naive typegen                                   write .naive/types/ from the route table and the MCP tools
//   naive upgrade [<venture dir>] [--framework]     move a venture onto the next Naive layout; --framework first
//                                                   updates the installed framework with the venture's package manager (I-29)
//   naive port --from <project> --venture <dir>     plan bringing a project in with its files as they are
//   naive port --venture <dir> --apply --confirm port
//                                                   carry out that plan (EE-076)
//   naive migrate --from <project> --venture <dir>  an agent rewrites the project as Naive records, as a plan and decisions
//   naive migrate --venture <dir> --apply           write what a person decided (EE-076)
//
// --venture <dir> names the venture when you are not inside it.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { basename, join, relative, resolve } from "node:path";
import { asRouted, findVenture } from "./find-venture.mjs";

const repo = new URL("../..", import.meta.url).pathname;
const [cmd, ...rest] = process.argv.slice(2);
const opt = (n) => { const i = rest.indexOf(`--${n}`); return i >= 0 ? rest[i + 1] : undefined; };
const run = (script, args, opts = {}) => spawnSync("node", [join(repo, script), ...args], { stdio: "inherit", ...opts }).status ?? 1;
const version = () => JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).version;

// The venture: --venture <dir>, else the one this command runs inside.
function here() {
  const named = opt("venture");
  const dir = named ? (existsSync(join(resolve(named), "venture.json")) ? resolve(named) : null) : findVenture();
  if (!dir) {
    console.error(named ? `${named} has no venture.json` : `no venture here: run naive ${cmd} inside a venture (a directory with venture.json), or pass --venture <dir>`);
    process.exit(1);
  }
  return dir;
}

// A port that is free, starting at the one asked for, the way next dev moves on from 3000.
const free = (p) => new Promise((ok) => { const s = createServer().once("error", () => ok(free(p + 1))).once("listening", () => s.close(() => ok(p))).listen(p, "127.0.0.1"); });

// The schema a venture file is checked against, from the route table (records only).
async function schemaFor(file) {
  const { glob, routes } = await import("../router.mjs");
  return routes().find((r) => r.kind === "record" && r.schema && (r.files ?? []).some((g) => glob(g).test(file)))?.schema ?? null;
}

async function dev(dir) {
  // The root layout is required (I-21): a venture without AGENTS.md gets a stub, as next dev writes a root layout.
  if (!existsSync(join(dir, "AGENTS.md"))) {
    writeFileSync(join(dir, "AGENTS.md"), `# AGENTS.md: ${basename(dir)}\n\nThe map of this venture for agents. Read it, then a route's layout, before writing anything here.\n\n## Instructions\n\nphase: ${JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).phase}\nprivate: _private/\n`);
    console.log("   wrote AGENTS.md, the venture's root layout, because it was missing");
  }
  const { workspace, venture } = asRouted(dir);
  process.env.MENTURA_WORKSPACE = workspace;
  const port = await free(Number(opt("port") ?? 4331));
  const { serve } = await import("../demo/board.mjs");
  serve(port, venture);
  const name = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).name ?? venture;
  console.log(`\n  ▲ Naive ${version()}\n  - Venture:  ${name} (${relative(process.cwd(), dir) || "."})\n  - Board:    http://127.0.0.1:${port}/\n  - Map:      http://127.0.0.1:${port}/map\n\n  Watching for changes. Each saved record is checked against its schema. Ctrl-C to stop.\n`);
  // Live feedback on save (I-24): a record that no longer matches its schema says so at once.
  const pending = new Map();
  watch(dir, { recursive: true }, (_, f) => {
    if (!f || !f.endsWith(".json") || f.startsWith("node_modules") || f.startsWith(".naive") || f.startsWith("_private")) return;
    clearTimeout(pending.get(f));
    pending.set(f, setTimeout(async () => {
      pending.delete(f);
      if (!existsSync(join(dir, f))) return;
      const schema = await schemaFor(f);
      if (!schema) return;
      const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", schema.replace(/^schema\//, ""), "--file", join(dir, f)], { encoding: "utf8" });
      const out = (v.stdout + v.stderr).trim();
      if (v.status === 0) console.log(`  ✓ ${f}`);
      else if (/needs jsonschema/.test(out)) console.log(`  - ${f} changed (install python3's jsonschema package to check it as you save)`);
      else console.log(`  ✗ ${f} does not match ${schema}\n${out.split("\n").map((l) => `      ${l}`).join("\n")}`);
    }, 150));
  });
}

// The checks that read a workspace, run on the folder that holds this venture.
const CHECKS = ["check-ventures", "check-people", "check-provenance", "check-sources", "check-data-packages", "check-governance", "check-telos", "check-publication", "check-private", "check-where-used"];
function check(dir) {
  const { workspace } = asRouted(dir);
  let failed = 0;
  for (const c of CHECKS) {
    const r = spawnSync("node", [join(repo, `schema/${c}.mjs`), workspace], { encoding: "utf8" });
    const last = (r.stdout + r.stderr).trim().split("\n").filter(Boolean).at(-1) ?? "";
    if (r.status !== 0) failed++;
    console.log(`${r.status === 0 ? "pass" : "FAIL"}  ${c.replace("check-", "")}: ${last}`);
    if (r.status !== 0) console.log((r.stdout + r.stderr).trim().split("\n").slice(0, 12).map((l) => `      ${l}`).join("\n"));
  }
  console.log(failed ? `\n${failed} failing` : "\nall passing");
  return failed ? 1 : 0;
}

function info(dir) {
  const v = dir && JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
  // Supported agents (I-6): the MCP clients Naive is tested with, and whether this venture is connected to each.
  const agents = [
    ["Claude Code", ".mcp.json", (j) => j?.mcpServers?.naive || j?.mcpServers?.mentura],
    ["Cursor", ".cursor/mcp.json", (j) => j?.mcpServers?.naive || j?.mcpServers?.mentura],
  ];
  const read = (f) => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };
  const lines = [
    `Naive        ${version()} (${repo.replace(/\/$/, "")})`,
    `Node         ${process.version}`,
    `Platform     ${process.platform} ${process.arch}`,
    `python3      ${spawnSync("python3", ["-c", "import jsonschema; print('jsonschema ' + __import__('importlib.metadata').metadata.version('jsonschema'))"], { encoding: "utf8" }).stdout.trim() || "jsonschema missing (needed by schema checks)"}`,
    `Venture      ${v ? `${v.name ?? v.id} (${v.phase}) at ${dir}` : "none here"}`,
    "Agents       " + agents.map(([name, f, ok]) => `${name}: ${dir && ok(read(join(dir, f))) ? "connected" : "not connected"}`).join(", "),
  ];
  console.log(lines.join("\n"));
}

function upgradeFramework(dir) {
  const pkg = join(dir, "package.json");
  const deps = existsSync(pkg) ? { ...JSON.parse(readFileSync(pkg, "utf8")).devDependencies, ...JSON.parse(readFileSync(pkg, "utf8")).dependencies } : {};
  const name = Object.keys(deps).find((d) => d === "naive-framework");
  if (!name) { console.error("this venture does not install the framework from its package.json, so there is nothing to update; upgrading its layout only"); return 0; }
  const pm = existsSync(join(dir, "pnpm-lock.yaml")) ? "pnpm" : existsSync(join(dir, "yarn.lock")) ? "yarn" : existsSync(join(dir, "bun.lockb")) || existsSync(join(dir, "bun.lock")) ? "bun" : "npm";
  const spec = deps[name].startsWith("file:") || deps[name].startsWith("github:") ? deps[name] : `${name}@latest`;
  const args = pm === "npm" ? ["install", "--save-dev", spec] : pm === "yarn" ? ["add", "--dev", spec] : ["add", "-D", spec];
  console.log(`updating the framework: ${pm} ${args.join(" ")}`);
  return spawnSync(pm, args, { cwd: dir, stdio: "inherit" }).status ?? 1;
}

if (cmd === "dev") await dev(here());
else if (cmd === "check") process.exit(check(here()));
else if (cmd === "mcp") {
  // The MCP server, on the venture this runs in: `claude mcp add naive -- npx naive mcp`.
  const env = { ...process.env };
  if (!env.MENTURA_WORKSPACE) env.MENTURA_WORKSPACE = asRouted(here()).workspace;
  process.exit(spawnSync("node", [join(repo, "interface/mcp/server.mjs")], { stdio: "inherit", env }).status ?? 1);
}
else if (cmd === "info") info(findVenture() ?? (opt("venture") && existsSync(join(resolve(opt("venture")), "venture.json")) ? resolve(opt("venture")) : null));
else if (cmd === "build" || cmd === "start") {
  // The release itself is written and served by schema/build-release.mjs and schema/start-release.mjs.
  const script = `schema/${cmd}-release.mjs`;
  if (!existsSync(join(repo, script))) { console.error(`naive ${cmd} runs ${script}, which this version of Naive does not have yet`); process.exit(1); }
  process.exit(run(script, [here(), ...rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture")]));
} else if (cmd === "upgrade") {
  // Outside a venture with none named, upgrade-venture.mjs prints its usage.
  const dir = rest[0] && !rest[0].startsWith("--") ? resolve(rest[0]) : (opt("venture") ? here() : findVenture());
  if (dir && rest.includes("--framework") && upgradeFramework(dir) !== 0) process.exit(1);
  process.exit(run("schema/upgrade-venture.mjs", dir ? [dir] : []));
} else if (cmd === "port" || cmd === "migrate") {
  // Inside a venture, --venture defaults to it.
  const args = rest.includes("--venture") ? rest : [...rest, "--venture", here()];
  process.exit(run(`schema/${cmd}-venture.mjs`, args));
} else if (cmd === "typegen") {
  const { TOOLS } = await import("../mcp/server.mjs");
  const { routes } = await import("../router.mjs");
  const out = join(repo, ".naive/types");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "tools.json"), JSON.stringify(TOOLS, null, 2) + "\n");
  writeFileSync(join(out, "routes.json"), JSON.stringify(routes().map((r) => ({ route: r.route, actions: r.actions, kind: r.kind })), null, 2) + "\n");
  console.log(`wrote ${out}`);
} else {
  console.error(readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//   ")).map((l) => l.slice(5)).join("\n"));
  process.exit(cmd ? 1 : 2);
}
