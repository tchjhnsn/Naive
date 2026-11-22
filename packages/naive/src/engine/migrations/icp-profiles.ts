// Migration icp-profiles (foundation package 0.4.0): each ideal customer profile becomes its own record.
// Before, foundation/icp.json held every profile in one `profiles` list. Now each profile is
// foundation/icp/<id>.json, with its own id, so a profile can be cited, gated, confirmed and replaced on
// its own, and two founders who differ (an excellent engineer, a founder who cannot code) are two records.
//
//   1. Each profile in foundation/icp.json (or purpose/icp.json) is written to foundation/icp/<id>.json,
//      carrying the file's venture, updated and decision fields.
//   2. The old file is archived at _private/archive/icp.json, never deleted.
//   3. A profile with no id, or two profiles with one id, is escalated, never guessed.
//
// Every change goes through ctx (packages/naive/src/engine/upgrades.mjs).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const id = "icp-profiles";
export const describe = "Splits foundation/icp.json into one record per ideal customer profile at foundation/icp/<id>.json and archives the old file";

export function apply(dir, ctx) {
  const old = ["foundation/icp.json", "purpose/icp.json"].find((f) => existsSync(join(dir, f)));
  if (!old) return;
  const rec = JSON.parse(readFileSync(join(dir, old), "utf8"));
  const profiles = rec.profiles ?? [];
  const ids = profiles.map((p) => p.id);
  if (!profiles.length) return ctx.escalate(`${old} has no profiles; left as it is`);
  const bad = profiles.filter((p) => !/^[a-z0-9-]+$/.test(p.id ?? "") || ids.indexOf(p.id) !== ids.lastIndexOf(p.id));
  if (bad.length) return ctx.escalate(`${old}: ${bad.length} profile(s) without a unique lowercase id (a-z, 0-9, -); fix them and upgrade again`);
  const taken = profiles.filter((p) => existsSync(join(dir, `foundation/icp/${p.id}.json`)));
  if (taken.length) return ctx.escalate(`foundation/icp/ already holds ${taken.map((p) => p.id).join(", ")}; ${old} was left as it is`);
  const shared = Object.fromEntries(["venture", "updated", "decision"].filter((k) => rec[k] !== undefined).map((k) => [k, rec[k]]));
  for (const p of profiles) {
    const to = `foundation/icp/${p.id}.json`;
    ctx.write(to, JSON.stringify({ ...shared, ...p }, null, 2) + "\n", { activity: "move", derived_from: [old], note: `profile ${p.id} from ${old}, now its own record` });
  }
  ctx.mv(old, "_private/archive/icp.json");
  ctx.note(`${old}: ${profiles.length} profile(s) are now records in foundation/icp/; the old file is archived at _private/archive/icp.json`);
}
