// Durable handoffs (EE-161, Effect runtime plan phase 11): a run killed inside its second criterion resumes on the next
// run without rerunning the first, and the evidence lands only through the router, with provenance.
//
//   node packages/naive/src/interfaces/tests/durable-handoff-test.ts

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ventureFile } from "../../core/venture-paths.ts";
import { durableEngine, durableFile } from "../../router/orchestration/durable-handoff.ts";

const repo = fileURLToPath(new URL("../../../../..", import.meta.url));
let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => { console.log(`${cond ? "pass" : "FAIL"}  ${name}${cond || !detail ? "" : `: ${detail}`}`); if (!cond) failed++; };

const ws = mkdtempSync(join(tmpdir(), "durable-handoff-"));
const dir = join(ws, "kettle");
const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.ts"), dir, "kettle", "--layers", "purpose"], { encoding: "utf8" });
if (init.status !== 0) throw new Error(init.stderr);
const env: NodeJS.ProcessEnv = { ...process.env, MENTURA_WORKSPACE: ws };
delete env.NAIVE_RUNTIME;

ok("without durable.engine the engine is memory", durableEngine(dir) === "memory");
const cfgPath = join(dir, "naive.config.json");
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, "utf8")) : {};
writeFileSync(cfgPath, JSON.stringify({ ...cfg, durable: { engine: "sqlite" } }, null, 2) + "\n");
ok("durable.engine sqlite is read from naive.config.json", durableEngine(dir) === "sqlite");

// Each criterion counts its runs in a file. The second kills the process running it, once, from inside the criterion.
const count = (n: string) => existsSync(join(ws, `${n}.count`)) ? readFileSync(join(ws, `${n}.count`), "utf8").trim().split("\n").length : 0;
const mark = join(ws, "crashed");
writeFileSync(join(dir, "third.ts"), `import { appendFileSync } from "node:fs";\nexport default async () => { appendFileSync(${JSON.stringify(join(ws, "c3.count"))}, "run\\n"); return { passed: true, output: "third ran" }; };\n`);
const handoffs = ventureFile(dir, "operations/handoffs");
mkdirSync(handoffs, { recursive: true });
writeFileSync(join(handoffs, "h1.json"), JSON.stringify({ id: "h1", title: "Prove the kettle", venture: "kettle", role: "builder", brief: "h1.md", decision_classes: ["implementation-detail"], status: "in-progress", attempts: 1, max_attempts: 3, run_cap: "1h", done_criteria: [
  { id: "c1", kind: "conformance", check: `echo run >> ${join(ws, "c1.count")}` },
  { id: "c2", kind: "conformance", check: `echo run >> ${join(ws, "c2.count")}; if [ ! -f ${mark} ]; then touch ${mark}; kill -9 $PPID; sleep 5; fi` },
  { id: "c3", kind: "self-proof", runs: "effect", check: "third.ts" },
] }, null, 2) + "\n");

const naive = (...a: string[]) => spawnSync("node", [join(repo, "packages/naive/src/interfaces/cli/naive.ts"), ...a], { cwd: dir, encoding: "utf8", env, input: "" });
const first = naive("handoff", "run", "h1");
ok("the first run dies inside the second criterion", first.status !== 0 && existsSync(mark) && !/criterion run passed/.test(first.stdout), `${first.status} ${first.signal} ${first.stdout}${first.stderr}`);
ok("before the crash the first criterion ran once and the second started", count("c1") === 1 && count("c2") === 1 && count("c3") === 0, `${count("c1")} ${count("c2")} ${count("c3")}`);
ok("the run's state is kept in .naive/durable.sqlite", existsSync(durableFile(dir)));
const results = ventureFile(dir, "evidence/results");
ok("no evidence is written before the run finishes", !existsSync(results) || readdirSync(results).length === 0);

const second = naive("handoff", "run", "h1");
ok("the next run resumes and passes", second.status === 0 && /durable, sqlite/.test(second.stdout), `${second.status} ${second.stdout}${second.stderr}`);
ok("the first criterion did not run again", count("c1") === 1, String(count("c1")));
ok("the interrupted criterion ran again, and the third once", count("c2") === 2 && count("c3") === 1, `${count("c2")} ${count("c3")}`);
const files = existsSync(results) ? readdirSync(results) : [];
const h = JSON.parse(readFileSync(join(handoffs, "h1.json"), "utf8")) as { evidence?: string[] };
ok("one evidence file, listed once on the handoff", files.length === 1 && h.evidence?.length === 1 && h.evidence[0].endsWith(files[0]), `${files.join()} ${JSON.stringify(h.evidence)}`);
const ev = files[0] ? JSON.parse(readFileSync(join(results, files[0]), "utf8")) as { passed: boolean, results: { criterion: string, passed: boolean }[] } : null;
ok("the evidence holds every criterion, passed", !!ev && ev.passed && ev.results.map((r) => r.criterion).join() === "c1,c2,c3", JSON.stringify(ev));

// Through the router: every write is a provenance line, and the chain holds.
const log = readFileSync(join(dir, "provenance.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l) as { entity?: string, activity?: string });
ok("the evidence and the handoff were written through the router, with provenance", log.some((e) => e.entity?.endsWith(`evidence/results/${files[0]}`)) && log.some((e) => e.entity?.endsWith("operations/handoffs/h1.json")), JSON.stringify(log.map((e) => e.entity)));
const chain = spawnSync("node", [join(repo, "packages/naive/src/checks/check-provenance.ts"), dir], { encoding: "utf8" });
ok("the provenance chain holds", chain.status === 0, chain.stdout + chain.stderr);

const third = naive("handoff", "run", "h1");
ok("a later run is a new attempt and runs every criterion", third.status === 0 && count("c1") === 2 && count("c3") === 2, `${third.status} ${count("c1")} ${count("c3")} ${third.stderr}`);

// Without durable.engine, naive handoff run is run-handoff as before.
writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + "\n");
const plain = naive("handoff", "run", "h1");
ok("with the memory engine, naive handoff run runs run-handoff", plain.status === 0 && /every criterion run passed/.test(plain.stdout) && !/durable/.test(plain.stdout) && count("c1") === 3, `${plain.status} ${plain.stdout}${plain.stderr}`);

rmSync(ws, { recursive: true, force: true });
console.log(failed ? `\n${failed} failing` : "\nall passed");
process.exit(failed ? 1 : 0);
