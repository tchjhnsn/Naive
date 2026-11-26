// venture.json mode (EE-193): observed or run, written by init-venture and create-venture.
// Absence stays unknown. This file may import the conduct terms. It does not import packages/naive/src/checks.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { judgeConduct } from "../terms/conduct.ts";
import { run } from "../terms/engine.ts";
import { observedVenture, runVenture } from "../terms/terms.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
const base = mkdtempSync(join(tmpdir(), "venture-mode-"));
const home = join(base, "home");
mkdirSync(home);
let failed = 0;
const expect = (name: string, ok: unknown, detail = "") => {
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok || !detail ? "" : `\n      ${detail}`}`);
  if (!ok) failed++;
};

const observed = { confirmed: true, observed: true, run: false };
const running = { confirmed: true, observed: false, run: true };
const both = { confirmed: true, observed: true, run: true };
expect("observed passes observed and not run", run(observedVenture, observed).pass && !run(runVenture, observed).pass);
expect("run passes run and not observed", run(runVenture, running).pass && !run(observedVenture, running).pass);
expect("both fails both terms", !run(observedVenture, both).pass && !run(runVenture, both).pass);
expect("unconfirmed observed facts do not pass", !run(observedVenture, { ...observed, confirmed: false }).pass);

const absent = judgeConduct({ id: "acme" });
const observedJudgment = judgeConduct({ mode: "observed" });
const runJudgment = judgeConduct({ mode: "run" });
const solo = judgeConduct({ mode: "solo" });
const empty = judgeConduct({ mode: null });
expect("absence is unknown", absent.verdict === "unknown");
expect("absence is not read as run", absent.verdict !== "run");
expect("observed passes its term", observedJudgment.verdict === "observed" && observedJudgment.result.pass);
expect("run passes its term", runJudgment.verdict === "run" && runJudgment.result.pass);
expect("people.json mode is illegal on the venture", solo.verdict === "illegal" && solo.value === "solo");
expect("null is illegal", empty.verdict === "illegal");

const node = (script: string, args: string[], env?: NodeJS.ProcessEnv) =>
  spawnSync("node", [join(repo, script), ...args], { encoding: "utf8", env });
const load = (dir: string) => JSON.parse(readFileSync(join(dir, "venture.json"), "utf8")) as { mode?: unknown };
const init = (id: string, extra: string[] = []) => {
  const dir = join(base, id);
  const r = node("packages/naive/src/engine/init-venture.ts", [dir, id, ...extra]);
  return { dir, r };
};

const plain = init("plain");
expect("init with no --mode leaves mode absent", plain.r.status === 0 && !Object.hasOwn(load(plain.dir), "mode"), plain.r.stderr);
const observedInit = init("observed", ["--mode", "observed"]);
expect("init --mode observed writes observed", observedInit.r.status === 0 && load(observedInit.dir).mode === "observed", observedInit.r.stderr);
const runInit = init("running", ["--mode", "run"]);
expect("init --mode run writes run", runInit.r.status === 0 && load(runInit.dir).mode === "run", runInit.r.stderr);
const bad = init("bad", ["--mode", "solo"]);
expect("init --mode solo is refused and writes nothing", bad.r.status === 2 && !existsSync(join(bad.dir, "venture.json")), bad.r.stderr);

const check = (dir: string) => node("packages/naive/src/checks/check-venture-mode.ts", [dir]);
const unknown = check(plain.dir);
expect("the check passes absence as unknown", unknown.status === 0 && unknown.stdout.trim() === "unknown", unknown.stdout + unknown.stderr);
const checked = check(observedInit.dir);
expect("the check passes observed", checked.status === 0 && checked.stdout.trim() === "observed", checked.stdout + checked.stderr);
const illegalDir = join(base, "illegal");
mkdirSync(illegalDir);
writeFileSync(join(illegalDir, "venture.json"), JSON.stringify({ mode: "team" }));
const illegal = check(illegalDir);
expect("the check refuses any other present value", illegal.status === 1 && illegal.stderr.includes("illegal"), illegal.stderr);

const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(home, ".config"), npm_config_user_agent: "" };
for (const k of ["TYPESAFE_API_KEY", "TYPESAFEAI_API_KEY", "MENTURA_TYPE_CMD"]) delete env[k];
const create = (id: string, extra: string[]) => {
  const dir = join(base, id);
  const r = node("packages/create-venture/index.mjs", [dir, "--yes", "--skip-install", "--no-git", "--type", "software-startup", ...extra], env);
  return { dir, r };
};
const created = create("fresh", []);
const createdMode = created.r.status === 0 ? load(created.dir).mode : undefined;
const peopleMode = created.r.status === 0 ? (JSON.parse(readFileSync(ventureFile(created.dir, "people/people.json"), "utf8")) as { mode?: string }).mode : undefined;
expect("create-venture writes mode run", created.r.status === 0 && createdMode === "run", created.r.stderr);
expect("people.json mode stays solo", peopleMode === "solo", String(peopleMode));
const flagged = create("watched", ["--observed"]);
expect("create-venture --observed writes observed", flagged.r.status === 0 && load(flagged.dir).mode === "observed", flagged.r.stderr);
const explicit = create("explicit", ["--mode", "observed"]);
expect("create-venture --mode observed writes observed", explicit.r.status === 0 && load(explicit.dir).mode === "observed", explicit.r.stderr);
const clash = create("clash", ["--observed", "--mode", "run"]);
expect("create-venture refuses --observed with --mode run", clash.r.status !== 0 && !existsSync(join(clash.dir, "venture.json")), clash.r.stderr);
const leftoverCreate = create("leftover", ["--modeled"]);
expect("create-venture --modeled is refused and writes nothing", leftoverCreate.r.status !== 0 && leftoverCreate.r.stderr.includes("unknown flag --modeled") && !existsSync(join(leftoverCreate.dir, "venture.json")), leftoverCreate.r.stderr);
const naiveNew = (id: string, extra: string[]) => {
  const dir = join(base, id);
  const r = node("packages/naive/src/interfaces/cli/naive.ts", ["new", dir, "--yes", "--skip-install", "--no-git", "--type", "software-startup", ...extra], env);
  return { dir, r };
};
const leftover = naiveNew("leftover-new", ["--modeled"]);
expect("naive new --modeled is refused and writes nothing", leftover.r.status !== 0 && leftover.r.stderr.includes("unknown flag --modeled") && !existsSync(join(leftover.dir, "venture.json")), leftover.r.stderr + leftover.r.stdout);
const observedNew = naiveNew("naive-observed", ["--observed"]);
expect("naive new --observed writes observed", observedNew.r.status === 0 && load(observedNew.dir).mode === "observed", observedNew.r.stderr);
const runNew = naiveNew("naive-run", []);
expect("naive new with no mode flag writes run", runNew.r.status === 0 && load(runNew.dir).mode === "run", runNew.r.stderr);

rmSync(base, { recursive: true, force: true });
if (failed) process.exit(1);
