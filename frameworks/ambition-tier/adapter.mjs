// The ambition-tier framework's adapter: an unmigrated venture keeps its tier in venture.json (ambition);
// a migrated one keeps it as a canonical goal of kind scale (foundation/goals/scale.json).

import { readFileSync } from "node:fs";
import { join } from "node:path";

export const TIERS = ["hobby", "survival", "lifestyle", "managed-growth", "aggressive-growth"];
/** The tier written in venture.json, before migration. */
export const ambitionOf = (dir, v) => (v ?? JSON.parse(readFileSync(join(dir, "venture.json"), "utf8"))).ambition ?? null;
/** venture.json's ambition as a canonical goal of kind scale. Pure. */
export const toScaleGoal = (tier, { venture } = {}) => ({ id: "scale", ...(venture ? { venture } : {}), statement: `The venture means to grow as a ${tier} venture`, kind: "scale", value: tier, framework: "ambition-tier" });
