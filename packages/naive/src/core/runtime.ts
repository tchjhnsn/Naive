// Where Naive runs: on a founder's laptop (the default) or on a host (NAIVE_RUNTIME=hosted). This is the one
// place that reads NAIVE_RUNTIME.
//
// A hosted run reaches nothing outside the tenant. It spawns no command an environment variable names, runs no
// shell, reads no harness transcripts and runs no git. The host registers a function at start for each thing it
// does provide, and every feature that needs one it did not register refuses with a HostedRefusal that names
// the feature and why. On a laptop none of this is consulted: hooks are ignored and every path runs as before.
//
// Hooks:
//   judge     stands in for NAIVE_JUDGE_CMD: (args, input) => { status, stdout, stderr }, or a promise of it
//   site      stands in for NAIVE_SITE_CMD, the same shape
//   trace     stands in for NAIVE_TRACE_CMD, the same shape
//   sandbox   runs a handoff's bash done-criterion: (command, { cwd }) => { status, stdout, stderr }, or a promise of it
//   git       a git working copy: (args, opts) => { status, stdout, stderr }, answered at once (the same shape as spawnSync)
//   sql       the host's SQL client for durable work on durable.engine postgres: () => an effect/sql SqlClient, or a promise of
//             it. The host owns the pool and its driver (@effect/sql-pg), so Naive depends on no database driver (EE-161).
// Imports nothing in the repository.

import { spawnSync, type SpawnSyncOptions } from "node:child_process";
import type { SqlClient } from "effect/sql/SqlClient";

/** Whether this process runs hosted: NAIVE_RUNTIME=hosted. */
export const isHosted = (): boolean => process.env.NAIVE_RUNTIME === "hosted";

export type CommandResult = { status: number | null; stdout: string; stderr: string; error?: Error };
export type CommandHook = (args: string[], input?: string) => CommandResult | Promise<CommandResult>;
export type SandboxHook = (command: string, opts: { cwd: string }) => CommandResult | Promise<CommandResult>;
export type GitHook = (args: string[], opts?: SpawnSyncOptions) => CommandResult;
export type SqlHook = () => SqlClient | Promise<SqlClient>;
export type Hooks = { judge: CommandHook; site: CommandHook; trace: CommandHook; sandbox: SandboxHook; git: GitHook; sql: SqlHook };
export type HookName = keyof Hooks;

/** The hooks a host can register, and the environment variable each stands in for (null when none does). */
export const HOOKS = Object.freeze({ judge: "NAIVE_JUDGE_CMD", site: "NAIVE_SITE_CMD", trace: "NAIVE_TRACE_CMD", sandbox: null, git: null, sql: null });

const registered: { [K in HookName]: Hooks[K] | undefined } = { judge: undefined, site: undefined, trace: undefined, sandbox: undefined, git: undefined, sql: undefined };

/** Registers a host hook. A hosted host calls this at start, the way it registers connectors. */
export function registerHook<K extends HookName>(name: K, fn: Hooks[K]): void {
  if (!(name in HOOKS)) throw new Error(`no host hook ${name}: the hooks are ${Object.keys(HOOKS).join(", ")}`);
  if (typeof fn !== "function") throw new Error(`the ${name} hook is a function`);
  registered[name] = fn;
}

/** Removes every registered hook (tests). */
export function clearHooks(): void {
  registered.judge = registered.site = registered.trace = undefined;
  registered.sandbox = undefined;
  registered.git = undefined;
  registered.sql = undefined;
}

/** The hook the host registered, when hosted. Undefined on a laptop, so laptop code never sees one. */
export const hostHook = <K extends HookName>(name: K): Hooks[K] | undefined => (isHosted() ? registered[name] : undefined);

/** An environment command (NAIVE_JUDGE_CMD and the like): its value on a laptop, ignored when hosted. */
export const envCommand = (name: string): string | undefined => (isHosted() ? undefined : process.env[name]);

/** A feature refused in hosted mode. Its message names the feature and why. */
export class HostedRefusal extends Error {
  readonly code: "NAIVE_HOSTED_REFUSED";
  readonly feature: string;
  constructor(feature: string, why: string) {
    super(`${feature} is refused in hosted mode (NAIVE_RUNTIME=hosted): ${why}`);
    this.name = "HostedRefusal";
    this.code = "NAIVE_HOSTED_REFUSED";
    this.feature = feature;
  }
}

/**
 * The refusal for a feature whose hook the host did not register. `why` is what the feature would reach for
 * without the hook.
 */
export function missingHook(feature: string, hook: HookName, why?: string): HostedRefusal {
  const env = HOOKS[hook];
  const reason = why ?? (env ? `${env} is ignored` : `it would reach outside the tenant`);
  return new HostedRefusal(feature, `${reason}, and the host registered no ${hook} hook (registerHook("${hook}", fn) in packages/naive/src/core/runtime.ts)`);
}

/**
 * Runs git for a feature. On a laptop this is spawnSync("git", args, opts). Hosted, it goes to the host's git
 * working copy, or, with none registered, answers the way a missing git does (status null, with `error` set
 * to the refusal), so a caller's no-git path runs and a caller that needs git can say why.
 */
export function git(feature: string, args: string[], opts: SpawnSyncOptions = {}): CommandResult {
  // spawnSync returns Buffers without an encoding; every caller that reads stdout or stderr passes one.
  if (!isHosted()) return spawnSync("git", args, opts) as unknown as CommandResult;
  const hook = registered.git;
  if (hook) return hook(args, opts);
  const error = missingHook(feature, "git", "it runs git");
  return { status: null, stdout: "", stderr: error.message, error };
}

/** The refusal a git result carries, if it was refused. */
export const refusedBy = (r: CommandResult): HostedRefusal | null => (r.error instanceof HostedRefusal ? r.error : null);
