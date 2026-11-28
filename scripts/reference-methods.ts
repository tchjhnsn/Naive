// Gives every reference its research method (EE-233). The reference files are the paths the data model names for the
// record type `reference` (each layer's and each kit's references/references.json). A reference that already names a
// method keeps it; one that names none gets the method its id or its kind gives below, written right after `kind`, and
// a reference neither gives is reported and the file is left unwritten, so the script fails closed. A rerun writes
// nothing. It prints how many references each method holds.
//
//   node scripts/reference-methods.ts [--json] [--root <dir>]
//
// --root works on another copy of the repository
// (used by scripts/reference-methods-test.ts).

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { recordsIn } from "../packages/naive/src/records/index.ts";
import { RESEARCH_METHODS, type ResearchMethod } from "../packages/naive/src/records/research-methods.ts";
import type { Reference } from "../packages/naive/src/records/types/records.d.ts";

type Kind = Reference["references"][number]["kind"];

/** The method a kind of source was found by. A dataset has no default: its publisher decides, so each is named below. */
export const BY_KIND: Partial<Record<Kind, ResearchMethod>> = {
  standard: "standards",
  law: "standards",
  paper: "scientific",
  book: "practitioner",
  article: "practitioner",
  conversation: "stakeholder",
};

/** References whose method their kind does not give, each with why. */
export const BY_ID: Record<string, { method: ResearchMethod; why: string }> = {
  "onet-online": { method: "standards", why: "O*NET-SOC, the US Department of Labor's occupational taxonomy" },
  "spdx-license-list": { method: "standards", why: "SPDX, published as ISO/IEC 5962:2021" },
  "alamos-althoff-2026-scinet": { method: "scientific", why: "a research dataset from academic authors" },
};

/** Every file the data model names for `reference` under root, expanding each `*` segment. */
export function referenceFiles(root: string): string[] {
  const record = recordsIn(root).readDataModel().records.find((r) => r.id === "reference");
  const expand = (base: string, parts: string[]): string[] => {
    if (!parts.length) return existsSync(join(root, base)) ? [base] : [];
    const [head, ...rest] = parts;
    if (head !== "*") return expand(base ? `${base}/${head}` : head, rest);
    const dir = join(root, base);
    if (!existsSync(dir)) return [];
    return readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort().flatMap((n) => expand(`${base}/${n}`, rest));
  };
  return (record?.paths ?? []).flatMap((p) => expand("", p.split("/")));
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The reference with `method` set right after `kind`, or the reason none can be. */
export function withMethod(ref: Record<string, unknown>): { ref: Record<string, unknown> } | { error: string } {
  if (typeof ref.method === "string") return { ref };
  const id = String(ref.id);
  const method = BY_ID[id]?.method ?? BY_KIND[ref.kind as Kind];
  if (!method) return { error: `${id}: kind ${String(ref.kind)} gives no method; name one in BY_ID` };
  return { ref: Object.fromEntries(Object.entries(ref).flatMap(([k, v]) => (k === "kind" ? [[k, v], ["method", method]] : [[k, v]]))) };
}

function main(argv: string[]): number {
  const at = argv.indexOf("--root");
  const root = at >= 0 ? argv[at + 1] : new URL("..", import.meta.url).pathname;
  const counts = new Map<string, number>(RESEARCH_METHODS.map((m) => [m, 0]));
  const errors: string[] = [];
  const written: string[] = [];
  for (const file of referenceFiles(root)) {
    const text = readFileSync(join(root, file), "utf8");
    const doc: unknown = JSON.parse(text);
    const refs = isObject(doc) && Array.isArray(doc.references) ? doc.references : [];
    const next: unknown[] = [];
    const before = errors.length;
    for (const r of refs) {
      if (!isObject(r)) { errors.push(`${file}: a reference that is not an object`); continue; }
      const out = withMethod(r);
      if ("error" in out) { errors.push(`${file}: ${out.error}`); continue; }
      next.push(out.ref);
      const m = String(out.ref.method);
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    if (errors.length > before || !isObject(doc)) continue;
    const body = JSON.stringify({ ...doc, references: next }, null, 2) + "\n";
    if (body !== text) { writeFileSync(join(root, file), body); written.push(file); }
  }
  const summary = Object.fromEntries(counts);
  if (argv.includes("--json")) console.log(JSON.stringify({ counts: summary, written, errors }, null, 2));
  else {
    for (const f of written) console.log(`wrote ${f}`);
    for (const e of errors) console.log(`FAIL  ${e}`);
    console.log(`${errors.length ? "FAIL" : "ok  "}  references per method: ${Object.entries(summary).map(([m, n]) => `${m} ${n}`).join(", ")}`);
  }
  return errors.length ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = main(process.argv.slice(2));
