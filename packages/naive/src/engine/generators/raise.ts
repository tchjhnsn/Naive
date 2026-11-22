// Record generator for a raise (EE-099): one fundraise as a bounded project (APQC PCF 12.1; Graham, How to Raise
// Money). The agent asks for the title, the ask (amount, currency, instrument) and the milestone the money reaches. The
// generator derives the id from the title unless one is given, starts the status at planned, and starts targets,
// meetings and materials empty. The draft goes to the write chain for investor-relations/raises/<id>.json, which only the
// external-relationships agent (external-relationships-agent) or a person may write.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.mjs";
import type { Raise } from "../../records/types/records.d.ts";

export const record = "raise";
const DERIVED = ["id", "status"];
export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the title unless given", status: "planned unless given", targets: "empty unless given", meetings: "empty unless given", materials: "empty unless given" } });

export function draft(a: Partial<Raise>) {
  if (!a.title || !a.ask || !a.milestone) {
    return { ok: false, record, errors: ["a raise needs a title, an ask (amount, currency and instrument) and the milestone the money reaches"] };
  }
  const id = slug(a.id ?? a.title);
  const rec = drop({ id, title: a.title, status: a.status ?? "planned", ask: a.ask, milestone: a.milestone, exemption: a.exemption,
    opens: a.opens, closes: a.closes, materials: a.materials ?? [], targets: a.targets ?? [], meetings: a.meetings ?? [],
    decision: a.decision, note: a.note }) as Raise;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `investor-relations/raises/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
