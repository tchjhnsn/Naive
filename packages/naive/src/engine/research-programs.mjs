// Research programs (autoresearch design, everything-ecosystem docs/design/AUTORESEARCH_RECORDS_2026-11-06.md, "program.md
// per function"). A function's research program is programs/<function>.md in the venture: the person-edited
// instructions its researcher (the <function>-researcher role) reads, one section per pattern it works. Only a person
// writes it (writer person in the data model; writerRule in packages/naive/src/engine/gate.mjs).
//
// Each function module ships a starter at packages/naive/src/functions/<function>/templates/research-program.md. It is
// copied into a venture once, when the venture lists the function in venture.json departments (EE-047) and the
// venture has no programs/<function>.md yet: packages/naive/src/engine/add-department.mjs copies it when a function is
// imported (init-venture.mjs imports a typed venture's functions through it), and naive upgrade copies any that are
// missing. A file that exists is never touched, so the venture's copy is the founder's from then on.
//
// This module is plain JavaScript because naive upgrade and init run it from an installed copy, where Node does
// not strip types under node_modules.

import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";
import { catalog } from "./departments.mjs";

const root = new URL("../../../..", import.meta.url).pathname;

/** The folder a venture keeps its research programs in, relative to the venture. */
export const PROGRAMS = "programs";

/** The venture-relative path of one function's research program. @param {string} fn */
export const programPath = (fn) => `${PROGRAMS}/${fn}.md`;

/** The repository path of one function's starter research program. @param {string} fn */
export const templateOf = (fn) => `packages/naive/src/functions/${fn}/templates/research-program.md`;

/** Whether an id names one of the functions in packages/naive/src/functions/departments.json. @param {string} fn */
export const isFunction = (fn) => catalog().some((d) => d.id === fn);

/**
 * The functions a venture lists in venture.json departments, in the catalog's order. Unknown ids are left out.
 * @param {string} dir
 * @returns {string[]}
 */
export function functionsOf(dir) {
  const f = join(dir, "venture.json");
  if (!existsSync(f)) return [];
  const listed = new Set(JSON.parse(readFileSync(f, "utf8")).departments ?? []);
  return catalog().map((d) => d.id).filter((id) => listed.has(id));
}

/**
 * Copies the starter research program of each listed function whose programs/<function>.md is missing. With dry, it
 * only says what it would copy. Never writes over a file. Returns what was (or would be) copied.
 * @param {string} dir the venture folder
 * @param {{ dry?: boolean, only?: string[] }} [opts] only: limit to these functions (add-department passes the one it imports)
 * @returns {{ function: string, path: string, template: string }[]}
 */
export function seedPrograms(dir, { dry = false, only } = {}) {
  const out = [];
  for (const fn of functionsOf(dir).filter((x) => !only || only.includes(x))) {
    const path = programPath(fn), template = templateOf(fn);
    if (existsSync(ventureFile(dir, path)) || !existsSync(join(root, template))) continue;
    if (!dry) {
      mkdirSync(dirname(ventureFile(dir, path)), { recursive: true });
      copyFileSync(join(root, template), ventureFile(dir, path));
    }
    out.push({ function: fn, path, template });
  }
  return out;
}
