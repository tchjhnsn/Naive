// Breaks check-pre-registration on venture folders made here (EE-220). A venture with no pre-registration passes, a
// registered one whose bytes are the ones in the blob store passes, and each break fails with the rule named. The
// registered version is put in the blob store the way a router write puts it there, by appending a provenance line
// for the file, so the comparison runs against a real blob and not a fixture of its own.
//
//   node packages/naive/src/checks/check-pre-registration-test.ts

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { record } from "../core/provenance.ts";
import type { PreRegistration } from "../records/types/records.d.ts";

const CHECK = new URL("./check-pre-registration.ts", import.meta.url).pathname;
const REL = "foundation/pre-registration/price.json";
let failed = 0;
const t = (name: string, ok: boolean, detail: unknown = ""): void => { console.log(`${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : `  ${JSON.stringify(detail).slice(0, 700)}`}`); if (!ok) failed++; };
const tmp = mkdtempSync(join(tmpdir(), "check-prereg-test-"));
let n = 0;

/** A registered pre-registration: a thesis that can fail, one assumption, a method, one measure with a threshold and a date, one exclusion, both actions. */
const registered = (over: Partial<PreRegistration> = {}): PreRegistration => ({
  id: "price",
  status: "registered",
  thesis: { statement: "Teams of five or more maintainers pay for triage", falsified_if: "Fewer than three of ten such teams pay after a demo" },
  assumptions: [{ id: "will-pay", statement: "They will pay from a team budget", criticality: "high", uncertainty: "high" }],
  method: { who: "maintainers of repositories with five or more maintainers", how_many: 10, recruitment: "cold outreach, no warm intros", asked_or_observed: "a demo, then an ask for a paid pilot" },
  measures: [{ id: "paid-pilots", statement: "teams that start a paid pilot", threshold: { operator: ">=", value: 3, unit: "teams" }, judged_by: "2026-12-20" }],
  exclusions: [{ statement: "a compliment on the demo", why: "it costs nothing to give" }],
  on_pass: { action: "persevere", what: "write the mission and the vision, then build the triage flow" },
  on_fail: { action: "pivot", what: "test the same problem with a different buyer" },
  registered_at: "2026-11-26T10:00:00.000Z",
  registered_by: "Torian",
  ...over,
} as PreRegistration);

/**
 * A venture holding one pre-registration. `logged` is the version put in the blob store through a provenance line
 * (the registered version), and `live` the bytes left on disk afterwards. With no `logged`, nothing is in the store.
 */
function venture({ logged, live, files = {}, args = [] }: { logged?: PreRegistration; live?: PreRegistration; files?: Record<string, unknown>; args?: string[] } = {}) {
  const dir = join(tmp, `v-${++n}`);
  mkdirSync(join(dir, "foundation/pre-registration"), { recursive: true });
  writeFileSync(join(dir, "venture.json"), JSON.stringify({ id: "t", name: "T", phase: "discovery", departments: ["strategy"] }));
  if (logged) {
    writeFileSync(join(dir, REL), JSON.stringify(logged, null, 2) + "\n");
    record(dir, { entity: REL, route: "foundation/pre-registration/price", activity: "write", agent: { kind: "person", id: "Torian" } });
  }
  if (live) writeFileSync(join(dir, REL), JSON.stringify(live, null, 2) + "\n");
  for (const [rel, value] of Object.entries(files)) { mkdirSync(join(dir, rel, ".."), { recursive: true }); writeFileSync(join(dir, rel), JSON.stringify(value, null, 2) + "\n"); }
  const r = spawnSync(process.execPath, [CHECK, dir, ...args], { encoding: "utf8" });
  return { status: r.status, out: r.stdout + r.stderr };
}

try {
  const none = venture();
  t("a venture with no pre-registration passes", none.status === 0 && /ok {2}0 pre-registration/.test(none.out), none);

  const clean = venture({ logged: registered() });
  t("a registered record whose bytes are the ones in the blob store passes", clean.status === 0 && /each registered field as it was registered/.test(clean.out), clean);

  const json = venture({ logged: registered(), args: ["--json"] });
  const parsed = JSON.parse(json.out || "{}");
  t("--json prints ok, errors, unverifiable and how many were read", json.status === 0 && parsed.ok === true && parsed.checked === 1 && parsed.unverifiable.length === 0, json.out.slice(0, 300));

  const moved = venture({ logged: registered(), live: registered({ measures: [{ id: "paid-pilots", statement: "teams that start a paid pilot", threshold: { operator: ">=", value: 1, unit: "teams" }, judged_by: "2026-12-20" }] }) });
  t("a threshold lowered after registration fails, naming measures", moved.status === 1 && moved.out.includes("measures differs from the version registered"), moved);

  const later = venture({ logged: registered(), live: registered({ measures: [{ id: "paid-pilots", statement: "teams that start a paid pilot", threshold: { operator: ">=", value: 3, unit: "teams" }, judged_by: "2027-03-01" }] }) });
  t("a judged-by date pushed out after registration fails", later.status === 1 && later.out.includes("measures differs"), later);

  const claim = venture({ logged: registered(), live: registered({ thesis: { statement: "Somebody somewhere will pay something", falsified_if: "Nobody ever pays" } }) });
  t("a thesis rewritten after registration fails", claim.status === 1 && claim.out.includes("thesis differs"), claim);

  const dropped = venture({ logged: registered(), live: registered({ exclusions: [{ statement: "nothing is excluded" }], on_fail: { action: "persevere", what: "carry on" } }) });
  t("exclusions and the action on a fail changed after registration fail together", dropped.status === 1 && /exclusions, on_fail differ/.test(dropped.out), dropped);

  const deviated = venture({ logged: registered(), live: registered({ deviations: [{ at: "2026-12-01T00:00:00.000Z", what: "two of the ten were warm intros", why: "cold outreach reached nobody in time", by: "Torian" }] }) });
  t("a deviation appended beside the record passes: the registered fields did not move", deviated.status === 0, deviated);

  const noBlob = venture({ live: registered() });
  t("a registered record with no version in the blob store is reported unverifiable, not failed", noBlob.status === 0 && noBlob.out.includes("unverifiable"), noBlob);

  const early = venture({ logged: registered({ status: "draft", registered_at: undefined, registered_by: undefined, results: [{ measure: "paid-pilots", observed: 4, verdict: "pass", at: "2026-12-10T00:00:00.000Z" }] }) });
  t("a result on a record that is not registered fails", early.status === 1 && early.out.includes("a result is written after it is registered"), early);

  const wrong = venture({ logged: registered({ results: [{ measure: "paid-pilots", observed: 1, verdict: "pass", at: "2026-12-10T00:00:00.000Z" }] }) });
  t("a result whose verdict disagrees with its observed value against the registered threshold fails", wrong.status === 1 && wrong.out.includes("is a fail"), wrong);

  const unknown = venture({ logged: registered({ results: [{ measure: "signups", observed: 40, verdict: "pass", at: "2026-12-10T00:00:00.000Z" }] }) });
  t("a result naming a measure the record does not have fails", unknown.status === 1 && unknown.out.includes("which it does not have"), unknown);

  const hole = venture({ logged: registered({ exclusions: [] }) });
  t("a registered record with no exclusion fails the schema, which asks for one", hole.status === 1 && hole.out.includes("pre-registration/price.json"), hole);

  const self = venture({ logged: registered({ supersedes: "price", supersede_reason: "a better line" }) });
  t("a record that supersedes itself fails", self.status === 1 && self.out.includes("supersedes itself"), self);

  const ghost = venture({ logged: registered({ supersedes: "older", supersede_reason: "the first line was guessed" }) });
  t("supersedes naming a pre-registration the venture does not have fails", ghost.status === 1 && ghost.out.includes("not a pre-registration of this venture"), ghost);

  const renamed = venture({ logged: registered({ id: "prices" }) });
  t("a record whose id is not its file name fails", renamed.status === 1 && renamed.out.includes("one record's id is its file name"), renamed);
} finally { rmSync(tmp, { recursive: true, force: true }); }

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log("\nall passed");
