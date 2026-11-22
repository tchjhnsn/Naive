// Record generator for a market anatomy matrix (EE-099, EE-157), markets/<id>.json: one market the venture sells into,
// on the standard dimensions of packages/naive/src/records/market-anatomy.schema.json. The agent may give the segment,
// the ICP and industry it is for and any cells it knows; every cell it does not give is drafted as unknown, so the
// draft is the whole sub-matrix. The id is primary unless given, and the segment is "unknown" until someone names it.
// Init writes markets/primary.json through it. The draft goes to the write chain at markets/<id>.
import { join } from "node:path";
import { cli, drop, questions, readJson, schemaOf, slug, validate } from "./generate.mjs";
import { allCells } from "./anatomy-cells.mjs";
import type { AnatomyCellEnumCell, AnatomyCellNumberCell } from "../../records/types/records.d.ts";

type Cell = AnatomyCellNumberCell | AnatomyCellEnumCell;
import type { MarketAnatomy } from "../../records/types/records.d.ts";

export const record = "market-anatomy";
const DERIVED = ["venture", "updated"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { venture: "from venture.json", id: "primary unless given", segment: "unknown until named", cells: "every cell not given starts unknown", updated: "today unless given" } });

type Answers = Partial<Omit<MarketAnatomy, "cells">> & { cells?: Record<string, Cell | undefined> };

export function draft(a: Answers = {}, opts: { venture?: string } = {}) {
  const v0 = opts.venture ? readJson(join(opts.venture, "venture.json")) as { id?: string } | null : null;
  const id = slug(a.id ?? "primary") || "primary";
  const rec = drop({ venture: a.venture ?? v0?.id ?? "venture", id, segment: a.segment ?? "unknown", icp: a.icp, primary: a.primary ?? (id === "primary" ? true : undefined),
    industry: a.industry, updated: a.updated ?? new Date().toISOString().slice(0, 10), cells: allCells(record, a.cells) }) as MarketAnatomy;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `markets/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
