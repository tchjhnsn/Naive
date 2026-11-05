// Mentura kits, as the framework sees them (EE-071): data only. A kit lives in the app that installs it,
// at <NAIVE_KITS>/<name>/kit.json, and extends one Naive package or one framework command. The framework
// reads a kit's manifest by path and runs its entry as a separate process, never importing the app's
// code (schema/check-boundary.mjs), the way a Next.js build loads a deployment adapter it was pointed
// at. Without NAIVE_KITS there are no kits, and nothing here fails because of it.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Every installed kit: { name, path, dir, ...kit.json }, from the folder NAIVE_KITS names. */
export function kits(root = process.env.NAIVE_KITS) {
  if (!root || !existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(root, e.name, "kit.json")))
    .map((e) => ({ ...JSON.parse(readFileSync(join(root, e.name, "kit.json"), "utf8")), dir: join(root, e.name), path: join(root, e.name, "kit.json") }));
}

/** The kit that extends a framework command (such as "upgrade --agent"), or null. */
export const kitFor = (command) => kits().find((k) => k.extends?.command === command) ?? null;

/** One kit by name, or null. */
export const kit = (name) => kits().find((k) => k.name === name) ?? null;
