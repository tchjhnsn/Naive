// Where Naive sits for the site: the repository root, linked into site/node_modules as naive-framework (file:..).
//
// Code here imports Naive modules by package name (`naive-framework/src/engine/foundation.mjs`). A script that has to run a
// Naive file as its own process, or read a Naive data file by path, takes the path from naivePath.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** The installed package's folder. */
export const naiveRoot: string = dirname(fileURLToPath(import.meta.resolve("naive-framework/package.json")));

/**
 * A file of a Naive package rooted at `root`, by its path inside Naive (`packages/naive/src/checks/check-ventures.ts`).
 * An installed Naive publishes compiled JavaScript in dist/ (EE-159), where every module is named `.mjs` (EE-160) and
 * every data file sits at its own path, so a path resolves to dist/ first; a source checkout (NAIVE_FRAMEWORK_DIR)
 * has no dist/ and resolves to the file as named, or its `.ts` when the module was converted.
 */
export const naiveFile = (root: string, rel: string): string => {
  const candidates = [join(root, "dist", rel.replace(/\.(ts|mjs)$/, ".mjs")), join(root, "dist", rel), join(root, rel), join(root, rel.replace(/\.mjs$/, ".ts"))];
  return candidates.find((p) => existsSync(p)) ?? join(root, rel);
};

/** A file in the installed package: see naiveFile. */
export const naivePath = (rel: string): string => naiveFile(naiveRoot, rel);

/** The installed package's compiled tree (dist/), which mirrors the package with every module compiled; the package itself when there is none. */
export const naiveCode: string = existsSync(join(naiveRoot, "dist")) ? join(naiveRoot, "dist") : naiveRoot;

/** One of Naive's lifecycle phases, from its phase module (packages/naive/src/phases/<id>/phase.json, EE-126). */
export type NaivePhase = { id: string; step: number; name: string; question: string; gate?: { name?: string } };

/** Naive's lifecycle phases in step order, read from the installed package's phase modules. */
export const naivePhases = (): NaivePhase[] => {
  const dir = naivePath("packages/naive/src/phases");
  return readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "phase.json")))
    .map((d) => JSON.parse(readFileSync(join(dir, d.name, "phase.json"), "utf8")) as NaivePhase).sort((a, b) => a.step - b.step);
};

/** Node's flag that lets a script import Naive's TypeScript modules: see naive-ts.ts. */
export const naiveTs: string[] = ["--import", join(dirname(fileURLToPath(import.meta.url)), "naive-ts.ts")];
