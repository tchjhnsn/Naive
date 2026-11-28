// The lint findings log, <venture>/.naive/lint-findings.jsonl (EE-231): every finding of every lint run, any severity,
// one line each against packages/naive/src/records/lint-finding.schema.json. The publish lint
// (packages/naive/src/engine/publish-lint.ts) and the artifact lint (packages/naive/src/checks/artifact-lint.ts) append to
// it here, so the log has one writer, and naive lint report reads it.
//
//   appendFindings(file, lines)            an Effect that appends the lines; an empty run still creates the log
//   readFindings(file)                     an Effect that reads every line, skipping one that does not parse
//   aggregate(lines, { by, since })        pure: counts per rule, role or harness
//
// A line written before the lint field existed is the publish lint's.

import { Effect } from "effect";
import { VentureFs } from "../core/effect/fs.ts";
import type { LintFinding } from "../records/types/records.d.ts";

export const LOG = ".naive/lint-findings.jsonl";
export type { LintFinding };

/** What naive lint report groups by. */
export const GROUPINGS = ["rule", "role", "harness"] as const;
export type Grouping = (typeof GROUPINGS)[number];
/** One group's counts. */
export type Group = { key: string; findings: number; errors: number; warns: number; artifacts: number; last: string };
const UNKNOWN = "(unknown)";

/** Appends each finding as one JSON line. A run with no findings still creates the log, so a run leaves a trace. */
export const appendFindings = (file: string, lines: readonly LintFinding[]) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  yield* fs.append(file, lines.map((l) => JSON.stringify(l) + "\n").join(""));
});

const parse = (line: string): LintFinding | null => {
  try {
    const v: unknown = JSON.parse(line);
    return typeof v === "object" && v !== null && !Array.isArray(v) && "rule" in v && "at" in v ? (v as LintFinding) : null;
  } catch { return null; }
};

/** Every finding in the log, oldest first; an empty list when there is no log. */
export const readFindings = (file: string) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  if (!(yield* fs.exists(file))) return [] as LintFinding[];
  const text = yield* fs.readText(file);
  return text.split("\n").filter(Boolean).map(parse).filter((l): l is LintFinding => l !== null);
});

/** The lint that wrote a line. */
export const lintOf = (l: LintFinding): string => l.lint ?? "publish";

const keyOf = (l: LintFinding, by: Grouping): string =>
  by === "rule" ? `${lintOf(l)}:${l.rule}` : by === "role" ? l.role ?? UNKNOWN : l.harness ?? UNKNOWN;

/**
 * The findings counted per rule (as lint:rule), per role or per harness, from `since` on, most findings first. A line
 * with no role or harness counts under (unknown). artifacts counts the distinct artifacts or files the group touched.
 */
export function aggregate(lines: readonly LintFinding[], { by = "rule", since }: { by?: Grouping; since?: string } = {}): { by: Grouping; since: string | null; findings: number; groups: Group[] } {
  const from = since ? Date.parse(since) : -Infinity;
  const kept = lines.filter((l) => Date.parse(l.at) >= from);
  const groups = new Map<string, Group & { touched: Set<string> }>();
  for (const l of kept) {
    const key = keyOf(l, by);
    const g = groups.get(key) ?? { key, findings: 0, errors: 0, warns: 0, artifacts: 0, last: l.at, touched: new Set<string>() };
    g.findings++;
    if (l.severity === "error") g.errors++; else g.warns++;
    const what = l.artifact ?? l.file;
    if (what) g.touched.add(what);
    if (l.at > g.last) g.last = l.at;
    groups.set(key, g);
  }
  const out = [...groups.values()].map(({ touched, ...g }) => ({ ...g, artifacts: touched.size }))
    .sort((a, b) => b.findings - a.findings || a.key.localeCompare(b.key));
  return { by, since: since ?? null, findings: kept.length, groups: out };
}
