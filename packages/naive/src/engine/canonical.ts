// The canonical core (Torian, 2026-10-30: an opinionated schema, swappable frameworks for thinking).
// Goals, requirements, exit criteria and constraints are framework-neutral records under foundation/.
// Core code reads them through here, never a framework's own record. A venture not yet migrated by
// telos-to-goals is read through its frameworks' adapters as a fallback, so nothing breaks before it upgrades.
//
//   goals(dir)             every canonical goal
//   exitCriteria(dir, ph)  { file, criteria, source } for a phase: canonical, else the telos fallback
//   scale(dir)             the venture's scale goal's value, else the ambition-tier fallback
//   measures(dir)          every goal's measures, else the unmigrated telos's measures

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import { telosExitCriteria, telosMeasures } from "../../../../frameworks/telos/adapter.mjs";
import { ambitionOf } from "../../../../frameworks/ambition-tier/adapter.mjs";
import type { ExitCriteria, Goal, Requirement, Telos, Venture } from "../records/types/records.d.ts";

const load = (f: string) => JSON.parse(readFileSync(f, "utf8"));
const collection = (dir: string, rel: string): { file: string; rec: unknown }[] => { const d = ventureFile(dir, rel); return existsSync(d) ? readdirSync(d).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: `${rel}/${f}`, rec: load(join(d, f)) })) : []; };

const PHASES = ["discovery", "validation", "beachhead", "scale", "platform"];

export const goals = (dir: string): Goal[] => collection(dir, "foundation/goals").map((x) => x.rec as Goal);
export const requirements = (dir: string): Requirement[] => collection(dir, "foundation/requirements").map((x) => x.rec as Requirement);
export const exitCriteriaFile = (phase: string) => `foundation/exit-criteria/${phase}.json`;
/** True once the venture has canonical goals or exit criteria (it ran telos-to-goals, or started canonical). */
export const migrated = (dir: string) => collection(dir, "foundation/goals").length > 0 || collection(dir, "foundation/exit-criteria").length > 0;

/** A phase's exit criteria and where they came from. A telos fallback's record is the telos and its criteria the telos phase's. */
export type PhaseCriteria = { file: string | null; source: "canonical" | "telos" | null; record: ExitCriteria | Telos | null; criteria: ExitCriteria["criteria"] };

/** A phase's exit criteria: the canonical record, or the unmigrated telos's phase (source "telos"). */
export function exitCriteria(dir: string, phase: string): PhaseCriteria {
  const f = ventureFile(dir, exitCriteriaFile(phase));
  if (existsSync(f)) return { file: exitCriteriaFile(phase), source: "canonical", record: load(f), criteria: load(f).criteria ?? [] };
  if (migrated(dir)) return { file: null, source: "canonical", record: null, criteria: [] };
  const t = telosExitCriteria(dir, phase);
  return t ? { ...t, source: "telos" } : { file: null, source: null, record: null, criteria: [] };
}

/** Phases that have exit criteria, canonical or (unmigrated) the telos's. */
export function phasesWithCriteria(dir: string): string[] {
  // A record's phase becomes a file path, so only a real phase counts.
  const c = collection(dir, "foundation/exit-criteria").map((x) => (x.rec as ExitCriteria).phase).filter((p) => PHASES.includes(p));
  if (c.length || migrated(dir)) return c;
  return PHASES.filter((p) => telosExitCriteria(dir, p)?.criteria.length);
}

/** Where a venture's exit criteria live: each phase that has them, else the current phase's file, still to be written. */
function criteriaFiles(dir: string): string[] {
  const phases = phasesWithCriteria(dir);
  return (phases.length ? phases : [(load(join(dir, "venture.json")) as Venture).phase]).map(exitCriteriaFile);
}

/** The canonical files and attribute that hold a telos statement of a migrated venture. */
export const canonicalHome = (dir: string, statement: string) => statement === "vision"
  ? { files: ["foundation/goals/telos.json"], attribute: "end_state" }
  : { files: criteriaFiles(dir), attribute: "criteria" };

/** The venture's measures ({ id, statement, kind, primary }): every canonical goal's, else the unmigrated telos's.
 *  telos-to-goals keeps measure ids, so a lead plan's measure ids hold across the migration. */
export const measures = (dir: string): NonNullable<Goal["measures"]> => migrated(dir) ? goals(dir).flatMap((g) => g.measures ?? []) : telosMeasures(dir);

/** How far the venture means to go: its scale goal's value, else venture.json through the ambition-tier adapter. */
export function scale(dir: string, v?: Venture): string | null {
  const g = goals(dir).find((x) => x.kind === "scale");
  return g?.value ?? ambitionOf(dir, v);
}
