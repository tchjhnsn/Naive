// One Effect, shared (EE-161, phase 9). Naive declares `effect` as a peer dependency at an exact version, and every
// venture's package.json lists the same exact pin, so Naive and the venture's own programs load one copy and agree
// on every service's identity. create-venture writes the pin, `naive upgrade` moves it with the framework (the
// effect-pin migration, then alignPin on every run), and `naive check` asserts it (checkCopies).
import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { PACKAGE_ROOT } from "../core/scripts.ts";

type Manifest = { dependencies?: Record<string, string>; devDependencies?: Record<string, string>; peerDependencies?: Record<string, string>; [key: string]: unknown };
const read = (file: string): Manifest => JSON.parse(readFileSync(file, "utf8")) as Manifest;

/** The exact Effect version this Naive needs: its peer pin. */
export function wantedPin(root: string = PACKAGE_ROOT): string {
  const m = read(join(root, "package.json"));
  const pin = m.peerDependencies?.effect ?? m.dependencies?.effect;
  if (!pin) throw new Error(`${join(root, "package.json")} names no effect peer dependency`);
  return pin;
}

/** The venture's Effect pin: its package.json's dependency, null when it names none, undefined when it has no package.json. */
export function venturePin(dir: string): string | null | undefined {
  const f = join(dir, "package.json");
  if (!existsSync(f)) return undefined;
  const m = read(f);
  return m.dependencies?.effect ?? m.devDependencies?.effect ?? null;
}

/** The venture's package.json with Effect pinned to `pin` under dependencies, as text; null when it already is. */
export function pinnedText(dir: string, pin: string): string | null {
  const m = read(join(dir, "package.json"));
  if (m.dependencies?.effect === pin && !m.devDependencies?.effect) return null;
  if (m.devDependencies?.effect) {
    const { effect: _moved, ...rest } = m.devDependencies;
    m.devDependencies = rest;
  }
  m.dependencies = Object.fromEntries(Object.entries({ ...m.dependencies, effect: pin }).sort(([a], [b]) => a.localeCompare(b)));
  return JSON.stringify(m, null, 2) + "\n";
}

/** Moves the venture's Effect pin to Naive's, when it has a package.json. Returns the change, or null. */
export function alignPin(dir: string, { dry = false, root = PACKAGE_ROOT }: { dry?: boolean; root?: string } = {}): { from: string | null; to: string } | null {
  const was = venturePin(dir);
  if (was === undefined) return null;
  const to = wantedPin(root);
  const text = pinnedText(dir, to);
  if (text === null) return null;
  if (!dry) writeFileSync(join(dir, "package.json"), text);
  return { from: was, to };
}

/** Where `effect` resolves from a folder: the real path of its package folder and its version, or null when it does not. */
function resolved(from: string): { path: string; version: string } | null {
  try {
    const manifest = createRequire(join(from, "package.json")).resolve("effect/package.json");
    return { path: realpathSync(dirname(manifest)), version: String(read(manifest).version) };
  } catch { return null; }
}

/**
 * The one-copy check: the venture pins Effect at Naive's exact peer version, and when the venture has installed it,
 * the copy it loads is the one Naive loads. A venture with no package.json runs on Naive's copy and passes.
 */
export function checkCopies(dir: string, { root = PACKAGE_ROOT }: { root?: string } = {}): { ok: boolean; message: string } {
  const want = wantedPin(root);
  const pin = venturePin(dir);
  if (pin === undefined) return { ok: true, message: `no package.json, so the venture runs on Naive's copy of effect ${want}` };
  if (pin !== want) return { ok: false, message: `package.json ${pin === null ? "does not pin effect" : `pins effect ${pin}`}, but Naive needs exactly ${want}: run naive upgrade` };
  const mine = resolved(dir), naive = resolved(root);
  if (!mine) return { ok: true, message: `package.json pins effect ${want}; not installed yet` };
  if (naive && mine.path !== naive.path) return { ok: false, message: `two copies of effect: the venture loads ${mine.path} (${mine.version}) and Naive loads ${naive.path} (${naive.version}); reinstall so one copy resolves` };
  if (mine.version !== want) return { ok: false, message: `the installed effect is ${mine.version}, but package.json pins ${want}: reinstall` };
  return { ok: true, message: `one copy of effect ${want}, shared by Naive and the venture` };
}
