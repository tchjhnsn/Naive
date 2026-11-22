// One action's scope (F-2, F-12, O-5): values computed once per action and shared by every caller in
// it, through AsyncLocalStorage. The router runs each call as an action; the route table memoizes in it.
// It moved here from packages/naive/src/engine/caching.mjs, which re-exports it, so modules below schema/ can use it.

import { AsyncLocalStorage } from "node:async_hooks";

/** What one action keeps: memoized values by venture and key, and how often each key was computed or shared. */
type ActionStore = { memo: Map<string, unknown>; computed: Record<string, number>; shared: Record<string, number> };

const als = new AsyncLocalStorage<ActionStore>();

const isThenable = (v: unknown): v is PromiseLike<unknown> =>
  (typeof v === "object" || typeof v === "function") && v !== null && "then" in v && typeof v.then === "function";

/** Runs fn as one action. Inside an action already, fn joins it, so nested router calls share. */
export function actionScope<T>(fn: () => T): T {
  if (als.getStore()) return fn();
  return als.run({ memo: new Map(), computed: {}, shared: {} }, fn);
}
export const inAction = (): boolean => !!als.getStore();

/**
 * The value of fn, computed once per action and shared by every caller in it. Outside an action
 * fn runs every time. A throw or a rejected promise is not kept. dir scopes the value to a venture,
 * so forget(dir) drops it. A key names one value, so every caller of a key gets the type its fn returns.
 */
export function memo<T>(key: string, fn: () => T, { dir }: { dir?: string } = {}): T {
  const s = als.getStore();
  if (!s) return fn();
  const k = `${dir ?? ""}\u0000${key}`;
  // The map holds values of many types; k was set only by a memo call for this key, which returned T.
  if (s.memo.has(k)) { s.shared[key] = (s.shared[key] ?? 0) + 1; return s.memo.get(k) as T; }
  const v = fn();
  s.memo.set(k, v);
  s.computed[key] = (s.computed[key] ?? 0) + 1;
  if (isThenable(v)) v.then(null, () => s.memo.delete(k));
  return v;
}

/** Drops everything memoized for one venture in this action (after a write). */
export function forget(dir: string): void {
  const s = als.getStore();
  if (!s) return;
  for (const k of [...s.memo.keys()]) if (k.startsWith(`${dir}\u0000`)) s.memo.delete(k);
}

/** What this action computed and how often each value was shared instead of computed again. */
export function actionStats(): { computed: Record<string, number>; shared: Record<string, number> } | null {
  const s = als.getStore();
  return s ? { computed: { ...s.computed }, shared: { ...s.shared } } : null;
}
