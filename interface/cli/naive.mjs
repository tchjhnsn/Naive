#!/usr/bin/env node
// The framework CLI (EE-072), the way `next` is Next.js's: run it inside a venture and it finds the
// venture.json in the current directory or its parents. mentura stays for platform commands and as an
// alias, so `mentura typegen` and `mentura upgrade` run these same commands.
//
//   naive dev [--port 4331]                         the setup page at /setup and the board, live: edit a record and it updates; each saved
//                                                   record is checked against its schema as you go (I-17, I-24)
//   naive build                                     check every package and write a release (I-17)
//   naive start                                     serve the latest release read-only (I-17)
//   naive check                                     run every check that applies to the venture (I-9)
//   naive info                                      versions, the venture, and which agents are connected (I-6)
//   naive mcp                                       serve the venture to an agent over MCP (stdio)
//   naive types                                     the venture types, each with its roles, packages and first decisions (EE-082)
//   naive setup [state|artifact|answer|point|confirm]  set the venture up: the state, an artifact of it, and
//                                                   confirming the answers the model relayed (EE-083)
//   naive frame "<the founder's words>"             match the words to a frame in the decision library, judge its
//                                                   premises against the venture and propose its decisions, open
//   naive roadmap [list | install <id>]             a decision roadmap: propose each step's frame decisions, open, in order
//   naive typegen                                   write .naive/types/ from the route table and the MCP tools
//   naive upgrade [<venture dir>] [--framework]     move a venture onto the next Naive layout; --framework first
//   naive upgrade --layout structured [--check]   move a flat venture onto the structured layout: k-base/, meta/ (EE-086)
//                                                   updates the installed framework with the venture's package manager (I-29)
//   naive phase [<next phase>] [--meet <criterion> --evidence <text>] [--reason] [--override <why>]
//                                                   the venture development lifecycle: where the venture is, its gate's exit
//                                                   criteria, and moving to the next phase once a person has met them
//   naive publish build <channel> | naive publish <channel> --by <person> [--as <role>] [--door] [--exposure] | naive publish rollback <channel> | naive publish status
//                                                   compile public MDX into an artifact, then publish it through the one-way/two-way door gate
//   naive port <folder> --venture <dir> [--to <path>]  plan moving a folder into the venture as it is (codebase/<name>)
//   naive port --venture <dir> --apply --confirm port
//                                                   carry out that plan (EE-076)
//   naive migrate --from <project> --venture <dir>  an agent rewrites the project as Naive records, as a plan and decisions
//   naive migrate --venture <dir> --apply           write what a person decided (EE-076)
//   naive publish check <paths>... [--json]         the publish lint: copy distance, leaks, brand, claims, marks,
//                                                   personal data, secrets; rules off|warn|error in naive.config.json
//   naive publish check --report                    the rules most often waived and leaks found after publish
//   naive capture "<text>"                          keep the text in the workspace's raw/, and file each chunk in the
//                                                   venture it fits, or in the workspace inbox when unsure
//   naive inbox [list | assign <chunk> <venture>]   the chunks waiting for the founder, and choosing their venture
//   naive read <venture> <path>                     read another venture's published artifact, if the workspace allows
//   naive framework list | new <id> | check [<id>] | publish <id> --dry-run
//                                                   the founder's own frameworks and playbooks in the workspace's frameworks/,
//                                                   beside the built-in ones; publishing only packs a bundle for now
//   naive diagnose [--since <iso>] [--dir <transcripts>] [--all]  find frameworks, playbooks, ideas and decisions in the founder's own
//                                                   words in agent transcripts (redacted first) and draft them as a raw source;
//                                                   --if-due runs it only past naive.config.json diagnose.threshold
//   naive activity [--from <date>] [--to <date>] [--write]  time spent in each venture per day from transcript timestamps:
//                                                   sessions, active minutes, messages, tokens in; --write keeps
//                                                   operations/activity/<date>.json and the streak (internal)
//   naive workspace init [<dir>] [--name <name>] (--venture <name> | --port <folder> | --migrate <project>)
//                                                   a workspace with its clock, its calendar and its first venture
//   naive workspace rename <name>                   rename the workspace this runs in (logged in its meta/provenance.jsonl)
//   naive calendar [list [--from <date>] [--to <date>] | add --title <t> --start <local time> | export --ics <file>]
//                                                   the workspace calendar: stored events and those derived from dated records
//   naive beta status|feedback <capability>|unlock  the plugin beta: which capabilities are open, the checkpoint feedback
//                                                   that unlocks the next, and unlocking it (beta.enabled in naive.config.json)
//   naive bugs [--all]                              open P0 and P1 bugs; stable means none
//   naive lint premises [<route>] [--drafts] [--json] [--propose]
//                                                   attack the premises of the venture's goals, requirements, exit criteria,
//                                                   constraints and decisions; --propose writes findings as open decisions
//
// --venture <dir> names the venture when you are not inside it.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, watch, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { basename, join, relative, resolve } from "node:path";
import { asRouted, findVenture } from "./find-venture.mjs";
import { logical } from "../../schema/venture-paths.mjs";
import { ventureFile } from "../../schema/venture-paths.mjs";
import { checkWorkspace, ensureWorkspace, findWorkspace } from "../../schema/workspace.mjs";

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
const free = (p) => new Promise((ok) => { const s = createServer().once("error", () => ok(free(p + 1))).once("listening", () => { const bound = /** @type {import("node:net").AddressInfo} */ (s.address()).port; s.close(() => ok(bound)); }).listen(p, "127.0.0.1"); });

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
  // One origin: /setup is the setup page (interface/dev/setup.mjs); everything else is the board, served
  // on a port of its own and passed through.
  const { serve } = await import("../demo/board.mjs");
  const { handle } = await import("../dev/setup.mjs");
  const boardPort = await free(0);
  serve(boardPort, venture);
  const { createServer: http, request } = await import("node:http");
  http(async (req, res) => {
    if (await handle(req, res, dir)) return;
    const up = request({ host: "127.0.0.1", port: boardPort, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
    up.on("error", (e) => { res.writeHead(502); res.end(String(e.message)); });
    req.pipe(up);
  }).listen(port, "127.0.0.1");
  const name = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")).name ?? venture;
  console.log(`\n  ▲ Naive ${version()}\n  - Venture:  ${name} (${relative(process.cwd(), dir) || "."})\n  - Setup:    http://127.0.0.1:${port}/setup\n  - Board:    http://127.0.0.1:${port}/\n  - Map:      http://127.0.0.1:${port}/map\n\n  Watching for changes. Each saved record is checked against its schema. Ctrl-C to stop.\n`);
  // Live feedback on save (I-24): a record that no longer matches its schema says so at once.
  const pending = new Map();
  watch(dir, { recursive: true }, (_, raw) => {
    if (!raw || !raw.endsWith(".json") || raw.startsWith("node_modules") || raw.startsWith(".naive")) return;
    // The record's logical path (schema/venture-paths.mjs): knowledge/foundation/icp.json is foundation/icp.json.
    const physicalPath = raw, f = logical(dir, raw);
    if (f.startsWith("_private")) return;
    clearTimeout(pending.get(f));
    pending.set(f, setTimeout(async () => {
      pending.delete(f);
      if (!existsSync(ventureFile(dir, physicalPath))) return;
      const schema = await schemaFor(f);
      if (!schema) return;
      const v = spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", schema.replace(/^schema\//, ""), "--file", ventureFile(dir, physicalPath)], { encoding: "utf8" });
      const out = (v.stdout + v.stderr).trim();
      if (v.status === 0) console.log(`  ✓ ${f}`);
      else if (/needs jsonschema/.test(out)) console.log(`  - ${f} changed (install python3's jsonschema package to check it as you save)`);
      else console.log(`  ✗ ${f} does not match ${schema}\n${out.split("\n").map((l) => `      ${l}`).join("\n")}`);
    }, 150));
  });
}

// The checks that read a workspace, run on this venture: it and the ventures nested in it, not its neighbours.
const CHECKS = ["check-ventures", "check-people", "check-provenance", "check-sources", "check-data-packages", "check-governance", "check-telos", "check-publication", "check-private", "check-where-used", "lint-validation", "lint-finance", "lint-legal", "lint-people", "lint-foundation"];
function check(dir) {
  let failed = 0;
  for (const c of CHECKS) {
    const r = spawnSync("node", [join(repo, `schema/${c}.mjs`), dir], { encoding: "utf8" });
    const last = (r.stdout + r.stderr).trim().split("\n").filter(Boolean).at(-1) ?? "";
    if (r.status !== 0) failed++;
    console.log(`${r.status === 0 ? "pass" : "FAIL"}  ${c.replace("check-", "")}: ${last}`);
    if (r.status !== 0) console.log((r.stdout + r.stderr).trim().split("\n").slice(0, 12).map((l) => `      ${l}`).join("\n"));
  }
  // The workspace the venture sits in: its naive-workspace.json matches the schema.
  const ws = findWorkspace(dir);
  if (ws) { const e = checkWorkspace(ws); if (e) failed++; console.log(`${e ? "FAIL" : "pass"}  workspace: ${e ? e.split("\n")[0] : "naive-workspace.json matches its schema"}`); }
  console.log(failed ? `\n${failed} failing` : "\nall passing");
  return failed ? 1 : 0;
}

function info(dir) {
  const v = dir && JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
  // Supported agents (I-6): the MCP clients Naive is tested with, and whether this venture is connected to each.
  /** @type {[string, string, (j: *) => *][]} */
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
    "Agents       " + agents.map(([name, f, ok]) => `${name}: ${dir && ok(read(ventureFile(dir, f))) ? "connected" : "not connected"}`).join(", "),
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
else if (cmd === "types") {
  // What create-venture can make, for an agent to offer the founder: each type with its roles, by name.
  const { roles, types } = await import("../../schema/venture-type.mjs");
  const R = new Map(roles().map((r) => [r.id, r.name]));
  console.log(JSON.stringify(types().map((t) => ({ id: t.id, label: t.label, description: t.description, examples: t.examples, roles: t.roles.map((r) => ({ id: r, name: R.get(r) })), default_role: t.default_role, first_decisions: t.decisions })), null, 2));
}
else if (cmd === "mcp") {
  // The MCP server, on the venture this runs in: `claude mcp add naive -- npx naive mcp`. Outside a
  // venture (a plugin starts it in every project), the current folder is the workspace, so a venture
  // created here is found at once.
  const env = { ...process.env };
  const at = opt("venture") ? here() : findVenture();
  if (!env.MENTURA_WORKSPACE) env.MENTURA_WORKSPACE = at ? asRouted(at).workspace : process.cwd();
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
  // --layout structured (EE-086): move a flat venture onto the structured layout. No logical path changes,
  // so routes, citations and the provenance log read the same; --check says what would move.
  if (dir && opt("layout") === "structured") {
    const { apply } = await import("../../schema/migrations/structured-layout.mjs");
    const dry = rest.includes("--check"), notes = [], escalated = [];
    apply(dir, { dry, note: (m) => notes.push(m), escalate: (m) => escalated.push(m) });
    if (!notes.length) console.log("this venture is already on the structured layout");
    for (const n of notes) console.log(`${dry ? "would: " : ""}${n}`);
    for (const e of escalated) console.log(`decide: ${e}`);
    if (!dry && notes.length) {
      const { agentFromEnv, record } = await import("../provenance.mjs");
      record(dir, { entity: "venture.json", activity: "write", agent: agentFromEnv("person", "cli"), note: "moved onto the structured layout (EE-086): k-base/ and meta/" });
    }
    process.exit(0);
  }
  // Flags (--check, --guide, --adopt, --canary, --agent, --accept, --confirm) pass through to upgrade-venture.mjs; --framework and --venture are handled here.
  const flags = rest.filter((a, i) => !(i === 0 && !a.startsWith("--")) && a !== "--framework" && a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run("schema/upgrade-venture.mjs", dir ? [dir, ...flags] : flags));
} else if (cmd === "frame") {
  // The decision library (schema/frames.mjs): naive frame "<the founder's words>" runs the frame those words fit.
  const sub = rest[0];
  if (["list", "match", "check", "eval"].includes(sub)) process.exit(run("schema/frames.mjs", rest));
  const words = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture" && a !== "--frame" && rest[i - 1] !== "--frame" && a !== "--lookup" && rest[i - 1] !== "--lookup").join(" ");
  process.exit(run("schema/frames.mjs", ["run", here(), ...(opt("frame") ? [opt("frame")] : []), ...(words ? ["--text", words] : []), ...(opt("lookup") ? ["--lookup", opt("lookup")] : [])]));
} else if (cmd === "roadmap") {
  // Decision roadmaps (schema/roadmaps.mjs): naive roadmap install <id> proposes each step's decisions, open.
  if (rest[0] === "install") process.exit(run("schema/roadmaps.mjs", ["install", here(), rest[1]]));
  process.exit(run("schema/roadmaps.mjs", ["list"]));
} else if (cmd === "phase") {
  // The venture development lifecycle (schema/lifecycle.mjs): where the venture is, its gate, and moving on.
  // naive phase | naive phase --meet <criterion> [--evidence <text>] | naive phase <next> [--reason] [--override]
  const target = rest.find((a, i) => !a.startsWith("--") && !["--venture", "--meet", "--evidence", "--reason", "--override", "--by"].includes(rest[i - 1]));
  const pass = ["evidence", "reason", "override", "by"].flatMap((k) => opt(k) !== undefined ? [`--${k}`, opt(k)] : []);
  process.exit(run("schema/lifecycle.mjs", [here(), ...(opt("meet") ? ["meet", opt("meet")] : target ? ["advance", target] : []), ...pass, ...(rest.includes("--json") ? ["--json"] : [])]));
} else if (cmd === "setup") {
  // Setup in the model's harness (EE-083): the state, the artifact, and the founder confirming relayed answers.
  process.exit(run("schema/setup.mjs", [here(), ...(rest.length ? rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture") : ["state"])]));
} else if (cmd === "publish") {
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  if (args[0] === "check") {
    // The publish lint (schema/publish-lint.mjs). Inside a venture, --venture defaults to it.
    const v = opt("venture") ?? findVenture();
    process.exit(run("schema/publish-lint.mjs", [...args, ...(v ? ["--venture", v] : [])]));
  }
  // The publishing gate (schema/publish.mjs): build, publish, rollback, status.
  const sub = ["build", "rollback", "status"].includes(args[0]) ? args.shift() : "publish";
  process.exit(run("schema/publish.mjs", [here(), sub, ...args]));
} else if (cmd === "port" || cmd === "migrate") {
  // Inside a venture, --venture defaults to it.
  const args = rest.includes("--venture") ? rest : [...rest, "--venture", here()];
  process.exit(run(`schema/${cmd}-venture.mjs`, args));
} else if (cmd === "capture" || cmd === "inbox" || cmd === "read") {
  // The workspace (schema/workspace.mjs): the one above the venture this runs in, else above this folder.
  const venture = opt("venture") ? here() : findVenture();
  const ws = findWorkspace(venture ?? process.cwd());
  if (!ws) { console.error("no naive-workspace.json here or above"); process.exit(1); }
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  // naive read names the venture this session is in as the one reading.
  const from = venture ? JSON.parse(readFileSync(join(venture, "venture.json"), "utf8")).id ?? basename(venture) : "";
  process.exit(run("schema/workspace.mjs", cmd === "read" ? ["read", ws, from, ...args] : [cmd, ws, ...args]));
} else if (cmd === "framework") {
  // A founder's own frameworks (schema/user-frameworks.mjs): the workspace above the venture, else above this folder.
  const from = opt("venture") ? here() : process.cwd();
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  const [sub = "list", ...more] = args;
  process.exit(run("schema/user-frameworks.mjs", [sub, ...more, from]));
} else if (cmd === "diagnose") {
  process.exit(run("scripts/diagnose-transcripts.mjs", rest));
} else if (cmd === "activity") {
  process.exit(run("schema/activity.mjs", rest));
} else if (cmd === "workspace") {
  // A workspace (schema/workspace-init.mjs): made with its clock, calendar and first venture; renamed in place.
  const [sub, ...args] = rest;
  if (sub === "init") process.exit(run("schema/workspace-init.mjs", args));
  if (sub === "rename") {
    const ws = findWorkspace(opt("workspace") ?? process.cwd());
    if (!ws) { console.error("no naive-workspace.json here or above"); process.exit(1); }
    process.exit(run("schema/workspace.mjs", ["rename", ws, ...args.filter((a, i) => a !== "--workspace" && args[i - 1] !== "--workspace")]));
  }
  console.error("naive workspace init [<dir>] [--name <name>] (--venture <name> | --port <folder> | --migrate <project>)\nnaive workspace rename <name>");
  process.exit(2);
} else if (cmd === "calendar") {
  const ws = findWorkspace(opt("workspace") ?? process.cwd());
  if (!ws) { console.error("no naive-workspace.json here or above"); process.exit(1); }
  // A workspace from before the calendar gets its clock and calendar the first time it asks for them.
  try { if (!existsSync(join(ws, "calendar/calendars"))) ensureWorkspace(ws); } catch (e) { console.error(e.message); process.exit(1); }
  const [sub = "list", ...args] = rest[0] && !rest[0].startsWith("--") ? rest : ["list", ...rest];
  process.exit(run("schema/calendar.mjs", [sub, ws, ...args.filter((a, i) => a !== "--workspace" && args[i - 1] !== "--workspace")]));
} else if (cmd === "beta" || cmd === "bugs") {
  // The plugin beta's gate (schema/beta-gate.mjs) and the bug summary (schema/bugs.mjs).
  const args = rest.filter((a, i) => a !== "--venture" && rest[i - 1] !== "--venture");
  process.exit(run(cmd === "beta" ? "schema/beta-gate.mjs" : "schema/bugs.mjs", [here(), ...(cmd === "beta" && !args.length ? ["status"] : args)]));
} else if (cmd === "lint") {
  const [what, ...args] = rest.filter((a, i) => !(a === "--venture" || rest[i - 1] === "--venture"));
  if (what !== "premises") { console.error("usage: naive lint premises [<route>] [--drafts] [--json] [--propose]"); process.exit(2); }
  process.exit(run("schema/premise-lint.mjs", [here(), ...args]));
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
