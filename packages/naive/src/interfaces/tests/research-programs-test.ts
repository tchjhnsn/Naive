// Tests research programs (autoresearch design, everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md,
// "program.md per function", build plan item 11): programs/<function>.md is a person's. A person's write through the
// router lands live with provenance and its bytes in the blob store; every agent's write is refused before anything
// else, a <function>-researcher's included, through the router and the agent filesystem. Each function module ships
// a starter, which init (through add-department) and naive upgrade copy in only when the venture lists the function
// and the file is missing, so a founder's program is never touched. The research skill is listed. Every venture lives
// in a temporary workspace.
//
//   node packages/naive/src/interfaces/tests/research-programs-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { call, routes } from "../../router/router.mjs";
import { write as agentWrite } from "../../router/agent-files.ts";
import { entries } from "../../core/provenance.mjs";
import { blobHash, hasBlob } from "../../core/blobs.mjs";
import { readAsOf } from "../../store/as-of.mjs";
import { writerRule } from "../../engine/gate.mjs";
import { catalog } from "../../engine/departments.mjs";
import { functionsOf, seedPrograms, templateOf } from "../../engine/research-programs.mjs";
import { upgrade } from "../../engine/upgrades.mjs";
import { draft as draftProgram } from "../../engine/generators/research-program.ts";

const repo = new URL("../../../../../", import.meta.url).pathname;
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "research-programs-test-"));
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
for (const k of ["MENTURA_READS_AS_OF", "MENTURA_ACTOR_ID", "MENTURA_ACTOR", "MENTURA_MODEL"]) { delete process.env[k]; delete env[k]; }
const node = (script: string, ...a: string[]) => spawnSync(process.execPath, [join(repo, script), ...a], { encoding: "utf8", env });
const template = (fn: string) => readFileSync(join(repo, templateOf(fn)), "utf8");
const pause = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

interface Reply { ok: boolean, error?: string, gate_rule?: string, result?: unknown }
const ask = async (a: { route: string, action?: string, input?: unknown, actor?: string, actor_id?: string, reads_as_of?: string }): Promise<Reply> =>
  await call({ venture: "lab", workspace: ws, action: "read", ...a }) as Reply;
const result = (r: Reply) => (r.result ?? {}) as { written?: string, draft?: boolean, provenance?: string };

try {
  // Every function ships a starter with one section per pattern its packages own, or a short starter.
  const fns = catalog().map((d: { id: string }) => d.id);
  const missing = fns.filter((fn: string) => !existsSync(join(repo, templateOf(fn))));
  expect("each of the 13 functions ships templates/research-program.md", fns.length === 13 && missing.length === 0, missing.join(", "));
  expect("each starter says what to research and holds a Patterns section", fns.every((fn: string) => /## What to research/.test(template(fn)) && /## Patterns/.test(template(fn))));
  expect("strategy's starter has a section for competitors/[id]/signals", /### competitors\/\[id\]\/signals/.test(template("strategy")));
  const unlisted = fns.filter((fn: string) => !readFileSync(join(repo, `packages/naive/src/functions/${fn}/README.md`), "utf8").includes("templates/research-program.md"));
  expect("each function README lists its starter", unlisted.length === 0, unlisted.join(", "));
  const gen = draftProgram({ function: "products" });
  expect("the generator drafts a function's starter", gen.ok && gen.file === "programs/products.md" && gen.draft === template("products"), JSON.stringify(gen.errors));
  expect("the generator refuses an id that is not a function", !draftProgram({ function: "nope" }).ok);

  // The route: a collection of programs, writable, and each item's template is its own function's starter.
  const item = (routes() as { route: string, actions: string[], writer?: string }[]).find((r) => r.route === "operations/research-program/[id]");
  expect("operations/research-program/[id] is a writable route with writer person", !!item && item.actions.includes("write") && item.writer === "person", JSON.stringify(item));

  // init through add-department: a typed venture gets the starter of each function its type lists.
  const made = node("packages/naive/src/engine/init-venture.mjs", join(ws, "ventures/lab"), "lab", "--type", "side-project");
  if (made.status !== 0) throw new Error(made.stderr || made.stdout);
  const dir = join(ws, "ventures/lab");
  expect("init copies the starter of each function the venture lists", JSON.stringify(functionsOf(dir)) === '["strategy","products"]'
    && readFileSync(join(dir, "programs/strategy.md"), "utf8") === template("strategy") && readFileSync(join(dir, "programs/products.md"), "utf8") === template("products"));
  expect("a function the venture does not list gets no program", !existsSync(join(dir, "programs/finance.md")));
  const tpl = await ask({ route: "operations/research-program/products", action: "template" });
  expect("an item's template is its own function's starter", tpl.ok && tpl.result === template("products"));

  // A person's write lands live, with provenance and the bytes in the blob store.
  const text = "# Research program: Strategy\n\nForecast raises only. Never trade recall for precision.\n";
  await pause(5);
  const before = new Date().toISOString();
  await pause(5);
  const w = await ask({ route: "operations/research-program/strategy", action: "write", input: { text }, actor: "person" });
  expect("a person's write lands live", w.ok && result(w).draft === false && readFileSync(join(dir, "programs/strategy.md"), "utf8") === text, JSON.stringify(w));
  const line = entries(dir).at(-1);
  expect("its provenance line names the program, a person and the bytes' hash", line?.entity === "programs/strategy.md" && line?.agent?.kind === "person"
    && line?.sha256 === blobHash(text) && line?.hash === result(w).provenance, JSON.stringify(line));
  expect("the bytes are in the blob store, so an as-of read returns them", hasBlob(dir, blobHash(text)) && readAsOf(dir, "programs/strategy.md", new Date().toISOString())?.content === text);
  const read = await ask({ route: "operations/research-program/strategy", actor: "person" });
  expect("a read returns the program", read.ok && JSON.stringify(read.result).includes("Forecast raises only"), JSON.stringify(read).slice(0, 300));
  const own = await ask({ route: "operations/research-program/strategy", actor_id: "strategy-researcher", reads_as_of: before });
  expect("a researcher reads its own function's program live, even with a cut", own.ok && JSON.stringify(own.result).includes("Forecast raises only"), JSON.stringify(own).slice(0, 300));
  const bare = await ask({ route: "operations/research-program/strategy", actor_id: "strategy-researcher" });
  expect("and with no cut at all", bare.ok && JSON.stringify(bare.result).includes("Forecast raises only"), JSON.stringify(bare).slice(0, 300));
  const other = await ask({ route: "operations/research-program/products", actor_id: "strategy-researcher", reads_as_of: before });
  expect("another function's program is read as of the cut (copied by init with no provenance line, so not there)", other.ok && other.result === null, JSON.stringify(other).slice(0, 300));
  expect("another function's program with no cut is refused", !(await ask({ route: "operations/research-program/products", actor_id: "strategy-researcher" })).ok);

  // Every agent's write is refused before anything else, and the file is unchanged.
  const unchanged = () => readFileSync(join(dir, "programs/strategy.md"), "utf8") === text;
  const agentText = { text: "# Mine now\n" };
  const researcher = await ask({ route: "operations/research-program/strategy", action: "write", input: agentText, actor_id: "strategy-researcher", reads_as_of: before });
  expect("a researcher's write is refused (person-only)", !researcher.ok && researcher.gate_rule === "person-only" && unchanged(), JSON.stringify(researcher));
  const agent = await ask({ route: "operations/research-program/strategy", action: "write", input: agentText });
  expect("any agent's write is refused (person-only)", !agent.ok && agent.gate_rule === "person-only" && unchanged(), JSON.stringify(agent));
  const fresh = await ask({ route: "operations/research-program/finance", action: "write", input: agentText, actor_id: "finance-researcher", reads_as_of: before });
  expect("an agent cannot create a missing program either", !fresh.ok && fresh.gate_rule === "person-only" && !existsSync(join(dir, "programs/finance.md")));
  const viaFiles = await agentWrite({ venture: "lab", workspace: ws, actor_id: "strategy-researcher", reads_as_of: before }, "/operations/research-program/strategy", JSON.stringify(agentText));
  expect("the agent filesystem's write is refused too", !viaFiles.ok && /written only by a person/.test(viaFiles.error ?? "") && unchanged(), JSON.stringify(viaFiles));
  process.env.MENTURA_ACTOR = "agent";
  const posing = await ask({ route: "operations/research-program/strategy", action: "write", input: agentText, actor: "person" });
  delete process.env.MENTURA_ACTOR;
  expect("a person's call while the process says an agent is acting is refused", !posing.ok && posing.gate_rule === "person-only" && unchanged(), JSON.stringify(posing));
  expect("the projector may not write a program", writerRule({ route: "operations/research-program/strategy", writer: "person", projector: true, actor: "person" })?.rule === "person-only");
  expect("writerRule lets a person through", writerRule({ route: "operations/research-program/strategy", writer: "person", actor: "person" }) === null);

  // What a person's write refuses.
  const notFn = await ask({ route: "operations/research-program/marketing", action: "write", input: { text }, actor: "person" });
  expect("a program for an id that is not a function is refused", !notFn.ok && /not a function/.test(notFn.error ?? ""), JSON.stringify(notFn));
  const empty = await ask({ route: "operations/research-program/strategy", action: "write", input: { text: "  " }, actor: "person" });
  expect("an empty program is refused", !empty.ok && unchanged());

  // naive upgrade copies only missing programs of listed functions, and only once.
  const venture = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ ...venture, departments: [...venture.departments, "finance"] }, null, 2) + "\n");
  rmSync(join(dir, "programs/products.md"));
  const dry = await upgrade(dir, { dry: true, git: false }) as { release: { programs: { path: string }[] } };
  expect("upgrade --check names the missing programs and copies nothing", JSON.stringify(dry.release.programs.map((x) => x.path)) === '["programs/products.md","programs/finance.md"]'
    && !existsSync(join(dir, "programs/finance.md")), JSON.stringify(dry.release.programs));
  const up = await upgrade(dir, { git: false }) as { changed: boolean, release: { programs: { path: string }[] } };
  expect("upgrade copies the missing programs", up.changed && readFileSync(join(dir, "programs/finance.md"), "utf8") === template("finance") && readFileSync(join(dir, "programs/products.md"), "utf8") === template("products"));
  expect("upgrade leaves the founder's program as it is", unchanged());
  expect("upgrade logs each copy in provenance", ["programs/products.md", "programs/finance.md"].every((p) => entries(dir).some((e: { entity?: string, activity?: string }) => e.entity === p && e.activity === "write")));
  const again = await upgrade(dir, { git: false }) as { release: { programs: unknown[] } };
  expect("a second upgrade copies nothing", again.release.programs.length === 0 && seedPrograms(dir).length === 0);
  const added = node("packages/naive/src/engine/add-department.mjs", dir, "strategy");
  expect("importing a function again never copies over its program", added.status === 0 && unchanged(), added.stderr);

  // The research skill is listed for the interface layer and shipped in the plugin.
  const layer = JSON.parse(readFileSync(join(repo, "packages/naive/src/records/layers/interface/layer.json"), "utf8")) as { skills: { id: string, path: string }[] };
  const plugin = JSON.parse(readFileSync(join(repo, ".claude-plugin/plugin.json"), "utf8")) as { skills: string[] };
  expect("the research skill is listed and shipped", layer.skills.some((s) => s.id === "research" && existsSync(join(repo, s.path))) && plugin.skills.includes("./packages/naive/src/interfaces/skills/research"));
} catch (e) {
  expect("the test ran", false, String((e as Error).stack ?? e));
} finally {
  rmSync(ws, { recursive: true, force: true });
}
console.log(failed ? `${failed} failed` : "research programs: all pass");
process.exit(failed ? 1 : 0);
