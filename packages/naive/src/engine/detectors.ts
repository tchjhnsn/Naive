// Detector criteria at run time (docs/design/SIGNAL_DETECTION_2026-11-07.md, build item 5). A call site that turns
// a score into a yes or no reads its line here instead of holding a constant:
//
//   import { criterionFor, line } from "./detectors.ts"
//   line(dir, "gate-confidence", 0.7)   ->  the yes line in force for that venture
//   criterionFor(dir, "gate-confidence") ->  { criterion: { yes, no?, yes_when }, from } or null
//
// Order: the venture's own governance/detectors/<id>.json, else the default Naive ships in
// packages/naive/template/governance/detectors/<id>.json, else the caller's fallback (today's constant). A
// detector file that is not JSON throws, naming the file. A detector that routes every call to a person has no
// line, so line() returns the fallback for it. Overrides a call site already had (an explicit option, a venture's
// naive.config.json thresholds) are applied by the call site before it asks here.
//
// It reads files only: no model, no network, no ledger. Writing trials is not done here.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.ts";
import type { Detector, DetectorLine } from "../records/types/records.d.ts";

export const DETECTORS = "governance/detectors";
export const TEMPLATE = new URL("../../template/governance/detectors/", import.meta.url).pathname;

/** A criterion as a ledger trial copies it: the lines as numbers, or route person for a detector with no line. */
export type Criterion = { yes?: number; no?: number; yes_when?: "above" | "below"; route?: "person" };

const read = (f: string): Detector => {
  try { return JSON.parse(readFileSync(f, "utf8")); } catch (e) { throw new Error(`${f} is not valid JSON: ${e instanceof Error ? e.message : e}`); }
};

// The shipped defaults are framework files and do not change under a running process.
const shipped = new Map<string, Detector | null>();
function shippedDefault(id: string): Detector | null | undefined {
  if (!shipped.has(id)) { const f = join(TEMPLATE, `${id}.json`); shipped.set(id, existsSync(f) ? read(f) : null); }
  return shipped.get(id);
}

/**
 * The detector record in force for a venture: its own copy, else Naive's shipped default, else null. dir is the
 * venture folder, or undefined for the shipped default only.
 */
export function detectorFor(dir: string | undefined, id: string): { detector: Detector; from: "venture" | "default" } | null {
  const own = dir && ventureFile(dir, `${DETECTORS}/${id}.json`);
  if (own && existsSync(own)) return { detector: read(own), from: "venture" };
  const d = shippedDefault(id);
  return d ? { detector: d, from: "default" } : null;
}

/**
 * The criterion in force, in the shape a ledger trial copies: the lines as numbers and yes_when from the evidence scale.
 */
export function criterionFor(dir: string | undefined, id: string): { criterion: Criterion; from: "venture" | "default" } | null {
  const found = detectorFor(dir, id);
  if (!found) return null;
  const c: Detector["criterion"] = found.detector.criterion ?? {};
  if (c.route === "person") return { criterion: { route: "person" }, from: found.from };
  const num = (x: DetectorLine | undefined) => (typeof x?.value === "number" ? x.value : undefined);
  const yes_when = found.detector.evidence?.scale?.yes_when === "below" ? "below" : "above";
  const criterion: Criterion = { yes: num(c.yes), ...(num(c.no) === undefined ? {} : { no: num(c.no) }), yes_when };
  return { criterion, from: found.from };
}

/**
 * The yes line in force for a venture, else the fallback, today's constant at the call site.
 */
export function line(dir: string | undefined, id: string, fallback: number): number {
  const y = criterionFor(dir, id)?.criterion.yes;
  return typeof y === "number" ? y : fallback;
}
