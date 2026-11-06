#!/usr/bin/env node
// Reasons with citations (dynamic decision index, item 4). A decision's reasons[] are claims for or
// against it, or context it rests on, each citing venture records (path plus sha256), evidence,
// research cells or other decisions. Approving a decision freezes its reasons, with the sha256 of
// every cited local file, into that version's provenance. When a cited file later changes, the
// decision is reported, "the reason you decided <id> changed: <ref>", and renders stale.
//
// The helpers; node packages/naive/src/checks/check-reasons.mjs is the check.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

import { ventureFile } from "../core/venture-paths.mjs";

/** The venture file a citation names, when it is a local file; else null (an evidence id, a cell, a decision). */
function localFile(dir, ref) {
  if (!ref || ref.includes("..") || ref.startsWith("/")) return null;
  try { const f = ventureFile(dir, ref); return existsSync(f) && statSync(f).isFile() ? f : null; } catch { return null; }
}

/** sha256 of a cited local file now, or null when the ref is not a local file. */
export function shaOf(dir, ref) {
  const f = localFile(dir, ref);
  return f ? createHash("sha256").update(readFileSync(f)).digest("hex") : null;
}

/** Reasons with every local citation's version set to the file's sha256 now. With keep, a version
 *  already given is kept (citing time was earlier); without, it is recomputed (freezing at approval). */
export function stamp(dir, reasons, { keep = true } = {}) {
  return (reasons ?? []).map((r) => ({ ...r, ...(r.citations ? { citations: r.citations.map((c) => {
    if (keep && c.version) return c;
    const v = shaOf(dir, c.ref);
    return v ? { ...c, version: v } : c;
  }) } : {}) }));
}

/** The frozen citations of a decided decision whose file changed since: [{ref, claim, was, now}]. */
export function changedReasons(dir, d) {
  if (d.status !== "decided") return [];
  const out = [];
  for (const r of d.provenance?.reasons ?? []) for (const c of r.citations ?? []) {
    if (!c.version) continue;
    const now = shaOf(dir, c.ref);
    // A cited file that is gone counts as changed: what the decision rested on is no longer there.
    if (now !== c.version && (now || !localFile(dir, c.ref))) out.push({ ref: c.ref, claim: r.claim, kind: r.kind, was: c.version, now });
  }
  return out;
}

/** The citation refs a list of reasons supplies, deduplicated, in order. */
export const citesOf = (reasons) => [...new Set((reasons ?? []).flatMap((r) => (r.citations ?? []).map((c) => c.ref)))];

/** Reasons parsed from CLI arguments: --reason (for), --against, --context each start one; each
 *  --cite <ref> (with an optional following --locator) attaches to the reason before it. */
export function reasonsFromArgs(argv) {
  const out = [];
  const kinds = { "--reason": "for", "--against": "against", "--context": "context" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], v = argv[i + 1];
    if (kinds[a] && v !== undefined) { out.push({ claim: v, kind: kinds[a], citations: [] }); i++; }
    else if (a === "--cite" && v !== undefined) {
      if (!out.length) throw new Error("--cite needs a --reason before it");
      out.at(-1).citations.push({ ref: v }); i++;
    } else if (a === "--locator" && v !== undefined && out.at(-1)?.citations.length) { out.at(-1).citations.at(-1).locator = v; i++; }
  }
  return out.map((r) => (r.citations.length ? r : { claim: r.claim, kind: r.kind }));
}

/** Text lines for a decision's reasons: the current ones and, when decided, the frozen ones. */
export function whyLines(dir, d) {
  const lines = [`${d.id}: ${d.question}`, `  status ${d.status}${d.version ? `, version ${d.version}` : ""}${d.answer ? `\n  answer: ${d.answer}` : ""}`];
  const show = (title, rs) => {
    if (!rs?.length) return;
    lines.push(`  ${title}:`);
    for (const r of rs) {
      lines.push(`    [${r.kind}] ${r.claim}`);
      for (const c of r.citations ?? []) {
        const now = c.version ? shaOf(dir, c.ref) : null;
        const state = !c.version ? "" : now === c.version ? " (unchanged)" : now ? " (CHANGED since cited)" : localFile(dir, c.ref) ? "" : " (GONE)";
        lines.push(`      cites ${c.ref}${c.locator ? ` at ${c.locator}` : ""}${c.version ? ` @${c.version.slice(0, 12)}` : ""}${state}${c.note ? ` - ${c.note}` : ""}`);
      }
    }
  };
  show("reasons", d.reasons);
  show(`approved on (frozen${d.provenance?.approved_at ? ` ${d.provenance.approved_at}` : ""})`, d.provenance?.reasons);
  if (!d.reasons?.length && !d.provenance?.reasons?.length) lines.push("  no reasons recorded");
  for (const c of changedReasons(dir, d)) lines.push(`  the reason you decided ${d.id} changed: ${c.ref}`);
  return lines;
}

