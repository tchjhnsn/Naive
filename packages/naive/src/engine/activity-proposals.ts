// Proposes decisions from the activity catalog's scores (EE-169).
//
//   node packages/naive/src/engine/activity-proposals.ts <venture dir> [list|propose] [--json]
//   naive activities [list|propose] [--venture <dir>] [--json]
//
// The activity catalog (packages/naive/src/functions/activities.json) holds proposal rules as data: each names the
// scores an activity must have and the question to put to a person. For each function the venture lists in
// venture.json departments, a rule picks the rated cross-industry activities under that function's process groups
// whose scores meet every condition. `list` (the default) prints them and writes nothing. `propose` files one open
// decision per rule and function, activity-<rule>-<function>, through the decision door as the agent
// activity-proposals, with the activities, their scores and who rated them in its note.
//
// A score never decides anything. A rerun leaves a decision it already filed, open or decided, as it is, so a
// catalog that changed later does not rewrite it. It never edits the catalog, a workflow or any other record. An
// activity for one NAICS industry is left out: matching it to the venture's industry is not built. The rules' lines
// are unvalidated priors, and a line per venture is not built.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { describe, runMain, runSync } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { decisionFile, propose } from "./decisions.ts";
import { functionsOf } from "./research-programs.ts";
import type { ActivityCatalog } from "../records/types/records.d.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
export const CATALOG = "packages/naive/src/functions/activities.json";
const TOOLS = "packages/naive/src/functions/tools.json";
export const PROPOSER = "activity-proposals";

type Activity = ActivityCatalog["activities"][number];
type Rule = NonNullable<ActivityCatalog["proposal_rules"]>[number];
export type Found = { rule: Rule; function: string; id: string; activities: Activity[] };
export type Proposed = { id: string; ok: boolean; error?: string; result?: { proposed?: string; kept?: string; file: string; status?: unknown } };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Whether an activity's scores meet every condition of a rule. An activity with no score on a named scale does not. */
export function matches(a: Activity, rule: Rule): boolean {
  return rule.when.every((c) => {
    const score = a.ratings?.[c.scale];
    return score !== undefined && (c.at_least === undefined || score >= c.at_least) && (c.at_most === undefined || score <= c.at_most);
  });
}

/** One entry per rule and function with at least one matching cross-industry activity, in the rules' then the functions' order. Pure. */
export function find(catalog: ActivityCatalog, groups: Map<string, string>, functions: string[]): Found[] {
  const out: Found[] = [];
  for (const rule of catalog.proposal_rules ?? []) for (const fn of functions) {
    const activities = catalog.activities.filter((a) => a.scope.kind === "cross-industry" && groups.get(a.process_group) === fn && matches(a, rule));
    if (activities.length) out.push({ rule, function: fn, id: `activity-${rule.id}-${fn}`, activities });
  }
  return out;
}

const line = (c: Rule["when"][number]) => [c.at_least === undefined ? "" : `${c.scale} at least ${c.at_least}`, c.at_most === undefined ? "" : `${c.scale} at most ${c.at_most}`].filter(Boolean).join(" and ");

/** The decision's question: the function, the rule's question and how many activities it is about. */
export const question = (f: Found) => `${f.function}: ${f.rule.asks.replace(/\?$/, "")} (${f.activities.length} ${f.activities.length === 1 ? "activity" : "activities"})?`;

/** The decision's note: the rule, its basis, and each activity with the scores the rule read and who rated it. */
export function note(f: Found): string {
  const scores = (a: Activity) => f.rule.when.map((c) => `${c.scale} ${a.ratings?.[c.scale]}`).join(", ");
  return [
    `Proposed by rule ${f.rule.id} in ${CATALOG}: ${f.rule.when.map(line).join(", ")}. ${f.rule.basis}`,
    "A score is one rater's judgment and decides nothing. Accepting this means a person sets who does these activities; nothing is changed by this proposal.",
    ...f.activities.map((a) => `- ${a.id} (${a.process ?? a.process_group}): ${a.statement} Scores: ${scores(a)}. Rated by ${a.rated?.by} on ${a.rated?.on}: ${a.rated?.basis}`),
  ].join("\n");
}

const read = (file: string) => readJson(join(repo, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

/** What the catalog's rules find for the functions a venture lists. */
export const findFor = (dir: string) => Effect.gen(function* () {
  const catalog = (yield* read(CATALOG)) as ActivityCatalog;
  const tools = yield* read(TOOLS);
  const groups = new Map<string, string>();
  for (const g of isObject(tools) && Array.isArray(tools.process_groups) ? tools.process_groups.filter(isObject) : []) if (typeof g.id === "string" && typeof g.function === "string") groups.set(g.id, g.function);
  return find(catalog, groups, functionsOf(dir));
});

/** Files one open decision per entry, and keeps one already filed, open or decided, as it is. */
export function proposeFound(dir: string, found: Found[]): Proposed[] {
  return found.map((f) => {
    const file = decisionFile(dir, f.id);
    if (file) {
      const prior = runSync(readJson(ventureFile(dir, file)));
      return { id: f.id, ok: true, result: { kept: f.id, file, status: isObject(prior) ? prior.status : undefined } };
    }
    return { id: f.id, ...propose(dir, { id: f.id, question: question(f), note: note(f) }, { agentId: PROPOSER, via: "cli" }) };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const [dir, what = "list"] = args.filter((a) => !a.startsWith("--"));
  if (!dir || !["list", "propose"].includes(what)) {
    console.error("usage: node packages/naive/src/engine/activity-proposals.ts <venture dir> [list|propose] [--json]");
    process.exit(2);
  }
  await runMain(Effect.map(findFor(dir), (found) => {
    const proposed = what === "propose" ? proposeFound(dir, found) : null;
    if (json) console.log(JSON.stringify({ found: found.map((f) => ({ id: f.id, rule: f.rule.id, function: f.function, question: question(f), activities: f.activities.map((a) => a.id) })), ...(proposed ? { proposed } : {}) }, null, 2));
    else {
      if (!functionsOf(dir).length) console.log("The venture lists no functions in venture.json departments, so no activity applies to it.");
      for (const f of found) {
        console.log(`\n${f.id}\n  ${question(f)}`);
        for (const a of f.activities) console.log(`  - ${a.id}`);
      }
      if (proposed) console.log(`\nproposed ${proposed.filter((p) => p.result?.proposed).length} open decisions, kept ${proposed.filter((p) => p.result?.kept).length} already filed`);
      else console.log(`\n${found.length} proposals found; nothing written. Run propose to file them as open decisions.`);
    }
    const failed = (proposed ?? []).filter((p) => !p.ok);
    for (const p of failed) console.error(`could not propose ${p.id}: ${p.error}`);
    process.exitCode = failed.length ? 1 : 0;
  }));
}
