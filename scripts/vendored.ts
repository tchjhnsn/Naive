// Vendored repositories: repos/<name> holds a library's own source, added with `git subtree --squash` at the
// tag of the version Naive installs, for agents to read as reference (AGENTS.md, Vendored repositories).
// This check fails when a vendored copy's version differs from the pin in the root package.json, so agents
// never learn an API from a newer or older release than the one Naive runs.
//
//   node scripts/vendored.ts
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** Each vendored repository: its folder, the package.json inside it that carries the version, and the dependency it mirrors. */
export const VENDORED = [{ dir: "repos/effect", manifest: "packages/effect/package.json", dependency: "effect" }];

type Manifest = { version?: unknown; dependencies?: Record<string, unknown> };

const readManifest = (path: string): Manifest => JSON.parse(readFileSync(path, "utf8")) as Manifest;

/** The mismatches between vendored copies and the pins in `root`'s package.json. */
export function check(root: string): string[] {
  const pins = readManifest(join(root, "package.json")).dependencies ?? {};
  const errors: string[] = [];
  for (const v of VENDORED) {
    const manifest = join(root, v.dir, v.manifest);
    if (!existsSync(manifest)) { errors.push(`${v.dir}: missing ${v.manifest}; add it with git subtree at the tag of ${v.dependency}@${String(pins[v.dependency])}`); continue; }
    const vendored = readManifest(manifest).version;
    if (vendored !== pins[v.dependency]) errors.push(`${v.dir} is ${String(vendored)} but package.json pins ${v.dependency} ${String(pins[v.dependency])}; pull the subtree at the matching tag in the same pull request`);
  }
  return errors;
}

if (process.argv[1] && relative(process.argv[1], fileURLToPath(import.meta.url)) === "") {
  const errors = check(fileURLToPath(new URL("..", import.meta.url)));
  for (const e of errors) console.error(`FAIL  ${e}`);
  if (errors.length) process.exit(1);
  console.log(`pass  vendored repositories match their pins: ${VENDORED.map((v) => v.dir).join(", ")}`);
}
