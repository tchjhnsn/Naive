#!/usr/bin/env node
// Private records, fields, and sensitive streams never reach a model (EE-073).
// Fails when a private target is named in a package use_model step's inputs, or when
// a private record sits in a release that a package with use_model would read.
//
//   node schema/check-private.mjs <venture dir>

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ventureFile } from "./venture-paths.mjs";

const dir = process.argv[2];
if (!dir) { console.error("usage: node schema/check-private.mjs <venture dir>"); process.exit(2); }
const repo = process.env.EE_ROOT?.replace(/\/?$/, "/") ?? new URL("..", import.meta.url).pathname;
const load = (p) => JSON.parse(readFileSync(p, "utf8"));

const packages = readdirSync(join(repo, "library", "packages")).flatMap((name) => {
  const p = join(repo, "library", "packages", name, "package.json");
  return existsSync(p) ? [load(p)] : [];
});
const inputs = packages.flatMap((pkg) => (pkg.use_model ?? []).flatMap((step) => {
  if (typeof step === "string") return [{ package: pkg.name, input: step }];
  return (step.inputs ?? []).map((input) => ({ package: pkg.name, input }));
}));
const readsRelease = packages.some((pkg) => (pkg.use_model ?? []).length > 0);

function walk(d) {
  if (!existsSync(d)) return [];
  return readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    if (e.name === "node_modules" || e.name === ".git") return [];
    const p = join(d, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

const privateTargets = new Set();
const privateRecords = new Set();
for (const f of walk(dir).filter((p) => p.endsWith(".json"))) {
  let rec;
  try { rec = load(f); } catch { continue; }
  if (!rec || typeof rec !== "object" || Array.isArray(rec)) continue;
  const id = typeof rec.id === "string" ? rec.id : null;
  if (rec.private === true && id) { privateTargets.add(id); privateRecords.add(id); }
  for (const field of rec.private_fields ?? []) if (id) privateTargets.add(`${id}.${field}`);
  if (rec.sensitive === true && id) privateTargets.add(id);
}

const errors = [];
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
