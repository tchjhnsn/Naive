// Proposes decisions from the activity catalog's scores (EE-169).
//
//   node packages/naive/src/engine/activity-proposals.ts <venture dir> [list|propose] [--json]
//   naive activities [list|propose] [--venture <dir>] [--json]
//
// The activity catalog (packages/naive/src/functions/activities.json) holds proposal rules as data: each names the
// scores an activity must have and the question to put to a person. For each function the venture lists in
// venture.json departments, a rule picks the rated activities under that function's process groups whose scores meet
// every condition: the cross-industry ones, and the ones for the venture's own industry (EE-171). An activity for a
// NAICS industry is the venture's when venture.json industry.code starts with the activity's code, or when both sit
// in one of the three sectors NAICS numbers with a range (31-33, 44-45, 48-49) and the activity names the sector. `list` (the default) prints them and writes nothing. `propose` files one open
// decision per rule and function, activity-<rule>-<function>, through the decision door as the agent
// activity-proposals, with the activities, their scores and who rated them in its note.
//
// A score never decides anything. A rerun leaves a decision it already filed, open or decided, as it is, so a
// catalog that changed later does not rewrite it. It never edits the catalog, a workflow or any other record. A
// venture with no industry in venture.json gets the cross-industry activities only. The rules' lines are unvalidated
// priors.
//
// A venture sets its own lines (EE-170) in naive.config.json: activity_proposals.rules.<rule id> is "off", so the rule
// proposes nothing there, or { when }, lines that replace all of the catalog's for that rule. A rule left out keeps
// the catalog's lines. The proposal's note says whose lines found it. packages/naive/src/checks/check-config.ts holds
// the venture's lines to the catalog's rule ids and scales.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { describe, runMain, runSync } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { decisionFile, propose } from "./decisions.ts";
import { CONFIG, rawConfig } from "./naive-config.ts";
import { functionsOf } from "./research-programs.ts";
import type { ActivityCatalog, NaiveConfig } from "../records/types/records.d.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
export const CATALOG = "packages/naive/src/functions/activities.json";
const TOOLS = "packages/naive/src/functions/tools.json";
export const PROPOSER = "activity-proposals";

type Activity = ActivityCatalog["activities"][number];
type Rule = NonNullable<ActivityCatalog["proposal_rules"]>[number];
/** The venture's lines per rule id, as naive.config.json activity_proposals.rules holds them. */
export type VentureLines = NonNullable<NonNullable<NaiveConfig["activity_proposals"]>["rules"]>;
/** `lines` says whose lines found the activities: the catalog's, or the venture's own. */
export type Found = { rule: Rule; function: string; id: string; lines: "catalog" | "venture"; activities: Activity[] };
export type Proposed = { id: string; ok: boolean; error?: string; result?: { proposed?: string; kept?: string; file: string; status?: unknown } };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Whether an activity's scores meet every condition of a rule. An activity with no score on a named scale does not. */
export function matches(a: Activity, rule: Rule): boolean {
  return rule.when.every((c) => {
    const score = a.ratings?.[c.scale];
    return score !== undefined && (c.at_least === undefined || score >= c.at_least) && (c.at_most === undefined || score <= c.at_most);
  });
}

/** The three sectors NAICS numbers with a range of two-digit codes: manufacturing, retail trade, and transportation and warehousing. */
const SECTOR_RANGES = [["31", "32", "33"], ["44", "45"], ["48", "49"]];

/**
 * Whether a venture whose NAICS code is `code` is in the industry `naics`. A NAICS code holds its parents as
 * prefixes, so the venture is in every industry its code starts with. A two-digit `naics` in a ranged sector names
 * the whole sector. A venture with no code is in no industry. Pure.
 */
export function inIndustry(naics: string, code: string | undefined): boolean {
  if (!code) return false;
  if (code.startsWith(naics)) return true;
  return naics.length === 2 && SECTOR_RANGES.some((r) => r.includes(naics) && r.includes(code.slice(0, 2)));
}

/** Whether an activity applies to a venture: it is cross-industry, or for an industry the venture is in. Pure. */
export const applies = (a: Activity, industry: string | undefined): boolean => a.scope.kind === "cross-industry" || inIndustry(a.scope.naics, industry);

/** What is wrong with a rule's lines against the catalog's scales: an unknown scale, a line outside the scale's range, or lines no score meets. `who` starts each message. Pure. */
export function lineProblems(who: string, when: Rule["when"], scales: ActivityCatalog["scales"]): string[] {
  const out: string[] = [];
  for (const c of when) {
    const scale = scales.find((s) => s.id === c.scale);
    if (!scale) { out.push(`${who} names the scale ${c.scale}, which the catalog does not list`); continue; }
    for (const at of [c.at_least, c.at_most]) if (at !== undefined && (at < scale.range[0] || at > scale.range[1])) out.push(`${who} draws a line at ${at} on ${c.scale}, outside its range ${scale.range[0]} to ${scale.range[1]}`);
    if (c.at_least !== undefined && c.at_most !== undefined && c.at_least > c.at_most) out.push(`${who} asks for ${c.scale} at least ${c.at_least} and at most ${c.at_most}, which no score meets`);
  }
  return out;
}

/** What is wrong with a venture's lines: a rule id the catalog lacks, and each line as lineProblems reads it. Pure. */
export function ventureLineProblems(catalog: ActivityCatalog, lines: VentureLines = {}): string[] {
  const rules = new Set((catalog.proposal_rules ?? []).map((r) => r.id));
  return Object.entries(lines).flatMap(([id, set]) => [
    ...(rules.has(id) ? [] : [`activity_proposals.rules.${id}: ${CATALOG} has no proposal rule ${id} (one of ${[...rules].join(", ")})`]),
    ...(set === "off" ? [] : !isObject(set) || !Array.isArray(set.when) ? [`activity_proposals.rules.${id} is neither off nor { when }`] : lineProblems(`activity_proposals.rules.${id}`, set.when, catalog.scales)),
  ]);
}

/**
 * One entry per rule and function with at least one matching activity that applies to the venture (cross-industry,
 * or for the industry whose NAICS code is `industry`), in the rules' then the functions' order. A rule the venture's lines turn off finds nothing, and one they redraw matches by the venture's
 * lines in place of all of the catalog's. Pure.
 */
export function find(catalog: ActivityCatalog, groups: Map<string, string>, functions: string[], lines: VentureLines = {}, industry?: string): Found[] {
  const out: Found[] = [];
  for (const listed of catalog.proposal_rules ?? []) {
    const set = lines[listed.id];
    if (set === "off") continue;
    const rule = set ? { ...listed, when: set.when } : listed;
    for (const fn of functions) {
      const activities = catalog.activities.filter((a) => applies(a, industry) && groups.get(a.process_group) === fn && matches(a, rule));
      if (activities.length) out.push({ rule, function: fn, id: `activity-${rule.id}-${fn}`, lines: set ? "venture" : "catalog", activities });
    }
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
    f.lines === "venture"
      ? `Proposed by rule ${f.rule.id} in ${CATALOG}, with the venture's own lines from ${CONFIG} activity_proposals: ${f.rule.when.map(line).join(", ")}. The catalog's basis, written for the catalog's lines: ${f.rule.basis}`
      : `Proposed by rule ${f.rule.id} in ${CATALOG}: ${f.rule.when.map(line).join(", ")}. ${f.rule.basis}`,
    "A score is one rater's judgment and decides nothing. Accepting this means a person sets who does these activities; nothing is changed by this proposal.",
    ...f.activities.map((a) => `- ${a.id} (${a.process ?? a.process_group}${a.scope.kind === "industry" ? `, NAICS ${a.scope.naics}` : ""}): ${a.statement} Scores: ${scores(a)}. Rated by ${a.rated?.by} on ${a.rated?.on}: ${a.rated?.basis}`),
  ].join("\n");
}

const read = (file: string) => readJson(join(repo, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

/** The venture's NAICS code from venture.json industry, or undefined when it names none. */
export const industryOf = (dir: string) => Effect.map(
  readJson(join(dir, "venture.json")).pipe(Effect.mapError((e) => new CannotRun({ message: `venture.json: ${describe(e)}`, cause: e }))),
  (v) => (isObject(v) && isObject(v.industry) && v.industry.system === "naics" && typeof v.industry.code === "string" ? v.industry.code : undefined),
);

/** The shipped catalog. */
export const readCatalog = () => Effect.map(read(CATALOG), (c) => c as ActivityCatalog);

/** What the catalog's rules find for the functions a venture lists, by the venture's lines where it set them. Fails on lines the catalog cannot hold. */
export const findFor = (dir: string) => Effect.gen(function* () {
  const catalog = yield* readCatalog();
  const lines = rawConfig(dir).activity_proposals?.rules ?? {};
  const wrong = ventureLineProblems(catalog, lines);
  if (wrong.length) return yield* Effect.fail(new CannotRun({ message: `${CONFIG}: ${wrong.join("; ")}` }));
  const tools = yield* read(TOOLS);
  const groups = new Map<string, string>();
  for (const g of isObject(tools) && Array.isArray(tools.process_groups) ? tools.process_groups.filter(isObject) : []) if (typeof g.id === "string" && typeof g.function === "string") groups.set(g.id, g.function);
  return find(catalog, groups, functionsOf(dir), lines, yield* industryOf(dir));
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
    if (json) console.log(JSON.stringify({ found: found.map((f) => ({ id: f.id, rule: f.rule.id, function: f.function, lines: f.lines, question: question(f), activities: f.activities.map((a) => a.id) })), ...(proposed ? { proposed } : {}) }, null, 2));
    else {
      if (!functionsOf(dir).length) console.log("The venture lists no functions in venture.json departments, so no activity applies to it.");
      for (const f of found) {
        console.log(`\n${f.id}${f.lines === "venture" ? " (the venture's lines)" : ""}\n  ${question(f)}`);
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
