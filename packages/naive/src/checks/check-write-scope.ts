// Naive writes only inside the venture (docs/design/HOSTED_WORKING_COPY_2026-11-07.md, point 1). A host
// commits the venture folder and throws away everything else, so a write anywhere else would be lost, or
// could reach another tenant.
//
// This runs a set of Naive's tests that write records with write-scope-preload.ts loaded into every Node
// process they start (through NODE_OPTIONS). The preload logs each node:fs write, move or removal outside
// the allowed roots: the venture under test and the OS temp dir. Every test here builds its venture under
// the temp dir, so the temp dir covers both. A path named in EXCEPTIONS is allowed too, each for a reason.
// The check fails when a test fails, or when any other path outside was written.
//
// The hosted mode (point 4 of the design, not built) will turn the exceptions off.
//
//   node packages/naive/src/checks/check-write-scope.ts [--root <repo>] [--json] [test file ...]
//
// With test files, it runs those instead of TESTS. --root runs them in another copy of the repository.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync } from "node:fs";
import { availableParallelism, tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The tests run under the check: the router's writes and boundaries, the interfaces over it, and the
// engine's steps that write records. Each makes its venture under the temp dir.
export const TESTS = [
  "packages/naive/src/router/writes-test.mjs",
  "packages/naive/src/interfaces/test.mjs",
  "packages/naive/src/interfaces/tests/agent-files-test.ts",
  "packages/naive/src/interfaces/tests/gate-test.mjs",
  "packages/naive/src/interfaces/tests/freshness-test.mjs",
  "packages/naive/src/interfaces/tests/decision-index-test.mjs",
  "packages/naive/src/interfaces/tests/connectors-router-test.mjs",
  "packages/naive/src/engine/lifecycle-test.mjs",
  "packages/naive/src/engine/decision-versions-test.mjs",
  "packages/naive/src/engine/upgrades-test.mjs",
  "packages/naive/src/checks/traces-test.ts",
  "packages/naive/src/interfaces/tests/as-of-test.ts",
  "packages/naive/src/interfaces/tests/reads-as-of-test.ts",
  "packages/naive/src/interfaces/tests/research-programs-test.ts",
];

// Paths outside the venture that today's code writes, relative to the repository, each with its reason.
// None today: on 2026-11-07 every Node step of test.mjs ran under the preload, and the only writes outside
// the temp dir were npm's own cache (~/.npm) from the create-venture test, which is not Naive and not run here.
export const EXCEPTIONS: { path: string, reason: string }[] = [];

export interface Write { call: string, path: string, script: string }
export interface Result { tests: { file: string, ok: boolean, output: string }[], outside: Write[] }

/** Runs the tests under the preload in the repository at `root` and returns what they wrote outside. */
export async function checkWriteScope(root: string, tests = TESTS): Promise<Result> {
  const work = mkdtempSync(join(tmpdir(), "write-scope-"));
  const log = join(work, "writes.jsonl");
  const repo = realpathSync(root);
  const roots = [...new Set([tmpdir(), realpathSync(tmpdir())])];
  const exceptions = EXCEPTIONS.map((e) => resolve(repo, e.path));
  const scope = JSON.stringify({ log, repo, roots, exceptions });
  const preload = pathToFileURL(join(root, "packages/naive/src/checks/write-scope-preload.ts")).href;
  const env = { ...process.env, NAIVE_WRITE_SCOPE: scope, NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ""} --import ${preload}`.trim(), GIT_OPTIONAL_LOCKS: "0" };

  const results: Result["tests"] = [];
  let next = 0;
  const workers = Math.max(1, Math.min(tests.length, availableParallelism()));
  await Promise.all(Array.from({ length: workers }, async () => {
    while (next < tests.length) {
      const file = tests[next++];
      results.push(await run(root, file, env));
    }
  }));

  const seen = new Set<string>();
  const outside: Write[] = [];
  const lines = existsSync(log) ? readFileSync(log, "utf8").split("\n").filter(Boolean) : [];
  for (const line of lines) {
    const w = JSON.parse(line) as Write;
    const key = `${w.call} ${w.path}`;
    if (!seen.has(key)) { seen.add(key); outside.push(w); }
  }
  rmSync(work, { recursive: true, force: true });
  results.sort((a, b) => tests.indexOf(a.file) - tests.indexOf(b.file));
  return { tests: results, outside };
}

function run(root: string, file: string, env: NodeJS.ProcessEnv): Promise<Result["tests"][number]> {
  return new Promise((done) => {
    const child = spawn("node", [file], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => { output += d; });
    child.stderr.setEncoding("utf8").on("data", (d: string) => { output += d; });
    child.on("error", (e) => done({ file, ok: false, output: e.message }));
    child.on("close", (code) => done({ file, ok: code === 0, output }));
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--root");
  const root = at >= 0 ? resolve(args[at + 1]) : fileURLToPath(new URL("../../../..", import.meta.url));
  const json = args.includes("--json");
  const files = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--root");
  const result = await checkWriteScope(root, files.length ? files : TESTS);
  const failed = result.tests.filter((t) => !t.ok);
  if (json) console.log(JSON.stringify(result.outside, null, 2));
  else {
    for (const t of result.tests) console.log(`${t.ok ? "pass" : "FAIL"}  ${t.file}`);
    for (const t of failed) console.log(t.output.trim().split("\n").slice(-8).map((l) => `      ${l}`).join("\n"));
    for (const w of result.outside) console.log(`FAIL  write outside the venture: ${w.call} ${relative(root, w.path).startsWith("..") ? w.path : relative(root, w.path)} (from ${w.script ? relative(root, w.script) : "an inline script"})`);
    console.log(failed.length || result.outside.length
      ? `\n${failed.length} test(s) failing, ${result.outside.length} write(s) outside the venture`
      : `\n${result.tests.length} tests wrote only inside the venture, the temp dir and ${EXCEPTIONS.length} named exception(s)`);
  }
  process.exit(failed.length || result.outside.length ? 1 : 0);
}
