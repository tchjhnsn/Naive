// Record generator for the O*NET reference (EE-232), packages/naive/src/functions/onet.json. Its occupations and work
// activities are O*NET's, so the generator never adds one by hand: draft takes one release's occupations (code and
// title), its detailed work activities (element id and title) and, for each occupation, the activities its task
// statements link to, as scripts/import-onet.ts reads them from O*NET's own files. It writes the attribution O*NET's
// CC BY 4.0 licence asks for, naming the release, sorts everything, and refuses an occupation that links an activity
// the release does not have. format writes one activity and one occupation per line, so the same release always gives
// the same bytes.
import { cli, questions, schemaOf, validate } from "./generate.ts";
import type { Onet } from "../../records/types/records.d.ts";

export const record = "onet";
export const FILE = "packages/naive/src/functions/onet.json";
export const SOURCE = "onet-database";
export type OnetOccupation = Onet["occupations"][number];
export type OnetDwa = Onet["dwas"][number];

/** The attribution O*NET asks for in a modified copy of its database, for one release. */
export const attribution = (release: string): string =>
  `This file includes information from the O*NET ${release} Database by the U.S. Department of Labor, Employment and Training Administration (USDOL/ETA). Used under the CC BY 4.0 license. O*NET® is a trademark of USDOL/ETA. Naive has modified all or some of this information. USDOL/ETA has not approved, endorsed, or tested these modifications.`;
export const NOTE = "A compact O*NET reference (EE-232): each occupation's O*NET-SOC code and title, the release's detailed work activities, and the activities each occupation's task statements link to, and none of O*NET's descriptions, task statements or ratings. packages/naive/src/checks/check-roles.ts --complete reads it to suggest occupations for a PCF element no role answers for, by word overlap between the element's names and each occupation's title and activities; a suggestion is a lead for a person, never a match. Written by scripts/import-onet.ts. Keep the attribution with every copy of this file and anything derived from it.";

export const describe = () => ({ record, ask: [{ field: "release", required: true, type: "string", says: "The O*NET database release, such as 31.0" }, ...questions(schemaOf(record).properties.occupations.items, "occupations[]."), ...questions(schemaOf(record).properties.dwas.items, "dwas[].")],
  derived: { attribution: "O*NET's attribution for a modified copy, naming the release", order: "activities by element id, occupations by code, each occupation's activities by element id" } });

const byString = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function draft(a: { release?: string, published?: string, dwas?: OnetDwa[], occupations?: OnetOccupation[] }) {
  if (!a.release) return { ok: false, record, errors: ["the reference needs the O*NET release it was imported from, such as 31.0"] };
  const dwas = (a.dwas ?? []).map(({ id, title }) => ({ id, title })).sort((x, y) => byString(x.id, y.id));
  const known = new Set(dwas.map((d) => d.id));
  const errors: string[] = [];
  const occupations = (a.occupations ?? []).map(({ code, title, dwas: links }) => {
    const ids = [...new Set(links)].sort(byString);
    for (const id of ids) if (!known.has(id)) errors.push(`${code} links work activity ${id}, which the release does not have`);
    return { code, title, dwas: ids };
  }).sort((x, y) => byString(x.code, y.code));
  const rec: Onet = { release: a.release, ...(a.published ? { published: a.published } : {}), source: SOURCE, attribution: attribution(a.release), note: NOTE, dwas, occupations };
  const v = validate(record, rec);
  return { ok: v.ok && !errors.length, record, file: FILE, draft: rec, errors: [...v.errors, ...errors] };
}

/** The file's bytes: the header as indented JSON, then one activity and one occupation per line, in the order given. */
export function format(rec: Onet): string {
  const { dwas, occupations, ...header } = rec;
  const head = JSON.stringify(header, null, 2).slice(0, -2);
  const list = (lines: string[]) => (lines.length ? `[\n${lines.join(",\n")}\n  ]` : "[]");
  const dwa = (d: OnetDwa) => `    {"id": ${JSON.stringify(d.id)}, "title": ${JSON.stringify(d.title)}}`;
  const occ = (o: OnetOccupation) => `    {"code": ${JSON.stringify(o.code)}, "title": ${JSON.stringify(o.title)}, "dwas": ${JSON.stringify(o.dwas)}}`;
  return `${head},\n  "dwas": ${list(dwas.map(dwa))},\n  "occupations": ${list(occupations.map(occ))}\n}\n`;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = await cli({ record, describe, draft });
