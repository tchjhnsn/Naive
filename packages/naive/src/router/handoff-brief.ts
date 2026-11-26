// The handoff brief through the router (handoff contract v2, packages/naive/src/functions/capabilities/handoff-v2.md):
// a handoff record names its Markdown brief in `brief`, a path relative to the record, and check-ready.ts reads the
// brief's Outcome and Work sections before the handoff may be made ready. A write of operations/handoff/<id> may carry
// the brief's text as `brief_text` beside the record's fields. The router takes it out before the schema, writes the
// record as usual, then writes the text to the file `brief` names, with its own provenance line. These are the pure
// parts: splitting the input and placing the brief.

import { posix } from "node:path";

/** A handoff write's input split into the record and the brief's text, or why the input is refused. */
export type SplitBrief = { ok: true; record: Record<string, unknown>; text: string | null } | { ok: false; error: string };

/** Takes brief_text out of a handoff write's input. A brief_text that is not a non-empty string is refused. */
export function splitBrief(input: Record<string, unknown>): SplitBrief {
  if (!("brief_text" in input)) return { ok: true, record: input, text: null };
  const { brief_text: text, ...record } = input;
  if (typeof text !== "string" || !text.trim()) return { ok: false, error: "brief_text is the handoff's Markdown brief as a string, with text" };
  return { ok: true, record, text: text.endsWith("\n") ? text : `${text}\n` };
}

/** The logical path of the brief a handoff record at `file` names, or why it cannot be written there: it must be a
 *  Markdown file in the record's own folder (the data model's operations/handoffs/*.md). */
export function briefPath(file: string, brief: unknown): { ok: true; path: string } | { ok: false; error: string } {
  if (typeof brief !== "string" || !brief) return { ok: false, error: "brief_text needs the record's brief, the path of its Markdown file beside the record" };
  const folder = posix.dirname(file);
  const path = posix.normalize(posix.join(folder, brief));
  if (posix.dirname(path) !== folder || !path.endsWith(".md")) return { ok: false, error: `brief ${brief} must name a Markdown file beside the handoff, in ${folder}/` };
  return { ok: true, path };
}
