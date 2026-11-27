// The freeze on a bet, at the router (EE-221, docs/design/BETS_2026-11-26.md). Every write of foundation/bets/<id>
// passes through here, after the schema and before the gate, so a write that would change a registered claim, put
// odds on a bet as an agent or resolve one as an agent is refused outright and never waits as a draft.
//
// The rules themselves are pure and live in packages/naive/src/engine/bets.ts, so the commands and the check apply
// the same list. This file reads the stored record through the store, names the version it read as the write's base
// so nothing lands between the check and the write, and reads the venture's pre-registrations to find the ones that
// test this bet and are registered: registering a plan against a claim fixes that claim (EE-220). It never calls a
// model.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { betWriteRefusal } from "../engine/bets.ts";
import { isRegistered as preRegistered } from "../engine/pre-registration.ts";
import { ventureFile } from "../core/venture-paths.ts";
import type { Store } from "./router.ts";
import type { Bet, PreRegistration } from "../records/types/records.d.ts";

/** Where a venture keeps its pre-registrations, as a logical path. */
const PREREG = "foundation/pre-registration";
const message = (e: unknown) => String((e && typeof e === "object" && "message" in e ? e.message : undefined) ?? e);
const load = (f: string): unknown => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return null; } };

/**
 * The registered pre-registrations of this venture that test the bet, by id, in file order. A plan still being
 * drafted freezes nothing: a person registering it is what fixes the claim it was written against.
 */
export function frozenBy(dir: string, id: string): string[] {
  const folder = ventureFile(dir, PREREG);
  if (!existsSync(folder)) return [];
  const out: string[] = [];
  for (const f of readdirSync(folder).filter((x) => x.endsWith(".json")).sort()) {
    const rec = load(join(folder, f)) as Partial<PreRegistration> | null;
    if (rec && preRegistered(rec) && (rec.tests ?? []).includes(id)) out.push(rec.id ?? f.replace(/\.json$/, ""));
  }
  return out;
}

/**
 * The rule for one router write of a bet. { ok: false, error } when refused, else { ok: true, base }: base is the
 * version read here, which the write names, or null for a new record.
 */
export async function betWriteRule({ store, dir, file, input, person }: {
  store: Store; dir: string; file: string; input: Partial<Bet>; person: boolean;
}): Promise<{ ok: false; error: string } | { ok: true; base: string | null }> {
  let cur: Awaited<ReturnType<Store["read"]>>;
  try { cur = await store.read(file); } catch (e) { return { ok: false, error: message(e) }; }
  let stored: Partial<Bet> | null = null;
  if (cur) {
    try { stored = JSON.parse(cur.content); } catch { return { ok: false, error: `${file} does not parse, so the registered claim cannot be read: fix the file before writing it` }; }
  }
  const id = input.id ?? stored?.id;
  const why = betWriteRefusal({ stored, input, person, frozenBy: id ? frozenBy(dir, id) : [] });
  return why ? { ok: false, error: why } : { ok: true, base: cur?.version ?? null };
}
