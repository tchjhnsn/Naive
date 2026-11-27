// Record generator for one element of a page's words (EE-099, EE-216): the tagline, a headline, the value
// proposition, a call to action, a proof point, an objection answered, the contact line. The agent asks which
// element it is, the words, where they sit on the site and which records they come from. The generator derives
// the id from the page and the item, as the gap report names it (home-what), else from the item alone, and
// refuses an element with no citation, because words no record stands behind are not approved text. A call to
// action and the contact line need a destination: none is an answer, an empty one is not. The draft goes to the
// write chain for marketing/message/<id>.json (route marketing/message/[id]), where the gate holds an agent's
// write for a person under public-commitment.
import { cli, drop, questions, schemaOf, slug, validate } from "./generate.ts";
import type { MarketingMessage } from "../../records/types/records.d.ts";

export const record = "marketing-message";
const DERIVED = ["id"];
/** The elements that lead somewhere: a reader clicks them, so where they lead is part of the words. */
const LEADS: MarketingMessage["kind"][] = ["cta-primary", "cta-secondary", "contact"];

export const describe = () => ({ record, ask: questions(schemaOf(record)).filter((q: { field: string }) => !DERIVED.includes(q.field)),
  derived: { id: "from the page and the item, as the gap report names it, else from the item or the kind" } });

/** The element's id for a page and an item, the one name the gap report and the records agree on: home-what, about-team. */
export const elementId = (page: string | undefined, item: string): string => slug([page === "/" ? "home" : page?.replace(/^\//, ""), item].filter(Boolean).join("-"));

export function draft(a: Partial<MarketingMessage>) {
  if (!a.kind || !a.text) return { ok: false, record, errors: ["a message element needs its kind (tagline, headline, value-proposition, cta-primary...) and the words themselves"] };
  if (!a.cites?.length) return { ok: false, record, errors: ["a message element names at least one record its words come from, even one that is missing: cites"] };
  if (LEADS.includes(a.kind) && !a.destination) return { ok: false, record, errors: [`a ${a.kind} needs a destination: an email, a url, a path, or none when there is nowhere to go yet`] };
  if (a.destination && a.destination.kind !== "none" && !a.destination.value) return { ok: false, record, errors: [`a destination of kind ${a.destination.kind} needs its value`] };
  const id = a.id ? slug(a.id) : a.item ? elementId(a.page, a.item) : slug(a.kind);
  const rec = drop({ version: a.version ?? "0.1.0", venture: a.venture, id, kind: a.kind, text: a.text, label: a.label, page: a.page, item: a.item,
    destination: a.destination, cites: a.cites, audience: a.audience, note: a.note }) as MarketingMessage;
  const v = validate(record, rec);
  return { ok: v.ok, record, route: `marketing/message/${id}`, draft: rec, errors: v.errors };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
