// The freeze on a pre-registration, at the router (EE-220, docs/design/PRE_REGISTRATION_2026-11-26.md). Every write of
// foundation/pre-registration/<id> passes through here, after the schema and before the gate, so a write that would
// change a registered field is refused outright and never waits as a draft.
//
// The rules themselves are pure and live in packages/naive/src/engine/pre-registration.ts, so the command and the
// check apply the same list. This file only reads the stored record through the store and names the version it read as
// the write's base, so nothing lands between the check and the write. It never calls a model.

import { preRegistrationRefusal } from "../engine/pre-registration.ts";
import type { Store } from "./router.ts";
import type { PreRegistration } from "../records/types/records.d.ts";

const message = (e: unknown) => String((e && typeof e === "object" && "message" in e ? e.message : undefined) ?? e);

/**
 * The rule for one router write of a pre-registration. { ok: false, error } when refused, else { ok: true, base }:
 * base is the version read here, which the write names, or null for a new record.
 */
export async function preRegistrationWriteRule({ store, file, input }: {
  store: Store; file: string; input: Partial<PreRegistration>;
}): Promise<{ ok: false; error: string } | { ok: true; base: string | null }> {
  let cur: Awaited<ReturnType<Store["read"]>>;
  try { cur = await store.read(file); } catch (e) { return { ok: false, error: message(e) }; }
  let stored: Partial<PreRegistration> | null = null;
  if (cur) {
    try { stored = JSON.parse(cur.content); } catch { return { ok: false, error: `${file} does not parse, so the registered plan cannot be read: fix the file before writing it` }; }
  }
  const why = preRegistrationRefusal({ stored, input });
  return why ? { ok: false, error: why } : { ok: true, base: cur?.version ?? null };
}
