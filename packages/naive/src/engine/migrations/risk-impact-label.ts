// Migration risk-impact-label (legal package 0.4.0, EE-212): a risk's impact range cites a source or is marked an
// estimate. Before, legal/risks/<id>.json held a money range with nothing saying where it came from. Now the impact
// carries exactly one of `source` (a record route or reference id) or `estimate` (its basis and who estimated it).
//
//   1. A risk whose impact already has one of them is left as it is.
//   2. A risk whose impact has neither is escalated, never guessed: which record a figure rests on, or who
//      estimated it and how, is something only the person or agent who set it can say. The record stays as it
//      is and fails its schema until someone adds one.
//
// Every change goes through ctx (packages/naive/src/engine/upgrades.ts). This one writes nothing.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../../core/venture-paths.ts";

/** The part of the upgrade context (packages/naive/src/engine/upgrades.ts) this migration uses. */
type Ctx = { escalate(msg: string): void; note(msg: string): void };

export const id = "risk-impact-label";
export const describe = "Escalates each risk whose impact range neither cites a source nor is marked an estimate (EE-212)";

const DIR = "legal/risks";

export function apply(dir: string, ctx: Ctx) {
  const folder = ventureFile(dir, DIR);
  if (!existsSync(folder)) return;
  const bare: string[] = [];
  for (const f of readdirSync(folder).filter((x) => x.endsWith(".json")).sort()) {
    let impact: unknown;
    try { impact = (JSON.parse(readFileSync(join(folder, f), "utf8")) as { impact?: unknown }).impact; } catch { continue; }
    if (!impact || typeof impact !== "object" || "source" in impact || "estimate" in impact) continue;
    bare.push(`${DIR}/${f}`);
  }
  for (const f of bare) ctx.escalate(`${f}: the impact range neither cites a source nor is marked an estimate; add impact.source (a record route or reference id) or impact.estimate (basis and by) (EE-212)`);
  if (bare.length) ctx.note(`${bare.length} risk(s) need a source or an estimate on their impact before they validate again`);
}
