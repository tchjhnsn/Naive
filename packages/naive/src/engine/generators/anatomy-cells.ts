// What the market and industry anatomy generators and init share (EE-157): the cell names a sub-matrix schema lists,
// a cells object with every one of them present, and the primary market and industry a new venture starts with. A cell
// the answers do not give starts as { status: "unknown" }, because unknown is a value and never null: a new venture's
// matrix is whole from the start, and filling it moves cells from unknown to estimated or known.
import { readDataModel, readSchema } from "../../records/index.ts";
import { validateValue } from "../../records/validate.ts";
import type { AnatomyCellEnumCell, AnatomyCellNumberCell, DataModel } from "../../records/types/records.d.ts";
import { now } from "../../core/clock.ts";

type Cell = AnatomyCellNumberCell | AnatomyCellEnumCell;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The cell names of an anatomy record type, in schema order. */
export function cellNames(record: string): string[] {
  const model: DataModel = readDataModel();
  const r = model.records.find((x) => x.id === record);
  if (!r?.schema) return [];
  const s: unknown = readSchema(String(r.schema).replace(/^.*\//, "").replace(/\.schema\.json$/, ""));
  const cells = isObject(s) && isObject(s.properties) && isObject(s.properties.cells) ? s.properties.cells.properties : undefined;
  return isObject(cells) ? Object.keys(cells) : [];
}

/** Every cell of the record type: the given ones as they are, the rest unknown. Cells the schema lacks are kept so the schema refuses them. */
export function allCells(record: string, given: Record<string, Cell | undefined> = {}): Record<string, Cell> {
  const out: Record<string, Cell> = {};
  for (const name of cellNames(record)) out[name] = given[name] ?? { status: "unknown" };
  for (const [name, cell] of Object.entries(given)) if (!(name in out) && cell) out[name] = cell;
  return out;
}

/**
 * The primary industry and market a new venture starts with, every cell unknown and the market nested in the industry.
 * Each is checked against its schema; errors name what failed.
 * @param venture the venture id
 * @param today YYYY-MM-DD
 */
export function primaryAnatomy(venture: string, today = now().toISOString().slice(0, 10)) {
  const industry = { venture, id: "primary", name: "unknown", updated: today, cells: allCells("industry-anatomy") };
  const market = { venture, id: "primary", segment: "unknown", primary: true, industry: "primary", updated: today, cells: allCells("market-anatomy") };
  const checks: [string, unknown][] = [["industry-anatomy.schema.json", industry], ["market-anatomy.schema.json", market]];
  const errors = checks.flatMap(([schema, rec]) => {
    const v = validateValue(schema, rec);
    return v.status === 0 ? [] : [`${schema}: ${(v.stdout + v.stderr).trim()}`];
  });
  return { industry, market, errors };
}
