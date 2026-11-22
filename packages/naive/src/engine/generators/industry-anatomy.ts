// Record generator for an industry anatomy matrix (EE-099, EE-157), industries/<id>.json: the industry a venture's
// market sits in, on the standard dimensions of packages/naive/src/records/industry-anatomy.schema.json. The agent may
// give the name, the NAICS code and any cells it knows; every cell it does not give is drafted as unknown. The id is
// naics-<code> when a code is given, else primary unless given, and the name is "unknown" until someone names it. Init
// writes industries/primary.json through it. The draft goes to the write chain at industries/<id>.
import { join } from "node:path";
import { cli, drop, questions, readJson, schemaOf, slug, validate } from "./generate.ts";
import { allCells } from "./anatomy-cells.ts";
import type { AnatomyCellEnumCell, AnatomyCellNumberCell } from "../../records/types/records.d.ts";

type Cell = AnatomyCellNumberCell | AnatomyCellEnumCell;
import type { IndustryAnatomy } from "../../records/types/records.d.ts";

export const record = "industry-anatomy";
const DERIVED = ["venture", "updated"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { venture: "from venture.json", id: "naics-<code> when a code is given, else primary", name: "unknown until named", cells: "every cell not given starts unknown", updated: "today unless given" } });

type Answers = Partial<Omit<IndustryAnatomy, "cells">> & { cells?: Record<string, Cell | undefined> };

export function draft(a: Answers = {}, opts: { venture?: string } = {}) {
  const v0 = opts.venture ? readJson(join(opts.venture, "venture.json")) as { id?: string } | null : null;
  const id = slug(a.id ?? (a.naics ? `naics-${a.naics}` : "primary")) || "primary";
  const rec = drop({ venture: a.venture ?? v0?.id ?? "venture", id, name: a.name ?? "unknown", naics: a.naics,
    updated: a.updated ?? new Date().toISOString().slice(0, 10), cells: allCells(record, a.cells) }) as IndustryAnatomy;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `industries/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
