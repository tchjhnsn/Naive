// The canary on an eval file (EE-198). One fixed string per file, compared by equality.
// A missing canary, or any other string, fails. This decides no term.
//
//   node packages/naive/src/checks/check-canary.ts [root]

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The fixed canary for each eval file, repo-relative. BIG-bench style: one string, equality only. */
export const CANARIES: Readonly<Record<string, string>> = {
  "packages/naive/evals/discovery-subscription.json": "f4c8a1e2-7b36-4d90-8e15-2a6c9b0d3f71",
};

/** The error when the file's canary is not the fixed string, or the file has none registered. */
export function canaryError(rel: string, value: unknown): string | null {
  const expected = CANARIES[rel];
  if (expected === undefined) return `${rel}: no fixed canary for this eval file`;
  if (value === undefined) return `${rel}: canary is missing`;
  if (value !== expected) return `${rel}: canary does not match the fixed string`;
  return null;
}

function main(): void {
  const root = process.argv[2] ? process.argv[2].replace(/\/$/, "") : new URL("../../../..", import.meta.url).pathname.replace(/\/$/, "");
  const errors: string[] = [];
  for (const rel of Object.keys(CANARIES)) {
    const file = join(root, rel);
    if (!existsSync(file)) { errors.push(`${rel}: canary file is missing`); continue; }
    let value: unknown;
    try {
      const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
      value = typeof parsed === "object" && parsed !== null && "canary" in parsed ? parsed.canary : undefined;
    } catch { value = undefined; }
    const error = canaryError(rel, value);
    if (error) errors.push(error);
  }
  for (const error of errors) console.log(`FAIL ${error}`);
  if (errors.length) process.exit(1);
  console.log("ok");
}

if (import.meta.url === `file://${process.argv[1]}`) main();
