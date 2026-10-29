// Mentura kits, as the framework sees them (EE-071): data only. A kit lives at
// platform/kits/<name>/kit.json and extends one Naive package or one framework command. The framework
// reads a kit's manifest by path and runs its entry as a separate process, never importing platform
// code (schema/check-boundary.mjs), the way a Next.js build loads a deployment adapter it was pointed
// at. A copy of the framework without platform/ has no kits, and nothing here fails because of it.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repo = new URL("..", import.meta.url).pathname;
export const KITS = "platform/kits";

/** Every installed kit: { name, path, dir, ...kit.json }. */
export function kits(root = process.env.NAIVE_KITS ?? join(repo, KITS)) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(root, e.name, "kit.json")))
    .map((e) => ({ ...JSON.parse(readFileSync(join(root, e.name, "kit.json"), "utf8")), dir: join(root, e.name), path: join(root, e.name, "kit.json") }));
}

/** The kit that extends a framework command (such as "upgrade --agent"), or null. */
export const kitFor = (command) => kits().find((k) => k.extends?.command === command) ?? null;

/** One kit by name, or null. */
export const kit = (name) => kits().find((k) => k.name === name) ?? null;
