// A venture's naive.config.json (EE-073): the framework's defaults, overridden for one venture.
// The gate reads `gate` (schema/gate.mjs). Upgrades read and write the pins (EE-076, U-1 to U-5):
//
//   naive      { version, channel }   the framework version the venture is on, and its channel
//                                     (stable, or canary for experimental packages)
//   packages   { <name>: { version, early?, channel? } }   the package versions it is pinned to; early
//                                     marks a later phase's package adopted before its phase. A bare
//                                     version string ("0.3.0") is read as { version }.
//   triggers   [ ... ]                what starts the next step on an event (schema/triggers.mjs)
//   kits       [ <name> ]             Mentura kits whose automations this venture turns on
//
// Every other key is kept as it is. Nothing here calls a model or the network.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const CONFIG = "naive.config.json";

/** The venture's naive.config.json, or {} when it has none. A file that is not JSON throws. */
export function readConfig(dir) {
  const f = join(dir, CONFIG);
  if (!existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, "utf8")); }
  catch (e) { throw new Error(`${CONFIG} is not valid JSON: ${e.message}`); }
}

/** Writes the config back, keys in a stable order: naive, packages, kits, triggers, gate, then the rest. */
export function writeConfig(dir, cfg) {
  const order = ["naive", "packages", "kits", "triggers", "gate"];
  const out = Object.fromEntries([...order.filter((k) => cfg[k] !== undefined).map((k) => [k, cfg[k]]), ...Object.entries(cfg).filter(([k]) => !order.includes(k))]);
  writeFileSync(join(dir, CONFIG), JSON.stringify(out, null, 2) + "\n");
  return out;
}

/** The pinned packages as { name: { version, early, channel } }. */
export function pins(cfg) {
  return Object.fromEntries(Object.entries(cfg.packages ?? {}).map(([k, v]) => [k, typeof v === "string" ? { version: v } : { ...v }]));
}

/** The names of the packages adopted early (U-5): open now whatever their phase prior says. */
export function adopted(dir) {
  try { return new Set(Object.entries(pins(readConfig(dir))).filter(([, p]) => p.early).map(([k]) => k)); }
  catch { return new Set(); }
}
