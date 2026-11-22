// Record generator for the Lean Canvas definition (EE-099, EE-155), packages/naive/src/functions/strategy/lean-canvas.json.
// The definition is framework data, so a draft is a change to the framework (a pull request), not a venture route. A
// box names a record type and an attribute and holds no venture data; packages/naive/src/engine/lean-canvas.ts
// checks that every box's record type exists.
import { cli, describeFrom, validate } from "./function-common.ts";

export const record = "lean-canvas";
export const describe = () => describeFrom(record, { file: "packages/naive/src/functions/strategy/lean-canvas.json" });

type Box = { id: string, label: string, ask: string, record: string, attribute: string };
export function draft(a: { boxes?: Box[], note?: string }) {
  if (!a.boxes?.length) return { ok: false, record, errors: ["a Lean Canvas needs its boxes, each with an id, label, ask, record type and attribute"] };
  const rec = {
    version: "0.1.0",
    ...(a.note ? { note: a.note } : {}),
    standard: { name: "Lean Canvas", source: "Ash Maurya, Running Lean: Iterate from Plan A to a Plan That Works, O'Reilly, 2012" },
    boxes: a.boxes,
  };
  const v = validate(record, rec);
  return { ok: v.ok, record, file: "packages/naive/src/functions/strategy/lean-canvas.json", draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
