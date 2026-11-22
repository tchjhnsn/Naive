// The venture-to-software contract (EE-154): a Naive handoff for software work names the MAD record,
// the part of the project it touches and the templates that govern that part, and this checks the
// names resolve. Naive reads MAD's record as data and imports nothing from MAD (EE-038): the fields
// it relies on are the contract, MAD record schema 0.x: project.domain, parts[].id and
// adopted[].{layer, part, templates}, a template written as <id>@<semver>.
//
//   checkMethod(ventureDir, method) -> string[]   one line per problem; empty means it resolves

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";
import type { Handoff } from "../records/types/records.d.ts";

/** The method block of a handoff. */
export type Method = NonNullable<Handoff["method"]>;

// The fields of a MAD record this contract reads. MAD owns the schema; anything else in it is ignored.
type MadRecord = {
  project?: { domain?: string },
  parts?: { id: string }[],
  adopted?: { layer?: string, part: string, templates?: string[] }[],
};

/** Problems with one handoff's method block, read against the MAD record it names. */
export function checkMethod(ventureDir: string, method: Method | undefined): string[] {
  if (!method) return [];
  const framework: string = method.framework;
  if (framework !== "mad") return [`method framework ${framework} has no contract in Naive`];
  const at = resolve(ventureDir, method.record);
  if (isAbsolute(method.record) || relative(resolve(ventureDir), at).startsWith("..")) return [`method record ${method.record} is outside the venture`];
  if (!existsSync(at)) return [`method record ${method.record} does not exist`];
  let record: MadRecord;
  try { record = JSON.parse(readFileSync(at, "utf8")) as MadRecord; } catch (error) { return [`method record ${method.record} does not parse (${error instanceof Error ? error.message : String(error)})`]; }
  const problems: string[] = [];
  if (record?.project?.domain !== "software") problems.push(`method record ${method.record} is not a MAD software record`);
  const parts = new Set((record?.parts ?? []).map((p) => p.id));
  if (!parts.has(method.part)) return [...problems, `part ${method.part} is not a part of ${method.record}`];
  const adopted = (record.adopted ?? []).filter((a) => a.part === method.part || a.part === "project");
  if (!adopted.length) problems.push(`no template is adopted for part ${method.part} in ${method.record}: choose its method in MAD first`);
  const held = new Set(adopted.flatMap((a) => a.templates ?? []));
  for (const t of method.templates ?? []) if (!held.has(t)) problems.push(`template ${t} is not adopted for part ${method.part} in ${method.record}`);
  return problems;
}
