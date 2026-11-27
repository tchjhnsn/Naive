// The freeze on a pre-registration (EE-220, docs/design/PRE_REGISTRATION_2026-11-26.md). Pure: no I/O, no model,
// no clock. The router calls it on every write of the type (packages/naive/src/router/pre-registration.ts), the
// command calls it before it registers one (packages/naive/src/router/orchestration/pre-registration.ts) and the
// check calls it against the version in the blob store (packages/naive/src/checks/check-pre-registration.ts), so one
// list of rules answers for all three.
//
//   registrationGaps(rec)                  what is missing before a person may register it
//   preRegistrationRefusal({ stored, input })  why this write is refused, or null
//   measureVerdict(threshold, observed)    pass or fail against a registered threshold, or null when it cannot be told
//
// A registered pre-registration is frozen for everyone, a person included. That is the whole point: a person stays
// free to change the plan, and both ways of doing it leave a trace, a deviation appended beside the record or a new
// version that supersedes it with a reason. Nothing here decides anything: it only refuses a silent edit.

import type { PreRegistration } from "../records/types/records.d.ts";

/** The status of a pre-registration, as the schema's enum gives it. */
export type PreRegStatus = NonNullable<PreRegistration["status"]>;
/** A measure of a pre-registration, as the schema gives it. */
export type Measure = NonNullable<PreRegistration["measures"]>[number];
/** A measure's registered threshold. */
export type Threshold = Measure["threshold"];

/** The statuses from which the registered fields are fixed. */
export const REGISTERED: readonly PreRegStatus[] = Object.freeze(["registered", "judged", "superseded"]);
/**
 * The fields a registration fixes: the claim, the bets it tests, what it rests on, how it is tested, the measures
 * with their thresholds and the dates they are judged by, what does not count, the two decision rules, and who
 * registered it when.
 */
export const FROZEN: readonly (keyof PreRegistration)[] = Object.freeze([
  "id", "venture", "thesis", "tests", "assumptions", "method", "measures", "exclusions", "on_pass", "on_fail",
  "registered_at", "registered_by", "supersedes", "supersede_reason",
]);
/** The fields a write may only add to after registration: an entry already written never changes. */
export const APPEND_ONLY: readonly (keyof PreRegistration)[] = Object.freeze(["deviations", "results"]);
/** The statuses a write may move to from each status; a status may always stay as it is. */
export const NEXT: Readonly<Record<PreRegStatus, readonly PreRegStatus[]>> = Object.freeze({
  draft: ["draft", "registered", "withdrawn"],
  registered: ["registered", "judged", "superseded", "withdrawn"],
  judged: ["judged", "superseded"],
  superseded: ["superseded"],
  withdrawn: ["withdrawn"],
});

const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
/** Is this record registered, so that its registered fields are fixed? */
export const isRegistered = (rec: { status?: string } | null | undefined): boolean =>
  !!rec?.status && (REGISTERED as readonly string[]).includes(rec.status);

/**
 * What is missing before a person may register it: every measure with a threshold and a date it is judged by, at
 * least one assumption, at least one exclusion, both actions and a thesis that says what would falsify it. The
 * schema already requires each field to be there; this reads the ones a draft is allowed to leave empty and says
 * what a person would be registering with a hole in it.
 */
export function registrationGaps(rec: Partial<PreRegistration> | null | undefined): string[] {
  const gaps: string[] = [];
  if (!rec) return ["there is no pre-registration to register"];
  if (!rec.thesis?.statement) gaps.push("the thesis says nothing");
  if (!rec.thesis?.falsified_if) gaps.push("the thesis does not say what would falsify it, so it cannot fail");
  if (!rec.assumptions?.length) gaps.push("it names no assumption");
  if (!rec.method?.who || !rec.method?.recruitment || !rec.method?.asked_or_observed) gaps.push("the method does not say who, how they are recruited and what is asked or observed");
  if (!rec.measures?.length) gaps.push("it names no measure");
  for (const m of rec.measures ?? []) {
    const id = m?.id ?? "a measure";
    if (!m?.threshold || m.threshold.value === undefined || !m.threshold.operator) gaps.push(`measure ${id} has no threshold: the venture chooses the line, and Naive ships none`);
    if (!m?.judged_by) gaps.push(`measure ${id} has no date it is judged by, so its window could be extended until it passes`);
  }
  if (!rec.exclusions?.length) gaps.push("it says nothing about what does not count as evidence (compliments, friends' opinions, sign-ups without payment)");
  if (!rec.on_pass?.action || !rec.on_pass?.what) gaps.push("it does not say what the venture does on a pass");
  if (!rec.on_fail?.action || !rec.on_fail?.what) gaps.push("it does not say what the venture does on a fail");
  return gaps;
}

/** The ways forward a refusal names, so the message never leaves a caller stuck. */
const WAYS = "append the change to deviations, or register a new pre-registration that supersedes this one and says why";

/**
 * Why one write of a pre-registration is refused, or null when it may go on. `stored` is the record as it stands
 * (null for a new one) and `input` the whole record being written. A pre-registration that is not registered yet is
 * written freely; from registration on the frozen fields are fixed for everyone.
 */
export function preRegistrationRefusal({ stored, input }: {
  stored: Partial<PreRegistration> | null; input: Partial<PreRegistration>;
}): string | null {
  const id = input.id ?? stored?.id ?? "this pre-registration";
  const to = input.status as PreRegStatus | undefined;
  if (!stored) {
    if (to && isRegistered({ status: to })) {
      const gaps = registrationGaps(input);
      if (gaps.length) return `a new pre-registration cannot be written ${to}: ${gaps.join("; ")}`;
      if (!input.registered_by) return `${id} is ${to} and names no registered_by: only a person registers a pre-registration`;
    }
    if (input.results?.length) return `${id} is new and already carries results: a result is written after it is registered, not before`;
    if (input.verdict) return `${id} is new and already carries a verdict: a verdict is written after the test, on a registered pre-registration`;
    return null;
  }

  const from = (stored.status ?? "draft") as PreRegStatus;
  if (to && !(NEXT[from] ?? []).includes(to)) return `${id} is ${from}, so it does not move to ${to}: from ${from} it moves to ${(NEXT[from] ?? []).filter((s) => s !== from).join(", ") || "nothing"}`;

  if (!isRegistered(stored)) {
    // Not registered yet: a draft is written freely, except that registering it closes the gaps and names a person.
    if (to && isRegistered({ status: to })) {
      const gaps = registrationGaps(input);
      if (gaps.length) return `${id} is not ready to register: ${gaps.join("; ")}`;
      if (!input.registered_by) return `${id} cannot be registered without registered_by: only a person registers a pre-registration (naive prereg register ${id} --by <person>)`;
      if (!input.registered_at) return `${id} cannot be registered without registered_at`;
    }
    if (!isRegistered({ status: to ?? from }) && (input.results?.length || input.verdict)) return `${id} is ${to ?? from}: a result or a verdict is written only after it is registered`;
    return null;
  }

  // Registered. The frozen fields are fixed, for a person too.
  const frozen = FROZEN.filter((k) => !same(stored[k], input[k]));
  if (frozen.length) return `${id} was registered at ${stored.registered_at} by ${stored.registered_by}, so ${frozen.join(", ")} ${frozen.length > 1 ? "do" : "does"} not change: ${WAYS}`;
  for (const k of APPEND_ONLY) {
    const was = (stored[k] ?? []) as unknown[];
    const now = (input[k] ?? []) as unknown[];
    if (now.length < was.length) return `${id} is registered, so ${k} is append-only: it holds ${was.length} entr${was.length === 1 ? "y" : "ies"} and this write leaves ${now.length}`;
    const edited = was.findIndex((e, i) => !same(e, now[i]));
    if (edited >= 0) return `${id} is registered, so ${k} is append-only: entry ${edited + 1} of ${was.length} would change. Append a new entry instead`;
  }
  if (stored.verdict && !same(stored.verdict, input.verdict)) return `${id} already has a verdict, by ${stored.verdict.by} at ${stored.verdict.at}, and a verdict is written once: ${WAYS}`;
  if (input.verdict && !stored.verdict) {
    const judged = input.results ?? [];
    if (!judged.length) return `${id} has a verdict and no result: record what was observed for each measure first (naive prereg result ${id} --measure <id>=<value>)`;
  }
  if (input.status === "superseded" && !input.superseded_by) return `${id} is superseded by nothing: name the later version in superseded_by`;
  return null;
}

/**
 * Pass or fail for one measure: the observed value against the registered threshold. Arithmetic, not judgment, so a
 * command may compute it. null when the threshold and the value cannot be compared (a worded threshold against a
 * number, an operator over two strings that is not equality), and then a person states the verdict.
 */
export function measureVerdict(threshold: Threshold | undefined, observed: number | string): "pass" | "fail" | null {
  if (!threshold || threshold.value === undefined) return null;
  const { operator, value } = threshold;
  if (typeof value === "number") {
    const n = typeof observed === "number" ? observed : Number(observed);
    if (!Number.isFinite(n)) return null;
    switch (operator) {
      case ">=": return n >= value ? "pass" : "fail";
      case ">": return n > value ? "pass" : "fail";
      case "<=": return n <= value ? "pass" : "fail";
      case "<": return n < value ? "pass" : "fail";
      case "==": return n === value ? "pass" : "fail";
      case "!=": return n !== value ? "pass" : "fail";
      default: return null;
    }
  }
  const a = String(observed);
  if (operator === "==") return a === value ? "pass" : "fail";
  if (operator === "!=") return a !== value ? "pass" : "fail";
  return null;
}
