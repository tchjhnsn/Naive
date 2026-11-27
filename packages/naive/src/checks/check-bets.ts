// Checks a venture's bets (EE-221, docs/design/BETS_2026-11-26.md).
//
//   node packages/naive/src/checks/check-bets.ts <venture dir> [--json]
//
// What a machine can check about a bet is its form, the shape of the set and the order the register was written in.
// Whether the claim is true it cannot check: that takes evidence and a person's judgment of it. So nothing here
// ever says a bet is right, and the accurate phrase for what it does say is that the register's form, its links and
// its lock held.
//
// The router already refuses a write that moves a registered claim (packages/naive/src/router/bets.ts). This is the
// check at rest, which catches a hand edit that never went through the router. It fails when:
//   - a file in foundation/bets/ does not match bet.schema.json, or its id is not its file name;
//   - a registered bet is registered with a hole in it (no line, no date, no source, nothing that would falsify it,
//     no prior, no owner);
//   - a frozen field differs from the version that was live when the bet was registered, read out of the venture's
//     blob store (packages/naive/src/core/blobs.ts);
//   - premises, supersedes or superseded_by names a bet the venture does not have, or a premise chain cycles;
//   - a bet is reported supported while a bet it rests on is refuted;
//   - a selection rule carries a verdict, which a value never takes from evidence;
//   - a probability or an outcome names somebody who is not a person of the venture, or names nobody;
//   - a resolution sits on a bet that was never registered;
//   - two registered bets over the same population, measure, unit and date set lines that cannot both hold;
//   - a pre-registration's tests names a bet the venture does not have.
// Blobs are not backfilled, so a bet registered before the blob store existed is reported unverifiable and does not
// fail. Findings exit 1; a venture whose files cannot be read exits 2. --json prints { ok, errors, unverifiable, checked }.

import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { blobFile } from "../core/blobs.ts";
import { CannotRun } from "../core/effect/errors.ts";
import { readJson } from "../core/effect/fs.ts";
import { entries } from "../core/provenance.ts";
import { describe, runMain } from "../core/effect/run.ts";
import { ventureFile } from "../core/venture-paths.ts";
import { FROZEN, VERDICTS, bothCanHold, claimKey, isRegistered, registrationGaps, statusOf } from "../engine/bets.ts";
import { refusedPerson } from "../engine/decisions.ts";
import { isRegistered as preRegistered } from "../engine/pre-registration.ts";
import { validateValue } from "../records/validate.ts";
import type { Bet, PreRegistration } from "../records/types/records.d.ts";

/** The folder a venture keeps its bets in, as a logical path. */
export const DIR = "foundation/bets";
/** The folder its pre-registrations are in, whose tests name bets. */
const PREREG = "foundation/pre-registration";
const same = (a: unknown, b: unknown): boolean => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/**
 * The version of one bet as it was when it was registered: the first version in the venture's blob store whose
 * status is registered or later and whose registered_at is the record's. null when no such version is in the store,
 * which is what an un-backfilled log looks like. Reads the provenance log and the blobs, never the live file.
 */
export const registeredVersion = (dir: string, rel: string, rec: Bet) => Effect.gen(function* () {
  for (const line of entries(dir)) {
    if (line.entity !== rel || line.activity === "draft" || !line.sha256) continue;
    const at = blobFile(dir, line.sha256);
    if (!existsSync(at)) continue;
    const was = yield* readJson(at).pipe(Effect.orElseSucceed((): unknown => null));
    const version = was as Partial<Bet> | null;
    if (version && isRegistered(version) && version.registered_at === rec.registered_at) return version;
  }
  return null;
});

/** Every premise chain that comes back to where it started, as the ids it runs through. */
function cycles(bets: ReadonlyMap<string, Bet>): string[][] {
  const found: string[][] = [];
  const seen = new Set<string>();
  const walk = (id: string, path: string[]): void => {
    for (const p of bets.get(id)?.premises ?? []) {
      if (path.includes(p)) { found.push([...path.slice(path.indexOf(p)), p]); continue; }
      if (seen.has(p)) continue;
      walk(p, [...path, p]);
    }
    seen.add(id);
  };
  for (const id of [...bets.keys()].sort()) if (!seen.has(id)) walk(id, [id]);
  return found;
}

/** The findings for one venture: the errors, the registered bets with no version in the blob store, and how many were read. */
export const checkBets = (dir: string) => Effect.gen(function* () {
  const folder = ventureFile(dir, DIR);
  const errors: string[] = [];
  const unverifiable: string[] = [];
  const bets = new Map<string, Bet>();
  if (existsSync(folder)) {
    for (const f of readdirSync(folder).filter((x) => x.endsWith(".json")).sort()) {
      const rel = `${DIR}/${f}`;
      const value = yield* readJson(join(folder, f)).pipe(Effect.mapError((e) => new CannotRun({ message: `${rel}: ${describe(e)}`, cause: e })));
      const schema = validateValue("bet.schema.json", value);
      if (schema.status !== 0) { errors.push(...`${schema.stdout}${schema.stderr}`.trim().split("\n").map((e) => `${rel}: ${e}`)); continue; }
      bets.set(f.replace(/\.json$/, ""), value as Bet);
    }
  }

  for (const [id, bet] of bets) {
    const rel = `${DIR}/${id}.json`;
    const status = statusOf(bet);
    if (bet.id !== id) errors.push(`${rel}: its id is ${bet.id}, and one record's id is its file name`);
    if (bet.supersedes === id) errors.push(`${rel}: it supersedes itself`);
    if ((bet.premises ?? []).includes(id)) errors.push(`${rel}: it is a premise of itself`);
    for (const [field, named] of [["supersedes", bet.supersedes], ["superseded_by", bet.superseded_by]] as const) {
      if (named && !bets.has(named)) errors.push(`${rel}: ${field} names ${named}, which is not a bet of this venture`);
    }
    for (const p of bet.premises ?? []) {
      if (!bets.has(p)) { errors.push(`${rel}: it rests on ${p}, which is not a bet of this venture: write the premise as a bet of kind premise, or take it off`); continue; }
      if (status === "supported" && statusOf(bets.get(p) as Bet) === "refuted") {
        errors.push(`${rel}: it is supported while ${p}, which it rests on, is refuted. One of the two verdicts is wrong: re-resolve this bet, or supersede it with a claim that does not rest on ${p}`);
      }
    }
    if (bet.kind === "selection-rule" && VERDICTS.includes(status)) {
      errors.push(`${rel}: it is a selection rule and its status is ${status}. A rule about whom to back is a value, and evidence never makes a value right: its status moves only to withdrawn or superseded`);
    }
    if (bet.resolution && !isRegistered(bet) && status !== "withdrawn") {
      errors.push(`${rel}: it is ${status} and already carries a resolution. A bet is registered before it is resolved, or the outcome was measured against nothing`);
    }
    for (const [i, c] of (bet.confidence ?? []).entries()) {
      const refused = refusedPerson(dir, c.set_by);
      if (refused) errors.push(`${rel}: confidence ${i + 1} was set by ${c.set_by}, and only a person puts odds on a bet: ${refused}`);
    }
    if (bet.resolution) {
      const refused = refusedPerson(dir, bet.resolution.by);
      if (refused) errors.push(`${rel}: it was resolved by ${bet.resolution.by}, and only a person resolves a bet: ${refused}`);
    }
    if (isRegistered(bet)) {
      const gaps = registrationGaps(bet);
      if (gaps.length) errors.push(`${rel}: it is registered with a hole in it: ${gaps.join("; ")}`);
      const was = yield* registeredVersion(dir, rel, bet);
      if (!was) unverifiable.push(rel);
      else {
        const moved = FROZEN.filter((k) => !same(was[k], bet[k]));
        if (moved.length) errors.push(`${rel}: ${moved.join(", ")} ${moved.length > 1 ? "differ" : "differs"} from the version registered at ${bet.registered_at}: a registered claim is not edited, so write a new bet that supersedes this one and says why`);
      }
    }
  }

  for (const chain of cycles(bets)) {
    errors.push(`${DIR}/${chain[0]}.json rests, through ${chain.slice(1, -1).join(" and ") || "itself"}, on itself: ${chain.join(" -> ")}. A premise chain that comes back to its own claim proves nothing`);
  }

  // Two lines over the same population, measure, unit and date that cannot both hold. Only registered bets are
  // compared: a proposed bet is still being written, and two drafts disagreeing is how a question gets asked.
  const live = [...bets.values()].filter((b) => isRegistered(b) && statusOf(b) !== "superseded");
  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const key = claimKey(a);
      if (!key || key !== claimKey(b) || bothCanHold(a, b)) continue;
      const read = (x: Bet) => `${x.claim?.comparator} ${String(x.claim?.threshold?.value)}`;
      errors.push(`${DIR}/${a.id}.json and ${DIR}/${b.id}.json are both registered over ${a.claim?.measure} among ${a.claim?.population} by ${a.claim?.resolves_by}, and ${read(a)} and ${read(b)} cannot both hold. One of them is wrong: supersede it`);
    }
  }

  // Every plan that says which bets it tests names bets the venture has, so registering it freezes a real claim.
  const prereg = ventureFile(dir, PREREG);
  if (existsSync(prereg)) {
    for (const f of readdirSync(prereg).filter((x) => x.endsWith(".json")).sort()) {
      const value = yield* readJson(join(prereg, f)).pipe(Effect.orElseSucceed((): unknown => null));
      const plan = value as Partial<PreRegistration> | null;
      for (const named of plan?.tests ?? []) {
        if (!bets.has(named)) errors.push(`${PREREG}/${f}: it tests ${named}, which is not a bet of this venture${preRegistered(plan) ? ", and it is registered, so the claim it was written against cannot be read" : ""}`);
      }
    }
  }

  return { errors, unverifiable, checked: bets.size };
});

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const [dir] = args.filter((a) => !a.startsWith("--"));
  if (!dir) { console.error("usage: node packages/naive/src/checks/check-bets.ts <venture dir> [--json]"); process.exit(2); }
  await runMain(Effect.map(checkBets(dir), ({ errors, unverifiable, checked }) => {
    if (json) console.log(JSON.stringify({ ok: !errors.length, errors, unverifiable, checked }, null, 2));
    else {
      for (const e of errors) console.error(`FAIL  ${e}`);
      for (const u of unverifiable) console.log(`note  ${u}: no version in the blob store from when it was registered, so its frozen fields are unverifiable here`);
    }
    if (errors.length) { process.exitCode = 1; return; }
    if (!json) console.log(`ok  ${checked} bet(s): the form, the links and the lock held. Whether a bet is true is not checked here, and cannot be.`);
  }));
}
