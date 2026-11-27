#!/usr/bin/env node
// The pre-registration freeze, end to end (EE-220, docs/design/PRE_REGISTRATION_2026-11-26.md): a draft is written
// freely, a person registers it with naive prereg, and from then on its thesis, assumptions, method, measures,
// thresholds, dates, exclusions and decision rules do not change, for a person either. The two ways on both work: a
// deviation appended beside it, and a new version that supersedes it. Results are append-only, a measure's pass or
// fail is arithmetic against its registered threshold, and the check reads the registered version out of the blob
// store the write put it in.
//
//   node packages/naive/src/interfaces/tests/pre-registration-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { preRegistrationRefusal, registrationGaps } from "../../engine/pre-registration.ts";
import { register, result, show } from "../../router/orchestration/pre-registration.ts";
import { call } from "../../router/router.ts";
import type { PreRegistration } from "../../records/types/records.d.ts";

let failed = 0;
const expect = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "pass" : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 500)}`}`); if (!ok) failed++; };
const ws = mkdtempSync(join(tmpdir(), "prereg-"));
const dir = join(ws, "v");
const ROUTE = "foundation/pre-registration/price";
const CHECK = new URL("../../checks/check-pre-registration.ts", import.meta.url).pathname;

/** The draft a founder and the agent arrive at: complete enough to register. */
const draft = (over: Partial<PreRegistration> = {}): PreRegistration => ({
  id: "price",
  status: "draft",
  thesis: { statement: "Teams of five or more maintainers pay for triage", falsified_if: "Fewer than three of ten such teams pay after a demo" },
  assumptions: [{ id: "will-pay", statement: "They pay from a team budget", criticality: "high", uncertainty: "high", measures: ["paid-pilots"] }],
  method: { who: "maintainers of repositories with five or more maintainers", how_many: 10, recruitment: "cold outreach, no warm intros", asked_or_observed: "a demo, then an ask for a paid pilot" },
  measures: [{ id: "paid-pilots", statement: "teams that start a paid pilot", threshold: { operator: ">=", value: 3, unit: "teams", set_by: "Torian" }, judged_by: "2026-12-20" }],
  exclusions: [{ statement: "a compliment on the demo", why: "it costs nothing to give" }, { statement: "a sign-up with no payment", why: "it is not a purchase" }],
  on_pass: { action: "persevere", what: "write the mission and the vision, then build the triage flow" },
  on_fail: { action: "pivot", what: "test the same problem with a different buyer" },
  ...over,
} as PreRegistration);

const write = (input: unknown, o: { person?: boolean; route?: string } = {}) =>
  call({ venture: "v", workspace: ws, route: o.route ?? ROUTE, action: "write", ...(o.person === false ? { actor_id: "strategy-agent" } : { actor: "person" as const }), input });
const live = (): PreRegistration => JSON.parse(readFileSync(join(dir, "foundation/pre-registration/price.json"), "utf8"));
const checkRun = () => { const r = spawnSync(process.execPath, [CHECK, dir, "--json"], { encoding: "utf8" }); return { status: r.status, out: r.stdout + r.stderr }; };

try {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "v", name: "V", type: "software-startup", parent: null, owner: "self", status: "active", layers: {}, phase: "discovery", departments: ["strategy"] }));

  // The rule on its own, with no venture: it is pure, so these are the cases the router then enforces.
  expect("the rule lets a draft be written freely", preRegistrationRefusal({ stored: draft(), input: draft({ title: "Price" }) }) === null);
  expect("registering a draft with no threshold is refused by the rule",
    /no threshold/.test(preRegistrationRefusal({ stored: draft({ measures: [{ id: "paid-pilots", statement: "teams that pay" }] }), input: draft({ status: "registered", registered_at: "2026-11-26T10:00:00.000Z", registered_by: "Torian", measures: [{ id: "paid-pilots", statement: "teams that pay" }] }) }) ?? ""));
  expect("a draft with no exclusion is not ready to register", registrationGaps(draft({ exclusions: [] })).some((g) => /does not count as evidence/.test(g)));
  expect("a registered record does not go back to draft",
    /does not move to draft/.test(preRegistrationRefusal({ stored: draft({ status: "registered", registered_at: "x", registered_by: "T" }), input: draft({ status: "draft" }) }) ?? ""));

  // The draft through the router.
  const first = await write(draft());
  expect("a person writes the draft", first.ok && (first.result as { draft?: boolean }).draft === false, first);
  const early = await result(dir, "price", { measure: "paid-pilots", value: "4", by: "Torian" });
  expect("a result before registration is refused", !early.ok && /only after it is registered|is draft/.test(early.error ?? ""), early);

  // Registration is a person's.
  const byAgent = await register(dir, "price", {});
  expect("register with no person named is refused", !byAgent.ok && /by a person/.test(byAgent.error ?? ""), byAgent);
  const reg = await register(dir, "price", { by: "Torian", now: "2026-11-26T10:00:00.000Z" });
  expect("a person registers it, and the record says who and when", reg.ok && live().status === "registered" && live().registered_by === "Torian", reg);
  const twice = await register(dir, "price", { by: "Torian" });
  expect("registering it again is refused: only a draft is registered", !twice.ok && /only a draft is registered/.test(twice.error ?? ""), twice);
  const listed = await show(dir);
  expect("show lists the registered pre-registration", listed.ok && listed.result.some((p) => p.id === "price" && p.status === "registered"), listed);
  const one = await show(dir, "price");
  expect("show of one id gives that record", one.ok && one.result.length === 1, one);

  // The freeze, for a person and for the agent.
  const lower = await write({ ...live(), measures: [{ ...live().measures![0], threshold: { operator: ">=", value: 1, unit: "teams" } }] });
  expect("a person lowering a registered threshold is refused, and told the two ways on",
    !lower.ok && /measures does not change/.test(lower.error ?? "") && /deviations|supersedes/.test(lower.error ?? ""), lower);
  expect("the refused write left the record as it was", live().measures![0].threshold!.value === 3);
  const reword = await write({ ...live(), thesis: { statement: "Somebody will pay something", falsified_if: "Nobody ever pays" } });
  expect("rewording the thesis after registration is refused", !reword.ok && /thesis does not change/.test(reword.error ?? ""), reword);
  const byTheAgent = await write({ ...live(), exclusions: [{ statement: "a compliment on the demo", why: "it costs nothing to give" }] }, { person: false });
  expect("the agent is refused outright, not held as a draft for a person to accept",
    !byTheAgent.ok && /exclusions does not change/.test(byTheAgent.error ?? ""), byTheAgent);

  // The ways on: a deviation, then a result, then a verdict.
  const deviation = await write({ ...live(), deviations: [{ at: "2026-12-01T00:00:00.000Z", what: "two of the ten were warm intros", why: "cold outreach reached nobody in time", by: "Torian", affects: ["paid-pilots"] }] });
  expect("a deviation appended beside the record is written", deviation.ok && live().deviations!.length === 1, deviation);
  const edit = await write({ ...live(), deviations: [{ at: "2026-12-01T00:00:00.000Z", what: "every one of the ten was cold", why: "it reads better", by: "Torian" }] });
  expect("editing a deviation already written is refused: the list is append-only", !edit.ok && /append-only/.test(edit.error ?? ""), edit);

  const got = await result(dir, "price", { measure: "paid-pilots", value: "1", evidence: ["validation/interviews/acme"], by: "Torian" });
  expect("a result against the registered threshold is a fail, computed and not judged",
    got.ok && (got.result as { verdict?: string }).verdict === "fail" && live().results!.length === 1, got);
  const unknown = await result(dir, "price", { measure: "signups", value: "400", by: "Torian" });
  expect("a result for a measure the record does not have is refused", !unknown.ok && /has no measure signups/.test(unknown.error ?? ""), unknown);
  const shrink = await write({ ...live(), results: [] });
  expect("dropping a result already written is refused", !shrink.ok && /append-only/.test(shrink.error ?? ""), shrink);

  const verdict = await write({ ...live(), status: "judged", verdict: { outcome: "fail", action_taken: "pivot", why: "one of ten paid", at: "2026-12-21T00:00:00.000Z", by: "Torian" } });
  expect("a person writes the verdict and the action it said it would take", verdict.ok && live().verdict!.outcome === "fail", verdict);
  const rejudge = await write({ ...live(), verdict: { outcome: "pass", action_taken: "persevere", at: "2026-12-22T00:00:00.000Z", by: "Torian" } });
  expect("a verdict is written once", !rejudge.ok && /written once/.test(rejudge.error ?? ""), rejudge);

  // A real change is a new version that supersedes this one, with a reason.
  const next = await write(draft({ id: "price-v2", status: "draft", supersedes: "price", supersede_reason: "the buyer was wrong, so the whole plan is new", measures: [{ id: "paid-pilots", statement: "teams that start a paid pilot", threshold: { operator: ">=", value: 2, unit: "teams" }, judged_by: "2027-02-01" }] }), { route: "foundation/pre-registration/price-v2" });
  expect("a new version that supersedes the old one, with a reason, is written", next.ok, next);
  const point = await write({ ...live(), status: "superseded", superseded_by: "price-v2" });
  expect("the old one is marked superseded and points at the new one", point.ok && live().status === "superseded", point);

  // And the check agrees, reading the registered version out of the blob store this run wrote.
  const ok = checkRun();
  expect("check-pre-registration passes over the venture", ok.status === 0 && JSON.parse(ok.out).unverifiable.length === 0, ok);
  const rec = live();
  writeFileSync(join(dir, "foundation/pre-registration/price.json"), JSON.stringify({ ...rec, exclusions: [{ statement: "nothing is excluded" }] }, null, 2) + "\n");
  const edited = checkRun();
  expect("a hand edit that never went through the router is caught by the check", edited.status === 1 && /exclusions differs/.test(edited.out), edited);
} finally {
  rmSync(ws, { recursive: true, force: true });
}
if (failed) { console.log(`\n${failed} failing`); process.exit(1); }
console.log("pre-registration: all passed");
