// Record generator for a research program (EE-099; autoresearch design, everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "program.md per function"). A research program is prose a person
// owns, programs/<function>.md, so it has no schema and the draft is its text: the function's starter,
// packages/naive/src/functions/<function>/templates/research-program.md. Only a person writes it, through the router
// (mentura operations/research-program/<function> write --as person); an agent's write is refused before anything
// else, so an agent may use this generator only to show the starter to a person.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cli, repo } from "./generate.mjs";
import { isFunction, programPath, templateOf } from "../research-programs.mjs";

export const record = "research-program";
export const describe = () => ({ record, ask: [
  { field: "function", required: true, type: "string", says: "The function the program is for, an id in packages/naive/src/functions/departments.json: strategy" },
], derived: { file: "programs/<function>.md", text: "the function's starter, packages/naive/src/functions/<function>/templates/research-program.md" } });

export function draft(a: { function?: string }) {
  const fn = a.function;
  if (!fn || !isFunction(fn)) return { ok: false, record, errors: ["a research program is for one function in packages/naive/src/functions/departments.json, such as strategy"] };
  const template = templateOf(fn);
  if (!existsSync(join(repo, template))) return { ok: false, record, errors: [`${template} is missing`] };
  return { ok: true, record, file: programPath(fn), draft: readFileSync(join(repo, template), "utf8"), errors: [] };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
