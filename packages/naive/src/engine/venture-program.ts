// Venture programs (EE-161, Effect runtime plan phase 10): a venture's own TypeScript, run on the venture runtime.
//
//   naive run <file> [--venture <dir>] [--json]
//
// A program is a module in the venture, outside node_modules, so Node strips its types and it needs no build. Its
// default export is one of:
//
// - an Effect, which runs with the venture layer provided (VentureFs, NaiveConfig, Provenance, HostRuntime, Judge);
// - a function of { dir }, which may return a value, a promise or an Effect. A plain async function works, so a
//   founder does not have to learn Effect on day one.
//
// A done-criterion with `runs: "effect"` names a program as its `check` (run-handoff.ts). It passes when the program
// succeeds and returns neither false nor { passed: false }.

import { existsSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { Cause, Effect, Exit } from "effect";
import { ventureRuntime, type VentureOverrides, type VentureServices } from "../core/effect/runtime.ts";

/** What a program's default export may be. */
export type Program = Effect.Effect<unknown, unknown, VentureServices> | ((_ctx: { dir: string }) => unknown);

/** What a program's run came to: its value, or why it failed. */
export type ProgramResult = { ok: boolean, value?: unknown, error?: string };

/** The program file, resolved against the venture. Throws when it does not exist or sits outside the venture. */
export function programPath(dir: string, file: string): string {
  const path = isAbsolute(file) ? file : resolve(dir, file);
  const rel = relative(resolve(dir), path);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error(`${file} is outside the venture: a venture program lives in the venture`);
  if (rel.split(/[\\/]/).includes("node_modules")) throw new Error(`${file} is under node_modules: a venture program is the venture's own code`);
  if (!existsSync(path)) throw new Error(`no program at ${file}`);
  return path;
}

const message = (e: unknown) => e instanceof Error ? e.message : typeof e === "object" && e && "_tag" in e ? `${String((e as { _tag: unknown })._tag)}: ${JSON.stringify(e)}` : String(e);

/** Runs one program value on the venture runtime and disposes the runtime after. */
export async function runProgramValue(dir: string, program: unknown, overrides?: VentureOverrides): Promise<ProgramResult> {
  const rt = ventureRuntime(dir, overrides);
  try {
    let value: unknown = program;
    if (typeof value === "function") value = await (value as (_ctx: { dir: string }) => unknown)({ dir });
    if (!Effect.isEffect(value)) return { ok: true, value };
    const exit = await rt.runPromiseExit(value as Effect.Effect<unknown, unknown, VentureServices>);
    if (Exit.isSuccess(exit)) return { ok: true, value: exit.value };
    const failure = exit.cause.reasons.find(Cause.isFailReason);
    return { ok: false, error: failure ? message(failure.error) : Cause.pretty(exit.cause) };
  } catch (e) {
    return { ok: false, error: message(e) };
  } finally {
    await rt.dispose();
  }
}

/** Imports a venture program and runs its default export on the venture runtime. */
export async function runProgram(dir: string, file: string, overrides?: VentureOverrides): Promise<ProgramResult> {
  let mod: { default?: unknown };
  try {
    mod = await import(pathToFileURL(programPath(dir, file)).href);
  } catch (e) {
    return { ok: false, error: message(e) };
  }
  if (mod.default === undefined) return { ok: false, error: `${file} has no default export: export an Effect or a function` };
  return runProgramValue(dir, mod.default, overrides);
}

/** Whether a program's result passes as a done-criterion: it succeeded and returned neither false nor { passed: false }. */
export function passes(result: ProgramResult): boolean {
  if (!result.ok) return false;
  const v = result.value;
  if (v === false) return false;
  if (typeof v === "object" && v !== null && "passed" in v) return (v as { passed: unknown }).passed === true;
  return true;
}

/** The text a run leaves as output: the error, the value's output field, or the value as JSON. */
export function outputOf(result: ProgramResult): string {
  if (!result.ok) return result.error ?? "";
  const v = result.value;
  if (v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "output" in v) return String((v as { output: unknown }).output);
  return JSON.stringify(v);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k: string) => args.includes(k) ? args[args.indexOf(k) + 1] : undefined;
  const file = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--venture");
  if (!file) { console.error("usage: naive run <file> [--venture <dir>] [--json]"); process.exit(2); }
  const dir = resolve(opt("--venture") ?? process.cwd());
  if (!existsSync(join(dir, "venture.json"))) { console.error(`${dir} is not a venture (no venture.json); pass --venture <dir>`); process.exit(2); }
  // A path from the shell is relative to where it was typed; otherwise to the venture.
  const result = await runProgram(dir, existsSync(resolve(file)) ? resolve(file) : file);
  if (args.includes("--json")) console.log(JSON.stringify(result));
  else if (result.ok) { const out = outputOf(result); if (out) console.log(out); }
  else console.error(result.error ?? "the program failed");
  process.exit(result.ok ? 0 : 1);
}
