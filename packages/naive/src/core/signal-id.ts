// A signal's address (signal library design, everything-ecosystem docs/design/SIGNAL_LIBRARY_2026-11-06.md):
// the first 24 hex characters of the sha256 of the canonical JSON of every field but id. Canonical JSON is
// JSON.stringify of the value with object keys sorted at every level and no whitespace, the rule the
// provenance log hashes lines by. Anyone can recompute it offline, so an address names fixed content.
// Pure: no I/O.
import { createHash } from "node:crypto";

/** The value with every object's keys sorted, at every level. */
const sorted = (x: unknown): unknown => Array.isArray(x)
  ? x.map(sorted)
  : x !== null && typeof x === "object"
    ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, sorted((x as Record<string, unknown>)[k])]))
    : x;

/** Canonical JSON: keys sorted at every level, no whitespace. */
export const canonicalJson = (x: unknown): string => JSON.stringify(sorted(x));

/** The address of a signal: every field but id, canonical, hashed, the first 24 hex characters. */
export function signalId(signal: Record<string, unknown>): string {
  const { id: _id, ...rest } = signal;
  return createHash("sha256").update(canonicalJson(rest)).digest("hex").slice(0, 24);
}

/** Whether a signal's id is the address of its content. */
export const idHolds = (signal: Record<string, unknown>): boolean => signal.id === signalId(signal);
