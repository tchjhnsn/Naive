// The phase modules (EE-126): one folder per lifecycle phase, packages/naive/src/phases/<id>/phase.json, holding the
// phase's question, its stage gate and the exit evidence the gate requires, the function workflows active in it and
// the weights that rank decisions across functions. A phase module has no agent and owns no records.
//
// This is the one place the phases are loaded. Everything here is an Effect that reaches files through VentureFs and
// fails with Naive's tagged errors (EE-125); a caller that is not Effect yet runs it with runSync from core/effect.
// The need-now priors of a phase are derived here from packages/naive/src/engine/need-now.json (record types) and
// packages/naive/src/functions/departments.json (functions), never copied into phase.json.
import { Effect } from "effect";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NotFound, SchemaInvalid } from "../core/effect/errors.ts";
import type { IoError, ParseError } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import type { PhaseModule } from "../records/types/records.d.ts";

/** The repository root this module ships in. A check on a copy passes its own root. */
export const ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
export const phasesDir = (root: string = ROOT): string => join(root, "packages/naive/src/phases");

export type { PhaseModule };
type Opts = { root?: string };
type LoadError = IoError | ParseError | NotFound | SchemaInvalid;

/** The phase.json file of one phase. */
export const phaseFile = (id: string, { root = ROOT }: Opts = {}): string => join(phasesDir(root), id, "phase.json");

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The fields every reader relies on. The whole schema is checked by packages/naive/src/checks/check-phases.ts; the
 * loader checks only the shape, so it never depends on the record validator, which a host or a test may replace.
 */
export const shapeErrors = (v: unknown): string[] => {
  if (!isObject(v)) return ["is not a JSON object"];
  const errors: string[] = [];
  for (const k of ["id", "name", "question"]) if (typeof v[k] !== "string") errors.push(`${k} is not a string`);
  if (typeof v.step !== "number") errors.push("step is not a number");
  if (!isObject(v.gate) || typeof v.gate.name !== "string" || !Array.isArray(v.gate.asks) || !Array.isArray(v.gate.evidence)) errors.push("gate needs a name, asks and evidence");
  if (!Array.isArray(v.workflows)) errors.push("workflows is not a list");
  if (!isObject(v.weights) || !isObject(v.weights.functions)) errors.push("weights needs functions");
  return errors;
};

/** One phase module, its shape checked (the whole schema is check-phases.ts's job). */
export const loadPhase = (id: string, opts: Opts = {}): Effect.Effect<PhaseModule, LoadError, "naive/VentureFs"> => Effect.gen(function* () {
  const file = phaseFile(id, opts);
  const fs = yield* VentureFs;
  if (!(yield* fs.exists(file))) return yield* Effect.fail(new NotFound({ what: `phase module ${id}`, path: file }));
  const value = yield* readJson(file);
  const errors = shapeErrors(value);
  if (errors.length) return yield* Effect.fail(new SchemaInvalid({ schema: "phase-module.schema.json", errors: errors.map((e) => `${file}: ${e}`) }));
  const phase = value as PhaseModule;
  if (phase.id !== id) return yield* Effect.fail(new SchemaInvalid({ schema: "phase-module.schema.json", errors: [`${file}: id ${phase.id} is not the folder's name ${id}`] }));
  return phase;
});

/** The ids of the folders that hold a phase.json, in folder order. */
export const phaseIds = ({ root = ROOT }: Opts = {}) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const ids: string[] = [];
  for (const name of yield* fs.list(phasesDir(root))) if (yield* fs.exists(join(phasesDir(root), name, "phase.json"))) ids.push(name);
  return ids;
});

/** Every phase module, in lifecycle order (by step). */
export const loadPhases = (opts: Opts = {}): Effect.Effect<PhaseModule[], LoadError, "naive/VentureFs"> => Effect.gen(function* () {
  const ids = yield* phaseIds(opts);
  const all = yield* Effect.forEach(ids, (id) => loadPhase(id, opts));
  return all.sort((a, b) => a.step - b.step);
});

/** The weights that rank decisions across functions in one phase: each departments.json id to its weight. */
export const phaseWeights = (phase: string, opts: Opts = {}): Effect.Effect<Record<string, number>, LoadError, "naive/VentureFs"> => Effect.map(loadPhase(phase, opts),
  (p) => Object.fromEntries(Object.entries(p.weights.functions).map(([fn, w]) => [fn, w.weight])));

/**
 * The record types the phase's gate asks for as exit evidence (gate.evidence[].source), in the gate's order. The
 * decision queue raises a decision that settles one of them, so the queue asks first what the gate needs.
 */
export const phaseGateRecords = (phase: string, opts: Opts = {}): Effect.Effect<string[], LoadError, "naive/VentureFs"> => Effect.map(loadPhase(phase, opts),
  (p) => [...new Set((p.gate.evidence ?? []).map((e) => e.source).filter((x) => typeof x === "string"))]);

/**
 * The need-now priors of one phase, derived from need-now.json and departments.json: for each record type and each
 * function, the base probability a venture in this phase needs it. Conditions on venture facts are applied by
 * packages/naive/src/engine/need-now.ts, not here.
 */
export const phasePriors = (phase: string, { root = ROOT }: Opts = {}): Effect.Effect<{ phase: string, suggest: number, records: Record<string, number>, functions: Record<string, number> }, LoadError, "naive/VentureFs"> => Effect.gen(function* () {
  yield* loadPhase(phase, { root });
  type Based = { base?: Record<string, number> };
  const need = (yield* readJson(join(root, "packages/naive/src/engine/need-now.json"))) as { suggest: number, records: Record<string, Based> };
  const depts = (yield* readJson(join(root, "packages/naive/src/functions/departments.json"))) as { departments: (Based & { id: string })[] };
  const at = (rows: [string, Based][]) => Object.fromEntries(rows.filter(([, r]) => typeof r.base?.[phase] === "number").map(([id, r]) => [id, r.base?.[phase] as number]));
  return { phase, suggest: need.suggest, records: at(Object.entries(need.records)), functions: at(depts.departments.map((d): [string, Based] => [d.id, d])) };
});
