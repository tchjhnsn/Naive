// The phase modules (EE-126): one folder per lifecycle phase, packages/naive/src/phases/<id>/phase.json, holding the
// phase's question, its stage gate and the exit evidence the gate requires, the function workflows active in it and
// the weights that rank decisions across functions. A phase module has no agent and owns no records.
//
// This is the one place the phases are loaded. Everything here is an Effect that reaches files through VentureFs and
// fails with Naive's tagged errors (EE-125); a caller that is not Effect yet runs it with runSync from core/effect.
// The need-now priors of a phase are derived here from packages/naive/src/engine/need-now.json (record types) and
// packages/naive/src/functions/departments.json (functions), never copied into phase.json.
// A .mjs file because packages/naive/src/engine/lifecycle.mjs imports it and Node does not strip types under node_modules.
import { Effect } from "effect";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { NotFound, SchemaInvalid } from "../core/effect/errors.mjs";
import { readJson, VentureFs } from "../core/effect/fs.mjs";

/** The repository root this module ships in. A check on a copy passes its own root. */
export const ROOT = fileURLToPath(new URL("../../../..", import.meta.url));
/** @param {string} root */
export const phasesDir = (root = ROOT) => join(root, "packages/naive/src/phases");

/**
 * @typedef {{ id: string, statement: string, source: string }} GateEvidence
 * @typedef {{ name: string, asks: string[], evidence: GateEvidence[] }} Gate
 * @typedef {{ weight: number, why: string }} FunctionWeight
 * @typedef {{
 *   id: string, step: number, name: string, question: string, binding_constraint?: string, references: string[],
 *   gate: Gate, workflows: string[],
 *   weights: { version: string, note: string, functions: Record<string, FunctionWeight> },
 *   note?: string,
 * }} PhaseModule
 * @typedef {{ root?: string }} Opts
 * @typedef {import("../core/effect/errors.mjs").IoError | import("../core/effect/errors.mjs").ParseError | NotFound | SchemaInvalid} LoadError
 */

/**
 * The phase.json file of one phase.
 * @param {string} id
 * @param {Opts} [opts]
 */
export const phaseFile = (id, { root = ROOT } = {}) => join(phasesDir(root), id, "phase.json");

/** @param {unknown} v @returns {v is Record<string, unknown>} */
const isObject = (v) => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * The fields every reader relies on. The whole schema is checked by packages/naive/src/checks/check-phases.ts; the
 * loader checks only the shape, so it never depends on the record validator, which a host or a test may replace.
 * @param {unknown} v
 * @returns {string[]}
 */
export const shapeErrors = (v) => {
  if (!isObject(v)) return ["is not a JSON object"];
  const errors = [];
  for (const k of ["id", "name", "question"]) if (typeof v[k] !== "string") errors.push(`${k} is not a string`);
  if (typeof v.step !== "number") errors.push("step is not a number");
  if (!isObject(v.gate) || typeof v.gate.name !== "string" || !Array.isArray(v.gate.asks) || !Array.isArray(v.gate.evidence)) errors.push("gate needs a name, asks and evidence");
  if (!Array.isArray(v.workflows)) errors.push("workflows is not a list");
  if (!isObject(v.weights) || !isObject(v.weights.functions)) errors.push("weights needs functions");
  return errors;
};

/**
 * One phase module, its shape checked (the whole schema is check-phases.ts's job).
 * @param {string} id
 * @param {Opts} [opts]
 * @returns {Effect.Effect<PhaseModule, LoadError, "naive/VentureFs">}
 */
export const loadPhase = (id, opts = {}) => Effect.gen(function* () {
  const file = phaseFile(id, opts);
  const fs = yield* VentureFs;
  if (!(yield* fs.exists(file))) return yield* Effect.fail(new NotFound({ what: `phase module ${id}`, path: file }));
  const value = yield* readJson(file);
  const errors = shapeErrors(value);
  if (errors.length) return yield* Effect.fail(new SchemaInvalid({ schema: "phase-module.schema.json", errors: errors.map((e) => `${file}: ${e}`) }));
  const phase = /** @type {PhaseModule} */ (value);
  if (phase.id !== id) return yield* Effect.fail(new SchemaInvalid({ schema: "phase-module.schema.json", errors: [`${file}: id ${phase.id} is not the folder's name ${id}`] }));
  return phase;
});

/**
 * The ids of the folders that hold a phase.json, in folder order.
 * @param {Opts} [opts]
 */
export const phaseIds = ({ root = ROOT } = {}) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const ids = [];
  for (const name of yield* fs.list(phasesDir(root))) if (yield* fs.exists(join(phasesDir(root), name, "phase.json"))) ids.push(name);
  return ids;
});

/**
 * Every phase module, in lifecycle order (by step).
 * @param {Opts} [opts]
 * @returns {Effect.Effect<PhaseModule[], LoadError, "naive/VentureFs">}
 */
export const loadPhases = (opts = {}) => Effect.gen(function* () {
  const ids = yield* phaseIds(opts);
  const all = yield* Effect.forEach(ids, (id) => loadPhase(id, opts));
  return all.sort((a, b) => a.step - b.step);
});

/**
 * The weights that rank decisions across functions in one phase: each departments.json id to its weight.
 * @param {string} phase
 * @param {Opts} [opts]
 * @returns {Effect.Effect<Record<string, number>, LoadError, "naive/VentureFs">}
 */
export const phaseWeights = (phase, opts = {}) => Effect.map(loadPhase(phase, opts),
  (p) => Object.fromEntries(Object.entries(p.weights.functions).map(([fn, w]) => [fn, w.weight])));

/**
 * The need-now priors of one phase, derived from need-now.json and departments.json: for each record type and each
 * function, the base probability a venture in this phase needs it. Conditions on venture facts are applied by
 * packages/naive/src/engine/need-now.mjs, not here.
 * @param {string} phase
 * @param {Opts} [opts]
 * @returns {Effect.Effect<{ phase: string, suggest: number, records: Record<string, number>, functions: Record<string, number> }, LoadError, "naive/VentureFs">}
 */
export const phasePriors = (phase, { root = ROOT } = {}) => Effect.gen(function* () {
  yield* loadPhase(phase, { root });
  const need = /** @type {{ suggest: number, records: Record<string, { base?: Record<string, number> }> }} */ (yield* readJson(join(root, "packages/naive/src/engine/need-now.json")));
  const depts = /** @type {{ departments: { id: string, base?: Record<string, number> }[] }} */ (yield* readJson(join(root, "packages/naive/src/functions/departments.json")));
  /** @param {[string, { base?: Record<string, number> }][]} rows */
  const at = (rows) => Object.fromEntries(rows.filter(([, r]) => typeof r.base?.[phase] === "number").map(([id, r]) => [id, /** @type {number} */ (r.base?.[phase])]));
  return { phase, suggest: need.suggest, records: at(Object.entries(need.records)), functions: at(depts.departments.map((d) => [d.id, d])) };
});
