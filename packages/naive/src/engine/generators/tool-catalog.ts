// Record generator for the tool catalog (EE-163; venture console spec, 2026-11-24, phase 3). The catalog is
// packages/naive/src/functions/tools.json in the framework, so the generator adds one tool to what the file holds now,
// with an id unique in the file. It is a change to the framework (a pull request), not a venture route.
// packages/naive/src/checks/check-tools.ts checks the result across files (functions, process groups, record types).
import { join } from "node:path";
import { cli, drop, questions, readJson, repo, schemaOf, slug, validate } from "./generate.ts";
import type { ToolCatalog } from "../../records/types/records.d.ts";

export const record = "tool-catalog";
export const FILE = "packages/naive/src/functions/tools.json";
type Tool = ToolCatalog["tools"][number];
export const describe = () => ({ record, ask: questions(schemaOf(record).properties.tools.items, "tools[]."),
  derived: { id: "a slug of the title unless given; a tool already in the file is refused", function: "null for a universal tool", process_groups: "[] unless given", reads: "[] unless given", writes: "[] unless given" } });

export function draft(a: Partial<Tool>, { root = repo }: { root?: string } = {}) {
  if (!a.title || !a.kind || !a.phase || !a.about) return { ok: false, record, errors: ["a tool needs a title, a kind, the phase it is first needed in and what it is for"] };
  const now = readJson(join(root, FILE)) as ToolCatalog | null;
  if (!now) return { ok: false, record, errors: [`${FILE} is missing`] };
  const id = slug(a.id ?? a.title);
  if (now.tools.some((t) => t.id === id)) return { ok: false, record, errors: [`the catalog already has a tool ${id}`] };
  const tool = drop({ id, function: a.function ?? null, title: a.title, kind: a.kind, phase: a.phase, about: a.about, process_groups: a.process_groups ?? [],
    reads: a.reads ?? [], writes: a.writes ?? [], proposes: a.proposes, paths: a.paths, cluster: a.cluster }) as Tool;
  const rec = { ...now, tools: [...now.tools, tool] };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, added: id, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
