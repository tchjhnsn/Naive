// Record generator for a recipe (EE-099; autoresearch design, everything-ecosystem
// docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "The recipe"). A recipe is TypeScript source, so the draft is the
// text of <pattern>.recipe.ts. The person or agent gives the route pattern, the signal type ranges and facts it
// hears, and its knobs; the generator writes a recipe that renders no record yet (every heard signal is noise), checks
// hears and knobs against packages/naive/src/records/recipe.schema.json and lints the source with the sandbox's lint
// (packages/naive/src/engine/recipes/sandbox.ts). Editing render to fold the signals is the person's or the
// researcher's work. Drafting the plain fold from the signal types' projects is naive recipes init, not built.
import { cli, validate } from "./generate.mjs";
import { lintRecipe } from "../recipes/sandbox.ts";
import type { Recipe } from "../../records/types/records.d.ts";

export const record = "recipe";
export const describe = () => ({ record, ask: [
  { field: "pattern", required: true, type: "string", says: "The projected route pattern the recipe makes, as its path without .recipe.ts: competitors/[id]/signals" },
  { field: "hears.signals", required: true, type: "array", says: "The signal type ranges it hears: competitor-funding@^1" },
  { field: "hears.facts", required: false, type: "object", says: "Named facts, each a venture file and optionally a field: { \"markets\": \"foundation/icp.json#markets\" }" },
  { field: "knobs", required: false, type: "object", says: "Numbers, short strings and short lists a knob search may step" },
], derived: { file: "<pattern>.recipe.ts", render: "renders no record: every heard signal is noise until render is edited" } });

const PATTERN = /^[a-z0-9][a-z0-9-]*(\/([a-z0-9][a-z0-9-]*|\[id\]))*$/;

/** The file a recipe sits at in a venture: its pattern with .recipe.ts. */
export const recipePath = (pattern: string): string => `${pattern}.recipe.ts`;

export function draft(a: { pattern?: string; hears?: Recipe["hears"]; knobs?: Recipe["knobs"] }) {
  if (!a.pattern || !PATTERN.test(a.pattern)) return { ok: false, record, errors: ["a recipe needs its route pattern, such as competitors/[id]/signals"] };
  if (!a.hears?.signals?.length) return { ok: false, record, errors: ["a recipe hears at least one signal type range"] };
  const exports: Recipe = { hears: a.hears, knobs: a.knobs ?? {} };
  const v = validate(record, exports);
  const source = [
    `// ${recipePath(a.pattern)}: drafted by packages/naive/src/engine/generators/recipe.ts. It renders no record yet: every`,
    "// heard signal is noise. Edit render to fold the signals it hears into the record; it runs only in the sandbox.",
    "",
    `export const hears = ${JSON.stringify(exports.hears)} as const;`,
    "",
    `export const knobs = ${JSON.stringify(exports.knobs)};`,
    "",
    "export default function render(input: { readonly signals: readonly { readonly id: string }[] }, _k: typeof knobs) {",
    "  return { record: null, receptions: input.signals.map((s) => ({ kind: \"noise\", signal: s.id, why: \"this recipe renders no record yet\" })) };",
    "}",
    "",
  ].join("\n");
  const lint = lintRecipe(source);
  const errors = [...v.errors, ...lint];
  return { ok: v.ok && lint.length === 0, record, file: recipePath(a.pattern), exports, draft: source, errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
