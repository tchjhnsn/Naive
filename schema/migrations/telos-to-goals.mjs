// Migration telos-to-goals (foundation package 0.5.0): the telos and the ambition tier become frameworks
// for thinking over canonical records (Torian, 2026-10-30: an opinionated schema, swappable frameworks).
//
//   1. telos.json (foundation/ or purpose/) is split by the telos adapter into canonical goals
//      (foundation/goals/telos.json, kind venture, with its measures; foundation/goals/owner-outcome.json,
//      kind owner) and one foundation/exit-criteria/<phase>.json per phase, met marks kept.
//   2. The old telos.json is archived at _private/archive/telos.json, never deleted. The foundation/telos
//      route still reads: the router renders it from the canonical records (frameworks/telos/adapter.mjs).
//   3. venture.json's ambition becomes foundation/goals/scale.json (kind scale) and leaves venture.json.
//   4. A canonical record already there is escalated, never overwritten.
//
// Every change goes through ctx (schema/upgrades.mjs).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../venture-paths.mjs";
import { split, telosFile } from "../../frameworks/telos/adapter.mjs";
import { toScaleGoal } from "../../frameworks/ambition-tier/adapter.mjs";

export const id = "telos-to-goals";
export const describe = "Splits telos.json into canonical goals and exit criteria per phase, turns venture.json's ambition into a goal of kind scale, and archives the old telos";

const json = (x) => JSON.stringify(x, null, 2) + "\n";

export function apply(dir, ctx) {
  const v = JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"));
  const old = telosFile(dir);
  const out = [];
  if (old) {
    const s = split(JSON.parse(readFileSync(ventureFile(dir, old), "utf8")), { venture: v.id });
    out.push(...s.goals.map((g) => ({ ...g, from: old, note: `goal ${g.rec.id} from ${old}` })), ...s.exit.map((e) => ({ ...e, from: old, note: `${e.rec.phase} exit criteria from ${old}` })));
    if (s.steering) ctx.note(`${old}: steering (${Object.keys(s.steering).join(", ")}) has no canonical home yet; it stays in the archived telos`);
  }
  if (v.ambition) out.push({ file: "foundation/goals/scale.json", rec: toScaleGoal(v.ambition, { venture: v.id }), from: "venture.json", note: `ambition ${v.ambition} from venture.json, now a goal of kind scale` });
  if (!out.length) return;
  const taken = out.filter((o) => existsSync(ventureFile(dir, o.file)));
  if (taken.length) return ctx.escalate(`${taken.map((o) => o.file).join(", ")} already exist; the telos and ambition were left as they are`);
  for (const o of out) ctx.write(o.file, json(o.rec), { activity: "move", derived_from: [o.from], note: o.note });
  if (old) ctx.mv(old, "_private/archive/telos.json");
  if (v.ambition) {
    const { ambition, ...rest } = v;
    ctx.write("venture.json", json(rest), { note: "ambition moved to foundation/goals/scale.json", derived_from: ["venture.json"] });
  }
  ctx.note(`${old ? `${old} is now canonical goals and exit criteria (archived at _private/archive/telos.json); ` : ""}${v.ambition ? "ambition is foundation/goals/scale.json" : ""}`);
}
