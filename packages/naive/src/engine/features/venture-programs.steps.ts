// Step definitions for venture-programs.feature (EE-161), run by packages/naive/src/engine/bdd.ts on a new venture.

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Evidence } from "../../records/types/records.d.ts";

/** What one scenario's steps share. */
type World = { ws: string, dir: string, cleanup: () => void, status: number | null, out: string, hosted: boolean, evidence?: Evidence };
type Step = [RegExp, (w: World, ...groups: string[]) => unknown];

const repo = new URL("../../../../../", import.meta.url).pathname;
const ok = (cond: unknown, msg: string) => { if (!cond) throw new Error(msg); };
const put = (w: World, file: string, text: string) => { const f = join(w.dir, file); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, text); };
const effectProgram = (body: string) => `import { Effect } from "effect";\nexport default ${body};\n`;

export const steps: Step[] = [
  [/^a new venture "([a-z-]+)"$/, (w, id) => {
    w.ws = mkdtempSync(join(tmpdir(), "venture-programs-"));
    w.dir = join(w.ws, id);
    w.cleanup = () => rmSync(w.ws, { recursive: true, force: true });
    w.hosted = false;
    const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.ts"), w.dir, id, "--layers", "purpose"], { encoding: "utf8" });
    ok(init.status === 0, init.stderr);
    // As npm install leaves it: the venture resolves the same copy of Effect as Naive (EE-161).
    mkdirSync(join(w.dir, "node_modules"), { recursive: true });
    symlinkSync(join(repo, "node_modules/effect"), join(w.dir, "node_modules/effect"), "dir");
  }],
  [/^the program "([^"]+)" exports the Effect that succeeds with "([^"]+)"$/, (w, file, value) => put(w, file, effectProgram(`Effect.succeed(${JSON.stringify(value)})`))],
  [/^the program "([^"]+)" exports the Effect that fails with "([^"]+)"$/, (w, file, value) => put(w, file, effectProgram(`Effect.fail(new Error(${JSON.stringify(value)}))`))],
  [/^the program "([^"]+)" exports the Effect that succeeds with passed (true|false)$/, (w, file, v) => put(w, file, effectProgram(`Effect.succeed({ passed: ${v}, output: "checked" })`))],
  [/^the program "([^"]+)" exports an async function that returns "([^"]+)"$/, (w, file, value) => put(w, file, `export default async ({ dir }: { dir: string }) => dir ? ${JSON.stringify(value)} : "no dir";\n`)],
  [/^the founder runs "naive run ([^"]+)"$/, (w, file) => {
    const p = spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/naive.ts"), "run", file], { cwd: w.dir, encoding: "utf8", input: "" });
    w.status = p.status; w.out = `${p.stdout}${p.stderr}`;
  }],
  [/^the run exits (\d)$/, (w, code) => ok(w.status === Number(code), `exit ${w.status}: ${w.out}`)],
  [/^the output says "([^"]+)"$/, (w, text) => ok(w.out.includes(text), `output: ${w.out}`)],
  [/^a handoff "([a-z0-9-]+)" whose criterion "([a-z0-9-]+)" runs the effect "([^"]+)"$/, (w, id, c, file) => {
    put(w, `operations/handoffs/${id}.json`, JSON.stringify({ id, title: "A handoff with an effect criterion", venture: "v", role: "builder", brief: "h.md", decision_classes: ["implementation-detail"], status: "ready", attempts: 0, max_attempts: 3, run_cap: "2h", done_criteria: [{ id: c, kind: "conformance", runs: "effect", check: file }] }, null, 2) + "\n");
  }],
  [/^Naive is hosted with no sandbox hook$/, (w) => { w.hosted = true; }],
  [/^the handoff "([a-z0-9-]+)" runs$/, (w, id) => {
    const env = { ...process.env };
    if (w.hosted) env.NAIVE_RUNTIME = "hosted"; else delete env.NAIVE_RUNTIME;
    const p = spawnSync("node", [join(repo, "packages/naive/src/engine/run-handoff.ts"), w.dir, id], { encoding: "utf8", env, input: "" });
    w.status = p.status; w.out = `${p.stdout}${p.stderr}`;
    const h = JSON.parse(readFileSync(join(w.dir, "operations/handoffs", `${id}.json`), "utf8")) as { evidence?: string[] };
    const last = h.evidence?.at(-1);
    ok(last, `no evidence written: ${w.out}`);
    w.evidence = JSON.parse(readFileSync(join(w.dir, "operations/handoffs", last as string), "utf8")) as Evidence;
  }],
  [/^criterion "([a-z0-9-]+)" (passed|failed)$/, (w, c, how) => {
    const r = w.evidence?.results.find((x) => x.criterion === c);
    ok(r && r.passed === (how === "passed"), `criterion ${c}: ${JSON.stringify(r)} ${w.out}`);
  }],
  [/^the evidence keeps the command "([^"]+)"$/, (w, cmd) => ok(w.evidence?.results.some((r) => r.command === cmd), JSON.stringify(w.evidence?.results))],
];
