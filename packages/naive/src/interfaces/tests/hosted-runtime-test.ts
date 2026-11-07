// Tests hosted mode (packages/naive/src/core/runtime.mjs): under NAIVE_RUNTIME=hosted each feature that reaches
// outside the tenant refuses with a message naming the feature and why, environment commands are ignored, and
// a host's registered hooks (judge, site, sandbox, git) stand in. Without NAIVE_RUNTIME the laptop path still runs.
//
//   node packages/naive/src/interfaces/tests/hosted-runtime-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { HostedRefusal, clearHooks, envCommand, git, hostHook, registerHook } from "../../core/runtime.mjs";
import { syncCommand } from "../../core/sync.mjs";
import { ventureFile } from "../../core/venture-paths.mjs";
import { activity } from "../../engine/activity.mjs";
import { judge } from "../../engine/caching.mjs";
import { planOne } from "../../engine/port-venture.mjs";
import { runHandoff } from "../../engine/run-handoff.mjs";
import { updateFramework } from "../../engine/upgrades.mjs";
import { canClassify, classify } from "../../engine/venture-type.mjs";
import { ventureHealth } from "../../router/boundaries.mjs";
import { runAgent } from "../../router/orchestration/migrate-venture.mjs";
import { connect } from "../../store/connectors/filesystem.mjs";
import { scan } from "../harness/site.mjs";

const repo = fileURLToPath(new URL("../../../../..", import.meta.url));
let failed = 0;
const ok = (name: string, cond: boolean, detail = "") => { console.log(`${cond ? "pass" : "FAIL"}  ${name}${cond || !detail ? "" : `: ${detail}`}`); if (!cond) failed++; };
const refusal = async (fn: () => unknown): Promise<string> => {
  try { await fn(); return "(no refusal)"; } catch (e) { return e instanceof HostedRefusal ? e.message : `(not a refusal: ${e instanceof Error ? e.message : String(e)})`; }
};
const HOSTED = /is refused in hosted mode \(NAIVE_RUNTIME=hosted\): /;

const ws = mkdtempSync(join(tmpdir(), "hosted-runtime-"));
const dir = join(ws, "kettle");
const init = spawnSync("node", [join(repo, "packages/naive/src/engine/init-venture.mjs"), dir, "kettle", "--layers", "purpose"], { encoding: "utf8" });
if (init.status !== 0) throw new Error(init.stderr);
const handoffs = ventureFile(dir, "operations/handoffs");
mkdirSync(handoffs, { recursive: true });
writeFileSync(join(handoffs, "h1.json"), JSON.stringify({ id: "h1", done_criteria: [{ id: "c1", kind: "conformance", check: "true" }] }, null, 2) + "\n");
const judgeScript = join(ws, "judge.mjs");
writeFileSync(judgeScript, "let s='';process.stdin.on('data',(d)=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(JSON.stringify({model:'cmd',answers:Object.fromEntries(Object.keys(r.questions).map((k)=>[k,'from the command']))}));});\n");
process.env.NAIVE_JUDGE_CMD = `node ${judgeScript}`;
process.env.NAIVE_SYNC_RHO = "echo synced";
process.env.NAIVE_CACHE = "off";
const ask = (q: string) => judge(dir, { model: "m", questions: { q } }, { now: Date.now() });

// The laptop path: no NAIVE_RUNTIME. Hooks are ignored and environment commands run.
delete process.env.NAIVE_RUNTIME;
registerHook("judge", () => ({ status: 0, stdout: JSON.stringify({ model: "hook", answers: { q: "from the hook" } }), stderr: "" }));
ok("laptop: an environment command is read", envCommand("NAIVE_JUDGE_CMD") === `node ${judgeScript}`);
ok("laptop: a registered hook is not consulted", hostHook("judge") === undefined);
const laptopAnswer = await ask("laptop");
ok("laptop: the judge runs NAIVE_JUDGE_CMD", laptopAnswer.model === "cmd" && (laptopAnswer.answers as Record<string, unknown>).q === "from the command", JSON.stringify(laptopAnswer));
ok("laptop: git runs", git("a test", ["--version"], { encoding: "utf8" }).status === 0);
ok("laptop: NAIVE_SYNC_* names the sync command", syncCommand("rho") === "echo synced");
ok("laptop: a judge command can classify a type", canClassify());
const laptopRun = await runHandoff(dir, "h1", { log: () => {} });
ok("laptop: run-handoff runs a bash criterion", laptopRun.evidence.passed && !String(laptopRun.evidence.subject.version).startsWith("naive-framework@"));
const laptopCli = spawnSync("node", [join(repo, "packages/naive/src/engine/run-handoff.mjs"), dir, "h1"], { encoding: "utf8", env: { ...process.env } });
ok("laptop: the run-handoff command passes and writes evidence", laptopCli.status === 0 && laptopCli.stdout.includes("pass c1") && laptopCli.stdout.includes("every criterion run passed"), `${laptopCli.status} ${laptopCli.stdout}${laptopCli.stderr}`);
let laptopActivity = "ran";
try { activity({ root: dir, dir: join(ws, "transcripts") }); } catch (e) { laptopActivity = e instanceof Error ? e.message : String(e); }
ok("laptop: activity reads a transcript folder outside the venture", laptopActivity === "ran", laptopActivity);
clearHooks();

// Hosted, with nothing registered: each feature refuses and says why.
process.env.NAIVE_RUNTIME = "hosted";
ok("hosted: an environment command is ignored", envCommand("NAIVE_JUDGE_CMD") === undefined);
ok("hosted: NAIVE_SYNC_* is ignored", syncCommand("rho") === null);
ok("hosted: a judge command no longer classifies a type", !canClassify());

const judged = await refusal(() => ask("hosted"));
ok("hosted: the judge refuses without a judge hook", HOSTED.test(judged) && judged.startsWith("judging 1 uncached question(s)") && judged.includes("NAIVE_JUDGE_CMD is ignored") && judged.includes('registerHook("judge", fn)'), judged);

const read = await refusal(() => scan("https://example.com"));
ok("hosted: reading a site refuses without a site hook", HOSTED.test(read) && read.startsWith("reading a site") && read.includes("NAIVE_SITE_CMD is ignored"), read);

const ran = await refusal(() => runHandoff(dir, "h1", { log: () => {} }));
ok("hosted: run-handoff refuses bash done-criteria without a sandbox", HOSTED.test(ran) && ran.startsWith("running a handoff's bash done-criteria") && ran.includes("Naive never runs a tenant's shell on the host") && ran.includes('registerHook("sandbox", fn)'), ran);

const cli = spawnSync("node", [join(repo, "packages/naive/src/engine/run-handoff.mjs"), dir, "h1"], { encoding: "utf8", env: { ...process.env } });
ok("hosted: the run-handoff command exits 2 with the refusal", cli.status === 2 && HOSTED.test(cli.stderr), `${cli.status} ${cli.stderr}`);

const transcripts = await refusal(() => activity({ root: dir, dir: join(homedir(), ".claude/projects") }));
ok("hosted: activity refuses to read ~/.claude/projects", HOSTED.test(transcripts) && transcripts.startsWith("reading harness transcripts") && transcripts.includes("outside the venture"), transcripts);

const g = git("a test", ["--version"]);
ok("hosted: git is refused like a missing git, with the refusal attached", g.status === null && g.error instanceof HostedRefusal && HOSTED.test(g.stderr) && g.stderr.startsWith("a test") && g.stderr.includes("it runs git") && g.stderr.includes('registerHook("git", fn)'), g.stderr);

const update = updateFramework(repo);
ok("hosted: updating the framework refuses without a git working copy", !update.ok && HOSTED.test(String(update.error)) && String(update.error).startsWith("updating the installed framework"), String(update.error));

const folder = join(ws, "old-repo");
mkdirSync(folder);
spawnSync("git", ["init", "-q"], { cwd: folder });
const ported = await refusal(() => planOne(folder, dir));
ok("hosted: porting a git repository refuses without a git working copy", HOSTED.test(ported) && ported.startsWith("porting a git repository"), ported);

const typed = await refusal(() => classify("a coffee shop"));
ok("hosted: classifying a venture's type refuses", HOSTED.test(typed) && typed.startsWith("classifying a venture's type"), typed);

const agent = await refusal(() => runAgent("hello"));
ok("hosted: the migration agent refuses", HOSTED.test(agent) && agent.startsWith("running the migration agent") && agent.includes("MENTURA_AGENT_CMD is ignored"), agent);

const harness = spawnSync("node", [join(repo, "packages/naive/src/interfaces/harness/run.mjs"), "discovery"], { encoding: "utf8", env: { ...process.env } });
ok("hosted: the discovery harness exits 2 with the refusal", harness.status === 2 && harness.stderr.startsWith("the discovery harness is refused in hosted mode"), `${harness.status} ${harness.stderr}`);

const store = connect({ root: dir, venture: true });
const venture = await store.read("venture.json");
ok("hosted: the filesystem connector still reads, without a commit", venture !== null && !("commit" in venture));

const broken = join(ws, "broken");
mkdirSync(broken);
writeFileSync(join(broken, "venture.json"), "{");
const health = ventureHealth(broken);
ok("hosted: a broken venture.json's recovery says git is refused", health !== null && health.recovery.some((r: string) => r.startsWith("restoring venture.json from git is refused in hosted mode")), JSON.stringify(health?.recovery));

// Hosted, with hooks: the host's functions stand in.
registerHook("judge", async (args, input) => ({ status: 0, stdout: JSON.stringify({ model: "hook", answers: Object.fromEntries(Object.keys(JSON.parse(input ?? "{}").questions).map((k) => [k, "from the hook"])) }), stderr: "" }));
const hooked = await ask("hosted with a hook");
ok("hosted: the judge hook answers in place of NAIVE_JUDGE_CMD", hooked.model === "hook" && (hooked.answers as Record<string, unknown>).q === "from the hook", JSON.stringify(hooked));

const checks: string[] = [];
registerHook("sandbox", (command) => { checks.push(command); return { status: 0, stdout: "sandboxed\n", stderr: "" }; });
const sandboxed = await runHandoff(dir, "h1", { log: () => {} });
ok("hosted: run-handoff sends each check to the sandbox", sandboxed.evidence.passed && checks.join() === "true" && sandboxed.evidence.results[0].output === "sandboxed");
ok("hosted: without a git working copy the evidence names the package version", String(sandboxed.evidence.subject.version) === `naive-framework@${JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).version}`, String(sandboxed.evidence.subject.version));

const gitCalls: string[][] = [];
registerHook("git", (args) => { gitCalls.push(args); return { status: 0, stdout: args[0] === "rev-parse" ? "abc1234\n" : "", stderr: "" }; });
const withGit = await runHandoff(dir, "h1", { log: () => {} });
ok("hosted: a registered git working copy answers git calls", withGit.evidence.subject.version === "abc1234" && gitCalls.some((a) => a[0] === "rev-parse"), String(withGit.evidence.subject.version));

let unknownHook = "";
try { registerHook("shell" as "git", () => ({ status: 0, stdout: "", stderr: "" })); } catch (e) { unknownHook = e instanceof Error ? e.message : String(e); }
ok("an unknown hook name is refused", unknownHook.startsWith("no host hook shell"), unknownHook);

clearHooks();
delete process.env.NAIVE_RUNTIME;
if (failed) { console.error(`${failed} hosted runtime check(s) failed`); process.exit(1); }
console.log("hosted runtime: every refusal names its feature and why; the laptop path is unchanged");
