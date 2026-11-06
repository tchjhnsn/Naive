#!/usr/bin/env node
// naive workspace init (Torian, 2026-10-30): a workspace is initiated with its clock and calendar and
// always with a venture in it. The venture is created (--venture), or an existing folder is ported in
// as it is (--port), or an existing project is migrated in as records (--migrate). Without one of the
// three it refuses, except at a terminal, where it asks and offers "My first venture".
//
//   node packages/naive/src/engine/workspace-init.mjs [<dir>] [--name "<workspace name>"] [--time-zone <IANA zone>]
//        (--venture "<venture name>" | --port <folder> | --migrate <project>)
//        [--venture-name "<name>"] [--type <type>] [--role <role>] [--founder "<your name>"] [--layout flat]
//        [--apply --confirm port] [--skip-install] [--no-git]
//
// The workspace is named "Naive workspace" unless --name says otherwise (rename it later with naive
// workspace rename). <dir> defaults to a folder named after the workspace in the current directory.
// The venture is made by create-venture (packages/create-venture/index.mjs), so both ways in match; a
// port or migrate then plans the move or the rewrite into that venture (packages/naive/src/engine/port-venture.mjs,
// packages/naive/src/router/orchestration/migrate-venture.mjs). A port moves files only with --apply --confirm port. If the venture cannot be
// made, its half-made folder is removed and the workspace kept; the same command run again finishes it.
// A folder that was already there is left alone, and the message names it. What can be refused from the
// flags alone is refused before anything is written, so those mistakes leave nothing to finish.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { createInterface } from "node:readline/promises";
import { DEFAULT_NAME, WORKSPACE_FILE, ensureWorkspace, findWorkspace, loadWorkspace } from "./workspace.mjs";

const repo = new URL("../../../..", import.meta.url).pathname;
export const FIRST_VENTURE = "My first venture";
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const title = (s) => s.replace(/[-_]+/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const flag = (n) => argv.includes(`--${n}`);
const valued = new Set(["name", "time-zone", "venture", "port", "migrate", "venture-name", "type", "role", "founder", "layout", "confirm"]);
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && valued.has(argv[i - 1].slice(2))));
const fail = (m, code = 1) => { console.error(m); process.exit(code); };

const modes = ["venture", "port", "migrate"].filter((m) => opt(m) !== undefined);
if (modes.length > 1) fail(`choose one way to bring the first venture in: --venture, --port or --migrate (got ${modes.map((m) => `--${m}`).join(" and ")})`, 2);
let mode = modes[0];
let ventureName = mode === "venture" ? opt("venture") : opt("venture-name");
let wsName = opt("name");

const interactive = ((process.stdin.isTTY && process.stdout.isTTY) || process.env.CREATE_VENTURE_PROMPTS === "1") && !flag("yes");
if (!mode) {
  if (!interactive) fail("a workspace always has a venture: pass --venture \"<name>\" to create one, --port <folder> to move an existing folder in, or --migrate <project> to rewrite a project as records", 2);
  const piped = !process.stdin.isTTY ? readFileSync(0, "utf8").split("\n") : null;
  const rl = piped ? null : createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (q, d) => { const p = `? ${q} (${d}) `; const a = piped ? (process.stdout.write(p + "\n"), piped.shift() ?? "") : await rl.question(p); return a.trim() || d; };
  wsName ??= await ask("What is your workspace named?", DEFAULT_NAME);
  const how = await ask("Start with a new venture, port a folder in, or migrate a project in? new / port / migrate", "new");
  if (how === "port" || how === "migrate") { mode = how; argv.push(`--${how}`, await ask(`Which folder?`, ".")); }
  else { mode = "venture"; ventureName = await ask("What is your first venture named?", FIRST_VENTURE); }
  rl?.close();
}
const source = mode === "venture" ? null : resolve(opt(mode));
if (source && !existsSync(source)) fail(`no folder at ${source} to ${mode}`);
ventureName ??= mode === "venture" ? FIRST_VENTURE : title(basename(source));
wsName ??= DEFAULT_NAME;

const root = resolve(positional[0] ?? slug(wsName));
const vdir = join(root, slug(ventureName) || "venture");
if (mode === "port" && flag("apply") && opt("confirm") !== "port") fail("moving files needs --apply --confirm port", 2);
if (mode === "port" && (vdir === source || vdir.startsWith(source + sep))) fail(`the workspace would sit inside the folder it ports (${source}): run this from outside that folder, or pass a <dir> outside it`, 2);
// A workspace left without a venture by a failed init is finished by running init again; one that holds a venture is not re-initiated.
try {
  if (findWorkspace(root) === root && loadWorkspace(root).ws.ventures?.length) fail(`${root} is already a workspace (${WORKSPACE_FILE}); add a venture to it with create-venture, or rename it with naive workspace rename`);
} catch (e) { fail(e.message); }

// 1. The workspace, its clock and its calendar.
let w;
try { w = ensureWorkspace(root, { name: wsName, timeZone: opt("time-zone"), owner: slug(opt("founder") ?? "") || "founder" }); } catch (e) { fail(e.message, 2); }
console.log(`Created ${w.ws.name} at ${root}: clock in ${w.ws.timeZone}, calendar in calendar/ (calendars/default.json)`);

// 2. The venture, by create-venture, inside the workspace.
const pass = [["type"], ["role"], ["layout"], ["founder", "name"]].flatMap(([k, as]) => (opt(k) !== undefined ? [`--${as ?? k}`, opt(k)] : []));
const fresh = !existsSync(vdir);
const cv = spawnSync("node", [join(repo, "packages/create-venture/index.mjs"), vdir, "--venture-name", ventureName, "--yes", ...pass,
  ...(flag("skip-install") ? ["--skip-install"] : []), ...(flag("no-git") ? ["--no-git"] : [])], { encoding: "utf8", cwd: root, env: { ...process.env, CREATE_VENTURE_PROMPTS: "" } });
if (cv.status !== 0) {
  if (fresh) rmSync(vdir, { recursive: true, force: true });
  const next = fresh ? "Fix that and run the same naive workspace init again; it finishes this workspace."
    : `${vdir} was already there, so it was left alone. If a stopped run left it, remove it and run the same naive workspace init again; otherwise pick another venture name.`;
  fail(`the workspace is made, but its venture is not: ${(cv.stderr || cv.stdout).trim()}\n${next}`);
}
console.log(`Created the venture ${ventureName} at ${vdir}`);

// 3. Port or migrate into it.
const run = (script, args) => spawnSync("node", [join(repo, script), ...args], { stdio: "inherit", cwd: root }).status ?? 1;
if (mode === "port") {
  if (run("packages/naive/src/engine/port-venture.mjs", [source, "--venture", vdir]) !== 0) fail("the port plan failed; the workspace and venture are kept");
  if (flag("apply")) {
    if (run("packages/naive/src/engine/port-venture.mjs", ["--venture", vdir, "--apply", "--confirm", "port"]) !== 0) process.exit(1);
  } else console.log(`\nNothing moved yet. Review the plan, then: naive port --venture ${vdir} --apply --confirm port`);
} else if (mode === "migrate") {
  if (run("packages/naive/src/router/orchestration/migrate-venture.mjs", ["--from", source, "--venture", vdir]) !== 0) fail("the migration plan failed; the workspace and venture are kept");
  console.log(`\nDecide the proposed decisions, then: naive migrate --venture ${vdir} --apply`);
}
