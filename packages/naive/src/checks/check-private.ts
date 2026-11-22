#!/usr/bin/env node
// Private records, fields, and sensitive streams never reach a model (EE-073).
// Fails when a private target is named in a package use_model step's inputs, or when
// a private record sits in a release that a package with use_model would read.
//
//   node packages/naive/src/checks/check-private.ts <venture dir>

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "../core/venture-paths.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node packages/naive/src/checks/check-private.ts <venture dir>"); process.exit(2); }
const repo = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("../../../..", import.meta.url).pathname;
const load = (p: string): unknown => JSON.parse(readFileSync(p, "utf8"));

/** The part of a venture package's package.json this check reads: its model steps. */
type ModelPackage = { name: string, use_model?: (string | { inputs?: string[] })[] };

const packages = readdirSync(join(repo, "packages/naive/library", "packages")).flatMap((name) => {
  const p = join(repo, "packages/naive/library", "packages", name, "package.json");
  return existsSync(p) ? [load(p) as ModelPackage] : [];
});
const inputs = packages.flatMap((pkg) => (pkg.use_model ?? []).flatMap((step) => {
  if (typeof step === "string") return [{ package: pkg.name, input: step }];
  return (step.inputs ?? []).map((input) => ({ package: pkg.name, input }));
}));
const readsRelease = packages.some((pkg) => (pkg.use_model ?? []).length > 0);

function walk(d: string): string[] {
  if (!existsSync(d)) return [];
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "node_modules" || e.name === ".git") return [];
    const p = join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const privateTargets = new Set<string>();
const privateRecords = new Set<string>();
for (const f of walk(dir).filter((p) => p.endsWith(".json"))) {
  let parsed: unknown;
  try { parsed = load(f); } catch { continue; }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
  const rec = parsed as { id?: unknown, private?: unknown, private_fields?: string[], sensitive?: unknown };
  const id = typeof rec.id === "string" ? rec.id : null;
  if (rec.private === true && id) { privateTargets.add(id); privateRecords.add(id); }
  for (const field of rec.private_fields ?? []) if (id) privateTargets.add(`${id}.${field}`);
  if (rec.sensitive === true && id) privateTargets.add(id);
}

const errors: string[] = [];
for (const { package: name, input } of inputs) {
  if (privateTargets.has(input) || privateRecords.has(input.split(".")[0])) errors.push(`${name}: use_model input ${input} is private and must not reach a model`);
}
if (readsRelease) {
  const release = join(ventureFile(dir, ".release"));
  if (existsSync(release) && statSync(release).isDirectory()) {
    for (const f of walk(release).filter((p) => p.endsWith(".json"))) {
      const text = readFileSync(f, "utf8");
      for (const id of privateRecords) if (text.includes(`"${id}"`)) errors.push(`.release mentions private record ${id}, and a package with use_model would read it`);
    }
  }
}
if (errors.length) { console.error(errors.join("\n")); process.exit(1); }
console.log(`${dir}: private records stay off the model.`);
