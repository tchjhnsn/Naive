// naive workspace init, rename, the clock and the calendar (Torian, 2026-10-30): a workspace starts with
// its clock and calendar and always holds a venture, created, ported or migrated in.
//
//   node schema/workspace-init-test.mjs

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addEvent, events, fromICS, toICS } from "./calendar.mjs";
import { due, inDays, localDate, overdue, toInstant, zoneOf } from "./clock.mjs";
import { ventureFile } from "../packages/core/venture-paths.mjs";

const repo = new URL("..", import.meta.url).pathname;
const naive = join(repo, "interface/cli/naive.mjs");
const base = mkdtempSync(join(tmpdir(), "workspace-init-"));
const env = /** @type {NodeJS.ProcessEnv} */ ({ ...process.env, XDG_CONFIG_HOME: join(base, ".config"), MENTURA_AGENT_CMD: `node ${join(repo, "schema/examples/migrate/agent.mjs")}`, CREATE_VENTURE_PROMPTS: "" });
delete env.MENTURA_WORKSPACE;
const sh = (args, opts = {}) => spawnSync("node", [naive, ...args], { cwd: base, env, encoding: "utf8", ...opts });
const load = (f) => JSON.parse(readFileSync(f, "utf8"));
let failed = 0;
const t = async (name, fn) => { try { await fn(); console.log(`ok    ${name}`); } catch (e) { failed++; console.log(`FAIL  ${name}\n      ${e.message}`); } };
const ok = (c, m) => { if (!c) throw new Error(m ?? "assertion failed"); };
const FLAGS = ["--skip-install", "--no-git", "--layout", "flat"];
const validate = (schema, file) => spawnSync("python3", [join(repo, "schema/validate.py"), "--schema", schema, "--file", file], { encoding: "utf8" });

await t("init refuses without a venture to create, port or migrate", () => {
  const r = sh(["workspace", "init", "empty"]);
  ok(r.status === 2 && /always has a venture/.test(r.stderr), r.stderr);
  ok(!existsSync(join(base, "empty")), "nothing is written when it refuses");
  ok(sh(["workspace", "init", "two", "--venture", "A", "--port", base]).status === 2, "two ways in at once are refused");
});

await t("init --venture: Naive workspace by default, with its clock, calendar and venture", () => {
  const r = sh(["workspace", "init", "ws", "--venture", "Kettle", "--time-zone", "America/Chicago", ...FLAGS]);
  ok(r.status === 0, r.stderr + r.stdout);
  const ws = join(base, "ws");
  const w = load(join(ws, "naive-workspace.json"));
  ok(w.name === "Naive workspace" && w.timeZone === "America/Chicago" && w.ventures.join() === "kettle", JSON.stringify(w));
  ok(load(join(ws, "kettle/venture.json")).name === "Kettle");
  const cal = join(ws, "calendar/calendars/default.json");
  ok(existsSync(cal) && existsSync(join(ws, "calendar/events")), "the default calendar exists");
  ok(zoneOf(join(ws, "kettle")) === "America/Chicago", "a venture reads its workspace's zone");
  for (const [s, f] of [["workspace.schema.json", join(ws, "naive-workspace.json")], ["calendar.schema.json", cal]]) { const v = validate(s, f); ok(v.status === 0, v.stdout + v.stderr); }
  ok(sh(["workspace", "init", "ws", "--venture", "Again", ...FLAGS]).status !== 0, "an existing workspace is not initiated twice");
});

await t("a failed init is finished by running it again", () => {
  const r = sh(["workspace", "init", "half", "--venture", "Kettle", "--type", "no-such-type", ...FLAGS]);
  ok(r.status !== 0 && /run the same naive workspace init again/.test(r.stderr), r.stderr);
  ok(!existsSync(join(base, "half/kettle")), "the half-made venture folder is removed");
  const again = sh(["workspace", "init", "half", "--venture", "Kettle", ...FLAGS]);
  ok(again.status === 0, again.stderr + again.stdout);
  ok(load(join(base, "half/naive-workspace.json")).ventures.join() === "kettle", "the re-run lists the venture");
  ok(load(join(base, "half/kettle/venture.json")).name === "Kettle");
});

await t("interactive init with no flags: Naive workspace and My first venture", () => {
  const r = sh(["workspace", "init", "asked", ...FLAGS], { env: { ...env, CREATE_VENTURE_PROMPTS: "1" }, input: "\n\n\n" });
  ok(r.status === 0, r.stderr + r.stdout);
  const w = load(join(base, "asked/naive-workspace.json"));
  ok(w.name === "Naive workspace" && w.ventures.join() === "my-first-venture", JSON.stringify(w));
  ok(load(join(base, "asked/my-first-venture/venture.json")).name === "My first venture");
});

await t("init --port: the venture is named after the folder, and the move is planned", () => {
  const src = join(base, "old-app");
  mkdirSync(src);
  writeFileSync(join(src, "README.md"), "# Old app\n");
  const r = sh(["workspace", "init", "ported", "--name", "Studio", "--port", src, ...FLAGS]);
  ok(r.status === 0, r.stderr + r.stdout);
  const w = load(join(base, "ported/naive-workspace.json"));
  ok(w.name === "Studio" && w.ventures.join() === "old-app", JSON.stringify(w));
  ok(existsSync(ventureFile(join(base, "ported/old-app"), ".release/port-plan.json")) || existsSync(join(base, "ported/old-app/.release/port-plan.json")), "a port plan");
  ok(existsSync(join(src, "README.md")), "nothing moves without --apply --confirm port");
  const a = sh(["workspace", "init", "ported2", "--port", src, "--apply", "--confirm", "port", ...FLAGS]);
  ok(a.status === 0, a.stderr + a.stdout);
  ok(!existsSync(src) && readdirSync(join(base, "ported2/old-app")).length, "moved with --apply --confirm port");
});

await t("init --migrate: the project's rewrite is planned in the new venture", () => {
  const src = join(base, "kettle-src");
  mkdirSync(src);
  writeFileSync(join(src, "README.md"), "# Kettle\n\nA smart kettle for offices. Customers: office managers who run out of hot water.\n");
  const r = sh(["workspace", "init", "migrated", "--migrate", src, "--venture-name", "Kettle Co", ...FLAGS]);
  ok(r.status === 0, r.stderr + r.stdout);
  ok(load(join(base, "migrated/naive-workspace.json")).ventures.join() === "kettle-co");
  ok(existsSync(join(base, "migrated/kettle-co/.release/migrate-plan.json")) || existsSync(ventureFile(join(base, "migrated/kettle-co"), ".release/migrate-plan.json")), "a migrate plan");
});

await t("rename updates the workspace and logs who and when", () => {
  const r = sh(["workspace", "rename", "Torian's", "ventures"], { cwd: join(base, "ws/kettle") });
  ok(r.status === 0, r.stderr + r.stdout);
  ok(load(join(base, "ws/naive-workspace.json")).name === "Torian's ventures");
  const log = readFileSync(join(base, "ws/meta/provenance.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  ok(log.some((e) => e.action === "workspace-rename" && e.from === "Naive workspace" && e.to === "Torian's ventures"), JSON.stringify(log));
  ok(sh(["workspace", "rename", " "], { cwd: join(base, "ws") }).status !== 0, "an empty name is refused");
});

await t("the clock: local dates in the zone, inDays, due and overdue", () => {
  const at = new Date("2026-10-30T03:30:00Z");
  ok(localDate(at, "America/Chicago") === "2026-10-29" && localDate(at, "Europe/London") === "2026-10-30");
  ok(toInstant("2026-10-29T22:30:00", "America/Chicago").toISOString() === "2026-10-30T03:30:00.000Z");
  ok(inDays("2026-11-01", "America/Chicago", at) === 3 && inDays("2026-10-28", "America/Chicago", at) === -1);
  ok(due("2026-10-29", "America/Chicago", at) && !overdue("2026-10-29", "America/Chicago", at) && overdue("2026-10-28", "America/Chicago", at));
  ok(!due("2026-10-31", "America/Chicago", at));
});

await t("the calendar: stored events, and an open decision's due time derived, not copied", async () => {
  const ws = join(base, "ws");
  const e = addEvent(ws, { title: "Investor call", start: "2026-11-03T09:00", duration: "PT30M" });
  ok(validate("calendar-event.schema.json", join(ws, "calendar/events", `${e.uid}.json`)).status === 0, "the stored event matches its schema");
  const v = join(ws, "kettle");
  const dd = ventureFile(v, "decisions");
  mkdirSync(dd, { recursive: true });
  writeFileSync(join(dd, "launch-date.decision.json"), JSON.stringify({ id: "launch-date", question: "When do we launch?", layer: "purpose", status: "open", due: "2026-11-05T17:00:00Z" }, null, 2));
  const before = readdirSync(join(ws, "calendar/events")).length;
  const list = await events(ws, { from: "2026-11-01", to: "2026-11-30" });
  ok(list.some((x) => x.uid === e.uid), "the stored event is listed");
  const d = list.find((x) => x.derived?.from === "decision" && x.derived.id === "launch-date");
  ok(d && d.start === "2026-11-05T11:00:00" && d.timeZone === "America/Chicago", JSON.stringify(list));
  ok(readdirSync(join(ws, "calendar/events")).length === before, "derived events are not written");
  ok(!(await events(ws, { from: "2026-12-01", to: "2026-12-31" })).length, "the range filters");
  const cli = sh(["calendar", "list", "--from", "2026-11-01", "--to", "2026-11-30"], { cwd: ws });
  ok(cli.status === 0 && /Investor call/.test(cli.stdout) && /When do we launch/.test(cli.stdout), cli.stderr + cli.stdout);
});

await t("ics export round trip", async () => {
  const ws = join(base, "ws");
  const out = join(base, "ws.ics");
  const r = sh(["calendar", "export", "--ics", out, "--from", "2026-11-01", "--to", "2026-11-30"], { cwd: ws });
  ok(r.status === 0, r.stderr + r.stdout);
  const text = readFileSync(out, "utf8");
  ok(text.startsWith("BEGIN:VCALENDAR") && text.includes("TZID=America/Chicago"), text);
  const back = fromICS(text);
  const list = await events(ws, { from: "2026-11-01", to: "2026-11-30" });
  ok(back.length === list.length, `${back.length} vs ${list.length}`);
  for (const e of list) { const b = back.find((x) => x.uid === e.uid); ok(b && b.title === e.title && b.start === e.start && b.timeZone === e.timeZone && b.calendar === e.calendar, JSON.stringify([e, b])); }
  const tricky = [{ uid: "x", title: "Comma, semicolon; backslash \\ and a long title ".repeat(3), start: "2026-11-02T08:00:00", timeZone: "Europe/London", duration: "PT1H", calendar: "default" }];
  const rt = fromICS(toICS(tricky))[0];
  ok(rt.title === tricky[0].title && rt.duration === "PT1H", JSON.stringify(rt));
});

await t("create-venture's own workspace gets the same clock and calendar", () => {
  const dir = join(base, "cv");
  mkdirSync(dir);
  const r = spawnSync("node", [join(repo, "packages/create-venture/index.mjs"), "--yes", ...FLAGS], { cwd: dir, env, encoding: "utf8" });
  ok(r.status === 0, r.stderr + r.stdout);
  const w = load(join(dir, "naive-workspace.json"));
  ok(w.name === "Naive workspace" && w.timeZone && existsSync(join(dir, "calendar/calendars/default.json")), JSON.stringify(w));
});

const bad = '{"name":"Mine","ventures":["one","two"],';

await t("a workspace file that does not parse stops the command and stays as it was", () => {
  const dir = join(base, "corrupt");
  mkdirSync(dir);
  writeFileSync(join(dir, "naive-workspace.json"), bad);
  const cv = spawnSync("node", [join(repo, "packages/create-venture/index.mjs"), "three", "--yes", ...FLAGS], { cwd: dir, env, encoding: "utf8" });
  ok(cv.status === 1 && /naive-workspace\.json does not parse/.test(cv.stderr), cv.stderr + cv.stdout);
  ok(readFileSync(join(dir, "naive-workspace.json"), "utf8") === bad, "create-venture left the file untouched");
  ok(!existsSync(join(dir, "three")), "no venture folder is made");
  const init = sh(["workspace", "init", dir, "--venture", "Two", ...FLAGS]);
  ok(init.status === 1 && /does not parse/.test(init.stderr), init.stderr + init.stdout);
  ok(readFileSync(join(dir, "naive-workspace.json"), "utf8") === bad, "init left the file untouched");
  ok(sh(["capture", "a note"], { cwd: dir }).status === 1, "capture stops too");
  const nul = join(base, "corrupt-null");
  mkdirSync(nul);
  writeFileSync(join(nul, "naive-workspace.json"), "null");
  ok(sh(["workspace", "init", nul, "--venture", "Two", ...FLAGS]).status === 1, "valid JSON that is not an object stops too");
  ok(readFileSync(join(nul, "naive-workspace.json"), "utf8") === "null");
});

await t("another tool's workspace.json is left alone", () => {
  const dir = join(base, "nx");
  mkdirSync(dir);
  const nx = JSON.stringify({ version: 2, projects: {} });
  writeFileSync(join(dir, "workspace.json"), nx);
  const r = spawnSync("node", [join(repo, "packages/create-venture/index.mjs"), "app", "--yes", ...FLAGS], { cwd: dir, env, encoding: "utf8" });
  ok(r.status === 0, r.stderr + r.stdout);
  ok(readFileSync(join(dir, "workspace.json"), "utf8") === nx, "the other tool's file is untouched");
  ok(load(join(dir, "naive-workspace.json")).ventures.join() === "app", "ours is written beside it");
});

await t("mistakes the flags show are refused before anything is written", () => {
  const src = join(base, "src-a");
  mkdirSync(src);
  writeFileSync(join(src, "README.md"), "# A\n");
  const r = sh(["workspace", "init", "noconfirm", "--port", src, "--apply", ...FLAGS]);
  ok(r.status === 2 && /--apply --confirm port/.test(r.stderr), r.stderr);
  ok(!existsSync(join(base, "noconfirm")), "nothing is left to finish");
  const inside = sh(["workspace", "init", "--port", ".", ...FLAGS], { cwd: src });
  ok(inside.status === 2 && /inside the folder it ports/.test(inside.stderr), inside.stderr);
  ok(readdirSync(src).join() === "README.md", "the source folder is unchanged");
  const fixed = sh(["workspace", "init", "noconfirm", "--port", src, "--apply", "--confirm", "port", ...FLAGS]);
  ok(fixed.status === 0, fixed.stderr + fixed.stdout);
});

await t("a folder left by a stopped run is named, and kept", () => {
  const dir = join(base, "stopped/kettle");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "half.txt"), "x");
  const r = sh(["workspace", "init", "stopped", "--venture", "Kettle", ...FLAGS]);
  ok(r.status === 1 && r.stderr.includes(`${dir} was already there`) && /remove it/.test(r.stderr), r.stderr);
  ok(existsSync(join(dir, "half.txt")), "it may be the founder's folder");
});

await t("a workspace from before the calendar gets one when it asks", () => {
  const dir = join(base, "old");
  mkdirSync(dir);
  writeFileSync(join(dir, "naive-workspace.json"), JSON.stringify({ schema: "everything-ecosystem", schema_version: "0.5.0", ventures: [] }));
  const r = sh(["calendar", "list"], { cwd: dir });
  ok(r.status === 0, r.stderr + r.stdout);
  ok(existsSync(join(dir, "calendar/calendars/default.json")) && load(join(dir, "naive-workspace.json")).timeZone, "the calendar and clock are filled in");
});

await t("one bad date is skipped and named, and the rest of the calendar still shows", () => {
  const ws = join(base, "dates");
  ok(sh(["workspace", "init", ws, "--venture", "Kettle", "--time-zone", "America/Chicago", ...FLAGS]).status === 0);
  addEvent(ws, { title: "Good one", start: "2026-11-03T09:00", uid: "good" });
  const ev = (uid, o) => writeFileSync(join(ws, "calendar/events", `${uid}.json`), JSON.stringify({ "@type": "Event", uid, title: uid, duration: "PT1H", calendar: "default", ...o }));
  ev("soon", { start: "soon", timeZone: "America/Chicago" });
  ev("mars", { start: "2026-11-03T09:00:00", timeZone: "Mars/Olympus" });
  const dd = ventureFile(join(ws, "kettle"), "decisions");
  mkdirSync(dd, { recursive: true });
  writeFileSync(join(dd, "vague.decision.json"), JSON.stringify({ id: "vague", question: "Vague?", layer: "purpose", status: "open", due: "end of Q3" }));
  const r = sh(["calendar", "list", "--from", "2026-11-01", "--to", "2026-11-30"], { cwd: ws });
  ok(r.status === 0 && /Good one/.test(r.stdout), r.stderr + r.stdout);
  for (const name of ["soon.json", "mars.json", "vague"]) ok(r.stderr.includes(name), `${name} is named: ${r.stderr}`);
  ok(sh(["calendar", "export", "--ics", join(base, "d.ics"), "--from", "2026-11-01", "--to", "2026-11-30"], { cwd: ws }).status === 0, "export survives it too");
});

await t("from a packed npm install: naive workspace init makes the workspace and its venture", () => {
  const out = join(base, "pack");
  mkdirSync(out);
  const p = spawnSync("npm", ["pack", "--silent", "--pack-destination", out], { cwd: repo, encoding: "utf8" });
  ok(p.status === 0, p.stderr);
  const app = join(out, "app");
  mkdirSync(app);
  writeFileSync(join(app, "package.json"), "{}");
  const i = spawnSync("npm", ["install", "--offline", "--no-audit", "--no-fund", join(out, p.stdout.trim())], { cwd: app, encoding: "utf8" });
  ok(i.status === 0, i.stderr);
  const bin = join(app, "node_modules/.bin/naive");
  const r = spawnSync(bin, ["workspace", "init", "ws1", "--venture", "Kettle", ...FLAGS], { cwd: app, env, encoding: "utf8" });
  ok(r.status === 0, r.stderr + r.stdout);
  ok(load(join(app, "ws1/naive-workspace.json")).ventures.join() === "kettle" && existsSync(join(app, "ws1/kettle/venture.json")), "the venture is made and listed");
  ok(!existsSync(join(app, "node_modules/naive-framework/packages/create-venture/test.mjs")), "tests stay out of the package");
});

rmSync(base, { recursive: true, force: true });
if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log("all passed");
