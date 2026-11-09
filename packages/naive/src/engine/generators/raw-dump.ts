// Record generator for a raw capture (EE-099; raw capture and triage design, docs/design/RAW_TRIAGE_2026-11-09.md,
// "Raw entries"). A capture is the founder's own words, kept verbatim, so the draft is the text of
// raw/dump/<id>.md: frontmatter with id, captured, channel and person, then the text unchanged. The id is the
// capture time plus a short suffix, as naive capture makes it. Raw is immutable, so the route refuses a write to a
// capture that exists; a new capture is a new file.
import { cli } from "./generate.mjs";

export const record = "raw-dump";
export const describe = () => ({ record, ask: [
  { field: "text", required: true, type: "string", says: "The capture in the founder's own words, verbatim" },
  { field: "channel", required: false, type: "string", says: "Where it came from: naive capture, a push to raw/, the Mentura app" },
  { field: "person", required: false, type: "string", says: "Whose words these are, as a person id" },
  { field: "captured", required: false, type: "string", says: "When it was captured, ISO date-time; now when absent" },
], derived: { id: "the capture time plus a short random suffix", file: "raw/dump/<id>.md" } });

/** The id naive capture gives a capture taken at an ISO time: yyyymmdd-hhmmss plus a four-letter suffix. */
export const captureId = (at: string, suffix: string): string => `${at.replace(/[-:.]/g, "").replace("T", "-").slice(0, 15)}-${suffix}`;

export function draft(a: { text?: string; channel?: string; person?: string; captured?: string; suffix?: string }) {
  if (!a.text || !a.text.trim()) return { ok: false, record, errors: ["a capture needs its text, in the founder's own words"] };
  const captured = a.captured ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(captured))) return { ok: false, record, errors: [`captured is not a date-time: ${captured}`] };
  const id = captureId(captured, a.suffix ?? Math.random().toString(36).slice(2, 6));
  const head = ["---", `id: ${id}`, `captured: ${captured}`, ...(a.channel ? [`channel: ${a.channel}`] : []), ...(a.person ? [`person: ${a.person}`] : []), "---", "", ""].join("\n");
  const text = head + (a.text.endsWith("\n") ? a.text : `${a.text}\n`);
  return { ok: true, record, route: `purpose/raw/dump/${id}`, file: `raw/dump/${id}.md`, draft: { text }, errors: [] };
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
