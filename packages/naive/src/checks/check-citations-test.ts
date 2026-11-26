#!/usr/bin/env node
// The citation check passes on the repository, and fails on a wrong element id, a 7.4 version and a wrong name.
//
//   node packages/naive/src/checks/check-citations-test.ts

import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repo = new URL("../../../..", import.meta.url).pathname;
const script = join(repo, "packages/naive/src/checks/check-citations.ts");
let failed = 0;
const expect = (name: string, ok: boolean, detail = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${detail}`}`); if (!ok) failed++; };

const run = (root?: string) => spawnSync(process.execPath, [script, ...(root ? ["--root", root] : [])], { encoding: "utf8" });

const live = run();
expect("the repository's APQC citations pass", live.status === 0 && /citations pass/.test(live.stdout), live.stdout + live.stderr);

const FILES = [
  "packages/naive/src/functions/pcf.json",
  "packages/naive/src/functions/departments.json",
  "packages/naive/src/terms/ontology.json",
];

function copy(): string {
  const dir = mkdtempSync(join(tmpdir(), "citations-"));
  for (const rel of FILES) {
    mkdirSync(join(dir, rel, ".."), { recursive: true });
    cpSync(join(repo, rel), join(dir, rel));
  }
  return dir;
}

function put(dir: string, rel: string, text: string): void {
  writeFileSync(join(dir, rel), text);
}

const ontology = () => readFileSync(join(repo, "packages/naive/src/terms/ontology.json"), "utf8");
const departments = () => readFileSync(join(repo, "packages/naive/src/functions/departments.json"), "utf8");

const version = copy();
put(version, "packages/naive/src/terms/ontology.json", ontology().replace("APQC PCF 8.0 1.0 element 10002", "APQC PCF 7.4 1.0 element 10002"));
const versionRun = run(version);
expect("a citation of PCF 7.4 fails", versionRun.status === 1 && versionRun.stdout.includes("7.4") && versionRun.stdout.includes("version is not the PCF's"), versionRun.stdout);
rmSync(version, { recursive: true, force: true });

const element = copy();
put(element, "packages/naive/src/terms/ontology.json", ontology().replace("element 10002", "element 99999"));
const elementRun = run(element);
expect("a citation of an element id the PCF does not have fails", elementRun.status === 1 && elementRun.stdout.includes("99999") && elementRun.stdout.includes("element id is not in the PCF"), elementRun.stdout);
rmSync(element, { recursive: true, force: true });

const name = copy();
put(name, "packages/naive/src/functions/departments.json", departments().replace("Develop and Manage Human Resources", "Develop and Manage Human Capital"));
const nameRun = run(name);
expect("a citation whose name is not the element's name fails", nameRun.status === 1 && nameRun.stdout.includes("Develop and Manage Human Capital") && nameRun.stdout.includes("name does not match that element"), nameRun.stdout);
rmSync(name, { recursive: true, force: true });

console.log(failed ? `\n${failed} failing` : "\nall passing");
process.exit(failed ? 1 : 0);
