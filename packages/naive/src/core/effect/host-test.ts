// Tests HostRuntime and Judge as layers (phase 4 of docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md):
// the fixed Laptop and Hosted layers, the live layer reading NAIVE_RUNTIME and registerHook at each call, and the
// judge on each of them.
import assert from "node:assert/strict";
import { Effect, Layer } from "effect";
import { askJudge, Hosted, HostRuntime, JudgeFake, JudgeLive, Laptop } from "./host.ts";
import { ventureRuntime } from "./runtime.ts";
import { clearHooks, HostedRefusal, registerHook } from "../runtime.ts";

const results: [string, boolean][] = [];
const test = async (name: string, fn: () => void | Promise<void>) => {
  try { await fn(); results.push([name, true]); } catch (e) { results.push([name, false]); console.error(name, e); }
};
const answer = (stdout: string) => ({ status: 0, stdout, stderr: "" });
const ask = { feature: "judging a test", input: '{"questions":{"q":1}}' };

await test("Laptop reads environment commands and has no hooks", () => {
  process.env.NAIVE_TEST_CMD = "echo hi";
  const out = Effect.runSync(Effect.provide(Effect.gen(function* () {
    const host = yield* HostRuntime;
    return { hosted: yield* host.hosted, cmd: yield* host.envCommand("NAIVE_TEST_CMD"), hook: yield* host.hook("judge") };
  }), Laptop));
  assert.deepEqual(out, { hosted: false, cmd: "echo hi", hook: undefined });
  delete process.env.NAIVE_TEST_CMD;
});

await test("Hosted ignores environment commands and gives only the hooks it was built with", () => {
  process.env.NAIVE_TEST_CMD = "echo hi";
  const judge = () => answer("{}");
  const out = Effect.runSync(Effect.provide(Effect.gen(function* () {
    const host = yield* HostRuntime;
    return { hosted: yield* host.hosted, cmd: yield* host.envCommand("NAIVE_TEST_CMD"), judge: yield* host.hook("judge"), git: yield* host.hook("git") };
  }), Hosted({ judge })));
  assert.deepEqual(out, { hosted: true, cmd: undefined, judge, git: undefined });
  delete process.env.NAIVE_TEST_CMD;
});

await test("hosted with no judge hook, the judge refuses with a HostedRefusal naming the feature", async () => {
  const err = await Effect.runPromise(Effect.provide(askJudge(ask).pipe(Effect.flip), Layer.provide(JudgeLive, Hosted())));
  assert.ok(err instanceof HostedRefusal);
  assert.match(err.message, /^judging a test is refused in hosted mode/);
  assert.match(err.message, /registered no judge hook/);
});

await test("hosted with a judge hook, the hook answers and gets the request", async () => {
  let seen = "";
  const out = await Effect.runPromise(Effect.provide(askJudge(ask), Layer.provide(JudgeLive, Hosted({ judge: async (_args, input) => { seen = input ?? ""; return answer('{"answers":{"q":"yes"}}'); } }))));
  assert.equal(out?.by, "the host's judge hook");
  assert.equal(out?.result.stdout, '{"answers":{"q":"yes"}}');
  assert.equal(seen, ask.input);
});

await test("on a laptop the judge runs the command, and answers null with none", async () => {
  const cmd = ["node", "-e", "let s='';process.stdin.on('data',(d)=>s+=d).on('end',()=>console.log(JSON.parse(s).questions.q))"];
  const out = await Effect.runPromise(Effect.provide(askJudge({ ...ask, cmd }), Layer.provide(JudgeLive, Laptop)));
  assert.equal(out?.by, "node");
  assert.equal(out?.result.stdout.trim(), "1");
  assert.equal(await Effect.runPromise(Effect.provide(askJudge({ ...ask, cmd: null }), Layer.provide(JudgeLive, Laptop))), null);
});

await test("a fake judge answers from a function", async () => {
  const out = await Effect.runPromise(Effect.provide(askJudge(ask), JudgeFake((input) => answer(input.toUpperCase()))));
  assert.equal(out?.result.stdout, ask.input.toUpperCase());
});

await test("the live layer reads NAIVE_RUNTIME and registerHook at each call, after the runtime was built", async () => {
  const runtime = ventureRuntime("/v");
  const before = process.env.NAIVE_RUNTIME;
  try {
    process.env.NAIVE_RUNTIME = "hosted";
    clearHooks();
    const refused = await runtime.runPromise(askJudge(ask).pipe(Effect.flip));
    assert.ok(refused instanceof HostedRefusal);
    registerHook("judge", () => answer("from the hook"));
    assert.equal((await runtime.runPromise(askJudge(ask)))?.result.stdout, "from the hook");
    delete process.env.NAIVE_RUNTIME;
    assert.equal(await runtime.runPromise(askJudge({ ...ask, cmd: null })), null);
  } finally {
    if (before === undefined) delete process.env.NAIVE_RUNTIME; else process.env.NAIVE_RUNTIME = before;
    clearHooks();
    await runtime.dispose();
  }
});

await test("a venture runtime takes host and judge overrides", async () => {
  const faked = ventureRuntime("/v", { judge: JudgeFake(() => answer("fake")) });
  assert.equal((await faked.runPromise(askJudge(ask)))?.result.stdout, "fake");
  await faked.dispose();
  const hooked = ventureRuntime("/v", { host: Hosted({ judge: () => answer("hooked") }) });
  assert.equal((await hooked.runPromise(askJudge(ask)))?.result.stdout, "hooked");
  await hooked.dispose();
});

for (const [name, ok] of results) console.log(`${ok ? "pass" : "FAIL"}  ${name}`);
if (results.some(([, ok]) => !ok)) process.exit(1);
console.log("all passed");
