#!/usr/bin/env node
// Feature reports: what a product manager keeps about each feature, read from the venture's own records (EE-228,
// docs/design/FEATURE_REPORTS_2026-11-27.md). A feature is a product capability (EE-224,
// product/capabilities/<id>.json); a category's report covers it and every capability under it.
//
//   node packages/naive/src/engine/feature-report.ts <venture dir> [list|report <id>|<id>] [--json] [--md]
//   naive features [list|report <id>] [--json] [--md]
//
// One feature's report has eight sections, each with the files its facts came from and a hole for each fact no
// record holds, naming the record that would fill it:
//
//   place      the product and the chain of categories above it, and what sits under it
//   lifecycle  its status now, and every status it had, with who changed it and when (provenance and the blob store)
//   why        the goals it serves with each goal's status, the requirements it meets, and the job its product card
//              names for it
//   priority   RICE (Intercom's method), reach times impact times confidence over effort, computed only when the
//              record holds a person's inputs: scored when provenance shows a person wrote them, unconfirmed when no
//              provenance line says who did, and not scored when an agent wrote them or there are none
//   quality    open bugs that name it by severity, and the support cases filed against those bugs
//   feedback   validation feedback for its id (validation/feedback)
//   adoption   telemetry for its id (.naive/telemetry.jsonl): events, sessions, outcomes, first and last seen. Breadth,
//              time to adopt and stickiness need the eligible users and a user id that no record holds, so they are
//              holes and never estimated
//   proof      whether the capability record's bytes are the ones its last provenance line recorded: proven, adopted
//              (a person's baseline), changed (edited outside the router since) or unrecorded (never through it)
//
// The portfolio report lists every feature grouped by product, in tree order, with status, owner, open P0 and P1
// bugs, RICE, proof and adoption sessions.
//
// featureReport and portfolioReport are pure over the facts gathered once per venture (gatherFacts), which reads
// through VentureFs (EE-125). It writes nothing.

import { createHash } from "node:crypto";
import { join } from "node:path";
import { Effect } from "effect";
import { readBlobEffect } from "../core/blobs.ts";
import { CannotRun, type NaiveError } from "../core/effect/errors.ts";
import { VentureFs, readJson } from "../core/effect/fs.ts";
import { runMain } from "../core/effect/run.ts";
import { entriesEffect, type Entry } from "../core/provenance.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { readGoals, readRequirements, statusOf } from "./goals.ts";
import { FILE as TELEMETRY, refuse } from "./telemetry.ts";
import type { Bug, Goal, Product, ProductCapability, Requirement, SupportCase, Telemetry, ValidationFeedback } from "../records/types/records.d.ts";

export const CAPABILITIES = "product/capabilities";
export const BUGS = "product/bugs";
export const CASES = "support/cases";
export const FEEDBACK = "validation/feedback";
export { TELEMETRY };

/** A record and the venture-relative file it was read from. */
export interface Located<T> { readonly file: string; readonly record: T }
/** One version of a capability, from one provenance line. record is null when the blob store lacks its bytes. */
export interface Version {
  readonly at: string; readonly activity: string; readonly by: string | null; readonly kind: string;
  readonly sha256: string | null; readonly record: ProductCapability | null;
}
/** A capability as gathered: the record, its file, the sha256 of its bytes now and every version provenance names. */
export interface CapabilityFacts extends Located<ProductCapability> { readonly sha256: string; readonly versions: readonly Version[] }
/** Everything a feature report is computed from, gathered once per venture. */
export interface Facts {
  readonly venture: string | null;
  readonly capabilities: readonly CapabilityFacts[];
  readonly products: readonly Located<Product>[];
  readonly goals: readonly Located<Goal>[];
  readonly requirements: readonly Located<Requirement>[];
  readonly bugs: readonly Located<Bug>[];
  readonly cases: readonly Located<SupportCase>[];
  readonly feedback: readonly Located<ValidationFeedback>[];
  /** null when the venture has no telemetry log. unreadable counts lines the telemetry schema refuses. */
  readonly telemetry: { readonly events: readonly Telemetry[]; readonly unreadable: number } | null;
}

/** A fact no record holds, and the record that would fill it. */
export interface Hole { readonly fact: string; readonly fill: string }
/** What every section carries: where its facts came from, and what is missing. */
export interface Basis { readonly sources: readonly string[]; readonly holes: readonly Hole[] }

export type ProofState = "proven" | "adopted" | "changed" | "unrecorded";
export interface Proof { readonly state: ProofState; readonly why: string }
export type RiceState = "scored" | "unconfirmed" | "not-scored";
export type Rice = NonNullable<ProductCapability["rice"]>;
export type Severity = Bug["severity"];

export interface FeatureReport {
  readonly venture: string | null;
  readonly id: string; readonly name: string; readonly kind: ProductCapability["kind"]; readonly owner: string;
  readonly summary: string | null; readonly file: string;
  /** The capabilities the quality, feedback and adoption sections count: itself, and for a category everything under it. */
  readonly covers: readonly string[];
  readonly place: Basis & { readonly product: string; readonly product_name: string | null; readonly path: readonly string[]; readonly children: readonly string[] };
  readonly lifecycle: Basis & { readonly status: ProductCapability["status"]; readonly since: string | null; readonly history: readonly { at: string; status: string | null; by: string | null; kind: string; activity: string }[] };
  readonly why: Basis & {
    readonly goals: readonly { ref: string; goal: string; measure: string | null; statement: string | null; status: string | null }[];
    readonly requirements: readonly { id: string; statement: string | null }[];
    readonly job: string | null;
  };
  readonly priority: Basis & { readonly state: RiceState; readonly score: number | null; readonly inputs: Rice | null; readonly why: string };
  readonly quality: Basis & {
    readonly open: Record<Severity, number>;
    readonly bugs: readonly { id: string; capability: string; severity: Severity; status: Bug["status"]; title: string }[];
    readonly cases: readonly { id: string; bug: string; status: SupportCase["status"]; kind: SupportCase["kind"] }[];
  };
  readonly feedback: Basis & { readonly items: readonly { id: string; capability: string; checkpoint: string; at: string; tester: string }[] };
  readonly adoption: Basis & {
    readonly events: number; readonly sessions: number; readonly outcomes: Record<Telemetry["outcome"], number>;
    readonly first_seen: string | null; readonly last_seen: string | null; readonly breadth: null;
  };
  readonly proof: Basis & Proof;
}

export interface PortfolioRow {
  readonly id: string; readonly name: string; readonly kind: ProductCapability["kind"]; readonly depth: number;
  readonly status: ProductCapability["status"]; readonly owner: string; readonly blocking: number;
  readonly rice: RiceState; readonly score: number | null; readonly proof: ProofState; readonly sessions: number | null;
}
export interface PortfolioReport {
  readonly venture: string | null;
  readonly products: readonly { product: string; name: string | null; features: readonly PortfolioRow[] }[];
  readonly counts: { readonly features: number; readonly live: number; readonly building: number; readonly retired: number; readonly not_scored: number; readonly unproven: number };
  readonly holes: readonly Hole[];
}

const SEVERITIES: readonly Severity[] = ["P0", "P1", "P2", "P3"];
const OUTCOMES: readonly Telemetry["outcome"][] = ["ok", "error", "refused", "cancelled"];
/** The provenance activities that put a record's current bytes down. A held draft does not: it waits for a person. */
export const SETTLES = new Set(["write", "accept", "merge", "rollback", "confirm", "baseline"]);
const isOpen = (b: Bug): boolean => b.status === "open" || b.status === "in-progress";
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);
const fileOf = (id: string): string => `${CAPABILITIES}/${id}.json`;
/** Who wrote a version, as a reader says it: the name and kind, or an unnamed kind when the line names no one. */
const who = (v: { readonly by: string | null; readonly kind: string }): string => (v.by ? `${v.by} (${v.kind})` : `an unnamed ${v.kind}`);
const unique = <T>(xs: readonly T[]): T[] => [...new Set(xs)];

/** The capability and every capability under it, in tree order. Pure. */
export function coverOf(caps: readonly ProductCapability[], id: string): string[] {
  const out: string[] = [];
  const walk = (at: string): void => {
    if (out.includes(at)) return; // a loop is check-ventures.ts's to report; here it only stops
    out.push(at);
    for (const c of caps.filter((x) => x.parent === at)) walk(c.id);
  };
  walk(id);
  return out;
}

/** The categories above a capability, the top one first. Pure. */
export function pathOf(caps: readonly ProductCapability[], id: string): string[] {
  const byId = new Map(caps.map((c) => [c.id, c]));
  const out: string[] = [];
  for (let p = byId.get(id)?.parent ?? null; p !== null && !out.includes(p); p = byId.get(p)?.parent ?? null) out.unshift(p);
  return out;
}

/** What one file's provenance says about its current bytes. Pure. The same rule as EE-227's proof of a record. */
export function proofOf(file: string, sha256: string, versions: readonly Version[]): Proof {
  const last = [...versions].reverse().find((v) => SETTLES.has(v.activity));
  if (!last) return { state: "unrecorded", why: `${file} has no line in the provenance log, so it was written outside the router` };
  if (last.sha256 !== sha256) return { state: "changed", why: `${file} differs from its last recorded ${last.activity} (${last.at}), so it was changed outside the router since` };
  return last.activity === "baseline"
    ? { state: "adopted", why: `${file} was adopted by ${who(last)} with these bytes (baseline)` }
    : { state: "proven", why: `${file} is the bytes of its ${last.activity} at ${last.at} by ${who(last)}` };
}

/** RICE: reach times impact times confidence over effort, rounded to two places. Pure. */
export const riceScore = (r: Rice): number => Math.round(((r.reach * r.impact * r.confidence) / r.effort) * 100) / 100;

/**
 * Whether the RICE inputs the record holds now are a person's. Pure. The version that introduced them is the first of
 * the last run of settled versions that hold the same inputs: its writer is who set them, whatever set_by says.
 */
export function priorityOf(rice: Rice | undefined, versions: readonly Version[]): { state: RiceState; score: number | null; why: string } {
  if (!rice) return { state: "not-scored", score: null, why: "no RICE inputs: a person sets rice on the capability record" };
  const settled = versions.filter((v) => SETTLES.has(v.activity));
  let from: Version | null = null;
  for (let i = settled.length - 1; i >= 0 && same(settled[i].record?.rice, rice); i--) from = settled[i];
  const score = riceScore(rice);
  if (!from) return { state: "unconfirmed", score, why: `set_by says ${rice.set_by}, but no provenance line holds these inputs, so nothing confirms who wrote them` };
  if (from.kind !== "person") return { state: "not-scored", score: null, why: `the inputs were written by ${who(from)} at ${from.at}, not a person: a person sets RICE` };
  return { state: "scored", score, why: `set by ${who(from)} at ${from.at} (${from.activity})` };
}

const hole = (fact: string, fill: string): Hole => ({ fact, fill });

/** One feature's report, or null when the venture has no capability with that id. Pure. */
export function featureReport(f: Facts, id: string): FeatureReport | null {
  const me = f.capabilities.find((c) => c.record.id === id);
  if (!me) return null;
  const c = me.record;
  const caps = f.capabilities.map((x) => x.record);
  const covers = coverOf(caps, id);
  const inCover = (x: string | undefined): x is string => x !== undefined && covers.includes(x);
  const product = f.products.find((p) => p.record.id === c.product) ?? null;

  // Lifecycle: a version whose status differs from the one before it, oldest first. Drafts never went live.
  const history: FeatureReport["lifecycle"]["history"][number][] = [];
  for (const v of me.versions.filter((x) => SETTLES.has(x.activity))) {
    const status = v.record?.status ?? null;
    if (!history.length || history[history.length - 1].status !== status) history.push({ at: v.at, status, by: v.by, kind: v.kind, activity: v.activity });
  }
  const lifecycleHoles: Hole[] = [];
  if (!me.versions.length) lifecycleHoles.push(hole("its status history", `a write of ${me.file} through the router (mentura ${CAPABILITIES}/${id} write), so each change has a provenance line`));
  else if (me.versions.some((v) => SETTLES.has(v.activity) && !v.record)) lifecycleHoles.push(hole("the status of a version whose bytes are not in the blob store", "nothing: a version written before the blob store existed is not backfilled"));
  if (!c.since) lifecycleHoles.push(hole("when it reached its status", `since on ${me.file}`));

  // Why it exists.
  const goals = (c.goals ?? []).map((ref) => {
    const [goal, measure = null] = ref.split("/");
    const g = f.goals.find((x) => x.record.id === goal)?.record;
    const statement = g ? (measure ? g.measures?.find((m) => m.id === measure)?.statement ?? null : g.statement) : null;
    return { ref, goal, measure, statement, status: g ? statusOf(g) : null };
  });
  const requirements = (c.requirements ?? []).map((r) => ({ id: r, statement: f.requirements.find((x) => x.record.id === r)?.record.statement ?? null }));
  const job = product?.record.features?.find((x) => x.id === id)?.job ?? null;
  const whyHoles: Hole[] = [];
  if (!goals.length) whyHoles.push(hole("the goals it serves", `goals on ${me.file}, each a goal id or goal/measure in foundation/goals`));
  for (const g of goals) if (g.statement === null) whyHoles.push(hole(`goal ${g.ref}`, `foundation/goals/${g.goal}.json${g.measure ? ` with a measure ${g.measure}` : ""}`));
  if (!requirements.length) whyHoles.push(hole("the requirements it meets", `requirements on ${me.file}, each an id in foundation/requirements`));
  for (const r of requirements) if (r.statement === null) whyHoles.push(hole(`requirement ${r.id}`, `foundation/requirements/${r.id}.json`));
  if (!job && c.kind === "capability") whyHoles.push(hole("the job it serves", `a feature with id ${id} and its job on the product card ${product?.file ?? `products/${c.product}.json`}`));

  // Priority.
  const pr = priorityOf(c.rice, me.versions);
  const priorityHoles = c.rice ? [] : [hole("RICE inputs", `rice on ${me.file}, set by a person`)];

  // Quality.
  const bugs = f.bugs.filter((b) => inCover(b.record.capability));
  const open = Object.fromEntries(SEVERITIES.map((s) => [s, bugs.filter((b) => isOpen(b.record) && b.record.severity === s).length])) as Record<Severity, number>;
  const bugIds = new Set(bugs.map((b) => b.record.id));
  const cases = f.cases.filter((x) => x.record.bug !== undefined && bugIds.has(x.record.bug));
  const unlinked = f.bugs.filter((b) => b.record.capability === undefined).length;
  const qualityHoles: Hole[] = !f.bugs.length ? [hole("its bugs: the venture keeps no bug records, so no open bug is not the same as none", `${BUGS}/<id>.json with capability ${id}`)]
    : unlinked ? [hole(`which capability ${unlinked} bug(s) break`, `capability on each record in ${BUGS}`)] : [];

  // Feedback.
  const feedback = f.feedback.filter((x) => inCover(x.record.capability));
  const feedbackHoles = feedback.length ? [] : [hole("tester feedback on it", `${FEEDBACK}/<id>.json with capability ${id}`)];

  // Adoption: counted, never estimated.
  const events = (f.telemetry?.events ?? []).filter((e) => inCover(e.capability));
  const times = events.map((e) => e.at).sort();
  const adoptionHoles: Hole[] = [];
  if (!f.telemetry) adoptionHoles.push(hole("usage", `${TELEMETRY}: telemetry is opt-in (telemetry.enabled in naive.config.json)`));
  else if (!events.length) adoptionHoles.push(hole("usage", `telemetry events with capability ${id} in ${TELEMETRY}`));
  adoptionHoles.push(
    hole("breadth, the share of eligible users who used it", "a count of the users eligible for it, which no record holds"),
    hole("time to adopt and stickiness", "a user id on each event and the date it was released to them; telemetry carries an anonymous session only"),
  );

  const proof = proofOf(me.file, me.sha256, me.versions);
  return {
    venture: f.venture, id, name: c.name, kind: c.kind, owner: c.owner, summary: c.summary ?? null, file: me.file, covers,
    place: { product: c.product, product_name: product?.record.name ?? null, path: pathOf(caps, id), children: caps.filter((x) => x.parent === id).map((x) => x.id),
      sources: unique([me.file, ...(product ? [product.file] : [])]), holes: product ? [] : [hole(`product ${c.product}`, `products/${c.product}.json`)] },
    lifecycle: { status: c.status, since: c.since ?? null, history, sources: [me.file, "provenance.jsonl", ".naive/blobs"], holes: lifecycleHoles },
    why: { goals, requirements, job,
      sources: unique([me.file, ...goals.flatMap((g) => f.goals.filter((x) => x.record.id === g.goal).map((x) => x.file)), ...requirements.flatMap((r) => f.requirements.filter((x) => x.record.id === r.id).map((x) => x.file)), ...(job && product ? [product.file] : [])]),
      holes: whyHoles },
    priority: { ...pr, inputs: c.rice ?? null, sources: [me.file, "provenance.jsonl"], holes: priorityHoles },
    quality: { open, bugs: bugs.map((b) => ({ id: b.record.id, capability: b.record.capability ?? id, severity: b.record.severity, status: b.record.status, title: b.record.title })),
      cases: cases.map((x) => ({ id: x.record.id, bug: x.record.bug ?? "", status: x.record.status, kind: x.record.kind })),
      sources: [...bugs.map((b) => b.file), ...cases.map((x) => x.file)], holes: qualityHoles },
    feedback: { items: feedback.map((x) => ({ id: x.record.id, capability: x.record.capability, checkpoint: x.record.checkpoint, at: x.record.at, tester: x.record.tester })),
      sources: feedback.map((x) => x.file), holes: feedbackHoles },
    adoption: { events: events.length, sessions: new Set(events.map((e) => e.session)).size,
      outcomes: Object.fromEntries(OUTCOMES.map((o) => [o, events.filter((e) => e.outcome === o).length])) as Record<Telemetry["outcome"], number>,
      first_seen: times[0] ?? null, last_seen: times[times.length - 1] ?? null, breadth: null,
      sources: f.telemetry ? [TELEMETRY] : [], holes: adoptionHoles },
    proof: { ...proof, sources: [me.file, "provenance.jsonl"], holes: proof.state === "proven" || proof.state === "adopted" ? [] : [hole("proof of its current bytes", `a write of ${me.file} through the router, or a person's baseline (mentura baseline)`)] },
  };
}

/** Every feature of the venture, grouped by product and in tree order. Pure. */
export function portfolioReport(f: Facts): PortfolioReport {
  const caps = f.capabilities.map((c) => c.record);
  const productIds = unique([...f.products.map((p) => p.record.id).filter((p) => caps.some((c) => c.product === p)), ...caps.map((c) => c.product)]);
  const products = productIds.map((product) => {
    const order: string[] = [];
    for (const top of caps.filter((c) => c.product === product && (c.parent === null || !caps.some((x) => x.id === c.parent)))) for (const id of coverOf(caps, top.id)) if (!order.includes(id)) order.push(id);
    const features = order.flatMap((id): PortfolioRow[] => {
      const r = featureReport(f, id);
      return r ? [{ id, name: r.name, kind: r.kind, depth: r.place.path.length, status: r.lifecycle.status, owner: r.owner, blocking: r.quality.open.P0 + r.quality.open.P1,
        rice: r.priority.state, score: r.priority.score, proof: r.proof.state, sessions: f.telemetry ? r.adoption.sessions : null }] : [];
    });
    return { product, name: f.products.find((p) => p.record.id === product)?.record.name ?? null, features };
  });
  const rows = products.flatMap((p) => p.features);
  const holes: Hole[] = [];
  if (!caps.length) holes.push(hole("the venture's features", `${CAPABILITIES}/<id>.json, one per capability or category (EE-224)`));
  if (!f.telemetry) holes.push(hole("usage", `${TELEMETRY}: telemetry is opt-in (telemetry.enabled in naive.config.json)`));
  return {
    venture: f.venture, products,
    counts: { features: rows.length, live: rows.filter((r) => r.status === "live").length, building: rows.filter((r) => r.status === "building").length, retired: rows.filter((r) => r.status === "retired").length,
      not_scored: rows.filter((r) => r.rice === "not-scored").length, unproven: rows.filter((r) => r.proof !== "proven" && r.proof !== "adopted").length },
    holes,
  };
}

// ---- Gathering: the one place that reads the venture ----

const cannot = (what: string) => (e: NaiveError) => new CannotRun({ message: `${what}: ${e.message}`, cause: e });
const hasId = (v: unknown): v is { id: string } => typeof v === "object" && v !== null && typeof (v as { id?: unknown }).id === "string";
const sha = (b: Buffer): string => createHash("sha256").update(b).digest("hex");

/** Every JSON record in one folder, by file name. A folder that is not there holds none. Records are trusted to match their schema (validate.ts). */
const folder = <T>(dir: string, rel: string): Effect.Effect<Located<T>[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const d = ventureFile(dir, rel);
  if (!(yield* fs.isDirectory(d))) return [];
  const out: Located<T>[] = [];
  for (const name of (yield* fs.list(d)).filter((x) => x.endsWith(".json")).sort()) {
    const v = yield* readJson(join(d, name)).pipe(Effect.mapError(cannot(`${rel}/${name}`)));
    if (hasId(v)) out.push({ file: `${rel}/${name}`, record: v as T });
  }
  return out;
});

const versionsOf = (dir: string, file: string, lines: readonly Entry[]): Effect.Effect<Version[], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const out: Version[] = [];
  for (const e of lines.filter((x) => x.entity === file || x.entity.endsWith(`://${file}`))) {
    const bytes = e.sha256 ? yield* Effect.catchTags(readBlobEffect(dir, e.sha256), { NotFound: () => Effect.succeed(null), ParseError: () => Effect.succeed(null) }) : null;
    let record: ProductCapability | null = null;
    if (bytes) { try { const v: unknown = JSON.parse(bytes.toString("utf8")); record = hasId(v) ? (v as ProductCapability) : null; } catch { record = null; } }
    out.push({ at: e.at, activity: e.activity, by: e.agent?.id ?? null, kind: e.agent?.kind ?? "unknown", sha256: e.sha256 ?? null, record });
  }
  return out;
});

/** The telemetry log, each line checked against the telemetry schema at the boundary. null when there is none. */
const telemetryOf = (dir: string): Effect.Effect<Facts["telemetry"], NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const file = ventureFile(dir, TELEMETRY);
  if (!(yield* fs.exists(file))) return null;
  const events: Telemetry[] = [];
  let unreadable = 0;
  for (const line of (yield* fs.readText(file).pipe(Effect.mapError(cannot(TELEMETRY)))).split("\n").filter((l) => l.trim())) {
    let v: unknown = null;
    try { v = JSON.parse(line); } catch { v = null; }
    if (typeof v === "object" && v !== null && !Array.isArray(v) && refuse(v as Record<string, unknown>) === null) events.push(v as Telemetry);
    else unreadable++;
  }
  return { events, unreadable };
});

/** Everything the reports read, for one venture. */
export const gatherFacts = (dir: string): Effect.Effect<Facts, NaiveError, "naive/VentureFs"> => Effect.gen(function* () {
  const fs = yield* VentureFs;
  const v = yield* readJson(ventureFile(dir, "venture.json")).pipe(Effect.mapError(cannot("venture.json")));
  const lines = yield* entriesEffect(dir).pipe(Effect.mapError(cannot("provenance.jsonl")));
  const capabilities: CapabilityFacts[] = [];
  for (const c of yield* folder<ProductCapability>(dir, CAPABILITIES)) {
    const bytes = yield* fs.readBytes(ventureFile(dir, c.file)).pipe(Effect.mapError(cannot(c.file)));
    capabilities.push({ ...c, sha256: sha(bytes), versions: yield* versionsOf(dir, c.file, lines) });
  }
  return {
    venture: hasId(v) ? v.id : null,
    capabilities,
    products: [...(yield* folder<Product>(dir, "products")), ...(yield* folder<Product>(dir, "product"))],
    goals: (yield* readGoals(dir)).map((g) => ({ file: g.file, record: g.goal })),
    requirements: (yield* readRequirements(dir)).map((r) => ({ file: r.file, record: r.rec })),
    bugs: yield* folder<Bug>(dir, BUGS),
    cases: yield* folder<SupportCase>(dir, CASES),
    feedback: yield* folder<ValidationFeedback>(dir, FEEDBACK),
    telemetry: yield* telemetryOf(dir),
  };
});

// ---- Rendering ----

const basis = (b: Basis, md: boolean): string[] => [
  ...(b.sources.length ? [`${md ? "_" : "  "}from ${b.sources.join(", ")}${md ? "_" : ""}`] : []),
  ...b.holes.map((h) => `${md ? "- " : "  "}hole: ${h.fact}. Fill with ${h.fill}`),
];

/** One feature's report as text, or as Markdown with md. Pure. */
export function renderFeature(r: FeatureReport, md = false): string {
  const h = (t: string) => (md ? `\n## ${t}\n` : `\n${t.toUpperCase()}`);
  const li = (t: string) => (md ? `- ${t}` : `  ${t}`);
  const out: string[] = [md ? `# ${r.name} (${r.id})` : `${r.name} (${r.id}), a ${r.kind} of ${r.place.product_name ?? r.place.product}${r.venture ? ` in ${r.venture}` : ""}`];
  if (md) out.push("", `A ${r.kind} of ${r.place.product_name ?? r.place.product}${r.venture ? ` in ${r.venture}` : ""}, owned by ${r.owner}. ${r.summary ?? ""}`.trimEnd());
  else out.push(li(`owner ${r.owner}${r.summary ? `. ${r.summary}` : ""}`));
  if (r.kind === "category") out.push(li(`Quality, feedback and adoption cover ${r.covers.join(", ")}.`));

  out.push(h("Place"), li(`${[r.place.product, ...r.place.path, r.id].join(" > ")}`), ...(r.place.children.length ? [li(`under it: ${r.place.children.join(", ")}`)] : []), ...basis(r.place, md));
  out.push(h("Lifecycle"), li(`${r.lifecycle.status}${r.lifecycle.since ? ` since ${r.lifecycle.since}` : ""}`),
    ...r.lifecycle.history.map((x) => li(`${x.at}  ${x.status ?? "(bytes not kept)"}  by ${who(x)}, ${x.activity}`)), ...basis(r.lifecycle, md));
  out.push(h("Why it exists"),
    ...r.why.goals.map((g) => li(`serves ${g.ref}${g.status ? ` [${g.status}]` : ""}: ${g.statement ?? "(no such record)"}`)),
    ...r.why.requirements.map((q) => li(`meets ${q.id}: ${q.statement ?? "(no such record)"}`)),
    ...(r.why.job ? [li(`job: ${r.why.job}`)] : []), ...basis(r.why, md));
  const p = r.priority;
  out.push(h("Priority"), li(p.inputs ? `RICE ${p.score ?? "not scored"} (${p.state}): reach ${p.inputs.reach}${p.inputs.reach_unit ? ` ${p.inputs.reach_unit}` : ""} x impact ${p.inputs.impact} x confidence ${p.inputs.confidence} / effort ${p.inputs.effort}. ${p.why}` : `not scored: ${p.why}`), ...basis(p, md));
  const q = r.quality;
  out.push(h("Quality"), li(`open bugs: P0 ${q.open.P0}, P1 ${q.open.P1}, P2 ${q.open.P2}, P3 ${q.open.P3}${q.open.P0 + q.open.P1 ? "" : " (no open P0 or P1)"}`),
    ...q.bugs.map((b) => li(`${b.severity}  ${b.id}  ${b.title}  (${b.status}${b.capability !== r.id ? `, on ${b.capability}` : ""})`)),
    ...q.cases.map((c) => li(`support case ${c.id} (${c.kind}, ${c.status}) through ${c.bug}`)), ...basis(q, md));
  out.push(h("Feedback"), li(`${r.feedback.items.length} feedback record(s)`), ...r.feedback.items.map((x) => li(`${x.at}  ${x.id}  ${x.checkpoint} from ${x.tester}`)), ...basis(r.feedback, md));
  const a = r.adoption;
  out.push(h("Adoption"), li(a.events ? `${a.events} event(s) in ${a.sessions} session(s), first ${a.first_seen}, last ${a.last_seen}; outcomes ok ${a.outcomes.ok}, error ${a.outcomes.error}, refused ${a.outcomes.refused}, cancelled ${a.outcomes.cancelled}` : "no events"),
    li("High adoption does not prove value: read it beside the goals it serves."), ...basis(a, md));
  out.push(h("Proof"), li(`${r.proof.state}: ${r.proof.why}`), ...basis(r.proof, md));
  return out.join("\n");
}

/** The portfolio as text, or as Markdown with md. Pure. */
export function renderPortfolio(p: PortfolioReport, md = false): string {
  const c = p.counts;
  const out = [`${md ? "# " : ""}The features of ${p.venture ?? "the venture"}: ${c.features} (${c.live} live, ${c.building} building, ${c.retired} retired); ${c.not_scored} not scored by RICE, ${c.unproven} not proven.`];
  for (const g of p.products) {
    out.push(md ? `\n## ${g.name ?? g.product} (${g.product})\n\n| Feature | Kind | Status | Owner | Open P0/P1 | RICE | Proof | Sessions |\n|---|---|---|---|---|---|---|---|` : `\n${g.name ?? g.product} (${g.product})`);
    for (const r of g.features) {
      const rice = r.score === null ? r.rice : `${r.score}${r.rice === "unconfirmed" ? " (unconfirmed)" : ""}`;
      const sessions = r.sessions === null ? "no telemetry" : String(r.sessions);
      out.push(md
        ? `| ${"&nbsp;&nbsp;".repeat(r.depth)}${r.name} (\`${r.id}\`) | ${r.kind} | ${r.status} | ${r.owner} | ${r.blocking} | ${rice} | ${r.proof} | ${sessions} |`
        : `  ${"  ".repeat(r.depth)}${r.id.padEnd(Math.max(1, 24 - 2 * r.depth))} ${r.kind.padEnd(10)} ${r.status.padEnd(8)} ${r.owner.padEnd(20)} P0/P1 ${r.blocking}  RICE ${rice}  ${r.proof}  sessions ${sessions}`);
    }
  }
  for (const x of p.holes) out.push(`${md ? "\n- " : ""}hole: ${x.fact}. Fill with ${x.fill}`);
  return out.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const md = args.includes("--md");
  const [dir, first, second] = args.filter((a) => !a.startsWith("--"));
  // list, report <id>, or a bare <id> (the route product/features passes its value that way).
  const id = first === "report" ? second : first === "list" ? undefined : first;
  if (!dir || (first === "report" && !second)) {
    console.error("usage: node packages/naive/src/engine/feature-report.ts <venture dir> [list|report <id>] [--json] [--md]");
    process.exit(2);
  }
  await runMain(Effect.map(gatherFacts(dir), (f) => {
    if (id === undefined) { const p = portfolioReport(f); console.log(json ? JSON.stringify(p, null, 2) : renderPortfolio(p, md)); return; }
    const r = featureReport(f, id);
    if (!r) { console.error(`${id} is no product capability of ${f.venture ?? dir} (${fileOf(id)})`); process.exitCode = 1; return; }
    console.log(json ? JSON.stringify(r, null, 2) : renderFeature(r, md));
  }));
}
