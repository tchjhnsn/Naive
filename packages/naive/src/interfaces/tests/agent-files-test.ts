// Tests the agent filesystem (packages/naive/src/router/agent-files.ts, EE-122) on a made-up venture in a temp
// directory: ls shows folders and record files, read numbers lines, glob and grep find only records that exist,
// write goes through the schema, edit replaces once or all, an agent's write that settles a decision comes back as
// a draft, and with traces on each operation is a tool span with the router's call span under it.
//
//   node packages/naive/src/interfaces/tests/agent-files-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { edit, glob, grep, ls, read, readRaw, write } from "../../router/agent-files.ts";
import { sessions, spans } from "../../core/instrumentation.mjs";

const repo = fileURLToPath(new URL("../../../../..", import.meta.url));
let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => { console.log(`${cond ? "pass" : "FAIL"}  ${name}${cond || !detail ? "" : `: ${detail}`}`); if (!cond) failed++; };

const ws = mkdtempSync(join(tmpdir(), "agent-files-"));
const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.mjs"), join(ws, "kettle"), "kettle", "--layers", "purpose"], { encoding: "utf8" });
if (init.status !== 0) throw new Error(init.stderr);
process.env.MENTURA_WORKSPACE = ws;
delete process.env.NAIVE_TRACES; delete process.env.MENTURA_TRACE_ID; delete process.env.MENTURA_SPAN_ID; delete process.env.MENTURA_SESSION;
const dir = join(ws, "kettle");
const ctx = { venture: "kettle", workspace: ws };

// ls: folders end in a slash; a file says whether it holds a record.
const top = await ls(ctx, "/");
ok("ls / lists folders", top.some((f) => f.path === "/decisions/" && f.is_dir) && top.some((f) => f.path === "/foundation/" && f.is_dir));
const foundation = await ls(ctx, "/foundation");
ok("ls /foundation lists record files and whether each exists", foundation.some((f) => f.path === "/foundation/core" && !f.is_dir && f.exists === true) && foundation.some((f) => f.path === "/foundation/problem" && f.exists === false));
const decisions = await ls(ctx, "/decisions");
ok("ls of a collection lists its items", decisions.some((f) => f.path === "/decisions/venture.team" && !f.is_dir));

// read: numbered lines; a missing record is an error, not an empty file.
const team = await read(ctx, "/decisions/venture.team");
ok("read numbers lines like cat -n", /^\s+1\t\{/.test(team) && team.includes('"status": "open"'));
ok("read with offset and limit returns that window", (await read(ctx, "/decisions/venture.team", 1, 2)).split("\n").length === 2 && (await read(ctx, "/decisions/venture.team", 1, 2)).startsWith("     2\t"));
ok("reading a record that does not exist is an error", (await read(ctx, "/foundation/problem")).startsWith("Error:"));

// glob and grep see only records that exist.
const all = await glob(ctx, "**");
ok("glob ** finds the records that exist, and no empty routes", all.some((f) => f.path === "/decisions/venture.team") && !all.some((f) => f.path === "/foundation/problem"));
ok("glob within a folder", (await glob(ctx, "governance/pillar/*")).length === 3);
const hits = await grep(ctx, "founding-team", "/decisions");
ok("grep finds the line in the record", Array.isArray(hits) && hits.some((h) => h.path === "/decisions/venture.team" && h.line === 2));
ok("grep refuses a bad regular expression", typeof (await grep(ctx, "(")) === "string");

// write: through the schema; a record is JSON.
const base = JSON.parse((await readRaw(ctx, "/decisions/venture.team")).content ?? "{}") as Record<string, unknown>;
const pricing = { ...base, id: "pricing", question: "What do we charge for the first kettle?", options: ["Free beta", "Paid from day one"], status: "open" };
delete (pricing as Record<string, unknown>).decides; delete (pricing as Record<string, unknown>).unlocks;
const w = await write(ctx, "/decisions/pricing", JSON.stringify(pricing, null, 2));
ok("write creates a record through the router", w.ok && existsSync(join(dir, "decisions/pricing.decision.json")), w.error ?? "");
ok("write refuses text that is not JSON", !(await write(ctx, "/decisions/pricing", "free beta")).ok);
const bad = await write(ctx, "/foundation/problem", JSON.stringify({ nope: 1 }));
ok("write refuses a record that does not match its schema", !bad.ok && /does not match/.test(bad.error ?? ""));

// edit: once, or all; ambiguity and absence are refused.
const once = await edit(ctx, "/decisions/pricing", "What do we charge for the first kettle?", "What do we charge for the first kettle, and when?");
ok("edit replaces the text and writes it back", once.ok && once.occurrences === 1 && readFileSync(join(dir, "decisions/pricing.decision.json"), "utf8").includes("and when?"), once.error ?? "");
ok("edit refuses text the record does not contain", !(await edit(ctx, "/decisions/pricing", "no such text", "x")).ok);
const quoted = await edit(ctx, "/decisions/pricing", '"', "'");
ok("edit refuses text found more than once unless asked to replace all", !quoted.ok && (quoted.occurrences ?? 0) > 1);

// An agent cannot settle a decision: the write comes back as a draft for a person.
const settle = await edit(ctx, "/decisions/pricing", '"status": "open"', '"status": "decided"');
ok("an agent's edit that decides a decision is a draft", settle.ok && settle.draft === true && JSON.parse(readFileSync(join(dir, "decisions/pricing.decision.json"), "utf8")).status === "open", settle.error ?? JSON.stringify(settle));

// With traces on, each operation is a tool span with the router's call span under it.
writeFileSync(join(dir, "naive.config.json"), JSON.stringify({ traces: true }));
await read(ctx, "/decisions/pricing");
const list = sessions(dir).flatMap((s: string) => spans(dir, s)) as { kind: string, name: string, span_id: string, parent_span_id?: string }[];
const tool = list.find((s) => s.kind === "tool" && s.name === "execute_tool naive_read");
ok("a read is a tool span", !!tool);
ok("the router's call span is under the tool span", list.some((s) => s.kind === "call" && s.parent_span_id === tool?.span_id));
const check = spawnSync("node", [join(repo, "packages/naive/src/checks/check-traces.ts"), dir], { encoding: "utf8" });
ok("check-traces passes the venture", check.status === 0, check.stderr);

if (failed) { console.error(`${failed} failed`); process.exit(1); }
console.log("agent files: all passing");
