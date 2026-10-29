// Who is acting (M-18, like cookies in a Server Action) and access on every read (F-5). Every action
// through the router carries who is acting, a person or an agent, and in which team-plan role. The
// router checks it before anything else, on every call: the actor is a person or an agent, an agent
// never acts in a role a person holds, and a venture can refuse role ids its team plan does not list
// (naive.config.json acting.unknown_roles). Each answer carries `acting` back. When who is acting
// changes between two calls on one interface, or the role's entry in the team plan changes, the next
// answer carries `acting_changed` with the routes the new identity may reach: the re-render.
//
// Access (P-27) is checked again at the record: a list read returns only the items the role may read,
// so a role allowed one product never sees the others. Credentials never enter here; connectors keep
// them, and the platform's stay in platform/ (EE-041).

import { AsyncLocalStorage } from "node:async_hooks";
import { createHash } from "node:crypto";
import { globsOf, mayReadItem, mayReadSome, roleOf, teamPlan } from "../schema/access.mjs";
import { configFor } from "../schema/naive-config.mjs";

export { mayReadItem, mayReadSome };

/** Checks who is acting on a venture. Returns { ok, who: { kind, role, known, occupant } } or { ok: false, error }. */
export function actingOf(dir, kind, roleId) {
  const who = { kind, role: roleId ?? null };
  if (kind !== "agent" && kind !== "person") return { ok: false, error: `the actor is a person or an agent, not ${kind}`, who };
  if (!dir || !roleId) return { ok: true, who };
  const plan = teamPlan(dir);
  if (!plan) return { ok: true, who };
  const role = (plan.roles ?? []).find((r) => r.id === roleId);
  if (!role) {
    let mode = "allow";
    try { mode = configFor(dir).acting?.unknown_roles ?? "allow"; } catch {}
    if (mode === "refuse") return { ok: false, error: `${roleId} is not a role in the team plan, and naive.config.json refuses unknown roles (acting.unknown_roles)`, who };
    return { ok: true, who: { ...who, known: false } };
  }
  if (kind === "agent" && role.occupant === "person") return { ok: false, error: `${roleId} is a person's role in the team plan: an agent may not act in it`, who };
  return { ok: true, who: { ...who, known: true, occupant: role.occupant } };
}

/** A fingerprint of who is acting: kind, role and the role's team-plan entry, so a changed entry counts as a change. */
export function fingerprint(dir, who) {
  return createHash("sha256").update(JSON.stringify({ kind: who.kind, role: who.role, entry: dir && who.role ? roleOf(dir, who.role) : null })).digest("hex");
}

/** The routes an identity may reach: globs to read and write. */
export function reach(dir, roleId) {
  const g = dir && roleId ? globsOf(dir, roleId) : null;
  return g ?? { read: ["**"], write: ["**"] };
}

/** The id of a collection item from its file, given the collection's file patterns (products/*.json). */
export function itemId(patterns, path) {
  for (const g of patterns) {
    if (!g.includes("*")) continue;
    const m = path.match(new RegExp("^" + g.split("*").map((s) => s.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("([^/]*)") + "$"));
    if (m) return m[1];
  }
  return path;
}

const nested = new AsyncLocalStorage();
const last = new Map();

/**
 * Runs one router action with who is acting checked first and carried on the answer. inner is the
 * router's own call; findDir finds a venture folder. Calls the router makes inside another call
 * (a view's read, the overview's slots) are checked too, but only the outer call tracks changes.
 */
export async function actingCall(a, inner, findDir) {
  const kind = a.actor ?? "agent", role = a.actor_id ?? process.env.MENTURA_ACTOR_ID;
  let dir = null;
  try { dir = a.venture ? findDir(a.venture, a.workspace) : null; } catch {}
  const check = actingOf(dir, kind, role);
  const acting = { kind, role: role ?? null };
  if (!check.ok) return { ok: false, error: check.error, acting };
  if (nested.getStore()) return { ...(await inner(a)), acting };
  let changed = null;
  if (dir) {
    const key = `${dir}\0${a.via ?? "router"}`, fp = fingerprint(dir, check.who), prev = last.get(key);
    if (prev && prev.fp !== fp) changed = { from: prev.acting, to: acting, may: reach(dir, role) };
    last.set(key, { fp, acting });
  }
  const r = await nested.run(true, () => inner(a));
  return { ...r, acting, ...(changed ? { acting_changed: changed } : {}) };
}
