// Decision ids are unique. decision.schema.json allows the same id on two entries, so a
// rebase can append a second copy of an id the log already holds. This check compares id
// strings. It decides no term.
//
//   node packages/naive/src/checks/check-decisions.ts [file]
//
// With no file it reads docs/decisions/decisions.json.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = process.argv[2] ?? fileURLToPath(new URL("../../../../docs/decisions/decisions.json", import.meta.url));

type Row = { id?: unknown };
type Log = { decisions?: Row[] };

let raw: unknown;
try {
  raw = JSON.parse(readFileSync(file, "utf8")) as unknown;
} catch {
  console.error(`cannot read ${file}`);
  process.exit(2);
}

const decisions = raw !== null && typeof raw === "object" && "decisions" in raw
  ? (raw as Log).decisions
  : undefined;
if (!Array.isArray(decisions)) {
  console.error(`${file} has no decisions array`);
  process.exit(2);
}

const seen = new Map<string, number>();
for (const row of decisions) {
  if (typeof row?.id !== "string") continue;
  seen.set(row.id, (seen.get(row.id) ?? 0) + 1);
}
const dups = [...seen.entries()].filter(([, n]) => n > 1).map(([id, n]) => `${id} (${n})`);
if (dups.length > 0) {
  console.error(`duplicate decision id: ${dups.join(", ")}`);
  process.exit(1);
}
console.log("ok");
