#!/usr/bin/env node
// The venture's customer problem tree and its ranking (EE-219).
//
//   node packages/naive/src/engine/problems.ts <venture dir> [tree|rank] [--json]
//   naive problems [tree|rank] [--json]
//
// One record holds the tree: foundation/problem.json (or purpose/validation/problem.json), whose statement is the
// root problem and whose forms are the problems below it. Two relations hold it together, and they are not the same
// claim:
//
//   parent    the form is a narrower case of another: the same problem for fewer people, or in one situation. This
//             is the opportunity solution tree (Torres, Continuous Discovery Habits, 2021). A form with no parent
//             sits directly under the record's statement.
//   cause_of  the form is a cause of another: a different problem that produces it. This is problem tree analysis
//             in the Logical Framework Approach (Norad, 1999), where the causes sit below the core problem.
//
// Two statements only a person makes: each ICP profile names its one core problem (foundation/icp/<id>.json
// core_problem), and at most one form carries the status target, the problem being worked on now. Both records are
// gated like the telos, so an agent's write is a draft a person accepts.
//
// The ranking is computed, never stored. Each problem's evidence comes from the validation interviews
// (validation/interviews/*.json problems), coded to the tree the way qualitative research codes to a codebook:
// raised unprompted, ranked first, pays for a workaround. The score is the weighted sum of those counts, with the
// weights from packages/naive/src/functions/strategy/problem-priority.json, which a venture replaces under problems
// in naive.config.json. Before any interview codes a problem, the basis is hypothesis: the founder's own order, the
// order the forms are listed in, and the output says so. Primary, secondary and tertiary are labels on that order
// and are never fields of a record.
//
// It reads, and writes nothing. packages/naive/src/checks/check-problems.ts fails on what treeFindings() finds and
// on the fail-closed rule of prerequisite(): no solution, offer or public content until the primary profile has a
// core problem and the venture has a target.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson, VentureFs } from "../core/effect/fs.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { globRegExp, readDataModel, venturePaths } from "../records/index.ts";
import { files as ventureFiles } from "../records/routes/routes.ts";
import { configFor } from "./naive-config.ts";
import type { IcpProfile, ProblemPriority, ValidationInterview, ValidationProblem, ValidationSolution } from "../records/types/records.d.ts";

const repo = new URL("../../../..", import.meta.url).pathname;
/** The definition: the weights, the statuses ranked, the labels and the records that wait for a target. */
export const DEFINITION = "packages/naive/src/functions/strategy/problem-priority.json";
/** Where the problem record lives, old layout last. */
export const PROBLEM_FILES = ["foundation/problem.json", "purpose/validation/problem.json"] as const;
/** The id no form may take: it names the record's own statement, the root of the tree. */
export const ROOT = "root";

export type Form = NonNullable<ValidationProblem["forms"]>[number];
export type Status = NonNullable<Form["status"]>;
/** One problem of the tree, with its relations resolved and the order the founder listed it in. */
export interface Node {
  readonly id: string;
  readonly statement: string;
  readonly segment?: string;
  /** The form it is a narrower case of, or null when it sits under the record's statement. */
  readonly parent: string | null;
  /** The forms it is a cause of. */
  readonly cause_of: readonly string[];
  readonly status: Status;
  /** Its place in the founder's own order, from 0. */
  readonly order: number;
}
/** What the interviews say about one problem. No judgment: counts only. */
export interface Counts {
  readonly interviews: number;
  readonly raised_unprompted: number;
  readonly ranked_first: number;
  readonly pays_for_workaround: number;
}
export type Weights = ProblemPriority["weights"];
/** One problem in the ranking. rank and label are null for a problem whose status is not ranked. */
export interface Ranked extends Node {
  readonly score: number;
  readonly counts: Counts;
  readonly rank: number | null;
  readonly label: string | null;
  /** The profiles that list it in problem_forms. */
  readonly icps: readonly string[];
  /** The profiles whose core problem it is. */
  readonly core_for: readonly string[];
}
/** The tree as a reader sees it: the root statement, then each problem with its narrower cases and its causes. */
export interface TreeNode {
  readonly id: string;
  readonly statement: string;
  readonly status: Status | null;
  /** Narrower cases of this problem (parent). */
  readonly narrower: readonly TreeNode[];
  /** The problems that are a cause of this one (cause_of, read the other way). */
  readonly causes: readonly string[];
}
/** The ICP profiles as the tree reads them. */
export interface Profile { readonly id: string; readonly primary: boolean; readonly problem_forms: readonly string[]; readonly core_problem: string | null; readonly file: string }
/** One interview's coding of the tree. */
export interface Coding { readonly interview: string; readonly entries: NonNullable<ValidationInterview["problems"]> }
/** Everything the tree is read from. */
export interface Inputs {
  readonly venture: string | null;
  readonly file: string | null;
  readonly record: ValidationProblem | null;
  readonly nodes: readonly Node[];
  readonly profiles: readonly Profile[];
  readonly codings: readonly Coding[];
  readonly definition: ProblemPriority;
  readonly weights: Weights;
  readonly weights_from: "framework" | "venture";
  /** The record types that wait for a target, each with the files of that type the venture already has. */
  readonly waiting: readonly { readonly record: string; readonly files: readonly string[] }[];
  /** The form each solution record names, by file. */
  readonly solves: readonly { readonly file: string; readonly problem: string }[];
}

const DEFAULT_STATUS: Status = "open";

/** The forms as nodes, in the order they are listed. Pure. */
export function nodesOf(record: ValidationProblem | null | undefined): Node[] {
  return (record?.forms ?? []).map((f, order) => ({
    id: f.id, statement: f.statement, ...(f.segment === undefined ? {} : { segment: f.segment }),
    parent: f.parent ?? null, cause_of: f.cause_of ?? [], status: f.status ?? DEFAULT_STATUS, order,
  }));
}

/** What the interviews counted for each problem. Pure. */
export function countsOf(codings: readonly Coding[]): Map<string, Counts> {
  const out = new Map<string, Counts>();
  for (const c of codings) for (const e of c.entries) {
    const was = out.get(e.problem) ?? { interviews: 0, raised_unprompted: 0, ranked_first: 0, pays_for_workaround: 0 };
    out.set(e.problem, {
      interviews: was.interviews + 1,
      raised_unprompted: was.raised_unprompted + (e.raised === "unprompted" ? 1 : 0),
      ranked_first: was.ranked_first + (e.ranked_first ? 1 : 0),
      pays_for_workaround: was.pays_for_workaround + (e.pays_for_workaround ? 1 : 0),
    });
  }
  return out;
}

export const NO_COUNTS: Counts = { interviews: 0, raised_unprompted: 0, ranked_first: 0, pays_for_workaround: 0 };

/** The weighted sum of one problem's counts. Pure. */
export function scoreOf(c: Counts, w: Weights): number {
  return c.raised_unprompted * w.raised_unprompted + c.ranked_first * w.ranked_first + c.pays_for_workaround * w.pays_for_workaround;
}

/** The label for a rank: the last label whose `from` the rank has reached. Pure. */
export function labelOf(rank: number, labels: ProblemPriority["labels"]): string | null {
  const hit = [...labels].sort((a, b) => a.from - b.from).filter((l) => rank >= l.from).at(-1);
  return hit?.label ?? null;
}

/**
 * The ranking: problems whose status the definition ranks, ordered by score and then by the founder's own order, each
 * with its rank, its label and the counts behind it. A problem with any other status keeps its place in the list with
 * no rank. basis is evidence when the interviews moved any score, else hypothesis, the founder's order. Pure.
 */
export function ranking(nodes: readonly Node[], counts: ReadonlyMap<string, Counts>, def: ProblemPriority, weights: Weights, profiles: readonly Profile[] = []):
  { basis: "evidence" | "hypothesis"; problems: Ranked[] } {
  const ranked = new Set<string>(def.ranked_statuses);
  const of = (n: Node): Ranked => {
    const c = counts.get(n.id) ?? NO_COUNTS;
    return {
      ...n, counts: c, score: scoreOf(c, weights), rank: null, label: null,
      icps: profiles.filter((p) => p.problem_forms.includes(n.id)).map((p) => p.id),
      core_for: profiles.filter((p) => p.core_problem === n.id).map((p) => p.id),
    };
  };
  const all = nodes.map(of);
  const inOrder = all.filter((n) => ranked.has(n.status)).sort((a, b) => b.score - a.score || a.order - b.order);
  const basis = inOrder.some((n) => n.score > 0) ? "evidence" : "hypothesis";
  const placed = new Map(inOrder.map((n, i) => [n.id, { rank: i + 1, label: labelOf(i + 1, def.labels) }]));
  return { basis, problems: [...inOrder, ...all.filter((n) => !ranked.has(n.status)).sort((a, b) => a.order - b.order)].map((n) => ({ ...n, ...(placed.get(n.id) ?? {}) })) };
}

/**
 * The tree under the record's statement: each problem with its narrower cases, and the problems that cause it. A
 * form whose parent no form has is shown at the top, where treeFindings() also reports it. Pure.
 */
export function treeOf(nodes: readonly Node[], statement: string): TreeNode {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const causesOf = (id: string) => nodes.filter((n) => n.cause_of.includes(id)).map((n) => n.id);
  const seen = new Set<string>();
  const build = (n: Node): TreeNode => {
    seen.add(n.id);
    return {
      id: n.id, statement: n.statement, status: n.status, causes: causesOf(n.id),
      narrower: nodes.filter((c) => c.parent === n.id && !seen.has(c.id)).map(build),
    };
  };
  const top = nodes.filter((n) => n.parent === null || n.parent === ROOT || !byId.has(n.parent));
  return { id: ROOT, statement, status: null, causes: causesOf(ROOT), narrower: top.filter((n) => !seen.has(n.id)).map(build) };
}

/** The ids on a path from a node up through parent, stopping at a repeat. Pure. */
function parentPath(start: Node, byId: ReadonlyMap<string, Node>): string[] {
  const path = [start.id];
  let at = start.parent;
  while (at && byId.has(at) && !path.includes(at)) { path.push(at); at = byId.get(at)?.parent ?? null; }
  return at && path.includes(at) ? [...path, at] : path;
}

/** Whether cause_of has a cycle from this node back to it. Pure. */
function causeLoop(start: Node, byId: ReadonlyMap<string, Node>): boolean {
  const seen = new Set<string>();
  const walk = (id: string): boolean => {
    if (id === start.id && seen.size) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return (byId.get(id)?.cause_of ?? []).some(walk);
  };
  return (start.cause_of ?? []).some(walk);
}

/**
 * What is wrong with the tree itself: ids, the two relations, one target at a time, each profile's core problem, the
 * interviews' codings and what a solution says it solves. Pure over its inputs, so the check and a test share it.
 */
export function treeFindings(i: Pick<Inputs, "nodes" | "profiles" | "codings" | "solves" | "file">): string[] {
  const out: string[] = [];
  const where = i.file ?? PROBLEM_FILES[0];
  const byId = new Map(i.nodes.map((n) => [n.id, n]));
  const live = (id: string) => byId.get(id) && byId.get(id)?.status !== "dropped";
  for (const id of new Set(i.nodes.filter((n, at) => i.nodes.findIndex((x) => x.id === n.id) !== at).map((n) => n.id)))
    out.push(`${where}: two forms are named ${id}`);
  for (const n of i.nodes) {
    if (n.id === ROOT) out.push(`${where}: a form may not be named ${ROOT}, which names the record's own statement`);
    if (n.parent === n.id) out.push(`${where}: form ${n.id} is a narrower case of itself`);
    else if (n.parent !== null && n.parent !== ROOT && !byId.has(n.parent)) out.push(`${where}: form ${n.id} names the parent ${n.parent}, which no form has`);
    else if (n.parent !== null) {
      const path = parentPath(n, byId);
      if (path.at(-1) === n.id && path.length > 1) out.push(`${where}: the forms ${path.slice(0, -1).join(", ")} form a loop through parent`);
    }
    for (const c of n.cause_of) {
      if (c === n.id) out.push(`${where}: form ${n.id} is a cause of itself`);
      else if (!byId.has(c)) out.push(`${where}: form ${n.id} is a cause of ${c}, which no form has`);
      else if (c === n.parent) out.push(`${where}: form ${n.id} is both a narrower case of ${c} and a cause of it: a narrower case is one shape of the same problem, a cause is another problem behind it, so name one`);
    }
    if (causeLoop(n, byId)) out.push(`${where}: form ${n.id} is a cause of itself through other forms`);
    if (n.status === "dropped") for (const c of i.nodes.filter((x) => x.parent === n.id && x.status !== "dropped"))
      out.push(`${where}: form ${n.id} is dropped, and ${c.id} is a narrower case of it: drop it too, or give it another parent`);
  }
  const targets = i.nodes.filter((n) => n.status === "target");
  if (targets.length > 1) out.push(`${where}: ${targets.map((n) => n.id).join(" and ")} all have status target; one problem is the target at a time, and a person chooses it`);
  for (const p of i.profiles) {
    if (p.core_problem === null) continue;
    if (!byId.has(p.core_problem)) out.push(`${p.file}: core_problem ${p.core_problem} names no form of ${where}`);
    else if (!live(p.core_problem)) out.push(`${p.file}: core_problem ${p.core_problem} is dropped, so it is not a problem this profile has any more`);
    else if (p.problem_forms.length && !p.problem_forms.includes(p.core_problem)) out.push(`${p.file}: core_problem ${p.core_problem} is not in problem_forms, so the profile does not claim the problem it is built on`);
  }
  const primary = i.profiles.find((p) => p.primary);
  const target = targets[0];
  if (primary && target && primary.problem_forms.length && !primary.problem_forms.includes(target.id))
    out.push(`${where}: the target ${target.id} is not a problem the primary profile ${primary.id} has (its problem_forms); work on a problem the primary profile has, or say the profile has this one`);
  for (const c of i.codings) {
    for (const e of c.entries) if (!byId.has(e.problem)) out.push(`validation/interviews/${c.interview}.json: codes the problem ${e.problem}, which no form of ${where} has`);
    const first = c.entries.filter((e) => e.ranked_first);
    if (first.length > 1) out.push(`validation/interviews/${c.interview}.json: ${first.map((e) => e.problem).join(" and ")} are each ranked first; one problem comes first for one person`);
  }
  for (const s of i.solves) {
    if (!byId.has(s.problem)) out.push(`${s.file}: problem ${s.problem} names no form of ${where}`);
    else if (!live(s.problem)) out.push(`${s.file}: problem ${s.problem} is dropped, so this solution solves a problem the venture ruled out`);
  }
  return out;
}

/** The fail-closed rule's verdict: what is missing, and the records that wait for it. */
export interface Prerequisite {
  readonly ok: boolean;
  /** What the rule itself asks for. A covered record already written while this is not empty is a failure. */
  readonly missing: readonly string[];
  /** Gaps another rule owns: the ICP profiles themselves, which the foundation lint and the phase gate ask for. */
  readonly advice: readonly string[];
  /** The files already written that the rule covers. */
  readonly written: readonly { readonly record: string; readonly file: string }[];
  readonly why: string | null;
}

/**
 * No solution, offer or public content until the venture has a target problem and the primary profile has a core
 * problem (EE-219). Pure over its inputs. ok is false only when something the rule covers is already written: a
 * venture that has written none of them is told what is missing without failing. A venture with no ICP profile at
 * all is advised, not failed, because the profiles are what the foundation lint and the phase gate ask for; this
 * rule holds the venture to the problem it says it is solving.
 */
export function prerequisite(i: Pick<Inputs, "nodes" | "profiles" | "waiting" | "definition" | "file">): Prerequisite {
  const req = i.definition.requires_target;
  const written = (req?.records ?? []).flatMap((record) => (i.waiting.find((w) => w.record === record)?.files ?? []).map((file) => ({ record, file })));
  const missing: string[] = [];
  const advice: string[] = [];
  const primary = i.profiles.find((p) => p.primary);
  if (!i.profiles.length) advice.push("no ICP profile: write foundation/icp/<id>.json for who has the problem, one of them primary, and name its core problem");
  else if (!primary) advice.push("no primary ICP profile: set primary true on the one profile the venture is built for");
  else if (!primary.core_problem) missing.push(`the primary profile ${primary.id} names no core_problem: name the one problem of its problem tree the venture exists to solve`);
  if (!i.nodes.length) missing.push(`${i.file ?? PROBLEM_FILES[0]} has no forms: write the problem tree, one form per problem`);
  else if (!i.nodes.some((n) => n.status === "target")) missing.push("no form has status target: a person chooses the one problem being worked on now");
  return { ok: !missing.length || !written.length, missing, advice, written, why: missing.length ? req?.why ?? null : null };
}

const cannot = (what: string) => (e: Parameters<typeof describe>[0]) => new CannotRun({ message: `${what}: ${describe(e)}`, cause: e });
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const MODEL = readDataModel();

/** The files of a record type a venture already has, by the data model's venture paths. */
export function filesOfType(dir: string, type: string): string[] {
  const globs = venturePaths(MODEL.records.find((r) => r.id === type)).map(globRegExp);
  return globs.length ? ventureFiles(dir).filter((f) => globs.some((re) => re.test(f))) : [];
}

/** Everything the tree is read from, for one venture. */
export const problemInputs = (dir: string) => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const definition = (yield* readJson(join(repo, DEFINITION)).pipe(Effect.mapError(cannot(DEFINITION)))) as ProblemPriority;
  const venture = yield* readJson(ventureFile(dir, "venture.json")).pipe(Effect.map((v) => (isObject(v) && typeof v.id === "string" ? v.id : null)), Effect.orElseSucceed(() => null));
  const file = PROBLEM_FILES.find((f) => existsSync(ventureFile(dir, f))) ?? null;
  const record = file ? (yield* readJson(ventureFile(dir, file)).pipe(Effect.mapError(cannot(file)))) as ValidationProblem : null;
  const profiles: Profile[] = [];
  const icpDir = ventureFile(dir, "foundation/icp");
  if (yield* fs.isDirectory(icpDir)) for (const f of (yield* fs.list(icpDir).pipe(Effect.mapError(cannot("foundation/icp")))).filter((n) => n.endsWith(".json"))) {
    const p = (yield* readJson(join(icpDir, f)).pipe(Effect.mapError(cannot(`foundation/icp/${f}`)))) as IcpProfile;
    profiles.push({ id: p.id ?? f.replace(/\.json$/, ""), primary: p.primary === true, problem_forms: p.problem_forms ?? [], core_problem: p.core_problem ?? null, file: `foundation/icp/${f}` });
  }
  const codings: Coding[] = [];
  const interviews = ventureFile(dir, "validation/interviews");
  if (yield* fs.isDirectory(interviews)) for (const f of (yield* fs.list(interviews).pipe(Effect.mapError(cannot("validation/interviews")))).filter((n) => n.endsWith(".json"))) {
    const v = (yield* readJson(join(interviews, f)).pipe(Effect.mapError(cannot(`validation/interviews/${f}`)))) as ValidationInterview;
    if (v.problems?.length) codings.push({ interview: v.id ?? f.replace(/\.json$/, ""), entries: v.problems });
  }
  const waiting = (definition.requires_target?.records ?? []).map((record) => ({ record, files: filesOfType(dir, record) }));
  const solves: { file: string; problem: string }[] = [];
  for (const f of waiting.find((w) => w.record === "validation-solution")?.files ?? []) {
    const s = (yield* readJson(ventureFile(dir, f)).pipe(Effect.mapError(cannot(f)))) as ValidationSolution;
    if (s.problem) solves.push({ file: f, problem: s.problem });
  }
  const config = yield* Effect.try({ try: () => configFor(dir), catch: (e: unknown) => new CannotRun({ message: `naive.config.json: ${e instanceof Error ? e.message : String(e)}`, cause: e }) });
  const own = config.problems?.weights;
  const weights = { ...definition.weights, ...(own ?? {}) };
  return {
    venture, file, record, nodes: nodesOf(record), profiles, codings, definition, weights,
    weights_from: own ? "venture" as const : "framework" as const, waiting, solves,
  } satisfies Inputs;
});

/** The tree, the ranking and the fail-closed verdict for one venture. */
export const problemsOf = (dir: string) => Effect.map(problemInputs(dir), (i) => ({
  venture: i.venture,
  file: i.file,
  statement: i.record?.statement ?? null,
  standards: i.definition.standards ?? [],
  weights: { ...i.weights, from: i.weights_from },
  tree: i.record ? treeOf(i.nodes, i.record.statement) : null,
  ...ranking(i.nodes, countsOf(i.codings), i.definition, i.weights, i.profiles),
  interviews: i.codings.length,
  findings: treeFindings(i),
  prerequisite: prerequisite(i),
}));

const line = (t: TreeNode, depth: number): string[] => [
  `${"  ".repeat(depth)}${depth ? "- " : ""}${t.id === ROOT ? "(statement)" : t.id}${t.status && t.status !== "open" ? ` [${t.status}]` : ""}: ${t.statement}`,
  ...t.causes.map((c) => `${"  ".repeat(depth + 1)}<- caused by ${c}`),
  ...t.narrower.flatMap((n) => line(n, depth + 1)),
];

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const [dir, what = "tree"] = args.filter((a) => !a.startsWith("--"));
  if (!dir || !existsSync(ventureFile(dir, "venture.json")) || !["tree", "rank"].includes(what)) {
    console.error("usage: node packages/naive/src/engine/problems.ts <venture dir> [tree|rank] [--json]");
    process.exit(2);
  }
  await runMain(Effect.map(problemsOf(dir), (p) => {
    if (json) { console.log(JSON.stringify(p, null, 2)); return; }
    if (!p.file) { console.log(`${p.venture ?? dir} has no problem record yet: write ${PROBLEM_FILES[0]} with the problem in the words of the people who have it.`); return; }
    if (what === "tree") {
      console.log(`The problem tree of ${p.venture ?? dir}, from ${p.file}. parent is a narrower case, cause_of a problem behind it.\n`);
      if (p.tree) for (const l of line(p.tree, 0)) console.log(l);
      if (!p.problems.length) console.log("\nNo forms yet: the statement is the whole tree.");
    } else {
      console.log(`The problems of ${p.venture ?? dir}, ranked from ${p.interviews} coded interview(s). Basis: ${p.basis}${p.basis === "hypothesis" ? " (the founder's own order; no interview has coded a problem yet)" : ""}.`);
      console.log(`Weights (${p.weights.from}): unprompted ${p.weights.raised_unprompted}, first ${p.weights.ranked_first}, pays ${p.weights.pays_for_workaround}.\n`);
      for (const r of p.problems) {
        const place = r.rank === null ? `   ${r.status}` : `${String(r.rank).padStart(2)}. ${r.label}`;
        console.log(`${place.padEnd(16)} ${r.id.padEnd(28)} score ${String(r.score).padStart(3)}  unprompted ${r.counts.raised_unprompted}, first ${r.counts.ranked_first}, pays ${r.counts.pays_for_workaround}${r.core_for.length ? `  core for ${r.core_for.join(", ")}` : ""}${r.status === "target" ? "  TARGET" : ""}`);
      }
      console.log("\nPrimary, secondary and tertiary are labels on this order, not fields of a record. Nothing written.");
    }
    for (const f of p.findings) console.log(`FAIL  ${f}`);
    for (const m of p.prerequisite.missing) console.log(`${p.prerequisite.ok ? "next" : "FAIL"}  ${m}`);
    for (const a of p.prerequisite.advice) console.log(`next  ${a}`);
  }));
}
