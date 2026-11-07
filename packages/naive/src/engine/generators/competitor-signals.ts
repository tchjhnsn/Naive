// Record generator for what signals say about a competitor (EE-099; signal library design, everything-ecosystem
// docs/design/SIGNAL_LIBRARY_2026-11-06.md). Only the signal projector writes competitors/<id>/signals.json
// (writer projection in the data model), so the generator asks a person nothing: it drafts the record the projector
// starts from, for one competitor and the time of its first salient signal. Folding signals into it is the pure
// render, a later build item.
import { cli, validate } from "./generate.mjs";
import type { CompetitorSignals } from "../../records/types/records.d.ts";

export const record = "competitor-signals";
export const describe = () => ({ record, ask: [{ field: "competitor", required: true, type: "string", says: "The competitor's id" }, { field: "first_seen", required: true, type: "string", says: "The valid time of its first salient signal" }],
  derived: { last_seen: "first_seen", writer: "the projector only; a person corrects a signal by emitting a superseding one" } });

export function draft(a: Partial<CompetitorSignals>) {
  if (!a.competitor || !a.first_seen) return { ok: false, record, errors: ["a competitor's signals record needs the competitor and the time of its first salient signal"] };
  const rec: CompetitorSignals = { competitor: a.competitor, first_seen: a.first_seen, last_seen: a.last_seen ?? a.first_seen };
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `competitors/${a.competitor}/signals`, writer: "projection", draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
