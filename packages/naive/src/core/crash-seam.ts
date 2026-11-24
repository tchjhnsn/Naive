// A test seam for crash-and-resume tests of durable work (EE-161). It imports only node:fs, so code that runs after
// every write (triggers.ts) can call it without loading Effect.

import { existsSync, writeFileSync } from "node:fs";

/**
 * A test seam for crash-and-resume tests: NAIVE_DURABLE_KILL=<step name prefix>:<marker file> kills the process once,
 * right after a step whose name starts with the prefix has run and before its result is stored, as a crash would.
 * The marker file makes it once. Unset, it does nothing. Code that keeps its own state (triggers.ts) calls it too.
 */
export function crashSeam(name: string): void {
  const seam = process.env.NAIVE_DURABLE_KILL;
  if (!seam) return;
  const at = seam.indexOf(":");
  const prefix = seam.slice(0, at), marker = seam.slice(at + 1);
  if (!name.startsWith(prefix) || !marker || existsSync(marker)) return;
  writeFileSync(marker, name);
  process.kill(process.pid, "SIGKILL");
}
