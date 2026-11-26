#!/usr/bin/env node
// Judges every APQC citation in departments.json and ontology.json (EE-199).
// A citation passes the pcf-citation term when its element id is in pcf.json, the cited name is that
// element's name, and the cited version is pcf.json's version. Exit 1 when one fails. Exit 2 when a
// file it needs cannot be read. A venture directory on the command line is ignored: the citations
// live in the framework. --root <dir> reads the three files from another copy.
//
//   node packages/naive/src/checks/check-citations.ts [--root <dir>]

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { run } from "../terms/engine.ts";
import type { CitationFacts } from "../terms/levels.ts";
import { pcfCitation } from "../terms/terms.ts";

type Element = { pcf: number; name: string };
type Pcf = { version: string; elements: Element[] };
type DepartmentFile = { departments: { id: string; apqc: { name: string; element: number } }[] };
type Ontology = { nouns: { noun: string; standard: string }[] };
export type Cited = { where: string; version: string; element: number; name: string };

const repoOf = new URL("../../../..", import.meta.url).pathname;

/** The three facts the term judges, read off the PCF the citation names. */
export function factsOf(cited: Cited, pcf: Pcf): CitationFacts {
  const hits = pcf.elements.filter((e) => e.pcf === cited.element);
  return {
    confirmed: true,
    elementKnown: hits.length > 0,
    nameMatches: hits.some((e) => e.name === cited.name),
    versionMatches: cited.version === pcf.version,
  };
}

/** One ontology standard that names APQC PCF, as one citation per element it names. */
export function fromStandard(noun: string, standard: string): Cited[] {
  if (!standard.includes("APQC PCF")) return [];
  const version = /APQC PCF (\d+\.\d+)/.exec(standard)?.[1] ?? "";
  const found: Cited[] = [];
  for (const m of standard.matchAll(/element (\d+) ([^;]+)/g)) {
    found.push({ where: `ontology.json ${noun}`, version, element: Number(m[1]), name: m[2].trim() });
  }
  if (!found.length) found.push({ where: `ontology.json ${noun}`, version, element: 0, name: "" });
  return found;
}

/** The department catalog's category entries, each citing the PCF file's own version. */
export function fromDepartments(file: DepartmentFile, version: string): Cited[] {
  return file.departments.map((d) => ({ where: `departments.json ${d.id}`, version, element: d.apqc.element, name: d.apqc.name }));
}

const SAYS: Record<string, string> = {
  C1: "the element id is not in the PCF",
  C2: "the name does not match that element",
  C3: "the version is not the PCF's",
};

/** Every citation that fails, as one line each. */
export function failures(citations: Cited[], pcf: Pcf): string[] {
  const out: string[] = [];
  for (const c of citations) {
    const failed = run(pcfCitation, factsOf(c, pcf)).failed.filter((id) => id !== "P7");
    if (failed.length) out.push(`${c.where}: ${c.version} element ${c.element} ${c.name}: ${failed.map((id) => SAYS[id] ?? id).join("; ")}`);
  }
  return out;
}

function load(root: string): { pcf: Pcf; citations: Cited[] } {
  const read = (rel: string): unknown => JSON.parse(readFileSync(join(root, rel), "utf8"));
  const pcf = read("packages/naive/src/functions/pcf.json") as Pcf;
  const departments = read("packages/naive/src/functions/departments.json") as DepartmentFile;
  const ontology = read("packages/naive/src/terms/ontology.json") as Ontology;
  const citations = [
    ...fromDepartments(departments, pcf.version),
    ...ontology.nouns.flatMap((n) => fromStandard(n.noun, n.standard)),
  ];
  return { pcf, citations };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const at = process.argv.indexOf("--root");
  const root = at >= 0 ? process.argv[at + 1] : repoOf;
  let loaded: { pcf: Pcf; citations: Cited[] };
  try { loaded = load(root ?? repoOf); }
  catch (e) { console.error(e instanceof Error ? e.message : String(e)); process.exit(2); }
  const bad = failures(loaded.citations, loaded.pcf);
  if (bad.length) { for (const line of bad) console.log(line); console.log(`${bad.length} failing`); process.exit(1); }
  console.log(`${loaded.citations.length} citations pass`);
}
