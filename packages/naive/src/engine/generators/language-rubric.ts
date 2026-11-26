// Record generator for the language rubric (EE-189). The rubric is packages/naive/src/functions/it/language-rubric.json
// in the framework, so the generator adds one worked example to what the file holds now: a system, its candidates
// scored on the rubric's criteria with a reason for each score, and the choice a person made. It is a change to the
// framework (a pull request), not a venture route. The weights sum and the sources are check-language-rubric.ts's.
import { join } from "node:path";
import { cli, drop, questions, readJson, repo, schemaOf, slug, validate } from "./generate.ts";
import type { LanguageRubric } from "../../records/types/records.d.ts";

export const record = "language-rubric";
export const FILE = "packages/naive/src/functions/it/language-rubric.json";
type Example = LanguageRubric["examples"][number];
export const describe = () => ({ record, ask: questions(schemaOf(record).properties.examples.items, "examples[]."),
  derived: { id: "a slug of the system unless given; an example already in the file is refused" } });

export function draft(a: Partial<Example>, { root = repo }: { root?: string } = {}) {
  if (!a.system || !a.target || !a.candidates?.length || !a.chosen || !a.decided_by?.length || !a.rated)
    return { ok: false, record, errors: ["a worked example needs the system, its target, the candidates, the chosen one, the decisions that chose it and who rated it"] };
  const now = readJson(join(root, FILE)) as LanguageRubric | null;
  if (!now) return { ok: false, record, errors: [`${FILE} is missing: the rubric's criteria come first`] };
  const id = slug(a.id ?? a.system);
  if (now.examples.some((e) => e.id === id)) return { ok: false, record, errors: [`the rubric already has an example ${id}`] };
  const criteria = new Set(now.criteria.map((c) => c.id));
  const unknown = a.candidates.flatMap((c) => Object.keys(c.scores ?? {}).filter((k) => !criteria.has(k)).map((k) => `${c.id} scores ${k}, which is not a criterion`));
  if (unknown.length) return { ok: false, record, errors: unknown };
  const example = drop({ id, system: a.system, target: a.target, weights: a.weights, must: a.must, candidates: a.candidates, chosen: a.chosen, decided_by: a.decided_by, rated: a.rated, note: a.note }) as Example;
  const rec = { ...now, examples: [...now.examples, example] };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, added: id, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
