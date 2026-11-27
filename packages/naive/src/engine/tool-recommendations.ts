// Recommends tools for a goal or an activity, favouring the ones that give the system visibility of the activity and
// the ones the venture owns (EE-222).
//
//   node packages/naive/src/engine/tool-recommendations.ts <venture dir> [--goal <id>] [--activity <id>] [--function <id>] [--json] [--propose]
//   naive tools recommend [--goal <id>] [--activity <id>] [--function <id>] [--json] [--propose]
//
// An agent's work is visible by construction: every write goes through the router and appends to provenance.jsonl
// (EE-031). A person's work is visible only as far as a tool captures it. So the activities that need a tool are the
// ones a person performs or approves, and the ones no workflow step writes a record for. Each one gets a gap:
//
//   no-record     no step performs it, or every step that does writes nothing: the blind spot.
//   outcome-only  a step writes a record and a person performs it, so the result lands and the doing does not.
//   visible       a step writes a record and an agent performs it, so the router and provenance see it.
//
// The functions in scope, first rule that applies: --function; else the functions that the requirements deriving from
// the goal or one of its measures constrain (foundation/requirements/*.json); else the functions the goal's owner role
// may answer for; else every function the venture lists in venture.json departments.
//
// Each activity's channel is read from the words of APQC's name for it or the catalog's statement, as an activity's
// kind is (EE-179), and the channel names the tool kinds that could capture it. The rubric
// (packages/naive/src/functions/it/visibility-rubric.json) scores each candidate, and the venture's own weights and
// must-haves under visibility in naive.config.json replace the rubric's defaults. A score decides nothing.
//
// `--propose` files one open decision per goal and function, tools-<goal>-<function>, through the decision door as
// that function's agent, with the candidates as its options and the ranking and the blind spots in its note. The
// decision is where the recommendation lives: a Discovery venture can write one, it holds every candidate at once so
// the choice stays open, and a person can withdraw it (EE-185). A rerun leaves a decision it already filed, open or
// decided, as it is. It writes nothing else, and it never edits the rubric, a connection or any other record.

import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { describe, runMain, runSync } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { goals, requirements } from "./canonical.ts";
import { decisionFile, propose } from "./decisions.ts";
import { CONFIG, rawConfig } from "./naive-config.ts";
import { functionAgent } from "./agents/function-spec.ts";
import { ownerInputs, resolveOwners, type ElementOwner, type RoleInfo } from "./element-owners.ts";
import { functionsOf } from "./research-programs.ts";
import { candidatesFor, channelOf, scoreTools, type Options, type Ranking } from "./visibility-rubric.ts";
import type { FunctionWorkflow, Goal, Requirement, VisibilityRubric } from "../records/types/records.d.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
export const RUBRIC = "packages/naive/src/functions/it/visibility-rubric.json";
/** The note every output carries, and the floor under every recommendation. */
export const NOTE = "An agent never decides which tool the venture uses. These are candidates, scored on unvalidated priors, for a person to choose from.";

/** Why a function is in scope. */
export type Source = "flag" | "requirement" | "owner" | "venture";
export type FunctionInScope = { readonly id: string; readonly from: Source; readonly why: string };
export type Gap = "no-record" | "outcome-only" | "visible";
/** A workflow step that performs the activity, and the routes it writes. */
export type Step = { readonly workflow: string; readonly step: string; readonly writes: readonly string[] };
export type Need = {
  readonly activity: string;
  readonly name: string;
  readonly function: string;
  readonly performer: "person" | "agent";
  readonly approval?: "person" | "none";
  readonly steps: readonly Step[];
  readonly gap: Gap;
  readonly channel: string;
};
/** The candidates for one channel, scored once for every need that falls into it. */
export type ChannelAdvice = {
  readonly channel: string;
  readonly title: string;
  readonly record: string;
  readonly needs: readonly Need[];
  readonly ranking: Ranking;
};
export type Recommendation = {
  readonly goal: { readonly id: string; readonly kind: string; readonly statement: string; readonly measures: readonly string[] } | null;
  readonly activity: string | null;
  readonly functions: readonly FunctionInScope[];
  readonly recommend: readonly ChannelAdvice[];
  /** The needs whose gap is no-record: nothing in the venture would say the activity happened. */
  readonly blind: readonly Need[];
  readonly decides: "person";
  readonly note: string;
};
export type Proposed = { id: string; ok: boolean; error?: string; result?: { proposed?: string; kept?: string; file: string; status?: unknown } };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** The measure ids a goal owns, as `<goal>/<measure>`. Pure. */
export const measureKeys = (g: Goal): string[] => (g.measures ?? []).map((m) => `${g.id}/${m.id}`);

/**
 * Whether a requirement derives from a goal: by the goal's id, by `<goal>/<measure>`, or by a bare measure id that
 * this goal has. A bare id two goals share resolves to neither, so no function is claimed on a guess. Pure.
 */
export function derivesFrom(r: Requirement, g: Goal, all: readonly Goal[]): boolean {
  const mine = new Set((g.measures ?? []).map((m) => m.id));
  const shared = (id: string) => all.filter((x) => x.id !== g.id && (x.measures ?? []).some((m) => m.id === id)).length > 0;
  return (r.derives_from ?? []).some((d) => d === g.id || measureKeys(g).includes(d) || (mine.has(d) && !shared(d)));
}

/**
 * The functions in scope, first rule that applies: the flag, the requirements deriving from the goal, the goal
 * owner's role reach, else every function the venture lists. Only functions the venture lists are returned. Pure.
 */
export function functionsInScope(
  listed: readonly string[],
  { goal, all = [], reqs = [], roles = new Map<string, RoleInfo>(), only }: { goal?: Goal; all?: readonly Goal[]; reqs?: readonly Requirement[]; roles?: ReadonlyMap<string, RoleInfo>; only?: string },
): FunctionInScope[] {
  const keep = (ids: readonly string[], from: Source, why: string): FunctionInScope[] =>
    [...new Set(ids)].filter((id) => listed.includes(id)).sort().map((id) => ({ id, from, why }));
  if (only !== undefined) return keep([only], "flag", `--function ${only}`);
  if (goal) {
    const derived = reqs.filter((r) => derivesFrom(r, goal, all));
    const constrained = derived.flatMap((r) => r.constrains ?? []);
    const found = keep(constrained, "requirement", `the requirements ${derived.filter((r) => (r.constrains ?? []).length).map((r) => r.id).join(", ")} derive from ${goal.id} and constrain it`);
    if (found.length) return found;
    const reach = goal.owner === undefined ? undefined : roles.get(goal.owner)?.reach;
    if (reach && reach !== "all") {
      const byOwner = keep(reach, "owner", `${goal.id} is owned by the role ${goal.owner}, which answers for it`);
      if (byOwner.length) return byOwner;
    }
  }
  return keep(listed, "venture", "no requirement or owner narrows it, so every function the venture lists is in scope");
}

/** An activity's gap: no-record when nothing writes for it, outcome-only when a person performs it, else visible. Pure. */
export const gapOf = (performer: "person" | "agent", approval: "person" | "none" | undefined, steps: readonly Step[]): Gap =>
  !steps.some((s) => s.writes.length) ? "no-record" : performer === "person" || approval === "person" ? "outcome-only" : "visible";

/** The part of a workflow this reads. */
export type RecStep = Pick<FunctionWorkflow, "id" | "function" | "steps">;

/** The steps that perform each activity, by activity id, in the workflows' order. Pure. */
export function stepsByActivity(workflows: readonly RecStep[]): Map<string, Step[]> {
  const out = new Map<string, Step[]>();
  for (const w of workflows) for (const s of w.steps) {
    if (!s.activity) continue;
    const step: Step = { workflow: `${w.function}/${w.id}`, step: s.id, writes: s.writes ?? [] };
    const found = out.get(s.activity);
    if (found) found.push(step); else out.set(s.activity, [step]);
  }
  return out;
}

/**
 * The activities in scope that need a tool to be seen. An activity is one of them when the venture performs it today
 * and nothing records it: a person performs or approves it, by the venture's assignment or by the activity's kind
 * (EE-179), or a workflow step performs it and writes no route. An activity an agent performs that a step writes a
 * record for is already visible, and one that neither a person nor any step performs is not performed at all, so
 * neither is a blind spot. `only` is an activity a person named, which is in scope whether or not it is performed.
 * An activity whose words reach no channel, not even the default, is left out. Pure.
 */
export function needsFor(owners: readonly ElementOwner[], steps: ReadonlyMap<string, Step[]>, rubric: VisibilityRubric, scope: readonly FunctionInScope[], only?: string): Need[] {
  const inScope = new Set(scope.map((f) => f.id));
  const out: Need[] = [];
  for (const e of owners) {
    if (e.level !== 4 || !inScope.has(e.function) || e.performer === undefined) continue;
    if (only !== undefined && e.id !== only) continue;
    const mine = steps.get(e.id) ?? [];
    const byPerson = e.performer === "person" || e.approval === "person";
    const gap = gapOf(e.performer, e.approval, mine);
    // An activity a person named is reported whatever its gap, so the answer can be that it is already visible.
    if (only === undefined && (gap === "visible" || (!byPerson && !mine.length))) continue;
    const channel = channelOf(rubric, e.name);
    if (!channel) continue;
    out.push({ activity: e.id, name: e.name, function: e.function, performer: e.performer, ...(e.approval ? { approval: e.approval } : {}), steps: mine, gap, channel: channel.id });
  }
  return out;
}

/** One entry per channel the needs fall into, in the rubric's order, with its candidates scored once. Pure. */
export function advise(rubric: VisibilityRubric, needs: readonly Need[], opts: Options = {}): ChannelAdvice[] {
  return rubric.channels.flatMap((c) => {
    const mine = needs.filter((n) => n.channel === c.id);
    if (!mine.length) return [];
    return [{ channel: c.id, title: c.title, record: c.record, needs: mine, ranking: scoreTools(rubric, candidatesFor(rubric, c), opts) }];
  });
}

const read = (file: string) => readJson(join(repo, file)).pipe(Effect.mapError((e) => new CannotRun({ message: `${file}: ${describe(e)}`, cause: e })));

/** The shipped rubric. */
export const readRubric = () => Effect.map(read(RUBRIC), (r) => r as VisibilityRubric);

/** The venture's own weights and must-haves, under visibility in naive.config.json. */
export const optionsOf = (dir: string): Options => {
  const v = rawConfig(dir).visibility ?? {};
  return { ...(v.weights ? { weights: v.weights } : {}), ...(v.must ? { must: v.must } : {}) };
};

/** What is wrong with a venture's visibility lines: a criterion the rubric lacks. Pure, so check-config.ts can call it. */
export function ventureOptionProblems(rubric: VisibilityRubric, opts: Options = {}): string[] {
  const known = new Set(rubric.criteria.map((c) => c.id));
  return (["weights", "must"] as const).flatMap((field) =>
    Object.keys(opts[field] ?? {}).filter((id) => !known.has(id)).map((id) => `visibility.${field}.${id}: ${RUBRIC} has no criterion ${id} (one of ${[...known].join(", ")})`));
}

/** The steps of the workflows of the functions the venture lists. */
export const stepsOf = (dir: string, only?: string) => Effect.gen(function* () {
  const out: RecStep[] = [];
  for (const f of functionsOf(dir).filter((x) => only === undefined || x === only)) {
    const spec = functionAgent(f);
    for (const w of spec.workflows) out.push((yield* readJson(join(spec.module, "workflows", `${w}.json`))) as RecStep);
  }
  return out;
});

/** Reads the venture and the rubric and builds the recommendation. Fails on a goal or a function the venture lacks, or lines the rubric cannot hold. */
export const recommend = (dir: string, { goal: goalId, activity, function: only }: { goal?: string; activity?: string; function?: string } = {}) => Effect.gen(function* () {
  const rubric = yield* readRubric();
  const opts = optionsOf(dir);
  const wrong = ventureOptionProblems(rubric, opts);
  if (wrong.length) return yield* Effect.fail(new CannotRun({ message: `${CONFIG}: ${wrong.join("; ")}` }));
  const listed = functionsOf(dir);
  if (only !== undefined && !listed.includes(only))
    return yield* Effect.fail(new CannotRun({ message: `the venture does not list ${only} in venture.json departments (it lists ${listed.join(", ") || "none"})` }));
  const all = goals(dir);
  const goal = goalId === undefined ? undefined : all.find((g) => g.id === goalId);
  if (goalId !== undefined && !goal) return yield* Effect.fail(new CannotRun({ message: `no goal ${goalId} in foundation/goals` }));
  const inputs = yield* ownerInputs(dir);
  const scope = functionsInScope(listed, { goal, all, reqs: requirements(dir), roles: inputs.roles, only });
  const needs = needsFor(resolveOwners(inputs), stepsByActivity(yield* stepsOf(dir, only)), rubric, scope, activity);
  if (activity !== undefined && !needs.length && !scope.length) return yield* Effect.fail(new CannotRun({ message: "the venture lists no function in venture.json departments, so no activity is in scope" }));
  return {
    goal: goal ? { id: goal.id, kind: goal.kind, statement: goal.statement, measures: measureKeys(goal) } : null,
    activity: activity ?? null,
    functions: scope,
    recommend: advise(rubric, needs, opts),
    blind: needs.filter((n) => n.gap === "no-record"),
    decides: "person" as const,
    note: NOTE,
  } satisfies Recommendation;
});

/** A decision id: lower case, letters, digits and hyphens, so 3.5.1.6 becomes 3-5-1-6. Pure. */
export const slug = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** The id of the decision for one function: tools-<goal>-<function>, tools-<activity>-<function>, else tools-<function>. Pure. */
export const decisionId = (rec: Recommendation, fn: string): string =>
  `tools-${rec.goal ? `${slug(rec.goal.id)}-` : rec.activity ? `${slug(rec.activity)}-` : ""}${fn}`;

/** The decision's question for one function. Pure. */
export const question = (rec: Recommendation, fn: string, needs: readonly Need[]): string =>
  `${fn}: which tools should cover the ${needs.length} ${needs.length === 1 ? "activity" : "activities"} that ${rec.goal ? `goal ${rec.goal.id}` : "this venture"} needs to be visible?`;

const line = (n: Need) => `- ${n.activity} ${n.name} (${n.gap === "no-record" ? "nothing records it" : "only its result is recorded"}; a ${n.performer} performs it${n.approval === "person" ? " and a person approves it" : ""}; channel ${n.channel})`;

/** The decision's note for one function: the ranking per channel, the blind spots, and what accepting it means. Pure. */
export function note(rec: Recommendation, fn: string): string {
  const mine = rec.recommend.map((c) => ({ ...c, needs: c.needs.filter((n) => n.function === fn) })).filter((c) => c.needs.length);
  const blind = rec.blind.filter((n) => n.function === fn);
  return [
    `Proposed from the visibility rubric (${RUBRIC}, EE-222) for the function ${fn}, in scope because ${rec.functions.find((f) => f.id === fn)?.why ?? "the venture lists it"}.`,
    ...(rec.goal ? [`Goal ${rec.goal.id} (${rec.goal.kind}): ${rec.goal.statement}. ${rec.goal.measures.length ? `Measures: ${rec.goal.measures.join(", ")}.` : "It has no measure, so nothing says how anyone would know it was reached."}`] : []),
    ...mine.flatMap((c) => [
      `\n${c.title} (${c.needs.length} ${c.needs.length === 1 ? "activity" : "activities"}). A record of it is: ${c.record}`,
      ...c.needs.map(line),
      `  Candidates, best first: ${c.ranking.results.map((r) => `${r.id} ${r.status === "ranked" ? r.total.toFixed(3) : r.status === "ruled-out" ? `ruled out (${r.ruled_out.map((f) => `${f.criterion} ${f.score} < ${f.needs}`).join(", ")})` : r.status}${r.blind_spot ? ", a blind spot: it records nothing" : ""}`).join("; ")}`,
      ...(c.ranking.blind_spots.length ? [`  Blind spots among the candidates: ${c.ranking.blind_spots.join(", ")}.`] : []),
    ]),
    ...(blind.length ? [`\nNothing in the venture records these ${blind.length} ${blind.length === 1 ? "activity" : "activities"} at all today, whatever tool is chosen: ${blind.map((n) => n.activity).join(", ")}.`] : []),
    `\n${NOTE} Accepting this means a person records the choice: a connection record (it/connections/<id>.json) once the tool is connected, and the layer's tooling/integrations.json per the tool-selection skill. Nothing is changed by this proposal, and it can be withdrawn (mentura withdraw ${decisionId(rec, fn)} --by <person>).`,
  ].join("\n");
}

/** The decision's options for one function: every candidate the function's channels offer, best first, with the blind spots marked. Pure. */
export function options(rec: Recommendation, fn: string): string[] {
  const out: string[] = [];
  for (const c of rec.recommend) {
    if (!c.needs.some((n) => n.function === fn)) continue;
    for (const r of c.ranking.results) {
      const text = `${c.channel}: ${r.id}${r.status === "ruled-out" ? " (ruled out)" : ""}${r.blind_spot ? " (a blind spot: it records nothing)" : ""}`;
      if (!out.includes(text)) out.push(text);
    }
  }
  return out;
}

/** Files one open decision per function in scope that has a need, and keeps one already filed, open or decided, as it is. */
export function proposeRecommendation(dir: string, rec: Recommendation): Proposed[] {
  const served = rec.functions.map((f) => f.id).filter((fn) => rec.recommend.some((c) => c.needs.some((n) => n.function === fn)));
  return served.map((fn) => {
    const id = decisionId(rec, fn);
    const file = decisionFile(dir, id);
    if (file) {
      const prior = runSync(readJson(ventureFile(dir, file)));
      return { id, ok: true, result: { kept: id, file, status: isObject(prior) ? prior.status : undefined } };
    }
    const needs = rec.recommend.flatMap((c) => c.needs.filter((n) => n.function === fn));
    return { id, ...propose(dir, { id, question: question(rec, fn, needs), note: note(rec, fn), options: options(rec, fn) }, { agentId: `${fn}-agent`, via: "cli" }) };
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const flag = (name: string): string | undefined => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1]; };
  const [dir] = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
  if (!dir) {
    console.error("usage: node packages/naive/src/engine/tool-recommendations.ts <venture dir> [--goal <id>] [--activity <id>] [--function <id>] [--json] [--propose]");
    process.exit(2);
  }
  const json = args.includes("--json");
  await runMain(Effect.map(recommend(dir, { goal: flag("goal"), activity: flag("activity"), function: flag("function") }), (rec) => {
    const proposed = args.includes("--propose") ? proposeRecommendation(dir, rec) : null;
    if (json) console.log(JSON.stringify({ ...rec, ...(proposed ? { proposed } : {}) }, null, 2));
    else {
      console.log(`functions in scope: ${rec.functions.map((f) => `${f.id} (${f.from})`).join(", ") || "none"}`);
      if (rec.goal) console.log(`goal ${rec.goal.id}: ${rec.goal.statement}${rec.goal.measures.length ? `\n  measures: ${rec.goal.measures.join(", ")}` : "\n  no measure, so nothing says how anyone would know it was reached"}`);
      for (const c of rec.recommend) {
        console.log(`\n${c.title} (${c.needs.length} ${c.needs.length === 1 ? "activity" : "activities"})`);
        for (const n of c.needs) console.log(`  ${n.activity.padEnd(10)} ${n.name}  [${n.gap}]`);
        for (const r of c.ranking.results) console.log(`    ${r.id.padEnd(30)} ${r.status === "ranked" ? `${r.total.toFixed(3)}${r.tied ? " (tied)" : ""}` : r.status}${r.blind_spot ? "  BLIND SPOT: it records nothing" : ""}`);
      }
      if (rec.blind.length) console.log(`\n${rec.blind.length} activities nothing records today: ${rec.blind.map((n) => n.activity).join(", ")}`);
      if (!rec.recommend.length) console.log("\nNo activity in scope needs a tool to be seen.");
      if (proposed) console.log(`\nproposed ${proposed.filter((p) => p.result?.proposed).length} open decisions, kept ${proposed.filter((p) => p.result?.kept).length} already filed`);
      else console.log(`\nNothing written. Run with --propose to file one open decision per function for a person.`);
      console.log(NOTE);
    }
    const failed = (proposed ?? []).filter((p) => !p.ok);
    for (const p of failed) console.error(`could not propose ${p.id}: ${p.error}`);
    process.exitCode = failed.length ? 1 : 0;
  }));
}
