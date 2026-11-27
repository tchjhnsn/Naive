// Record generator for the visibility rubric (EE-222). The rubric is
// packages/naive/src/functions/it/visibility-rubric.json in the framework, so the generator adds one worked example to
// what the file holds now: the activity that must be visible, its channel, the tool kinds considered, and the choice a
// person made. It is a change to the framework (a pull request), not a venture route. The weights sum, the sources and
// the channels are check-visibility-rubric.ts's.
import { join } from "node:path";
import { cli, drop, questions, readJson, repo, schemaOf, slug, validate } from "./generate.ts";
import type { VisibilityRubric } from "../../records/types/records.d.ts";

export const record = "visibility-rubric";
export const FILE = "packages/naive/src/functions/it/visibility-rubric.json";
type Example = VisibilityRubric["examples"][number];
export const describe = () => ({ record, ask: questions(schemaOf(record).properties.examples.items, "examples[]."),
  derived: { id: "a slug of the activity unless given; an example already in the file is refused" } });

export function draft(a: Partial<Example>, { root = repo }: { root?: string } = {}) {
  if (!a.activity || !a.channel || !a.candidates?.length || !a.chosen || !a.decided_by?.length || !a.rated)
    return { ok: false, record, errors: ["a worked example needs the activity, its channel, the candidate tool kinds, the chosen one, the decisions that chose it and who judged it"] };
  const now = readJson(join(root, FILE)) as VisibilityRubric | null;
  if (!now) return { ok: false, record, errors: [`${FILE} is missing: the rubric's criteria, channels and tool kinds come first`] };
  const id = slug(a.id ?? a.activity);
  if (now.examples.some((e) => e.id === id)) return { ok: false, record, errors: [`the rubric already has an example ${id}`] };
  const channel = now.channels.find((c) => c.id === a.channel);
  if (!channel) return { ok: false, record, errors: [`${a.channel} is not a channel in ${FILE} (one of ${now.channels.map((c) => c.id).join(", ")})`] };
  const errors = a.candidates.flatMap((c) => {
    const kind = now.tool_kinds.find((t) => t.id === c);
    if (!kind) return [`${c} is not a tool kind in ${FILE}`];
    return kind.captures.includes(channel.id) ? [] : [`tool kind ${c} does not capture ${channel.id}`];
  });
  const criteria = new Set(now.criteria.map((c) => c.id));
  for (const [field, map] of [["weights", a.weights ?? {}], ["must", a.must ?? {}]] as const)
    for (const k of Object.keys(map)) if (!criteria.has(k)) errors.push(`${field} names ${k}, which is not a criterion`);
  if (!a.candidates.includes(a.chosen)) errors.push(`the chosen tool kind ${a.chosen} is not one of the candidates`);
  if (errors.length) return { ok: false, record, errors };
  const example = drop({ id, activity: a.activity, channel: a.channel, weights: a.weights, must: a.must, candidates: a.candidates, chosen: a.chosen, decided_by: a.decided_by, rated: a.rated, note: a.note }) as Example;
  const rec = { ...now, examples: [...now.examples, example] };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: FILE, draft: rec, added: id, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
