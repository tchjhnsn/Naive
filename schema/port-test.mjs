#!/usr/bin/env node
// Tests for naive port (EE-076, a move since 2026-10-29) on made-up folders: the plan moves nothing
// and says what would break (worktrees, links into the folder, processes inside it); applying needs
// the confirmation, moves each folder whole with every byte and git history unchanged, names it in
// sources.json and provenance, never overwrites, and refuses a folder that changed since the plan.

import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, symlinkSync, writeFileSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { entries } from "../interface/provenance.mjs";
import { ventureFile } from "./venture-paths.mjs";

const repo = new URL("..", import.meta.url).pathname;
let failed = 0;
const expect = (name, ok, detail = "") => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const naive = (...a) => spawnSync("node", [join(repo, "interface/cli/naive.mjs"), ...a], { encoding: "utf8" });
const git = (d, ...a) => spawnSync("git", ["-C", d, ...a], { encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } });
// Every file under a folder with its bytes' hash and mode, .git included, so a move can be compared.
const tree = (d, r = "") => readdirSync(join(d, r), { withFileTypes: true }).flatMap((e) => e.isDirectory() ? tree(d, join(r, e.name))
  : e.isSymbolicLink() ? [`${join(r, e.name)} link`] : [`${join(r, e.name)} ${createHash("sha256").update(readFileSync(join(d, r, e.name))).digest("hex")} ${statSync(join(d, r, e.name)).mode}`]).sort();

const ws = realpathSync(mkdtempSync(join(tmpdir(), "port-test-")));
// A git repository with a worktree and uncommitted work, a plain folder, and a link into the repository.
const app = join(ws, "code", "app");
mkdirSync(join(app, "src"), { recursive: true });
writeFileSync(join(app, "README.md"), "# App\n");
writeFileSync(join(app, "src/index.js"), "console.log(1)\n");
writeFileSync(join(app, ".env"), "NOT_A_REAL_KEY=1\n");
git(app, "init", "-q", "-b", "main"); git(app, "add", "README.md", "src"); git(app, "commit", "-qm", "first");
writeFileSync(join(app, "README.md"), "# App, edited\n");
git(app, "worktree", "add", "-q", "-b", "side", join(ws, "worktrees", "app-side"));
symlinkSync(join(app, "src"), join(ws, "code", "app-src"));
const notes = join(ws, "notes");
mkdirSync(join(notes, "research"), { recursive: true });
writeFileSync(join(notes, "research/interview.md"), "Ana spends Mondays on the phone.\n");
const before = { app: tree(app), notes: tree(notes), head: git(app, "rev-parse", "HEAD").stdout };

const dir = join(ws, "naive", "ventures", "clinic");
const init = spawnSync("node", [join(repo, "schema/init-venture.mjs"), dir, "clinic"], { encoding: "utf8" });
expect("a new venture is created to port into", init.status === 0, init.stderr);

const p1 = naive("port", app, "--venture", dir, "--links", join(ws, "code"));
const p2 = naive("port", notes, "--venture", dir);
expect("port writes a plan", p1.status === 0 && p2.status === 0 && existsSync(ventureFile(dir, ".release/port-plan.json")), p1.stderr + p2.stderr);
const planned = JSON.parse(readFileSync(ventureFile(dir, ".release/port-plan.json"), "utf8"));
const item = (f) => planned.items.find((i) => i.from === f);
expect("one run per folder adds to one plan", planned.items.length === 2 && item(app)?.action === "move" && item(notes)?.action === "move");
expect("a folder goes to the venture's codebase/ under its own name", item(app).to === join(dir, "codebase", "app") && item(notes).to === join(dir, "codebase", "notes"));
expect("writing the plan moves nothing", existsSync(app) && existsSync(notes) && !existsSync(join(dir, "codebase")));
expect("the plan names the repository's worktree", item(app).git?.worktrees.some((w) => w.endsWith("app-side")) && /worktree repair/.test(item(app).warnings.join(" ")));
expect("the plan says uncommitted work moves with it", /2 uncommitted changes/.test(item(app).warnings.join(" ")));
expect("the plan names a link into the folder that would break", item(app).links.some((l) => l.link === join(ws, "code", "app-src")));
expect("the plan opens no file: nothing of what is inside is in it", !/NOT_A_REAL_KEY|Mondays/.test(JSON.stringify(planned)));
const again = naive("port", app, "--venture", dir);
expect("planning a folder twice replaces its item", JSON.parse(readFileSync(ventureFile(dir, ".release/port-plan.json"), "utf8")).items.length === 2, again.stderr);

// A process working inside the folder refuses the apply.
const sleeper = spawn("sleep", ["30"], { cwd: notes });
await new Promise((r) => setTimeout(r, 300));
const held = naive("port", "--venture", dir, "--apply", "--confirm", "port");
sleeper.kill();
await new Promise((r) => sleeper.on("exit", r));
expect("a process inside a folder refuses the apply, and nothing moves", held.status !== 0 && /working inside/.test(held.stderr) && existsSync(app) && existsSync(notes), held.stderr);

const unconfirmed = naive("port", "--venture", dir, "--apply");
expect("applying needs the founder to type the confirmation", unconfirmed.status !== 0 && existsSync(app));

const a = naive("port", "--venture", dir, "--apply", "--confirm", "port");
expect("the plan is carried out", a.status === 0, a.stderr);
expect("each folder is gone from where it was", !existsSync(app) && !existsSync(notes));
expect("every file arrives byte for byte, .git and uncommitted work included", JSON.stringify(tree(join(dir, "codebase/app"))) === JSON.stringify(before.app) && JSON.stringify(tree(join(dir, "codebase/notes"))) === JSON.stringify(before.notes));
expect("the repository's history is unchanged", git(join(dir, "codebase/app"), "rev-parse", "HEAD").stdout === before.head);
const sources = JSON.parse(readFileSync(ventureFile(dir, "knowledge/sources.json"), "utf8"));
expect("each folder is a read-only filesystem source, by its path in the venture", ["app", "notes"].every((id) => sources.sources.some((s) => s.id === id && s.connector === "filesystem" && s.writes === "none" && s.root === `codebase/${id}` && /source of truth/.test(s.note))));
const log = entries(dir).filter((e) => e.activity === "port");
expect("every move is in provenance with the path it came from", log.some((e) => e.entity === "codebase/app" && e.derived_from?.[0] === `file://${app}`) && log.some((e) => e.entity === "codebase/notes"));
expect("apply says how to repair the worktree", /worktree repair/.test(a.stdout));
const tr = JSON.parse(readFileSync(ventureFile(dir, ".release/port-trace.json"), "utf8"));
expect("the run leaves a trace with a child per folder", tr.name === "naive port apply" && tr.children.length === 2 && !/NOT_A_REAL_KEY/.test(JSON.stringify(tr)));
const chk = spawnSync("node", [join(repo, "schema/check-sources.mjs"), dir], { encoding: "utf8" });
expect("the source map it writes passes the sources check", chk.status === 0, chk.stdout + chk.stderr);

const twice = naive("port", "--venture", dir, "--apply", "--confirm", "port");
expect("applying twice moves nothing more", twice.status === 0 && /moved 0 folders/.test(twice.stdout), twice.stderr);

// A folder whose destination already exists stays where it is.
const other = join(ws, "other", "notes");
mkdirSync(other, { recursive: true });
const clash = naive("port", other, "--venture", dir);
const cp = JSON.parse(readFileSync(ventureFile(dir, ".release/port-plan.json"), "utf8")).items.find((i) => i.from === other);
expect("a port never overwrites: the item is left, with the reason", clash.status === 0 && cp?.action === "leave" && /never overwrites/.test(cp.reason));

// A folder replaced by another of the same name after the plan is refused.
const swap = join(ws, "swap");
mkdirSync(swap);
naive("port", swap, "--venture", dir);
renameSync(swap, join(ws, "swap-old")); mkdirSync(swap);
const stale = naive("port", "--venture", dir, "--apply", "--confirm", "port");
expect("a folder that is not the one planned is refused", stale.status !== 0 && /not the folder the plan was written for/.test(stale.stderr) && existsSync(swap));

const insideV = join(ws, "host");
const inner = spawnSync("node", [join(repo, "schema/init-venture.mjs"), join(insideV, "v"), "v"], { encoding: "utf8" });
const ins = naive("port", insideV, "--venture", join(insideV, "v"));
expect("a venture inside the folder it ports is refused", inner.status === 0 && ins.status !== 0);

const up = naive("upgrade");
expect("naive upgrade runs the layout upgrade (and asks for a venture)", up.status === 2 && /upgrade-venture/.test(up.stderr));

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
