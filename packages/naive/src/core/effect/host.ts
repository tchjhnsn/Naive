// Where Naive runs, and its judge, as Effect services (EE-125, phase 4 of
// docs/design/TYPESCRIPT_AND_EFFECT_RUNTIME_2026-11-22.md).
//
// HostRuntime says whether this run is hosted, which host hooks it has and which environment commands it reads.
// Its default layer, HostRuntimeLive, asks core/runtime.ts at each call, so NAIVE_RUNTIME and a host's
// registerHook keep working exactly as before, even for a hook registered after the runtime was built. Laptop and
// Hosted(hooks) are fixed layers for tests and for a host that builds its own runtime.
//
// Judge asks System 1 a question through whichever judge this run has: hosted, the host's judge hook, refused
// with a HostedRefusal when there is none; on a laptop, the command in NAIVE_JUDGE_CMD (or the one a caller
// passes). It answers null when a laptop run has no judge, so each caller keeps its own message. JudgeFake
// answers from a function, for tests.
import { spawnSync } from "node:child_process";
import { Context, Effect, Layer } from "effect";
import { type CommandResult, envCommand, type HookName, type Hooks, HostedRefusal, hostHook, isHosted, missingHook } from "../runtime.ts";

export type HostRuntimeShape = {
  readonly hosted: Effect.Effect<boolean>;
  /** The hook the host registered, when hosted; undefined on a laptop. */
  readonly hook: <K extends HookName>(name: K) => Effect.Effect<Hooks[K] | undefined>;
  /** An environment command's value on a laptop; undefined when hosted. */
  readonly envCommand: (name: string) => Effect.Effect<string | undefined>;
};

/** The host service. Yield it inside Effect.gen: `const host = yield* HostRuntime`. */
export const HostRuntime = Context.Service<"naive/HostRuntime", HostRuntimeShape>("naive/HostRuntime");

/** The default layer: NAIVE_RUNTIME and registerHook (core/runtime.ts), read at each call. */
export const HostRuntimeLive: Layer.Layer<"naive/HostRuntime"> = Layer.succeed(HostRuntime, {
  hosted: Effect.sync(isHosted),
  hook: (name) => Effect.sync(() => hostHook(name)),
  envCommand: (name) => Effect.sync(() => envCommand(name)),
});

/** A laptop run whatever NAIVE_RUNTIME says: no hooks, environment commands read. */
export const Laptop: Layer.Layer<"naive/HostRuntime"> = Layer.succeed(HostRuntime, {
  hosted: Effect.succeed(false),
  hook: () => Effect.succeed(undefined),
  envCommand: (name) => Effect.sync(() => process.env[name]),
});

/** A hosted run with these hooks: environment commands ignored, a hook not given is missing. */
export const Hosted = (hooks: Partial<Hooks> = {}): Layer.Layer<"naive/HostRuntime"> => Layer.succeed(HostRuntime, {
  hosted: Effect.succeed(true),
  // Partial<Hooks>[K] is Hooks[K] | undefined; without strictNullChecks tsc cannot see that, so say it once.
  hook: <K extends HookName>(name: K) => Effect.succeed(hooks[name] as Hooks[K] | undefined),
  envCommand: () => Effect.succeed(undefined),
});

/** A judge command as argv: a JSON array, or words split on spaces. */
export function commandArgv(cmd: string | string[] | null | undefined): string[] | null {
  if (!cmd) return null;
  if (Array.isArray(cmd)) return cmd;
  const t = String(cmd).trim();
  return t.startsWith("[") ? JSON.parse(t) : t.split(/\s+/);
}

/** A judge's answer and who gave it (the hook, or the command's program). */
export type JudgeAnswer = { result: CommandResult; by: string };
export type JudgeAsk = {
  /** What the judgment is for, named in a hosted refusal. */
  feature: string;
  /** The request, sent on stdin or to the hook. */
  input: string;
  /** A command that replaces NAIVE_JUDGE_CMD on a laptop. Undefined reads the environment; null means none. */
  cmd?: string | string[] | null;
};

export type JudgeShape = {
  readonly ask: (request: JudgeAsk) => Effect.Effect<JudgeAnswer | null, HostedRefusal>;
};

/** The judge service. */
export const Judge = Context.Service<"naive/Judge", JudgeShape>("naive/Judge");

/** The default judge: the host's hook when hosted, else the command, over whichever HostRuntime is provided. */
export const JudgeLive: Layer.Layer<"naive/Judge", never, "naive/HostRuntime"> = Layer.effect(Judge, Effect.gen(function* () {
  const host = yield* HostRuntime;
  return {
    ask: ({ feature, input, cmd }) => Effect.gen(function* () {
      if (yield* host.hosted) {
        const hook = yield* host.hook("judge");
        if (!hook) return yield* Effect.fail(missingHook(feature, "judge"));
        const result = yield* Effect.promise(async () => hook([], input));
        return { result, by: "the host's judge hook" };
      }
      const argv = commandArgv(cmd === undefined ? yield* host.envCommand("NAIVE_JUDGE_CMD") : cmd);
      if (!argv) return null;
      const [program, ...args] = argv;
      const result: CommandResult = spawnSync(program, args, { input, encoding: "utf8", maxBuffer: 1 << 26 });
      return { result, by: program };
    }),
  };
}));

/** A judge that answers from a function, for tests. */
export const JudgeFake = (answer: (input: string) => CommandResult): Layer.Layer<"naive/Judge"> =>
  Layer.succeed(Judge, { ask: ({ input }) => Effect.sync(() => ({ result: answer(input), by: "the fake judge" })) });

/** Asks through whichever judge is provided. */
export const askJudge = (request: JudgeAsk): Effect.Effect<JudgeAnswer | null, HostedRefusal, "naive/Judge"> =>
  Effect.gen(function* () { return yield* (yield* Judge).ask(request); });

export { HostedRefusal };
