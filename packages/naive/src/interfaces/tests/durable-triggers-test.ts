// Durable triggers (EE-161, Effect runtime plan phase 12d): a trigger runner killed after its route call landed and
// before it saved its state does not call the route again on the next run. It finds the call in provenance by the
// run's key (trigger and event) and records the run as ran, so each trigger runs once per event.
//
//   node packages/naive/src/interfaces/tests/durable-triggers-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = fileURLToPath(new URL("../../../../..", import.meta.url));
let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => { console.log(`${cond ? "pass" : "FAIL"}  ${name}${cond || !detail ? "" : `: ${detail}`}`); if (!cond) failed++; };

const ws = mkdtempSync(join(tmpdir(), "durable-triggers-"));
const dir = join(ws, "tock");
const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.ts"), dir, "tock", "--layers", "purpose"], { encoding: "utf8" });
if (init.status !== 0) throw new Error(init.stderr);
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
delete env.NAIVE_RUNTIME;
delete env.NAIVE_DURABLE_KILL;
const node = (file: string, args: string[], extra: NodeJS.ProcessEnv = {}) => spawnSync("node", [join(repo, file), ...args], { cwd: repo, encoding: "utf8", env: { ...env, ...extra } });

const cfgPath = join(dir, "naive.config.json");
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
writeFileSync(cfgPath, JSON.stringify({ ...cfg, triggers: [
  { id: "icp", on: { activity: "write", route: "foundation/problem" }, run: { route: "foundation/icp/bakers", action: "write", input: { venture: "tock", id: "bakers", who: "Bakery owners" } } },
] }, null, 2) + "\n");
await new Promise((r) => setTimeout(r, 20));

// The write lands with the provenance hook held, so the trigger runner below is the only one that runs.
const input = join(ws, "problem.json");
writeFileSync(input, JSON.stringify({ venture: "tock", statement: "Bakeries throw away a fifth of their bread", segment: "Neighbourhood bakeries", evidence: [] }));
const w = node("packages/naive/src/interfaces/cli/mentura.ts", ["foundation/problem", "write", "--venture", "tock", "--input", input, "--as", "person"], { NAIVE_TRIGGERS_ACTIVE: "held" });
ok("the event lands", w.status === 0, w.stderr);

const calls = () => readFileSync(join(dir, "provenance.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { agent?: { id?: string }, note?: string }).filter((e) => e.agent?.id === "trigger-icp");
const state = () => existsSync(join(dir, ".naive/triggers.json")) ? JSON.parse(readFileSync(join(dir, ".naive/triggers.json"), "utf8")) as { runs: { trigger: string, outcome: string, result?: string }[] } : { runs: [] };

const mark = join(ws, "killed");
const first = node("packages/naive/src/router/orchestration/triggers.ts", [dir, "--fire"], { NAIVE_DURABLE_KILL: `trigger/icp:${mark}` });
ok("the runner dies after the route call lands", first.signal === "SIGKILL" && existsSync(mark), `${first.status} ${first.signal} ${first.stderr}`);
ok("the call landed once, keyed by its event", calls().length === 1 && /\(event [0-9a-f]+\)/.test(calls()[0].note ?? ""), JSON.stringify(calls()));
ok("no run was saved before the crash", !state().runs.some((r) => r.trigger === "icp"), JSON.stringify(state().runs));

const second = node("packages/naive/src/router/orchestration/triggers.ts", [dir, "--fire"], { NAIVE_DURABLE_KILL: `trigger/icp:${mark}` });
ok("the next run finishes", second.status === 0, second.stderr);
ok("the route was not called again", calls().length === 1, JSON.stringify(calls()));
const runs = state().runs.filter((r) => r.trigger === "icp");
ok("the run is recorded as ran, once", runs.length === 1 && runs[0].outcome === "ran" && /already ran/.test(runs[0].result ?? ""), JSON.stringify(runs));

const third = node("packages/naive/src/router/orchestration/triggers.ts", [dir, "--fire"]);
ok("a later run with no new event runs nothing", third.status === 0 && calls().length === 1 && state().runs.filter((r) => r.trigger === "icp").length === 1);
const chain = node("packages/naive/src/checks/check-provenance.ts", [dir]);
ok("the provenance chain holds", chain.status === 0, chain.stdout + chain.stderr);

rmSync(ws, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passed");
process.exit(failed ? 1 : 0);
