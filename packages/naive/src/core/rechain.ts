// Re-chaining provenance for offline sync (EE-177, docs/design/OFFLINE_SYNC_2026-11-25.md, "Provenance").
// A working copy that was away from its business store wrote its own provenance lines (EE-031), each chained
// onto the line before it in the working copy's log. The store's log is a chain of its own, so those lines
// cannot be appended as they are: their prev names a line the store does not have. On a push each local line
// is written again on top of the store's chain, as a rebase writes a commit again on top of another branch.
//
// A re-chained line keeps everything it said: its time, entity, activity, agent, sha256 and the rest. Only
// prev and hash are the store chain's, and one block is added:
//
//   rechained_from: { hash: <the line's hash in the working copy's log>, prev: <its prev there>, working_copy: <id> }
//
// Keeping prev as well as hash makes the original hash checkable with nothing but the line: the original hash
// is the hash of this line with prev set to rechained_from.prev and the block left out (originalHash). So a
// re-chained line proves what it was before the push, and check-provenance refuses one whose block does not
// hold (rechainProblem). It does not prove the working copy's whole chain, which stays in that working copy.
//
// The module is pure: no I/O, no clock, no model. It imports lineHash and the line's shape from provenance.ts.

import { lineHash, type Entry } from "./provenance.ts";

/** Where a re-chained line came from: its hash and prev in the working copy's own log, and that working copy. */
export type RechainedFrom = { hash: string; prev: string; working_copy: string };

/** A line written again on top of the store's chain. */
export type RechainedEntry = Entry & { rechained_from: RechainedFrom };

const HASH = /^[0-9a-f]{64}$/;
/** A point in a chain: a line's hash, or genesis before the first line. */
const isChainPoint = (v: unknown): v is string => typeof v === "string" && (HASH.test(v) || v === "genesis");

/** Whether a line was written again on top of another chain. */
export const isRechained = (entry: Entry): entry is RechainedEntry => entry.rechained_from !== undefined;

/**
 * The hash the line carried in the working copy's log, recomputed from the line itself: its content with prev
 * set back to rechained_from.prev and the block left out. It is what rechained_from.hash must say.
 */
export function originalHash(entry: RechainedEntry): string {
  const { hash: _hash, rechained_from: block, ...rest } = entry;
  return lineHash(block.prev, { ...rest, prev: block.prev });
}

/**
 * Writes a working copy's provenance lines again on top of the store's chain, oldest first, and returns them.
 * `storeTip` is the hash of the store log's last line, or genesis when it has none. Each returned line keeps
 * its original hash and prev in `rechained_from`, with the working copy it came from.
 *
 * The lines handed in must be a run of one log, oldest first, each line's hash matching its content and each
 * prev naming the line before (the first line's prev is whatever the log held, so a tail of the log may be
 * pushed). A line that does not hold, or one that was already re-chained, is refused: re-chaining it would
 * hide an edit, and a line re-chained twice could no longer prove its original hash.
 */
export function rechain(storeTip: string, localLines: readonly Entry[], workingCopy: string): RechainedEntry[] {
  if (typeof workingCopy !== "string" || !workingCopy.trim()) throw new Error("re-chaining names the working copy the lines came from");
  if (!isChainPoint(storeTip)) throw new Error(`the store tip is a line hash or genesis, not ${JSON.stringify(storeTip)}`);
  let prev = storeTip, localPrev: string | null = null;
  const out: RechainedEntry[] = [];
  for (const line of localLines) {
    const which = `${line.entity ?? "a line"} at ${line.at ?? "no time"}`;
    if (isRechained(line)) throw new Error(`${which}: already written again from working copy ${line.rechained_from.working_copy}; re-chaining a re-chained line is not built`);
    if (!HASH.test(line.hash) || !isChainPoint(line.prev)) throw new Error(`${which}: a line to re-chain carries its own hash and prev`);
    if (lineHash(line.prev, line) !== line.hash) throw new Error(`${which}: hash does not match the line's content, so the working copy's log was edited`);
    if (localPrev !== null && line.prev !== localPrev) throw new Error(`${which}: prev does not match the line before it, so these are not one run of a log`);
    const { hash, prev: originalPrev, ...rest } = line;
    const fields = { ...rest, prev, rechained_from: { hash, prev: originalPrev, working_copy: workingCopy } };
    const entry: RechainedEntry = { ...fields, hash: lineHash(prev, fields) };
    out.push(entry);
    prev = entry.hash;
    localPrev = hash;
  }
  return out;
}

/**
 * What is wrong with a line's rechained_from block, or null when there is nothing wrong (a line with no block
 * included). A log line is read from a file, so the block's own fields are checked before they are used.
 */
export function rechainProblem(entry: Entry): string | null {
  const block: unknown = entry.rechained_from;
  if (block === undefined) return null;
  if (typeof block !== "object" || block === null || Array.isArray(block)) return "rechained_from is not a block";
  const { hash, prev, working_copy: workingCopy } = block as { hash?: unknown; prev?: unknown; working_copy?: unknown };
  if (typeof hash !== "string" || !HASH.test(hash)) return "rechained_from names no original hash";
  if (!isChainPoint(prev)) return "rechained_from names no original prev";
  if (typeof workingCopy !== "string" || !workingCopy.trim()) return "rechained_from names no working copy";
  if (!HASH.test(entry.hash ?? "")) return "a re-chained line carries its own hash in this chain";
  const expected = originalHash({ ...entry, rechained_from: { hash, prev, working_copy: workingCopy } });
  if (expected !== hash) return `rechained_from's hash is not this line as the working copy wrote it (expected ${expected}), so the line or the block was edited`;
  return null;
}
