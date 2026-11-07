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
// Imports nothing in the repository.

import { spawnSync } from "node:child_process";

/** Whether this process runs hosted: NAIVE_RUNTIME=hosted. */
export const isHosted = () => process.env.NAIVE_RUNTIME === "hosted";

/** @typedef {{ status: number | null, stdout: string, stderr: string, error?: Error }} CommandResult */
/** @typedef {(args: string[], input?: string) => CommandResult | Promise<CommandResult>} CommandHook */
/** @typedef {(command: string, opts: { cwd: string }) => CommandResult | Promise<CommandResult>} SandboxHook */
/** @typedef {(args: string[], opts?: import("node:child_process").SpawnSyncOptions) => CommandResult} GitHook */
/** @typedef {{ judge: CommandHook, site: CommandHook, trace: CommandHook, sandbox: SandboxHook, git: GitHook }} Hooks */

/** The hooks a host can register, and the environment variable each stands in for (null when none does). */
export const HOOKS = Object.freeze({ judge: "NAIVE_JUDGE_CMD", site: "NAIVE_SITE_CMD", trace: "NAIVE_TRACE_CMD", sandbox: null, git: null });

/** @type {Partial<Hooks>} */
const registered = {};

/**
 * Registers a host hook. A hosted host calls this at start, the way it registers connectors.
 * @template {keyof Hooks} K
 * @param {K} name @param {Hooks[K]} fn
 */
export function registerHook(name, fn) {
  if (!(name in HOOKS)) throw new Error(`no host hook ${name}: the hooks are ${Object.keys(HOOKS).join(", ")}`);
  if (typeof fn !== "function") throw new Error(`the ${name} hook is a function`);
  registered[name] = fn;
}

/** Removes every registered hook (tests). */
export function clearHooks() {
  for (const k of Object.keys(registered)) delete registered[/** @type {keyof Hooks} */ (k)];
}

/**
 * The hook the host registered, when hosted. Undefined on a laptop, so laptop code never sees one.
 * @template {keyof Hooks} K
 * @param {K} name @returns {Hooks[K] | undefined}
 */
export const hostHook = (name) => (isHosted() ? /** @type {Hooks[K] | undefined} */ (registered[name]) : undefined);

/**
 * An environment command (NAIVE_JUDGE_CMD and the like): its value on a laptop, ignored when hosted.
 * @param {string} name
 */
export const envCommand = (name) => (isHosted() ? undefined : process.env[name]);

/** A feature refused in hosted mode. Its message names the feature and why. */
export class HostedRefusal extends Error {
  /** @param {string} feature @param {string} why */
  constructor(feature, why) {
    super(`${feature} is refused in hosted mode (NAIVE_RUNTIME=hosted): ${why}`);
    this.name = "HostedRefusal";
    this.code = "NAIVE_HOSTED_REFUSED";
    this.feature = feature;
  }
}

/**
 * The refusal for a feature whose hook the host did not register.
 * @param {string} feature @param {keyof Hooks} hook @param {string} [why] what the feature would reach for without the hook
 */
export function missingHook(feature, hook, why) {
  const env = HOOKS[hook];
  const reason = why ?? (env ? `${env} is ignored` : `it would reach outside the tenant`);
  return new HostedRefusal(feature, `${reason}, and the host registered no ${hook} hook (registerHook("${hook}", fn) in packages/naive/src/core/runtime.mjs)`);
}

/**
 * Runs git for a feature. On a laptop this is spawnSync("git", args, opts). Hosted, it goes to the host's git
 * working copy, or, with none registered, answers the way a missing git does (status null, with `error` set
 * to the refusal), so a caller's no-git path runs and a caller that needs git can say why.
 * @param {string} feature @param {string[]} args @param {import("node:child_process").SpawnSyncOptions} [opts]
 * @returns {CommandResult}
 */
export function git(feature, args, opts = {}) {
  if (!isHosted()) return /** @type {CommandResult} */ (/** @type {unknown} */ (spawnSync("git", args, opts)));
  const hook = registered.git;
  if (hook) return hook(args, opts);
  const error = missingHook(feature, "git", "it runs git");
  return { status: null, stdout: "", stderr: error.message, error };
}

/** The refusal a git result carries, if it was refused. @param {CommandResult} r */
export const refusedBy = (r) => (r.error instanceof HostedRefusal ? r.error : null);
