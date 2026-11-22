// Adapter files (Z-4): what an adapter writes into a venture. adapt() writes the entry files a harness
// reads and copies the skills of the packages open now; refresh() re-adapts every adapter a venture
// has, after an upgrade (packages/naive/src/engine/upgrades.ts). It records what it wrote in <venture>/.naive/adapters.json
// and never overwrites a file it did not write, or one a person changed since: it keeps theirs and says so.
// Verifying an adapter runs routes, so verify() and the command line stay in packages/naive/src/interfaces/adapters.ts.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import type { Adapter } from "../records/types/records.d.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
export const STATE = ".naive/adapters.json";
const load = (p: string) => JSON.parse(readFileSync(p, "utf8"));
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** An adapter as loaded: its record, the file it came from, and the folder of a platform adapter. */
export type LoadedAdapter = Adapter & { path: string; dir?: string };
/** What .naive/adapters.json holds: each adapter's files, by path, with the sha256 it wrote. */
type AdapterState = { adapters: Record<string, { at: string; files: Record<string, string> }> };
/** One file adapt() kept rather than overwrite, and why. */
type Kept = { path: string; why: string };

/** Every adapter: the harness adapters in packages/naive/src/interfaces/adapters/, and the platform's when the app that hosts
 *  Naive names its adapter file in NAIVE_PLATFORM_ADAPTER. */
export function adapters(): LoadedAdapter[] {
  const d = join(repo, "packages/naive/src/interfaces/adapters");
  const out: LoadedAdapter[] = existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).sort().map((f) => ({ ...load(join(d, f)), path: `packages/naive/src/interfaces/adapters/${f}` })) : [];
  const platform = process.env.NAIVE_PLATFORM_ADAPTER;
  if (platform && existsSync(platform)) out.unshift({ ...load(platform), path: platform, dir: dirname(platform) });
  return out;
}
export const byName = (name: string): LoadedAdapter => { const a = adapters().find((x) => x.name === name); if (!a) throw new Error(`no adapter ${name}: ${adapters().map((x) => x.name).join(", ")}`); return a; };

/** The skills of the packages open now in a venture. */
export async function skillsFor(dir: string): Promise<{ id: string; path: string; package: string }[]> {
  const { packages } = await import("./packages.ts");
  const p = packages(dir);
  return [...p.core, ...p.handoff].filter((x: { in: string }) => x.in === "now").flatMap((x: { id: string }) => {
    const f = join(repo, "packages/naive/library", "packages", x.id, "package.json");
    const s = existsSync(f) ? load(f).skill : null;
    return s && existsSync(join(repo, s.path)) ? [{ id: s.id, path: s.path, package: x.id }] : [];
  });
}

const readState = (dir: string): AdapterState => (existsSync(ventureFile(dir, STATE)) ? load(ventureFile(dir, STATE)) : { adapters: {} });

/**
 * Writes a harness adapter's files into a venture: its entry files, and a copy of each open package's
 * skill in its skills folder. Returns what it wrote, what was already current, and what it kept.
 */
export async function adapt(dir: string, name: string) {
  if (!existsSync(join(dir, "venture.json"))) throw new Error(`${dir} is not a venture`);
  const a = byName(name);
  if (a.kind !== "harness") throw new Error(`${name} is a ${a.kind} adapter: it runs the framework itself and writes nothing into a venture`);
  const state = readState(dir);
  const mine = state.adapters[name]?.files ?? {};
  const want: { path: string; text: string; skill?: string; package?: string }[] = [...a.files.map((f) => ({ path: f.path, text: f.text }))];
  if (a.skills) for (const s of await skillsFor(dir)) want.push({ path: `${a.skills}/${s.id}/SKILL.md`, text: readFileSync(join(repo, s.path), "utf8"), skill: s.id, package: s.package });
  const written: string[] = [], current: string[] = [], kept: Kept[] = [], files: Record<string, string> = {};
  for (const w of want) {
    const f = ventureFile(dir, w.path);
    const now = existsSync(f) ? readFileSync(f, "utf8") : null;
    if (now === w.text) { current.push(w.path); files[w.path] = sha(w.text); continue; }
    // Never overwrite a file a person wrote, or one they changed after the adapter wrote it.
    if (now !== null && mine[w.path] !== sha(now)) { kept.push({ path: w.path, why: mine[w.path] ? "changed since the adapter wrote it" : "it was there before the adapter" }); if (mine[w.path]) files[w.path] = mine[w.path]; continue; }
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, w.text);
    written.push(w.path);
    files[w.path] = sha(w.text);
  }
  // A skill copy for a package that is no longer open goes, if the adapter wrote it and nobody changed it.
  const removed: string[] = [];
  for (const [p, h] of Object.entries(mine)) {
    if (want.some((w) => w.path === p) || !existsSync(ventureFile(dir, p))) continue;
    if (sha(readFileSync(ventureFile(dir, p), "utf8")) === h) { rmSync(ventureFile(dir, p)); removed.push(p); } else kept.push({ path: p, why: "no longer needed, but changed by a person, so kept" });
  }
  state.adapters[name] = { at: new Date().toISOString(), files };
  mkdirSync(join(dir, ".naive"), { recursive: true });
  writeFileSync(ventureFile(dir, STATE), JSON.stringify(state, null, 2) + "\n");
  return { adapter: name, written, current, kept, removed, skills: want.filter((w) => w.skill).map((w) => w.skill) };
}

/** Re-adapts every adapter the venture has, after an upgrade. */
export async function refresh(dir: string): Promise<{ adapter: string; written?: string[]; error?: string }[]> {
  const names = Object.keys(readState(dir).adapters);
  const out: { adapter: string; written?: string[]; error?: string }[] = [];
  for (const n of names) { try { out.push(await adapt(dir, n)); } catch (e) { out.push({ adapter: n, error: (e as Error).message }); } }
  return out;
}
