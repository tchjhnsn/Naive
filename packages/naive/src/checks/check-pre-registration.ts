// Checks a venture's pre-registrations (EE-220, docs/design/PRE_REGISTRATION_2026-11-26.md).
//
//   node packages/naive/src/checks/check-pre-registration.ts <venture dir> [--json]
//
// The router already refuses a write that moves a registered field (packages/naive/src/router/pre-registration.ts).
// This is the check at rest, which catches a hand edit that never went through the router. It fails when:
//   - a file in foundation/pre-registration/ does not match pre-registration.schema.json;
//   - a registered field differs from the version that was live when the record was registered, read out of the
//     venture's blob store (packages/naive/src/core/blobs.ts, packages/naive/src/store/as-of.ts);
//   - a measure has no threshold or no date it is judged by, or the record names no exclusion, or either action is
//     missing, on a registered record;
//   - a result or a verdict sits on a record that is not registered;
//   - a result names a measure the record does not have, or its verdict disagrees with its observed value against
//     the registered threshold;
//   - supersedes or superseded_by names a pre-registration the venture does not have, or a record supersedes itself.
// Blobs are not backfilled, so a record registered before the blob store existed has no registered version to
// compare with: that is reported as unverifiable and does not fail. Findings exit 1; a venture whose files cannot be
// read exits 2. --json prints { ok, errors, unverifiable, checked }.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { blobFile } from "../core/blobs.ts";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { entries } from "../core/provenance.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { FROZEN, isRegistered, measureVerdict, registrationGaps } from "../engine/pre-registration.ts";
import { validateValue } from "../records/validate.ts";
import type { PreRegistration } from "../records/types/records.d.ts";

/** The folder a venture keeps its pre-registrations in, as a logical path. */
export const DIR = "foundation/pre-registration";
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * The version of one record as it was when it was registered: the first version in the venture's blob store whose
 * status is registered and whose registered_at is the record's. null when no such version is in the store, which is
 * what an un-backfilled log looks like. Reads the provenance log and the blobs, never the live file.
 */
export const registeredVersion = (dir: string, rel: string, rec: PreRegistration) => Effect.gen(function* () {
  for (const line of entries(dir)) {
    if (line.entity !== rel || line.activity === "draft" || !line.sha256) continue;
    const at = blobFile(dir, line.sha256);
    if (!existsSync(at)) continue;
    const was = yield* readJson(at).pipe(Effect.orElseSucceed((): unknown => null));
    const version = was as Partial<PreRegistration> | null;
    if (version && isRegistered(version) && version.registered_at === rec.registered_at) return version;
  }
  return null;
});

/** The findings for one venture: the errors, the registered records with no version in the blob store, and how many were read. */
export const checkPreRegistrations = (dir: string) => Effect.gen(function* () {
  const folder = ventureFile(dir, DIR);
  if (!existsSync(folder)) return { errors: [], unverifiable: [], checked: 0 };
  const files = readdirSync(folder).filter((f) => f.endsWith(".json")).sort();
  const errors: string[] = [];
  const unverifiable: string[] = [];
  const records = new Map<string, PreRegistration>();
  for (const f of files) {
    const rel = `${DIR}/${f}`;
    const value = yield* readJson(join(folder, f)).pipe(Effect.mapError((e) => new CannotRun({ message: `${rel}: ${describe(e)}`, cause: e })));
    const schema = validateValue("pre-registration.schema.json", value);
    if (schema.status !== 0) { errors.push(...`${schema.stdout}${schema.stderr}`.trim().split("\n").map((e) => `${rel}: ${e}`)); continue; }
    records.set(f.replace(/\.json$/, ""), value as PreRegistration);
  }
  for (const [id, rec] of records) {
    const rel = `${DIR}/${id}.json`;
    if (rec.id !== id) errors.push(`${rel}: its id is ${rec.id}, and one record's id is its file name`);
    if (rec.supersedes === id) errors.push(`${rel}: it supersedes itself`);
    for (const [field, named] of [["supersedes", rec.supersedes], ["superseded_by", rec.superseded_by]] as const) {
      if (named && !records.has(named)) errors.push(`${rel}: ${field} names ${named}, which is not a pre-registration of this venture`);
    }
    const registered = isRegistered(rec);
    if (!registered && (rec.results?.length || rec.verdict)) errors.push(`${rel}: it is ${rec.status} and already carries ${rec.verdict ? "a verdict" : "results"}: a result is written after it is registered`);
    if (registered) {
      const gaps = registrationGaps(rec);
      if (gaps.length) errors.push(`${rel}: it is registered with a hole in it: ${gaps.join("; ")}`);
      const was = yield* registeredVersion(dir, rel, rec);
      if (!was) unverifiable.push(rel);
      else {
        const moved = FROZEN.filter((k) => !same(was[k], rec[k]));
        if (moved.length) errors.push(`${rel}: ${moved.join(", ")} ${moved.length > 1 ? "differ" : "differs"} from the version registered at ${rec.registered_at}: a registered plan is not edited, so append the change to deviations or supersede it with a new version`);
      }
    }
    const measures = new Map((rec.measures ?? []).map((m) => [m.id, m]));
    for (const [i, res] of (rec.results ?? []).entries()) {
      const m = measures.get(res.measure);
      if (!m) { errors.push(`${rel}: result ${i + 1} names measure ${res.measure}, which it does not have`); continue; }
      const verdict = m.threshold ? measureVerdict(m.threshold, res.observed) : null;
      if (verdict && verdict !== res.verdict) errors.push(`${rel}: result ${i + 1} on ${res.measure} says ${res.verdict}, and ${JSON.stringify(res.observed)} against its registered threshold (${m.threshold?.operator} ${JSON.stringify(m.threshold?.value)}) is a ${verdict}`);
    }
  }
  return { errors, unverifiable, checked: records.size };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const [dir] = args.filter((a) => !a.startsWith("--"));
  if (!dir) { console.error("usage: node packages/naive/src/checks/check-pre-registration.ts <venture dir> [--json]"); process.exit(2); }
  await runMain(Effect.map(checkPreRegistrations(dir), ({ errors, unverifiable, checked }) => {
    if (json) console.log(JSON.stringify({ ok: !errors.length, errors, unverifiable, checked }, null, 2));
    else {
      for (const e of errors) console.error(`FAIL  ${e}`);
      for (const u of unverifiable) console.log(`note  ${u}: no version in the blob store from when it was registered, so its registered fields are unverifiable here`);
    }
    if (errors.length) { process.exitCode = 1; return; }
    if (!json) console.log(`ok  ${checked} pre-registration(s), each registered field as it was registered.`);
  }));
}
